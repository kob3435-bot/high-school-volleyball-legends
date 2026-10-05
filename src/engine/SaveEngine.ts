import type { TeamConfig, Tactics } from './types';
import type { MatchResult } from './StatisticsEngine';

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

export const DEFAULT_SETTINGS: Settings = {
  volume: 0.6, muted: false, gameSpeed: 1, replay: 'important',
  graphics: 'auto', bestOf: 5, language: 'en',
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

export const save = {
  getSettings(): Settings { return { ...DEFAULT_SETTINGS, ...read('settings', {}) }; },
  saveSettings(s: Settings) { write('settings', s); },

  listDreamTeams(): SavedTeam[] { return read('dreamTeams', []); },
  saveDreamTeam(t: SavedTeam) {
    const all = save.listDreamTeams().filter((x) => x.id !== t.id);
    all.unshift(t);
    write('dreamTeams', all.slice(0, 30));
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
