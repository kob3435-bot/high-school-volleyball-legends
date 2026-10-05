/** Estimate wall-clock Bo5 duration at watch/1x and broadcast from pace constants + 5k rally mix. */
import { readFileSync, writeFileSync } from 'fs';
import { BASE_BEAT, BETWEEN_POINT_BASE, SET_BREAK_BASE, TIMEOUT_BASE, PACE } from '../src/ui/render/Pace';

const rally = JSON.parse(readFileSync('reports/v6-rally-lengths.json', 'utf8')) as {
  mean: number; counts: Record<string, number>; n: number;
};
const bal = JSON.parse(readFileSync('reports/v6-balance.json', 'utf8')) as {
  sideOutPct: number;
};

// Approx points per set (both teams): ~42 from avg set score ~21 each
const ptsPerSet = 42;
const setsPerMatch = 3.7; // from prior balance
const timeoutsPerMatch = 2.5;
const setBreaks = setsPerMatch - 1;

// Map length buckets to typical event chains (seconds of beats before scale)
function beatsForLen(L: number): string[] {
  // Rough contact sequence by length
  if (L <= 2) return ['rallyStart', 'serve', 'ace', 'point', 'rallyEnd']; // or serve+recv err
  if (L <= 5) return ['rallyStart', 'serve', 'receive', 'set', 'attack', 'kill', 'point', 'rallyEnd'];
  if (L <= 9) return ['rallyStart', 'serve', 'receive', 'set', 'attack', 'dig', 'transition', 'set', 'attack', 'kill', 'point', 'rallyEnd'];
  if (L <= 15) return ['rallyStart', 'serve', 'receive', 'set', 'attack', 'block', 'dig', 'transition', 'set', 'attack', 'dig', 'transition', 'set', 'attack', 'kill', 'point', 'rallyEnd'];
  return ['rallyStart', 'serve', 'receive', 'set', 'attack', 'dig', 'transition', 'set', 'attack', 'dig', 'transition', 'set', 'attack', 'softBlock', 'dig', 'transition', 'set', 'attack', 'kill', 'point', 'rallyEnd'];
}

function chainSec(types: string[], scale: number): number {
  return types.reduce((s, ty) => s + (BASE_BEAT[ty] ?? 0.25) * scale, 0);
}

const order = [
  ['1-2 short (ace/err/FBK)', 2],
  ['3-5 medium (1 transition)', 4],
  ['6-9 medium-long', 7],
  ['10-15 long', 12],
  ['16+ marathon', 18],
] as const;

let meanRallyPresent = 0;
for (const [key, L] of order) {
  const c = rally.counts[key] || 0;
  const w = c / rally.n;
  meanRallyPresent += w * chainSec(beatsForLen(L), 1);
}
const between = BETWEEN_POINT_BASE + 0.15;
const perPointWatch = meanRallyPresent + between;
const perPointBroadcast = meanRallyPresent * 1.35 + between * 1.35;

function matchMin(perPoint: number, scaleBreak: number) {
  const points = ptsPerSet * setsPerMatch;
  const sec = points * perPoint + setBreaks * SET_BREAK_BASE * scaleBreak + timeoutsPerMatch * TIMEOUT_BASE * scaleBreak;
  return sec / 60;
}

// Legacy (v6) approx: old beats ~0.55x of new BASE
const legacyPerPoint = meanRallyPresent * 0.48 + 0.75;
const out = {
  meanContacts: rally.mean,
  meanRallyPresentSec_watch: +meanRallyPresent.toFixed(2),
  betweenPointSec_watch: between,
  perPointSec_watch: +perPointWatch.toFixed(2),
  perPointSec_broadcast: +perPointBroadcast.toFixed(2),
  estBo5Min_v6_legacy: +matchMin(legacyPerPoint, 0).toFixed(1),
  estBo5Min_watch_1x: +matchMin(perPointWatch, 1).toFixed(1),
  estBo5Min_broadcast: +matchMin(perPointBroadcast / 1.35, 1.35).toFixed(1),
  note: 'Bo5 wall-clock estimate from rally mix + pace constants (not a live timer).',
};
console.log(out);
writeFileSync('reports/v7-match-length.json', JSON.stringify(out, null, 2));
