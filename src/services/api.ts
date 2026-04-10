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
  country?: string | null;
  instagramUrl?: string | null;
  websiteUrl?: string | null;
  shopUrl?: string | null;
  /**
   * Keys: profile, studios, events, forum_activity, links — values: everyone | my_studios | only_me.
   * hidden_studios: tenant IDs to hide from public profile when studios visibility is shared.
   */
  communityVisibility?: Record<string, string | string[] | undefined>;
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
  /** e.g. `sponsor` — from GET /auth/me */
  userRole?: string;
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
    country: (raw.country ?? null) as string | null,
    instagramUrl: (raw.instagramUrl ?? raw.instagram_url ?? null) as string | null,
    websiteUrl: (raw.websiteUrl ?? raw.website_url ?? null) as string | null,
    shopUrl: (raw.shopUrl ?? raw.shop_url ?? null) as string | null,
    communityVisibility:
      cv && typeof cv === 'object' && !Array.isArray(cv)
        ? { ...(cv as Record<string, string | string[] | undefined>) }
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
    userRole: (raw.userRole ?? raw.user_role ?? undefined) as string | undefined,
  };
}

/** Admin tab: role present and either legacy admin or any permission true. */
export function userHasAdminTabAccess(user: AuthUser | null | undefined): boolean {
  if (!user?.adminRole) return false;
  const p = user.adminPermissions;
  if (!p || Object.keys(p).length === 0) return user.adminRole === 'aruru_admin';
  return Object.values(p).some((v) => v === true);
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  PLN: 'zł',
  GBP: '£',
  CZK: 'Kč',
  SEK: 'kr',
  DKK: 'kr',
  CHF: 'CHF ',
  NOK: 'kr',
};

export function formatCurrency(amount: number, currency = 'EUR'): string {
  const c = (currency ?? 'EUR').toUpperCase();
  const symbol = CURRENCY_SYMBOLS[c] ?? `${c} `;
  return `${symbol}${amount.toFixed(2)}`;
}

export const SUPPORTED_CURRENCIES = [
  'EUR',
  'PLN',
  'GBP',
  'CZK',
  'SEK',
  'DKK',
  'CHF',
  'NOK',
] as const;

/** Suffix like `€ / kg` or `zł / hour` (symbol trimmed for multi-char codes). */
export function formatCurrencyUnitSuffix(currency: string, unit: string): string {
  const c = (currency ?? 'EUR').toUpperCase();
  const sym = (CURRENCY_SYMBOLS[c] ?? c).trimEnd();
  return `${sym} / ${unit}`;
}

/** Compact label e.g. `€/kg`, `zł/kg`. */
export function formatCurrencyPerUnitLabel(currency: string, unit: string): string {
  const c = (currency ?? 'EUR').toUpperCase();
  const sym = (CURRENCY_SYMBOLS[c] ?? '€').trimEnd();
  return `${sym}/${unit}`;
}

export type PatchMeBody = {
  name?: string;
  avatar_url?: string | null;
  bio?: string | null;
  city?: string | null;
  country?: string | null;
  instagram_url?: string | null;
  website_url?: string | null;
  shop_url?: string | null;
  community_visibility?: Record<string, string | string[] | undefined>;
};

/**
 * One membership row from GET /auth/me (`studios` or `suspendedStudios`).
 * Same shape in both arrays (spec: camelCase). Do not use `tenantStatus` from /me.
 */
export interface StudioMembership {
  tenantId: string;
  studioName: string;
  studioSlug: string;
  logoUrl: string | null;
  role: 'owner' | 'assistant' | 'member';
  /** studio_members.status, e.g. active, invited */
  status: string;
  subscriptionStatus: string;
  subscriptionTier: string;
  trialEndsAt: string | null;
  currency: string;
  /** From tenant.suspension_reason; usually null in `studios`, set in `suspendedStudios`. */
  suspensionReason: string | null;
}

/** PATCH /admin/studios/{studioId} (optional fields — send only what changes). */
export type PatchStudioAdminBody = {
  subscriptionTier?: string;
  subscriptionStatus?: 'trial' | 'active' | 'suspended' | 'past_due';
  extendTrialDays?: number;
  suspensionReason?: string | null;
};

export interface MeResponse {
  user: AuthUser;
  /** Active / usable memberships for studio switcher and tenant context. */
  studios: StudioMembership[];
  /** Suspended (subscription-blocked) memberships — not in switcher; always an array. */
  suspendedStudios: StudioMembership[];
}

/** Default copy when HTTP 402 has no usable `detail` (subscription blocked). */
export const SUBSCRIPTION_BLOCKED_DEFAULT_MESSAGE =
  'Subscription required. Please renew your plan or contact your studio administrator.';

