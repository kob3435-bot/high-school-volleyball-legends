import type { TeamConfig, Tactics } from './types';
import type { MatchResult } from './StatisticsEngine';
import { getPlayer } from './db';

const PREFIX = 'hsvl_v1_';

export interface Settings {
  volume: number;
  muted: boolean;
  gameSpeed: 1 | 2 | 4;
  replay: 'on' | 'important' | 'off';
  graphics: 'low' | 'medium' | 'high' | 'ultra' | 'auto';
  bestOf: 3 | 5;
  language: 'en' | 'th';
}

function detectDefaultLang(): 'en' | 'th' {
  try {
    if (typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().startsWith('th')) return 'th';
  } catch { /* */ }
  return 'en';
}

export const DEFAULT_SETTINGS: Settings = {
  volume: 0.6, muted: false, gameSpeed: 1, replay: 'important',
  graphics: 'auto', bestOf: 5, language: detectDefaultLang(),
};

export interface SavedTeam {
  id: string;
  name: string;
  created: number;
  config: TeamConfig;
}

export interface HistoryEntry {
  id: string;
  ts: number;
  result: MatchResult;
}

export interface TournamentSave {
  id: string;
  ts?: number;
  seed?: number;
  matches?: unknown;
  bracket?: unknown;
  userTeamId: string;
  currentMatch?: number;
  [key: string]: unknown;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch { return fallback; }
}
function write(key: string, val: unknown) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); } catch { /* quota */ }
}


/** Drop unknown player ids from saved dream teams so old saves never crash. */
function migrateDreamTeams(teams: SavedTeam[]): SavedTeam[] {
  const out: SavedTeam[] = [];
  for (const team of teams) {
    if (!team?.config) continue;
    const cfg = { ...team.config };
    const rot = (cfg.rotation || []).filter((id) => !!getPlayer(id));
    const bench = (cfg.bench || []).filter((id) => !!getPlayer(id));
    let libero = cfg.libero && getPlayer(cfg.libero) ? cfg.libero : null;
    if (!libero) {
      const lib = [...rot, ...bench].map((id) => getPlayer(id)).find((p) => p?.pos === 'L');
      libero = lib?.id ?? null;
    }
    if (rot.length < 6) continue; // unrecoverable — ignore
    cfg.rotation = rot.slice(0, 6);
    cfg.bench = bench;
    cfg.libero = libero;
    // Refresh display names from current roster
    cfg.name = cfg.name || team.name;
    out.push({ ...team, config: cfg });
  }
  return out;
}

export const save = {
  getSettings(): Settings { return { ...DEFAULT_SETTINGS, ...read('settings', {}) }; },
  saveSettings(s: Settings) { write('settings', s); },

  listDreamTeams(): SavedTeam[] {
    const raw = read<SavedTeam[]>('dreamTeams', []);
    const cleaned = migrateDreamTeams(raw);
    if (cleaned.length !== raw.length) write('dreamTeams', cleaned);
    return cleaned;
  },
  saveDreamTeam(t: SavedTeam) {
    const all = save.listDreamTeams().filter((x) => x.id !== t.id);
    all.unshift(migrateDreamTeams([t])[0] ?? t);
    write('dreamTeams', all.filter(Boolean).slice(0, 30));
  },
  deleteDreamTeam(id: string) {
    write('dreamTeams', save.listDreamTeams().filter((x) => x.id !== id));
  },

  listHistory(): HistoryEntry[] { return read('history', []); },
  pushHistory(result: MatchResult) {
    const entry: HistoryEntry = { id: `h_${Date.now()}`, ts: Date.now(), result };
    const all = save.listHistory();
    all.unshift(entry);
    write('history', all.slice(0, 50));
    return entry.id;
  },

  getTournament(): TournamentSave | null { return read('tournament', null); },
  saveTournament(t: TournamentSave) { write('tournament', t); },
  clearTournament() { write('tournament', null); },

  getSchoolProgress(): Record<string, unknown> { return read('school', {}); },
  saveSchoolProgress(p: Record<string, unknown>) { write('school', p); },
};

export type { Tactics };
