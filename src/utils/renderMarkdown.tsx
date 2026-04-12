import React from 'react';
import {
  Text,
  Linking,
  StyleSheet,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { colors, typography } from '../theme/tokens';

type Segment =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'link'; value: string; url: string };

function parseMarkdown(input: string): Segment[] {
  const segments: Segment[] = [];
  const re = /\*\*(.+?)\*\*|_(.+?)_|\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input)) !== null) {
    if (match.index > last) {
      segments.push({ type: 'text', value: input.slice(last, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ type: 'bold', value: match[1] });
    } else if (match[2] !== undefined) {
      segments.push({ type: 'italic', value: match[2] });
    } else if (match[3] !== undefined && match[4] !== undefined) {
      segments.push({ type: 'link', value: match[3], url: match[4] });
    }
    last = match.index + match[0].length;
  }
  if (last < input.length) {
    segments.push({ type: 'text', value: input.slice(last) });
  }
  return segments;
}

const mdStyles = StyleSheet.create({
  bold: {
    fontFamily: typography.bodySemiBold,
    color: colors.ink,
  },
  italic: {
    fontStyle: 'italic',
    color: colors.inkMid,
  },
  link: {
    color: colors.clay,
    textDecorationLine: 'underline',
  },
});

export function renderMarkdown(
  text: string,
  baseStyle?: StyleProp<TextStyle>,
  key?: string
): React.ReactElement {
  const segments = parseMarkdown(text);
  return (
    <Text key={key} style={baseStyle}>
      {segments.map((seg, i) => {
        switch (seg.type) {
          case 'bold':
            return (
              <Text key={i} style={mdStyles.bold}>
                {seg.value}
              </Text>
            );
          case 'italic':
            return (
              <Text key={i} style={mdStyles.italic}>
                {seg.value}
              </Text>
            );
          case 'link':
            return (
              <Text
                key={i}
                style={mdStyles.link}
                onPress={() => void Linking.openURL(seg.url)}
                accessibilityRole="link"
              >
                {seg.value}
              </Text>
            );
          default:
            return <Text key={i}>{seg.value}</Text>;
        }
      })}
    </Text>
  );
}
