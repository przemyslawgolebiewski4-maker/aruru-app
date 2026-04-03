import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AvatarImage } from '../../../components/AvatarImage';
import { Button, Input } from '../../../components/ui';
import { apiFetch } from '../../../services/api';
import { colors, typography, fontSize, spacing, radius } from '../../../theme/tokens';

type Sponsor = {
  name: string;
  category?: string;
  websiteUrl?: string;
  logoUrl?: string;
};

type StatsData = {
  sponsors: Sponsor[];
  sponsorCount: number;
  studioCount: number;
  artistCount: number;
};

const STATS_BASE =
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

function normalizeSponsor(row: Record<string, unknown>): Sponsor {
  const website =
    row.websiteUrl ?? row.website_url ?? row.url ?? row.website;
  const logo = row.logoUrl ?? row.logo_url ?? row.logo;
  return {
    name: String(row.name ?? row.companyName ?? row.company_name ?? ''),
    category:
      row.category != null && String(row.category).trim()
        ? String(row.category)
        : undefined,
    websiteUrl: website != null ? String(website) : undefined,
    logoUrl: logo != null ? String(logo) : undefined,
  };
}

function normalizeStats(raw: Record<string, unknown>): StatsData {
  const sponsorsRaw = raw.sponsors;
  const sponsors = Array.isArray(sponsorsRaw)
    ? sponsorsRaw.map((s) =>
        normalizeSponsor(typeof s === 'object' && s ? (s as Record<string, unknown>) : {})
      )
    : [];

  return {
    sponsors,
    sponsorCount: Number(raw.sponsorCount ?? raw.sponsor_count ?? sponsors.length),
    studioCount: Number(raw.studioCount ?? raw.studio_count ?? 0),
    artistCount: Number(raw.artistCount ?? raw.artist_count ?? 0),
  };
}

export default function SponsorsTab() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadStats = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch(`${STATS_BASE}/public/stats`);
      if (!res.ok) {
        throw new Error(`Could not load sponsors (HTTP ${res.status}).`);
      }
      const json = (await res.json()) as Record<string, unknown>;
      setData(normalizeStats(json));
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Could not load sponsors.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadStats();
    }, [loadStats])
  );

  function resetForm() {
    setCompanyName('');
    setCategory('');
    setDescription('');
    setWebsiteUrl('');
    setFormError('');
    setFormSuccess(false);
  }

  function closeForm() {
    setShowForm(false);
    resetForm();
  }

  async function handleSubmit() {
    setFormError('');
    if (!companyName.trim()) {
      setFormError('Company name is required.');
      return;
    }
    if (!category) {
      setFormError('Please choose a category.');
      return;
    }
    if (description.trim().length < 10) {
      setFormError('Description must be at least 10 characters.');
      return;
    }
    if (!websiteUrl.trim()) {
      setFormError('Website URL is required.');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/community/sponsors/register', {
        method: 'POST',
        body: JSON.stringify({
          company_name: companyName.trim(),
          category,
          description: description.trim(),
          website_url: websiteUrl.trim(),
        }),
      });
      setFormSuccess(true);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Could not submit application.');
    } finally {
      setSubmitting(false);
    }
  }

  function openPartnerForm() {
    resetForm();
    setShowForm(true);
  }

  const sponsors = data?.sponsors ?? [];

  if (showForm) {
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {formSuccess ? (
          <View style={styles.formBlock}>
            <Text style={styles.formTitle}>Thank you</Text>
            <Text style={styles.successBody}>
              Application submitted! We&apos;ll review it and get back to you.
            </Text>
            <Button
              label="Back to sponsors"
              onPress={closeForm}
              fullWidth
            />
          </View>
        ) : (
          <View style={styles.formBlock}>
            <Text style={styles.formTitle}>Apply as a partner</Text>

            <Input
              label="Company name"
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="Your company or brand"
              autoCapitalize="words"
            />

            <View>
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.chipRow}>
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
              </View>
            </View>

            <Input
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Tell us how you support ceramic artists (min. 10 characters)"
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
              label="Submit application"
              onPress={() => void handleSubmit()}
              loading={submitting}
              fullWidth
            />
            <Button
              label="Cancel"
              onPress={closeForm}
              variant="ghost"
              fullWidth
            />
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Partners & suppliers</Text>
        <Text style={styles.sectionBody}>
          Clay suppliers and partners who support the Aruru community.
        </Text>
        <Text style={styles.transparencyNote}>
          No ads · No tracking · Transparent sponsorship
        </Text>
        {data != null &&
        (data.sponsorCount > 0 || data.studioCount > 0 || data.artistCount > 0) ? (
          <Text style={styles.statsHint}>
            {data.sponsorCount} partner{data.sponsorCount === 1 ? '' : 's'} ·{' '}
            {data.studioCount} studio{data.studioCount === 1 ? '' : 's'} ·{' '}
            {data.artistCount} artist{data.artistCount === 1 ? '' : 's'}
          </Text>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.clay} />
        </View>
      ) : loadError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{loadError}</Text>
          <Button label="Retry" onPress={() => void loadStats()} variant="secondary" />
        </View>
      ) : sponsors.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            No partners yet. Want to support the community?
          </Text>
          <Button
            label="Become a partner"
            onPress={openPartnerForm}
            fullWidth
            style={styles.emptyCta}
          />
        </View>
      ) : (
        <View style={styles.list}>
          {sponsors.map((s, i) => (
            <View
              key={`${s.name}-${i}`}
              style={[styles.card, i === sponsors.length - 1 && styles.cardLast]}
            >
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
                <Text style={styles.companyName} numberOfLines={2}>
                  {s.name || 'Partner'}
                </Text>
                {s.category ? (
                  <Text style={styles.category}>{s.category}</Text>
                ) : null}
                {s.websiteUrl?.trim() ? (
                  <TouchableOpacity
                    onPress={() => {
                      const href = normalizeWebsiteHref(s.websiteUrl!);
                      if (href) void Linking.openURL(href);
                    }}
                    accessibilityRole="link"
                  >
                    <Text style={styles.link}>{s.websiteUrl.trim()}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}

      {!loading && !loadError ? (
        <Button
          label="Become a partner"
          onPress={openPartnerForm}
          variant="secondary"
          fullWidth
          style={styles.footerCta}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[10],
  },
  header: {
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  sectionTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.lg,
    color: colors.ink,
  },
  sectionBody: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    lineHeight: 20,
  },
  transparencyNote: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    lineHeight: 18,
  },
  statsHint: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkMid,
    marginTop: spacing[1],
  },
  center: {
    paddingVertical: spacing[8],
    alignItems: 'center',
    gap: spacing[3],
  },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: 'center',
  },
  emptyWrap: {
    paddingVertical: spacing[6],
    gap: spacing[4],
    alignItems: 'stretch',
  },
  emptyText: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyCta: {
    alignSelf: 'stretch',
  },
  list: {
    gap: 0,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  cardLast: {
    marginBottom: spacing[2],
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
  companyName: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  category: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'capitalize',
  },
  link: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.clay,
    textDecorationLine: 'underline',
  },
  footerCta: {
    marginTop: spacing[4],
  },
  formBlock: {
    gap: spacing[4],
    paddingBottom: spacing[4],
  },
  formTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.lg,
    color: colors.ink,
    marginBottom: spacing[1],
  },
  fieldLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
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
    fontSize: 10,
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
  successBody: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkLight,
    lineHeight: 22,
  },
});
