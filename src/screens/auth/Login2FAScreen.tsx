import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { authLogin2faEmailSend } from '../../services/api';
import { Button, Input } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login2FA'>;

export default function Login2FAScreen({ navigation, route }: Props) {
  const { pendingToken, methods, email } = route.params;
  const { completeSignInWith2FA } = useAuth();
  const [totpCode, setTotpCode] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [error, setError] = useState('');
  const [sendHint, setSendHint] = useState('');

  const hasTotp = methods.includes('totp');
  const hasEmail = methods.includes('email');

  async function handleSendEmail() {
    setError('');
    setSendHint('');
    setSendLoading(true);
    try {
      const res = await authLogin2faEmailSend(pendingToken);
      setSendHint(res.message ?? 'Check your e-mail for a code.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not send code.');
    } finally {
      setSendLoading(false);
    }
  }

  async function submitTotp() {
    setError('');
    if (!totpCode.trim()) {
      setError('Enter the code from your authenticator app.');
      return;
    }
    setVerifyLoading(true);
    try {
      await completeSignInWith2FA(pendingToken, 'totp', totpCode);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid code.');
    } finally {
      setVerifyLoading(false);
    }
  }

  async function submitEmail() {
    setError('');
    if (!emailCode.trim()) {
      setError('Enter the code from your e-mail.');
      return;
    }
    setVerifyLoading(true);
    try {
      await completeSignInWith2FA(pendingToken, 'email', emailCode);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid or expired code.');
    } finally {
      setVerifyLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Two-step verification</Text>
        <Text style={styles.sub}>
          Sign in as <Text style={styles.emailEmph}>{email}</Text>
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {hasTotp ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Authenticator app</Text>
            <Input
              label="6-digit code"
              value={totpCode}
              onChangeText={setTotpCode}
              keyboardType="number-pad"
              maxLength={8}
              placeholder="000000"
              autoComplete="one-time-code"
            />
            <Button
              label="Verify with app"
              onPress={() => void submitTotp()}
              loading={verifyLoading}
              fullWidth
            />
          </View>
        ) : null}

        {hasEmail ? (
          <View style={[styles.section, hasTotp ? styles.sectionDivider : null]}>
            <Text style={styles.sectionTitle}>E-mail code</Text>
            <Button
              label="Send code to e-mail"
              onPress={() => void handleSendEmail()}
              loading={sendLoading}
              disabled={verifyLoading}
              variant="secondary"
              fullWidth
            />
            {sendHint ? <Text style={styles.hint}>{sendHint}</Text> : null}
            <Input
              label="Code from e-mail"
              value={emailCode}
              onChangeText={setEmailCode}
              keyboardType="number-pad"
              maxLength={8}
              placeholder="000000"
              autoComplete="one-time-code"
            />
            <Button
              label="Verify e-mail code"
              onPress={() => void submitEmail()}
              loading={verifyLoading}
              fullWidth
            />
          </View>
        ) : null}

        <Button
          label="Back to sign in"
          onPress={() => navigation.goBack()}
          variant="ghost"
          fullWidth
          style={{ marginTop: spacing[6] }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    flexGrow: 1,
    padding: spacing[6],
    paddingTop: spacing[10],
  },
  title: {
    fontFamily: typography.display,
    fontSize: 28,
    color: colors.ink,
    marginBottom: spacing[2],
  },
  sub: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkLight,
    marginBottom: spacing[6],
    lineHeight: 22,
  },
  emailEmph: {
    fontFamily: typography.bodyMedium,
    color: colors.ink,
  },
  errorBox: {
    backgroundColor: colors.errorLight,
    borderRadius: radius.sm,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  section: {
    gap: spacing[3],
  },
  sectionDivider: {
    marginTop: spacing[8],
    paddingTop: spacing[6],
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  sectionTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  hint: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.mossDark,
    lineHeight: 18,
  },
});
