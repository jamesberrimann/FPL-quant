export const colors = {
  // Backgrounds
  bg:           '#f8f7f5',
  surface:      '#ffffff',
  surfaceRaised:'#f2f0ed',
  surfaceBorder:'#e4e1dc',

  // Brand
  primary:      '#05c46b',
  primaryDim:   '#04a85a',
  primaryMuted: 'rgba(5,196,107,0.12)',

  // Accent
  gold:         '#e8960a',
  goldDim:      '#c07d08',
  goldMuted:    'rgba(232,150,10,0.12)',

  // Text
  text:         '#1c1917',
  textSecondary:'#44403c',
  textMuted:    '#78716c',
  textSubtle:   '#a8a29e',

  // Semantic
  success:      '#16a34a',
  successMuted: 'rgba(22,163,74,0.1)',
  error:        '#dc2626',
  errorMuted:   'rgba(220,38,38,0.08)',
  warning:      '#d97706',
  warningMuted: 'rgba(217,119,6,0.1)',

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
