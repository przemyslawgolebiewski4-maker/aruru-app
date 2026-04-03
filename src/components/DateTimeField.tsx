import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { colors, typography, fontSize, radius } from '../theme/tokens';

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

function toDateString(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeString(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDisplay(date: Date, mode: Mode): string {
  if (mode === 'date') return toDateString(date);
  if (mode === 'time') return toTimeString(date);
  return `${toDateString(date)}  ${toTimeString(date)}`;
}

// Web: natywny <input type="date"> / <input type="time">
function WebDateTimeField({
  label,
  value,
  onChange,
  mode = 'date',
  minimumDate,
}: Props) {
  const inputType = mode === 'datetime' ? 'date' : mode;

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (!val) return;
    if (mode === 'time') {
      const [h, m] = val.split(':').map(Number);
      const d = new Date(value);
      d.setHours(h, m, 0, 0);
      onChange(d);
    } else {
      const [y, mo, day] = val.split('-').map(Number);
      const d = new Date(value);
      d.setFullYear(y, mo - 1, day);
      onChange(d);
    }
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <input
        type={inputType}
        value={mode === 'time' ? toTimeString(value) : toDateString(value)}
        min={minimumDate ? toDateString(minimumDate) : undefined}
        onChange={handleDateChange}
        style={{
          fontFamily: 'inherit',
          fontSize: 14,
          color: '#1E1A16',
          backgroundColor: '#FDFAF6',
          border: '1px solid #E0D9D0',
          borderRadius: 8,
          padding: '10px 14px',
          width: '100%',
          boxSizing: 'border-box',
          outline: 'none',
        }}
      />
    </View>
  );
}

// Native: TouchableOpacity + RNDateTimePicker
function NativeDateTimeField({
  label,
  value,
  onChange,
  mode = 'date',
  minimumDate,
}: Props) {
  const [show, setShow] = useState(false);
  // Lazy require so the web bundle does not pull in the native datetime module.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RNDateTimePicker = require('@react-native-community/datetimepicker')
    .default;

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
      {show && (
        <RNDateTimePicker
          value={value}
          mode={mode === 'datetime' ? 'date' : mode}
          display="default"
          onChange={(_: unknown, date?: Date) => {
            setShow(false);
            if (date) onChange(date);
          }}
          minimumDate={minimumDate}
        />
      )}
    </View>
  );
}

export default function DateTimeField(props: Props) {
  if (Platform.OS === 'web') return <WebDateTimeField {...props} />;
  return <NativeDateTimeField {...props} />;
}

const styles = StyleSheet.create({
  wrapper: { gap: 4 },
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  value: {
    fontFamily: typography.body,
    fontSize: fontSize.md,
    color: colors.ink,
  },
});
