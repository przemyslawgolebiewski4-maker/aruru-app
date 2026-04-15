import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Button, Input } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';

type Nav = NativeStackNavigationProp<AppStackParamList, 'InviteFirstMember'>;
type Route = RouteProp<AppStackParamList, 'InviteFirstMember'>;

function resetToMain(navigation: Nav) {
  navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Main' }] }));
}

export default function InviteFirstMemberScreen({ route }: { route: Route }) {
  const { tenantId } = route.params;
  const navigation = useNavigation<Nav>();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleInvite() {
    const e = email.trim().toLowerCase();
    if (!e || !e.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setSending(true);
    try {
      await apiFetch(
        `/studios/${tenantId}/invite`,
        {
          method: 'POST',
          body: JSON.stringify({ email: e, role: 'member' }),
        },
        tenantId
      );
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not send invite.');
    } finally {
      setSending(false);
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
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, styles.stepDotDone]} />
          <View style={[styles.stepDot, styles.stepDotDone]} />
          <View style={[styles.stepDot, styles.stepDotDone]} />
          <View style={[styles.stepDot, styles.stepDotActive]} />
        </View>

        <View style={styles.top}>
          <Text style={styles.title}>Invite your first member</Text>
          <Text style={styles.subtitle}>
            Send an invite by email.{" "}
            {"They'll receive a link to join your studio.\n"}
            You can invite more members from the Members screen later.
          </Text>
        </View>

        {sent ? (
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successText}>
              Invite sent to {email.trim().toLowerCase()}
            </Text>
          </View>
        ) : (
          <>
            <Input
              label="Email address"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setError('');
              }}
              placeholder="member@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={error}
            />
            <Button
              label="Send invite"
              variant="primary"
              onPress={() => void handleInvite()}
              loading={sending}
              fullWidth
              style={styles.btn}
            />
          </>
        )}

        <Button
          label={sent ? 'Go to my studio →' : 'Skip for now'}
          variant={sent ? 'primary' : 'ghost'}
          onPress={() => resetToMain(navigation)}
          fullWidth
          style={styles.skipBtn}
        />

        <Text style={styles.note}>
          Your 14-day free trial has started. You can subscribe anytime from Studio
          Settings.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing[6], paddingBottom: spacing[10] },
  stepRow: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[8] },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  stepDotActive: { backgroundColor: colors.clay },
  stepDotDone: { backgroundColor: colors.moss },
  top: { marginBottom: spacing[6] },
  title: {
    fontFamily: typography.display,
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkLight,
    lineHeight: 22,
  },
  successBox: {
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.moss,
    padding: spacing[4],
    alignItems: 'center',
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  successIcon: { fontSize: 28, color: colors.moss },
  successText: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.moss,
    textAlign: 'center',
  },
  btn: { marginTop: spacing[4] },
  skipBtn: { marginTop: spacing[2] },
  note: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing[5],
    paddingHorizontal: spacing[2],
  },
});
