import { MatchSim } from './Match';
import { buildSchoolTeam, randomTeam } from './teamBuilder';
import { SCHOOLS } from '../data/schools';
import { RNG, hashString } from './rng';
import type { TeamConfig } from './types';
import type { MatchResult } from './StatisticsEngine';

export interface BracketSlot {
  team: TeamConfig | null;
  from?: [number, number]; // match indices
}

export interface BracketMatch {
  a: TeamConfig | null;
  b: TeamConfig | null;
  result: MatchResult | null;
  winner: TeamConfig | null;
  round: number; // 0=R32, 1=R16, 2=QF, 3=SF, 4=F
}

export interface TournamentState {
  id: string;
  seed: number;
  matches: BracketMatch[];
  userTeamId: string;
  currentMatch: number;
}

const ROUND_SIZE = [16, 8, 4, 2, 1]; // number of matches per round

export function createTournament(userTeam: TeamConfig, seed: number): TournamentState {
  const rng = new RNG(seed);
  const schoolIds = SCHOOLS.filter((s) => s.id !== 'legend').map((s) => s.id);
  rng.shuffle(schoolIds);
  const teams: TeamConfig[] = [userTeam];
  for (const sid of schoolIds) {
    if (teams.length >= 32) break;
    if (sid === userTeam.template) continue;
    const t = buildSchoolTeam(sid);
    t.isCPU = true;
    teams.push(t);
  }
  while (teams.length < 32) {
    const t = randomTeam(rng.int(0, 9999));
    t.id = `fill_${teams.length}`;
    teams.push(t);
  }
  rng.shuffle(teams);
  // Ensure user is in bracket
  const ui = teams.findIndex((t) => t.id === userTeam.id);
  if (ui < 0) teams[0] = userTeam;
  else teams[ui] = userTeam;

  const matches: BracketMatch[] = [];
  // R32
  for (let i = 0; i < 16; i++) {
    matches.push({ a: teams[i * 2], b: teams[i * 2 + 1], result: null, winner: null, round: 0 });
  }
  // placeholders for later rounds
  for (let r = 1; r <= 4; r++) {
    for (let i = 0; i < ROUND_SIZE[r]; i++) {
      matches.push({ a: null, b: null, result: null, winner: null, round: r });
    }
  }
  return { id: `t_${seed}`, seed, matches, userTeamId: userTeam.id, currentMatch: 0 };
}

export function simMatch(m: BracketMatch, seed: number): void {
  if (!m.a || !m.b) return;
  const sim = new MatchSim(m.a, m.b, seed, { bestOf: 5, keepEvents: false, userTeam: null });
  sim.simToEnd();
  m.result = sim.getResult();
  m.winner = m.result.winner === 0 ? m.a : m.b;
}

export function advanceRound(t: TournamentState): void {
  const byRound = (r: number) => t.matches.filter((m) => m.round === r);
  for (let r = 0; r < 4; r++) {
    const cur = byRound(r);
    const next = byRound(r + 1);
    for (let i = 0; i < next.length; i++) {
      const a = cur[i * 2]?.winner ?? null;
      const b = cur[i * 2 + 1]?.winner ?? null;
      if (!next[i].result) { next[i].a = a; next[i].b = b; }
    }
  }
}

export function simAllCPU(t: TournamentState, exceptUser = true): void {
  const rng = new RNG(t.seed + 7);
  for (const m of t.matches) {
    if (m.result) continue;
    if (!m.a || !m.b) { advanceRound(t); continue; }
    if (exceptUser && (m.a.id === t.userTeamId || m.b.id === t.userTeamId)) continue;
    simMatch(m, rng.int(1, 1e9));
  }
  advanceRound(t);
}
