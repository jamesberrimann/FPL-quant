import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useEntryId } from '../../hooks/useEntryId';
import { api } from '../../lib/api';
import { colors, spacing, fontSize, fontWeight, radius } from '../../lib/theme';

function TransferCard({ s, i }: { s: any; i: number }) {
  const isHit = s.points_cost > 0;
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, marginBottom: spacing.md, overflow: 'hidden' }}>
      <View style={{ height: 3, backgroundColor: isHit ? colors.error : colors.primary }} />
      <View style={{ padding: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
          <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted }}>TRANSFER {i + 1}</Text>
          {isHit && (
            <View style={{ marginLeft: spacing.sm, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: colors.errorMuted, borderRadius: radius.full }}>
              <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.error }}>-{s.points_cost}pt hit</Text>
            </View>
          )}
          {s.is_marginal && (
            <View style={{ marginLeft: spacing.sm, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: colors.warningMuted, borderRadius: radius.full }}>
              <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.warning }}>Marginal</Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.error, letterSpacing: 0.8, marginBottom: 4 }}>OUT</Text>
            <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.black, color: colors.text }}>{s.out_web_name}</Text>
            <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 }}>{s.out_team_short_name} · {s.position}</Text>
          </View>
          <Text style={{ fontSize: 22, color: colors.primary, fontWeight: fontWeight.black }}>→</Text>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.primary, letterSpacing: 0.8, marginBottom: 4 }}>IN</Text>
            <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.black, color: colors.text }}>{s.in_web_name}</Text>
            <Text style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 }}>{s.in_team_short_name} · {s.position}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.xl, marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.surfaceBorder }}>
          <View>
            <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 3 }}>IMPROVEMENT</Text>
            <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.black, color: colors.primary }}>+{s.improvement.toFixed(1)}</Text>
          </View>
          {s.break_even_weeks != null && (
            <View>
              <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 3 }}>BREAK EVEN</Text>
              <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.black, color: colors.text }}>{s.break_even_weeks}GW</Text>
            </View>
          )}
          {!!s.in_net_transfers_this_gw && (
            <View>
              <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 3 }}>NET TRANSFERS</Text>
              <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.black, color: s.in_net_transfers_this_gw > 0 ? colors.primary : colors.error }}>
                {s.in_net_transfers_this_gw > 0 ? '+' : ''}{(s.in_net_transfers_this_gw / 1000).toFixed(0)}k
              </Text>
            </View>
          )}
        </View>

        {s.improvement_drivers?.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md }}>
            {s.improvement_drivers.map((d: string, j: number) => (
              <View key={j} style={{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: colors.surfaceRaised, borderRadius: radius.full }}>
                <Text style={{ fontSize: 10, color: colors.textMuted }}>{d}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
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
      <View style={{ paddingTop: insets.top, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.text, letterSpacing: -0.3 }}>
          Transfers
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg }}>
            <TouchableOpacity
              onPress={() => { if (freeTx > 0) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFreeTx(f => f - 1); } }}
              style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', opacity: freeTx === 0 ? 0.3 : 1 }}
            >
              <Text style={{ fontSize: 20, color: colors.text, fontWeight: fontWeight.bold }}>−</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.primary, minWidth: 24, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
              {freeTx}
            </Text>
            <TouchableOpacity
              onPress={() => { if (freeTx < 5) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFreeTx(f => f + 1); } }}
              style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', opacity: freeTx === 5 ? 0.3 : 1 }}
            >
              <Text style={{ fontSize: 20, color: colors.text, fontWeight: fontWeight.bold }}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: fontSize.sm, color: colors.textMuted }}>
            {freeTx === 0 ? 'All transfers cost 4pts' : freeTx === 1 ? '1 free transfer' : `${freeTx} free transfers`}
          </Text>
        </View>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl + insets.bottom }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); }} tintColor={colors.primary} />}
      >
        {isLoading && <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 48, fontSize: fontSize.sm }}>Finding transfers...</Text>}

        {isError && (
          <View style={{ padding: spacing.lg, backgroundColor: colors.errorMuted, borderRadius: radius.xl }}>
            <Text style={{ color: colors.error, fontWeight: fontWeight.bold }}>Could not load transfers</Text>
          </View>
        )}

        {!isLoading && !isError && suggestions.length === 0 && (
          <View style={{ padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.xl, alignItems: 'center' }}>
            <Text style={{ fontSize: 28, marginBottom: spacing.md }}>✓</Text>
            <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text }}>Squad looks strong</Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, marginTop: 6, textAlign: 'center' }}>No upgrade clears the threshold right now.</Text>
          </View>
        )}

        {data?.roll_recommendation === true && data?.roll_reason && (
          <View style={{ padding: spacing.lg, backgroundColor: colors.primaryMuted, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.primary, marginBottom: spacing.lg }}>
            <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.primary, letterSpacing: 0.5, marginBottom: 6 }}>ROLL YOUR TRANSFER</Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 }}>{data.roll_reason}</Text>
          </View>
        )}

        {suggestions.map((s: any, i: number) => <TransferCard key={i} s={s} i={i} />)}
      </ScrollView>
    </View>
  );
}
