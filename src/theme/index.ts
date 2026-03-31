export * from './tokens';

import { StyleSheet } from 'react-native';
import { colors, typography, fontSize, spacing, radius } from './tokens';

export const text = StyleSheet.create({
  display: {
    fontFamily: typography.display,
    fontSize: fontSize['3xl'],
    color: colors.ink,
    letterSpacing: -0.5,
  },
  displaySm: {
    fontFamily: typography.display,
    fontSize: fontSize['2xl'],
    color: colors.ink,
    letterSpacing: -0.3,
  },
  h1: {
    fontFamily: typography.bodySemiBold,
    fontSize: fontSize['2xl'],
    color: colors.ink,
  },
  h2: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.xl,
    color: colors.ink,
  },
  h3: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.lg,
    color: colors.ink,
  },
  body: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.inkMid,
    lineHeight: 22,
  },
  bodySmall: {
    fontFamily: typography.body,
    fontSize: fontSize.base,
    color: colors.inkMid,
    lineHeight: 20,
  },
  label: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  mono: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.inkLight,
  },
  monoMd: {
    fontFamily: typography.monoMedium,
    fontSize: fontSize.base,
    color: colors.inkMid,
  },
  link: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.base,
    color: colors.clay,
  },
  error: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
  },
});

export const layout = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing[5],
  },
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.borderStrong,
    padding: spacing[4],
  },
  cardLg: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.borderStrong,
    padding: spacing[5],
  },
  statCard: {
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: spacing[4],
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  rowBetween: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.border,
  },
});
