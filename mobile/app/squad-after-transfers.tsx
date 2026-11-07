import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TouchableOpacity } from 'react-native';
import { useEntryId } from '../hooks/useEntryId';
import { api } from '../lib/api';
import { colors, spacing, fontSize, fontWeight, radius } from '../lib/theme';
import { PitchView, BenchRow } from '../components/PitchView';

export default function SquadAfterTransfersScreen() {
  const insets = useSafeAreaInsets();
  const { entryId } = useEntryId();
  const { freeTx: freeTxParam } = useLocalSearchParams<{ freeTx: string }>();
  const freeTx = Number(freeTxParam ?? 1);

  const { data: lineupData, isLoading: lineupLoading } = useQuery({
    queryKey: ['lineup', entryId],
    queryFn: () => api.lineup(entryId!),
    enabled: !!entryId,
  });

  const { data: transferData, isLoading: transferLoading } = useQuery({
    queryKey: ['transfers', entryId, freeTx],
    queryFn: () => api.transfers(entryId!, freeTx),
    enabled: !!entryId,
  });

  const { data: ratingData } = useQuery({
    queryKey: ['rating', entryId],
    queryFn: () => api.rateSquad(entryId!),
    enabled: !!entryId,
  });

  const isLoading = lineupLoading || transferLoading;

  const capId  = lineupData?.captain?.id;
  const vcId   = lineupData?.vice_captain?.id;
  const xi     = lineupData?.starting_xi ?? [];
  const bench  = [lineupData?.bench_gk, ...(lineupData?.bench_outfield ?? [])].filter(Boolean);
  const suggestions = transferData?.suggestions ?? [];
  const transferInIds = new Set<number>(suggestions.map((s: any) => s.in_id));
  const score  = ratingData?.squad_score ?? null;
  const top3   = [...(ratingData?.players ?? [])].sort((a: any, b: any) => b.score - a.score).slice(0, 3);

  function applyTransfers(players: any[]): any[] {
    return players.map((p: any) => {
      const swap = suggestions.find((s: any) => s.out_id === p.id);
      if (!swap) return p;
      return {
        id: swap.in_id,
        web_name: swap.in_web_name,
        team_short_name: swap.in_team_short_name,
        position: swap.position,
        next_fixture: null,
        status: 'a',
      };
    });
  }

  const displayXi    = applyTransfers(xi);
  const displayBench = applyTransfers(bench);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        backgroundColor: colors.nav,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceBorder,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
      }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ width: 4, height: 20, backgroundColor: colors.primary, borderRadius: 2 }} />
            <Text style={{ fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.text, letterSpacing: -0.5 }}>
              After Transfers
            </Text>
          </View>
          {suggestions.length > 0 && (
            <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 3, paddingLeft: 12 }}>
              {freeTx === 1 ? '1 free transfer' : freeTx === 0 ? 'All at 4pt cost' : `${freeTx} free transfers`}
              {' · '}{suggestions.length} change{suggestions.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: spacing.sm }}>
          <Text style={{ fontSize: fontSize.md, color: colors.textMuted, fontWeight: fontWeight.semibold }}>Close</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Changes summary */}
          {suggestions.length > 0 && (
            <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
              <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden' }}>
                <View style={{ padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder }}>
                  <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.7 }}>TRANSFERS</Text>
                </View>
                {suggestions.map((s: any, i: number) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.surfaceBorder }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.error }}>{s.out_web_name}</Text>
                      <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>{s.out_team_short_name} · {s.position}</Text>
                    </View>
                    <Text style={{ fontSize: 16, color: colors.textMuted, marginHorizontal: spacing.md }}>→</Text>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.success }}>{s.in_web_name}</Text>
                      <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>{s.in_team_short_name} · {s.position}</Text>
                    </View>
                    {s.points_cost > 0 && (
                      <View style={{ marginLeft: spacing.md, backgroundColor: colors.errorMuted, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.error }}>-{s.points_cost}pt</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Pitch */}
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
            <PitchView players={displayXi} capId={capId} vcId={vcId} transferInIds={transferInIds} />
            <BenchRow players={displayBench} transferInIds={transferInIds} />
          </View>

          {/* Rating */}
          {score !== null && (
            <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
              <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder, gap: spacing.lg }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 40, fontWeight: fontWeight.black, color: score >= 70 ? colors.success : score >= 50 ? colors.gold : colors.error, lineHeight: 44, fontVariant: ['tabular-nums'] }}>
                      {Math.round(score)}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: fontWeight.semibold }}>/ 100</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, marginBottom: 4 }}>
                      {score >= 80 ? 'Excellent' : score >= 65 ? 'Strong' : score >= 50 ? 'Average' : 'Below average'}
                    </Text>
                    <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 17 }}>
                      Current squad rating — reflects your squad before these transfers.
                    </Text>
                  </View>
                </View>
                <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
                  <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.7, marginBottom: spacing.sm }}>
                    STRONGEST PLAYERS
                  </Text>
                  {top3.map((p: any, i: number) => (
                    <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.surfaceBorder }}>
                      <View>
                        <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text }}>{p.web_name}</Text>
                        <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 }}>{p.position} · {p.team_short_name}</Text>
                      </View>
                      <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.black, color: colors.success }}>{Math.round(p.percentile)}th %ile</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          <View style={{ height: spacing.xxxl }} />
        </ScrollView>
      )}
    </View>
  );
}
