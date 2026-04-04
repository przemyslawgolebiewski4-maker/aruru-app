import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import DateTimeField from '../../components/DateTimeField';
import { Avatar, Badge, Button, Input } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { ApiError, apiFetch } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

type Nav = NativeStackNavigationProp<AppStackParamList, 'TaskList'>;
type Route = RouteProp<AppStackParamList, 'TaskList'>;

type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';

/** Matches backend tasks API (tasks.py). */
export type Task = {
  id?: string;
  title?: string;
  description?: string | null;
  status?: 'todo' | 'in_progress' | 'done' | 'cancelled' | string;
  assigneeUserId?: string | null;
  assigneeName?: string;
  dueAt?: string | null;
  createdBy?: string;
  creatorName?: string;
  priority?: 'low' | 'normal' | 'high' | string;
  totalHours?: number;
  hoursLogged?: number;
};

type StaffMember = {
  userId: string;
  name?: string;
  email?: string;
  role: 'owner' | 'assistant' | 'member';
  status?: string;
  avatarUrl?: string;
};

type TabKey = 'all' | 'mine' | 'done';

type TaskPriority = 'low' | 'normal' | 'high';

function priorityChipVariant(
  p: string | undefined
): 'clay' | 'moss' | 'neutral' | null {
  const v = (p ?? 'normal').toString().toLowerCase();
  if (v === 'high') return 'clay';
  if (v === 'low') return 'neutral';
  return null;
}

function priorityChipLabel(p: string | undefined): string | null {
  const v = (p ?? 'normal').toString().toLowerCase();
  if (v === 'high') return 'High';
  if (v === 'low') return 'Low';
  return null;
}

function parseTasks(data: unknown): Task[] {
  if (data && typeof data === 'object' && 'tasks' in data) {
    const t = (data as { tasks?: Task[] }).tasks;
    return Array.isArray(t) ? t : [];
  }
  if (Array.isArray(data)) return data as Task[];
  return [];
}

function taskId(t: Task): string {
  const o = t as Task & { _id?: string };
  return String(t.id ?? o._id ?? '').trim();
}

function assigneeUserIdOf(t: Task): string {
  return (t.assigneeUserId ?? '').toString().trim();
}

