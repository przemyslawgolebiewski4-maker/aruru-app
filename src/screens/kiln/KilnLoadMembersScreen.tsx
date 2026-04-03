import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Avatar, Button, SectionLabel } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';

type Nav = NativeStackNavigationProp<AppStackParamList, 'KilnLoadMembers'>;
type Route = RouteProp<AppStackParamList, 'KilnLoadMembers'>;

export type StudioMember = {
  userId: string;
  email?: string;
  name?: string;
  status?: string;
  avatarUrl?: string;
};

type FiringItem = {
  userId?: string;
  weightKg?: number;
  memberName?: string;
  member_name?: string;
};

function memberDisplayLabel(m: StudioMember) {
  return (m?.name || m?.email || '').trim();
}

function itemMemberFallback(it: FiringItem | undefined) {
  return (
    it?.memberName?.trim() ||
    it?.member_name?.trim() ||
    'Member'
  );
}

function extractItems(data: unknown): FiringItem[] {
  if (!data || typeof data !== 'object') return [];
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.items)) return o.items as FiringItem[];
  if (
    o.firing &&
    typeof o.firing === 'object' &&
    Array.isArray((o.firing as { items?: FiringItem[] }).items)
  ) {
    return (o.firing as { items: FiringItem[] }).items;
  }
  return [];
}

