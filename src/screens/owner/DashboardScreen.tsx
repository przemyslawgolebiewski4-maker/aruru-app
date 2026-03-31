import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useAuth, useStudio } from '../../hooks/useAuth';
import { StatCard, Badge, Avatar, Divider, SectionLabel } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';

interface Props {
  navigation: any;
  route: { params: { tenantId: string } };
}

export default function DashboardScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const studio = useStudio(route.params.tenantId);
  const tenantId = route.params.tenantId;

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}, {firstName}.</Text>
          <Text style={styles.studioName}>{studio?.studioName}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
        >
          <Avatar name={user?.name ?? 'U'} size="md" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Members" value={24} accent="clay" />
        <StatCard label="Firings this month" value={7} accent="moss" />
        <StatCard label="Open tasks" value={3} />
        <StatCard label="Summaries due" value={12} />
      </View>

      <SectionLabel>Recent firings</SectionLabel>

      {[
        { title: 'Bisque firing', meta: '28 Mar · 6 members', status: 'open' as const },
        { title: 'Glaze firing', meta: '25 Mar · 4 members', status: 'closed' as const },
        { title: 'Private — Anna', meta: '22 Mar · 1 member', status: 'closed' as const },
      ].map((item, i) => (
        <TouchableOpacity
          key={i}
          style={styles.listRow}
          onPress={() => navigation.navigate('KilnDetail', { tenantId, firingId: 'x' })}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowMeta}>{item.meta}</Text>
          </View>
          <Badge
            label={item.status}
            variant={item.status === 'open' ? 'open' : 'neutral'}
          />
          <Divider />
        </TouchableOpacity>
      ))}

      <View style={{ height: spacing[4] }} />
      <SectionLabel>Tasks</SectionLabel>

      {[
        { title: 'Restock Laguna clay', meta: 'assigned to Mia · due Apr 2', status: 'progress' as const },
        { title: 'Fix kiln shelf crack', meta: 'unassigned · due Apr 5', status: 'todo' as const },
        { title: 'Send March summaries', meta: 'done by Przemek · Mar 30', status: 'done' as const },
      ].map((item, i) => (
        <TouchableOpacity
          key={i}
          style={styles.taskRow}
          onPress={() => navigation.navigate('TaskDetail', { tenantId })}
        >
          <View style={[styles.taskDot, styles[`dot_${item.status}`]]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowMeta}>{item.meta}</Text>
          </View>
        </TouchableOpacity>
      ))}

      <View style={{ height: spacing[12] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing[5] },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing[6],
  },
  greeting: {
    fontFamily: typography.display,
    fontSize: fontSize['2xl'],
    color: colors.ink,
    letterSpacing: -0.3,
  },
  studioName: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    letterSpacing: 0.6,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing[6],
    flexWrap: 'wrap',
  },
  listRow: {
    paddingVertical: spacing[3],
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  taskRow: {
    paddingVertical: spacing[3],
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
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
  dot_todo: { backgroundColor: colors.inkLight },
  dot_progress: { backgroundColor: colors.clay },
  dot_done: { backgroundColor: colors.moss },
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
});
