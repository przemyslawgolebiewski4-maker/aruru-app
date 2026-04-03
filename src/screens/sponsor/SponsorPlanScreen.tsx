import React, { useState } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apiFetch } from '../../services/api';
import { Button } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import { alertMessage } from '../../utils/confirmAction';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'SponsorPlan'>;

export default function SponsorPlanScreen(_props: Props) {
  const [loading, setLoading] = useState(false);

  async function openCheckout() {
    setLoading(true);
    try {
      const res = await apiFetch<{
        checkoutUrl?: string;
        checkout_url?: string;
      }>('/stripe/sponsor/checkout', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const url = res.checkoutUrl ?? res.checkout_url;
      if (url) void Linking.openURL(url);
      else alertMessage('Checkout', 'No checkout URL returned.');
    } catch {
      alertMessage('Error', 'Could not open checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Sponsor plans</Text>
      <Text style={styles.body}>
        Choose a subscription to activate your partner profile in the Sponsors
        directory and publish posts to the community feed.
      </Text>
      <Button
        label="Subscribe"
        onPress={() => void openCheckout()}
        loading={loading}
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
    padding: spacing[6],
    gap: spacing[4],
  },
  title: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.lg,
    color: colors.ink,
  },
  body: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkLight,
    lineHeight: 22,
  },
});
