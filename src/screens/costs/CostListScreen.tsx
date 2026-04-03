import React, { useCallback, useLayoutEffect, useState } from 'react';
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
import { Avatar, Badge } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

type Nav = NativeStackNavigationProp<AppStackParamList, 'CostList'>;
type Route = RouteProp<AppStackParamList, 'CostList'>;

type MemberRow = {
  userId: string;
  email: string;
  name: string;
  status: string;
  avatarUrl?: string;
};

type LiveCostRow = {
  grandTotal: number;
  summaryStatus: 'draft' | 'sent' | null;
};

function parseMembersList(data: unknown): MemberRow[] {
  let raw: unknown[] = [];
  if (Array.isArray(data)) raw = data;
  else if (data && typeof data === 'object' && 'members' in data) {
    const m = (data as { members?: unknown[] }).members;
    if (Array.isArray(m)) raw = m;
  }
  return raw
    .map((row): MemberRow | null => {
      if (!row || typeof row !== 'object') return null;
      const o = row as Record<string, unknown>;
      const userId = String(o.userId ?? o.user_id ?? '');
      if (!userId) return null;
      return {
        userId,
        email: String(o.email ?? ''),
        name: String(o.name ?? '').trim(),
        status: String(o.status ?? '').toLowerCase(),
        avatarUrl:
          o.avatarUrl != null
            ? String(o.avatarUrl).trim() || undefined
            : o.avatar_url != null
              ? String(o.avatar_url).trim() || undefined
              : undefined,
      };
    })
    .filter((x): x is MemberRow => x != null);
}

function parseLiveCost(data: unknown): LiveCostRow {
  if (!data || typeof data !== 'object') {
    return { grandTotal: 0, summaryStatus: null };
  }
  const o = data as Record<string, unknown>;
  const gt =
    typeof o.grandTotal === 'number'
      ? o.grandTotal
      : typeof o.grand_total === 'number'
        ? o.grand_total
        : Number(o.grandTotal ?? o.grand_total ?? 0);
  const grandTotal = Number.isFinite(gt) ? gt : 0;
  const summaryObj =
    o.summary != null && typeof o.summary === 'object'
      ? (o.summary as Record<string, unknown>)
      : null;
  const raw =
    o.summaryStatus ??
    o.summary_status ??
    summaryObj?.status ??
    o.status;
  const s = String(raw ?? '').toLowerCase();
  let summaryStatus: 'draft' | 'sent' | null = null;
  if (s === 'draft') summaryStatus = 'draft';
  else if (s === 'sent') summaryStatus = 'sent';
  return { grandTotal, summaryStatus };
}

function periodFromLivePayload(live: unknown): string {
  if (!live || typeof live !== 'object') return '';
  return String((live as Record<string, unknown>).period ?? '').trim();
}

function livePeriodMatchesMonth(
  periodStr: string,
  y: number,
  mo: number
): boolean {
  const t = periodStr.trim();
  if (!t) return false;
  const parts = t.split('-');
  if (parts.length < 2) return false;
  return Number(parts[0]) === y && Number(parts[1]) === mo;
}

/**
 * Backend may return full totals on GET .../live/{userId} (no query) like /live/mine,
 * while .../live/{userId}?year=&month= can be empty. Merge both behaviors for the owner list.
 */
async function fetchMemberLiveCostRow(
  tenantId: string,
  userId: string,
  y: number,
  mo: number
): Promise<LiveCostRow> {
  const qs = `?year=${y}&month=${mo}`;
  const want = `${y}-${String(mo).padStart(2, '0')}`;
  const now = new Date();
  const viewingCurrentMonth =
    y === now.getFullYear() && mo === now.getMonth() + 1;

  const tryBare = async (): Promise<LiveCostRow | null> => {
    try {
      const liveBare = await apiFetch<unknown>(
        `/studios/${tenantId}/costs/live/${userId}`,
        {},
        tenantId
      );
      const rowBare = parseLiveCost(liveBare);
      const pBare = periodFromLivePayload(liveBare);
      const bareEmpty =
        rowBare.grandTotal === 0 && rowBare.summaryStatus == null;
      if (bareEmpty) return null;
      if (!pBare && viewingCurrentMonth) return rowBare;
      if (pBare && livePeriodMatchesMonth(pBare, y, mo)) return rowBare;
      return null;
    } catch {
      return null;
    }
  };

  try {
    const live = await apiFetch<unknown>(
      `/studios/${tenantId}/costs/live/${userId}${qs}`,
      {},
      tenantId
    );
    let row = parseLiveCost(live);
    const empty = row.grandTotal === 0 && row.summaryStatus == null;
    if (!empty) return row;
    return (await tryBare()) ?? row;
  } catch {
    return (await tryBare()) ?? { grandTotal: 0, summaryStatus: null };
  }
}

function formatEuro(n: number): string {
  return `€${Number(n).toFixed(2)}`;
}

