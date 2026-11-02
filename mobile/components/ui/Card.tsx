import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, radius, spacing } from '../../lib/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  raised?: boolean;
  padded?: boolean;
}

export function Card({ children, style, raised = false, padded = true }: CardProps) {
  return (
    <View style={[
      styles.base,
      raised ? styles.raised : undefined,
      padded ? styles.padded : undefined,
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  raised: {
    backgroundColor: colors.surfaceRaised,
  },
  padded: {
    padding: spacing.lg,
  },
});
