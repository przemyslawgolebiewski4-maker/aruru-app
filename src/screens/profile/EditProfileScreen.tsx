import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input } from '../../components/ui';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'EditProfile'>;

export default function EditProfileScreen(_props: Props) {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function onSave() {
    setError('');
    setSuccess('');
    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim() }),
      });
      await refresh();
      setSuccess('Profile updated.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.avatarSection}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>
            {(name || user?.email || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.avatarHint}>Avatar initials — based on your name</Text>
      </View>

      <Input
        label="Display name"
        value={name}
        onChangeText={(v) => {
          setName(v);
          setSuccess('');
        }}
        placeholder="Your name"
        autoCapitalize="words"
      />

      <View style={styles.emailRow}>
        <Text style={styles.fieldLabel}>Email</Text>
        <Text style={styles.emailValue}>{user?.email ?? '—'}</Text>
        <Text style={styles.emailHint}>Email cannot be changed.</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      <Button
        label="Save changes"
        onPress={() => void onSave()}
        loading={saving}
        fullWidth
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing[4], gap: spacing[4] },
  avatarSection: {
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.clayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: typography.display,
    fontSize: 32,
    color: colors.clay,
  },
  avatarHint: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  emailRow: { gap: spacing[1] },
  fieldLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emailValue: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  emailHint: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  error: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  success: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.moss,
  },
});
