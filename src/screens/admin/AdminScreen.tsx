import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import {
  apiFetch,
  userHasAdminTabAccess,
  type AuthUser,
} from '../../services/api';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AppStackParamList>;

type AdminMenuRoute =
  | 'AdminStudios'
  | 'AdminSponsors'
  | 'AdminForum'
  | 'AdminAdmins'
  | 'AdminPricing'
  | 'AdminUsers'
  | 'AdminSupport';

type DashboardData = {
  activeStudios: number;
  trialStudios: number;
  pendingSponsors: number;
  openSupportCount?: number;
  expiringTrials: {
    id: string;
    name: string;
    trialEndsAt?: string;
    ownerEmail: string;
  }[];
  failedPayments: {
    id: string;
    name: string;
    ownerEmail: string;
    stripeCustomerId?: string;
  }[];
};

function timeLeft(iso?: string): string {
  if (!iso) return '';
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days <= 0) return 'expired';
  return `${days}d left`;
}

export default function AdminScreen() {
  const { user, studios } = useAuth();
  const navigation = useNavigation();
  const tenantId =
    (studios.find((s) => s.status === 'active') ?? studios[0])?.tenantId ?? '';

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const perms = user?.adminPermissions ?? {};
  const isLegacyFullAdmin =
    user?.adminRole === 'aruru_admin' &&
    (!user?.adminPermissions ||
      Object.keys(user.adminPermissions ?? {}).length === 0);

  function can(key: keyof NonNullable<AuthUser['adminPermissions']>): boolean {
    return isLegacyFullAdmin || Boolean(perms[key]);
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<DashboardData>('/admin/dashboard', {}, tenantId);
      setData({
        ...res,
        openSupportCount:
          typeof res.openSupportCount === 'number' ? res.openSupportCount : 0,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load admin dashboard.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (!user || !userHasAdminTabAccess(user)) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Access denied.</Text>
      </View>
    );
  }

  const allPerms =
    Object.values(perms).length === 5 && Object.values(perms).every(Boolean);

  const MENU = [
    can('studios') && {
      key: 'AdminStudios' as const,
      label: 'Studios',
      desc: 'Manage studios & tiers',
      color: colors.clay,
    },
    can('sponsors') && {
      key: 'AdminSponsors' as const,
      label: 'Sponsors',
      desc: 'Approvals & profiles',
      color: colors.moss,
      alert: (data?.pendingSponsors ?? 0) > 0,
    },
    can('community') && {
      key: 'AdminForum' as const,
      label: 'Community',
      desc: 'Moderate posts & forum',
      color: colors.inkLight,
    },
    (isLegacyFullAdmin || allPerms) && {
      key: 'AdminAdmins' as const,
      label: 'Admins',
      desc: 'Manage admin accounts',
      color: colors.clay,
    },
    can('billing') && {
      key: 'AdminPricing' as const,
      label: 'Pricing',
      desc: 'Edit subscription tiers',
      color: colors.inkLight,
    },
    can('users') && {
      key: 'AdminUsers' as const,
      label: 'Users',
      desc: 'Search & GDPR delete',
      color: colors.inkLight,
    },
    can('community') && {
      key: 'AdminSupport' as const,
      label: 'Support',
      desc: 'User tickets & replies',
      color: colors.clay,
      alert: (data?.openSupportCount ?? 0) > 0,
    },
  ].filter(Boolean) as {
    key: AdminMenuRoute;
    label: string;
    desc: string;
    color: string;
    alert?: boolean;
  }[];

  function goToAdminSection(key: AdminMenuRoute) {
    const parent = navigation.getParent<Nav>();
    if (parent) {
      parent.navigate(key);
    } else {
      (navigation as { navigate: (name: AdminMenuRoute) => void }).navigate(key);
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin panel</Text>
        <Text style={styles.headerSub}>aruru.xyz internal tools</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>
            {isLegacyFullAdmin || allPerms ? 'Full access' : 'Limited access'}
          </Text>
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
        data && (
          <>
            <View style={styles.statRow}>
              <View style={[styles.statCard, styles.statCardClay]}>
                <Text style={styles.statLabel}>Active studios</Text>
                <Text style={styles.statValue}>{data.activeStudios}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Trials</Text>
                <Text style={[styles.statValue, { color: colors.clay }]}>
                  {data.trialStudios}
                </Text>
              </View>
              <View style={[styles.statCard, styles.statCardMoss]}>
                <Text style={styles.statLabel}>Sponsors pending</Text>
                <Text style={styles.statValue}>{data.pendingSponsors}</Text>
              </View>
            </View>

            {(data.expiringTrials.length > 0 || data.failedPayments.length > 0) && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Alerts</Text>
                {data.expiringTrials.map((t) => (
                  <View key={t.id} style={styles.alertCard}>
                    <View
                      style={[
                        styles.alertBadge,
                        { backgroundColor: colors.clayLight },
                      ]}
                    >
                      <Text style={[styles.alertBadgeText, { color: colors.clay }]}>
                        Trial
                      </Text>
                    </View>
                    <View style={styles.alertInfo}>
                      <Text style={styles.alertTitle}>{t.name}</Text>
                      <Text style={styles.alertSub}>
                        {t.ownerEmail} · {timeLeft(t.trialEndsAt)}
                      </Text>
                    </View>
                  </View>
                ))}
                {data.failedPayments.map((p) => (
                  <View key={p.id} style={styles.alertCard}>
                    <View
                      style={[
                        styles.alertBadge,
                        { backgroundColor: colors.errorLight },
                      ]}
                    >
                      <Text
                        style={[styles.alertBadgeText, { color: colors.error }]}
                      >
                        Payment
                      </Text>
                    </View>
                    <View style={styles.alertInfo}>
                      <Text style={styles.alertTitle}>{p.name}</Text>
                      <Text style={styles.alertSub}>{p.ownerEmail}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Sections</Text>
        {MENU.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.menuItem}
            onPress={() => goToAdminSection(item.key)}
            activeOpacity={0.75}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuDot, { backgroundColor: item.color }]} />
              <View>
                <Text style={styles.menuName}>{item.label}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>
            </View>
            <View style={styles.menuRight}>
              {item.alert ? <View style={styles.alertDot} /> : null}
              <Text style={styles.menuArrow}>›</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { paddingBottom: spacing[6] },
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
  header: {
    backgroundColor: colors.ink,
    padding: spacing[4],
    gap: spacing[1],
  },
  headerTitle: {
    fontFamily: typography.body,
    fontSize: fontSize.lg,
    color: colors.cream,
  },
  headerSub: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.clayBorder,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginTop: spacing[1],
  },
  roleBadgeText: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.clay,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing[2],
    padding: spacing[4],
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing[3],
  },
  statCardClay: { borderLeftWidth: 2, borderLeftColor: colors.clay },
  statCardMoss: { borderLeftWidth: 2, borderLeftColor: colors.moss },
  statLabel: {
    fontFamily: typography.mono,
    fontSize: 8,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontFamily: typography.body,
    fontSize: fontSize.lg,
    color: colors.ink,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  sectionLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
  },
  alertCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'flex-start',
  },
  alertBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  alertBadgeText: { fontFamily: typography.mono, fontSize: 9 },
  alertInfo: { flex: 1 },
  alertTitle: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  alertSub: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: 1,
  },
  menuItem: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  menuDot: { width: 8, height: 8, borderRadius: 4 },
  menuName: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  menuDesc: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: 1,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.clay,
  },
  menuArrow: {
    fontFamily: typography.body,
    fontSize: fontSize.lg,
    color: colors.inkLight,
  },
});
