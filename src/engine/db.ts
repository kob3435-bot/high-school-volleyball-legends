import type { PlayerDef, School } from './types';
import playersData from '../data/players.json';
import { SCHOOLS } from '../data/schools';

const players = playersData as PlayerDef[];
const byId = new Map(players.map((p) => [p.id, p]));
const bySchool = new Map<string, PlayerDef[]>();
for (const p of players) {
  const list = bySchool.get(p.school) ?? [];
  list.push(p);
  bySchool.set(p.school, list);
}

export function getPlayer(id: string): PlayerDef | undefined { return byId.get(id); }
export function allPlayers(): PlayerDef[] { return players; }
export function playersBySchool(schoolId: string): PlayerDef[] { return bySchool.get(schoolId) ?? []; }
export function allSchools(): School[] { return SCHOOLS; }
export function getSchool(id: string): School | undefined { return SCHOOLS.find((s) => s.id === id); }
export function legendPool(): PlayerDef[] { return players.filter((p) => p.school === 'legend'); }
