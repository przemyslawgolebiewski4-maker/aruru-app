import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { MaterialTopTabNavigationProp } from '@react-navigation/material-top-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import {
  StatCard,
  Badge,
  Avatar,
  Divider,
  SectionLabel,
  Button,
} from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList, MainTabParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';

type RecentFiring = {
  id: string;
  title: string;
  meta: string;
  status: string;
};

type RecentTask = {
  id: string;
  title: string;
  meta: string;
  dot: 'clay' | 'moss' | 'inkLight';
};

function parseMembersArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'members' in data) {
    const m = (data as { members?: unknown[] }).members;
    return Array.isArray(m) ? m : [];
  }
  return [];
}

function parseFiringsArray(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === 'object' && 'firings' in data) {
    const f = (data as { firings?: unknown[] }).firings;
    return Array.isArray(f) ? (f as Record<string, unknown>[]) : [];
  }
  return [];
}

function firingId(f: Record<string, unknown>): string {
  return String(f.id ?? f._id ?? '');
}

function firingScheduledAt(f: Record<string, unknown>): string {
  return String(
    f.scheduledAt ?? f.scheduled_at ?? f.firedAt ?? f.fired_at ?? ''
  );
}

function firingTypeRaw(f: Record<string, unknown>): string {
  return String(f.kiln_type ?? f.firingType ?? f.kilnType ?? 'Firing');
}

