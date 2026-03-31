import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Avatar, Badge, Button } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';
import type { KilnType } from './KilnListScreen';

type Nav = NativeStackNavigationProp<AppStackParamList, 'KilnLoadMembers'>;
type Route = RouteProp<AppStackParamList, 'KilnLoadMembers'>;

type MemberRow = {
  userId: string;
  email: string;
  name: string;
  status: string;
};

type FiringItem = {
  userId?: string;
  weightKg?: number;
};

type FiringDetail = {
  _id: string;
  kilnType: KilnType;
  firedAt?: string;
  scheduledAt?: string;
  status: string;
  items?: FiringItem[];
};

function typeDot(c: KilnType) {
  if (c === 'bisque') return colors.clay;
  if (c === 'glaze') return colors.moss;
  return colors.inkMid;
}

function capitalizeType(t: string) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function formatFiringDate(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function firstName(name: string) {
  const p = name.trim().split(/\s+/)[0];
  return p || name;
}

export default function KilnLoadMembersScreen({ route }: { route: Route }) {
  const { tenantId, firingId, kilnType, scheduledAt } = route.params;
  const navigation = useNavigation<Nav>();

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoadError('');
    setLoading(true);
    try {
      const [memRes, fireRes] = await Promise.all([
        apiFetch<{ members: MemberRow[] }>(
          `/studios/${tenantId}/members`,
          {},
          tenantId
        ),
        apiFetch<FiringDetail>(
          `/studios/${tenantId}/kiln/firings/${firingId}`,
          {},
          tenantId
        ),
      ]);
      const active = (memRes.members ?? []).filter(
        (m) => m.status === 'active'
      );
      setMembers(active);
      const next: Record<string, string> = {};
      for (const it of fireRes.items ?? []) {
        if (it.userId != null && it.weightKg != null) {
          next[it.userId] = String(it.weightKg);
        }
      }
      setEntries(next);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Could not load data.');
    } finally {
      setLoading(false);
    }
  }, [tenantId, firingId]);

  useEffect(() => {
    load();
  }, [load]);

  const totalKg = useMemo(() => {
    let s = 0;
    for (const v of Object.values(entries)) {
      const n = parseFloat(String(v).replace(',', '.'));
      if (Number.isFinite(n)) s += n;
    }
    return s;
  }, [entries]);

  function setWeight(userId: string, text: string) {
    setEntries((prev) => ({ ...prev, [userId]: text }));
  }

  async function saveWeights() {
    setSaving(true);
    try {
      const pairs: { userId: string; w: number }[] = [];
      for (const m of members) {
        const raw = (entries[m.userId] ?? '').trim();
        if (!raw) continue;
        const n = parseFloat(raw.replace(',', '.'));
        if (!Number.isFinite(n) || n <= 0) continue;
        pairs.push({ userId: m.userId, w: n });
      }
      if (pairs.length === 0) {
        Alert.alert('Nothing to save', 'Enter at least one weight above zero.');
      } else {
        for (const { userId, w } of pairs) {
          await apiFetch(
            `/studios/${tenantId}/kiln/firings/${firingId}/items`,
            {
              method: 'POST',
              body: JSON.stringify({ userId, weightKg: w }),
            },
            tenantId
          );
        }
        Alert.alert('Weights saved', undefined, [
          { text: 'Continue loading', style: 'cancel' },
          {
            text: 'Close session',
            onPress: () =>
              navigation.navigate('KilnDetail', { tenantId, firingId }),
          },
        ]);
        await load();
      }
    } catch (e: unknown) {
      Alert.alert(
        'Save failed',
        e instanceof Error ? e.message : 'Please try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.typeTitleRow}>
              <View
                style={[
                  styles.headerDot,
                  { backgroundColor: typeDot(kilnType) },
                ]}
              />
              <Text style={styles.typeTitle}>{capitalizeType(kilnType)}</Text>
            </View>
            <Text style={styles.headerDate}>
              {formatFiringDate(scheduledAt)}
            </Text>
          </View>
          <Badge label="open" variant="open" />
        </View>
      </View>

      {loadError ? (
        <Text style={styles.errorBanner}>{loadError}</Text>
      ) : null}

      <Text style={styles.sectionLabel}>MEMBER WEIGHTS (KG)</Text>

      {loading ? (
        <Text style={styles.loadingHint}>Loading…</Text>
      ) : (
        members.map((m) => {
          const val = entries[m.userId] ?? '';
          const has = val.trim().length > 0;
          const displayName = firstName(m.name?.trim() || m.email);
          return (
            <View
              key={m.userId}
              style={[
                styles.weightRow,
                has && { backgroundColor: colors.cream },
              ]}
            >
              <Avatar name={m.name?.trim() || m.email} size="sm" />
              <Text style={styles.memberName} numberOfLines={1}>
                {displayName}
              </Text>
              <TextInput
                value={val}
                onChangeText={(t) => setWeight(m.userId, t)}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor={colors.inkFaint}
                style={[
                  styles.weightInput,
                  {
                    borderBottomColor: has ? colors.clay : colors.border,
                  },
                ]}
              />
              <Text style={styles.kgLabel}>kg</Text>
            </View>
          );
        })
      )}

      <View style={styles.totalBox}>
        <View style={styles.totalInner}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>
            {totalKg.toFixed(1)} kg
          </Text>
        </View>
      </View>

      <Button
        label="Save weights"
        variant="primary"
        onPress={saveWeights}
        loading={saving}
        fullWidth
      />

      <TouchableOpacity
        style={styles.ghostOuter}
        onPress={() =>
          navigation.navigate('KilnDetail', { tenantId, firingId })
        }
        accessibilityRole="button"
      >
        <Text style={styles.ghostText}>Close session now →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing[5], paddingBottom: spacing[10] },
  headerCard: {
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: spacing[5],
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  headerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing[2],
  },
  typeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  headerDate: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
    marginTop: 4,
  },
  errorBanner: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing[3],
  },
  sectionLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
  },
  loadingHint: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    marginBottom: spacing[3],
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    marginBottom: 6,
  },
  memberName: {
    flex: 1,
    marginLeft: 10,
    fontFamily: typography.bodyMedium,
    fontSize: 13,
    color: colors.ink,
  },
  weightInput: {
    width: 72,
    textAlign: 'right',
    fontFamily: typography.mono,
    fontSize: 14,
    color: colors.clayDark,
    borderBottomWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  kgLabel: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
    marginLeft: 4,
  },
  totalBox: {
    marginTop: spacing[4],
    marginBottom: spacing[6],
  },
  totalInner: {
    backgroundColor: colors.mossLight,
    borderRadius: radius.md,
    padding: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  totalValue: {
    fontFamily: typography.monoMedium,
    fontSize: 14,
    color: colors.mossDark,
  },
  ghostOuter: {
    marginTop: spacing[3],
    paddingVertical: 11,
    alignItems: 'center',
  },
  ghostText: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.base,
    color: colors.clay,
  },
});