export default function KilnLoadMembersScreen({ route }: { route: Route }) {
  const { tenantId, firingId } = route.params;
  const navigation = useNavigation<Nav>();

  const [members, setMembers] = useState<StudioMember[]>([]);
  const [weightInputs, setWeightInputs] = useState<Record<string, string>>({});
  const [items, setItems] = useState<FiringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [mossInputIds, setMossInputIds] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoadError('');
    setLoading(true);
    try {
      const [memRes, fireData] = await Promise.all([
        apiFetch<{ members: StudioMember[] }>(
          `/studios/${tenantId}/members`,
          {},
          tenantId
        ),
        apiFetch<unknown>(
          `/studios/${tenantId}/kiln/firings/${firingId}`,
          {},
          tenantId
        ),
      ]);
      const active = (memRes.members ?? [])
        .filter((m) => (m.status || '').toLowerCase() === 'active')
        .map((m) => ({
          ...m,
          avatarUrl:
            m.avatarUrl ?? (m as { avatar_url?: string }).avatar_url,
        }));
      setMembers(active);
      const nextItems = extractItems(fireData);
      setItems(nextItems);

      const nextInputs: Record<string, string> = {};
      for (const m of active) {
        nextInputs[m.userId] = '';
      }
      for (const it of nextItems) {
        if (it.userId != null && it.weightKg != null) {
          nextInputs[it.userId] = String(it.weightKg);
        }
      }
      setWeightInputs(nextInputs);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Could not load data.');
    } finally {
      setLoading(false);
    }
  }, [tenantId, firingId]);

  const refreshItems = useCallback(async () => {
    const fireData = await apiFetch<unknown>(
      `/studios/${tenantId}/kiln/firings/${firingId}`,
      {},
      tenantId
    );
    setItems(extractItems(fireData));
  }, [tenantId, firingId]);

  useEffect(() => {
    load();
  }, [load]);

  const canSave = useMemo(() => {
    return members.some((m) => {
      const raw = (weightInputs[m.userId] ?? '').trim();
      if (!raw) return false;
      const n = parseFloat(raw.replace(',', '.'));
      return Number.isFinite(n) && n > 0;
    });
  }, [members, weightInputs]);

  const totalsByUser = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) {
      const uid = it.userId;
      if (!uid) continue;
      map.set(uid, (map.get(uid) ?? 0) + (Number(it.weightKg) || 0));
    }
    return map;
  }, [items]);

  const sessionTotalRows = useMemo(() => {
    const rows: { userId: string; kg: number; name: string }[] = [];
    for (const [userId, kg] of totalsByUser.entries()) {
      if (kg <= 0) continue;
      const m = members.find((x) => x.userId === userId);
      const sample = items.find((i) => i.userId === userId);
      const name = m
        ? memberDisplayLabel(m) || itemMemberFallback(sample)
        : itemMemberFallback(sample);
      rows.push({ userId, kg, name: name || 'Member' });
    }
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [totalsByUser, members, items]);

  const grandTotalKg = useMemo(() => {
    let s = 0;
    for (const it of items) {
      s += Number(it.weightKg) || 0;
    }
    return s;
  }, [items]);

  function setWeight(userId: string, text: string) {
    setWeightInputs((prev) => ({ ...prev, [userId]: text }));
    setSaveError('');
  }

  async function saveWeight() {
    if (!canSave) return;
    setSaving(true);
    setSaveError('');
    const pairs: { userId: string; w: number }[] = [];
    for (const m of members) {
      const raw = (weightInputs[m.userId] ?? '').trim();
      if (!raw) continue;
      const n = parseFloat(raw.replace(',', '.'));
      if (!Number.isFinite(n) || n <= 0) continue;
      pairs.push({ userId: m.userId, w: n });
    }

    const errors: string[] = [];
    const savedIds: string[] = [];

    try {
      for (const { userId, w } of pairs) {
        try {
          await apiFetch(
            `/studios/${tenantId}/kiln/firings/${firingId}/items`,
            {
              method: 'POST',
              body: JSON.stringify({ userId, weightKg: w }),
            },
            tenantId
          );
          savedIds.push(userId);
        } catch (e: unknown) {
          const msg =
            e instanceof Error ? e.message : 'Save failed for a member.';
          errors.push(msg);
        }
      }

      try {
        await refreshItems();
      } catch (e: unknown) {
        errors.push(
          e instanceof Error ? e.message : 'Could not refresh firing.'
        );
      }

      if (errors.length > 0) {
        setSaveError(errors.join('\n'));
      }

      if (errors.length === 0 && savedIds.length > 0) {
        const cleared: Record<string, string> = {};
        for (const m of members) {
          cleared[m.userId] = '';
        }
        setWeightInputs(cleared);
        const flash: Record<string, boolean> = {};
        for (const id of savedIds) {
          flash[id] = true;
        }
        setMossInputIds(flash);
        setTimeout(() => setMossInputIds({}), 1000);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleCloseSession() {
    const ok =
      typeof window !== 'undefined'
        ? window.confirm('Close this session?')
        : true;
    if (!ok) return;
    setClosing(true);
    try {
      await apiFetch(
        `/studios/${tenantId}/kiln/firings/${firingId}/close`,
        { method: 'POST' },
        tenantId
      );
      navigation.navigate('KilnDetail', { tenantId, firingId });
    } catch (e: unknown) {
      setSaveError(
        e instanceof Error ? e.message : 'Could not close session.'
      );
    } finally {
      setClosing(false);
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {loadError ? (
        <Text style={styles.errorBanner}>{loadError}</Text>
      ) : null}

      <SectionLabel>MEMBER WEIGHT KG</SectionLabel>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.clay} />
        </View>
      ) : (
        members.map((m, idx) => {
          const val = weightInputs[m.userId] ?? '';
          const label = memberDisplayLabel(m) || m.email || '';
          const mossBorder = mossInputIds[m.userId];
          const isLastMember = idx === members.length - 1;
          return (
            <View
              key={m.userId}
              style={[
                styles.memberRow,
                !isLastMember && styles.memberRowBorder,
              ]}
            >
              <Avatar
                name={label || '?'}
                size="sm"
                imageUrl={m.avatarUrl}
              />
              <Text style={styles.memberName} numberOfLines={1}>
                {label || 'Member'}
              </Text>
              <View style={styles.inputKgRow}>
                <TextInput
                  value={val}
                  onChangeText={(t) => setWeight(m.userId, t)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.inkFaint}
                  style={[
                    styles.weightInput,
                    {
                      borderColor: mossBorder ? colors.moss : colors.clay,
                    },
                  ]}
                />
                <Text style={styles.kgSuffix}>kg</Text>
              </View>
            </View>
          );
        })
      )}

      {saveError ? <View style={styles.errorBox}><Text style={styles.errorBoxText}>{saveError}</Text></View> : null}

      <Button
        label="Save weight"
        variant="primary"
        onPress={() => void saveWeight()}
        loading={saving}
        disabled={!canSave}
        fullWidth
        style={styles.saveButton}
      />

      {items.length > 0 ? (
        <>
          <View style={styles.sectionSpacer} />
          <SectionLabel>SESSION TOTALS</SectionLabel>
          {sessionTotalRows.map((row, idx) => (
            <View
              key={row.userId}
              style={[
                styles.totalMemberRow,
                idx < sessionTotalRows.length - 1 && styles.memberRowBorder,
              ]}
            >
              <Text style={styles.sessionMemberName} numberOfLines={1}>
                {row.name}
              </Text>
              <Text style={styles.sessionMemberKg}>
                {row.kg.toFixed(1)} kg total
              </Text>
            </View>
          ))}
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>
              {grandTotalKg.toFixed(1)} kg
            </Text>
          </View>
        </>
      ) : null}

      <Button
        label="Close session"
        variant="secondary"
        onPress={() => void handleCloseSession()}
        disabled={closing}
        loading={closing}
        fullWidth
        style={styles.closeSessionBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing[5], paddingBottom: spacing[10] },
  loadingRow: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  errorBanner: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing[3],
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  memberRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  memberName: {
    flex: 1,
    marginLeft: 10,
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  inputKgRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightInput: {
    width: 120,
    minWidth: 120,
    height: 48,
    fontSize: 20,
    textAlign: 'right',
    fontFamily: typography.mono,
    color: colors.clayDark,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceRaised,
  },
  kgSuffix: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    marginLeft: 6,
  },
  errorBox: {
    marginTop: spacing[3],
    padding: spacing[3],
    borderRadius: radius.sm,
    backgroundColor: colors.errorLight,
    borderWidth: 0.5,
    borderColor: colors.error,
  },
  errorBoxText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  saveButton: {
    marginTop: spacing[4],
    height: 48,
    minHeight: 48,
  },
  sectionSpacer: {
    height: spacing[6],
  },
  totalMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: spacing[2],
  },
  sessionMemberName: {
    flex: 1,
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkMid,
  },
  sessionMemberKg: {
    fontFamily: typography.mono,
    fontSize: 13,
    color: colors.mossDark,
  },
  grandTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.mossLight,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  grandTotalValue: {
    fontFamily: typography.monoMedium,
    fontSize: 14,
    color: colors.mossDark,
    fontWeight: '500',
  },
  closeSessionBtn: {
    marginTop: spacing[6],
    borderColor: colors.moss,
  },
});
