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
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Button, Input } from '../../components/ui';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

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

function parseStudioPayload(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object') return {};
  const o = data as Record<string, unknown>;
  if (o.studio && typeof o.studio === 'object') {
    return o.studio as Record<string, unknown>;
  }
  return o;
}

export default function StudioSettingsScreen({ route }: { route: Route }) {
  const { tenantId, studioName } = route.params;
  const navigation = useNavigation<Nav>();
  const { studios, refresh } = useAuth();

  const membership = studios.find((s) => s.tenantId === tenantId);
  const isOwner =
    membership?.role === 'owner' && membership?.status === 'active';

  const [name, setName] = useState(studioName ?? '');
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
  const [success, setSuccess] = useState('');

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
    setSuccess('');
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
      setSuccess('Studio updated.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save studio.');
    } finally {
      setSaving(false);
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
        <Input
          label="Studio name"
          value={name}
          onChangeText={(v) => {
            setName(v);
            setSuccess('');
          }}
          placeholder="e.g. Clayground Berlin"
          autoCapitalize="words"
        />
        <Input
          label="City"
          value={city}
          onChangeText={(v) => {
            setCity(v);
            setSuccess('');
          }}
          placeholder="e.g. Berlin"
          autoCapitalize="words"
          containerStyle={styles.fieldGap}
        />
        <Input
          label="Country"
          value={country}
          onChangeText={(v) => {
            setCountry(v);
            setSuccess('');
          }}
          placeholder="e.g. Germany"
          autoCapitalize="words"
          containerStyle={styles.fieldGap}
        />
        <Input
          label="Description (internal)"
          value={description}
          onChangeText={(v) => {
            setDescription(v);
            setSuccess('');
          }}
          placeholder="Notes for your team…"
          multiline
          numberOfLines={3}
          containerStyle={styles.fieldGap}
        />

        <Input
          label="Public description (optional)"
          value={publicDescription}
          onChangeText={(v) => {
            setPublicDescription(v);
            setSuccess('');
          }}
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
          onChangeText={(v) => {
            setInstagramUrl(v);
            setSuccess('');
          }}
          placeholder="https://instagram.com/..."
          autoCapitalize="none"
          keyboardType="url"
          containerStyle={styles.fieldGap}
        />
        <Input
          label="Website"
          value={websiteUrl}
          onChangeText={(v) => {
            setWebsiteUrl(v);
            setSuccess('');
          }}
          placeholder="https://yourstudio.com"
          autoCapitalize="none"
          keyboardType="url"
          containerStyle={styles.fieldGap}
        />
        <Input
          label="Shop"
          value={shopUrl}
          onChangeText={(v) => {
            setShopUrl(v);
            setSuccess('');
          }}
          placeholder="https://..."
          autoCapitalize="none"
          keyboardType="url"
          containerStyle={styles.fieldGap}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        <Button
          label="Save changes"
          variant="primary"
          onPress={() => void onSave()}
          loading={saving}
          fullWidth
          style={styles.saveBtn}
        />
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
    borderRadius: 999,
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
  success: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.moss,
    marginTop: spacing[3],
  },
  saveBtn: { marginTop: spacing[4] },
});
