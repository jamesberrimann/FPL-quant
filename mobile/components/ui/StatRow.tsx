import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, fontSize, fontWeight, spacing } from '../../lib/theme';

interface StatRowProps {
  label: string;
  value: string | number;
  valueColor?: string;
  style?: ViewStyle;
}

export function StatRow({ label, value, valueColor, style }: StatRowProps) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  value: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.bold,
  },
});
