import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight } from '../lib/theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function Header({ title, subtitle, right }: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{
      paddingTop: insets.top + spacing.sm,
      paddingBottom: spacing.lg,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.nav,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: subtitle ? 4 : 0 }}>
            <View style={{ width: 4, height: 20, backgroundColor: colors.primary, borderRadius: 2 }} />
            <Text style={{
              fontSize: fontSize.xxl,
              fontWeight: fontWeight.black,
              color: colors.text,
              letterSpacing: -0.5,
            }}>
              {title}
            </Text>
          </View>
          {subtitle && (
            <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.semibold, letterSpacing: 0.3, paddingLeft: 12 }}>
              {subtitle}
            </Text>
          )}
        </View>
        {right && <View style={{ marginLeft: spacing.md }}>{right}</View>}
      </View>
    </View>
  );
}

export function SettingsButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: colors.surfaceRaised,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 16 }}>⚙️</Text>
    </TouchableOpacity>
  );
}
