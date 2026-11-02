import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEntryId } from '../../hooks/useEntryId';
import { api } from '../../lib/api';
import { colors, spacing, fontSize, fontWeight, radius } from '../../lib/theme';
import { PitchView, BenchRow } from '../../components/PitchView';

function ratingColor(score: number) {
  if (score >= 70) return colors.success;
  if (score >= 50) return colors.gold;
  return colors.error;
}

function ratingLabel(score: number) {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Strong';
  if (score >= 50) return 'Average';
  if (score >= 35) return 'Below average';
  return 'Weak';
}

export default function LineupScreen() {
  const insets = useSafeAreaInsets();
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

  const capId  = data?.captain?.id;
  const vcId   = data?.vice_captain?.id;
  const xi     = data?.starting_xi ?? [];
  const bench  = [data?.bench_gk, ...(data?.bench_outfield ?? [])].filter(Boolean);

  const squadScore: number | null = ratingData?.squad_score ?? null;
  const allPlayers: any[]  = ratingData?.players ?? [];
  const flagged  = allPlayers.filter((p: any) => p.flag);
  const sorted   = [...allPlayers].sort((a, b) => b.score - a.score);
  const top3     = sorted.slice(0, 3);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
        flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
        borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder,
      }}>
        <Text style={{ fontSize: 28, fontWeight: fontWeight.black, color: colors.text, letterSpacing: -0.5 }}>
          My Squad
        </Text>
        <TouchableOpacity onPress={() => router.push('/settings')} style={{ padding: spacing.sm }}>
          <Text style={{ fontSize: 22 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); }} tintColor={colors.primary} />
        }
      >
        {isLoading && (
          <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 48, fontSize: fontSize.sm }}>
            Loading squad...
          </Text>
        )}

        {isError && (
          <View style={{ margin: spacing.lg, padding: spacing.lg, backgroundColor: colors.errorMuted, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.error }}>
            <Text style={{ color: colors.error, fontWeight: fontWeight.bold }}>Could not load squad</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 4 }}>Pull to refresh.</Text>
          </View>
        )}

        {xi.length > 0 && (
          <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.lg }}>
            <PitchView players={xi} capId={capId} vcId={vcId} />
            <BenchRow players={bench} />
          </View>
        )}

        {squadScore !== null && (
          <View style={{
            marginHorizontal: spacing.lg, marginTop: spacing.lg,
            backgroundColor: colors.surface, borderRadius: radius.xl, borderCurve: 'continuous',
            borderWidth: 1, borderColor: colors.surfaceBorder, overflow: 'hidden',
          } as any}>
            <View style={{ padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder }}>
              <View style={{ alignItems: 'center', minWidth: 72 }}>
                <Text style={{ fontSize: 42, fontWeight: fontWeight.black, color: ratingColor(squadScore), lineHeight: 46, fontVariant: ['tabular-nums'] }}>
                  {Math.round(squadScore)}
                </Text>
                <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: fontWeight.semibold, letterSpacing: 0.5 }}>
                  OUT OF 100
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: 4 }}>
                  {ratingLabel(squadScore)}
                </Text>
                <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18 }}>
                  Your squad scores in the {Math.round(squadScore)}th percentile compared to all players at their position. Scores blend form, fixture difficulty, and underlying stats.
                </Text>
              </View>
            </View>

            {top3.length > 0 && (
              <View style={{ padding: spacing.lg, borderBottomWidth: flagged.length > 0 ? 1 : 0, borderBottomColor: colors.surfaceBorder }}>
                <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.md }}>
                  Strongest players
                </Text>
                {top3.map((p: any) => (
                  <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text }}>{p.web_name}</Text>
                      <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>{p.position} · {p.team_short_name}</Text>
                    </View>
                    <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.black, color: colors.success }}>
                      {Math.round(p.percentile)}th %ile
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {flagged.length > 0 && (
              <View style={{ padding: spacing.lg }}>
                <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.warning, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.md }}>
                  Regression risks
                </Text>
                {flagged.map((p: any) => (
                  <View key={p.id} style={{ marginBottom: spacing.md }}>
                    <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: 3 }}>
                      {p.web_name}
                      <Text style={{ fontWeight: '400', color: colors.textMuted }}> · {p.position}</Text>
                    </Text>
                    <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18 }}>{p.flag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {data?.differential_captain && (
          <View style={{
            marginHorizontal: spacing.lg, marginTop: spacing.md,
            padding: spacing.lg, backgroundColor: colors.goldMuted,
            borderRadius: radius.xl, borderCurve: 'continuous',
            borderWidth: 1, borderColor: colors.gold,
          } as any}>
            <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.gold, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>
              Differential captain option
            </Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.text, lineHeight: 20 }}>
              Consider {data.differential_captain[0]?.web_name} as a differential captain this week — similar ceiling but far lower ownership than the template pick.
            </Text>
          </View>
        )}

        <View style={{ height: spacing.xxxl + insets.bottom }} />
      </ScrollView>
    </View>
  );
}
