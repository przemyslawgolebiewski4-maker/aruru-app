import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet as RNStyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import {
  createMaterialTopTabNavigator,
  MaterialTopTabBar,
} from '@react-navigation/material-top-tabs';
import type { MaterialTopTabNavigationProp } from '@react-navigation/material-top-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors, spacing, typography } from '../theme/tokens';
import type { AppStackParamList, MainTabParamList } from './types';
import { useAuth } from '../hooks/useAuth';
import { userHasAdminTabAccess, apiFetch } from '../services/api';
import DashboardScreen from '../screens/owner/DashboardScreen';
import CommunityScreen from '../screens/community/CommunityScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import AdminScreen from '../screens/admin/AdminScreen';
import SponsorsTab from '../screens/community/tabs/SponsorsTab';

const Tab = createMaterialTopTabNavigator<MainTabParamList>();

/** Visual chrome height (pill strip); touch targets use hitSlop where needed */
const BAR_HEIGHT = Platform.OS === 'web' ? 44 : 42;

const WHITE = '#FFFFFF';

const tabScreenOptions = {
  swipeEnabled: false,
  tabBarStyle: { height: 0, overflow: 'hidden' as const },
};

type MaterialTabBarProps = React.ComponentProps<typeof MaterialTopTabBar>;

function IconCommunityPill({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth={1.5} />
      <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth={1.5} />
      <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth={1.5} />
      <Rect x="14" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

function IconProfilePill({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={3.5} stroke={color} strokeWidth={1.5} />
      <Path
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        d="M5 20.5v-.5a7 7 0 0 1 14 0v.5"
      />
    </Svg>
  );
}

function IconStudioPill({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9"
      />
    </Svg>
  );
}

function IconSponsorsPill({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
      />
      <Path stroke={color} strokeWidth={1.5} strokeLinecap="round" d="M3.27 6.96 12 12.01l8.73-5.05" />
    </Svg>
  );
}

function IconAdminPill({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6L12 2z"
      />
    </Svg>
  );
}

function TabPillIcon({
  routeName,
  color,
}: {
  routeName: keyof MainTabParamList;
  color: string;
}) {
  switch (routeName) {
    case 'Community':
      return <IconCommunityPill color={color} />;
    case 'Profile':
      return <IconProfilePill color={color} />;
    case 'Studio':
      return <IconStudioPill color={color} />;
    case 'Sponsors':
      return <IconSponsorsPill color={color} />;
    case 'Admin':
      return <IconAdminPill color={color} />;
    default:
      return <IconCommunityPill color={color} />;
  }
}

function getTabLabel(
  options: { tabBarLabel?: unknown; title?: unknown },
  routeName: string
): string {
  const raw =
    typeof options.tabBarLabel === 'string'
      ? options.tabBarLabel
      : typeof options.title === 'string'
        ? options.title
        : routeName;
  return String(raw);
}

function PillTabBar({ state, descriptors, navigation }: MaterialTabBarProps) {
  const compact = Platform.OS !== 'web';
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={pillStyles.scroll}
      contentContainerStyle={pillStyles.scrollContent}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const label = getTabLabel(options, route.name);
        const routeName = route.name as keyof MainTabParamList;
        const ink = focused ? WHITE : colors.inkLight;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            (
              navigation as unknown as MaterialTopTabNavigationProp<MainTabParamList>
            ).jumpTo(route.name as keyof MainTabParamList);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            onPress={onPress}
            activeOpacity={0.85}
            style={[
              pillStyles.pill,
              focused ? pillStyles.pillActive : pillStyles.pillIdle,
              compact && pillStyles.pillCompact,
            ]}
            hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
          >
            <TabPillIcon routeName={routeName} color={ink} />
            <Text
              style={[pillStyles.pillLabel, focused && pillStyles.pillLabelActive]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function useNotificationUnreadCount(): number {
  const { studios, activeTenantId } = useAuth();
  const tenantId =
    studios.find((s) => s.tenantId === activeTenantId)?.tenantId ??
    studios.find((s) => s.status === 'active')?.tenantId ??
    studios[0]?.tenantId ??
    '';
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!tenantId) {
      setUnread(0);
      return;
    }
    let alive = true;
    async function poll() {
      try {
        const res = await apiFetch<{ unread?: number }>(
          '/notifications',
          {},
          tenantId
        );
        if (!alive) return;
        if (typeof res.unread === 'number') {
          setUnread(res.unread);
        }
      } catch {
        if (alive) setUnread(0);
      }
    }
    void poll();
    const id = setInterval(poll, 45000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [tenantId]);

  return unread;
}

function TopBarActions() {
  const nav = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const unread = useNotificationUnreadCount();

  return (
    <View style={tbStyles.row}>
      <TouchableOpacity
        onPress={() => nav.navigate('Settings')}
        style={tbStyles.iconBtn}
        accessibilityLabel="Settings"
        accessibilityRole="button"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
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
        style={tbStyles.iconBtn}
        accessibilityLabel="Notifications"
        accessibilityRole="button"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={tbStyles.bellWrap}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              stroke={colors.inkLight}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
            />
          </Svg>
          {unread > 0 ? <View style={tbStyles.notifDot} /> : null}
        </View>
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
              <PillTabBar {...props} />
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
            <PillTabBar {...props} />
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

const pillStyles = RNStyleSheet.create({
  scroll: {
    flex: 1,
    maxHeight: BAR_HEIGHT,
    minWidth: 0,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    gap: Platform.OS === 'web' ? 8 : 6,
    paddingVertical: 2,
    minHeight: BAR_HEIGHT,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Platform.OS === 'web' ? 8 : 7,
    paddingHorizontal: Platform.OS === 'web' ? 12 : 8,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  pillCompact: {
    paddingHorizontal: Platform.OS === 'web' ? 10 : 6,
  },
  pillActive: {
    backgroundColor: colors.clay,
    borderColor: colors.clay,
  },
  pillIdle: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  pillLabel: {
    fontFamily: typography.mono,
    fontSize: Platform.OS === 'web' ? 10 : 9,
    letterSpacing: Platform.OS === 'web' ? 0.06 : 0.05,
    textTransform: 'uppercase',
    color: colors.inkLight,
    maxWidth: Platform.OS === 'web' ? 200 : 88,
  },
  pillLabelActive: {
    color: WHITE,
    fontFamily: typography.monoMedium,
  },
});

const tbStyles = RNStyleSheet.create({
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    minHeight: BAR_HEIGHT,
    paddingHorizontal: Platform.OS === 'web' ? spacing[4] : spacing[2],
  },
  tabBarWrap: {
    flex: 1,
    minWidth: 0,
    minHeight: BAR_HEIGHT,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'web' ? 4 : 2,
    flexShrink: 0,
    paddingLeft: 4,
  },
  iconBtn: {
    width: Platform.OS === 'web' ? 36 : 34,
    height: Platform.OS === 'web' ? 36 : 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  bellWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 1,
    right: 2,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.clay,
  },
});
