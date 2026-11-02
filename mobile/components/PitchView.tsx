import { View, Text, useWindowDimensions } from 'react-native';
import Svg, { Path, Line, Circle, Rect } from 'react-native-svg';
import { fontWeight } from '../lib/theme';

// All GKPs wear black regardless of club
const GKP_FILL    = '#1a1a1a';
const GKP_STROKE  = '#000000';

const TEAM_COLOURS: Record<string, [string, string]> = {
  ARS: ['#EF0107', '#9E000A'], AVL: ['#670E36', '#3D081E'],
  BOU: ['#DA291C', '#891100'], BRE: ['#E30613', '#8B0000'],
  BHA: ['#0057B8', '#003D82'], CHE: ['#034694', '#012240'],
  COV: ['#59CBE8', '#005B80'], CRY: ['#C4122E', '#8A0D1F'],
  EVE: ['#003399', '#002266'], FUL: ['#E0E0E0', '#1A1A1A'],
  HUL: ['#F5A623', '#A35500'], IPS: ['#0044A9', '#002D72'],
  LEI: ['#003090', '#FDBE11'], LIV: ['#C8102E', '#8B0A1E'],
  MCI: ['#6CABDD', '#1C2C5B'], MUN: ['#DA291C', '#8B0000'],
  NEW: ['#1C1C1C', '#000000'], NFO: ['#DD0000', '#8B0000'],
  TOT: ['#EEEEEE', '#132257'], WHU: ['#7A263A', '#1BB1E7'],
  WOL: ['#FDB913', '#231F20'],
};

const POS_FALLBACK: Record<string, [string, string]> = {
  DEF: ['#3b82f6', '#1e40af'],
  MID: ['#22c55e', '#15803d'],
  FWD: ['#ef4444', '#b91c1c'],
};

function isLight(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 155;
}

function teamColours(player: any): [string, string] {
  if (player.position === 'GKP') return [GKP_FILL, GKP_STROKE];
  return TEAM_COLOURS[player.team_short_name] ?? POS_FALLBACK[player.position] ?? ['#64748b', '#334155'];
}

function abbr(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[parts.length - 1] || parts[0]).substring(0, 4).toUpperCase();
}

// Mirrors kits.js spreadX
const MARGINS: Record<number, number> = { 1: 50, 2: 28, 3: 22, 4: 15, 5: 10 };
function spreadX(count: number, i: number): number {
  if (count === 1) return 50;
  const m = MARGINS[count] ?? 10;
  return m + (i / (count - 1)) * (100 - 2 * m);
}

// Row Y positions — GKP at top, FWD at bottom (same as HTML)
const ROW_Y: Record<string, number> = { GKP: 12, DEF: 33, MID: 56, FWD: 81 };

const SHIRT_W = 36;
const SHIRT_H = 40;
const NODE_W  = 60;
const NODE_H  = 68; // shirt + name + pts

function Shirt({ fill, stroke, label }: { fill: string; stroke: string; label: string }) {
  const textFill    = isLight(fill) ? '#1a1a1a' : '#ffffff';
  const collarFill  = isLight(fill) ? stroke : 'white';
  return (
    <Svg width={SHIRT_W} height={SHIRT_H} viewBox="0 0 40 44">
      <Path
        d="M13,3 C16,9 24,9 27,3 L35,7 L40,17 L34,21 L34,44 L6,44 L6,21 L0,17 L5,7 Z"
        fill={fill}
      />
      <Path
        d="M13,3 C16,9 24,9 27,3 L35,7 L40,17 L34,21 L34,44 L6,44 L6,21 L0,17 L5,7 Z"
        fill="none"
        stroke={stroke}
        strokeWidth={1.25}
        opacity={0.55}
      />
      <Path
        d="M14,4 C17,9 23,9 26,4"
        fill="none"
        stroke={collarFill}
        strokeWidth={1.25}
        opacity={0.5}
      />
      <Line x1={6} y1={29} x2={34} y2={29} stroke={stroke} strokeWidth={0.75} opacity={0.2} />
    </Svg>
  );
}

const LINE = 'rgba(255,255,255,0.28)';

function PitchLines({ w, h }: { w: number; h: number }) {
  const a = (x: number) => (x / 200) * w;
  const b = (y: number) => (y / 300) * h;
  // Arc radius scales with pitch width
  const arcR = (20 / 200) * w;
  return (
    <Svg width={w} height={h} style={{ position: 'absolute', top: 0, left: 0 }}>
      {/* Halfway line */}
      <Line x1={0} y1={b(150)} x2={w} y2={b(150)} stroke={LINE} strokeWidth={1.5} />
      {/* Centre circle */}
      <Circle cx={a(100)} cy={b(150)} r={(28 / 300) * h} stroke={LINE} strokeWidth={1.5} fill="none" />
      <Circle cx={a(100)} cy={b(150)} r={2} fill="rgba(255,255,255,0.5)" />
      {/* Top penalty box + six-yard box */}
      <Rect x={a(41)} y={b(0)} width={a(118)} height={b(47)} stroke={LINE} strokeWidth={1.5} fill="none" />
      <Rect x={a(72)} y={b(0)} width={a(56)} height={b(18)} stroke={LINE} strokeWidth={1.5} fill="none" />
      <Circle cx={a(100)} cy={b(32)} r={2} fill="rgba(255,255,255,0.5)" />
      {/* Top penalty arc (D) */}
      <Path d={`M${a(80)},${b(47)} A${arcR},${arcR} 0 0,0 ${a(120)},${b(47)}`} stroke={LINE} strokeWidth={1.5} fill="none" />
      {/* Bottom penalty box + six-yard box */}
      <Rect x={a(41)} y={b(253)} width={a(118)} height={b(47)} stroke={LINE} strokeWidth={1.5} fill="none" />
      <Rect x={a(72)} y={b(282)} width={a(56)} height={b(18)} stroke={LINE} strokeWidth={1.5} fill="none" />
      <Circle cx={a(100)} cy={b(268)} r={2} fill="rgba(255,255,255,0.5)" />
      {/* Bottom penalty arc (D) */}
      <Path d={`M${a(80)},${b(253)} A${arcR},${arcR} 0 0,1 ${a(120)},${b(253)}`} stroke={LINE} strokeWidth={1.5} fill="none" />
    </Svg>
  );
}

