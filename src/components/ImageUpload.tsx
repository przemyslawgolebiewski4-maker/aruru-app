import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, fontSize, spacing } from '../theme/tokens';
import { apiFetch } from '../services/api';
import { openWebImageFilePicker, readImageFileAsBase64 } from '../utils/webImagePick';

type Props = {
  currentUrl?: string | null;
  initials?: string;
  size?: number;
  endpoint: string;
  tenantId?: string;
  onSuccess: (url: string) => void;
  shape?: 'circle' | 'rounded';
};

async function pickAndConvertToBase64(): Promise<
  { base64: string; mimeType: string } | null
> {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return null;
    const asset = result.assets[0];
    return {
      base64: asset.base64 ?? '',
      mimeType: 'image/jpeg',
    };
  } catch {
    return null;
  }
}

export default function ImageUpload({
  currentUrl,
  initials = '?',
  size = 72,
  endpoint,
  tenantId = '',
  onSuccess,
  shape = 'circle',
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const borderRadius = shape === 'circle' ? size / 2 : 14;

  async function runUploadWithPicked(
    picked: { base64: string; mimeType: string }
  ) {
    setUploading(true);
    try {
      const res = await apiFetch<{
        avatarUrl?: string;
        logoUrl?: string;
        logo_url?: string;
      }>(
        endpoint,
        {
          method: 'POST',
          body: JSON.stringify({
            imageBase64: picked.base64,
            mimeType: picked.mimeType,
          }),
        },
        tenantId
      );
      const url = res.avatarUrl ?? res.logoUrl ?? res.logo_url ?? '';
      if (url) onSuccess(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  function handlePress() {
    setError('');
    if (uploading) return;
    if (Platform.OS === 'web') {
      openWebImageFilePicker((file) => {
        void (async () => {
          if (!file) return;
          const picked = await readImageFileAsBase64(file);
          if (!picked) return;
          await runUploadWithPicked(picked);
        })();
      });
      return;
    }
    void (async () => {
      const picked = await pickAndConvertToBase64();
      if (!picked) return;
      await runUploadWithPicked(picked);
    })();
  }

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={uploading}
      >
        <View
          style={[
            styles.avatar,
            { width: size, height: size, borderRadius },
            currentUrl ? styles.avatarWithImage : styles.avatarPlaceholder,
          ]}
        >
          {uploading ? (
            <ActivityIndicator color={colors.clay} />
          ) : currentUrl ? (
            Platform.OS === 'web' ? (
              // eslint-disable-next-line @typescript-eslint/no-unused-vars -- DOM img for web
              <WebAvatarImage
                uri={currentUrl}
                size={size}
                borderRadius={borderRadius}
              />
            ) : (
              <Image
                source={{ uri: currentUrl }}
                style={{ width: size, height: size, borderRadius }}
              />
            )
          ) : (
            <Text style={[styles.initials, { fontSize: size * 0.3 }]}>
              {initials.slice(0, 2).toUpperCase()}
            </Text>
          )}
          <View style={[styles.editBadge, { borderRadius: 10 }]}>
            <Text style={styles.editBadgeText}>+</Text>
          </View>
        </View>
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function WebAvatarImage({
  uri,
  size,
  borderRadius,
}: {
  uri: string;
  size: number;
  borderRadius: number;
}) {
  return React.createElement('img', {
    src: uri,
    style: {
      width: size,
      height: size,
      borderRadius,
      objectFit: 'cover',
    },
    alt: '',
  });
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing[1] },
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarPlaceholder: { backgroundColor: colors.clayLight },
  avatarWithImage: { backgroundColor: colors.border },
  initials: { fontFamily: typography.mono, color: colors.clay },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    backgroundColor: colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadgeText: { color: colors.surface, fontSize: 14, lineHeight: 18 },
  error: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.error,
  },
});
