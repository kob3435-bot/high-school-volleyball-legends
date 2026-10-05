/** Real rotations 1-6, front/back row, libero replace middle in back, rotate on side-out. */
import type { TeamRT } from './Team';
import { refreshCourtFlags } from './Team';
import type { MatchState } from './GameState';
import { emit } from './CommentaryEngine';

/** Rotate clockwise: zone1→zone6→zone5→zone4→zone3→zone2→zone1.
 * Array index 0=z1,1=z2,2=z3,3=z4,4=z5,5=z6.
 * After rotate: new[0]=old[5] (z6→z1), new[1]=old[0], ... */
export function rotate(t: TeamRT) {
  // First restore libero if on court so the "real" rotation advances
  restoreLibero(t);
  const r = t.rotation;
  t.rotation = [r[5], r[0], r[1], r[2], r[3], r[4]];
  refreshCourtFlags(t);
  applyLiberoRule(t);
}

/** Libero replaces a back-row MB (or designated). Cannot serve unless replacing the server in some rules —
 * FIVB: libero can serve in one rotation. We allow libero in back row only; if they would be in front, swap out. */
export function applyLiberoRule(t: TeamRT) {
  if (!t.liberoId || !t.players[t.liberoId]) return;
  // If libero currently on court in front row, swap back
  const libIdx = t.rotation.indexOf(t.liberoId);
  if (libIdx >= 0) {
    const front = libIdx === 1 || libIdx === 2 || libIdx === 3;
    if (front && t.liberoTarget) {
      t.rotation[libIdx] = t.liberoTarget;
      t.liberoTarget = null;
      refreshCourtFlags(t);
    }
    return;
  }
  // Libero not on court — find a back-row MB to replace
  const backIdx = [0, 4, 5]; // zones 1,5,6
  for (const i of backIdx) {
    const p = t.players[t.rotation[i]];
    if (p && p.pos === 'MB') {
      t.liberoTarget = t.rotation[i];
      t.rotation[i] = t.liberoId;
      refreshCourtFlags(t);
      return;
    }
  }
}

export function restoreLibero(t: TeamRT) {
  if (!t.liberoId || !t.liberoTarget) return;
  const i = t.rotation.indexOf(t.liberoId);
  if (i >= 0) {
    t.rotation[i] = t.liberoTarget;
    t.liberoTarget = null;
    refreshCourtFlags(t);
  }
}

/** Side-out: receiving team wins the rally → they rotate and serve. */
export function sideOut(st: MatchState, winner: 0 | 1) {
  const t = st.teams[winner];
  rotate(t);
  st.serving = winner;
  emit(st, { type: 'sideOut', team: winner });
  emit(st, { type: 'liberoSwap', team: winner, player: t.liberoId ?? undefined });
}

/** Validate: no duplicate players, libero not front, exactly 6 on court. */
export function validateRotation(t: TeamRT): string[] {
  const errs: string[] = [];
  if (t.rotation.length !== 6) errs.push('rotation must have 6');
  const set = new Set(t.rotation);
  if (set.size !== 6) errs.push('duplicate players on court');
  if (t.liberoId) {
    const i = t.rotation.indexOf(t.liberoId);
    if (i === 1 || i === 2 || i === 3) errs.push('libero in front row');
  }
  return errs;
}

export function isBackRowAttacker(t: TeamRT, playerId: string): boolean {
  const i = t.rotation.indexOf(playerId);
  return i === 0 || i === 4 || i === 5;
}

export function canBlock(t: TeamRT, playerId: string): boolean {
  const p = t.players[playerId];
  if (!p || p.isLibero) return false;
  const i = t.rotation.indexOf(playerId);
  return i === 1 || i === 2 || i === 3; // front row only
}
