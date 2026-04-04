import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MaterialTopTabNavigationProp } from '@react-navigation/material-top-tabs';
import { AvatarImage } from '../../../components/AvatarImage';
import { useAuth } from '../../../hooks/useAuth';
import { apiFetch } from '../../../services/api';
import { colors, typography, fontSize, spacing, radius } from '../../../theme/tokens';
import type { AppStackParamList, MainTabParamList } from '../../../navigation/types';
import { COUNTRY_NAMES } from '../../../utils/locationData';

type Nav = MaterialTopTabNavigationProp<MainTabParamList>;

type Studio = {
  id: string;
  name: string;
  slug: string;
  city: string;
  country: string;
  description?: string;
  tags: string[];
  memberCount: number;
  logoUrl?: string;
};

const COUNTRIES = ['All', ...COUNTRY_NAMES];

const STUDIO_TAGS = [
  'wheel',
  'hand_building',
  'raku',
  'sculpture',
  'glazing',
  'kids',
  'workshops',
  'open_studio',
  'kiln_share',
  'beginners',
  'advanced',
];

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function StudioFinderTab() {
  const { studios } = useAuth();
  const navigation = useNavigation<Nav>();
  const tenantId =
    (studios.find((s) => s.status === 'active') ?? studios[0])?.tenantId ?? '';

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [country, setCountry] = useState('All');
  const [selectedTag, setSelectedTag] = useState('');
  const [studioList, setStudioList] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set('city', debouncedSearch.trim());
      if (country !== 'All') params.set('country', country);
      if (selectedTag) params.set('tags', selectedTag);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await apiFetch<{ studios: Studio[] }>(
        `/community/studios${qs}`,
        {},
        tenantId
      );
      const raw = res.studios ?? [];
      setStudioList(
        raw.map((item) => ({
          ...item,
          logoUrl:
            item.logoUrl ?? (item as { logo_url?: string }).logo_url,
        }))
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load studios.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, country, selectedTag, tenantId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  function goStudio(studio: Studio) {
    const stackNav =
      navigation.getParent<NativeStackNavigationProp<AppStackParamList>>();
    stackNav?.navigate('StudioPublicProfile', {
      studioSlug: studio.slug,
      studioName: studio.name,
    });
  }

  return (
    <View style={styles.root}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={(v) => setSearch(v)}
          placeholder="Search by city..."
          placeholderTextColor={colors.inkLight}
          returnKeyType="search"
        />
      </View>
      <View style={styles.filterRow}>
        {COUNTRIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, country === c && styles.chipActive]}
            onPress={() => setCountry(c)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipLabel,
                country === c && styles.chipLabelActive,
              ]}
            >
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.filterRow, styles.tagFilterRow]}>
        {STUDIO_TAGS.map((tag) => (
          <TouchableOpacity
            key={tag}
            style={[styles.chip, selectedTag === tag && styles.chipActive]}
            onPress={() => setSelectedTag(selectedTag === tag ? '' : tag)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipLabel,
                selectedTag === tag && styles.chipLabelActive,
              ]}
            >
              {tag.replace(/_/g, ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.clay} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : studioList.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No studios found.</Text>
        </View>
      ) : (
        <FlatList
          data={studioList}
          keyExtractor={(s) => s.id}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item: s }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => goStudio(s)}
              activeOpacity={0.75}
            >
              <View style={styles.cardRow}>
                <View style={styles.avatar}>
                  <AvatarImage
                    url={s.logoUrl}
                    initials={initials(s.name)}
                    size={40}
                    borderRadius={10}
                    bgColor={colors.mossLight}
                    textColor={colors.moss}
                  />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.studioName}>{s.name}</Text>
                  <Text style={styles.studioLoc}>
                    {[s.city, s.country].filter(Boolean).join(', ')}
                  </Text>
                  {s.tags.length > 0 && (
                    <View style={styles.tags}>
                      {s.tags.slice(0, 3).map((tag) => (
                        <View key={tag} style={styles.tag}>
                          <Text style={styles.tagLabel}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <Text style={styles.memberCount}>{s.memberCount} members</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  searchBar: {
    padding: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  searchInput: {
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: spacing[2],
    paddingHorizontal: spacing[3],
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  filterRow: {
    flexDirection: 'row',
    padding: spacing[2],
    paddingHorizontal: spacing[3],
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    flexWrap: 'wrap',
  },
  tagFilterRow: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.moss, borderColor: colors.moss },
  chipLabel: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
  },
  chipLabelActive: { color: colors.surface },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
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
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.mossLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  cardInfo: { flex: 1, gap: 2 },
  studioName: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  studioLoc: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
    marginTop: spacing[1],
  },
  tag: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.cream,
  },
  tagLabel: {
    fontFamily: typography.mono,
    fontSize: 9,
    color: colors.inkLight,
  },
  memberCount: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
});
