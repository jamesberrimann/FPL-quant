import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useEntryId } from '../../hooks/useEntryId';
import { api } from '../../lib/api';
import { colors, spacing, fontSize, fontWeight, radius } from '../../lib/theme';
import { Card } from '../../components/ui/Card';
import { ScreenHeader } from '../../components/ui/ScreenHeader';

function difficultyColor(difficulty: number): string {
  if (difficulty <= 2) return colors.success;
  if (difficulty === 3) return colors.gold;
  if (difficulty === 4) return colors.warning;
  return colors.error;
}

function DifficultyDot({ difficulty }: { difficulty: number }) {
  return (
    <View style={[dotStyles.dot, { backgroundColor: difficultyColor(difficulty) }]} />
  );
}

const dotStyles = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4 },
});

function FixtureRow({ player, fixtures }: { player: any; fixtures: any[] }) {
  return (
    <View style={fixtureRowStyles.row}>
      <View style={fixtureRowStyles.player}>
        <Text style={fixtureRowStyles.name}>{player.web_name}</Text>
        <Text style={fixtureRowStyles.pos}>{player.position}</Text>
      </View>
      <View style={fixtureRowStyles.cells}>
        {fixtures.map((fix: any, i: number) => (
          <View key={i} style={fixtureRowStyles.cell}>
            {fix ? (
              <>
                <Text style={[fixtureRowStyles.opp, { color: difficultyColor(fix.difficulty ?? 3) }]}>
                  {fix.opponent_short ?? fix.label ?? '?'}{fix.is_home ? '' : ' (a)'}
                </Text>
                {fix.is_dgw && <Text style={fixtureRowStyles.dgwDot}>DGW</Text>}
              </>
            ) : (
              <Text style={fixtureRowStyles.blank}>-</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const fixtureRowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder },
  player: { width: 90 },
  name: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  pos: { fontSize: 10, color: colors.textMuted, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
  cells: { flex: 1, flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', gap: 2 },
  opp: { fontSize: 10, fontWeight: fontWeight.bold, textAlign: 'center' },
  blank: { fontSize: 10, color: colors.textSubtle },
  dgwDot: { fontSize: 7, fontWeight: fontWeight.bold, color: colors.gold, letterSpacing: 0.3 },
});

export default function FixturesScreen() {
  const { entryId } = useEntryId();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['fixtures', entryId],
    queryFn: () => api.fixturePlan(entryId!),
    enabled: !!entryId,
  });

  const gameweeks: number[] = data?.gameweeks ?? [];
  const players: any[] = data?.players ?? [];

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Fixtures" subtitle="6-week difficulty view" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); }} tintColor={colors.primary} />}
      >
        {isLoading && <Text style={styles.status}>Loading fixture plan...</Text>}

        {isError && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorTitle}>Could not load fixtures</Text>
            <Text style={styles.errorSub}>Pull to refresh.</Text>
          </Card>
        )}

        {!isLoading && !isError && players.length > 0 && (
          <Card>
            <View style={styles.headerRow}>
              <View style={{ width: 90 }} />
              {gameweeks.map(gw => (
                <View key={gw} style={styles.gwHeader}>
                  <Text style={styles.gwLabel}>GW{gw}</Text>
                </View>
              ))}
            </View>
            {players.map((p: any) => (
              <FixtureRow key={p.id} player={p} fixtures={p.fixtures ?? []} />
            ))}
          </Card>
        )}

        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Difficulty</Text>
          <View style={styles.legendItems}>
            {[
              { label: 'Easy', color: colors.success },
              { label: 'Medium', color: colors.gold },
              { label: 'Hard', color: colors.warning },
              { label: 'Very hard', color: colors.error },
            ].map(item => (
              <View key={item.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  status: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl, fontSize: fontSize.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder, marginBottom: spacing.xs },
  gwHeader: { flex: 1, alignItems: 'center' },
  gwLabel: { fontSize: 10, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  legend: { marginTop: spacing.xl },
  legendTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.md },
  legendItems: { flexDirection: 'row', gap: spacing.xl },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  errorCard: { borderColor: colors.error, backgroundColor: colors.errorMuted },
  errorTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.error, marginBottom: 4 },
  errorSub: { fontSize: fontSize.sm, color: colors.textSecondary },
});
