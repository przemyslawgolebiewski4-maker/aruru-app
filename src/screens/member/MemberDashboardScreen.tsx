import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  type CompositeNavigationProp,
} from '@react-navigation/native';
import type { MaterialTopTabNavigationProp } from '@react-navigation/material-top-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { Badge, SectionLabel, Divider, Button } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import { apiFetch } from '../../services/api';
import type { AppStackParamList, MainTabParamList } from '../../navigation/types';

type Nav = CompositeNavigationProp<
  MaterialTopTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<AppStackParamList>
>;
type StackNav = NativeStackNavigationProp<AppStackParamList>;

type Event = {
  id: string;
  title: string;
  starts_at?: string;
  startsAt?: string;
  kind?: string;
};

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

/** Member role: hide section when key is explicitly false in /auth/me map. */
function memberSectionVisible(
  visibility: Record<string, boolean> | null | undefined,
  key: string
): boolean {
  if (visibility == null || typeof visibility !== 'object') return true;
  if (!Object.prototype.hasOwnProperty.call(visibility, key)) return true;
  return visibility[key] !== false;
}

export default function MemberDashboardScreen() {
  const { user, studios, activeTenantId, suspendedStudios } = useAuth();
  const navigation = useNavigation<Nav>();
  const stackNav = navigation.getParent<StackNav>();
  const currentStudio =
    studios.find((s) => s.tenantId === activeTenantId) ??
    studios.find((s) => s.status === 'active') ??
    studios[0];
  const studioLabel = currentStudio?.studioName?.trim() || 'Studio';
  const tenantId = currentStudio?.tenantId ?? '';
  const studioSubscriptionActive =
    currentStudio?.subscriptionStatus === 'active' ||
    currentStudio?.subscriptionStatus === 'trial';

  const isMemberRole = currentStudio?.role === 'member';
  const memberVis = currentStudio?.memberDashboardVisibility ?? null;
  const showEvents =
    !isMemberRole || memberSectionVisible(memberVis, 'events');
  const showBookings =
    !isMemberRole || memberSectionVisible(memberVis, 'bookings');
  const showMaterials =
    !isMemberRole || memberSectionVisible(memberVis, 'materials');
  const showPrivateKilnSection =
    !isMemberRole ||
    memberSectionVisible(memberVis, 'privateKilns') ||
    memberSectionVisible(memberVis, 'kiln');
  const showCosts =
    !isMemberRole || memberSectionVisible(memberVis, 'costs');
  const showEventsBlock = showEvents || showBookings;
  const anyQuickAction =
    showBookings ||
    (studioSubscriptionActive && showMaterials) ||
    (studioSubscriptionActive && showPrivateKilnSection) ||
    showEvents ||
    (studioSubscriptionActive && showCosts);

  const [events, setEvents] = useState<Event[]>([]);
  const [todayBookings, setTodayBookings] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!tenantId || !user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setTodayBookings(0);
    try {
      const needEvents =
        !isMemberRole || memberSectionVisible(memberVis, 'events');
      const needBookings =
        !isMemberRole || memberSectionVisible(memberVis, 'bookings');
      const [eventsRes, bookingsRes] = await Promise.allSettled([
        needEvents
          ? apiFetch<unknown>(`/studios/${tenantId}/events`, {}, tenantId)
          : Promise.resolve(null),
        needBookings
          ? apiFetch<unknown>(`/studios/${tenantId}/bookings`, {}, tenantId)
          : Promise.resolve(null),
      ]);

      if (bookingsRes.status === 'fulfilled' && bookingsRes.value != null) {
        const raw = bookingsRes.value as unknown;
        const all = Array.isArray(raw)
          ? raw
          : ((raw as { bookings?: unknown[] }).bookings ?? []);
        const today = new Date();
        const todayStr = today.toDateString();
        const count = (all as Record<string, unknown>[]).filter((b) => {
          const d = b.createdAt ?? b.created_at ?? '';
          return d && new Date(String(d)).toDateString() === todayStr;
        }).length;
        setTodayBookings(count);
      }

      if (eventsRes.status === 'fulfilled' && eventsRes.value != null) {
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
  }, [tenantId, user?.id, isMemberRole, memberVis]);

  useFocusEffect(useCallback(() => void load(), [load]));

  function goCosts() {
    if (!tenantId || !user?.id) return;
    const now = new Date();
    let prevMonth = now.getMonth();
    let prevYear = now.getFullYear();
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    stackNav?.navigate('CostDetail', {
      tenantId,
      userId: user.id,
      memberName: user.name?.trim() || user.email || 'You',
      memberEmail: user.email,
      year: prevYear,
      month: prevMonth,
    });
  }

  function goEvents() {
    stackNav?.navigate('EventList', { tenantId });
  }

  function goBookStudio() {
    if (!tenantId) return;
    navigation.navigate('BookStudio', { tenantId });
  }

  function goShop() {
    if (!tenantId) return;
    navigation.navigate('MaterialsShop', { tenantId });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.clay} />
      </View>
    );
  }

  if (studios.length === 0 && suspendedStudios.length > 0) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Text style={styles.greeting}>
          Hello, {user?.name?.split(' ')[0] ?? 'there'}.
        </Text>
        <Text style={styles.empty}>
          You don&apos;t have an active studio membership. Your studio may be
          suspended until the subscription is renewed. Open Profile for details.
        </Text>
        <Button
          label="Open Profile"
          variant="secondary"
          onPress={() => navigation.jumpTo('Profile')}
          style={styles.actionBtn}
        />
      </ScrollView>
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

      {showEventsBlock ? (
        <>
          <Divider />
          <SectionLabel>
            {showEvents && showBookings
              ? 'UPCOMING EVENTS & BOOKINGS'
              : showEvents
                ? 'UPCOMING EVENTS'
                : 'BOOKINGS'}
          </SectionLabel>

          {showBookings && todayBookings > 0 ? (
            <View style={styles.bookingsTodayRow}>
              <Text style={styles.bookingsTodayText}>
                {todayBookings}{' '}
                {todayBookings === 1 ? 'member has' : 'members have'} booked
                studio time today
              </Text>
            </View>
          ) : null}

          {showEvents ? (
            events.length === 0 ? (
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
            )
          ) : null}
        </>
      ) : null}

      {anyQuickAction ? (
        <>
          <Divider />
          <View style={styles.actions}>
            {showBookings ? (
              <Button
                label="Book studio time"
                variant="secondary"
                onPress={goBookStudio}
                style={styles.actionBtn}
              />
            ) : null}
            {studioSubscriptionActive && showMaterials ? (
              <Button
                label="Buy materials"
                variant="secondary"
                onPress={goShop}
                style={styles.actionBtn}
              />
            ) : null}
            {studioSubscriptionActive && showPrivateKilnSection ? (
              <Button
                label="Private kiln"
                variant="secondary"
                onPress={() =>
                  tenantId
                    ? stackNav?.navigate('PrivateKiln', { tenantId })
                    : undefined
                }
                style={styles.actionBtn}
              />
            ) : null}
            {showEvents ? (
              <Button
                label="Events"
                variant="secondary"
                onPress={goEvents}
                style={styles.actionBtn}
              />
            ) : null}
            {studioSubscriptionActive && showCosts ? (
              <Button
                label="My costs"
                variant="secondary"
                onPress={goCosts}
                style={styles.actionBtn}
              />
            ) : null}
          </View>
        </>
      ) : null}
      {!studioSubscriptionActive ? (
        <Text style={styles.noSubHint}>
          Costs, kiln history and materials are available when your studio
          activates a subscription.
        </Text>
      ) : null}
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
  bookingsTodayRow: {
    backgroundColor: colors.mossLight,
    borderRadius: radius.sm,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  bookingsTodayText: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.moss,
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
    gap: spacing[2],
    marginTop: spacing[2],
  },
  actionBtn: {
    width: '100%',
  },
  noSubHint: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing[4],
    marginTop: spacing[3],
  },
});
