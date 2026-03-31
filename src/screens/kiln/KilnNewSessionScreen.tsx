import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Button, Input } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';
import type { KilnType } from './KilnListScreen';

type Nav = NativeStackNavigationProp<AppStackParamList, 'KilnNewSession'>;
type Route = RouteProp<AppStackParamList, 'KilnNewSession'>;

const TYPES: {
  value: KilnType;
  label: string;
  temp: string;
}[] = [
  { value: 'bisque', label: 'Bisque', temp: '~1000°C' },
  { value: 'glaze', label: 'Glaze', temp: '~1220°C' },
  { value: 'private', label: 'Private', temp: 'flat fee' },
];

function typeDot(c: KilnType) {
  if (c === 'bisque') return colors.clay;
  if (c === 'glaze') return colors.moss;
  return colors.inkMid;
}

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function KilnNewSessionScreen({ route }: { route: Route }) {
  const { tenantId } = route.params;
  const navigation = useNavigation<Nav>();

  const [kilnType, setKilnType] = useState<KilnType>('bisque');
  const [firedAt, setFiredAt] = useState(() => todayYmd());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit() {
    setError('');
    if (!firedAt.trim()) {
      setError('Date is required.');
      return;
    }
    setLoading(true);
    try {
      const kilnTypeBody: 'bisque' | 'glaze' | 'private' = kilnType;
      const firedAtBody = firedAt.trim();
      const body = {
        kilnType: kilnTypeBody,
        firedAt: firedAtBody,
        notes: notes.trim(),
      };

      const res = await apiFetch<{ _id: string } & Record<string, unknown>>(
        `/studios/${tenantId}/kiln/firings`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
        tenantId
      );
      const id = res._id;
      if (!id) throw new Error('Invalid response from server.');
      navigation.replace('KilnLoadMembers', {
        tenantId,
        firingId: id,
        kilnType: kilnTypeBody,
        firedAt: firedAtBody,
      });
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Failed to create firing session. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>New firing</Text>
        <Text style={styles.subtitle}>
          Open a session before loading the kiln.
        </Text>

        <Text style={styles.fieldLabel}>FIRING TYPE</Text>
        <View style={styles.typeRow}>
          {TYPES.map((t) => {
            const sel = kilnType === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                style={[styles.typeCard, sel && styles.typeCardSel]}
                onPress={() => setKilnType(t.value)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.typeDot,
                    { backgroundColor: typeDot(t.value) },
                  ]}
                />
                <Text style={[styles.typeName, sel && styles.typeNameSel]}>
                  {t.label}
                </Text>
                <Text style={styles.typeTemp}>{t.temp}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Input
          label="DATE"
          placeholder="YYYY-MM-DD"
          value={firedAt}
          onChangeText={setFiredAt}
          keyboardType="numbers-and-punctuation"
        />

        <Input
          label="NOTES (OPTIONAL)"
          value={notes}
          onChangeText={setNotes}
          multiline
          style={styles.notes}
        />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button
          label="Open session"
          variant="primary"
          onPress={onSubmit}
          loading={loading}
          fullWidth
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing[6], paddingBottom: spacing[10] },
  title: {
    fontFamily: typography.display,
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkLight,
    lineHeight: 22,
    marginBottom: spacing[8],
  },
  fieldLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
  },
  typeRow: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[5] },
  typeCard: {
    flex: 1,
    padding: 14,
    borderWidth: 0.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  typeCardSel: {
    backgroundColor: colors.clayLight,
    borderColor: colors.clay,
  },
  typeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  typeName: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
    marginTop: 6,
  },
  typeNameSel: { color: colors.clayDark },
  typeTemp: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
    marginTop: 2,
  },
  notes: { height: 60, textAlignVertical: 'top' },
  errorBox: {
    backgroundColor: colors.errorLight,
    borderRadius: radius.sm,
    padding: spacing[3],
    marginBottom: spacing[3],
  },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
});
