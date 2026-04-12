import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Button, SectionLabel } from '../../components/ui';
import {
  colors,
  typography,
  fontSize,
  spacing,
  radius,
} from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import {
  getMemberDashboardSettings,
  patchMemberDashboardSettings,
} from '../../services/api';
import { alertMessage } from '../../utils/confirmAction';
import { getMemberDashboardSectionInfo } from './memberDashboardSectionInfo';

type Nav = NativeStackNavigationProp<
  AppStackParamList,
  'MemberDashboardSettingsOnboarding'
>;
type Route = RouteProp<
  AppStackParamList,
  'MemberDashboardSettingsOnboarding'
>;

export default function MemberDashboardSettingsOnboardingScreen({
  route,
}: {
  route: Route;
}) {
  const { tenantId, studioName } = route.params;
  const navigation = useNavigation<Nav>();

  const [sectionKeys, setSectionKeys] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [patchingKey, setPatchingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMemberDashboardSettings(tenantId);
      setSectionKeys(res.sectionKeys);
      setVisibility({ ...res.visibility });
    } catch {
      /* non-blocking — owner can fix in settings later */
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function toggleKey(key: string) {
    if (patchingKey) return;
    const next = !visibility[key];
    setPatchingKey(key);
    setVisibility((v) => ({ ...v, [key]: next }));
    try {
      const res = await patchMemberDashboardSettings(tenantId, { [key]: next });
      setSectionKeys(res.sectionKeys);
      setVisibility({ ...res.visibility });
    } catch (e: unknown) {
      setVisibility((v) => ({ ...v, [key]: !next }));
      alertMessage(
        'Error',
        e instanceof Error ? e.message : 'Could not save.'
      );
    } finally {
      setPatchingKey(null);
    }
  }

  function goNext() {
    navigation.replace('InviteFirstMember', { tenantId, studioName });
  }

  const orderedKeys = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const k of sectionKeys) {
      if (k && !seen.has(k)) {
        seen.add(k);
        out.push(k);
      }
    }
    for (const k of Object.keys(visibility)) {
      if (!seen.has(k)) out.push(k);
    }
    return out;
  }, [sectionKeys, visibility]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.stepRow}>
        <View style={[styles.stepDot, styles.stepDotDone]} />
        <View style={[styles.stepDot, styles.stepDotDone]} />
        <View style={[styles.stepDot, styles.stepDotActive]} />
      </View>

      <View style={styles.top}>
        <Text style={styles.title}>What can members see?</Text>
        <Text style={styles.subtitle}>
          Choose which tools and sections appear on your members&apos; dashboard.
          You can change this at any time in Studio settings. Start simple — add
          more when you&apos;re ready.
        </Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Community forum is always on</Text>
        <Text style={styles.infoText}>
          All members can read and post in the community forum, discover studios
          and events, and build their artist profile — for free, regardless of
          which sections you enable here.
        </Text>
      </View>

      <SectionLabel>Member dashboard sections</SectionLabel>

      {loading ? (
        <ActivityIndicator
          color={colors.clay}
          style={{ marginTop: spacing[4] }}
        />
      ) : (
        orderedKeys.map((key) => {
          const on = visibility[key] !== false;
          const busy = patchingKey === key;
          const info = getMemberDashboardSectionInfo(key);
          return (
            <View key={key} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{info.label}</Text>
                {info.desc ? (
                  <Text style={styles.rowDesc}>{info.desc}</Text>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={() => void toggleKey(key)}
                disabled={busy}
                accessibilityRole="switch"
                accessibilityState={{ checked: on }}
                style={[styles.toggle, on && styles.toggleOn]}
                activeOpacity={0.75}
              >
                <View
                  style={[styles.toggleThumb, on && styles.toggleThumbOn]}
                />
              </TouchableOpacity>
            </View>
          );
        })
      )}

      <Button
        label="Done →"
        variant="primary"
        onPress={goNext}
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
  top: { marginBottom: spacing[5] },
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
  infoBox: {
    backgroundColor: colors.mossLight,
    borderRadius: radius.md,
    padding: spacing[4],
    marginBottom: spacing[5],
    gap: spacing[1],
  },
  infoTitle: {
    fontFamily: typography.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.moss,
  },
  infoText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkMid,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: spacing[4],
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    gap: spacing[3],
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontFamily: typography.bodySemiBold,
    fontSize: fontSize.md,
    color: colors.ink,
    marginBottom: 3,
  },
  rowDesc: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    lineHeight: 19,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  toggleOn: { backgroundColor: colors.moss },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
  btn: { marginTop: spacing[6] },
  skipBtn: { marginTop: spacing[2] },
});
