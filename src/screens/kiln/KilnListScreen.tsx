import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Badge } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';

type Nav = NativeStackNavigationProp<AppStackParamList, 'KilnList'>;
type Route = RouteProp<AppStackParamList, 'KilnList'>;

export type KilnType = 'bisque' | 'glaze' | 'private';

export interface KilnFiringListItem {
  _id: string;
  kilnType?: KilnType;
  kiln_type?: string;
  firingType?: string;
  firedAt?: string;
  fired_at?: string;
  scheduledAt?: string;
  scheduled_at?: string;
  status?: string;
  items?: unknown[];
  totalCost?: number;
  createdAt?: string;
  closedAt?: string;
}

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function rawKilnType(f: KilnFiringListItem) {
  return f?.kiln_type || f?.firingType || f?.kilnType || '';
}

function typeColor(t: string) {
  const k = (t || '').toLowerCase();
  if (k === 'bisque') return colors.clay;
  if (k === 'glaze') return colors.moss;
  return colors.inkMid;
}

function capitalizeType(t: string) {
  const s = t || '';
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function firingDateIso(f: KilnFiringListItem) {
  return (
    f.scheduledAt ?? f.scheduled_at ?? f.firedAt ?? f.fired_at ?? ''
  );
}

function formatFiringDate(iso: string) {
  const s = iso || '';
  if (!s) return '';
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return s;
  }
}

export default function KilnListScreen({ route }: { route: Route }) {
  const { tenantId } = route.params;
  const navigation = useNavigation<Nav>();
  const [firings, setFirings] = useState<KilnFiringListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch<
        { firings: KilnFiringListItem[] } | KilnFiringListItem[]
      >(`/studios/${tenantId}/kiln/firings`, {}, tenantId);
      const list = Array.isArray(data)
        ? data
        : (data as { firings?: KilnFiringListItem[] }).firings || [];
      setFirings(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load firings.');
      setFirings([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const stats = useMemo(() => {
    const open = firings.filter(
      (f) => (f.status || '').toLowerCase() === 'open'
    ).length;
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const thisMonth = firings.filter((f) => {
      const iso = firingDateIso(f);
      if (!iso) return false;
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return false;
      return d.getFullYear() === y && d.getMonth() === m;
    }).length;
    return { total: firings.length, open, thisMonth };
  }, [firings]);

  const chartBuckets = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.push({
        key: k,
        label: MONTH_SHORT[d.getMonth()],
        count: 0,
      });
    }
    for (const f of firings) {
      const iso = firingDateIso(f);
      if (!iso) continue;
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) continue;
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const b = buckets.find((x) => x.key === k);
      if (b) b.count += 1;
    }
    const maxC = Math.max(...buckets.map((b) => b.count), 1);
    return { buckets, maxC };
  }, [firings]);

  const openList = useMemo(
    () =>
      firings.filter((f) => (f.status || '').toLowerCase() === 'open'),
    [firings]
  );
  const closedList = useMemo(
    () =>
      firings.filter((f) => (f.status || '').toLowerCase() === 'closed'),
    [firings]
  );

  function renderRow(f: KilnFiringListItem) {
    const typeRaw = rawKilnType(f);
    const n = f?.items?.length ?? 0;
    const st = (f.status || '').toLowerCase();
    return (
      <TouchableOpacity
        key={f._id}
        style={styles.firingRow}
        onPress={() =>
          navigation.navigate('KilnDetail', {
            tenantId,
            firingId: f._id,
          })
        }
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.typeDot,
            { backgroundColor: typeColor(typeRaw) },
          ]}
        />
        <View style={styles.firingMid}>
          <View style={styles.firingTitleRow}>
            <Text style={styles.firingType}>
              {capitalizeType(typeRaw)}
            </Text>
            <Badge
              label={f.status || ''}
              variant={
                st === 'open' || st === 'scheduled' || st === 'loading'
                  ? 'open'
                  : st === 'closed' || st === 'complete'
                    ? 'neutral'
                    : st === 'cancelled'
                      ? 'error'
                      : 'open'
              }
            />
          </View>
          <Text style={styles.firingDate}>
            {formatFiringDate(firingDateIso(f))}
          </Text>
          {st === 'closed' && f.totalCost != null ? (
            <Text style={styles.firingCost}>
              €{Number(f.totalCost).toFixed(2)}
            </Text>
          ) : null}
        </View>
        <View style={styles.firingRight}>
          <Text style={styles.memberCount}>{n} members</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.clay} />
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.topRow}>
        <Text style={styles.pageTitle}>Kiln firings</Text>
        <ButtonSmallNew
          onPress={() => navigation.navigate('KilnNewSession', { tenantId })}
        />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Text style={styles.statPillText}>{stats.total} total</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statPillText}>{stats.open} open</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statPillText}>{stats.thisMonth} this month</Text>
        </View>
      </View>

      <Text style={styles.chartTitle}>FREQUENCY</Text>
      <View style={styles.chartBox}>
        <View style={styles.chartBars}>
          {chartBuckets.buckets.map((b) => {
            const h =
              b.count === 0
                ? 4
                : 4 + (b.count / chartBuckets.maxC) * (60 - 4);
            return (
              <View key={b.key} style={styles.barCol}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: h,
                      backgroundColor:
                        b.count > 0 ? colors.clay : colors.creamDark,
                    },
                  ]}
                />
                <Text style={styles.barLabel}>{b.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {openList.length > 0 ? (
        <>
          <Text style={styles.sectionHdr}>OPEN</Text>
          {openList.map(renderRow)}
        </>
      ) : null}

      {closedList.length > 0 ? (
        <>
          <Text
            style={[
              styles.sectionHdr,
              openList.length > 0 && { marginTop: spacing[4] },
            ]}
          >
            CLOSED
          </Text>
          {closedList.map(renderRow)}
        </>
      ) : null}

      {!loading && firings.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No firings yet.</Text>
          <Text style={styles.emptyHint}>
            Tap + New to start a session.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function ButtonSmallNew({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.newBtn}
      accessibilityRole="button"
      accessibilityLabel="New firing session"
    >
      <Text style={styles.newBtnText}>+ New</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing[5], paddingBottom: spacing[10] },
  loadingWrap: { paddingVertical: spacing[4], alignItems: 'center' },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing[2],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[5],
  },
  pageTitle: {
    fontFamily: typography.display,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  newBtn: {
    paddingVertical: 8,
    paddingHorizontal: spacing[3],
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.clay,
    backgroundColor: 'transparent',
  },
  newBtnText: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.clay,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  statPill: {
    backgroundColor: colors.cream,
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    marginRight: spacing[2],
  },
  statPillText: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkMid,
  },
  chartTitle: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
  },
  chartBox: {
    marginBottom: spacing[5],
  },
  chartBars: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    minHeight: 4,
  },
  barLabel: {
    fontFamily: typography.mono,
    fontSize: 9,
    color: colors.inkLight,
    marginTop: 4,
  },
  sectionHdr: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
    letterSpacing: 0.8,
    marginBottom: spacing[2],
  },
  firingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  typeDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: spacing[3],
  },
  firingMid: { flex: 1 },
  firingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  firingType: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  firingDate: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
    marginTop: 2,
  },
  firingCost: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.mossDark,
    marginTop: 2,
  },
  firingRight: { alignItems: 'flex-end' },
  memberCount: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
  },
  chevron: {
    fontFamily: typography.body,
    fontSize: 16,
    color: colors.inkLight,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing[10],
    paddingHorizontal: spacing[10],
  },
  emptyTitle: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkLight,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    textAlign: 'center',
    marginTop: spacing[2],
  },
});
