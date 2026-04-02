import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Avatar, Badge, Button, Divider, SectionLabel } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';

type Nav = NativeStackNavigationProp<AppStackParamList, 'MemberProfile'>;
type Route = RouteProp<AppStackParamList, 'MemberProfile'>;

type Role = 'owner' | 'assistant' | 'member';
type Status = 'active' | 'invited' | 'suspended';

type MembershipPlan = {
  id: string;
  name: string;
  price: number;
};

function numFromUnknown(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseMembershipPlansPayload(data: unknown): MembershipPlan[] {
  const rawList = Array.isArray(data)
    ? data
    : data &&
        typeof data === 'object' &&
        Array.isArray((data as { plans?: unknown }).plans)
      ? (data as { plans: unknown[] }).plans
      : [];
  return rawList
    .map((raw): MembershipPlan | null => {
      if (!raw || typeof raw !== 'object') return null;
      const r = raw as Record<string, unknown>;
      const id = String(r.id ?? r._id ?? '').trim();
      if (!id) return null;
      return {
        id,
        name: String(r.name ?? ''),
        price: numFromUnknown(r.price),
      };
    })
    .filter((x): x is MembershipPlan => x != null);
}

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

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [assignedPlanId, setAssignedPlanId] = useState<string | null>(null);
  const [assigningPlan, setAssigningPlan] = useState(false);

  const load = useCallback(async () => {
    try {
      const [plansRaw, memberRaw] = await Promise.all([
        apiFetch<unknown>(
          `/studios/${tenantId}/membership-plans`,
          {},
          tenantId
        ).catch(() => null),
        apiFetch<unknown>(
          `/studios/${tenantId}/members/${userId}`,
          {},
          tenantId
        ).catch(() => null),
      ]);
      setPlans(
        plansRaw != null ? parseMembershipPlansPayload(plansRaw) : []
      );
      if (memberRaw && typeof memberRaw === 'object') {
        const m = memberRaw as Record<string, unknown>;
        const pid = m.membershipPlanId ?? m.membership_plan_id;
        setAssignedPlanId(
          pid != null && String(pid).trim() !== ''
            ? String(pid)
            : null
        );
      } else {
        setAssignedPlanId(null);
      }
    } catch {
      setPlans([]);
      setAssignedPlanId(null);
    }
  }, [tenantId, userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

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

  async function onAssignPlan(planId: string | null) {
    setAssigningPlan(true);
    try {
      await apiFetch(
        `/studios/${tenantId}/membership-plans/assign`,
        {
          method: 'POST',
          body: JSON.stringify({ userId, planId }),
        },
        tenantId
      );
      setAssignedPlanId(planId);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : 'Could not assign plan.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setAssigningPlan(false);
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

  async function onRemoveMember() {
    const confirmed =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.confirm(
            'Remove this member from the studio? They can be invited back later.'
          )
        : await new Promise<boolean>((resolve) => {
            Alert.alert(
              'Remove member',
              'Remove this member from the studio? They can be invited back later.',
              [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                {
                  text: 'Remove',
                  style: 'destructive',
                  onPress: () => resolve(true),
                },
              ]
            );
          });
    if (!confirmed) return;
    try {
      await apiFetch(
        `/studios/${tenantId}/members/${userId}`,
        { method: 'DELETE' },
        tenantId
      );
      navigation.goBack();
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : 'Could not remove member.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    }
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
          <>
            <TouchableOpacity
              style={styles.suspendBtn}
              onPress={confirmSuspend}
              disabled={statusSaving}
            >
              <Text style={styles.suspendLabel}>Suspend member</Text>
            </TouchableOpacity>
            <Button
              label="Remove from studio"
              variant="ghost"
              onPress={() => void onRemoveMember()}
              fullWidth
              style={styles.btnError}
            />
          </>
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

      <Divider style={{ marginTop: spacing[6] }} />
      <SectionLabel>MEMBERSHIP PLAN</SectionLabel>
      {plans.length === 0 ? (
        <Text style={styles.emptyPlans}>
          No plans defined. Add plans in Pricing Settings.
        </Text>
      ) : (
        <>
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planOption,
                assignedPlanId === plan.id && styles.planOptionActive,
              ]}
              onPress={() => void onAssignPlan(plan.id)}
              disabled={assigningPlan}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.planOptionName,
                  assignedPlanId === plan.id && styles.planOptionNameActive,
                ]}
              >
                {plan.name}
              </Text>
              <Text style={styles.planOptionPrice}>
                €{plan.price.toFixed(2)}/mo
              </Text>
            </TouchableOpacity>
          ))}
          {assignedPlanId ? (
            <TouchableOpacity
              onPress={() => void onAssignPlan(null)}
              disabled={assigningPlan}
            >
              <Text style={styles.unassignLabel}>Remove plan</Text>
            </TouchableOpacity>
          ) : null}
        </>
      )}

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
  btnError: {
    marginTop: spacing[3],
    borderWidth: 0.5,
    borderColor: colors.error,
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
  emptyPlans: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginTop: spacing[2],
  },
  planOptionActive: {
    borderColor: colors.clay,
    backgroundColor: colors.clayLight,
  },
  planOptionName: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  planOptionNameActive: {
    color: colors.clay,
  },
  planOptionPrice: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.inkLight,
  },
  unassignLabel: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: 'center',
    paddingVertical: spacing[2],
    marginTop: spacing[1],
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
