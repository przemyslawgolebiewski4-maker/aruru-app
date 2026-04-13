import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import DateTimeField, { toLocalISOString } from '../../components/DateTimeField';
import EventCalendar from '../../components/EventCalendar';
import { Button, Input } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

type Nav = NativeStackNavigationProp<AppStackParamList, 'EventList'>;
type Route = RouteProp<AppStackParamList, 'EventList'>;

export type EventKind =
  | 'workshop'
  | 'open_studio'
  | 'private_event'
  | 'member_booking'
  | 'other';

export type StudioEvent = {
  id?: string;
  title?: string;
  description?: string;
  websiteUrl?: string;
  startsAt?: string;
  endsAt?: string;
  kind?: string;
  maxParticipants?: number;
  location?: string;
  status?: string;
  createdAt?: string;
  bookingUrl?: string;
  bookingClicks?: number;
};

const KIND_OPTIONS: { value: EventKind; label: string }[] = [
  { value: 'workshop', label: 'Workshop' },
  { value: 'open_studio', label: 'Open studio' },
  { value: 'private_event', label: 'Private' },
  { value: 'other', label: 'Other' },
];

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function parseEvents(data: unknown): StudioEvent[] {
  const rows: unknown[] = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && 'events' in data
      ? ((data as { events?: unknown[] }).events ?? [])
      : [];
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: r.id != null ? String(r.id) : undefined,
      title: r.title != null ? String(r.title) : undefined,
      description:
        r.description != null ? String(r.description) : undefined,
      websiteUrl:
        (r.websiteUrl ?? r.website_url) != null
          ? String(r.websiteUrl ?? r.website_url)
          : undefined,
      startsAt: (r.startsAt ?? r.starts_at) as string | undefined,
      endsAt: (r.endsAt ?? r.ends_at) as string | undefined,
      kind: r.kind != null ? String(r.kind) : undefined,
      maxParticipants:
        typeof r.maxParticipants === 'number'
          ? r.maxParticipants
          : typeof r.max_participants === 'number'
            ? r.max_participants
            : undefined,
      location: r.location != null ? String(r.location) : undefined,
      status: r.status != null ? String(r.status) : undefined,
      createdAt: (r.createdAt ?? r.created_at) as string | undefined,
      bookingUrl: (r.bookingUrl ?? r.booking_url)
        ? String(r.bookingUrl ?? r.booking_url)
        : undefined,
      bookingClicks: Number(r.bookingClicks ?? r.booking_clicks ?? 0),
    };
  });
}

function eventId(e: StudioEvent): string {
  return String(e.id ?? '').trim();
}

function kindNorm(k: string | undefined): EventKind {
  const v = (k ?? '').toLowerCase();
  if (v === 'workshop') return 'workshop';
  if (v === 'open_studio') return 'open_studio';
  if (v === 'private_event') return 'private_event';
  if (v === 'member_booking') return 'member_booking';
  return 'other';
}

export function kindBadgeVariant(
  kind: string | undefined
): 'clay' | 'moss' | 'neutral' {
  const k = kindNorm(kind);
  if (k === 'workshop') return 'clay';
  if (k === 'open_studio') return 'moss';
  if (k === 'member_booking') return 'clay';
  return 'neutral';
}

export function kindBadgeLabel(kind: string | undefined): string {
  const k = kindNorm(kind);
  if (k === 'workshop') return 'Workshop';
  if (k === 'open_studio') return 'Open studio';
  if (k === 'private_event') return 'Private';
  if (k === 'member_booking') return 'Studio booking';
  return 'Other';
}

function defaultStartsAt(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

function defaultEndsAt(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 3);
  return d;
}

