import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { colors, typography, spacing } from '../../theme/tokens';

export type StudioRailSection =
  | 'home'
  | 'firings'
  | 'tasks'
  | 'members'
  | 'revenue'
  | 'myBill'
  | 'settings';

const RAIL_W = 58;

function IcoHome({ on }: { on: boolean }) {
  const c = on ? colors.clay : colors.inkMid;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z"
      />
      <Path stroke={c} strokeWidth={1.5} strokeLinecap="round" d="M9 21V12h6v9" />
    </Svg>
  );
}

function IcoFlame({ on }: { on: boolean }) {
  const c = on ? colors.clay : colors.inkMid;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3s2 2.5 2 6c0-1.5 1-3 3-4 0 4-2 7-5 9-.5-2.5-2.5-3.5-2.5-6.5 0-1.2.5-2.3 1.2-3.1M12 22a4 4 0 0 0 4-4c0-2-1-3-2.5-3.5"
      />
    </Svg>
  );
}

function IcoTasks({ on }: { on: boolean }) {
  const c = on ? colors.clay : colors.inkMid;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={5} width={16} height={14} rx={2} stroke={c} strokeWidth={1.5} />
      <Path stroke={c} strokeWidth={1.5} d="M8 11h8M8 14h5" strokeLinecap="round" />
    </Svg>
  );
}

function IcoUsers({ on }: { on: boolean }) {
  const c = on ? colors.clay : colors.inkMid;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={9} cy={8} r={3} stroke={c} strokeWidth={1.5} />
      <Path
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        d="M4 19v-1a5 5 0 0 1 5-5h0a5 5 0 0 1 5 5v1"
      />
      <Circle cx={17} cy={9} r={2.5} stroke={c} strokeWidth={1.5} />
      <Path
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        d="M17 21v-1a4 4 0 0 0-2-3.5"
      />
    </Svg>
  );
}

function IcoChart({ on }: { on: boolean }) {
  const c = on ? colors.clay : colors.inkMid;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        d="M4 20V8M9 20V4M14 20v-6M19 20v-9"
      />
    </Svg>
  );
}

function IcoCoin({ on }: { on: boolean }) {
  const c = on ? colors.clay : colors.inkMid;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={7} stroke={c} strokeWidth={1.5} />
      <Path
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        d="M12 8v8M9.5 10.5h4a1.5 1.5 0 0 1 0 3h-4a1.5 1.5 0 0 0 0 3h4.5"
      />
    </Svg>
  );
}

function IcoSettings({ on }: { on: boolean }) {
  const c = on ? colors.clay : colors.inkMid;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        d="M11.5 4h1l.8 3.2a6 6 0 0 1 2.2 1.2l3-1 .9 1.5-2.3 2.6a6 6 0 0 1 0 2.9l2.3 2.6-.9 1.5-3-1a6 6 0 0 1-2.2 1.2L12.5 20h-1l-.8-3.2a6 6 0 0 1-2.2-1.2l-3 1-.9-1.5 2.3-2.6a6 6 0 0 1 0-2.9L5 8.6l.9-1.5 3 1a6 6 0 0 1 2.2-1.2L11.5 4z"
      />
      <Circle cx={12} cy={12} r={2} stroke={c} strokeWidth={1.5} />
    </Svg>
  );
}

function iconFor(
  section: StudioRailSection,
  on: boolean
): React.ReactElement | null {
  switch (section) {
    case 'home':
      return <IcoHome on={on} />;
    case 'firings':
      return <IcoFlame on={on} />;
    case 'tasks':
      return <IcoTasks on={on} />;
    case 'members':
      return <IcoUsers on={on} />;
    case 'revenue':
      return <IcoChart on={on} />;
    case 'myBill':
      return <IcoCoin on={on} />;
    case 'settings':
      return <IcoSettings on={on} />;
    default:
      return null;
  }
}

function shortLabel(section: StudioRailSection): string {
  switch (section) {
    case 'home':
      return 'Home';
    case 'firings':
      return 'Fire';
    case 'tasks':
      return 'Tasks';
    case 'members':
      return 'Mem';
    case 'revenue':
      return 'Rev';
    case 'myBill':
      return 'Bill';
    case 'settings':
      return 'Set';
    default:
      return '';
  }
}

export function StudioDashboardRail({
  sections,
  active,
  onSelect,
}: {
  sections: StudioRailSection[];
  active: StudioRailSection;
  onSelect: (s: StudioRailSection) => void;
}) {
  return (
    <View style={styles.rail} accessibilityRole="tablist">
      {sections.map((s) => {
        const on = active === s;
        return (
          <TouchableOpacity
            key={s}
            style={[styles.item, on && styles.itemOn]}
            onPress={() => onSelect(s)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={s}
          >
            {iconFor(s, on)}
            <Text style={[styles.lbl, on && styles.lblOn]} numberOfLines={2}>
              {shortLabel(s)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: RAIL_W,
    flexShrink: 0,
    backgroundColor: colors.surface,
    borderRightWidth: 0.5,
    borderRightColor: colors.border,
    paddingTop: spacing[1],
  },
  item: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 8,
    paddingHorizontal: 3,
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
  },
  itemOn: {
    borderLeftColor: colors.clay,
    backgroundColor: colors.cream,
  },
  lbl: {
    fontFamily: typography.mono,
    fontSize: Platform.OS === 'web' ? 9 : 7,
    textTransform: 'uppercase',
    letterSpacing: 0.04,
    color: colors.inkLight,
    textAlign: 'center',
    maxWidth: RAIL_W - 4,
  },
  lblOn: { color: colors.clay },
});
