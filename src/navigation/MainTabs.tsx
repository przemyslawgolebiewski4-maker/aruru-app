import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet as RNStyleSheet,
  Platform,
} from 'react-native';
import {
  createMaterialTopTabNavigator,
  MaterialTopTabBar,
} from '@react-navigation/material-top-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, Circle } from 'react-native-svg';
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

const mainNavHeight = Platform.OS === 'web' ? 38 : 34;

/** Matches mockup `.main-nav` / `.mob-main-nav` — row chrome is `navRow`; tab strip is transparent so one bottom border. */
const tabScreenOptions = {
  tabBarStyle: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
    height: mainNavHeight,
  },
  tabBarIndicatorStyle: {
    backgroundColor: colors.clay,
    height: 2,
  },
  tabBarLabelStyle: {
    fontFamily: typography.mono,
    fontSize: Platform.OS === 'web' ? 9 : 8,
    letterSpacing: Platform.OS === 'web' ? 0.07 : 0.05,
    textTransform: 'uppercase' as const,
    marginHorizontal: 0,
  },
  tabBarActiveTintColor: colors.clay,
  tabBarInactiveTintColor: colors.inkLight,
  tabBarScrollEnabled: true,
  /** `.main-nav-tab` / `.mob-nav-tab` — padding 0 14 / 0 8; no stretch tabs across full width */
  tabBarItemStyle: {
    flex: 0,
    flexShrink: 0,
    paddingHorizontal: Platform.OS === 'web' ? 14 : 8,
    paddingVertical: 0,
    minWidth: 0,
    height: mainNavHeight,
  },
  tabBarContentContainerStyle: {
    flexGrow: 0,
    alignItems: 'center',
  },
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
        style={tbStyles.btn}
        accessibilityLabel="Settings"
        accessibilityRole="button"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Svg
          width={Platform.OS === 'web' ? 18 : 16}
          height={Platform.OS === 'web' ? 18 : 16}
          viewBox="0 0 24 24"
          fill="none"
        >
          <Circle cx={12} cy={12} r={0.01} fill="none" />
          <Path
            stroke={colors.inkLight}
            strokeWidth={1.5}
            strokeLinecap="round"
            d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
          />
          <Path
            stroke={colors.inkLight}
            strokeWidth={1.5}
            strokeLinecap="round"
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
          />
        </Svg>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => nav.navigate('Notifications')}
        style={tbStyles.btn}
        accessibilityLabel="Notifications"
        accessibilityRole="button"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Svg
          width={Platform.OS === 'web' ? 18 : 16}
          height={Platform.OS === 'web' ? 18 : 16}
          viewBox="0 0 24 24"
          fill="none"
        >
          <Path
            stroke={colors.inkLight}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
          />
        </Svg>
      </TouchableOpacity>
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
        tabBar={(props) => (
          <View style={tbStyles.navRow}>
            <View style={tbStyles.tabBarWrap}>
              <MaterialTopTabBar {...props} />
            </View>
            <TopBarActions />
          </View>
        )}
      >
        <Tab.Screen
          name="Community"
          component={CommunityScreen}
          options={{ title: 'Community' }}
        />
        <Tab.Screen
          name="Sponsors"
          component={SponsorsTab}
          options={{
            title: 'Sponsors',
            tabBarLabel:
              Platform.OS === 'web' ? 'Sponsors' : 'Spons',
          }}
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
      tabBar={(props) => (
        <View style={tbStyles.navRow}>
          <View style={tbStyles.tabBarWrap}>
            <MaterialTopTabBar {...props} />
          </View>
          <TopBarActions />
        </View>
      )}
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
        options={{
          title: 'Studio',
          tabBarLabel:
            Platform.OS === 'web' ? 'Studio' : 'STU',
        }}
      />
      {showAdminTab ? (
        <Tab.Screen
          name="Admin"
          component={AdminScreen}
          options={{
            title: 'Admin',
            tabBarLabel:
              Platform.OS === 'web' ? 'Admin' : 'ADM',
          }}
        />
      ) : null}
    </Tab.Navigator>
  );
}

const tbStyles = RNStyleSheet.create({
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    height: mainNavHeight,
    paddingHorizontal: Platform.OS === 'web' ? spacing[4] : spacing[2],
  },
  tabBarWrap: {
    flex: 1,
    height: mainNavHeight,
    minWidth: 0,
    overflow: 'hidden',
  },
  /** `.nav-icons` — gap 2px (desktop), 1px mobile */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'web' ? 2 : 1,
    height: mainNavHeight,
    flexShrink: 0,
  },
  /** `.nav-icon-btn` — 28×28 / 26×26, radius 4 */
  btn: {
    width: Platform.OS === 'web' ? 28 : 26,
    height: Platform.OS === 'web' ? 28 : 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
});
