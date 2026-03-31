import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Path, Rect } from 'react-native-svg';
import { Button } from '../../components/ui';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';
import type { AuthStackParamList } from '../../navigation/types';
import { getToken } from '../../services/api';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyEmail'>;

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://aruru-production.up.railway.app';

function EnvelopeIcon() {
  return (
    <Svg width={64} height={64} viewBox="0 0 64 64">
      <Rect
        x={8}
        y={16}
        width={48}
        height={36}
        rx={4}
        fill="none"
        stroke={colors.clay}
        strokeWidth={1.5}
      />
      <Path
        d="M10 20 L32 36 L54 20"
        fill="none"
        stroke={colors.clay}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function VerifyEmailScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const [resending, setResending] = useState(false);

  async function resend() {
    setResending(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BASE_URL}/auth/resend-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Request failed' }));
        const d = err.detail;
        const msg = Array.isArray(d)
          ? d.map((x: { msg?: string }) => x.msg).join(', ')
          : typeof d === 'string'
            ? d
            : 'Could not resend email.';
        throw new Error(msg);
      }
      Alert.alert('Sent', 'Check your inbox for a new verification link.');
    } catch (e: unknown) {
      Alert.alert(
        'Resend failed',
        e instanceof Error ? e.message : 'Please try again later.'
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.inner}>
        <View style={styles.iconWrap}>
          <EnvelopeIcon />
        </View>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.body}>
          We sent a verification link to{'\n'}
          <Text style={styles.email}>{email}</Text>
          {'\n'}
          Click the link to activate your account.
        </Text>

        <View style={styles.actions}>
          <Button
            label={"I've verified — sign in"}
            onPress={() => navigation.replace('Login')}
            fullWidth
          />
          <Button
            label="Resend email"
            onPress={resend}
            variant="ghost"
            fullWidth
            loading={resending}
            style={{ marginTop: spacing[2] }}
          />
        </View>

        <Pressable
          onPress={() => navigation.navigate('Register')}
          style={styles.backLink}
        >
          <Text style={styles.backLinkText}>Wrong email? Go back</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    padding: spacing[10],
  },
  inner: {
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: spacing[6],
  },
  title: {
    fontFamily: typography.display,
    fontSize: fontSize['3xl'],
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing[4],
    letterSpacing: -0.4,
  },
  body: {
    fontFamily: typography.body,
    fontSize: fontSize.lg,
    color: colors.inkMid,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing[8],
  },
  email: {
    fontFamily: typography.bodyMedium,
    color: colors.clay,
  },
  actions: {
    width: '100%',
    maxWidth: 360,
    marginBottom: spacing[6],
  },
  backLink: {
    paddingVertical: spacing[2],
  },
  backLinkText: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.base,
    color: colors.clay,
  },
});