/** User-facing text for 402 on write endpoints; optional reason from last GET /auth/me suspended list. */
export function formatSubscriptionBlockedMessage(
  apiDetail: string,
  suspensionReason?: string | null
): string {
  const d = (apiDetail ?? '').trim();
  const base =
    d && !/^HTTP \d+$/.test(d) ? d : SUBSCRIPTION_BLOCKED_DEFAULT_MESSAGE;
  const r = suspensionReason?.trim();
  if (r) return `${base}\n\n${r}`;
  return base;
}

/** Checklist §8.4 — when `suspensionReason` is null or empty in /me suspended list. */
export const SUSPENDED_MEMBERSHIP_REASON_FALLBACK =
  'No details were provided. Please contact support or your studio administrator.';

/** One row in GET /auth/data-export `studios_memberships` / `studiosMemberships`. */
export type AuthDataExportStudioMembership = {
  tenant_id?: string;
  tenantId?: string;
  tenantStatus?: string;
  tenant_status?: string;
  suspensionReason?: string | null;
  suspension_reason?: string | null;
  [key: string]: unknown;
};

/** Loose shape for GDPR export JSON (extend as backend adds fields). */
export type AuthDataExportPayload = Record<string, unknown> & {
  studios_memberships?: AuthDataExportStudioMembership[];
  studiosMemberships?: AuthDataExportStudioMembership[];
};

