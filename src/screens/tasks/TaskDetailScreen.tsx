import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import DateTimeField from '../../components/DateTimeField';
import {
  Avatar,
  Button,
  Divider,
  Input,
  SectionLabel,
} from '../../components/ui';
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
  avatarUrl?: string;
};

const TASK_NOTES_DELIM = '\n\n— Notes —\n';

function splitTaskDescription(raw: string | null | undefined): {
  main: string;
  notes: string;
} {
  const s = (raw ?? '').toString();
  const i = s.indexOf(TASK_NOTES_DELIM);
  if (i === -1) return { main: s, notes: '' };
  return {
    main: s.slice(0, i).replace(/\s+$/, ''),
    notes: s.slice(i + TASK_NOTES_DELIM.length),
  };
}

function composeTaskDescription(main: string, notes: string): string {
  const m = main.replace(/\s+$/, '');
  const n = notes.trim();
  if (n) return m ? m + TASK_NOTES_DELIM + n : n;
  return m;
}

function sameLocalCalendarDay(a: Date | null, b: Date | null): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

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
  const [titleDraft, setTitleDraft] = useState('');
  const [descMainDraft, setDescMainDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [assigneeUserIdDraft, setAssigneeUserIdDraft] = useState<string | null>(
    null
  );
  const [dueDraft, setDueDraft] = useState<Date | null>(null);
  const [statusDraft, setStatusDraft] = useState<EditableTaskStatus>('todo');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [logSectionOpen, setLogSectionOpen] = useState(false);

  const nameByUserId = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of members) {
      m.set(x.userId, (x.name || x.email || '').trim() || x.userId);
    }
    return m;
  }, [members]);

  const load = useCallback(async (mode: 'full' | 'silent' = 'full') => {
    setError('');
    if (mode === 'full') setLoading(true);
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
      const rawMem = memRes.members ?? [];
      setMembers(
        rawMem.map((m) => ({
          ...m,
          avatarUrl:
            m.avatarUrl ?? (m as { avatar_url?: string }).avatar_url,
        }))
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load task.');
      setTask(null);
    } finally {
      if (mode === 'full') setLoading(false);
    }
  }, [tenantId, taskId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!task) return;
    setTitleDraft((task.title ?? '').trim());
    const { main, notes } = splitTaskDescription(task.description);
    setDescMainDraft(main);
    setNotesDraft(notes);
    const uid = assigneeUserIdOf(task);
    setAssigneeUserIdDraft(uid || null);
    const raw = task.dueAt;
    setDueDraft(
      raw != null && String(raw).trim() !== '' ? new Date(String(raw)) : null
    );
    setStatusDraft(normStatusLocal(task));
  }, [
    task?.id,
    task?.title,
    task?.description,
    task?.assigneeUserId,
    task?.dueAt,
    task?.status,
  ]);

  const displayTitle = (task?.title ?? paramTitle ?? 'Task').trim();

  const activeMembers = useMemo(
    () =>
      members.filter(
        (m) => (m.status || 'active').toLowerCase() === 'active'
      ),
    [members]
  );

  const creatorName = useMemo(() => {
    if (!task) return '';
    const n = (task.creatorName ?? '').trim();
    if (n) return n;
    const uid = createdById(task);
    return uid ? nameByUserId.get(uid) ?? uid : '—';
  }, [task, nameByUserId]);

  const dueSaved = task ? formatDueAtDisplay(task.dueAt ?? undefined) : '';
  const overdueSaved = task
    ? isOverdueDueAtDate(task.dueAt ?? undefined)
    : false;
  const currentStatusSaved = task ? normStatusLocal(task) : 'todo';

  const readOnlyDescParts = useMemo(
    () => splitTaskDescription(task?.description),
    [task?.description]
  );

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

  const assigneeRowLabel = useMemo(() => {
    if (!task) return '';
    const uid = canEditTask
      ? (assigneeUserIdDraft ?? '').trim()
      : assigneeUserIdOf(task);
    if (!uid) return 'Unassigned';
    const fromMap = nameByUserId.get(uid);
    if (fromMap) return fromMap;
    if (assigneeUserIdOf(task) === uid) {
      const n = (task.assigneeName ?? '').trim();
      if (n) return n;
    }
    return uid;
  }, [task, canEditTask, assigneeUserIdDraft, nameByUserId]);

  useLayoutEffect(() => {
    const navTitle = canEditTask
      ? titleDraft.trim() || displayTitle
      : displayTitle;
    navigation.setOptions({ title: navTitle });
  }, [navigation, displayTitle, titleDraft, canEditTask]);

  const isDirty = useMemo(() => {
    if (!task) return false;
    const composed = composeTaskDescription(descMainDraft, notesDraft);
    const serverDesc = (task.description ?? '').toString();
    const normDesc = (s: string) => s.replace(/\r\n/g, '\n').trim();
    const dueServer =
      task.dueAt != null && String(task.dueAt).trim() !== ''
        ? new Date(String(task.dueAt))
        : null;
    return (
      titleDraft.trim() !== (task.title ?? '').trim() ||
      normDesc(composed) !== normDesc(serverDesc) ||
      (assigneeUserIdDraft ?? '') !== assigneeUserIdOf(task) ||
      !sameLocalCalendarDay(dueDraft, dueServer) ||
      statusDraft !== normStatusLocal(task)
    );
  }, [
    task,
    titleDraft,
    descMainDraft,
    notesDraft,
    assigneeUserIdDraft,
    dueDraft,
    statusDraft,
  ]);

  async function saveTask() {
    if (!task || !canEditTask || saveBusy) return;
    const t = titleDraft.trim();
    if (!t) {
      setError('Title is required.');
      return;
    }
    setSaveBusy(true);
    setError('');
    try {
      const description = composeTaskDescription(descMainDraft, notesDraft);
      const body: Record<string, unknown> = {
        title: t,
        description: description.trim() ? description : null,
        status: statusDraft,
        assigneeUserId: assigneeUserIdDraft ? assigneeUserIdDraft : '',
        dueAt: dueDraft ? dueDraft.toISOString() : '',
      };
      await apiFetch(
        `/studios/${tenantId}/tasks/${taskId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        },
        tenantId
      );
      await load('silent');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save task.');
    } finally {
      setSaveBusy(false);
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

  const contentPad = [
    styles.content,
    Platform.OS === 'web' ? styles.contentWeb : null,
  ];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={contentPad}
      keyboardShouldPersistTaps="handled"
    >
      {error ? <Text style={styles.bannerErr}>{error}</Text> : null}

      {canEditTask ? (
        <>
          <View style={styles.headerCard}>
            <Input
              label="Task title"
              value={titleDraft}
              onChangeText={setTitleDraft}
              placeholder="Task title"
            />
            <View style={[styles.metaRow, styles.assignRow]}>
              <Text style={styles.metaLabel}>Assigned to</Text>
              <View style={styles.assignRowRight}>
                <Text style={styles.metaValue} numberOfLines={1}>
                  {assigneeRowLabel}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowAssignModal(true)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Re-assign task"
                >
                  <Text style={styles.reassignLink}>Re-assign</Text>
                </TouchableOpacity>
              </View>
            </View>
            <DateTimeField
              label="Due date"
              value={dueDraft ?? new Date()}
              onChange={(d) => setDueDraft(d)}
              mode="date"
            />
            <TouchableOpacity
              onPress={() => setDueDraft(null)}
              style={styles.clearDueWrap}
              accessibilityRole="button"
            >
              <Text style={styles.linkMuted}>Clear due date</Text>
            </TouchableOpacity>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Created by</Text>
              <Text style={styles.metaCreator}>{creatorName}</Text>
            </View>
          </View>

          <SectionLabel>DESCRIPTION</SectionLabel>
          <TextInput
            value={descMainDraft}
            onChangeText={setDescMainDraft}
            placeholder="Add details for your studio…"
            placeholderTextColor={colors.inkFaint}
            multiline
            style={styles.descInput}
            textAlignVertical="top"
          />

          <Divider style={styles.dividerPad} />

          <SectionLabel>STATUS</SectionLabel>
          <View style={styles.statusRow}>
            {STATUS_OPTS.map((opt) => {
              const sel = statusDraft === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.statusBtn,
                    sel ? statusBtnContainerSel(opt.key) : null,
                  ]}
                  onPress={() => setStatusDraft(opt.key)}
                  disabled={saveBusy}
                >
                  <View
                    style={[styles.statusDotSm, { backgroundColor: opt.dot }]}
                  />
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

          <SectionLabel>NOTES (OPTIONAL)</SectionLabel>
          <TextInput
            value={notesDraft}
            onChangeText={setNotesDraft}
            placeholder="Internal notes…"
            placeholderTextColor={colors.inkFaint}
            multiline
            style={styles.notesInput}
            textAlignVertical="top"
          />

          <Button
            label="Save"
            variant="primary"
            onPress={() => void saveTask()}
            loading={saveBusy}
            disabled={
              saveBusy || !titleDraft.trim() || !isDirty
            }
            fullWidth
            style={styles.saveBtn}
          />
        </>
      ) : (
        <>
          <View style={styles.headerCard}>
            <Text style={styles.headerTitle}>{displayTitle}</Text>
            <View style={styles.metaBlock}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Assigned to</Text>
                <Text style={styles.metaValue}>{assigneeRowLabel}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Due date</Text>
                <Text
                  style={[styles.metaMono, overdueSaved && styles.metaOverdue]}
                >
                  {dueSaved || '—'}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Created by</Text>
                <Text style={styles.metaCreator}>{creatorName}</Text>
              </View>
            </View>
          </View>

          <SectionLabel>DESCRIPTION</SectionLabel>
          <Text style={styles.descReadOnly}>
            {readOnlyDescParts.main.trim() || 'No description.'}
          </Text>
          {readOnlyDescParts.notes.trim() ? (
            <>
              <SectionLabel>NOTES</SectionLabel>
              <Text style={styles.descReadOnly}>
                {readOnlyDescParts.notes.trim()}
              </Text>
            </>
          ) : null}

          <View style={styles.sectionGap} />
          <SectionLabel>STATUS</SectionLabel>
          <Text style={styles.memberStatus}>
            {STATUS_OPTS.find((o) => o.key === currentStatusSaved)?.label ??
              currentStatusSaved}
          </Text>
        </>
      )}

      <Modal
        visible={showAssignModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAssignModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowAssignModal(false)}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Assign to</Text>
            <ScrollView style={styles.modalList}>
              <TouchableOpacity
                style={styles.modalRow}
                onPress={() => {
                  setAssigneeUserIdDraft(null);
                  setShowAssignModal(false);
                }}
              >
                <Text style={styles.modalRowText}>Unassigned</Text>
              </TouchableOpacity>
              {activeMembers.map((m) => (
                <TouchableOpacity
                  key={m.userId}
                  style={styles.modalRow}
                  onPress={() => {
                    setAssigneeUserIdDraft(m.userId);
                    setShowAssignModal(false);
                  }}
                >
                  <Avatar
                    name={m.name || m.email || '?'}
                    size="sm"
                    imageUrl={m.avatarUrl}
                  />
                  <Text style={styles.modalRowText}>
                    {m.name || m.email || m.userId}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button
              label="Close"
              variant="ghost"
              onPress={() => setShowAssignModal(false)}
              fullWidth
            />
          </Pressable>
        </Pressable>
      </Modal>

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
  contentWeb: {
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 8,
  },
  assignRow: {
    marginTop: spacing[3],
    alignItems: 'center',
  },
  assignRowRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    minWidth: 0,
  },
  reassignLink: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.clay,
  },
  clearDueWrap: {
    alignSelf: 'flex-start',
    marginTop: spacing[2],
  },
  linkMuted: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  dividerPad: { marginVertical: spacing[4] },
  saveBtn: { marginTop: spacing[4] },
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
  descInput: {
    minHeight: 88,
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
    marginBottom: spacing[2],
    padding: spacing[2],
    backgroundColor: colors.surfaceRaised,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  notesInput: {
    minHeight: 72,
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
    marginBottom: spacing[2],
    padding: spacing[2],
    backgroundColor: colors.surfaceRaised,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 26, 22, 0.45)',
    justifyContent: 'center',
    padding: spacing[5],
  },
  modalCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    padding: spacing[4],
    maxHeight: '80%',
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  modalTitle: {
    fontFamily: typography.display,
    fontSize: fontSize.xl,
    color: colors.ink,
    marginBottom: spacing[3],
  },
  modalList: { maxHeight: 320 },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  modalRowText: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
    flex: 1,
  },
});