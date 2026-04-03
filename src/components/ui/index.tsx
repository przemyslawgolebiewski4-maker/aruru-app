import React from 'react';
import {
  TouchableOpacity,
  Text,
  TextInput,
  View,
  StyleSheet,
  ActivityIndicator,
  TextInputProps,
  ViewStyle,
  TextStyle,
  StyleProp,
  Platform,
} from 'react-native';
import {
  colors,
  typography,
  fontSize,
  spacing,
  radius,
  controlRadius,
} from '../../theme/tokens';

// ─── Button ────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const webBtnPointer =
    Platform.OS === 'web'
      ? ({ cursor: 'pointer', userSelect: 'none' } as ViewStyle)
      : {};

  const containerStyle: StyleProp<ViewStyle> = [
    styles.btn,
    styles[`btn_${variant}`],
    webBtnPointer,
    fullWidth && { width: '100%' },
    isDisabled && { opacity: 0.5 },
    style ?? {},
  ];

  const labelStyle: StyleProp<TextStyle> = [
    styles.btnLabel,
    styles[`btnLabel_${variant}`],
  ];

  const spinnerColor =
    variant === 'primary'
      ? '#fff'
      : variant === 'danger'
        ? colors.error
        : colors.clay;

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
    >
      {loading ? (
        <View style={styles.btnLoadingSlot}>
          <ActivityIndicator size="small" color={spinnerColor} />
        </View>
      ) : (
        <Text style={labelStyle}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Input ─────────────────────────────────────────────────────────────────

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, containerStyle, style, ...props }: InputProps) {
  return (
    <View style={[styles.inputContainer, containerStyle]}>
      {label && (
        <Text style={styles.inputLabel}>{label}</Text>
      )}
      <TextInput
        style={[
          styles.input,
          error ? styles.inputError : {},
          style as TextStyle,
        ]}
        placeholderTextColor={colors.inkFaint}
        {...props}
      />
      {error && <Text style={styles.inputErrorText}>{error}</Text>}
    </View>
  );
}

// ─── Badge ─────────────────────────────────────────────────────────────────

type BadgeVariant = 'clay' | 'moss' | 'neutral' | 'open' | 'error';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[`badge_${variant}`]]}>
      <Text style={[styles.badgeText, styles[`badgeText_${variant}`]]}>
        {label}
      </Text>
    </View>
  );
}

// ─── Avatar ────────────────────────────────────────────────────────────────

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'clay' | 'moss' | 'neutral';
  imageUrl?: string | null;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({
  name,
  size = 'md',
  variant = 'clay',
  imageUrl,
}: AvatarProps) {
  const dim = size === 'sm' ? 28 : size === 'md' ? 36 : 48;
  const fz = size === 'sm' ? 10 : size === 'md' ? 13 : 16;

  const bgMap = {
    clay: colors.clayLight,
    moss: colors.mossLight,
    neutral: colors.creamDark,
  };
  const colorMap = {
    clay: colors.clayDark,
    moss: colors.mossDark,
    neutral: colors.inkMid,
  };

  const img = imageUrl?.trim();

  return (
    <View
      style={[
        styles.avatar,
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: bgMap[variant],
          ...(img ? { overflow: 'hidden' as const } : {}),
        },
      ]}
    >
      {img ? (
        Platform.OS === 'web' ? (
          React.createElement('img', {
            src: img,
            style: {
              width: dim,
              height: dim,
              borderRadius: dim / 2,
              objectFit: 'cover',
            },
            alt: name,
          })
        ) : (
          (() => {
            const { Image } = require('react-native');
            return (
              <Image
                source={{ uri: img }}
                style={{ width: dim, height: dim, borderRadius: dim / 2 }}
              />
            );
          })()
        )
      ) : (
        <Text
          style={{
            fontFamily: typography.monoMedium,
            fontSize: fz,
            color: colorMap[variant],
          }}
        >
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}

// ─── StatCard ──────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  accent?: 'clay' | 'moss' | 'none';
}

export function StatCard({ label, value, accent = 'none' }: StatCardProps) {
  const bg =
    accent === 'clay'
      ? colors.clayLight
      : accent === 'moss'
      ? colors.mossLight
      : colors.cream;

  const valColor =
    accent === 'clay'
      ? colors.clayDark
      : accent === 'moss'
      ? colors.mossDark
      : colors.ink;

  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: valColor }]}>{value}</Text>
    </View>
  );
}

// ─── SectionLabel ──────────────────────────────────────────────────────────

export function SectionLabel({ children }: { children: string }) {
  return (
    <View style={styles.sectionLabelContainer}>
      <Text style={styles.sectionLabelText}>{children}</Text>
    </View>
  );
}

// ─── Divider ───────────────────────────────────────────────────────────────

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: controlRadius,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 44,
  },
  btnLoadingSlot: {
    minHeight: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btn_primary: {
    backgroundColor: colors.clay,
    borderWidth: 0,
  },
  btn_secondary: {
    backgroundColor: 'transparent',
    borderWidth: 0.5,
    borderColor: colors.borderStrong,
  },
  btn_ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  btn_danger: {
    backgroundColor: colors.errorLight,
    borderWidth: 0.5,
    borderColor: colors.error,
  },
  btnLabel: {
    fontFamily: typography.bodyMedium,
    fontSize: fontSize.base,
  },
  btnLabel_primary: { color: '#fff' },
  btnLabel_secondary: { color: colors.inkMid },
  btnLabel_ghost: { color: colors.clay },
  btnLabel_danger: { color: colors.error },

  inputContainer: {
    marginBottom: spacing[4],
  },
  inputLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    borderWidth: 0.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: 10,
    fontFamily: typography.body,
    fontSize: fontSize.base,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputErrorText: {
    fontFamily: typography.body,
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: 4,
  },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  badge_clay: { backgroundColor: colors.clayLight },
  badge_moss: { backgroundColor: colors.mossLight },
  badge_neutral: { backgroundColor: colors.creamDark },
  badge_open: { backgroundColor: colors.statusOpen },
  badge_error: { backgroundColor: colors.errorLight },
  badgeText: {
    fontFamily: typography.monoMedium,
    fontSize: fontSize.xs,
    letterSpacing: 0.4,
  },
  badgeText_clay: { color: colors.clayDark },
  badgeText_moss: { color: colors.mossDark },
  badgeText_neutral: { color: colors.inkMid },
  badgeText_open: { color: colors.statusOpenText },
  badgeText_error: { color: colors.error },

  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  statCard: {
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: spacing[4],
    flex: 1,
  },
  statLabel: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  statValue: {
    fontFamily: typography.bodySemiBold,
    fontSize: 22,
    color: colors.ink,
    lineHeight: 26,
  },

  sectionLabelContainer: {
    paddingBottom: spacing[2],
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    marginBottom: spacing[3],
  },
  sectionLabelText: {
    fontFamily: typography.mono,
    fontSize: fontSize.xs,
    color: colors.inkLight,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  divider: {
    height: 0.5,
    backgroundColor: colors.border,
  },
});
