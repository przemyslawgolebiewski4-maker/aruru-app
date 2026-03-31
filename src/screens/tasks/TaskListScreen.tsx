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
import { Avatar, Button, Input } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

type Nav = NativeStackNavigationProp<AppStackParamList, 'TaskList'>;
type Route = RouteProp<AppStackParamList, 'TaskList'>;

type TaskStatus = 'todo' | 'in_progress' | 'done';

export type Task = {
  _id?: string;
  id?: string;
  title?: string;
  status?: string;
  assignedTo?: string;
  assigned_to?: string;
  assigneeName?: string;
  assignee_name?: string;
  dueDate?: string;
  due_date?: string;
  hoursLogged?: number;
  hours_logged?: number;
  totalHours?: number;
  total_hours?: number;
  createdBy?: string;
  created_by?: string;
  creatorName?: string;
  creator_name?: string;
};

type StaffMember = {
  userId: string;
  name?: string;
  email?: string;
  role: 'owner' | 'assistant' | 'member';
  status?: string;
};

type TabKey = 'all' | 'mine' | 'done';

function parseTasks(data: unknown): Task[] {
  if (Array.isArray(data)) return data as Task[];
  if (data && typeof data === 'object' && 'tasks' in data) {
    const t = (data as { tasks?: Task[] }).tasks;
    return Array.isArray(t) ? t : [];
  }
  return [];
}

function taskId(t: Task): string {
  return String(t._id ?? t.id ?? '');
}

function assignedId(t: Task): string {
  return (t.assigned_to ?? t.assignedTo ?? '').trim();
}

function dueStr(t: Task): string {
  return (t.due_date ?? t.dueDate ?? '').trim();
}

function hoursOnTask(t: Task): number {
  const h = t.hours_logged ?? t.hoursLogged ?? t.total_hours ?? t.totalHours;
  return typeof h === 'number' && Number.isFinite(h) ? h : 0;
}

function normStatus(t: Task): TaskStatus {
  const raw = (t.status ?? 'todo').toString().toLowerCase().replace(/\s+/g, '_');
  if (raw === 'done' || raw === 'complete' || raw === 'completed') return 'done';
  if (raw === 'in_progress' || raw === 'inprogress') return 'in_progress';
  return 'todo';
}

function firstName(label: string) {
  const s = label.trim();
  if (!s) return '?';
  return s.split(/\s+/)[0] ?? s;
}

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isOverdueDueStr(ymd: string): boolean {
  if (!ymd) return false;
  return ymd < todayYmd();
}

