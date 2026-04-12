import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../services/api';
import { Button } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import { alertMessage } from '../../utils/confirmAction';

type Tier = { maxMembers: number | null; priceMonthly: number };
type PricingData = { tiers: Record<string, Tier>; sponsorNote: string };

const TIER_ORDER = ['solo', 'studio', 'community'] as const;
const TIER_LABELS: Record<string, string> = {
  solo: 'Solo (up to 20 members)',
  studio: 'Studio (up to 50 members)',
  community: 'Community (unlimited)',
};

export default function AdminPricingScreen() {
  const { studios } = useAuth();
  const tenantId =
    (studios.find((s) => s.status === 'active') ?? studios[0])?.tenantId ?? '';
  const [data, setData] = useState<PricingData | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<PricingData>('/admin/pricing', {}, tenantId);
      setData(res);
      const p: Record<string, string> = {};
      TIER_ORDER.forEach((k) => {
        p[k] = String(res.tiers[k]?.priceMonthly ?? '');
      });
      setPrices(p);
      setNote(res.sponsorNote ?? '');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load pricing.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function save() {
    if (!data) return;
    setSaving(true);
    try {
      const tiers: Record<string, Tier> = {};
      TIER_ORDER.forEach((k) => {
        tiers[k] = {
          ...(data.tiers[k] ?? { maxMembers: null, priceMonthly: 0 }),
          priceMonthly: parseFloat(prices[k] ?? '') || 0,
        };
      });
      await apiFetch(
        '/admin/pricing',
        {
          method: 'PATCH',
          body: JSON.stringify({ tiers, sponsorNote: note }),
        },
        tenantId
      );
      alertMessage(
        'Saved',
        'Pricing updated. New prices apply to new subscriptions.'
      );
      await load();
    } catch (e: unknown) {
      alertMessage(
        'Error',
        e instanceof Error ? e.message : 'Could not save.'
      );
    } finally {
      setSaving(false);
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
        <Text style={styles.sectionLabel}>Subscription tiers</Text>
        <Text style={styles.hint}>
          Changes apply to new subscriptions only. Existing subscribers keep
          their current price.
        </Text>
        {TIER_ORDER.map((key) => (
          <View key={key} style={styles.tierRow}>
            <View style={styles.tierInfo}>
              <Text style={styles.tierName}>{TIER_LABELS[key]}</Text>
            </View>
            <View style={styles.priceInput}>
              <Text style={styles.currency}>€</Text>
              <TextInput
                style={styles.input}
                value={prices[key] ?? ''}
                onChangeText={(v) => setPrices({ ...prices, [key]: v })}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.inkLight}
              />
              <Text style={styles.perMonth}>/mo</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Sponsor note</Text>
        <Text style={styles.hint}>Visible in Community → Sponsors tab.</Text>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Thanks to our sponsors, prices remain unchanged in Q2 2026."
          placeholderTextColor={colors.inkLight}
          multiline
          numberOfLines={3}
        />
      </View>
      <View style={styles.actions}>
        <Button
          label="Save changes"
          variant="primary"
          onPress={() => void save()}
          loading={saving}
          fullWidth
        />
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
  section: { padding: spacing[4], gap: spacing[2] },
  sectionLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hint: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    lineHeight: 18,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing[3],
  },
  tierInfo: { flex: 1 },
  tierName: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currency: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.inkLight,
  },
  input: {
    width: 56,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing[1],
    paddingHorizontal: spacing[2],
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.ink,
    textAlign: 'right',
    backgroundColor: colors.cream,
  },
  perMonth: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  noteInput: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing[3],
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
    backgroundColor: colors.surface,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  actions: { paddingHorizontal: spacing[4] },
});
