export const colors = {
  clay: '#C4714A',
  clayLight: '#F2E4D8',
  clayDark: '#7A3D22',
  clayBorder: 'rgba(196,113,74,0.2)',

  moss: '#4A5E3A',
  mossLight: '#E8EFE1',
  mossDark: '#2A3820',
  mossBorder: 'rgba(74,94,58,0.2)',

  cream: '#F7F3ED',
  creamDark: '#EDE5D8',

  surface: '#FDFAF6',
  surfaceRaised: '#FFFFFF',

  ink: '#1E1A16',
  inkMid: '#5C5248',
  inkLight: '#9C8E82',
  inkFaint: '#C8BDB4',

  border: 'rgba(90,70,50,0.12)',
  borderStrong: 'rgba(90,70,50,0.22)',

  statusOpen: '#E8F4E8',
  statusOpenText: '#2A5C2A',
  statusDraft: '#EDE5D8',
  statusDraftText: '#5C5248',

  error: '#C0392B',
  errorLight: '#FDECEA',
  success: '#4A5E3A',
  successLight: '#E8EFE1',
};

export const typography = {
  display: 'DMSerifDisplay_400Regular',
  displayItalic: 'DMSerifDisplay_400Regular_Italic',
  body: 'InstrumentSans_400Regular',
  bodyMedium: 'InstrumentSans_500Medium',
  bodySemiBold: 'InstrumentSans_600SemiBold',
  mono: 'DMMono_400Regular',
  monoMedium: 'DMMono_500Medium',
};

export const fontSize = {
  xs: 10,
  sm: 12,
  base: 13,
  md: 14,
  lg: 16,
  xl: 18,
  '2xl': 22,
  '3xl': 28,
  '4xl': 34,
};

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 999,
};

/** Buttons, tabs, chips — subtle rounded rectangle (same as `radius.sm`). */
export const controlRadius = radius.sm;

export const shadow = {
  none: {},
  sm: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
};
