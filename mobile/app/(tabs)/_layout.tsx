import { Tabs, router } from 'expo-router';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { colors, fontSize, fontWeight } from '../../lib/theme';

function TabIcon({ focused, emoji, label }: { focused: boolean; emoji: string; label: string }) {
  return (
    <View style={tabStyles.icon}>
      <Text style={[tabStyles.emoji, focused && tabStyles.emojiActive]}>{emoji}</Text>
      <Text style={[tabStyles.label, focused && tabStyles.labelActive]}>{label}</Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  icon: { alignItems: 'center', gap: 2 },
  emoji: { fontSize: 20, opacity: 0.45 },
  emojiActive: { opacity: 1 },
  label: { fontSize: 10, fontWeight: fontWeight.semibold, color: colors.textMuted },
  labelActive: { color: colors.primary },
});

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.surfaceBorder,
          borderTopWidth: 1,
          paddingTop: 8,
          height: 80,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="lineup"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="👕" label="Squad" />,
        }}
      />
      <Tabs.Screen
        name="transfers"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="🔄" label="Transfers" />,
        }}
      />
      <Tabs.Screen
        name="chips"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="🃏" label="Chips" />,
        }}
      />
      <Tabs.Screen
        name="fixtures"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="📅" label="Fixtures" />,
        }}
      />
    </Tabs>
  );
}
