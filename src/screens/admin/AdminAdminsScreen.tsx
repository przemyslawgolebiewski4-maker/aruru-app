import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../services/api';
import { alertMessage, confirmDestructive } from '../../utils/confirmAction';
import { Button } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';

type AdminUser = {
  id: string;
  name: string;
  email: string;
  adminPermissions: Record<string, boolean>;
};

const PERMISSIONS = [
  { key: 'studios', label: 'Studios' },
  { key: 'billing', label: 'Billing & pricing' },
  { key: 'sponsors', label: 'Sponsors' },
  { key: 'community', label: 'Community & forum' },
  { key: 'users', label: 'Users & GDPR' },
];

export default function AdminAdminsScreen() {
  const { user, studios } = useAuth();
  const tenantId =
    (studios.find((s) => s.status === 'active') ?? studios[0])?.tenantId ?? '';
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPerms, setNewPerms] = useState<Record<string, boolean>>({
    studios: false,
    billing: false,
    sponsors: false,
    community: false,
    users: false,
  });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{ admins: AdminUser[] }>(
        '/admin/admins',
        {},
        tenantId
      );
      setAdmins(res.admins ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load admins.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function updatePermissions(
    adminId: string,
    perms: Record<string, boolean>
  ) {
    try {
      await apiFetch(
        `/admin/admins/${adminId}/permissions`,
        { method: 'PATCH', body: JSON.stringify(perms) },
        tenantId
      );
      await load();
    } catch (e: unknown) {
      alertMessage(
        'Error',
        e instanceof Error ? e.message : 'Could not update.'
      );
    }
  }

  async function removeAdmin(admin: AdminUser) {
    const ok = await confirmDestructive(
      'Remove admin',
      `Remove admin access for ${admin.name}?`,
      'Remove'
    );
    if (!ok) return;
    try {
      await apiFetch(`/admin/admins/${admin.id}`, { method: 'DELETE' }, tenantId);
      await load();
    } catch (e: unknown) {
      alertMessage(
        'Error',
        e instanceof Error ? e.message : 'Could not remove.'
      );
    }
  }

  async function addAdmin() {
    if (!newEmail.trim()) return;
    setAdding(true);
    try {
      await apiFetch(
        '/admin/admins',
        {
          method: 'POST',
          body: JSON.stringify({
            email: newEmail.trim(),
            permissions: newPerms,
          }),
        },
        tenantId
      );
      setNewEmail('');
      setShowAdd(false);
      setNewPerms({
        studios: false,
        billing: false,
        sponsors: false,
        community: false,
        users: false,
      });
      await load();
    } catch (e: unknown) {
      alertMessage(
        'Error',
        e instanceof Error ? e.message : 'Could not add admin.'
      );
    } finally {
      setAdding(false);
    }
  }

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.clay} />
      </View>
    );
  if (error)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>
            Admin accounts ({admins.length})
          </Text>
          <Button
            label="+ Add admin"
            variant="ghost"
            onPress={() => setShowAdd(!showAdd)}
          />
        </View>

        {showAdd ? (
          <View style={styles.addCard}>
            <Text style={styles.addTitle}>New admin</Text>
            <TextInput
              style={styles.input}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="Email address"
              placeholderTextColor={colors.inkLight}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Text style={styles.permLabel}>Permissions</Text>
            {PERMISSIONS.map((p) => (
              <View key={p.key} style={styles.permRow}>
                <Text style={styles.permName}>{p.label}</Text>
                <Switch
                  value={newPerms[p.key] ?? false}
                  onValueChange={(v) => setNewPerms({ ...newPerms, [p.key]: v })}
                  trackColor={{ true: colors.moss, false: colors.border }}
                  thumbColor={colors.surface}
                />
              </View>
            ))}
            <View style={styles.addActions}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setShowAdd(false)}
                style={styles.addActionBtn}
              />
              <Button
                label="Add admin"
                variant="primary"
                onPress={() => void addAdmin()}
                loading={adding}
                style={styles.addActionBtn}
              />
            </View>
          </View>
        ) : null}

        {admins.map((a) => {
          const isMe = a.id === user?.id;
          const allPerms = PERMISSIONS.every((p) => a.adminPermissions[p.key]);
          return (
            <View key={a.id} style={styles.adminCard}>
              <View style={styles.adminHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(a.name || a.email)[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.adminInfo}>
                  <Text style={styles.adminName}>{a.name || a.email}</Text>
                  <Text style={styles.adminEmail}>{a.email}</Text>
                </View>
                {!isMe ? (
                  <Button
                    label="Remove"
                    variant="danger"
                    onPress={() => void removeAdmin(a)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={`Remove admin ${a.email}`}
                    style={styles.removeBtn}
                  />
                ) : null}
              </View>
              {isMe || allPerms ? (
                <Text style={styles.fullAccessText}>
                  {isMe ? 'Owner · cannot be modified' : 'Full access'}
                </Text>
              ) : (
                PERMISSIONS.map((p) => (
                  <View key={p.key} style={styles.permRow}>
                    <Text style={styles.permName}>{p.label}</Text>
                    <Switch
                      value={a.adminPermissions[p.key] ?? false}
                      onValueChange={(v) => {
                        const updated = { ...a.adminPermissions, [p.key]: v };
                        void updatePermissions(a.id, updated);
                      }}
                      trackColor={{ true: colors.moss, false: colors.border }}
                      thumbColor={colors.surface}
                    />
                  </View>
                ))
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { paddingBottom: spacing[6] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  section: { padding: spacing[4], gap: spacing[3] },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing[4],
    gap: spacing[2],
  },
  addTitle: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  input: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing[2],
    paddingHorizontal: spacing[3],
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
    backgroundColor: colors.cream,
  },
  permLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing[2],
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[1],
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  permName: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  addActions: {
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'flex-end',
    marginTop: spacing[1],
  },
  addActionBtn: { flex: 1 },
  removeBtn: {
    minHeight: 40,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
  },
  adminCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing[4],
    gap: spacing[2],
  },
  adminHeader: {
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
  },
  avatarText: {
    fontFamily: typography.mono,
    fontSize: 14,
    color: colors.clay,
  },
  adminInfo: { flex: 1 },
  adminName: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  adminEmail: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  fullAccessText: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
});
