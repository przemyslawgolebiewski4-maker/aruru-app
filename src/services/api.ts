import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://aruru-production.up.railway.app';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  emailVerified: boolean;
  bio?: string | null;
  city?: string | null;
  instagramUrl?: string | null;
  websiteUrl?: string | null;
  shopUrl?: string | null;
  /** Keys: profile, studios, events, forum_activity, links — values: everyone | my_studios | only_me */
  communityVisibility?: Record<string, string>;
  adminRole?: string | null;
  adminPermissions?: {
    studios?: boolean;
    sponsors?: boolean;
    community?: boolean;
    billing?: boolean;
    users?: boolean;
  };
  twoFactorTotpEnabled?: boolean;
  twoFactorEmailEnabled?: boolean;
  twoFactorPendingTotpSetup?: boolean;
}

/** Normalize GET/PATCH /auth/me user payload (camelCase or snake_case). */
export function normalizeAuthUser(raw: Record<string, unknown>): AuthUser {
  const cv = raw.communityVisibility ?? raw.community_visibility;
  const permsRaw = raw.adminPermissions ?? raw.admin_permissions;
  let adminPermissions: AuthUser['adminPermissions'];
  if (permsRaw && typeof permsRaw === 'object' && permsRaw !== null) {
    const p = permsRaw as Record<string, unknown>;
    adminPermissions = {
      studios: Boolean(p.studios),
      sponsors: Boolean(p.sponsors),
      community: Boolean(p.community),
      billing: Boolean(p.billing),
      users: Boolean(p.users),
    };
  }

  return {
    id: String(raw.id ?? ''),
    email: String(raw.email ?? ''),
    name: String(raw.name ?? ''),
    avatarUrl: (raw.avatarUrl ?? raw.avatar_url ?? undefined) as string | undefined,
    emailVerified: Boolean(raw.emailVerified ?? raw.email_verified),
    bio: (raw.bio ?? null) as string | null,
    city: (raw.city ?? null) as string | null,
    instagramUrl: (raw.instagramUrl ?? raw.instagram_url ?? null) as string | null,
    websiteUrl: (raw.websiteUrl ?? raw.website_url ?? null) as string | null,
    shopUrl: (raw.shopUrl ?? raw.shop_url ?? null) as string | null,
    communityVisibility:
      cv && typeof cv === 'object' && !Array.isArray(cv)
        ? { ...(cv as Record<string, string>) }
        : undefined,
    adminRole: (raw.adminRole ?? raw.admin_role ?? null) as string | null,
    adminPermissions,
    twoFactorTotpEnabled: Boolean(
      raw.twoFactorTotpEnabled ?? raw.two_factor_totp_enabled
    ),
    twoFactorEmailEnabled: Boolean(
      raw.twoFactorEmailEnabled ?? raw.two_factor_email_enabled
    ),
    twoFactorPendingTotpSetup: Boolean(
      raw.twoFactorPendingTotpSetup ?? raw.two_factor_pending_totp_setup
    ),
  };
}

/** Admin tab: role present and either legacy admin or any permission true. */
export function userHasAdminTabAccess(user: AuthUser | null | undefined): boolean {
  if (!user?.adminRole) return false;
  const p = user.adminPermissions;
  if (!p || Object.keys(p).length === 0) return user.adminRole === 'aruru_admin';
  return Object.values(p).some((v) => v === true);
}

export type PatchMeBody = {
  name?: string;
  avatar_url?: string | null;
  bio?: string | null;
  city?: string | null;
  instagram_url?: string | null;
  website_url?: string | null;
  shop_url?: string | null;
  community_visibility?: Record<string, string>;
};

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
    const raw = await res.text().catch(() => '');
    const trimmed = raw.trim();
    let message = `HTTP ${res.status}`;

    if (trimmed) {
      try {
        const err = JSON.parse(trimmed) as Record<string, unknown>;
        if (typeof err.detail === 'string') {
          message = err.detail;
        } else if (Array.isArray(err.detail)) {
          message = err.detail
            .map((e: { msg?: string } | string) =>
              typeof e === 'object' && e && 'msg' in e && e.msg
                ? String(e.msg)
                : JSON.stringify(e)
            )
            .join(', ');
        } else if (typeof err.message === 'string') {
          message = err.message;
        } else {
          message = trimmed;
        }
      } catch {
        message = trimmed;
      }
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
    public: true,
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

export type LoginPasswordSuccess = {
  access_token: string;
  token_type: string;
};

export type LoginPasswordTwoFactor = {
  two_factor_required: true;
  pending_token: string;
  methods: ('totp' | 'email')[];
};

export type LoginPasswordResult = LoginPasswordSuccess | LoginPasswordTwoFactor;

export class TwoFactorRequiredError extends Error {
  constructor(
    public pendingToken: string,
    public methods: ('totp' | 'email')[]
  ) {
    super('Two-factor authentication required');
    this.name = 'TwoFactorRequiredError';
  }
}

/** Step 1 login — no token stored. Use finalizeLoginSession after 2FA or direct success. */
export async function authLoginPassword(
  email: string,
  password: string
): Promise<LoginPasswordResult> {
  return apiFetch<LoginPasswordResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    public: true,
  });
}

