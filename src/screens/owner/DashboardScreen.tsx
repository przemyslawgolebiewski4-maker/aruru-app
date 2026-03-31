import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';

export default function DashboardScreen() {
  const { user } = useAuth();
  const name = user?.name?.trim() || 'there';

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Welcome {name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  title: {
    fontFamily: typography.display,
    fontSize: fontSize['2xl'],
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
});
