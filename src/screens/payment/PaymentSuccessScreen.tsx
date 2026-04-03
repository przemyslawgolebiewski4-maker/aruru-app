import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';
import { Button } from '../../components/ui';
import type { AuthStackParamList } from '../../navigation/types';
import { paymentNavigateHome } from './paymentNavigateHome';

type PaymentSuccessRoute = RouteProp<AuthStackParamList, 'PaymentSuccess'>;

export default function PaymentSuccessScreen() {
  const navigation = useNavigation();
  const route = useRoute<PaymentSuccessRoute>();
  const { refresh } = useAuth();
  const type = route.params?.type ?? 'studio';

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <View style={styles.root}>
      <View style={styles.iconWrap}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>✓</Text>
        </View>
      </View>
      <Text style={styles.title}>Payment successful</Text>
      <Text style={styles.body}>
        {type === 'sponsor'
          ? 'Your sponsor subscription is now active. Welcome to the Aruru partner community.'
          : 'Your studio subscription is now active. Thank you for supporting Aruru.'}
      </Text>
      <Button
        label="Continue to Aruru"
        variant="primary"
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
  iconWrap: { marginBottom: spacing[4] },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.mossLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 32, color: colors.moss },
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
