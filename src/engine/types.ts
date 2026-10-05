/** Core shared types for HIGH SCHOOL VOLLEYBALL LEGENDS. */

export type Pos = 'S' | 'OP' | 'OH' | 'MB' | 'L';
export const COURT_SLOTS: Pos[] = ['S', 'OP', 'OH', 'OH', 'MB', 'MB']; // starting six roles
export const ROTATION_ZONES = [1, 2, 3, 4, 5, 6] as const; // zone numbers

export const ATTR_GROUPS = {
  Attack: ['spikePower', 'spikeAccuracy', 'approachSpeed', 'jumpReach', 'crossShot', 'lineShot', 'toolBlock', 'tip', 'backAttack'],
  Setting: ['setAccuracy', 'setSpeed', 'setVariety', 'decisionMaking', 'deception', 'outOfSystem'],
  Serve: ['servePower', 'serveAccuracy', 'jumpServe', 'floatServe', 'targeting'],
  Receive: ['serveReceive', 'dig', 'reaction', 'positioning', 'ballControl'],
  Block: ['blockReach', 'blockTiming', 'blockRead', 'blockCommit', 'closingSpeed'],
  Physical: ['height', 'jump', 'speed', 'acceleration', 'agility', 'strength', 'stamina'],
  Mental: ['iq', 'clutch', 'composure', 'consistency', 'communication', 'adaptability', 'competitive'],
} as const;

export type AttrKey =
  | 'spikePower' | 'spikeAccuracy' | 'approachSpeed' | 'jumpReach' | 'crossShot' | 'lineShot' | 'toolBlock' | 'tip' | 'backAttack'
  | 'setAccuracy' | 'setSpeed' | 'setVariety' | 'decisionMaking' | 'deception' | 'outOfSystem'
  | 'servePower' | 'serveAccuracy' | 'jumpServe' | 'floatServe' | 'targeting'
  | 'serveReceive' | 'dig' | 'reaction' | 'positioning' | 'ballControl'
  | 'blockReach' | 'blockTiming' | 'blockRead' | 'blockCommit' | 'closingSpeed'
  | 'height' | 'jump' | 'speed' | 'acceleration' | 'agility' | 'strength' | 'stamina'
  | 'iq' | 'clutch' | 'composure' | 'consistency' | 'communication' | 'adaptability' | 'competitive';

export const ALL_ATTRS: AttrKey[] = Object.values(ATTR_GROUPS).flat() as AttrKey[];

export type Attributes = Record<AttrKey, number>;

export const ARCHETYPES = [
  'Genius Setter', 'Aggressive Setter', 'Precision Setter',
  'Power Ace', 'Technical Ace', 'Complete Outside', 'Defensive Outside',
  'Speed Middle', 'Read Blocker', 'Commit Blocker', 'Power Middle',
  'Serving Specialist', 'Receive Specialist', 'Guardian Libero',
  'Utility Player', 'Decoy', 'All-Rounder',
] as const;
export type Archetype = typeof ARCHETYPES[number];

export type Tier = 'legend' | 'superstar' | 'star' | 'starter' | 'role';
export type Handedness = 'R' | 'L';

export interface Appearance {
  hairColor: string;
  hairStyle: number; // 0-7
  skinTone: number; // 0-5
  eyeColor: string;
  build: number; // 0 slim .. 1 bulky
  faceId: number;
}

export interface PlayerDef {
  id: string;
  name: string;
  school: string;
  pos: Pos;
  pos2: Pos | null;
  jersey: number;
  heightCm: number;
  weightKg: number;
  overall: number;
  archetype: Archetype;
  tier: Tier;
  handedness: Handedness;
  attrs: Attributes;
  signatures: string[];
  bio: string;
  appearance: Appearance;
}

export interface School {
  id: string;
  name: string;
  short: string;
  primary: string;
  secondary: string;
  accent: string;
  style: string; // play style description
  logoShape: 'shield' | 'circle' | 'diamond' | 'hex' | 'star' | 'crest';
}

