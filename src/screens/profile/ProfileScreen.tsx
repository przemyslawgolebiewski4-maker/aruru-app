import React, { useState, type ReactNode } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { MaterialTopTabNavigationProp } from '@react-navigation/material-top-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useAuth } from '../../hooks/useAuth';
import { AvatarImage } from '../../components/AvatarImage';
import { Avatar, Badge, Button } from '../../components/ui';
import {
  colors,
  typography,
  fontSize,
  spacing,
  radius,
} from '../../theme/tokens';
import type { AppStackParamList, MainTabParamList } from '../../navigation/types';
import {
  apiFetch,
  SUSPENDED_MEMBERSHIP_REASON_FALLBACK,
} from '../../services/api';

const H_PAD = Platform.OS === 'web' ? spacing[5] : spacing[3];

function roleToBadgeVariant(
  role: string
): 'clay' | 'moss' | 'neutral' {
  if (role === 'owner') return 'clay';
  if (role === 'assistant') return 'moss';
  return 'neutral';
}

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function studioInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

function NewBadge() {
  return (
    <View style={miniBadgeStyles.wrap}>
      <Text style={miniBadgeStyles.text}>New</Text>
    </View>
  );
}

const miniBadgeStyles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.clayLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: spacing[2],
  },
  text: {
    fontFamily: typography.monoMedium,
    fontSize: 9,
    color: colors.clayDark,
    textTransform: 'uppercase',
    letterSpacing: 0.04,
  },
});

