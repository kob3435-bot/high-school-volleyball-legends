import { createContext } from 'preact';
import { save, type Settings } from '../engine/SaveEngine';
import type { TeamConfig, Tactics } from '../engine/types';
import type { MatchResult } from '../engine/StatisticsEngine';

export type Screen =
  | { name: 'home' }
  | { name: 'players' }
  | { name: 'builder'; mode: string; schoolId?: string }
  | { name: 'opponent'; team: TeamConfig; mode: string }
  | { name: 'preview'; team: TeamConfig; opponent: TeamConfig; mode: string; seed: number }
  | { name: 'live'; team: TeamConfig; opponent: TeamConfig; mode: string; seed: number }
  | { name: 'results'; result: MatchResult; team: TeamConfig; opponent: TeamConfig; mode: string; seed: number }
  | { name: 'dreams' }
  | { name: 'tournament' }
  | { name: 'history' }
  | { name: 'settings' }
  | { name: 'watch' }
  | { name: 'challenge' };

export interface AppCtx {
  nav: (s: Screen, replace?: boolean) => void;
  back: () => void;
  home: () => void;
  root: (s: Screen) => void;
  settings: Settings;
  setSettings: (s: Settings) => void;
  toast: (m: string) => void;
}

export const Ctx = createContext<AppCtx>(null as unknown as AppCtx);
export { save };

export const defaultTactics = (): Tactics => ({
  offense: 'Balanced', defense: 'Read Blocking', serveTarget: 'auto',
});
