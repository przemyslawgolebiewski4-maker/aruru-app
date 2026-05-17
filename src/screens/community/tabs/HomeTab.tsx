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

type GalleryPhoto = {
  userId: string;
  userName: string;
  photoUrl: string;
  studioName?: string;
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
  const { studios: authStudios } = useAuth();
  const navigation = useNavigation<StackNav>();
  const stackNav = navigation.getParent<StackNav>() ?? navigation;
  const tenantId =
    authStudios.find((s) => s.status === 'active')?.tenantId ??
    authStudios[0]?.tenantId ??
    '';

  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [events, setEvents] = useState<HomeEvent[]>([]);
  const [studios, setStudios] = useState<HomeStudio[]>([]);
  const [sponsors, setSponsors] = useState<HomeSponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const COLS = 3;
  const ROWS = 2;
  const PAGE_SIZE = COLS * ROWS;
  const [galleryPage, setGalleryPage] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const SIDEBAR = Platform.OS === 'web' ? 160 : 0;
  const ARROW_SPACE = 64;
  const GALLERY_PAD = spacing[4] * 2;
  const GAP = 2;
  const cellSize = Math.floor(
    (width - SIDEBAR - ARROW_SPACE - GALLERY_PAD - GAP * (COLS - 1)) / COLS
  );
  const clampedCell =
    Platform.OS === 'web'
      ? Math.min(Math.max(cellSize, 72), 120)
      : Math.max(cellSize, 72);
  const totalPages = Math.ceil(photos.length / PAGE_SIZE);
  const pagePhotos = photos.slice(
    galleryPage * PAGE_SIZE,
    (galleryPage + 1) * PAGE_SIZE
  );
  const gridPhotos: Array<GalleryPhoto | null> = [
    ...pagePhotos,
    ...Array(Math.max(0, PAGE_SIZE - pagePhotos.length)).fill(null),
  ];
  const slideStyle = {
    transform: [
      {
        translateX: slideAnim.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-40, 0, 40],
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

  function goGalleryNext() {
    if (galleryPage >= totalPages - 1) return;
    Animated.timing(slideAnim, {
      toValue: -1,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      slideAnim.setValue(1);
      setGalleryPage((p) => p + 1);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }

  function goGalleryPrev() {
    if (galleryPage <= 0) return;
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      slideAnim.setValue(-1);
      setGalleryPage((p) => p - 1);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadHome() {
        setLoading(true);
        const [artistsRes, eventsRes, studiosRes, sponsorsRes] =
          await Promise.allSettled([
            apiFetch<{ artists?: unknown[] }>(
              '/community/artists?limit=18',
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
          const nextPhotos: GalleryPhoto[] = [];
          for (const artist of artistsRes.value.artists ?? []) {
            const a = asRecord(artist);
            const rawUrls =
              a.portfolioUrls ??
              a.portfolio_urls ??
              a.portfolioPhotos ??
              a.portfolio_photos;
            const portfolioUrls = Array.isArray(rawUrls) ? rawUrls : [];
            const rawStudios = Array.isArray(a.studios) ? a.studios : [];
            const firstStudio = asRecord(rawStudios[0]);
            for (const url of portfolioUrls) {
              const photoUrl = stringValue(url);
              if (!photoUrl) continue;
              nextPhotos.push({
                userId: String(a.id ?? a.userId ?? a.user_id ?? ''),
                userName: String(a.name ?? ''),
                photoUrl,
                studioName: stringValue(
                  firstStudio.studioName ?? firstStudio.studio_name
                ),
              });
            }
          }
          setPhotos(nextPhotos);
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
          setStudios(
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
          setStudios([]);
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
      {photos.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Gallery</Text>
            <SeeAllButton onPress={() => onSelectTab('artists')} />
          </View>
          <View style={styles.galleryOuter}>
            <TouchableOpacity
              onPress={goGalleryPrev}
              style={[
                styles.galleryArrow,
                styles.galleryArrowLeft,
                galleryPage === 0 && styles.galleryArrowDisabled,
              ]}
              disabled={galleryPage === 0}
              accessibilityLabel="Previous photos"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <View style={styles.galleryArrowCircle}>
                <Text style={styles.galleryArrowText}>‹</Text>
              </View>
            </TouchableOpacity>

            <Animated.View style={[styles.galleryGrid, slideStyle]}>
              {gridPhotos.map((item, index) =>
                item ? (
                  <TouchableOpacity
                    key={`${item.userId}_${item.photoUrl}_${index}`}
                    style={[
                      styles.galleryCell,
                      { width: clampedCell, height: clampedCell },
                    ]}
                    onPress={() =>
                      stackNav.navigate('ArtistProfile', { userId: item.userId })
                    }
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri: item.photoUrl }}
                      style={styles.galleryCellImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ) : (
                  <View
                    key={`empty_${index}`}
                    style={[
                      styles.galleryCell,
                      styles.galleryCellEmpty,
                      { width: clampedCell, height: clampedCell },
                    ]}
                  />
                )
              )}
            </Animated.View>

            <TouchableOpacity
              onPress={goGalleryNext}
              style={[
                styles.galleryArrow,
                styles.galleryArrowRight,
                galleryPage >= totalPages - 1 && styles.galleryArrowDisabled,
              ]}
              disabled={galleryPage >= totalPages - 1}
              accessibilityLabel="Next photos"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <View style={styles.galleryArrowCircle}>
                <Text style={styles.galleryArrowText}>›</Text>
              </View>
            </TouchableOpacity>
          </View>
          {totalPages > 1 && (
            <Text style={styles.galleryCounter}>
              {galleryPage + 1} / {totalPages}
            </Text>
          )}
        </>
      ) : null}

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
      {studios.length > 0 ? (
        <FlatList
          data={studios}
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
              <Text style={styles.memberCount}>{item.memberCount} members</Text>
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
  galleryOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
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
  galleryCellImage: {
    width: '100%',
    height: '100%',
  },
  galleryCellEmpty: {
    backgroundColor: colors.clayLight,
    opacity: 0.3,
  },
  galleryArrow: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  galleryArrowLeft: { marginRight: 4 },
  galleryArrowRight: { marginLeft: 4 },
  galleryArrowDisabled: { opacity: 0.2 },
  galleryArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryArrowText: {
    fontSize: 20,
    color: colors.clay,
    lineHeight: 24,
    fontFamily: typography.display,
  },
  galleryCounter: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
    textAlign: 'center',
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
