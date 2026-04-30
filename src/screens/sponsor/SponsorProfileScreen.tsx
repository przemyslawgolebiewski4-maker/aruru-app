import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AvatarImage } from '../../components/AvatarImage';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'SponsorProfile'>;

type SponsorPost = {
  id: string;
  title: string;
  content: string;
  category?: string;
  createdAt?: string;
};

type SponsorDetail = {
  id: string;
  companyName: string;
  description?: string;
  category?: string;
  websiteUrl?: string;
  logoUrl?: string;
  deliveryCountries?: string[];
  posts?: SponsorPost[];
};

const BASE =
  process.env.EXPO_PUBLIC_API_URL ??
  'https://aruru-backend-production.up.railway.app';

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

function normalizeWebsite(raw?: string): string {
  const t = raw?.trim() ?? '';
  if (!t) return '';
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 86400) return `${Math.max(0, Math.floor(diff / 3600))}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function normalizeSponsorDetail(data: Record<string, unknown>): SponsorDetail {
  const deliveryCountriesRaw =
    data.deliveryCountries ?? data.delivery_countries;
  const postsRaw = Array.isArray(data.posts) ? data.posts : [];

  return {
    id: String(data.id ?? data._id ?? ''),
    companyName: String(
      data.companyName ?? data.company_name ?? data.name ?? ''
    ),
    description:
      data.description != null ? String(data.description) : undefined,
    category: data.category != null ? String(data.category) : undefined,
    websiteUrl:
      data.websiteUrl != null || data.website_url != null
        ? String(data.websiteUrl ?? data.website_url)
        : undefined,
    logoUrl:
      data.logoUrl != null || data.logo_url != null
        ? String(data.logoUrl ?? data.logo_url)
        : undefined,
    deliveryCountries: Array.isArray(deliveryCountriesRaw)
      ? deliveryCountriesRaw.map(String).filter(Boolean)
      : [],
    posts: postsRaw
      .filter((p): p is Record<string, unknown> => Boolean(p && typeof p === 'object'))
      .map((p) => ({
        id: String(p.id ?? p._id ?? ''),
        title: String(p.title ?? ''),
        content: String(p.content ?? p.body ?? ''),
        category: p.category != null ? String(p.category) : undefined,
        createdAt:
          p.createdAt != null || p.created_at != null
            ? String(p.createdAt ?? p.created_at)
            : undefined,
      })),
  };
}

export default function SponsorProfileScreen({ route }: Props) {
  const { sponsorId } = route.params;
  const [sponsor, setSponsor] = useState<SponsorDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        setLoading(true);
        try {
          const res = await fetch(`${BASE}/public/sponsor/${sponsorId}`);
          if (!res.ok) throw new Error('Could not load partner.');
          const data = (await res.json()) as Record<string, unknown>;
          setSponsor(normalizeSponsorDetail(data));
          void fetch(`${BASE}/sponsor/view/${sponsorId}`, { method: 'POST' });
        } catch {
          setSponsor(null);
        } finally {
          setLoading(false);
        }
      })();
    }, [sponsorId])
  );

  function openWebsite() {
    const href = normalizeWebsite(sponsor?.websiteUrl);
    if (!href) return;
    void fetch(`${BASE}/sponsor/click/${sponsorId}`, { method: 'POST' });
    void Linking.openURL(href);
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.clay} />
      </View>
    );
  }

  if (!sponsor) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>Partner not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll}>
      <View style={s.header}>
        <AvatarImage
          url={sponsor.logoUrl}
          initials={companyInitials(sponsor.companyName)}
          size={64}
          borderRadius={14}
          bgColor={colors.mossLight}
          textColor={colors.moss}
        />
        <View style={s.headerInfo}>
          <Text style={s.name}>{sponsor.companyName}</Text>
          {sponsor.category ? (
            <Text style={s.category}>{sponsor.category}</Text>
          ) : null}
        </View>
      </View>

      {sponsor.description ? (
        <Text style={s.description}>{sponsor.description}</Text>
      ) : null}

      {sponsor.websiteUrl ? (
        <TouchableOpacity
          style={s.websiteBtn}
          onPress={openWebsite}
          activeOpacity={0.8}
          accessibilityRole="link"
        >
          <Text style={s.websiteBtnText}>Visit website {'->'}</Text>
        </TouchableOpacity>
      ) : null}

      {(sponsor.deliveryCountries ?? []).length > 0 ? (
        <View style={s.section}>
          <Text style={s.sectionLabel}>Ships to</Text>
          <Text style={s.sectionValue}>
            {sponsor.deliveryCountries?.join(', ')}
          </Text>
        </View>
      ) : null}

      {(sponsor.posts ?? []).length > 0 ? (
        <View style={s.section}>
          <Text style={s.sectionLabel}>Partner updates</Text>
          {(sponsor.posts ?? []).map((p) => (
            <View key={p.id} style={s.postCard}>
              <View style={s.partnerLabel}>
                <Text style={s.partnerLabelText}>Partner update</Text>
              </View>
              <Text style={s.postTitle}>{p.title}</Text>
              <Text style={s.postBody}>{p.content}</Text>
              {p.createdAt ? (
                <Text style={s.postDate}>{timeAgo(p.createdAt)}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      <View style={s.disclaimer}>
        <Text style={s.disclaimerText}>
          Partner content is clearly marked and separate from community
          discussions. Aruru does not share member data with partners.
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: spacing[4], paddingBottom: spacing[10] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    marginBottom: spacing[4],
  },
  headerInfo: { flex: 1 },
  name: {
    fontFamily: typography.bodySemiBold,
    fontSize: fontSize.xl,
    color: colors.ink,
    marginBottom: spacing[1],
  },
  category: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  description: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkMid,
    lineHeight: 24,
    marginBottom: spacing[4],
  },
  websiteBtn: {
    backgroundColor: colors.clay,
    borderRadius: radius.md,
    padding: spacing[3],
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  websiteBtnText: {
    fontFamily: typography.bodySemiBold,
    fontSize: fontSize.md,
    color: '#fff',
  },
  section: { marginBottom: spacing[5] },
  sectionLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
  },
  sectionValue: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkMid,
    lineHeight: 20,
  },
  postCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing[4],
    borderWidth: 0.5,
    borderColor: colors.border,
    marginBottom: spacing[3],
  },
  partnerLabel: {
    alignSelf: 'flex-start',
    backgroundColor: colors.mossLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    marginBottom: spacing[2],
  },
  partnerLabelText: {
    fontFamily: typography.mono,
    fontSize: 9,
    color: colors.moss,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  postTitle: {
    fontFamily: typography.bodySemiBold,
    fontSize: fontSize.md,
    color: colors.ink,
    marginBottom: spacing[2],
  },
  postBody: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkMid,
    lineHeight: 20,
  },
  postDate: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: spacing[2],
  },
  disclaimer: {
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    paddingTop: spacing[4],
    marginTop: spacing[2],
  },
  disclaimerText: {
    fontFamily: typography.body,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    lineHeight: 18,
  },
});
