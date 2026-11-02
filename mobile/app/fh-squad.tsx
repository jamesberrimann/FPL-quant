import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { useEntryId } from '../hooks/useEntryId';
import { colors, spacing, fontSize, fontWeight, radius } from '../lib/theme';
import { PitchView, BenchRow } from '../components/PitchView';

export default function FHSquadScreen() {
  const insets = useSafeAreaInsets();
  const { entryId } = useEntryId();
  const { gameweek } = useLocalSearchParams<{ gameweek: string }>();
  const gw = parseInt(gameweek ?? '0', 10);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['fh-squad', entryId, gw],
    queryFn: () => api.fhSquad(entryId!, gw),
    enabled: !!entryId && gw > 0,
  });

  const xi    = data?.starting_xi ?? [];
  const bench = data?.bench ?? [];
  const capId = data?.captain_id;
  const vcId  = data?.vice_captain_id;

  // fh-squad uses fixture_label, not next_fixture — remap so PitchView works
  const remap = (players: any[]) => players.map(p => ({ ...p, next_fixture: p.fixture_label ?? p.next_fixture }));

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
              Free Hit
            </Text>
          </View>
          <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 3, paddingLeft: 12 }}>
            Optimal squad for GW{gw}
            {data?.budget != null ? ` · £${data.budget.toFixed(1)}m budget` : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: spacing.sm }}>
          <Text style={{ fontSize: fontSize.md, color: colors.textMuted, fontWeight: fontWeight.semibold }}>Close</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); }} tintColor={colors.primary} />}
      >
        {isLoading && (
          <View style={{ alignItems: 'center', marginTop: 60, gap: spacing.lg }}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>Building Free Hit squad...</Text>
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
            <PitchView players={remap(xi)} capId={capId} vcId={vcId} />
            <BenchRow players={remap(bench)} />
          </View>
        )}

        {data && xi.length > 0 && (
          <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', gap: spacing.xxl, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder }}>
              <View>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 3 }}>PROJECTED PTS</Text>
                <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.success }}>~{data.projected_gw_pts}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 3 }}>SQUAD COST</Text>
                <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.text }}>£{data.total_cost?.toFixed(1)}m</Text>
              </View>
              <View>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 3 }}>IN BANK</Text>
                <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.gold }}>
                  £{((data.budget ?? 100) - (data.total_cost ?? 0)).toFixed(1)}m
                </Text>
              </View>
            </View>

            {/* Player list by position */}
            {['GKP', 'DEF', 'MID', 'FWD'].map(pos => {
              const posPlayers = (data.players as any[] ?? []).filter(p => p.position === pos).sort((a, b) => (b.projected_pts ?? 0) - (a.projected_pts ?? 0));
              if (!posPlayers.length) return null;
              return (
                <View key={pos}>
                  <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs }}>
                    <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.7 }}>{pos}</Text>
                  </View>
                  {posPlayers.map((p: any) => (
                    <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.surfaceBorder }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text }}>{p.web_name}</Text>
                        <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 }}>
                          {p.team_short_name}
                          {p.fixture_label ? ` · ${p.fixture_label}` : ''}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.black, color: colors.success }}>
                          ~{p.projected_pts?.toFixed(1)} pts
                        </Text>
                        <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>£{p.price?.toFixed(1)}m</Text>
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: spacing.xxxl + insets.bottom }} />
      </ScrollView>
    </View>
  );
}
