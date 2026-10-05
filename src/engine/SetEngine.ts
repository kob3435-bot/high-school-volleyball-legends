import type { MatchState } from './GameState';
import type { ReceiveResult } from './ReceiveEngine';
import type { AttackType, SetQuality } from './types';
import { findSetter, frontRow, type TeamRT } from './Team';
import { effective, drainStamina, type RuntimePlayer } from './Player';
import { hasSig } from './signatures';
import { pairChemistry, freakQuickAvailable } from './ChemistryEngine';
import { emit } from './CommentaryEngine';
import { momentumMod } from './MomentumEngine';
import { clutchFactor } from './GameState';
import { isBackRowAttacker } from './RotationEngine';
import { clamp } from './rng';

export interface SetResult {
  setterId: string;
  targetId: string;
  attackType: AttackType;
  quality: SetQuality;
  qualityScore: number;
  error: boolean;
  dump: boolean;
  dumpKill: boolean;
  availableOptions: AttackType[];
}

function availableAttacks(st: MatchState, team: TeamRT, passQ: number): { type: AttackType; player: RuntimePlayer; weight: number }[] {
  const setter = findSetter(team)!;
  const opts: { type: AttackType; player: RuntimePlayer; weight: number }[] = [];
  const tactic = team.tactics.offense;
  const clutch = clutchFactor(st);

  for (const id of team.rotation) {
    const p = team.players[id];
    if (!p || p.id === setter.id || p.isLibero) continue;
    const back = isBackRowAttacker(team, p.id);
    const chem = pairChemistry(setter, p);

    // Quicks — need good pass
    if (!back && p.pos === 'MB' && passQ >= 0.55) {
      let w = 20 + effective(p, 'approachSpeed') * 0.3 + chem * 0.2;
      if (tactic === 'Middle Focus' || tactic === 'Fast Tempo') w *= 1.6;
      if (passQ < 0.7) w *= 0.4;
      if (freakQuickAvailable(setter, p, passQ)) {
        opts.push({ type: 'quickA', player: p, weight: w * 1.8 });
      } else {
        opts.push({ type: 'quickB', player: p, weight: w });
      }
      if (hasSig(p.signatures, 'TWIN_QUICK') || hasSig(setter.signatures, 'TWIN_QUICK')) {
        opts.push({ type: 'combination', player: p, weight: w * 0.9 });
      }
      opts.push({ type: 'slide', player: p, weight: w * 0.7 });
    }

    // Wing / high / open
    if ((p.pos === 'OH' || p.pos === 'OP') && !back) {
      let w = 25 + effective(p, 'spikePower') * 0.25 + chem * 0.15;
      if (tactic === 'Wing Focus' || tactic === 'Ace Focus') w *= 1.4;
      if (hasSig(p.signatures, 'ABSOLUTE_ACE') && clutch > 0.8) w *= 1.8;
      if (hasSig(p.signatures, 'ACE_MODE') && p.mood > 10) w *= 1.3;
      if (hasSig(setter.signatures, 'ACE_MANAGEMENT') && p.hotCold > 2) w *= 1.2;
      if (hasSig(setter.signatures, 'ACE_MANAGEMENT') && p.hotCold < -2) w *= 0.7;
      opts.push({ type: passQ >= 0.7 ? 'open' : 'highBall', player: p, weight: w });
      opts.push({ type: 'cross', player: p, weight: w * 0.5 });
      opts.push({ type: 'line', player: p, weight: w * 0.45 });
      if (effective(p, 'tip') > 70) opts.push({ type: 'tip', player: p, weight: 8 + (100 - passQ * 50) });
    }

    // Back row: pipe / back attack — must be behind attack line
    if (back && (p.pos === 'OH' || p.pos === 'OP' || p.pos === 'MB')) {
      let w = 12 + effective(p, 'backAttack') * 0.35;
      if (tactic === 'Back Attack Focus') w *= 2;
      if (passQ >= 0.6) opts.push({ type: 'pipe', player: p, weight: w });
      opts.push({ type: 'backAttack', player: p, weight: w * 0.8 });
    }
  }

  // Decoy pull (doesn't attack but used by block AI — represented as combination)
  const decoy = team.rotation.map((id) => team.players[id]).find((p) => p && hasSig(p.signatures, 'ULTIMATE_DECOY'));
  if (decoy && passQ >= 0.6) {
    // Increase weight of wings when decoy present (handled in block)
  }

  if (tactic === 'Combination') {
    for (const o of opts) if (o.type === 'combination' || o.type === 'quickA') o.weight *= 1.5;
  }
  if (tactic === 'Spread') {
    for (const o of opts) o.weight *= 0.9 + st.rng.next() * 0.3;
  }

  // COURT_ANALYSIS / RISK_SETTING
  if (hasSig(setter.signatures, 'COURT_ANALYSIS')) {
    // Prefer less-blocked options — approximate by boosting variety
    for (const o of opts) o.weight += st.rng.range(0, 15);
  }
  if (hasSig(setter.signatures, 'RISK_SETTING')) {
    for (const o of opts) if (o.type.startsWith('quick') || o.type === 'combination') o.weight *= 1.3;
  }

  return opts;
}

