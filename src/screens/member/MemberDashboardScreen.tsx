import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';
import { Badge } from '../../components/ui';

export default function MemberDashboardScreen() {
  const { studios } = useAuth();
  const currentStudio =
    studios.find((s) => s.status === 'active') ?? studios[0];
  const studioLabel = currentStudio?.studioName?.trim() || 'Studio';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.studioName}>{studioLabel}</Text>
        <Badge label="Członek" variant="moss" />
      </View>
      <Text style={styles.placeholder}>Member dashboard — w budowie</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing[5], gap: spacing[4] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  studioName: {
    fontFamily: typography.bodySemiBold,
    fontSize: fontSize.xl,
    color: colors.ink,
    flex: 1,
  },
  placeholder: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkLight,
  },
});
