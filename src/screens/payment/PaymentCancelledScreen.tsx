import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';
import { Button } from '../../components/ui';
import { paymentNavigateHome } from './paymentNavigateHome';

export default function PaymentCancelledScreen() {
  const navigation = useNavigation();
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Payment cancelled</Text>
      <Text style={styles.body}>
        No charge was made. You can subscribe anytime from your studio settings.
      </Text>
      <Button
        label="Back to Aruru"
        variant="secondary"
        onPress={() => paymentNavigateHome(navigation)}
        style={styles.btn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  title: {
    fontFamily: typography.body,
    fontSize: fontSize.xl,
    color: colors.ink,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  body: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing[6],
  },
  btn: { width: '100%', maxWidth: Platform.OS === 'web' ? 400 : undefined },
});