export async function authLogin2faEmailSend(pendingToken: string): Promise<{
  message: string;
}> {
  return apiFetch('/auth/login/2fa/email/send', {
    method: 'POST',
    body: JSON.stringify({ pending_token: pendingToken }),
    public: true,
  });
}

export async function authLogin2faComplete(args: {
  pending_token: string;
  method: 'totp' | 'email';
  code: string;
}): Promise<LoginPasswordSuccess> {
  return apiFetch<LoginPasswordSuccess>('/auth/login/2fa', {
    method: 'POST',
    body: JSON.stringify({
      pending_token: args.pending_token,
      method: args.method,
      code: args.code.replace(/\s/g, ''),
    }),
    public: true,
  });
}

export async function finalizeLoginSession(accessToken: string): Promise<void> {
  await setToken(accessToken);
}

export async function getMe(): Promise<MeResponse> {
  const res = await apiFetch<{ user: Record<string, unknown>; studios: unknown[] }>(
    '/auth/me'
  );
  return {
    user: normalizeAuthUser(res.user),
    studios: (res.studios ?? []).map((s) => {
      const row = s as Record<string, unknown>;
      return {
        tenantId: String(row.tenantId ?? row.tenant_id ?? ''),
        studioName: String(row.studioName ?? row.studio_name ?? ''),
        studioSlug: String(row.studioSlug ?? row.studio_slug ?? ''),
        role: row.role as 'owner' | 'assistant' | 'member',
        status: row.status as 'active' | 'invited' | 'suspended',
        logoUrl:
          (row.logoUrl ?? row.logo_url) != null
            ? String(row.logoUrl ?? row.logo_url)
            : undefined,
      };
    }),
  };
}

/** PATCH /auth/me — body keys in snake_case; returns full user (camelCase). */
export async function patchMe(body: PatchMeBody): Promise<AuthUser> {
  const res = await apiFetch<unknown>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  const obj = res as Record<string, unknown>;
  const u = (obj.user ?? obj) as Record<string, unknown>;
  return normalizeAuthUser(u);
}

export async function resendVerifyEmail(): Promise<{ message?: string }> {
  return apiFetch('/auth/resend-verify', { method: 'POST' });
}

export type TwoFactorStatus = {
  totpEnabled: boolean;
  totpPendingSetup: boolean;
  emailEnabled: boolean;
  anyEnabled: boolean;
};

export async function get2faStatus(): Promise<TwoFactorStatus> {
  return apiFetch<TwoFactorStatus>('/auth/2fa/status');
}

export async function totp2faInit(): Promise<{
  secret: string;
  otpauthUrl: string;
}> {
  return apiFetch('/auth/2fa/totp/init', { method: 'POST' });
}

export async function totp2faVerify(code: string): Promise<{ message: string }> {
  return apiFetch('/auth/2fa/totp/verify', {
    method: 'POST',
    body: JSON.stringify({ code: code.replace(/\s/g, '') }),
  });
}

export async function totp2faDisable(): Promise<{ message?: string }> {
  return apiFetch('/auth/2fa/totp/disable', { method: 'POST' });
}

export async function email2faEnable(): Promise<{ message?: string }> {
  return apiFetch('/auth/2fa/email/enable', { method: 'POST' });
}

export async function email2faDisable(): Promise<{ message?: string }> {
  return apiFetch('/auth/2fa/email/disable', { method: 'POST' });
}

export async function disableAll2fa(password: string): Promise<{ message?: string }> {
  return apiFetch('/auth/2fa/disable', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
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