export function executeSet(st: MatchState, teamIdx: 0 | 1, recv: ReceiveResult): SetResult {
  const team = st.teams[teamIdx];
  const setter = findSetter(team)!;
  const clutch = clutchFactor(st);
  const mom = momentumMod(team);
  const passQ = recv.qualityScore;

  let setSkill = effective(setter, 'setAccuracy', clutch) * 0.5
    + effective(setter, 'decisionMaking', clutch) * 0.25
    + effective(setter, 'setSpeed', clutch) * 0.15
    + effective(setter, 'outOfSystem', clutch) * (1 - passQ) * 0.3
    + mom + team.chemistry * 0.08;

  if (recv.setterDistance > 0.5) setSkill -= 15 * recv.setterDistance;
  if (hasSig(setter.signatures, 'KINGS_TOSS')) setSkill += 8;
  if (hasSig(setter.signatures, 'PINPOINT_QUICK')) setSkill += 4;

  // Dump opportunity when block over-reads
  const dumpChance = hasSig(setter.signatures, 'SETTER_DUMP')
    ? 0.08 + effective(setter, 'deception') * 0.001
    : (team.tactics.offense === 'Setter Attack' ? 0.06 : 0.02);
  const front = frontRow(team);
  const setterFront = front.some((p) => p.id === setter.id);

  drainStamina(setter, 1.2);
  team.pstats[setter.id].setAttempts++;

  if (setterFront && st.rng.chance(dumpChance) && passQ >= 0.5) {
    team.pstats[setter.id].dumps++;
    const dumpSkill = effective(setter, 'tip', clutch) + effective(setter, 'deception') * 0.3;
    const kill = st.rng.chance(clamp(dumpSkill / 140, 0.25, 0.7));
    emit(st, { type: 'setterDump', team: teamIdx, player: setter.id, success: kill });
    emit(st, { type: 'signature', team: teamIdx, player: setter.id, kind: 'SETTER_DUMP' });
    if (kill) {
      team.pstats[setter.id].dumpKills++;
      team.pstats[setter.id].pts++;
      team.pstats[setter.id].kills++;
      team.stats.kills++;
      team.pstats[setter.id].attempts++;
      return {
        setterId: setter.id, targetId: setter.id, attackType: 'setterDump',
        quality: 'perfect', qualityScore: 0.9, error: false, dump: true, dumpKill: true,
        availableOptions: ['setterDump'],
      };
    }
    // dump kept in play — treat as tip attack continuing
    return {
      setterId: setter.id, targetId: setter.id, attackType: 'setterDump',
      quality: 'good', qualityScore: 0.6, error: false, dump: true, dumpKill: false,
      availableOptions: ['setterDump'],
    };
  }

  const options = availableAttacks(st, team, passQ);
  if (!options.length) {
    // emergency freeball-ish set to any front
    const any = front[0] ?? team.players[team.rotation[2]];
    options.push({ type: 'highBall', player: any, weight: 10 });
  }

  const pick = st.rng.weighted(options, options.map((o) => o.weight));
  const chem = pairChemistry(setter, pick.player);
  const roll = setSkill + chem * 0.15 + st.rng.gauss(0, 10) - (1 - passQ) * 25;

  let quality: SetQuality;
  let qualityScore: number;
  if (roll < -20) {
    quality = 'error'; qualityScore = 0;
    team.pstats[setter.id].setErrors++;
    team.stats.setErrors++;
    emit(st, { type: 'setError', team: teamIdx, player: setter.id });
    return {
      setterId: setter.id, targetId: pick.player.id, attackType: pick.type,
      quality, qualityScore, error: true, dump: false, dumpKill: false,
      availableOptions: options.map((o) => o.type),
    };
  }
  if (roll >= 40) { quality = 'perfect'; qualityScore = 0.95; team.pstats[setter.id].perfectSets++; }
  else if (roll >= 18) { quality = 'good'; qualityScore = 0.78; }
  else if (roll >= 0) { quality = 'medium'; qualityScore = 0.55; }
  else { quality = 'poor'; qualityScore = 0.3; }

  if (hasSig(setter.signatures, 'KINGS_TOSS') && quality !== 'poor') {
    qualityScore = Math.min(0.98, qualityScore + 0.08);
  }
  if (hasSig(setter.signatures, 'HUNDRED_SPIKER')) qualityScore = Math.min(0.98, qualityScore + 0.05);

  team.setDist[pick.player.id] = (team.setDist[pick.player.id] ?? 0) + 1;
  st.scouting.setTargets[pick.player.id] = (st.scouting.setTargets[pick.player.id] ?? 0) + 1;

  // track attack type attempts for setter stats
  const ps = team.pstats[pick.player.id];
  if (pick.type.startsWith('quick') || pick.type === 'slide') ps.quickAttempts++;
  else if (pick.type === 'pipe' || pick.type === 'backAttack') ps.backAttempts++;
  else if (pick.player.pos === 'OP') ps.oppositeAttempts++;
  else ps.wingAttempts++;

  emit(st, {
    type: 'set', team: teamIdx, player: setter.id, player2: pick.player.id,
    kind: pick.type, quality: qualityScore, success: true,
  });
  if (pick.type === 'quickA' && hasSig(pick.player.signatures, 'FREAK_QUICK')) {
    emit(st, { type: 'signature', team: teamIdx, player: pick.player.id, kind: 'FREAK_QUICK', text: 'FREAK QUICK!' });
  }

  return {
    setterId: setter.id, targetId: pick.player.id, attackType: pick.type,
    quality, qualityScore, error: false, dump: false, dumpKill: false,
    availableOptions: options.map((o) => o.type),
  };
}
