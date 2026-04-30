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
  const { tenantId, studioName } = route.params;
  const navigation = useNavigation<Nav>();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
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

  if (showSuccess) {
    return (
      <View style={styles.root}>
        <View style={styles.successScreen}>
          <Text style={styles.successScreenTitle}>{studioName} is ready.</Text>
          <Text style={styles.successScreenBody}>
            Your studio is now visible in the community. Members can find it in
            Studio Finder and send a join request.
          </Text>
          <View style={styles.successChecks}>
            <Text style={styles.successCheck}>
              Studio profile visible in community
            </Text>
            <Text style={styles.successCheck}>Members can book studio time</Text>
            <Text style={styles.successCheck}>
              Members can see upcoming events
            </Text>
          </View>
          <Text style={styles.successNote}>
            When you&apos;re ready - explore more tools in Studio Settings.
          </Text>
          <Button
            label="Go to dashboard →"
            variant="primary"
            onPress={() => resetToMain(navigation)}
            fullWidth
            style={styles.btn}
          />
        </View>
      </View>
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
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, styles.stepDotDone]} />
          <View style={[styles.stepDot, styles.stepDotDone]} />
          <View style={[styles.stepDot, styles.stepDotActive]} />
        </View>

        <View style={styles.top}>
          <Text style={styles.title}>Invite your first member</Text>
          <Text style={styles.subtitle}>
            Send an invite to someone who works at {studioName}. They&apos;ll get
            an email and can join in one click. You can invite more members later
            from Studio Settings.
          </Text>
        </View>

        {sent ? (
          <View style={styles.successWrap}>
            <Text style={styles.successTitle}>Invite sent.</Text>
            <Text style={styles.successBody}>
              {email.trim()} will receive an email with a link to join{' '}
              {studioName}.
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

        {sent ? (
          <Button
            label="Go to my studio →"
            variant="primary"
            onPress={() => setShowSuccess(true)}
            fullWidth
            style={styles.btn}
          />
        ) : (
          <Button
            label="Skip for now"
            variant="ghost"
            onPress={() => setShowSuccess(true)}
            fullWidth
            style={styles.skipBtn}
          />
        )}
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
  successScreen: {
    flex: 1,
    padding: spacing[6],
    justifyContent: 'center',
  },
  successScreenTitle: {
    fontFamily: typography.display,
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: spacing[3],
  },
  successScreenBody: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkMid,
    lineHeight: 24,
    marginBottom: spacing[6],
  },
  successChecks: {
    gap: spacing[2],
    marginBottom: spacing[6],
  },
  successCheck: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.moss,
    paddingLeft: spacing[4],
    lineHeight: 22,
  },
  successNote: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    lineHeight: 20,
    marginBottom: spacing[6],
  },
  successWrap: {
    backgroundColor: colors.mossLight,
    borderRadius: radius.md,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 0.5,
    borderColor: colors.moss,
  },
  successTitle: {
    fontFamily: typography.bodySemiBold,
    fontSize: fontSize.md,
    color: colors.moss,
    marginBottom: spacing[1],
  },
  successBody: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkMid,
    lineHeight: 20,
  },
  btn: { marginTop: spacing[4] },
  skipBtn: { marginTop: spacing[2] },
});
