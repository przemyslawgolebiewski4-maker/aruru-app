import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import ImageUpload from '../../components/ImageUpload';
import { Button, Input, SectionLabel } from '../../components/ui';
import {
  colors,
  typography,
  fontSize,
  spacing,
  radius,
} from '../../theme/tokens';

const TRIAL_AMBER = '#EF9F27';

function trialDaysLeft(iso?: string): number {
  if (!iso) return 999;
  return Math.ceil(
    (new Date(iso).getTime() - Date.now()) / 86400000
  );
}

function formatTierLabel(tier?: string): string {
  const raw = (tier ?? 'solo').trim().toLowerCase() || 'solo';
  if (raw === 'studio_large') return 'Aruru Studio Large';
  if (!raw.includes('_')) {
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  }
  return raw
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
import type { AppStackParamList } from '../../navigation/types';
import {
  apiFetch,
  deleteStudio,
  patchStudioVisibility,
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { alertMessage, confirmDestructive } from '../../utils/confirmAction';
import { COUNTRY_NAMES } from '../../utils/locationData';

type Nav = NativeStackNavigationProp<AppStackParamList, 'StudioSettings'>;
type Route = RouteProp<AppStackParamList, 'StudioSettings'>;

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

function pickStr(r: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (v != null && String(v).trim() !== '') return String(v);
  }
  return '';
}

function pickTags(r: Record<string, unknown>): string[] {
  const raw = r.tags ?? r.Tags;
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x)).filter(Boolean);
}

/** GET /studios/{tenantId} may include `logoUrl` or `logo_url`. */
type StudioSettingsStudio = {
  logoUrl?: string;
};

function parseStudioPayload(
  data: unknown
): Record<string, unknown> & Partial<StudioSettingsStudio> {
  if (!data || typeof data !== 'object') return {};
  const o = data as Record<string, unknown>;
  if (o.studio && typeof o.studio === 'object') {
    return o.studio as Record<string, unknown> & Partial<StudioSettingsStudio>;
  }
  return o as Record<string, unknown> & Partial<StudioSettingsStudio>;
}

