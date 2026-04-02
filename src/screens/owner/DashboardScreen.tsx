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
import Svg, { Circle } from 'react-native-svg';
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
import MemberDashboardScreen from '../member/MemberDashboardScreen';

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

type IncomeData = {
  current: {
    membership: number;
    kiln: number;
    materials: number;
    events: number;
    openStudio: number;
    total: number;
  };
  history: { period: string; total: number }[];
  memberCount: number;
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

function IconTwoCircles60() {
  return (
    <Svg width={60} height={60} viewBox="0 0 60 60">
      <Circle
        cx={24}
        cy={30}
        r={16}
        fill={colors.clayLight}
        stroke={colors.clay}
        strokeWidth={0.75}
      />
      <Circle
        cx={36}
        cy={30}
        r={16}
        fill={colors.mossLight}
        stroke={colors.moss}
        strokeWidth={0.75}
        opacity={0.95}
      />
    </Svg>
  );
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
  const [income, setIncome] = useState<IncomeData | null>(null);

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
    if (studios.length === 0 || !tenantId) {
      setStats({
        members: 0,
        firingsThisMonth: 0,
        openTasks: 0,
        summariesDue: 0,
      });
      setRecentFirings([]);
      setRecentTasks([]);
      setIncome(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [memRes, firRes, taskRes, incomeRes] = await Promise.allSettled([
        apiFetch<unknown>(`/studios/${tenantId}/members`, {}, tenantId),
        apiFetch<unknown>(`/studios/${tenantId}/kiln/firings`, {}, tenantId),
        apiFetch<unknown>(`/studios/${tenantId}/tasks`, {}, tenantId),
        apiFetch<unknown>(`/studios/${tenantId}/costs/income`, {}, tenantId),
      ]);

      const membersList =
        memRes.status === 'fulfilled'
          ? parseMembersArray(memRes.value)
          : [];
      const activeCount = membersList.filter((m) => {
        if (!m || typeof m !== 'object') return false;
        const st = String((m as { status?: string }).status ?? '').toLowerCase();
        return st === 'active';
      }).length;

      const firings =
        firRes.status === 'fulfilled'
          ? parseFiringsArray(firRes.value)
          : [];

      if (incomeRes.status === 'fulfilled' && incomeRes.value) {
        setIncome(incomeRes.value as IncomeData);
      } else {
        setIncome(null);
      }
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
          status: st,
        };
      });

      const taskData =
        taskRes.status === 'fulfilled' ? taskRes.value : null;
      const tasksPayload = Array.isArray(taskData)
        ? taskData
        : (taskData as { tasks?: unknown[] } | null)?.tasks || [];
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
      setIncome(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId, studios.length]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (currentStudio?.role === 'member') {
    return <MemberDashboardScreen />;
  }

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

  function goAttendance() {
    if (!tenantId) return;
    navigation
      .getParent<NativeStackNavigationProp<AppStackParamList>>()
      ?.navigate('Attendance', { tenantId });
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

  function goCatalog() {
    if (!tenantId) {
      Alert.alert('Catalog', 'Create or join a studio first.');
      return;
    }
    navigation
      .getParent<NativeStackNavigationProp<AppStackParamList>>()
      ?.navigate('CatalogManage', { tenantId });
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

  if (studios.length === 0) {
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.emptyStudiosScroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.emptyStudiosInner}>
          <IconTwoCircles60 />
          <Text style={styles.emptyStudiosTitle}>Welcome to Aruru.</Text>
          <Text style={styles.emptyStudiosBody}>
            You&apos;re not part of any studio yet.{'\n\n'}
            If you run a ceramic studio, create one below.{'\n'}
            If you were invited, check your email for an invitation link from
            your studio owner.
          </Text>
          <Button
            label="Create a studio"
            variant="primary"
            onPress={() =>
              navigation
                .getParent<NativeStackNavigationProp<AppStackParamList>>()
                ?.navigate('CreateStudio')
            }
            fullWidth
            style={styles.emptyStudiosCreateBtn}
          />
          <View style={styles.orDividerRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.orLine} />
          </View>
          <View style={styles.emptyStudiosInfoCard}>
            <Text style={styles.emptyStudiosInfoText}>
              Waiting for an invitation? Ask your studio owner to invite you via
              email. You&apos;ll receive a link to join automatically.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.jumpTo('Profile')}
            style={styles.emptyStudiosLinkWrap}
            accessibilityRole="button"
            accessibilityLabel="Open profile to see your studios"
          >
            <Text style={styles.emptyStudiosLink}>
              Already have an account in another studio? →
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

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

      <Divider />

      {income?.current ? (
        <>
          <SectionLabel>INCOME THIS MONTH</SectionLabel>
          <View style={styles.incomeCards}>
            <View
              style={[styles.incomeCard, { backgroundColor: colors.clayLight }]}
            >
              <Text style={styles.incomeCardLabel}>Total</Text>
              <Text style={styles.incomeCardValue}>
                €{income.current.total.toFixed(2)}
              </Text>
            </View>
            <View style={styles.incomeCard}>
              <Text style={styles.incomeCardLabel}>Membership</Text>
              <Text style={styles.incomeCardValue}>
                €{income.current.membership.toFixed(2)}
              </Text>
            </View>
            <View style={styles.incomeCard}>
              <Text style={styles.incomeCardLabel}>Kiln</Text>
              <Text style={styles.incomeCardValue}>
                €{income.current.kiln.toFixed(2)}
              </Text>
            </View>
            <View style={styles.incomeCard}>
              <Text style={styles.incomeCardLabel}>Materials</Text>
              <Text style={styles.incomeCardValue}>
                €{income.current.materials.toFixed(2)}
              </Text>
            </View>
            <View style={styles.incomeCard}>
              <Text style={styles.incomeCardLabel}>Open studio</Text>
              <Text style={styles.incomeCardValue}>
                €{income.current.openStudio.toFixed(2)}
              </Text>
            </View>
          </View>
          <SectionLabel>LAST 6 MONTHS</SectionLabel>
          <View style={styles.sparkline}>
            {(income.history ?? []).map((h, i) => {
              const max = Math.max(
                ...(income.history ?? []).map((x) => x.total),
                1
              );
              const heightPct = h.total / max;
              return (
                <View key={h.period || String(i)} style={styles.sparkCol}>
                  <View
                    style={[
                      styles.sparkBar,
                      {
                        flex: heightPct || 0.02,
                        backgroundColor:
                          i === (income.history ?? []).length - 1
                            ? colors.clay
                            : colors.border,
                      },
                    ]}
                  />
                  <Text style={styles.sparkLabel}>{h.period.slice(5)}</Text>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

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
                label={item.status}
                variant={
                  item.status === 'open' ||
                  item.status === 'scheduled' ||
                  item.status === 'loading'
                    ? 'open'
                    : item.status === 'closed' || item.status === 'complete'
                      ? 'neutral'
                      : item.status === 'cancelled'
                        ? 'error'
                        : 'open'
                }
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
        {currentStudio?.role !== 'assistant' ? (
          <View style={styles.actionQuarter}>
            <Button
              label="Members"
              variant="ghost"
              onPress={goMembers}
              fullWidth
              style={styles.actionBtn}
            />
          </View>
        ) : null}
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
            label={currentStudio?.role === 'assistant' ? 'My costs' : 'Costs'}
            variant="ghost"
            onPress={goCosts}
            fullWidth
            style={styles.actionBtn}
          />
        </View>
        {currentStudio?.role === 'assistant' ? (
          <View style={styles.actionQuarter}>
            <Button
              label="Attendance"
              variant="ghost"
              onPress={goAttendance}
              fullWidth
              style={styles.actionBtn}
            />
          </View>
        ) : null}
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
              label="Catalog"
              variant="ghost"
              onPress={goCatalog}
              fullWidth
              style={styles.actionBtn}
            />
          </View>
        ) : null}
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
  emptyStudiosScroll: {
    flexGrow: 1,
    padding: 40,
    justifyContent: 'center',
  },
  emptyStudiosInner: {
    alignItems: 'center',
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  emptyStudiosTitle: {
    fontFamily: typography.display,
    fontSize: 24,
    color: colors.ink,
    textAlign: 'center',
    marginTop: 16,
    letterSpacing: -0.3,
  },
  emptyStudiosBody: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.inkMid,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
    marginTop: 8,
  },
  emptyStudiosCreateBtn: {
    marginTop: 24,
    width: '100%',
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 16,
    marginBottom: 16,
  },
  orLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: colors.border,
  },
  orText: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
    marginHorizontal: 12,
  },
  emptyStudiosInfoCard: {
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: 14,
    width: '100%',
  },
  emptyStudiosInfoText: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyStudiosLinkWrap: {
    marginTop: 16,
    paddingVertical: spacing[2],
  },
  emptyStudiosLink: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.clay,
    textAlign: 'center',
  },
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
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[6],
  },
  incomeCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  incomeCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing[3],
    gap: 4,
  },
  incomeCardLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
  },
  incomeCardValue: {
    fontFamily: typography.bodySemiBold,
    fontSize: fontSize.lg,
    color: colors.ink,
  },
  sparkline: {
    flexDirection: 'row',
    height: 80,
    gap: spacing[1],
    alignItems: 'flex-end',
    marginBottom: spacing[3],
  },
  sparkCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    gap: 4,
  },
  sparkBar: {
    width: '100%',
    borderRadius: 3,
    minHeight: 3,
  },
  sparkLabel: {
    fontFamily: typography.mono,
    fontSize: 9,
    color: colors.inkLight,
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
