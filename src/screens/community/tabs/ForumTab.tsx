import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../../../theme/tokens';

export default function ForumTab() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.cream,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <ActivityIndicator color={colors.clay} />
    </View>
  );
}
