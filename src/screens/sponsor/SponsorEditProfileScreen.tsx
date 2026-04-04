import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import ImageUpload from '../../components/ImageUpload';
import { apiFetch } from '../../services/api';
import { Button, Input } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import { EUROPEAN_COUNTRIES_CODES } from '../../utils/locationData';
import { alertMessage } from '../../utils/confirmAction';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'SponsorEditProfile'>;

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

export default function SponsorEditProfileScreen({ navigation }: Props) {
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await apiFetch<Record<string, unknown>>(
        '/sponsor/profile',
        {},
        ''
      );
      setCompanyName(
        String(raw.companyName ?? raw.company_name ?? '')
      );
      setDescription(String(raw.description ?? ''));
      setCategory(String(raw.category ?? ''));
      setWebsiteUrl(
        String(raw.websiteUrl ?? raw.website_url ?? '')
      );
      setLogoUrl(
        String(raw.logoUrl ?? raw.logo_url ?? '').trim()
      );
      const dc = raw.deliveryCountries ?? raw.delivery_countries;
      setSelectedCountries(
        Array.isArray(dc) ? dc.map((x) => String(x).toUpperCase()) : []
      );
    } catch {
      alertMessage('Error', 'Could not load sponsor profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function patchLogoAfterUpload(url: string) {
    try {
      await apiFetch(
        '/sponsor/profile',
        {
          method: 'PATCH',
          body: JSON.stringify({ logo_url: url }),
        },
        ''
      );
    } catch (e: unknown) {
      alertMessage(
        'Error',
        e instanceof Error ? e.message : 'Could not save logo URL.'
      );
    }
  }

  async function openSponsorPortal() {
    setPortalLoading(true);
    try {
      const res = await apiFetch<{
        portalUrl?: string;
        portal_url?: string;
      }>('/stripe/sponsor/portal', { method: 'POST' }, '');
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

  async function onSave() {
    if (!companyName.trim()) {
      alertMessage('Validation', 'Company name is required.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch(
        '/sponsor/profile',
        {
          method: 'PATCH',
          body: JSON.stringify({
            company_name: companyName.trim(),
            description: description.trim() || null,
            category: category.trim() || null,
            website_url: websiteUrl.trim() || null,
            delivery_countries: selectedCountries,
          }),
        },
        ''
      );
      navigation.goBack();
    } catch (e: unknown) {
      alertMessage(
        'Error',
        e instanceof Error ? e.message : 'Could not save profile.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.logoSection}>
        <ImageUpload
          currentUrl={logoUrl || null}
          initials={companyInitials(companyName)}
          size={80}
          endpoint="/uploads/sponsor-logo"
          tenantId=""
          onSuccess={(url) => {
            setLogoUrl(url);
            void patchLogoAfterUpload(url);
          }}
          shape="rounded"
        />
      </View>

      <Input
        label="Company name"
        value={companyName}
        onChangeText={setCompanyName}
        autoCapitalize="words"
      />
      <Input
        label="Category"
        value={category}
        onChangeText={setCategory}
        placeholder="e.g. clay"
      />
      <Input
        label="Website URL"
        value={websiteUrl}
        onChangeText={setWebsiteUrl}
        autoCapitalize="none"
        keyboardType="url"
      />
      <Input
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        style={styles.textArea}
      />

      <View>
        <Text style={styles.fieldLabel}>Delivery countries</Text>
        <Text style={styles.fieldHint}>
          Where you ship to — used to filter you in the community.
        </Text>
        <View style={styles.countryGrid}>
          {EUROPEAN_COUNTRIES_CODES.map((c) => {
            const active = selectedCountries.includes(c.code);
            return (
              <TouchableOpacity
                key={c.code}
                style={[styles.countryChip, active && styles.countryChipActive]}
                onPress={() =>
                  setSelectedCountries((prev) =>
                    active ? prev.filter((x) => x !== c.code) : [...prev, c.code]
                  )
                }
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.countryChipText,
                    active && styles.countryChipTextActive,
                  ]}
                >
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Button
        label="Save"
        onPress={() => void onSave()}
        loading={saving}
        fullWidth
      />
      <Button
        label="Manage subscription ↗"
        variant="ghost"
        onPress={() => void openSponsorPortal()}
        loading={portalLoading}
        fullWidth
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[10] },
  logoSection: { alignItems: 'center', marginBottom: spacing[2] },
  center: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  fieldLabel: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.ink,
    marginBottom: spacing[1],
  },
  fieldHint: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginBottom: spacing[3],
    lineHeight: 16,
  },
  countryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  countryChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
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
  countryChipTextActive: {
    color: colors.surface,
  },
});
