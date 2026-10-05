import type { MatchState } from './GameState';
import type { SetResult } from './SetEngine';
import type { BlockStyle, AttackType } from './types';
import { frontRow, type TeamRT } from './Team';
import { effective, drainStamina, type RuntimePlayer } from './Player';
import { hasSig } from './signatures';
import { canBlock } from './RotationEngine';
import { emit } from './CommentaryEngine';
import { momentumMod } from './MomentumEngine';
import { clutchFactor } from './GameState';
import { clamp } from './rng';

export interface BlockResult {
  style: BlockStyle;
  blockers: string[];
  touch: boolean;
  stuff: boolean; // block point
  tool: boolean; // attacker tools the block
  soft: boolean; // slows ball for dig
  out: boolean; // block out
  funnel: boolean;
  strength: number;
}

function pickStyle(st: MatchState, def: TeamRT, set: SetResult): BlockStyle {
  const tactic = def.tactics.defense;
  const guesser = frontRow(def).find((p) => hasSig(p.signatures, 'GUESS_MONSTER'));
  if (guesser && st.rng.chance(0.35)) return 'guess';
  if (tactic === 'Commit Middle' && (set.attackType.startsWith('quick') || set.attackType === 'slide')) return 'commit';
  if (tactic === 'Triple Block Ace' && def.players[set.targetId]?.pos === 'OH') return 'triple';
  if (tactic === 'Mark Ace') return 'read';
  if (tactic === 'Read Blocking') return 'read';
  // Adaptation: if attacker has been hitting same type, commit more
  const hist = st.scouting.attackByPlayer[set.targetId];
  if (hist) {
    const total = Object.values(hist).reduce((a, b) => a + b, 0);
    const thisType = hist[set.attackType] ?? 0;
    if (total >= 4 && thisType / total > 0.5) return st.rng.chance(0.5) ? 'commit' : 'read';
  }
  return st.rng.chance(0.7) ? 'read' : 'spread';
}

function selectBlockers(st: MatchState, def: TeamRT, set: SetResult, style: BlockStyle): RuntimePlayer[] {
  const front = frontRow(def).filter((p) => canBlock(def, p.id));
  if (!front.length) return [];
  const attacker = st.teams[1 - def.idx].players[set.targetId];
  const decoyPull = !!(attacker && false); // decoy is on offense

  // Check offensive decoy on attacking team
  const off = st.teams[1 - def.idx];
  const decoy = off.rotation.map((id) => off.players[id]).find((p) => p && hasSig(p.signatures, 'ULTIMATE_DECOY') && p.id !== set.targetId);

  let blockers: RuntimePlayer[] = [];
  if (style === 'triple') {
    blockers = front.slice(0, 3);
  } else if (style === 'commit') {
    // Commit middle on quick
    const mb = front.find((p) => p.pos === 'MB') ?? front[1];
    blockers = [mb];
    if (set.attackType === 'open' || set.attackType === 'highBall' || set.attackType === 'cross') {
      // wrong commit — maybe only 1 or none on actual
      if (st.rng.chance(0.4)) blockers = front.filter((p) => p.pos !== 'MB').slice(0, 1);
    }
  } else if (style === 'guess') {
    blockers = [st.rng.pick(front)];
  } else {
    // read / spread: try to get 2 on wings, 1-2 on quicks
    if (set.attackType.startsWith('quick') || set.attackType === 'slide') {
      const mb = front.find((p) => p.pos === 'MB') ?? front[0];
      blockers = [mb];
      if (st.rng.chance(0.35)) {
        const help = front.find((p) => p.id !== mb.id);
        if (help) blockers.push(help);
      }
    } else {
      // wing attack — double block
      const sorted = [...front].sort((a, b) => {
        // closer to attacker side — approximate by zone
        return Math.abs(a.zone - (attacker?.zone ?? 4)) - Math.abs(b.zone - (attacker?.zone ?? 4));
      });
      blockers = sorted.slice(0, 2);
      if (style === 'spread') blockers = sorted.slice(0, 1);
    }
  }

  // ULTIMATE_DECOY pulls middle
  if (decoy && !hasSig(blockers[0]?.signatures ?? [], 'IMMOVABLE_BLOCK')) {
    const mb = front.find((p) => p.pos === 'MB');
    if (mb && set.attackType !== 'quickA' && set.attackType !== 'quickB') {
      // middle pulled away from wing attack
      blockers = blockers.filter((b) => b.id !== mb.id);
      if (!blockers.length) blockers = front.filter((p) => p.id !== mb.id).slice(0, 1);
      emit(st, { type: 'signature', team: off.idx, player: decoy.id, kind: 'ULTIMATE_DECOY', text: 'Ultimate Decoy pulls the middle!' });
    }
  }

  // IMMOVABLE_BLOCK never bitten
  return blockers.filter((b) => canBlock(def, b.id));
}

