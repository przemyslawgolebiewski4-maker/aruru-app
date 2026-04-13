import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
  parseEvents,
} from './EventListScreen';

type Route = RouteProp<AppStackParamList, 'EventDetail'>;

type Booking = {
  id: string;
  userId: string;
  spots: number;
  note?: string;
  createdAt?: string;
  userName?: string;
};

function parseEventDetail(data: unknown): StudioEvent | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  let raw: Record<string, unknown> | null = null;
  if (o.event != null && typeof o.event === 'object') {
    raw = o.event as Record<string, unknown>;
  } else if ('id' in o || 'title' in o) {
    raw = o as Record<string, unknown>;
  }
  if (!raw) return null;
  const rows = parseEvents([raw]);
  return rows[0] ?? null;
}

export default function EventDetailScreen({ route }: { route: Route }) {
  const { tenantId, eventId } = route.params;
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { studios } = useAuth();

  const role = studios.find((s) => s.tenantId === tenantId)?.role;
  const isStaff = role === 'owner' || role === 'assistant';

  const [ev, setEv] = useState<StudioEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  const [signUpError, setSignUpError] = useState('');

  useEffect(() => {
    setSignedUp(false);
    setSignUpError('');
  }, [tenantId, eventId]);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    setBookings([]);
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

      if (isStaff) {
        setBookingsLoading(true);
        try {
          const bRes = await apiFetch<unknown>(
            `/studios/${tenantId}/bookings`,
            {},
            tenantId
          );
          const raw = Array.isArray(bRes)
            ? bRes
            : (bRes as { bookings?: unknown[] }).bookings ?? [];
          setBookings(
            raw
              .filter((row) => {
                const bk = row as Record<string, unknown>;
                const eid = bk.eventId ?? bk.event_id;
                return String(eid ?? '') === String(eventId);
              })
              .map((row) => {
                const bk = row as Record<string, unknown>;
                return {
                  id: String(bk.id ?? bk._id ?? ''),
                  userId: String(bk.userId ?? bk.user_id ?? ''),
                  spots: Number(bk.spots ?? 1),
                  note: bk.note ? String(bk.note) : undefined,
                  createdAt: bk.createdAt
                    ? String(bk.createdAt)
                    : bk.created_at
                      ? String(bk.created_at)
                      : undefined,
                  userName:
                    bk.userName != null
                      ? String(bk.userName)
                      : bk.user_name != null
                        ? String(bk.user_name)
                        : undefined,
                };
              })
          );
        } catch {
          setBookings([]);
        } finally {
          setBookingsLoading(false);
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load event.');
      setEv(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId, eventId, navigation, isStaff]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function handleSignUp() {
    setSignUpError('');
    setSigningUp(true);
    try {
      await apiFetch(
        `/studios/${tenantId}/bookings`,
        {
          method: 'POST',
          body: JSON.stringify({ eventId, spots: 1 }),
        },
        tenantId
      );
      setSignedUp(true);
    } catch (e: unknown) {
      setSignUpError(
        e instanceof Error ? e.message : 'Could not sign up.'
      );
    } finally {
      setSigningUp(false);
    }
  }

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
        {ev.bookingUrl ? (
          <TouchableOpacity
            style={styles.bookingBtn}
            onPress={async () => {
              try {
                await apiFetch(
                  `/studios/${tenantId}/events/${eventId}/booking-click`,
                  { method: 'POST' },
                  tenantId ?? ''
                );
              } catch {
                /* still open URL */
              }
              const url = ev.bookingUrl!.startsWith('http')
                ? ev.bookingUrl!
                : `https://${ev.bookingUrl}`;
              void Linking.openURL(url);
            }}
            activeOpacity={0.8}
            accessibilityRole="link"
          >
            <Text style={styles.bookingBtnText}>Book a spot →</Text>
          </TouchableOpacity>
        ) : null}
        {isStaff && (ev.bookingClicks ?? 0) > 0 ? (
          <Text style={styles.bookingStats}>
            {ev.bookingClicks}{' '}
            {ev.bookingClicks === 1 ? 'person' : 'people'} clicked the
            booking link
          </Text>
        ) : null}
        {max != null && max > 0 ? (
          <Text style={styles.infoRow}>👥 Max {max} participants</Text>
        ) : null}
        {desc ? <Text style={styles.description}>{desc}</Text> : null}
      </View>

      {error ? <Text style={styles.errBanner}>{error}</Text> : null}

      {isStaff && (bookings.length > 0 || bookingsLoading) ? (
        <>
          <SectionLabel>STUDIO TIME BOOKINGS</SectionLabel>
          {bookingsLoading ? (
            <ActivityIndicator color={colors.clay} />
          ) : (
            bookings.map((b) => (
              <View key={b.id} style={styles.bookingRow}>
                <View style={styles.bookingInfo}>
                  <Text style={styles.bookingName}>
                    {b.note || 'Studio time'}
                  </Text>
                  {b.spots > 1 ? (
                    <Text style={styles.bookingMeta}>{b.spots} spots</Text>
                  ) : null}
                </View>
                {b.createdAt ? (
                  <Text style={styles.bookingDate}>
                    {new Date(b.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </>
      ) : null}

      {isStaff && isPublished ? (
        <>
          <SectionLabel>ACTIONS</SectionLabel>
          <Button
            label="Edit event"
            variant="secondary"
            onPress={() =>
              navigation.navigate('EventList', { tenantId })
            }
            fullWidth
            style={{ marginBottom: spacing[2] }}
          />
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

      {!isStaff && isPublished && ev.kind !== 'member_booking' ? (
        <>
          <SectionLabel>SIGN UP</SectionLabel>
          <Button
            label="Sign up for this event"
            variant="primary"
            onPress={() => void handleSignUp()}
            loading={signingUp}
            disabled={signingUp || signedUp}
            fullWidth
          />
          {signedUp ? (
            <Text style={styles.signedUpText}>
              You are signed up for this event.
            </Text>
          ) : null}
          {signUpError ? (
            <Text style={styles.errBanner}>{signUpError}</Text>
          ) : null}
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
  bookingBtn: {
    backgroundColor: colors.moss,
    borderRadius: radius.md,
    padding: spacing[4],
    alignItems: 'center',
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  bookingBtnText: {
    fontFamily: typography.bodySemiBold,
    fontSize: fontSize.md,
    color: colors.surfaceRaised,
  },
  bookingStats: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textAlign: 'center',
    marginTop: spacing[1],
  },
  errBanner: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing[2],
  },
  signedUpText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.moss,
    textAlign: 'center',
    marginTop: spacing[2],
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    gap: spacing[3],
  },
  bookingInfo: { flex: 1 },
  bookingName: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  bookingMeta: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: 2,
  },
  bookingDate: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
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
