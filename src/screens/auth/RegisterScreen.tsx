import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Linking,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { Button, Input } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

type FieldKey = 'name' | 'email';

function validateName(v: string): string | undefined {
  const t = v.trim();
  if (!t) return 'Name is required.';
  if (t.length < 2) return 'Name must be at least 2 characters.';
  return undefined;
}

function validateEmail(v: string): string | undefined {
  const t = v.trim().toLowerCase();
  if (!t) return 'Email is required.';
  if (!t.includes('@') || !t.includes('.')) return 'Enter a valid email address.';
  return undefined;
}

export default function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>(
    {}
  );
  const [focused, setFocused] = useState<
    FieldKey | 'password' | 'confirmPassword' | null
  >(null);
  const [isSponsor, setIsSponsor] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsError, setTermsError] = useState('');
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('invite_token');
      if (token) setInviteToken(token);
    }
  }, []);

  function runValidation(): boolean {
    const next: Partial<Record<FieldKey, string>> = {
      name: validateName(name),
      email: validateEmail(email),
    };
    setFieldErrors(next);
    return !next.name && !next.email;
  }

  async function handleRegister() {
    setError('');
    setPasswordError('');
    if (!agreedToTerms) {
      setTermsError('You must accept the Privacy Policy and Terms of Service.');
      return;
    }
    setTermsError('');
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    setPasswordError('');
    if (!runValidation()) return;

    setLoading(true);
    try {
      await signUp(email.trim().toLowerCase(), password, name.trim(), {
        is_sponsor: isSponsor,
      });
      navigation.navigate('VerifyEmail', { email: email.trim().toLowerCase() });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Registration failed.');
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
          <Text style={styles.subtitle}>Create your account</Text>
          <Text style={styles.tagline}>
            One profile. Connect with studios, track your ceramics.
          </Text>
        </View>

        <View style={styles.form}>
          {inviteToken ? (
            <View style={styles.inviteBanner}>
              <Text style={styles.inviteBannerText}>
                You have a studio invitation waiting. Create your account to
                join.
              </Text>
            </View>
          ) : null}
          <Input
            label="Full name"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (fieldErrors.name) setFieldErrors((f) => ({ ...f, name: undefined }));
            }}
            placeholder="Anna Nowak"
            autoComplete="name"
            autoCapitalize="words"
            error={fieldErrors.name}
            onFocus={() => setFocused('name')}
            onBlur={() => setFocused(null)}
            style={
              focused === 'name'
                ? { borderColor: colors.clay, borderWidth: 0.5 }
                : undefined
            }
          />
          <Input
            label="Email"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }));
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            autoComplete="email"
            error={fieldErrors.email}
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
                onChangeText={(t) => {
                  setPassword(t);
                  setPasswordError('');
                }}
                secureTextEntry={!showPassword}
                placeholder="Min. 8 characters"
                placeholderTextColor={colors.inkLight}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
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

          <View style={styles.passwordBlock}>
            <Text style={styles.passwordLabel}>Confirm password</Text>
            <View
              style={[
                styles.passwordField,
                focused === 'confirmPassword' && styles.passwordFieldFocused,
              ]}
            >
              <TextInput
                style={styles.passwordInput}
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  setPasswordError('');
                }}
                secureTextEntry={!showConfirm}
                placeholder="Repeat password"
                placeholderTextColor={colors.inkLight}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                onFocus={() => setFocused('confirmPassword')}
                onBlur={() => setFocused(null)}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowConfirm(!showConfirm)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={
                  showConfirm ? 'Hide confirm password' : 'Show confirm password'
                }
              >
                <Text style={styles.eyeIcon}>
                  {showConfirm ? '●' : '○'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {passwordError ? (
            <Text style={styles.passwordErrorText}>{passwordError}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.sponsorToggle}
            onPress={() => setIsSponsor(!isSponsor)}
            activeOpacity={0.8}
            accessibilityRole="switch"
            accessibilityState={{ checked: isSponsor }}
          >
            <View style={styles.sponsorToggleLeft}>
              <Text style={styles.sponsorToggleLabel}>
                I represent a supplier
              </Text>
              <Text style={styles.sponsorToggleSub}>
                Clay, glazes, tools or equipment
              </Text>
            </View>
            <View
              style={[styles.toggleTrack, isSponsor && styles.toggleTrackOn]}
            >
              <View
                style={[styles.toggleThumb, isSponsor && styles.toggleThumbOn]}
              />
            </View>
          </TouchableOpacity>

          {isSponsor ? (
            <View style={styles.sponsorInfo}>
              <Text style={styles.sponsorInfoText}>
                You are registering as a partner organisation - a clay supplier,
                brand, gallery, or retreat. This is not for ceramicists joining
                studios. Your account will be reviewed before appearing in the
                partner directory.
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.consentRow}
            onPress={() => {
              setAgreedToTerms((v) => !v);
              setTermsError('');
            }}
            activeOpacity={0.8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreedToTerms }}
          >
            <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
              {agreedToTerms ? (
                <Text style={styles.checkmark}>✓</Text>
              ) : null}
            </View>
            <Text style={styles.consentText}>
              I agree to the{' '}
              <Text
                style={styles.consentLink}
                onPress={() => void Linking.openURL('https://aruru.xyz/privacy')}
                accessibilityRole="link"
              >
                Privacy Policy
              </Text>
              {' '}and{' '}
              <Text
                style={styles.consentLink}
                onPress={() => void Linking.openURL('https://aruru.xyz/terms')}
                accessibilityRole="link"
              >
                Terms of Service
              </Text>
            </Text>
          </TouchableOpacity>

          {termsError ? (
            <Text style={styles.termsErrorText}>{termsError}</Text>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button
            label="Create account"
            onPress={handleRegister}
            loading={loading}
            fullWidth
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Text
            style={styles.footerLink}
            onPress={() => navigation.navigate('Login')}
          >
            Sign in
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1, padding: spacing[6], justifyContent: 'center' },
  header: { marginBottom: spacing[10] },
  wordmark: {
    fontFamily: typography.display,
    fontSize: 36,
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontFamily: typography.display,
    fontSize: fontSize['2xl'],
    color: colors.ink,
    marginBottom: spacing[2],
  },
  tagline: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkLight,
    lineHeight: 22,
  },
  form: { marginBottom: spacing[8] },
  inviteBanner: {
    backgroundColor: colors.clayLight,
    borderRadius: radius.sm,
    padding: spacing[3],
    marginBottom: spacing[4],
    borderWidth: 0.5,
    borderColor: colors.clayBorder,
  },
  inviteBannerText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.clayDark,
    textAlign: 'center',
    lineHeight: 20,
  },
  passwordBlock: {
    marginBottom: spacing[3],
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
  passwordErrorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing[2],
  },
  sponsorToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  sponsorToggleLeft: { flex: 1, marginRight: spacing[3] },
  sponsorToggleLabel: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  sponsorToggleSub: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: 2,
  },
  toggleTrack: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.border,
    padding: 2,
  },
  toggleTrackOn: { backgroundColor: colors.moss },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surface,
  },
  toggleThumbOn: { transform: [{ translateX: 18 }] },
  sponsorInfo: {
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  sponsorInfoText: {
    fontFamily: typography.body,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    lineHeight: 18,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    marginBottom: spacing[3],
    marginTop: spacing[2],
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    backgroundColor: colors.clay,
    borderColor: colors.clay,
  },
  checkmark: {
    fontSize: 12,
    color: colors.surface,
    fontFamily: typography.bodyMedium,
    lineHeight: 14,
  },
  consentText: {
    flex: 1,
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    lineHeight: 20,
  },
  consentLink: {
    fontFamily: typography.bodyMedium,
    color: colors.clay,
    textDecorationLine: 'underline',
  },
  termsErrorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing[2],
    marginTop: -spacing[2],
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
