import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../services/api';
import type { AppStackParamList } from '../../navigation/types';
import HomeTab from './tabs/HomeTab';
import EventFeedTab from './tabs/EventFeedTab';
import StudioFinderTab from './tabs/StudioFinderTab';
import ArtistsTab from './tabs/ArtistsTab';
import ForumTab from './tabs/ForumTab';
import SponsorsTab from './tabs/SponsorsTab';

type Tab = 'home' | 'feed' | 'studios' | 'artists' | 'forum' | 'sponsors';

export default function CommunityScreen() {
  const { user, studios } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const stackNav =
    navigation.getParent<NativeStackNavigationProp<AppStackParamList>>() ??
    navigation;
  const fallbackTenantId =
    studios.find((s) => s.status === 'active')?.tenantId ??
    studios[0]?.tenantId ??
    '';
  const isSponsor = user?.userRole === 'sponsor';

  const TABS: { key: Tab; label: string }[] = useMemo(
    () =>
      isSponsor
        ? [
            { key: 'feed', label: 'Feed' },
            { key: 'sponsors', label: 'Sponsors' },
          ]
        : [
            { key: 'home', label: 'Home' },
            { key: 'forum', label: 'Forum' },
            { key: 'feed', label: 'Feed' },
            { key: 'studios', label: 'Studios' },
            { key: 'artists', label: 'Artists' },
            { key: 'sponsors', label: 'Sponsors' },
          ],
    [isSponsor]
  );

  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      apiFetch<{ unread?: number; notifications?: unknown[] }>(
        '/notifications',
        {},
        fallbackTenantId
      )
        .then((res) => {
          const count =
            typeof res.unread === 'number'
              ? res.unread
              : Array.isArray(res.notifications)
                ? res.notifications.filter((n: any) => !n.read && !n.is_read)
                    .length
                : 0;
          setUnreadCount(count);
        })
        .catch(() => {});
    }, [fallbackTenantId])
  );

  useEffect(() => {
    if (isSponsor) {
      setActiveTab('feed');
    }
  }, [isSponsor]);

  useEffect(() => {
    if (!TABS.some((t) => t.key === activeTab)) {
      setActiveTab(TABS[0]?.key ?? 'feed');
    }
  }, [TABS, activeTab]);

  const isWeb = Platform.OS === 'web';
  const activeContent = (
    <>
      {activeTab === 'home' && <HomeTab onSelectTab={setActiveTab} />}
      {activeTab === 'feed' && <EventFeedTab />}
      {activeTab === 'studios' && <StudioFinderTab />}
      {activeTab === 'artists' && <ArtistsTab />}
      {activeTab === 'forum' && <ForumTab />}
      {activeTab === 'sponsors' && <SponsorsTab />}
    </>
  );

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Community</Text>
        <View style={styles.topBarIcons}>
          <TouchableOpacity
            onPress={() => stackNav?.navigate('Settings')}
            style={styles.topBarIcon}
            accessibilityLabel="Settings"
            accessibilityRole="button"
          >
            <View style={styles.iconCircle}>
              <Text style={styles.iconSymbol}>⚙</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => stackNav?.navigate('Notifications')}
            style={styles.topBarIcon}
            accessibilityLabel={
              unreadCount > 0
                ? `${unreadCount} unread notifications`
                : 'Notifications'
            }
            accessibilityRole="button"
          >
            <View style={styles.iconCircle}>
              <Text style={styles.iconSymbol}>🔔</Text>
            </View>
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadCount > 9 ? '9+' : String(unreadCount)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      {isWeb ? (
        <View style={styles.webLayout}>
          <View style={styles.webSidebar}>
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.webSidebarItem,
                  activeTab === t.key && styles.webSidebarItemActive,
                ]}
                onPress={() => setActiveTab(t.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.webSidebarLabel,
                    activeTab === t.key && styles.webSidebarLabelActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.webContent}>{activeContent}</View>
        </View>
      ) : (
        <>
          <View style={styles.tabBar}>
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab, activeTab === t.key && styles.tabActive]}
                onPress={() => setActiveTab(t.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    activeTab === t.key && styles.tabLabelActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.content}>{activeContent}</View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.surface,
    borderBottomWidth: 0,
  },
  topBarTitle: {
    fontFamily: typography.display,
    fontSize: 18,
    color: colors.clay,
  },
  topBarIcons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  topBarIcon: { padding: spacing[1], position: 'relative' },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSymbol: { fontSize: 14, color: colors.inkMid },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  notifBadgeText: {
    fontFamily: typography.mono,
    fontSize: 9,
    color: colors.surface,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[2],
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.clay },
  tabLabel: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabLabelActive: { color: colors.clay },
  content: { flex: 1 },
  webLayout: { flex: 1, flexDirection: 'row' },
  webSidebar: {
    width: 160,
    backgroundColor: colors.surface,
    borderRightWidth: 0.5,
    borderRightColor: colors.border,
    paddingTop: spacing[2],
  },
  webSidebarItem: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
  },
  webSidebarItemActive: {
    borderLeftColor: colors.clay,
    backgroundColor: colors.cream,
  },
  webSidebarLabel: {
    fontFamily: typography.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.inkLight,
  },
  webSidebarLabelActive: { color: colors.clay },
  webContent: { flex: 1 },
});
