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
import EventCalendar from '../../components/EventCalendar';
import { Button, Input } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

type Nav = NativeStackNavigationProp<AppStackParamList, 'EventList'>;
type Route = RouteProp<AppStackParamList, 'EventList'>;

export type EventKind = 'workshop' | 'open_studio' | 'private_event' | 'other';

export type StudioEvent = {
  id?: string;
  title?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  kind?: string;
  maxParticipants?: number;
  location?: string;
  status?: string;
  createdAt?: string;
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

function parseEvents(data: unknown): StudioEvent[] {
  if (Array.isArray(data)) return data as StudioEvent[];
  if (data && typeof data === 'object' && 'events' in data) {
    const ev = (data as { events?: StudioEvent[] }).events;
    return Array.isArray(ev) ? ev : [];
  }
  return [];
}

function eventId(e: StudioEvent): string {
  return String(e.id ?? '').trim();
}

function kindNorm(k: string | undefined): EventKind | 'other' {
  const v = (k ?? '').toLowerCase();
  if (v === 'workshop') return 'workshop';
  if (v === 'open_studio') return 'open_studio';
  if (v === 'private_event') return 'private_event';
  return 'other';
}

export function kindBadgeVariant(
  kind: string | undefined
): 'clay' | 'moss' | 'neutral' {
  const k = kindNorm(kind);
  if (k === 'workshop') return 'clay';
  if (k === 'open_studio') return 'moss';
  return 'neutral';
}

export function kindBadgeLabel(kind: string | undefined): string {
  const k = kindNorm(kind);
  if (k === 'workshop') return 'Workshop';
  if (k === 'open_studio') return 'Open studio';
  if (k === 'private_event') return 'Private';
  return 'Other';
}

function splitDateTimeInput(s: string): { date: string; time: string } | null {
  const t = s.trim().replace(/\s+/g, ' ');
  if (!t) return null;
  const m = t.match(
    /^(\d{4}-\d{2}-\d{2})[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?$/
  );
  if (m) {
    const date = m[1];
    const hh = m[2].padStart(2, '0');
    const mm = m[3].padStart(2, '0');
    const ss = (m[4] ?? '00').padStart(2, '0');
    return { date, time: `${hh}:${mm}:${ss}` };
  }
  return null;
}

function toIso8601(date: string, timeHhMmSs: string): string {
  return `${date}T${timeHhMmSs}`;
}

function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
}) {
  return (
    <View style={styles.dtField}>
      <Text style={styles.dtLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD HH:mm"
        placeholderTextColor={colors.inkFaint}
        style={styles.dtInput}
        keyboardType="numbers-and-punctuation"
      />
    </View>
  );
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
  const [startsInput, setStartsInput] = useState('');
  const [endsInput, setEndsInput] = useState('');
  const [location, setLocation] = useState('');
  const [maxP, setMaxP] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

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
    setStartsInput('');
    setEndsInput('');
    setLocation('');
    setMaxP('');
    setDescription('');
    setCreateError('');
    setShowForm(false);
  }

  async function onCreate() {
    setCreateError('');
    const startParts = splitDateTimeInput(startsInput);
    const endParts = splitDateTimeInput(endsInput);
    if (!title.trim()) {
      setCreateError('Title is required.');
      return;
    }
    if (!startParts || !endParts) {
      setCreateError('Use start and end as YYYY-MM-DD HH:mm');
      return;
    }
    const startsAt = toIso8601(startParts.date, startParts.time);
    const endsAt = toIso8601(endParts.date, endParts.time);
    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      setCreateError('End must be after start.');
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
            startsAt,
            endsAt,
            location: location.trim() || null,
            maxParticipants: parseInt(maxP, 10) || null,
            description: description.trim() || null,
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
            <DateTimeField
              label="STARTS"
              value={startsInput}
              onChange={setStartsInput}
            />
            <DateTimeField
              label="ENDS"
              value={endsInput}
              onChange={setEndsInput}
            />
          </View>
          <Input
            label="Location (optional)"
            value={location}
            onChangeText={setLocation}
            placeholder="Studio / address"
            containerStyle={styles.inputSpaced}
          />
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
          No events yet. Tap + New to create one.
        </Text>
      ) : null}

      {!loading && events.length > 0 ? (
        <EventCalendar events={events} onEventPress={(e) => goDetail(e)} />
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
    borderRadius: radius.full,
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
    borderRadius: radius.full,
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
  dtField: { flex: 1 },
  dtLabel: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
    letterSpacing: 0.8,
  },
  dtInput: {
    fontFamily: typography.mono,
    fontSize: 13,
    color: colors.ink,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    paddingVertical: 8,
    marginTop: 4,
  },
  inputSpaced: { marginTop: spacing[2] },
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
});
