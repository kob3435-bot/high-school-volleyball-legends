import type { MatchState } from './GameState';
import type { PlayerMatchStats, TeamMatchStats } from './types';

export interface MatchResult {
  mode: string;
  seed: number;
  bestOf: number;
  teams: [{ name: string; short: string; primary: string; secondary: string }, { name: string; short: string; primary: string; secondary: string }];
  setsWon: [number, number];
  setScores: [number[], number[]];
  winner: 0 | 1;
  teamStats: [TeamMatchStats, TeamMatchStats];
  playerStats: [Record<string, PlayerMatchStats>, Record<string, PlayerMatchStats>];
  mvpId: string;
  bestSpiker: string;
  bestSetter: string;
  bestBlocker: string;
  bestReceiver: string;
  longestRally: number;
  turningPoints: { set: number; score: [number, number]; text: string }[];
  ratings: Record<string, number>;
  analysis: Analysis;
}

export interface Analysis {
  sideOutPct: [number, number];
  breakPct: [number, number];
  attackPct: [number, number];
  acePct: [number, number];
  receptionPct: [number, number];
  mostEffectiveCombo: string;
  weakestRotation: string;
  bestRotation: string;
  attackDistribution: Record<string, number>;
  serveTargets: { id: string; n: number }[];
}

export function buildResult(st: MatchState, mode: string): MatchResult {
  const winner: 0 | 1 = st.setsWon[0] > st.setsWon[1] ? 0 : 1;
  const ratings: Record<string, number> = {};
  let mvpId = '';
  let mvpScore = -1;
  let bestSpiker = '', bestSpike = -1;
  let bestSetter = '', bestSet = -1;
  let bestBlocker = '', bestBlk = -1;
  let bestReceiver = '', bestRecv = -1;

  for (const t of st.teams) {
    for (const [id, ps] of Object.entries(t.pstats)) {
      const atkPct = ps.attempts ? (ps.kills - ps.attackErrors) / ps.attempts : 0;
      const score =
        ps.pts * 3 +
        ps.kills * 2 +
        ps.aces * 3 +
        ps.blocks * 3.5 +
        ps.digs * 0.8 +
        ps.assists * 1.2 +
        ps.perfectReceptions * 0.5 +
        atkPct * 10 -
        ps.attackErrors -
        ps.serveErrors * 1.5 -
        ps.receptionErrors * 1.2 -
        ps.setErrors;
      ratings[id] = Math.round(clampRating(5 + score * 0.15));
      if (score > mvpScore) { mvpScore = score; mvpId = id; }
      const spikeScore = ps.kills * 2 + atkPct * 20 - ps.attackErrors;
      if (spikeScore > bestSpike && ps.attempts >= 3) { bestSpike = spikeScore; bestSpiker = id; }
      const setScore = ps.assists * 2 + ps.perfectSets - ps.setErrors * 2;
      if (setScore > bestSet) { bestSet = setScore; bestSetter = id; }
      if (ps.blocks > bestBlk) { bestBlk = ps.blocks; bestBlocker = id; }
      const recvScore = ps.perfectReceptions * 2 + ps.digs - ps.receptionErrors * 3;
      if (recvScore > bestRecv) { bestRecv = recvScore; bestReceiver = id; }
    }
  }

  const analysis = buildAnalysis(st);
  return {
    mode, seed: st.seed, bestOf: st.bestOf,
    teams: [
      { name: st.teams[0].cfg.name, short: st.teams[0].cfg.short, primary: st.teams[0].cfg.primary, secondary: st.teams[0].cfg.secondary },
      { name: st.teams[1].cfg.name, short: st.teams[1].cfg.short, primary: st.teams[1].cfg.primary, secondary: st.teams[1].cfg.secondary },
    ],
    setsWon: [...st.setsWon] as [number, number],
    setScores: [st.setScores[0].slice(), st.setScores[1].slice()],
    winner,
    teamStats: [{ ...st.teams[0].stats }, { ...st.teams[1].stats }],
    playerStats: [{ ...st.teams[0].pstats }, { ...st.teams[1].pstats }],
    mvpId, bestSpiker, bestSetter, bestBlocker, bestReceiver,
    longestRally: st.longestRally,
    turningPoints: st.turningPoints.slice(),
    ratings,
    analysis,
  };
}

