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
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Button, SectionLabel, Divider, Input } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import {
  apiFetch,
  formatCurrency,
  formatCurrencyPerUnitLabel,
  formatCurrencyUnitSuffix,
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import {
  alertMessage,
  confirmDestructive,
} from '../../utils/confirmAction';

type Nav = NativeStackNavigationProp<AppStackParamList, 'PricingSettings'>;
type Route = RouteProp<AppStackParamList, 'PricingSettings'>;

type MembershipPlan = {
  id: string;
  name: string;
  price: number;
  description?: string;
};

function numFromUnknown(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatInitialAmount(n: number): string {
  if (!Number.isFinite(n)) return '';
  return String(n);
}

function parseMembershipPlansPayload(data: unknown): MembershipPlan[] {
  const rawList = Array.isArray(data)
    ? data
    : data &&
        typeof data === 'object' &&
        Array.isArray((data as { plans?: unknown }).plans)
      ? (data as { plans: unknown[] }).plans
      : [];
  return rawList
    .map((raw): MembershipPlan | null => {
      if (!raw || typeof raw !== 'object') return null;
      const r = raw as Record<string, unknown>;
      const id = String(r.id ?? r._id ?? '').trim();
      if (!id) return null;
      return {
        id,
        name: String(r.name ?? ''),
        price: numFromUnknown(r.price),
        description:
          r.description != null && String(r.description).trim()
            ? String(r.description)
            : undefined,
      };
    })
    .filter((x): x is MembershipPlan => x != null);
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
  const studioCurrency = (
    membership?.currency ?? 'EUR'
  ).toUpperCase();

  const [openStudioPerH, setOpenStudioPerH] = useState('');
  const [kilnBisquePerKg, setKilnBisquePerKg] = useState('');
  const [kilnGlazePerKg, setKilnGlazePerKg] = useState('');
  const [kilnBisqueExternalPerKg, setKilnBisqueExternalPerKg] = useState('');
  const [kilnGlazeExternalPerKg, setKilnGlazeExternalPerKg] = useState('');
  const [kilnPrivatePerFiring, setKilnPrivatePerFiring] = useState('');
  const [loadPricing, setLoadPricing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [planDesc, setPlanDesc] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);
  const [planError, setPlanError] = useState('');

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
      const [data, plansRaw] = await Promise.all([
        apiFetch<Record<string, unknown>>(
          `/studios/${tenantId}/pricing`,
          {},
          tenantId
        ),
        apiFetch<unknown>(
          `/studios/${tenantId}/membership-plans`,
          {},
          tenantId
        ).catch(() => null),
      ]);
      setPlans(
        plansRaw != null ? parseMembershipPlansPayload(plansRaw) : []
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
      const bisqueExt = numFromUnknown(
        data.kilnBisqueExternalPerKg ?? data.kiln_bisque_external_per_kg
      );
      const glazeExt = numFromUnknown(
        data.kilnGlazeExternalPerKg ?? data.kiln_glaze_external_per_kg
      );
      const priv = numFromUnknown(
        data.kilnPrivatePerFiring ?? data.kiln_private_per_firing
      );
      setOpenStudioPerH(formatInitialAmount(open));
      setKilnBisquePerKg(formatInitialAmount(bisque));
      setKilnGlazePerKg(formatInitialAmount(glaze));
      setKilnBisqueExternalPerKg(formatInitialAmount(bisqueExt));
      setKilnGlazeExternalPerKg(formatInitialAmount(glazeExt));
      setKilnPrivatePerFiring(formatInitialAmount(priv));
    } catch (e) {
      setPlans([]);
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
            kilnBisqueExternalPerKg: parseFloat(kilnBisqueExternalPerKg) || 0,
            kilnGlazeExternalPerKg: parseFloat(kilnGlazeExternalPerKg) || 0,
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

  async function onCreatePlan() {
    setPlanError('');
    if (!planName.trim() || !planPrice) {
      setPlanError('Name and price are required.');
      return;
    }
    const price = parseFloat(planPrice);
    if (Number.isNaN(price) || price < 0) {
      setPlanError('Invalid price.');
      return;
    }
    setSavingPlan(true);
    try {
      await apiFetch(
        `/studios/${tenantId}/membership-plans`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: planName.trim(),
            price,
            description: planDesc.trim() || null,
          }),
        },
        tenantId
      );
      setPlanName('');
      setPlanPrice('');
      setPlanDesc('');
      setShowPlanForm(false);
      await load();
    } catch (e: unknown) {
      setPlanError(
        e instanceof Error ? e.message : 'Could not create plan.'
      );
    } finally {
      setSavingPlan(false);
    }
  }

  async function onDeletePlan(id: string) {
    const ok = await confirmDestructive(
      'Delete plan',
      'Delete this membership plan?',
      'Delete'
    );
    if (!ok) return;
    try {
      await apiFetch(
        `/studios/${tenantId}/membership-plans/${id}`,
        { method: 'DELETE' },
        tenantId
      );
      await load();
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : 'Could not delete plan.';
      alertMessage('Error', msg);
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
              suffix={formatCurrencyUnitSuffix(studioCurrency, 'hour')}
            />

            <View style={styles.kilnSection}>
              <SectionLabel>KILN FIRINGS</SectionLabel>
              <PricingField
                label="BISQUE — PER KG"
                value={kilnBisquePerKg}
                onChange={setKilnBisquePerKg}
                suffix={formatCurrencyUnitSuffix(studioCurrency, 'kg')}
              />
              <PricingField
                label="GLAZE — PER KG"
                value={kilnGlazePerKg}
                onChange={setKilnGlazePerKg}
                suffix={formatCurrencyUnitSuffix(studioCurrency, 'kg')}
              />
              <PricingField
                label="PRIVATE — FLAT FEE"
                value={kilnPrivatePerFiring}
                onChange={setKilnPrivatePerFiring}
                suffix={formatCurrencyUnitSuffix(studioCurrency, 'firing')}
              />
            </View>

            <SectionLabel>External guest rates</SectionLabel>
            <Text style={styles.sectionHint}>
              Separate per-kg rate for external guests. Leave at 0 to use the
              standard member rate.
            </Text>
            <PricingField
              label={`Bisque firing - external (${formatCurrencyPerUnitLabel(studioCurrency, 'kg')})`}
              value={kilnBisqueExternalPerKg}
              onChange={setKilnBisqueExternalPerKg}
              suffix={formatCurrencyPerUnitLabel(studioCurrency, 'kg')}
            />
            <PricingField
              label={`Glaze firing - external (${formatCurrencyPerUnitLabel(studioCurrency, 'kg')})`}
              value={kilnGlazeExternalPerKg}
              onChange={setKilnGlazeExternalPerKg}
              suffix={formatCurrencyPerUnitLabel(studioCurrency, 'kg')}
            />

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

            <Divider />
            <SectionLabel>MEMBERSHIP PLANS</SectionLabel>
            <Button
              label={showPlanForm ? 'Cancel' : '+ Add plan'}
              variant="ghost"
              onPress={() => setShowPlanForm((v) => !v)}
              fullWidth
            />
            {showPlanForm ? (
              <View style={styles.planForm}>
                <Input
                  label="Plan name"
                  value={planName}
                  onChangeText={setPlanName}
                  placeholder="e.g. Standard, Student"
                />
                <Input
                  label={`Monthly fee (${studioCurrency})`}
                  value={planPrice}
                  onChangeText={setPlanPrice}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
                <Input
                  label="Description (optional)"
                  value={planDesc}
                  onChangeText={setPlanDesc}
                  placeholder={"What's included"}
                />
                {planError ? (
                  <Text style={styles.planError}>{planError}</Text>
                ) : null}
                <Button
                  label="Save plan"
                  onPress={() => void onCreatePlan()}
                  loading={savingPlan}
                  fullWidth
                />
              </View>
            ) : null}
            {plans.map((plan) => (
              <View key={plan.id} style={styles.planRow}>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  {plan.description ? (
                    <Text style={styles.planDesc}>{plan.description}</Text>
                  ) : null}
                </View>
                <Text style={styles.planPrice}>
                  {formatCurrency(plan.price, studioCurrency)}/mo
                </Text>
                <TouchableOpacity
                  onPress={() => void onDeletePlan(plan.id)}
                  style={styles.planDelete}
                >
                  <Text style={styles.planDeleteLabel}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
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
  sectionHint: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    marginBottom: spacing[3],
    lineHeight: 20,
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
  planForm: {
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    marginTop: spacing[2],
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  planInfo: { flex: 1 },
  planName: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  planDesc: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  planPrice: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.clay,
  },
  planDelete: { padding: spacing[1] },
  planDeleteLabel: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.error,
  },
  planError: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
});
