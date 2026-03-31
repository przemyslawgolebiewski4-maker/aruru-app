import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Avatar, Badge, Button, SectionLabel } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import type { KilnType } from './KilnListScreen';

type Nav = NativeStackNavigationProp<AppStackParamList, 'KilnDetail'>;
type Route = RouteProp<AppStackParamList, 'KilnDetail'>;

type KilnItemRow = Partial<{
  userId: string;
  memberName: string;
  member_name: string;
  name: string;
  weightKg: number;
  cost: number;
}>;

/** API may use camelCase or snake_case; most fields optional. */
type KilnFiringDetail = Partial<{
  _id: string;
  kilnType: KilnType;
  kiln_type: string;
  firingType: string;
  firedAt: string;
  fired_at: string;
  scheduledAt: string;
  scheduled_at: string;
  status: string;
  items: KilnItemRow[];
  totalCost: number;
  notes: string;
  createdAt: string;
  closedAt: string;
  loggedBy: string;
}>;

function typeDot(c: string) {
  const k = (c || '').toLowerCase();
  if (k === 'bisque') return colors.clay;
  if (k === 'glaze') return colors.moss;
  return colors.inkMid;
}

function formatFiringDate(iso: string) {
  const s = iso || '';
  if (!s) return '';
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return s;
  }
}

function rawKilnType(f: KilnFiringDetail | null | undefined): string {
  return String(f?.kiln_type || f?.firingType || f?.kilnType || '');
}

function kilnTypeLabel(f: KilnFiringDetail | null | undefined): string {
  const raw = rawKilnType(f);
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : '';
}

function kilnTypeForNav(f: KilnFiringDetail | null | undefined): KilnType {
  const k = rawKilnType(f).toLowerCase();
  if (k === 'bisque' || k === 'glaze' || k === 'private') return k;
  return 'bisque';
}

function itemMemberLabel(item: KilnItemRow | undefined): string {
  const nm =
    item?.memberName?.trim() ||
    item?.member_name?.trim() ||
    item?.name?.trim() ||
    '';
  return nm || 'Unknown member';
}

function parseFiring(data: unknown): KilnFiringDetail | null {
  if (data && typeof data === 'object' && '_id' in data) {
    return data as KilnFiringDetail;
  }
  if (data && typeof data === 'object' && 'firing' in data) {
    const f = (data as { firing?: KilnFiringDetail }).firing;
    return f ?? null;
  }
  return null;
}

/** On web, `Alert.alert` is often a no-op — use the browser confirm dialog. */
function confirmAction(
  title: string,
  message: string,
  cancelLabel: string,
  confirmLabel: string,
  onConfirm: () => void
) {
  if (Platform.OS === 'web') {
    const g = globalThis as typeof globalThis & { window?: Window };
    const ok =
      typeof g.window !== 'undefined' &&
      g.window.confirm(`${title}\n\n${message}`);
    if (ok) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, onPress: onConfirm },
  ]);
}

