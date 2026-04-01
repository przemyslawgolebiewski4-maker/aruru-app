import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Button, SectionLabel } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

type Nav = NativeStackNavigationProp<AppStackParamList, 'PricingSettings'>;
type Route = RouteProp<AppStackParamList, 'PricingSettings'>;

function numFromUnknown(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatInitialAmount(n: number): string {
  if (!Number.isFinite(n)) return '';
  return String(n);
}

type PricingFieldProps = {
  label: string;
  value: string;
  onChange: (text: string) => void;
  suffix: string;
};

function PricingField({ label, value, onChange, suffix }: PricingFieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.inkFaint}
          style={styles.fieldInput}
        />
        <Text style={styles.suffix}>{suffix}</Text>
      </View>
    </View>
  );
}

export default function PricingSettingsScreen({ route }: { route: Route }) {
  const { tenantId, studioName } = route.params;
  const navigation = useNavigation<Nav>();
  const { studios } = useAuth();

  const membership = studios.find((s) => s.tenantId === tenantId);
  const isOwner =
    membership?.role === 'owner' && membership?.status === 'active';

  const [openStudioPerH, setOpenStudioPerH] = useState('');
  const [kilnBisquePerKg, setKilnBisquePerKg] = useState('');
  const [kilnGlazePerKg, setKilnGlazePerKg] = useState('');
  const [kilnPrivatePerFiring, setKilnPrivatePerFiring] = useState('');
  const [loadPricing, setLoadPricing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    if (!isOwner) {
      if (typeof window !== 'undefined') {
        window.alert('Only studio owners can edit pricing.');
      }
      navigation.goBack();
    }
  }, [isOwner, navigation]);

  const load = useCallback(async () => {
    if (!isOwner) {
      setLoadPricing(false);
      return;
    }
    setLoadPricing(true);
    setError('');
    try {
      const data = await apiFetch<Record<string, unknown>>(
        `/studios/${tenantId}/pricing`,
        {},
        tenantId
      );
      const open = numFromUnknown(
        data.openStudioPerH ?? data.open_studio_per_h
      );
      const bisque = numFromUnknown(
        data.kilnBisquePerKg ?? data.kiln_bisque_per_kg
      );
      const glaze = numFromUnknown(
        data.kilnGlazePerKg ?? data.kiln_glaze_per_kg
      );
      const priv = numFromUnknown(
        data.kilnPrivatePerFiring ?? data.kiln_private_per_firing
      );
      setOpenStudioPerH(formatInitialAmount(open));
      setKilnBisquePerKg(formatInitialAmount(bisque));
      setKilnGlazePerKg(formatInitialAmount(glaze));
      setKilnPrivatePerFiring(formatInitialAmount(priv));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not load pricing.'
      );
    } finally {
      setLoadPricing(false);
    }
  }, [tenantId, isOwner]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current != null) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  async function onSave() {
    if (!isOwner) return;
    setError('');
    setSaving(true);
    try {
      await apiFetch(
        `/studios/${tenantId}/pricing`,
        {
          method: 'PUT',
          body: JSON.stringify({
            openStudioPerH: parseFloat(openStudioPerH) || 0,
            kilnBisquePerKg: parseFloat(kilnBisquePerKg) || 0,
            kilnGlazePerKg: parseFloat(kilnGlazePerKg) || 0,
            kilnPrivatePerFiring: parseFloat(kilnPrivatePerFiring) || 0,
          }),
        },
        tenantId
      );
      if (savedTimerRef.current != null) {
        clearTimeout(savedTimerRef.current);
      }
      setSaved(true);
      savedTimerRef.current = setTimeout(() => {
        setSaved(false);
        savedTimerRef.current = null;
      }, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save pricing.');
    } finally {
      setSaving(false);
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
        <Text style={styles.title}>{studioName}</Text>
        <Text style={styles.subtitle}>
          Set your rates. These are used to calculate member cost summaries.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Changes apply to future cost calculations only.
          </Text>
        </View>

        {loadPricing ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.clay} />
          </View>
        ) : (
          <>
            <SectionLabel>OPEN STUDIO</SectionLabel>
            <PricingField
              label="HOURLY RATE"
              value={openStudioPerH}
              onChange={setOpenStudioPerH}
              suffix="€ / hour"
            />

            <View style={styles.kilnSection}>
              <SectionLabel>KILN FIRINGS</SectionLabel>
              <PricingField
                label="BISQUE — PER KG"
                value={kilnBisquePerKg}
                onChange={setKilnBisquePerKg}
                suffix="€ / kg"
              />
              <PricingField
                label="GLAZE — PER KG"
                value={kilnGlazePerKg}
                onChange={setKilnGlazePerKg}
                suffix="€ / kg"
              />
              <PricingField
                label="PRIVATE — FLAT FEE"
                value={kilnPrivatePerFiring}
                onChange={setKilnPrivatePerFiring}
                suffix="€ / firing"
              />
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Button
              label="Save pricing"
              variant="primary"
              onPress={() => void onSave()}
              fullWidth
              loading={saving}
              style={styles.saveBtn}
            />

            {saved ? (
              <Text style={styles.savedText}>✓ Pricing saved</Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontFamily: typography.display,
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.3,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkLight,
    lineHeight: 22,
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 24,
  },
  infoText: {
    fontFamily: typography.body,
    fontSize: fontSize.base,
    color: colors.inkMid,
    lineHeight: 20,
  },
  loadingWrap: {
    paddingVertical: spacing[10],
    alignItems: 'center',
  },
  kilnSection: {
    marginTop: 24,
  },
  fieldWrap: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  fieldInput: {
    flex: 1,
    fontFamily: typography.mono,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.clay,
    paddingVertical: 8,
    color: colors.clayDark,
  },
  suffix: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.inkMid,
    marginLeft: spacing[2],
  },
  errorBox: {
    backgroundColor: colors.errorLight,
    borderWidth: 0.5,
    borderColor: colors.error,
    borderRadius: radius.sm,
    padding: spacing[3],
    marginBottom: spacing[3],
  },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  savedText: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.moss,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  saveBtn: {
    marginTop: 32,
  },
});
