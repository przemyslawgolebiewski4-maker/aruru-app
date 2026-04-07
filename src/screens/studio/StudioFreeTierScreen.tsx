import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../components/ui';
import {
  colors,
  typography,
  fontSize,
  spacing,
  radius,
} from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'StudioFreeTier'>;

const FREE_FEATURES = [
  {
    name: 'Invite members to your studio',
    desc: 'Owner and member roles - no limit on invites',
  },
  {
    name: 'Publish events',
    desc: 'Visible in community feed across all studios',
  },
  {
    name: 'Studio profile in directory',
    desc: 'Discoverable by ceramicists across Europe',
  },
  {
    name: 'Community forum',
    desc: 'Read, post, reply - technique, kiln, business, general',
  },
  {
    name: 'Artist profiles and discovery',
    desc: 'Find studios, artists and workshops near you',
  },
  {
    name: 'Invite anyone to Aruru',
    desc: 'Share the community with fellow ceramicists',
  },
];

const SUB_FEATURES = [
  {
    name: 'Kiln firings',
    desc: 'Open sessions, load by weight, split costs - including external guests',
  },
  {
    name: 'Tasks and hour logging',
    desc: 'Assign work, set priorities, track hours per member',
  },
  {
    name: 'Costs and billing',
    desc: 'Per-member cost summaries, misc charges, HTML export',
  },
  {
    name: 'Materials catalogue',
    desc: 'Track purchases, stock and material costs',
  },
  {
    name: 'Attendance tracking',
    desc: 'Log open studio sessions and hours per member',
  },
  {
    name: 'Assistant roles',
    desc: 'Delegate studio management to trusted assistants',
  },
  {
    name: 'Pricing configuration',
    desc: 'Set rates for kiln, open studio, external guests',
  },
  {
    name: 'Studio data export',
    desc: 'Full Excel backup - members, firings, tasks, costs, events',
  },
  {
    name: 'Income dashboard',
    desc: 'Monthly overview across all revenue categories',
  },
];

export default function StudioFreeTierScreen({ route }: Props) {
  const { tenantId } = route.params;
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.planLabel}>YOUR STUDIO PLAN</Text>
      <Text style={styles.planTitle}>Free - Community tier</Text>
      <Text style={styles.planSub}>
        No subscription needed. Build your studio community and start
        connecting.
      </Text>

      <View style={styles.whyBanner}>
        <Text style={styles.whyTitle}>Why is this free?</Text>
        <Text style={styles.whyText}>
          We believe ceramicists deserve a safe, calm space to connect - free of
          ads and algorithms. Growing a real community first lets us keep Aruru
          honest and sustainable for everyone.
        </Text>
      </View>

      <Text style={styles.secLabel}>FREE - ALWAYS INCLUDED</Text>
      <View style={styles.featureGroup}>
        {FREE_FEATURES.map((f, i) => (
          <View
            key={f.name}
            style={[
              styles.featureRow,
              i === FREE_FEATURES.length - 1 && styles.featureRowLast,
            ]}
          >
            <View style={[styles.dot, styles.dotFree]} />
            <View style={styles.featureText}>
              <Text style={styles.featureName}>{f.name}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
            <View style={styles.tagFree}>
              <Text style={styles.tagFreeText}>Free</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.secLabel}>SUBSCRIPTION - FULL STUDIO MANAGEMENT</Text>
      <View style={styles.featureGroup}>
        {SUB_FEATURES.map((f, i) => (
          <View
            key={f.name}
            style={[
              styles.featureRow,
              i === SUB_FEATURES.length - 1 && styles.featureRowLast,
            ]}
          >
            <View style={[styles.dot, styles.dotLocked]} />
            <View style={styles.featureText}>
              <Text style={[styles.featureName, styles.featureNameMuted]}>
                {f.name}
              </Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
            <View style={styles.tagSub}>
              <Text style={styles.tagSubText}>Sub</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.lockHint}>
        <Text style={styles.lockHintText}>
          Subscription features are visible but locked. Tap any to see plans and
          subscribe.
        </Text>
      </View>

      <View style={styles.cta}>
        <Text style={styles.ctaTitle}>Unlock full studio tools</Text>
        <Text style={styles.ctaSub}>
          From €15/month - 14-day free trial - cancel anytime
        </Text>
      </View>

      <Button
        label="See subscription plans"
        variant="primary"
        fullWidth
        onPress={() => navigation.navigate('StudioPlan', { tenantId })}
        style={styles.ctaBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing[5], paddingBottom: spacing[10] },
  planLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    letterSpacing: 0.8,
    marginBottom: spacing[1],
  },
  planTitle: {
    fontFamily: typography.display,
    fontSize: fontSize['2xl'],
    color: colors.ink,
    marginBottom: spacing[1],
  },
  planSub: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkLight,
    lineHeight: 20,
    marginBottom: spacing[4],
  },
  whyBanner: {
    backgroundColor: colors.mossLight,
    borderWidth: 0.5,
    borderColor: colors.mossBorder,
    borderRadius: radius.sm,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  whyTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.mossDark,
    marginBottom: 4,
  },
  whyText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.moss,
    lineHeight: 20,
  },
  secLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    letterSpacing: 0.7,
    marginBottom: spacing[2],
    marginTop: spacing[4],
  },
  featureGroup: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  featureRowLast: { borderBottomWidth: 0 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
    flexShrink: 0,
  },
  dotFree: { backgroundColor: colors.moss },
  dotLocked: { backgroundColor: colors.border },
  featureText: { flex: 1 },
  featureName: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.ink,
    marginBottom: 2,
  },
  featureNameMuted: { color: colors.inkLight },
  featureDesc: {
    fontFamily: typography.body,
    fontSize: 11,
    color: colors.inkLight,
    lineHeight: 16,
  },
  tagFree: {
    backgroundColor: colors.mossLight,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  tagFreeText: {
    fontFamily: typography.mono,
    fontSize: 9,
    color: colors.mossDark,
  },
  tagSub: {
    backgroundColor: colors.creamDark,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  tagSubText: {
    fontFamily: typography.mono,
    fontSize: 9,
    color: colors.inkLight,
  },
  lockHint: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing[3],
    marginTop: spacing[4],
  },
  lockHintText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.inkMid,
    lineHeight: 20,
  },
  cta: {
    backgroundColor: colors.clay,
    borderRadius: radius.sm,
    padding: spacing[4],
    alignItems: 'center',
    marginTop: spacing[3],
    marginBottom: spacing[3],
  },
  ctaTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.md,
    color: '#fff',
    marginBottom: 4,
  },
  ctaSub: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
  },
  ctaBtn: { marginTop: spacing[1] },
});
