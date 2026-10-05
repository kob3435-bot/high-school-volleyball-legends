import type { MatchState } from './GameState';
import type { TeamRT } from './Team';

/** Track and expose tendencies for block AI / coach. */
export function hottestAttacker(t: TeamRT): string | null {
  let best: string | null = null;
  let bestHot = 0;
  for (const id of t.rotation) {
    const p = t.players[id];
    if (!p) continue;
    const kills = t.pstats[id]?.kills ?? 0;
    const score = p.hotCold * 2 + kills;
    if (score > bestHot) { bestHot = score; best = id; }
  }
  return best;
}

export function weakestReceiver(t: TeamRT): string | null {
  let worst: string | null = null;
  let worstSkill = 99;
  for (const id of t.rotation) {
    const p = t.players[id];
    if (!p || p.isLibero) continue;
    const skill = p.attrs.serveReceive - (t.pstats[id]?.receptionErrors ?? 0) * 3;
    if (skill < worstSkill) { worstSkill = skill; worst = id; }
  }
  return worst;
}

export function preferredAttackType(st: MatchState, playerId: string): string | null {
  const hist = st.scouting.attackByPlayer[playerId];
  if (!hist) return null;
  let best = '', bestN = 0;
  for (const [k, v] of Object.entries(hist)) if (v > bestN) { best = k; bestN = v; }
  return best || null;
}

export function setterTendency(st: MatchState, topN = 3): string[] {
  const entries = Object.entries(st.scouting.setTargets).sort((a, b) => b[1] - a[1]);
  return entries.slice(0, topN).map(([id]) => id);
}
