import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { SectionLabel } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import type { Task } from './TaskListScreen';

type Nav = NativeStackNavigationProp<AppStackParamList, 'TaskDetail'>;
type Route = RouteProp<AppStackParamList, 'TaskDetail'>;

type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';

type EditableTaskStatus = 'todo' | 'in_progress' | 'done';

type MemberRow = {
  userId: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
};

type HourLog = {
  id?: string;
  hours?: number;
  date?: string;
  note?: string;
  userName?: string;
  createdAt?: string;
};

function parseTasksLocal(data: unknown): Task[] {
  if (Array.isArray(data)) return data as Task[];
  if (data && typeof data === 'object' && 'tasks' in data) {
    const t = (data as { tasks?: Task[] }).tasks;
    return Array.isArray(t) ? t : [];
  }
  return [];
}

function parseLogs(data: unknown): HourLog[] {
  if (data && typeof data === 'object' && 'logs' in data) {
    const l = (data as { logs?: HourLog[] }).logs;
    return Array.isArray(l) ? l : [];
  }
  if (Array.isArray(data)) return data as HourLog[];
  return [];
}

function extractTask(data: unknown): Task | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  if (o.task && typeof o.task === 'object') return o.task as Task;
  if ('id' in o || '_id' in o) return o as Task;
  return null;
}

function tid(t: Task): string {
  return String(t.id ?? '').trim();
}

function formatDueAtDisplay(dueAt: string | null | undefined): string {
  if (dueAt == null || dueAt === '') return '';
  try {
    const d = new Date(dueAt);
    if (Number.isNaN(d.getTime())) return String(dueAt);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(dueAt);
  }
}

function isOverdueDueAtDate(dueAt: string | null | undefined): boolean {
  if (dueAt == null || dueAt === '') return false;
  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return false;
  const dueMid = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate()
  ).getTime();
  const now = new Date();
  const todayMid = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  return dueMid < todayMid;
}

function normStatusLocal(t: Task): TaskStatus {
  const raw = (t.status ?? 'todo').toString().toLowerCase().replace(/\s+/g, '_');
  if (raw === 'cancelled' || raw === 'canceled') return 'cancelled';
  if (raw === 'done' || raw === 'complete' || raw === 'completed') return 'done';
  if (raw === 'in_progress' || raw === 'inprogress') return 'in_progress';
  return 'todo';
}

function assigneeUserIdOf(t: Task): string {
  return (t.assigneeUserId ?? '').toString().trim();
}

function createdById(t: Task): string {
  return (t.createdBy ?? '').toString().trim();
}

const STATUS_OPTS: { key: EditableTaskStatus; label: string; dot: string }[] = [
  { key: 'todo', label: 'To do', dot: colors.inkLight },
  { key: 'in_progress', label: 'In progress', dot: colors.clay },
  { key: 'done', label: 'Done', dot: colors.moss },
];

function statusBtnContainerSel(k: EditableTaskStatus) {
  if (k === 'todo') {
    return {
      backgroundColor: colors.creamDark,
      borderColor: colors.borderStrong,
    };
  }
  if (k === 'in_progress') {
    return { backgroundColor: colors.clayLight, borderColor: colors.clay };
  }
  return { backgroundColor: colors.mossLight, borderColor: colors.moss };
}

function statusBtnLabelSelColor(k: EditableTaskStatus): string {
  if (k === 'todo') return colors.ink;
  if (k === 'in_progress') return colors.clayDark;
  return colors.mossDark;
}

