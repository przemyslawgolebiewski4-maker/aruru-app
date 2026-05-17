import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors, typography, spacing } from '../../theme/tokens';
import { useAuth } from '../../hooks/useAuth';
import HomeTab from './tabs/HomeTab';
import EventFeedTab from './tabs/EventFeedTab';
import StudioFinderTab from './tabs/StudioFinderTab';
import ArtistsTab from './tabs/ArtistsTab';
import ForumTab from './tabs/ForumTab';
import SponsorsTab from './tabs/SponsorsTab';

type Tab = 'home' | 'forum' | 'feed' | 'studios' | 'artists' | 'sponsors';

function IconHome({ active }: { active: boolean }) {
  const c = active ? colors.clay : colors.inkMid;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z"
      />
      <Path
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        d="M9 21V12h6v9"
      />
    </Svg>
  );
}

function IconForum({ active }: { active: boolean }) {
  const c = active ? colors.clay : colors.inkMid;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
      />
    </Svg>
  );
}

function IconFeed({ active }: { active: boolean }) {
  const c = active ? colors.clay : colors.inkMid;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        stroke={c}
        strokeWidth={1.5}
      />
      <Path
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        d="M16 2v4M8 2v4M3 10h18"
      />
    </Svg>
  );
}

function IconStudios({ active }: { active: boolean }) {
  const c = active ? colors.clay : colors.inkMid;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9"
      />
    </Svg>
  );
}

function IconArtists({ active }: { active: boolean }) {
  const c = active ? colors.clay : colors.inkMid;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 3h8M7 3c0 0-2 3-2 7s2 5 2 8h10c0-3 2-4 2-8s-2-7-2-7M6 18h12"
      />
    </Svg>
  );
}

function IconSponsors({ active }: { active: boolean }) {
  const c = active ? colors.clay : colors.inkMid;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
      />
      <Path
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"
      />
    </Svg>
  );
}

type TabConfig = {
  key: Tab;
  label: string;
  shortLabel: string;
  Icon: React.ComponentType<{ active: boolean }>;
};

const TABS_CONFIG: TabConfig[] = [
  { key: 'home', label: 'Home', shortLabel: 'Home', Icon: IconHome },
  { key: 'forum', label: 'Forum', shortLabel: 'Forum', Icon: IconForum },
  { key: 'feed', label: 'Feed', shortLabel: 'Feed', Icon: IconFeed },
  {
    key: 'studios',
    label: 'Studios',
    shortLabel: 'Studios',
    Icon: IconStudios,
  },
  {
    key: 'artists',
    label: 'Artists',
    shortLabel: 'Artists',
    Icon: IconArtists,
  },
  {
    key: 'sponsors',
    label: 'Sponsors',
    shortLabel: 'Spons',
    Icon: IconSponsors,
  },
];

export default function CommunityScreen() {
  const { user } = useAuth();
  const isSponsor = user?.userRole === 'sponsor';

  const TABS = useMemo(
    () =>
      isSponsor
        ? TABS_CONFIG.filter((t) => t.key === 'feed' || t.key === 'sponsors')
        : TABS_CONFIG,
    [isSponsor]
  );

  const [activeTab, setActiveTab] = useState<Tab>('home');

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

  return (
    <View style={styles.root}>
      <View style={styles.layout}>
        <View style={styles.sidebar}>
          {TABS.map((t) => {
            const active = activeTab === t.key;
            const TabIcon = t.Icon;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.sidebarItem, active && styles.sidebarItemActive]}
                onPress={() => setActiveTab(t.key)}
                accessibilityRole="tab"
                accessibilityLabel={`${t.label} tab`}
                accessibilityState={{ selected: active }}
              >
                <TabIcon active={active} />
                <Text
                  style={[styles.sidebarLabel, active && styles.sidebarLabelActive]}
                  numberOfLines={2}
                >
                  {t.shortLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.content}>
          {activeTab === 'home' && (
            <HomeTab
              onSelectTab={(k) => setActiveTab(k as Tab)}
            />
          )}
          {activeTab === 'forum' && <ForumTab />}
          {activeTab === 'feed' && <EventFeedTab />}
          {activeTab === 'studios' && <StudioFinderTab />}
          {activeTab === 'artists' && <ArtistsTab />}
          {activeTab === 'sponsors' && <SponsorsTab />}
        </View>
      </View>
    </View>
  );
}

/** Keep in sync with `styles.sidebar.width` (HomeTab gallery layout). */
const COMMUNITY_SIDEBAR_WIDTH = 58;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },

  layout: { flex: 1, flexDirection: 'row' },

  sidebar: {
    width: COMMUNITY_SIDEBAR_WIDTH,
    flexShrink: 0,
    backgroundColor: colors.surface,
    borderRightWidth: 0.5,
    borderRightColor: colors.border,
    paddingTop: spacing[1],
  },
  sidebarItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
    paddingHorizontal: 3,
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
  },
  sidebarLabel: {
    fontFamily: typography.mono,
    fontSize: Platform.OS === 'web' ? 9 : 7,
    textTransform: 'uppercase',
    letterSpacing: Platform.OS === 'web' ? 0.06 : 0.04,
    color: colors.inkLight,
    textAlign: 'center',
    maxWidth: COMMUNITY_SIDEBAR_WIDTH - 4,
  },

  sidebarItemActive: {
    borderLeftColor: colors.clay,
    backgroundColor: colors.cream,
  },
  sidebarLabelActive: { color: colors.clay },

  content: { flex: 1, overflow: 'hidden' },
});
