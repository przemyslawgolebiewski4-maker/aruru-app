import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';

type Props = {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  right?: React.ReactNode;
};

export function StudioSubHeader({
  title,
  onBack,
  backLabel = '← Studio',
  right,
}: Props) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={onBack}
        hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
        disabled={!onBack}
        accessibilityRole={onBack ? 'button' : undefined}
        accessibilityLabel={onBack ? 'Back to studio home' : undefined}
        style={styles.backWrap}
      >
        <Text style={[styles.back, !onBack && styles.backHidden]}>
          {backLabel}
        </Text>
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    paddingHorizontal: 0,
    marginBottom: spacing[2],
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backWrap: { minWidth: 72 },
  back: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  backHidden: { opacity: 0 },
  title: {
    flex: 1,
    fontFamily: typography.display,
    fontSize: fontSize.lg,
    color: colors.ink,
    textAlign: 'center',
    marginHorizontal: spacing[2],
  },
  right: {
    minWidth: 72,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});

/** Compact pill used in sub-header actions (+ New, Invite, Save). */
export function studioHeaderPillStyles() {
  return StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 5,
      paddingHorizontal: spacing[2],
      borderRadius: radius.sm,
      borderWidth: 0.5,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surfaceRaised,
    },
    pillText: {
      fontFamily: typography.mono,
      fontSize: fontSize.xs,
      color: colors.inkMid,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
  });
}
