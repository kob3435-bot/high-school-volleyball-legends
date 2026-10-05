import type { MatchState } from './GameState';
import type { SetResult } from './SetEngine';
import type { BlockResult } from './BlockEngine';
import { effective, drainStamina } from './Player';
import { hasSig } from './signatures';
import { emit } from './CommentaryEngine';
import { momentumMod } from './MomentumEngine';
import { clutchFactor } from './GameState';
import { isBackRowAttacker } from './RotationEngine';
import { clamp } from './rng';

export interface AttackResult {
  attackerId: string;
  attackType: string;
  direction: 'cross' | 'line' | 'tip' | 'tool' | 'straight';
  power: number;
  accuracy: number;
  kill: boolean;
  error: boolean;
  inPlay: boolean;
  blocked: boolean;
}

export function executeAttack(st: MatchState, offIdx: 0 | 1, set: SetResult, block: BlockResult | null): AttackResult {
  const off = st.teams[offIdx];
  const attacker = off.players[set.targetId];
  const clutch = clutchFactor(st);
  const mom = momentumMod(off);

  // Dump already resolved
  if (set.dump) {
    return {
      attackerId: set.setterId, attackType: 'setterDump', direction: 'tip',
      power: 40, accuracy: 70, kill: set.dumpKill, error: false, inPlay: !set.dumpKill, blocked: false,
    };
  }

  let power = effective(attacker, 'spikePower', clutch) + mom;
  let accuracy = effective(attacker, 'spikeAccuracy', clutch) + mom;
  power += (set.qualityScore - 0.5) * 30;
  accuracy += (set.qualityScore - 0.5) * 35;

  // Signatures
  if (hasSig(attacker.signatures, 'ACE_CANNON') && (set.attackType === 'highBall' || set.attackType === 'open')) power += 12;
  if (hasSig(attacker.signatures, 'BOOM_JUMP')) power += 5;
  if (hasSig(attacker.signatures, 'SKY_ATTACK')) { power += 8; accuracy += 5; }
  if (hasSig(attacker.signatures, 'HEAVY_CANNON') && set.qualityScore < 0.6) { power += 15; accuracy += 10; }
  if (hasSig(attacker.signatures, 'SOUTHPAW_CANNON')) { power += 6; accuracy += 4; }
  if (hasSig(attacker.signatures, 'SUPER_INNER_CROSS')) accuracy += 6;
  if (hasSig(attacker.signatures, 'WRIST_SPIN')) accuracy += 8;
  if (hasSig(attacker.signatures, 'TORSO_ATTACK')) power += 5;
  if (hasSig(attacker.signatures, 'FREAK_QUICK') && set.attackType === 'quickA') { power += 10; accuracy += 12; }

  // Mood / ACE_MODE
  if (hasSig(attacker.signatures, 'ACE_MODE') || hasSig(attacker.signatures, 'MOOD_SWING')) {
    power += attacker.mood * 0.2;
    accuracy += attacker.mood * 0.15;
  }

  // Back-row check: back attacks must be from back
  if ((set.attackType === 'pipe' || set.attackType === 'backAttack') && !isBackRowAttacker(off, attacker.id)) {
    // illegal — treat as error (shouldn't happen if SetEngine is correct)
  }
  if (set.attackType === 'pipe' || set.attackType === 'backAttack') {
    power = power * 0.5 + effective(attacker, 'backAttack', clutch) * 0.5;
  }

  // Direction
  let direction: AttackResult['direction'] = 'straight';
  if (set.attackType === 'tip' || set.attackType === 'setterDump') direction = 'tip';
  else if (set.attackType === 'cross' || hasSig(attacker.signatures, 'SUPER_INNER_CROSS') && st.rng.chance(0.5)) direction = 'cross';
  else if (set.attackType === 'line') direction = 'line';
  else if (st.rng.chance(0.08 + effective(attacker, 'tip') * 0.0008)) direction = 'tip';
  else if (st.rng.chance(0.45)) direction = st.rng.chance(0.55) ? 'cross' : 'line';

  // vs tall block: more tips/tools
  if (block && block.blockers.length >= 2) {
    if (st.rng.chance(0.18)) direction = 'tip';
    else if (st.rng.chance(0.2) && effective(attacker, 'toolBlock') > 70) direction = 'tool';
  }
  if (hasSig(attacker.signatures, 'WRIST_SPIN') && block && block.blockers.length >= 1) {
    // late adjust
    direction = st.rng.pick(['cross', 'line', 'tool'] as const);
  }

  drainStamina(attacker, 2.5);
  off.pstats[attacker.id].attempts++;
  off.stats.attempts++;

  // Track distribution
  const ad = off.attackDist[attacker.id] ?? (off.attackDist[attacker.id] = {});
  ad[set.attackType] = (ad[set.attackType] ?? 0) + 1;
  const scout = st.scouting.attackByPlayer[attacker.id] ?? (st.scouting.attackByPlayer[attacker.id] = {});
  scout[set.attackType] = (scout[set.attackType] ?? 0) + 1;
  st.scouting.attackDirections[direction] = (st.scouting.attackDirections[direction] ?? 0) + 1;

  // Error
  let errP = 0.08 + (100 - accuracy) * 0.0018 + (1 - set.qualityScore) * 0.10;
  if (direction === 'tip') errP *= 0.6;
  if (hasSig(attacker.signatures, 'NO_MISTAKES')) errP *= 0.4;
  if (set.attackType === 'quickA') errP *= 0.85;
  errP = clamp(errP, 0.02, 0.22);

  if (st.rng.chance(errP)) {
    off.pstats[attacker.id].attackErrors++;
    off.stats.attackErrors++;
    attacker.hotCold = Math.max(-8, attacker.hotCold - 1);
    if (hasSig(attacker.signatures, 'MOOD_SWING')) attacker.mood = Math.max(-40, attacker.mood - 8);
    emit(st, { type: 'attack', team: offIdx, player: attacker.id, kind: set.attackType, success: false });
    emit(st, { type: 'attackError', team: offIdx, player: attacker.id, kind: set.attackType });
    return { attackerId: attacker.id, attackType: set.attackType, direction, power, accuracy, kill: false, error: true, inPlay: false, blocked: false };
  }

  // If block already stuffed — handled by caller
  if (block?.stuff) {
    emit(st, { type: 'attack', team: offIdx, player: attacker.id, kind: set.attackType, success: false });
    emit(st, { type: 'blocked', team: offIdx, player: attacker.id, player2: block.blockers[0] });
    attacker.hotCold = Math.max(-8, attacker.hotCold - 2);
    if (hasSig(attacker.signatures, 'MOOD_SWING') || hasSig(attacker.signatures, 'ACE_MODE')) attacker.mood = Math.max(-40, attacker.mood - 12);
    return { attackerId: attacker.id, attackType: set.attackType, direction, power, accuracy, kill: false, error: false, inPlay: false, blocked: true };
  }

  if (block?.out || block?.tool) {
    // tool kill
    off.pstats[attacker.id].kills++;
    off.pstats[attacker.id].pts++;
    off.stats.kills++;
    attacker.hotCold = Math.min(8, attacker.hotCold + 1);
    if (hasSig(attacker.signatures, 'ACE_MODE')) attacker.mood = Math.min(40, attacker.mood + 8);
    const setter = off.players[set.setterId];
    if (setter) { off.pstats[setter.id].assists++; off.stats.assists++; }
    emit(st, { type: 'attack', team: offIdx, player: attacker.id, kind: set.attackType, success: true, data: { tool: true } });
    emit(st, { type: 'kill', team: offIdx, player: attacker.id, kind: 'tool' });
    return { attackerId: attacker.id, attackType: set.attackType, direction: 'tool', power, accuracy, kill: true, error: false, inPlay: false, blocked: false };
  }

  // Kill chance vs block
  let killP = 0.098 + (power - 70) * 0.0020 + (accuracy - 70) * 0.0015 + set.qualityScore * 0.10;
  if (set.qualityScore >= 0.9) killP += 0.12;
  else if (set.qualityScore >= 0.75) killP += 0.06;
  else if (set.qualityScore < 0.45) killP -= 0.06;
  if (block) {
    killP -= block.blockers.length * (set.qualityScore >= 0.78 ? 0.05 : 0.09);
    killP -= block.strength * 0.0015;
    if (block.soft) killP *= 0.18;
  } else {
    killP += 0.15; // no block
  }
  if (direction === 'tip') killP = 0.35 + accuracy * 0.002;
  if (hasSig(attacker.signatures, 'ACE_CANNON') && (!block || block.blockers.length <= 1)) killP += 0.12;
  if (hasSig(attacker.signatures, 'SKY_ATTACK')) killP += 0.08;
  killP = clamp(killP, 0.05, 0.46);

  emit(st, { type: 'attack', team: offIdx, player: attacker.id, kind: set.attackType, success: true, data: { direction, power, accuracy } });

  if (!block?.soft && st.rng.chance(killP)) {
    off.pstats[attacker.id].kills++;
    off.pstats[attacker.id].pts++;
    off.stats.kills++;
    attacker.hotCold = Math.min(8, attacker.hotCold + 1);
    if (hasSig(attacker.signatures, 'ACE_MODE')) attacker.mood = Math.min(40, attacker.mood + 6);
    const setter = off.players[set.setterId];
    if (setter) { off.pstats[setter.id].assists++; off.stats.assists++; }
    emit(st, { type: 'kill', team: offIdx, player: attacker.id, kind: set.attackType });
    return { attackerId: attacker.id, attackType: set.attackType, direction, power, accuracy, kill: true, error: false, inPlay: false, blocked: false };
  }

  // Ball stays in play for dig
  return { attackerId: attacker.id, attackType: set.attackType, direction, power, accuracy, kill: false, error: false, inPlay: true, blocked: false };
}
