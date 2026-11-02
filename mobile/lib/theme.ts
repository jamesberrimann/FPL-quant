export const colors = {
  // Backgrounds
  bg:           '#0a0f0d',
  surface:      '#111916',
  surfaceRaised:'#1a2420',
  surfaceBorder:'#243028',

  // Brand
  primary:      '#00ff87',
  primaryDim:   '#00c96a',
  primaryMuted: 'rgba(0,255,135,0.12)',

  // Accent
  gold:         '#f59e0b',
  goldDim:      '#d97706',
  goldMuted:    'rgba(245,158,11,0.12)',

  // Text
  text:         '#f0faf5',
  textSecondary:'#a3c4b5',
  textMuted:    '#6b8f7e',
  textSubtle:   '#3d5a4f',

  // Semantic
  success:      '#22c55e',
  successMuted: 'rgba(34,197,94,0.12)',
  error:        '#ef4444',
  errorMuted:   'rgba(239,68,68,0.12)',
  warning:      '#f97316',
  warningMuted: 'rgba(249,115,22,0.12)',

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
