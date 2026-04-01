import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../../components/ui';
import { colors, typography, fontSize, spacing, radius } from '../../theme/tokens';
import type { AuthStackParamList } from '../../navigation/types';

const ONBOARDING_KEY = 'aruru_onboarding_done';
const { width: SCREEN_W } = Dimensions.get('window');

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const SLIDES = [
  {
    key: '1',
    title: 'Your studio, organised.',
    body:
      'Track firings, manage members, and keep costs clear — all in one calm place.',
    tagline: 'FOR STUDIO OWNERS',
  },
  {
    key: '2',
    title: 'Know what you owe.',
    body:
      'See your monthly costs, kiln firings, and material purchases — always up to date.',
    tagline: 'FOR CERAMICISTS',
  },
  {
    key: '3',
    title: 'One profile, many studios.',
    body:
      'Join multiple studios with a single account. Your history and costs follow you everywhere.',
    tagline: 'CERAMIC COMMUNITY',
  },
];

/** Kiln / flame — clay, 60px */
function IconKilnFlame() {
  return (
    <Svg width={60} height={60} viewBox="0 0 60 60">
      <Path
        d="M28 52 L18 52 L18 28 L24 22 L30 28 L30 52 Z"
        fill={colors.clayLight}
        stroke={colors.clay}
        strokeWidth={0.75}
      />
      <Path
        d="M32 52 L32 26 L42 18 L50 26 L50 52 Z"
        fill={colors.surfaceRaised}
        stroke={colors.clay}
        strokeWidth={0.75}
      />
      <Path
        d="M34 32 Q38 24 44 28 Q42 34 38 36 Q36 32 34 32 Z"
        fill={colors.clay}
        opacity={0.85}
      />
      <Path
        d="M26 20 Q30 8 34 18 Q32 22 28 24 Q26 22 26 20 Z"
        fill={colors.clay}
        opacity={0.6}
      />
    </Svg>
  );
}

/** Hands / clay form — moss, 60px */
function IconHandsClay() {
  return (
    <Svg width={60} height={60} viewBox="0 0 60 60">
      <Path
        d="M12 38 Q10 28 18 24 Q22 22 26 26 L28 32 Q24 36 20 38 Q14 40 12 38 Z"
        fill={colors.mossLight}
        stroke={colors.moss}
        strokeWidth={0.75}
      />
      <Path
        d="M48 38 Q50 28 42 24 Q38 22 34 26 L32 32 Q36 36 40 38 Q46 40 48 38 Z"
        fill={colors.mossLight}
        stroke={colors.moss}
        strokeWidth={0.75}
      />
      <Ellipse
        cx={30}
        cy={28}
        rx={10}
        ry={7}
        fill={colors.moss}
        opacity={0.35}
      />
      <Path
        d="M22 30 Q30 22 38 30"
        fill="none"
        stroke={colors.moss}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Two overlapping circles — clay + moss, 60px */
function IconTwoCircles() {
  return (
    <Svg width={60} height={60} viewBox="0 0 60 60">
      <Circle
        cx={24}
        cy={30}
        r={16}
        fill={colors.clayLight}
        stroke={colors.clay}
        strokeWidth={0.75}
      />
      <Circle
        cx={36}
        cy={30}
        r={16}
        fill={colors.mossLight}
        stroke={colors.moss}
        strokeWidth={0.75}
        opacity={0.95}
      />
    </Svg>
  );
}

const ICONS = [
  <IconKilnFlame key="i1" />,
  <IconHandsClay key="i2" />,
  <IconTwoCircles key="i3" />,
];

export default function OnboardingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  async function markDone() {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
  }

  function goSkip() {
    markDone();
    navigation.replace('Login');
  }

  function goNext() {
    const next = Math.min(page + 1, SLIDES.length - 1);
    scrollRef.current?.scrollTo({ x: next * SCREEN_W, animated: true });
    setPage(next);
  }

  function goGetStarted() {
    markDone();
    navigation.replace('Register');
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    const p = Math.round(x / SCREEN_W);
    if (p !== page && p >= 0 && p < SLIDES.length) setPage(p);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.skipRow}>
        <View style={{ flex: 1 }} />
        <Pressable onPress={goSkip} hitSlop={12}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        keyboardShouldPersistTaps="handled"
      >
        {SLIDES.map((slide, i) => (
          <View key={slide.key} style={[styles.slide, { width: SCREEN_W }]}>
            <View style={styles.slideInner}>
              <View style={styles.iconWrap}>{ICONS[i]}</View>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.body}>{slide.body}</Text>
              <Text style={styles.tagline}>{slide.tagline}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing[5]) }]}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View
              key={s.key}
              style={[
                styles.dot,
                { backgroundColor: i === page ? colors.clay : colors.inkFaint },
              ]}
            />
          ))}
        </View>

        {page < 2 ? (
          <View style={styles.nextRow}>
            <View style={{ flex: 1 }} />
            <Button label="Next →" onPress={goNext} variant="ghost" />
          </View>
        ) : (
          <Button label="Get started" onPress={goGetStarted} fullWidth />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  pager: {
    flex: 1,
  },
  skipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[2],
  },
  skip: {
    fontFamily: typography.mono,
    fontSize: fontSize.sm,
    color: colors.inkLight,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
  },
  slideInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[12],
  },
  iconWrap: {
    marginBottom: spacing[5],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.display,
    fontSize: 26,
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: spacing[4],
  },
  body: {
    fontFamily: typography.body,
    fontSize: 15,
    color: colors.inkMid,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 260,
    marginBottom: spacing[4],
  },
  tagline: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.inkLight,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
    marginBottom: spacing[5],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});