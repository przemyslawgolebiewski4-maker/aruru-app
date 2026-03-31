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
import { Button, Input } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

type FieldKey = 'name' | 'email' | 'password';

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

function validatePassword(v: string): string | undefined {
  if (!v) return 'Password is required.';
  if (v.length < 8) return 'Password must be at least 8 characters.';
  return undefined;
}

export default function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>(
    {}
  );
  const [focused, setFocused] = useState<FieldKey | null>(null);

  function runValidation(): boolean {
    const next: Partial<Record<FieldKey, string>> = {
      name: validateName(name),
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setFieldErrors(next);
    return !next.name && !next.email && !next.password;
  }

  async function handleRegister() {
    setError('');
    if (!runValidation()) return;

    setLoading(true);
    try {
      await signUp(email.trim().toLowerCase(), password, name.trim());
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
          <Input
            label="Password"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (fieldErrors.password)
                setFieldErrors((f) => ({ ...f, password: undefined }));
            }}
            secureTextEntry
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            error={fieldErrors.password}
            onFocus={() => setFocused('password')}
            onBlur={() => setFocused(null)}
            style={
              focused === 'password'
                ? { borderColor: colors.clay, borderWidth: 0.5 }
                : undefined
            }
          />

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
