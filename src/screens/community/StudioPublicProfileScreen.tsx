import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../services/api';
import { Divider, Badge } from '../../components/ui';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'StudioPublicProfile'>;

type StudioProfile = {
  id: string;
  name: string;
  slug: string;
  city: string;
  country: string;
  description?: string;
  tags: string[];
  memberCount: number;
  instagramUrl?: string;
  websiteUrl?: string;
  shopUrl?: string;
};

type FeedEvent = {
  id: string;
  title: string;
  kind: string;
  startsAt?: string;
  location?: string;
  tenantId?: string;
};

function fallbackStudio(studioId: string, studioName: string): StudioProfile {
  return {
    id: studioId,
    name: studioName,
    slug: '',
    city: '',
    country: '',
    tags: [],
    memberCount: 0,
  };
}

function kindLabel(kind: string): string {
  switch (kind) {
    case 'workshop':
      return 'Workshop';
    case 'open_studio':
      return 'Open studio';
    default:
      return 'Event';
  }
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function StudioPublicProfileScreen({ route }: Props) {
  const { studioId, studioName } = route.params;
  const { studios } = useAuth();
  const tenantId =
    (studios.find((s) => s.status === 'active') ?? studios[0])?.tenantId ?? '';

  const [studio, setStudio] = useState<StudioProfile | null>(null);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [studioRes, feedRes] = await Promise.allSettled([
        apiFetch<{ studios: StudioProfile[] }>(
          `/community/studios?city=`,
          {},
          tenantId
        ),
        apiFetch<{ events: FeedEvent[] }>('/community/feed', {}, tenantId),
      ]);

      if (studioRes.status === 'fulfilled') {
        const list = studioRes.value.studios ?? [];
        const found = list.find((s) => s.id === studioId);
        setStudio(found ?? fallbackStudio(studioId, studioName));
      } else {
        setStudio(fallbackStudio(studioId, studioName));
      }

      if (feedRes.status === 'fulfilled') {
        const studioEvents = (feedRes.value.events ?? [])
          .filter((e) => e.tenantId === studioId)
          .slice(0, 5);
        setEvents(studioEvents);
      } else {
        setEvents([]);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load studio.');
      setStudio(fallbackStudio(studioId, studioName));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [studioId, studioName, tenantId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.clay} />
      </View>
    );
  if (error)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  if (!studio)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Studio not found.</Text>
      </View>
    );

  const tags = studio.tags ?? [];
  const ig = studio.instagramUrl?.trim();
  const web = studio.websiteUrl?.trim();
  const shop = studio.shopUrl?.trim();
  const hasLinks = Boolean(ig || web || shop);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatarLg}>
          <Text style={styles.avatarText}>
            {studio.name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{studio.name}</Text>
        {studio.city || studio.country ? (
          <Text style={styles.location}>
            {[studio.city, studio.country].filter(Boolean).join(', ')}
          </Text>
        ) : null}
        {studio.description ? (
          <Text style={styles.description}>{studio.description}</Text>
        ) : null}
        <Text style={styles.memberCount}>{studio.memberCount} members</Text>
        {tags.length > 0 ? (
          <View style={styles.tags}>
            {tags.map((tag, i) => (
              <View key={`${tag}-${i}`} style={styles.tag}>
                <Text style={styles.tagLabel}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {events.length > 0 ? (
        <>
          <Divider />
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Upcoming events</Text>
            {events.map((e) => (
              <View key={e.id} style={styles.eventRow}>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{e.title}</Text>
                  <Text style={styles.eventMeta}>
                    {formatDate(e.startsAt)}
                    {e.location ? ` · ${e.location}` : ''}
                  </Text>
                </View>
                <Badge label={kindLabel(e.kind)} variant="neutral" />
              </View>
            ))}
          </View>
        </>
      ) : null}

      {hasLinks ? (
        <>
          <Divider />
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Links</Text>
            {ig ? (
              <TouchableOpacity onPress={() => void Linking.openURL(ig)}>
                <Text style={styles.linkRow}>Instagram</Text>
              </TouchableOpacity>
            ) : null}
            {web ? (
              <TouchableOpacity onPress={() => void Linking.openURL(web)}>
                <Text style={styles.linkRow}>Website</Text>
              </TouchableOpacity>
            ) : null}
            {shop ? (
              <TouchableOpacity onPress={() => void Linking.openURL(shop)}>
                <Text style={styles.linkRow}>Shop</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { paddingBottom: spacing[6] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  header: {
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  avatarLg: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: colors.mossLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  avatarText: {
    fontFamily: typography.mono,
    fontSize: 24,
    color: colors.moss,
  },
  name: {
    fontFamily: typography.body,
    fontSize: fontSize.xl,
    color: colors.ink,
  },
  location: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  description: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  memberCount: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    justifyContent: 'center',
    marginTop: spacing[1],
  },
  tag: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.cream,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  tagLabel: {
    fontFamily: typography.mono,
    fontSize: 9,
    color: colors.inkLight,
  },
  section: { padding: spacing[4], gap: spacing[3] },
  sectionLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  eventInfo: { flex: 1 },
  eventTitle: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  eventMeta: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: 2,
  },
  linkRow: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.clay,
    paddingVertical: spacing[1],
  },
});
