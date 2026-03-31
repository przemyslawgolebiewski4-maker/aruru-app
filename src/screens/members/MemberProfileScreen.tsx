import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Avatar, Badge, SectionLabel } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';

type Nav = NativeStackNavigationProp<AppStackParamList, 'MemberProfile'>;
type Route = RouteProp<AppStackParamList, 'MemberProfile'>;

type Role = 'owner' | 'assistant' | 'member';
type Status = 'active' | 'invited' | 'suspended';

const ROLE_OPTIONS: { value: Role; label: string; desc: string }[] = [
  { value: 'owner', label: 'Owner', desc: 'Full studio control' },
  { value: 'assistant', label: 'Assistant', desc: 'Firings and tasks' },
  { value: 'member', label: 'Member', desc: 'Bookings and costs' },
];

function roleBadgeVariant(r: Role): 'clay' | 'moss' | 'neutral' {
  if (r === 'owner') return 'clay';
  if (r === 'assistant') return 'moss';
  return 'neutral';
}

export default function MemberProfileScreen({ route }: { route: Route }) {
  const {
    tenantId,
    userId,
    memberName,
    memberEmail,
    role: initialRole,
    status: initialStatus,
  } = route.params;
  const navigation = useNavigation<Nav>();

  const [role, setRole] = useState<Role>(initialRole);
  const [status, setStatus] = useState<Status>(initialStatus);
  const [roleSaving, setRoleSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  async function patchRole(next: Role) {
    if (next === role) return;
    setRoleSaving(true);
    try {
      await apiFetch(
        `/studios/${tenantId}/members/${userId}/role`,
        {
          method: 'PATCH',
          body: JSON.stringify({ role: next }),
        },
        tenantId
      );
      setRole(next);
      Alert.alert('Updated', 'Role saved.');
    } catch (e: unknown) {
      Alert.alert(
        'Could not update',
        e instanceof Error ? e.message : 'Please try again.'
      );
    } finally {
      setRoleSaving(false);
    }
  }

  async function patchStatus(next: Status) {
    setStatusSaving(true);
    try {
      await apiFetch(
        `/studios/${tenantId}/members/${userId}/role`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: next }),
        },
        tenantId
      );
      setStatus(next);
      navigation.goBack();
    } catch (e: unknown) {
      Alert.alert(
        'Could not update',
        e instanceof Error ? e.message : 'Please try again.'
      );
    } finally {
      setStatusSaving(false);
    }
  }

  function confirmSuspend() {
    Alert.alert(
      `Suspend ${memberName}?`,
      "They won't be able to access the studio.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend',
          style: 'destructive',
          onPress: () => patchStatus('suspended'),
        },
      ]
    );
  }

  const statusLabel =
    status === 'active'
      ? 'Active'
      : status === 'invited'
        ? 'Invited'
        : 'Suspended';
  const statusColor =
    status === 'active'
      ? colors.moss
      : status === 'invited'
        ? colors.inkLight
        : colors.error;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Avatar name={memberName} size="lg" />
        <Text style={styles.name}>{memberName}</Text>
        <Text style={styles.email}>{memberEmail}</Text>
        <View style={styles.badgeRow}>
          <Badge label={role} variant={roleBadgeVariant(role)} />
          {status !== 'active' ? (
            <Badge
              label={status}
              variant={status === 'suspended' ? 'error' : 'neutral'}
            />
          ) : null}
        </View>
      </View>

      <SectionLabel>ROLE</SectionLabel>
      {ROLE_OPTIONS.map((opt, i) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.roleRow,
            i < ROLE_OPTIONS.length - 1 && styles.roleRowBorder,
          ]}
          onPress={() => patchRole(opt.value)}
          disabled={roleSaving}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.roleLabel}>{opt.label}</Text>
            <Text style={styles.roleDesc}>{opt.desc}</Text>
          </View>
          <View
            style={[
              styles.checkOuter,
              role === opt.value && styles.checkOuterSelected,
            ]}
          >
            {role === opt.value ? <View style={styles.checkInner} /> : null}
          </View>
        </TouchableOpacity>
      ))}

      <View style={styles.statusSection}>
        <SectionLabel>STATUS</SectionLabel>
        <View style={styles.statusRow}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>

        {status === 'active' ? (
          <TouchableOpacity
            style={styles.suspendBtn}
            onPress={confirmSuspend}
            disabled={statusSaving}
          >
            <Text style={styles.suspendLabel}>Suspend member</Text>
          </TouchableOpacity>
        ) : null}

        {status === 'suspended' ? (
          <TouchableOpacity
            style={styles.reactivateBtn}
            onPress={() => patchStatus('active')}
            disabled={statusSaving}
          >
            <Text style={styles.reactivateLabel}>Reactivate member</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.costsSection}>
        <SectionLabel>COSTS</SectionLabel>
        <View style={styles.costCard}>
          <Text style={styles.costTitle}>Cost summary coming soon.</Text>
          <Text style={styles.costHint}>
            You&apos;ll be able to view and send monthly summaries here.
          </Text>
        </View>
      </View>

      <View style={{ height: spacing[10] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing[6],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  name: {
    fontFamily: typography.display,
    fontSize: 24,
    color: colors.ink,
    marginTop: spacing[3],
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  email: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing[2],
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  roleRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  roleLabel: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  roleDesc: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    marginTop: 2,
  },
  checkOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 0.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOuterSelected: {
    borderColor: colors.clay,
    backgroundColor: colors.clayLight,
  },
  checkInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.clay,
  },
  statusSection: {
    marginTop: spacing[6],
  },
  statusRow: {
    paddingVertical: spacing[2],
  },
  statusText: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
  },
  suspendBtn: {
    marginTop: spacing[3],
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.error,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  suspendLabel: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.base,
    color: colors.error,
  },
  reactivateBtn: {
    marginTop: spacing[3],
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.moss,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  reactivateLabel: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.base,
    color: colors.moss,
  },
  costsSection: {
    marginTop: spacing[6],
  },
  costCard: {
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 0.5,
    borderColor: colors.border,
    marginTop: spacing[2],
  },
  costTitle: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 20,
  },
  costHint: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
    marginTop: 4,
    lineHeight: 16,
  },
});
