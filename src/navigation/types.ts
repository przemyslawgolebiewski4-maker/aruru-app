export type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  VerifyEmail: { email: string };
};

export type MainTabParamList = {
  Studio: undefined;
  Community: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  Main: undefined;
  EditProfile: undefined;
  CreateStudio: undefined;
  SetupPricing: { tenantId: string; studioName: string };
  PricingSettings: { tenantId: string; studioName: string };
  Members: { tenantId: string };
  InviteMember: { tenantId: string };
  MemberProfile: {
    tenantId: string;
    userId: string;
    memberName: string;
    memberEmail: string;
    role: 'owner' | 'assistant' | 'member';
    status: 'active' | 'invited' | 'suspended';
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
  TaskList: { tenantId: string };
  TaskDetail: { tenantId: string; taskId: string; taskTitle: string };
  CostList: { tenantId: string };
  CostDetail: {
    tenantId: string;
    userId: string;
    memberName: string;
    year: number;
    month: number;
    memberEmail?: string;
  };
};
