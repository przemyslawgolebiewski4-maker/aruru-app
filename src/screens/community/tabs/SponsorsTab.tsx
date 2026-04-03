import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../../hooks/useAuth';
import { AvatarImage } from '../../../components/AvatarImage';
import { Button, Input } from '../../../components/ui';
import { apiFetch } from '../../../services/api';
import { colors, typography, fontSize, spacing, radius } from '../../../theme/tokens';
import type { AppStackParamList } from '../../../navigation/types';

type PublicSponsor = {
  id: string;
  name: string;
  category?: string;
  websiteUrl?: string;
  logoUrl?: string;
  deliveryCountries?: string[];
};

type StatsData = {
  sponsors: unknown[];
  sponsorCount: number;
  studioCount: number;
  artistCount: number;
};

type SponsorProfile = {
  id: string;
  companyName: string;
  description?: string;
  category?: string;
  websiteUrl?: string;
  logoUrl?: string;
  deliveryCountries?: string[];
  status: string;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  postsPerMonth?: number;
};

type SponsorStats = {
  totalClicks: number;
  monthClicks: number;
  prevMonthClicks: number;
  totalViews: number;
  monthViews: number;
  postsThisMonth: number;
  postsPerMonth: number;
  canPostThisMonth: boolean;
  nextPostDate?: string;
};

type SponsorPost = {
  id: string;
  title: string;
  content: string;
  category?: string;
  logoUrl?: string;
  createdAt?: string;
  expiresAt?: string;
};

const BASE =
  process.env.EXPO_PUBLIC_API_URL ??
  'https://aruru-backend-production.up.railway.app';

const CATEGORY_OPTIONS = [
  { key: 'clay', label: 'Clay' },
  { key: 'glazes', label: 'Glazes' },
  { key: 'tools', label: 'Tools' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'books', label: 'Books' },
  { key: 'other', label: 'Other' },
] as const;

function companyInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

function normalizeWebsiteHref(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function normalizePublicSponsor(row: unknown, index: number): PublicSponsor {
  const r = row as Record<string, unknown>;
  const id = String(r.id ?? r._id ?? `sponsor-${index}`);
  const dc = r.deliveryCountries ?? r.delivery_countries;
  const deliveryCountries = Array.isArray(dc)
    ? dc.map((x) => String(x))
    : undefined;
  const web = r.websiteUrl ?? r.website_url ?? r.url;
  const logo = r.logoUrl ?? r.logo_url ?? r.logo;
  return {
    id,
    name: String(r.name ?? r.companyName ?? r.company_name ?? ''),
    category:
      r.category != null && String(r.category).trim()
        ? String(r.category)
        : undefined,
    websiteUrl: web != null ? String(web) : undefined,
    logoUrl: logo != null ? String(logo) : undefined,
    deliveryCountries,
  };
}

function normalizeProfile(raw: Record<string, unknown>): SponsorProfile {
  const dc = raw.deliveryCountries ?? raw.delivery_countries;
  return {
    id: String(raw.id ?? ''),
    companyName: String(raw.companyName ?? raw.company_name ?? ''),
    description:
      raw.description != null ? String(raw.description) : undefined,
    category: raw.category != null ? String(raw.category) : undefined,
    websiteUrl: (raw.websiteUrl ?? raw.website_url) as string | undefined,
    logoUrl: (raw.logoUrl ?? raw.logo_url) as string | undefined,
    deliveryCountries: Array.isArray(dc)
      ? dc.map((x) => String(x))
      : undefined,
    status: String(raw.status ?? ''),
    subscriptionStatus:
      raw.subscriptionStatus != null || raw.subscription_status != null
        ? String(raw.subscriptionStatus ?? raw.subscription_status)
        : undefined,
    subscriptionPlan:
      raw.subscriptionPlan != null || raw.subscription_plan != null
        ? String(raw.subscriptionPlan ?? raw.subscription_plan)
        : undefined,
    postsPerMonth:
      raw.postsPerMonth != null || raw.posts_per_month != null
        ? Number(raw.postsPerMonth ?? raw.posts_per_month)
        : undefined,
  };
}

function normalizeStats(raw: Record<string, unknown>): SponsorStats {
  return {
    totalClicks: Number(raw.totalClicks ?? raw.total_clicks ?? 0),
    monthClicks: Number(raw.monthClicks ?? raw.month_clicks ?? 0),
    prevMonthClicks: Number(raw.prevMonthClicks ?? raw.prev_month_clicks ?? 0),
    totalViews: Number(raw.totalViews ?? raw.total_views ?? 0),
    monthViews: Number(raw.monthViews ?? raw.month_views ?? 0),
    postsThisMonth: Number(raw.postsThisMonth ?? raw.posts_this_month ?? 0),
    postsPerMonth: Number(raw.postsPerMonth ?? raw.posts_per_month ?? 0),
    canPostThisMonth: Boolean(
      raw.canPostThisMonth ?? raw.can_post_this_month ?? false
    ),
    nextPostDate:
      raw.nextPostDate != null || raw.next_post_date != null
        ? String(raw.nextPostDate ?? raw.next_post_date)
        : undefined,
  };
}

function normalizePost(row: Record<string, unknown>): SponsorPost {
  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? ''),
    content: String(row.content ?? row.body ?? ''),
    category: row.category != null ? String(row.category) : undefined,
    logoUrl: (row.logoUrl ?? row.logo_url) as string | undefined,
    createdAt:
      row.createdAt != null || row.created_at != null
        ? String(row.createdAt ?? row.created_at)
        : undefined,
    expiresAt:
      row.expiresAt != null || row.expires_at != null
        ? String(row.expiresAt ?? row.expires_at)
        : undefined,
  };
}

