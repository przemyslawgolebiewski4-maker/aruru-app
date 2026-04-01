import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input } from '../../components/ui';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';
import { apiFetch } from '../../services/api';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'BookStudio'>;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

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

  const [date, setDate] = useState(
    `${defaultStart.getFullYear()}-${pad(defaultStart.getMonth() + 1)}-${pad(defaultStart.getDate())}`
  );
  const [startTime, setStartTime] = useState(`${pad(defaultStart.getHours())}:00`);
  const [endTime, setEndTime] = useState(`${pad(defaultEnd.getHours())}:00`);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit() {
    setError('');
    if (!date || !startTime || !endTime) {
      setError('Please fill in date, start and end time.');
      return;
    }
    const startsAt = new Date(`${date}T${startTime}:00`);
    const endsAt = new Date(`${date}T${endTime}:00`);
    if (
      Number.isNaN(startsAt.getTime()) ||
      Number.isNaN(endsAt.getTime())
    ) {
      setError('Invalid date or time.');
      return;
    }
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
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
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
      <Text style={styles.heading}>Book studio time</Text>
      <Text style={styles.sub}>
        Reserve a slot and let your studio know what you&apos;ll be working on.
      </Text>

      <Text style={styles.label}>Date</Text>
      <Input
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
      />

      <View style={styles.timeRow}>
        <View style={styles.timeCol}>
          <Text style={styles.label}>Start time</Text>
          <Input
            value={startTime}
            onChangeText={setStartTime}
            placeholder="HH:MM"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.timeCol}>
          <Text style={styles.label}>End time</Text>
          <Input
            value={endTime}
            onChangeText={setEndTime}
            placeholder="HH:MM"
            autoCapitalize="none"
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