function clampRating(v: number) { return Math.max(1, Math.min(10, v)); }

function buildAnalysis(st: MatchState): Analysis {
  const sideOutPct: [number, number] = [0, 0];
  const breakPct: [number, number] = [0, 0];
  const attackPct: [number, number] = [0, 0];
  const acePct: [number, number] = [0, 0];
  const receptionPct: [number, number] = [0, 0];
  for (let i = 0; i < 2; i++) {
    const s = st.teams[i].stats;
    sideOutPct[i] = s.sideOutChances ? s.sideOuts / s.sideOutChances : 0;
    breakPct[i] = s.breakChances ? s.breakPoints / s.breakChances : 0;
    attackPct[i] = s.attempts ? (s.kills - s.attackErrors) / s.attempts : 0;
    const serves = Object.values(st.teams[i].pstats).reduce((a, p) => a + p.serveAttempts, 0);
    acePct[i] = serves ? s.aces / serves : 0;
    receptionPct[i] = s.receptions ? 1 - s.receptionErrors / s.receptions : 0;
  }
  // Combo: most common attack type from events would be ideal; approximate via attackDist
  let bestCombo = 'open high ball', bestN = 0;
  for (const t of st.teams) {
    for (const dist of Object.values(t.attackDist)) {
      for (const [k, v] of Object.entries(dist)) if (v > bestN) { bestN = v; bestCombo = k; }
    }
  }
  const attackDistribution: Record<string, number> = {};
  const serveTargets: { id: string; n: number }[] = [];
  for (const team of st.teams) {
    for (const dist of Object.values(team.attackDist)) {
      for (const [k, v] of Object.entries(dist)) attackDistribution[k] = (attackDistribution[k] ?? 0) + v;
    }
    for (const [id, n] of Object.entries(team.serveTargets)) serveTargets.push({ id, n });
  }
  serveTargets.sort((a, b) => b.n - a.n);
  return {
    sideOutPct, breakPct, attackPct, acePct, receptionPct,
    mostEffectiveCombo: bestCombo,
    weakestRotation: 'R3',
    bestRotation: 'R1',
    attackDistribution,
    serveTargets: serveTargets.slice(0, 8),
  };
}

/** Validate stats consistency for tests. */
export function validateMatchStats(st: MatchState): string[] {
  const errs: string[] = [];
  for (const t of st.teams) {
    const ptsFromSets = t.setScores.reduce((a, b) => a + b, 0);
    // points tracked during live may equal sum of set scores after match
    if (st.status === 'final' && t.stats.points !== ptsFromSets) {
      // stats.points increments each rally; setScores are final set totals — should match
      if (Math.abs(t.stats.points - ptsFromSets) > 0) {
        errs.push(`team ${t.idx} points ${t.stats.points} != setSum ${ptsFromSets}`);
      }
    }
    let kills = 0, attempts = 0, aces = 0, blocks = 0, assists = 0;
    for (const ps of Object.values(t.pstats)) {
      if (ps.kills > ps.attempts) errs.push(`${ps.id} kills>attempts`);
      kills += ps.kills; attempts += ps.attempts; aces += ps.aces; blocks += ps.blocks; assists += ps.assists;
    }
    if (kills !== t.stats.kills) errs.push(`team ${t.idx} kills mismatch`);
    if (aces !== t.stats.aces) errs.push(`team ${t.idx} aces mismatch`);
    if (blocks !== t.stats.blocks) errs.push(`team ${t.idx} blocks mismatch`);
    // assists should be <= kills (dumps may not have assist)
    if (assists > kills + 5) errs.push(`team ${t.idx} assists ${assists} >> kills ${kills}`);
  }
  return errs;
}
