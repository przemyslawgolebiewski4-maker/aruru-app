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
import { useAuth } from '../../../hooks/useAuth';
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

export default function SponsorsTab() {
  const { studios } = useAuth();

  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState('other');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/public/stats`);
      const data: StatsData = await res.json();
      setSponsors(data.sponsors ?? []);
    } catch {
      setSponsors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

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

  async function handleSubmit() {
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

  if (showForm) {
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
          onPress={() => void handleSubmit()}
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Partners & Suppliers</Text>
        <Text style={styles.headerBody}>
          Clay suppliers and partners who support the Aruru community.
        </Text>
        <Text style={styles.headerNote}>
          No ads · No tracking · Transparent sponsorship
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.clay} />
        </View>
      ) : sponsors.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyLine}>No partners yet.</Text>
          <Text style={styles.emptySub}>Want to support the community?</Text>
        </View>
      ) : (
        <View style={styles.cards}>
          {sponsors.map((s, i) => (
            <View key={`${s.name}-${i}`} style={styles.card}>
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
                {s.websiteUrl?.trim() ? (
                  <TouchableOpacity
                    onPress={() => {
                      const href = normalizeWebsiteHref(s.websiteUrl!);
                      if (href) void Linking.openURL(href);
                    }}
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
    </ScrollView>
  );
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
  loadingWrap: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  emptyWrap: {
    paddingVertical: spacing[6],
    gap: spacing[2],
    alignItems: 'center',
  },
  emptyLine: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textAlign: 'center',
  },
  cards: {
    gap: 0,
  },
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
