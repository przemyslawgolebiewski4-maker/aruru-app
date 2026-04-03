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
import { colors, typography, fontSize, spacing } from '../theme/tokens';
import { apiFetch } from '../services/api';

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
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve({ base64, mimeType: file.type });
        };
        reader.readAsDataURL(file);
      };
      input.click();
    });
  }
  try {
    const ImagePicker = await import('expo-image-picker');
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

  async function handlePress() {
    setError('');
    const picked = await pickAndConvertToBase64();
    if (!picked) return;

    setUploading(true);
    try {
      const res = await apiFetch<{ avatarUrl?: string; logoUrl?: string }>(
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
      const url = res.avatarUrl ?? res.logoUrl ?? '';
      if (url) onSuccess(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        onPress={() => void handlePress()}
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
              <NativeImage
                uri={currentUrl}
                size={size}
                borderRadius={borderRadius}
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
