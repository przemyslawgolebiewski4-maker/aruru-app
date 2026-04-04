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
import DateTimeField from '../../components/DateTimeField';
import { Button, Input, SectionLabel } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import type { Task } from './TaskListScreen';

type Nav = NativeStackNavigationProp<AppStackParamList, 'TaskDetail'>;
type Route = RouteProp<AppStackParamList, 'TaskDetail'>;

type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';

type EditableTaskStatus =
  | 'todo'
  | 'in_progress'
  | 'done'
  | 'cancelled';

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
  { key: 'cancelled', label: 'Cancelled', dot: colors.inkMid },
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
  if (k === 'done') {
    return { backgroundColor: colors.mossLight, borderColor: colors.moss };
  }
  return {
    backgroundColor: colors.cream,
    borderColor: colors.inkLight,
  };
}

function statusBtnLabelSelColor(k: EditableTaskStatus): string {
  if (k === 'todo') return colors.ink;
  if (k === 'in_progress') return colors.clayDark;
  if (k === 'done') return colors.mossDark;
  return colors.inkMid;
}

export default function TaskDetailScreen({ route }: { route: Route }) {
  const { tenantId, taskId, taskTitle: paramTitle } = route.params;
  const navigation = useNavigation<Nav>();
  const { user, studios } = useAuth();

  const role = studios.find((s) => s.tenantId === tenantId)?.role;
  const isStaff = role === 'owner' || role === 'assistant';

  const [task, setTask] = useState<Task | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [logs, setLogs] = useState<HourLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoursInput, setHoursInput] = useState('');
  const [logDateInput, setLogDateInput] = useState('');
  const [logNoteInput, setLogNoteInput] = useState('');
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [descSaving, setDescSaving] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [dueAtDate, setDueAtDate] = useState<Date | null>(null);
  const [logSectionOpen, setLogSectionOpen] = useState(false);

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

  useEffect(() => {
    if (!task || editingDueDate) return;
    const raw = task.dueAt;
    setDueAtDate(
      raw != null && String(raw).trim() !== '' ? new Date(String(raw)) : null
    );
  }, [task, editingDueDate]);

  useEffect(() => {
    if (!task) return;
    setDescDraft((task.description ?? '').toString());
  }, [task?.id, task?.description]);

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

  const canEditTask =
    !!task &&
    (isStaff ||
      (!!user?.id && createdById(task) === user.id));

  async function handleStatusChange(newStatus: string) {
    if (!task || !canEditTask || statusBusy) return;
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

  const parsedLogHours = hoursInput.trim()
    ? parseFloat(hoursInput.replace(',', '.'))
    : NaN;
  const logHoursValid =
    Number.isFinite(parsedLogHours) && parsedLogHours > 0;

  async function submitLog() {
    const n = parsedLogHours;
    if (!logHoursValid) {
      setLogError('Add a positive number of hours to save this entry.');
      return;
    }
    const d = logDateInput.trim();
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      setLogError('Use date format YYYY-MM-DD, or leave empty for today.');
      return;
    }

    setLogging(true);
    setLogError('');
    try {
      const body: { hours: number; date?: string; note?: string } = {
        hours: n,
      };
      if (d) body.date = d;
      const note = logNoteInput.trim();
      if (note) body.note = note.slice(0, 500);

      await apiFetch(
        `/studios/${tenantId}/tasks/${taskId}/logs`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
        tenantId
      );
      setHoursInput('');
      setLogDateInput('');
      setLogNoteInput('');
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

  async function saveDescription() {
    if (!task || !canEditTask) return;
    setDescSaving(true);
    setError('');
    try {
      await apiFetch(
        `/studios/${tenantId}/tasks/${taskId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ description: descDraft.trim() }),
        },
        tenantId
      );
      setTask((prev) =>
        prev ? { ...prev, description: descDraft.trim() || null } : prev
      );
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Could not save description.'
      );
    } finally {
      setDescSaving(false);
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
            {canEditTask ? (
              editingDueDate ? (
                <View style={{ gap: spacing[2], flex: 1, alignItems: 'flex-end' }}>
                  <DateTimeField
                    label="Due date"
                    value={dueAtDate ?? new Date()}
                    onChange={async (d) => {
                      setDueAtDate(d);
                      setEditingDueDate(false);
                      try {
                        await apiFetch(
                          `/studios/${tenantId}/tasks/${taskId}`,
                          {
                            method: 'PATCH',
                            body: JSON.stringify({ dueAt: d.toISOString() }),
                          },
                          tenantId
                        );
                        await load();
                      } catch {
                        /* silent */
                      }
                    }}
                    mode="date"
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setEditingDueDate(false);
                      setDueAtDate(
                        task.dueAt != null &&
                          String(task.dueAt).trim() !== ''
                          ? new Date(String(task.dueAt))
                          : null
                      );
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: typography.mono,
                        fontSize: fontSize.xs,
                        color: colors.inkLight,
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setEditingDueDate(true)}
                  style={{ flex: 1, alignItems: 'flex-end' }}
                >
                  <Text
                    style={[styles.metaMono, overdue && styles.metaOverdue]}
                  >
                    {due || 'Add due date'}
                  </Text>
                </TouchableOpacity>
              )
            ) : (
              <Text
                style={[styles.metaMono, overdue && styles.metaOverdue]}
              >
                {due || '—'}
              </Text>
            )}
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Created by</Text>
            <Text style={styles.metaCreator}>{creatorName}</Text>
          </View>
        </View>
      </View>

      <SectionLabel>DESCRIPTION</SectionLabel>
      {canEditTask ? (
        <View style={styles.descCard}>
          <TextInput
            value={descDraft}
            onChangeText={setDescDraft}
            placeholder="Add details for your studio…"
            placeholderTextColor={colors.inkFaint}
            multiline
            style={styles.descInput}
            textAlignVertical="top"
          />
          <Button
            label="Save description"
            variant="secondary"
            onPress={() => void saveDescription()}
            loading={descSaving}
            disabled={descSaving}
            style={styles.descSaveBtn}
          />
        </View>
      ) : (
        <Text style={styles.descReadOnly}>
          {(task.description ?? '').trim() || 'No description.'}
        </Text>
      )}

      <View style={styles.sectionGap} />
      <SectionLabel>STATUS</SectionLabel>
      {canEditTask ? (
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
          {STATUS_OPTS.find((o) => o.key === currentStatus)?.label ??
            currentStatus}
        </Text>
      )}

      <View style={styles.sectionGap} />
      <SectionLabel>LOG TIME</SectionLabel>
      <TouchableOpacity
        style={styles.logAccordionHeader}
        onPress={() => setLogSectionOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: logSectionOpen }}
        activeOpacity={0.7}
      >
        <Text style={styles.logAccordionTitle}>Optional — record time</Text>
        <Text style={styles.logAccordionChev}>
          {logSectionOpen ? '▼' : '▶'}
        </Text>
      </TouchableOpacity>
      {logSectionOpen ? (
        <>
          <Text style={styles.logHint}>
            You do not need to log hours to use this task. When you want a time
            entry, enter hours greater than zero. Date defaults to today if
            left empty (server).
          </Text>
          <View style={styles.logCard}>
            <View style={styles.logFieldsCol}>
              <View style={styles.logHoursRow}>
                <TextInput
                  value={hoursInput}
                  onChangeText={(t) => {
                    setHoursInput(t);
                    setLogError('');
                  }}
                  keyboardType="decimal-pad"
                  placeholder="Hours"
                  placeholderTextColor={colors.inkFaint}
                  style={styles.hoursField}
                  accessibilityLabel="Hours worked"
                />
                <Text style={styles.hoursWord}>hours</Text>
              </View>
              <Input
                placeholder="Date YYYY-MM-DD (optional)"
                value={logDateInput}
                onChangeText={(t) => {
                  setLogDateInput(t);
                  setLogError('');
                }}
                containerStyle={styles.logDateWrap}
              />
              <TextInput
                value={logNoteInput}
                onChangeText={(t) => {
                  setLogNoteInput(t.slice(0, 500));
                  setLogError('');
                }}
                placeholder="Note (optional)"
                placeholderTextColor={colors.inkFaint}
                multiline
                style={styles.logNoteInput}
                textAlignVertical="top"
              />
            </View>
            <Button
              label="Add entry"
              variant="primary"
              onPress={() => void submitLog()}
              loading={logging}
              disabled={logging || !logHoursValid}
              style={styles.logBtn}
            />
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
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  statusBtn: {
    flexGrow: 1,
    minWidth: '44%',
    maxWidth: '48%',
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
  descCard: {
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  descInput: {
    minHeight: 88,
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
    marginBottom: spacing[3],
  },
  descSaveBtn: { alignSelf: 'flex-start' },
  descReadOnly: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkMid,
    lineHeight: 22,
    marginBottom: spacing[2],
  },
  sectionGap: { height: spacing[5] },
  logAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    marginBottom: spacing[2],
    backgroundColor: colors.cream,
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  logAccordionTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  logAccordionChev: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.inkLight,
  },
  logHint: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    marginBottom: spacing[3],
    lineHeight: 20,
  },
  logCard: {
    flexDirection: 'column',
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: spacing[3],
    gap: spacing[3],
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  logFieldsCol: { gap: spacing[2] },
  logHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  hoursField: {
    width: 88,
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
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkMid,
  },
  logDateWrap: { marginBottom: 0 },
  logNoteInput: {
    minHeight: 64,
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing[2],
    backgroundColor: colors.surfaceRaised,
  },
  logBtn: {
    alignSelf: 'flex-start',
    minWidth: 120,
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
    borderRadius: radius.sm,
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