import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../services/api';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';

type User = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  adminRole?: string;
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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = debouncedSearch
        ? `?search=${encodeURIComponent(debouncedSearch)}`
        : '';
      const res = await apiFetch<{ users: User[] }>(
        `/admin/users${qs}`,
        {},
        tenantId
      );
      setUsers(res.users ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, tenantId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function deleteUser(u: User) {
    Alert.alert(
      'Delete user (GDPR)',
      `Permanently anonymise ${u.email}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(
                `/admin/users/${u.id}`,
                { method: 'DELETE' },
                tenantId
              );
              await load();
            } catch (e: unknown) {
              Alert.alert(
                'Error',
                e instanceof Error ? e.message : 'Could not delete user.'
              );
            }
          },
        },
      ]
    );
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
          data={users}
          keyExtractor={(u) => u.id}
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
                <Text style={styles.userMeta}>
                  {u.emailVerified ? 'Verified' : 'Unverified'}
                  {u.adminRole ? ' · Admin' : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => void deleteUser(u)}
              >
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
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
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: colors.error + '44',
  },
  deleteBtnText: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.error,
  },
});
