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

type Props = NativeStackScreenProps<AppStackParamList, 'SponsorPlan'>;

const BASIC_FEATURES = [
  '1 post per month',
  'Partner profile in directory',
  'Logo on your posts',
  'Logo in aruru.xyz footer',
  'Stats - clicks and profile views',
] as const;

const STANDARD_FEATURES = [
  '2 posts per month',
  'Partner profile in directory',
  'Logo on your posts',
  'Logo in aruru.xyz footer',
  'Stats - clicks and profile views',
  'Country filter - reach studios you ship to',
] as const;

export default function SponsorPlanScreen(_props: Props) {
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'standard'>(
    'basic'
  );
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
        '/stripe/sponsor/checkout',
        {
          method: 'POST',
          body: JSON.stringify({ plan: selectedPlan }),
        },
        ''
      );
      const url = res.checkoutUrl ?? res.checkout_url;
      if (url) {
        void Linking.openURL(url);
      } else {
        setError('Could not open checkout. Please try again.');
      }
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Could not open checkout.'
      );
    } finally {
      setLoading(false);
    }
  }

  const planLabel = selectedPlan === 'basic' ? 'Basic' : 'Standard';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.screenTitle}>Choose your plan</Text>
      <Text style={styles.subtitle}>
        Reach ceramicists across Europe. Both plans include your logo in the
        aruru.xyz footer.
      </Text>

      <TouchableOpacity
        style={[
          styles.planCard,
          selectedPlan === 'basic' && styles.planCardSelected,
        ]}
        onPress={() => setSelectedPlan('basic')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityState={{ selected: selectedPlan === 'basic' }}
      >
        <Text style={styles.planName}>Basic</Text>
        <Text style={styles.planPrice}>€15 / month</Text>
        {BASIC_FEATURES.map((line) => (
          <Text key={line} style={styles.planFeature}>
            · {line}
          </Text>
        ))}
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.planCard,
          selectedPlan === 'standard' && styles.planCardSelected,
        ]}
        onPress={() => setSelectedPlan('standard')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityState={{ selected: selectedPlan === 'standard' }}
      >
        <Text style={styles.planName}>Standard</Text>
        <Text style={styles.planPrice}>€29 / month</Text>
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>Most popular</Text>
        </View>
        {STANDARD_FEATURES.map((line) => (
          <Text key={line} style={styles.planFeature}>
            · {line}
          </Text>
        ))}
      </TouchableOpacity>

      <Button
        label={`Subscribe to ${planLabel}`}
        onPress={() => void subscribe()}
        loading={loading}
        fullWidth
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.note}>
        You can cancel anytime from your Stripe billing portal. No long-term
        commitment.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scrollContent: {
    padding: spacing[6],
    paddingBottom: spacing[10],
  },
  screenTitle: {
    fontFamily: typography.bodyMedium,
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
  planName: {
    fontFamily: typography.body,
    fontSize: fontSize.lg,
    color: colors.ink,
    marginBottom: spacing[1],
  },
  planPrice: {
    fontFamily: typography.body,
    fontSize: fontSize.xl,
    color: colors.clay,
    marginBottom: spacing[2],
  },
  planFeature: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    marginBottom: 4,
  },
  popularBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.mossLight,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: spacing[2],
    marginTop: spacing[1],
  },
  popularBadgeText: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.moss,
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
    marginTop: spacing[2],
    paddingHorizontal: spacing[4],
  },
});
