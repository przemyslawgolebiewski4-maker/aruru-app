import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';

export default function EditProfileScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Edit profile</Text>
      <Text style={styles.body}>This screen is a placeholder for a future sprint.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  title: {
    fontFamily: typography.display,
    fontSize: fontSize['2xl'],
    color: colors.ink,
    marginBottom: spacing[3],
    letterSpacing: -0.3,
  },
  body: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkMid,
    textAlign: 'center',
    lineHeight: 22,
  },
});
