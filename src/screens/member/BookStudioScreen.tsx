import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import DateTimeField, { toLocalISOString } from '../../components/DateTimeField';
import EventCalendar from '../../components/EventCalendar';
import { Button, Input } from '../../components/ui';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';
import { apiFetch } from '../../services/api';
import type { AppStackParamList } from '../../navigation/types';
import { parseEvents, type StudioEvent } from '../events/EventListScreen';

type Props = NativeStackScreenProps<AppStackParamList, 'BookStudio'>;

function roundToNextHour(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

export default function BookStudioScreen({ route, navigation }: Props) {
  const { tenantId } = route.params;

  const defaultStart = roundToNextHour();
  const defaultEnd = new Date(defaultStart);
  defaultEnd.setHours(defaultEnd.getHours() + 2);

  const [startsAt, setStartsAt] = useState<Date>(defaultStart);
  const [endsAt, setEndsAt] = useState<Date>(defaultEnd);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [events, setEvents] = useState<StudioEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await apiFetch<unknown>(
        `/studios/${tenantId}/events`,
        {},
        tenantId
      );
      setEvents(parseEvents(res));
    } catch {
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, [tenantId]);

  useFocusEffect(
    useCallback(() => {
      void loadEvents();
    }, [loadEvents])
  );

  async function onSubmit() {
    setError('');
    const startsAtISO = toLocalISOString(startsAt);
    const endsAtISO = toLocalISOString(endsAt);
    if (endsAt <= startsAt) {
      setError('End time must be after start time.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch(
        `/studios/${tenantId}/events/book`,
        {
          method: 'POST',
          body: JSON.stringify({
            startsAt: startsAtISO,
            endsAt: endsAtISO,
            notes: notes.trim() || null,
          }),
        },
        tenantId
      );
      navigation.goBack();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not book studio time.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {eventsLoading ? (
        <ActivityIndicator
          color={colors.clay}
          style={{ marginBottom: spacing[4] }}
        />
      ) : events.length > 0 ? (
        <View style={styles.calendarWrap}>
          <Text style={styles.calendarLabel}>Studio calendar</Text>
          <Text style={styles.calendarHint}>
            Tap a date to set your booking start.
          </Text>
          <EventCalendar
            events={events}
            onEventPress={(e) => {
              const raw =
                e.startsAt ??
                (e as StudioEvent & { starts_at?: string }).starts_at ??
                '';
              const d = new Date(raw);
              if (!isNaN(d.getTime())) {
                const newStart = new Date(d);
                const newEnd = new Date(d);
                newEnd.setHours(newEnd.getHours() + 2);
                setStartsAt(newStart);
                setEndsAt(newEnd);
              }
            }}
          />
        </View>
      ) : null}

      <Text style={styles.heading}>Book studio time</Text>
      <Text style={styles.sub}>
        Reserve a slot and let your studio know what you&apos;ll be working on.
      </Text>

      <DateTimeField
        label="Date"
        value={startsAt}
        onChange={(d) => {
          const newStart = new Date(startsAt);
          newStart.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
          setStartsAt(newStart);
          const newEnd = new Date(endsAt);
          newEnd.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
          setEndsAt(newEnd);
        }}
        mode="date"
        minimumDate={new Date()}
      />
      <View style={styles.timeRow}>
        <View style={styles.timeCol}>
          <DateTimeField
            label="Start time"
            value={startsAt}
            onChange={(d) => setStartsAt(d)}
            mode="time"
          />
        </View>
        <View style={styles.timeCol}>
          <DateTimeField
            label="End time"
            value={endsAt}
            onChange={(d) => setEndsAt(d)}
            mode="time"
          />
        </View>
      </View>

      <Text style={styles.label}>
        What will you be working on?{' '}
        <Text style={styles.optional}>(optional)</Text>
      </Text>
      <Input
        value={notes}
        onChangeText={setNotes}
        placeholder="e.g. throwing bowls, glazing, hand building…"
        multiline
        numberOfLines={3}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label="Book studio time"
        onPress={() => void onSubmit()}
        loading={loading}
        fullWidth
        style={styles.btn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing[6], gap: spacing[4] },
  calendarWrap: {
    marginBottom: spacing[4],
  },
  calendarLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[1],
  },
  calendarHint: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    marginBottom: spacing[3],
  },
  heading: {
    fontFamily: typography.bodySemiBold,
    fontSize: fontSize.xl,
    color: colors.ink,
  },
  sub: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    marginTop: -spacing[1],
  },
  label: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: -spacing[1],
  },
  optional: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkFaint,
  },
  timeRow: { flexDirection: 'row', gap: spacing[2] },
  timeCol: { flex: 1, gap: spacing[1] },
  error: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  btn: { marginTop: spacing[2] },
});
