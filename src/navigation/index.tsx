import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NavigationContainer,
  getStateFromPath as getStateFromPathDefault,
  type LinkingOptions,
} from '@react-navigation/native';
import type { NavigationState, PartialState } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { colors, typography, fontSize, spacing } from '../theme/tokens';

import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import Login2FAScreen from '../screens/auth/Login2FAScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import VerifyEmailScreen from '../screens/auth/VerifyEmailScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import PaymentSuccessScreen from '../screens/payment/PaymentSuccessScreen';
import PaymentCancelledScreen from '../screens/payment/PaymentCancelledScreen';
import { MainTabNavigator } from './MainTabs';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import AccountSecurityScreen from '../screens/profile/AccountSecurityScreen';
import CreateStudioScreen from '../screens/studio/CreateStudioScreen';
import StudioOnboardingScreen from '../screens/studio/StudioOnboardingScreen';
import InviteFirstMemberScreen from '../screens/studio/InviteFirstMemberScreen';
import SetupPricingScreen from '../screens/studio/SetupPricingScreen';
import PricingSettingsScreen from '../screens/studio/PricingSettingsScreen';
import StudioSettingsScreen from '../screens/studio/StudioSettingsScreen';
import MembersScreen from '../screens/members/MembersScreen';
import InviteMemberScreen from '../screens/members/InviteMemberScreen';
import MemberProfileScreen from '../screens/members/MemberProfileScreen';
import KilnListScreen from '../screens/kiln/KilnListScreen';
import KilnNewSessionScreen from '../screens/kiln/KilnNewSessionScreen';
import KilnLoadMembersScreen from '../screens/kiln/KilnLoadMembersScreen';
import KilnDetailScreen from '../screens/kiln/KilnDetailScreen';
import TaskListScreen from '../screens/tasks/TaskListScreen';
import TaskDetailScreen from '../screens/tasks/TaskDetailScreen';
import CostListScreen from '../screens/costs/CostListScreen';
import CostDetailScreen from '../screens/costs/CostDetailScreen';
import EventListScreen from '../screens/events/EventListScreen';
import EventDetailScreen from '../screens/events/EventDetailScreen';
import BookStudioScreen from '../screens/member/BookStudioScreen';
import CatalogManageScreen from '../screens/materials/CatalogManageScreen';
import MaterialsShopScreen from '../screens/materials/MaterialsShopScreen';
import AttendanceScreen from '../screens/assistant/AttendanceScreen';
import AssistantsOverviewScreen from '../screens/assistant/AssistantsOverviewScreen';
import ArtistProfileScreen from '../screens/community/ArtistProfileScreen';
import ForumPostScreen from '../screens/community/ForumPostScreen';
import StudioPublicProfileScreen from '../screens/community/StudioPublicProfileScreen';
import AdminStudiosScreen from '../screens/admin/AdminStudiosScreen';
import AdminSponsorsScreen from '../screens/admin/AdminSponsorsScreen';
import AdminForumScreen from '../screens/admin/AdminForumScreen';
import AdminAdminsScreen from '../screens/admin/AdminAdminsScreen';
import AdminPricingScreen from '../screens/admin/AdminPricingScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminSupportScreen from '../screens/admin/AdminSupportScreen';
import SupportScreen from '../screens/support/SupportScreen';
import StudioPlanScreen from '../screens/studio/StudioPlanScreen';
import StudioFreeTierScreen from '../screens/studio/StudioFreeTierScreen';
import SponsorPlanScreen from '../screens/sponsor/SponsorPlanScreen';
import SponsorEditProfileScreen from '../screens/sponsor/SponsorEditProfileScreen';
import type {
  AuthStackParamList,
  AppStackParamList,
  RootStackParamList,
} from './types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

const appModalHeaderOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.clay,
  headerTitleStyle: {
    fontFamily: typography.body,
    fontSize: 16,
  },
  headerShadowVisible: false,
} as const;

const ONBOARDING_KEY = 'aruru_onboarding_done';