export function executeBlock(st: MatchState, defIdx: 0 | 1, set: SetResult, attackPower: number, attackAcc: number, direction: string): BlockResult {
  const def = st.teams[defIdx];
  const style = pickStyle(st, def, set);
  const blockers = selectBlockers(st, def, set, style);
  const clutch = clutchFactor(st);
  const mom = momentumMod(def);

  if (!blockers.length) {
    return { style, blockers: [], touch: false, stuff: false, tool: false, soft: false, out: false, funnel: false, strength: 0 };
  }

  let strength = 0;
  for (const b of blockers) {
    let s = effective(b, 'blockReach', clutch) * 0.35
      + effective(b, 'blockTiming', clutch) * 0.3
      + (style === 'read' ? effective(b, 'blockRead', clutch) : effective(b, 'blockCommit', clutch)) * 0.25
      + effective(b, 'closingSpeed') * 0.1
      + mom;
    if (hasSig(b.signatures, 'IRON_WALL')) s += 10;
    if (hasSig(b.signatures, 'IMMOVABLE_BLOCK')) s += 8;
    if (hasSig(b.signatures, 'READ_BLOCK')) {
      // improves over sets
      const setsPlayed = st.setNumber;
      s += 2 + setsPlayed * 2.5;
      const hist = st.scouting.setTargets;
      // if knows this target well
      const total = Object.values(hist).reduce((a, c) => a + c, 0);
      if (total > 5 && (hist[set.targetId] ?? 0) / total > 0.3) s += 6;
    }
    if (hasSig(b.signatures, 'GUESS_MONSTER') && style === 'guess') {
      if (st.rng.chance(0.45)) s += 25; else s -= 20;
    }
    strength += s;
    drainStamina(b, 1.8);
    def.pstats[b.id].blockTouches++;
  }
  strength /= blockers.length;
  // more blockers help
  strength += (blockers.length - 1) * 6;

  // Tempo: quicks are harder to block well
  if (set.attackType === 'quickA') strength -= 18;
  else if (set.attackType === 'quickB' || set.attackType === 'slide') strength -= 10;
  if (set.attackType === 'pipe' || set.attackType === 'backAttack') strength -= 5;

  const attackVs = attackPower * 0.5 + attackAcc * 0.3 + st.rng.gauss(0, 8);
  const diff = strength - attackVs;

  let result: BlockResult = {
    style, blockers: blockers.map((b) => b.id),
    touch: false, stuff: false, tool: false, soft: false, out: false, funnel: false, strength,
  };

  if (diff > 18 && st.rng.chance(clamp(0.15 + diff * 0.008, 0.1, 0.45))) {
    // stuff block
    result.touch = true; result.stuff = true;
    const hero = blockers[0];
    def.pstats[hero.id].blocks++;
    def.pstats[hero.id].pts++;
    def.stats.blocks++;
    emit(st, { type: 'block', team: defIdx, player: hero.id, player2: set.targetId, kind: style, success: true });
    emit(st, { type: 'blockPoint', team: defIdx, player: hero.id, player2: set.targetId });
    if (hasSig(hero.signatures, 'IRON_WALL')) emit(st, { type: 'signature', team: defIdx, player: hero.id, kind: 'IRON_WALL' });
    return result;
  }

  if (diff > 0 && st.rng.chance(0.45)) {
    result.touch = true;
    // soft block or funnel
    if (blockers.some((b) => hasSig(b.signatures, 'FUNNEL_BLOCK'))) {
      result.funnel = true; result.soft = true;
      emit(st, { type: 'signature', team: defIdx, player: blockers.find((b) => hasSig(b.signatures, 'FUNNEL_BLOCK'))!.id, kind: 'FUNNEL_BLOCK' });
    } else if (st.rng.chance(0.55)) {
      result.soft = true;
    }
    emit(st, { type: 'block', team: defIdx, player: blockers[0].id, kind: 'soft', success: true });
    emit(st, { type: 'softBlock', team: defIdx, player: blockers[0].id });
    return result;
  }

  // tool / block out chance for attacker
  if (diff < -5 && st.rng.chance(0.12 + Math.min(0.2, attackAcc * 0.002))) {
    result.touch = true; result.tool = true;
    if (st.rng.chance(0.35)) result.out = true;
    emit(st, { type: 'block', team: defIdx, player: blockers[0].id, kind: 'tooled', success: false });
    if (result.out) emit(st, { type: 'blockOut', team: defIdx, player: blockers[0].id, player2: set.targetId });
    return result;
  }

  // clean miss block
  emit(st, { type: 'block', team: defIdx, player: blockers[0].id, kind: style, success: false });
  return result;
}
