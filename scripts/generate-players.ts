/** Generate players.json with named stars + fillers for 32 schools. */
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Attributes, PlayerDef, Pos, Archetype, Appearance, Tier, Handedness } from '../src/engine/types';
import { ALL_ATTRS } from '../src/engine/types';
import { computeOverall } from '../src/engine/Player';
import { RNG, clamp, hashString } from '../src/engine/rng';

const __dir = dirname(fileURLToPath(import.meta.url));

function baseAttrs(n = 70): Attributes {
  const a = {} as Attributes;
  for (const k of ALL_ATTRS) a[k] = n;
  return a;
}

function apply(a: Attributes, partial: Partial<Attributes>): Attributes {
  const o = { ...a };
  for (const [k, v] of Object.entries(partial)) o[k as keyof Attributes] = clamp(v as number, 1, 99);
  return o;
}

function appearance(seed: number): Appearance {
  const r = new RNG(seed);
  const hairs = ['#1a1a1a', '#2c1810', '#4a3728', '#6b4423', '#c4a35a', '#e8e8e8', '#ff6b35', '#1e3a5f'];
  const eyes = ['#2c1810', '#4a90a4', '#3d5a3d', '#5c3317', '#1a1a2e', '#8b4513'];
  return {
    hairColor: hairs[r.int(0, hairs.length - 1)],
    hairStyle: r.int(0, 7),
    skinTone: r.int(0, 5),
    eyeColor: eyes[r.int(0, eyes.length - 1)],
    build: r.range(0.2, 0.85),
    faceId: r.int(0, 11),
  };
}

interface Spec {
  id: string; name: string; school: string; pos: Pos; pos2?: Pos | null;
  jersey: number; heightCm: number; weightKg?: number;
  archetype: Archetype; tier: Tier; handedness?: Handedness;
  attrs: Partial<Attributes>; signatures?: string[]; bio?: string;
}

