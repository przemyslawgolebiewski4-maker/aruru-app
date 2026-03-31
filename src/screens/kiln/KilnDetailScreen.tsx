import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
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

type KilnItemRow = {
  userId?: string;
  memberName?: string;
  name?: string;
  weightKg?: number;
  cost?: number;
};

type KilnFiringDetail = {
  _id: string;
  kilnType: KilnType;
  firedAt: string;
  status: 'open' | 'closed';
  items?: KilnItemRow[];
  totalCost?: number;
  notes?: string;
  createdAt?: string;
  closedAt?: string;
  loggedBy?: string;
};

function typeDot(c: KilnType) {
  if (c === 'bisque') return colors.clay;
  if (c === 'glaze') return colors.moss;
  return colors.inkMid;
}

function capitalizeType(t: string) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function formatFiringDate(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
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

export default function KilnDetailScreen({ route }: { route: Route }) {
  const { tenantId, firingId } = route.params;
  const navigation = useNavigation<Nav>();
  const { studios } = useAuth();

  const studioRole = studios.find((s) => s.tenantId === tenantId)?.role;
  const isOwner = studioRole === 'owner';

  const [firing, setFiring] = useState<KilnFiringDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [closing, setClosing] = useState(false);
  const [reopening, setReopening] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [tenantId, firingId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const items = firing?.items ?? [];
  const totalKg = items.reduce((s, it) => s + (Number(it.weightKg) || 0), 0);
  const memberCount = items.length;

  function goLoadMembers() {
    if (!firing) return;
    navigation.navigate('KilnLoadMembers', {
      tenantId,
      firingId,
      kilnType: firing.kilnType,
      firedAt: firing.firedAt,
    });
  }

  async function closeSession() {
    setClosing(true);
    try {
      await apiFetch(
        `/studios/${tenantId}/kiln/firings/${firingId}/close`,
        { method: 'POST' },
        tenantId
      );
      await load();
    } catch (e: unknown) {
      Alert.alert(
        'Could not close',
        e instanceof Error ? e.message : 'Please try again.'
      );
    } finally {
      setClosing(false);
    }
  }

  function confirmClose() {
    Alert.alert(
      'Close this firing session?',
      'Costs will be calculated and added to member summaries.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Close session', onPress: closeSession },
      ]
    );
  }

  async function reopenSession() {
    setReopening(true);
    try {
      await apiFetch(
        `/studios/${tenantId}/kiln/firings/${firingId}/reopen`,
        { method: 'POST' },
        tenantId
      );
      await load();
    } catch (e: unknown) {
      Alert.alert(
        'Could not reopen',
        e instanceof Error ? e.message : 'Please try again.'
      );
    } finally {
      setReopening(false);
    }
  }

  function confirmReopen() {
    Alert.alert(
      'Reopen this session?',
      'The firing will be marked open again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reopen', onPress: reopenSession },
      ]
    );
  }

  if (loading && !firing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.clay} />
      </View>
    );
  }

  if (!firing) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Not found.'}</Text>
      </View>
    );
  }

  const isOpen = firing.status === 'open';
  const isClosed = firing.status === 'closed';

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
                { backgroundColor: typeDot(firing.kilnType) },
              ]}
            />
            <Text style={styles.typeTitle}>
              {capitalizeType(firing.kilnType)}
            </Text>
            <Text style={styles.statusDate}>
              {' · '}
              {formatFiringDate(firing.firedAt)}
            </Text>
          </View>
          <Badge
            label={firing.status}
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
            disabled={closing}
          >
            <Text style={styles.closeGhostText}>
              {closing ? 'Closing…' : 'Close session'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {isClosed && isOwner ? (
        <TouchableOpacity
          style={styles.reopenBtn}
          onPress={confirmReopen}
          disabled={reopening}
        >
          <Text style={styles.reopenText}>
            {reopening ? 'Reopening…' : 'Reopen session'}
          </Text>
        </TouchableOpacity>
      ) : null}

      <SectionLabel>{'MEMBERS & WEIGHTS'}</SectionLabel>

      {items.length === 0 ? (
        <Text style={styles.emptyItems}>No weights logged yet.</Text>
      ) : (
        items.map((it, idx) => {
          const nm =
            it.memberName?.trim() ||
            it.name?.trim() ||
            'Member';
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
