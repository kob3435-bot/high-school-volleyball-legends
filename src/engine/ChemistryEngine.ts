import type { TeamRT } from './Team';
import type { RuntimePlayer } from './Player';
import { hasSig } from './signatures';
import { clamp } from './rng';

/** Setter–spiker chemistry from attributes + signatures. */
export function pairChemistry(setter: RuntimePlayer, spiker: RuntimePlayer): number {
  let c = 50;
  // tempo compatibility: setSpeed vs approachSpeed
  const tempoDiff = Math.abs(setter.attrs.setSpeed - spiker.attrs.approachSpeed);
  c += (20 - tempoDiff) * 0.6;
  // trust / communication
  c += (setter.attrs.communication + spiker.attrs.communication - 140) * 0.15;
  c += (setter.attrs.setAccuracy - 70) * 0.2;
  // signatures
  if (hasSig(setter.signatures, 'KINGS_TOSS')) c += 8;
  if (hasSig(setter.signatures, 'PINPOINT_QUICK') && (spiker.pos === 'MB' || hasSig(spiker.signatures, 'FREAK_QUICK'))) c += 12;
  if (hasSig(setter.signatures, 'TEAM_RHYTHM')) c += 6;
  if (hasSig(spiker.signatures, 'FREAK_QUICK') && hasSig(setter.signatures, 'PINPOINT_QUICK')) c += 15;
  if (hasSig(setter.signatures, 'TWIN_QUICK') && hasSig(spiker.signatures, 'TWIN_QUICK')) c += 18;
  if (hasSig(setter.signatures, 'HUNDRED_SPIKER')) c += 10;
  if (hasSig(setter.signatures, 'ACE_MANAGEMENT') && (spiker.pos === 'OH' || spiker.pos === 'OP')) c += 5;
  return clamp(c, 10, 99);
}

export function computeTeamChemistry(t: TeamRT): number {
  const setter = Object.values(t.players).find((p) => p.pos === 'S');
  let sum = 55, n = 1;
  if (setter) {
    for (const id of t.rotation) {
      const p = t.players[id];
      if (!p || p.id === setter.id) continue;
      if (p.pos === 'OH' || p.pos === 'OP' || p.pos === 'MB') {
        sum += pairChemistry(setter, p);
        n++;
      }
    }
  }
  // Receive balance penalty for all-star piles with bad receive
  const receivers = t.rotation.map((id) => t.players[id]).filter(Boolean);
  const avgRecv = receivers.reduce((s, p) => s + p.attrs.serveReceive, 0) / Math.max(1, receivers.length);
  if (avgRecv < 70) sum -= (70 - avgRecv) * 0.8;
  // Superstar ego: high overall, low communication
  const avgComm = receivers.reduce((s, p) => s + p.attrs.communication, 0) / receivers.length;
  sum += (avgComm - 70) * 0.3;
  if (receivers.some((p) => hasSig(p.signatures, 'CAPTAINS_STABILITY'))) sum += 6;
  if (receivers.some((p) => hasSig(p.signatures, 'TEAM_RHYTHM'))) sum += 5;
  t.chemistry = clamp(sum / n, 20, 95);
  return t.chemistry;
}

export function freakQuickAvailable(setter: RuntimePlayer, attacker: RuntimePlayer, passQuality: number): boolean {
  if (!hasSig(attacker.signatures, 'FREAK_QUICK') && !hasSig(setter.signatures, 'PINPOINT_QUICK')) return false;
  if (passQuality < 0.7) return false; // needs good+ pass
  const chem = pairChemistry(setter, attacker);
  return chem >= 60 && Math.abs(setter.attrs.setSpeed - attacker.attrs.approachSpeed) < 25;
}
