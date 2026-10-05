import type { Tactics, OffTactic, DefTactic } from './types';
import type { TeamRT } from './Team';
import type { MatchState } from './GameState';

export const DEFAULT_TACTICS: Tactics = {
  offense: 'Balanced',
  defense: 'Read Blocking',
  serveTarget: 'auto',
};

export function setTactics(t: TeamRT, tactics: Partial<Tactics>) {
  t.tactics = { ...t.tactics, ...tactics };
}

/** Suggest offense based on roster. */
export function suggestOffense(t: TeamRT): OffTactic {
  const mbs = t.rotation.map((id) => t.players[id]).filter((p) => p?.pos === 'MB');
  const avgMbSpeed = mbs.reduce((s, p) => s + (p?.attrs.approachSpeed ?? 0), 0) / Math.max(1, mbs.length);
  const ace = t.rotation.map((id) => t.players[id]).filter((p) => p && (p.pos === 'OH' || p.pos === 'OP'))
    .sort((a, b) => b!.attrs.spikePower - a!.attrs.spikePower)[0];
  if (avgMbSpeed >= 88) return 'Fast Tempo';
  if (ace && ace.attrs.spikePower >= 94) return 'Ace Focus';
  if (mbs.some((p) => p!.signatures.includes('FREAK_QUICK'))) return 'Middle Focus';
  return 'Balanced';
}

export function suggestDefense(t: TeamRT): DefTactic {
  const blockers = t.rotation.map((id) => t.players[id]).filter((p) => p?.pos === 'MB');
  const avgRead = blockers.reduce((s, p) => s + (p?.attrs.blockRead ?? 0), 0) / Math.max(1, blockers.length);
  const avgReach = blockers.reduce((s, p) => s + (p?.attrs.blockReach ?? 0), 0) / Math.max(1, blockers.length);
  if (avgReach >= 92) return 'Triple Block Ace';
  if (avgRead >= 90) return 'Read Blocking';
  if (blockers.some((p) => p!.signatures.includes('GUESS_MONSTER'))) return 'Commit Middle';
  return 'Read Blocking';
}

export function applyTimeoutTactics(st: MatchState, t: TeamRT) {
  // Slight adaptation on timeout
  const opp = st.teams[1 - t.idx];
  const hotAce = Object.values(opp.players).find((p) => p.hotCold >= 3 && (p.pos === 'OH' || p.pos === 'OP'));
  if (hotAce) t.tactics.defense = 'Mark Ace';
  const weakRecv = t.rotation.map((id) => opp.players[id]).filter(Boolean)
    .sort((a, b) => a.attrs.serveReceive - b.attrs.serveReceive)[0];
  if (weakRecv && weakRecv.attrs.serveReceive < 72) t.tactics.serveTarget = 'weak';
}