export type ServeType = 'standing' | 'float' | 'jumpFloat' | 'jump' | 'powerJump' | 'target';
export type AttackType =
  | 'quickA' | 'quickB' | 'quickC' | 'slide' | 'highBall' | 'open'
  | 'pipe' | 'backAttack' | 'combination' | 'setterDump' | 'tip' | 'cross' | 'line' | 'tool';
export type BlockStyle = 'read' | 'commit' | 'guess' | 'spread' | 'triple';
export type ReceiveQuality = 'perfect' | 'good' | 'medium' | 'poor' | 'error';
export type SetQuality = 'perfect' | 'good' | 'medium' | 'poor' | 'error';

export const OFF_TACTICS = [
  'Balanced', 'Fast Tempo', 'Middle Focus', 'Wing Focus', 'Ace Focus',
  'Combination', 'Back Attack Focus', 'Spread', 'Setter Attack',
] as const;
export type OffTactic = typeof OFF_TACTICS[number];

export const DEF_TACTICS = [
  'Read Blocking', 'Commit Middle', 'Mark Ace', 'Triple Block Ace',
  'Serve Target Weak', 'Deep Defense', 'Cross Defense', 'Line Defense',
] as const;
export type DefTactic = typeof DEF_TACTICS[number];

export interface Tactics {
  offense: OffTactic;
  defense: DefTactic;
  serveTarget: 'auto' | 'zone1' | 'zone5' | 'weak' | 'short' | 'deep' | 'seam';
}

export interface TeamConfig {
  id: string;
  name: string;
  short: string;
  primary: string;
  secondary: string;
  logoSeed: number;
  /** Rotation order zone 1→6 player ids (zone1 = right-back server side) */
  rotation: string[];
  libero: string | null;
  bench: string[];
  tactics: Tactics;
  template?: string;
  isCPU?: boolean;
}

/** Event log — Simulation = Truth */
export type SimEventType =
  | 'matchStart' | 'setStart' | 'setEnd' | 'matchEnd'
  | 'serve' | 'serveError' | 'ace'
  | 'receive' | 'receiveError'
  | 'set' | 'setError' | 'setterDump'
  | 'attack' | 'kill' | 'attackError' | 'blocked'
  | 'block' | 'blockPoint' | 'blockOut' | 'softBlock'
  | 'dig' | 'digError'
  | 'cover' | 'transition'
  | 'netTouch' | 'rotationError' | 'ballOut'
  | 'sideOut' | 'point'
  | 'timeout' | 'substitution' | 'liberoSwap'
  | 'momentum' | 'signature' | 'commentary'
  | 'rallyStart' | 'rallyEnd';

export interface SimEvent {
  type: SimEventType;
  team?: 0 | 1;
  player?: string;
  player2?: string;
  kind?: string;
  zone?: number;
  quality?: number | string;
  success?: boolean;
  score?: [number, number];
  set?: number;
  text?: string;
  data?: Record<string, unknown>;
  t?: number; // sim time ms
}

export interface PlayerMatchStats {
  id: string;
  pts: number;
  kills: number;
  attempts: number;
  attackErrors: number;
  aces: number;
  serveErrors: number;
  serveAttempts: number;
  blocks: number; // stuff blocks (points)
  blockTouches: number;
  digs: number;
  digAttempts: number;
  receptions: number;
  receptionErrors: number;
  perfectReceptions: number;
  assists: number;
  setAttempts: number;
  setErrors: number;
  dumps: number;
  dumpKills: number;
  quickAttempts: number;
  wingAttempts: number;
  oppositeAttempts: number;
  backAttempts: number;
  perfectSets: number;
}

export interface TeamMatchStats {
  points: number;
  kills: number;
  attempts: number;
  attackErrors: number;
  aces: number;
  serveErrors: number;
  blocks: number;
  digs: number;
  receptionErrors: number;
  receptions: number;
  perfectReceptions: number;
  assists: number;
  setErrors: number;
  sideOuts: number;
  sideOutChances: number;
  breakPoints: number;
  breakChances: number;
}

export type BestOf = 3 | 5;
