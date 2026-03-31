import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Button, Input } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';

type Nav = NativeStackNavigationProp<AppStackParamList, 'InviteMember'>;
type Route = RouteProp<AppStackParamList, 'InviteMember'>;

type RoleOption = 'owner' | 'assistant' | 'member';

const ROLES: {
  value: RoleOption;
  title: string;
  desc: string;
}[] = [
  { value: 'owner', title: 'Owner', desc: 'Full access' },
  { value: 'assistant', title: 'Assistant', desc: 'Firings & tasks' },
  { value: 'member', title: 'Member', desc: 'Bookings & costs' },
];

export default function InviteMemberScreen({ route }: { route: Route }) {
  const { tenantId } = route.params;
  const navigation = useNavigation<Nav>();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<RoleOption>('member');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit() {
    const em = email.trim().toLowerCase();
    if (!em || !em.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiFetch<{ message: string }>(
        `/studios/${tenantId}/invite`,
        {
          method: 'POST',
          body: JSON.stringify({
            email: em,
            role,
            note: note.trim() || undefined,
          }),
        },
        tenantId
      );
      Alert.alert('Invitation sent', 'They will receive an email shortly.');
      navigation.goBack();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not send invitation.');
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
        <Text style={styles.title}>Invite someone</Text>
        <Text style={styles.subtitle}>
          They&apos;ll receive an email with a link to join your studio.
        </Text>

        <Input
          label="EMAIL ADDRESS"
          placeholder="member@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <Text style={styles.roleSectionLabel}>ROLE</Text>
        <View style={styles.roleRow}>
          {ROLES.map((r) => {
            const selected = role === r.value;
            return (
              <TouchableOpacity
                key={r.value}
                style={[
                  styles.roleCard,
                  selected && styles.roleCardSelected,
                ]}
                onPress={() => setRole(r.value)}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.roleTitle, selected && styles.roleTitleSelected]}
                >
                  {r.title}
                </Text>
                <Text style={styles.roleDesc}>{r.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.noteWrap}>
          <Input
            label="PERSONAL NOTE (OPTIONAL)"
            placeholder="Welcome to the studio!"
            value={note}
            onChangeText={setNote}
          />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button
          label="Send invitation"
          variant="primary"
          onPress={onSubmit}
          loading={loading}
          fullWidth
        />
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
    padding: spacing[6],
    paddingBottom: spacing[10],
  },
  title: {
    fontFamily: typography.display,
    fontSize: 24,
    color: colors.ink,
    letterSpacing: -0.3,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkLight,
    lineHeight: 22,
    marginBottom: spacing[8],
  },
  roleSectionLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  roleCard: {
    flex: 1,
    padding: spacing[3],
    borderWidth: 0.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  roleCardSelected: {
    borderColor: colors.clay,
    backgroundColor: colors.clayLight,
  },
  roleTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: 13,
    color: colors.ink,
  },
  roleTitleSelected: {
    color: colors.clayDark,
  },
  roleDesc: {
    fontFamily: typography.body,
    fontSize: 11,
    color: colors.inkLight,
    marginTop: 2,
    lineHeight: 15,
  },
  noteWrap: {
    marginTop: spacing[4],
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
});
