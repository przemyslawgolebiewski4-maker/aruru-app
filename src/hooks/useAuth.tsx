import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  getMe,
  logout,
  clearAuth,
  getToken,
  setToken,
  apiFetch,
  authLoginPassword,
  finalizeLoginSession,
  authLogin2faComplete,
  TwoFactorRequiredError,
  ApiError,
} from '../services/api';
import type { AuthUser, StudioMembership } from '../services/api';

export { TwoFactorRequiredError } from '../services/api';

function normalizeStudios(list: StudioMembership[]): StudioMembership[] {
  return list.map((s) => {
    const row = s as StudioMembership & Record<string, unknown>;
    const curRaw = row.currency ?? row.currency_code ?? s.currency;
    const currency =
      curRaw != null && String(curRaw).trim() !== ''
        ? String(curRaw).toUpperCase()
        : 'EUR';
    const srRaw = row.suspensionReason ?? row.suspension_reason;
    const suspensionReason =
      srRaw == null || srRaw === ''
        ? null
        : String(srRaw).trim() || null;
    const visRaw =
      row.memberDashboardVisibility ?? row.member_dashboard_visibility;
    let parsedVisibility: Record<string, boolean> | null | undefined;
    if (visRaw != null && typeof visRaw === 'object' && !Array.isArray(visRaw)) {
      const o: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(visRaw as Record<string, unknown>)) {
        if (typeof v === 'boolean') o[k] = v;
      }
      parsedVisibility = Object.keys(o).length > 0 ? o : null;
    }
    const logoRaw = row.logoUrl ?? row.logo_url ?? s.logoUrl;
    const logoUrl =
      logoRaw != null && String(logoRaw).trim() !== ''
        ? String(logoRaw)
        : null;
    const trialRaw = row.trialEndsAt ?? row.trial_ends_at ?? s.trialEndsAt;
    const trialEndsAt =
      trialRaw != null && String(trialRaw).trim() !== ''
        ? String(trialRaw)
        : null;
    const roleStr = String(s.role ?? 'member').toLowerCase();
    const role: StudioMembership['role'] =
      roleStr === 'owner' || roleStr === 'assistant' || roleStr === 'member'
        ? roleStr
        : 'member';
    return {
      tenantId: String(s.tenantId ?? ''),
      studioName: String(s.studioName ?? ''),
      studioSlug: String(s.studioSlug ?? ''),
      logoUrl,
      role,
      status: String(s.status ?? ''),
      subscriptionStatus: String(
        row.subscriptionStatus ??
          row.subscription_status ??
          s.subscriptionStatus ??
          ''
      ),
      subscriptionTier: String(
        row.subscriptionTier ??
          row.subscription_tier ??
          s.subscriptionTier ??
          ''
      ),
      trialEndsAt,
      currency,
      suspensionReason: s.suspensionReason ?? suspensionReason,
      memberDashboardVisibility:
        parsedVisibility ?? s.memberDashboardVisibility ?? null,
    };
  });
}

interface AuthState {
  user: AuthUser | null;
  studios: StudioMembership[];
  /** Subscription-suspended studios from GET /auth/me — not for switcher. */
  suspendedStudios: StudioMembership[];
  loading: boolean;
  error: string | null;
  /** First active studio (same rule as dashboard). */
  activeTenantId: string;
  activeCurrency: string;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>;
  completeSignInWith2FA: (
    pendingToken: string,
    method: 'totp' | 'email',
    code: string
  ) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    name: string,
    opts?: { is_sponsor?: boolean }
  ) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Replace user from PATCH /auth/me (full object — keeps admin + 2FA fields). */
  setUserFull: (user: AuthUser) => void;
  /** Merge partial fields (legacy). */
  mergeServerUser: (patch: Partial<AuthUser>) => void;
  switchStudio: (tenantId: string) => void;
}

