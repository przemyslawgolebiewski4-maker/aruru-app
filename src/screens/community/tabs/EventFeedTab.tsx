import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MaterialTopTabNavigationProp } from '@react-navigation/material-top-tabs';
import { useAuth } from '../../../hooks/useAuth';
import { apiFetch } from '../../../services/api';
import { Badge } from '../../../components/ui';
import { colors, typography, fontSize, spacing } from '../../../theme/tokens';
import type { AppStackParamList, MainTabParamList } from '../../../navigation/types';

type FeedEvent = {
  id: string;
  tenantId?: string;
  studioName: string;
  studioSlug?: string;
  title: string;
  description?: string;
  kind: string;
  startsAt?: string;
  endsAt?: string;
  location?: string;
  maxParticipants?: number;
};

function kindLabel(kind: string): string {
  switch (kind) {
    case 'workshop':
      return 'Workshop';
    case 'open_studio':
      return 'Open studio';
    case 'private_event':
      return 'Private';
    case 'member_booking':
      return 'Studio time';
    default:
      return 'Event';
  }
}

function kindVariant(kind: string): 'clay' | 'moss' | 'neutral' {
  if (kind === 'workshop') return 'clay';
  if (kind === 'open_studio') return 'moss';
  return 'neutral';
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

function formatTime(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function EventFeedTab() {
  const { studios } = useAuth();
  const navigation =
    useNavigation<MaterialTopTabNavigationProp<MainTabParamList>>();
  const tenantId =
    (studios.find((s) => s.status === 'active') ?? studios[0])?.tenantId ?? '';
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{ events: FeedEvent[] }>(
        '/community/feed',
        {},
        tenantId
      );
      setEvents(res.events ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load feed.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  function goStudio(slug: string, studioName: string) {
    navigation
      .getParent<NativeStackNavigationProp<AppStackParamList>>()
      ?.navigate('StudioPublicProfile', {
        studioSlug: slug,
        studioName,
      });
  }

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
  if (events.length === 0)
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No upcoming public events.</Text>
        <Text style={styles.emptyHint}>
          Studios can publish events from their event screen.
        </Text>
      </View>
    );

  return (
    <FlatList
      data={events}
      keyExtractor={(e) => e.id}
      style={styles.list}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      renderItem={({ item: e }) => (
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.studioRow}
            onPress={() => goStudio(e.studioSlug ?? '', e.studioName)}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(e.studioName)}</Text>
            </View>
            <Text style={styles.studioName}>{e.studioName}</Text>
            <Text style={styles.dateLabel}>{formatDate(e.startsAt)}</Text>
          </TouchableOpacity>
          <Badge label={kindLabel(e.kind)} variant={kindVariant(e.kind)} />
          <Text style={styles.eventTitle}>{e.title}</Text>
          {e.startsAt ? (
            <Text style={styles.eventMeta}>
              {formatTime(e.startsAt)}
              {e.endsAt ? ` – ${formatTime(e.endsAt)}` : ''}
              {e.location ? ` · ${e.location}` : ''}
            </Text>
          ) : null}
          {e.maxParticipants ? (
            <Text style={styles.eventMeta}>{e.maxParticipants} spots max</Text>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.cream },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
    gap: spacing[2],
  },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textAlign: 'center',
  },
  sep: { height: 0.5, backgroundColor: colors.border },
  card: {
    backgroundColor: colors.surface,
    padding: spacing[4],
    gap: spacing[2],
  },
  studioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.clayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: typography.mono, fontSize: 10, color: colors.clay },
  studioName: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
    flex: 1,
  },
  dateLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  eventTitle: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
    fontWeight: '500',
  },
  eventMeta: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
});