const NAMED: Spec[] = [
  // KARASAWA
  { id: 'hinataki', name: 'Sho Hinataki', school: 'karasawa', pos: 'MB', pos2: 'OH', jersey: 10, heightCm: 164,
    archetype: 'Speed Middle', tier: 'legend',
    attrs: { speed: 99, jump: 98, approachSpeed: 99, reaction: 96, spikePower: 82, spikeAccuracy: 85, jumpReach: 78, height: 55, serveReceive: 62, dig: 70, agility: 97, acceleration: 98, competitive: 99 },
    signatures: ['FREAK_QUICK', 'ULTIMATE_DECOY', 'BOOM_JUMP'], bio: 'Smallest giant. Explodes past the block.' },
  { id: 'kagehara', name: 'Tobi Kagehara', school: 'karasawa', pos: 'S', jersey: 9, heightCm: 186,
    archetype: 'Genius Setter', tier: 'legend',
    attrs: { setAccuracy: 99, setSpeed: 99, setVariety: 96, decisionMaking: 97, deception: 95, servePower: 94, serveAccuracy: 92, jumpServe: 93, blockReach: 87, blockTiming: 86, iq: 96, communication: 90, spikePower: 78 },
    signatures: ['KINGS_TOSS', 'PINPOINT_QUICK', 'SETTER_DUMP'], bio: 'The king of the court. Sees three plays ahead.' },
  { id: 'sawada', name: 'Daichi Sawada', school: 'karasawa', pos: 'OH', jersey: 1, heightCm: 180,
    archetype: 'Defensive Outside', tier: 'star',
    attrs: { serveReceive: 94, dig: 92, consistency: 96, composure: 94, communication: 95, spikePower: 80, spikeAccuracy: 84, serveAccuracy: 85, iq: 90, competitive: 92 },
    signatures: ['CAPTAINS_STABILITY'], bio: 'Captain. The wall that holds the team together.' },
  { id: 'sugihara', name: 'Koshi Sugihara', school: 'karasawa', pos: 'S', jersey: 5, heightCm: 178,
    archetype: 'Precision Setter', tier: 'star',
    attrs: { setAccuracy: 90, setSpeed: 88, communication: 97, adaptability: 94, decisionMaking: 91, serveReceive: 82, iq: 92 },
    signatures: ['TEAM_RHYTHM'], bio: 'Rhythm keeper. Makes everyone better.' },
  { id: 'azuma', name: 'Asahi Azuma', school: 'karasawa', pos: 'OH', jersey: 3, heightCm: 186,
    archetype: 'Power Ace', tier: 'superstar',
    attrs: { spikePower: 96, jump: 91, servePower: 90, jumpServe: 88, spikeAccuracy: 88, jumpReach: 90, crossShot: 86, lineShot: 84, clutch: 82, composure: 75 },
    signatures: ['ACE_CANNON'], bio: 'Ace cannon. When he fires, the gym shakes.' },
  { id: 'nishino', name: 'Yu Nishino', school: 'karasawa', pos: 'L', jersey: 4, heightCm: 172,
    archetype: 'Guardian Libero', tier: 'legend',
    attrs: { dig: 98, reaction: 99, agility: 98, serveReceive: 96, positioning: 95, ballControl: 97, speed: 92, consistency: 94 },
    signatures: ['GUARDIAN_DEITY'], bio: 'Guardian deity. Balls that should die, live.' },
  { id: 'tsukino', name: 'Kei Tsukino', school: 'karasawa', pos: 'MB', jersey: 11, heightCm: 195,
    archetype: 'Read Blocker', tier: 'superstar',
    attrs: { blockRead: 98, blockTiming: 96, blockReach: 94, iq: 99, closingSpeed: 90, spikePower: 84, spikeAccuracy: 86, approachSpeed: 82, composure: 93 },
    signatures: ['READ_BLOCK'], bio: 'Reads setters like open books.' },
  { id: 'yamada_t', name: 'Tadashi Yamada', school: 'karasawa', pos: 'MB', jersey: 12, heightCm: 183,
    archetype: 'Serving Specialist', tier: 'starter',
    attrs: { floatServe: 94, serveAccuracy: 90, servePower: 82, targeting: 88, spikePower: 78, blockTiming: 80, serveReceive: 75 },
    signatures: ['PRESSURE_FLOAT'], bio: 'Pressure float specialist.' },
  { id: 'tanabe', name: 'Ryu Tanabe', school: 'karasawa', pos: 'OH', jersey: 7, heightCm: 182,
    archetype: 'Technical Ace', tier: 'star',
    attrs: { spikePower: 91, clutch: 94, competitive: 97, crossShot: 93, lineShot: 88, spikeAccuracy: 90, composure: 88, mental: 90 } as Partial<Attributes>,
    signatures: ['SUPER_INNER_CROSS'], bio: 'Clutch cross-court artist.' },

  // NEKOMA EAST
  { id: 'kozawa', name: 'Kenma Kozawa', school: 'nekoma', pos: 'S', jersey: 5, heightCm: 175,
    archetype: 'Genius Setter', tier: 'legend',
    attrs: { iq: 99, decisionMaking: 99, deception: 97, setAccuracy: 94, setSpeed: 88, setVariety: 96, communication: 85, composure: 96, stamina: 70 },
    signatures: ['COURT_ANALYSIS'], bio: 'Brain of the team. Never wastes a set.' },
  { id: 'kurosawa', name: 'Tetsu Kurosawa', school: 'nekoma', pos: 'MB', jersey: 1, heightCm: 188,
    archetype: 'Read Blocker', tier: 'superstar',
    attrs: { blockRead: 95, blockTiming: 95, iq: 98, closingSpeed: 92, spikePower: 86, communication: 94, competitive: 96 },
    signatures: ['FUNNEL_BLOCK'], bio: 'Funnel block captain. Channels spikes to diggers.' },
  { id: 'yakushi', name: 'Mori Yakushi', school: 'nekoma', pos: 'L', jersey: 6, heightCm: 174,
    archetype: 'Guardian Libero', tier: 'superstar',
    attrs: { serveReceive: 97, dig: 98, reaction: 95, positioning: 96, ballControl: 94, agility: 93 },
    signatures: [], bio: 'Cat-like libero. Endless rallies.' },
  { id: 'tora', name: 'Tora Yamada', school: 'nekoma', pos: 'OH', jersey: 7, heightCm: 183,
    archetype: 'Power Ace', tier: 'star',
    attrs: { spikePower: 92, spikeAccuracy: 86, jump: 88, servePower: 85, competitive: 94, approachSpeed: 87 },
    signatures: [], bio: 'Power wing with a temper.' },
  { id: 'haido', name: 'Lev Haido', school: 'nekoma', pos: 'MB', jersey: 11, heightCm: 201,
    archetype: 'Power Middle', tier: 'star',
    attrs: { height: 99, jump: 94, jumpReach: 96, spikePower: 88, blockReach: 93, approachSpeed: 80, serveReceive: 55, iq: 68 },
    signatures: [], bio: 'Tall athletic project with huge upside.' },
  { id: 'fukuda', name: 'Sho Fukuda', school: 'nekoma', pos: 'OH', jersey: 4, heightCm: 178,
    archetype: 'Technical Ace', tier: 'starter',
    attrs: { spikeAccuracy: 90, tip: 92, toolBlock: 88, crossShot: 87, serveReceive: 86, dig: 84 },
    signatures: [], bio: 'Technical spiker. Tips and tools.' },

  // AOBA SEIJO
  { id: 'oikawa', name: 'Toru Oikawa', school: 'aoba', pos: 'S', jersey: 1, heightCm: 184,
    archetype: 'Aggressive Setter', tier: 'legend',
    attrs: { setAccuracy: 98, setSpeed: 95, servePower: 98, serveAccuracy: 96, jumpServe: 97, targeting: 97, iq: 98, deception: 96, decisionMaking: 97, communication: 94, competitive: 99 },
    signatures: ['HUNDRED_SPIKER', 'TARGET_SERVE'], bio: 'Grand king. Serve pressure incarnate.' },
  { id: 'iwasaki', name: 'Hajime Iwasaki', school: 'aoba', pos: 'OH', jersey: 4, heightCm: 185,
    archetype: 'Complete Outside', tier: 'superstar',
    attrs: { spikePower: 94, serveReceive: 90, dig: 88, mental: 96, consistency: 94, composure: 96, spikeAccuracy: 91, jump: 90, clutch: 92 } as Partial<Attributes>,
    signatures: [], bio: 'Complete ace. No holes in his game.' },
  { id: 'matsuda', name: 'Issei Matsuda', school: 'aoba', pos: 'MB', jersey: 2, heightCm: 192,
    archetype: 'Read Blocker', tier: 'star',
    attrs: { blockRead: 93, blockTiming: 91, blockReach: 90, iq: 90, spikePower: 84 },
    signatures: [], bio: 'Reliable read blocker.' },
  { id: 'hanada', name: 'Taka Hanada', school: 'aoba', pos: 'OH', jersey: 7, heightCm: 180,
    archetype: 'Defensive Outside', tier: 'starter',
    attrs: { serveReceive: 88, dig: 86, spikePower: 82, spikeAccuracy: 84, consistency: 88 },
    signatures: [], bio: 'Solid wing receiver.' },
  { id: 'kinda', name: 'Yuta Kinda', school: 'aoba', pos: 'MB', jersey: 12, heightCm: 194,
    archetype: 'Speed Middle', tier: 'star',
    attrs: { approachSpeed: 92, jump: 91, jumpReach: 92, spikePower: 86, height: 92 },
    signatures: [], bio: 'Tall quick middle.' },
  { id: 'kunida', name: 'Akira Kunida', school: 'aoba', pos: 'OP', jersey: 10, heightCm: 187,
    archetype: 'Technical Ace', tier: 'starter',
    attrs: { spikePower: 88, spikeAccuracy: 90, backAttack: 87, tip: 85, consistency: 89 },
    signatures: [], bio: 'Efficient opposite.' },

  // SHIRATORI
  { id: 'ushida', name: 'Waka Ushida', school: 'shiratori', pos: 'OP', jersey: 1, heightCm: 189, handedness: 'L',
    archetype: 'Power Ace', tier: 'legend',
    attrs: { spikePower: 99, jump: 95, stamina: 98, clutch: 97, spikeAccuracy: 93, jumpReach: 94, backAttack: 96, crossShot: 92, lineShot: 90, competitive: 99, strength: 97 },
    signatures: ['SOUTHPAW_CANNON', 'ABSOLUTE_ACE'], bio: 'Absolute ace. Left-handed nightmare.' },
  { id: 'tenma', name: 'Satori Tenma', school: 'shiratori', pos: 'MB', jersey: 10, heightCm: 190,
    archetype: 'Commit Blocker', tier: 'superstar',
    attrs: { blockCommit: 96, blockTiming: 90, blockReach: 91, iq: 88, deception: 85, competitive: 93 },
    signatures: ['GUESS_MONSTER'], bio: 'Guess monster. High risk, high reward.' },
  { id: 'goshi', name: 'Tsuto Goshi', school: 'shiratori', pos: 'OH', jersey: 4, heightCm: 184,
    archetype: 'Power Ace', tier: 'star',
    attrs: { spikePower: 90, spikeAccuracy: 86, jump: 88, servePower: 87 },
    signatures: [], bio: 'Power wing support.' },
  { id: 'shirai', name: 'Ken Shirai', school: 'shiratori', pos: 'S', jersey: 3, heightCm: 180,
    archetype: 'Precision Setter', tier: 'star',
    attrs: { setAccuracy: 92, setSpeed: 88, decisionMaking: 90, consistency: 93, communication: 91 },
    signatures: [], bio: 'Stable setter who feeds the ace.' },
  { id: 'kawada', name: 'Taichi Kawada', school: 'shiratori', pos: 'MB', jersey: 12, heightCm: 193,
    archetype: 'Power Middle', tier: 'starter',
    attrs: { blockReach: 92, spikePower: 87, jump: 89, height: 93 },
    signatures: [], bio: 'Tall middle.' },
  { id: 'yamato', name: 'Haya Yamato', school: 'shiratori', pos: 'L', jersey: 11, heightCm: 173,
    archetype: 'Receive Specialist', tier: 'starter',
    attrs: { serveReceive: 92, dig: 90, reaction: 88, positioning: 90 },
    signatures: [], bio: 'Steady libero.' },

  // INARI
  { id: 'atsu', name: 'Atsu Miyahara', school: 'inari', pos: 'S', jersey: 6, heightCm: 182,
    archetype: 'Aggressive Setter', tier: 'legend',
    attrs: { setAccuracy: 98, servePower: 97, jumpServe: 96, decisionMaking: 96, setVariety: 97, deception: 94, iq: 95, competitive: 96 },
    signatures: ['RISK_SETTING', 'TWIN_QUICK'], bio: 'Creative risk-taker. Twin engine.' },
  { id: 'osa', name: 'Osa Miyahara', school: 'inari', pos: 'OP', jersey: 7, heightCm: 185,
    archetype: 'Speed Middle', tier: 'superstar',
    attrs: { approachSpeed: 95, spikePower: 90, spikeAccuracy: 88, jump: 92, setSpeed: 80, competitive: 94 },
    signatures: ['TWIN_QUICK'], bio: 'Twin quick partner of Atsu.' },
  { id: 'ojima', name: 'Aran Ojima', school: 'inari', pos: 'OH', jersey: 1, heightCm: 190,
    archetype: 'Power Ace', tier: 'superstar',
    attrs: { spikePower: 97, jump: 94, serveReceive: 89, spikeAccuracy: 90, jumpReach: 93, servePower: 91 },
    signatures: [], bio: 'Power ace of the west.' },
  { id: 'sunada', name: 'Rin Sunada', school: 'inari', pos: 'MB', jersey: 5, heightCm: 188,
    archetype: 'Power Middle', tier: 'star',
    attrs: { spikePower: 91, approachSpeed: 88, jumpReach: 90, blockTiming: 85 },
    signatures: ['TORSO_ATTACK'], bio: 'Torso attack specialist.' },
  { id: 'kitada', name: 'Shin Kitada', school: 'inari', pos: 'OH', jersey: 4, heightCm: 181,
    archetype: 'Complete Outside', tier: 'superstar',
    attrs: { consistency: 99, composure: 99, spikeAccuracy: 93, serveReceive: 91, dig: 88, spikePower: 87, competitive: 90 },
    signatures: ['NO_MISTAKES'], bio: 'No mistakes. Ever.' },
  { id: 'kosaka', name: 'Yuto Kosaka', school: 'inari', pos: 'OH', jersey: 8, heightCm: 179,
    archetype: 'Defensive Outside', tier: 'starter',
    attrs: { serveReceive: 88, dig: 86, spikePower: 80, consistency: 87 },
    signatures: [], bio: 'Depth wing.' },

  // FUKURO
  { id: 'bokura', name: 'Kota Bokura', school: 'fukuro', pos: 'OH', jersey: 5, heightCm: 187,
    archetype: 'Power Ace', tier: 'legend',
    attrs: { spikePower: 97, crossShot: 98, lineShot: 97, jump: 96, spikeAccuracy: 92, jumpReach: 94, clutch: 90, composure: 70, competitive: 98 },
    signatures: ['ACE_MODE', 'MOOD_SWING'], bio: 'Emotive ace. When hot, unstoppable.' },
  { id: 'akashi', name: 'Kei Akashi', school: 'fukuro', pos: 'S', jersey: 4, heightCm: 176,
    archetype: 'Genius Setter', tier: 'superstar',
    attrs: { iq: 97, setAccuracy: 96, decisionMaking: 96, setSpeed: 90, communication: 95, deception: 92 },
    signatures: ['ACE_MANAGEMENT'], bio: 'Manages the ace\'s fire.' },

  // DATE INDUSTRIAL
  { id: 'aono', name: 'Taka Aono', school: 'date', pos: 'MB', jersey: 2, heightCm: 198,
    archetype: 'Commit Blocker', tier: 'legend',
    attrs: { blockReach: 98, blockTiming: 96, strength: 96, closingSpeed: 94, blockCommit: 95, blockRead: 88, height: 97, jump: 90 },
    signatures: ['IRON_WALL'], bio: 'Iron wall. The net is his kingdom.' },
  { id: 'futaba', name: 'Ken Futaba', school: 'date', pos: 'OH', jersey: 1, heightCm: 183,
    archetype: 'Complete Outside', tier: 'superstar',
    attrs: { spikePower: 90, serveReceive: 91, dig: 89, communication: 95, consistency: 92, composure: 93, competitive: 94 },
    signatures: [], bio: 'Two-way captain.' },

  // KAMOME
  { id: 'hoshino', name: 'Korai Hoshino', school: 'kamome', pos: 'OH', jersey: 1, heightCm: 170,
    archetype: 'Technical Ace', tier: 'legend',
    attrs: { jump: 99, spikeAccuracy: 98, tip: 96, toolBlock: 95, serveReceive: 94, servePower: 95, jumpServe: 93, spikePower: 90, approachSpeed: 94, agility: 96 },
    signatures: ['SKY_ATTACK'], bio: 'Small giant. Sky attack clears all.' },
  { id: 'hiraga', name: 'Sachi Hiraga', school: 'kamome', pos: 'MB', jersey: 2, heightCm: 196,
    archetype: 'Read Blocker', tier: 'legend',
    attrs: { blockReach: 97, blockTiming: 96, blockRead: 97, composure: 99, closingSpeed: 93, strength: 94, iq: 92 },
    signatures: ['IMMOVABLE_BLOCK'], bio: 'Immovable. Never bites on decoys.' },

  // MUJINA
  { id: 'kirishi', name: 'Waka Kirishi', school: 'mujina', pos: 'OH', jersey: 1, heightCm: 188,
    archetype: 'Power Ace', tier: 'legend',
    attrs: { spikePower: 98, spikeAccuracy: 90, tip: 88, toolBlock: 90, serveReceive: 92, jump: 93, strength: 96, competitive: 95 },
    signatures: ['HEAVY_CANNON'], bio: 'Hits bad sets like good ones.' },

  // ITACHI
  { id: 'sakura_k', name: 'Kiyo Sakura', school: 'itachi', pos: 'OH', jersey: 1, heightCm: 182,
    archetype: 'Technical Ace', tier: 'legend',
    attrs: { spikePower: 94, spikeAccuracy: 98, servePower: 96, serveAccuracy: 95, serveReceive: 96, crossShot: 95, lineShot: 94, tip: 93, wrist: 99 } as Partial<Attributes>,
    signatures: ['WRIST_SPIN'], bio: 'Late wrist magic. Changes direction mid-air.' },
  { id: 'komori', name: 'Moto Komori', school: 'itachi', pos: 'L', jersey: 2, heightCm: 175,
    archetype: 'Guardian Libero', tier: 'superstar',
    attrs: { serveReceive: 98, dig: 98, reaction: 96, positioning: 97, ballControl: 96, agility: 94 },
    signatures: [], bio: 'Elite libero. Nation\'s best receive.' },

  // LEGEND POOL
  { id: 'kagami', name: 'Ren Kagami', school: 'legend', pos: 'S', jersey: 1, heightCm: 183,
    archetype: 'Genius Setter', tier: 'legend',
    attrs: { setAccuracy: 99, setSpeed: 97, decisionMaking: 99, iq: 99, deception: 98, setVariety: 98, communication: 96 },
    signatures: ['COURT_ANALYSIS', 'KINGS_TOSS', 'HUNDRED_SPIKER'], bio: 'Ultimate tactical setter.' },
  { id: 'kazehara', name: 'Sho Kazehara', school: 'legend', pos: 'OH', jersey: 10, heightCm: 191,
    archetype: 'Power Ace', tier: 'legend',
    attrs: { spikePower: 99, jump: 97, spikeAccuracy: 95, jumpReach: 96, servePower: 94, clutch: 96, strength: 98 },
    signatures: ['ACE_CANNON', 'HEAVY_CANNON'], bio: 'Ultimate power ace.' },
  { id: 'senda', name: 'Aki Senda', school: 'legend', pos: 'MB', jersey: 5, heightCm: 197,
    archetype: 'Read Blocker', tier: 'legend',
    attrs: { blockRead: 99, blockTiming: 98, blockReach: 97, iq: 98, closingSpeed: 95 },
    signatures: ['READ_BLOCK', 'IRON_WALL'], bio: 'Ultimate read blocker.' },
  { id: 'hinomori', name: 'Ryu Hinomori', school: 'legend', pos: 'OH', jersey: 7, heightCm: 176,
    archetype: 'Speed Middle', tier: 'legend',
    attrs: { speed: 99, approachSpeed: 99, jump: 96, spikeAccuracy: 93, agility: 98, acceleration: 99 },
    signatures: ['FREAK_QUICK', 'BOOM_JUMP'], bio: 'Ultimate speed attacker.' },
  { id: 'kurosaki', name: 'Ken Kurosaki', school: 'legend', pos: 'L', jersey: 4, heightCm: 171,
    archetype: 'Guardian Libero', tier: 'legend',
    attrs: { dig: 99, serveReceive: 99, reaction: 99, positioning: 98, ballControl: 98, agility: 97 },
    signatures: ['GUARDIAN_DEITY'], bio: 'Ultimate libero.' },
  { id: 'shirakawa', name: 'Toma Shirakawa', school: 'legend', pos: 'OP', jersey: 9, heightCm: 190, handedness: 'L',
    archetype: 'Power Ace', tier: 'legend',
    attrs: { spikePower: 98, backAttack: 99, jump: 96, clutch: 95, spikeAccuracy: 94 },
    signatures: ['SOUTHPAW_CANNON', 'ABSOLUTE_ACE'], bio: 'Left-handed cannon.' },
  { id: 'miyagawa', name: 'Rei Miyagawa', school: 'legend', pos: 'S', jersey: 8, heightCm: 178,
    archetype: 'Aggressive Setter', tier: 'legend',
    attrs: { setSpeed: 99, setAccuracy: 96, deception: 97, jumpServe: 94 },
    signatures: ['PINPOINT_QUICK', 'SETTER_DUMP', 'RISK_SETTING'], bio: 'Ultra-fast setter.' },
  { id: 'araki', name: 'Daigo Araki', school: 'legend', pos: 'MB', jersey: 12, heightCm: 200,
    archetype: 'Power Middle', tier: 'legend',
    attrs: { blockReach: 99, strength: 98, spikePower: 94, height: 99, jump: 93 },
    signatures: ['IRON_WALL', 'IMMOVABLE_BLOCK'], bio: 'Power blocker mountain.' },
  { id: 'nishida', name: 'Haru Nishida', school: 'legend', pos: 'OH', jersey: 3, heightCm: 181,
    archetype: 'Complete Outside', tier: 'legend',
    attrs: { serveReceive: 97, dig: 95, spikePower: 90, spikeAccuracy: 94, consistency: 97 },
    signatures: ['NO_MISTAKES', 'CAPTAINS_STABILITY'], bio: 'Complete receiver ace.' },
  { id: 'moriyama', name: 'Kai Moriyama', school: 'legend', pos: 'OP', jersey: 11, heightCm: 186,
    archetype: 'Technical Ace', tier: 'legend',
    attrs: { backAttack: 99, pipe: 99, spikePower: 93, spikeAccuracy: 95, jump: 94 } as Partial<Attributes>,
    signatures: ['SKY_ATTACK'], bio: 'Back-attack specialist.' },
  { id: 'akashima', name: 'Yuto Akashima', school: 'legend', pos: 'S', jersey: 2, heightCm: 179,
    archetype: 'Precision Setter', tier: 'legend',
    attrs: { setAccuracy: 99, setVariety: 95, communication: 98, decisionMaking: 96 },
    signatures: ['KINGS_TOSS', 'TEAM_RHYTHM', 'ACE_MANAGEMENT'], bio: 'Precision setter.' },
  { id: 'kita_r', name: 'Renji Kita', school: 'legend', pos: 'OH', jersey: 6, heightCm: 180,
    archetype: 'Complete Outside', tier: 'legend',
    attrs: { consistency: 99, composure: 99, serveReceive: 95, spikeAccuracy: 94, spikePower: 88, competitive: 92 },
    signatures: ['NO_MISTAKES', 'CAPTAINS_STABILITY'], bio: 'Consistency specialist.' },
];