function capitalizeType(s: string): string {
  const t = s.trim() || 'Firing';
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function taskId(t: Record<string, unknown>): string {
  return String(t.id ?? t._id ?? '');
}

function taskStatus(t: Record<string, unknown>): string {
  return String(t.status ?? 'todo').toLowerCase();
}

function taskCreatedAt(t: Record<string, unknown>): string {
  return String(t.createdAt ?? t.created_at ?? '');
}

function taskDueAt(t: Record<string, unknown>): string | null {
  const v = t.dueAt ?? t.due_at;
  if (v == null || v === '') return null;
  return String(v);
}

function taskAssigneeUserId(t: Record<string, unknown>): string {
  return String(t.assigneeUserId ?? '').trim();
}

function taskTitle(t: Record<string, unknown>): string {
  return String(t.title ?? 'Untitled').trim();
}

export default function DashboardScreen() {
  const { user, studios } = useAuth();
  const navigation = useNavigation<MaterialTopTabNavigationProp<MainTabParamList>>();
  const [stats, setStats] = useState({
    members: 0,
    firingsThisMonth: 0,
    openTasks: 0,
    summariesDue: 0,
  });
  const [recentFirings, setRecentFirings] = useState<RecentFiring[]>([]);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [loading, setLoading] = useState(true);

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const currentStudio =
    studios.find((s) => s.status === 'active') ?? studios[0];
  const studioLabel = currentStudio?.studioName?.trim() || 'Your studio';
  const tenantId = currentStudio?.tenantId;
  const canManageMembers =
    currentStudio?.role === 'owner' && currentStudio?.status === 'active';
  const canManageKiln =
    (currentStudio?.role === 'owner' ||
      currentStudio?.role === 'assistant') &&
    currentStudio?.status === 'active';

  const load = useCallback(async () => {
    if (!tenantId) {
      setStats({
        members: 0,
        firingsThisMonth: 0,
        openTasks: 0,
        summariesDue: 0,
      });
      setRecentFirings([]);
      setRecentTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [memRes, firRes, taskRes] = await Promise.all([
        apiFetch<unknown>(`/studios/${tenantId}/members`, {}, tenantId),
        apiFetch<unknown>(`/studios/${tenantId}/kiln/firings`, {}, tenantId),
        apiFetch<unknown>(`/studios/${tenantId}/tasks`, {}, tenantId),
      ]);

      const membersList = parseMembersArray(memRes);
      const activeCount = membersList.filter((m) => {
        if (!m || typeof m !== 'object') return false;
        const st = String((m as { status?: string }).status ?? '').toLowerCase();
        return st === 'active';
      }).length;

      const firings = parseFiringsArray(firRes);
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      // counts current calendar month only
      const firingsThisMonth = firings.filter((f) => {
        const dateStr =
          f.scheduledAt ?? f.scheduled_at ?? f.firedAt ?? f.fired_at;
        if (dateStr == null || dateStr === '') return false;
        const d = new Date(
          typeof dateStr === 'string' || typeof dateStr === 'number'
            ? dateStr
            : String(dateStr)
        );
        if (Number.isNaN(d.getTime())) return false;
        return (
          d.getMonth() === currentMonth &&
          d.getFullYear() === currentYear &&
          f.status !== 'cancelled'
        );
      }).length;

      const sortedFirings = [...firings].sort((a, b) => {
        const ta = new Date(firingScheduledAt(a)).getTime();
        const tb = new Date(firingScheduledAt(b)).getTime();
        const na = Number.isNaN(ta) ? -Infinity : ta;
        const nb = Number.isNaN(tb) ? -Infinity : tb;
        return nb - na;
      });

      const topFirings: RecentFiring[] = sortedFirings.slice(0, 3).map((f, idx) => {
        const id = firingId(f);
        const sched = firingScheduledAt(f);
        const rawMembers =
          f.itemsCount ?? f.items_count ?? (Array.isArray(f.items) ? f.items.length : undefined);
        const membersCount =
          typeof rawMembers === 'number' && Number.isFinite(rawMembers)
            ? rawMembers
            : 0;
        const st = String(f.status ?? 'open').toLowerCase();
        return {
          id: id || `firing-row-${idx}`,
          title: capitalizeType(firingTypeRaw(f)),
          meta: formatDate(sched) + ' · ' + membersCount + ' members',
          status: st === 'closed' ? 'closed' : 'open',
        };
      });

      const tasksPayload = Array.isArray(taskRes)
        ? taskRes
        : (taskRes as { tasks?: unknown[] }).tasks || [];
      const allTasks = Array.isArray(tasksPayload) ? tasksPayload : [];
      const tasks = allTasks.filter(
        (item): item is Record<string, unknown> =>
          item != null && typeof item === 'object' && !Array.isArray(item)
      );
      const openTasks = tasks.filter(
        (t) => t.status === 'todo' || t.status === 'in_progress'
      ).length;

      const sortedTasks = [...tasks].sort((a, b) => {
        const ta = new Date(taskCreatedAt(a)).getTime();
        const tb = new Date(taskCreatedAt(b)).getTime();
        const na = Number.isNaN(ta) ? -Infinity : ta;
        const nb = Number.isNaN(tb) ? -Infinity : tb;
        return nb - na;
      });

      const topTasks: RecentTask[] = sortedTasks.slice(0, 3).map((t, idx) => {
        const id = taskId(t);
        const s = taskStatus(t);
        const dot: RecentTask['dot'] =
          s === 'done'
            ? 'moss'
            : s === 'in_progress'
              ? 'clay'
              : 'inkLight';
        const hasAssignee = Boolean(taskAssigneeUserId(t));
        const due = taskDueAt(t);
        const meta =
          (hasAssignee ? 'Assigned' : 'Unassigned') +
          (due ? ` · due ${formatDate(due)}` : '');
        return {
          id: id || `task-row-${idx}`,
          title: taskTitle(t),
          meta,
          dot,
        };
      });

      setStats({
        members: activeCount,
        firingsThisMonth,
        openTasks,
        summariesDue: 0,
      });
      setRecentFirings(topFirings);
      setRecentTasks(topTasks);
    } catch {
      setStats({
        members: 0,
        firingsThisMonth: 0,
        openTasks: 0,
        summariesDue: 0,
      });
      setRecentFirings([]);
      setRecentTasks([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  function goKilnList() {
    if (!canManageKiln) {
      Alert.alert(
        'Kiln firings',
        'Only studio owners and assistants can manage firings.'
      );
      return;
    }
    if (!tenantId) {
      Alert.alert('Kiln firings', 'Create or join a studio first.');
      return;
    }
    navigation
      .getParent<NativeStackNavigationProp<AppStackParamList>>()
      ?.navigate('KilnList', { tenantId });
  }

  function goMembers() {
    if (!canManageMembers) {
      Alert.alert(
        'Members',
        'Only studio owners can manage members.'
      );
      return;
    }
    if (!tenantId) {
      Alert.alert('Members', 'Create or join a studio first.');
      return;
    }
    navigation
      .getParent<NativeStackNavigationProp<AppStackParamList>>()
      ?.navigate('Members', { tenantId });
  }

  function goTasks() {
    if (!tenantId) {
      Alert.alert('Tasks', 'Create or join a studio first.');
      return;
    }
    navigation
      .getParent<NativeStackNavigationProp<AppStackParamList>>()
      ?.navigate('TaskList', { tenantId });
  }

  function goCosts() {
    if (!tenantId) {
      Alert.alert('Costs', 'Create or join a studio first.');
      return;
    }
    const stack =
      navigation.getParent<NativeStackNavigationProp<AppStackParamList>>();
    const y = new Date().getFullYear();
    const m = new Date().getMonth() + 1;
    if (currentStudio?.role === 'owner') {
      stack?.navigate('CostList', { tenantId });
    } else {
      const uid = user?.id;
      if (!uid) return;
      stack?.navigate('CostDetail', {
        tenantId,
        userId: uid,
        memberName: user?.name?.trim() || user?.email || 'You',
        memberEmail: user?.email,
        year: y,
        month: m,
      });
    }
  }

  function goEvents() {
    if (!tenantId) {
      Alert.alert('Events', 'Create or join a studio first.');
      return;
    }
    navigation
      .getParent<NativeStackNavigationProp<AppStackParamList>>()
      ?.navigate('EventList', { tenantId });
  }

  function goPricing() {
    if (!canManageMembers) {
      Alert.alert('Pricing', 'Only studio owners can edit pricing.');
      return;
    }
    if (!tenantId) {
      Alert.alert('Pricing', 'Create or join a studio first.');
      return;
    }
    const name =
      currentStudio?.studioName?.trim() ||
      currentStudio?.studioSlug ||
      'Studio';
    navigation
      .getParent<NativeStackNavigationProp<AppStackParamList>>()
      ?.navigate('PricingSettings', { tenantId, studioName: name });
  }

  const membersVal = loading ? '—' : String(stats.members);
  const firingsVal = loading ? '—' : String(stats.firingsThisMonth);
  const tasksVal = loading ? '—' : String(stats.openTasks);
  const summariesVal = loading ? '—' : String(stats.summariesDue);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <Text style={styles.studioMono} numberOfLines={1}>
          {studioLabel.toUpperCase()}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.jumpTo('Profile')}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <Avatar name={user?.name ?? 'U'} size="md" />
        </TouchableOpacity>
      </View>

      <View style={styles.greetingBlock}>
        <Text style={styles.greeting}>
          {greeting}, {firstName}.
        </Text>
        <Text style={styles.studioSub}>{studioLabel.toUpperCase()}</Text>
      </View>

      {!tenantId ? (
        <Text style={styles.emptyStudio}>Create a studio to get started</Text>
      ) : null}

      <View style={styles.statsRow}>
        <StatCard label="Members" value={membersVal} accent="clay" />
        <StatCard label="Firings this month" value={firingsVal} accent="moss" />
        <StatCard label="Open tasks" value={tasksVal} accent="none" />
        <TouchableOpacity
          style={styles.statCardTap}
          onPress={goCosts}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Open cost summaries"
        >
          <StatCard label="Summaries due" value={summariesVal} accent="none" />
        </TouchableOpacity>
      </View>

      <SectionLabel>Recent firings</SectionLabel>
      {!tenantId ? (
        <Text style={styles.emptyList}>—</Text>
      ) : loading ? (
        <View style={styles.listLoading}>
          <ActivityIndicator color={colors.clay} />
        </View>
      ) : recentFirings.length === 0 ? (
        <Text style={styles.emptyList}>No firings yet</Text>
      ) : (
        recentFirings.map((item, i) => (
          <View key={item.id}>
            <View style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowMeta}>{item.meta}</Text>
              </View>
              <Badge
                label={item.status === 'open' ? 'open' : 'closed'}
                variant={item.status === 'open' ? 'open' : 'neutral'}
              />
            </View>
            {i < recentFirings.length - 1 ? <Divider /> : null}
          </View>
        ))
      )}

      <View style={{ height: spacing[6] }} />

      <SectionLabel>Tasks</SectionLabel>
      {!tenantId ? (
        <Text style={styles.emptyList}>—</Text>
      ) : loading ? (
        <View style={styles.listLoading}>
          <ActivityIndicator color={colors.clay} />
        </View>
      ) : recentTasks.length === 0 ? (
        <Text style={styles.emptyList}>No tasks yet</Text>
      ) : (
        recentTasks.map((item, i) => (
          <View key={item.id}>
            <View style={styles.taskRow}>
              <View
                style={[
                  styles.taskDot,
                  item.dot === 'clay' && styles.dotClay,
                  item.dot === 'moss' && styles.dotMoss,
                  item.dot === 'inkLight' && styles.dotTodo,
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowMeta}>{item.meta}</Text>
              </View>
            </View>
            {i < recentTasks.length - 1 ? <Divider /> : null}
          </View>
        ))
      )}

      <View style={{ height: spacing[6] }} />

      <View style={styles.actionsRow}>
        <View style={styles.actionQuarter}>
          <Button
            label="New firing"
            variant="ghost"
            onPress={goKilnList}
            fullWidth
            style={styles.actionBtn}
          />
        </View>
        <View style={styles.actionQuarter}>
          <Button
            label="Members"
            variant="ghost"
            onPress={goMembers}
            fullWidth
            style={styles.actionBtn}
          />
        </View>
        <View style={styles.actionQuarter}>
          <Button
            label="Tasks"
            variant="ghost"
            onPress={goTasks}
            fullWidth
            style={styles.actionBtn}
          />
        </View>
        <View style={styles.actionQuarter}>
          <Button
            label="Costs"
            variant="ghost"
            onPress={goCosts}
            fullWidth
            style={styles.actionBtn}
          />
        </View>
        <View style={styles.actionQuarter}>
          <Button
            label="Events"
            variant="ghost"
            onPress={goEvents}
            fullWidth
            style={styles.actionBtn}
          />
        </View>
        {canManageMembers ? (
          <View style={styles.actionQuarter}>
            <Button
              label="Pricing"
              variant="ghost"
              onPress={goPricing}
              fullWidth
              style={styles.actionBtn}
            />
          </View>
        ) : null}
      </View>

      <View style={{ height: spacing[10] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing[5] },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
    gap: spacing[3],
  },
  studioMono: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    flex: 1,
  },
  greetingBlock: {
    marginBottom: spacing[6],
  },
  greeting: {
    fontFamily: typography.display,
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  studioSub: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: spacing[2],
  },
  emptyStudio: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkMid,
    marginBottom: spacing[4],
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[6],
  },
  statCardTap: {
    flex: 1,
    minWidth: '45%',
  },
  listLoading: {
    paddingVertical: spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyList: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
  listRow: {
    paddingVertical: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  taskRow: {
    paddingVertical: spacing[3],
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  taskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  dotTodo: { backgroundColor: colors.inkLight },
  dotClay: { backgroundColor: colors.clay },
  dotMoss: { backgroundColor: colors.moss },
  rowTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.base,
    color: colors.ink,
    marginBottom: 2,
  },
  rowMeta: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    letterSpacing: 0.3,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  actionQuarter: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 88,
  },
  actionBtn: {
    borderColor: colors.clay,
    borderWidth: 0.5,
    borderRadius: radius.sm,
  },
});
