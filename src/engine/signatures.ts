/** Signature abilities that change simulation behaviour (not mere +10 buffs). */
import type { AttrKey } from './types';

export interface SignatureDef {
  id: string;
  name: string;
  desc: string;
  /** Tags used by engines to gate behaviour */
  tags: string[];
}

export const SIGNATURES: Record<string, SignatureDef> = {
  FREAK_QUICK: {
    id: 'FREAK_QUICK', name: 'Freak Quick',
    desc: 'Insane tempo quick requiring setter+attacker timing. Unavailable on poor pass.',
    tags: ['quick', 'tempo', 'requiresPerfectPass', 'timingCompatibility'],
  },
  ULTIMATE_DECOY: {
    id: 'ULTIMATE_DECOY', name: 'Ultimate Decoy',
    desc: 'Pulls the middle blocker without touching the ball.',
    tags: ['decoy', 'pullMiddle'],
  },
  BOOM_JUMP: {
    id: 'BOOM_JUMP', name: 'Boom Jump',
    desc: 'Explosive vertical that extends reach window on approach.',
    tags: ['jump', 'reachBoost'],
  },
  KINGS_TOSS: {
    id: 'KINGS_TOSS', name: "King's Toss",
    desc: 'Sets land exactly where the spiker wants them — boosts kill rate on perfect sets.',
    tags: ['set', 'perfectSetBoost'],
  },
  PINPOINT_QUICK: {
    id: 'PINPOINT_QUICK', name: 'Pinpoint Quick',
    desc: 'Quicks arrive with surgical precision even under pressure.',
    tags: ['quick', 'setAccuracy'],
  },
  SETTER_DUMP: {
    id: 'SETTER_DUMP', name: 'Setter Dump',
    desc: 'Dumps when the block over-reads the spikers.',
    tags: ['dump', 'overReadExploit'],
  },
  CAPTAINS_STABILITY: {
    id: 'CAPTAINS_STABILITY', name: "Captain's Stability",
    desc: 'Stabilises receive and composure for nearby teammates.',
    tags: ['receive', 'teamComposure'],
  },
  TEAM_RHYTHM: {
    id: 'TEAM_RHYTHM', name: 'Team Rhythm',
    desc: 'Improves tempo compatibility across the offense.',
    tags: ['chemistry', 'tempo'],
  },
  ACE_CANNON: {
    id: 'ACE_CANNON', name: 'Ace Cannon',
    desc: 'Devastating high-ball spike that punches through single blocks.',
    tags: ['power', 'throughBlock'],
  },
  GUARDIAN_DEITY: {
    id: 'GUARDIAN_DEITY', name: 'Guardian Deity',
    desc: 'Saves near-lost balls — digs that should be impossible.',
    tags: ['dig', 'miracleSave'],
  },
  READ_BLOCK: {
    id: 'READ_BLOCK', name: 'Read Block',
    desc: 'Learns setter distribution and improves reads over sets.',
    tags: ['block', 'learning', 'read'],
  },
  PRESSURE_FLOAT: {
    id: 'PRESSURE_FLOAT', name: 'Pressure Float',
    desc: 'Float serve with unpredictable wobble that tanks receive quality.',
    tags: ['serve', 'float', 'wobble'],
  },
  SUPER_INNER_CROSS: {
    id: 'SUPER_INNER_CROSS', name: 'Super Inner Cross',
    desc: 'Sharp cross-court spike that bends inside the block.',
    tags: ['attack', 'cross', 'tool'],
  },
  COURT_ANALYSIS: {
    id: 'COURT_ANALYSIS', name: 'Court Analysis',
    desc: 'Reads block formation and distributes to the weakest seam.',
    tags: ['set', 'distribution', 'iq'],
  },
  FUNNEL_BLOCK: {
    id: 'FUNNEL_BLOCK', name: 'Funnel Block',
    desc: 'Channels the spike toward a prepared defender.',
    tags: ['block', 'funnel', 'digSetup'],
  },
  HUNDRED_SPIKER: {
    id: 'HUNDRED_SPIKER', name: '100% Spiker',
    desc: 'Sets maximise the attacker\'s kill probability.',
    tags: ['set', 'attackerBoost'],
  },
  TARGET_SERVE: {
    id: 'TARGET_SERVE', name: 'Target Serve',
    desc: 'AI always picks the weakest receiver.',
    tags: ['serve', 'targetWeak'],
  },
  SOUTHPAW_CANNON: {
    id: 'SOUTHPAW_CANNON', name: 'Southpaw Cannon',
    desc: 'Left-handed opposite creates awkward block angles.',
    tags: ['attack', 'lefty', 'awkwardAngle'],
  },
  ABSOLUTE_ACE: {
    id: 'ABSOLUTE_ACE', name: 'Absolute Ace',
    desc: 'Team feeds him in close games; demand rate skyrockets late.',
    tags: ['ace', 'clutchFeed'],
  },
  GUESS_MONSTER: {
    id: 'GUESS_MONSTER', name: 'Guess Monster',
    desc: 'High-risk high-reward guess block — stuff or get tooled.',
    tags: ['block', 'guess', 'highRisk'],
  },
  RISK_SETTING: {
    id: 'RISK_SETTING', name: 'Risk Setting',
    desc: 'Creative, risky sets that open unlikely attack options.',
    tags: ['set', 'risk', 'variety'],
  },
  TWIN_QUICK: {
    id: 'TWIN_QUICK', name: 'Twin Quick',
    desc: 'Synchronised twin attack that freezes the block.',
    tags: ['quick', 'twin', 'combo'],
  },
  TORSO_ATTACK: {
    id: 'TORSO_ATTACK', name: 'Torso Attack',
    desc: 'Attacks aimed at the blocker\'s torso — hard to control.',
    tags: ['attack', 'torso', 'hardControl'],
  },
  NO_MISTAKES: {
    id: 'NO_MISTAKES', name: 'No Mistakes',
    desc: 'Dramatically reduces unforced errors.',
    tags: ['mental', 'errorReduce'],
  },
  ACE_MODE: {
    id: 'ACE_MODE', name: 'Ace Mode',
    desc: 'When hot, shot selection becomes ruthless; when cold, confidence dips.',
    tags: ['momentum', 'shotSelect', 'mood'],
  },
  MOOD_SWING: {
    id: 'MOOD_SWING', name: 'Mood Swing',
    tags: ['momentum', 'mood'],
    desc: 'Consecutive blocks lower mood; kills restore it.',
  },
  ACE_MANAGEMENT: {
    id: 'ACE_MANAGEMENT', name: 'Ace Management',
    desc: 'Setter manages ace usage to keep them hot without burning out.',
    tags: ['set', 'aceManage'],
  },
  IRON_WALL: {
    id: 'IRON_WALL', name: 'Iron Wall',
    desc: 'Formidable block presence; closing speed and reach surge.',
    tags: ['block', 'wall', 'reach'],
  },
  SKY_ATTACK: {
    id: 'SKY_ATTACK', name: 'Sky Attack',
    desc: 'Small giant — extreme jump lets spikes clear the block.',
    tags: ['attack', 'jump', 'overBlock'],
  },
  IMMOVABLE_BLOCK: {
    id: 'IMMOVABLE_BLOCK', name: 'Immovable Block',
    desc: 'Never bitten by decoys; composure max on block.',
    tags: ['block', 'antiDecoy', 'composure'],
  },
  HEAVY_CANNON: {
    id: 'HEAVY_CANNON', name: 'Heavy Cannon',
    desc: 'Hits bad sets well — power overrides poor set quality.',
    tags: ['attack', 'badSetOk'],
  },
  WRIST_SPIN: {
    id: 'WRIST_SPIN', name: 'Wrist Spin',
    desc: 'Late wrist adjustment changes direction after the block commits.',
    tags: ['attack', 'lateAdjust', 'direction'],
  },
};

export function hasSig(sigs: string[], id: string): boolean {
  return sigs.includes(id);
}

export function anySig(sigs: string[], ...ids: string[]): boolean {
  return ids.some((id) => sigs.includes(id));
}

/** Soft attr modifiers from signatures (behavioural engines still check tags). */
export const SIG_ATTR_HINTS: Record<string, Partial<Record<AttrKey, number>>> = {
  BOOM_JUMP: { jump: 4, jumpReach: 3 },
  ACE_CANNON: { spikePower: 3 },
  GUARDIAN_DEITY: { dig: 3, reaction: 3 },
  IRON_WALL: { blockReach: 4, closingSpeed: 3 },
  SKY_ATTACK: { jump: 5, jumpReach: 4 },
  NO_MISTAKES: { consistency: 5, composure: 3 },
  SOUTHPAW_CANNON: { spikePower: 2, crossShot: 2 },
  PRESSURE_FLOAT: { floatServe: 4, serveAccuracy: 2 },
};
