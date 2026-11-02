import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useEntryId } from '../hooks/useEntryId';
import { colors } from '../lib/theme';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

export default function Index() {
  const { entryId, loading } = useEntryId();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!entryId) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)/lineup" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
