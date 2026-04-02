import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SectionLabel, Divider } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import { apiFetch } from '../../services/api';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Attendance'>;

type Session = {
  id: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  hours?: number;
  status: string;
  date?: string;
};

function formatTime(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso ?? '—';
  }
}

function periodLabel(year: number, month: number): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return `${months[month - 1]} ${year}`;
}

export default function AttendanceScreen({ route }: Props) {
  const { tenantId } = route.params;
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{
        sessions: Session[];
        totalHours: number;
        checkedIn: boolean;
      }>(
        `/studios/${tenantId}/attendance/mine?year=${selectedYear}&month=${selectedMonth}`,
        {},
        tenantId
      );
      setSessions(res.sessions ?? []);
      setTotalHours(res.totalHours ?? 0);
      setCheckedIn(res.checkedIn ?? false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load attendance.');
    } finally {
      setLoading(false);
    }
  }, [tenantId, selectedYear, selectedMonth]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function onCheckIn() {
    setActionLoading(true);
    setError('');
    try {
      await apiFetch(
        `/studios/${tenantId}/attendance/checkin`,
        { method: 'POST' },
        tenantId
      );
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Check in failed.');
    } finally {
      setActionLoading(false);
    }
  }

  async function onCheckOut() {
    setActionLoading(true);
    setError('');
    try {
      await apiFetch(
        `/studios/${tenantId}/attendance/checkout`,
        { method: 'POST' },
        tenantId
      );
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Check out failed.');
    } finally {
      setActionLoading(false);
    }
  }

  function goPrevMonth() {
    if (selectedMonth === 1) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(12);
    } else setSelectedMonth((m) => m - 1);
  }

  function goNextMonth() {
    const isCurrentMonth =
      selectedYear === now.getFullYear() &&
      selectedMonth === now.getMonth() + 1;
    if (isCurrentMonth) return;
    if (selectedMonth === 12) {
      setSelectedYear((y) => y + 1);
      setSelectedMonth(1);
    } else setSelectedMonth((m) => m + 1);
  }

  const nextMonthDisabled =
    selectedYear === now.getFullYear() &&
    selectedMonth === now.getMonth() + 1;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <TouchableOpacity
        style={[styles.checkBtn, checkedIn && styles.checkBtnActive]}
        onPress={checkedIn ? onCheckOut : onCheckIn}
        disabled={actionLoading}
        activeOpacity={0.8}
      >
        {actionLoading ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text style={styles.checkBtnLabel}>
            {checkedIn ? '⏹ Check out' : '▶ Check in'}
          </Text>
        )}
      </TouchableOpacity>

      {checkedIn ? (
        <View style={styles.activeCard}>
          <Text style={styles.activeLabel}>Session in progress</Text>
          <Text style={styles.activeTime}>
            Started at{' '}
            {formatTime(
              sessions.find((s) => s.status === 'open')?.checkedInAt
            )}
          </Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Divider />

      <View style={styles.periodRow}>
        <TouchableOpacity onPress={goPrevMonth} style={styles.chevron}>
          <Text style={styles.chevronText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.periodTitle}>
          {periodLabel(selectedYear, selectedMonth)}
        </Text>
        <TouchableOpacity
          onPress={goNextMonth}
          style={styles.chevron}
          disabled={nextMonthDisabled}
        >
          <Text
            style={[
              styles.chevronText,
              nextMonthDisabled && styles.chevronDisabled,
            ]}
          >
            ›
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total hours</Text>
        <Text style={styles.totalValue}>{totalHours.toFixed(1)} h</Text>
      </View>

      <Divider />

      <SectionLabel>SESSIONS</SectionLabel>

      {loading ? (
        <ActivityIndicator color={colors.clay} style={styles.loader} />
      ) : sessions.filter((s) => s.status === 'closed').length === 0 ? (
        <Text style={styles.empty}>No sessions this month.</Text>
      ) : (
        sessions
          .filter((s) => s.status === 'closed')
          .map((s) => (
            <View key={s.id} style={styles.sessionRow}>
              <View style={styles.sessionMain}>
                <Text style={styles.sessionDate}>
                  {formatDate(s.checkedInAt)}
                </Text>
                <Text style={styles.sessionTime}>
                  {formatTime(s.checkedInAt)} – {formatTime(s.checkedOutAt)}
                </Text>
              </View>
              <Text style={styles.sessionHours}>
                {(s.hours ?? 0).toFixed(1)} h
              </Text>
            </View>
          ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing[4], gap: spacing[3] },
  checkBtn: {
    backgroundColor: colors.moss,
    borderRadius: radius.lg,
    padding: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  checkBtnActive: { backgroundColor: colors.error },
  checkBtnLabel: {
    fontFamily: typography.bodySemiBold,
    fontSize: fontSize.lg,
    color: colors.surface,
  },
  activeCard: {
    backgroundColor: colors.mossLight,
    borderRadius: radius.md,
    padding: spacing[3],
    gap: 4,
  },
  activeLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.moss,
    textTransform: 'uppercase',
  },
  activeTime: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  error: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chevron: { padding: spacing[2] },
  chevronText: { fontSize: 22, color: colors.clay, fontFamily: typography.body },
  chevronDisabled: { color: colors.inkFaint },
  periodTitle: {
    fontFamily: typography.display,
    fontSize: fontSize.lg,
    color: colors.ink,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.mossLight,
    borderRadius: radius.md,
    padding: spacing[3],
  },
  totalLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.moss,
    textTransform: 'uppercase',
  },
  totalValue: {
    fontFamily: typography.display,
    fontSize: fontSize.xl,
    color: colors.moss,
  },
  loader: { marginTop: spacing[4] },
  empty: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    textAlign: 'center',
    paddingVertical: spacing[3],
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  sessionMain: { flex: 1 },
  sessionDate: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  sessionTime: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: 2,
  },
  sessionHours: {
    fontFamily: typography.mono,
    fontSize: fontSize.md,
    color: colors.clay,
  },
});
