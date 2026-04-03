import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://aruru-production.up.railway.app';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  emailVerified: boolean;
  bio?: string | null;
  city?: string | null;
  instagramUrl?: string | null;
  websiteUrl?: string | null;
  shopUrl?: string | null;
  /** Present when API returns camelCase; map from `community_visibility` if needed */
  communityVisibility?: Record<string, string>;
  adminRole?: string;
  adminPermissions?: {
    studios?: boolean;
    sponsors?: boolean;
    community?: boolean;
    billing?: boolean;
    users?: boolean;
  };
}

export interface StudioMembership {
  tenantId: string;
  studioName: string;
  studioSlug: string;
  role: 'owner' | 'assistant' | 'member';
  status: 'active' | 'invited' | 'suspended';
  /** From GET /auth/me — tenant logo (camelCase or normalized from logo_url). */
  logoUrl?: string;
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

export type ApiFetchInit = RequestInit & {
  /** Omit Authorization and X-Tenant-ID (public auth routes). */
  public?: boolean;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchInit = {},
  tenantId?: string
): Promise<T> {
  const isPublic = options.public === true;
  const { public: _pub, ...fetchInit } = options;
  const token = isPublic ? null : await getToken();

  const headers: Record<string, string> = {
    ...(token && !isPublic ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantId && !isPublic ? { 'X-Tenant-ID': tenantId } : {}),
    ...(fetchInit.body !== undefined
      ? { 'Content-Type': 'application/json' }
      : {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...fetchInit,
    headers: { ...headers, ...(fetchInit.headers as Record<string, string> ?? {}) },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));

    let message = 'Unknown error';
    if (typeof err.detail === 'string') {
      message = err.detail;
    } else if (Array.isArray(err.detail)) {
      message = err.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
    } else if (err.message) {
      message = err.message;
    } else {
      message = `HTTP ${res.status}`;
    }

    throw new ApiError(message, res.status);
  }

  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    return undefined as T;
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error('Invalid response from server');
  }
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

/** Same message whether or not the email exists (do not change for UX). */
export const FORGOT_PASSWORD_SUCCESS_MESSAGE =
  'If an account exists for this email, we sent password reset instructions.';

export async function forgotPassword(payload: {
  email: string;
}): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(
    '/auth/forgot-password',
    {
      method: 'POST',
      body: JSON.stringify({ email: payload.email.trim().toLowerCase() }),
      public: true,
    }
  );
}

export async function resetPassword(payload: {
  token: string;
  new_password: string;
}): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(
    '/auth/reset-password',
    {
      method: 'POST',
      body: JSON.stringify({
        token: payload.token.trim(),
        new_password: payload.new_password,
      }),
      public: true,
    }
  );
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
    membershipFee?: number;
  }
): Promise<{ message: string }> {
  return apiFetch(
    `/studios/${tenantId}/pricing`,
    { method: 'PUT', body: JSON.stringify(payload) },
    tenantId
  );
}
