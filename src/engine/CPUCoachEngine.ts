import type { MatchState } from './GameState';
import type { TeamRT } from './Team';
import { applyTimeoutTactics, suggestDefense, suggestOffense } from './TacticalEngine';
import { hottestAttacker, weakestReceiver } from './AdaptationEngine';
import { reduceMomentumTimeout } from './MomentumEngine';
import { restPlayer } from './Player';
import { refreshCourtFlags } from './Team';
import { emit } from './CommentaryEngine';
import { applyLiberoRule, restoreLibero } from './RotationEngine';

export function makeGamePlan(t: TeamRT) {
  t.tactics.offense = suggestOffense(t);
  t.tactics.defense = suggestDefense(t);
  t.tactics.serveTarget = 'auto';
}

export function wantsTimeout(st: MatchState, t: TeamRT): boolean {
  if (t.timeouts <= 0 || !t.isCPU) return false;
  const opp = st.teams[1 - t.idx];
  // Opponent on a run
  if (st.consecutivePoints[opp.idx] >= 3 && t.score < setNeeded(st) - 1) return true;
  // Behind late
  if (t.score + 3 <= opp.score && Math.max(t.score, opp.score) >= setNeeded(st) - 8) return true;
  // Momentum crushed
  if (t.momentum <= -18) return true;
  return false;
}

function setNeeded(st: MatchState) {
  return st.setNumber >= 5 || (st.bestOf === 3 && st.setNumber >= 3) ? 15 : 25;
}

export function callTimeout(st: MatchState, t: TeamRT, reason = '') {
  if (t.timeouts <= 0) return;
  t.timeouts--;
  t.pendingTimeout = false;
  reduceMomentumTimeout(t);
  reduceMomentumTimeout(st.teams[1 - t.idx]);
  for (const id of t.rotation) restPlayer(t.players[id], 8);
  applyTimeoutTactics(st, t);
  // Adapt: extra block on hot ace, serve weak receiver
  const hot = hottestAttacker(st.teams[1 - t.idx]);
  if (hot) t.tactics.defense = 'Mark Ace';
  const weak = weakestReceiver(st.teams[1 - t.idx]);
  if (weak) t.tactics.serveTarget = 'weak';
  // Commit on dangerous middle
  const opp = st.teams[1 - t.idx];
  const dangMb = opp.rotation.map((id) => opp.players[id]).find((p) => p?.pos === 'MB' && p.hotCold >= 2);
  if (dangMb) t.tactics.defense = 'Commit Middle';
  emit(st, { type: 'timeout', team: t.idx, kind: reason });
}

export function coachAdjust(st: MatchState, t: TeamRT) {
  if (!t.isCPU) return;
  const hot = hottestAttacker(st.teams[1 - t.idx]);
  if (hot && (t.pstats[Object.keys(t.pstats)[0]]?.blocks ?? 0) >= 0) {
    // mid-match tweak
    if (st.rng.chance(0.3)) t.tactics.defense = 'Mark Ace';
  }
  if (st.teams[1 - t.idx].stats.blocks >= 4 && st.rng.chance(0.4)) {
    t.tactics.offense = 'Combination'; // more tips/tools/combos vs tall block
  }
}

export function autoSubs(st: MatchState, t: TeamRT) {
  if (!t.isCPU || !t.bench.length) return;
  // Sub tired MB/OH if bench better rested
  for (let i = 0; i < t.rotation.length; i++) {
    const id = t.rotation[i];
    const p = t.players[id];
    if (!p || p.isLibero || p.pos === 'S') continue;
    if (p.stamina > 35) continue;
    const cand = t.bench
      .map((bid) => t.players[bid])
      .filter((b) => b && b.pos === p.pos && b.stamina > p.stamina + 20);
    if (cand.length) {
      const inn = cand[0];
      restoreLibero(t);
      t.rotation[i] = inn.id;
      t.bench = t.bench.filter((x) => x !== inn.id).concat(id);
      refreshCourtFlags(t);
      applyLiberoRule(t);
      emit(st, { type: 'substitution', team: t.idx, player: id, player2: inn.id });
      return;
    }
  }
}
