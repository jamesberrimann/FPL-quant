import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useEntryId } from '../../hooks/useEntryId';
import { api } from '../../lib/api';
import { colors, spacing, fontSize, fontWeight, radius } from '../../lib/theme';
import { Header } from '../../components/Header';
import { PitchView, BenchRow } from '../../components/PitchView';

type Mode = 'wildcard' | 'freehit';

const BUDGETS = [95, 100, 105];

export default function OptiScreen() {
  const { entryId } = useEntryId();
  const [mode, setMode]     = useState<Mode>('wildcard');
  const [budget, setBudget] = useState(100);

  const { data: bestData, isLoading: bestLoading, isError: bestError, refetch: refetchBest, isRefetching: bestRefetching } = useQuery({
    queryKey: ['best-squad', budget],
    queryFn: () => api.bestSquad(budget),
    enabled: mode === 'wildcard',
  });

  const { data: chipData } = useQuery({
    queryKey: ['chips', entryId],
    queryFn: () => api.chipPlan(entryId!),
    enabled: !!entryId,
  });

  const fhGw = chipData?.free_hit?.[0]?.gameweek ?? null;

  const { data: fhData, isLoading: fhLoading, isError: fhError, refetch: refetchFh, isRefetching: fhRefetching } = useQuery({
    queryKey: ['fh-squad', entryId, fhGw],
    queryFn: () => api.fhSquad(entryId!, fhGw!),
    enabled: mode === 'freehit' && !!entryId && !!fhGw,
  });

  const isLoading   = mode === 'wildcard' ? bestLoading   : fhLoading;
  const isError     = mode === 'wildcard' ? bestError     : fhError;
  const isRefetching = mode === 'wildcard' ? bestRefetching : fhRefetching;
  const refetch     = mode === 'wildcard' ? refetchBest   : refetchFh;

  const xi      = mode === 'wildcard' ? (bestData?.starting_xi ?? []) : (fhData?.starting_xi ?? []);
  const bench   = mode === 'wildcard' ? (bestData?.bench ?? [])        : (fhData?.bench ?? []);
  const capId   = mode === 'wildcard' ? bestData?.captain_id           : fhData?.captain_id;
  const vcId    = mode === 'wildcard' ? bestData?.vice_captain_id      : fhData?.vice_captain_id;

  const remapFH = (players: any[]) => players.map(p => ({ ...p, next_fixture: p.fixture_label ?? p.next_fixture }));
  const displayXi    = mode === 'freehit' ? remapFH(xi)    : xi;
  const displayBench = mode === 'freehit' ? remapFH(bench) : bench;

  function toggle(m: Mode) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(m);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Optimise" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); }} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
      >
        {/* Mode toggle */}
        <View style={{ margin: spacing.lg, flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.xl, padding: 4 }}>
          {([['wildcard', 'Wildcard Squad'], ['freehit', 'Free Hit Squad']] as [Mode, string][]).map(([m, label]) => (
            <TouchableOpacity
              key={m}
              onPress={() => toggle(m)}
              style={{
                flex: 1, paddingVertical: spacing.md, borderRadius: radius.lg, alignItems: 'center',
                backgroundColor: mode === m ? colors.primary : colors.transparent,
              }}
            >
              <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: mode === m ? colors.nav : colors.textMuted }}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Wildcard budget selector */}
        {mode === 'wildcard' && (
          <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
            <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.7, marginBottom: spacing.sm }}>BUDGET</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {BUDGETS.map(b => (
                <TouchableOpacity
                  key={b}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setBudget(b); }}
                  style={{ flex: 1, paddingVertical: spacing.sm, borderRadius: radius.lg, alignItems: 'center', backgroundColor: budget === b ? colors.primary : colors.surface }}
                >
                  <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: budget === b ? colors.nav : colors.textMuted }}>£{b}m</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Free Hit GW info */}
        {mode === 'freehit' && fhGw && (
          <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
            <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg }}>
              <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20 }}>
                Building the optimal squad for <Text style={{ fontWeight: fontWeight.bold, color: colors.text }}>GW{fhGw}</Text> using your actual FPL budget. The Free Hit chip lets you field any 15 players for one gameweek then reverts.
              </Text>
            </View>
          </View>
        )}

        {mode === 'freehit' && !fhGw && !fhLoading && (
          <View style={{ margin: spacing.lg, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.xl, alignItems: 'center' }}>
            <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.sm }}>No blank gameweek detected</Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>The Free Hit squad is most useful when 5+ of your players have no fixture. Check back closer to a blank GW.</Text>
          </View>
        )}

        {isLoading && (
          <View style={{ alignItems: 'center', marginTop: 60, gap: spacing.lg }}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
              {mode === 'wildcard' ? 'Building optimal squad...' : 'Building Free Hit squad...'}
            </Text>
          </View>
        )}

        {isError && (
          <View style={{ margin: spacing.lg, padding: spacing.lg, backgroundColor: colors.errorMuted, borderRadius: radius.xl }}>
            <Text style={{ color: colors.error, fontWeight: fontWeight.bold }}>Could not build squad</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, marginTop: 4 }}>Pull to refresh.</Text>
          </View>
        )}

        {/* Pitch */}
        {displayXi.length > 0 && (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <PitchView players={displayXi} capId={capId} vcId={vcId} />
            <BenchRow players={displayBench} />
          </View>
        )}

        {/* Stats bar */}
        {mode === 'wildcard' && bestData && displayXi.length > 0 && (
          <View style={{ flexDirection: 'row', gap: spacing.xxl, marginHorizontal: spacing.lg, marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg }}>
            <View>
              <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 3 }}>COST</Text>
              <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.black, color: colors.text }}>£{bestData.total_cost?.toFixed(1)}m</Text>
            </View>
            <View>
              <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 3 }}>IN BANK</Text>
              <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.black, color: colors.success }}>£{(budget - (bestData.total_cost ?? 0)).toFixed(1)}m</Text>
            </View>
            {bestData.squad_score_percentile != null && (
              <View>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 3 }}>PERCENTILE</Text>
                <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.black, color: colors.gold }}>{Math.round(bestData.squad_score_percentile)}th</Text>
              </View>
            )}
          </View>
        )}

        {mode === 'freehit' && fhData && displayXi.length > 0 && (
          <View style={{ flexDirection: 'row', gap: spacing.xxl, marginHorizontal: spacing.lg, marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg }}>
            <View>
              <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 3 }}>PROJECTED PTS</Text>
              <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.black, color: colors.success }}>~{fhData.projected_gw_pts}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 3 }}>COST</Text>
              <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.black, color: colors.text }}>£{fhData.total_cost?.toFixed(1)}m</Text>
            </View>
            <View>
              <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 3 }}>IN BANK</Text>
              <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.black, color: colors.gold }}>£{((fhData.budget ?? 100) - (fhData.total_cost ?? 0)).toFixed(1)}m</Text>
            </View>
          </View>
        )}

        {/* Player list */}
        {displayXi.length > 0 && (
          <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.md, backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden' }}>
            {['GKP', 'DEF', 'MID', 'FWD'].map(pos => {
              const all = mode === 'wildcard' ? (bestData?.players ?? []) : (fhData?.players ?? []);
              const posPlayers = (all as any[]).filter(p => p.position === pos).sort((a, b) => (b.projected_pts ?? b.score ?? 0) - (a.projected_pts ?? a.score ?? 0));
              if (!posPlayers.length) return null;
              return (
                <View key={pos}>
                  <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs }}>
                    <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.7 }}>{pos}</Text>
                  </View>
                  {posPlayers.map((p: any, i: number) => (
                    <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.surfaceBorder }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text }}>{p.web_name}</Text>
                        <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 }}>
                          {p.team_short_name}{(p.next_fixture || p.fixture_label) ? ` · ${p.next_fixture ?? p.fixture_label}` : ''}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        {mode === 'freehit' && p.projected_pts != null && (
                          <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.black, color: colors.success }}>~{p.projected_pts?.toFixed(1)} pts</Text>
                        )}
                        <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>£{p.price?.toFixed(1)}m</Text>
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