const FIRST = ['Haruto','Yuto','Sota','Ren','Hinata','Akira','Kaito','Riku','Soma','Yuma','Kengo','Daiki','Shun','Takumi','Naoki','Hiro','Kenji','Masato','Ryo','Tsubasa','Kai','Sora','Hayato','Itsuki','Minato'];
const LAST = ['Sato','Suzuki','Takahashi','Tanaka','Watanabe','Ito','Yamamoto','Nakamura','Kobayashi','Kato','Yoshida','Yamada','Sasaki','Yamaguchi','Matsumoto','Inoue','Kimura','Hayashi','Shimizu','Saito','Okada','Hara','Mori','Ishikawa','Maeda'];

function fillSchool(schoolId: string, existing: PlayerDef[], rng: RNG): PlayerDef[] {
  const need: { pos: Pos; count: number }[] = [
    { pos: 'S', count: 2 }, { pos: 'OP', count: 2 }, { pos: 'OH', count: 3 },
    { pos: 'MB', count: 3 }, { pos: 'L', count: 2 },
  ];
  const have = existing.filter((p) => p.school === schoolId);
  const out: PlayerDef[] = [];
  let jersey = 15;
  for (const { pos, count } of need) {
    const cur = have.filter((p) => p.pos === pos).length + out.filter((p) => p.pos === pos).length;
    for (let i = cur; i < count; i++) {
      const tier: Tier = rng.chance(0.15) ? 'star' : rng.chance(0.4) ? 'starter' : 'role';
      const base = tier === 'star' ? 82 : tier === 'starter' ? 74 : 66;
      const attrs = baseAttrs(base);
      // position bias
      const bump = (keys: (keyof Attributes)[], amt: number) => {
        for (const k of keys) attrs[k] = clamp(attrs[k] + rng.int(amt - 3, amt + 5), 40, 96);
      };
      if (pos === 'S') bump(['setAccuracy','setSpeed','decisionMaking','deception','communication','iq'], 12);
      if (pos === 'MB') bump(['jumpReach','blockTiming','blockRead','approachSpeed','jump','height'], 12);
      if (pos === 'OP') bump(['spikePower','spikeAccuracy','backAttack','jump','clutch'], 12);
      if (pos === 'OH') bump(['spikePower','serveReceive','spikeAccuracy','dig','servePower'], 10);
      if (pos === 'L') bump(['serveReceive','dig','reaction','positioning','ballControl','agility'], 14);
      bump(['stamina','consistency','composure'], 5);
      const heightCm = pos === 'MB' ? rng.int(188, 202) : pos === 'L' ? rng.int(168, 178) : rng.int(175, 192);
      attrs.height = clamp(Math.round((heightCm - 160) * 1.8), 40, 99);
      const name = `${rng.pick(FIRST)} ${rng.pick(LAST)}`;
      const id = `${schoolId}_${pos.toLowerCase()}_${i}_${rng.int(100,999)}`;
      const archMap: Record<Pos, Archetype[]> = {
        S: ['Genius Setter','Aggressive Setter','Precision Setter'],
        OP: ['Power Ace','Technical Ace'],
        OH: ['Power Ace','Technical Ace','Complete Outside','Defensive Outside'],
        MB: ['Speed Middle','Read Blocker','Commit Blocker','Power Middle'],
        L: ['Guardian Libero','Receive Specialist'],
      };
      const def: PlayerDef = {
        id, name, school: schoolId, pos, pos2: null, jersey: jersey++,
        heightCm, weightKg: Math.round(heightCm * 0.42 + rng.int(-5, 8)),
        overall: 0, archetype: rng.pick(archMap[pos]), tier,
        handedness: rng.chance(0.12) ? 'L' : 'R',
        attrs, signatures: [], bio: `Player from ${schoolId}.`,
        appearance: appearance(hashString(id)),
      };
      def.overall = computeOverall(def.attrs, def.pos);
      out.push(def);
    }
  }
  return out;
}

