import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Button } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { setPricing } from '../../services/api';

type Nav = NativeStackNavigationProp<AppStackParamList, 'SetupPricing'>;
type Route = RouteProp<AppStackParamList, 'SetupPricing'>;

function parseAmount(s: string): number {
  const t = s.trim().replace(',', '.');
  if (!t) return 0;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}

function resetToMain(navigation: Nav) {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    })
  );
}

type FieldRowProps = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  suffix: string;
  helper?: string;
};

function PricingFieldRow({
  label,
  value,
  onChangeText,
  placeholder = '0.00',
  suffix,
  helper,
}: FieldRowProps) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.inkFaint}
          keyboardType="decimal-pad"
        />
        <Text style={styles.suffix}>{suffix}</Text>
      </View>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

export default function SetupPricingScreen({ route }: { route: Route }) {
  const { tenantId, studioName } = route.params;
  const navigation = useNavigation<Nav>();

  const [openH, setOpenH] = useState('');
  const [bisque, setBisque] = useState('');
  const [glaze, setGlaze] = useState('');
  const [priv, setPriv] = useState('');
  const [membership, setMembership] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSave() {
    setError('');
    setLoading(true);
    try {
      await setPricing(tenantId, {
        openStudioPerH: parseAmount(openH),
        kilnBisquePerKg: parseAmount(bisque),
        kilnGlazePerKg: parseAmount(glaze),
        kilnPrivatePerFiring: parseAmount(priv),
        membershipFee: parseAmount(membership),
      });
      resetToMain(navigation);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save pricing.');
    } finally {
      setLoading(false);
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
        <View style={styles.top}>
          <Text style={styles.title}>{studioName}</Text>
          <Text style={styles.subtitle}>
            Set your rates. Members will see these on their cost summaries.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            You can update these at any time from Studio Settings.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>OPEN STUDIO</Text>
        <PricingFieldRow
          label="HOURLY RATE"
          value={openH}
          onChangeText={setOpenH}
          suffix="€ / hour"
        />

        <Text style={styles.sectionLabel}>KILN FIRINGS</Text>
        <PricingFieldRow
          label="BISQUE — PER KG"
          value={bisque}
          onChangeText={setBisque}
          suffix="€ / kg"
        />
        <PricingFieldRow
          label="GLAZE — PER KG"
          value={glaze}
          onChangeText={setGlaze}
          suffix="€ / kg"
        />
        <PricingFieldRow
          label="PRIVATE — FLAT FEE"
          value={priv}
          onChangeText={setPriv}
          suffix="€ / firing"
        />

        <Text style={styles.sectionLabel}>MEMBERSHIP</Text>
        <PricingFieldRow
          label="MONTHLY FEE"
          value={membership}
          onChangeText={setMembership}
          suffix="€ / month"
          helper="Set to 0 if you don't charge a monthly fee."
        />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button
          label="Save & go to dashboard"
          variant="primary"
          onPress={onSave}
          loading={loading}
          fullWidth
        />

        <Button
          label="Skip for now"
          variant="ghost"
          onPress={() => resetToMain(navigation)}
          fullWidth
          accessibilityLabel="Skip pricing setup"
          style={styles.skipBelowPrimary}
        />
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
    padding: spacing[6],
    paddingBottom: spacing[10],
  },
  top: {
    marginBottom: spacing[8],
  },
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
  infoCard: {
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: spacing[6],
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  infoText: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.inkMid,
    lineHeight: 20,
  },
  sectionLabel: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.inkLight,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: spacing[6],
    marginBottom: spacing[2],
  },
  fieldBlock: {
    marginBottom: spacing[3],
  },
  fieldLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  input: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: 10,
    fontFamily: typography.body,
    fontSize: fontSize.base,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  suffix: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    minWidth: 72,
    textAlign: 'right',
  },
  helper: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    marginTop: spacing[2],
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: colors.errorLight,
    borderRadius: radius.sm,
    padding: spacing[3],
    marginTop: spacing[2],
    marginBottom: spacing[3],
  },
  errorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  skipBelowPrimary: {
    marginTop: spacing[3],
  },
});
