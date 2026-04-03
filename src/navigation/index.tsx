import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { colors, typography, fontSize, spacing } from '../theme/tokens';

import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import VerifyEmailScreen from '../screens/auth/VerifyEmailScreen';
import { MainTabNavigator } from './MainTabs';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import CreateStudioScreen from '../screens/studio/CreateStudioScreen';
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
import AdminSectionPlaceholder from '../screens/admin/AdminSectionPlaceholder';
import type { AuthStackParamList, AppStackParamList } from './types';

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

function getWebVerifyEmailInitialState():
  | {
      routes: Array<{
        name: 'VerifyEmail';
        params: AuthStackParamList['VerifyEmail'];
      }>;
      index: number;
    }
  | undefined {
  if (typeof window === 'undefined') return undefined;
  const raw = window.location.pathname || '/';
  const path = raw.replace(/\/+$/, '') || '/';
  const parts = path.split('/').filter(Boolean);
  const last = parts[parts.length - 1] ?? '';
  if (last !== 'verify-email') return undefined;
  const q = new URLSearchParams(window.location.search);
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

function AuthNavigator({
  initialRouteName,
  verifyNavState,
}: {
  initialRouteName: keyof AuthStackParamList;
  verifyNavState: ReturnType<typeof getWebVerifyEmailInitialState>;
}) {
  return (
    <AuthStack.Navigator
      {...(verifyNavState
        ? { initialState: verifyNavState }
        : { initialRouteName })}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
        animation: 'slide_from_right',
      }}
    >
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
    </AuthStack.Navigator>
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
        name="CreateStudio"
        component={CreateStudioScreen}
        options={{
          headerShown: true,
          title: 'Create studio',
          ...appModalHeaderOptions,
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
        name="PricingSettings"
        component={PricingSettingsScreen}
        options={{
          headerShown: true,
          title: 'Pricing',
          ...appModalHeaderOptions,
        }}
      />
      <AppStack.Screen
        name="StudioSettings"
        component={StudioSettingsScreen}
        options={{
          headerShown: true,
          title: 'Studio settings',
          ...appModalHeaderOptions,
        }}
      />
      <AppStack.Screen
        name="Members"
        component={MembersScreen}
        options={{
          headerShown: true,
          title: 'Members',
          ...appModalHeaderOptions,
        }}
      />
      <AppStack.Screen
        name="InviteMember"
        component={InviteMemberScreen}
        options={{
          headerShown: true,
          title: 'Invite member',
          ...appModalHeaderOptions,
        }}
      />
      <AppStack.Screen
        name="MemberProfile"
        component={MemberProfileScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params.memberName,
          ...appModalHeaderOptions,
        })}
      />
      <AppStack.Screen
        name="KilnList"
        component={KilnListScreen}
        options={{
          headerShown: true,
          title: 'Kiln firings',
          ...appModalHeaderOptions,
        }}
      />
      <AppStack.Screen
        name="KilnNewSession"
        component={KilnNewSessionScreen}
        options={{
          headerShown: true,
          title: 'New firing',
          ...appModalHeaderOptions,
        }}
      />
      <AppStack.Screen
        name="KilnLoadMembers"
        component={KilnLoadMembersScreen}
        options={{
          headerShown: true,
          title: 'Load kiln',
          ...appModalHeaderOptions,
        }}
      />
      <AppStack.Screen
        name="KilnDetail"
        component={KilnDetailScreen}
        options={{
          headerShown: true,
          title: 'Firing detail',
          ...appModalHeaderOptions,
        }}
      />
      <AppStack.Screen
        name="TaskList"
        component={TaskListScreen}
        options={{
          headerShown: true,
          title: 'Tasks',
          ...appModalHeaderOptions,
        }}
      />
      <AppStack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params.taskTitle,
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
        }}
      />
      <AppStack.Screen
        name="AssistantsOverview"
        component={AssistantsOverviewScreen}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Assistants',
        }}
      />
      <AppStack.Screen
        name="CostList"
        component={CostListScreen}
        options={{
          headerShown: true,
          title: 'Cost summaries',
          ...appModalHeaderOptions,
        }}
      />
      <AppStack.Screen
        name="CostDetail"
        component={CostDetailScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params.memberName,
          ...appModalHeaderOptions,
        })}
      />
      <AppStack.Screen
        name="EventList"
        component={EventListScreen}
        options={{
          headerShown: true,
          title: 'Events',
          ...appModalHeaderOptions,
        }}
      />
      <AppStack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params.eventTitle,
          ...appModalHeaderOptions,
        })}
      />
      <AppStack.Screen
        name="BookStudio"
        component={BookStudioScreen}
        options={{
          headerShown: true,
          title: 'Book studio',
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
        }}
      />
      <AppStack.Screen
        name="MaterialsShop"
        component={MaterialsShopScreen}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Materials',
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
        component={AdminSectionPlaceholder}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Community',
        }}
      />
      <AppStack.Screen
        name="AdminAdmins"
        component={AdminSectionPlaceholder}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Admins',
        }}
      />
      <AppStack.Screen
        name="AdminPricing"
        component={AdminSectionPlaceholder}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Pricing',
        }}
      />
      <AppStack.Screen
        name="AdminUsers"
        component={AdminSectionPlaceholder}
        options={{
          ...appModalHeaderOptions,
          headerShown: true,
          title: 'Users',
        }}
      />
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
  const { user, loading: authLoading } = useAuth();
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [verifyNavState] = useState(() => getWebVerifyEmailInitialState());

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

  if (user) {
    return <AppNavigator />;
  }

  return (
    <AuthNavigator
      initialRouteName={onboardingDone ? 'Login' : 'Onboarding'}
      verifyNavState={verifyNavState}
    />
  );
}

export function AppNavigationContainer() {
  return (
    <NavigationContainer linking={{
      prefixes: ['https://aruru.xyz', 'https://aruru-app.vercel.app', 'aruru://'],
      config: {
        screens: {
          VerifyEmail: {
            path: 'verify-email',
            parse: {
              success: (v) => v,
              token: (v) => v,
              error: (v) => v,
              email: (v) => v,
            },
          },
        },
      },
    }}>
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
