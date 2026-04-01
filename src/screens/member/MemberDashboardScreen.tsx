import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  type CompositeNavigationProp,
} from '@react-navigation/native';
import type { MaterialTopTabNavigationProp } from '@react-navigation/material-top-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { Badge, SectionLabel, Divider } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import { apiFetch } from '../../services/api';
import type { AppStackParamList, MainTabParamList } from '../../navigation/types';

type Nav = CompositeNavigationProp<
  MaterialTopTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<AppStackParamList>
>;
type StackNav = NativeStackNavigationProp<AppStackParamList>;

type CostSummary = {
  kiln: number;
  materials: number;
  events: number;
  misc: number;
  total: number;
};

type Firing = {
  id: string;
  kiln_type?: string;
  firingType?: string;
  scheduled_at?: string;
  scheduledAt?: string;
  status: string;
  items?: { user_id?: string; userId?: string }[];
};

type Event = {
  id: string;
  title: string;
  starts_at?: string;
  startsAt?: string;
  kind?: string;
};

function parseCosts(data: unknown): CostSummary {
  const d = (data && typeof data === 'object' ? data : {}) as Record<
    string,
    unknown
  >;
  const costs = (d.costs ?? d) as Record<string, unknown>;
  return {
    kiln: Number(costs.kiln ?? costs.kiln_total ?? 0),
    materials: Number(costs.materials ?? costs.materials_total ?? 0),
    events: Number(costs.events ?? costs.events_total ?? 0),
    misc: Number(costs.misc ?? costs.misc_total ?? 0),
    total: Number(costs.total ?? costs.grand_total ?? 0),
  };
}

