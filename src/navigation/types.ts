/** Root stack: authenticated app vs auth flows (deep linking). */
export type RootStackParamList = {
  App: undefined;
  Auth: { onboardingDone?: boolean };
};

export type AuthStackParamList = {
  Onboarding: undefined;
  Login: { passwordResetBanner?: boolean } | undefined;
  Login2FA: {
    pendingToken: string;
    methods: ('totp' | 'email')[];
    email: string;
  };
  Register: undefined;
  VerifyEmail: {
    email?: string;
    success?: string;
    token?: string;
    error?: string;
  };
  ForgotPassword: undefined;
  ResetPassword: { token?: string } | undefined;
  PaymentSuccess: { type: 'studio' | 'sponsor'; tenantId?: string };
  PaymentCancelled: undefined;
};

export type MainTabParamList = {
  Studio: undefined;
  Community: undefined;
  Notifications: undefined;
  Profile: undefined;
  Admin: undefined;
  /** Sponsor hub (same stack as Community → Sponsors sub-tab; top-level tab for sponsor accounts). */
  Sponsors: undefined;
};

export type AppStackParamList = {
  Main: undefined;
  PaymentSuccess: { type: 'studio' | 'sponsor'; tenantId?: string };
  PaymentCancelled: undefined;
  EditProfile: undefined;
  AccountSecurity: undefined;
  Support: undefined;
  CreateStudio: undefined;
  StudioOnboarding: { tenantId: string; studioName: string };
  InviteFirstMember: { tenantId: string; studioName: string };
  SetupPricing: { tenantId: string; studioName: string };
  PricingSettings: { tenantId: string; studioName: string };
  StudioSettings: { tenantId: string; studioName: string };
  StudioPlan: { tenantId: string };
  StudioFreeTier: { tenantId: string };
  Members: { tenantId: string };
  InviteMember: { tenantId: string };
  MemberProfile: {
    tenantId: string;
    userId: string;
    memberName: string;
    memberEmail: string;
    role: 'owner' | 'assistant' | 'member';
    status: 'active' | 'invited' | 'suspended';
    memberAvatarUrl?: string;
  };
  KilnList: { tenantId: string };
  KilnNewSession: { tenantId: string };
  KilnLoadMembers: {
    tenantId: string;
    firingId: string;
    kilnType: 'bisque' | 'glaze' | 'private';
    scheduledAt: string;
  };
  KilnDetail: { tenantId: string; firingId: string };
  TaskList: { tenantId?: string };
  TaskDetail: { tenantId: string; taskId: string; taskTitle?: string };
  CostList: { tenantId: string };
  CostDetail: {
    tenantId: string;
    userId: string;
    memberName: string;
    year: number;
    month: number;
    memberEmail?: string;
    memberAvatarUrl?: string;
  };
  EventList: { tenantId: string };
  EventDetail: { tenantId: string; eventId: string; eventTitle: string };
  BookStudio: { tenantId: string };
  CatalogManage: { tenantId: string };
  MaterialsShop: { tenantId: string };
  Attendance: { tenantId: string };
  AssistantsOverview: { tenantId: string };
  ArtistProfile: { userId: string };
  ForumPost: { postId: string };
  StudioPublicProfile: { studioSlug: string; studioName: string };
  AdminStudios: undefined;
  AdminSponsors: undefined;
  AdminForum: undefined;
  AdminAdmins: undefined;
  AdminPricing: undefined;
  AdminUsers: undefined;
  AdminSupport: undefined;
  SponsorPlan: undefined;
  SponsorEditProfile: undefined;
};
