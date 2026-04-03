import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Avatar, Badge } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';

type Nav = NativeStackNavigationProp<AppStackParamList, 'Members'>;
type Route = RouteProp<AppStackParamList, 'Members'>;

export type StudioMemberRow = {
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'assistant' | 'member';
  status: 'active' | 'invited' | 'suspended';
  avatarUrl?: string;
};

function roleBadgeVariant(
  role: StudioMemberRow['role']
): 'clay' | 'moss' | 'neutral' {
  if (role === 'owner') return 'clay';
  if (role === 'assistant') return 'moss';
  return 'neutral';
}

function formatErr(e: unknown): string {
  return e instanceof Error ? e.message : 'Could not load members.';
}

export default function MembersScreen({ route }: { route: Route }) {
  const { tenantId } = route.params;
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState('');
  const [list, setList] = useState<StudioMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{ members: StudioMemberRow[] }>(
        `/studios/${tenantId}/members`,
        {},
        tenantId
      );
      const raw = res.members ?? [];
      setList(
        raw.map((row) => ({
          ...row,
          avatarUrl:
            row.avatarUrl ?? (row as { avatar_url?: string }).avatar_url,
        }))
      );
    } catch (e: unknown) {
      setError(formatErr(e));
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('InviteMember', { tenantId })}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Invite member"
        >
          <Text style={styles.headerInvite}>Invite</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, tenantId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
    );
  }, [list, search]);

  const stats = useMemo(() => {
    const owners = list.filter((m) => m.role === 'owner').length;
    const assistants = list.filter((m) => m.role === 'assistant').length;
    return {
      total: list.length,
      owners,
      assistants,
    };
  }, [list]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.clay} />
        </View>
      ) : null}

      {error ? (
        <Text style={styles.errorBanner}>{error}</Text>
      ) : null}

      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Text style={styles.statPillText}>
            {stats.total} members
          </Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statPillText}>
            {stats.assistants} assistants
          </Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statPillText}>
            {stats.owners} owners
          </Text>
        </View>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search members..."
        placeholderTextColor={colors.inkFaint}
        value={search}
        onChangeText={setSearch}
      />

      {!loading && filtered.length === 0 && list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No members yet.</Text>
          <Text style={styles.emptyHint}>
            Tap Invite to add your first member.
          </Text>
        </View>
      ) : !loading && filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No matches.</Text>
        </View>
      ) : (
        filtered.map((m) => (
          <TouchableOpacity
            key={m.userId}
            style={styles.memberRow}
            onPress={() =>
              navigation.navigate('MemberProfile', {
                tenantId,
                userId: m.userId,
                memberName: m.name?.trim() || m.email,
                memberEmail: m.email,
                role: m.role,
                status: m.status,
                memberAvatarUrl: m.avatarUrl,
              })
            }
            activeOpacity={0.7}
          >
            <Avatar
              name={m.name?.trim() || m.email}
              size="sm"
              imageUrl={m.avatarUrl}
            />
            <View style={styles.memberMid}>
              <Text style={styles.memberName}>
                {m.name?.trim() ? m.name : m.email}
              </Text>
              <Text style={styles.memberEmail}>{m.email}</Text>
            </View>
            <View style={styles.memberRight}>
              <Badge
                label={m.role}
                variant={roleBadgeVariant(m.role)}
              />
              {m.status !== 'active' ? (
                <Text
                  style={[
                    styles.statusHint,
                    m.status === 'suspended' && styles.statusSuspended,
                  ]}
                >
                  {m.status}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing[5],
    paddingBottom: spacing[10],
  },
  loadingWrap: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  errorBanner: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing[3],
  },
  headerInvite: {
    fontFamily: typography.mono,
    fontSize: 13,
    color: colors.clay,
    marginRight: spacing[2],
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  statPill: {
    backgroundColor: colors.cream,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    marginRight: spacing[2],
  },
  statPillText: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkMid,
  },
  search: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: colors.surface,
    marginBottom: spacing[4],
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  memberMid: {
    flex: 1,
    marginLeft: spacing[3],
  },
  memberName: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
    marginBottom: 2,
  },
  memberEmail: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
  },
  memberRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusHint: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
    textTransform: 'lowercase',
  },
  statusSuspended: {
    color: colors.error,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing[10],
    paddingHorizontal: spacing[10],
  },
  emptyTitle: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkLight,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    textAlign: 'center',
    marginTop: spacing[2],
  },
});
