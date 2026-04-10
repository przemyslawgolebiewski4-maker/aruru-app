import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import DateTimeField from '../../components/DateTimeField';
import TaskCalendar from '../../components/TaskCalendar';
import { Avatar, Badge, Button, Input } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import {
  ApiError,
  apiFetch,
  formatSubscriptionBlockedMessage,
} from '../../services/api';
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

type TabKey = 'all' | 'mine' | 'done' | 'in_progress';

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

function createdByIdOf(t: Task): string {
  return (t.createdBy ?? '').toString().trim();
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

function statusLabel(st: TaskStatus): string {
  if (st === 'in_progress') return 'In progress';
  if (st === 'done') return 'Done';
  if (st === 'cancelled') return 'Cancelled';
  return 'To do';
}

function firstName(label: string) {
  const s = label.trim();
  if (!s) return '?';
  return s.split(/\s+/)[0] ?? s;
}

function canEditAssignee(
  task: Task,
  userId: string | undefined,
  isStaff: boolean
): boolean {
  if (isStaff) return true;
  const cb = createdByIdOf(task);
  return !!(userId && cb && cb === userId);
}

export default function TaskListScreen({ route }: { route: Route }) {
  const paramTenantId = route.params?.tenantId;
  const navigation = useNavigation<Nav>();
  const { user, studios, activeTenantId, suspendedStudios } = useAuth();

  const rawParam = paramTenantId ? String(paramTenantId).trim() : '';
  const paramInStudios =
    !!rawParam && studios.some((s) => s.tenantId === rawParam);
  const tenantId = (paramInStudios ? rawParam : '') || activeTenantId || '';

  const suspensionReasonForTenant =
    suspendedStudios.find((s) => s.tenantId === tenantId)?.suspensionReason ??
    null;

  const role = studios.find((s) => s.tenantId === tenantId)?.role;
  const isStaff = role === 'owner' || role === 'assistant';

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
  const [assignPickerTask, setAssignPickerTask] = useState<Task | null>(null);
  const [assignSaving, setAssignSaving] = useState(false);

  const activeMembers = useMemo(
    () =>
      members.filter(
        (m) => (m.status || 'active').toLowerCase() === 'active'
      ),
    [members]
  );

  const load = useCallback(
    async (mode: 'full' | 'refresh' = 'full') => {
      if (!tenantId) return;
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
    },
    [tenantId]
  );

  useEffect(() => {
    if (tenantId) void load('full');
  }, [load, tenantId]);

  const onRefresh = useCallback(() => {
    void load('refresh');
  }, [load]);

  function resetTaskForm() {
    setTitle('');
    setDescription('');
    setDueAtDate(null);
    setPriority('normal');
    setSelectedAssignee(null);
    setCreateError('');
    setShowForm(false);
  }

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
    else if (tab === 'in_progress')
      list = list.filter((t) => normStatus(t) === 'in_progress');
    return list;
  }, [tasks, tab, user?.id]);

  const tableTasks = useMemo(() => {
    const list = filteredTasks.filter((t) => taskId(t) !== '');
    list.sort((a, b) => {
      const da = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
      const db = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return (a.title ?? '').localeCompare(b.title ?? '');
    });
    return list;
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
    if (!tenantId) return;
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
      resetTaskForm();
      await load('full');
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 402) {
        setCreateError(
          formatSubscriptionBlockedMessage(
            e.message,
            suspensionReasonForTenant
          )
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

  async function applyAssignee(task: Task, newUserId: string | null) {
    const id = taskId(task);
    if (!id || !tenantId) return;
    setAssignSaving(true);
    try {
      await apiFetch(
        `/studios/${tenantId}/tasks/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            assigneeUserId: newUserId ? newUserId : '',
          }),
        },
        tenantId
      );
      setTasks((prev) =>
        prev.map((x) => {
          if (taskId(x) !== id) return x;
          const m = newUserId
            ? members.find((mem) => mem.userId === newUserId)
            : undefined;
          return {
            ...x,
            assigneeUserId: newUserId,
            assigneeName: m
              ? (m.name || m.email || '').trim() || undefined
              : undefined,
          };
        })
      );
      setAssignPickerTask(null);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 402) {
        setError(
          formatSubscriptionBlockedMessage(
            e.message,
            suspensionReasonForTenant
          )
        );
      } else {
        setError(e instanceof Error ? e.message : 'Could not update assignee.');
      }
    } finally {
      setAssignSaving(false);
    }
  }

  function dotColor(st: TaskStatus) {
    if (st === 'done') return colors.moss;
    if (st === 'in_progress') return colors.clay;
    if (st === 'cancelled') return colors.inkMid;
    return colors.inkLight;
  }

  const tabOrder: TabKey[] = ['all', 'mine', 'done', 'in_progress'];

  function tabLabel(k: TabKey): string {
    if (k === 'all') return 'All';
    if (k === 'mine') return 'Mine';
    if (k === 'done') return 'Done';
    return 'In progress';
  }

  if (!tenantId) {
    return (
      <View style={styles.missingTenant}>
        <Text style={styles.missingTenantText}>
          No studio context. Open Tasks from your studio dashboard or add
          ?tenantId=… to the URL.
        </Text>
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

      <View style={styles.pillRow}>
        <Text style={styles.pillRowText}>
          {stats.total} total · {stats.open} open · {stats.done} done
          {stats.overdue > 0 ? ` · ${stats.overdue} overdue` : ''}
        </Text>
      </View>

      <Text style={styles.sectionLabel}>Filters</Text>
      <View style={styles.tabsRow}>
        {tabOrder.map((k) => (
          <TouchableOpacity
            key={k}
            onPress={() => setTab(k)}
            style={[styles.tab, tab === k && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === k }}
          >
            <Text style={[styles.tabText, tab === k && styles.tabTextActive]}>
              {tabLabel(k)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!loading && filteredTasks.length > 0 ? (
        <TaskCalendar
          tasks={filteredTasks}
          onTaskPress={(t) => {
            const id = taskId(t);
            if (!id) return;
            navigation.navigate('TaskDetail', {
              tenantId,
              taskId: id,
              taskTitle: (t.title ?? 'Task').trim(),
            });
          }}
        />
      ) : !loading && tasks.length === 0 ? (
        <Text style={styles.emptyHint}>
          No tasks yet. Use + New to add one (owners and assistants).
        </Text>
      ) : null}

      {showForm && isStaff ? (
        <View style={styles.formCard}>
          <Input
            label="Title *"
            value={title}
            onChangeText={setTitle}
            placeholder="Task title"
          />
          <Text style={styles.kindLegend}>Priority</Text>
          <View style={styles.kindRow}>
            {(['low', 'normal', 'high'] as TaskPriority[]).map((p) => {
              const sel = priority === p;
              const label =
                p === 'low' ? 'Low' : p === 'high' ? 'High' : 'Normal';
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.kindPill, sel && styles.kindPillSelected]}
                  onPress={() => setPriority(p)}
                >
                  <Text
                    style={[
                      styles.kindPillText,
                      sel && styles.kindPillTextSel,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.kindLegend}>Assign to (optional)</Text>
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
                    style={[styles.assigneeName, sel && styles.assigneeNameSel]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <DateTimeField
            label="Due date (optional)"
            value={dueAtDate ?? new Date()}
            onChange={(d) => setDueAtDate(d)}
            mode="date"
          />
          <TouchableOpacity
            onPress={() => setDueAtDate(null)}
            style={styles.clearDueWrap}
          >
            <Text style={styles.linkMuted}>Clear due date</Text>
          </TouchableOpacity>
          <Text style={styles.descLabel}>Description (optional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Details…"
            placeholderTextColor={colors.inkFaint}
            multiline
            style={styles.descInput}
          />
          {createError ? (
            <Text style={styles.createErr}>{createError}</Text>
          ) : null}
          <View style={styles.formActions}>
            <View style={styles.formBtnHalf}>
              <Button
                label="Cancel"
                variant="ghost"
                onPress={resetTaskForm}
                fullWidth
              />
            </View>
            <View style={styles.formBtnHalf}>
              <Button
                label="Create task"
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

      <Text style={styles.sectionLabel}>Task table</Text>
      {loading ? (
        <ActivityIndicator color={colors.clay} style={{ marginVertical: 24 }} />
      ) : tableTasks.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No tasks match</Text>
          <Text style={styles.empty}>
            Try another filter or create a task with + New.
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          style={styles.tableScroll}
        >
          <View style={styles.table}>
            <View style={[styles.tr, styles.trHeader]}>
              <Text style={[styles.th, styles.colTitle]}>Task</Text>
              <Text style={[styles.th, styles.colAssignee]}>Assignee</Text>
              <Text style={[styles.th, styles.colDue]}>Due</Text>
              <Text style={[styles.th, styles.colStatus]}>Status</Text>
              <Text style={[styles.th, styles.colHrs]}>Hrs</Text>
            </View>
            {tableTasks.map((t) => {
              const id = taskId(t);
              const st = normStatus(t);
              const dueLabel = formatDueAtShort(t.dueAt ?? undefined);
              const overdue = isOverdueDueAtDate(t.dueAt ?? undefined);
              const h = hoursOnTask(t);
              const titleText = (t.title ?? 'Untitled').trim();
              const canPick = canEditAssignee(t, user?.id, isStaff);
              return (
                <View key={id} style={styles.tr}>
                  <Pressable
                    style={[styles.td, styles.colTitle]}
                    onPress={() =>
                      navigation.navigate('TaskDetail', {
                        tenantId,
                        taskId: id,
                        taskTitle: titleText,
                      })
                    }
                  >
                    <View style={styles.titleCellInner}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: dotColor(st) },
                        ]}
                      />
                      <View style={styles.titleTextWrap}>
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
                    </View>
                  </Pressable>
                  <View style={[styles.td, styles.colAssignee]}>
                    <TouchableOpacity
                      disabled={!canPick || assignSaving}
                      onPress={() => canPick && setAssignPickerTask(t)}
                      style={[
                        styles.assigneeCell,
                        !canPick && styles.assigneeCellDisabled,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Change assignee"
                    >
                      <Text
                        style={styles.assigneeCellText}
                        numberOfLines={1}
                      >
                        {assigneeLabelForTask(t)}
                      </Text>
                      {canPick ? (
                        <Text style={styles.assigneeCellHint}>Change</Text>
                      ) : null}
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.td, styles.colDue]}>
                    {dueLabel ? (
                      <Text
                        style={[
                          styles.tdMono,
                          overdue ? styles.dueOverdue : null,
                        ]}
                      >
                        {dueLabel}
                      </Text>
                    ) : (
                      <Text style={styles.tdMono}>—</Text>
                    )}
                  </View>
                  <View style={[styles.td, styles.colStatus]}>
                    <Text style={styles.tdMono}>{statusLabel(st)}</Text>
                  </View>
                  <View style={[styles.td, styles.colHrs]}>
                    <Text style={styles.tdMono}>{h > 0 ? `${h}h` : '—'}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      <Modal
        visible={assignPickerTask != null}
        transparent
        animationType="fade"
        onRequestClose={() => setAssignPickerTask(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => !assignSaving && setAssignPickerTask(null)}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Assign to</Text>
            <ScrollView style={styles.modalList}>
              <TouchableOpacity
                style={styles.modalRow}
                disabled={assignSaving}
                onPress={() =>
                  assignPickerTask &&
                  void applyAssignee(assignPickerTask, null)
                }
              >
                <Text style={styles.modalRowText}>Unassigned</Text>
              </TouchableOpacity>
              {activeMembers.map((m) => (
                <TouchableOpacity
                  key={m.userId}
                  style={styles.modalRow}
                  disabled={assignSaving}
                  onPress={() =>
                    assignPickerTask &&
                    void applyAssignee(assignPickerTask, m.userId)
                  }
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
            {assignSaving ? (
              <ActivityIndicator color={colors.clay} style={{ marginTop: 8 }} />
            ) : null}
            <Button
              label="Close"
              variant="ghost"
              onPress={() => setAssignPickerTask(null)}
              fullWidth
            />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, paddingBottom: 48 },
  missingTenant: {
    flex: 1,
    padding: spacing[5],
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  missingTenantText: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkMid,
    textAlign: 'center',
  },
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
  sectionLabel: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
    marginTop: spacing[2],
  },
  contentWeb: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  pillRow: {
    alignSelf: 'flex-start',
    backgroundColor: colors.cream,
    borderRadius: radius.sm,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    marginBottom: 16,
  },
  pillRowText: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkMid,
  },
  emptyHint: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    marginBottom: spacing[3],
    lineHeight: 20,
  },
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
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
  kindLegend: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  kindRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: 8,
  },
  kindPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.cream,
  },
  kindPillSelected: {
    backgroundColor: colors.clay,
  },
  kindPillText: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.inkMid,
  },
  kindPillTextSel: {
    color: colors.surfaceRaised,
  },
  clearDueWrap: {
    alignSelf: 'flex-start',
    marginTop: spacing[2],
    marginBottom: spacing[1],
  },
  descLabel: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
    marginTop: spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  descInput: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
    minHeight: 72,
    marginTop: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    backgroundColor: colors.surfaceRaised,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    textAlignVertical: 'top',
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
  linkMuted: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  linkClay: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.clay,
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
  formBtnHalf: { flex: 1, minWidth: 0 },
  tableScroll: { marginBottom: spacing[4] },
  table: {
    minWidth: Platform.OS === 'web' ? 640 : 520,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceRaised,
  },
  tr: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  trHeader: {
    backgroundColor: colors.cream,
  },
  th: {
    fontFamily: typography.monoMedium,
    fontSize: 10,
    color: colors.inkMid,
    paddingVertical: 10,
    paddingHorizontal: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  td: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  tdMono: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkMid,
  },
  colTitle: { flex: 1, minWidth: 160 },
  colAssignee: { width: 120 },
  colDue: { width: 96 },
  colStatus: { width: 100 },
  colHrs: { width: 44 },
  titleCellInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleTextWrap: {
    flex: 1,
    gap: 4,
    flexDirection: 'column',
  },
  taskTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  assigneeCell: {
    borderWidth: 0.5,
    borderColor: colors.clayBorder,
    borderRadius: radius.sm,
    padding: spacing[2],
    backgroundColor: colors.cream,
  },
  assigneeCellDisabled: {
    opacity: 0.55,
    borderColor: colors.border,
  },
  assigneeCellText: {
    fontFamily: typography.body,
    fontSize: fontSize.xs,
    color: colors.ink,
  },
  assigneeCellHint: {
    fontFamily: typography.mono,
    fontSize: 9,
    color: colors.clay,
    marginTop: 2,
  },
  dueOverdue: { color: colors.error },
  emptyWrap: {
    marginTop: spacing[4],
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: typography.display,
    fontSize: fontSize['2xl'],
    color: colors.inkLight,
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
