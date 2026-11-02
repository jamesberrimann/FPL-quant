import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useEntryId } from '../hooks/useEntryId';
import { validateEntryId } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { StatRow } from '../components/ui/StatRow';
import { colors, spacing, fontSize, fontWeight, radius } from '../lib/theme';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { entryId, saveEntryId, clearEntryId } = useEntryId();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed) { setError('Enter an entry ID.'); return; }
    if (!/^\d+$/.test(trimmed)) { setError('Entry ID must be a number.'); return; }

    setError('');
    setLoading(true);

    const result = await validateEntryId(trimmed);
    setLoading(false);

    if (!result.valid) {
      setError(result.error ?? 'Could not verify that entry ID.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    await saveEntryId(trimmed);
    queryClient.clear();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditing(false);
    setValue('');
  };

  const handleClear = () => {
    Alert.alert(
      'Remove entry ID',
      'This will take you back to the setup screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await clearEntryId();
            queryClient.clear();
            router.replace('/onboarding');
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeText}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>FPL Entry</Text>
          {!editing ? (
            <>
              <StatRow label="Your entry ID" value={entryId ?? 'Not set'} />
              <TouchableOpacity
                onPress={() => { setEditing(true); setValue(entryId ?? ''); }}
                style={styles.changeBtn}
              >
                <Text style={styles.changeBtnText}>Change entry ID</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.editBlock}>
              <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                placeholder="New entry ID"
                placeholderTextColor={colors.textSubtle}
                keyboardType="number-pad"
                value={value}
                onChangeText={v => { setValue(v); setError(''); }}
                autoFocus
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <View style={styles.editActions}>
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={() => { setEditing(false); setError(''); setValue(''); }}
                  style={styles.editBtn}
                />
                <Button
                  label="Save"
                  onPress={handleSave}
                  loading={loading}
                  style={styles.editBtn}
                />
              </View>
            </View>
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <Text style={styles.privacyText}>
            Your entry ID is stored on this device only using your OS secure keychain. Nothing is ever sent to a server for storage.
          </Text>
        </Card>

        <Button
          label="Remove entry ID"
          variant="danger"
          onPress={handleClear}
          fullWidth
          style={styles.clearBtn}
        />

        <Text style={styles.version}>FPL Quant</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.text },
  closeBtn: { padding: spacing.sm },
  closeText: { fontSize: fontSize.md, color: colors.primary, fontWeight: fontWeight.semibold },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },
  section: {},
  sectionTitle: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.md,
  },
  changeBtn: { marginTop: spacing.lg },
  changeBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
  editBlock: { gap: spacing.md },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  inputError: { borderColor: colors.error },
  errorText: { fontSize: fontSize.xs, color: colors.error, fontWeight: fontWeight.medium },
  editActions: { flexDirection: 'row', gap: spacing.md },
  editBtn: { flex: 1 },
  privacyText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  clearBtn: { marginTop: spacing.md },
  version: { fontSize: fontSize.xs, color: colors.textSubtle, textAlign: 'center', marginTop: spacing.xl },
});