function periodLabel(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function isAfterCurrentMonth(y: number, m: number): boolean {
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;
  if (y > cy) return true;
  if (y === cy && m > cm) return true;
  return false;
}

function bumpMonthForward(year: number, month: number): { y: number; m: number } {
  if (month >= 12) return { y: year + 1, m: 1 };
  return { y: year, m: month + 1 };
}

export default function CostListScreen({ route }: { route: Route }) {
  const { tenantId } = route.params;
  const navigation = useNavigation<Nav>();
  const { studios } = useAuth();

  const currentStudio =
    studios.find((s) => s.tenantId === tenantId) ??
    studios.find((s) => s.status === 'active') ??
    studios[0];

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [costsMap, setCostsMap] = useState<Record<string, LiveCostRow>>({});
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    if (currentStudio?.role !== 'owner') {
      if (typeof window !== 'undefined') {
        window.alert('Only studio owners can view cost summaries.');
      }
      navigation.goBack();
    }
  }, [currentStudio?.role, navigation]);

  const load = useCallback(async () => {
    if (currentStudio?.role !== 'owner') return;
    setLoading(true);
    try {
      const memRes = await apiFetch<unknown>(
        `/studios/${tenantId}/members`,
        {},
        tenantId
      );
      const all = parseMembersList(memRes);
      const active = all.filter((m) => m.status === 'active');
      setMembers(active);

      const y = selectedYear;
      const mo = selectedMonth;
      const entries = await Promise.all(
        active.map(async (m) => {
          const row = await fetchMemberLiveCostRow(
            tenantId,
            m.userId,
            y,
            mo
          );
          return [m.userId, row] as const;
        })
      );
      const next: Record<string, LiveCostRow> = {};
      for (const [uid, row] of entries) next[uid] = row;
      setCostsMap(next);
    } catch {
      setMembers([]);
      setCostsMap({});
    } finally {
      setLoading(false);
    }
  }, [tenantId, selectedYear, selectedMonth, currentStudio?.role]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  function goPrevMonth() {
    if (selectedMonth <= 1) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    const { y: nextY, m: nextM } = bumpMonthForward(
      selectedYear,
      selectedMonth
    );
    if (isAfterCurrentMonth(nextY, nextM)) return;
    setSelectedYear(nextY);
    setSelectedMonth(nextM);
  }

  const nextPeriod = bumpMonthForward(selectedYear, selectedMonth);
  const nextMonthDisabled = isAfterCurrentMonth(nextPeriod.y, nextPeriod.m);

  const totalAll = members.reduce(
    (acc, m) => acc + (costsMap[m.userId]?.grandTotal ?? 0),
    0
  );

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.periodBox}>
        <View style={styles.periodTop}>
          <Text style={styles.periodLabel}>PERIOD</Text>
          <View style={styles.monthNav}>
            <TouchableOpacity
              onPress={goPrevMonth}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
            >
              <Text style={styles.monthNavChevron}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthNavTitle}>
              {periodLabel(selectedYear, selectedMonth)}
            </Text>
            <TouchableOpacity
              onPress={goNextMonth}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Next month"
              disabled={nextMonthDisabled}
            >
              <Text
                style={[
                  styles.monthNavChevron,
                  nextMonthDisabled && styles.monthNavChevronDisabled,
                ]}
              >
                ›
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.pillRow}>
        <Text style={styles.pillText}>
          {members.length} members · {formatEuro(totalAll)} total all members
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.clay} />
        </View>
      ) : members.length === 0 ? (
        <Text style={styles.empty}>No members yet.</Text>
      ) : (
        members.map((m) => {
          const cost = costsMap[m.userId];
          const displayName = m.name || m.email || 'Member';
          const avatarName = m.name || m.email || '?';
          return (
            <TouchableOpacity
              key={m.userId}
              style={styles.card}
              activeOpacity={0.75}
              onPress={() =>
                navigation.navigate('CostDetail', {
                  tenantId,
                  userId: m.userId,
                  memberName: displayName,
                  memberEmail: m.email,
                  year: selectedYear,
                  month: selectedMonth,
                })
              }
            >
              <View style={styles.cardRow}>
                <View style={styles.avatarWrap}>
                  <Avatar
                    name={avatarName}
                    size="sm"
                    imageUrl={m.avatarUrl}
                  />
                </View>
                <View style={styles.cardMid}>
                  <Text style={styles.cardName}>{displayName}</Text>
                  <Text style={styles.cardEmail} numberOfLines={1}>
                    {m.email}
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.cardTotal}>
                    {formatEuro(cost?.grandTotal ?? 0)}
                  </Text>
                  {cost?.summaryStatus === 'draft' ? (
                    <Badge label="draft" variant="neutral" />
                  ) : cost?.summaryStatus === 'sent' ? (
                    <Badge label="sent" variant="moss" />
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20 },
  periodBox: {
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  periodTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodLabel: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  monthNavChevron: {
    fontFamily: typography.mono,
    fontSize: 18,
    color: colors.ink,
    paddingHorizontal: 4,
  },
  monthNavChevronDisabled: {
    color: colors.inkFaint,
  },
  monthNavTitle: {
    fontFamily: typography.mono,
    fontSize: 13,
    color: colors.ink,
  },
  pillRow: {
    backgroundColor: colors.cream,
    borderRadius: radius.full,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkMid,
  },
  loadingWrap: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  empty: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkMid,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: { marginRight: 12 },
  cardMid: { flex: 1, minWidth: 0 },
  cardName: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  cardEmail: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  cardTotal: {
    fontFamily: typography.display,
    fontSize: 20,
    color: colors.clayDark,
  },
});
