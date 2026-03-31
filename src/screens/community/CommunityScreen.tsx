import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';

export default function CommunityScreen() {
  return (
    <View style={styles.root}>
      <View style={styles.iconWrap}>
        <Svg width={60} height={60} viewBox="0 0 60 60">
          <Circle cx={26} cy={32} r={18} fill={colors.clayLight} stroke={colors.clay} strokeWidth={0.5} />
          <Circle cx={38} cy={28} r={16} fill={colors.mossLight} stroke={colors.moss} strokeWidth={0.5} />
        </Svg>
      </View>
      <Text style={styles.title}>Community</Text>
      <Text style={styles.body}>
        Connect with ceramic studios and artists.{'\n'}
        Coming soon.
      </Text>
      <Text style={styles.sprint}>SPRINT 4</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[10],
  },
  iconWrap: {
    marginBottom: spacing[6],
  },
  title: {
    fontFamily: typography.display,
    fontSize: fontSize['3xl'],
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing[4],
    letterSpacing: -0.4,
  },
  body: {
    fontFamily: typography.body,
    fontSize: fontSize.lg,
    color: colors.inkMid,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: spacing[6],
  },
  sprint: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
