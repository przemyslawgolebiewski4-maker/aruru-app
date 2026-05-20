import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../../hooks/useAuth';
import { apiFetch } from '../../../services/api';
import { AvatarImage } from '../../../components/AvatarImage';
import { Button } from '../../../components/ui';
import {
  colors,
  fontSize,
  radius,
  spacing,
  typography,
} from '../../../theme/tokens';
import type { AppStackParamList } from '../../../navigation/types';
import Svg, { Path } from 'react-native-svg';

type GalleryPhoto = {
  userId: string;
  userName: string;
  photoUrl: string;
  studioName?: string;
};

type ApiArtist = {
  id: string;
  name: string;
  avatarUrl?: string;
  avatar_url?: string;
  portfolioUrls?: string[];
  portfolio_urls?: string[];
  studios?: { studioName?: string }[];
};

type HomeEvent = {
  id: string;
  title: string;
  studioName: string;
  city?: string;
  startsAt: string;
  tenantId: string;
};

type HomeStudio = {
  id: string;
  name: string;
  city?: string;
  country?: string;
  memberCount: number;
  slug?: string;
};

type HomeSponsor = {
  id: string;
  name: string;
  latestUpdate?: string;
  logoUrl?: string;
};

type HomeTabKey = 'feed' | 'studios' | 'artists' | 'sponsors';

type Props = {
  onSelectTab: (tab: HomeTabKey) => void;
};

type StackNav = NativeStackNavigationProp<AppStackParamList>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string | undefined {
  return value == null || String(value).trim() === ''
    ? undefined
    : String(value);
}

function numberValue(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0) || 0;
}

function formatEventDay(iso: string): { day: string; month: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { day: '', month: '' };
  const [day = '', month = ''] = date
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    .split(' ');
  return { day, month };
}

function SeeAllButton({
  label = 'See all',
  onPress,
}: {
  label?: string;
  onPress: () => void;
}) {
  return (
    <Button
      label={label}
      variant="secondary"
      onPress={onPress}
      style={styles.compactSectionBtn}
    />
  );
}

function EmptySection({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.emptySection}>
      <Text style={styles.emptyText}>Nothing here yet.</Text>
      <SeeAllButton label="Explore" onPress={onPress} />
    </View>
  );
}

