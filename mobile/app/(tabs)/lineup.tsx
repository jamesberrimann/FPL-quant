import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEntryId } from '../../hooks/useEntryId';
import { api } from '../../lib/api';
import { colors, spacing, fontSize, fontWeight, radius } from '../../lib/theme';
import { PitchView, BenchRow } from '../../components/PitchView';

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
  const score  = ratingData?.squad_score ?? null;
  const flagged = (ratingData?.players ?? []).filter((p: any) => p.flag);
  const top3    = [...(ratingData?.players ?? [])].sort((a, b) => b.score - a.score).slice(0, 3);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{
        paddingTop: insets.top,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.text, letterSpacing: -0.3 }}>
          My Squad
        </Text>
        <TouchableOpacity onPress={() => router.push('/settings')} style={{ padding: spacing.sm }}>
          <Text style={{ fontSize: fontSize.md, color: colors.textMuted }}>Settings</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
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
          <View style={{ paddingHorizontal: spacing.lg }}>
            <PitchView players={xi} capId={capId} vcId={vcId} />
            <BenchRow players={bench} />
          </View>
        )}

        {score !== null && (
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
            <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg }}>
                <Text style={{ fontSize: fontSize.md, color: colors.textMuted, fontWeight: fontWeight.semibold }}>Squad Rating</Text>
                <Text style={{ fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: score >= 70 ? colors.primary : score >= 50 ? colors.gold : colors.error }}>
                  {Math.round(score)}<Text style={{ fontSize: fontSize.sm, color: colors.textMuted }}>/100</Text>
                </Text>
              </View>

              {top3.length > 0 && (
                <View style={{ borderTopWidth: 1, borderTopColor: colors.surfaceBorder }}>
                  {top3.map((p: any, i: number) => (
                    <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: colors.surfaceBorder }}>
                      <View>
                        <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text }}>{p.web_name}</Text>
                        <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 }}>{p.position} · {p.team_short_name}</Text>
                      </View>
                      <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.black, color: colors.primary }}>{Math.round(p.percentile)}th %ile</Text>
                    </View>
                  ))}
                </View>
              )}

              {flagged.length > 0 && (
                <View style={{ borderTopWidth: 1, borderTopColor: colors.surfaceBorder, padding: spacing.lg }}>
                  <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.warning, letterSpacing: 0.5, marginBottom: spacing.sm }}>
                    REGRESSION RISK
                  </Text>
                  {flagged.map((p: any) => (
                    <View key={p.id} style={{ marginBottom: spacing.sm }}>
                      <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text }}>{p.web_name}</Text>
                      <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2, lineHeight: 17 }}>{p.flag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        <View style={{ height: spacing.xxxl + insets.bottom }} />
      </ScrollView>
    </View>
  );
}