export default function SponsorsTab() {
  const { user, studios } = useAuth();
  const navigation = useNavigation();
  const stackNav =
    navigation.getParent<NativeStackNavigationProp<AppStackParamList>>();

  const isSponsor = user?.userRole === 'sponsor';

  const [publicSponsors, setPublicSponsors] = useState<PublicSponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const viewedIdsRef = useRef<Set<string>>(new Set());

  const [sponsorProfile, setSponsorProfile] = useState<SponsorProfile | null>(
    null
  );
  const [sponsorStats, setSponsorStats] = useState<SponsorStats | null>(null);
  const [myPosts, setMyPosts] = useState<SponsorPost[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState('other');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [showPostForm, setShowPostForm] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postCategory, setPostCategory] = useState('');
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postFormError, setPostFormError] = useState('');

  const isActiveSponsor =
    isSponsor && sponsorProfile?.subscriptionStatus === 'active';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/public/stats`);
      const data = (await res.json()) as StatsData;
      const rawList = Array.isArray(data.sponsors) ? data.sponsors : [];
      setPublicSponsors(rawList.map(normalizePublicSponsor));

      if (isSponsor) {
        try {
          const prof = await apiFetch<Record<string, unknown>>(
            '/sponsor/profile'
          );
          setSponsorProfile(normalizeProfile(prof));
        } catch {
          setSponsorProfile(null);
        }
        try {
          const st = await apiFetch<Record<string, unknown>>('/sponsor/stats');
          setSponsorStats(normalizeStats(st));
        } catch {
          setSponsorStats(null);
        }
        try {
          const postsRes = await apiFetch<{ posts?: unknown[] } | unknown[]>(
            '/sponsor/posts'
          );
          const arr = Array.isArray(postsRes)
            ? postsRes
            : Array.isArray((postsRes as { posts?: unknown[] }).posts)
              ? (postsRes as { posts: unknown[] }).posts
              : [];
          setMyPosts(
            arr.map((p) =>
              normalizePost(
                typeof p === 'object' && p ? (p as Record<string, unknown>) : {}
              )
            )
          );
        } catch {
          setMyPosts([]);
        }
      } else {
        setSponsorProfile(null);
        setSponsorStats(null);
        setMyPosts([]);
      }
    } catch {
      setPublicSponsors([]);
    } finally {
      setLoading(false);
    }
  }, [isSponsor]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const countryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of publicSponsors) {
      for (const c of s.deliveryCountries ?? []) {
        const t = c.trim();
        if (t) set.add(t);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [publicSponsors]);

  const filteredPublic = useMemo(() => {
    if (!countryFilter) return publicSponsors;
    return publicSponsors.filter((s) =>
      (s.deliveryCountries ?? []).some(
        (c) => c.trim().toLowerCase() === countryFilter.toLowerCase()
      )
    );
  }, [publicSponsors, countryFilter]);

  useEffect(() => {
    for (const s of filteredPublic) {
      if (!s.id || viewedIdsRef.current.has(s.id)) continue;
      viewedIdsRef.current.add(s.id);
      void fetch(`${BASE}/sponsor/view/${s.id}`, { method: 'POST' });
    }
  }, [filteredPublic]);

  function openSponsorWebsite(s: PublicSponsor) {
    if (s.id) {
      void fetch(`${BASE}/sponsor/click/${s.id}`, { method: 'POST' });
    }
    const href = normalizeWebsiteHref(s.websiteUrl ?? '');
    if (href) void Linking.openURL(href);
  }

  function resetFormFields() {
    setCompanyName('');
    setCategory('other');
    setDescription('');
    setWebsiteUrl('');
    setFormError('');
  }

  function closeForm() {
    setShowForm(false);
    setSubmitted(false);
    resetFormFields();
  }

  async function handlePartnerSubmit() {
    setFormError('');
    if (companyName.trim().length < 2) {
      setFormError('Company name required');
      return;
    }
    if (description.trim().length < 10) {
      setFormError('Description too short');
      return;
    }
    if (!websiteUrl.trim()) {
      setFormError('Website URL required');
      return;
    }

    const tenantId = studios[0]?.tenantId ?? '';

    setSubmitting(true);
    try {
      await apiFetch(
        '/community/sponsors/register',
        {
          method: 'POST',
          body: JSON.stringify({
            company_name: companyName.trim(),
            category,
            description: description.trim(),
            website_url: websiteUrl.trim(),
          }),
        },
        tenantId
      );
      setSubmitted(true);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Could not submit.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePublishPost() {
    setPostFormError('');
    if (!postTitle.trim()) {
      setPostFormError('Title is required.');
      return;
    }
    if (postContent.trim().length < 10) {
      setPostFormError('Content must be at least 10 characters.');
      return;
    }
    setPostSubmitting(true);
    try {
      await apiFetch('/sponsor/posts', {
        method: 'POST',
        body: JSON.stringify({
          title: postTitle.trim(),
          content: postContent.trim(),
          category: postCategory.trim() || undefined,
        }),
      });
      setShowPostForm(false);
      setPostTitle('');
      setPostContent('');
      setPostCategory('');
      await load();
    } catch (e: unknown) {
      setPostFormError(e instanceof Error ? e.message : 'Could not publish.');
    } finally {
      setPostSubmitting(false);
    }
  }

  const clickTrendLabel =
    sponsorStats == null
      ? ''
      : sponsorStats.prevMonthClicks <= 0
        ? 'vs last month: —'
        : sponsorStats.monthClicks >= sponsorStats.prevMonthClicks
          ? `vs last month: +${sponsorStats.monthClicks - sponsorStats.prevMonthClicks}`
          : `vs last month: ${sponsorStats.monthClicks - sponsorStats.prevMonthClicks}`;

  if (showForm && !isSponsor) {
    if (submitted) {
      return (
        <ScrollView
          style={styles.root}
          contentContainerStyle={styles.formScroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.successEmoji} accessibilityLabel="Success">
            ✓
          </Text>
          <Text style={styles.successTitle}>Application submitted!</Text>
          <Text style={styles.successBody}>
            We&apos;ll review it and get back to you soon.
          </Text>
          <Button
            label="Back to sponsors"
            onPress={() => {
              setSubmitted(false);
              setShowForm(false);
              resetFormFields();
              void load();
            }}
            fullWidth
          />
        </ScrollView>
      );
    }

    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.formScroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formHeaderRow}>
          <Text style={styles.formHeaderTitle}>Apply as a partner</Text>
          <TouchableOpacity
            onPress={closeForm}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.formClose}>✕</Text>
          </TouchableOpacity>
        </View>

        <Input
          label="Company name"
          value={companyName}
          onChangeText={setCompanyName}
          placeholder="Your company or brand"
          autoCapitalize="words"
        />

        <View>
          <Text style={styles.chipsLabel}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.chip,
                  category === opt.key && styles.chipActive,
                ]}
                onPress={() => setCategory(opt.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipLabel,
                    category === opt.key && styles.chipLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Min. 10 characters — how you support the community"
          multiline
          numberOfLines={4}
          style={styles.textArea}
        />

        <Input
          label="Website URL"
          value={websiteUrl}
          onChangeText={setWebsiteUrl}
          placeholder="https://example.com"
          autoCapitalize="none"
          keyboardType="url"
        />

        {formError ? <Text style={styles.formError}>{formError}</Text> : null}

        <Button
          label="Submit"
          onPress={() => void handlePartnerSubmit()}
          loading={submitting}
          fullWidth
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.listScroll}
      keyboardShouldPersistTaps="handled"
    >
      {isSponsor && sponsorProfile?.status === 'pending' ? (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingBannerTitle}>Application under review</Text>
          <Text style={styles.pendingBannerBody}>
            Your profile will appear here once approved by the Aruru team.
          </Text>
        </View>
      ) : null}

      {isSponsor &&
      sponsorProfile &&
      sponsorProfile.status !== 'pending' &&
      sponsorProfile.subscriptionStatus !== 'active' ? (
        <View style={styles.subscribeBanner}>
          <Text style={styles.subscribeBannerText}>
            Choose a plan to activate your profile
          </Text>
          <Button
            label="Subscribe"
            variant="primary"
            onPress={() => stackNav?.navigate('SponsorPlan')}
            fullWidth
            style={styles.subscribeBtn}
          />
        </View>
      ) : null}

      {isActiveSponsor && sponsorProfile ? (
        <View style={styles.sponsorPanel}>
          <Text style={styles.panelTitle}>Your partner profile</Text>
          <View style={styles.panelRow}>
            <View style={styles.logoWrap}>
              <AvatarImage
                url={sponsorProfile.logoUrl}
                initials={companyInitials(sponsorProfile.companyName || '?')}
                size={48}
                borderRadius={10}
                bgColor={colors.mossLight}
                textColor={colors.moss}
              />
            </View>
            <View style={styles.panelInfo}>
              <Text style={styles.panelName}>{sponsorProfile.companyName}</Text>
              {sponsorProfile.category ? (
                <Text style={styles.panelMeta}>{sponsorProfile.category}</Text>
              ) : null}
              {sponsorProfile.websiteUrl?.trim() ? (
                <TouchableOpacity
                  onPress={() =>
                    openSponsorWebsite({
                      id: sponsorProfile.id,
                      name: sponsorProfile.companyName,
                      websiteUrl: sponsorProfile.websiteUrl,
                    })
                  }
                >
                  <Text style={styles.panelLink}>
                    {sponsorProfile.websiteUrl.trim()}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {sponsorStats ? (
            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Link clicks</Text>
                <Text style={styles.statValue}>{sponsorStats.monthClicks}</Text>
                <Text style={styles.statSub}>{clickTrendLabel}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Profile views</Text>
                <Text style={styles.statValue}>{sponsorStats.monthViews}</Text>
                <Text style={styles.statSub}>This month</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Posts</Text>
                <Text style={styles.statValue}>
                  {sponsorStats.postsThisMonth}/{sponsorStats.postsPerMonth || '—'}
                </Text>
                <Text style={styles.statSub}>This month / limit</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.panelActions}>
            <Button
              label="Edit profile"
              variant="secondary"
              onPress={() => stackNav?.navigate('SponsorEditProfile')}
              style={styles.panelActionBtn}
            />
            <Button
              label="+ New post"
              variant="primary"
              disabled={sponsorStats ? !sponsorStats.canPostThisMonth : false}
              onPress={() => {
                setPostFormError('');
                setShowPostForm(true);
              }}
              style={styles.panelActionBtn}
            />
          </View>
          {sponsorStats && !sponsorStats.canPostThisMonth ? (
            <Text style={styles.nextPostHint}>
              {sponsorStats.nextPostDate
                ? `Next post available: ${sponsorStats.nextPostDate}`
                : 'Post limit reached for this month.'}
            </Text>
          ) : null}
        </View>
      ) : null}

      {isActiveSponsor && showPostForm ? (
        <View style={styles.inlinePostForm}>
          <Text style={styles.inlinePostTitle}>New post</Text>
          <Input
            label="Title"
            value={postTitle}
            onChangeText={setPostTitle}
          />
          <Input
            label="Category"
            value={postCategory}
            onChangeText={setPostCategory}
            placeholder="Optional"
          />
          <Input
            label="Content"
            value={postContent}
            onChangeText={setPostContent}
            multiline
            numberOfLines={5}
            style={styles.textArea}
          />
          {postFormError ? (
            <Text style={styles.formError}>{postFormError}</Text>
          ) : null}
          <Button
            label="Publish"
            onPress={() => void handlePublishPost()}
            loading={postSubmitting}
            fullWidth
          />
          <Button
            label="Cancel"
            variant="ghost"
            onPress={() => {
              setShowPostForm(false);
              setPostFormError('');
            }}
            fullWidth
          />
        </View>
      ) : null}

      {isActiveSponsor && myPosts.length > 0 ? (
        <View style={styles.myPostsSection}>
          <Text style={styles.sectionHeading}>Your posts</Text>
          {myPosts.map((p) => (
            <View key={p.id} style={styles.postCard}>
              <Text style={styles.postTitle}>{p.title}</Text>
              {p.category ? (
                <Text style={styles.postCategory}>{p.category}</Text>
              ) : null}
              <Text style={styles.postContent} numberOfLines={2}>
                {p.content}
              </Text>
              {p.expiresAt ? (
                <Text style={styles.postExpires}>
                  Expires {formatShortDate(p.expiresAt)}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Partners & Suppliers</Text>
        <Text style={styles.headerBody}>
          Clay suppliers and partners who support the Aruru community.
        </Text>
        <Text style={styles.headerNote}>
          No ads · No tracking · Transparent sponsorship
        </Text>
      </View>

      <Text style={styles.allPartnersLabel}>All partners</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.countryChips}
      >
        <TouchableOpacity
          style={[
            styles.countryChip,
            countryFilter === null && styles.countryChipActive,
          ]}
          onPress={() => setCountryFilter(null)}
        >
          <Text
            style={[
              styles.countryChipText,
              countryFilter === null && styles.countryChipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {countryOptions.map((c) => (
          <TouchableOpacity
            key={c}
            style={[
              styles.countryChip,
              countryFilter === c && styles.countryChipActive,
            ]}
            onPress={() => setCountryFilter(c)}
          >
            <Text
              style={[
                styles.countryChipText,
                countryFilter === c && styles.countryChipTextActive,
              ]}
            >
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.clay} />
        </View>
      ) : filteredPublic.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyLine}>
            {countryFilter
              ? 'No partners in this filter.'
              : 'No partners yet.'}
          </Text>
          {!countryFilter ? (
            <Text style={styles.emptySub}>
              Want to support the community?
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.cards}>
          {filteredPublic.map((s) => (
            <View key={s.id} style={styles.card}>
              <View style={styles.logoWrap}>
                <AvatarImage
                  url={s.logoUrl}
                  initials={companyInitials(s.name || '?')}
                  size={48}
                  borderRadius={10}
                  bgColor={colors.mossLight}
                  textColor={colors.moss}
                />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardName} numberOfLines={2}>
                  {s.name || 'Partner'}
                </Text>
                {s.category ? (
                  <Text style={styles.cardCategory}>{s.category}</Text>
                ) : null}
                {s.deliveryCountries && s.deliveryCountries.length > 0 ? (
                  <Text style={styles.deliveryLine} numberOfLines={1}>
                    Ships: {s.deliveryCountries.join(', ')}
                  </Text>
                ) : null}
                {s.websiteUrl?.trim() ? (
                  <TouchableOpacity
                    onPress={() => openSponsorWebsite(s)}
                    accessibilityRole="link"
                  >
                    <Text style={styles.cardLink}>{s.websiteUrl.trim()}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}

      {!isSponsor ? (
        <TouchableOpacity
          style={styles.partnerLink}
          onPress={() => {
            resetFormFields();
            setSubmitted(false);
            setShowForm(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Become a partner"
        >
          <Text style={styles.partnerLinkText}>Become a partner →</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  listScroll: {
    padding: spacing[4],
    paddingBottom: spacing[10],
  },
  formScroll: {
    padding: spacing[4],
    paddingBottom: spacing[10],
    gap: spacing[4],
  },
  pendingBanner: {
    backgroundColor: '#EDE4A8',
    borderRadius: radius.md,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  pendingBannerTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
    marginBottom: spacing[1],
  },
  pendingBannerBody: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    lineHeight: 20,
  },
  subscribeBanner: {
    backgroundColor: colors.clayLight,
    borderRadius: radius.md,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  subscribeBannerText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
    marginBottom: spacing[3],
  },
  subscribeBtn: { alignSelf: 'stretch' },
  sponsorPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: spacing[4],
    marginBottom: spacing[4],
    gap: spacing[3],
  },
  panelTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  panelRow: { flexDirection: 'row', gap: spacing[3] },
  panelInfo: { flex: 1, minWidth: 0, gap: spacing[1] },
  panelName: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  panelMeta: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  panelLink: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.clay,
    textDecorationLine: 'underline',
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  statCard: {
    flex: 1,
    minWidth: '28%',
    backgroundColor: colors.cream,
    borderRadius: radius.sm,
    padding: spacing[2],
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  statLabel: {
    fontFamily: typography.mono,
    fontSize: 9,
    color: colors.inkLight,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.lg,
    color: colors.ink,
    marginTop: 2,
  },
  statSub: {
    fontFamily: typography.mono,
    fontSize: 9,
    color: colors.inkLight,
    marginTop: 2,
  },
  panelActions: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  panelActionBtn: { flex: 1, minWidth: 120 },
  nextPostHint: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  inlinePostForm: {
    gap: spacing[3],
    marginBottom: spacing[4],
    padding: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  inlinePostTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  myPostsSection: { marginBottom: spacing[4], gap: spacing[2] },
  sectionHeading: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[1],
  },
  postCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing[3],
    borderWidth: 0.5,
    borderColor: colors.border,
    marginBottom: spacing[2],
  },
  postTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  postCategory: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: 2,
  },
  postContent: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    marginTop: spacing[2],
    lineHeight: 20,
  },
  postExpires: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: spacing[2],
  },
  header: {
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  headerTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.lg,
    color: colors.ink,
  },
  headerBody: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
    lineHeight: 22,
  },
  headerNote: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    lineHeight: 18,
  },
  allPartnersLabel: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.ink,
    marginBottom: spacing[2],
  },
  countryChips: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[3],
    paddingRight: spacing[2],
  },
  countryChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  countryChipActive: {
    backgroundColor: colors.clay,
    borderColor: colors.clay,
  },
  countryChipText: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  countryChipTextActive: { color: colors.surface },
  loadingWrap: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  emptyWrap: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  emptyLine: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textAlign: 'center',
    marginTop: spacing[1],
  },
  cards: { gap: 0 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.mossLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1],
  },
  cardName: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  cardCategory: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'capitalize',
  },
  deliveryLine: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkMid,
  },
  cardLink: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.clay,
    textDecorationLine: 'underline',
  },
  partnerLink: {
    marginTop: spacing[6],
    paddingVertical: spacing[2],
    alignSelf: 'flex-start',
  },
  partnerLinkText: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.clay,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[1],
  },
  formHeaderTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.lg,
    color: colors.ink,
    flex: 1,
  },
  formClose: {
    fontFamily: typography.mono,
    fontSize: fontSize.lg,
    color: colors.inkLight,
    paddingHorizontal: spacing[2],
  },
  chipsLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingBottom: spacing[1],
  },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.clay,
    borderColor: colors.clay,
  },
  chipLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  chipLabelActive: {
    color: colors.surface,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  formError: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  successEmoji: {
    fontFamily: typography.body,
    fontSize: 48,
    color: colors.moss,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  successTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.lg,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  successBody: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing[6],
  },
});