export type { AuthStackParamList, AppStackParamList, MainTabParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

type AuthRoute = {
  [K in keyof AuthStackParamList]: {
    name: K;
    params: AuthStackParamList[K];
  };
}[keyof AuthStackParamList];

function getWebAuthDeepLinkInitialState():
  | { routes: AuthRoute[]; index: number }
  | undefined {
  if (typeof window === 'undefined') return undefined;
  const raw = window.location.pathname || '/';
  const path = raw.replace(/\/+$/, '') || '/';
  const parts = path.split('/').filter(Boolean);
  const last = parts[parts.length - 1] ?? '';
  const q = new URLSearchParams(window.location.search);

  if (last === 'reset-password') {
    const rawToken = q.get('token') ?? undefined;
    let token: string | undefined;
    if (rawToken) {
      try {
        token = decodeURIComponent(rawToken.trim());
      } catch {
        token = rawToken.trim();
      }
    }
    return {
      routes: [
        { name: 'Login', params: undefined },
        {
          name: 'ResetPassword',
          params: { token },
        },
      ],
      index: 1,
    };
  }

  if (last === 'verify-email') {
    const email = q.get('email') ?? undefined;
    const success = q.get('success') ?? undefined;
    const token = q.get('token') ?? q.get('jwt_token') ?? undefined;
    const error = q.get('error') ?? undefined;
    if (!email && !success && !token && !error) return undefined;
    return {
      routes: [
        {
          name: 'VerifyEmail',
          params: { email, success, token, error },
        },
      ],
      index: 0,
    };
  }

  if (last === 'payment-success') {
    const typeRaw = q.get('type') ?? 'studio';
    const type = typeRaw === 'sponsor' ? 'sponsor' : 'studio';
    const tenantId = q.get('tenant_id') ?? q.get('tenantId') ?? undefined;
    return {
      routes: [{ name: 'PaymentSuccess', params: { type, tenantId } }],
      index: 0,
    };
  }

  if (last === 'payment-cancelled') {
    return {
      routes: [{ name: 'PaymentCancelled', params: undefined }],
      index: 0,
    };
  }

  return undefined;
}

function AuthNavigator({
  initialRouteName,
  deepLinkState,
}: {
  initialRouteName: keyof AuthStackParamList;
  deepLinkState: ReturnType<typeof getWebAuthDeepLinkInitialState>;
}) {
  return (
    <AuthStack.Navigator
      {...(deepLinkState
        ? { initialState: deepLinkState }
        : { initialRouteName })}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
        animation: 'slide_from_right',
      }}
    >
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen
        name="Login2FA"
        component={Login2FAScreen}
        options={{
          headerShown: true,
          title: 'Verify sign-in',
          headerTintColor: colors.ink,
          headerStyle: { backgroundColor: colors.surface },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontFamily: typography.bodyMedium,
            fontSize: fontSize.md,
            color: colors.ink,
          },
        }}
      />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <AuthStack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
      <AuthStack.Screen name="PaymentCancelled" component={PaymentCancelledScreen} />
    </AuthStack.Navigator>
  );
}