export default function TaskListScreen({ route }: { route: Route }) {
  const { tenantId } = route.params;
  const navigation = useNavigation<Nav>();
  const { user, studios } = useAuth();

  const role = studios.find((s) => s.tenantId === tenantId)?.role;
  const isStaff = role === 'owner' || role === 'assistant';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabKey>('all');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const assignableMembers = useMemo(
    () =>
      members.filter(
        (m) =>
          (m.role === 'owner' || m.role === 'assistant') &&
          (m.status || '').toLowerCase() === 'active'
      ),
    [members]
  );

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
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
      setMembers(memRes.members ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load tasks.');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        isStaff ? (
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
        ) : null,
    });
  }, [navigation, isStaff]);

  useEffect(() => {
    if (showForm && assignableMembers.length > 0 && !selectedAssignee) {
      setSelectedAssignee(assignableMembers[0].userId);
    }
  }, [showForm, assignableMembers, selectedAssignee]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => normStatus(t) === 'done').length;
    const open = total - done;
    return { total, open, done };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (tab === 'done') list = list.filter((t) => normStatus(t) === 'done');
    else if (tab === 'mine' && user?.id)
      list = list.filter((t) => assignedId(t) === user.id);
    return list;
  }, [tasks, tab, user?.id]);

  const sections = useMemo(() => {
    const order: TaskStatus[] = ['in_progress', 'todo', 'done'];
    const labels: Record<TaskStatus, string> = {
      in_progress: 'IN PROGRESS',
      todo: 'TO DO',
      done: 'DONE',
    };
    return order
      .map((key) => ({
        key,
        label: labels[key],
        items: filteredTasks.filter((t) => normStatus(t) === key),
      }))
      .filter((s) => s.items.length > 0);
  }, [filteredTasks]);

  function assigneeLabelForTask(t: Task): string {
    const name = (t.assignee_name ?? t.assigneeName ?? '').trim();
    if (name) return name;
    const uid = assignedId(t);
    const m = members.find((x) => x.userId === uid);
    return m ? (m.name || m.email || 'Member').trim() : 'Unassigned';
  }

  const canCreate =
    title.trim().length > 0 && selectedAssignee != null && selectedAssignee !== '';

  async function createTask() {
    const t = title.trim();
    if (!t || !selectedAssignee) {
      setCreateError('Title and assignee are required.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const body: { title: string; assignedTo: string; dueDate?: string } = {
        title: t,
        assignedTo: selectedAssignee,
      };
      if (dueDate.trim()) body.dueDate = dueDate.trim();
      await apiFetch(
        `/studios/${tenantId}/tasks`,
        { method: 'POST', body: JSON.stringify(body) },
        tenantId
      );
      setTitle('');
      setDueDate('');
      setShowForm(false);
      await load();
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Could not create task.');
    } finally {
      setCreating(false);
    }
  }

  function dotColor(st: TaskStatus) {
    if (st === 'done') return colors.moss;
    if (st === 'in_progress') return colors.clay;
    return colors.inkLight;
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
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

      {isStaff && showForm ? (
        <View style={styles.formCard}>
          <Input
            placeholder="Task title..."
            value={title}
            onChangeText={setTitle}
            containerStyle={styles.formInputWrap}
          />
          <Text style={styles.formHint}>Assign to</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.assigneeScroll}
            contentContainerStyle={styles.assigneeScrollContent}
          >
            {assignableMembers.map((m) => {
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
                  <Avatar name={m.name || m.email || '?'} size="sm" />
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
          <TextInput
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.inkFaint}
            style={styles.dueInput}
          />
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
        <Text style={styles.empty}>
          No tasks yet. Tap + New to create one.
        </Text>
      ) : (
        sections.map((sec) => (
          <View key={sec.key}>
            <Text style={styles.sectionHdr}>{sec.label}</Text>
            {sec.items.map((t) => {
              const id = taskId(t);
              const st = normStatus(t);
              const due = dueStr(t);
              const overdue = isOverdueDueStr(due);
              const h = hoursOnTask(t);
              const titleText = (t.title ?? 'Untitled').trim();
              return (
                <TouchableOpacity
                  key={id || titleText}
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
                    <Text style={styles.taskTitle} numberOfLines={2}>
                      {titleText}
                    </Text>
                    <Text style={styles.taskMeta}>
                      Assigned to {assigneeLabelForTask(t)}
                      {due ? (
                        <>
                          {' '}
                          · Due:{' '}
                          <Text style={overdue ? styles.dueOverdue : undefined}>
                            {due}
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
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
  },
  statPillText: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkMid,
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
    borderRadius: radius.full,
    backgroundColor: 'transparent',
  },
  tabActive: { backgroundColor: colors.clay },
  tabText: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
  },
  tabTextActive: { color: '#fff' },
  formCard: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 16,
  },
  formInputWrap: { marginBottom: 0 },
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
    borderRadius: radius.full,
  },
  assigneePillSel: { backgroundColor: colors.clay },
  assigneePillUnsel: { backgroundColor: colors.cream },
  assigneeName: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.ink,
    maxWidth: 100,
  },
  assigneeNameSel: { color: '#fff' },
  dueInput: {
    marginTop: 8,
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.ink,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    paddingVertical: 8,
  },
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
  taskTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
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
  empty: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    marginTop: spacing[4],
  },
});
