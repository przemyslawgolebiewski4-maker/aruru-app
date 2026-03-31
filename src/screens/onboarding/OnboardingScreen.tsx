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
import Svg, { Circle, Path } from 'react-native-svg';
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
      'Track firings, manage members, and keep costs clear — all in one place.',
  },
  {
    key: '2',
    title: 'Know what every firing costs.',
    body:
      'Log bisque, glaze and private firings. Aruru calculates costs per member automatically.',
  },
  {
    key: '3',
    title: 'One profile, many studios.',
    body:
      'Join multiple studios with a single account. Your work follows you.',
  },
];

function IconCircle() {
  return (
    <Svg width={96} height={96} viewBox="0 0 96 96">
      <Circle cx={48} cy={48} r={40} fill={colors.clayLight} stroke={colors.clay} strokeWidth={0.5} />
      <Circle cx={48} cy={48} r={22} fill={colors.clay} opacity={0.35} />
    </Svg>
  );
}

function IconKiln() {
  return (
    <Svg width={96} height={96} viewBox="0 0 96 96">
      <Path
        d="M20 72 L20 40 L28 32 L36 40 L36 72 Z"
        fill={colors.clayLight}
        stroke={colors.clay}
        strokeWidth={0.5}
      />
      <Path
        d="M38 72 L38 38 L58 28 L76 38 L76 72 Z"
        fill={colors.surfaceRaised}
        stroke={colors.clay}
        strokeWidth={0.5}
      />
      <Path
        d="M44 48 Q58 42 72 48"
        fill="none"
        stroke={colors.clay}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M48 56 Q58 62 68 56"
        fill="none"
        stroke={colors.moss}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.8}
      />
    </Svg>
  );
}

function IconPeople() {
  return (
    <Svg width={96} height={96} viewBox="0 0 96 96">
      <Circle cx={32} cy={38} r={10} fill={colors.clayLight} stroke={colors.clay} strokeWidth={0.5} />
      <Circle cx={64} cy={38} r={10} fill={colors.mossLight} stroke={colors.moss} strokeWidth={0.5} />
      <Circle cx={48} cy={30} r={9} fill={colors.surfaceRaised} stroke={colors.clay} strokeWidth={0.5} />
      <Path
        d="M18 72 Q18 56 32 56 Q46 56 46 72"
        fill="none"
        stroke={colors.clay}
        strokeWidth={0.5}
      />
      <Path
        d="M50 72 Q50 56 64 56 Q78 56 78 72"
        fill="none"
        stroke={colors.moss}
        strokeWidth={0.5}
      />
      <Path
        d="M34 72 Q34 52 48 52 Q62 52 62 72"
        fill="none"
        stroke={colors.inkMid}
        strokeWidth={0.5}
        opacity={0.4}
      />
    </Svg>
  );
}

const ICONS = [<IconCircle key="i1" />, <IconKiln key="i2" />, <IconPeople key="i3" />];

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
    marginBottom: spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.display,
    fontSize: 32,
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: spacing[4],
  },
  body: {
    fontFamily: typography.body,
    fontSize: fontSize.lg,
    color: colors.inkMid,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
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