function Card({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardSectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function RowIconWrap({ children }: { children: ReactNode }) {
  return <View style={styles.rowIconWrap}>{children}</View>;
}

function MenuRow({
  icon,
  title,
  subtitle,
  onPress,
  isLast,
  titleAccessory,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
  isLast?: boolean;
  titleAccessory?: ReactNode;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, !isLast && styles.menuRowBorder]}
      onPress={onPress}
      activeOpacity={0.78}
      accessibilityRole="button"
    >
      {icon}
      <View style={styles.menuRowText}>
        <View style={styles.menuRowTitleLine}>
          <Text style={styles.menuRowTitle}>{title}</Text>
          {titleAccessory}
        </View>
        {subtitle ? <Text style={styles.menuRowSub}>{subtitle}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

function IconPhoto({ stroke = colors.inkMid }: { stroke?: string }) {
  return (
    <RowIconWrap>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Rect x="3" y="5" width="18" height="14" rx="2" stroke={stroke} strokeWidth={1.5} />
        <Path
          stroke={stroke}
          strokeWidth={1.5}
          strokeLinecap="round"
          d="M8 11h.02M12 14l2-2 3 3"
        />
        <Circle cx={8.5} cy={10.5} r={1} fill={stroke} />
      </Svg>
    </RowIconWrap>
  );
}

function IconEdit({ stroke = colors.inkMid }: { stroke?: string }) {
  return (
    <RowIconWrap>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path
          stroke={stroke}
          strokeWidth={1.5}
          strokeLinecap="round"
          d="M12 20h9M16.5 3.5a2.12 2.12 0 1 1 3 3L8 18l-4 1 1-4L16.5 3.5z"
        />
      </Svg>
    </RowIconWrap>
  );
}

function IconEye({ stroke = colors.inkMid }: { stroke?: string }) {
  return (
    <RowIconWrap>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path
          stroke={stroke}
          strokeWidth={1.5}
          strokeLinecap="round"
          d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"
        />
        <Circle cx={12} cy={12} r={3} stroke={stroke} strokeWidth={1.5} />
      </Svg>
    </RowIconWrap>
  );
}

function IconSparkle({ stroke = colors.inkMid }: { stroke?: string }) {
  return (
    <RowIconWrap>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path
          stroke={stroke}
          strokeWidth={1.5}
          strokeLinejoin="round"
          d="m12 2 1.09 4.26L17 7l-3.91 1.74L12 13l-1.09-4.26L7 7l3.91-1.74L12 2Z"
        />
      </Svg>
    </RowIconWrap>
  );
}

function IconBuilding({ stroke = colors.inkMid }: { stroke?: string }) {
  return (
    <RowIconWrap>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path
          stroke={stroke}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9"
        />
      </Svg>
    </RowIconWrap>
  );
}

function IconPlus({ stroke = colors.inkMid }: { stroke?: string }) {
  return (
    <RowIconWrap>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path
          stroke={stroke}
          strokeWidth={1.5}
          strokeLinecap="round"
          d="M12 5v14M5 12h14"
        />
      </Svg>
    </RowIconWrap>
  );
}

function IconInbox({ stroke = colors.inkMid }: { stroke?: string }) {
  return (
    <RowIconWrap>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path
          stroke={stroke}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M22 12h-6l-2 3h-4l-2-3H2"
        />
        <Path
          stroke={stroke}
          strokeWidth={1.5}
          strokeLinejoin="round"
          d="M5.45 5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-7a2 2 0 0 0-1.8-1.2H7.25a2 2 0 0 0-1.8 1.2Z"
        />
      </Svg>
    </RowIconWrap>
  );
}

function IconMail({ stroke = colors.inkMid }: { stroke?: string }) {
  return (
    <RowIconWrap>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path
          stroke={stroke}
          strokeWidth={1.5}
          strokeLinecap="round"
          d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2Z"
        />
        <Path
          stroke={stroke}
          strokeWidth={1.5}
          strokeLinecap="round"
          d="m22 6-10 7L2 6"
        />
      </Svg>
    </RowIconWrap>
  );
}

export default function ProfileScreen() {
  const { user, studios, suspendedStudios } = useAuth();
  const isSponsor = user?.userRole === 'sponsor';
  const navigation = useNavigation();
  const stackNav =
    navigation.getParent<NativeStackNavigationProp<AppStackParamList>>();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSent, setInviteSent] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  const portfolioPreview = (user?.portfolioUrls ?? [])
    .map((u) => (u && String(u).trim() ? String(u).trim() : null))
    .filter((u): u is string => u != null)
    .slice(0, 4);

  async function handleInviteToAruru() {
    setInviteError('');
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setInviteError('Enter a valid email address.');
      return;
    }
    setInviteSending(true);
    try {
      await apiFetch('/auth/invite-to-aruru', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setInviteSent(true);
      setInviteEmail('');
      setTimeout(() => {
        setInviteSent(false);
        setShowInviteForm(false);
      }, 3000);
    } catch (e: unknown) {
      setInviteError(
        e instanceof Error ? e.message : 'Could not send invitation.'
      );
    } finally {
      setInviteSending(false);
    }
  }

  function goEditProfile() {
    stackNav?.navigate('EditProfile');
  }

  function goPricingSettings(studio: (typeof studios)[number]) {
    stackNav?.navigate('PricingSettings', {
      tenantId: studio.tenantId,
      studioName: studio.studioName || studio.studioSlug,
    });
  }

  function goStudioSettings(studio: (typeof studios)[number]) {
    stackNav?.navigate('StudioSettings', {
      tenantId: studio.tenantId,
      studioName: studio.studioName || studio.studioSlug,
    });
  }

  const visibilitySummary =
    user?.communityVisibility?.profile === 'only_me'
      ? 'Profile hidden from community'
      : user?.communityVisibility?.studios === 'only_me'
        ? 'Studios hidden'
        : 'Visible to everyone';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Identity ── */}
      <Card title="Identity">
        <TouchableOpacity
          style={[styles.heroRow, styles.menuRowBorder]}
          onPress={goEditProfile}
          activeOpacity={0.78}
          accessibilityRole="button"
          accessibilityLabel="Avatar and portfolio, edit profile"
        >
          <View style={styles.heroLeft}>
            <Avatar
              name={user?.name ?? 'User'}
              size="lg"
              imageUrl={user?.avatarUrl}
            />
            <View style={styles.heroThumbs}>
              {portfolioPreview.map((uri) => (
                <Image
                  key={uri}
                  source={{ uri }}
                  style={styles.thumb}
                />
              ))}
            </View>
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>{user?.name ?? '—'}</Text>
            <Text style={styles.heroSub}>Visible in community</Text>
            <Text style={styles.heroEmail}>{user?.email ?? ''}</Text>
            {user?.city || user?.country ? (
              <Text style={styles.heroMeta}>
                {[user?.city, user?.country].filter(Boolean).join(', ')}
              </Text>
            ) : null}
            {user?.emailVerified ? (
              <Text style={styles.verifiedTiny}>Email verified</Text>
            ) : (
              <Text style={styles.unverifiedTiny}>Email not verified</Text>
            )}
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <MenuRow
          icon={<IconEdit />}
          title="Edit profile"
          subtitle="Name, bio, city, links"
          onPress={goEditProfile}
        />
        <MenuRow
          icon={<IconEye />}
          title="Community visibility"
          subtitle={visibilitySummary}
          onPress={goEditProfile}
          titleAccessory={<NewBadge />}
        />
        <MenuRow
          icon={<IconSparkle />}
          title="Show on Aruru homepage"
          subtitle="Featured photo consent"
          onPress={goEditProfile}
          isLast
          titleAccessory={<NewBadge />}
        />
      </Card>

      {/* ── Studios ── */}
      <Card title="Studios">
        <Text style={styles.cardIntro}>
          Studios you belong to, with your role and links to settings (owners).
        </Text>
        {studios.length === 0 ? (
          isSponsor ? (
            <Text style={styles.emptyInCard}>
              No studios linked to this account.
            </Text>
          ) : (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyLead}>You&apos;re not in any studio yet.</Text>
              <Text style={styles.emptyBody}>
                <Text style={styles.emptyStrong}>
                  Create a studio only if you own or run the workshop
                </Text>
                — you become that studio&apos;s owner. To join an existing
                studio, open Community → Studio Finder and send a join request.
              </Text>
            </View>
          )
        ) : (
          studios.map((s, i) => (
            <View
              key={s.tenantId}
              style={[styles.studioBlock, i < studios.length - 1 && styles.menuRowBorder]}
            >
              <View style={styles.studioRowInner}>
                <AvatarImage
                  url={s.logoUrl}
                  initials={studioInitials(s.studioName || s.studioSlug || '?')}
                  size={40}
                  borderRadius={8}
                  bgColor={colors.mossLight}
                  textColor={colors.moss}
                />
                <View style={styles.studioMid}>
                  <Text style={styles.studioNameText} numberOfLines={1}>
                    {s.studioName || s.studioSlug}
                  </Text>
                  {s.role === 'owner' && s.status === 'active' ? (
                    <View style={styles.studioLinks}>
                      <TouchableOpacity
                        onPress={() => goStudioSettings(s)}
                        hitSlop={8}
                        accessibilityRole="button"
                      >
                        <Text style={styles.studioLink}>Studio settings →</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => goPricingSettings(s)}
                        hitSlop={8}
                        accessibilityRole="button"
                      >
                        <Text style={styles.studioLink}>Edit pricing →</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
                <Badge
                  label={formatRole(s.role)}
                  variant={roleToBadgeVariant(s.role)}
                />
              </View>
            </View>
          ))
        )}

        {!isSponsor ? (
          <MenuRow
            icon={<IconPlus />}
            title={
              studios.length === 0
                ? 'Create a studio (I am the owner)'
                : 'Create a studio'
            }
            onPress={() =>
              navigation
                .getParent<NativeStackNavigationProp<AppStackParamList>>()
                ?.navigate('CreateStudio')
            }
          />
        ) : null}
        {!isSponsor && studios.length === 0 ? (
          <MenuRow
            icon={<IconBuilding />}
            title="Community — studio directory"
            subtitle="Find a studio to join"
            onPress={() =>
              (
                navigation as MaterialTopTabNavigationProp<MainTabParamList>
              ).jumpTo('Community')
            }
          />
        ) : null}
        {!isSponsor && user ? (
          <MenuRow
            icon={<IconInbox />}
            title="My join requests"
            subtitle="Track pending studio requests"
            onPress={() => stackNav?.navigate('MyJoinRequests')}
            isLast={suspendedStudios.length === 0}
          />
        ) : null}

        {suspendedStudios.length > 0 ? (
          <>
            <View style={styles.susHeader}>
              <Text style={styles.susHeaderText}>Suspended studios</Text>
              <Text style={styles.susHeaderHint}>
                Subscription paused — hidden from your dashboard switcher until
                renewed.
              </Text>
            </View>
            {suspendedStudios.map((s, i) => {
              const reason = (s.suspensionReason ?? '').trim();
              return (
                <View
                  key={`sus-${s.tenantId}`}
                  style={[
                    styles.studioBlock,
                    i < suspendedStudios.length - 1 && styles.menuRowBorder,
                  ]}
                >
                  <View style={styles.studioRowInner}>
                    <AvatarImage
                      url={s.logoUrl}
                      initials={studioInitials(
                        s.studioName || s.studioSlug || '?'
                      )}
                      size={40}
                      borderRadius={8}
                      bgColor={colors.clayLight}
                      textColor={colors.clay}
                    />
                    <View style={styles.studioMid}>
                      <Text style={styles.studioNameText} numberOfLines={1}>
                        {s.studioName || s.studioSlug}
                      </Text>
                      <Text style={styles.suspendedReason}>
                        {reason || SUSPENDED_MEMBERSHIP_REASON_FALLBACK}
                      </Text>
                    </View>
                    <Badge label="Suspended" variant="neutral" />
                  </View>
                </View>
              );
            })}
          </>
        ) : null}
      </Card>

      {/* ── Sharing ── */}
      <Card title="Sharing">
        <TouchableOpacity
          style={[styles.menuRow, !showInviteForm && styles.menuRowLast]}
          onPress={() => setShowInviteForm((v) => !v)}
          activeOpacity={0.78}
        >
          <IconMail />
          <View style={styles.menuRowText}>
            <Text style={styles.menuRowTitle}>Invite a friend</Text>
            <Text style={styles.menuRowSub}>Email invite form</Text>
          </View>
          <Text style={styles.chevron}>{showInviteForm ? '⌄' : '›'}</Text>
        </TouchableOpacity>
        {showInviteForm ? (
          <View style={styles.inviteBox}>
            <TextInput
              style={styles.inviteInput}
              value={inviteEmail}
              onChangeText={(v) => {
                setInviteEmail(v);
                setInviteError('');
                setInviteSent(false);
              }}
              placeholder="friend@email.com"
              placeholderTextColor={colors.inkLight}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {inviteError ? (
              <Text style={styles.inviteError}>{inviteError}</Text>
            ) : null}
            {inviteSent ? (
              <Text style={styles.inviteSent}>Invitation sent!</Text>
            ) : null}
            <Button
              label="Send invitation"
              variant="primary"
              onPress={() => void handleInviteToAruru()}
              loading={inviteSending}
              fullWidth
            />
          </View>
        ) : null}
      </Card>

      <View style={{ height: spacing[10] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.cream },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
  },
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    paddingBottom: spacing[1],
    marginBottom: spacing[4],
    overflow: 'hidden',
  },
  cardSectionTitle: {
    fontFamily: typography.monoMedium,
    fontSize: 10,
    letterSpacing: 0.07,
    textTransform: 'uppercase',
    color: colors.inkLight,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  cardIntro: {
    fontFamily: typography.body,
    fontSize: fontSize.xs,
    color: colors.inkMid,
    lineHeight: 18,
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  menuRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuRowText: { flex: 1, minWidth: 0 },
  menuRowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing[1],
  },
  menuRowTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.base,
    color: colors.ink,
  },
  menuRowSub: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: 2,
    lineHeight: 17,
  },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.clayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    fontSize: 20,
    color: colors.inkLight,
    marginLeft: spacing[1],
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  heroThumbs: { flexDirection: 'row', gap: 4 },
  thumb: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: colors.clayLight,
  },
  heroText: { flex: 1, minWidth: 0 },
  heroTitle: {
    fontFamily: typography.display,
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  heroSub: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.clay,
    marginTop: 2,
  },
  heroEmail: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    marginTop: spacing[1],
  },
  heroMeta: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
    marginTop: 2,
  },
  verifiedTiny: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.mossDark,
    marginTop: 4,
  },
  unverifiedTiny: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.clay,
    marginTop: 4,
  },
  emptyInCard: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    lineHeight: 20,
  },
  emptyBlock: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[2],
  },
  emptyLead: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.base,
    color: colors.ink,
  },
  emptyBody: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkMid,
    lineHeight: 21,
  },
  emptyStrong: { fontFamily: typography.bodyMedium, color: colors.ink },
  studioBlock: { paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  studioRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  studioMid: { flex: 1, minWidth: 0 },
  studioNameText: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.base,
    color: colors.ink,
  },
  studioLinks: { marginTop: 4, gap: 2 },
  studioLink: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.clay,
  },
  suspendedReason: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
    marginTop: 4,
    lineHeight: 16,
  },
  susHeader: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  susHeaderText: {
    fontFamily: typography.monoMedium,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.06,
    color: colors.inkLight,
  },
  susHeaderHint: {
    fontFamily: typography.body,
    fontSize: fontSize.xs,
    color: colors.inkMid,
    marginTop: 4,
    lineHeight: 18,
  },
  inviteBox: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    gap: spacing[2],
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  inviteInput: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: 10,
    fontFamily: typography.body,
    fontSize: fontSize.base,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  inviteError: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  inviteSent: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.moss,
  },
});
