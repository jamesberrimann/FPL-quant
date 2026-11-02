export const colors = {
  // Turquoise palette
  bg:           '#006d77',
  surface:      '#007a82',
  surfaceRaised:'#008892',
  surfaceBorder:'rgba(255,255,255,0.12)',
  nav:          '#005560',

  // Brand green
  primary:      '#00ff87',
  primaryDim:   '#00cc6a',
  primaryMuted: 'rgba(0,255,135,0.15)',

  // Accent
  gold:         '#fbbf24',
  goldDim:      '#f59e0b',
  goldMuted:    'rgba(251,191,36,0.15)',

  // Text
  text:         '#ffffff',
  textSecondary:'rgba(255,255,255,0.82)',
  textMuted:    'rgba(255,255,255,0.52)',
  textSubtle:   'rgba(255,255,255,0.26)',

  // Semantic
  success:      '#00ff87',
  successMuted: 'rgba(0,255,135,0.15)',
  error:        '#ff5c5c',
  errorMuted:   'rgba(255,92,92,0.15)',
  warning:      '#fbbf24',
  warningMuted: 'rgba(251,191,36,0.15)',

  // Utility
  white:        '#ffffff',
  black:        '#000000',
  transparent:  'transparent',
} as const;

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl:32,
} as const;

export const radius = {
  sm:  6,
  md:  10,
  lg:  14,
  xl:  18,
  full:999,
} as const;

export const fontSize = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  24,
  xxxl: 30,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium:  '500' as const,
  semibold:'600' as const,
  bold:    '700' as const,
  black:   '800' as const,
};
