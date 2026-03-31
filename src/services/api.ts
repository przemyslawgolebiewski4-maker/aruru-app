import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://aruru-production.up.railway.app';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  emailVerified: boolean;
}

export interface StudioMembership {
  tenantId: string;
  studioName: string;
  studioSlug: string;
  role: 'owner' | 'assistant' | 'member';
  status: 'active' | 'invited' | 'suspended';
}

export interface MeResponse {
  user: AuthUser;
  studios: StudioMembership[];
}

// ─── Storage keys ──────────────────────────────────────────────────────────

const TOKEN_KEY = 'aruru_access_token';
const USER_KEY = 'aruru_user';

// ─── Token helpers ─────────────────────────────────────────────────────────

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearAuth(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

// ─── API fetch wrapper ─────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  tenantId?: string
): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> ?? {}) },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── Auth endpoints ────────────────────────────────────────────────────────

export async function register(payload: {
  email: string;
  password: string;
  name: string;
}): Promise<{ message: string }> {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(payload: {
  email: string;
  password: string;
}): Promise<{ access_token: string; token_type: string }> {
  const data = await apiFetch<{ access_token: string; token_type: string }>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  await setToken(data.access_token);
  return data;
}

export async function getMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>('/auth/me');
}

export async function logout(): Promise<void> {
  await clearAuth();
}

// ─── Studio endpoints ──────────────────────────────────────────────────────

export async function createStudio(payload: {
  name: string;
  city: string;
  country: string;
  description?: string;
}): Promise<{ id: string; slug: string; status: string }> {
  return apiFetch('/studios', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getStudioMembers(
  tenantId: string
): Promise<{ members: StudioMembership[] }> {
  return apiFetch(`/studios/${tenantId}/members`, {}, tenantId);
}

export async function inviteMember(
  tenantId: string,
  payload: { email: string; role: 'assistant' | 'member'; note?: string }
): Promise<{ message: string }> {
  return apiFetch(
    `/studios/${tenantId}/invite`,
    { method: 'POST', body: JSON.stringify(payload) },
    tenantId
  );
}

export async function getPricing(
  tenantId: string
): Promise<{
  openStudioPerH: number;
  kilnBisquePerKg: number;
  kilnGlazePerKg: number;
  kilnPrivatePerFiring: number;
}> {
  return apiFetch(`/studios/${tenantId}/pricing`, {}, tenantId);
}

export async function setPricing(
  tenantId: string,
  payload: {
    openStudioPerH: number;
    kilnBisquePerKg: number;
    kilnGlazePerKg: number;
    kilnPrivatePerFiring: number;
  }
): Promise<{ message: string }> {
  return apiFetch(
    `/studios/${tenantId}/pricing`,
    { method: 'PUT', body: JSON.stringify(payload) },
    tenantId
  );
}
