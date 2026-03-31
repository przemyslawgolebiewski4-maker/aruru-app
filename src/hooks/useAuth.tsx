import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getMe,
  login,
  logout,
  register,
  clearAuth,
  getToken,
} from '../services/api';
import type { AuthUser, StudioMembership } from '../services/api';

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
      setStudios(me.studios);
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
      await register({ email, password, name });
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

  return (
    <AuthContext.Provider
      value={{ user, studios, loading, error, signIn, signUp, signOut, refresh }}
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