function AuthHost({
  route,
}: NativeStackScreenProps<RootStackParamList, 'Auth'>) {
  const onboardingDone = Boolean(route.params?.onboardingDone);
  const [authDeepLinkState] = useState(() => getWebAuthDeepLinkInitialState());
  return (
    <AuthNavigator
      initialRouteName={onboardingDone ? 'Login' : 'Onboarding'}
      deepLinkState={authDeepLinkState}
    />
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
      }}
    >
      <AppStack.Screen name="Main" component={MainTabNavigator} />
      <AppStack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
      <AppStack.Screen name="PaymentCancelled" component={PaymentCancelledScreen} />
      <AppStack.Screen
        name="ArtistProfile"
        component={ArtistProfileScreen}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Artist',
        }}
      />
      <AppStack.Screen
        name="ForumPost"
        component={ForumPostScreen}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Discussion',
        }}
      />
      <AppStack.Screen
        name="StudioPublicProfile"
        component={StudioPublicProfileScreen}
        options={({ route }) => ({
          ...appModalHeaderOptions,
          headerShown: true,
          title: route.params.studioName || 'Studio',
        })}
      />
      <AppStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          headerShown: true,
          title: 'Edit profile',
          headerTintColor: colors.ink,
          headerStyle: { backgroundColor: colors.surface },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontFamily: typography.bodyMedium,
            fontSize: fontSize.md,
            color: colors.ink,
          },
        }}
      />
      <AppStack.Screen
        name="AccountSecurity"
        component={AccountSecurityScreen}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Security',
        }}
      />
      <AppStack.Screen
        name="Support"
        component={SupportScreen}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Contact support',
        }}
      />
      <AppStack.Screen
        name="SponsorPlan"
        component={SponsorPlanScreen}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Choose your plan',
        }}
      />
      <AppStack.Screen
        name="StudioPlan"
        component={StudioPlanScreen}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Choose your plan',
        }}
      />
      <AppStack.Screen
        name="StudioFreeTier"
        component={StudioFreeTierScreen}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Your plan',
        }}
      />
      <AppStack.Screen
        name="SponsorEditProfile"
        component={SponsorEditProfileScreen}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Edit partner profile',
        }}
      />
      <AppStack.Screen
        name="CreateStudio"
        component={CreateStudioScreen}
        options={{
          headerShown: true,
          title: 'Create studio',
          ...appModalHeaderOptions,
        }}
      />
      <AppStack.Screen
        name="StudioOnboarding"
        component={StudioOnboardingScreen}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Your studio',
          headerBackTitle: 'Studio',
        }}
      />
      <AppStack.Screen
        name="SetupPricing"
        component={SetupPricingScreen}
        options={{
          headerShown: true,
          title: 'Pricing',
          ...appModalHeaderOptions,
        }}
      />
      <AppStack.Screen
        name="InviteFirstMember"
        component={InviteFirstMemberScreen}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Invite a member',
          headerBackTitle: 'Back',
        }}
      />
      <AppStack.Screen
        name="PricingSettings"
        component={PricingSettingsScreen}
        options={{
          headerShown: true,
          title: 'Pricing',
          headerBackTitle: 'Studio',
          ...appModalHeaderOptions,
        }}
      />
      <AppStack.Screen
        name="StudioSettings"
        component={StudioSettingsScreen}
        options={{
          headerShown: true,
          title: 'Studio settings',
          headerBackTitle: 'Studio',
          ...appModalHeaderOptions,
        }}
      />
      <AppStack.Screen
        name="Members"
        component={MembersScreen}
        options={{
          headerShown: true,
          title: 'Members',
          headerBackTitle: 'Studio',
          ...appModalHeaderOptions,
        }}
      />
      <AppStack.Screen
        name="InviteMember"
        component={InviteMemberScreen}
        options={{
          headerShown: true,
          title: 'Invite member',
          headerBackTitle: 'Studio',
          ...appModalHeaderOptions,
        }}
      />
      <AppStack.Screen
        name="MemberProfile"
        component={MemberProfileScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params.memberName,
          headerBackTitle: 'Studio',
          ...appModalHeaderOptions,
        })}
      />
      <AppStack.Screen
        name="KilnList"
        component={KilnListScreen}
        options={{
          headerShown: true,
          title: 'Kiln firings',
          headerBackTitle: 'Studio',
          ...appModalHeaderOptions,
        }}
      />
      <AppStack.Screen
        name="KilnNewSession"
        component={KilnNewSessionScreen}
        options={{
          headerShown: true,
          title: 'New firing',
          headerBackTitle: 'Studio',
          ...appModalHeaderOptions,
        }}
      />
      <AppStack.Screen
        name="KilnLoadMembers"
        component={KilnLoadMembersScreen}
        options={{
          headerShown: true,
          title: 'Load kiln',
          headerBackTitle: 'Studio',
          ...appModalHeaderOptions,
        }}
      />
      <AppStack.Screen
        name="KilnDetail"
        component={KilnDetailScreen}
        options={{
          headerShown: true,
          title: 'Firing detail',
          headerBackTitle: 'Studio',
          ...appModalHeaderOptions,
        }}
      />
      <AppStack.Screen
        name="TaskList"
        component={TaskListScreen}
        options={{
          headerShown: true,
          title: 'Tasks',
          headerBackTitle: 'Studio',
          ...appModalHeaderOptions,
        }}
      />
      <AppStack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params.taskTitle?.trim() || 'Task',
          headerBackTitle: 'Studio',
          ...appModalHeaderOptions,
        })}
      />
      <AppStack.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Attendance',
          headerBackTitle: 'Studio',
        }}
      />
      <AppStack.Screen
        name="AssistantsOverview"
        component={AssistantsOverviewScreen}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Assistants',
          headerBackTitle: 'Studio',
        }}
      />
      <AppStack.Screen
        name="CostList"
        component={CostListScreen}
        options={{
          headerShown: true,
          title: 'Cost summaries',
          headerBackTitle: 'Studio',
          ...appModalHeaderOptions,
        }}
      />
      <AppStack.Screen
        name="CostDetail"
        component={CostDetailScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params.memberName,
          headerBackTitle: 'Studio',
          ...appModalHeaderOptions,
        })}
      />
      <AppStack.Screen
        name="EventList"
        component={EventListScreen}
        options={{
          headerShown: true,
          title: 'Events',
          headerBackTitle: 'Studio',
          ...appModalHeaderOptions,
        }}
      />
      <AppStack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params.eventTitle,
          headerBackTitle: 'Studio',
          ...appModalHeaderOptions,
        })}
      />
      <AppStack.Screen
        name="BookStudio"
        component={BookStudioScreen}
        options={{
          headerShown: true,
          title: 'Book studio',
          headerBackTitle: 'Studio',
          ...appModalHeaderOptions,
        }}
      />
      <AppStack.Screen
        name="CatalogManage"
        component={CatalogManageScreen}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Catalog',
          headerBackTitle: 'Studio',
        }}
      />
      <AppStack.Screen
        name="MaterialsShop"
        component={MaterialsShopScreen}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Materials',
          headerBackTitle: 'Studio',
        }}
      />
      <AppStack.Screen
        name="AdminStudios"
        component={AdminStudiosScreen}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Studios',
        }}
      />
      <AppStack.Screen
        name="AdminSponsors"
        component={AdminSponsorsScreen}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Sponsors',
        }}
      />
      <AppStack.Screen
        name="AdminForum"
        component={AdminForumScreen}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Community',
        }}
      />
      <AppStack.Screen
        name="AdminAdmins"
        component={AdminAdminsScreen}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Admins',
        }}
      />
      <AppStack.Screen
        name="AdminPricing"
        component={AdminPricingScreen}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Pricing',
        }}
      />
      <AppStack.Screen
        name="AdminUsers"
        component={AdminUsersScreen}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Users',
        }}
      />
      <AppStack.Screen
        name="AdminSupport"
        component={AdminSupportScreen}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Support',
        }}
      />
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
  const { user, loading: authLoading } = useAuth();
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((v) => {
      setOnboardingDone(v === '1');
      setOnboardingReady(true);
    });
  }, []);

  const bootstrapping = authLoading || (!user && !onboardingReady);

  if (bootstrapping) {
    return (
      <View style={styles.boot}>
        <Text style={styles.wordmark}>
          aru<Text style={{ color: colors.clay }}>ru</Text>
        </Text>
        <ActivityIndicator color={colors.clay} style={{ marginTop: spacing[6] }} />
      </View>
    );
  }

  return (
    <RootStack.Navigator
      key={user ? 'authed' : 'guest'}
      initialRouteName={user ? 'App' : 'Auth'}
      screenOptions={{ headerShown: false }}
    >
      <RootStack.Screen name="App" component={AppNavigator} />
      <RootStack.Screen
        name="Auth"
        component={AuthHost}
        initialParams={{ onboardingDone }}
      />
    </RootStack.Navigator>
  );
}

