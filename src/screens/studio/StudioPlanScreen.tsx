import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apiFetch } from '../../services/api';
import { Button } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'StudioPlan'>;

type Tier = 'solo' | 'studio' | 'studio_large' | 'community';

const PLANS: {
  tier: Tier;
  name: string;
  price: string;
  members: string;
  features: string[];
  recommended?: boolean;
}[] = [
  {
    tier: 'solo',
    name: 'Solo',
    price: '€15 / month',
    members: 'Up to 5 members',
    features: [
      'Kiln management & cost tracking',
      'Task management with hour logs',
      'Events & community feed',
      'Materials catalogue',
      'Cost summaries & PDF export',
    ],
  },
  {
    tier: 'studio',
    name: 'Studio',
    price: '€29 / month',
    members: 'Up to 20 members',
    recommended: true,
    features: [
      'Everything in Solo',
      'Larger member capacity',
      'Assistant roles',
      'Attendance tracking',
    ],
  },
  {
    tier: 'studio_large',
    name: 'Aruru Studio Large',
    price: '€45 / month',
    members: 'Up to 35 members',
    features: [
      'Everything in Studio',
      'More seats for classes and members',
      'Same roles, kiln, tasks, and costs',
      'Step up before you need Community',
    ],
  },
  {
    tier: 'community',
    name: 'Community',
    price: '€59 / month',
    members: 'Up to 50 members',
    features: [
      'Everything in Aruru Studio Large',
      'Large community studios',
      'Multiple assistants',
      'Full operational suite',
    ],
  },
];

export default function StudioPlanScreen({ route }: Props) {
  const { tenantId } = route.params;
  const [selectedTier, setSelectedTier] = useState<Tier>('solo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function subscribe() {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{
        checkoutUrl?: string;
        checkout_url?: string;
      }>(
        '/stripe/studio/checkout',
        {
          method: 'POST',
          body: JSON.stringify({ tenant_id: tenantId, tier: selectedTier }),
        },
        tenantId
      );
      const url = res.checkoutUrl ?? res.checkout_url;
      if (url) {
        void Linking.openURL(url);
      } else {
        setError('Could not open checkout. Please try again.');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not open checkout.');
    } finally {
      setLoading(false);
    }
  }

  const selected = PLANS.find((p) => p.tier === selectedTier)!;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.screenTitle}>Choose your plan</Text>
      <Text style={styles.subtitle}>
        Start with a plan that fits your studio. You can upgrade anytime.
      </Text>

      {PLANS.map((plan) => (
        <TouchableOpacity
          key={plan.tier}
          style={[
            styles.planCard,
            selectedTier === plan.tier && styles.planCardSelected,
          ]}
          onPress={() => setSelectedTier(plan.tier)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedTier === plan.tier }}
        >
          <View style={styles.planHeader}>
            <View>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planMembers}>{plan.members}</Text>
            </View>
            <Text style={styles.planPrice}>{plan.price}</Text>
          </View>
          {plan.recommended ? (
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedBadgeText}>Most popular</Text>
            </View>
          ) : null}
          {plan.features.map((f) => (
            <Text key={f} style={styles.planFeature}>
              · {f}
            </Text>
          ))}
        </TouchableOpacity>
      ))}

      <Button
        label={`Subscribe to ${selected.name} — ${selected.price}`}
        onPress={() => void subscribe()}
        loading={loading}
        fullWidth
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.note}>
        Cancel anytime from your billing portal. No long-term commitment.
        14-day free trial is not affected until you subscribe.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.cream },
  scrollContent: { padding: spacing[6], paddingBottom: spacing[10] },
  screenTitle: {
    fontFamily: typography.display,
    fontSize: fontSize['2xl'],
    color: colors.ink,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkLight,
    lineHeight: 22,
    marginBottom: spacing[5],
  },
  planCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  planCardSelected: {
    borderColor: colors.clay,
    borderWidth: 1.5,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[1],
  },
  planName: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.lg,
    color: colors.ink,
  },
  planMembers: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: 2,
  },
  planPrice: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.lg,
    color: colors.clay,
  },
  recommendedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.mossLight,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: spacing[2],
  },
  recommendedBadgeText: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.moss,
  },
  planFeature: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    marginBottom: 4,
    marginTop: spacing[2],
  },
  error: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing[3],
  },
  note: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing[3],
    paddingHorizontal: spacing[4],
  },
});
