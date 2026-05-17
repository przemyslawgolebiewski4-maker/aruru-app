import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import {
  createMaterialTopTabNavigator,
  MaterialTopTabBar,
} from '@react-navigation/material-top-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography } from '../theme/tokens';
import type { AppStackParamList, MainTabParamList } from './types';
import { useAuth } from '../hooks/useAuth';
import { userHasAdminTabAccess } from '../services/api';
import DashboardScreen from '../screens/owner/DashboardScreen';
import CommunityScreen from '../screens/community/CommunityScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import AdminScreen from '../screens/admin/AdminScreen';
import SponsorsTab from '../screens/community/tabs/SponsorsTab';

const Tab = createMaterialTopTabNavigator<MainTabParamList>();

const tabScreenOptions = {
  tabBarStyle: {
    backgroundColor: colors.surface,
    height: 44,
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
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  },
  tabBarActiveTintColor: colors.clay,
  tabBarInactiveTintColor: colors.inkLight,
  tabBarScrollEnabled: true,
  tabBarItemStyle: { paddingVertical: 8, minWidth: 80 },
  tabBarShowLabel: true,
  tabBarPressColor: colors.clayLight,
  swipeEnabled: false,
};

function TopBarActions() {
  const nav = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  return (
    <View style={tbStyles.row}>
      <TouchableOpacity
        onPress={() => nav.navigate('Settings')}
        style={tbStyles.iconBtn}
        accessibilityLabel="Settings"
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={tbStyles.iconText}>⚙</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => nav.navigate('Notifications')}
        style={tbStyles.iconBtn}
        accessibilityLabel="Notifications"
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={tbStyles.iconText}>🔔</Text>
      </TouchableOpacity>
    </View>
  );
}

function renderMainTabBar(
  props: React.ComponentProps<typeof MaterialTopTabBar>
) {
  return (
    <View style={tbStyles.bar}>
      <View style={tbStyles.tabs}>
        <MaterialTopTabBar {...props} style={tbStyles.materialTabBar} />
      </View>
      <TopBarActions />
    </View>
  );
}

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
        tabBar={renderMainTabBar}
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
      tabBar={renderMainTabBar}
    >
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{ title: 'Community' }}
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

const tbStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  tabs: { flex: 1 },
  materialTabBar: { elevation: 0, shadowOpacity: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing[2],
    gap: 4,
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 14,
    color: colors.inkMid,
  },
});
