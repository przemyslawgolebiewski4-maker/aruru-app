import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../hooks/useAuth';
import {
  get2faStatus,
  totp2faInit,
  totp2faVerify,
  totp2faDisable,
  email2faEnable,
  email2faDisable,
  disableAll2fa,
  resendVerifyEmail,
} from '../../services/api';
import { Button, Input } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'AccountSecurity'>;

export default function AccountSecurityScreen(_props: Props) {
  const { user, refresh } = useAuth();
  const [status, setStatus] = useState<Awaited<
    ReturnType<typeof get2faStatus>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [totpSetup, setTotpSetup] = useState<{
    secret: string;
    otpauthUrl: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [resendHint, setResendHint] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const s = await get2faStatus();
      setStatus(s);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load security status.');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function onResendVerify() {
    setResendHint('');
    setBusy(true);
    try {
      await resendVerifyEmail();
      setResendHint('If your e-mail was not verified, we sent a new link.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not send verification e-mail.');
    } finally {
      setBusy(false);
    }
  }

  async function onTotpInit() {
    setError('');
    setBusy(true);
    try {
      const res = await totp2faInit();
      setTotpSetup({ secret: res.secret, otpauthUrl: res.otpauthUrl });
      setTotpCode('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not start authenticator setup.');
    } finally {
      setBusy(false);
    }
  }

  async function onTotpVerify() {
    setError('');
    if (!totpCode.trim()) {
      setError('Enter the 6-digit code from your app.');
      return;
    }
    setBusy(true);
    try {
      await totp2faVerify(totpCode);
      setTotpSetup(null);
      setTotpCode('');
      await refresh();
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid code or setup expired.');
    } finally {
      setBusy(false);
    }
  }

  async function onTotpDisable() {
    setError('');
    setBusy(true);
    try {
      await totp2faDisable();
      setTotpSetup(null);
      await refresh();
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not disable authenticator.');
    } finally {
      setBusy(false);
    }
  }

  async function onEmailEnable() {
    setError('');
    setBusy(true);
    try {
      await email2faEnable();
      await refresh();
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not enable e-mail codes.');
    } finally {
      setBusy(false);
    }
  }

  async function onEmailDisable() {
    setError('');
    setBusy(true);
    try {
      await email2faDisable();
      await refresh();
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not disable e-mail codes.');
    } finally {
      setBusy(false);
    }
  }

  async function onDisableAll() {
    setError('');
    if (!disablePassword.trim()) {
      setError('Enter your current password to turn off two-factor authentication.');
      return;
    }
    setBusy(true);
    try {
      await disableAll2fa(disablePassword);
      setDisablePassword('');
      setTotpSetup(null);
      await refresh();
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not disable 2FA.');
    } finally {
      setBusy(false);
    }
  }

  const verified = user?.emailVerified === true;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.lead}>
        Protect your account with a second step at sign-in.
      </Text>

      {!verified ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Verify your e-mail first</Text>
          <Text style={styles.cardBody}>
            Two-factor authentication is available after your e-mail address is verified.
          </Text>
          <Button
            label="Resend verification e-mail"
            onPress={() => void onResendVerify()}
            loading={busy}
            fullWidth
          />
          {resendHint ? <Text style={styles.hint}>{resendHint}</Text> : null}
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.clay} />
        </View>
      ) : verified && status ? (
        <>
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Status</Text>
            <Text style={styles.statusLine}>
              Authenticator app:{' '}
              <Text style={styles.statusEmph}>
                {status.totpEnabled
                  ? 'On'
                  : status.totpPendingSetup
                    ? 'Setup in progress'
                    : 'Off'}
              </Text>
            </Text>
            <Text style={styles.statusLine}>
              E-mail codes:{' '}
              <Text style={styles.statusEmph}>{status.emailEnabled ? 'On' : 'Off'}</Text>
            </Text>
            <Text style={styles.statusLine}>
              Any 2FA:{' '}
              <Text style={styles.statusEmph}>{status.anyEnabled ? 'Yes' : 'No'}</Text>
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>E-mail at sign-in</Text>
            <Text style={styles.cardBody}>
              Receive a one-time code by e-mail when you sign in.
            </Text>
            {status.emailEnabled ? (
              <Button
                label="Turn off e-mail codes"
                onPress={() => void onEmailDisable()}
                loading={busy}
                variant="secondary"
                fullWidth
              />
            ) : (
              <Button
                label="Turn on e-mail codes"
                onPress={() => void onEmailEnable()}
                loading={busy}
                fullWidth
              />
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Authenticator app</Text>
            {status.totpEnabled ? (
              <>
                <Text style={styles.cardBody}>
                  Your account is linked to an authenticator app. E-mail codes stay on if you use them.
                </Text>
                <Button
                  label="Unlink authenticator app"
                  onPress={() => void onTotpDisable()}
                  loading={busy}
                  variant="secondary"
                  fullWidth
                />
              </>
            ) : totpSetup ? (
              <>
                <Text style={styles.cardBody}>
                  Scan this QR code with your app, or enter the secret manually.
                </Text>
                <View style={styles.qrWrap}>
                  <QRCode
                    value={totpSetup.otpauthUrl}
                    size={180}
                    backgroundColor={colors.surface}
                    color={colors.ink}
                  />
                </View>
                <Text style={styles.secret} selectable>
                  {totpSetup.secret}
                </Text>
                <Input
                  label="6-digit code"
                  value={totpCode}
                  onChangeText={setTotpCode}
                  keyboardType="number-pad"
                  maxLength={8}
                  placeholder="000000"
                />
                <Button
                  label="Confirm and link app"
                  onPress={() => void onTotpVerify()}
                  loading={busy}
                  fullWidth
                />
                <Button
                  label="Cancel setup"
                  onPress={() => {
                    setTotpSetup(null);
                    setTotpCode('');
                  }}
                  variant="ghost"
                  fullWidth
                />
              </>
            ) : (
              <>
                <Text style={styles.cardBody}>
                  Use Google Authenticator or a similar app for time-based codes.
                </Text>
                <Button
                  label={status.totpPendingSetup ? 'Continue setup' : 'Set up authenticator'}
                  onPress={() => void onTotpInit()}
                  loading={busy}
                  fullWidth
                />
              </>
            )}
          </View>

          {status.anyEnabled ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Turn off all 2FA</Text>
              <Text style={styles.cardBody}>
                Removes authenticator and e-mail codes. Enter your current password to confirm.
              </Text>
              <Input
                label="Current password"
                value={disablePassword}
                onChangeText={setDisablePassword}
                secureTextEntry
                autoComplete="password"
              />
              <Button
                label="Disable two-factor authentication"
                onPress={() => void onDisableAll()}
                loading={busy}
                variant="danger"
                fullWidth
              />
            </View>
          ) : null}
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing[4], paddingBottom: spacing[10], gap: spacing[4] },
  lead: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkLight,
    lineHeight: 22,
  },
  center: { padding: spacing[6], alignItems: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[3],
  },
  cardTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  cardBody: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    lineHeight: 20,
  },
  statusCard: {
    backgroundColor: colors.mossLight,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.mossBorder,
    padding: spacing[4],
    gap: spacing[1],
  },
  statusLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.mossDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[1],
  },
  statusLine: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  statusEmph: {
    fontFamily: typography.bodyMedium,
  },
  qrWrap: {
    alignSelf: 'center',
    padding: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  secret: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.ink,
    lineHeight: 16,
  },
  hint: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.mossDark,
  },
  error: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
});