const AuthContext = createContext<(AuthState & AuthActions) | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [studios, setStudios] = useState<StudioMembership[]>([]);
  const [suspendedStudios, setSuspendedStudios] = useState<StudioMembership[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualTenantId, setManualTenantId] = useState<string | null>(null);

  const defaultTenantId = useMemo(() => {
    const active =
      studios.find((s) => s.status === 'active') ?? studios[0];
    return active?.tenantId ?? '';
  }, [studios]);

  const activeTenantId = useMemo(() => {
    if (
      manualTenantId &&
      studios.some((s) => s.tenantId === manualTenantId)
    ) {
      return manualTenantId;
    }
    return defaultTenantId;
  }, [manualTenantId, defaultTenantId, studios]);

  const activeCurrency = useMemo(() => {
    const active =
      studios.find((s) => s.tenantId === activeTenantId) ??
      studios.find((s) => s.status === 'active') ??
      studios[0];
    return (active?.currency ?? 'EUR').toUpperCase();
  }, [studios, activeTenantId]);

  function switchStudio(tenantId: string) {
    setManualTenantId(tenantId);
  }

  async function refresh() {
    const token = await getToken();
    if (!token) {
      setUser(null);
      setStudios([]);
      setSuspendedStudios([]);
      setManualTenantId(null);
      return;
    }
    try {
      const me = await getMe();
      setUser(me.user);
      setStudios(normalizeStudios(me.studios));
      setSuspendedStudios(normalizeStudios(me.suspendedStudios ?? []));
      setManualTenantId((prev) => {
        if (!prev) return null;
        const still = normalizeStudios(me.studios);
        return still.some((s) => s.tenantId === prev) ? prev : null;
      });

      // Auto-accept pending invites
      for (const studio of me.studios) {
        if (studio.status === 'invited') {
          try {
            await apiFetch(
              `/studios/${studio.tenantId}/accept-invite`,
              { method: 'POST' },
              studio.tenantId
            );
          } catch {
            // silent — do not block sign-in
          }
        }
      }
      // Refresh again to get updated statuses
      if (me.studios.some((s) => s.status === 'invited')) {
        const updated = await getMe();
        setUser(updated.user);
        setStudios(normalizeStudios(updated.studios));
        setSuspendedStudios(normalizeStudios(updated.suspendedStudios ?? []));
        setManualTenantId((prev) => {
          if (!prev) return null;
          const still = normalizeStudios(updated.studios);
          return still.some((s) => s.tenantId === prev) ? prev : null;
        });
      }
    } catch {
      await clearAuth();
      setUser(null);
      setStudios([]);
      setSuspendedStudios([]);
      setManualTenantId(null);
    }
  }

  async function refreshOrThrow() {
    const token = await getToken();
    if (!token) {
      setUser(null);
      setStudios([]);
      setSuspendedStudios([]);
      setManualTenantId(null);
      return;
    }
    const me = await getMe();
    setUser(me.user);
    setStudios(normalizeStudios(me.studios));
    setSuspendedStudios(normalizeStudios(me.suspendedStudios ?? []));
    setManualTenantId((prev) => {
      if (!prev) return null;
      const still = normalizeStudios(me.studios);
      return still.some((s) => s.tenantId === prev) ? prev : null;
    });

    for (const studio of me.studios) {
      if (studio.status === 'invited') {
        try {
          await apiFetch(
            `/studios/${studio.tenantId}/accept-invite`,
            { method: 'POST' },
            studio.tenantId
          );
        } catch {
          // silent
        }
      }
    }
    if (me.studios.some((s) => s.status === 'invited')) {
      const updated = await getMe();
      setUser(updated.user);
      setStudios(normalizeStudios(updated.studios));
      setSuspendedStudios(normalizeStudios(updated.suspendedStudios ?? []));
      setManualTenantId((prev) => {
        if (!prev) return null;
        const still = normalizeStudios(updated.studios);
        return still.some((s) => s.tenantId === prev) ? prev : null;
      });
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function signIn(email: string, password: string) {
    setError(null);
    try {
      const data = await authLoginPassword(email.trim().toLowerCase(), password);
      if ('two_factor_required' in data && data.two_factor_required) {
        const m = data.methods;
        const methods: ('totp' | 'email')[] =
          Array.isArray(m) && m.length > 0 ? m : ['totp', 'email'];
        throw new TwoFactorRequiredError(data.pending_token, methods);
      }
      if (!('access_token' in data)) {
        throw new Error('Unexpected login response');
      }
      await finalizeLoginSession(data.access_token);
      await refreshOrThrow();
    } catch (e: unknown) {
      if (e instanceof TwoFactorRequiredError) throw e;
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Login failed';
      setError(msg);
      throw e;
    }
  }

  async function completeSignInWith2FA(
    pendingToken: string,
    method: 'totp' | 'email',
    code: string
  ) {
    setError(null);
    try {
      const data = await authLogin2faComplete({
        pending_token: pendingToken,
        method,
        code,
      });
      await finalizeLoginSession(data.access_token);
      await refreshOrThrow();
    } catch (e: unknown) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Verification failed';
      setError(msg);
      throw e;
    }
  }

  async function signUp(
    email: string,
    password: string,
    name: string,
    opts?: { is_sponsor?: boolean }
  ) {
    setError(null);
    try {
      const data = await apiFetch<{ message?: string; access_token?: string }>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            name,
            is_sponsor: Boolean(opts?.is_sponsor),
          }),
          public: true,
        }
      );
      if (data?.access_token) {
        await setToken(data.access_token);
        try {
          const me = await getMe();
          setUser(me.user);
          setStudios(normalizeStudios(me.studios));
          setSuspendedStudios(normalizeStudios(me.suspendedStudios ?? []));
          setManualTenantId(null);
        } catch {
          // Keep token; sync on next app load or refresh(). Avoid clearAuth here.
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Registration failed');
      throw e;
    }
  }

  async function signOut() {
    await logout();
    setUser(null);
    setStudios([]);
    setSuspendedStudios([]);
    setManualTenantId(null);
  }

  function setUserFull(next: AuthUser) {
    setUser(next);
  }

  function mergeServerUser(patch: Partial<AuthUser>) {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev };
      for (const [k, v] of Object.entries(patch)) {
        if (v !== undefined) {
          (next as Record<string, unknown>)[k] = v;
        }
      }
      return next as AuthUser;
    });
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        studios,
        suspendedStudios,
        loading,
        error,
        activeTenantId,
        activeCurrency,
        signIn,
        completeSignInWith2FA,
        signUp,
        signOut,
        refresh,
        setUserFull,
        mergeServerUser,
        switchStudio,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function useStudio(tenantId: string) {
  const { studios } = useAuth();
  return studios.find((s) => s.tenantId === tenantId) ?? null;
}
