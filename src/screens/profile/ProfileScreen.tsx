import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { Avatar, SectionLabel, Divider, Button, Badge } from '../../components/ui';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

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

  function goEditProfile() {
    stackNav?.navigate('EditProfile');
  }

  function goPricingSettings(studio: (typeof studios)[number]) {
    stackNav?.navigate('PricingSettings', {
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
                  <TouchableOpacity
                    onPress={() => goPricingSettings(s)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Edit pricing"
                  >
                    <Text style={styles.editPricingLink}>Edit pricing →</Text>
                  </TouchableOpacity>
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
  editPricingLink: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.clay,
    marginTop: 4,
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
});
