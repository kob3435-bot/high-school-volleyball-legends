import type { MatchState } from './GameState';
import { clamp } from './rng';
import type { TeamRT } from './Team';

export function addMomentum(st: MatchState, team: 0 | 1, amount: number) {
  const t = st.teams[team];
  const opp = st.teams[1 - team];
  t.momentum = clamp(t.momentum + amount, -30, 30);
  opp.momentum = clamp(opp.momentum - amount * 0.4, -30, 30);
  st.momentumSide = t.momentum > opp.momentum ? team : opp.momentum > t.momentum ? (1 - team) as 0 | 1 : null;
}

export function onPoint(st: MatchState, winner: 0 | 1, kind: string) {
  let amt = 2;
  if (kind === 'ace' || kind === 'blockPoint') amt = 4;
  if (kind === 'kill' && st.currentRallyLength >= 6) amt = 5;
  addMomentum(st, winner, amt);
  if (st.lastPointWinner === winner) {
    st.consecutivePoints[winner]++;
  } else {
    st.consecutivePoints[winner] = 1;
    st.consecutivePoints[1 - winner] = 0;
  }
  st.lastPointWinner = winner;
  // hot/cold on last attacker tracked externally
}

export function reduceMomentumTimeout(t: TeamRT) {
  t.momentum = clamp(t.momentum * 0.35, -10, 10);
}

export function momentumMod(t: TeamRT): number {
  return t.momentum * 0.15; // small effect on skill checks
}
