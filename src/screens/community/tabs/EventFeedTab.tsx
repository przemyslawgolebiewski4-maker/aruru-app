import React, { createElement, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  Image,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MaterialTopTabNavigationProp } from '@react-navigation/material-top-tabs';
import { useAuth } from '../../../hooks/useAuth';
import { apiFetch } from '../../../services/api';
import { AvatarImage } from '../../../components/AvatarImage';
import { Badge, Button, Input } from '../../../components/ui';
import DateTimeField, { toLocalISOString } from '../../../components/DateTimeField';
import { colors, typography, fontSize, spacing, radius } from '../../../theme/tokens';
import type { AppStackParamList, MainTabParamList } from '../../../navigation/types';

type FeedEvent = {
  id: string;
  tenantId?: string;
  studioName?: string;
  studioSlug?: string;
  studioLogoUrl?: string;
  authorName?: string;
  authorAvatarUrl?: string;
  isPersonal?: boolean;
  title: string;
  description?: string;
  bookingUrl?: string;
  websiteUrl?: string;
  coverUrl?: string;
  kind: string;
  startsAt?: string;
  endsAt?: string;
  location?: string;
  maxParticipants?: number;
};

function kindLabel(kind: string): string {
  switch (kind) {
    case 'workshop':
      return 'Workshop';
    case 'open_studio':
      return 'Open studio';
    case 'private_event':
      return 'Private';
    case 'member_booking':
      return 'Studio time';
    default:
      return 'Event';
  }
}

