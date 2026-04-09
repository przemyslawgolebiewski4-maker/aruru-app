import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../services/api';
import { alertMessage, confirmDestructive } from '../../utils/confirmAction';
import { Button } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';

type User = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  adminRole?: string;
  status?: string;
  createdAt?: string;
};

export default function AdminUsersScreen() {
  const { studios } = useAuth();
  const tenantId =
    (studios.find((s) => s.status === 'active') ?? studios[0])?.tenantId ?? '';
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [error, setError] = useState('');
  const [filterVerified, setFilterVerified] = useState<
    'all' | 'yes' | 'no'
  >('all');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'active' | 'deleted'
  >('active');
  const [filterAdmin, setFilterAdmin] = useState<'all' | 'yes' | 'no'>(
    'all'
  );
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filterVerified !== 'all') params.set('verified', filterVerified);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterAdmin !== 'all') params.set('has_admin', filterAdmin);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await apiFetch<{ users: User[]; total?: number }>(
        `/admin/users${qs}`,
        {},
        tenantId
      );
      setUsers(res.users ?? []);
      setTotal(res.total ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterVerified, filterStatus, filterAdmin, tenantId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function deleteUser(u: User) {
    const ok = await confirmDestructive(
      'Delete user (GDPR)',
      `Permanently anonymise ${u.email}? This cannot be undone.`,
      'Delete'
    );
    if (!ok) return;
    try {
      await apiFetch(`/admin/users/${u.id}`, { method: 'DELETE' }, tenantId);
      await load();
    } catch (e: unknown) {
      alertMessage(
        'Error',
        e instanceof Error ? e.message : 'Could not delete user.'
      );
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or email..."
          placeholderTextColor={colors.inkLight}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.filterBar}>
        <Text style={styles.filterCount}>
          {total} {total === 1 ? 'user' : 'users'}
        </Text>
      </View>

      <View style={styles.filterRowsWrap}>
        <View style={styles.filterRow}>
          {(['all', 'yes', 'no'] as const).map((v) => (
            <TouchableOpacity
              key={`ver-${v}`}
              style={[
                styles.filterChip,
                filterVerified === v && styles.filterChipActive,
              ]}
              onPress={() => setFilterVerified(v)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterVerified === v && styles.filterChipTextActive,
                ]}
              >
                {v === 'all'
                  ? 'All verified'
                  : v === 'yes'
                    ? 'Verified'
                    : 'Unverified'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filterRow}>
          {(['active', 'deleted', 'all'] as const).map((v) => (
            <TouchableOpacity
              key={`st-${v}`}
              style={[
                styles.filterChip,
                filterStatus === v && styles.filterChipActive,
              ]}
              onPress={() => setFilterStatus(v)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterStatus === v && styles.filterChipTextActive,
                ]}
              >
                {v === 'active'
                  ? 'Active'
                  : v === 'deleted'
                    ? 'Deleted'
                    : 'All statuses'}
              </Text>
            </TouchableOpacity>
          ))}

          {(['all', 'no', 'yes'] as const).map((v) => (
            <TouchableOpacity
              key={`adm-${v}`}
              style={[
                styles.filterChip,
                filterAdmin === v && styles.filterChipActive,
              ]}
              onPress={() => setFilterAdmin(v)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterAdmin === v && styles.filterChipTextActive,
                ]}
              >
                {v === 'all'
                  ? 'All roles'
                  : v === 'yes'
                    ? 'Admins only'
                    : 'Regular only'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.clay} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={users}
          keyExtractor={(u) => u.id}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No users found.</Text>
            </View>
          }
          renderItem={({ item: u }) => (
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(u.name || u.email)[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.userName}>{u.name || '—'}</Text>
                <Text style={styles.userEmail}>{u.email}</Text>
                <Text
                  style={[
                    styles.userMeta,
                    u.status === 'deleted' && { color: colors.error },
                  ]}
                >
                  {u.status === 'deleted' ? 'Deleted · ' : ''}
                  {u.emailVerified ? 'Verified' : 'Unverified'}
                  {u.adminRole ? ' · Admin' : ''}
                </Text>
              </View>
              <Button
                label="Delete"
                variant="danger"
                onPress={() => void deleteUser(u)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={`Delete user ${u.email}`}
                style={styles.deleteBtn}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  list: { flex: 1 },
  searchBar: {
    padding: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  searchInput: {
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: spacing[2],
    paddingHorizontal: spacing[3],
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  filterBar: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[1],
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  filterCount: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginBottom: spacing[2],
  },
  filterRowsWrap: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  filterChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.cream,
  },
  filterChipActive: {
    backgroundColor: colors.clay,
    borderColor: colors.clay,
  },
  filterChipText: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  emptyText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
  },
  sep: { height: 0.5, backgroundColor: colors.border },
  row: {
    backgroundColor: colors.surface,
    padding: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.clayLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: typography.mono,
    fontSize: 13,
    color: colors.clay,
  },
  info: { flex: 1, gap: 1 },
  userName: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  userEmail: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  userMeta: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  deleteBtn: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    minHeight: 40,
  },
});
