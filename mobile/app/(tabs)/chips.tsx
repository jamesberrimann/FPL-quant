import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useEntryId } from '../../hooks/useEntryId';
import { api } from '../../lib/api';
import { colors, spacing, fontSize, fontWeight, radius } from '../../lib/theme';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { StatRow } from '../../components/ui/StatRow';

function ScorePill({ gw, points, average }: { gw: number; points: number; average?: number | null }) {
  const diff = average != null ? points - average : null;
  const isAbove = diff != null && diff >= 0;
  return (
    <View style={scorePillStyles.pill}>
      <Text style={scorePillStyles.gw}>GW{gw}</Text>
      <Text style={[scorePillStyles.pts, diff == null ? null : isAbove ? scorePillStyles.above : scorePillStyles.below]}>
        {points}
      </Text>
      {average != null && <Text style={scorePillStyles.avg}>avg {average}</Text>}
      {diff != null && (
        <Text style={[scorePillStyles.diff, isAbove ? scorePillStyles.diffPos : scorePillStyles.diffNeg]}>
          {isAbove ? '+' : ''}{diff}
        </Text>
      )}
    </View>
  );
}

const scorePillStyles = StyleSheet.create({
  pill: { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.surfaceBorder },
  gw: { fontSize: 9, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  pts: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.text, lineHeight: 28 },
  above: { color: colors.success },
  below: { color: colors.error },
  avg: { fontSize: 9, color: colors.textMuted, fontWeight: fontWeight.semibold, marginTop: 2 },
  diff: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginTop: 2 },
  diffPos: { color: colors.success },
  diffNeg: { color: colors.error },
});

function ChipCard({ title, emoji, available, gw, urgent, reason, children }: {
  title: string; emoji: string; available: boolean; gw?: number; urgent?: boolean; reason?: string; children?: React.ReactNode;
}) {
  return (
    <Card style={[chipStyles.card, urgent ? chipStyles.urgent : undefined, !available ? chipStyles.used : undefined]} raised>
      <View style={chipStyles.header}>
        <View style={chipStyles.iconWrap}>
          <Text style={chipStyles.icon}>{emoji}</Text>
        </View>
        <View style={chipStyles.titleBlock}>
          <View style={chipStyles.titleRow}>
            <Text style={chipStyles.title}>{title}</Text>
            {urgent && <Badge label="Use now" variant="warning" />}
          </View>
          {gw && <Text style={chipStyles.gw}>Recommended GW{gw}</Text>}
        </View>
        <Badge label={available ? 'Available' : 'Used'} variant={available ? 'success' : 'muted'} />
      </View>
      {reason && <Text style={chipStyles.reason}>{reason}</Text>}
      {children}
    </Card>
  );
}

const chipStyles = StyleSheet.create({
  card: { marginBottom: spacing.lg },
  urgent: { borderColor: colors.warning },
  used: { opacity: 0.55 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md },
  iconWrap: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20 },
  titleBlock: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  gw: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.medium },
  reason: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
});

export default function ChipsScreen() {
  const { entryId } = useEntryId();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['chips', entryId],
    queryFn: () => api.chipPlan(entryId!),
    enabled: !!entryId,
  });

  const avail = data?.chips_available ?? {};
  const wc = data?.wildcard;
  const tc = data?.triple_captain;
  const bb = data?.bench_boost;
  const fh = (data?.free_hit ?? [])[0];
  const scores = data?.recent_scores ?? [];
  const alert = data?.performance_alert;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Chip Planner" subtitle="Season-wide strategy" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); }} tintColor={colors.primary} />}
      >
        {isLoading && <Text style={styles.status}>Scanning season fixtures...</Text>}
        {isError && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorTitle}>Could not load chip plan</Text>
            <Text style={styles.errorSub}>Pull to refresh.</Text>
          </Card>
        )}

        {alert && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <Text style={styles.alertText}>{alert}</Text>
          </View>
        )}

        {scores.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Last 5 gameweeks</Text>
            <View style={styles.scorePills}>
              {scores.map((s: any) => (
                <ScorePill key={s.gameweek} gw={s.gameweek} points={s.points} average={s.average} />
              ))}
            </View>
          </View>
        )}

        {!isLoading && !isError && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Your chips</Text>

            <ChipCard
              title="Wildcard"
              emoji="🃏"
              available={avail.wildcard1 || avail.wildcard2}
              gw={wc?.gameweek}
              urgent={wc?.urgent}
              reason={wc?.reason}
            />

            <ChipCard
              title="Triple Captain"
              emoji="⭐"
              available={avail.triple_captain !== false}
              gw={tc?.gameweek}
              reason={tc?.reason}
            >
              {tc?.candidates?.length > 0 && (
                <View style={styles.candidates}>
                  {tc.candidates.map((c: any, i: number) => (
                    <StatRow key={i} label={c.player_name} value={`${c.player_score} pts`} valueColor={colors.primary} />
                  ))}
                </View>
              )}
            </ChipCard>

            <ChipCard
              title="Bench Boost"
              emoji="⚡"
              available={avail.bench_boost !== false}
              gw={bb?.gameweek}
              reason={bb?.reason}
            >
              {bb?.projected_squad_pts && (
                <View style={styles.pts}>
                  <Text style={styles.ptsNum}>~{bb.projected_squad_pts}</Text>
                  <Text style={styles.ptsSub}>projected squad pts</Text>
                </View>
              )}
            </ChipCard>

            <ChipCard
              title="Free Hit"
              emoji="🔄"
              available={avail.free_hit !== false}
              gw={fh?.gameweek}
              reason={fh?.reason}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  status: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl, fontSize: fontSize.sm },
  section: { marginBottom: spacing.xl },
  sectionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.md },
  scorePills: { flexDirection: 'row', gap: spacing.sm },
  alertBanner: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.warningMuted, borderWidth: 1, borderColor: colors.warning, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.xl, alignItems: 'flex-start' },
  alertIcon: { fontSize: 18 },
  alertText: { flex: 1, fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
  candidates: { marginTop: spacing.md },
  pts: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: spacing.md },
  ptsNum: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.primary },
  ptsSub: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.medium },
  errorCard: { borderColor: colors.error, backgroundColor: colors.errorMuted },
  errorTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.error, marginBottom: 4 },
  errorSub: { fontSize: fontSize.sm, color: colors.textSecondary },
});
