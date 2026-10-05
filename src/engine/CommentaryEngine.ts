import type { MatchState } from './GameState';
import type { SimEvent } from './types';
import { getPlayer } from './db';

export function emit(st: MatchState, e: SimEvent) {
  e.t = st.simTime;
  e.set = st.setNumber;
  e.score = [st.teams[0].score, st.teams[1].score];
  if (!e.text) e.text = narrate(st, e);
  st.buffer.push(e);
  if (st.keepEvents) st.events.push(e);
}

function name(id?: string): string {
  if (!id) return '';
  return getPlayer(id)?.name.split(' ').pop() ?? id;
}

export function narrate(st: MatchState, e: SimEvent): string {
  const n = name(e.player);
  const n2 = name(e.player2);
  switch (e.type) {
    case 'matchStart': return 'Match tip-off! The gym erupts!';
    case 'setStart': return `Set ${e.set} begins!`;
    case 'setEnd': return `Set ${e.set} over! ${st.teams[0].cfg.short} ${e.score?.[0]} – ${e.score?.[1]} ${st.teams[1].cfg.short}`;
    case 'serve': return `${n} serves${e.kind ? ` (${e.kind})` : ''}!`;
    case 'serveError': return `Serve error by ${n}!`;
    case 'ace': return `ACE! ${n} scorches the court!`;
    case 'receive': return e.success === false ? `${n} can't handle it!` : (e.quality === 'perfect' ? `Perfect receive — ${n}!` : e.quality === 'good' ? `${n} with a clean pass!` : `${n} receives — ${e.quality}`);
    case 'receiveError': return `Reception error — ${n}!`;
    case 'set': return e.kind?.includes('quick') ? `${n} to the middle — ${n2}!` : `${n} sets ${n2}${e.kind ? ` (${e.kind})` : ''}`;
    case 'setError': return `Setting error by ${n}!`;
    case 'setterDump': return e.success ? `${n} DUMP KILL!` : `${n} dumps... kept alive!`;
    case 'attack': return `${n} attacks${e.kind ? ` (${e.kind})` : ''}!`;
    case 'kill': return `KILL! ${n} puts it away${e.kind ? ` — ${e.kind}` : ''}!`;
    case 'attackError': return `Attack error — ${n}!`;
    case 'blocked': return `${n} is stuffed!`;
    case 'block': return e.success ? `${n} gets a touch!` : `${n} swings and misses the block.`;
    case 'blockPoint': return `BLOCK POINT! ${n} with the stuff!`;
    case 'blockOut': return `Block out! ${n2} tools it!`;
    case 'softBlock': return `Block touch — ball stays up!`;
    case 'dig': return e.success ? `${n} keeps it alive!` : `${n} can't dig it!`;
    case 'digError': return `Ball down — dig miss by ${n}.`;
    case 'signature': return e.text || `${n} activates ${e.kind}!`;
    case 'timeout': return `Timeout — ${st.teams[e.team ?? 0].cfg.short}`;
    case 'substitution': return `Substitution: ${n2} in for ${n}`;
    case 'sideOut': return `Side out!`;
    case 'point': return `Point — ${st.teams[e.team ?? 0].cfg.short}!`;
    case 'transition': return e.text || 'Transition!';
    case 'cover': return e.text || 'Cover!';
    case 'rallyStart': return '';
    case 'rallyEnd': return e.text || '';
    case 'matchEnd': return 'Match over!';
    default: return e.text || '';
  }
}
