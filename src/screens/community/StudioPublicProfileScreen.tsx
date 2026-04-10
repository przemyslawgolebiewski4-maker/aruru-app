import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Modal,
  Pressable,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import {
  apiFetch,
  postCommunityStudioJoinRequest,
  postCommunityStudioJoinEmailIntent,
  ApiError,
  parseCommunityStudioJoinFields,
  type CommunityStudioJoinFields,
} from '../../services/api';
import { AvatarImage } from '../../components/AvatarImage';
import { Divider, Badge, Button } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { alertMessage } from '../../utils/confirmAction';

type Props = NativeStackScreenProps<AppStackParamList, 'StudioPublicProfile'>;

type FeedEvent = {
  id: string;
  title: string;
  kind: string;
  startsAt?: string;
  endsAt?: string;
  location?: string;
  maxParticipants?: number;
  description?: string;
};

type StudioProfile = {
  id: string;
  name: string;
  slug: string;
  city: string;
  country: string;
  publicDescription?: string;
  tags: string[];
  memberCount: number;
  logoUrl?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  shopUrl?: string;
  upcomingEvents: FeedEvent[];
} & CommunityStudioJoinFields;

function kindLabel(kind: string): string {
  switch (kind) {
    case 'workshop':
      return 'Workshop';
    case 'open_studio':
      return 'Open studio';
    default:
      return 'Event';
  }
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

export default function StudioPublicProfileScreen({ route }: Props) {
  const stackNav =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { studioSlug, studioName } = route.params;
  const { user, switchStudio } = useAuth();

  const [studio, setStudio] = useState<StudioProfile | null>(null);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinNote, setJoinNote] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [emailIntentBusy, setEmailIntentBusy] = useState(false);
  const [emailIntentResult, setEmailIntentResult] = useState<{
    ownerEmail: string | null;
    deduplicated?: boolean;
  } | null>(null);
  const [emailIntentError, setEmailIntentError] = useState<
    '' | 'verify' | 'blocked'
  >('');

  useEffect(() => {
    setEmailIntentResult(null);
    setEmailIntentError('');
  }, [studioSlug]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const slug = studioSlug?.trim();
    if (!slug) {
      setError('Studio not found.');
      setStudio(null);
      setEvents([]);
      setLoading(false);
      return;
    }
    try {
      const encoded = encodeURIComponent(slug);
      /** Community public route: Bearer only, no X-Tenant-ID. */
      const res = await apiFetch<Record<string, unknown>>(
        `/community/studios/${encoded}`,
        {}
      );
      const join = parseCommunityStudioJoinFields(res);
      const rawEvents = (res.upcomingEvents ?? res.upcoming_events ?? []) as unknown[];
      const mappedEvents: FeedEvent[] = rawEvents.map((row) => {
        const e = row as Record<string, unknown>;
        return {
          id: String(e.id ?? ''),
          title: String(e.title ?? ''),
          kind: String(e.kind ?? ''),
          startsAt:
            e.startsAt != null
              ? String(e.startsAt)
              : e.starts_at != null
                ? String(e.starts_at)
                : undefined,
          endsAt:
            e.endsAt != null
              ? String(e.endsAt)
              : e.ends_at != null
                ? String(e.ends_at)
                : undefined,
          location: e.location != null ? String(e.location) : undefined,
          maxParticipants:
            e.maxParticipants != null
              ? Number(e.maxParticipants)
              : e.max_participants != null
                ? Number(e.max_participants)
                : undefined,
          description:
            e.description != null ? String(e.description) : undefined,
        };
      });
      setStudio({
        id: String(res.id ?? ''),
        name: String(res.name ?? ''),
        slug: String(res.slug ?? slug),
        city: String(res.city ?? ''),
        country: String(res.country ?? ''),
        publicDescription:
          res.publicDescription != null
            ? String(res.publicDescription)
            : res.public_description != null
              ? String(res.public_description)
              : undefined,
        tags: Array.isArray(res.tags)
          ? (res.tags as unknown[]).map((t) => String(t))
          : [],
        memberCount: Number(res.memberCount ?? res.member_count ?? 0) || 0,
        logoUrl:
          (res.logoUrl ?? res.logo_url) != null
            ? String(res.logoUrl ?? res.logo_url)
            : undefined,
        instagramUrl:
          res.instagramUrl != null
            ? String(res.instagramUrl)
            : res.instagram_url != null
              ? String(res.instagram_url)
              : undefined,
        websiteUrl:
          res.websiteUrl != null
            ? String(res.websiteUrl)
            : res.website_url != null
              ? String(res.website_url)
              : undefined,
        shopUrl:
          res.shopUrl != null
            ? String(res.shopUrl)
            : res.shop_url != null
              ? String(res.shop_url)
              : undefined,
        upcomingEvents: mappedEvents,
        ...join,
      });
      setEvents(mappedEvents);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load studio.');
      setStudio(null);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [studioSlug]);

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
  if (error)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  if (!studio)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Studio not found.</Text>
      </View>
    );

  const tags = studio.tags ?? [];
  const headerInitials = (studio.name || studioName || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const ig = studio.instagramUrl?.trim();
  const web = studio.websiteUrl?.trim();
  const shop = studio.shopUrl?.trim();
  const hasLinks = Boolean(ig || web || shop);

  async function submitJoinRequest() {
    const s = studio;
    if (!s) return;
    setJoinError('');
    setJoinBusy(true);
    try {
      await postCommunityStudioJoinRequest(s.slug, {
        note: joinNote.trim() ? joinNote.trim() : null,
      });
      setJoinModalOpen(false);
      setJoinNote('');
      await load();
    } catch (e: unknown) {
      let msg = e instanceof Error ? e.message : 'Could not submit join request.';
      if (e instanceof ApiError) {
        if (e.status === 403) {
          msg =
            'Verify your email address before requesting to join a studio.';
        } else if (e.status === 404) {
          msg = 'This studio was not found.';
        }
      }
      setJoinError(msg);
    } finally {
      setJoinBusy(false);
    }
  }

  function goToStudioDashboard() {
    const s = studio;
    if (!s) return;
    switchStudio(s.id);
    stackNav.navigate('Main', { screen: 'Studio' });
  }

  function buildOwnerMailto(): string | null {
    const s = studio;
    if (!s) return null;
    const to = emailIntentResult?.ownerEmail ?? s.ownerEmail ?? null;
    if (!to?.trim()) return null;
    const sub = encodeURIComponent(
      `Request to join ${s.name || s.slug}`
    );
    const body = encodeURIComponent(
      `Hello,\n\nI would like to join ${s.name || s.slug}.\n\nThank you`
    );
    return `mailto:${encodeURIComponent(to.trim())}?subject=${sub}&body=${body}`;
  }

  async function handleNotMemberYet() {
    const s = studio;
    if (!s) return;
    setEmailIntentError('');
    const ir = s.joinEmailIntentBlockedReason;
    const irStr = ir != null ? String(ir) : '';
    const emailVerify =
      irStr === 'email_verification_required' ||
      (!s.canRecordJoinEmailIntent && irStr === 'email_verification_required');
    if (emailVerify) {
      setEmailIntentError('verify');
      return;
    }
    const already =
      irStr === 'already_member' ||
      (!s.canRecordJoinEmailIntent && irStr === 'already_member');
    if (already) {
      goToStudioDashboard();
      return;
    }
    if (!s.canRecordJoinEmailIntent) {
      setEmailIntentError('blocked');
      return;
    }
    setEmailIntentBusy(true);
    try {
      const r = await postCommunityStudioJoinEmailIntent(s.slug);
      const mail = r.ownerEmail ?? s.ownerEmail ?? null;
      setEmailIntentResult({
        ownerEmail: mail,
        deduplicated: r.deduplicated,
      });
      await load();
    } catch (e: unknown) {
      let msg =
        e instanceof Error ? e.message : 'Could not record your contact intent.';
      if (e instanceof ApiError && e.status === 403) {
        msg = 'Verify your email address to continue.';
        setEmailIntentError('verify');
      } else {
        alertMessage('Error', msg);
      }
    } finally {
      setEmailIntentBusy(false);
    }
  }

  const inJoinFlow =
    studio.joinRequestStatus === 'pending' ||
    studio.joinRequestStatus === 'interview_pending' ||
    studio.joinRequestBlockedReason === 'pending_request';

  const showMemberEmailPath =
    user &&
    !studio.belongsToStudio &&
    !inJoinFlow &&
    studio.joinRequestBlockedReason !== 'already_member';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatarLg}>
          <AvatarImage
            url={studio.logoUrl}
            initials={headerInitials}
            size={72}
            borderRadius={14}
            bgColor={colors.mossLight}
            textColor={colors.moss}
          />
        </View>
        <Text style={styles.name}>{studio.name || studioName}</Text>
        {studio.city || studio.country ? (
          <Text style={styles.location}>
            {[studio.city, studio.country].filter(Boolean).join(', ')}
          </Text>
        ) : null}
        {studio.publicDescription ? (
          <Text style={styles.description}>{studio.publicDescription}</Text>
        ) : null}
        <Text style={styles.memberCount}>{studio.memberCount} members</Text>
        {tags.length > 0 ? (
          <View style={styles.tags}>
            {tags.map((tag, i) => (
              <View key={`${tag}-${i}`} style={styles.tag}>
                <Text style={styles.tagLabel}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {user ? (
        <>
          <Divider />
          <View style={styles.joinSection}>
            <Text style={styles.sectionLabel}>Membership</Text>
            {studio.belongsToStudio ? (
              <>
                <Text style={styles.memberHint}>
                  You are a member of this studio.
                </Text>
                <Button
                  label="Go to studio dashboard"
                  variant="primary"
                  fullWidth
                  onPress={goToStudioDashboard}
                />
              </>
            ) : studio.joinRequestStatus === 'pending' ? (
              <>
                <Text style={styles.statusHint}>
                  Your join request is pending review by the owner.
                </Text>
                {studio.ownerMessage ? (
                  <Text style={styles.ownerMsg}>{studio.ownerMessage}</Text>
                ) : null}
              </>
            ) : studio.joinRequestStatus === 'interview_pending' ? (
              <>
                <Text style={styles.statusHint}>
                  The owner is following up (e.g. interview or message).
                </Text>
                {studio.ownerMessage ? (
                  <Text style={styles.ownerMsg}>{studio.ownerMessage}</Text>
                ) : null}
              </>
            ) : studio.joinRequestBlockedReason === 'pending_request' ? (
              <Text style={styles.memberHint}>
                You already have a pending join request for this studio.
              </Text>
            ) : studio.joinRequestBlockedReason === 'already_member' ? (
              <>
                <Text style={styles.memberHint}>
                  Your account is already linked to this studio.
                </Text>
                <Button
                  label="Go to studio dashboard"
                  variant="secondary"
                  fullWidth
                  onPress={goToStudioDashboard}
                />
              </>
            ) : emailIntentResult ? (
              <>
                <Text style={styles.flowLead}>
                  We&apos;ve recorded that you plan to contact the owner by
                  email. This is separate from a formal in-app join request —
                  please email them to ask about joining.
                </Text>
                {emailIntentResult.deduplicated ? (
                  <Text style={styles.flowMuted}>
                    This intent was already saved — you can use the button below
                    again.
                  </Text>
                ) : null}
                {buildOwnerMailto() ? (
                  <Button
                    label="Email the owner"
                    variant="primary"
                    fullWidth
                    onPress={() => {
                      const u = buildOwnerMailto();
                      if (u) void Linking.openURL(u);
                    }}
                  />
                ) : (
                  <>
                    <Text style={styles.flowMuted}>
                      The owner&apos;s email is not shared in the app. Reach out
                      via the studio website or social links.
                    </Text>
                    {studio.websiteUrl?.trim() ? (
                      <Button
                        label="Studio website"
                        variant="secondary"
                        fullWidth
                        onPress={() =>
                          void Linking.openURL(studio.websiteUrl!.trim())
                        }
                      />
                    ) : null}
                  </>
                )}
                {studio.canRequestJoin ? (
                  <Button
                    label="Submit formal join request"
                    variant="ghost"
                    fullWidth
                    onPress={() => {
                      setJoinError('');
                      setJoinModalOpen(true);
                    }}
                    style={styles.formalAfterEmail}
                  />
                ) : null}
              </>
            ) : studio.joinRequestBlockedReason ===
                'email_verification_required' ||
              studio.joinEmailIntentBlockedReason ===
                'email_verification_required' ? (
              <Text style={styles.verifyHint}>
                Verify your email in your profile to submit a join request or use
                the email contact path.
              </Text>
            ) : (
              <>
                {showMemberEmailPath ? (
                  <>
                    <Text style={styles.flowQuestion}>
                      Are you already a member of this studio?
                    </Text>
                    <View style={styles.memberChoiceRow}>
                      <View style={styles.memberChoiceHalf}>
                        <Button
                          label="Yes"
                          variant="secondary"
                          fullWidth
                          onPress={goToStudioDashboard}
                        />
                      </View>
                      <View style={styles.memberChoiceHalf}>
                        <Button
                          label="No"
                          variant="secondary"
                          fullWidth
                          loading={emailIntentBusy}
                          onPress={() => void handleNotMemberYet()}
                        />
                      </View>
                    </View>
                    {emailIntentError === 'blocked' ? (
                      <Text style={styles.flowMuted}>
                        This path isn&apos;t available right now. Try the formal
                        request below or come back later.
                      </Text>
                    ) : null}
                    {emailIntentError === 'verify' ? (
                      <Text style={styles.verifyHint}>
                        Verify your email in your profile to continue.
                      </Text>
                    ) : null}
                  </>
                ) : null}
                {studio.canRequestJoin ? (
                  <Button
                    label="Request to join this studio"
                    variant="primary"
                    onPress={() => {
                      setJoinError('');
                      setJoinModalOpen(true);
                    }}
                    fullWidth
                    style={styles.formalJoinBtn}
                  />
                ) : null}
              </>
            )}
          </View>
        </>
      ) : null}

      {events.length > 0 ? (
        <>
          <Divider />
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Upcoming events</Text>
            {events.map((e) => (
              <TouchableOpacity
                key={e.id}
                style={styles.eventRow}
                activeOpacity={0.75}
                onPress={() =>
                  stackNav.navigate('EventList', {
                    tenantId: studio.id,
                  })
                }
              >
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{e.title}</Text>
                  <Text style={styles.eventMeta}>
                    {formatDate(e.startsAt)}
                    {e.endsAt ? ` - ${formatTime(e.endsAt)}` : ''}
                    {e.location ? ` · ${e.location}` : ''}
                  </Text>
                  {e.description ? (
                    <Text style={styles.eventDesc} numberOfLines={2}>
                      {e.description}
                    </Text>
                  ) : null}
                  {e.maxParticipants ? (
                    <Text style={styles.eventMeta}>
                      {e.maxParticipants} spots max
                    </Text>
                  ) : null}
                </View>
                <View style={styles.eventRight}>
                  <Badge label={kindLabel(e.kind)} variant="neutral" />
                  <Text style={styles.eventArrow}>→</Text>
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
              <TouchableOpacity onPress={() => void Linking.openURL(ig)}>
                <Text style={styles.linkRow}>Instagram</Text>
              </TouchableOpacity>
            ) : null}
            {web ? (
              <TouchableOpacity onPress={() => void Linking.openURL(web)}>
                <Text style={styles.linkRow}>Website</Text>
              </TouchableOpacity>
            ) : null}
            {shop ? (
              <TouchableOpacity onPress={() => void Linking.openURL(shop)}>
                <Text style={styles.linkRow}>Shop</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </>
      ) : null}

      <Modal
        visible={joinModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!joinBusy) setJoinModalOpen(false);
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            if (!joinBusy) setJoinModalOpen(false);
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKb}
          >
            <Pressable
              style={styles.modalSheet}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.modalTitle}>Join request</Text>
              <Text style={styles.modalHint}>
                Optional note to the studio owner (keep it short).
              </Text>
              <TextInput
                style={styles.modalInput}
                value={joinNote}
                onChangeText={(t) => {
                  setJoinNote(t);
                  setJoinError('');
                }}
                placeholder="Why you’d like to join…"
                placeholderTextColor={colors.inkLight}
                multiline
                editable={!joinBusy}
                maxLength={2000}
              />
              {joinError ? (
                <Text style={styles.joinModalError}>{joinError}</Text>
              ) : null}
              <View style={styles.modalRow}>
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={() => {
                    if (!joinBusy) setJoinModalOpen(false);
                  }}
                />
                <Button
                  label="Send request"
                  variant="primary"
                  loading={joinBusy}
                  onPress={() => void submitJoinRequest()}
                />
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
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
    borderRadius: 14,
    backgroundColor: colors.mossLight,
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
  location: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  description: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  memberCount: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    justifyContent: 'center',
    marginTop: spacing[1],
  },
  tag: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.cream,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  tagLabel: {
    fontFamily: typography.mono,
    fontSize: 9,
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
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  eventInfo: { flex: 1 },
  eventTitle: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  eventMeta: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: 2,
  },
  eventDesc: {
    fontFamily: typography.body,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    lineHeight: 18,
    marginTop: 2,
  },
  eventRight: {
    alignItems: 'flex-end',
    gap: spacing[1],
    flexShrink: 0,
  },
  eventArrow: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  linkRow: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.clay,
    paddingVertical: spacing[1],
  },
  joinSection: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  verifyHint: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.clay,
    lineHeight: 18,
  },
  flowQuestion: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.ink,
    lineHeight: 22,
    marginBottom: spacing[2],
  },
  flowLead: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkMid,
    lineHeight: 22,
  },
  flowMuted: {
    fontFamily: typography.body,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    lineHeight: 18,
    marginTop: spacing[2],
  },
  memberChoiceRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  memberChoiceHalf: {
    flex: 1,
    minWidth: 0,
  },
  formalJoinBtn: {
    marginTop: spacing[2],
  },
  formalAfterEmail: {
    marginTop: spacing[3],
  },
  memberHint: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    lineHeight: 20,
  },
  statusHint: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
    lineHeight: 20,
  },
  ownerMsg: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    lineHeight: 18,
    marginTop: spacing[1],
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 26, 22, 0.45)',
    justifyContent: 'center',
    padding: spacing[4],
  },
  modalKb: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[3],
  },
  modalTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  modalHint: {
    fontFamily: typography.body,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    lineHeight: 18,
  },
  modalInput: {
    minHeight: 88,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing[3],
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  joinModalError: {
    fontFamily: typography.body,
    fontSize: fontSize.xs,
    color: colors.error,
  },
});