/**
 * Paths handled by Auth stack linking. If the browser URL stays on one of these
 * after a successful login or 2FA, React Navigation would otherwise rebuild the
 * Auth stack from the URL and hide the app — common on web (/login).
 */
function isAuthOnlyPublicPath(pathWithQuery: string): boolean {
  const path = pathWithQuery.split('?')[0].replace(/\/+$/, '') || '/';
  const exact = new Set([
    '/login',
    '/register',
    '/onboarding',
    '/forgot-password',
    '/reset-password',
  ]);
  if (exact.has(path)) return true;
  return path === '/verify-email' || path.startsWith('/verify-email/');
}

/** Root state: App → Main (tabs home). Used when logged-in user hits an auth URL. */
const LOGGED_IN_ROOT_STATE: PartialState<NavigationState> = {
  routes: [
    {
      name: 'App',
      state: {
        routes: [{ name: 'Main' }],
        index: 0,
      },
    },
  ],
  index: 0,
};

const rootLinking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'https://aruru.xyz',
    'https://aruru-app.vercel.app',
    'aruru://',
  ],
  config: {
    screens: {
      App: {
        screens: {
          TaskList: {
            path: 'TaskList/:tenantId?',
            parse: {
              tenantId: (v?: string) => v,
            },
          },
          TaskDetail: {
            path: 'TaskDetail/:tenantId/:taskId',
            parse: {
              tenantId: (v: string) => v,
              taskId: (v: string) => v,
            },
          },
        },
      } as never,
      Auth: {
        screens: {
          Onboarding: 'onboarding',
          Login: 'login',
          Register: 'register',
          VerifyEmail: {
            path: 'verify-email',
            parse: {
              success: (v?: string) => v,
              token: (v?: string) => v,
              error: (v?: string) => v,
              email: (v?: string) => v,
            },
          },
          ForgotPassword: 'forgot-password',
          ResetPassword: {
            path: 'reset-password',
            parse: {
              token: (v: string) => {
                try {
                  return decodeURIComponent(v);
                } catch {
                  return v;
                }
              },
            },
          },
          PaymentSuccess: {
            path: 'payment-success',
            parse: {
              type: (v?: string) =>
                v === 'sponsor' ? 'sponsor' : 'studio',
              tenantId: (v?: string) => v,
            },
          },
          PaymentCancelled: 'payment-cancelled',
        },
      } as never,
    },
  },
};

export function AppNavigationContainer() {
  const { user } = useAuth();
  const authed = user != null;

  const linking = useMemo((): LinkingOptions<RootStackParamList> => {
    return {
      ...rootLinking,
      getStateFromPath(path, options) {
        if (authed && isAuthOnlyPublicPath(path)) {
          return LOGGED_IN_ROOT_STATE;
        }
        return getStateFromPathDefault(path, options);
      },
    };
  }, [authed]);

  return (
    <NavigationContainer
      linking={linking}
      key={authed ? 'linking-authed' : 'linking-guest'}
    >
      <RootNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: typography.display,
    fontSize: 36,
    color: colors.ink,
    letterSpacing: -0.5,
  },
});
