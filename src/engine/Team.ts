import type { TeamConfig, Tactics, PlayerMatchStats, TeamMatchStats } from './types';
import type { RuntimePlayer } from './Player';
import { makeRuntime } from './Player';
import { getPlayer } from './db';

export function emptyPlayerStats(id: string): PlayerMatchStats {
  return {
    id, pts: 0, kills: 0, attempts: 0, attackErrors: 0, aces: 0, serveErrors: 0, serveAttempts: 0,
    blocks: 0, blockTouches: 0, digs: 0, digAttempts: 0, receptions: 0, receptionErrors: 0,
    perfectReceptions: 0, assists: 0, setAttempts: 0, setErrors: 0, dumps: 0, dumpKills: 0,
    quickAttempts: 0, wingAttempts: 0, oppositeAttempts: 0, backAttempts: 0, perfectSets: 0,
  };
}

export function emptyTeamStats(): TeamMatchStats {
  return {
    points: 0, kills: 0, attempts: 0, attackErrors: 0, aces: 0, serveErrors: 0, blocks: 0,
    digs: 0, receptionErrors: 0, receptions: 0, perfectReceptions: 0, assists: 0, setErrors: 0,
    sideOuts: 0, sideOutChances: 0, breakPoints: 0, breakChances: 0,
  };
}

export interface TeamRT {
  idx: 0 | 1;
  cfg: TeamConfig;
  players: Record<string, RuntimePlayer>;
  /** Current rotation: index 0 = zone 1 (RB), 1 = zone 2 (RF), ... 5 = zone 6 (LB). Always 6 court players. */
  rotation: string[];
  liberoId: string | null;
  /** Player id replaced by libero (usually MB in back row), null if libero off */
  liberoTarget: string | null;
  bench: string[];
  tactics: Tactics;
  isCPU: boolean;
  score: number;
  setScores: number[];
  timeouts: number;
  pendingTimeout: boolean;
  pendingSubs: { out: string; inn: string }[];
  stats: TeamMatchStats;
  pstats: Record<string, PlayerMatchStats>;
  momentum: number; // -30..30
  /** Attack distribution tracking for adaptation: attackerId -> attackType -> count */
  attackDist: Record<string, Record<string, number>>;
  /** Setter distribution: set target zone/pos counts */
  setDist: Record<string, number>;
  serveTargets: Record<string, number>;
  chemistry: number; // 0-100 team chemistry
  /** Serve-rotation index 0-5 (advances on side-out rotate) */
  rotIndex: number;
}

export function buildTeam(cfg: TeamConfig, idx: 0 | 1): TeamRT {
  const players: Record<string, RuntimePlayer> = {};
  const allIds = [...cfg.rotation, ...(cfg.libero ? [cfg.libero] : []), ...cfg.bench];
  const seen = new Set<string>();
  for (const id of allIds) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const def = getPlayer(id);
    if (!def) throw new Error(`Unknown player ${id}`);
    players[id] = makeRuntime(def);
  }
  const pstats: Record<string, PlayerMatchStats> = {};
  for (const id of Object.keys(players)) pstats[id] = emptyPlayerStats(id);

  const t: TeamRT = {
    idx, cfg, players,
    rotation: cfg.rotation.slice(0, 6),
    liberoId: cfg.libero,
    liberoTarget: null,
    bench: cfg.bench.slice(),
    tactics: { ...cfg.tactics },
    isCPU: !!cfg.isCPU,
    score: 0, setScores: [],
    timeouts: 2, pendingTimeout: false, pendingSubs: [],
    stats: emptyTeamStats(), pstats,
    momentum: 0, attackDist: {}, setDist: {}, serveTargets: {},
    chemistry: 55,
    rotIndex: 0,
  };
  // Mark court players
  refreshCourtFlags(t);
  return t;
}

export function refreshCourtFlags(t: TeamRT) {
  for (const p of Object.values(t.players)) {
    p.onCourt = false; p.zone = 0; p.isFrontRow = false; p.isLibero = false;
  }
  t.rotation.forEach((id, i) => {
    const p = t.players[id];
    if (!p) return;
    p.onCourt = true;
    p.zone = i + 1; // 1-6
    p.isFrontRow = i === 1 || i === 2 || i === 3; // zones 2,3,4
    if (t.liberoId && id === t.liberoId) p.isLibero = true;
  });
}

export function courtPlayers(t: TeamRT): RuntimePlayer[] {
  return t.rotation.map((id) => t.players[id]).filter(Boolean);
}

export function frontRow(t: TeamRT): RuntimePlayer[] {
  return [t.rotation[1], t.rotation[2], t.rotation[3]].map((id) => t.players[id]).filter(Boolean);
}

export function backRow(t: TeamRT): RuntimePlayer[] {
  return [t.rotation[0], t.rotation[5], t.rotation[4]].map((id) => t.players[id]).filter(Boolean);
  // zones 1, 6, 5
}

export function findSetter(t: TeamRT): RuntimePlayer | null {
  for (const id of t.rotation) {
    const p = t.players[id];
    if (p && (p.pos === 'S' || p.def.pos2 === 'S')) return p;
  }
  // fallback: highest setAccuracy
  let best: RuntimePlayer | null = null;
  for (const id of t.rotation) {
    const p = t.players[id];
    if (!p) continue;
    if (!best || p.attrs.setAccuracy > best.attrs.setAccuracy) best = p;
  }
  return best;
}

export function findLibero(t: TeamRT): RuntimePlayer | null {
  return t.liberoId ? t.players[t.liberoId] ?? null : null;
}

export function server(t: TeamRT): RuntimePlayer {
  return t.players[t.rotation[0]]; // zone 1
}
