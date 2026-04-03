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
import { Button, Input } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AuthStackParamList } from '../../navigation/types';
import {
  ApiError,
  FORGOT_PASSWORD_SUCCESS_MESSAGE,
  forgotPassword,
} from '../../services/api';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

function validateEmail(v: string): string | undefined {
  const t = v.trim().toLowerCase();
  if (!t) return 'Email is required.';
  if (!t.includes('@') || !t.includes('.')) return 'Enter a valid email address.';
  return undefined;
}

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [focused, setFocused] = useState(false);

  async function onSubmit() {
    const fe = validateEmail(email);
    setFieldError(fe ?? '');
    setSubmitError('');
    if (fe) return;

    setLoading(true);
    try {
      await forgotPassword({ email });
      setDone(true);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 502) {
        setSubmitError(
          'We could not send the email right now. Please try again in a moment.'
        );
      } else if (e instanceof Error) {
        setSubmitError(e.message);
      } else {
        setSubmitError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
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
        <View style={styles.header}>
          <Text style={styles.wordmark}>
            aru<Text style={{ color: colors.clay }}>ru</Text>
          </Text>
          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.tagline}>
            Enter the email you use for Aruru. We&apos;ll send reset instructions
            if an account exists.
          </Text>
        </View>

        {done ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{FORGOT_PASSWORD_SUCCESS_MESSAGE}</Text>
            <Button
              label="Back to sign in"
              variant="primary"
              onPress={() => navigation.navigate('Login')}
              fullWidth
              style={styles.successBtn}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setFieldError('');
                setSubmitError('');
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              autoComplete="email"
              error={fieldError}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={
                focused
                  ? { borderColor: colors.clay, borderWidth: 0.5 }
                  : undefined
              }
            />

            {submitError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{submitError}</Text>
              </View>
            ) : null}

            <Button
              label="Send reset link"
              onPress={() => void onSubmit()}
              loading={loading}
              fullWidth
            />

            <Button
              label="Back to sign in"
              variant="ghost"
              onPress={() => navigation.navigate('Login')}
              fullWidth
              style={{ marginTop: spacing[2] }}
            />
          </View>
        )}
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
  header: {
    marginBottom: spacing[8],
  },
  wordmark: {
    fontFamily: typography.display,
    fontSize: 36,
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: spacing[2],
  },
  title: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.lg,
    color: colors.ink,
    marginBottom: spacing[2],
  },
  tagline: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkLight,
    lineHeight: 22,
  },
  form: {
    marginBottom: spacing[8],
  },
  errorBox: {
    backgroundColor: colors.errorLight,
    borderRadius: radius.sm,
    padding: spacing[3],
    marginBottom: spacing[3],
  },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  successBox: {
    backgroundColor: colors.mossLight,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.mossBorder,
    padding: spacing[4],
  },
  successText: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.mossDark,
    lineHeight: 22,
    marginBottom: spacing[4],
  },
  successBtn: {
    marginTop: spacing[1],
  },
});
