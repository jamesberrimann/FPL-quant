import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { api } from '../lib/api';
import { colors, spacing, fontSize, fontWeight, radius } from '../lib/theme';
import { PitchView, BenchRow } from '../components/PitchView';

const BUDGETS = [95, 100, 105];

export default function BestSquadScreen() {
  const insets = useSafeAreaInsets();
  const [budget, setBudget] = useState(100);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['best-squad', budget],
    queryFn: () => api.bestSquad(budget),
  });

  const xi      = data?.starting_xi ?? [];
  const bench   = data?.bench ?? [];
  const capId   = data?.captain_id;
  const vcId    = data?.vice_captain_id;
  const cost    = data?.total_cost;
  const score   = data?.squad_score;
  const pctile  = data?.squad_score_percentile;

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
              Best Squad
            </Text>
          </View>
          {cost != null && (
            <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 3, paddingLeft: 12 }}>
              £{cost.toFixed(1)}m used · {pctile != null ? `${Math.round(pctile)}th percentile` : ''}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: spacing.sm }}>
          <Text style={{ fontSize: fontSize.md, color: colors.textMuted, fontWeight: fontWeight.semibold }}>Close</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); }} tintColor={colors.primary} />}
      >
        {/* Budget selector */}
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.7, marginBottom: spacing.sm }}>
            BUDGET
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {BUDGETS.map(b => (
              <TouchableOpacity
                key={b}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setBudget(b); }}
                style={{
                  flex: 1, paddingVertical: spacing.sm, borderRadius: radius.lg, alignItems: 'center',
                  backgroundColor: budget === b ? colors.primary : colors.surface,
                }}
              >
                <Text style={{
                  fontSize: fontSize.sm, fontWeight: fontWeight.bold,
                  color: budget === b ? colors.nav : colors.textMuted,
                }}>
                  £{b}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {isLoading && (
          <View style={{ alignItems: 'center', marginTop: 60, gap: spacing.lg }}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>Building optimal squad...</Text>
          </View>
        )}

        {isError && (
          <View style={{ margin: spacing.lg, padding: spacing.lg, backgroundColor: colors.errorMuted, borderRadius: radius.xl }}>
            <Text style={{ color: colors.error, fontWeight: fontWeight.bold }}>Could not build squad</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, marginTop: 4 }}>Pull to refresh.</Text>
          </View>
        )}

        {xi.length > 0 && (
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
            <PitchView players={xi} capId={capId} vcId={vcId} />
            <BenchRow players={bench} />
          </View>
        )}

        {score != null && xi.length > 0 && (
          <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden' }}>
            <View style={{ padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder }}>
              <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.7, marginBottom: spacing.sm }}>
                SQUAD BREAKDOWN
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.xxl }}>
                <View>
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 3 }}>COST</Text>
                  <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.black, color: colors.text }}>£{cost?.toFixed(1)}m</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 3 }}>BUDGET LEFT</Text>
                  <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.black, color: colors.success }}>£{(budget - (cost ?? 0)).toFixed(1)}m</Text>
                </View>
                {pctile != null && (
                  <View>
                    <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 3 }}>PERCENTILE</Text>
                    <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.black, color: colors.gold }}>{Math.round(pctile)}th</Text>
                  </View>
                )}
              </View>
            </View>

            {data?.players && (
              <View>
                {['GKP', 'DEF', 'MID', 'FWD'].map(pos => {
                  const posPlayers = (data.players as any[]).filter(p => p.position === pos).sort((a, b) => b.score - a.score);
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
                            <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 }}>{p.team_short_name} · {p.next_fixture}</Text>
                          </View>
                          <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.black, color: colors.text }}>£{p.price?.toFixed(1)}m</Text>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        <View style={{ height: spacing.xxxl + insets.bottom }} />
      </ScrollView>
    </View>
  );
}