function formatDueAtShort(dueAt: string | null | undefined): string {
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

function hoursOnTask(t: Task): number {
  const h = t.hoursLogged ?? t.totalHours;
  return typeof h === 'number' && Number.isFinite(h) ? h : 0;
}

function normStatus(t: Task): TaskStatus {
  const raw = (t.status ?? 'todo')
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
  if (raw === 'cancelled' || raw === 'canceled') return 'cancelled';
  if (raw === 'done' || raw === 'complete' || raw === 'completed') return 'done';
  if (raw === 'in_progress' || raw === 'inprogress') return 'in_progress';
  return 'todo';
}

function firstName(label: string) {
  const s = label.trim();
  if (!s) return '?';
  return s.split(/\s+/)[0] ?? s;
}

export default function TaskListScreen({ route }: { route: Route }) {
  const { tenantId } = route.params;
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabKey>('all');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAtDate, setDueAtDate] = useState<Date | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  /** Active studio members eligible as assignees (backend: valid member ObjectId). */
  const activeMembers = useMemo(
    () =>
      members.filter(
        (m) => (m.status || 'active').toLowerCase() === 'active'
      ),
    [members]
  );

  const load = useCallback(async (mode: 'full' | 'refresh' = 'full') => {
    setError('');
    if (mode === 'full') setLoading(true);
    else setRefreshing(true);
    try {
      const [taskRes, memRes] = await Promise.all([
        apiFetch<unknown>(`/studios/${tenantId}/tasks`, {}, tenantId),
        apiFetch<{ members: StaffMember[] }>(
          `/studios/${tenantId}/members`,
          {},
          tenantId
        ),
      ]);
      setTasks(parseTasks(taskRes));
      const rawMem = memRes.members ?? [];
      setMembers(
        rawMem.map((m) => ({
          ...m,
          avatarUrl:
            m.avatarUrl ?? (m as { avatar_url?: string }).avatar_url,
        }))
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load tasks.');
      setTasks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load('full');
  }, [load]);

  const onRefresh = useCallback(() => {
    void load('refresh');
  }, [load]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            setShowForm((v) => !v);
            setCreateError('');
          }}
          hitSlop={12}
          style={styles.headerNewBtn}
          accessibilityRole="button"
          accessibilityLabel="New task"
        >
          <Text style={styles.headerNewText}>+ New</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => normStatus(t) === 'done').length;
    const open = total - done;
    const overdue = tasks.filter((t) => {
      const st = normStatus(t);
      if (st === 'done' || st === 'cancelled') return false;
      return isOverdueDueAtDate(t.dueAt ?? undefined);
    }).length;
    return { total, open, done, overdue };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (tab === 'done') list = list.filter((t) => normStatus(t) === 'done');
    else if (tab === 'mine' && user?.id)
      list = list.filter((t) => assigneeUserIdOf(t) === user.id);
    return list;
  }, [tasks, tab, user?.id]);

  const sections = useMemo(() => {
    const order: TaskStatus[] = ['in_progress', 'todo', 'done', 'cancelled'];
    const labels: Record<TaskStatus, string> = {
      in_progress: 'In progress',
      todo: 'To do',
      done: 'Done',
      cancelled: 'Cancelled',
    };
    return order
      .map((key) => ({
        key,
        label: labels[key],
        items: filteredTasks.filter(
          (t) => normStatus(t) === key && taskId(t) !== ''
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [filteredTasks]);

  function assigneeLabelForTask(t: Task): string {
    const name = (t.assigneeName ?? '').trim();
    if (name) return name;
    const uid = assigneeUserIdOf(t);
    if (!uid) return 'Unassigned';
    const m = members.find((x) => x.userId === uid);
    return m ? (m.name || m.email || 'Member').trim() : 'Unassigned';
  }

  const canCreate = title.trim().length > 0;

  async function createTask() {
    const t = title.trim();
    if (!t) {
      setCreateError('Title is required.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const body: {
        title: string;
        description?: string;
        assigneeUserId?: string;
        dueAt?: string;
        priority?: string;
      } = { title: t };
      const desc = description.trim();
      if (desc) body.description = desc;
      if (selectedAssignee) body.assigneeUserId = selectedAssignee;
      if (dueAtDate) {
        body.dueAt = dueAtDate.toISOString();
      }
      if (priority !== 'normal') body.priority = priority;
      await apiFetch(
        `/studios/${tenantId}/tasks`,
        { method: 'POST', body: JSON.stringify(body) },
        tenantId
      );
      setTitle('');
      setDescription('');
      setDueAtDate(null);
      setPriority('normal');
      setSelectedAssignee(null);
      setShowForm(false);
      await load('full');
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 402) {
        setCreateError(
          'An active studio subscription is required to create tasks. Please renew your plan.'
        );
      } else {
        setCreateError(
          e instanceof Error ? e.message : 'Could not create task.'
        );
      }
    } finally {
      setCreating(false);
    }
  }

  function dotColor(st: TaskStatus) {
    if (st === 'done') return colors.moss;
    if (st === 'in_progress') return colors.clay;
    if (st === 'cancelled') return colors.inkMid;
    return colors.inkLight;
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.clay}
          colors={[colors.clay]}
        />
      }
    >
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Text style={styles.statPillText}>{stats.total} total</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statPillText}>{stats.open} open</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statPillText}>{stats.done} done</Text>
        </View>
        {stats.overdue > 0 ? (
          <View style={[styles.statPill, styles.statPillOverdue]}>
            <Text style={styles.statPillTextOverdue}>
              {stats.overdue} overdue
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.tabsRow}>
        {(['all', 'mine', 'done'] as TabKey[]).map((k) => (
          <TouchableOpacity
            key={k}
            onPress={() => setTab(k)}
            style={[styles.tab, tab === k && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === k }}
          >
            <Text style={[styles.tabText, tab === k && styles.tabTextActive]}>
              {k === 'all' ? 'All' : k === 'mine' ? 'Mine' : 'Done'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {showForm ? (
        <View style={styles.formCard}>
          <Input
            placeholder="Task title…"
            value={title}
            onChangeText={setTitle}
            containerStyle={styles.formInputWrap}
          />
          <Input
            placeholder="Description (optional)"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            containerStyle={styles.formDescWrap}
            style={styles.formDescInput}
          />
          <Text style={styles.formHint}>Priority</Text>
          <View style={styles.priorityRow}>
            {(['low', 'normal', 'high'] as TaskPriority[]).map((p) => {
              const sel = priority === p;
              const label =
                p === 'low' ? 'Low' : p === 'high' ? 'High' : 'Normal';
              return (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPriority(p)}
                  style={[
                    styles.priorityChip,
                    sel && styles.priorityChipSel,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sel }}
                >
                  <Text
                    style={[
                      styles.priorityChipText,
                      sel && styles.priorityChipTextSel,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.formHint}>Assign to (optional)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.assigneeScroll}
            contentContainerStyle={styles.assigneeScrollContent}
          >
            <TouchableOpacity
              onPress={() => setSelectedAssignee(null)}
              style={[
                styles.assigneePill,
                styles.assigneePillUnassigned,
                selectedAssignee == null
                  ? styles.assigneePillSel
                  : styles.assigneePillUnsel,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedAssignee == null }}
            >
              <Text
                style={[
                  styles.assigneeUnassignedText,
                  selectedAssignee == null && styles.assigneeNameSel,
                ]}
              >
                Unassigned
              </Text>
            </TouchableOpacity>
            {activeMembers.map((m) => {
              const sel = m.userId === selectedAssignee;
              const label = firstName(m.name || m.email || '?');
              return (
                <TouchableOpacity
                  key={m.userId}
                  onPress={() => setSelectedAssignee(m.userId)}
                  style={[
                    styles.assigneePill,
                    sel ? styles.assigneePillSel : styles.assigneePillUnsel,
                  ]}
                >
                  <Avatar
                    name={m.name || m.email || '?'}
                    size="sm"
                    imageUrl={m.avatarUrl}
                  />
                  <Text
                    style={[
                      styles.assigneeName,
                      sel && styles.assigneeNameSel,
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={{ marginTop: spacing[2] }}>
          {dueAtDate ? (
            <View style={{ gap: spacing[2] }}>
              <DateTimeField
                label="Due date"
                value={dueAtDate}
                onChange={(d) => setDueAtDate(d)}
                mode="date"
              />
              <TouchableOpacity onPress={() => setDueAtDate(null)}>
                <Text
                  style={{
                    fontFamily: typography.mono,
                    fontSize: fontSize.xs,
                    color: colors.inkLight,
                  }}
                >
                  Remove due date
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setDueAtDate(new Date())}>
              <Text
                style={{
                  fontFamily: typography.mono,
                  fontSize: fontSize.xs,
                  color: colors.clay,
                }}
              >
                + Add due date (optional)
              </Text>
            </TouchableOpacity>
          )}
          </View>
          {createError ? (
            <Text style={styles.createErr}>{createError}</Text>
          ) : null}
          <View style={styles.formActions}>
            <View style={styles.formBtnGhost}>
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => {
                  setShowForm(false);
                  setCreateError('');
                  setDueAtDate(null);
                  setDescription('');
                  setPriority('normal');
                  setSelectedAssignee(null);
                }}
                fullWidth
              />
            </View>
            <View style={styles.formBtnPrimary}>
              <Button
                label="Create"
                variant="primary"
                onPress={() => void createTask()}
                loading={creating}
                disabled={!canCreate}
                fullWidth
              />
            </View>
          </View>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.clay} style={{ marginVertical: 24 }} />
      ) : sections.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No tasks yet</Text>
          <Text style={styles.empty}>
            Create a task with + New. You can leave it unassigned or pick a
            member.
          </Text>
        </View>
      ) : (
        sections.map((sec) => (
          <View key={sec.key}>
            <Text style={styles.sectionHdr}>{sec.label}</Text>
            {sec.items.map((t) => {
              const id = taskId(t);
              const st = normStatus(t);
              const dueLabel = formatDueAtShort(t.dueAt ?? undefined);
              const overdue = isOverdueDueAtDate(t.dueAt ?? undefined);
              const h = hoursOnTask(t);
              const titleText = (t.title ?? 'Untitled').trim();
              if (!id) return null;
              return (
                <TouchableOpacity
                  key={id}
                  style={styles.taskRow}
                  onPress={() =>
                    navigation.navigate('TaskDetail', {
                      tenantId,
                      taskId: id,
                      taskTitle: titleText,
                    })
                  }
                  activeOpacity={0.7}
                >
                  <View
                    style={[styles.statusDot, { backgroundColor: dotColor(st) }]}
                  />
                  <View style={styles.taskMid}>
                    <View style={styles.taskTitleRow}>
                      <Text style={styles.taskTitle} numberOfLines={2}>
                        {titleText}
                      </Text>
                      {priorityChipLabel(t.priority) &&
                      priorityChipVariant(t.priority) ? (
                        <Badge
                          label={priorityChipLabel(t.priority)!}
                          variant={priorityChipVariant(t.priority)!}
                        />
                      ) : null}
                    </View>
                    <Text style={styles.taskMeta}>
                      Assigned to {assigneeLabelForTask(t)}
                      {dueLabel ? (
                        <>
                          {' '}
                          · Due:{' '}
                          <Text style={overdue ? styles.dueOverdue : undefined}>
                            {dueLabel}
                          </Text>
                        </>
                      ) : null}
                    </Text>
                  </View>
                  <View style={styles.taskRight}>
                    {h > 0 ? (
                      <Text style={styles.hoursHint}>{h}h</Text>
                    ) : null}
                    <Text style={styles.chev}>›</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, paddingBottom: 40 },
  headerNewBtn: { marginRight: 4, paddingVertical: 6, paddingHorizontal: 8 },
  headerNewText: {
    fontFamily: typography.mono,
    fontSize: 13,
    color: colors.clay,
  },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing[3],
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: 16,
  },
  statPill: {
    backgroundColor: colors.cream,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
  },
  statPillText: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkMid,
  },
  statPillOverdue: {
    backgroundColor: colors.errorLight,
    borderWidth: 0.5,
    borderColor: colors.error,
  },
  statPillTextOverdue: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.error,
  },
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
  },
  tabActive: { backgroundColor: colors.clay },
  tabText: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
  },
  tabTextActive: { color: colors.surfaceRaised },
  formCard: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 16,
  },
  formInputWrap: { marginBottom: 0 },
  formDescWrap: { marginTop: spacing[2], marginBottom: 0 },
  formDescInput: {
    minHeight: 72,
    textAlignVertical: 'top',
    paddingTop: spacing[2],
  },
  priorityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  priorityChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.cream,
  },
  priorityChipSel: {
    borderColor: colors.clay,
    backgroundColor: colors.clayLight,
  },
  priorityChipText: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkMid,
  },
  priorityChipTextSel: {
    color: colors.clayDark,
    fontFamily: typography.monoMedium,
  },
  formHint: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  assigneeScroll: { marginTop: 8, maxHeight: 44 },
  assigneeScrollContent: { gap: 8, alignItems: 'center', paddingRight: 8 },
  assigneePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  assigneePillSel: { backgroundColor: colors.clay },
  assigneePillUnsel: { backgroundColor: colors.cream },
  assigneePillUnassigned: {
    paddingHorizontal: spacing[3],
  },
  assigneeUnassignedText: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.inkMid,
  },
  assigneeName: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.ink,
    maxWidth: 100,
  },
  assigneeNameSel: { color: colors.surfaceRaised },
  createErr: {
    marginTop: 8,
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: 12,
  },
  formBtnGhost: { flex: 1 },
  formBtnPrimary: { flex: 1 },
  sectionHdr: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
    marginTop: spacing[2],
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  taskMid: { flex: 1, marginLeft: 12 },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  taskTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
    flex: 1,
    minWidth: 0,
  },
  taskMeta: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
    marginTop: 2,
  },
  dueOverdue: { color: colors.error },
  taskRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hoursHint: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
  },
  chev: {
    fontFamily: typography.body,
    fontSize: 18,
    color: colors.inkLight,
  },
  emptyWrap: {
    marginTop: spacing[6],
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: typography.display,
    fontSize: fontSize['2xl'],
    color: colors.ink,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  empty: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
});