export default function TaskDetailScreen({ route }: { route: Route }) {
  const { tenantId, taskId, taskTitle: paramTitle } = route.params;
  const navigation = useNavigation<Nav>();
  const { studios } = useAuth();

  const role = studios.find((s) => s.tenantId === tenantId)?.role;
  const isStaff = role === 'owner' || role === 'assistant';

  const [task, setTask] = useState<Task | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [logs, setLogs] = useState<HourLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoursInput, setHoursInput] = useState('');
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState('');
  const [statusBusy, setStatusBusy] = useState(false);

  const nameByUserId = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of members) {
      m.set(x.userId, (x.name || x.email || '').trim() || x.userId);
    }
    return m;
  }, [members]);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      let t: Task | null = null;
      try {
        const raw = await apiFetch<unknown>(
          `/studios/${tenantId}/tasks/${taskId}`,
          {},
          tenantId
        );
        t = extractTask(raw);
        if (!t && raw && typeof raw === 'object' && 'id' in raw) {
          t = raw as Task;
        }
      } catch {
        t = null;
      }
      if (!t || !tid(t)) {
        const listRes = await apiFetch<unknown>(
          `/studios/${tenantId}/tasks`,
          {},
          tenantId
        );
        t =
          parseTasksLocal(listRes).find((x) => tid(x) === taskId) ?? null;
      }
      if (!t) throw new Error('Task not found');
      setTask(t);

      const [logsRes, memRes] = await Promise.all([
        apiFetch<unknown>(
          `/studios/${tenantId}/tasks/${taskId}/logs`,
          {},
          tenantId
        ).catch(() => null),
        apiFetch<{ members: MemberRow[] }>(
          `/studios/${tenantId}/members`,
          {},
          tenantId
        ).catch(() => ({ members: [] as MemberRow[] })),
      ]);
      setLogs(logsRes != null ? parseLogs(logsRes) : []);
      setMembers(memRes.members ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load task.');
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId, taskId]);

  useEffect(() => {
    load();
  }, [load]);

  const displayTitle = (task?.title ?? paramTitle ?? 'Task').trim();

  useLayoutEffect(() => {
    navigation.setOptions({ title: displayTitle });
  }, [navigation, displayTitle]);

  const assigneeName = useMemo(() => {
    if (!task) return '';
    const n = (task.assigneeName ?? '').trim();
    if (n) return n;
    const uid = assigneeUserIdOf(task);
    return uid ? nameByUserId.get(uid) ?? uid : '—';
  }, [task, nameByUserId]);

  const creatorName = useMemo(() => {
    if (!task) return '';
    const n = (task.creatorName ?? '').trim();
    if (n) return n;
    const uid = createdById(task);
    return uid ? nameByUserId.get(uid) ?? uid : '—';
  }, [task, nameByUserId]);

  const due = task ? formatDueAtDisplay(task.dueAt ?? undefined) : '';
  const overdue = task ? isOverdueDueAtDate(task.dueAt ?? undefined) : false;
  const currentStatus = task ? normStatusLocal(task) : 'todo';

  const totalLogged = useMemo(() => {
    let s = 0;
    for (const l of logs) {
      const h = Number(l.hours);
      if (Number.isFinite(h)) s += h;
    }
    return s;
  }, [logs]);

  async function handleStatusChange(newStatus: string) {
    if (!task || !isStaff || statusBusy) return;
    setStatusBusy(true);
    try {
      await apiFetch(
        `/studios/${tenantId}/tasks/${taskId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus }),
        },
        tenantId
      );
      setTask((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Failed to update status'
      );
    } finally {
      setStatusBusy(false);
    }
  }

  async function submitLog() {
    if (!isStaff) return;
    const n = hoursInput.trim()
      ? parseFloat(hoursInput.replace(',', '.'))
      : 0;
    if (isNaN(n) || n < 0) {
      setLogError('Hours must be 0 or more.');
      return;
    }
    const ok =
      typeof window !== 'undefined'
        ? window.confirm('Log these hours on this task?')
        : true;
    if (!ok) return;

    setLogging(true);
    setLogError('');
    try {
      await apiFetch(
        `/studios/${tenantId}/tasks/${taskId}/logs`,
        {
          method: 'POST',
          body: JSON.stringify({ hours: n }),
        },
        tenantId
      );
      setHoursInput('');
      const logsRes = await apiFetch<unknown>(
        `/studios/${tenantId}/tasks/${taskId}/logs`,
        {},
        tenantId
      );
      setLogs(parseLogs(logsRes));
    } catch (e: unknown) {
      setLogError(e instanceof Error ? e.message : 'Could not log hours.');
    } finally {
      setLogging(false);
    }
  }

  function logDisplayName(l: HourLog): string {
    return (l.userName ?? '').trim() || '—';
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.clay} />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.centered}>
        <Text style={styles.err}>{error || 'Task not found.'}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {error ? <Text style={styles.bannerErr}>{error}</Text> : null}

      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>{displayTitle}</Text>
        <View style={styles.metaBlock}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Assigned to</Text>
            <Text style={styles.metaValue}>{assigneeName}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Due date</Text>
            <Text
              style={[styles.metaMono, overdue && styles.metaOverdue]}
            >
              {due || '—'}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Created by</Text>
            <Text style={styles.metaCreator}>{creatorName}</Text>
          </View>
        </View>
      </View>

      <SectionLabel>STATUS</SectionLabel>
      {isStaff ? (
        <View style={styles.statusRow}>
          {STATUS_OPTS.map((opt) => {
            const sel = currentStatus === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.statusBtn,
                  sel ? statusBtnContainerSel(opt.key) : null,
                ]}
                onPress={() => void handleStatusChange(opt.key)}
                disabled={statusBusy}
              >
                <View style={[styles.statusDotSm, { backgroundColor: opt.dot }]} />
                <Text
                  style={[
                    styles.statusBtnLabel,
                    sel && { color: statusBtnLabelSelColor(opt.key) },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <Text style={styles.memberStatus}>
          {STATUS_OPTS.find((o) => o.key === currentStatus)?.label ?? currentStatus}
        </Text>
      )}

      {isStaff ? (
        <>
          <View style={styles.sectionGap} />
          <SectionLabel>LOG HOURS</SectionLabel>
          <View style={styles.logCard}>
            <TextInput
              value={hoursInput}
              onChangeText={(t) => {
                setHoursInput(t);
                setLogError('');
              }}
              keyboardType="decimal-pad"
              placeholder="Hours (optional)"
              placeholderTextColor={colors.inkFaint}
              style={styles.hoursField}
            />
            <Text style={styles.hoursWord}>hours</Text>
            <TouchableOpacity
              style={styles.logBtn}
              onPress={() => void submitLog()}
              disabled={logging}
            >
              {logging ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.logBtnText}>Log</Text>
              )}
            </TouchableOpacity>
          </View>
          {logError ? <Text style={styles.logErr}>{logError}</Text> : null}
        </>
      ) : null}

      <View style={styles.sectionGap} />
      <SectionLabel>HOURS LOGGED</SectionLabel>
      {logs.length > 0 ? (
        <>
          <View style={styles.totalPill}>
            <Text style={styles.totalPillText}>
              {totalLogged.toFixed(1)} hours total
            </Text>
          </View>
          {logs.map((l, idx) => {
            const h = Number(l.hours);
            const dateStr = l.date ?? '—';
            const who = logDisplayName(l);
            return (
              <View
                key={l.id ?? `${dateStr}-${idx}`}
                style={[
                  styles.logRow,
                  idx < logs.length - 1 && styles.logRowBorder,
                ]}
              >
                <View style={styles.logLeft}>
                  <Text style={styles.logLine}>
                    {who} · {dateStr}
                  </Text>
                  {l.note ? (
                    <Text style={styles.logNote} numberOfLines={2}>
                      {l.note}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.logH}>
                  {Number.isFinite(h) ? `${h}h` : '—'}
                </Text>
              </View>
            );
          })}
        </>
      ) : (
        <Text style={styles.logEmpty}>No hours logged yet.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 24, paddingBottom: 40 },
  centered: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[5],
  },
  err: { fontFamily: typography.body, color: colors.error, textAlign: 'center' },
  bannerErr: {
    color: colors.error,
    marginBottom: spacing[3],
    fontFamily: typography.body,
    fontSize: fontSize.sm,
  },
  headerCard: {
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 20,
  },
  headerTitle: {
    fontFamily: typography.display,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  metaBlock: { marginTop: 8, gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 },
  metaLabel: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    width: 88,
  },
  metaValue: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
    flex: 1,
  },
  metaMono: {
    fontFamily: typography.mono,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  metaOverdue: { color: colors.error },
  metaCreator: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    flex: 1,
  },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: spacing[2] },
  statusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  statusDotSm: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  statusBtnLabel: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkMid,
    textAlign: 'center',
  },
  memberStatus: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.inkMid,
    marginBottom: spacing[2],
  },
  sectionGap: { height: spacing[5] },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: 14,
    gap: 8,
  },
  hoursField: {
    width: 80,
    fontSize: 20,
    fontFamily: typography.mono,
    color: colors.clayDark,
    borderWidth: 1,
    borderColor: colors.clay,
    borderRadius: radius.sm,
    textAlign: 'right',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: colors.surfaceRaised,
  },
  hoursWord: {
    flex: 1,
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkMid,
  },
  logBtn: {
    backgroundColor: colors.clay,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logBtnText: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.sm,
    color: '#fff',
  },
  logErr: {
    marginTop: 8,
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  totalPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.mossLight,
    borderRadius: radius.full,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  totalPillText: {
    fontFamily: typography.monoMedium,
    fontSize: 14,
    color: colors.mossDark,
    fontWeight: '500',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: spacing[2],
  },
  logRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  logLeft: { flex: 1 },
  logLine: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
  },
  logNote: {
    fontFamily: typography.body,
    fontSize: fontSize.xs,
    color: colors.inkMid,
    marginTop: 4,
  },
  logH: { fontFamily: typography.mono, fontSize: 13, color: colors.clayDark },
  logEmpty: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    marginTop: spacing[1],
  },
});