export default function StudioSettingsScreen({ route }: { route: Route }) {
  const { tenantId, studioName } = route.params;
  const navigation = useNavigation<Nav>();
  const { studios, refresh } = useAuth();

  const membership = studios.find((s) => s.tenantId === tenantId);
  const currentStudio =
    membership ??
    studios.find((s) => s.status === 'active') ??
    studios[0];
  const isOwner =
    membership?.role === 'owner' && membership?.status === 'active';

  const [name, setName] = useState(studioName ?? '');
  const [logoUrl, setLogoUrl] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [description, setDescription] = useState('');
  const [publicDescription, setPublicDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [instagramUrl, setInstagramUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [shopUrl, setShopUrl] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [communityVisible, setCommunityVisible] = useState(true);
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useLayoutEffect(() => {
    if (!isOwner) {
      if (typeof window !== 'undefined') {
        window.alert('Only studio owners can edit studio settings.');
      }
      navigation.goBack();
    }
  }, [isOwner, navigation]);

  const load = useCallback(async () => {
    if (!isOwner) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<unknown>(
        `/studios/${tenantId}`,
        {},
        tenantId
      );
      const s = parseStudioPayload(data);
      setName(pickStr(s, 'name') || studioName || '');
      setLogoUrl(pickStr(s, 'logoUrl', 'logo_url'));
      setCity(pickStr(s, 'city'));
      setCountry(pickStr(s, 'country'));
      setDescription(pickStr(s, 'description'));
      setPublicDescription(
        pickStr(s, 'publicDescription', 'public_description')
      );
      setTags(pickTags(s));
      setInstagramUrl(pickStr(s, 'instagramUrl', 'instagram_url'));
      setWebsiteUrl(pickStr(s, 'websiteUrl', 'website_url'));
      setShopUrl(pickStr(s, 'shopUrl', 'shop_url'));
      setCommunityVisible(
        Boolean(s.communityVisible ?? s.community_visible ?? true)
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load studio.');
      setName(studioName ?? '');
    } finally {
      setLoading(false);
    }
  }, [tenantId, studioName, isOwner]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function onSave() {
    if (!isOwner) return;
    setError('');
    if (!name.trim()) {
      setError('Studio name is required.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch(
        `/studios/${tenantId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            name: name.trim(),
            city: city.trim() || null,
            country: country.trim() || null,
            description: description.trim() || null,
            public_description: publicDescription.trim() || null,
            tags,
            instagram_url: instagramUrl.trim() || null,
            website_url: websiteUrl.trim() || null,
            shop_url: shopUrl.trim() || null,
          }),
        },
        tenantId
      );
      await refresh();
      navigation.goBack();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save studio.');
    } finally {
      setSaving(false);
    }
  }

  async function openStudioPortal() {
    setPortalLoading(true);
    try {
      const res = await apiFetch<{
        portalUrl?: string;
        portal_url?: string;
      }>(
        '/stripe/studio/portal',
        {
          method: 'POST',
          body: JSON.stringify({ tenant_id: tenantId }),
        },
        tenantId
      );
      const url = res.portalUrl ?? res.portal_url;
      if (url) {
        void Linking.openURL(url);
      } else {
        alertMessage('Billing', 'No billing portal link returned.');
      }
    } catch (e: unknown) {
      alertMessage(
        'Error',
        e instanceof Error ? e.message : 'Could not open billing portal.'
      );
    } finally {
      setPortalLoading(false);
    }
  }

  function openCheckout() {
    if (!tenantId) return;
    navigation
      .getParent<NativeStackNavigationProp<AppStackParamList>>()
      ?.navigate('StudioPlan', { tenantId });
  }

  function subscriptionStatusUI() {
    const status = currentStudio?.subscriptionStatus ?? '';
    const tier = formatTierLabel(currentStudio?.subscriptionTier);

    if (status === 'trial') {
      const days = trialDaysLeft(currentStudio?.trialEndsAt);
      if (days > 7) {
        return (
          <>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: colors.moss }]} />
              <Text style={[styles.statusText, { color: colors.ink }]}>
                Trial — {days} days remaining
              </Text>
            </View>
            <Button
              label="Subscribe now"
              variant="primary"
              onPress={openCheckout}
              fullWidth
              style={styles.subscriptionBtn}
            />
          </>
        );
      }
      if (days > 0) {
        return (
          <>
            <View style={styles.statusBadge}>
              <View
                style={[styles.statusDot, { backgroundColor: TRIAL_AMBER }]}
              />
              <Text style={[styles.statusText, { color: colors.ink }]}>
                Trial ending soon — {days} days left
              </Text>
            </View>
            <Button
              label="Subscribe now"
              variant="primary"
              onPress={() => void openStudioPortal()}
              loading={portalLoading}
              fullWidth
              style={styles.subscriptionBtn}
            />
          </>
        );
      }
      return (
        <>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: colors.error }]} />
            <Text style={[styles.statusText, { color: colors.error }]}>
              Trial expired
            </Text>
          </View>
          <Button
            label="Subscribe to continue"
            variant="primary"
            onPress={openCheckout}
            fullWidth
            style={styles.subscriptionBtn}
          />
        </>
      );
    }

    if (status === 'active') {
      return (
        <>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: colors.moss }]} />
            <Text style={[styles.statusText, { color: colors.ink }]}>
              Active — {tier} plan
            </Text>
          </View>
          <Button
            label="Manage subscription ↗"
            variant="ghost"
            onPress={() => void openStudioPortal()}
            loading={portalLoading}
            fullWidth
            style={styles.subscriptionBtn}
          />
        </>
      );
    }

    if (status === 'past_due') {
      return (
        <>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: colors.error }]} />
            <Text style={[styles.statusText, { color: colors.error }]}>
              Payment failed
            </Text>
          </View>
          <Text style={styles.statusHint}>
            Update your payment method to avoid losing access.
          </Text>
          <Button
            label="Update payment ↗"
            variant="ghost"
            onPress={() => void openStudioPortal()}
            loading={portalLoading}
            fullWidth
            style={styles.subscriptionBtn}
          />
        </>
      );
    }

    if (status === 'cancelled') {
      return (
        <>
          <View style={styles.statusBadge}>
            <View
              style={[styles.statusDot, { backgroundColor: colors.inkLight }]}
            />
            <Text style={[styles.statusText, { color: colors.inkLight }]}>
              Cancelled
            </Text>
          </View>
          <Text style={styles.statusHint}>
            Your access ends 30 days after cancellation.
          </Text>
          <Button
            label="Resubscribe ↗"
            variant="ghost"
            onPress={openCheckout}
            fullWidth
            style={styles.subscriptionBtn}
          />
        </>
      );
    }

    return (
      <Button
        label="Manage subscription ↗"
        variant="ghost"
        onPress={() => void openStudioPortal()}
        loading={portalLoading}
        fullWidth
        style={styles.subscriptionBtn}
      />
    );
  }

  async function handleToggleVisibility() {
    if (!tenantId) return;
    const next = !communityVisible;
    setVisibilityLoading(true);
    try {
      await patchStudioVisibility(tenantId, next);
      setCommunityVisible(next);
    } catch (e: unknown) {
      alertMessage(
        'Error',
        e instanceof Error ? e.message : 'Could not update visibility.'
      );
    } finally {
      setVisibilityLoading(false);
    }
  }

  async function handleDeleteStudio() {
    if (!tenantId) return;
    const confirmed = await confirmDestructive(
      'Delete studio?',
      'Your studio and all its data will be permanently removed after 90 days. ' +
        'Members will lose access immediately. ' +
        'If you have an active subscription, cancel it separately in the billing portal to avoid charges. ' +
        'This action cannot be undone.',
      'Delete studio'
    );
    if (!confirmed) return;
    setDeleteLoading(true);
    try {
      await deleteStudio(tenantId);
      await refresh();
      navigation.getParent()?.navigate('Main');
    } catch (e: unknown) {
      alertMessage(
        'Error',
        e instanceof Error ? e.message : 'Could not delete studio.'
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  if (!isOwner) return null;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.clay} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoSection}>
          <ImageUpload
            currentUrl={logoUrl || null}
            initials={name || 'S'}
            size={80}
            endpoint="/uploads/studio-logo"
            tenantId={tenantId}
            onSuccess={(url) => {
              setLogoUrl(url);
              void refresh();
            }}
            shape="rounded"
          />
        </View>
        <Input
          label="Studio name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Clayground Berlin"
          autoCapitalize="words"
        />
        <Input
          label="City"
          value={city}
          onChangeText={setCity}
          placeholder="e.g. Berlin"
          autoCapitalize="words"
          containerStyle={styles.fieldGap}
        />
        <View style={styles.fieldGap}>
          <Text style={styles.pickerLabel}>Country</Text>
          <TouchableOpacity
            style={styles.pickerToggle}
            onPress={() => setShowCountryPicker((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={country ? styles.pickerValue : styles.pickerPlaceholder}>
              {country || 'Select country…'}
            </Text>
            <Text style={styles.pickerCaret}>
              {showCountryPicker ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
          {showCountryPicker ? (
            <ScrollView
              style={styles.pickerDropdown}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              <TouchableOpacity
                style={styles.pickerOption}
                onPress={() => {
                  setCountry('');
                  setShowCountryPicker(false);
                }}
              >
                <Text style={styles.pickerOptionText}>— None —</Text>
              </TouchableOpacity>
              {COUNTRY_NAMES.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={[
                    styles.pickerOption,
                    country === name && styles.pickerOptionActive,
                  ]}
                  onPress={() => {
                    setCountry(name);
                    setShowCountryPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      country === name && styles.pickerOptionTextActive,
                    ]}
                  >
                    {name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}
        </View>
        <Input
          label="Description (internal)"
          value={description}
          onChangeText={setDescription}
          placeholder="Notes for your team…"
          multiline
          numberOfLines={3}
          containerStyle={styles.fieldGap}
        />

        <Input
          label="Public description (optional)"
          value={publicDescription}
          onChangeText={setPublicDescription}
          placeholder="Tell the community about your studio"
          multiline
          numberOfLines={3}
          containerStyle={styles.fieldGap}
        />

        <View style={styles.tagSection}>
          <Text style={styles.tagSectionLabel}>Tags (max 5)</Text>
          <View style={styles.tagGrid}>
            {STUDIO_TAGS.map((tag) => {
              const active = tags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagChip, active && styles.tagChipActive]}
                  onPress={() => {
                    if (active) {
                      setTags(tags.filter((t) => t !== tag));
                    } else if (tags.length < 5) {
                      setTags([...tags, tag]);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.tagChipLabel,
                      active && styles.tagChipLabelActive,
                    ]}
                  >
                    {tag.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Input
          label="Instagram"
          value={instagramUrl}
          onChangeText={setInstagramUrl}
          placeholder="https://instagram.com/..."
          autoCapitalize="none"
          keyboardType="url"
          containerStyle={styles.fieldGap}
        />
        <Input
          label="Website"
          value={websiteUrl}
          onChangeText={setWebsiteUrl}
          placeholder="https://yourstudio.com"
          autoCapitalize="none"
          keyboardType="url"
          containerStyle={styles.fieldGap}
        />
        <Input
          label="Shop"
          value={shopUrl}
          onChangeText={setShopUrl}
          placeholder="https://..."
          autoCapitalize="none"
          keyboardType="url"
          containerStyle={styles.fieldGap}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label="Save changes"
          variant="primary"
          onPress={() => void onSave()}
          loading={saving}
          fullWidth
          style={styles.saveBtn}
        />

        <View style={styles.subscriptionSection}>
          <SectionLabel>Subscription</SectionLabel>
          {subscriptionStatusUI()}
        </View>

        {/* ── Community visibility ── */}
        <View style={styles.dangerSection}>
          <SectionLabel>Community</SectionLabel>

          <View style={styles.dangerRow}>
            <View style={styles.dangerRowText}>
              <Text style={styles.dangerRowTitle}>Visible in community</Text>
              <Text style={styles.dangerRowSub}>
                Your studio appears in Studio Finder and the public event feed.
                Hide it to make it private — your members are not affected.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => void handleToggleVisibility()}
              disabled={visibilityLoading}
              accessibilityRole="switch"
              accessibilityState={{ checked: communityVisible }}
              style={[styles.toggle, communityVisible && styles.toggleOn]}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.toggleThumb,
                  communityVisible && styles.toggleThumbOn,
                ]}
              />
            </TouchableOpacity>
          </View>

          {/* ── Delete studio ── */}
          <View style={[styles.dangerRow, { marginTop: spacing[4] }]}>
            <View style={styles.dangerRowText}>
              <Text style={styles.dangerRowTitle}>Delete studio</Text>
              <Text style={styles.dangerRowSub}>
                Removes all studio data after a 90-day retention period.
                Members lose access immediately. Subscription must be cancelled
                separately.
              </Text>
            </View>
          </View>
          <Button
            label="Delete this studio"
            variant="ghost"
            onPress={() => void handleDeleteStudio()}
            loading={deleteLoading}
            fullWidth
            style={styles.deleteBtn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: {
    padding: spacing[6],
    paddingBottom: spacing[10],
  },
  logoSection: { alignItems: 'center', marginBottom: spacing[4] },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  fieldGap: { marginTop: spacing[2] },
  tagSection: { marginTop: spacing[2] },
  tagSectionLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  tagChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  tagChipActive: {
    backgroundColor: colors.moss,
    borderColor: colors.moss,
  },
  tagChipLabel: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
  },
  tagChipLabelActive: { color: colors.surface },
  error: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing[3],
  },
  saveBtn: { marginTop: spacing[4] },
  subscriptionBtn: { marginTop: spacing[2] },
  subscriptionSection: { marginTop: spacing[6] },
  pickerLabel: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.ink,
    marginBottom: spacing[1],
  },
  pickerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
  },
  pickerValue: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
    flex: 1,
  },
  pickerPlaceholder: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkLight,
    flex: 1,
  },
  pickerCaret: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginLeft: spacing[2],
  },
  pickerDropdown: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    marginTop: spacing[1],
  },
  pickerOption: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  pickerOptionActive: {
    backgroundColor: colors.clayLight,
  },
  pickerOptionText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  pickerOptionTextActive: {
    color: colors.clay,
    fontFamily: typography.bodyMedium,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    flex: 1,
  },
  statusHint: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    lineHeight: 20,
    marginBottom: spacing[2],
  },
  dangerSection: {
    marginTop: spacing[8],
    paddingTop: spacing[6],
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    gap: spacing[3],
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  dangerRowText: { flex: 1 },
  dangerRowTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.ink,
    marginBottom: 3,
  },
  dangerRowSub: {
    fontFamily: typography.body,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    lineHeight: 18,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.border,
    padding: 3,
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  toggleOn: { backgroundColor: colors.moss },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
  deleteBtn: {
    borderColor: colors.error,
    marginTop: spacing[2],
  },
});
