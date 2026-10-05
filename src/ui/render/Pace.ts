/** Visual pacing for courtside watch mode. Sim stays truthful; only presentation stretches. */

export type PacePreset = 'broadcast' | 'watch' | '2x' | '4x';

export interface PaceConfig {
  /** Multiplier on contact beats + between-point (1 = watch/1x) */
  scale: number;
  /** Wall-clock sim advance when idle (1/2/4) */
  simSpeed: 1 | 2 | 4;
  label: string;
}

export const PACE: Record<PacePreset, PaceConfig> = {
  broadcast: { scale: 1.35, simSpeed: 1, label: 'Broadcast' },
  watch: { scale: 1.0, simSpeed: 1, label: '1x' },
  '2x': { scale: 0.55, simSpeed: 2, label: '2x' },
  '4x': { scale: 0.32, simSpeed: 4, label: '4x' },
};

/** Base contact beats at watch/1x (seconds of presentation time). */
export const BASE_BEAT: Record<string, number> = {
  serve: 1.85,       // bounce + toss + hit
  receive: 1.15,
  set: 1.35,
  attack: 1.15,
  kill: 1.35,
  block: 0.95,
  softBlock: 1.05,
  blockPoint: 1.4,
  dig: 1.25,
  transition: 0.65,
  cover: 0.45,
  ace: 1.6,
  setterDump: 1.2,
  signature: 0.7,
  rallyEnd: 0.9,
  point: 0.85,
  rallyStart: 0.45,
  setEnd: 0.5,
  setStart: 0.4,
  timeout: 0.3,
};

/** Between-point ritual at watch/1x (whistle, score, walk reset, server ready). */
export const BETWEEN_POINT_BASE = 1.65;
export const BETWEEN_POINT_PER_TOUCH = 0.03;
export const BETWEEN_POINT_MAX_EXTRA = 0.45;

/** Set break overlay duration at watch/1x */
export const SET_BREAK_BASE = 11;

/** Timeout / huddle minimum at watch/1x */
export const TIMEOUT_BASE = 17;

export function beatFor(type: string, scale: number): number {
  const b = BASE_BEAT[type] ?? 0.25;
  return b * scale;
}

export function betweenPointSec(touches: number, scale: number): number {
  const extra = Math.min(BETWEEN_POINT_MAX_EXTRA, touches * BETWEEN_POINT_PER_TOUCH);
  return (BETWEEN_POINT_BASE + extra) * scale;
}
