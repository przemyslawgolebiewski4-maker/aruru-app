import React, { createElement, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Platform,
  Image,
} from 'react-native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../services/api';
import { AvatarImage } from '../../components/AvatarImage';
import { Divider } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'ArtistProfile'>;

type Studio = {
  tenantId: string;
  studioName: string;
  role: string;
  tenantSlug?: string;
  studioLogoUrl?: string;
};

type Artist = {
  id: string;
  name: string;
  bio?: string;
  city?: string;
  avatarUrl?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  shopUrl?: string;
  studios: Studio[];
  showEvents: boolean;
  portfolioUrls?: string[];
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
      const res = await apiFetch<
        Artist & { avatar_url?: string; portfolio_urls?: string[] }
      >(`/community/artists/${userId}`, {}, tenantId);
      setArtist({
        ...res,
        avatarUrl: res.avatarUrl ?? res.avatar_url,
        portfolioUrls: Array.isArray(
          res.portfolioUrls ?? res.portfolio_urls
        )
          ? ((res.portfolioUrls ?? res.portfolio_urls) as string[]).filter(
              Boolean
            )
          : [],
        studios: (res.studios ?? []).map((s) => ({
          ...s,
          studioLogoUrl:
            s.studioLogoUrl ??
            (s as { studio_logo_url?: string }).studio_logo_url,
        })),
      });
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
          <AvatarImage
            url={artist.avatarUrl}
            initials={initials(artist.name)}
            size={72}
            borderRadius={36}
            bgColor={colors.clayLight}
            textColor={colors.clay}
          />
        </View>
        <Text style={styles.name}>{artist.name}</Text>
        {artist.bio ? <Text style={styles.bio}>{artist.bio}</Text> : null}
        {artist.city ? <Text style={styles.city}>{artist.city}</Text> : null}
      </View>

      {(artist.portfolioUrls ?? []).length > 0 ? (
        <>
          <Divider />
          <View style={styles.portfolioSection}>
            <Text style={styles.sectionLabel}>Portfolio</Text>
            <View style={styles.portfolioGrid}>
              {(artist.portfolioUrls ?? []).map((url, i) => (
                <View key={`${url}-${i}`} style={styles.portfolioCell}>
                  {Platform.OS === 'web' ? (
                    createElement('img', {
                      src: url,
                      style: {
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: 8,
                        display: 'block',
                      },
                      alt: `Portfolio photo ${i + 1}`,
                    })
                  ) : (
                    <Image
                      source={{ uri: url }}
                      style={styles.portfolioImageNative}
                      accessibilityLabel={`Portfolio photo ${i + 1}`}
                    />
                  )}
                </View>
              ))}
            </View>
          </View>
        </>
      ) : null}

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
                  <AvatarImage
                    url={s.studioLogoUrl}
                    initials={initials(s.studioName)}
                    size={40}
                    borderRadius={10}
                    bgColor={colors.mossLight}
                    textColor={colors.moss}
                  />
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

      {hasLinks ? (
        <>
          <Divider />
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Links</Text>
            {ig ? (
              <TouchableOpacity
                style={styles.socialLinkRow}
                onPress={() =>
                  void Linking.openURL(
                    ig.startsWith('http') ? ig : `https://${ig}`
                  )
                }
                activeOpacity={0.75}
              >
                <Text style={styles.linkText}>Instagram →</Text>
                <Text style={styles.linkUrl} numberOfLines={1}>
                  {ig}
                </Text>
              </TouchableOpacity>
            ) : null}
            {web ? (
              <TouchableOpacity
                style={styles.socialLinkRow}
                onPress={() =>
                  void Linking.openURL(
                    web.startsWith('http') ? web : `https://${web}`
                  )
                }
                activeOpacity={0.75}
              >
                <Text style={styles.linkText}>Website →</Text>
                <Text style={styles.linkUrl} numberOfLines={1}>
                  {web}
                </Text>
              </TouchableOpacity>
            ) : null}
            {shop ? (
              <TouchableOpacity
                style={styles.socialLinkRow}
                onPress={() =>
                  void Linking.openURL(
                    shop.startsWith('http') ? shop : `https://${shop}`
                  )
                }
                activeOpacity={0.75}
              >
                <Text style={styles.linkText}>Shop →</Text>
                <Text style={styles.linkUrl} numberOfLines={1}>
                  {shop}
                </Text>
              </TouchableOpacity>
            ) : null}
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
    overflow: 'hidden',
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
  portfolioSection: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  portfolioGrid: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  portfolioCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  portfolioImageNative: {
    width: '100%',
    aspectRatio: 1,
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
    overflow: 'hidden',
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
  socialLinkRow: {
    paddingVertical: spacing[2],
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    gap: 2,
  },
  linkText: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.clay,
  },
  linkUrl: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
});