export default function HomeTab({ onSelectTab }: Props) {
  const { width } = useWindowDimensions();
  const { studios } = useAuth();
  const navigation = useNavigation<StackNav>();
  const stackNav = navigation.getParent<StackNav>() ?? navigation;
  const tenantId =
    studios.find((s) => s.status === 'active')?.tenantId ??
    studios[0]?.tenantId ??
    '';

  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [events, setEvents] = useState<HomeEvent[]>([]);
  const [homeStudios, setHomeStudios] = useState<HomeStudio[]>([]);
  const [sponsors, setSponsors] = useState<HomeSponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const COLS = 3;
  const ROWS = 2;
  const PAGE_SIZE = COLS * ROWS;
  const [galleryPage, setGalleryPage] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  /** Match CommunityScreen narrow icon rail (web + native). */
  const SIDEBAR = 58;
  const CONTENT_PAD = spacing[4] * 2;
  const ARROW_W = 28 * 2 + spacing[2] * 2;
  const GAP = 2;
  const rawCell = Math.floor(
    (width - SIDEBAR - CONTENT_PAD - ARROW_W - GAP * (COLS - 1)) / COLS
  );
  const cellSize = Platform.OS === 'web'
    ? Math.min(rawCell, 120)
    : Math.min(rawCell, 160);
  const totalPages = Math.max(1, Math.ceil(photos.length / PAGE_SIZE));
  const pagePhotos = photos.slice(
    galleryPage * PAGE_SIZE,
    (galleryPage + 1) * PAGE_SIZE
  );
  const gridPhotos = [
    ...pagePhotos,
    ...Array(Math.max(0, PAGE_SIZE - pagePhotos.length)).fill(null),
  ] as (GalleryPhoto | null)[];
  const slideStyle = {
    transform: [
      {
        translateX: slideAnim.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-30, 0, 30],
        }),
      },
    ],
    opacity: slideAnim.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [0, 1, 0],
    }),
  };

  useEffect(() => {
    setGalleryPage(0);
  }, [photos.length]);

  function animateGallery(direction: 1 | -1, nextPage: number) {
    Animated.timing(slideAnim, {
      toValue: direction,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      slideAnim.setValue(-direction);
      setGalleryPage(nextPage);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  }

  function goNext() {
    if (galleryPage < totalPages - 1)
      animateGallery(1, galleryPage + 1);
  }

  function goPrev() {
    if (galleryPage > 0) animateGallery(-1, galleryPage - 1);
  }

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadHome() {
        setLoading(true);
        const [artistsRes, eventsRes, studiosRes, sponsorsRes] =
          await Promise.allSettled([
            apiFetch<{ artists?: ApiArtist[] }>(
              '/community/artists?limit=50',
              {},
              tenantId
            ),
            apiFetch<{ events?: unknown[] }>('/community/feed', {}, tenantId),
            apiFetch<{ studios?: unknown[] }>(
              '/community/studios?limit=6',
              {},
              tenantId
            ),
            apiFetch<{ sponsors?: unknown[] }>(
              '/community/sponsors?limit=4',
              {},
              tenantId
            ),
          ]);

        if (!active) return;

        if (artistsRes.status === 'fulfilled') {
          const res = artistsRes.value;
          const rawArtists: ApiArtist[] = res.artists ?? [];
          const allPhotos: GalleryPhoto[] = rawArtists.flatMap((a) => {
            const urls: string[] = (
              a.portfolioUrls ??
              a.portfolio_urls ??
              []
            ).filter((u): u is string => typeof u === 'string' && u.length > 0);
            return urls.map((photoUrl) => ({
              userId: a.id,
              userName: a.name ?? '',
              photoUrl,
              studioName: a.studios?.[0]?.studioName,
            }));
          });
          setPhotos(allPhotos);
        } else {
          setPhotos([]);
        }

        if (eventsRes.status === 'fulfilled') {
          const rawEvents = Array.isArray(eventsRes.value.events)
            ? eventsRes.value.events
            : [];
          setEvents(
            rawEvents.slice(0, 8).map((event) => {
              const e = asRecord(event);
              return {
                id: String(e.id ?? ''),
                title: String(e.title ?? ''),
                studioName: String(e.studioName ?? e.studio_name ?? ''),
                city: stringValue(e.city ?? e.location),
                startsAt: String(e.startsAt ?? e.starts_at ?? ''),
                tenantId: String(e.tenantId ?? e.tenant_id ?? ''),
              };
            })
          );
        } else {
          setEvents([]);
        }

        if (studiosRes.status === 'fulfilled') {
          const rawStudios = Array.isArray(studiosRes.value.studios)
            ? studiosRes.value.studios
            : [];
          setHomeStudios(
            rawStudios.slice(0, 6).map((studio) => {
              const s = asRecord(studio);
              return {
                id: String(s.id ?? ''),
                name: String(s.name ?? ''),
                city: stringValue(s.city),
                country: stringValue(s.country),
                memberCount: numberValue(s.memberCount ?? s.member_count),
                slug: stringValue(s.slug),
              };
            })
          );
        } else {
          setHomeStudios([]);
        }

        if (sponsorsRes.status === 'fulfilled') {
          const rawSponsors = Array.isArray(sponsorsRes.value.sponsors)
            ? sponsorsRes.value.sponsors
            : [];
          setSponsors(
            rawSponsors.slice(0, 4).map((sponsor) => {
              const s = asRecord(sponsor);
              const latest = asRecord(s.latestPost ?? s.latest_post);
              return {
                id: String(s.id ?? ''),
                name: String(s.name ?? s.companyName ?? s.company_name ?? ''),
                logoUrl: stringValue(s.logoUrl ?? s.logo_url),
                latestUpdate: stringValue(
                  latest.content ??
                    latest.title ??
                    s.latestUpdate ??
                    s.latest_update
                ),
              };
            })
          );
        } else {
          setSponsors([]);
        }

        setLoading(false);
      }

      void loadHome();

      return () => {
        active = false;
      };
    }, [tenantId])
  );

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={colors.clay} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {photos.length > 0 && (
        <View style={styles.gallerySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Gallery</Text>
            <SeeAllButton onPress={() => onSelectTab('artists')} />
          </View>

          <View style={styles.galleryOuter}>
            <TouchableOpacity
              onPress={goPrev}
              disabled={galleryPage === 0}
              style={[
                styles.galleryArrow,
                galleryPage === 0 && styles.galleryArrowOff,
              ]}
              accessibilityLabel="Previous"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <View style={styles.galleryArrowCircle}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path
                    stroke={colors.clay}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 18l-6-6 6-6"
                  />
                </Svg>
              </View>
            </TouchableOpacity>

            <Animated.View style={[styles.galleryGrid, slideStyle]}>
              {gridPhotos.map((item, idx) =>
                item ? (
                  <TouchableOpacity
                    key={item.userId + item.photoUrl + idx}
                    style={[styles.galleryCell, { width: cellSize, height: cellSize }]}
                    onPress={() =>
                      stackNav.navigate('ArtistProfile', { userId: item.userId })
                    }
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri: item.photoUrl }}
                      style={styles.galleryCellImg}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ) : (
                  <View
                    key={'empty' + idx}
                    style={[
                      styles.galleryCell,
                      styles.galleryCellEmpty,
                      { width: cellSize, height: cellSize },
                    ]}
                  />
                )
              )}
            </Animated.View>

            <TouchableOpacity
              onPress={goNext}
              disabled={galleryPage >= totalPages - 1}
              style={[
                styles.galleryArrow,
                galleryPage >= totalPages - 1 && styles.galleryArrowOff,
              ]}
              accessibilityLabel="Next"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <View style={styles.galleryArrowCircle}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path
                    stroke={colors.clay}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 18l6-6-6-6"
                  />
                </Svg>
              </View>
            </TouchableOpacity>
          </View>

          {totalPages > 1 && (
            <Text style={styles.galleryCounter}>
              {galleryPage + 1} / {totalPages}
            </Text>
          )}
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming events</Text>
        <SeeAllButton onPress={() => onSelectTab('feed')} />
      </View>
      {events.length > 0 ? (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          renderItem={({ item }) => {
            const date = formatEventDay(item.startsAt);
            return (
              <TouchableOpacity
                style={styles.eventCard}
                onPress={() =>
                  item.tenantId
                    ? stackNav.navigate('EventList', { tenantId: item.tenantId })
                    : onSelectTab('feed')
                }
                activeOpacity={0.78}
              >
                <Text style={styles.eventDay}>{date.day}</Text>
                <Text style={styles.eventMonth}>{date.month}</Text>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={2}>
                  {[item.studioName, item.city].filter(Boolean).join(' · ')}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <EmptySection onPress={() => onSelectTab('feed')} />
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Studios</Text>
        <SeeAllButton onPress={() => onSelectTab('studios')} />
      </View>
      {homeStudios.length > 0 ? (
        <FlatList
          data={homeStudios}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.studioCard}
              onPress={() =>
                item.slug
                  ? stackNav.navigate('StudioPublicProfile', {
                      studioSlug: item.slug,
                      studioName: item.name,
                    })
                  : onSelectTab('studios')
              }
              activeOpacity={0.78}
            >
              <View style={styles.studioLogo} />
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.studioLocation} numberOfLines={1}>
                {[item.city, item.country].filter(Boolean).join(', ')}
              </Text>
              <Text style={styles.memberCount}>{item.memberCount} {item.memberCount === 1 ? 'member' : 'members'}</Text>
            </TouchableOpacity>
          )}
        />
      ) : (
        <EmptySection onPress={() => onSelectTab('studios')} />
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>From our partners</Text>
        <SeeAllButton onPress={() => onSelectTab('sponsors')} />
      </View>
      {sponsors.length > 0 ? (
        <FlatList
          data={sponsors}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.sponsorCard}
              onPress={() =>
                item.id
                  ? stackNav.navigate('SponsorProfile', { sponsorId: item.id })
                  : onSelectTab('sponsors')
              }
              activeOpacity={0.78}
            >
              <View style={styles.sponsorHeader}>
                <AvatarImage
                  url={item.logoUrl}
                  initials={(item.name || '?').slice(0, 2).toUpperCase()}
                  size={32}
                  borderRadius={6}
                  bgColor={colors.mossLight}
                  textColor={colors.moss}
                />
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.name}
                </Text>
              </View>
              {item.latestUpdate ? (
                <Text style={styles.sponsorUpdate} numberOfLines={4}>
                  {item.latestUpdate.slice(0, 100)}
                </Text>
              ) : null}
            </TouchableOpacity>
          )}
        />
      ) : null}
      {sponsors.length === 0 ? (
        <EmptySection onPress={() => onSelectTab('sponsors')} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  scrollContent: { paddingBottom: spacing[8] },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  sectionTitle: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactSectionBtn: {
    minHeight: 32,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  gallerySection: { marginBottom: spacing[4] },
  galleryOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[4],
  },
  galleryGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  galleryCell: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  galleryCellImg: { width: '100%', height: '100%' },
  galleryCellEmpty: {
    backgroundColor: colors.clayLight,
    opacity: 0.25,
  },
  galleryArrow: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryArrowOff: { opacity: 0.2 },
  galleryArrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryCounter: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
    textAlign: 'center',
    marginTop: spacing[1],
    marginBottom: spacing[3],
  },
  emptySection: {
    padding: spacing[4],
    alignItems: 'center',
    gap: spacing[3],
  },
  emptyText: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.inkLight,
  },
  horizontalList: {
    paddingHorizontal: spacing[4],
    gap: 10,
  },
  eventCard: {
    width: 160,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing[3],
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  eventDay: {
    fontFamily: typography.display,
    fontSize: 24,
    color: colors.clay,
  },
  eventMonth: {
    fontFamily: typography.mono,
    fontSize: 9,
    color: colors.clay,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
  },
  cardTitle: {
    fontFamily: typography.body,
    fontSize: 13,
    fontWeight: '500',
    color: colors.ink,
    marginBottom: 2,
  },
  cardMeta: {
    fontFamily: typography.body,
    fontSize: 11,
    color: colors.inkMid,
  },
  studioCard: {
    width: 160,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing[3],
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  studioLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.clayLight,
    marginBottom: spacing[2],
  },
  studioLocation: {
    fontFamily: typography.body,
    fontSize: 11,
    color: colors.inkLight,
    marginBottom: 4,
  },
  memberCount: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.clay,
  },
  sponsorCard: {
    width: 200,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing[3],
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  sponsorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  sponsorUpdate: {
    fontFamily: typography.body,
    fontSize: 12,
    color: colors.inkMid,
    lineHeight: 18,
  },
});
