import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { Avatar, SectionLabel, Divider, Button, Badge } from '../../components/ui';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';

const DELETE_LABEL_GRAY = '#9E9890';

function confirmDeleteWeb(): boolean {
  if (typeof window === 'undefined') return false;
  if (
    !window.confirm(
      'Delete your Aruru account?\n\nThis will permanently remove your profile and all your data. This cannot be undone.'
    )
  ) {
    return false;
  }
  return window.confirm(
    'Are you absolutely sure? This action is permanent and cannot be reversed.'
  );
}

function confirmDeleteNative(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Delete your Aruru account?',
      'This will permanently remove your profile and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'This action is permanent and cannot be reversed.',
              [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                {
                  text: 'Delete account',
                  style: 'destructive',
                  onPress: () => resolve(true),
                },
              ]
            );
          },
        },
      ]
    );
  });
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

export default function ProfileScreen() {
  const { user, studios, signOut } = useAuth();
  const navigation = useNavigation();
  const stackNav =
    navigation.getParent<NativeStackNavigationProp<AppStackParamList>>();
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteAccount() {
    setDeleteError('');
    const ok =
      typeof window !== 'undefined'
        ? confirmDeleteWeb()
        : await confirmDeleteNative();
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
      await signOut();
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
      <View style={styles.avatarBlock}>
        <Avatar name={user?.name ?? 'User'} size="lg" />
        <Text style={styles.name}>{user?.name ?? '—'}</Text>
        <Text style={styles.email}>{user?.email ?? ''}</Text>
      </View>

      <SectionLabel>Your studios</SectionLabel>
      {studios.length === 0 ? (
        <Text style={styles.empty}>
          No studios yet. Create one to get started.
        </Text>
      ) : (
        studios.map((s, i) => (
          <View key={s.tenantId}>
            <View style={styles.studioRow}>
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
                      accessibilityLabel="Studio settings"
                    >
                      <Text style={styles.editPricingLink}>Studio settings →</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => goPricingSettings(s)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Edit pricing"
                    >
                      <Text style={styles.editPricingLink}>Edit pricing →</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
              <Badge
                label={formatRole(s.role)}
                variant={roleToBadgeVariant(s.role)}
              />
            </View>
            {i < studios.length - 1 ? <Divider style={styles.rowDivider} /> : null}
          </View>
        ))
      )}

      <Button
        label="+ Create studio"
        variant="ghost"
        onPress={() =>
          navigation
            .getParent<NativeStackNavigationProp<AppStackParamList>>()
            ?.navigate('CreateStudio')
        }
        fullWidth
        style={styles.createStudioBtn}
      />

      <View style={{ height: spacing[8] }} />

      <SectionLabel>Account</SectionLabel>
      <Button
        label="Edit profile"
        variant="ghost"
        onPress={goEditProfile}
        fullWidth
        style={styles.accountBtn}
      />
      <Divider style={styles.rowDivider} />
      <TouchableOpacity
        style={styles.signOutBtn}
        onPress={() => signOut()}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>

      <Divider style={styles.rowDivider} />
      <TouchableOpacity
        style={styles.deleteAccountBtn}
        onPress={() => void handleDeleteAccount()}
        disabled={deleting}
        accessibilityRole="button"
        accessibilityLabel="Delete account"
      >
        {deleting ? (
          <ActivityIndicator color={DELETE_LABEL_GRAY} />
        ) : (
          <>
            <Text style={styles.deleteAccountText}>Delete account</Text>
            <Text style={styles.deleteAccountSub}>
              Permanently removes your data
            </Text>
          </>
        )}
      </TouchableOpacity>
      {deleteError ? (
        <Text style={styles.deleteErrorText}>{deleteError}</Text>
      ) : null}

      <View style={{ height: spacing[10] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing[6],
  },
  avatarBlock: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
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
  empty: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    lineHeight: 20,
    marginTop: spacing[2],
  },
  studioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  studioCol: {
    flex: 1,
    minWidth: 0,
  },
  studioName: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.base,
    color: colors.ink,
  },
  ownerStudioLinks: {
    gap: spacing[1],
    marginTop: 2,
  },
  editPricingLink: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.clay,
    marginTop: 2,
  },
  rowDivider: {
    marginVertical: 0,
  },
  createStudioBtn: {
    marginTop: spacing[3],
    borderWidth: 0.5,
    borderColor: colors.clay,
  },
  accountBtn: {
    marginTop: spacing[2],
    alignSelf: 'stretch',
  },
  signOutBtn: {
    paddingVertical: 11,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: spacing[1],
  },
  signOutText: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.base,
    color: colors.error,
  },
  deleteAccountBtn: {
    paddingVertical: 11,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: spacing[1],
  },
  deleteAccountText: {
    fontFamily: typography.body,
    fontSize: 13,
    color: DELETE_LABEL_GRAY,
  },
  deleteAccountSub: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
    marginTop: 2,
    textAlign: 'center',
  },
  deleteErrorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing[2],
  },
});
