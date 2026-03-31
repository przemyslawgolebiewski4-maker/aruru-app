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
import MembersScreen from '../screens/members/MembersScreen';
import InviteMemberScreen from '../screens/members/InviteMemberScreen';
import MemberProfileScreen from '../screens/members/MemberProfileScreen';
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

function AuthNavigator({
  initialRouteName,
}: {
  initialRouteName: keyof AuthStackParamList;
}) {
  return (
    <AuthStack.Navigator
      initialRouteName={initialRouteName}
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

  if (user) {
    return <AppNavigator />;
  }

  return (
    <AuthNavigator
      initialRouteName={onboardingDone ? 'Login' : 'Onboarding'}
    />
  );
}

export function AppNavigationContainer() {
  return (
    <NavigationContainer>
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
