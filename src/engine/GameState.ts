import type { BestOf, SimEvent, TeamConfig } from './types';
import { RNG } from './rng';
import { buildTeam, type TeamRT } from './Team';
import { applyLiberoRule } from './RotationEngine';

export type MatchStatus = 'pregame' | 'live' | 'timeout' | 'setBreak' | 'final';

export interface MatchState {
  teams: [TeamRT, TeamRT];
  rng: RNG;
  seed: number;
  status: MatchStatus;
  bestOf: BestOf;
  setNumber: number; // 1-based
  setScores: [number[], number[]]; // per team list of set points won
  setsWon: [number, number];
  serving: 0 | 1;
  /** Who received first in current set (for side-out tracking) */
  receivingToStart: 0 | 1;
  rallyCount: number;
  pointInSet: number;
  buffer: SimEvent[];
  events: SimEvent[];
  keepEvents: boolean;
  simTime: number;
  momentumSide: 0 | 1 | null;
  longestRally: number;
  currentRallyLength: number;
  lastPointWinner: 0 | 1 | null;
  consecutivePoints: [number, number];
  userTeam: 0 | 1 | null;
  paused: boolean;
  /** Adaptation: remembered attack tendencies across match */
  scouting: {
    attackByPlayer: Record<string, Record<string, number>>;
    setTargets: Record<string, number>;
    attackDirections: Record<string, number>;
  };
  turningPoints: { set: number; score: [number, number]; text: string }[];
}

export interface CreateOpts {
  bestOf?: BestOf;
  keepEvents?: boolean;
  userTeam?: 0 | 1 | null;
  cpu?: [boolean, boolean];
}

export function createMatch(a: TeamConfig, b: TeamConfig, seed: number, opts: CreateOpts = {}): MatchState {
  const cfgA = { ...a, isCPU: opts.cpu ? opts.cpu[0] : a.isCPU };
  const cfgB = { ...b, isCPU: opts.cpu ? opts.cpu[1] : b.isCPU };
  const t0 = buildTeam(cfgA, 0);
  const t1 = buildTeam(cfgB, 1);
  applyLiberoRule(t0);
  applyLiberoRule(t1);
  const rng = new RNG(seed);
  const serving = rng.chance(0.5) ? 0 : 1;
  return {
    teams: [t0, t1],
    rng, seed,
    status: 'pregame',
    bestOf: opts.bestOf ?? 5,
    setNumber: 1,
    setScores: [[], []],
    setsWon: [0, 0],
    serving: serving as 0 | 1,
    receivingToStart: (1 - serving) as 0 | 1,
    rallyCount: 0,
    pointInSet: 0,
    buffer: [],
    events: [],
    keepEvents: opts.keepEvents ?? true,
    simTime: 0,
    momentumSide: null,
    longestRally: 0,
    currentRallyLength: 0,
    lastPointWinner: null,
    consecutivePoints: [0, 0],
    userTeam: opts.userTeam ?? null,
    paused: false,
    scouting: { attackByPlayer: {}, setTargets: {}, attackDirections: {} },
    turningPoints: [],
  };
}

export function setTarget(st: MatchState): number {
  return st.setNumber >= 5 || (st.bestOf === 3 && st.setNumber >= 3) ? 15 : 25;
}

export function isSetOver(st: MatchState): boolean {
  const a = st.teams[0].score, b = st.teams[1].score;
  const target = setTarget(st);
  return (a >= target || b >= target) && Math.abs(a - b) >= 2;
}

export function isMatchOver(st: MatchState): boolean {
  const need = Math.ceil(st.bestOf / 2);
  return st.setsWon[0] >= need || st.setsWon[1] >= need;
}

export function clutchFactor(st: MatchState): number {
  const a = st.teams[0].score, b = st.teams[1].score;
  const target = setTarget(st);
  let f = 0;
  if (a >= target - 5 || b >= target - 5) f += 0.5;
  if (a >= 20 || b >= 20) f += 0.4;
  if (Math.abs(a - b) <= 2 && Math.max(a, b) >= target - 2) f += 0.6;
  if (st.setNumber >= (st.bestOf === 5 ? 5 : 3)) f += 0.5;
  const need = Math.ceil(st.bestOf / 2);
  if (st.setsWon[0] === need - 1 && st.setsWon[1] === need - 1) f += 0.4;
  return Math.min(f, 2.5);
}
