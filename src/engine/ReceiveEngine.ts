import type { MatchState } from './GameState';
import type { ServeResult } from './ServeEngine';
import type { ReceiveQuality } from './types';
import { effective, drainStamina } from './Player';
import { hasSig } from './signatures';
import { emit } from './CommentaryEngine';
import { momentumMod } from './MomentumEngine';
import { clutchFactor } from './GameState';
import { clamp } from './rng';

export interface ReceiveResult {
  receiverId: string;
  quality: ReceiveQuality;
  qualityScore: number; // 0-1
  error: boolean;
  ace: boolean;
  setterDistance: number; // how far setter must move (0=perfect)
}

export function executeReceive(st: MatchState, serve: ServeResult): ReceiveResult {
  const recvTeam = st.teams[1 - st.serving];
  const receiver = recvTeam.players[serve.targetId];
  const clutch = clutchFactor(st);
  const mom = momentumMod(recvTeam);

  let skill = effective(receiver, 'serveReceive', clutch) * 0.7
    + effective(receiver, 'reaction', clutch) * 0.15
    + effective(receiver, 'ballControl', clutch) * 0.15
    + mom;

  if (hasSig(receiver.signatures, 'GUARDIAN_DEITY')) skill += 6;
  if (hasSig(receiver.signatures, 'CAPTAINS_STABILITY')) skill += 3;
  // Nearby captain stability
  for (const id of recvTeam.rotation) {
    const p = recvTeam.players[id];
    if (p && hasSig(p.signatures, 'CAPTAINS_STABILITY') && p.id !== receiver.id) skill += 2;
  }

  // Serve pressure
  let pressure = serve.quality * 42 + serve.power * 0.18;
  if (serve.type === 'float' || serve.type === 'jumpFloat') {
    pressure += 10; // wobble
    if (st.teams[st.serving].players[serve.serverId]?.signatures.includes('PRESSURE_FLOAT')) pressure += 12;
  }
  if (serve.type === 'powerJump') pressure += 14;

  const roll = skill - pressure + st.rng.gauss(0, 12);
  drainStamina(receiver, 1.5);
  recvTeam.pstats[receiver.id].receptions++;
  recvTeam.stats.receptions++;

  // Ace check first
  if (st.rng.chance(serve.aceChance * (roll < 0 ? 1.5 : roll < 15 ? 1.0 : 0.4))) {
    recvTeam.pstats[receiver.id].receptionErrors++;
    recvTeam.stats.receptionErrors++;
    const srv = st.teams[st.serving];
    srv.pstats[serve.serverId].aces++;
    srv.pstats[serve.serverId].pts++;
    srv.stats.aces++;
    emit(st, { type: 'receive', team: recvTeam.idx, player: receiver.id, quality: 'error', success: false });
    emit(st, { type: 'ace', team: srv.idx, player: serve.serverId, player2: receiver.id });
    return { receiverId: receiver.id, quality: 'error', qualityScore: 0, error: true, ace: true, setterDistance: 1 };
  }

  let quality: ReceiveQuality;
  let qualityScore: number;
  let setterDistance: number;
  if (roll >= 36) {
    quality = 'perfect'; qualityScore = 0.95; setterDistance = 0.05;
    recvTeam.pstats[receiver.id].perfectReceptions++;
    recvTeam.stats.perfectReceptions++;
  } else if (roll >= 14) {
    quality = 'good'; qualityScore = 0.78; setterDistance = 0.2;
  } else if (roll >= 0) {
    quality = 'medium'; qualityScore = 0.55; setterDistance = 0.45;
  } else if (roll >= -16) {
    quality = 'poor'; qualityScore = 0.32; setterDistance = 0.75;
  } else {
    quality = 'error'; qualityScore = 0; setterDistance = 1;
    recvTeam.pstats[receiver.id].receptionErrors++;
    recvTeam.stats.receptionErrors++;
    emit(st, { type: 'receive', team: recvTeam.idx, player: receiver.id, quality: 'error', success: false });
    emit(st, { type: 'receiveError', team: recvTeam.idx, player: receiver.id });
    return { receiverId: receiver.id, quality, qualityScore, error: true, ace: false, setterDistance };
  }

  emit(st, { type: 'receive', team: recvTeam.idx, player: receiver.id, quality, data: { score: qualityScore }, success: true });
  return { receiverId: receiver.id, quality, qualityScore, error: false, ace: false, setterDistance };
}

// fix duplicate quality key - I'll patch
