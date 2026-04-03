import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';

const TITLES: Record<string, string> = {
  AdminStudios: 'Studios',
  AdminSponsors: 'Sponsors',
  AdminForum: 'Community',
  AdminAdmins: 'Admins',
  AdminPricing: 'Pricing',
  AdminUsers: 'Users',
};

export default function AdminSectionPlaceholder() {
  const route = useRoute();
  const title = TITLES[route.name] ?? route.name;
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
    padding: spacing[4],
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[2],
  },
  title: {
    fontFamily: typography.body,
    fontSize: fontSize.lg,
    color: colors.ink,
  },
  sub: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.inkLight,
  },
});
