import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEntryId } from '../../hooks/useEntryId';
import { api } from '../../lib/api';
import { colors, spacing, fontSize, fontWeight, radius } from '../../lib/theme';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ScreenHeader } from '../../components/ui/ScreenHeader';

function ratingColor(score: number) {
  if (score >= 7.5) return colors.success;
  if (score >= 5)   return colors.gold;
  return colors.error;
}

function positionColor(pos: string) {
  switch (pos) {
    case 'GKP': return colors.gold;
    case 'DEF': return '#38bdf8';
    case 'MID': return colors.primary;
    case 'FWD': return '#f87171';
    default:    return colors.textMuted;
  }
}

function PlayerCard({ player, isCaptain, isVice }: { player: any; isCaptain?: boolean; isVice?: boolean }) {
  const score = player.predicted_pts ?? player.score ?? 0;
  return (
    <View style={pStyles.card}>
      <View style={[pStyles.posBar, { backgroundColor: positionColor(player.position) }]} />
      <View style={pStyles.body}>
        <View style={pStyles.topRow}>
          <Text style={pStyles.name}>{player.web_name}</Text>
          {isCaptain && <View style={pStyles.capBadge}><Text style={pStyles.capText}>C</Text></View>}
          {isVice    && <View style={[pStyles.capBadge, pStyles.vcBadge]}><Text style={pStyles.capText}>V</Text></View>}
        </View>
        <View style={pStyles.meta}>
          <Text style={[pStyles.pos, { color: positionColor(player.position) }]}>{player.position}</Text>
          {player.fixture_label && <Text style={pStyles.fixture}>{player.fixture_label}</Text>}
        </View>
      </View>
      <View style={pStyles.pts}>
        <Text style={[pStyles.ptsNum, { color: ratingColor(score) }]}>{score.toFixed(1)}</Text>
        <Text style={pStyles.ptsSub}>pts</Text>
      </View>
    </View>
  );
}

const pStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  posBar: { width: 3 },
  body: { flex: 1, padding: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  capBadge: {
    width: 20, height: 20, borderRadius: radius.full,
    backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center',
  },
  vcBadge: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.textMuted },
  capText: { fontSize: fontSize.xs, fontWeight: fontWeight.black, color: colors.bg },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pos: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
  fixture: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.medium },
  pts: { padding: spacing.md, alignItems: 'center', justifyContent: 'center', minWidth: 52 },
  ptsNum: { fontSize: fontSize.lg, fontWeight: fontWeight.black, lineHeight: 20 },
  ptsSub: { fontSize: 9, color: colors.textMuted, fontWeight: fontWeight.semibold, letterSpacing: 0.5 },
});

export default function LineupScreen() {
  const { entryId } = useEntryId();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['lineup', entryId],
    queryFn: () => api.lineup(entryId!),
    enabled: !!entryId,
  });

  const { data: ratingData } = useQuery({
    queryKey: ['rating', entryId],
    queryFn: () => api.rateSquad(entryId!),
    enabled: !!entryId,
  });

  const captainId    = data?.captain?.id;
  const viceCaptainId = data?.vice_captain?.id;
  const startingXI   = data?.starting_xi ?? [];
  const bench        = [data?.bench_gk, ...(data?.bench_outfield ?? [])].filter(Boolean);
  const squadRating  = ratingData?.squad_score ?? null;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Squad"
        subtitle={entryId ? `Entry #${entryId}` : undefined}
        right={
          <TouchableOpacity onPress={() => router.push('/settings')} style={styles.settingsBtn}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => { refetch(); }}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading && (
          <Text style={styles.statusText}>Loading squad...</Text>
        )}

        {isError && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorTitle}>Could not load squad</Text>
            <Text style={styles.errorSub}>Check your connection and pull to refresh.</Text>
          </Card>
        )}

        {squadRating !== null && (
          <Card style={styles.ratingCard} raised>
            <View style={styles.ratingRow}>
              <View>
                <Text style={styles.ratingLabel}>Squad rating</Text>
                <Text style={[styles.ratingScore, { color: ratingColor(squadRating) }]}>
                  {squadRating.toFixed(1)}<Text style={styles.ratingMax}>/10</Text>
                </Text>
              </View>
              <View style={styles.ratingRight}>
                {ratingData?.regression_warnings?.length > 0 && (
                  <Badge label={`${ratingData.regression_warnings.length} risks`} variant="warning" />
                )}
              </View>
            </View>
          </Card>
        )}

        {startingXI.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Starting XI</Text>
            {startingXI.map((p: any) => (
              <PlayerCard
                key={p.id}
                player={p}
                isCaptain={p.id === captainId}
                isVice={p.id === viceCaptainId}
              />
            ))}
          </View>
        )}

        {bench.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Bench</Text>
            {bench.map((p: any) => (
              <PlayerCard key={p.id} player={p} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: colors.bg },
  scroll:   { flex: 1 },
  content:  { padding: spacing.lg, paddingBottom: spacing.xxxl },
  statusText: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl, fontSize: fontSize.sm },
  section:  { marginBottom: spacing.xl },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  ratingCard: { marginBottom: spacing.xl },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingLabel: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.semibold, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  ratingScore: { fontSize: 36, fontWeight: fontWeight.black, letterSpacing: -1 },
  ratingMax: { fontSize: fontSize.lg, color: colors.textMuted },
  ratingRight: { alignItems: 'flex-end', gap: spacing.sm },
  errorCard: { borderColor: colors.error, backgroundColor: colors.errorMuted },
  errorTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.error, marginBottom: 4 },
  errorSub: { fontSize: fontSize.sm, color: colors.textSecondary },
  settingsBtn: { padding: spacing.sm },
  settingsIcon: { fontSize: 20 },
});
