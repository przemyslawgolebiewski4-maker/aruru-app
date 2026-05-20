import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AppStackParamList>;

/**
 * In-app destination for “what I want to receive” (mockup Settings → Notifications).
 * Channel toggles can be wired when the API ships; inbox is fully functional.
 */
export default function NotificationPreferencesScreen() {
  // NOTE: channel toggles pending API — placeholder is intentional
  const stackNav = useNavigation<Nav>();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.lead}>
        Choose what you want to hear about. We&apos;ll add email and push channel
        toggles here as soon as they&apos;re available in your account settings.
      </Text>
      <View style={styles.placeholderCard}>
        <Text style={styles.placeholderTitle}>Coming soon</Text>
        <Text style={styles.placeholderBody}>
          Fine-grained categories (forum, studio, events, billing) will appear
          in this screen.
        </Text>
      </View>
      <TouchableOpacity
        style={styles.inboxCta}
        onPress={() => stackNav.navigate('Notifications')}
        accessibilityRole="button"
        accessibilityLabel="Open notification inbox"
      >
        <Text style={styles.inboxCtaText}>Open notification inbox →</Text>
      </TouchableOpacity>
      <View style={{ height: spacing[10] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing[5] },
  lead: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkMid,
    lineHeight: 22,
    marginBottom: spacing[4],
  },
  placeholderCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  placeholderTitle: {
    fontFamily: typography.monoMedium,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.06,
    marginBottom: spacing[2],
  },
  placeholderBody: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkMid,
    lineHeight: 20,
  },
  inboxCta: {
    alignSelf: 'flex-start',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[1],
  },
  inboxCtaText: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.clay,
  },
});
