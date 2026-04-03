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
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { alertMessage } from '../../utils/confirmAction';

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
        <Input
          label="Country"
          value={country}
          onChangeText={setCountry}
          placeholder="e.g. Germany"
          autoCapitalize="words"
          containerStyle={styles.fieldGap}
        />
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
          <Button
            label="Manage subscription ↗"
            variant="ghost"
            onPress={() => void openStudioPortal()}
            loading={portalLoading}
            fullWidth
            style={styles.subscriptionBtn}
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
});
