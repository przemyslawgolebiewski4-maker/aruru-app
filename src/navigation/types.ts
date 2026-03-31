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
};
