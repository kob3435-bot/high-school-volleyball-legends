import type { Attributes, PlayerDef, Pos, Appearance } from './types';
import { ALL_ATTRS } from './types';
import { SIG_ATTR_HINTS } from './signatures';
import { clamp } from './rng';

export interface RuntimePlayer {
  def: PlayerDef;
  id: string;
  name: string;
  pos: Pos;
  jersey: number;
  heightCm: number;
  attrs: Attributes;
  signatures: string[];
  handedness: 'R' | 'L';
  appearance: Appearance;
  /** Live state */
  stamina: number; // 0-100
  mood: number; // -50..50 (ACE_MODE / MOOD_SWING)
  hotCold: number; // streak
  fatigue: number;
  onCourt: boolean;
  zone: number; // 1-6, 0 = bench/libero off
  isLibero: boolean;
  isFrontRow: boolean;
}

export function computeOverall(attrs: Attributes, pos: Pos, tier?: import('./types').Tier): number {
  const w: Partial<Record<keyof Attributes, number>> = {};
  if (pos === 'S') {
    Object.assign(w, { setAccuracy: 2.2, setSpeed: 1.7, decisionMaking: 1.6, deception: 1.1, serveAccuracy: 0.9, servePower: 0.7, jumpServe: 0.6, iq: 1.4, communication: 1 });
  } else if (pos === 'MB') {
    Object.assign(w, { jumpReach: 1.6, blockTiming: 1.5, blockRead: 1.3, approachSpeed: 1.4, spikePower: 1.1, speed: 1.2, jump: 1.4, blockReach: 1.1 });
  } else if (pos === 'OP') {
    Object.assign(w, { spikePower: 2.2, spikeAccuracy: 1.6, jumpReach: 1.4, backAttack: 1.3, clutch: 1.1, jump: 1.1, servePower: 0.7 });
  } else if (pos === 'OH') {
    Object.assign(w, { spikePower: 1.5, spikeAccuracy: 1.4, serveReceive: 1.3, dig: 1, servePower: 0.9, jump: 1.1, consistency: 1, crossShot: 0.7, lineShot: 0.7 });
  } else if (pos === 'L') {
    Object.assign(w, { serveReceive: 2.2, dig: 2.2, reaction: 1.6, positioning: 1.5, ballControl: 1.4, agility: 1.3 });
  }
  let sum = 0, tw = 0;
  for (const k of ALL_ATTRS) {
    const weight = w[k] ?? 0.12;
    sum += attrs[k] * weight;
    tw += weight;
  }
  let ovr = Math.round(sum / tw);
  // Tier bands: legends/stars clearly above role players
  if (tier === 'legend') ovr = Math.max(ovr + 5, 91);
  else if (tier === 'superstar') ovr = Math.max(ovr + 3, 86);
  else if (tier === 'star') ovr = Math.max(ovr + 2, 80);
  else if (tier === 'starter') ovr = Math.min(Math.max(ovr, 74), 86);
  else if (tier === 'role') ovr = Math.min(ovr, 76);
  return clamp(ovr, 40, 99);
}

export function makeRuntime(def: PlayerDef): RuntimePlayer {
  const attrs = { ...def.attrs };
  for (const sig of def.signatures) {
    const hints = SIG_ATTR_HINTS[sig];
    if (hints) for (const [k, v] of Object.entries(hints)) {
      attrs[k as keyof Attributes] = clamp(attrs[k as keyof Attributes] + (v as number), 1, 99);
    }
  }
  return {
    def, id: def.id, name: def.name, pos: def.pos, jersey: def.jersey,
    heightCm: def.heightCm, attrs, signatures: def.signatures.slice(),
    handedness: def.handedness, appearance: def.appearance,
    stamina: 100, mood: 0, hotCold: 0, fatigue: 0,
    onCourt: false, zone: 0, isLibero: false, isFrontRow: false,
  };
}

export function effective(p: RuntimePlayer, key: keyof Attributes, clutchFactor = 0): number {
  let v = p.attrs[key];
  // stamina drain
  if (p.stamina < 50) v -= (50 - p.stamina) * 0.15;
  // mood (ACE_MODE)
  if (p.signatures.includes('ACE_MODE') || p.signatures.includes('MOOD_SWING')) {
    v += p.mood * 0.12;
  }
  // hot/cold
  v += clamp(p.hotCold, -5, 5) * 0.8;
  // clutch
  if (clutchFactor > 0) v += (p.attrs.clutch - 70) * 0.08 * clutchFactor;
  // NO_MISTAKES consistency floor
  if (p.signatures.includes('NO_MISTAKES') && (key === 'consistency' || key === 'composure')) v += 5;
  return clamp(v, 1, 99);
}

export function drainStamina(p: RuntimePlayer, amount: number) {
  const rec = p.attrs.stamina / 100;
  p.stamina = clamp(p.stamina - amount * (1.3 - rec * 0.6), 0, 100);
}

export function restPlayer(p: RuntimePlayer, amount: number) {
  p.stamina = clamp(p.stamina + amount, 0, 100);
}
