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

        {/* Wildcard rating block */}
        {mode === 'wildcard' && bestData && displayXi.length > 0 && (() => {
          const score    = bestData.squad_score_percentile ?? null;
          const allP: any[] = bestData.players ?? [];
          const top3     = [...allP].sort((a, b) => (b.percentile ?? 0) - (a.percentile ?? 0)).slice(0, 3);
          const flagged  = allP.filter(p => p.flag);
          if (score == null) return null;
          const label = score >= 80 ? 'Excellent' : score >= 65 ? 'Strong' : score >= 50 ? 'Average' : 'Below average';
          const scoreColor = score >= 70 ? colors.success : score >= 50 ? colors.gold : colors.error;
          return (
            <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.md, backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder, gap: spacing.lg }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 40, fontWeight: fontWeight.black, color: scoreColor, lineHeight: 44, fontVariant: ['tabular-nums'] }}>{Math.round(score)}</Text>
                  <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: fontWeight.semibold }}>/ 100</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, marginBottom: 4 }}>{label}</Text>
                  <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 17 }}>Blends form, fixture difficulty, and underlying stats. Percentile vs all players at that position.</Text>
                </View>
              </View>
              {top3.length > 0 && (
                <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: flagged.length > 0 ? 1 : 0, borderBottomColor: colors.surfaceBorder }}>
                  <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.7, marginBottom: spacing.sm }}>STRONGEST PLAYERS</Text>
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
              )}
              {flagged.length > 0 && (
                <View style={{ padding: spacing.lg }}>
                  <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.warning, letterSpacing: 0.7, marginBottom: spacing.md }}>REGRESSION RISK</Text>
                  {flagged.map((p: any) => (
                    <View key={p.id} style={{ marginBottom: spacing.md }}>
                      <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text }}>{p.web_name}</Text>
                      <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 3, lineHeight: 17 }}>{p.flag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })()}

        {/* Free Hit top scorers block */}
        {mode === 'freehit' && fhData && displayXi.length > 0 && (() => {
          const allP: any[] = fhData.players ?? [];
          const top3 = [...allP].sort((a, b) => (b.projected_pts ?? 0) - (a.projected_pts ?? 0)).slice(0, 3);
          if (!top3.length) return null;
          return (
            <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.md, backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden' }}>
              <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
                <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.7, marginBottom: spacing.sm }}>TOP PROJECTED SCORERS</Text>
                {top3.map((p: any, i: number) => (
                  <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.surfaceBorder }}>
                    <View>
                      <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text }}>{p.web_name}</Text>
                      <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 }}>{p.position} · {p.team_short_name}{p.fixture_label ? ` · ${p.fixture_label}` : ''}</Text>
                    </View>
                    <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.black, color: colors.success }}>~{p.projected_pts?.toFixed(1)} pts</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

        {/* Insights */}
        {displayXi.length > 0 && (() => {
          const allP: any[] = mode === 'wildcard' ? (bestData?.players ?? []) : (fhData?.players ?? []);
          const starterIds = new Set([...displayXi, ...displayBench].map((p: any) => p.id));
          const starters = allP.filter(p => starterIds.has(p.id));

          if (mode === 'wildcard') {
            // Position strength: avg percentile per line
            const posRows = ['GKP', 'DEF', 'MID', 'FWD'].map(pos => {
              const pp = starters.filter(p => p.position === pos);
              const avg = pp.length ? pp.reduce((s, p) => s + (p.percentile ?? 0), 0) / pp.length : 0;
              return { pos, avg, count: pp.length };
            }).filter(r => r.count > 0);

            // Best value: score per £m (starters only, sort descending)
            const byValue = [...starters]
              .filter(p => p.price && p.score)
              .sort((a, b) => (b.score / b.price) - (a.score / a.price))
              .slice(0, 3);

            return (
              <View style={{ gap: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.md }}>
                {/* Position strength */}
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden' }}>
                  <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs }}>
                    <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.7 }}>LINE STRENGTH</Text>
                    <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4, lineHeight: 16 }}>How each line ranks vs all players at that position. Higher is better.</Text>
                  </View>
                  {posRows.map((r, i) => {
                    const pct = Math.round(r.avg);
                    const barColor = pct >= 70 ? colors.success : pct >= 50 ? colors.gold : colors.error;
                    return (
                      <View key={r.pos} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.surfaceBorder }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                          <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, width: 36 }}>{r.pos}</Text>
                          <View style={{ flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                            <View style={{ width: `${pct}%`, height: '100%', backgroundColor: barColor, borderRadius: 3 }} />
                          </View>
                          <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.black, color: barColor, width: 36, textAlign: 'right' }}>{pct}th</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Best value picks */}
                {byValue.length > 0 && (
                  <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden' }}>
                    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs }}>
                      <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.7 }}>BEST VALUE</Text>
                    </View>
                    {byValue.map((p: any, i: number) => (
                      <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.surfaceBorder }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text }}>{p.web_name}</Text>
                          <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 }}>{p.position} · {p.team_short_name} · £{p.price?.toFixed(1)}m</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.black, color: colors.gold }}>{(p.score / p.price).toFixed(1)}</Text>
                          <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 1 }}>score/£m</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          }

          // Free Hit: projected points breakdown by position
          const posBreakdown = ['GKP', 'DEF', 'MID', 'FWD'].map(pos => {
            const pp = displayXi.filter((p: any) => p.position === pos);
            const ppFull = pp.map((p: any) => allP.find((a: any) => a.id === p.id)).filter(Boolean);
            const total = ppFull.reduce((s: number, p: any) => s + (p?.projected_pts ?? 0), 0);
            return { pos, total, count: pp.length };
          }).filter(r => r.count > 0);

          const totalProjected = posBreakdown.reduce((s, r) => s + r.total, 0);
          const capPlayer = allP.find((p: any) => p.id === capId);

          return (
            <View style={{ gap: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.md }}>
              <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden' }}>
                <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs }}>
                  <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.7 }}>POINTS BREAKDOWN</Text>
                </View>
                {posBreakdown.map((r, i) => {
                  const share = totalProjected > 0 ? (r.total / totalProjected) * 100 : 0;
                  return (
                    <View key={r.pos} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.surfaceBorder }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, width: 36 }}>{r.pos}</Text>
                        <View style={{ flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                          <View style={{ width: `${share}%`, height: '100%', backgroundColor: colors.success, borderRadius: 3 }} />
                        </View>
                        <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.black, color: colors.success, width: 44, textAlign: 'right' }}>~{r.total.toFixed(1)}</Text>
                      </View>
                    </View>
                  );
                })}
                {capPlayer && (
                  <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.surfaceBorder, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 9, fontWeight: fontWeight.black, color: '#1a1a1a' }}>C</Text>
                      </View>
                      <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text }}>{capPlayer.web_name}</Text>
                    </View>
                    <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.black, color: colors.gold }}>~{((capPlayer.projected_pts ?? 0) * 2).toFixed(1)} pts</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })()}
      </ScrollView>
    </View>
  );
}
