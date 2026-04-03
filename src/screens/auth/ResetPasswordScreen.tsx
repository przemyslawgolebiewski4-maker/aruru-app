import React, { useMemo, useState } from 'react';
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
import { ApiError, resetPassword } from '../../services/api';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

function normalizeToken(raw?: string): string | undefined {
  if (raw == null || !String(raw).trim()) return undefined;
  const t = String(raw).trim();
  try {
    return decodeURIComponent(t);
  } catch {
    return t;
  }
}

function validatePassword(v: string): string | undefined {
  if (!v) return 'Password is required.';
  if (v.length < 8) return 'Password must be at least 8 characters.';
  return undefined;
}

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const token = useMemo(
    () => normalizeToken(route.params?.token),
    [route.params?.token]
  );

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<'pw' | 'cf' | null>(null);

  async function onSubmit() {
    if (!token) return;

    const pe = validatePassword(password);
    setPwError(pe ?? '');
    let ce: string | undefined;
    if (password !== confirm) {
      ce = 'Passwords do not match.';
    }
    setConfirmError(ce ?? '');
    setSubmitError('');
    if (pe || ce) return;

    setLoading(true);
    try {
      await resetPassword({ token, new_password: password });
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login', params: { passwordResetBanner: true } }],
      });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 400) {
        setSubmitError(
          e.message ||
            'This reset link is invalid or has expired. Request a new one below.'
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

  if (!token) {
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
            <Text style={styles.title}>Reset link missing</Text>
            <Text style={styles.tagline}>
              Open the link from your email, or request a new password reset.
            </Text>
          </View>
          <Button
            label="Request reset email"
            variant="primary"
            onPress={() => navigation.navigate('ForgotPassword')}
            fullWidth
          />
          <Button
            label="Back to sign in"
            variant="ghost"
            onPress={() => navigation.navigate('Login')}
            fullWidth
            style={{ marginTop: spacing[2] }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
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
          <Text style={styles.title}>Choose a new password</Text>
          <Text style={styles.tagline}>
            At least 8 characters, same as when you registered.
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="New password"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setPwError('');
              setSubmitError('');
            }}
            secureTextEntry
            placeholder="••••••••"
            autoComplete="password-new"
            error={pwError}
            onFocus={() => setFocused('pw')}
            onBlur={() => setFocused(null)}
            style={
              focused === 'pw'
                ? { borderColor: colors.clay, borderWidth: 0.5 }
                : undefined
            }
          />
          <Input
            label="Confirm password"
            value={confirm}
            onChangeText={(t) => {
              setConfirm(t);
              setConfirmError('');
              setSubmitError('');
            }}
            secureTextEntry
            placeholder="••••••••"
            autoComplete="password-new"
            error={confirmError}
            onFocus={() => setFocused('cf')}
            onBlur={() => setFocused(null)}
            style={
              focused === 'cf'
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
            label="Save password"
            onPress={() => void onSubmit()}
            loading={loading}
            fullWidth
          />

          <Button
            label="Send reset email again"
            variant="ghost"
            onPress={() => navigation.navigate('ForgotPassword')}
            fullWidth
            style={{ marginTop: spacing[2] }}
          />

          <Button
            label="Back to sign in"
            variant="ghost"
            onPress={() => navigation.navigate('Login')}
            fullWidth
            style={{ marginTop: spacing[1] }}
          />
        </View>
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
});
