import type { MatchState } from './GameState';
import type { AttackResult } from './AttackEngine';
import type { BlockResult } from './BlockEngine';
import { backRow, type TeamRT } from './Team';
import { effective, drainStamina } from './Player';
import { hasSig } from './signatures';
import { emit } from './CommentaryEngine';
import { momentumMod } from './MomentumEngine';
import { clutchFactor } from './GameState';
import { clamp } from './rng';

export interface DigResult {
  diggerId: string;
  success: boolean;
  quality: number;
  miracle: boolean;
}

function pickDigger(st: MatchState, def: TeamRT, atk: AttackResult, block: BlockResult | null): string {
  const backs = backRow(def);
  // Funnel: dig goes to prepared defender (libero preferred)
  if (block?.funnel) {
    const lib = backs.find((p) => p.isLibero);
    if (lib) return lib.id;
  }
  // Direction-based
  let weights = backs.map((p) => {
    let w = effective(p, 'dig') * 0.5 + effective(p, 'positioning') * 0.3 + effective(p, 'reaction') * 0.2;
    if (p.isLibero) w *= 1.4;
    if (atk.direction === 'line' && (p.zone === 1 || p.zone === 5)) w *= 1.3;
    if (atk.direction === 'cross' && p.zone === 6) w *= 1.2;
    if (atk.direction === 'tip') w *= 1.1;
    return w;
  });
  if (def.tactics.defense === 'Deep Defense') weights = weights.map((w) => w * 1.1);
  if (def.tactics.defense === 'Cross Defense' && atk.direction === 'cross') weights = weights.map((w, i) => backs[i].zone === 6 ? w * 1.4 : w);
  if (def.tactics.defense === 'Line Defense' && atk.direction === 'line') weights = weights.map((w, i) => (backs[i].zone === 1 || backs[i].zone === 5) ? w * 1.4 : w);
  return st.rng.weighted(backs, weights).id;
}

export function executeDig(st: MatchState, defIdx: 0 | 1, atk: AttackResult, block: BlockResult | null): DigResult {
  const def = st.teams[defIdx];
  const diggerId = pickDigger(st, def, atk, block);
  const digger = def.players[diggerId];
  const clutch = clutchFactor(st);
  const mom = momentumMod(def);

  let skill = effective(digger, 'dig', clutch) * 0.5
    + effective(digger, 'reaction', clutch) * 0.25
    + effective(digger, 'ballControl', clutch) * 0.15
    + effective(digger, 'positioning') * 0.1
    + mom;

  if (hasSig(digger.signatures, 'GUARDIAN_DEITY')) skill += 10;
  if (block?.soft || block?.funnel) skill += 18;
  if (atk.direction === 'tip') skill += 8;
  if (atk.direction === 'tool') skill -= 5;

  const pressure = atk.power * 0.38 + (100 - atk.accuracy) * 0.08 + st.rng.gauss(0, 9);
  const roll = skill - pressure;

  drainStamina(digger, 2);
  def.pstats[digger.id].digAttempts++;

  // Miracle save
  if (roll < -15 && hasSig(digger.signatures, 'GUARDIAN_DEITY') && st.rng.chance(0.35)) {
    def.pstats[digger.id].digs++;
    def.stats.digs++;
    emit(st, { type: 'dig', team: defIdx, player: digger.id, success: true, quality: 0.5 });
    emit(st, { type: 'signature', team: defIdx, player: digger.id, kind: 'GUARDIAN_DEITY', text: `${digger.name} keeps it alive!` });
    return { diggerId, success: true, quality: 0.45, miracle: true };
  }

  if (roll >= -12) {
    const quality = clamp(0.32 + roll * 0.008, 0.22, 0.75);
    def.pstats[digger.id].digs++;
    def.stats.digs++;
    emit(st, { type: 'dig', team: defIdx, player: digger.id, success: true, quality });
    return { diggerId, success: true, quality, miracle: false };
  }

  emit(st, { type: 'dig', team: defIdx, player: digger.id, success: false });
  emit(st, { type: 'digError', team: defIdx, player: digger.id });
  return { diggerId, success: false, quality: 0, miracle: false };
}
