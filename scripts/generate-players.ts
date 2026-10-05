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
  // ===== KARASUNA (school id: karasawa) =====
  { id: 'hinataki', name: 'Shoyo Hinataka', school: 'karasawa', pos: 'MB', pos2: 'OH', jersey: 10, heightCm: 164,
    archetype: 'Speed Middle', tier: 'legend',
    attrs: { speed: 99, jump: 99, approachSpeed: 99, acceleration: 99, agility: 98, reaction: 96, jumpReach: 94, spikePower: 88, spikeAccuracy: 90, tip: 86, serveReceive: 55, dig: 62, height: 42, stamina: 92, competitive: 99, clutch: 90, composure: 70, strength: 68, iq: 78 },
    signatures: ['FREAK_QUICK', 'ULTIMATE_DECOY', 'BOOM_JUMP'], bio: 'Smallest giant. Boom-jump clears the tape.' },
  { id: 'kagehara', name: 'Tobio Kageyamo', school: 'karasawa', pos: 'S', jersey: 9, heightCm: 181,
    archetype: 'Genius Setter', tier: 'legend',
    attrs: { setAccuracy: 99, setSpeed: 99, setVariety: 97, decisionMaking: 98, deception: 96, servePower: 95, serveAccuracy: 94, jumpServe: 95, targeting: 93, blockReach: 88, blockTiming: 87, iq: 97, communication: 86, composure: 88, spikePower: 80, competitive: 98 },
    signatures: ['KINGS_TOSS', 'PINPOINT_QUICK', 'SETTER_DUMP'], bio: 'King of the court. Tosses arrive before blockers move.' },
  { id: 'sawada', name: 'Daichi Sawado', school: 'karasawa', pos: 'OH', jersey: 1, heightCm: 176,
    archetype: 'Defensive Outside', tier: 'star',
    attrs: { serveReceive: 95, dig: 93, consistency: 97, composure: 96, communication: 97, spikePower: 82, spikeAccuracy: 86, serveAccuracy: 88, iq: 92, competitive: 94, clutch: 90 },
    signatures: ['CAPTAINS_STABILITY'], bio: 'Captain wall. Holds the receive line together.' },
  { id: 'sugihara', name: 'Koshi Sugiwara', school: 'karasawa', pos: 'S', jersey: 2, heightCm: 174,
    archetype: 'Precision Setter', tier: 'star',
    attrs: { setAccuracy: 92, setSpeed: 90, communication: 98, adaptability: 96, decisionMaking: 93, serveReceive: 84, iq: 94, composure: 95 },
    signatures: ['TEAM_RHYTHM'], bio: 'Vice-captain metronome. Makes everyone better.' },
  { id: 'azuma', name: 'Asahi Azah', school: 'karasawa', pos: 'OH', jersey: 3, heightCm: 186,
    archetype: 'Power Ace', tier: 'superstar',
    attrs: { spikePower: 96, jump: 92, servePower: 91, jumpServe: 90, spikeAccuracy: 89, jumpReach: 91, crossShot: 88, lineShot: 86, clutch: 84, composure: 72, competitive: 88 },
    signatures: ['ACE_CANNON'], bio: 'Ace cannon. When he fires, the gym shakes.' },
  { id: 'nishino', name: 'Yu Nishinoyo', school: 'karasawa', pos: 'L', jersey: 4, heightCm: 171,
    archetype: 'Guardian Libero', tier: 'legend',
    attrs: { dig: 99, reaction: 99, agility: 98, serveReceive: 97, positioning: 96, ballControl: 98, speed: 94, consistency: 95, competitive: 97 },
    signatures: ['GUARDIAN_DEITY'], bio: 'Rolling thunder. Balls that should die, live.' },
  { id: 'tsukino', name: 'Kei Tsukishimo', school: 'karasawa', pos: 'MB', jersey: 11, heightCm: 195,
    archetype: 'Read Blocker', tier: 'superstar',
    attrs: { blockRead: 98, blockTiming: 97, blockReach: 95, iq: 98, closingSpeed: 91, spikePower: 82, spikeAccuracy: 88, approachSpeed: 84, composure: 94, jump: 88, height: 96 },
    signatures: ['READ_BLOCK'], bio: 'Reads setters like open books. Power is modest; timing is not.' },
  { id: 'yamada_t', name: 'Tadashi Yamagucho', school: 'karasawa', pos: 'MB', jersey: 12, heightCm: 179,
    archetype: 'Serving Specialist', tier: 'starter',
    attrs: { floatServe: 95, serveAccuracy: 92, servePower: 84, targeting: 90, spikePower: 78, blockTiming: 82, serveReceive: 76, jump: 86 },
    signatures: ['PRESSURE_FLOAT'], bio: 'Pressure float from the pin.' },
  { id: 'tanabe', name: 'Ryunosuke Tanako', school: 'karasawa', pos: 'OH', jersey: 5, heightCm: 181,
    archetype: 'Technical Ace', tier: 'star',
    attrs: { spikePower: 93, clutch: 96, competitive: 98, crossShot: 95, lineShot: 91, spikeAccuracy: 92, composure: 90, serveReceive: 88, dig: 86, jump: 90, approachSpeed: 90 },
    signatures: ['SUPER_INNER_CROSS'], bio: 'Hungry crow. Clutch cross-court artist.' },
  { id: 'ennoshito', name: 'Chikara Ennoshito', school: 'karasawa', pos: 'OH', jersey: 6, heightCm: 180,
    archetype: 'Complete Outside', tier: 'starter',
    attrs: { serveReceive: 88, dig: 86, spikeAccuracy: 85, spikePower: 83, consistency: 90, communication: 92, iq: 88 },
    signatures: [], bio: 'Quiet captain-in-waiting. Reliable six-rotation wing.' },
  { id: 'kinoshito', name: 'Hisashi Kinoshito', school: 'karasawa', pos: 'OH', jersey: 7, heightCm: 176,
    archetype: 'Serving Specialist', tier: 'role',
    attrs: { jumpServe: 88, servePower: 86, serveAccuracy: 84, targeting: 85, spikePower: 78, serveReceive: 74 },
    signatures: [], bio: 'Pin jump-serve specialist off the bench.' },
  { id: 'narito', name: 'Kazuhito Narito', school: 'karasawa', pos: 'MB', jersey: 8, heightCm: 180,
    archetype: 'Utility Player', tier: 'role',
    attrs: { blockTiming: 82, spikePower: 80, approachSpeed: 83, serveReceive: 78, consistency: 84 },
    signatures: [], bio: 'Utility middle. Does the dirty work.' },

  // ===== NEKOMO (nekoma) =====
  { id: 'kozawa', name: 'Kenma Kozumo', school: 'nekoma', pos: 'S', jersey: 5, heightCm: 170,
    archetype: 'Genius Setter', tier: 'legend',
    attrs: { iq: 99, decisionMaking: 99, deception: 98, setAccuracy: 95, setSpeed: 90, setVariety: 97, communication: 88, composure: 97, stamina: 62, speed: 68, jump: 70, strength: 60, competitive: 85 },
    signatures: ['COURT_ANALYSIS'], bio: 'Brain first. Never wastes a set — or energy.' },
  { id: 'kurosawa', name: 'Tetsuro Kuroh', school: 'nekoma', pos: 'MB', jersey: 1, heightCm: 188,
    archetype: 'Read Blocker', tier: 'superstar',
    attrs: { blockRead: 95, blockTiming: 95, blockReach: 93, iq: 96, closingSpeed: 93, spikePower: 88, communication: 95, competitive: 97, jump: 90 },
    signatures: ['FUNNEL_BLOCK'], bio: 'Funnel block captain. Feeds diggers on purpose.' },
  { id: 'yakushi', name: 'Morisuke Yakuh', school: 'nekoma', pos: 'L', jersey: 12, heightCm: 174,
    archetype: 'Guardian Libero', tier: 'superstar',
    attrs: { serveReceive: 97, dig: 98, reaction: 96, positioning: 97, ballControl: 95, agility: 94, consistency: 94 },
    signatures: [], bio: 'Cat libero. Endless rallies start here.' },
  { id: 'tora', name: 'Taketora Yamamotoh', school: 'nekoma', pos: 'OH', jersey: 4, heightCm: 178,
    archetype: 'Power Ace', tier: 'star',
    attrs: { spikePower: 93, spikeAccuracy: 87, jump: 89, servePower: 88, competitive: 96, approachSpeed: 90, composure: 78, serveReceive: 84 },
    signatures: [], bio: 'Hot-blooded wing. Hair stands when he fires.' },
  { id: 'haido', name: 'Lev Haibah', school: 'nekoma', pos: 'MB', jersey: 11, heightCm: 196,
    archetype: 'Power Middle', tier: 'star',
    attrs: { height: 99, jump: 95, jumpReach: 97, spikePower: 90, blockReach: 94, approachSpeed: 84, serveReceive: 52, iq: 70, speed: 86 },
    signatures: [], bio: 'Half-Russian project. Ceiling still rising.' },
  { id: 'fukuda', name: 'Shoyo Fukunagah', school: 'nekoma', pos: 'OH', jersey: 3, heightCm: 178,
    archetype: 'Technical Ace', tier: 'starter',
    attrs: { spikeAccuracy: 91, tip: 93, toolBlock: 90, crossShot: 88, serveReceive: 88, dig: 86, spikePower: 84 },
    signatures: [], bio: 'Technical wing. Tips, tools, and grit.' },
  { id: 'kai_n', name: 'Nobuyuki Kaih', school: 'nekoma', pos: 'OH', jersey: 2, heightCm: 178,
    archetype: 'Complete Outside', tier: 'star',
    attrs: { serveReceive: 92, dig: 90, spikeAccuracy: 88, spikePower: 86, consistency: 93, communication: 94, composure: 92 },
    signatures: [], bio: 'Vice-captain glue. Clean six-rotation play.' },
  { id: 'inuoka', name: 'So Inuokah', school: 'nekoma', pos: 'MB', jersey: 7, heightCm: 185,
    archetype: 'Speed Middle', tier: 'starter',
    attrs: { approachSpeed: 90, jump: 90, spikePower: 86, blockTiming: 84, speed: 91, serveReceive: 70 },
    signatures: [], bio: 'Energetic middle. Chases every quick.' },
  { id: 'shibayamah', name: 'Yuuki Shibayamah', school: 'nekoma', pos: 'S', jersey: 6, heightCm: 175,
    archetype: 'Precision Setter', tier: 'starter',
    attrs: { setAccuracy: 88, setSpeed: 86, communication: 90, decisionMaking: 86, serveReceive: 80 },
    signatures: [], bio: 'Backup setter. Steady hands.' },

  // ===== AOBA JOHSEI (aoba) =====
  { id: 'oikawa', name: 'Toru Oikawo', school: 'aoba', pos: 'S', jersey: 1, heightCm: 184,
    archetype: 'Aggressive Setter', tier: 'legend',
    attrs: { setAccuracy: 98, setSpeed: 96, setVariety: 97, servePower: 99, serveAccuracy: 97, jumpServe: 98, floatServe: 90, targeting: 98, iq: 98, deception: 97, decisionMaking: 98, communication: 95, competitive: 99, clutch: 94 },
    signatures: ['HUNDRED_SPIKER', 'TARGET_SERVE'], bio: 'Grand king. Serve pressure incarnate.' },
  { id: 'iwasaki', name: 'Hajime Iwaizumo', school: 'aoba', pos: 'OH', jersey: 4, heightCm: 179,
    archetype: 'Complete Outside', tier: 'superstar',
    attrs: { spikePower: 94, serveReceive: 92, dig: 90, consistency: 95, composure: 97, spikeAccuracy: 92, jump: 91, clutch: 93, competitive: 95, communication: 94 },
    signatures: [], bio: 'Rock ace. No holes — and no patience for drama.' },
  { id: 'matsuda', name: 'Issei Matsukawo', school: 'aoba', pos: 'MB', jersey: 2, heightCm: 187,
    archetype: 'Read Blocker', tier: 'star',
    attrs: { blockRead: 92, blockTiming: 91, blockReach: 90, iq: 90, spikePower: 85, communication: 88 },
    signatures: [], bio: 'Deadpan read blocker.' },
  { id: 'hanada', name: 'Takahiro Hanamakih', school: 'aoba', pos: 'OH', jersey: 3, heightCm: 186,
    archetype: 'Defensive Outside', tier: 'star',
    attrs: { serveReceive: 90, dig: 88, spikePower: 88, spikeAccuracy: 87, consistency: 90, tip: 86 },
    signatures: [], bio: 'Mustache wing. Solid and loud.' },
  { id: 'kinda', name: 'Yutaro Kindaichih', school: 'aoba', pos: 'MB', jersey: 12, heightCm: 190,
    archetype: 'Speed Middle', tier: 'star',
    attrs: { approachSpeed: 93, jump: 92, jumpReach: 93, spikePower: 88, height: 93, competitive: 92 },
    signatures: [], bio: 'Kinda-quick middle with a temper.' },
  { id: 'kunida', name: 'Akira Kunimih', school: 'aoba', pos: 'OP', jersey: 10, heightCm: 184,
    archetype: 'Technical Ace', tier: 'star',
    attrs: { spikePower: 90, spikeAccuracy: 93, backAttack: 90, tip: 88, consistency: 94, composure: 95, competitive: 80, stamina: 86 },
    signatures: [], bio: 'Efficient opposite. Hates wasted effort.' },
  { id: 'yahaba', name: 'Shigeru Yahabah', school: 'aoba', pos: 'S', jersey: 6, heightCm: 181,
    archetype: 'Precision Setter', tier: 'starter',
    attrs: { setAccuracy: 90, setSpeed: 88, communication: 91, servePower: 86, jumpServe: 85, iq: 88 },
    signatures: [], bio: 'Ambitious backup setter.' },
  { id: 'watari', name: 'Shinji Watarih', school: 'aoba', pos: 'L', jersey: 7, heightCm: 172,
    archetype: 'Receive Specialist', tier: 'star',
    attrs: { serveReceive: 94, dig: 92, reaction: 91, positioning: 93, ballControl: 92 },
    signatures: [], bio: 'Quiet libero. Cleans Oikawo serves in practice.' },
  { id: 'kyotani', name: 'Kentaro Kyotanih', school: 'aoba', pos: 'OP', jersey: 11, heightCm: 178,
    archetype: 'Power Ace', tier: 'star',
    attrs: { spikePower: 95, jump: 93, approachSpeed: 94, spikeAccuracy: 84, composure: 65, competitive: 97, serveReceive: 70, dig: 72 },
    signatures: [], bio: 'Mad dog opposite. Raw power, raw fuse.' },

  // ===== SHIRATORIZAWO (shiratori) =====
  { id: 'ushida', name: 'Wakatoshi Ushiwaka', school: 'shiratori', pos: 'OP', jersey: 1, heightCm: 189, handedness: 'L',
    archetype: 'Power Ace', tier: 'legend',
    attrs: { spikePower: 99, jump: 96, servePower: 95, jumpServe: 94, stamina: 98, clutch: 97, spikeAccuracy: 94, jumpReach: 96, backAttack: 97, crossShot: 93, lineShot: 92, competitive: 99, strength: 98, serveReceive: 86 },
    signatures: ['SOUTHPAW_CANNON', 'ABSOLUTE_ACE'], bio: 'Absolute ace. Left-handed mountain.' },
  { id: 'tenma', name: 'Satori Tendoh', school: 'shiratori', pos: 'MB', jersey: 5, heightCm: 187,
    archetype: 'Commit Blocker', tier: 'superstar',
    attrs: { blockCommit: 97, blockTiming: 92, blockReach: 94, iq: 91, deception: 90, competitive: 95, blockRead: 78, consistency: 68, jump: 90, closingSpeed: 92 },
    signatures: ['GUESS_MONSTER'], bio: 'Guess monster. High variance, higher chaos.' },
  { id: 'goshi', name: 'Reon Ohirah', school: 'shiratori', pos: 'OH', jersey: 4, heightCm: 185,
    archetype: 'Complete Outside', tier: 'star',
    attrs: { spikePower: 91, spikeAccuracy: 90, jump: 90, servePower: 88, serveReceive: 90, dig: 88, consistency: 92, iq: 90 },
    signatures: [], bio: 'Two-way wing. Steady beside the ace.' },
  { id: 'shirai', name: 'Kenjiro Shirabuh', school: 'shiratori', pos: 'S', jersey: 3, heightCm: 180,
    archetype: 'Precision Setter', tier: 'star',
    attrs: { setAccuracy: 94, setSpeed: 90, decisionMaking: 92, consistency: 95, communication: 90, composure: 93 },
    signatures: [], bio: 'Feeds the ace. Medical student composure.' },
  { id: 'kawada', name: 'Taichi Kawanishih', school: 'shiratori', pos: 'MB', jersey: 12, heightCm: 193,
    archetype: 'Power Middle', tier: 'starter',
    attrs: { blockReach: 93, spikePower: 88, jump: 90, height: 94, approachSpeed: 86 },
    signatures: [], bio: 'Tall slide middle.' },
  { id: 'yamato', name: 'Hayato Yamagatah', school: 'shiratori', pos: 'L', jersey: 11, heightCm: 174,
    archetype: 'Receive Specialist', tier: 'star',
    attrs: { serveReceive: 94, dig: 92, reaction: 90, positioning: 92, consistency: 93 },
    signatures: [], bio: 'Steady libero behind the wall.' },
  { id: 'semi', name: 'Eita Semih', school: 'shiratori', pos: 'S', jersey: 6, heightCm: 180,
    archetype: 'Aggressive Setter', tier: 'starter',
    attrs: { setAccuracy: 90, setSpeed: 91, jumpServe: 92, servePower: 90, competitive: 91, deception: 88 },
    signatures: [], bio: 'Backup setter with a jump serve.' },
  { id: 'goshiki', name: 'Tsutomu Goshikih', school: 'shiratori', pos: 'OH', jersey: 8, heightCm: 183,
    archetype: 'Power Ace', tier: 'star',
    attrs: { spikePower: 92, jump: 91, spikeAccuracy: 88, competitive: 95, serveReceive: 82, composure: 80 },
    signatures: [], bio: 'Aspiring ace. Hungry for the big sets.' },

  // ===== INARIZAKO (inari) =====
  { id: 'atsu', name: 'Atsumu Miyah', school: 'inari', pos: 'S', jersey: 6, heightCm: 182,
    archetype: 'Aggressive Setter', tier: 'legend',
    attrs: { setAccuracy: 98, setSpeed: 97, setVariety: 97, servePower: 98, serveAccuracy: 96, jumpServe: 98, floatServe: 97, targeting: 96, decisionMaking: 96, deception: 95, iq: 95, competitive: 97, clutch: 93 },
    signatures: ['RISK_SETTING', 'TWIN_QUICK'], bio: 'Twin setter. Jump and float serves both elite.' },
  { id: 'osa', name: 'Osamu Miyah', school: 'inari', pos: 'OP', jersey: 7, heightCm: 183,
    archetype: 'Complete Outside', tier: 'superstar',
    attrs: { approachSpeed: 94, spikePower: 93, spikeAccuracy: 92, jump: 93, setAccuracy: 90, setSpeed: 88, serveReceive: 91, dig: 89, competitive: 94, tip: 91, consistency: 92 },
    signatures: ['TWIN_QUICK'], bio: 'Twin opposite. Sets, spikes, and cooks.' },
  { id: 'ojima', name: 'Aran Ojirah', school: 'inari', pos: 'OH', jersey: 1, heightCm: 186,
    archetype: 'Power Ace', tier: 'superstar',
    attrs: { spikePower: 97, jump: 95, serveReceive: 90, spikeAccuracy: 91, jumpReach: 94, servePower: 92, strength: 95, competitive: 94 },
    signatures: [], bio: 'Power ace of the west.' },
  { id: 'sunada', name: 'Rintaro Sunah', school: 'inari', pos: 'MB', jersey: 5, heightCm: 185,
    archetype: 'Power Middle', tier: 'star',
    attrs: { spikePower: 93, approachSpeed: 90, jumpReach: 92, blockTiming: 88, tip: 86, competitive: 90 },
    signatures: ['TORSO_ATTACK'], bio: 'Torso-attack middle. Awkward angles.' },
  { id: 'kitada', name: 'Shinsuke Kitah', school: 'inari', pos: 'OH', jersey: 4, heightCm: 175,
    archetype: 'Complete Outside', tier: 'superstar',
    attrs: { consistency: 99, composure: 99, spikeAccuracy: 94, serveReceive: 93, dig: 90, spikePower: 88, competitive: 92, communication: 96, iq: 94 },
    signatures: ['NO_MISTAKES'], bio: 'No mistakes. Ever. Captain standard.' },
  { id: 'kosaka', name: 'Yuji Kosakuh', school: 'inari', pos: 'OH', jersey: 8, heightCm: 178,
    archetype: 'Defensive Outside', tier: 'starter',
    attrs: { serveReceive: 90, dig: 88, spikePower: 82, consistency: 88, spikeAccuracy: 84 },
    signatures: [], bio: 'Receive wing depth.' },
  { id: 'ginjima', name: 'Hitoshi Ginjimah', school: 'inari', pos: 'OH', jersey: 3, heightCm: 180,
    archetype: 'Technical Ace', tier: 'star',
    attrs: { spikePower: 90, spikeAccuracy: 90, serveReceive: 89, jump: 90, competitive: 91 },
    signatures: [], bio: 'All-around wing. Twin practice partner.' },
  { id: 'akagi', name: 'Michinari Akagih', school: 'inari', pos: 'L', jersey: 2, heightCm: 173,
    archetype: 'Guardian Libero', tier: 'star',
    attrs: { serveReceive: 93, dig: 94, reaction: 92, positioning: 93, communication: 94 },
    signatures: [], bio: 'Spirit libero. Loud heart.' },
  { id: 'riseki', name: 'Heisuke Risekih', school: 'inari', pos: 'MB', jersey: 9, heightCm: 188,
    archetype: 'Serving Specialist', tier: 'starter',
    attrs: { jumpServe: 93, servePower: 91, serveAccuracy: 88, spikePower: 84, blockTiming: 82 },
    signatures: [], bio: 'Pin serve bomber.' },

  // ===== FUKURODANO (fukuro) =====
  { id: 'bokura', name: 'Kotaro Bokutoh', school: 'fukuro', pos: 'OH', jersey: 5, heightCm: 185,
    archetype: 'Power Ace', tier: 'legend',
    attrs: { spikePower: 97, crossShot: 98, lineShot: 98, jump: 96, spikeAccuracy: 93, jumpReach: 95, clutch: 92, composure: 68, competitive: 99, servePower: 90, tip: 90, toolBlock: 92 },
    signatures: ['ACE_MODE', 'MOOD_SWING'], bio: 'Emotive ace. Hot streak = unstoppable; cold = chaos.' },
  { id: 'akashi', name: 'Keiji Akaasho', school: 'fukuro', pos: 'S', jersey: 4, heightCm: 176,
    archetype: 'Genius Setter', tier: 'superstar',
    attrs: { iq: 97, setAccuracy: 97, decisionMaking: 97, setSpeed: 92, communication: 96, deception: 93, composure: 96, adaptability: 95 },
    signatures: ['ACE_MANAGEMENT'], bio: 'Manages the owl fire. Soft voice, hard IQ.' },
  { id: 'konoha', name: 'Akinori Konohah', school: 'fukuro', pos: 'OH', jersey: 3, heightCm: 180,
    archetype: 'Complete Outside', tier: 'star',
    attrs: { spikeAccuracy: 91, tip: 92, serveReceive: 90, dig: 88, spikePower: 87, iq: 90, consistency: 91 },
    signatures: [], bio: 'Smart wing. Fills every gap.' },
  { id: 'sarukui', name: 'Yamato Sarukuih', school: 'fukuro', pos: 'OH', jersey: 2, heightCm: 181,
    archetype: 'Technical Ace', tier: 'starter',
    attrs: { spikePower: 88, spikeAccuracy: 89, serveReceive: 87, jump: 88 },
    signatures: [], bio: 'Smile wing. Steady rotations.' },
  { id: 'washio', name: 'Tatsuki Washioh', school: 'fukuro', pos: 'MB', jersey: 6, heightCm: 190,
    archetype: 'Read Blocker', tier: 'star',
    attrs: { blockRead: 93, blockTiming: 92, blockReach: 93, strength: 94, spikePower: 86, composure: 90 },
    signatures: [], bio: 'Stern middle. Wall with a scowl.' },
  { id: 'komi', name: 'Haruki Komih', school: 'fukuro', pos: 'L', jersey: 7, heightCm: 172,
    archetype: 'Receive Specialist', tier: 'star',
    attrs: { serveReceive: 93, dig: 92, reaction: 91, positioning: 92 },
    signatures: [], bio: 'Owl libero. Quiet picks.' },
  { id: 'onaga', name: 'Kai Onagah', school: 'fukuro', pos: 'MB', jersey: 11, heightCm: 178,
    archetype: 'Speed Middle', tier: 'starter',
    attrs: { approachSpeed: 90, jump: 89, spikePower: 85, blockTiming: 84 },
    signatures: [], bio: 'First-year middle energy.' },

  // ===== DATEKO TECH (date) =====
  { id: 'aono', name: 'Takanobu Aono', school: 'date', pos: 'MB', jersey: 2, heightCm: 192,
    archetype: 'Commit Blocker', tier: 'legend',
    attrs: { blockReach: 98, blockTiming: 97, strength: 97, closingSpeed: 95, blockCommit: 96, blockRead: 90, height: 97, jump: 92, spikePower: 86 },
    signatures: ['IRON_WALL'], bio: 'Iron wall. The net is his kingdom.' },
  { id: 'futaba', name: 'Kenji Futakuchih', school: 'date', pos: 'OH', jersey: 1, heightCm: 184,
    archetype: 'Complete Outside', tier: 'superstar',
    attrs: { spikePower: 91, serveReceive: 92, dig: 90, communication: 96, consistency: 93, composure: 90, competitive: 95, tip: 88 },
    signatures: [], bio: 'Two-way captain. Mouthy, clutch.' },
  { id: 'kamasaki', name: 'Yasushi Kamasakih', school: 'date', pos: 'MB', jersey: 3, heightCm: 188,
    archetype: 'Power Middle', tier: 'star',
    attrs: { blockReach: 94, blockTiming: 92, strength: 93, spikePower: 87, height: 94 },
    signatures: [], bio: 'Iron wall partner.' },
  { id: 'moniwa', name: 'Kaname Moniwah', school: 'date', pos: 'S', jersey: 4, heightCm: 176,
    archetype: 'Precision Setter', tier: 'star',
    attrs: { setAccuracy: 91, setSpeed: 88, communication: 94, composure: 93, decisionMaking: 90 },
    signatures: [], bio: 'Gentle setter behind the wall.' },
  { id: 'sakunami', name: 'Koshi Sakunamih', school: 'date', pos: 'L', jersey: 5, heightCm: 170,
    archetype: 'Receive Specialist', tier: 'starter',
    attrs: { serveReceive: 90, dig: 89, reaction: 88, positioning: 90 },
    signatures: [], bio: 'Eager libero.' },
  { id: 'koganegawa', name: 'Kanji Koganegawah', school: 'date', pos: 'OP', jersey: 11, heightCm: 193,
    archetype: 'Power Ace', tier: 'star',
    attrs: { spikePower: 93, jump: 92, jumpReach: 94, height: 96, spikeAccuracy: 82, serveReceive: 68, iq: 72 },
    signatures: [], bio: 'Huge opposite project.' },

  // ===== KAMOMEDAO (kamome) =====
  { id: 'hoshino', name: 'Korai Hoshiumo', school: 'kamome', pos: 'OH', jersey: 1, heightCm: 169,
    archetype: 'Technical Ace', tier: 'legend',
    attrs: { jump: 99, spikeAccuracy: 97, tip: 96, toolBlock: 96, serveReceive: 94, servePower: 95, jumpServe: 94, spikePower: 92, approachSpeed: 95, agility: 97, competitive: 97, crossShot: 94, lineShot: 93 },
    signatures: ['SKY_ATTACK'], bio: 'Little giant. Sky attack clears all.' },
  { id: 'hiraga', name: 'Sachiro Hirugamih', school: 'kamome', pos: 'MB', jersey: 2, heightCm: 190,
    archetype: 'Read Blocker', tier: 'legend',
    attrs: { blockReach: 97, blockTiming: 97, blockRead: 98, composure: 99, closingSpeed: 94, strength: 94, iq: 93, consistency: 96 },
    signatures: ['IMMOVABLE_BLOCK'], bio: 'Immovable. Never bites on decoys.' },
  { id: 'hakuba', name: 'Gao Hakubah', school: 'kamome', pos: 'OP', jersey: 3, heightCm: 204,
    archetype: 'Power Ace', tier: 'superstar',
    attrs: { height: 99, spikePower: 95, jumpReach: 98, blockReach: 97, jump: 90, spikeAccuracy: 88, serveReceive: 72 },
    signatures: [], bio: 'Tower opposite.' },
  { id: 'suo', name: 'Kei Suoh', school: 'kamome', pos: 'S', jersey: 5, heightCm: 178,
    archetype: 'Precision Setter', tier: 'star',
    attrs: { setAccuracy: 92, setSpeed: 90, decisionMaking: 91, communication: 90, composure: 93 },
    signatures: [], bio: 'Setter for the little giant.' },

  // ===== MUJINAZAKO (mujina) =====
  { id: 'kirishi', name: 'Wakatsu Kiryuh', school: 'mujina', pos: 'OH', jersey: 1, heightCm: 188,
    archetype: 'Power Ace', tier: 'legend',
    attrs: { spikePower: 98, spikeAccuracy: 92, tip: 90, toolBlock: 92, serveReceive: 93, jump: 94, strength: 97, competitive: 96, consistency: 93, dig: 88 },
    signatures: ['HEAVY_CANNON'], bio: 'Hits bad sets like good ones.' },
  { id: 'usuri', name: 'Hai Usurih', school: 'mujina', pos: 'S', jersey: 5, heightCm: 175,
    archetype: 'Precision Setter', tier: 'star',
    attrs: { setAccuracy: 91, setSpeed: 88, decisionMaking: 90, communication: 89 },
    signatures: [], bio: 'Feeds Kiryuh.' },
  { id: 'nozaki', name: 'Yuma Nozakih', school: 'mujina', pos: 'MB', jersey: 3, heightCm: 190,
    archetype: 'Power Middle', tier: 'starter',
    attrs: { spikePower: 88, blockReach: 90, jump: 89, height: 93 },
    signatures: [], bio: 'Power middle support.' },

  // ===== ITACHIYAMO (itachi) =====
  { id: 'sakura_k', name: 'Kiyoomi Sakuso', school: 'itachi', pos: 'OH', jersey: 1, heightCm: 182,
    archetype: 'Technical Ace', tier: 'legend',
    attrs: { spikePower: 95, spikeAccuracy: 98, servePower: 96, serveAccuracy: 96, jumpServe: 95, serveReceive: 96, crossShot: 97, lineShot: 96, tip: 95, dig: 90, consistency: 94, composure: 92 },
    signatures: ['WRIST_SPIN'], bio: 'Late wrist magic. Changes direction mid-air.' },
  { id: 'komori', name: 'Motoya Komorih', school: 'itachi', pos: 'L', jersey: 2, heightCm: 175,
    archetype: 'Guardian Libero', tier: 'superstar',
    attrs: { serveReceive: 98, dig: 98, reaction: 97, positioning: 97, ballControl: 97, agility: 95 },
    signatures: [], bio: 'Nation-class receive. Cousin chemistry.' },

  // ===== LEGEND POOL (keep ids; refresh names) =====
  { id: 'kagami', name: 'Ren Kagamih', school: 'legend', pos: 'S', jersey: 1, heightCm: 183,
    archetype: 'Genius Setter', tier: 'legend',
    attrs: { setAccuracy: 99, setSpeed: 97, decisionMaking: 99, iq: 99, deception: 98, setVariety: 98, communication: 96 },
    signatures: ['COURT_ANALYSIS', 'KINGS_TOSS', 'HUNDRED_SPIKER'], bio: 'Ultimate tactical setter.' },
  { id: 'kazehara', name: 'Sho Kazeharah', school: 'legend', pos: 'OH', jersey: 10, heightCm: 191,
    archetype: 'Power Ace', tier: 'legend',
    attrs: { spikePower: 99, jump: 97, spikeAccuracy: 95, jumpReach: 96, servePower: 94, clutch: 96, strength: 98 },
    signatures: ['ACE_CANNON', 'HEAVY_CANNON'], bio: 'Ultimate power ace.' },
  { id: 'senda', name: 'Aki Sendah', school: 'legend', pos: 'MB', jersey: 5, heightCm: 197,
    archetype: 'Read Blocker', tier: 'legend',
    attrs: { blockRead: 99, blockTiming: 98, blockReach: 97, iq: 98, closingSpeed: 95 },
    signatures: ['READ_BLOCK', 'IRON_WALL'], bio: 'Ultimate read blocker.' },
  { id: 'hinomori', name: 'Ryu Hinomorih', school: 'legend', pos: 'OH', jersey: 7, heightCm: 176,
    archetype: 'Speed Middle', tier: 'legend',
    attrs: { speed: 99, approachSpeed: 99, jump: 96, spikeAccuracy: 93, agility: 98, acceleration: 99 },
    signatures: ['FREAK_QUICK', 'BOOM_JUMP'], bio: 'Ultimate speed attacker.' },
  { id: 'kurosaki', name: 'Ken Kurosakih', school: 'legend', pos: 'L', jersey: 4, heightCm: 171,
    archetype: 'Guardian Libero', tier: 'legend',
    attrs: { dig: 99, serveReceive: 99, reaction: 99, positioning: 98, ballControl: 98, agility: 97 },
    signatures: ['GUARDIAN_DEITY'], bio: 'Ultimate libero.' },
  { id: 'shirakawa', name: 'Toma Shirakawah', school: 'legend', pos: 'OP', jersey: 9, heightCm: 190, handedness: 'L',
    archetype: 'Power Ace', tier: 'legend',
    attrs: { spikePower: 98, backAttack: 99, jump: 96, clutch: 95, spikeAccuracy: 94 },
    signatures: ['SOUTHPAW_CANNON', 'ABSOLUTE_ACE'], bio: 'Left-handed cannon.' },
  { id: 'miyagawa', name: 'Rei Miyagawah', school: 'legend', pos: 'S', jersey: 8, heightCm: 178,
    archetype: 'Aggressive Setter', tier: 'legend',
    attrs: { setSpeed: 99, setAccuracy: 96, deception: 97, jumpServe: 94 },
    signatures: ['PINPOINT_QUICK', 'SETTER_DUMP', 'RISK_SETTING'], bio: 'Ultra-fast setter.' },
  { id: 'araki', name: 'Daigo Arakih', school: 'legend', pos: 'MB', jersey: 12, heightCm: 200,
    archetype: 'Power Middle', tier: 'legend',
    attrs: { blockReach: 99, strength: 98, spikePower: 94, height: 99, jump: 93 },
    signatures: ['IRON_WALL', 'IMMOVABLE_BLOCK'], bio: 'Power blocker mountain.' },
  { id: 'nishida', name: 'Haru Nishidah', school: 'legend', pos: 'OH', jersey: 3, heightCm: 181,
    archetype: 'Complete Outside', tier: 'legend',
    attrs: { serveReceive: 97, dig: 95, spikePower: 90, spikeAccuracy: 94, consistency: 97 },
    signatures: ['NO_MISTAKES', 'CAPTAINS_STABILITY'], bio: 'Complete receiver ace.' },
  { id: 'moriyama', name: 'Kai Moriyamah', school: 'legend', pos: 'OP', jersey: 11, heightCm: 186,
    archetype: 'Technical Ace', tier: 'legend',
    attrs: { backAttack: 99, spikePower: 93, spikeAccuracy: 95, jump: 94 },
    signatures: ['SKY_ATTACK'], bio: 'Back-attack specialist.' },
  { id: 'akashima', name: 'Yuto Akashimah', school: 'legend', pos: 'S', jersey: 2, heightCm: 179,
    archetype: 'Precision Setter', tier: 'legend',
    attrs: { setAccuracy: 99, setVariety: 95, communication: 98, decisionMaking: 96 },
    signatures: ['KINGS_TOSS', 'TEAM_RHYTHM', 'ACE_MANAGEMENT'], bio: 'Precision setter.' },
  { id: 'kita_r', name: 'Renji Kitah', school: 'legend', pos: 'OH', jersey: 6, heightCm: 180,
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
      const tier: Tier = rng.chance(0.12) ? 'star' : rng.chance(0.4) ? 'starter' : 'role';
      const base = tier === 'star' ? 78 : tier === 'starter' ? 72 : 62;
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
      def.overall = computeOverall(def.attrs, def.pos, def.tier);
      out.push(def);
    }
  }
  return out;
}

function tierBase(tier: Tier): number {
  if (tier === 'legend') return 76;
  if (tier === 'superstar') return 72;
  if (tier === 'star') return 68;
  if (tier === 'starter') return 64;
  return 58;
}

function buildNamed(): PlayerDef[] {
  const players: PlayerDef[] = [];
  for (const s of NAMED) {
    const attrs = apply(baseAttrs(tierBase(s.tier)), s.attrs);
    attrs.height = clamp(Math.round((s.heightCm - 160) * 1.8), 40, 99);
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
    def.overall = computeOverall(def.attrs, def.pos, def.tier);
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
