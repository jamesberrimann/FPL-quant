export const colors = {
  // FPL purple palette
  bg:           '#37003c',
  surface:      '#4a0050',
  surfaceRaised:'#5c0065',
  surfaceBorder:'rgba(255,255,255,0.1)',
  nav:          '#250029',

  // Brand — FPL green
  primary:      '#00ff87',
  primaryDim:   '#00cc6a',
  primaryMuted: 'rgba(0,255,135,0.15)',

  // Accent
  gold:         '#f59e0b',
  goldDim:      '#d97706',
  goldMuted:    'rgba(245,158,11,0.15)',

  // Text
  text:         '#ffffff',
  textSecondary:'rgba(255,255,255,0.8)',
  textMuted:    'rgba(255,255,255,0.5)',
  textSubtle:   'rgba(255,255,255,0.25)',

  // Semantic
  success:      '#00ff87',
  successMuted: 'rgba(0,255,135,0.15)',
  error:        '#ff4d4d',
  errorMuted:   'rgba(255,77,77,0.15)',
  warning:      '#f59e0b',
  warningMuted: 'rgba(245,158,11,0.15)',

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
