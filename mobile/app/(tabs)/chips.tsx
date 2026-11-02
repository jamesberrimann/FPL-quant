import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useEntryId } from '../../hooks/useEntryId';
import { api } from '../../lib/api';
import { colors, spacing, fontSize, fontWeight, radius } from '../../lib/theme';
import { Header } from '../../components/Header';

function ScorePill({ gw, points, average }: { gw: number; points: number; average?: number | null }) {
  const diff  = average != null ? points - average : null;
  const above = diff != null && diff >= 0;
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg }}>
      <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.textMuted, marginBottom: 4 }}>GW{gw}</Text>
      <Text style={{ fontSize: 26, fontWeight: fontWeight.black, color: diff == null ? colors.text : above ? colors.primary : colors.error, fontVariant: ['tabular-nums'] }}>
        {points}
      </Text>
      {average != null && <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>avg {average}</Text>}
      {diff != null && <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, marginTop: 2, color: above ? colors.primary : colors.error }}>{above ? '+' : ''}{diff}</Text>}
    </View>
  );
}

function ChipRow({ title, subtitle, available, notYet, urgent, reason, children }: {
  title: string; subtitle?: string; available: boolean; notYet?: boolean;
  urgent?: boolean; reason?: string; children?: React.ReactNode;
}) {
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, marginBottom: spacing.sm, overflow: 'hidden', opacity: !available && !notYet ? 0.4 : 1 }}>
      {urgent && <View style={{ height: 3, backgroundColor: colors.warning }} />}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text }}>{title}</Text>
          {subtitle && <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 3 }}>{subtitle}</Text>}
        </View>
        <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, backgroundColor: notYet ? colors.surfaceRaised : available ? colors.primaryMuted : colors.surfaceRaised }}>
          <Text style={{ fontSize: 11, fontWeight: fontWeight.bold, color: notYet ? colors.textMuted : available ? colors.primary : colors.textMuted }}>
            {notYet ? 'GW21+' : available ? 'Available' : 'Used'}
          </Text>
        </View>
      </View>
      {reason && <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>{reason}</Text>}
      {children}
    </View>
  );
}

export default function ChipsScreen() {
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
  const wc1    = avail.wildcard1 !== false;
  const wc2    = avail.wildcard2 !== false;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Chips" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); }} tintColor={colors.primary} />}
      >
        {isLoading && <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 48, fontSize: fontSize.sm }}>Loading...</Text>}

        {alert && (
          <View style={{ backgroundColor: colors.warningMuted, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.warning, padding: spacing.lg, marginBottom: spacing.lg }}>
            <Text style={{ fontSize: fontSize.sm, color: colors.text, lineHeight: 20 }}>{alert}</Text>
          </View>
        )}

        {scores.length > 0 && (
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.8, marginBottom: spacing.md }}>LAST 5 GAMEWEEKS</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {scores.map((s: any) => <ScorePill key={s.gameweek} gw={s.gameweek} points={s.points} average={s.average} />)}
            </View>
          </View>
        )}

        {!isLoading && !isError && (
          <>
            <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.8, marginBottom: spacing.md }}>YOUR CHIPS</Text>

            <ChipRow title="Wildcard 1" subtitle="GW1 to GW20" available={wc1} urgent={wc?.urgent && wc1} reason={wc1 && wc ? wc.reason : undefined} />
            <ChipRow title="Wildcard 2" subtitle="GW21 to GW38" available={wc2} notYet={wc2} />

            <ChipRow title="Triple Captain" subtitle={tc ? `Best window GW${tc.gameweek}` : undefined} available={avail.triple_captain !== false} reason={tc?.reason}>
              {tc?.candidates?.length > 0 && (
                <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
                  {tc.candidates.map((c: any, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.surfaceBorder }}>
                      <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>{c.player_name}</Text>
                      <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary }}>{c.player_score}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ChipRow>

            <ChipRow title="Bench Boost" subtitle={bb ? `Best window GW${bb.gameweek}` : undefined} available={avail.bench_boost !== false} reason={bb?.reason}>
              {bb?.projected_squad_pts != null && (
                <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text style={{ fontSize: 28, fontWeight: fontWeight.black, color: colors.primary }}>~{bb.projected_squad_pts}</Text>
                  <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>projected pts</Text>
                </View>
              )}
            </ChipRow>

            <ChipRow title="Free Hit" subtitle={fh ? `Blank GW${fh.gameweek}` : undefined} available={avail.free_hit !== false} reason={fh?.reason} />
          </>
        )}
      </ScrollView>
    </View>
  );
}
