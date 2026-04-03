import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getMe,
  login,
  logout,
  clearAuth,
  getToken,
  setToken,
  apiFetch,
} from '../services/api';
import type { AuthUser, StudioMembership } from '../services/api';

function normalizeStudios(list: StudioMembership[]): StudioMembership[] {
  return list.map((s) => ({
    ...s,
    logoUrl:
      s.logoUrl ?? (s as { logo_url?: string }).logo_url,
  }));
}

interface AuthState {
  user: AuthUser | null;
  studios: StudioMembership[];
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Merge fields from PATCH /auth/me (or similar) without dropping adminRole / adminPermissions. */
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
      await login({ email, password });
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed');
      throw e;
    }
  }

  async function signUp(email: string, password: string, name: string) {
    setError(null);
    try {
      const data = await apiFetch<{ message?: string; access_token?: string }>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({ email, password, name }),
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
        signUp,
        signOut,
        refresh,
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