export default function EventListScreen({ route }: { route: Route }) {
  const { tenantId } = route.params;
  const navigation = useNavigation<Nav>();
  const { studios } = useAuth();

  const role = studios.find((s) => s.tenantId === tenantId)?.role;
  const isStaff = role === 'owner' || role === 'assistant';

  const [events, setEvents] = useState<StudioEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<EventKind>('workshop');
  const [startsAt, setStartsAt] = useState<Date>(() => defaultStartsAt());
  const [endsAt, setEndsAt] = useState<Date>(() => defaultEndsAt());
  const [location, setLocation] = useState('');
  const [maxP, setMaxP] = useState('');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch<unknown>(
        `/studios/${tenantId}/events`,
        {},
        tenantId
      );
      setEvents(parseEvents(data));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load events.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        isStaff ? (
          <TouchableOpacity
            onPress={() => {
              setShowForm((v) => !v);
              setCreateError('');
            }}
            hitSlop={12}
            style={styles.headerNewBtn}
            accessibilityRole="button"
            accessibilityLabel="New event"
          >
            <Text style={styles.headerNewText}>+ New</Text>
          </TouchableOpacity>
        ) : null,
    });
  }, [navigation, isStaff]);

  const stats = useMemo(() => {
    const nowMs = Date.now();
    const cy = new Date().getFullYear();
    const cm = new Date().getMonth();
    let upcoming = 0;
    let thisMonth = 0;
    for (const e of events) {
      const s = e.startsAt;
      if (!s) continue;
      const t = new Date(s).getTime();
      if (Number.isNaN(t)) continue;
      if (t > nowMs) upcoming += 1;
      const d = new Date(t);
      if (d.getFullYear() === cy && d.getMonth() === cm) thisMonth += 1;
    }
    return { upcoming, thisMonth };
  }, [events]);

  function resetForm() {
    setTitle('');
    setKind('workshop');
    setStartsAt(defaultStartsAt());
    setEndsAt(defaultEndsAt());
    setLocation('');
    setMaxP('');
    setDescription('');
    setWebsiteUrl('');
    setBookingUrl('');
    setCreateError('');
    setIsPublic(false);
    setShowForm(false);
  }

  async function onCreate() {
    setCreateError('');
    if (!title.trim()) {
      setCreateError('Title is required.');
      return;
    }
    const now = new Date();
    now.setSeconds(0, 0);
    if (startsAt < now) {
      setCreateError('Start date cannot be in the past.');
      return;
    }
    const maxNum = parseInt(maxP, 10);
    if (maxP.trim() && (isNaN(maxNum) || maxNum < 1)) {
      setCreateError('Max participants must be a positive number.');
      return;
    }
    if (endsAt <= startsAt) {
      setCreateError('End time must be after start time.');
      return;
    }
    setCreating(true);
    try {
      await apiFetch(
        `/studios/${tenantId}/events`,
        {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            kind,
            startsAt: toLocalISOString(startsAt),
            endsAt: toLocalISOString(endsAt),
            location: location.trim() || null,
            maxParticipants: parseInt(maxP, 10) || null,
            description: description.trim() || null,
            websiteUrl: websiteUrl.trim() || null,
            booking_url: bookingUrl.trim() || null,
            public: isPublic,
          }),
        },
        tenantId
      );
      resetForm();
      await load();
    } catch (e: unknown) {
      setCreateError(
        e instanceof Error ? e.message : 'Could not create event.'
      );
    } finally {
      setCreating(false);
    }
  }

  function goDetail(e: StudioEvent) {
    const id = eventId(e);
    if (!id) return;
    navigation.navigate('EventDetail', {
      tenantId,
      eventId: id,
      eventTitle: e.title?.trim() || 'Event',
    });
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.pillRow}>
        <Text style={styles.pillText}>
          {stats.upcoming} upcoming · {stats.thisMonth} this month
        </Text>
      </View>

      {showForm && isStaff ? (
        <View style={styles.formCard}>
          <Input
            label="Title *"
            value={title}
            onChangeText={setTitle}
            placeholder="Workshop title..."
          />
          <Text style={styles.kindLegend}>Kind</Text>
          <View style={styles.kindRow}>
            {KIND_OPTIONS.map((opt) => {
              const sel = kind === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.kindPill, sel && styles.kindPillSelected]}
                  onPress={() => setKind(opt.value)}
                >
                  <Text
                    style={[styles.kindPillText, sel && styles.kindPillTextSel]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.dtRow}>
            <View style={{ flex: 1 }}>
              <DateTimeField
                label="Starts"
                value={startsAt}
                onChange={(d) => setStartsAt(d)}
                mode="date"
                minimumDate={new Date()}
              />
            </View>
            <View style={{ flex: 1 }}>
              <DateTimeField
                label="Ends"
                value={endsAt}
                onChange={(d) => setEndsAt(d)}
                mode="date"
              />
            </View>
          </View>
          <View style={styles.dtRow}>
            <View style={{ flex: 1 }}>
              <DateTimeField
                label="Start time"
                value={startsAt}
                onChange={(d) => setStartsAt(d)}
                mode="time"
              />
            </View>
            <View style={{ flex: 1 }}>
              <DateTimeField
                label="End time"
                value={endsAt}
                onChange={(d) => setEndsAt(d)}
                mode="time"
              />
            </View>
          </View>
          <Input
            label="Location (optional)"
            value={location}
            onChangeText={setLocation}
            placeholder="Studio / address"
            containerStyle={styles.inputSpaced}
          />
          <TouchableOpacity
            style={styles.publicToggle}
            onPress={() => setIsPublic((v) => !v)}
            activeOpacity={0.8}
          >
            <View style={styles.publicToggleLeft}>
              <Text style={styles.publicToggleLabel}>
                Publish to community feed
              </Text>
              <Text style={styles.publicToggleHint}>
                Visible to all Aruru users
              </Text>
            </View>
            <View style={[styles.toggleTrack, isPublic && styles.toggleTrackOn]}>
              <View
                style={[styles.toggleThumb, isPublic && styles.toggleThumbOn]}
              />
            </View>
          </TouchableOpacity>
          {isPublic ? (
            <Text style={styles.publicHint}>
              This event will be visible to all Aruru users in the community
              feed. You can change this later in event settings.
            </Text>
          ) : null}
          <Input
            label="Max participants (optional)"
            value={maxP}
            onChangeText={setMaxP}
            placeholder="No limit"
            keyboardType="number-pad"
            containerStyle={styles.inputSpaced}
          />
          <Text style={styles.descLabel}>Description (optional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Details…"
            placeholderTextColor={colors.inkFaint}
            multiline
            style={styles.descInput}
          />
          <Input
            label="Website or link (optional)"
            value={websiteUrl}
            onChangeText={setWebsiteUrl}
            placeholder="https://..."
            keyboardType="url"
            autoCapitalize="none"
            containerStyle={styles.inputSpaced}
          />
          <Input
            label="Booking link (optional)"
            value={bookingUrl}
            onChangeText={setBookingUrl}
            placeholder="https://... (Eventbrite, your site...)"
            keyboardType="url"
            autoCapitalize="none"
            containerStyle={styles.inputSpaced}
          />
          {createError ? (
            <Text style={styles.createErr}>{createError}</Text>
          ) : null}
          <View style={styles.formActions}>
            <View style={styles.formBtnHalf}>
              <Button
                label="Cancel"
                variant="ghost"
                onPress={resetForm}
                fullWidth
              />
            </View>
            <View style={styles.formBtnHalf}>
              <Button
                label="Create event"
                variant="primary"
                onPress={() => void onCreate()}
                fullWidth
                loading={creating}
                disabled={creating}
              />
            </View>
          </View>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.clay} />
        </View>
      ) : error ? (
        <Text style={styles.errBanner}>{error}</Text>
      ) : null}

      {!loading && events.length === 0 ? (
        <Text style={styles.empty}>
          {isStaff
            ? 'No events yet. Tap + New to create one.'
            : 'No events yet. You can share your own events in the Community tab.'}
        </Text>
      ) : null}

      {!loading && events.length > 0 ? (
        <EventCalendar
          events={events}
          onEventPress={(e) => goDetail(e)}
          showStaffBookingMeta={isStaff}
        />
      ) : null}

      {!loading && !isStaff ? (
        <Text style={styles.memberHint}>
          Want to share a workshop or exhibition? Go to Community - Events
          to publish your own event.
        </Text>
      ) : null}

      <View style={{ height: spacing[10] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, paddingBottom: 40 },
  headerNewBtn: { marginRight: 4 },
  headerNewText: {
    fontFamily: typography.mono,
    fontSize: 13,
    color: colors.clay,
  },
  pillRow: {
    alignSelf: 'flex-start',
    backgroundColor: colors.cream,
    borderRadius: radius.sm,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    marginBottom: 16,
  },
  pillText: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkMid,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 16,
  },
  kindLegend: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  kindRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: 8,
  },
  kindPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.cream,
  },
  kindPillSelected: {
    backgroundColor: colors.clay,
  },
  kindPillText: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.inkMid,
  },
  kindPillTextSel: {
    color: colors.surfaceRaised,
  },
  dtRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  inputSpaced: { marginTop: spacing[2] },
  publicToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing[3],
    borderWidth: 0.5,
    borderColor: colors.border,
    marginTop: spacing[2],
  },
  publicToggleLeft: { flex: 1, gap: 2 },
  publicToggleLabel: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  publicToggleHint: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  publicHint: {
    fontFamily: typography.body,
    fontSize: fontSize.xs,
    color: colors.moss,
    marginTop: spacing[1],
    lineHeight: 18,
  },
  toggleTrack: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.border,
    justifyContent: 'center',
    padding: 2,
  },
  toggleTrackOn: { backgroundColor: colors.moss },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surface,
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
  descLabel: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
    marginTop: spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  descInput: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing[2],
    marginTop: 6,
  },
  createErr: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing[2],
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[4],
  },
  formBtnHalf: { flex: 1 },
  loadingWrap: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  errBanner: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing[2],
  },
  empty: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkLight,
    marginTop: spacing[2],
  },
  memberHint: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
  },
});
