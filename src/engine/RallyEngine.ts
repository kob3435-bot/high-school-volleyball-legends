/** Rally-by-rally event loop. NEVER pre-rolls set scores. */
import type { MatchState } from './GameState';
import { executeServe } from './ServeEngine';
import { executeReceive } from './ReceiveEngine';
import { executeSet } from './SetEngine';
import { executeBlock } from './BlockEngine';
import { executeAttack } from './AttackEngine';
import { executeDig } from './DigEngine';
import { emit } from './CommentaryEngine';
import { sideOut } from './RotationEngine';
import { onPoint } from './MomentumEngine';
import { clamp } from './rng';

export type PointReason =
  | 'kill' | 'ace' | 'blockPoint' | 'blockOut' | 'ballOut'
  | 'serveError' | 'receiveError' | 'setError' | 'attackError' | 'digError'
  | 'dumpKill' | 'netTouch';

export interface RallyOutcome {
  winner: 0 | 1;
  reason: PointReason;
  contacts: number;
}

export function runRally(st: MatchState): RallyOutcome {
  st.rallyCount++;
  st.currentRallyLength = 0;
  st.simTime += 100;
  const servingAtStart = st.serving;
  const receivingAtStart = (1 - servingAtStart) as 0 | 1;
  emit(st, { type: 'rallyStart', team: servingAtStart });

  const serve = executeServe(st);
  st.currentRallyLength++;
  if (serve.error) return finish(st, receivingAtStart, 'serveError', servingAtStart);

  const recv = executeReceive(st, serve);
  st.currentRallyLength++;
  if (recv.ace) return finish(st, servingAtStart, 'ace', servingAtStart);
  if (recv.error) return finish(st, servingAtStart, 'receiveError', servingAtStart);

  let offense: 0 | 1 = receivingAtStart;
  let passQuality = recv.qualityScore;
  let contacts = 2;

  while (contacts < 40) {
    const fakeRecv = {
      receiverId: recv.receiverId,
      quality: recv.quality,
      qualityScore: passQuality,
      error: false,
      ace: false,
      setterDistance: clamp(1 - passQuality, 0.05, 0.9),
    };
    const set = executeSet(st, offense, fakeRecv);
    contacts++;
    st.currentRallyLength++;
    st.simTime += 80;

    if (set.error) return finish(st, (1 - offense) as 0 | 1, 'setError', servingAtStart);
    if (set.dump && set.dumpKill) return finish(st, offense, 'dumpKill', servingAtStart);

    const attacker = st.teams[offense].players[set.targetId];
    const estPower = attacker ? attacker.attrs.spikePower + (set.qualityScore - 0.5) * 20 : 70;
    const estAcc = attacker ? attacker.attrs.spikeAccuracy + (set.qualityScore - 0.5) * 20 : 70;
    const defense = (1 - offense) as 0 | 1;

    const block = set.dump
      ? { style: 'read' as const, blockers: [] as string[], touch: false, stuff: false, tool: false, soft: false, out: false, funnel: false, strength: 0 }
      : executeBlock(st, defense, set, estPower, estAcc, 'straight');
    contacts++;
    st.currentRallyLength++;

    if (block.stuff) {
      executeAttack(st, offense, set, block);
      return finish(st, defense, 'blockPoint', servingAtStart);
    }

    const atk = executeAttack(st, offense, set, block);
    contacts++;
    st.currentRallyLength++;
    st.simTime += 60;

    if (atk.error) return finish(st, defense, 'attackError', servingAtStart);
    if (atk.blocked) return finish(st, defense, 'blockPoint', servingAtStart);
    if (atk.kill) {
      if (block.out) return finish(st, offense, 'blockOut', servingAtStart);
      return finish(st, offense, 'kill', servingAtStart);
    }
    if (!atk.inPlay) return finish(st, offense, 'ballOut', servingAtStart);

    const dig = executeDig(st, defense, atk, block);
    contacts++;
    st.currentRallyLength++;
    st.simTime += 70;

    if (!dig.success) return finish(st, offense, 'digError', servingAtStart);

    const digger = st.teams[defense].players[dig.diggerId];
    const digName = digger?.name?.split(' ').pop() ?? 'Libero';
    emit(st, {
      type: 'transition', team: defense, player: dig.diggerId, quality: dig.quality,
      text: dig.miracle
        ? `${digName} keeps it alive — counter!`
        : block.soft
          ? `Soft block… ${digName} transitions!`
          : `${digName} digs — transition!`,
    });
    // Cover: offense side scrambles under possible tip rebound
    emit(st, { type: 'cover', team: offense, text: 'Cover!' });
    offense = defense;
    // Soft-block digs leave a playable but out-of-system ball; miracle digs are scramble
    passQuality = dig.miracle ? Math.max(0.35, dig.quality) : (block.soft ? Math.max(0.42, dig.quality) : dig.quality);

    if (st.rng.chance(0.008)) {
      emit(st, { type: 'netTouch', team: offense });
      return finish(st, (1 - offense) as 0 | 1, 'netTouch', servingAtStart);
    }
  }
  return finish(st, (1 - offense) as 0 | 1, 'ballOut', servingAtStart);
}

function finish(st: MatchState, winner: 0 | 1, reason: PointReason, servingAtStart: 0 | 1): RallyOutcome {
  const t = st.teams[winner];
  t.score++;
  t.stats.points++;
  st.pointInSet++;
  st.longestRally = Math.max(st.longestRally, st.currentRallyLength);
  st.rallyLengths.push(st.currentRallyLength);

  const receivingAtStart = (1 - servingAtStart) as 0 | 1;
  st.teams[receivingAtStart].stats.sideOutChances++;
  st.teams[servingAtStart].stats.breakChances++;
  if (winner === receivingAtStart) st.teams[receivingAtStart].stats.sideOuts++;
  else st.teams[servingAtStart].stats.breakPoints++;

  // Rotation efficiency (before side-out rotate)
  const wi = st.teams[winner].rotIndex % 6;
  const li = st.teams[1 - winner].rotIndex % 6;
  st.scouting.rotationWon[winner][wi]++;
  st.scouting.rotationLost[(1 - winner) as 0 | 1][li]++;

  onPoint(st, winner, reason);
  emit(st, { type: 'point', team: winner, kind: reason, score: [st.teams[0].score, st.teams[1].score] });
  emit(st, { type: 'rallyEnd', team: winner, kind: reason, text: `Point (${reason})` });

  if (winner !== st.serving) sideOut(st, winner);

  return { winner, reason, contacts: st.currentRallyLength };
}
