import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MaterialTopTabNavigationProp } from '@react-navigation/material-top-tabs';
import { AvatarImage } from '../../../components/AvatarImage';
import { useAuth } from '../../../hooks/useAuth';
import { apiFetch } from '../../../services/api';
import { colors, typography, fontSize, spacing } from '../../../theme/tokens';
import type { AppStackParamList, MainTabParamList } from '../../../navigation/types';

type Nav = MaterialTopTabNavigationProp<MainTabParamList>;

type Artist = {
  id: string;
  name: string;
  bio?: string;
  city?: string;
  avatarUrl?: string;
  studios: { tenantId: string; studioName: string; role: string }[];
};

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function ArtistsTab() {
  const { studios } = useAuth();
  const navigation = useNavigation<Nav>();
  const tenantId =
    (studios.find((s) => s.status === 'active') ?? studios[0])?.tenantId ?? '';

  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{ artists: Artist[] }>(
        '/community/artists',
        {},
        tenantId
      );
      const raw = res.artists ?? [];
      setArtists(
        raw.map((item) => ({
          ...item,
          avatarUrl:
            item.avatarUrl ?? (item as { avatar_url?: string }).avatar_url,
        }))
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load artists.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  function goArtist(userId: string) {
    navigation
      .getParent<NativeStackNavigationProp<AppStackParamList>>()
      ?.navigate('ArtistProfile', { userId });
  }

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.clay} />
      </View>
    );
  if (error)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  if (artists.length === 0)
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No artists found.</Text>
        <Text style={styles.emptyHint}>
          Artists appear here when their profile is set to public.
        </Text>
      </View>
    );

  return (
    <FlatList
      data={artists}
      keyExtractor={(a) => a.id}
      style={styles.list}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      renderItem={({ item: a }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => goArtist(a.id)}
          activeOpacity={0.75}
        >
          <View style={styles.cardRow}>
            <View style={styles.avatar}>
              <AvatarImage
                url={a.avatarUrl}
                initials={initials(a.name || '?')}
                size={44}
                borderRadius={22}
                bgColor={colors.clayLight}
                textColor={colors.clay}
              />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.artistName}>{a.name}</Text>
              {a.bio ? (
                <Text style={styles.bio} numberOfLines={2}>
                  {a.bio}
                </Text>
              ) : null}
              {a.city ? <Text style={styles.city}>{a.city}</Text> : null}
              {a.studios.length > 0 && (
                <View style={styles.studioTags}>
                  {a.studios.slice(0, 2).map((s) => (
                    <View key={s.tenantId} style={styles.studioTag}>
                      <Text style={styles.studioTagLabel}>{s.studioName}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.cream },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
    gap: spacing[2],
  },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textAlign: 'center',
  },
  sep: { height: 0.5, backgroundColor: colors.border },
  card: { backgroundColor: colors.surface, padding: spacing[4] },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.clayLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  cardInfo: { flex: 1, gap: 3 },
  artistName: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  bio: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
  },
  city: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  studioTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
    marginTop: spacing[1],
  },
  studioTag: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.clayLight,
  },
  studioTagLabel: {
    fontFamily: typography.mono,
    fontSize: 9,
    color: colors.clay,
  },
});
