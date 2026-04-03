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
import { Divider, Avatar } from '../../components/ui';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';
import { apiFetch } from '../../services/api';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'AssistantsOverview'>;

type AssistantSummary = {
  userId: string;
  name: string;
  avatarUrl?: string;
  totalHours: number;
  sessions: {
    id: string;
    checkedInAt?: string;
    checkedOutAt?: string;
    hours?: number;
    status: string;
  }[];
};

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
    });
  } catch {
    return '—';
  }
}

export default function AssistantsOverviewScreen({ route }: Props) {
  const { tenantId } = route.params;
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [assistants, setAssistants] = useState<AssistantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{ assistants: AssistantSummary[] }>(
        `/studios/${tenantId}/attendance?year=${selectedYear}&month=${selectedMonth}`,
        {},
        tenantId
      );
      const raw = res.assistants ?? [];
      setAssistants(
        raw.map((a) => ({
          ...a,
          avatarUrl:
            a.avatarUrl ?? (a as { avatar_url?: string }).avatar_url,
        }))
      );
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

  function goPrevMonth() {
    if (selectedMonth === 1) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(12);
    } else setSelectedMonth((m) => m - 1);
  }

  function goNextMonth() {
    const isCurrent =
      selectedYear === now.getFullYear() &&
      selectedMonth === now.getMonth() + 1;
    if (isCurrent) return;
    if (selectedMonth === 12) {
      setSelectedYear((y) => y + 1);
      setSelectedMonth(1);
    } else setSelectedMonth((m) => m + 1);
  }

  const nextDisabled =
    selectedYear === now.getFullYear() &&
    selectedMonth === now.getMonth() + 1;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
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
          disabled={nextDisabled}
        >
          <Text
            style={[
              styles.chevronText,
              nextDisabled && styles.chevronDisabled,
            ]}
          >
            ›
          </Text>
        </TouchableOpacity>
      </View>

      <Divider />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color={colors.clay} style={styles.loader} />
      ) : assistants.length === 0 ? (
        <Text style={styles.empty}>No assistants found.</Text>
      ) : (
        assistants.map((a) => (
          <View key={a.userId}>
            <TouchableOpacity
              style={styles.assistantRow}
              onPress={() =>
                setExpanded(expanded === a.userId ? null : a.userId)
              }
              activeOpacity={0.7}
            >
              <Avatar name={a.name} size="sm" imageUrl={a.avatarUrl} />
              <View style={styles.assistantInfo}>
                <Text style={styles.assistantName}>{a.name}</Text>
                <Text style={styles.assistantHours}>
                  {a.totalHours.toFixed(1)} h this month
                </Text>
              </View>
              <Text style={styles.expandChevron}>
                {expanded === a.userId ? '⌄' : '›'}
              </Text>
            </TouchableOpacity>

            {expanded === a.userId ? (
              <View style={styles.sessions}>
                {a.sessions.filter((s) => s.status === 'closed').length ===
                0 ? (
                  <Text style={styles.empty}>No sessions this month.</Text>
                ) : (
                  a.sessions
                    .filter((s) => s.status === 'closed')
                    .map((s) => (
                      <View key={s.id} style={styles.sessionRow}>
                        <Text style={styles.sessionDate}>
                          {formatDate(s.checkedInAt)}
                        </Text>
                        <Text style={styles.sessionTime}>
                          {formatTime(s.checkedInAt)} –{' '}
                          {formatTime(s.checkedOutAt)}
                        </Text>
                        <Text style={styles.sessionHours}>
                          {(s.hours ?? 0).toFixed(1)} h
                        </Text>
                      </View>
                    ))
                )}
              </View>
            ) : null}
            <Divider />
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing[4], gap: spacing[3] },
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
  loader: { marginTop: spacing[4] },
  error: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  empty: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    textAlign: 'center',
    paddingVertical: spacing[3],
  },
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
  },
  assistantInfo: { flex: 1 },
  assistantName: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  assistantHours: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: 2,
  },
  expandChevron: {
    fontFamily: typography.body,
    fontSize: 18,
    color: colors.clay,
  },
  sessions: {
    paddingLeft: spacing[4] + 32,
    gap: spacing[1],
    paddingBottom: spacing[2],
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[1],
  },
  sessionDate: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    width: 70,
  },
  sessionTime: {
    flex: 1,
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  sessionHours: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.clay,
  },
});