function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function firingLabel(f: Firing): string {
  const t = f.kiln_type ?? f.firingType ?? 'Firing';
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

function firingDate(f: Firing): string {
  return formatDate(f.scheduled_at ?? f.scheduledAt ?? '');
}

export default function MemberDashboardScreen() {
  const { user, studios } = useAuth();
  const navigation = useNavigation<Nav>();
  const stackNav = navigation.getParent<StackNav>();
  const currentStudio =
    studios.find((s) => s.status === 'active') ?? studios[0];
  const studioLabel = currentStudio?.studioName?.trim() || 'Studio';
  const tenantId = currentStudio?.tenantId ?? '';

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [costs, setCosts] = useState<CostSummary | null>(null);
  const [firings, setFirings] = useState<Firing[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!tenantId || !user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [costsRes, firingsRes, eventsRes] = await Promise.allSettled([
        apiFetch<unknown>(
          `/studios/${tenantId}/costs/summary?year=${year}&month=${month}&user_id=${user.id}`,
          {},
          tenantId
        ),
        apiFetch<unknown>(
          `/studios/${tenantId}/kiln/firings`,
          {},
          tenantId
        ),
        apiFetch<unknown>(`/studios/${tenantId}/events`, {}, tenantId),
      ]);

      if (costsRes.status === 'fulfilled') setCosts(parseCosts(costsRes.value));

      if (firingsRes.status === 'fulfilled') {
        const all = Array.isArray(firingsRes.value)
          ? (firingsRes.value as Firing[])
          : (((firingsRes.value as Record<string, unknown>)?.firings as
              | Firing[]
              | undefined) ?? []);
        const mine = all.filter(
          (f) =>
            Array.isArray(f.items) &&
            f.items.some(
              (i) => (i.user_id ?? i.userId) === user.id
            )
        );
        setFirings(mine.slice(0, 5));
      }

      if (eventsRes.status === 'fulfilled') {
        const all = Array.isArray(eventsRes.value)
          ? (eventsRes.value as Event[])
          : (((eventsRes.value as Record<string, unknown>)?.events as
              | Event[]
              | undefined) ?? []);
        const upcoming = all
          .filter((e) => new Date(e.starts_at ?? e.startsAt ?? '') >= new Date())
          .slice(0, 3);
        setEvents(upcoming);
      }
    } finally {
      setLoading(false);
    }
  }, [tenantId, user?.id, year, month]);

  useFocusEffect(useCallback(() => void load(), [load]));

  function goCosts() {
    if (!tenantId || !user?.id) return;
    stackNav?.navigate('CostDetail', {
      tenantId,
      userId: user.id,
      memberName: user.name?.trim() || user.email || 'You',
      memberEmail: user.email,
      year,
      month,
    });
  }

  function goKilnDetail(firingId: string) {
    stackNav?.navigate('KilnDetail', { tenantId, firingId });
  }

  function goEvents() {
    stackNav?.navigate('EventList', { tenantId });
  }

  function goBookStudio() {
    if (!tenantId) return;
    navigation.navigate('BookStudio', { tenantId });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.clay} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.studioName}>{studioLabel}</Text>
          <Text style={styles.greeting}>
            Hello, {user?.name?.split(' ')[0] ?? 'there'}.
          </Text>
        </View>
        <Badge label="Member" variant="moss" />
      </View>

      <Divider />

      <SectionLabel>{`My costs — ${month}/${year}`}</SectionLabel>
      <TouchableOpacity
        style={styles.costsCard}
        onPress={goCosts}
        activeOpacity={0.8}
      >
        <Text style={styles.costsTotal}>
          {costs ? `€${costs.total.toFixed(2)}` : '—'}
        </Text>
        <View style={styles.costsRow}>
          <Text style={styles.costItem}>
            Kiln: {costs ? `€${costs.kiln.toFixed(2)}` : '—'}
          </Text>
          <Text style={styles.costItem}>
            Materials: {costs ? `€${costs.materials.toFixed(2)}` : '—'}
          </Text>
          <Text style={styles.costItem}>
            Events: {costs ? `€${costs.events.toFixed(2)}` : '—'}
          </Text>
        </View>
        <Text style={styles.costsLink}>View full summary →</Text>
      </TouchableOpacity>

      <Divider />

      <SectionLabel>My firings</SectionLabel>
      {firings.length === 0 ? (
        <Text style={styles.empty}>No firings yet.</Text>
      ) : (
        firings.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={styles.row}
            onPress={() => goKilnDetail(f.id)}
            activeOpacity={0.7}
          >
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>{firingLabel(f)}</Text>
              <Text style={styles.rowMeta}>{firingDate(f)}</Text>
            </View>
            <Badge
              label={f.status}
              variant={f.status === 'closed' ? 'moss' : 'clay'}
            />
          </TouchableOpacity>
        ))
      )}

      <Divider />

      <SectionLabel>Upcoming events</SectionLabel>
      {events.length === 0 ? (
        <Text style={styles.empty}>No upcoming events.</Text>
      ) : (
        events.map((e) => (
          <View key={e.id} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>{e.title}</Text>
              <Text style={styles.rowMeta}>
                {formatDate(e.starts_at ?? e.startsAt ?? '')}
              </Text>
            </View>
          </View>
        ))
      )}

      <Divider />

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={goCosts}
          activeOpacity={0.8}
        >
          <Text style={styles.actionLabel}>My costs</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={goEvents}
          activeOpacity={0.8}
        >
          <Text style={styles.actionLabel}>Events</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={goBookStudio}
          activeOpacity={0.8}
        >
          <Text style={styles.actionLabel}>Book studio time</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing[6], gap: spacing[4] },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  headerText: { flex: 1, gap: 2 },
  studioName: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  greeting: {
    fontFamily: typography.bodySemiBold,
    fontSize: fontSize['2xl'],
    color: colors.ink,
  },
  costsCard: {
    backgroundColor: colors.clayLight,
    borderRadius: radius.lg,
    padding: spacing[4],
    gap: spacing[1],
  },
  costsTotal: {
    fontFamily: typography.bodySemiBold,
    fontSize: 28,
    color: colors.clay,
  },
  costsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  costItem: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  costsLink: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.clay,
    marginTop: spacing[1],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  rowMain: { flex: 1 },
  rowTitle: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  rowMeta: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: 2,
  },
  empty: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    paddingVertical: spacing[2],
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.clay,
    borderRadius: radius.md,
    paddingVertical: spacing[2],
    alignItems: 'center',
  },
  actionLabel: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.clay,
  },
});
