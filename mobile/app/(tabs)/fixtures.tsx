import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEntryId } from '../../hooks/useEntryId';
import { api } from '../../lib/api';
import { colors, spacing, fontSize, fontWeight, radius } from '../../lib/theme';

const PLAYER_COL = 88;
const GW_COL     = 54;

function fdrStyle(fdr: number) {
  if (fdr <= 2) return { bg: '#00cc57', text: '#003d1a' };
  if (fdr === 3) return { bg: '#e0e0e0', text: '#333333' };
  if (fdr === 4) return { bg: '#ff4d4d', text: '#ffffff' };
  return { bg: '#8b0000', text: '#ffffff' };
}

const POS_ORDER = ['GKP', 'DEF', 'MID', 'FWD'];

export default function FixturesScreen() {
  const insets = useSafeAreaInsets();
  const { entryId } = useEntryId();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['fixtures', entryId],
    queryFn: () => api.fixturePlan(entryId!),
    enabled: !!entryId,
  });

  const players = [...(data?.players ?? [])].sort(
    (a, b) => POS_ORDER.indexOf(a.position) - POS_ORDER.indexOf(b.position),
  );
  const numGws   = data?.num_gameweeks ?? 0;
  const fromGw   = data?.from_gameweek ?? 0;
  const gwLabels = Array.from({ length: numGws }, (_, i) => fromGw + i);
  const tableW   = PLAYER_COL + GW_COL * numGws;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.text, letterSpacing: -0.3 }}>Fixtures</Text>
        {numGws > 0 && <Text style={{ fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 }}>GW{fromGw} — GW{fromGw + numGws - 1}</Text>}
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); }} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: spacing.xxxl + insets.bottom }}
      >
        {isLoading && <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 48, fontSize: fontSize.sm }}>Loading...</Text>}

        {players.length > 0 && (
          <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden' }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ width: tableW }}>
                <View style={{ flexDirection: 'row', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder }}>
                  <View style={{ width: PLAYER_COL }} />
                  {gwLabels.map(gw => (
                    <View key={gw} style={{ width: GW_COL, alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.textMuted }}>GW{gw}</Text>
                    </View>
                  ))}
                </View>

                {players.map((player, idx) => (
                  <View
                    key={player.player_id}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: spacing.md, borderBottomWidth: idx < players.length - 1 ? 1 : 0, borderBottomColor: colors.surfaceBorder }}
                  >
                    <View style={{ width: PLAYER_COL }}>
                      <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text }} numberOfLines={1}>{player.web_name}</Text>
                      <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 1 }}>{player.position}</Text>
                    </View>

                    {(player.gameweek_slots ?? []).map((slot: any, si: number) => {
                      if (slot.is_blank) return (
                        <View key={si} style={{ width: GW_COL, alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, color: colors.textSubtle }}>—</Text>
                        </View>
                      );
                      const opp = slot.opponents?.[0];
                      if (!opp) return <View key={si} style={{ width: GW_COL }} />;
                      const { bg, text } = fdrStyle(opp.fdr ?? slot.avg_fdr ?? 3);
                      return (
                        <View key={si} style={{ width: GW_COL, alignItems: 'center', gap: 2 }}>
                          <View style={{ paddingHorizontal: 5, paddingVertical: 3, backgroundColor: bg, borderRadius: 4, minWidth: 42, alignItems: 'center' }}>
                            <Text style={{ fontSize: 10, fontWeight: fontWeight.bold, color: text }}>
                              {opp.short_name}({opp.is_home ? 'H' : 'A'})
                            </Text>
                          </View>
                          {slot.is_double && <Text style={{ fontSize: 8, fontWeight: fontWeight.black, color: colors.gold }}>DGW</Text>}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: spacing.lg, paddingHorizontal: spacing.lg, marginTop: spacing.lg, flexWrap: 'wrap' }}>
          {[{ label: 'Easy', fdr: 1 }, { label: 'Medium', fdr: 3 }, { label: 'Hard', fdr: 4 }, { label: 'Very hard', fdr: 5 }].map(item => {
            const { bg, text } = fdrStyle(item.fdr);
            return (
              <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 28, height: 18, backgroundColor: bg, borderRadius: 3, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 8, fontWeight: fontWeight.bold, color: text }}>eg</Text>
                </View>
                <Text style={{ fontSize: fontSize.xs, color: colors.textMuted }}>{item.label}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