export default function KilnDetailScreen({ route }: { route: Route }) {
  const { tenantId, firingId } = route.params;
  const navigation = useNavigation<Nav>();
  const { studios } = useAuth();

  const studioRole = studios.find((s) => s.tenantId === tenantId)?.role;
  const isOwner = studioRole === 'owner';

  const [firing, setFiring] = useState<KilnFiringDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFiring = useCallback(async () => {
    setError('');
    try {
      const data = await apiFetch<unknown>(
        `/studios/${tenantId}/kiln/firings/${firingId}`,
        {},
        tenantId
      );
      const f = parseFiring(data);
      setFiring(f);
      if (!f) setError('Invalid firing data.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load firing.');
      setFiring(null);
    }
  }, [tenantId, firingId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await loadFiring();
    } finally {
      setLoading(false);
    }
  }, [loadFiring]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const items = firing?.items ?? [];
  const totalKg = items.reduce((s, it) => s + (Number(it.weightKg) || 0), 0);
  const memberCount = items.length;

  function scheduleLabel(f: KilnFiringDetail) {
    return (
      f.scheduledAt ??
      f.scheduled_at ??
      f.firedAt ??
      f.fired_at ??
      ''
    );
  }

  function goLoadMembers() {
    if (!firing) return;
    navigation.navigate('KilnLoadMembers', {
      tenantId,
      firingId,
      kilnType: kilnTypeForNav(firing),
      scheduledAt: scheduleLabel(firing),
    });
  }

  async function handleClose() {
    try {
      setLoading(true);
      await apiFetch(
        `/studios/${tenantId}/kiln/firings/${firingId}/close`,
        { method: 'POST', body: JSON.stringify({}) },
        tenantId
      );
      await loadFiring();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to close session');
    } finally {
      setLoading(false);
    }
  }

  function confirmClose() {
    confirmAction(
      'Close this firing session?',
      'Costs will be calculated and added to member summaries.',
      'Cancel',
      'Close session',
      () => {
        void handleClose();
      }
    );
  }

  async function handleReopen() {
    try {
      setLoading(true);
      await apiFetch(
        `/studios/${tenantId}/kiln/firings/${firingId}/reopen`,
        { method: 'POST', body: JSON.stringify({}) },
        tenantId
      );
      await loadFiring();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to reopen session');
    } finally {
      setLoading(false);
    }
  }

  function confirmReopen() {
    confirmAction(
      'Reopen this session?',
      'The firing will be marked open again.',
      'Cancel',
      'Reopen',
      () => {
        void handleReopen();
      }
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.clay} />
      </View>
    );
  }

  if (!firing) {
    if (error) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || 'Not found.'}</Text>
        </View>
      );
    }
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.clay} />
      </View>
    );
  }

  const statusStr = (firing.status || '').toLowerCase();
  const isOpen = statusStr === 'open';
  const isClosed = statusStr === 'closed';

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={[
          styles.statusCard,
          isOpen
            ? { backgroundColor: colors.clayLight }
            : { backgroundColor: colors.mossLight },
        ]}
      >
        <View style={styles.statusTop}>
          <View style={styles.typeTitleRow}>
            <View
              style={[
                styles.headerDot,
                { backgroundColor: typeDot(rawKilnType(firing)) },
              ]}
            />
            <Text style={styles.typeTitle}>{kilnTypeLabel(firing)}</Text>
            <Text style={styles.statusDate}>
              {' · '}
              {formatFiringDate(scheduleLabel(firing))}
            </Text>
          </View>
          <Badge
            label={firing.status || ''}
            variant={isOpen ? 'open' : 'neutral'}
          />
        </View>

        <View style={styles.pillRow}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{memberCount} members</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{totalKg.toFixed(1)} kg total</Text>
          </View>
          {isClosed && firing.totalCost != null ? (
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                €{Number(firing.totalCost).toFixed(2)} total
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

      {isOpen ? (
        <View style={styles.btnRow}>
          <View style={styles.btnFlex}>
            <Button
              label="Add / edit weights"
              variant="primary"
              onPress={goLoadMembers}
              fullWidth
            />
          </View>
          <TouchableOpacity
            style={styles.closeGhost}
            onPress={confirmClose}
            disabled={loading}
          >
            <Text style={styles.closeGhostText}>Close session</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {isClosed && isOwner ? (
        <TouchableOpacity
          style={styles.reopenBtn}
          onPress={confirmReopen}
          disabled={loading}
        >
          <Text style={styles.reopenText}>Reopen session</Text>
        </TouchableOpacity>
      ) : null}

      <SectionLabel>{'MEMBERS & WEIGHTS'}</SectionLabel>

      {items.length === 0 ? (
        <Text style={styles.emptyItems}>No weights logged yet.</Text>
      ) : (
        items.map((it, idx) => {
          const nm = itemMemberLabel(it);
          return (
            <View
              key={`${it.userId ?? idx}`}
              style={[
                styles.itemRow,
                idx < items.length - 1 && styles.itemRowBorder,
              ]}
            >
              <Avatar name={nm} size="sm" />
              <Text style={styles.itemName} numberOfLines={1}>
                {nm}
              </Text>
              <View style={styles.itemRight}>
                <Text style={styles.itemKg}>
                  {Number(it.weightKg ?? 0).toFixed(1)} kg
                </Text>
                {isClosed && it.cost != null ? (
                  <Text style={styles.itemCost}>
                    €{Number(it.cost).toFixed(2)}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })
      )}

      {firing.notes?.trim() ? (
        <>
          <View style={{ height: spacing[4] }} />
          <SectionLabel>NOTES</SectionLabel>
          <Text style={styles.notesBody}>{firing.notes.trim()}</Text>
        </>
      ) : null}

      <View style={{ height: spacing[10] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing[5], paddingBottom: spacing[10] },
  centered: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
  },
  statusCard: {
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    marginBottom: spacing[4],
  },
  statusTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  typeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },
  headerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing[2],
  },
  typeTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  statusDate: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  pill: {
    backgroundColor: colors.cream,
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
  },
  pillText: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkMid,
  },
  errorBanner: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing[2],
  },
  btnRow: {
    marginBottom: spacing[4],
    gap: spacing[3],
  },
  btnFlex: { width: '100%' },
  closeGhost: {
    paddingVertical: 11,
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.moss,
    alignItems: 'center',
  },
  closeGhostText: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.base,
    color: colors.moss,
  },
  reopenBtn: {
    marginBottom: spacing[4],
    paddingVertical: 11,
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  reopenText: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.base,
    color: colors.clay,
  },
  emptyItems: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    marginTop: spacing[1],
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  itemRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  itemName: {
    flex: 1,
    marginLeft: 10,
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  itemRight: { alignItems: 'flex-end' },
  itemKg: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.clayDark,
  },
  itemCost: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.mossDark,
    marginTop: 2,
  },
  notesBody: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkMid,
    lineHeight: 22,
    marginTop: spacing[1],
  },
});
