import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { SectionLabel } from '../../components/ui';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import {
  getMemberDashboardSettings,
  patchMemberDashboardSettings,
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { alertMessage } from '../../utils/confirmAction';

type Route = RouteProp<AppStackParamList, 'MemberDashboardSettings'>;

const SECTION_LABELS: Record<string, string> = {
  events: 'Events',
  bookings: 'Bookings',
  kiln: 'Kilns',
  materials: 'Materials',
  costs: 'Costs & billing',
  tasks: 'Tasks',
  privateKilns: 'Private kilns',
  membershipPlans: 'Membership plans',
};

function labelForKey(key: string): string {
  if (SECTION_LABELS[key]) return SECTION_LABELS[key];
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export default function MemberDashboardSettingsScreen({
  route,
}: {
  route: Route;
}) {
  const { tenantId } = route.params;
  const { studios } = useAuth();
  const membership = studios.find((s) => s.tenantId === tenantId);
  const isOwner =
    membership?.role === 'owner' && membership?.status === 'active';

  const [sectionKeys, setSectionKeys] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patchingKey, setPatchingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isOwner) {
      setLoading(false);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await getMemberDashboardSettings(tenantId);
      setSectionKeys(res.sectionKeys);
      setVisibility({ ...res.visibility });
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Could not load settings.'
      );
    } finally {
      setLoading(false);
    }
  }, [tenantId, isOwner]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function toggleKey(key: string) {
    if (!isOwner || patchingKey) return;
    const next = !visibility[key];
    setPatchingKey(key);
    setVisibility((v) => ({ ...v, [key]: next }));
    try {
      const res = await patchMemberDashboardSettings(tenantId, { [key]: next });
      setSectionKeys(res.sectionKeys);
      setVisibility({ ...res.visibility });
    } catch (e: unknown) {
      setVisibility((v) => ({ ...v, [key]: !next }));
      alertMessage(
        'Error',
        e instanceof Error ? e.message : 'Could not save.'
      );
    } finally {
      setPatchingKey(null);
    }
  }

  const orderedKeys = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const k of sectionKeys) {
      if (k && !seen.has(k)) {
        seen.add(k);
        out.push(k);
      }
    }
    for (const k of Object.keys(visibility)) {
      if (!seen.has(k)) out.push(k);
    }
    return out;
  }, [sectionKeys, visibility]);

  if (!isOwner) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>
          Only the studio owner can change what members see on their dashboard.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.clay} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.lead}>
        Choose which sections and shortcuts members (role &quot;member&quot;)
        see on the studio dashboard. Assistants and the owner always see the
        full staff view.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <SectionLabel>Section visibility</SectionLabel>

      {orderedKeys.length === 0 ? (
        <Text style={styles.muted}>
          No sections returned yet — refresh after the backend is updated.
        </Text>
      ) : (
        orderedKeys.map((key) => {
          const on = visibility[key] !== false;
          const busy = patchingKey === key;
          return (
            <View key={key} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{labelForKey(key)}</Text>
                <Text style={styles.rowKey}>{key}</Text>
              </View>
              <TouchableOpacity
                onPress={() => void toggleKey(key)}
                disabled={busy}
                accessibilityRole="switch"
                accessibilityState={{ checked: on }}
                style={[styles.toggle, on && styles.toggleOn]}
                activeOpacity={0.75}
              >
                <View
                  style={[styles.toggleThumb, on && styles.toggleThumbOn]}
                />
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing[6], paddingBottom: spacing[10] },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
    backgroundColor: colors.surface,
  },
  lead: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkMid,
    lineHeight: 22,
    marginBottom: spacing[5],
  },
  error: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing[3],
  },
  muted: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    gap: spacing[3],
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  rowKey: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
    marginTop: 2,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: colors.moss,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },
});
