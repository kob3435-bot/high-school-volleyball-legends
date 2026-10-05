import type { TeamConfig, Tactics, Pos } from './types';
import { DEFAULT_TACTICS } from './TacticalEngine';
import { getSchool, playersBySchool, allPlayers, getPlayer } from './db';
import { hashString } from './rng';

/** Build a legal school team: S, OP, 2OH, 2MB + libero + subs. */
export function buildSchoolTeam(schoolId: string, tactics?: Partial<Tactics>): TeamConfig {
  const school = getSchool(schoolId);
  if (!school) throw new Error(`Unknown school ${schoolId}`);
  const pool = playersBySchool(schoolId).slice().sort((a, b) => b.overall - a.overall);
  const take = (pos: Pos, n: number) => {
    const got: string[] = [];
    for (const p of pool) {
      if (got.length >= n) break;
      if (p.pos === pos && !used.has(p.id)) { got.push(p.id); used.add(p.id); }
    }
    return got;
  };
  const used = new Set<string>();
  const s = take('S', 1);
  const op = take('OP', 1);
  const oh = take('OH', 2);
  const mb = take('MB', 2);
  const lib = take('L', 1);
  // Fill gaps from any remaining
  const need = 6 - (s.length + op.length + oh.length + mb.length);
  if (need > 0) {
    for (const p of pool) {
      if (used.has(p.id) || p.pos === 'L') continue;
      if (s.length + op.length + oh.length + mb.length >= 6) break;
      if (p.pos === 'S' && !s.length) { s.push(p.id); used.add(p.id); }
      else if (p.pos === 'OP' && !op.length) { op.push(p.id); used.add(p.id); }
      else if (p.pos === 'OH' && oh.length < 2) { oh.push(p.id); used.add(p.id); }
      else if (p.pos === 'MB' && mb.length < 2) { mb.push(p.id); used.add(p.id); }
      else if ([...s, ...op, ...oh, ...mb].length < 6) { oh.push(p.id); used.add(p.id); }
    }
  }
  // Rotation: zone1=server(RB), z2=RF, z3=middle front, z4=LF, z5=LB, z6=MB back
  // Standard: OH, MB, OP, OH, MB, S  or similar — put setter in zone 1 initially (serve first option)
  const rotation = [
    s[0] ?? oh[0],
    op[0] ?? oh[0],
    mb[0] ?? oh[1],
    oh[0] ?? op[0],
    mb[1] ?? mb[0],
    oh[1] ?? s[0],
  ].filter(Boolean) as string[];
  // Ensure unique 6
  const uniq: string[] = [];
  for (const id of rotation) if (id && !uniq.includes(id)) uniq.push(id);
  for (const p of pool) {
    if (uniq.length >= 6) break;
    if (!uniq.includes(p.id) && p.pos !== 'L') uniq.push(p.id);
  }
  const bench = pool.filter((p) => !uniq.includes(p.id) && p.id !== lib[0]).slice(0, 6).map((p) => p.id);

  return {
    id: `school_${schoolId}`,
    name: school.name,
    short: school.short,
    primary: school.primary,
    secondary: school.secondary,
    logoSeed: hashString(schoolId),
    rotation: uniq.slice(0, 6),
    libero: lib[0] ?? null,
    bench,
    tactics: { ...DEFAULT_TACTICS, ...tactics },
    template: schoolId,
  };
}

export function buildDreamTeam(
  name: string,
  playerIds: string[],
  liberoId: string | null,
  tactics?: Partial<Tactics>,
  colors?: { primary: string; secondary: string },
): TeamConfig {
  const starters = playerIds.slice(0, 6);
  const bench = playerIds.slice(6).filter((id) => id !== liberoId);
  return {
    id: `dream_${hashString(name + starters.join())}`,
    name, short: name.slice(0, 3).toUpperCase(),
    primary: colors?.primary ?? '#1a1a2e',
    secondary: colors?.secondary ?? '#e94560',
    logoSeed: hashString(name),
    rotation: starters,
    libero: liberoId,
    bench,
    tactics: { ...DEFAULT_TACTICS, ...tactics },
  };
}

export function randomTeam(seed: number): TeamConfig {
  const schools = ['karasawa','nekoma','aoba','shiratori','inari','fukuro','date','kamome','mujina','itachi',
    'tsubame','ookami','ryu','hokuto','minami','shiro'];
  const id = schools[seed % schools.length];
  const t = buildSchoolTeam(id);
  t.isCPU = true;
  return t;
}

export function allStarTeam(side: 'east' | 'west' | 'legend'): TeamConfig {
  const all = allPlayers().filter((p) => p.tier === 'legend' || p.tier === 'superstar');
  const pick = (pos: Pos) => all.filter((p) => p.pos === pos).sort((a, b) => b.overall - a.overall);
  const s = pick('S')[0];
  const op = pick('OP')[0];
  const ohs = pick('OH');
  const mbs = pick('MB');
  const l = pick('L')[0];
  const ids = [s, op, ohs[0], ohs[1], mbs[0], mbs[1]].filter(Boolean).map((p) => p!.id);
  return buildDreamTeam(
    side === 'legend' ? 'Legend All-Stars' : side === 'east' ? 'East All-Stars' : 'West All-Stars',
    ids, l?.id ?? null,
    { offense: 'Fast Tempo', defense: 'Read Blocking' },
    { primary: '#111', secondary: '#ffd700' },
  );
}

export function validateLineup(rotation: string[], libero: string | null): string[] {
  const errs: string[] = [];
  if (rotation.length !== 6) errs.push('Need 6 starters');
  if (new Set(rotation).size !== 6) errs.push('Duplicate starters');
  if (libero && rotation.includes(libero)) errs.push('Libero cannot be in starting six');
  const positions = rotation.map((id) => getPlayer(id)?.pos);
  if (!positions.includes('S')) errs.push('Need a setter');
  return errs;
}
