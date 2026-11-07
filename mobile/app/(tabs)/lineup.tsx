import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useEntryId } from '../../hooks/useEntryId';
import { api } from '../../lib/api';
import { colors, spacing, fontSize, fontWeight, radius } from '../../lib/theme';
import { PitchView, BenchRow } from '../../components/PitchView';
import { Header } from '../../components/Header';

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

  const { data: gwPointsData } = useQuery({
    queryKey: ['squadGwPoints', entryId],
    queryFn: () => api.squadGwPoints(entryId!),
    enabled: !!entryId,
    refetchInterval: 2 * 60 * 1000,
  });

  const { data: leagueData, isLoading: leagueLoading, isError: leagueError } = useQuery({
    queryKey: ['miniLeague', entryId],
    queryFn: () => api.miniLeague(entryId!),
    enabled: !!entryId,
    refetchInterval: 2 * 60 * 1000,
  });

  const capId   = data?.captain?.id;
  const vcId    = data?.vice_captain?.id;
  const xi      = data?.starting_xi ?? [];
  const bench   = [data?.bench_gk, ...(data?.bench_outfield ?? [])].filter(Boolean);
  const score   = ratingData?.squad_score ?? null;
  const flagged = (ratingData?.players ?? []).filter((p: any) => p.flag);
  const top3    = [...(ratingData?.players ?? [])].sort((a, b) => b.score - a.score).slice(0, 3);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title="My Squad"
        subtitle={score != null ? `Squad rating  ${Math.round(score)}/100` : undefined}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); }} tintColor={colors.primary} />}
      >
        {isLoading && (
          <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 48, fontSize: fontSize.sm }}>
            Loading...
          </Text>
        )}

        {isError && (
          <View style={{ margin: spacing.lg, padding: spacing.lg, backgroundColor: colors.errorMuted, borderRadius: radius.xl }}>
            <Text style={{ color: colors.error, fontWeight: fontWeight.bold }}>Could not load squad</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, marginTop: 4 }}>Pull to refresh.</Text>
          </View>
        )}

        {xi.length > 0 && (
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
            <PitchView players={xi} capId={capId} vcId={vcId} />
            <BenchRow players={bench} />
          </View>
        )}

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
                    Blends form, fixture difficulty, and underlying stats. Percentile vs all players at that position.
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

            {flagged.length > 0 && (
              <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, marginTop: spacing.md, padding: spacing.lg }}>
                <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.warning, letterSpacing: 0.7, marginBottom: spacing.md }}>
                  REGRESSION RISK
                </Text>
                {flagged.map((p: any) => (
                  <View key={p.id} style={{ marginBottom: spacing.md }}>
                    <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text }}>{p.web_name}</Text>
                    <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 3, lineHeight: 17 }}>{p.flag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {gwPointsData && gwPointsData.players.length > 0 && (() => {
          const { gameweek, is_live_gw, players } = gwPointsData;
          const starters = players.filter((p: any) => p.position_in_squad <= 11);
          const benchPlayers = players.filter((p: any) => p.position_in_squad > 11);

          const renderPlayer = (p: any) => {
            const showYtp = is_live_gw && !p.has_played;
            const displayPts = p.is_captain ? p.points * 2 : p.points;
            return (
              <View
                key={p.player_id}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text }}>{p.web_name}</Text>
                  {p.is_captain && (
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 9, fontWeight: fontWeight.black, color: '#1a1a1a' }}>C</Text>
                    </View>
                  )}
                  {p.is_vice_captain && (
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.textMuted, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 9, fontWeight: fontWeight.black, color: '#fff' }}>V</Text>
                    </View>
                  )}
                </View>
                {showYtp ? (
                  <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted }}>Yet to play</Text>
                ) : (
                  <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.black, color: p.is_captain ? colors.gold : colors.text, fontVariant: ['tabular-nums'] }}>
                    {displayPts} pts
                  </Text>
                )}
              </View>
            );
          };

          return (
            <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
              <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden' }}>
                <View style={{ padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder }}>
                  <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.7 }}>
                    GW{gameweek} POINTS{is_live_gw ? '  ·  LIVE' : ''}
                  </Text>
                </View>
                <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm }}>
                  {starters.map(renderPlayer)}
                </View>
                {benchPlayers.length > 0 && (
                  <>
                    <View style={{ borderTopWidth: 1, borderTopColor: colors.surfaceBorder, marginHorizontal: spacing.lg }} />
                    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.sm }}>
                      <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.7, marginTop: spacing.sm, marginBottom: spacing.xs }}>
                        BENCH
                      </Text>
                      {benchPlayers.map(renderPlayer)}
                    </View>
                  </>
                )}
              </View>
            </View>
          );
        })()}

        {(leagueData?.leagues?.length ?? 0) > 0 && (
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
            {leagueData.leagues.map((league: any) => (
              <View key={league.league_id} style={{ backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden', marginBottom: spacing.md }}>
                {/* League header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder }}>
                  <View style={{ flex: 1, marginRight: spacing.md }}>
                    <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.black, color: colors.text }} numberOfLines={1}>{league.league_name}</Text>
                    <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 }}>
                      {league.gap_to_leader === 0 ? 'Leading the league' : `${league.gap_to_leader} pts off the lead`}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 28, fontWeight: fontWeight.black, color: league.entry_rank === 1 ? colors.gold : colors.text, lineHeight: 32, fontVariant: ['tabular-nums'] }}>
                      {league.entry_rank}
                    </Text>
                    <Text style={{ fontSize: 9, color: colors.textMuted, fontWeight: fontWeight.semibold }}>RANK</Text>
                  </View>
                </View>

                {/* Rivals */}
                {league.rivals?.length > 0 && (
                  <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm }}>
                    <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.7, marginBottom: spacing.sm }}>NEAREST RIVALS</Text>
                    {league.rivals.map((r: any, i: number) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.surfaceBorder }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                          <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, fontVariant: ['tabular-nums'], width: 24 }}>#{r.rank}</Text>
                          <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text }}>{r.manager}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                          <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.black, color: colors.text, fontVariant: ['tabular-nums'] }}>{r.pts}</Text>
                          {r.gap !== 0 && (
                            <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: r.gap > 0 ? colors.error : colors.success, fontVariant: ['tabular-nums'], minWidth: 36, textAlign: 'right' }}>
                              {r.gap > 0 ? `+${r.gap}` : `${r.gap}`}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </View>
  );
}
