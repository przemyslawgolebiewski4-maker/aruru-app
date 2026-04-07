import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { AvatarImage } from '../../components/AvatarImage';
import { Avatar, SectionLabel, Divider, Button, Badge } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';
import { alertMessageThen, confirmDestructive } from '../../utils/confirmAction';

async function confirmDeleteAccountFlow(): Promise<boolean> {
  const step1 = await confirmDestructive(
    'Delete your Aruru account?',
    'This will permanently remove your profile and all your data. This cannot be undone.',
    'Continue'
  );
  if (!step1) return false;
  return confirmDestructive(
    'Are you absolutely sure?',
    'This action is permanent and cannot be reversed.',
    'Delete account'
  );
}

function roleToBadgeVariant(
  role: string
): 'clay' | 'moss' | 'neutral' {
  if (role === 'owner') return 'clay';
  if (role === 'assistant') return 'moss';
  return 'neutral';
}

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function studioInitials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
}

export default function ProfileScreen() {
  const { user, studios, signOut } = useAuth();
  const isSponsor = user?.userRole === 'sponsor';
  const navigation = useNavigation();
  const stackNav =
    navigation.getParent<NativeStackNavigationProp<AppStackParamList>>();
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSent, setInviteSent] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  async function handleInviteToAruru() {
    setInviteError('');
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setInviteError('Enter a valid email address.');
      return;
    }
    setInviteSending(true);
    try {
      await apiFetch('/auth/invite-to-aruru', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setInviteSent(true);
      setInviteEmail('');
      setTimeout(() => {
        setInviteSent(false);
        setShowInviteForm(false);
      }, 3000);
    } catch (e: unknown) {
      setInviteError(
        e instanceof Error ? e.message : 'Could not send invitation.'
      );
    } finally {
      setInviteSending(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteError('');
    const ok = await confirmDeleteAccountFlow();
    if (!ok) return;
    setDeleting(true);
    try {
      try {
        await apiFetch('/auth/account', { method: 'DELETE' });
      } catch {
        await apiFetch('/auth/delete-account', {
          method: 'POST',
          body: JSON.stringify({}),
        });
      }
      alertMessageThen(
        'Account deleted',
        'Your account has been removed. Data held in Aruru — including sponsor profile, notifications, forum activity, and other records tied to your account — is deleted in line with our backend policy.',
        () => {
          void signOut();
        }
      );
    } catch (e: unknown) {
      setDeleteError(
        e instanceof Error ? e.message : 'Could not delete account.'
      );
    } finally {
      setDeleting(false);
    }
  }

  function goEditProfile() {
    stackNav?.navigate('EditProfile');
  }

  function goPricingSettings(studio: (typeof studios)[number]) {
    stackNav?.navigate('PricingSettings', {
      tenantId: studio.tenantId,
      studioName: studio.studioName || studio.studioSlug,
    });
  }

  function goStudioSettings(studio: (typeof studios)[number]) {
    stackNav?.navigate('StudioSettings', {
      tenantId: studio.tenantId,
      studioName: studio.studioName || studio.studioSlug,
    });
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Identity ── */}
      <View style={styles.avatarBlock}>
        <Avatar
          name={user?.name ?? 'User'}
          size="lg"
          imageUrl={user?.avatarUrl}
        />
        <Text style={styles.name}>{user?.name ?? '—'}</Text>
        <Text style={styles.email}>{user?.email ?? ''}</Text>
        {user?.city || user?.country ? (
          <Text style={styles.location}>
            {[user?.city, user?.country].filter(Boolean).join(', ')}
          </Text>
        ) : null}
        {user?.emailVerified ? (
          <Text style={styles.verifiedHint}>Email verified</Text>
        ) : (
          <Text style={styles.unverifiedHint}>Email not verified</Text>
        )}
      </View>

      {/* ── Studios ── */}
      <SectionLabel>Studios</SectionLabel>
      {studios.length === 0 ? (
        <Text style={styles.empty}>
          {isSponsor
            ? 'No studios linked to this account.'
            : 'No studios yet. Create one to get started.'}
        </Text>
      ) : (
        studios.map((s, i) => (
          <View key={s.tenantId}>
            <View style={styles.studioRow}>
              <View style={styles.studioLogoWrap}>
                <AvatarImage
                  url={s.logoUrl}
                  initials={studioInitials(s.studioName || s.studioSlug || '?')}
                  size={44}
                  borderRadius={10}
                  bgColor={colors.mossLight}
                  textColor={colors.moss}
                />
              </View>
              <View style={styles.studioCol}>
                <Text style={styles.studioName} numberOfLines={1}>
                  {s.studioName || s.studioSlug}
                </Text>
                {s.role === 'owner' && s.status === 'active' ? (
                  <View style={styles.ownerStudioLinks}>
                    <TouchableOpacity
                      onPress={() => goStudioSettings(s)}
                      hitSlop={8}
                      accessibilityRole="button"
                    >
                      <Text style={styles.studioLink}>Studio settings →</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => goPricingSettings(s)}
                      hitSlop={8}
                      accessibilityRole="button"
                    >
                      <Text style={styles.studioLink}>Edit pricing →</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
              <Badge label={formatRole(s.role)} variant={roleToBadgeVariant(s.role)} />
            </View>
            {i < studios.length - 1 ? <Divider style={styles.rowDivider} /> : null}
          </View>
        ))
      )}
      {!isSponsor && (
        <Button
          label="+ Create studio"
          variant="secondary"
          onPress={() =>
            navigation
              .getParent<NativeStackNavigationProp<AppStackParamList>>()
              ?.navigate('CreateStudio')
          }
          fullWidth
          style={styles.sectionBtn}
        />
      )}

      {/* ── Account ── */}
      <View style={styles.sectionGap} />
      <SectionLabel>Account</SectionLabel>
      <Button
        label="Edit profile"
        variant="ghost"
        onPress={goEditProfile}
        fullWidth
        style={styles.menuBtn}
      />
      <Button
        label="Security & two-factor"
        variant="ghost"
        onPress={() => stackNav?.navigate('AccountSecurity')}
        fullWidth
        style={styles.menuBtn}
      />
      <Button
        label="Contact support"
        variant="ghost"
        onPress={() => stackNav?.navigate('Support')}
        fullWidth
        style={styles.menuBtn}
      />
      <Button
        label="Invite a friend to Aruru"
        variant="ghost"
        onPress={() => setShowInviteForm((v) => !v)}
        fullWidth
        style={styles.menuBtn}
      />

      {showInviteForm ? (
        <View style={styles.inviteForm}>
          <TextInput
            style={styles.inviteInput}
            value={inviteEmail}
            onChangeText={(v) => {
              setInviteEmail(v);
              setInviteError('');
              setInviteSent(false);
            }}
            placeholder="friend@email.com"
            placeholderTextColor={colors.inkLight}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {inviteError ? (
            <Text style={styles.inviteError}>{inviteError}</Text>
          ) : null}
          {inviteSent ? (
            <Text style={styles.inviteSent}>Invitation sent!</Text>
          ) : null}
          <Button
            label="Send invitation"
            variant="primary"
            onPress={() => void handleInviteToAruru()}
            loading={inviteSending}
            fullWidth
          />
        </View>
      ) : null}

      {/* ── Legal ── */}
      <View style={styles.sectionGap} />
      <SectionLabel>Legal</SectionLabel>
      <Button
        label="Privacy Policy ↗"
        variant="ghost"
        onPress={() => void Linking.openURL('https://aruru.xyz/privacy')}
        fullWidth
        style={styles.menuBtn}
      />
      <Button
        label="Terms of Service ↗"
        variant="ghost"
        onPress={() => void Linking.openURL('https://aruru.xyz/terms')}
        fullWidth
        style={styles.menuBtn}
      />

      {/* ── Danger zone ── */}
      <View style={styles.sectionGap} />
      <SectionLabel>Account actions</SectionLabel>
      <Button
        label="Sign out"
        variant="ghost"
        onPress={() => signOut()}
        fullWidth
        style={styles.menuBtn}
      />
      <View style={styles.deleteHint}>
        <Text style={styles.deleteHintText}>
          Download your data before deleting: Security & two-factor → Your data.
        </Text>
      </View>
      <Button
        label="Delete account"
        variant="danger"
        onPress={() => void handleDeleteAccount()}
        loading={deleting}
        fullWidth
        style={styles.menuBtn}
      />
      {deleteError ? (
        <Text style={styles.deleteErrorText}>{deleteError}</Text>
      ) : null}

      <View style={{ height: spacing[10] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing[6] },
  avatarBlock: { alignItems: 'center', marginBottom: spacing[8] },
  name: {
    fontFamily: typography.display,
    fontSize: 24,
    color: colors.ink,
    marginTop: spacing[4],
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  email: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  location: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: spacing[1],
    textAlign: 'center',
  },
  verifiedHint: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.mossDark,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  unverifiedHint: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.clay,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  empty: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    lineHeight: 20,
    marginTop: spacing[2],
  },
  studioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  studioLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.mossLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studioCol: { flex: 1, minWidth: 0 },
  studioName: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.base,
    color: colors.ink,
  },
  ownerStudioLinks: { gap: spacing[1], marginTop: 2 },
  studioLink: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.clay,
    marginTop: 2,
  },
  rowDivider: { marginVertical: 0 },
  sectionBtn: { marginTop: spacing[3] },
  sectionGap: { height: spacing[8] },
  menuBtn: { marginTop: spacing[1] },
  inviteForm: {
    marginTop: spacing[3],
    gap: spacing[2],
  },
  inviteInput: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: 10,
    fontFamily: typography.body,
    fontSize: fontSize.base,
    color: colors.ink,
    backgroundColor: colors.surface,
    marginBottom: spacing[2],
  },
  inviteError: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing[2],
  },
  inviteSent: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.moss,
    marginBottom: spacing[2],
  },
  deleteHint: {
    paddingHorizontal: spacing[2],
    marginTop: spacing[3],
    marginBottom: spacing[1],
  },
  deleteHintText: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
    textAlign: 'center',
    lineHeight: 16,
  },
  deleteErrorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing[2],
  },
});
