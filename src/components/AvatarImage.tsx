import React from 'react';
import { Text, Platform } from 'react-native';
import { typography } from '../theme/tokens';

type Props = {
  url?: string | null;
  initials: string;
  size: number;
  borderRadius: number;
  bgColor: string;
  textColor: string;
};

export function AvatarImage({
  url,
  initials,
  size,
  borderRadius,
  textColor,
}: Props) {
  const u = url?.trim();
  if (u) {
    if (Platform.OS === 'web') {
      return React.createElement('img', {
        src: u,
        style: {
          width: size,
          height: size,
          borderRadius,
          objectFit: 'cover',
        },
        alt: initials.slice(0, 2),
      });
    }
    const { Image } = require('react-native');
    return (
      <Image
        source={{ uri: u }}
        style={{ width: size, height: size, borderRadius }}
      />
    );
  }
  return (
    <Text
      style={{
        fontFamily: typography.mono,
        fontSize: size * 0.35,
        color: textColor,
      }}
    >
      {initials.slice(0, 2).toUpperCase()}
    </Text>
  );
}
