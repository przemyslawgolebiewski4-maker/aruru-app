import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Button } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AuthStackParamList } from '../../navigation/types';
import { apiFetch, setToken } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyEmail'>;

type ViewMode =
  | 'waiting'
  | 'welcome'
  | 'expired'
  | 'verifying';

function parseQueryFromUrl(url: string): Partial<AuthStackParamList['VerifyEmail']> {
  try {
    const qIdx = url.indexOf('?');
    if (qIdx < 0) return {};
    const q = new URLSearchParams(url.slice(qIdx + 1));
    return {
      email: q.get('email') ?? undefined,
      success: q.get('success') ?? undefined,
      token: q.get('token') ?? q.get('jwt_token') ?? undefined,
      error: q.get('error') ?? undefined,
    };
  } catch {
    return {};
  }
}

function EnvelopeIcon56() {
  return (
    <Svg width={56} height={56} viewBox="0 0 56 56">
      <Rect
        x={6}
        y={14}
        width={44}
        height={32}
        rx={4}
        fill="none"
        stroke={colors.clay}
        strokeWidth={1.5}
      />
      <Path
        d="M8 18 L28 32 L48 18"
        fill="none"
        stroke={colors.clay}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckCircleIcon56() {
  return (
    <Svg width={56} height={56} viewBox="0 0 56 56">
      <Circle
        cx={28}
        cy={28}
        r={22}
        fill={colors.mossLight}
        stroke={colors.moss}
        strokeWidth={1}
      />
      <Path
        d="M18 29 L25 36 L38 22"
        fill="none"
        stroke={colors.moss}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function WarningIcon48() {
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48">
      <Path
        d="M24 6 L42 40 H6 Z"
        fill={colors.clayLight}
        stroke={colors.clay}
        strokeWidth={0.75}
      />
      <Path
        d="M24 16 V26"
        stroke={colors.clayDark}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Circle cx={24} cy={32} r={1.5} fill={colors.clayDark} />
    </Svg>
  );
}

export default function VerifyEmailScreen({ navigation, route }: Props) {
  const { refresh } = useAuth();
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const [mergedParams, setMergedParams] = useState(route.params ?? {});
  const email =
    mergedParams.email ?? route.params?.email ?? '';
  const [view, setView] = useState<ViewMode>('waiting');
  const [resending, setResending] = useState(false);
  const [resendOk, setResendOk] = useState(false);
  const [resendErr, setResendErr] = useState('');
  const [verifyErr, setVerifyErr] = useState('');
  const [resendExpiredLoading, setResendExpiredLoading] = useState(false);
  const welcomeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMergedParams((prev) => ({ ...prev, ...route.params }));
  }, [route.params]);

  useEffect(() => {
    let sub: { remove: () => void } | undefined;
    (async () => {
      const initial = await Linking.getInitialURL();
      if (initial) {
        const q = parseQueryFromUrl(initial);
        if (q.success || q.token || q.error || q.email) {
          setMergedParams((p) => ({ ...p, ...q }));
        }
      }
      sub = Linking.addEventListener('url', ({ url }) => {
        const q = parseQueryFromUrl(url);
        if (q.success || q.token || q.error || q.email) {
          setMergedParams((p) => ({ ...p, ...q }));
        }
      });
    })();
    return () => sub?.remove();
  }, []);

  const successFlag = mergedParams.success === 'true';
  const jwt =
    (mergedParams.token && String(mergedParams.token)) ||
    undefined;
  const errParam = mergedParams.error ?? '';

  useEffect(() => {
    if (errParam === 'invalid_token') {
      setView('expired');
      return undefined;
    }
    if (successFlag && jwt) {
      setView('welcome');
      welcomeTimer.current = setTimeout(async () => {
        try {
          setView('verifying');
          await setToken(jwt);
          await refreshRef.current();
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', '/');
          }
        } catch (e: unknown) {
          setVerifyErr(
            e instanceof Error ? e.message : 'Verification failed.'
          );
          setView('expired');
        }
      }, 1500);
      return () => {
        if (welcomeTimer.current) clearTimeout(welcomeTimer.current);
      };
    }
    setView('waiting');
    return undefined;
  }, [successFlag, jwt, errParam]);

  useEffect(() => {
    if (!resendOk) return;
    const t = setTimeout(() => setResendOk(false), 2000);
    return () => clearTimeout(t);
  }, [resendOk]);

  async function resend() {
    setResendErr('');
    setResending(true);
    try {
      await apiFetch(
        '/auth/resend-verify',
        {
          method: 'POST',
          body: JSON.stringify(
            email ? { email } : {}
          ),
        }
      );
      setResendOk(true);
    } catch (e: unknown) {
      setResendErr(
        e instanceof Error ? e.message : 'Could not resend email.'
      );
    } finally {
      setResending(false);
    }
  }

  async function resendFromExpired() {
    setResendErr('');
    setVerifyErr('');
    setResendExpiredLoading(true);
    try {
      await apiFetch(
        '/auth/resend-verify',
        {
          method: 'POST',
          body: JSON.stringify(
            email ? { email } : {}
          ),
        }
      );
      setResendOk(true);
    } catch (e: unknown) {
      setResendErr(
        e instanceof Error ? e.message : 'Could not send link.'
      );
    } finally {
      setResendExpiredLoading(false);
    }
  }

  if (view === 'welcome' || view === 'verifying') {
    return (
      <View style={styles.root}>
        <View style={styles.inner}>
          <View style={styles.iconWrap}>
            <CheckCircleIcon56 />
          </View>
          <Text style={styles.successTitle}>You&apos;re verified.</Text>
          <Text style={styles.successBody}>
            Welcome to Aruru. Setting up your account...
          </Text>
          {view === 'verifying' ? (
            <ActivityIndicator
              color={colors.moss}
              style={{ marginTop: spacing[6] }}
            />
          ) : null}
          {verifyErr ? (
            <Text style={styles.errText}>{verifyErr}</Text>
          ) : null}
        </View>
      </View>
    );
  }

  if (view === 'expired') {
    return (
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          <View style={styles.iconWrap}>
            <WarningIcon48 />
          </View>
          <Text style={styles.title}>Link expired.</Text>
          <Text style={styles.body}>
            This verification link has expired or already been used.
          </Text>
          {resendOk ? (
            <Text style={styles.sentOk}>Email sent ✓</Text>
          ) : null}
          {resendErr ? (
            <Text style={styles.errText}>{resendErr}</Text>
          ) : null}
          <Button
            label="Request new link"
            variant="primary"
            onPress={() => void resendFromExpired()}
            fullWidth
            loading={resendExpiredLoading}
            style={{ marginTop: spacing[6] }}
          />
          <Pressable
            onPress={() => navigation.replace('Login')}
            style={styles.signInLink}
            hitSlop={8}
          >
            <Text style={styles.signInLinkText}>Sign in →</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.inner}>
        <View style={styles.iconWrap}>
          <EnvelopeIcon56 />
        </View>
        <Text style={styles.waitTitle}>Check your inbox.</Text>
        <Text style={styles.waitBody}>
          We sent a verification link to your email. Click the link to activate
          your account and start using Aruru.
        </Text>
        {email ? (
          <Text style={styles.emailAccent}>{email}</Text>
        ) : null}

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Make sure to check your spam folder if you don&apos;t see it within
            a few minutes.
          </Text>
        </View>

        {resendOk ? (
          <Text style={styles.sentOk}>Email sent ✓</Text>
        ) : null}
        {resendErr ? (
          <Text style={styles.errText}>{resendErr}</Text>
        ) : null}

        <Button
          label="Resend email"
          variant="ghost"
          onPress={() => void resend()}
          fullWidth
          loading={resending}
          style={styles.resendBtn}
        />

        <Pressable
          onPress={() => navigation.replace('Login')}
          style={styles.signInLink}
          hitSlop={8}
        >
          <Text style={styles.signInLinkText}>Already verified? Sign in →</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    padding: spacing[6],
  },
  scroll: {
    flexGrow: 1,
    backgroundColor: colors.surface,
    padding: spacing[6],
    paddingTop: spacing[10],
  },
  inner: {
    alignItems: 'center',
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  iconWrap: {
    marginBottom: spacing[5],
  },
  waitTitle: {
    fontFamily: typography.display,
    fontSize: 24,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing[3],
    letterSpacing: -0.3,
  },
  waitBody: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.inkMid,
    textAlign: 'center',
    lineHeight: 22,
  },
  emailAccent: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.clay,
    textAlign: 'center',
    marginTop: spacing[2],
  },
  infoCard: {
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 16,
    width: '100%',
  },
  infoText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkMid,
    lineHeight: 20,
  },
  resendBtn: {
    marginTop: spacing[5],
    borderWidth: 0.5,
    borderColor: colors.clay,
  },
  sentOk: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.moss,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  errText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  signInLink: {
    marginTop: spacing[6],
    paddingVertical: spacing[2],
  },
  signInLinkText: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.base,
    color: colors.clay,
    textAlign: 'center',
  },
  successTitle: {
    fontFamily: typography.display,
    fontSize: 24,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  successBody: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.inkMid,
    textAlign: 'center',
    lineHeight: 22,
  },
  title: {
    fontFamily: typography.display,
    fontSize: 24,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  body: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.inkMid,
    textAlign: 'center',
    lineHeight: 22,
  },
});
