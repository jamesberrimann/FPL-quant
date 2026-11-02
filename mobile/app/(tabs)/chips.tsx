import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEntryId } from '../../hooks/useEntryId';
import { api } from '../../lib/api';
import { colors, spacing, fontSize, fontWeight, radius } from '../../lib/theme';

function ScorePill({ gw, points, average }: { gw: number; points: number; average?: number | null }) {
  const diff = average != null ? points - average : null;
  const above = diff != null && diff >= 0;
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.surfaceBorder } as any}>
      <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.8, marginBottom: 4 }}>GW{gw}</Text>
      <Text style={{ fontSize: 26, fontWeight: fontWeight.black, lineHeight: 30, color: diff == null ? colors.text : above ? colors.success : colors.error, fontVariant: ['tabular-nums'] }}>
        {points}
      </Text>
      {average != null && <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>avg {average}</Text>}
      {diff != null && (
        <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, marginTop: 2, color: above ? colors.success : colors.error }}>
          {above ? '+' : ''}{diff}
        </Text>
      )}
    </View>
  );
}

function ChipCard({ title, subtitle, available, notYet, urgent, reason, children }: {
  title: string; subtitle?: string; available: boolean; notYet?: boolean;
  urgent?: boolean; reason?: string; children?: React.ReactNode;
}) {
  const statusLabel = notYet ? 'GW21+' : available ? 'Available' : 'Used';
  const statusColor = notYet ? colors.textMuted : available ? colors.success : colors.textMuted;
  const statusBg    = notYet ? colors.surfaceRaised : available ? colors.successMuted : colors.surfaceRaised;

  return (
    <View style={{
      backgroundColor: colors.surface, borderRadius: radius.xl, borderCurve: 'continuous',
      borderWidth: 1, borderColor: urgent ? colors.warning : colors.surfaceBorder,
      marginBottom: spacing.md, opacity: (!available && !notYet) ? 0.5 : 1,
    } as any}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: subtitle ? 3 : 0 }}>
            <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text }}>{title}</Text>
            {urgent && (
              <View style={{ paddingHorizontal: 7, paddingVertical: 2, backgroundColor: colors.warningMuted, borderRadius: 99 }}>
                <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.warning }}>Use now</Text>
              </View>
            )}
          </View>
          {subtitle && <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>{subtitle}</Text>}
        </View>
        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: statusBg }}>
          <Text style={{ fontSize: 11, fontWeight: fontWeight.bold, color: statusColor }}>{statusLabel}</Text>
        </View>
      </View>
      {reason && (
        <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
          {reason}
        </Text>
      )}
      {children}
    </View>
  );
}

export default function ChipsScreen() {
  const insets = useSafeAreaInsets();
  const { entryId } = useEntryId();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['chips', entryId],
    queryFn: () => api.chipPlan(entryId!),
    enabled: !!entryId,
  });

  const avail  = data?.chips_available ?? {};
  const wc     = data?.wildcard;
  const tc     = data?.triple_captain;
  const bb     = data?.bench_boost;
  const fh     = (data?.free_hit ?? [])[0];
  const scores = data?.recent_scores ?? [];
  const alert  = data?.performance_alert;

  const wc1Available = avail.wildcard1 !== false;
  const wc2Available = avail.wildcard2 !== false;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder }}>
        <Text style={{ fontSize: 28, fontWeight: fontWeight.black, color: colors.text, letterSpacing: -0.5 }}>Chip Planner</Text>
        <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 }}>Season-wide strategy</Text>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl + insets.bottom }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); }} tintColor={colors.primary} />}
      >
        {isLoading && <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 48, fontSize: fontSize.sm }}>Scanning season...</Text>}

        {alert && (
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', backgroundColor: colors.warningMuted, borderRadius: radius.xl, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.warning, padding: spacing.lg, marginBottom: spacing.lg } as any}>
            <Text style={{ flex: 1, fontSize: fontSize.sm, color: colors.text, lineHeight: 20 }}>{alert}</Text>
          </View>
        )}

        {scores.length > 0 && (
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={{ fontSize: 11, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.md }}>
              Last 5 gameweeks
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {scores.map((s: any) => <ScorePill key={s.gameweek} gw={s.gameweek} points={s.points} average={s.average} />)}
            </View>
          </View>
        )}

        {!isLoading && !isError && (
          <>
            <Text style={{ fontSize: 11, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.md }}>
              Your chips
            </Text>

            <ChipCard title="Wildcard 1" subtitle="GW1 to GW20" available={wc1Available} urgent={wc?.urgent && wc1Available} reason={wc1Available && wc ? wc.reason : undefined} />
            <ChipCard title="Wildcard 2" subtitle="GW21 to GW38" available={wc2Available} notYet={wc2Available} />

            <ChipCard title="Triple Captain" subtitle={tc ? `Best window: GW${tc.gameweek}` : undefined} available={avail.triple_captain !== false} reason={tc?.reason}>
              {tc?.candidates?.length > 0 && (
                <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: 2 }}>
                  {tc.candidates.map((c: any, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                      <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>{c.player_name}</Text>
                      <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary }}>{c.player_score} pts</Text>
                    </View>
                  ))}
                </View>
              )}
            </ChipCard>

            <ChipCard title="Bench Boost" subtitle={bb ? `Best window: GW${bb.gameweek}` : undefined} available={avail.bench_boost !== false} reason={bb?.reason}>
              {bb?.projected_squad_pts != null && (
                <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text style={{ fontSize: 28, fontWeight: fontWeight.black, color: colors.primary }}>~{bb.projected_squad_pts}</Text>
                  <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>projected squad pts</Text>
                </View>
              )}
            </ChipCard>

            <ChipCard title="Free Hit" subtitle={fh ? `Blank GW: GW${fh.gameweek}` : undefined} available={avail.free_hit !== false} reason={fh?.reason} />
          </>
        )}
      </ScrollView>
    </View>
  );
}
