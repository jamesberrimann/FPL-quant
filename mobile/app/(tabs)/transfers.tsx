import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useEntryId } from '../../hooks/useEntryId';
import { api } from '../../lib/api';
import { colors, spacing, fontSize, fontWeight, radius } from '../../lib/theme';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { StatRow } from '../../components/ui/StatRow';

function TransferCard({ suggestion, index }: { suggestion: any; index: number }) {
  const isHit = suggestion.points_cost > 0;
  return (
    <Card style={styles.transferCard} raised>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIndex}>#{index + 1}</Text>
        {isHit
          ? <Badge label={`-${suggestion.points_cost} hit`} variant="error" />
          : <Badge label="Free" variant="primary" />
        }
        {suggestion.is_differential && <Badge label="Differential" variant="gold" />}
      </View>

      <View style={styles.transferRow}>
        <View style={styles.playerBlock}>
          <Text style={styles.playerLabel}>OUT</Text>
          <Text style={styles.playerName}>{suggestion.out?.web_name ?? 'Unknown'}</Text>
          <Text style={styles.playerMeta}>{suggestion.out?.position} · £{(suggestion.out_price ?? 0).toFixed(1)}m</Text>
        </View>
        <View style={styles.arrow}>
          <Text style={styles.arrowText}>→</Text>
        </View>
        <View style={[styles.playerBlock, styles.playerBlockIn]}>
          <Text style={[styles.playerLabel, styles.playerLabelIn]}>IN</Text>
          <Text style={styles.playerName}>{suggestion.in?.web_name ?? 'Unknown'}</Text>
          <Text style={styles.playerMeta}>{suggestion.in?.position} · £{(suggestion.in_price ?? 0).toFixed(1)}m</Text>
        </View>
      </View>

      <View style={styles.statsBlock}>
        <StatRow label="Predicted improvement" value={`+${suggestion.improvement?.toFixed(1) ?? '0'} pts`} valueColor={colors.primary} />
        {suggestion.break_even_weeks != null && (
          <StatRow label="Break even" value={`${suggestion.break_even_weeks} GW${suggestion.break_even_weeks !== 1 ? 's' : ''}`} />
        )}
        {suggestion.in_net_transfers_this_gw != null && suggestion.in_net_transfers_this_gw !== 0 && (
          <StatRow
            label="Transfer momentum"
            value={suggestion.in_net_transfers_this_gw > 0 ? `+${suggestion.in_net_transfers_this_gw.toLocaleString()}` : suggestion.in_net_transfers_this_gw.toLocaleString()}
            valueColor={suggestion.in_net_transfers_this_gw > 0 ? colors.success : colors.error}
          />
        )}
        {suggestion.timing_signal?.wait_recommended && (
          <StatRow label="Fixture timing" value="Wait — hard fixture next" valueColor={colors.warning} />
        )}
      </View>

      {suggestion.improvement_drivers?.length > 0 && (
        <View style={styles.drivers}>
          <Text style={styles.driversLabel}>Why</Text>
          <View style={styles.driverTags}>
            {suggestion.improvement_drivers.map((d: string, i: number) => (
              <View key={i} style={styles.driverTag}>
                <Text style={styles.driverTagText}>{d}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
}

export default function TransfersScreen() {
  const { entryId } = useEntryId();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['transfers', entryId],
    queryFn: () => api.transfers(entryId!),
    enabled: !!entryId,
  });

  const suggestions = data?.suggestions ?? [];

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Transfers"
        subtitle={data ? `${data.free_transfers ?? 1} free transfer${(data.free_transfers ?? 1) !== 1 ? 's' : ''} available` : undefined}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); }} tintColor={colors.primary} />}
      >
        {isLoading && <Text style={styles.status}>Loading suggestions...</Text>}

        {isError && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorTitle}>Could not load transfers</Text>
            <Text style={styles.errorSub}>Pull to refresh.</Text>
          </Card>
        )}

        {!isLoading && !isError && suggestions.length === 0 && (
          <Card>
            <Text style={styles.emptyTitle}>No transfers recommended</Text>
            <Text style={styles.emptySub}>Your squad looks strong. No upgrade clears the improvement threshold right now.</Text>
          </Card>
        )}

        {suggestions.map((s: any, i: number) => (
          <TransferCard key={i} suggestion={s} index={i} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  status: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl, fontSize: fontSize.sm },
  transferCard: { marginBottom: spacing.lg },
  cardHeader: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginBottom: spacing.lg },
  cardIndex: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textMuted, marginRight: spacing.xs },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  playerBlock: { flex: 1 },
  playerBlockIn: { alignItems: 'flex-end' },
  playerLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.error, letterSpacing: 0.8, marginBottom: 2 },
  playerLabelIn: { color: colors.success },
  playerName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, marginBottom: 2 },
  playerMeta: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.medium },
  arrow: { paddingHorizontal: spacing.sm },
  arrowText: { fontSize: fontSize.xl, color: colors.textSubtle },
  statsBlock: { marginBottom: spacing.md },
  drivers: {},
  driversLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.sm },
  driverTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  driverTag: { backgroundColor: colors.surfaceRaised, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3, borderWidth: 1, borderColor: colors.surfaceBorder },
  driverTagText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  emptyTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.sm },
  emptySub: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20 },
  errorCard: { borderColor: colors.error, backgroundColor: colors.errorMuted },
  errorTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.error, marginBottom: 4 },
  errorSub: { fontSize: fontSize.sm, color: colors.textSecondary },
});
