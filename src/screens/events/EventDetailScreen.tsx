import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Badge, Button, SectionLabel } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { confirmDestructive } from '../../utils/confirmAction';
import type { StudioEvent } from './EventListScreen';
import {
  formatDate,
  formatTime,
  kindBadgeLabel,
  kindBadgeVariant,
} from './EventListScreen';

type Route = RouteProp<AppStackParamList, 'EventDetail'>;

function parseEventDetail(data: unknown): StudioEvent | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  if (o.event != null && typeof o.event === 'object') {
    return o.event as StudioEvent;
  }
  if ('id' in o || 'title' in o) {
    return o as unknown as StudioEvent;
  }
  return null;
}

export default function EventDetailScreen({ route }: { route: Route }) {
  const { tenantId, eventId } = route.params;
  const navigation = useNavigation();
  const { studios } = useAuth();

  const role = studios.find((s) => s.tenantId === tenantId)?.role;
  const isStaff = role === 'owner' || role === 'assistant';

  const [ev, setEv] = useState<StudioEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch<unknown>(
        `/studios/${tenantId}/events/${eventId}`,
        {},
        tenantId
      );
      const parsed = parseEventDetail(data);
      setEv(parsed);
      if (parsed?.title) {
        navigation.setOptions({ title: parsed.title });
      }
      if (!parsed) setError('Event not found.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load event.');
      setEv(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId, eventId, navigation]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function onCancelEvent() {
    const ok = await confirmDestructive(
      'Cancel event',
      'Cancel this event? This cannot be undone.',
      'Cancel event'
    );
    if (!ok) return;
    setCancelling(true);
    setError('');
    try {
      await apiFetch(
        `/studios/${tenantId}/events/${eventId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'cancelled' }),
        },
        tenantId
      );
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not cancel event.');
    } finally {
      setCancelling(false);
    }
  }

  if (loading && !ev) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.clay} />
      </View>
    );
  }

  if (!ev) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Not found.'}</Text>
      </View>
    );
  }

  const statusStr = (ev.status ?? '').toLowerCase();
  const isPublished = statusStr === 'published';
  const isCancelled = statusStr === 'cancelled';

  const loc = (ev.location ?? '').trim();
  const max = ev.maxParticipants;
  const desc = (ev.description ?? '').trim();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerCard}>
        <Text style={styles.title}>{ev.title || 'Event'}</Text>
        <View style={styles.badgeWrap}>
          <Badge
            label={kindBadgeLabel(ev.kind)}
            variant={kindBadgeVariant(ev.kind)}
          />
        </View>
        {ev.startsAt ? (
          <Text style={styles.infoRow}>
            📅 {formatDate(ev.startsAt)} {formatTime(ev.startsAt)}
            {ev.endsAt
              ? ` → ${formatTime(ev.endsAt)}`
              : ''}
          </Text>
        ) : null}
        {loc ? (
          <Text style={styles.infoRow}>📍 {loc}</Text>
        ) : null}
        {max != null && max > 0 ? (
          <Text style={styles.infoRow}>👥 Max {max} participants</Text>
        ) : null}
        {desc ? <Text style={styles.description}>{desc}</Text> : null}
      </View>

      {error ? <Text style={styles.errBanner}>{error}</Text> : null}

      {isStaff && isPublished ? (
        <>
          <SectionLabel>ACTIONS</SectionLabel>
          <Button
            label="Cancel event"
            variant="danger"
            onPress={() => void onCancelEvent()}
            disabled={cancelling}
            loading={cancelling}
            fullWidth
            accessibilityLabel="Cancel event"
          />
        </>
      ) : null}

      {isCancelled ? (
        <View style={styles.cancelledCard}>
          <Text style={styles.cancelledText}>
            This event has been cancelled.
          </Text>
        </View>
      ) : null}

      <View style={{ height: spacing[10] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 24, paddingBottom: 40 },
  centered: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
  },
  headerCard: {
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 20,
  },
  title: {
    fontFamily: typography.display,
    fontSize: 22,
    color: colors.ink,
  },
  badgeWrap: { marginTop: 6, alignSelf: 'flex-start' },
  infoRow: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
    marginTop: 12,
    lineHeight: 22,
  },
  description: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkMid,
    marginTop: 12,
    lineHeight: 22,
  },
  errBanner: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing[2],
  },
  cancelledCard: {
    backgroundColor: colors.errorLight,
    borderRadius: radius.md,
    padding: 12,
    marginTop: spacing[3],
  },
  cancelledText: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.error,
  },
});
