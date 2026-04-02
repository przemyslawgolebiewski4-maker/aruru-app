import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, fontSize, spacing } from '../../../theme/tokens';

export default function SponsorsTab() {
  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <View style={styles.iconBox}>
          <View style={styles.iconInner} />
        </View>
        <Text style={styles.title}>Partners & Suppliers</Text>
        <Text style={styles.body}>
          Clay suppliers and equipment partners who support the Aruru community.
        </Text>
        <View style={styles.divider} />
        <Text style={styles.hint}>Coming in Sprint 5</Text>
        <Text style={styles.hint}>
          No ads · No tracking · Transparent sponsorship
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[3],
    maxWidth: 280,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  iconInner: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontFamily: typography.body,
    fontSize: fontSize.lg,
    color: colors.ink,
    textAlign: 'center',
  },
  body: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  divider: {
    width: 40,
    height: 0.5,
    backgroundColor: colors.border,
    marginVertical: spacing[1],
  },
  hint: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textAlign: 'center',
  },
});
