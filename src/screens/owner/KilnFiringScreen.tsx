import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import DateTimeField from '../../components/DateTimeField';
import { Button, Avatar, Badge, SectionLabel, Divider } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';

type KilnType = 'bisque' | 'glaze' | 'private';
type Step = 'session' | 'load' | 'review';

interface MemberEntry {
  userId: string;
  name: string;
  weightKg: string;
  avatarUrl?: string;
}

interface Props {
  navigation: any;
  route: { params: { tenantId: string; firingId?: string } };
}

export default function KilnFiringScreen({ navigation, route }: Props) {
  const [step, setStep] = useState<Step>('session');
  const [kilnType, setKilnType] = useState<KilnType>('bisque');
  const [date, setDate] = useState<Date>(new Date());
  const [members, setMembers] = useState<MemberEntry[]>([
    { userId: '1', name: 'Anna Nowak', weightKg: '' },
    { userId: '2', name: 'Tomáš Kovář', weightKg: '' },
    { userId: '3', name: 'Sofia Reyes', weightKg: '' },
  ]);

  const totalKg = members.reduce((sum, m) => sum + (parseFloat(m.weightKg) || 0), 0);

  const rateMap: Record<KilnType, number> = {
    bisque: 2.5,
    glaze: 3.0,
    private: 25.0,
  };

  const totalCost =
    kilnType === 'private'
      ? rateMap.private
      : totalKg * rateMap[kilnType];

  function updateWeight(userId: string, val: string) {
    setMembers((prev) =>
      prev.map((m) => (m.userId === userId ? { ...m, weightKg: val } : m))
    );
  }

  const steps: Step[] = ['session', 'load', 'review'];
  const stepLabels = ['1 session', '2 load', '3 close'];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Kiln firing</Text>
      <Text style={styles.pageSub}>Clayground Berlin</Text>

      <View style={styles.stepRow}>
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            {i > 0 && <View style={styles.stepLine} />}
            <TouchableOpacity onPress={() => setStep(s)}>
              <View
                style={[
                  styles.stepPill,
                  step === s && styles.stepPillActive,
                  steps.indexOf(step) > i && styles.stepPillDone,
                ]}
              >
                <Text
                  style={[
                    styles.stepPillText,
                    step === s && styles.stepPillTextActive,
                    steps.indexOf(step) > i && styles.stepPillTextDone,
                  ]}
                >
                  {stepLabels[i]}
                </Text>
              </View>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>

      {step === 'session' && (
        <View>
          <SectionLabel>Firing type</SectionLabel>
          <View style={styles.typeRow}>
            {(['bisque', 'glaze', 'private'] as KilnType[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeBtn, kilnType === t && styles.typeBtnSelected]}
                onPress={() => setKilnType(t)}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    kilnType === t && styles.typeBtnTextSelected,
                  ]}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <DateTimeField
            label="Date"
            value={date}
            onChange={(d) => setDate(d)}
            mode="date"
          />

          <Button
            label="Next — add members"
            onPress={() => setStep('load')}
            fullWidth
            style={{ marginTop: spacing[4] }}
          />
        </View>
      )}

      {step === 'load' && (
        <View>
          <SectionLabel>Members & weight (kg)</SectionLabel>

          {members.map((m) => (
            <View key={m.userId} style={styles.memberRow}>
              <Avatar name={m.name} size="sm" imageUrl={m.avatarUrl} />
              <Text style={styles.memberName}>{m.name}</Text>
              <TextInput
                style={styles.weightInput}
                value={m.weightKg}
                onChangeText={(v) => updateWeight(m.userId, v)}
                placeholder="0.0"
                placeholderTextColor={colors.inkFaint}
                keyboardType="decimal-pad"
              />
              <Text style={styles.kgLabel}>kg</Text>
            </View>
          ))}

          <TouchableOpacity style={styles.addMemberBtn}>
            <Text style={styles.addMemberText}>+ Add member</Text>
          </TouchableOpacity>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total weight</Text>
            <Text style={styles.totalValue}>
              {totalKg.toFixed(1)} kg · €{totalCost.toFixed(2)}
            </Text>
          </View>

          <Button
            label="Review & close"
            onPress={() => setStep('review')}
            fullWidth
            style={{ marginTop: spacing[4] }}
          />
        </View>
      )}

      {step === 'review' && (
        <View>
          <SectionLabel>Summary</SectionLabel>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Type</Text>
              <Badge
                label={kilnType}
                variant={kilnType === 'bisque' ? 'clay' : kilnType === 'glaze' ? 'moss' : 'neutral'}
              />
            </View>
            <Divider />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Date</Text>
              <Text style={styles.summaryVal}>
                {date.toISOString().split('T')[0]}
              </Text>
            </View>
            <Divider />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Members</Text>
              <Text style={styles.summaryVal}>{members.filter(m => parseFloat(m.weightKg) > 0).length}</Text>
            </View>
            <Divider />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Total kg</Text>
              <Text style={styles.summaryVal}>{totalKg.toFixed(1)} kg</Text>
            </View>
            <Divider />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Total cost</Text>
              <Text style={[styles.summaryVal, { color: colors.mossDark, fontFamily: typography.bodyMedium }]}>
                €{totalCost.toFixed(2)}
              </Text>
            </View>
          </View>

          {members.filter(m => parseFloat(m.weightKg) > 0).map(m => (
            <View key={m.userId} style={styles.memberSummaryRow}>
              <Avatar name={m.name} size="sm" imageUrl={m.avatarUrl} />
              <Text style={styles.memberName}>{m.name}</Text>
              <Text style={styles.memberCost}>
                {m.weightKg} kg · €{(parseFloat(m.weightKg) * rateMap[kilnType]).toFixed(2)}
              </Text>
            </View>
          ))}

          <Button
            label="Close firing session"
            onPress={() => navigation.goBack()}
            fullWidth
            style={{ marginTop: spacing[5], backgroundColor: colors.moss }}
          />
          <Button
            label="Back to edit"
            onPress={() => setStep('load')}
            variant="secondary"
            fullWidth
            style={{ marginTop: spacing[2] }}
          />
        </View>
      )}

      <View style={{ height: spacing[12] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing[5] },
  pageTitle: {
    fontFamily: typography.display,
    fontSize: fontSize['2xl'],
    color: colors.ink,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  pageSub: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing[5],
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  stepLine: { flex: 1, height: 0.5, backgroundColor: colors.border },
  stepPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 0.5,
    borderColor: colors.borderStrong,
  },
  stepPillActive: { backgroundColor: colors.clay, borderColor: colors.clay },
  stepPillDone: { backgroundColor: colors.mossLight, borderColor: 'transparent' },
  stepPillText: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
  },
  stepPillTextActive: { color: '#fff' },
  stepPillTextDone: { color: colors.mossDark },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: spacing[5] },
  typeBtn: {
    flex: 1,
    padding: spacing[3],
    borderWidth: 0.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  typeBtnSelected: { backgroundColor: colors.clayLight, borderColor: colors.clay },
  typeBtnText: {
    fontFamily: typography.body,
    fontSize: fontSize.base,
    color: colors.inkMid,
  },
  typeBtnTextSelected: { color: colors.clayDark, fontFamily: typography.bodyMedium },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.cream,
    borderRadius: radius.sm,
    marginBottom: 8,
  },
  memberName: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.base,
    color: colors.ink,
    flex: 1,
  },
  weightInput: {
    borderWidth: 0.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontFamily: typography.monoMedium,
    fontSize: fontSize.base,
    color: colors.clayDark,
    backgroundColor: colors.surface,
    width: 64,
    textAlign: 'right',
  },
  kgLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    width: 16,
  },
  addMemberBtn: {
    borderWidth: 0.5,
    borderColor: colors.clay,
    borderStyle: 'dashed',
    borderRadius: radius.sm,
    padding: spacing[2],
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  addMemberText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.clay,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.mossLight,
    borderRadius: radius.sm,
    padding: spacing[3],
  },
  totalLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.mossDark,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  totalValue: {
    fontFamily: typography.monoMedium,
    fontSize: fontSize.md,
    color: colors.mossDark,
  },
  summaryCard: {
    borderWidth: 0.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing[4],
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[3],
  },
  summaryKey: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  summaryVal: {
    fontFamily: typography.body,
    fontSize: fontSize.base,
    color: colors.ink,
  },
  memberSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: spacing[2],
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  memberCost: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkMid,
  },
});
