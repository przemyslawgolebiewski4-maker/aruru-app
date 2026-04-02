import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../services/api';
import { Divider } from '../../components/ui';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'ArtistProfile'>;

type Studio = {
  tenantId: string;
  studioName: string;
  role: string;
  tenantSlug?: string;
};

type Artist = {
  id: string;
  name: string;
  bio?: string;
  city?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  shopUrl?: string;
  studios: Studio[];
  showEvents: boolean;
};

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function ArtistProfileScreen({ route }: Props) {
  const { userId } = route.params;
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { studios } = useAuth();
  const tenantId =
    (studios.find((s) => s.status === 'active') ?? studios[0])?.tenantId ?? '';

  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<Artist>(
        `/community/artists/${userId}`,
        {},
        tenantId
      );
      setArtist(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load profile.');
    } finally {
      setLoading(false);
    }
  }, [userId, tenantId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.clay} />
      </View>
    );
  if (error || !artist)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Profile not found.'}</Text>
      </View>
    );

  const studioList = artist.studios ?? [];
  const ig = artist.instagramUrl?.trim();
  const web = artist.websiteUrl?.trim();
  const shop = artist.shopUrl?.trim();
  const hasLinks = Boolean(ig || web || shop);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatarLg}>
          <Text style={styles.avatarText}>{initials(artist.name)}</Text>
        </View>
        <Text style={styles.name}>{artist.name}</Text>
        {artist.bio ? <Text style={styles.bio}>{artist.bio}</Text> : null}
        {artist.city ? <Text style={styles.city}>{artist.city}</Text> : null}
      </View>

      {studioList.length > 0 ? (
        <>
          <Divider />
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Studios</Text>
            {studioList.map((s) => (
              <TouchableOpacity
                key={s.tenantId}
                style={styles.studioRow}
                onPress={() =>
                  navigation.navigate('StudioPublicProfile', {
                    studioSlug: s.tenantSlug ?? '',
                    studioName: s.studioName,
                  })
                }
                activeOpacity={0.75}
              >
                <View style={styles.studioAvatar}>
                  <Text style={styles.studioAvatarText}>
                    {s.studioName
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={styles.studioInfo}>
                  <Text style={styles.studioName}>{s.studioName}</Text>
                  <Text style={styles.studioRole}>{s.role}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { paddingBottom: spacing[6] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  header: {
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  avatarLg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.clayLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  avatarText: {
    fontFamily: typography.mono,
    fontSize: 24,
    color: colors.clay,
  },
  name: {
    fontFamily: typography.body,
    fontSize: fontSize.xl,
    color: colors.ink,
  },
  bio: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  city: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  section: { padding: spacing[4], gap: spacing[3] },
  sectionLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  studioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  studioAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.mossLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studioAvatarText: {
    fontFamily: typography.mono,
    fontSize: 13,
    color: colors.moss,
  },
  studioInfo: { flex: 1 },
  studioName: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  studioRole: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: 2,
  },
  linkRow: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.clay,
    paddingVertical: spacing[1],
  },
});