function PlayerNode({ player, x, y, isCap, isVC }: {
  player: any; x: number; y: number; isCap?: boolean; isVC?: boolean;
}) {
  const [fill, stroke] = teamColours(player);
  const label   = abbr(player.web_name);
  const fixture = player.next_fixture ?? null;

  return (
    <View style={{
      position: 'absolute',
      left: x - NODE_W / 2,
      top: y - NODE_H / 2,
      width: NODE_W,
      alignItems: 'center',
      gap: 2,
    }}>
      <View style={{ position: 'relative' }}>
        <Shirt fill={fill} stroke={stroke} label={label} />
        {isCap && (
          <View style={{
            position: 'absolute', top: -5, right: -4,
            width: 16, height: 16, borderRadius: 8,
            backgroundColor: '#f59e0b', borderWidth: 2, borderColor: '#fff',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 7, fontWeight: fontWeight.black, color: '#fff' }}>C</Text>
          </View>
        )}
        {isVC && (
          <View style={{
            position: 'absolute', top: -5, right: -4,
            width: 16, height: 16, borderRadius: 8,
            backgroundColor: '#94a3b8', borderWidth: 2, borderColor: '#fff',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 7, fontWeight: fontWeight.black, color: '#fff' }}>V</Text>
          </View>
        )}
      </View>
      <Text style={{
        fontSize: 8, fontWeight: fontWeight.bold, color: '#fff',
        textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
        textAlign: 'center',
      }} numberOfLines={1}>
        {player.web_name}
      </Text>
      {fixture && (
        <View style={{ backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 }}>
          <Text style={{ fontSize: 7, fontWeight: fontWeight.bold, color: 'rgba(255,255,255,0.85)' }}>
            {fixture}
          </Text>
        </View>
      )}
    </View>
  );
}

export function PitchView({ players, capId, vcId }: { players: any[]; capId?: number; vcId?: number }) {
  const { width: screenW } = useWindowDimensions();
  const pitchW = screenW - 32; // margin 16 each side
  const pitchH = pitchW * 1.5; // 2:3 aspect ratio

  const byPos: Record<string, any[]> = { GKP: [], DEF: [], MID: [], FWD: [] };
  players.forEach(p => { (byPos[p.position] ?? (byPos[p.position] = [])).push(p); });

  const nodes: React.ReactNode[] = [];
  for (const pos of ['GKP', 'DEF', 'MID', 'FWD']) {
    const row = byPos[pos] ?? [];
    const yPct = ROW_Y[pos] ?? 50;
    row.forEach((p, i) => {
      const xPct = spreadX(row.length, i);
      nodes.push(
        <PlayerNode
          key={p.id}
          player={p}
          x={(xPct / 100) * pitchW}
          y={(yPct / 100) * pitchH}
          isCap={p.id === capId}
          isVC={p.id === vcId}
        />
      );
    });
  }

  const STRIPE_H = 48;
  const stripeCount = Math.ceil(pitchH / STRIPE_H);
  const stripes = Array.from({ length: stripeCount }, (_, i) => i);

  return (
    <View style={{
      width: pitchW,
      height: pitchH,
      borderRadius: 10,
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Alternating mow-stripe pattern */}
      {stripes.map(i => (
        <View key={i} style={{
          position: 'absolute',
          left: 0, right: 0,
          top: i * STRIPE_H,
          height: STRIPE_H,
          backgroundColor: i % 2 === 0 ? '#2e7d46' : '#2b7642',
        }} />
      ))}
      <PitchLines w={pitchW} h={pitchH} />
      {nodes}
    </View>
  );
}

export function BenchRow({ players }: { players: any[] }) {
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center',
      backgroundColor: '#250029', paddingVertical: 14,
      borderTopWidth: 2, borderTopColor: 'rgba(255,255,255,0.1)',
    }}>
      {players.map(p => {
        const [fill, stroke] = teamColours(p);
        const fixture = p.next_fixture ?? null;
        return (
          <View key={p.id} style={{ alignItems: 'center', gap: 3, opacity: 0.75 }}>
            <Shirt fill={fill} stroke={stroke} label={abbr(p.web_name)} />
            <Text style={{ fontSize: 8, fontWeight: fontWeight.bold, color: '#fff', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
              {p.web_name}
            </Text>
            {fixture && (
              <View style={{ backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 }}>
                <Text style={{ fontSize: 7, fontWeight: fontWeight.bold, color: 'rgba(255,255,255,0.85)' }}>
                  {fixture}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
