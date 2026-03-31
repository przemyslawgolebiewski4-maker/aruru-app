import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';

function BellIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48">
      <Path
        d="M22 10c0-1.1.9-2 2-2s2 .9 2 2v1.1c3.5.5 6 3.5 6 7.1v5l2 3H12l2-3v-5c0-3.6 2.5-6.6 6-7.1V10z"
        fill="none"
        stroke={colors.clay}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path
        d="M18 36h12"
        stroke={colors.clay}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M21 36a3 3 0 006 0"
        fill="none"
        stroke={colors.clay}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function NotificationsScreen() {
  return (
    <View style={styles.root}>
      <View style={styles.iconWrap}>
        <BellIcon />
      </View>
      <Text style={styles.title}>Notifications</Text>
      <Text style={styles.body}>You&apos;re all caught up.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[10],
  },
  iconWrap: {
    marginBottom: spacing[5],
  },
  title: {
    fontFamily: typography.display,
    fontSize: 24,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing[3],
    letterSpacing: -0.3,
  },
  body: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkLight,
    textAlign: 'center',
    lineHeight: 22,
  },
});
