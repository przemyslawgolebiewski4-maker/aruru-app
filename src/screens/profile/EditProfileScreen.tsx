import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ImageUpload from '../../components/ImageUpload';
import { Button, Input } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'EditProfile'>;

export default function EditProfileScreen({ navigation }: Props) {
  const { user, refresh } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [instagramUrl, setInstagramUrl] = useState(user?.instagramUrl ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(user?.websiteUrl ?? '');
  const [shopUrl, setShopUrl] = useState(user?.shopUrl ?? '');
  const [visibility, setVisibility] = useState<Record<string, string>>(() => ({
    profile: 'everyone',
    studios: 'everyone',
    events: 'only_me',
    forum_activity: 'everyone',
    links: 'everyone',
    ...user?.communityVisibility,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setAvatarUrl(user?.avatarUrl ?? '');
  }, [user?.avatarUrl]);

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
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim() || null,
          city: city.trim() || null,
          instagram_url: instagramUrl.trim() || null,
          website_url: websiteUrl.trim() || null,
          shop_url: shopUrl.trim() || null,
          community_visibility: visibility,
        }),
      });
      await refresh();
      navigation.goBack();
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

      <Input
        label="Bio (optional)"
        value={bio}
        onChangeText={(v) => {
          setBio(v);
          setSuccess('');
        }}
        placeholder="A short intro about you and your practice"
        multiline
        numberOfLines={2}
      />

      <Input
        label="City (optional)"
        value={city}
        onChangeText={(v) => {
          setCity(v);
          setSuccess('');
        }}
        placeholder="e.g. Warsaw"
      />

      <Input
        label="Instagram"
        value={instagramUrl}
        onChangeText={(v) => {
          setInstagramUrl(v);
          setSuccess('');
        }}
        placeholder="https://instagram.com/yourprofile"
        autoCapitalize="none"
        keyboardType="url"
      />

      <Input
        label="Website"
        value={websiteUrl}
        onChangeText={(v) => {
          setWebsiteUrl(v);
          setSuccess('');
        }}
        placeholder="https://yourwebsite.com"
        autoCapitalize="none"
        keyboardType="url"
      />

      <Input
        label="Shop"
        value={shopUrl}
        onChangeText={(v) => {
          setShopUrl(v);
          setSuccess('');
        }}
        placeholder="https://etsy.com/shop/yourshop"
        autoCapitalize="none"
        keyboardType="url"
      />

      <View style={styles.emailRow}>
        <Text style={styles.fieldLabel}>Email</Text>
        <Text style={styles.emailValue}>{user?.email ?? '—'}</Text>
        <Text style={styles.emailHint}>Email cannot be changed.</Text>
      </View>

      <View style={styles.privacySection}>
        <Text style={styles.privacyTitle}>Community visibility</Text>
        <Text style={styles.privacyHint}>
          Control what others see on your public profile.
        </Text>
        {[
          { key: 'profile', label: 'Name & bio' },
          { key: 'studios', label: 'My studios' },
          { key: 'events', label: 'My events' },
          { key: 'forum_activity', label: 'Forum activity' },
          { key: 'links', label: 'Social links' },
        ].map((item) => (
          <View key={item.key} style={styles.privacyRow}>
            <Text style={styles.privacyLabel}>{item.label}</Text>
            <View style={styles.visOptions}>
              {['everyone', 'my_studios', 'only_me'].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.visChip,
                    visibility[item.key] === opt && styles.visChipActive,
                  ]}
                  onPress={() =>
                    setVisibility((v) => ({ ...v, [item.key]: opt }))
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.visChipLabel,
                      visibility[item.key] === opt && styles.visChipLabelActive,
                    ]}
                  >
                    {opt === 'everyone'
                      ? 'Everyone'
                      : opt === 'my_studios'
                        ? 'My studios'
                        : 'Only me'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
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
    paddingVertical: spacing[4],
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
  privacySection: {
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
  },
  privacyTitle: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  privacyHint: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: -spacing[2],
  },
  privacyRow: { gap: spacing[1] },
  privacyLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  visOptions: { flexDirection: 'row', gap: spacing[2] },
  visChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  visChipActive: {
    backgroundColor: colors.clay,
    borderColor: colors.clay,
  },
  visChipLabel: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
  },
  visChipLabelActive: { color: colors.surface },
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
