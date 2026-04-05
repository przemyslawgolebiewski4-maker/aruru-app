import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRoute } from '@react-navigation/native';
import { useAuth, TwoFactorRequiredError } from '../../hooks/useAuth';
import { Button, Input } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AuthStackParamList } from '../../navigation/types';
type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const route = useRoute<Props['route']>();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (e: unknown) {
      if (e instanceof TwoFactorRequiredError) {
        navigation.navigate('Login2FA', {
          pendingToken: e.pendingToken,
          methods: e.methods?.length ? e.methods : ['totp', 'email'],
          email: email.trim().toLowerCase(),
        });
        return;
      }
      setError(e instanceof Error ? e.message : 'Login failed. Please try again.');
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
          <Text style={styles.tagline}>
            Studio management for ceramic artists.
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            autoComplete="email"
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
            style={
              focused === 'email'
                ? { borderColor: colors.clay, borderWidth: 0.5 }
                : undefined
            }
          />
          <View style={styles.passwordBlock}>
            <Text style={styles.passwordLabel}>Password</Text>
            <View
              style={[
                styles.passwordField,
                focused === 'password' && styles.passwordFieldFocused,
              ]}
            >
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.inkLight}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? 'Hide password' : 'Show password'
                }
              >
                <Text style={styles.eyeIcon}>
                  {showPassword ? '●' : '○'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button
            label="Sign in"
            onPress={handleLogin}
            loading={loading}
            fullWidth
          />

          <Button
            label="Forgot password?"
            onPress={() => navigation.navigate('ForgotPassword')}
            variant="ghost"
            fullWidth
            style={{ marginTop: spacing[2] }}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don&apos;t have an account? </Text>
          <Text
            style={styles.footerLink}
            onPress={() => navigation.navigate('Register')}
          >
            Create one
          </Text>
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
    justifyContent: 'center',
  },
  header: {
    marginBottom: spacing[10],
  },
  wordmark: {
    fontFamily: typography.display,
    fontSize: 36,
    color: colors.ink,
    letterSpacing: -0.5,
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
  passwordBlock: {
    marginBottom: spacing[4],
  },
  passwordLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  passwordField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  passwordFieldFocused: {
    borderColor: colors.clay,
    borderWidth: 0.5,
  },
  passwordInput: {
    flex: 1,
    padding: spacing[3],
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  eyeBtn: { padding: spacing[3] },
  eyeIcon: { fontSize: 16, color: colors.inkLight },
  resetBanner: {
    backgroundColor: colors.mossLight,
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.mossBorder,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  resetBannerText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.mossDark,
    lineHeight: 20,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  footerText: {
    fontFamily: typography.body,
    fontSize: fontSize.base,
    color: colors.inkLight,
  },
  footerLink: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.base,
    color: colors.clay,
  },
});
