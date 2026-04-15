import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Button, Input } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';

type Nav = NativeStackNavigationProp<AppStackParamList, 'StudioOnboarding'>;
type Route = RouteProp<AppStackParamList, 'StudioOnboarding'>;

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

export default function StudioOnboardingScreen({ route }: { route: Route }) {
  const { tenantId, studioName } = route.params;
  const navigation = useNavigation<Nav>();
  const [publicDescription, setPublicDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : prev.length < 5
          ? [...prev, tag]
          : prev
    );
  }

  function goNext() {
    navigation.navigate('MemberDashboardSettingsOnboarding', {
      tenantId,
      studioName,
    });
  }

  async function handleContinue() {
    setSaving(true);
    try {
      await apiFetch(
        `/studios/${tenantId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            public_description: publicDescription.trim() || undefined,
            tags: tags.length > 0 ? tags : undefined,
          }),
        },
        tenantId
      );
    } catch {
      // non-blocking — continue regardless
    } finally {
      setSaving(false);
      goNext();
    }
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
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, styles.stepDotDone]} />
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={styles.stepDot} />
          <View style={styles.stepDot} />
        </View>

        <View style={styles.top}>
          <Text style={styles.title}>Tell the community</Text>
          <Text style={styles.subtitle}>
            Add a public description and tags so ceramicists can find{'\n'}
            {studioName} in the Studio Finder. You can edit this later.
          </Text>
        </View>

        <Input
          label="Public description (optional)"
          placeholder="What makes your studio special? Open firings, beginner-friendly, etc."
          value={publicDescription}
          onChangeText={setPublicDescription}
          multiline
          numberOfLines={4}
          style={styles.textarea}
        />

        <Text style={styles.tagsLabel}>Tags (pick up to 5)</Text>
        <View style={styles.tagGrid}>
          {STUDIO_TAGS.map((tag) => {
            const active = tags.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, active && styles.tagChipActive]}
                onPress={() => toggleTag(tag)}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
              >
                <Text
                  style={[styles.tagChipLabel, active && styles.tagChipLabelActive]}
                >
                  {tag.replace(/_/g, ' ')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Button
          label="Continue →"
          variant="primary"
          onPress={() => void handleContinue()}
          loading={saving}
          fullWidth
          style={styles.btn}
        />
        <Button
          label="Skip for now"
          variant="ghost"
          onPress={goNext}
          fullWidth
          style={styles.skipBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing[6], paddingBottom: spacing[10] },
  stepRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[8],
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  stepDotActive: { backgroundColor: colors.clay },
  stepDotDone: { backgroundColor: colors.moss },
  top: { marginBottom: spacing[6] },
  title: {
    fontFamily: typography.display,
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkLight,
    lineHeight: 22,
  },
  textarea: { height: 100, textAlignVertical: 'top' },
  tagsLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  tagChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tagChipActive: { backgroundColor: colors.moss, borderColor: colors.moss },
  tagChipLabel: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
  },
  tagChipLabelActive: { color: colors.surface },
  btn: { marginTop: spacing[6] },
  skipBtn: { marginTop: spacing[2] },
});
