import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors } from '../../lib/theme';

function TabIcon({ name, focused }: { name: any; focused: boolean }) {
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={name}
        size={22}
        tintColor={focused ? colors.primary : colors.textMuted}
      />
    );
  }
  return null;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.nav,
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="lineup"
        options={{
          title: 'Squad',
          tabBarIcon: ({ focused }) => <TabIcon name="person.3.fill" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="transfers"
        options={{
          title: 'Transfers',
          tabBarIcon: ({ focused }) => <TabIcon name="arrow.left.arrow.right" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="opti"
        options={{
          title: 'Opti',
          tabBarIcon: ({ focused }) => <TabIcon name="sparkles" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chips"
        options={{
          title: 'Chips',
          tabBarIcon: ({ focused }) => <TabIcon name="chart.bar.fill" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="fixtures"
        options={{
          title: 'Fixtures',
          tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
