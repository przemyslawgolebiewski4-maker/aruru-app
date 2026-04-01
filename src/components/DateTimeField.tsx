import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { colors, typography, fontSize, spacing, radius } from '../theme/tokens';

type Mode = 'date' | 'time' | 'datetime';

type Props = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  mode?: Mode;
  minimumDate?: Date;
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatDisplay(date: Date, mode: Mode): string {
  if (mode === 'date') {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
  if (mode === 'time') {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}  ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function DateTimeField({
  label,
  value,
  onChange,
  mode = 'date',
  minimumDate,
}: Props) {
  const [show, setShow] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>
        <RNDateTimePicker
          value={value}
          mode={mode === 'datetime' ? 'date' : mode}
          onChange={(_, date) => {
            if (date) onChange(date);
          }}
          minimumDate={minimumDate}
          style={styles.webPicker}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.field}
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.value}>{formatDisplay(value, mode)}</Text>
      </TouchableOpacity>
      {show ? (
        <RNDateTimePicker
          value={value}
          mode={mode === 'datetime' ? 'date' : mode}
          display="default"
          onChange={(_, date) => {
            setShow(false);
            if (date) onChange(date);
          }}
          minimumDate={minimumDate}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing[1] },
  label: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  field: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.surface,
  },
  value: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  webPicker: {
    height: 40,
    alignSelf: 'flex-start',
  },
});
