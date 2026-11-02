import {
  View, Text, TextInput, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useEntryId } from '../hooks/useEntryId';
import { validateEntryId } from '../lib/api';
import { Button } from '../components/ui/Button';
import { colors, spacing, fontSize, fontWeight, radius } from '../lib/theme';

type Step = 'intro' | 'input';

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { saveEntryId } = useEntryId();

  const [step, setStep]     = useState<Step>('intro');
  const [value, setValue]   = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const trimmed = value.trim();

    if (!trimmed) {
      setError('Enter your FPL entry ID.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!/^\d+$/.test(trimmed)) {
      setError('The entry ID is a number — no letters or symbols.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setError('');
    setLoading(true);

    const result = await validateEntryId(trimmed);

    setLoading(false);

    if (!result.valid) {
      setError(result.error ?? 'Could not verify that entry ID.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveEntryId(trimmed);
    router.replace('/(tabs)/lineup');
  };

  if (step === 'intro') {
    return (
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.hero}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>FPL</Text>
          </View>
          <Text style={styles.heroTitle}>Your FPL{'\n'}edge.</Text>
          <Text style={styles.heroSub}>
            Lineup picks, transfer suggestions, chip strategy, and fixture planning — all in one place.
          </Text>
        </View>

        <View style={styles.footer}>
          <Button
            label="Get started"
            onPress={() => setStep('input')}
            fullWidth
          />
          <Text style={styles.footerNote}>
            No account needed. Your data stays on your device.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => setStep('intro')} style={styles.back}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.inputTitle}>Find your entry ID</Text>
        <Text style={styles.inputSub}>Your FPL entry ID is a number that identifies your team.</Text>

        <View style={styles.steps}>
          {[
            'Open the FPL app or visit fantasy.premierleague.com',
            'Tap "Points" at the bottom of the screen',
            'Your entry ID is the number in the page URL after /entry/',
            'Example: /entry/1234567/ — your ID is 1234567',
          ].map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Your entry ID</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            placeholder="e.g. 1234567"
            placeholderTextColor={colors.textSubtle}
            keyboardType="number-pad"
            value={value}
            onChangeText={v => { setValue(v); setError(''); }}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <Button
          label="Confirm entry ID"
          onPress={handleContinue}
          loading={loading}
          fullWidth
          style={styles.confirmBtn}
        />

        <Text style={styles.privacyNote}>
          Your entry ID is saved only on this device — never on a server. Visible only to you.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
  },

  hero: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  logoText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.black,
    color: colors.bg,
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: fontWeight.black,
    color: colors.text,
    letterSpacing: -1.5,
    lineHeight: 48,
    marginBottom: spacing.lg,
  },
  heroSub: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    lineHeight: 24,
    fontWeight: fontWeight.medium,
  },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  footerNote: {
    fontSize: fontSize.xs,
    color: colors.textSubtle,
    textAlign: 'center',
    fontWeight: fontWeight.medium,
  },

  back: {
    marginBottom: spacing.xxl,
  },
  backText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    fontWeight: fontWeight.semibold,
  },

  inputTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  inputSub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xxl,
    lineHeight: 20,
  },

  steps: {
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  step: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  stepText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    fontWeight: fontWeight.medium,
  },

  inputGroup: {
    marginBottom: spacing.xl,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.lg,
    color: colors.text,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.5,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.sm,
    fontWeight: fontWeight.medium,
  },

  confirmBtn: {
    marginBottom: spacing.lg,
  },
  privacyNote: {
    fontSize: fontSize.xs,
    color: colors.textSubtle,
    textAlign: 'center',
    lineHeight: 18,
  },
});
