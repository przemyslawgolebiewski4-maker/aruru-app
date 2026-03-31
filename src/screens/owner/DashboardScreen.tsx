import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
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

type FiringRow = { id: string; title: string; meta: string; status: 'open' | 'closed' };
type TaskRow = {
  id: string;
  title: string;
  meta: string;
  state: 'todo' | 'in_progress' | 'done';
};

export default function DashboardScreen() {
  const { user, studios } = useAuth();
  const navigation = useNavigation<MaterialTopTabNavigationProp<MainTabParamList>>();
  const [loading, setLoading] = useState(true);

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const currentStudio = studios[0];
  const studioLabel = currentStudio?.studioName?.trim() || 'Your studio';
  const tenantId = currentStudio?.tenantId;
  const canManageMembers =
    currentStudio?.role === 'owner' && currentStudio?.status === 'active';

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

  const members = 0;
  const firings: FiringRow[] = [];
  const tasks: TaskRow[] = [];

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const statValue = loading ? '—' : members;

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
        <StatCard label="Members" value={statValue} accent="clay" />
        <StatCard label="Firings this month" value={statValue} accent="moss" />
        <StatCard label="Open tasks" value={statValue} accent="none" />
        <StatCard label="Summaries due" value={statValue} accent="none" />
      </View>

      <SectionLabel>Recent firings</SectionLabel>
      {firings.length === 0 ? (
        <Text style={styles.emptyList}>No firings yet</Text>
      ) : (
        firings.map((item, i) => (
          <View key={item.id}>
            <View style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowMeta}>{item.meta}</Text>
              </View>
              <Badge
                label={item.status}
                variant={item.status === 'open' ? 'open' : 'neutral'}
              />
            </View>
            {i < firings.length - 1 ? <Divider /> : null}
          </View>
        ))
      )}

      <View style={{ height: spacing[6] }} />

      <SectionLabel>Tasks</SectionLabel>
      {tasks.length === 0 ? (
        <Text style={styles.emptyList}>No tasks yet</Text>
      ) : (
        tasks.map((item, i) => (
          <View key={item.id}>
            <View style={styles.taskRow}>
              <View
                style={[
                  styles.taskDot,
                  item.state === 'in_progress' && styles.dotClay,
                  item.state === 'done' && styles.dotMoss,
                  item.state === 'todo' && styles.dotTodo,
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowMeta}>{item.meta}</Text>
              </View>
            </View>
            {i < tasks.length - 1 ? <Divider /> : null}
          </View>
        ))
      )}

      <View style={{ height: spacing[6] }} />

      <View style={styles.actionsRow}>
        <View style={styles.actionHalf}>
          <Button
            label="New firing"
            variant="ghost"
            onPress={() => {}}
            fullWidth
            style={styles.actionBtn}
          />
        </View>
        <View style={styles.actionHalf}>
          <Button
            label="Members"
            variant="ghost"
            onPress={goMembers}
            fullWidth
            style={styles.actionBtn}
          />
        </View>
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
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[6],
  },
  statCell: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: '22%',
    maxWidth: '100%',
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
    gap: spacing[2],
  },
  actionHalf: {
    flex: 1,
  },
  actionBtn: {
    borderColor: colors.clay,
    borderWidth: 0.5,
    borderRadius: radius.sm,
  },
});
