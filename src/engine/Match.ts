/** Match orchestrator: sets, rallies, timeouts, substitutions. Headless or step-by-step. */
import type { BestOf, TeamConfig, SimEvent } from './types';
import { createMatch, isMatchOver, isSetOver, setTarget, type MatchState } from './GameState';
import { runRally } from './RallyEngine';
import { emit } from './CommentaryEngine';
import { callTimeout, wantsTimeout, makeGamePlan, coachAdjust, autoSubs } from './CPUCoachEngine';
import { computeTeamChemistry } from './ChemistryEngine';
import { buildResult, type MatchResult } from './StatisticsEngine';
import { restPlayer } from './Player';
import { applyLiberoRule } from './RotationEngine';
import { refreshCourtFlags } from './Team';

export interface MatchOptions {
  userTeam?: 0 | 1 | null;
  bestOf?: BestOf;
  keepEvents?: boolean;
  mode?: string;
}

export class MatchSim {
  st: MatchState;
  mode: string;
  userTeam: 0 | 1 | null;
  private resultCache: MatchResult | null = null;

  constructor(a: TeamConfig, b: TeamConfig, seed: number, opts: MatchOptions = {}) {
    this.userTeam = opts.userTeam ?? null;
    this.mode = opts.mode ?? 'Quick Match';
    const cpu: [boolean, boolean] = [this.userTeam !== 0, this.userTeam !== 1];
    this.st = createMatch(a, b, seed, {
      bestOf: opts.bestOf ?? 5,
      keepEvents: opts.keepEvents ?? true,
      userTeam: this.userTeam,
      cpu,
    });
    for (const t of this.st.teams) {
      if (t.isCPU) makeGamePlan(t);
      computeTeamChemistry(t);
    }
  }

  get finished() { return this.st.status === 'final'; }

  step(): SimEvent[] {
    const st = this.st;
    st.buffer = [];
    if (st.status === 'final') return [];
    if (st.status === 'pregame') { this.startMatch(); return st.buffer; }
    if (st.status === 'setBreak') { this.startSet(); return st.buffer; }
    if (st.status === 'timeout') { st.status = 'live'; return st.buffer; }

    for (const t of st.teams) {
      if (t.pendingTimeout && t.timeouts > 0) {
        callTimeout(st, t, 'coach');
        st.status = 'timeout';
        return st.buffer;
      }
      if (t.isCPU && wantsTimeout(st, t) && st.rng.chance(0.7)) {
        callTimeout(st, t, 'momentum');
        st.status = 'timeout';
        return st.buffer;
      }
    }

    runRally(st);
    for (const t of st.teams) {
      if (t.isCPU) { coachAdjust(st, t); if (st.rng.chance(0.08)) autoSubs(st, t); }
    }
    if (isSetOver(st)) this.endSet();
    return st.buffer;
  }

  simToEnd(maxSteps = 20000): void {
    let n = 0;
    while (!this.finished && n++ < maxSteps) this.step();
    if (!this.finished) throw new Error('Simulation did not finish');
  }

  skipSet(): void {
    let guard = 0;
    const setBefore = this.st.setNumber;
    while (!this.finished && this.st.setNumber === setBefore && guard++ < 5000) this.step();
  }

  skipRally(): void { if (!this.finished) this.step(); }

  requestTimeout(team: 0 | 1) {
    const t = this.st.teams[team];
    if (t.timeouts > 0) t.pendingTimeout = true;
  }

  substitute(team: 0 | 1, outId: string, inId: string) {
    const t = this.st.teams[team];
    const idx = t.rotation.indexOf(outId);
    if (idx < 0 || !t.bench.includes(inId)) return false;
    const inn = t.players[inId];
    const out = t.players[outId];
    if (!inn || !out || out.isLibero) return false;
    t.rotation[idx] = inId;
    t.bench = t.bench.filter((x) => x !== inId).concat(outId);
    refreshCourtFlags(t);
    applyLiberoRule(t);
    emit(this.st, { type: 'substitution', team, player: outId, player2: inId });
    return true;
  }

  getResult(): MatchResult {
    if (!this.resultCache) this.resultCache = buildResult(this.st, this.mode);
    return this.resultCache;
  }

  private startMatch() {
    emit(this.st, { type: 'matchStart', team: this.st.serving });
    this.startSet();
  }

  private startSet() {
    const st = this.st;
    st.teams[0].score = 0;
    st.teams[1].score = 0;
    st.pointInSet = 0;
    st.consecutivePoints = [0, 0];
    st.status = 'live';
    if (st.setNumber > 1) {
      st.serving = (1 - st.receivingToStart) as 0 | 1;
      st.receivingToStart = (1 - st.serving) as 0 | 1;
    }
    for (const t of st.teams) {
      for (const p of Object.values(t.players)) restPlayer(p, 15);
      t.timeouts = 2;
      applyLiberoRule(t);
    }
    emit(st, { type: 'setStart', set: st.setNumber, team: st.serving });
  }

  private endSet() {
    const st = this.st;
    const a = st.teams[0].score, b = st.teams[1].score;
    st.teams[0].setScores.push(a);
    st.teams[1].setScores.push(b);
    st.setScores[0].push(a);
    st.setScores[1].push(b);
    const winner: 0 | 1 = a > b ? 0 : 1;
    st.setsWon[winner]++;
    emit(st, { type: 'setEnd', team: winner, score: [a, b], set: st.setNumber });
    if (Math.abs(a - b) <= 2 && Math.max(a, b) >= setTarget(st)) {
      st.turningPoints.push({ set: st.setNumber, score: [a, b], text: `Deuce set ${st.setNumber} thriller` });
    }
    if (isMatchOver(st)) {
      st.status = 'final';
      emit(st, { type: 'matchEnd', team: st.setsWon[0] > st.setsWon[1] ? 0 : 1 });
      this.resultCache = buildResult(st, this.mode);
    } else {
      st.setNumber++;
      st.status = 'setBreak';
    }
  }
}
