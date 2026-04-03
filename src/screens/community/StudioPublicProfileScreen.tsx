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
import { AvatarImage } from '../../components/AvatarImage';
import { Divider, Badge } from '../../components/ui';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'StudioPublicProfile'>;

type FeedEvent = {
  id: string;
  title: string;
  kind: string;
  startsAt?: string;
  endsAt?: string;
  location?: string;
  maxParticipants?: number;
};

type StudioProfile = {
  id: string;
  name: string;
  slug: string;
  city: string;
  country: string;
  publicDescription?: string;
  tags: string[];
  memberCount: number;
  logoUrl?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  shopUrl?: string;
  upcomingEvents: FeedEvent[];
};

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
  const { studioSlug, studioName } = route.params;
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
    const slug = studioSlug?.trim();
    if (!slug) {
      setError('Studio not found.');
      setStudio(null);
      setEvents([]);
      setLoading(false);
      return;
    }
    try {
      const encoded = encodeURIComponent(slug);
      const res = await apiFetch<StudioProfile & { logo_url?: string }>(
        `/community/studios/${encoded}`,
        {},
        tenantId
      );
      setStudio({
        ...res,
        logoUrl: res.logoUrl ?? res.logo_url,
      });
      setEvents(res.upcomingEvents ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load studio.');
      setStudio(null);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [studioSlug, tenantId]);

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
  const headerInitials = (studio.name || studioName || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const ig = studio.instagramUrl?.trim();
  const web = studio.websiteUrl?.trim();
  const shop = studio.shopUrl?.trim();
  const hasLinks = Boolean(ig || web || shop);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatarLg}>
          <AvatarImage
            url={studio.logoUrl}
            initials={headerInitials}
            size={72}
            borderRadius={14}
            bgColor={colors.mossLight}
            textColor={colors.moss}
          />
        </View>
        <Text style={styles.name}>{studio.name || studioName}</Text>
        {studio.city || studio.country ? (
          <Text style={styles.location}>
            {[studio.city, studio.country].filter(Boolean).join(', ')}
          </Text>
        ) : null}
        {studio.publicDescription ? (
          <Text style={styles.description}>{studio.publicDescription}</Text>
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
    overflow: 'hidden',
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