function kindVariant(kind: string): 'clay' | 'moss' | 'neutral' {
  if (kind === 'workshop') return 'clay';
  if (kind === 'open_studio') return 'moss';
  return 'neutral';
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function formatTime(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function normalizeFeedEvent(ev: unknown): FeedEvent {
  const r = ev as Record<string, unknown>;
  return {
    id: String(r.id ?? ''),
    tenantId:
      r.tenantId != null
        ? String(r.tenantId)
        : r.tenant_id != null
          ? String(r.tenant_id)
          : undefined,
    studioName:
      (r.studioName ?? r.studio_name) != null
        ? String(r.studioName ?? r.studio_name)
        : undefined,
    studioSlug:
      (r.studioSlug ?? r.studio_slug) != null
        ? String(r.studioSlug ?? r.studio_slug)
        : undefined,
    studioLogoUrl:
      (r.studioLogoUrl ?? r.studio_logo_url) != null
        ? String(r.studioLogoUrl ?? r.studio_logo_url)
        : undefined,
    authorName:
      (r.authorName ?? r.author_name) != null
        ? String(r.authorName ?? r.author_name)
        : undefined,
    authorAvatarUrl:
      (r.authorAvatarUrl ?? r.author_avatar_url) != null
        ? String(r.authorAvatarUrl ?? r.author_avatar_url)
        : undefined,
    isPersonal: Boolean(r.isPersonal ?? r.is_personal),
    title: String(r.title ?? ''),
    description:
      r.description != null ? String(r.description) : undefined,
    bookingUrl: (r.bookingUrl ?? r.booking_url)
      ? String(r.bookingUrl ?? r.booking_url)
      : undefined,
    websiteUrl:
      (r.websiteUrl ?? r.website_url) != null
        ? String(r.websiteUrl ?? r.website_url)
        : undefined,
    coverUrl: (r.coverUrl ?? r.cover_url)
      ? String(r.coverUrl ?? r.cover_url)
      : undefined,
    kind: String(r.kind ?? 'other'),
    startsAt:
      (r.startsAt ?? r.starts_at) != null
        ? String(r.startsAt ?? r.starts_at)
        : undefined,
    endsAt:
      (r.endsAt ?? r.ends_at) != null
        ? String(r.endsAt ?? r.ends_at)
        : undefined,
    location: r.location != null ? String(r.location) : undefined,
    maxParticipants:
      typeof r.maxParticipants === 'number'
        ? r.maxParticipants
        : typeof r.max_participants === 'number'
          ? r.max_participants
          : undefined,
  };
}

export default function EventFeedTab() {
  const { studios } = useAuth();
  const navigation =
    useNavigation<MaterialTopTabNavigationProp<MainTabParamList>>();
  const tenantId =
    (studios.find((s) => s.status === 'active') ?? studios[0])?.tenantId ?? '';
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showPersonalForm, setShowPersonalForm] = useState(false);
  const [pTitle, setPTitle] = useState('');
  const [pStartsAt, setPStartsAt] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d;
  });
  const [pEndsAt, setPEndsAt] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(12, 0, 0, 0);
    return d;
  });
  const [pLocation, setPLocation] = useState('');
  const [pDescription, setPDescription] = useState('');
  const [pWebsite, setPWebsite] = useState('');
  const [pPublic, setPPublic] = useState(true);
  const [pCreating, setPCreating] = useState(false);
  const [pError, setPError] = useState('');
  const [pCoverUrl, setPCoverUrl] = useState<string | null>(null);
  const [pUploadingCover, setPUploadingCover] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{ events?: unknown[] }>(
        '/community/feed',
        {},
        tenantId
      );
      const raw = Array.isArray(res.events) ? res.events : [];
      setEvents(raw.map(normalizeFeedEvent));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load feed.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function createPersonalEvent() {
    setPError('');
    if (!pTitle.trim()) {
      setPError('Title is required.');
      return;
    }
    if (pEndsAt <= pStartsAt) {
      setPError('End time must be after start time.');
      return;
    }
    setPCreating(true);
    try {
      await apiFetch(
        '/community/events',
        {
          method: 'POST',
          body: JSON.stringify({
            title: pTitle.trim(),
            kind: 'workshop',
            starts_at: toLocalISOString(pStartsAt),
            ends_at: toLocalISOString(pEndsAt),
            location: pLocation.trim() || null,
            description: pDescription.trim() || null,
            website_url: pWebsite.trim() || null,
            cover_url: pCoverUrl ?? null,
            public: pPublic,
          }),
        },
        tenantId
      );
      setShowPersonalForm(false);
      setPTitle('');
      setPLocation('');
      setPDescription('');
      setPWebsite('');
      setPCoverUrl(null);
      setPUploadingCover(false);
      setPError('');
      void load();
    } catch (e: unknown) {
      setPError(
        e instanceof Error ? e.message : 'Could not create event.'
      );
    } finally {
      setPCreating(false);
    }
  }

  function pickEventCover(): void {
    if (pUploadingCover) return;
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file || file.size > 3_000_000) return;
        setPUploadingCover(true);
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          if (!base64) {
            setPUploadingCover(false);
            return;
          }
          apiFetch<{ coverUrl?: string; cover_url?: string }>(
            '/uploads/event-image',
            {
              method: 'POST',
              body: JSON.stringify({
                imageBase64: base64,
                mimeType: file.type,
                eventId: 'pending',
              }),
            },
            ''
          )
            .then((res) => {
              const url = res.coverUrl ?? res.cover_url;
              if (url) setPCoverUrl(url);
            })
            .catch(() => {})
            .finally(() => setPUploadingCover(false));
        };
        reader.onerror = () => setPUploadingCover(false);
        reader.readAsDataURL(file);
      };
      input.click();
      return;
    }
    setPUploadingCover(true);
    void (async () => {
      try {
        const { default: ImagePicker } = await import('expo-image-picker');
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return;
        const picked = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          base64: true,
          quality: 0.8,
        });
        if (picked.canceled || !picked.assets[0]) return;
        const asset = picked.assets[0];
        const res = await apiFetch<{
          coverUrl?: string;
          cover_url?: string;
        }>(
          '/uploads/event-image',
          {
            method: 'POST',
            body: JSON.stringify({
              imageBase64: asset.base64 ?? '',
              mimeType: 'image/jpeg',
              eventId: 'pending',
            }),
          },
          ''
        );
        const url = res.coverUrl ?? res.cover_url;
        if (url) setPCoverUrl(url);
      } catch {
      } finally {
        setPUploadingCover(false);
      }
    })();
  }

  function goStudio(slug: string, studioName: string) {
    navigation
      .getParent<NativeStackNavigationProp<AppStackParamList>>()
      ?.navigate('StudioPublicProfile', {
        studioSlug: slug,
        studioName,
      });
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

  return (
    <FlatList
      data={events}
      keyExtractor={(e) => e.id}
      style={styles.list}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      ListHeaderComponent={
        <View style={styles.newEventWrap}>
          {!showPersonalForm ? (
            <Button
              label="+ Share your event"
              variant="ghost"
              onPress={() => setShowPersonalForm(true)}
            />
          ) : (
            <View style={styles.personalForm}>
              <Text style={styles.personalFormTitle}>New personal event</Text>
              <TouchableOpacity
                style={styles.coverPickerWrap}
                onPress={pickEventCover}
                disabled={pUploadingCover}
                activeOpacity={0.8}
                accessibilityLabel="Add cover photo"
              >
                {pUploadingCover ? (
                  <ActivityIndicator color={colors.clay} />
                ) : pCoverUrl ? (
                  <>
                    {Platform.OS === 'web'
                      ? createElement('img', {
                          src: pCoverUrl,
                          style: {
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                            borderRadius: 8,
                          },
                          alt: 'Event cover',
                        })
                      : (() => (
                          <Image
                            source={{ uri: pCoverUrl }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        ))()}
                    <View style={styles.coverPickerOverlay}>
                      <Text style={styles.coverPickerOverlayText}>
                        Change cover
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.coverPickerEmpty}>
                    <Text style={styles.coverPickerEmptyText}>
                      + Add cover photo
                    </Text>
                    <Text style={styles.coverPickerEmptyHint}>
                      Optional - 3MB max
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <Input
                label="Title"
                value={pTitle}
                onChangeText={setPTitle}
                placeholder="Workshop, exhibition, open studio..."
              />
              <View style={styles.dtRow}>
                <View style={{ flex: 1 }}>
                  <DateTimeField
                    label="Starts"
                    value={pStartsAt}
                    onChange={setPStartsAt}
                    mode="date"
                    minimumDate={new Date()}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <DateTimeField
                    label="Ends"
                    value={pEndsAt}
                    onChange={setPEndsAt}
                    mode="date"
                    minimumDate={new Date()}
                  />
                </View>
              </View>
              <Input
                label="Location (optional)"
                value={pLocation}
                onChangeText={setPLocation}
                placeholder="City, address or online"
              />
              <Input
                label="Description (optional)"
                value={pDescription}
                onChangeText={setPDescription}
                placeholder="Tell people what to expect..."
                multiline
                numberOfLines={3}
              />
              <Input
                label="Website or link (optional)"
                value={pWebsite}
                onChangeText={setPWebsite}
                placeholder="https://..."
                keyboardType="url"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.publicToggle}
                onPress={() => setPPublic((v) => !v)}
                activeOpacity={0.8}
              >
                <Text style={styles.publicToggleLabel}>
                  {pPublic
                    ? 'Visible in community feed'
                    : 'Private - only you'}
                </Text>
                <View
                  style={[
                    styles.toggleTrack,
                    pPublic && styles.toggleTrackOn,
                  ]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      pPublic && styles.toggleThumbOn,
                    ]}
                  />
                </View>
              </TouchableOpacity>
              {pError ? (
                <Text style={styles.formError}>{pError}</Text>
              ) : null}
              <Button
                label="Publish event"
                variant="primary"
                onPress={() => void createPersonalEvent()}
                loading={pCreating}
                disabled={pCreating}
                fullWidth
              />
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => {
                  setShowPersonalForm(false);
                  setPError('');
                  setPDescription('');
                  setPWebsite('');
                  setPCoverUrl(null);
                  setPUploadingCover(false);
                }}
                fullWidth
              />
            </View>
          )}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No events yet.</Text>
          <Text style={styles.emptyHint}>
            Studios and ceramicists publish workshops, open studios, and
            exhibitions here. Check back soon - or share your own.
          </Text>
        </View>
      }
      renderItem={({ item: e }) => (
        <View style={styles.card}>
          {e.coverUrl ? (
            <View style={styles.feedCoverWrap}>
              {Platform.OS === 'web' ? (
                createElement('img', {
                  src: e.coverUrl,
                  style: {
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  },
                  alt: '',
                })
              ) : (
                <Image
                  source={{ uri: e.coverUrl }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              )}
            </View>
          ) : null}
          {e.isPersonal ? (
            <View style={styles.studioRow}>
              <View style={styles.avatar}>
                <AvatarImage
                  url={e.authorAvatarUrl}
                  initials={initials(e.authorName ?? '?')}
                  size={28}
                  borderRadius={14}
                  bgColor={colors.mossLight}
                  textColor={colors.moss}
                />
              </View>
              <Text style={styles.studioName}>
                {e.authorName ?? 'Ceramicist'}
              </Text>
              <Text style={styles.dateLabel}>{formatDate(e.startsAt)}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.studioRow}
              onPress={() =>
                goStudio(e.studioSlug ?? '', e.studioName ?? '')
              }
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                <AvatarImage
                  url={e.studioLogoUrl}
                  initials={initials(e.studioName ?? '?')}
                  size={28}
                  borderRadius={14}
                  bgColor={colors.clayLight}
                  textColor={colors.clay}
                />
              </View>
              <Text style={styles.studioName}>{e.studioName ?? ''}</Text>
              <Text style={styles.dateLabel}>{formatDate(e.startsAt)}</Text>
            </TouchableOpacity>
          )}
          <Badge label={kindLabel(e.kind)} variant={kindVariant(e.kind)} />
          <Text style={styles.eventTitle}>{e.title}</Text>
          {e.isPersonal && e.description ? (
            <Text style={styles.eventDesc} numberOfLines={3}>
              {e.description}
            </Text>
          ) : null}
          {e.bookingUrl ? (
            <TouchableOpacity
              style={styles.feedBookingBtn}
              onPress={() => {
                const url = e.bookingUrl!.startsWith('http')
                  ? e.bookingUrl!
                  : `https://${e.bookingUrl}`;
                void Linking.openURL(url);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.feedBookingBtnText}>Book a spot →</Text>
            </TouchableOpacity>
          ) : null}
          {e.isPersonal && e.websiteUrl?.trim() ? (
            <TouchableOpacity
              onPress={() => {
                const t = e.websiteUrl!.trim();
                const url = /^https?:\/\//i.test(t) ? t : `https://${t}`;
                void Linking.openURL(url);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.eventLink} numberOfLines={1}>
                {e.websiteUrl.trim()}
              </Text>
            </TouchableOpacity>
          ) : null}
          {e.startsAt ? (
            <Text style={styles.eventMeta}>
              {formatTime(e.startsAt)}
              {e.endsAt ? ` – ${formatTime(e.endsAt)}` : ''}
              {e.location ? ` · ${e.location}` : ''}
            </Text>
          ) : null}
          {e.maxParticipants ? (
            <Text style={styles.eventMeta}>{e.maxParticipants} spots max</Text>
          ) : null}
        </View>
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
  emptyWrap: {
    padding: spacing[6],
    paddingTop: spacing[4],
    alignItems: 'center',
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
  newEventWrap: {
    padding: spacing[4],
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  personalForm: {
    gap: spacing[3],
  },
  personalFormTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
    marginBottom: spacing[1],
  },
  coverPickerWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.clayLight,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginBottom: spacing[4],
  },
  coverPickerEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
  },
  coverPickerEmptyText: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.clay,
  },
  coverPickerEmptyHint: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  coverPickerOverlay: {
    position: 'absolute',
    bottom: spacing[2],
    right: spacing[2],
    backgroundColor: 'rgba(30,26,22,0.55)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  coverPickerOverlayText: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: '#fff',
  },
  dtRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  publicToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
  },
  publicToggleLabel: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
    flex: 1,
  },
  toggleTrack: {
    width: 42,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackOn: {
    backgroundColor: colors.moss,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },
  formError: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  sep: { height: 0.5, backgroundColor: colors.border },
  card: {
    backgroundColor: colors.surface,
    padding: spacing[4],
    gap: spacing[2],
  },
  feedCoverWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.clayLight,
    overflow: 'hidden',
    borderRadius: radius.md,
    marginBottom: spacing[3],
  },
  studioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.clayLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  studioName: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
    flex: 1,
  },
  dateLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  eventTitle: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
    fontWeight: '500',
  },
  eventDesc: {
    fontFamily: typography.body,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    lineHeight: 18,
    marginTop: 2,
  },
  eventLink: {
    fontFamily: typography.body,
    fontSize: fontSize.xs,
    color: colors.clay,
    textDecorationLine: 'underline',
    marginTop: 2,
  },
  eventMeta: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  feedBookingBtn: {
    backgroundColor: colors.moss,
    borderRadius: radius.sm,
    padding: spacing[3],
    alignItems: 'center',
    marginTop: spacing[2],
  },
  feedBookingBtnText: {
    fontFamily: typography.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.surfaceRaised,
  },
});
