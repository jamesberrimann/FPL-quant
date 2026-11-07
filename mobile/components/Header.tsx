import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { colors, spacing, fontSize, fontWeight } from '../lib/theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ backgroundColor: colors.nav, borderBottomWidth: 1, borderBottomColor: 'rgba(251,191,36,0.18)' }}>
      {/* Gold accent line across the top */}
      <View style={{ height: 2, backgroundColor: colors.gold, opacity: 0.55 }} />
      <View style={{
        paddingTop: insets.top + spacing.sm,
        paddingBottom: spacing.lg,
        paddingHorizontal: spacing.lg,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 10,
              fontWeight: fontWeight.bold,
              color: colors.gold,
              letterSpacing: 1.8,
              marginBottom: 5,
              opacity: 0.85,
            }}>
              FPL QUANT
            </Text>
            <Text style={{
              fontSize: fontSize.xxl,
              fontWeight: fontWeight.black,
              color: colors.text,
              letterSpacing: -0.5,
            }}>
              {title}
            </Text>
            {subtitle && (
              <Text style={{
                fontSize: fontSize.xs,
                color: colors.textMuted,
                fontWeight: fontWeight.semibold,
                letterSpacing: 0.3,
                marginTop: 3,
              }}>
                {subtitle}
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={() => router.push('/settings')}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center', justifyContent: 'center',
              marginLeft: spacing.md,
            }}
          >
            {Platform.OS === 'ios' ? (
              <SymbolView name="gearshape.fill" size={16} tintColor={colors.textMuted} />
            ) : (
              <Text style={{ fontSize: 15 }}>⚙️</Text>
            )}
          </TouchableOpacity>
        </View>
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
