import React from 'react';
import { View, Text } from 'react-native';
import { colors, typography, fontSize, spacing } from '../../theme/tokens';

export default function ForumPostScreen() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.cream,
        padding: spacing[4],
      }}
    >
      <Text
        style={{
          fontFamily: typography.body,
          fontSize: fontSize.md,
          color: colors.inkLight,
        }}
      >
        Loading...
      </Text>
    </View>
  );
}
