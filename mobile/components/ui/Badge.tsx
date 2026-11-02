import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, fontSize, fontWeight, spacing } from '../../lib/theme';

type BadgeVariant = 'primary' | 'gold' | 'success' | 'error' | 'warning' | 'muted';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export function Badge({ label, variant = 'muted', style }: BadgeProps) {
  return (
    <View style={[styles.base, styles[variant], style]}>
      <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  primary:      { backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primary },
  gold:         { backgroundColor: colors.goldMuted,    borderWidth: 1, borderColor: colors.gold },
  success:      { backgroundColor: colors.successMuted, borderWidth: 1, borderColor: colors.success },
  error:        { backgroundColor: colors.errorMuted,   borderWidth: 1, borderColor: colors.error },
  warning:      { backgroundColor: colors.warningMuted, borderWidth: 1, borderColor: colors.warning },
  muted:        { backgroundColor: colors.surfaceRaised,borderWidth: 1, borderColor: colors.surfaceBorder },

  primaryLabel: { color: colors.primary },
  goldLabel:    { color: colors.gold },
  successLabel: { color: colors.success },
  errorLabel:   { color: colors.error },
  warningLabel: { color: colors.warning },
  mutedLabel:   { color: colors.textMuted },
});