export function mapStudioMembershipFromMeRow(
  row: Record<string, unknown>
): StudioMembership {
  const srRaw = row.suspensionReason ?? row.suspension_reason;
  const suspensionReason =
    srRaw == null || srRaw === ''
      ? null
      : String(srRaw).trim() || null;

  const logoRaw = row.logoUrl ?? row.logo_url;
  const logoUrl =
    logoRaw != null && String(logoRaw).trim() !== ''
      ? String(logoRaw)
      : null;

  const trialRaw = row.trialEndsAt ?? row.trial_ends_at;
  const trialEndsAt =
    trialRaw != null && String(trialRaw).trim() !== ''
      ? String(trialRaw)
      : null;

  const subSt =
    row.subscriptionStatus != null || row.subscription_status != null
      ? String(row.subscriptionStatus ?? row.subscription_status).trim()
      : '';
  const tier =
    row.subscriptionTier != null || row.subscription_tier != null
      ? String(row.subscriptionTier ?? row.subscription_tier).trim()
      : '';
  const curRaw = row.currency ?? row.currency_code;
  const currency =
    curRaw != null && String(curRaw).trim() !== ''
      ? String(curRaw).toUpperCase()
      : 'EUR';

  const roleStr = String(row.role ?? 'member').toLowerCase();
  const role: StudioMembership['role'] =
    roleStr === 'owner' || roleStr === 'assistant' || roleStr === 'member'
      ? roleStr
      : 'member';

  return {
    tenantId: String(row.tenantId ?? row.tenant_id ?? ''),
    studioName: String(row.studioName ?? row.studio_name ?? ''),
    studioSlug: String(row.studioSlug ?? row.studio_slug ?? ''),
    logoUrl,
    role,
    status: String(row.status ?? ''),
    subscriptionStatus: subSt,
    subscriptionTier: tier,
    trialEndsAt,
    currency,
    suspensionReason,
  };
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

/** Shown for HTTP 429 on auth-related public POST routes (login, register, etc.). */
export const AUTH_RATE_LIMIT_MESSAGE =
  'Zbyt wiele prób, spróbuj za chwilę.';

/** GET /auth/data-export when the account no longer exists or access is denied. */
export const AUTH_DATA_EXPORT_FORBIDDEN_MESSAGE =
  'This account is no longer available.';

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

    if (res.status === 429) {
      throw new ApiError(AUTH_RATE_LIMIT_MESSAGE, 429);
    }

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

/** GDPR-style export: Bearer only, no X-Tenant-ID. */
export async function getAuthDataExport(): Promise<AuthDataExportPayload> {
  return apiFetch<AuthDataExportPayload>('/auth/data-export', {});
}

export async function getMe(): Promise<MeResponse> {
  const res = await apiFetch<{
    user: Record<string, unknown>;
    studios?: unknown[];
    suspendedStudios?: unknown[];
    suspended_studios?: unknown[];
  }>('/auth/me');
  const studioRows = (res.studios ?? []) as unknown[];
  const suspendedRows =
    (res.suspendedStudios ?? res.suspended_studios ?? []) as unknown[];
  return {
    user: normalizeAuthUser(res.user),
    studios: studioRows.map((s) =>
      mapStudioMembershipFromMeRow(s as Record<string, unknown>)
    ),
    suspendedStudios: suspendedRows.map((s) =>
      mapStudioMembershipFromMeRow(s as Record<string, unknown>)
    ),
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
  /** Members list shape overlaps /auth/me only partially; callers map fields locally. */
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

// ─── Community: join studio request (Bearer only, no X-Tenant-ID) ─────────

export type PostCommunityJoinRequestBody = {
  note?: string | null;
};

export async function postCommunityStudioJoinRequest(
  slug: string,
  body: PostCommunityJoinRequestBody
): Promise<{ message: string; requestId: string }> {
  const s = slug.trim();
  const note =
    body.note == null || String(body.note).trim() === ''
      ? null
      : String(body.note).trim();
  const res = await apiFetch<Record<string, unknown>>(
    `/community/studios/${encodeURIComponent(s)}/join-request`,
    {
      method: 'POST',
      body: JSON.stringify({ note }),
    }
  );
  return {
    message: String(res.message ?? ''),
    requestId: String(res.requestId ?? res.request_id ?? ''),
  };
}

// ─── Owner: join requests (X-Tenant-ID required) ──────────────────────────

export type JoinRequestStatus = 'pending' | 'interview_pending';

/** Row from GET /studios/{tenantId}/join-requests (camelCase as in API). */
export interface JoinRequest {
  id: string;
  status: JoinRequestStatus;
  applicantUserId: string;
  applicantName: string;
  applicantEmail: string;
  note: string | null;
  createdAt: string;
  /** Owner message when status moved to interview_pending (if API returns it). */
  interviewMessage?: string | null;
}

export function parseJoinRequestRow(
  raw: Record<string, unknown>
): JoinRequest | null {
  const id = String(raw.id ?? raw._id ?? '').trim();
  if (!id) return null;
  const st = String(raw.status ?? '').toLowerCase();
  if (st !== 'pending' && st !== 'interview_pending') return null;

  const noteRaw = raw.note;
  const note =
    noteRaw == null || String(noteRaw).trim() === ''
      ? null
      : String(noteRaw).trim();

  const im =
    raw.interviewMessage ??
    raw.interview_message ??
    raw.lastOwnerMessage ??
    raw.last_owner_message;
  const interviewMessage =
    im != null && String(im).trim() !== '' ? String(im).trim() : null;

  return {
    id,
    status: st as JoinRequestStatus,
    applicantUserId: String(
      raw.applicantUserId ??
        raw.applicant_user_id ??
        raw.userId ??
        raw.user_id ??
        ''
    ),
    applicantName: String(
      raw.applicantName ?? raw.applicant_name ?? raw.name ?? ''
    ),
    applicantEmail: String(
      raw.applicantEmail ?? raw.applicant_email ?? raw.email ?? ''
    ),
    note,
    createdAt: String(raw.createdAt ?? raw.created_at ?? ''),
    interviewMessage,
  };
}

export async function getStudioJoinRequests(
  tenantId: string
): Promise<JoinRequest[]> {
  const res = await apiFetch<unknown>(
    `/studios/${tenantId}/join-requests`,
    {},
    tenantId
  );
  let rows: unknown[] = [];
  if (Array.isArray(res)) rows = res;
  else if (res && typeof res === 'object' && Array.isArray((res as { requests?: unknown[] }).requests)) {
    rows = (res as { requests: unknown[] }).requests;
  } else if (res && typeof res === 'object' && Array.isArray((res as { joinRequests?: unknown[] }).joinRequests)) {
    rows = (res as { joinRequests: unknown[] }).joinRequests;
  }
  const out: JoinRequest[] = [];
  for (const item of rows) {
    if (!item || typeof item !== 'object') continue;
    const parsed = parseJoinRequestRow(item as Record<string, unknown>);
    if (parsed) out.push(parsed);
  }
  return out;
}

export async function postJoinRequestAccept(
  tenantId: string,
  requestId: string
): Promise<void> {
  await apiFetch(
    `/studios/${tenantId}/join-requests/${encodeURIComponent(requestId)}/accept`,
    { method: 'POST' },
    tenantId
  );
}

export async function postJoinRequestReject(
  tenantId: string,
  requestId: string,
  message: string
): Promise<void> {
  await apiFetch(
    `/studios/${tenantId}/join-requests/${encodeURIComponent(requestId)}/reject`,
    {
      method: 'POST',
      body: JSON.stringify({ message: message.trim() }),
    },
    tenantId
  );
}

export async function postJoinRequestInterview(
  tenantId: string,
  requestId: string,
  message: string
): Promise<void> {
  await apiFetch(
    `/studios/${tenantId}/join-requests/${encodeURIComponent(requestId)}/interview`,
    {
      method: 'POST',
      body: JSON.stringify({ message: message.trim() }),
    },
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

export async function deleteStudio(tenantId: string): Promise<{ message: string }> {
  return apiFetch(`/studios/${tenantId}`, { method: 'DELETE' }, tenantId);
}

export async function patchStudioVisibility(
  tenantId: string,
  communityVisible: boolean
): Promise<void> {
  await apiFetch(
    `/studios/${tenantId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ community_visible: communityVisible }),
    },
    tenantId
  );
}
