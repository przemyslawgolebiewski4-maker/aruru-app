import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { colors, typography } from '../theme/tokens';
import type { MainTabParamList } from './types';
import { useAuth } from '../hooks/useAuth';
import { userHasAdminTabAccess } from '../services/api';
import DashboardScreen from '../screens/owner/DashboardScreen';
import CommunityScreen from '../screens/community/CommunityScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import AdminScreen from '../screens/admin/AdminScreen';
import SponsorsTab from '../screens/community/tabs/SponsorsTab';

const Tab = createMaterialTopTabNavigator<MainTabParamList>();

const tabScreenOptions = {
  tabBarStyle: {
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    elevation: 0,
    shadowOpacity: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
  },
  tabBarIndicatorStyle: {
    backgroundColor: colors.clay,
    height: 2,
  },
  tabBarLabelStyle: {
    fontFamily: typography.mono,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  },
  tabBarActiveTintColor: colors.clay,
  tabBarInactiveTintColor: colors.inkLight,
  tabBarScrollEnabled: true,
  tabBarItemStyle: { paddingVertical: 8 },
  tabBarShowLabel: true,
  tabBarPressColor: colors.clayLight,
};

export function MainTabNavigator() {
  const { user } = useAuth();
  const isSponsor = user?.userRole === 'sponsor';
  const showAdminTab =
    !isSponsor && userHasAdminTabAccess(user);

  if (isSponsor) {
    return (
      <Tab.Navigator
        initialRouteName="Community"
        screenOptions={tabScreenOptions}
      >
        <Tab.Screen
          name="Community"
          component={CommunityScreen}
          options={{ title: 'Community' }}
        />
        <Tab.Screen
          name="Sponsors"
          component={SponsorsTab}
          options={{ title: 'Sponsors' }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: 'Profile' }}
        />
      </Tab.Navigator>
    );
  }

  return (
    <Tab.Navigator
      initialRouteName="Community"
      screenOptions={tabScreenOptions}
    >
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{ title: 'Community' }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Alerts' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Tab.Screen
        name="Studio"
        component={DashboardScreen}
        options={{ title: 'Studio' }}
      />
      {showAdminTab ? (
        <Tab.Screen
          name="Admin"
          component={AdminScreen}
          options={{
            title: 'Admin',
            tabBarLabel: 'Admin',
          }}
        />
      ) : null}
    </Tab.Navigator>
  );
}
