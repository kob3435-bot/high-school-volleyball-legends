import type { MatchState } from './GameState';
import type { ServeType } from './types';
import { server, backRow, type TeamRT } from './Team';
import { effective, drainStamina } from './Player';
import { hasSig } from './signatures';
import { emit } from './CommentaryEngine';
import { momentumMod } from './MomentumEngine';
import { clutchFactor } from './GameState';
import { clamp } from './rng';

export interface ServeResult {
  type: ServeType;
  serverId: string;
  targetId: string;
  targetZone: number;
  quality: number; // 0-1
  error: boolean;
  aceChance: number;
  power: number;
}

function pickServeType(st: MatchState, srv: ReturnType<typeof server>): ServeType {
  const p = srv;
  const w: { t: ServeType; w: number }[] = [
    { t: 'standing', w: 5 },
    { t: 'float', w: 15 + effective(p, 'floatServe') * 0.2 },
    { t: 'jumpFloat', w: 10 + effective(p, 'floatServe') * 0.25 },
    { t: 'jump', w: 8 + effective(p, 'jumpServe') * 0.3 },
    { t: 'powerJump', w: effective(p, 'jumpServe') > 80 ? 12 + effective(p, 'servePower') * 0.2 : 2 },
    { t: 'target', w: hasSig(p.signatures, 'TARGET_SERVE') ? 25 : 8 + effective(p, 'targeting') * 0.15 },
  ];
  if (hasSig(p.signatures, 'PRESSURE_FLOAT')) {
    w.find((x) => x.t === 'float')!.w += 20;
    w.find((x) => x.t === 'jumpFloat')!.w += 15;
  }
  return st.rng.weighted(w.map((x) => x.t), w.map((x) => x.w));
}

function pickTarget(st: MatchState, servingTeam: TeamRT, recvTeam: TeamRT): { id: string; zone: number } {
  const receivers = backRow(recvTeam).filter((p) => !p.isLibero || true);
  // Prefer non-libero weak; libero is usually best receiver
  const tactic = servingTeam.tactics.serveTarget;
  const srv = server(servingTeam);

  if (hasSig(srv.signatures, 'TARGET_SERVE') || tactic === 'weak') {
    let worst = receivers[0];
    for (const r of receivers) {
      if (effective(r, 'serveReceive') < effective(worst, 'serveReceive')) worst = r;
    }
    // Prefer non-libero if close
    const nonLib = receivers.filter((r) => !r.isLibero);
    if (nonLib.length) {
      nonLib.sort((a, b) => effective(a, 'serveReceive') - effective(b, 'serveReceive'));
      worst = nonLib[0];
    }
    return { id: worst.id, zone: worst.zone };
  }
  if (tactic === 'zone1') {
    const p = recvTeam.players[recvTeam.rotation[0]];
    return { id: p.id, zone: 1 };
  }
  if (tactic === 'zone5') {
    const p = recvTeam.players[recvTeam.rotation[4]];
    return { id: p.id, zone: 5 };
  }
  // auto / seam / short / deep — weighted by weakness
  const weights = receivers.map((r) => {
    let w = 100 - effective(r, 'serveReceive');
    if (r.isLibero) w *= 0.4;
    if (tactic === 'seam') w *= 1.2;
    return Math.max(5, w);
  });
  const pick = st.rng.weighted(receivers, weights);
  return { id: pick.id, zone: pick.zone };
}

export function executeServe(st: MatchState): ServeResult {
  const servingTeam = st.teams[st.serving];
  const recvTeam = st.teams[1 - st.serving];
  const srv = server(servingTeam);
  const type = pickServeType(st, srv);
  const target = pickTarget(st, servingTeam, recvTeam);
  const clutch = clutchFactor(st);
  const mom = momentumMod(servingTeam);

  let power = effective(srv, 'servePower', clutch) + mom;
  let accuracy = effective(srv, 'serveAccuracy', clutch) + mom;
  if (type === 'float' || type === 'jumpFloat') power = effective(srv, 'floatServe', clutch) * 0.7 + power * 0.3;
  if (type === 'jump' || type === 'powerJump') power = effective(srv, 'jumpServe', clutch) * 0.6 + power * 0.5;
  if (type === 'powerJump') power += 8;
  if (hasSig(srv.signatures, 'PRESSURE_FLOAT') && (type === 'float' || type === 'jumpFloat')) {
    accuracy += 5; power += 6;
  }

  // Error chance
  let errP = 0.03 + (100 - accuracy) * 0.0014 + (type === 'powerJump' ? 0.04 : type === 'jump' ? 0.025 : 0.01);
  if (hasSig(srv.signatures, 'NO_MISTAKES')) errP *= 0.45;
  errP = clamp(errP, 0.012, 0.14);

  drainStamina(srv, type === 'powerJump' || type === 'jump' ? 2.2 : 1.2);
  servingTeam.pstats[srv.id].serveAttempts++;

  if (st.rng.chance(errP)) {
    servingTeam.pstats[srv.id].serveErrors++;
    servingTeam.stats.serveErrors++;
    emit(st, { type: 'serve', team: servingTeam.idx, player: srv.id, kind: type, zone: target.zone, success: false });
    emit(st, { type: 'serveError', team: servingTeam.idx, player: srv.id, kind: type });
    return { type, serverId: srv.id, targetId: target.id, targetZone: target.zone, quality: 0, error: true, aceChance: 0, power: 0 };
  }

  const quality = clamp((power + accuracy) / 200 + st.rng.gauss(0, 0.08), 0.15, 0.98);
  let aceChance = clamp((quality - 0.58) * 0.18 + (power - 75) * 0.0012, 0.008, 0.14);
  if (type === 'powerJump') aceChance += 0.03;

  servingTeam.serveTargets[target.id] = (servingTeam.serveTargets[target.id] ?? 0) + 1;
  emit(st, {
    type: 'serve', team: servingTeam.idx, player: srv.id, player2: target.id,
    kind: type, zone: target.zone, quality, success: true,
    data: { power, aceChance },
  });

  return { type, serverId: srv.id, targetId: target.id, targetZone: target.zone, quality, error: false, aceChance, power };
}
