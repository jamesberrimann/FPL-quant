import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useEntryId } from '../../hooks/useEntryId';
import { api } from '../../lib/api';
import { colors, spacing, fontSize, fontWeight, radius } from '../../lib/theme';

function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: bg }}>
      <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color, letterSpacing: 0.3 }}>{label}</Text>
    </View>
  );
}

function TransferCard({ s, i }: { s: any; i: number }) {
  const isHit    = s.points_cost > 0;
  const priceDir = s.price_change > 0 ? `+£${s.price_change.toFixed(1)}m`
                 : s.price_change < 0 ? `-£${Math.abs(s.price_change).toFixed(1)}m`
                 : null;

  return (
    <View style={{
      backgroundColor: colors.surface, borderRadius: radius.xl, borderCurve: 'continuous',
      borderWidth: 1, borderColor: colors.surfaceBorder, marginBottom: spacing.md, overflow: 'hidden',
    } as any}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: 6 }}>
        <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.textSubtle }}>#{i + 1}</Text>
        {isHit
          ? <Pill label={`-${s.points_cost}pt hit`} color={colors.error} bg={colors.errorMuted} />
          : <Pill label="Free" color={colors.primary} bg={colors.primaryMuted} />}
        {s.is_differential && <Pill label="Differential" color={colors.gold} bg={colors.goldMuted} />}
        {s.in_price_rise_likely && <Pill label="Price rising" color={colors.success} bg={colors.successMuted} />}
        {s.is_marginal && <Pill label="Marginal" color={colors.warning} bg={colors.warningMuted} />}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.error, letterSpacing: 0.5, marginBottom: 3 }}>OUT</Text>
          <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text }}>{s.out_web_name}</Text>
          <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 }}>{s.position} · {s.out_team_short_name}</Text>
        </View>
        <View style={{ alignItems: 'center', gap: 3 }}>
          <Text style={{ fontSize: 20, color: colors.textSubtle }}>→</Text>
          {priceDir && (
            <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: s.price_change > 0 ? colors.error : colors.success }}>
              {priceDir}
            </Text>
          )}
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.success, letterSpacing: 0.5, marginBottom: 3 }}>IN</Text>
          <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text }}>{s.in_web_name}</Text>
          <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 }}>{s.position} · {s.in_team_short_name}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.surfaceBorder, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.xl }}>
        <View>
          <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: fontWeight.semibold, marginBottom: 2 }}>IMPROVEMENT</Text>
          <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.black, color: colors.primary }}>+{s.improvement.toFixed(1)} pts</Text>
        </View>
        {s.break_even_weeks != null && (
          <View>
            <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: fontWeight.semibold, marginBottom: 2 }}>BREAK EVEN</Text>
            <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.black, color: colors.text }}>
              {s.break_even_weeks} GW{s.break_even_weeks !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
        {!!s.in_net_transfers_this_gw && (
          <View>
            <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: fontWeight.semibold, marginBottom: 2 }}>TRANSFERS</Text>
            <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.black, color: s.in_net_transfers_this_gw > 0 ? colors.success : colors.error }}>
              {s.in_net_transfers_this_gw > 0 ? '+' : ''}{(s.in_net_transfers_this_gw / 1000).toFixed(0)}k
            </Text>
          </View>
        )}
      </View>

      {s.improvement_drivers?.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
          {s.improvement_drivers.map((d: string, j: number) => (
            <View key={j} style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: colors.surfaceRaised, borderRadius: 99, borderWidth: 1, borderColor: colors.surfaceBorder }}>
              <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: fontWeight.medium }}>{d}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function TransfersScreen() {
  const insets = useSafeAreaInsets();
  const { entryId } = useEntryId();
  const [freeTx, setFreeTx] = useState(1);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['transfers', entryId, freeTx],
    queryFn: () => api.transfers(entryId!, freeTx),
    enabled: !!entryId,
  });

  const suggestions = data?.suggestions ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder,
      }}>
        <Text style={{ fontSize: 28, fontWeight: fontWeight.black, color: colors.text, letterSpacing: -0.5 }}>
          Transfers
        </Text>

        <View style={{ marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.surfaceBorder }}>
            <TouchableOpacity
              onPress={() => { if (freeTx > 0) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFreeTx(f => f - 1); } }}
              style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', opacity: freeTx === 0 ? 0.3 : 1 }}
            >
              <Text style={{ fontSize: 20, color: colors.text, fontWeight: fontWeight.bold }}>−</Text>
            </TouchableOpacity>
            <View style={{ paddingHorizontal: spacing.md, alignItems: 'center', minWidth: 32 }}>
              <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.primary, fontVariant: ['tabular-nums'] }}>{freeTx}</Text>
            </View>
            <TouchableOpacity
              onPress={() => { if (freeTx < 5) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFreeTx(f => f + 1); } }}
              style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', opacity: freeTx === 5 ? 0.3 : 1 }}
            >
              <Text style={{ fontSize: 20, color: colors.text, fontWeight: fontWeight.bold }}>+</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.semibold }}>
              {freeTx === 0 ? 'No free transfers' : freeTx === 1 ? '1 free transfer' : `${freeTx} free transfers`}
            </Text>
            <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 }}>
              {freeTx === 0 ? 'Every transfer costs 4 points' : 'Extra transfers cost 4 points each'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl + insets.bottom }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); }} tintColor={colors.primary} />}
      >
        {isLoading && <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 48, fontSize: fontSize.sm }}>Finding best transfers...</Text>}

        {isError && (
          <View style={{ padding: spacing.lg, backgroundColor: colors.errorMuted, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.error }}>
            <Text style={{ color: colors.error, fontWeight: fontWeight.bold }}>Could not load transfers</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 4 }}>Pull to refresh.</Text>
          </View>
        )}

        {data?.roll_recommendation === true && data?.roll_reason && (
          <View style={{ padding: spacing.lg, backgroundColor: colors.primaryMuted, borderRadius: radius.xl, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.primary, marginBottom: spacing.lg } as any}>
            <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.primary, letterSpacing: 0.5, marginBottom: 6 }}>ROLL RECOMMENDED</Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 }}>{data.roll_reason}</Text>
          </View>
        )}

        {!isLoading && !isError && suggestions.length === 0 && (
          <View style={{ padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.xl, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.surfaceBorder, alignItems: 'center' } as any}>
            <Text style={{ fontSize: 32, marginBottom: spacing.md }}>✓</Text>
            <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.sm }}>Squad looks strong</Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
              No upgrade clears the improvement threshold right now.
            </Text>
          </View>
        )}

        {suggestions.map((s: any, i: number) => <TransferCard key={i} s={s} i={i} />)}
      </ScrollView>
    </View>
  );
}
