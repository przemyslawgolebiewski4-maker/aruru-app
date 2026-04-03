import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../services/api';
import {
  alertMessage,
  confirmDestructive,
  confirmNeutral,
  pickTrialExtensionDays,
} from '../../utils/confirmAction';
import { Button } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';

type Studio = {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  subscriptionStatus: string;
  subscriptionTier: string;
  memberCount: number;
  trialEndsAt?: string;
  stripeCustomerId?: string;
  createdAt?: string;
};

function statusColor(s: string): string {
  if (s === 'active') return colors.moss;
  if (s === 'trial') return colors.clay;
  if (s === 'past_due') return colors.error;
  if (s === 'suspended') return colors.error;
  if (s === 'cancelled') return colors.inkLight;
  return colors.inkLight;
}

function timeLeft(iso?: string): string {
  if (!iso) return '';
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days <= 0) return 'expired';
  return `${days}d left`;
}

export default function AdminStudiosScreen() {
  const { studios } = useAuth();
  const tenantId =
    (studios.find((s) => s.status === 'active') ?? studios[0])?.tenantId ?? '';

  const [list, setList] = useState<Studio[]>([]);
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
      const res = await apiFetch<{ studios: Studio[] }>(
        `/admin/studios${qs}`,
        {},
        tenantId
      );
      setList(res.studios ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load studios.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, tenantId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function extendTrial(studio: Studio) {
    const days = await pickTrialExtensionDays(studio.name);
    if (days == null) return;
    await patchStudio(studio.id, { extendTrialDays: days });
  }

  async function patchStudio(id: string, body: object) {
    try {
      await apiFetch(
        `/admin/studios/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        },
        tenantId
      );
      await load();
    } catch (e: unknown) {
      alertMessage(
        'Error',
        e instanceof Error ? e.message : 'Could not update studio.'
      );
    }
  }

  async function suspendStudio(studio: Studio) {
    const ok = await confirmDestructive(
      'Suspend studio',
      `Suspend ${studio.name}? Owner will lose access.`,
      'Suspend'
    );
    if (!ok) return;
    await patchStudio(studio.id, { subscriptionStatus: 'suspended' });
  }

  /** No separate unsuspend route: PATCH accepts subscriptionStatus (same as suspend). */
  async function reactivateStudio(studio: Studio) {
    const ok = await confirmNeutral(
      'Reactivate studio',
      `Restore access for ${studio.name}? The owner will be able to use the studio again.`,
      'Reactivate'
    );
    if (!ok) return;
    await patchStudio(studio.id, { subscriptionStatus: 'active' });
  }

  function openStripeCustomer(studio: Studio) {
    const id = studio.stripeCustomerId?.trim();
    if (!id) return;
    const url = `https://dashboard.stripe.com/customers/${encodeURIComponent(id)}`;
    void Linking.openURL(url);
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
          style={styles.list}
          data={list}
          keyExtractor={(s) => s.id}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item: s }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={styles.studioName}>{s.name}</Text>
                  <Text style={styles.studioEmail}>{s.ownerEmail}</Text>
                  <Text style={styles.studioMeta}>
                    {s.memberCount} members · {s.subscriptionTier}
                    {s.trialEndsAt ? ` · ${timeLeft(s.trialEndsAt)}` : ''}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusColor(s.subscriptionStatus) + '22' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: statusColor(s.subscriptionStatus) },
                    ]}
                  >
                    {s.subscriptionStatus}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                {s.subscriptionStatus === 'trial' && (
                  <Button
                    label="Extend trial"
                    variant="secondary"
                    onPress={() => void extendTrial(s)}
                  />
                )}
                {s.stripeCustomerId ? (
                  <Button
                    label="Open in Stripe ↗"
                    variant="secondary"
                    onPress={() => openStripeCustomer(s)}
                  />
                ) : null}
                {s.subscriptionStatus === 'suspended' ? (
                  <Button
                    label="Reactivate"
                    variant="secondary"
                    onPress={() => void reactivateStudio(s)}
                  />
                ) : (
                  <Button
                    label="Suspend"
                    variant="danger"
                    onPress={() => void suspendStudio(s)}
                  />
                )}
              </View>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  sep: { height: 0.5, backgroundColor: colors.border },
  card: {
    backgroundColor: colors.surface,
    padding: spacing[4],
    gap: spacing[2],
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: { flex: 1, gap: 2 },
  studioName: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  studioEmail: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  studioMeta: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  statusBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusText: { fontFamily: typography.mono, fontSize: 9 },
  actions: { flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' },
});
