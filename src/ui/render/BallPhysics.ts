/** Court-space ball flight with gravity + spin. Units: metres, seconds. Court x 0-18, y 0-9, z up. */

export type Spin = 'none' | 'float' | 'topspin' | 'spike' | 'serve';

export interface Vec3 { x: number; y: number; z: number }

export interface Flight {
  p0: Vec3;
  p1: Vec3;
  dur: number;
  t: number;
  spin: Spin;
  /** Extra apex (m) beyond linear z lerp — gravity parabola height */
  apex: number;
  /** Horizontal wobble strength (float serve) */
  wobble: number;
  /** Topspin: pulls z down mid-flight */
  dip: number;
}

const G = 9.81;

/** Duration for a ballistic hop covering horizontal distance with given apex preference. */
export function flightDuration(p0: Vec3, p1: Vec3, spin: Spin): number {
  const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  const dz = Math.abs(p1.z - p0.z);
  let speed = 7.2; // m/s typical pass (watch pace)
  if (spin === 'spike') speed = 16;
  else if (spin === 'serve') speed = 12;
  else if (spin === 'topspin') speed = 11;
  else if (spin === 'float') speed = 9.5;
  else if (dist < 4) speed = 7; // set
  const base = Math.max(0.22, dist / speed + dz * 0.05);
  if (spin === 'spike') return Math.max(0.28, Math.min(0.85, base * 1.25));
  if (spin === 'serve') return Math.max(0.7, Math.min(1.9, base * 1.3));
  return Math.max(0.42, Math.min(2.1, base * 1.3));
}

export function makeFlight(p0: Vec3, p1: Vec3, spin: Spin, durOverride?: number): Flight {
  const dur = durOverride ?? flightDuration(p0, p1, spin);
  const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  let apex = 0.35 + dist * 0.06;
  let wobble = 0;
  let dip = 0;
  if (spin === 'float') { wobble = 1; apex = 0.45 + dist * 0.04; }
  if (spin === 'topspin') { dip = 0.55; apex = 0.25 + dist * 0.03; }
  if (spin === 'spike') { apex = 0.08; dip = 0.15; }
  if (spin === 'serve') { apex = 0.6 + dist * 0.05; wobble = spin === 'serve' ? 0.15 : 0; }
  if (spin === 'none' && p1.z > p0.z + 0.5) apex = Math.max(apex, (p1.z - p0.z) * 0.35);
  return { p0: { ...p0 }, p1: { ...p1 }, dur, t: 0, spin, apex, wobble, dip };
}

/** Sample position along flight at time fraction u∈[0,1] with gravity parabola + spin. */
export function sampleFlight(f: Flight, uRaw?: number): Vec3 {
  const u = Math.max(0, Math.min(1, uRaw ?? f.t / Math.max(1e-6, f.dur)));
  // Horizontal lerp
  let x = f.p0.x + (f.p1.x - f.p0.x) * u;
  let y = f.p0.y + (f.p1.y - f.p0.y) * u;
  // Vertical: linear between endpoints + gravity arc (sin) + topspin dip
  const zLin = f.p0.z + (f.p1.z - f.p0.z) * u;
  const arc = Math.sin(u * Math.PI) * f.apex;
  const dip = f.dip * (u * u); // accelerating drop
  let z = Math.max(0.08, zLin + arc - dip);
  if (f.wobble > 0) {
    const w = f.wobble * (0.55 + 0.45 * Math.sin(u * Math.PI)); // peak mid-flight
    x += Math.sin(u * 22 + f.p0.x) * 0.14 * w;
    y += Math.cos(u * 17 + f.p0.y) * 0.10 * w;
  }
  return { x, y, z };
}

/** Advance flight by dt; returns done. */
export function stepFlight(f: Flight, dt: number): { pos: Vec3; done: boolean } {
  f.t = Math.min(f.dur, f.t + dt);
  const pos = sampleFlight(f);
  return { pos, done: f.t >= f.dur - 1e-4 };
}

/** Contact hand height (m) by action + player jump attr 0-100. */
export function contactHeight(kind: string, heightCm: number, jumpAttr: number): number {
  const reach = heightCm / 100 * 1.25 + (jumpAttr / 100) * 0.85;
  switch (kind) {
    case 'receive': case 'dig': case 'cover': return 0.75 + (jumpAttr / 100) * 0.15;
    case 'dive': return 0.35;
    case 'set': return Math.min(2.55, 1.85 + (jumpAttr / 100) * 0.55);
    case 'jumpSet': return Math.min(2.85, 2.15 + (jumpAttr / 100) * 0.55);
    case 'spike': case 'quickSpike': case 'backAttack': return Math.min(3.45, 2.55 + (jumpAttr / 100) * 0.85);
    case 'tip': case 'dump': return Math.min(2.9, 2.2 + (jumpAttr / 100) * 0.4);
    case 'block': case 'eyeTrack': return Math.min(3.35, 2.6 + (jumpAttr / 100) * 0.7);
    case 'serve': return 2.15;
    case 'jumpServe': case 'jumpFloat': return Math.min(3.15, 2.4 + (jumpAttr / 100) * 0.65);
    default: return 1.5;
  }
}

/** Time from takeoff to jump apex for a given jump height (m). */
export function timeToApex(jumpH: number): number {
  // v^2 = 2gh => t = v/g = sqrt(2h/g)
  return Math.sqrt(Math.max(0.05, 2 * jumpH / G));
}

export function jumpHeightFromAttr(jumpAttr: number, kind: string): number {
  const base = 0.35 + (jumpAttr / 100) * 0.55;
  if (kind.includes('spike') || kind === 'backAttack' || kind === 'block' || kind === 'eyeTrack') return base + 0.15;
  if (kind.includes('Serve') || kind === 'jumpServe' || kind === 'jumpFloat') return base + 0.05;
  if (kind === 'jumpSet') return base * 0.7;
  return 0.05;
}

/** Estimate hand offset in court XY from facing + anim (metres from feet). */
export function handOffset(kind: string, facing: number, team: 0 | 1): { dx: number; dy: number } {
  const towardNet = team === 0 ? 1 : -1;
  switch (kind) {
    case 'spike': case 'quickSpike': case 'backAttack': case 'tip':
      return { dx: towardNet * 0.45, dy: 0 };
    case 'block': case 'eyeTrack':
      return { dx: towardNet * 0.35, dy: 0 };
    case 'set': case 'jumpSet':
      return { dx: 0, dy: 0 };
    case 'receive': case 'dig':
      return { dx: towardNet * 0.2, dy: 0 };
    case 'dive':
      return { dx: towardNet * 0.8, dy: 0 };
    case 'serve': case 'jumpServe': case 'jumpFloat':
      return { dx: towardNet * 0.35, dy: 0 };
    default:
      return { dx: facing * 0.2, dy: 0 };
  }
}
