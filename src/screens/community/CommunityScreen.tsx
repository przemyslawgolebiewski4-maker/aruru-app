import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';
import { useAuth } from '../../hooks/useAuth';
import EventFeedTab from './tabs/EventFeedTab';
import StudioFinderTab from './tabs/StudioFinderTab';
import ArtistsTab from './tabs/ArtistsTab';
import ForumTab from './tabs/ForumTab';
import SponsorsTab from './tabs/SponsorsTab';

type Tab = 'feed' | 'studios' | 'artists' | 'forum' | 'sponsors';

export default function CommunityScreen() {
  const { user } = useAuth();
  const isSponsor = user?.userRole === 'sponsor';

  const TABS: { key: Tab; label: string }[] = useMemo(
    () =>
      isSponsor
        ? [
            { key: 'feed', label: 'Feed' },
            { key: 'sponsors', label: 'Sponsors' },
          ]
        : [
            { key: 'feed', label: 'Feed' },
            { key: 'studios', label: 'Studios' },
            { key: 'artists', label: 'Artists' },
            { key: 'forum', label: 'Forum' },
            { key: 'sponsors', label: 'Sponsors' },
          ],
    [isSponsor]
  );

  const [activeTab, setActiveTab] = useState<Tab>('feed');

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
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.content}>
        {activeTab === 'feed' && <EventFeedTab />}
        {activeTab === 'studios' && <StudioFinderTab />}
        {activeTab === 'artists' && <ArtistsTab />}
        {activeTab === 'forum' && <ForumTab />}
        {activeTab === 'sponsors' && <SponsorsTab />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
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
});
