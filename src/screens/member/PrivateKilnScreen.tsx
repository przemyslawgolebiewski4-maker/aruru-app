import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Input } from '../../components/ui';
import {
  colors,
  typography,
  fontSize,
  spacing,
  radius,
} from '../../theme/tokens';
import { apiFetch } from '../../services/api';
import type { AppStackParamList } from '../../navigation/types';
import DateTimeField, { toLocalISOString } from '../../components/DateTimeField';

type Props = NativeStackScreenProps<AppStackParamList, 'PrivateKiln'>;

type PrivateKilnType = {
  id: string;
  name: string;
  description?: string;
  price: number;
};

function roundToNextHour(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

export default function PrivateKilnScreen({ route, navigation }: Props) {
  const { tenantId } = route.params;
  const [kilnTypes, setKilnTypes] = useState<PrivateKilnType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PrivateKilnType | null>(null);
  const [startsAt, setStartsAt] = useState(() => roundToNextHour());
  const [endsAt, setEndsAt] = useState(() => {
    const d = roundToNextHour();
    d.setHours(d.getHours() + 2);
    return d;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ privateKilns?: PrivateKilnType[] }>(
        `/studios/${tenantId}/private-kilns`,
        {},
        tenantId
      );
      setKilnTypes(res.privateKilns ?? []);
    } catch {
      setKilnTypes([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function onSubmit() {
    if (!selected) {
      setError('Select a kiln type.');
      return;
    }
    if (endsAt <= startsAt) {
      setError('End time must be after start.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await apiFetch(
        `/studios/${tenantId}/events/book-private-kiln`,
        {
          method: 'POST',
          body: JSON.stringify({
            privateKilnId: selected.id,
            startsAt: toLocalISOString(startsAt),
            endsAt: toLocalISOString(endsAt),
            notes: notes.trim() || null,
          }),
        },
        tenantId
      );
      navigation.goBack();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not send request.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.clay} />
      </View>
    );
  }

  if (kilnTypes.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>
          No private kiln types set up yet.
        </Text>
        <Text style={styles.emptyHint}>
          Ask your studio owner to add private kiln options in studio settings.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Private kiln</Text>
      <Text style={styles.sub}>
        Select a kiln type and choose your preferred time. The studio will
        confirm your booking.
      </Text>

      <Text style={styles.label}>Kiln type</Text>
      {kilnTypes.map((k) => (
        <TouchableOpacity
          key={k.id}
          style={[
            styles.kilnCard,
            selected?.id === k.id && styles.kilnCardSelected,
          ]}
          onPress={() => setSelected(k)}
          activeOpacity={0.75}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.kilnName}>{k.name}</Text>
            {k.description ? (
              <Text style={styles.kilnDesc}>{k.description}</Text>
            ) : null}
          </View>
          <Text style={styles.kilnPrice}>€{k.price.toFixed(2)}</Text>
          {selected?.id === k.id ? (
            <Text style={styles.kilnCheck}>✓</Text>
          ) : null}
        </TouchableOpacity>
      ))}

      <DateTimeField
        label="Date"
        value={startsAt}
        onChange={(d) => {
          const ns = new Date(startsAt);
          ns.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
          setStartsAt(ns);
          const ne = new Date(endsAt);
          ne.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
          setEndsAt(ne);
        }}
        mode="date"
        minimumDate={new Date()}
      />
      <View style={styles.timeRow}>
        <View style={{ flex: 1 }}>
          <DateTimeField
            label="Start time"
            value={startsAt}
            onChange={setStartsAt}
            mode="time"
          />
        </View>
        <View style={{ flex: 1 }}>
          <DateTimeField
            label="End time"
            value={endsAt}
            onChange={setEndsAt}
            mode="time"
          />
        </View>
      </View>

      <Input
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="Any details for the studio..."
        multiline
        numberOfLines={2}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label="Request private kiln"
        onPress={() => void onSubmit()}
        loading={submitting}
        fullWidth
        style={styles.btn}
      />
      <Text style={[styles.sub, styles.requestFooterSub]}>
        Your request will be sent to the studio for approval. You&apos;ll see
        it in your events once confirmed.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing[6], gap: spacing[4], paddingBottom: 40 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
    gap: spacing[3],
    backgroundColor: colors.cream,
  },
  emptyText: {
    fontFamily: typography.bodySemiBold,
    fontSize: fontSize.md,
    color: colors.ink,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    textAlign: 'center',
    lineHeight: 20,
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
    lineHeight: 20,
    marginTop: -spacing[2],
  },
  label: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kilnCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  kilnCardSelected: {
    borderColor: colors.clay,
    backgroundColor: colors.clayLight,
  },
  kilnName: {
    fontFamily: typography.bodySemiBold,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  kilnDesc: {
    fontFamily: typography.body,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: 2,
  },
  kilnPrice: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.clay,
  },
  kilnCheck: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.clay,
  },
  timeRow: { flexDirection: 'row', gap: spacing[2] },
  error: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  btn: { marginTop: spacing[2] },
  requestFooterSub: {
    marginTop: spacing[2],
  },
});
