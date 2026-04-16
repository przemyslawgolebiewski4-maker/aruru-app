import React, { Fragment, createElement, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ImageUpload from '../../components/ImageUpload';
import { Button, Input } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import { apiFetch, patchMe, type PatchMeBody } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import type { AppStackParamList } from '../../navigation/types';
import { COUNTRY_NAMES } from '../../utils/locationData';

type Props = NativeStackScreenProps<AppStackParamList, 'EditProfile'>;

function padPortfolioSlots(
  p: (string | null | undefined)[] | undefined
): (string | null)[] {
  const base = Array.isArray(p) ? [...p] : ['', '', ''];
  const mapped = base
    .slice(0, 3)
    .map((u) =>
      u != null && String(u).trim() !== '' ? String(u) : null
    );
  while (mapped.length < 3) mapped.push(null);
  return mapped.slice(0, 3);
}

function pickStringVisibility(
  cv?: Record<string, string | string[] | undefined>
): Record<string, string> {
  if (!cv) return {};
  return Object.fromEntries(
    Object.entries(cv).filter(([, v]) => typeof v === 'string')
  ) as Record<string, string>;
}

export default function EditProfileScreen({ navigation }: Props) {
  const { user, refresh, setUserFull, studios } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [country, setCountry] = useState(user?.country ?? '');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [instagramUrl, setInstagramUrl] = useState(user?.instagramUrl ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(user?.websiteUrl ?? '');
  const [shopUrl, setShopUrl] = useState(user?.shopUrl ?? '');
  const [visibility, setVisibility] = useState<Record<string, string>>(() => ({
    profile: 'everyone',
    studios: 'everyone',
    events: 'only_me',
    forum_activity: 'everyone',
    links: 'everyone',
    ...pickStringVisibility(user?.communityVisibility),
  }));
  const [hiddenStudios, setHiddenStudios] = useState<string[]>(() => {
    const hs = user?.communityVisibility?.hidden_studios;
    return Array.isArray(hs) ? hs.map(String) : [];
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [portfolioUrls, setPortfolioUrls] = useState<(string | null)[]>(() =>
    padPortfolioSlots(user?.portfolioUrls)
  );
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);

  useEffect(() => {
    setPortfolioUrls(padPortfolioSlots(user?.portfolioUrls));
  }, [user?.portfolioUrls]);

  useEffect(() => {
    setAvatarUrl(user?.avatarUrl ?? '');
  }, [user?.avatarUrl]);

  useEffect(() => {
    setCountry(String(user?.country ?? ''));
  }, [user?.country]);

  useEffect(() => {
    if (user?.communityVisibility) {
      setVisibility((v) => ({
        ...v,
        ...pickStringVisibility(user.communityVisibility),
      }));
    }
  }, [user?.communityVisibility]);

  useEffect(() => {
    const hs = user?.communityVisibility?.hidden_studios;
    setHiddenStudios(Array.isArray(hs) ? hs.map(String) : []);
  }, [user?.communityVisibility]);

  function toggleHiddenStudio(tenantId: string) {
    setHiddenStudios((prev) =>
      prev.includes(tenantId)
        ? prev.filter((id) => id !== tenantId)
        : [...prev, tenantId]
    );
  }

  async function pickAndUploadPortfolioImage(slot: number): Promise<void> {
    if (uploadingSlot !== null) return;
    setUploadingSlot(slot);
    try {
      if (Platform.OS === 'web') {
        await new Promise<void>((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/jpeg,image/png,image/webp';
          input.onchange = () => {
            const file = input.files?.[0];
            if (!file) {
              resolve();
              return;
            }
            if (file.size > 3_000_000) {
              resolve();
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              const base64 = result.split(',')[1];
              void (async () => {
                try {
                  const res = await apiFetch<{
                    portfolioUrl?: string;
                    portfolio_url?: string;
                  }>(
                    '/uploads/portfolio-image',
                    {
                      method: 'POST',
                      body: JSON.stringify({
                        imageBase64: base64,
                        mimeType: file.type,
                        slot,
                      }),
                    },
                    ''
                  );
                  const url = res.portfolioUrl ?? res.portfolio_url;
                  if (url) {
                    setPortfolioUrls((prev) => {
                      const next = padPortfolioSlots(prev);
                      next[slot] = url;
                      return next;
                    });
                    void refresh();
                  }
                } catch {
                  /* ignore */
                }
                resolve();
              })();
            };
            reader.readAsDataURL(file);
          };
          input.click();
        });
      } else {
        const { default: ImagePicker } = await import('expo-image-picker');
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return;
        const picked = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          base64: true,
          quality: 0.8,
        });
        if (picked.canceled || !picked.assets[0]) return;
        const asset = picked.assets[0];
        const res = await apiFetch<{
          portfolioUrl?: string;
          portfolio_url?: string;
        }>(
          '/uploads/portfolio-image',
          {
            method: 'POST',
            body: JSON.stringify({
              imageBase64: asset.base64 ?? '',
              mimeType: 'image/jpeg',
              slot,
            }),
          },
          ''
        );
        const url = res.portfolioUrl ?? res.portfolio_url;
        if (url) {
          setPortfolioUrls((prev) => {
            const next = padPortfolioSlots(prev);
            next[slot] = url;
            return next;
          });
          void refresh();
        }
      }
    } catch {
      /* ignore */
    } finally {
      setUploadingSlot(null);
    }
  }

  async function deletePortfolioImage(slot: number): Promise<void> {
    try {
      await apiFetch(
        `/uploads/portfolio-image/${slot}`,
        { method: 'DELETE' },
        ''
      );
      setPortfolioUrls((prev) => {
        const next = padPortfolioSlots(prev);
        next[slot] = null;
        return next;
      });
      void refresh();
    } catch {
      /* ignore */
    }
  }

  async function onSave() {
    setError('');
    setSuccess('');
    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      const body: PatchMeBody = {
        name: name.trim(),
        bio: bio.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        website_url: websiteUrl.trim() || null,
        shop_url: shopUrl.trim() || null,
        community_visibility: {
          ...visibility,
          hidden_studios: hiddenStudios,
        },
      };
      const trimmedAvatar = avatarUrl.trim();
      if (trimmedAvatar) {
        body.avatar_url = trimmedAvatar;
      }
      const nextUser = await patchMe(body);
      setUserFull(nextUser);
      navigation.goBack();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <ImageUpload
        currentUrl={avatarUrl || null}
        initials={name || user?.email || '?'}
        size={80}
        endpoint="/uploads/avatar"
        tenantId=""
        onSuccess={(url) => {
          setAvatarUrl(url);
          void refresh();
        }}
        shape="circle"
      />

      <View style={styles.portfolioEditorSection}>
        <Text style={styles.portfolioEditorLabel}>
          Portfolio photos (up to 3)
        </Text>
        <Text style={styles.portfolioEditorHint}>
          Show your work. Max 3 photos - 3MB each.
        </Text>
        <View style={styles.portfolioEditorGrid}>
          {[0, 1, 2].map((slot) => {
            const url = portfolioUrls[slot];
            const isUploading = uploadingSlot === slot;
            return (
              <View key={slot} style={styles.portfolioEditorCell}>
                {isUploading ? (
                  <ActivityIndicator color={colors.clay} />
                ) : url ? (
                  <View style={styles.portfolioFilledWrap}>
                    {Platform.OS === 'web' ? (
                      createElement('img', {
                        src: url,
                        style: {
                          width: '100%',
                          aspectRatio: '1',
                          objectFit: 'cover',
                          borderRadius: 8,
                          display: 'block',
                        },
                        alt: '',
                      })
                    ) : (
                      <Image
                        source={{ uri: url }}
                        style={styles.portfolioEditorImageNative}
                        accessibilityLabel=""
                      />
                    )}
                    <TouchableOpacity
                      style={styles.portfolioRemoveBtn}
                      onPress={() => void deletePortfolioImage(slot)}
                      hitSlop={4}
                      accessibilityLabel={`Remove photo ${slot + 1}`}
                    >
                      <Text style={styles.portfolioRemoveBtnText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.portfolioAddBtn}
                    onPress={() => void pickAndUploadPortfolioImage(slot)}
                    activeOpacity={0.7}
                    accessibilityLabel={`Add photo ${slot + 1}`}
                  >
                    <Text style={styles.portfolioAddBtnText}>+</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </View>

      <Input
        label="Display name"
        value={name}
        onChangeText={(v) => {
          setName(v);
          setSuccess('');
        }}
        placeholder="Your name"
        autoCapitalize="words"
      />

      <Input
        label="Bio (optional)"
        value={bio}
        onChangeText={(v) => {
          setBio(v);
          setSuccess('');
        }}
        placeholder="A short intro about you and your practice"
        multiline
        numberOfLines={2}
      />

      <Input
        label="City (optional)"
        value={city}
        onChangeText={(v) => {
          setCity(v);
          setSuccess('');
        }}
        placeholder="e.g. Warsaw"
      />

      <View>
        <Text style={styles.pickerLabel}>Country (optional)</Text>
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
        label="Instagram"
        value={instagramUrl}
        onChangeText={(v) => {
          setInstagramUrl(v);
          setSuccess('');
        }}
        placeholder="https://instagram.com/yourprofile"
        autoCapitalize="none"
        keyboardType="url"
      />

      <Input
        label="Website"
        value={websiteUrl}
        onChangeText={(v) => {
          setWebsiteUrl(v);
          setSuccess('');
        }}
        placeholder="https://yourwebsite.com"
        autoCapitalize="none"
        keyboardType="url"
      />

      <Input
        label="Shop"
        value={shopUrl}
        onChangeText={(v) => {
          setShopUrl(v);
          setSuccess('');
        }}
        placeholder="https://etsy.com/shop/yourshop"
        autoCapitalize="none"
        keyboardType="url"
      />

      <View style={styles.emailRow}>
        <Text style={styles.fieldLabel}>Email</Text>
        <Text style={styles.emailValue}>{user?.email ?? '—'}</Text>
        <Text style={styles.emailHint}>Email cannot be changed.</Text>
      </View>

      <View style={styles.privacySection}>
        <Text style={styles.privacyTitle}>Community visibility</Text>
        <Text style={styles.privacyHint}>
          Control what others see on your public profile.
        </Text>
        {[
          { key: 'profile', label: 'Name & bio' },
          { key: 'studios', label: 'My studios' },
          { key: 'events', label: 'My events' },
          { key: 'forum_activity', label: 'Forum activity' },
          { key: 'links', label: 'Social links' },
        ].map((item) => {
          const activeStudios = studios.filter((s) => s.status === 'active');
          return (
            <Fragment key={item.key}>
              <View style={styles.privacyRow}>
                <Text style={styles.privacyLabel}>{item.label}</Text>
                <View style={styles.visOptions}>
                  {['everyone', 'my_studios', 'only_me'].map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.visChip,
                        visibility[item.key] === opt && styles.visChipActive,
                      ]}
                      onPress={() =>
                        setVisibility((v) => ({ ...v, [item.key]: opt }))
                      }
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.visChipLabel,
                          visibility[item.key] === opt &&
                            styles.visChipLabelActive,
                        ]}
                      >
                        {opt === 'everyone'
                          ? 'Everyone'
                          : opt === 'my_studios'
                            ? 'My studios'
                            : 'Only me'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {item.key === 'studios' &&
              visibility.studios !== 'only_me' &&
              activeStudios.length > 0 ? (
                <View style={styles.studioToggles}>
                  <Text style={styles.studioTogglesLabel}>
                    Which studios appear on your profile?
                  </Text>
                  {activeStudios.map((s, idx) => {
                    const hidden = hiddenStudios.includes(s.tenantId);
                    const isLast = idx === activeStudios.length - 1;
                    return (
                      <TouchableOpacity
                        key={s.tenantId}
                        style={[
                          styles.studioToggleRow,
                          isLast && styles.studioToggleRowLast,
                        ]}
                        onPress={() => toggleHiddenStudio(s.tenantId)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.studioToggleInfo}>
                          <Text style={styles.studioToggleName}>
                            {s.studioName || s.studioSlug}
                          </Text>
                          <Text style={styles.studioToggleRole}>{s.role}</Text>
                        </View>
                        <View
                          style={[
                            styles.studioToggleCheck,
                            hidden && styles.studioToggleCheckHidden,
                          ]}
                        >
                          <Text style={styles.studioToggleCheckMark}>
                            {hidden ? '✕' : '✓'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </Fragment>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      <Button
        label="Save changes"
        onPress={() => void onSave()}
        loading={saving}
        fullWidth
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing[4], gap: spacing[4] },
  portfolioEditorSection: {
    width: '100%',
    marginBottom: spacing[4],
  },
  portfolioEditorLabel: {
    fontFamily: typography.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.ink,
    marginBottom: spacing[1],
  },
  portfolioEditorHint: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginBottom: spacing[3],
  },
  portfolioEditorGrid: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  portfolioEditorCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.clayLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    position: 'relative',
  },
  portfolioFilledWrap: {
    width: '100%',
    height: '100%',
  },
  portfolioEditorImageNative: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
  },
  portfolioAddBtn: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portfolioAddBtnText: {
    fontFamily: typography.body,
    fontSize: 28,
    color: colors.clay,
    lineHeight: 32,
  },
  portfolioRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  portfolioRemoveBtnText: {
    color: colors.surface,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
  },
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
  emailRow: { gap: spacing[1] },
  fieldLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emailValue: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  emailHint: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  privacySection: {
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
  },
  privacyTitle: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  privacyHint: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: -spacing[2],
  },
  privacyRow: { gap: spacing[1] },
  privacyLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  visOptions: { flexDirection: 'row', gap: spacing[2] },
  visChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  visChipActive: {
    backgroundColor: colors.clay,
    borderColor: colors.clay,
  },
  visChipLabel: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
  },
  visChipLabelActive: { color: colors.surface },
  studioToggles: {
    marginTop: spacing[2],
    paddingLeft: spacing[2],
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
  studioTogglesLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    letterSpacing: 0.4,
    marginBottom: spacing[2],
  },
  studioToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    gap: spacing[3],
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  studioToggleRowLast: { borderBottomWidth: 0 },
  studioToggleInfo: { flex: 1 },
  studioToggleName: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  studioToggleRole: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  studioToggleCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.moss,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  studioToggleCheckHidden: {
    backgroundColor: colors.border,
  },
  studioToggleCheckMark: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
  },
  error: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  success: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.moss,
  },
});