function buildNamed(): PlayerDef[] {
  const players: PlayerDef[] = [];
  for (const s of NAMED) {
    const attrs = apply(baseAttrs(72), s.attrs);
    // physical height attr
    attrs.height = clamp(Math.round((s.heightCm - 160) * 1.8), 40, 99);
    // fix stray keys
    delete (attrs as Record<string, number>)['mental'];
    delete (attrs as Record<string, number>)['wrist'];
    delete (attrs as Record<string, number>)['pipe'];
    const def: PlayerDef = {
      id: s.id, name: s.name, school: s.school, pos: s.pos, pos2: s.pos2 ?? null,
      jersey: s.jersey, heightCm: s.heightCm, weightKg: s.weightKg ?? Math.round(s.heightCm * 0.43),
      overall: 0, archetype: s.archetype, tier: s.tier,
      handedness: s.handedness ?? 'R',
      attrs, signatures: s.signatures ?? [], bio: s.bio ?? '',
      appearance: appearance(hashString(s.id)),
    };
    def.overall = computeOverall(def.attrs, def.pos);
    players.push(def);
  }
  return players;
}

const named = buildNamed();
const schools = [
  'karasawa','nekoma','aoba','shiratori','inari','fukuro','date','kamome','mujina','itachi',
  'tsubame','ookami','sakura','ryu','hokuto','minami','kiba','shiro','hayate','tetsu',
  'yama','umi','kaze','hikari','midori','sora','tsuki','fuji','nami','akira','genshi',
];
const all = [...named];
for (const sid of schools) {
  const rng = new RNG(hashString(sid + '_fill'));
  all.push(...fillSchool(sid, all, rng));
}

const outPath = resolve(__dir, '../src/data/players.json');
writeFileSync(outPath, JSON.stringify(all, null, 1));
console.log(`Wrote ${all.length} players to ${outPath}`);
console.log('By school:', schools.map((s) => `${s}:${all.filter((p) => p.school === s).length}`).join(', '));
