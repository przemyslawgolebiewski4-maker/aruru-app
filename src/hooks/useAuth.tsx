import React, { createContext, useContext, useEffect, useState } from 'react';
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
    return {
      ...s,
      logoUrl: s.logoUrl ?? (s as { logo_url?: string }).logo_url,
      subscriptionStatus:
        row.subscriptionStatus ?? (row.subscription_status as string | undefined),
      subscriptionTier:
        row.subscriptionTier ?? (row.subscription_tier as string | undefined),
      trialEndsAt: row.trialEndsAt ?? (row.trial_ends_at as string | undefined),
    };
  });
}

interface AuthState {
  user: AuthUser | null;
  studios: StudioMembership[];
  loading: boolean;
  error: string | null;
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
}

const AuthContext = createContext<(AuthState & AuthActions) | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [studios, setStudios] = useState<StudioMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const token = await getToken();
    if (!token) {
      setUser(null);
      setStudios([]);
      return;
    }
    try {
      const me = await getMe();
      setUser(me.user);
      setStudios(normalizeStudios(me.studios));

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
      }
    } catch {
      await clearAuth();
      setUser(null);
      setStudios([]);
    }
  }

  async function refreshOrThrow() {
    const token = await getToken();
    if (!token) {
      setUser(null);
      setStudios([]);
      return;
    }
    const me = await getMe();
    setUser(me.user);
    setStudios(normalizeStudios(me.studios));

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
        throw new TwoFactorRequiredError(data.pending_token, data.methods);
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
        loading,
        error,
        signIn,
        completeSignInWith2FA,
        signUp,
        signOut,
        refresh,
        setUserFull,
        mergeServerUser,
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
