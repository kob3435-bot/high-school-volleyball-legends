/** WebAudio synthesis — squeaks, contacts, whistle, crowd. */
let ctx: AudioContext | null = null;
let vol = 0.6;
let muted = false;

export function setAudio(v: number, m: boolean) { vol = v; muted = m; }

function ac(): AudioContext | null {
  if (muted || vol <= 0) return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function beep(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.1, pan = 0) {
  const a = ac(); if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  const p = a.createStereoPanner();
  o.type = type; o.frequency.value = freq;
  g.gain.value = gain * vol;
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
  p.pan.value = pan;
  o.connect(g); g.connect(p); p.connect(a.destination);
  o.start(); o.stop(a.currentTime + dur);
}

function noise(dur: number, gain = 0.08, pan = 0) {
  const a = ac(); if (!a) return;
  const n = a.createBufferSource();
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  n.buffer = buf;
  const g = a.createGain();
  const p = a.createStereoPanner();
  const f = a.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = 800;
  g.gain.value = gain * vol;
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
  p.pan.value = pan;
  n.connect(f); f.connect(g); g.connect(p); p.connect(a.destination);
  n.start();
}

export function sfx(kind: string, pan = 0) {
  switch (kind) {
    case 'serve': beep(180, 0.08, 'triangle', 0.08, pan); noise(0.06, 0.05, pan); break;
    case 'contact': noise(0.04, 0.1, pan); beep(220, 0.05, 'square', 0.04, pan); break;
    case 'spike': noise(0.08, 0.14, pan); beep(140, 0.1, 'sawtooth', 0.06, pan); break;
    case 'block': beep(90, 0.12, 'square', 0.1, pan); noise(0.1, 0.08, pan); break;
    case 'dig': noise(0.055, 0.09, pan); beep(160, 0.04, 'triangle', 0.04, pan); break;
    case 'set': beep(260, 0.045, 'sine', 0.05, pan); noise(0.03, 0.04, pan); break;
    case 'whistle': beep(1200, 0.15, 'sine', 0.08); beep(1400, 0.2, 'sine', 0.06); break;
    case 'cheer': noise(0.4, 0.06); beep(400, 0.3, 'triangle', 0.03); break;
    case 'squeak': beep(900 + Math.random() * 200, 0.04, 'sine', 0.03, pan); break;
    case 'net': beep(300, 0.08, 'triangle', 0.05); break;
    default: break;
  }
}

export function sfxForEvent(type: string, team?: 0 | 1) {
  const pan = team === 0 ? -0.4 : team === 1 ? 0.4 : 0;
  if (type === 'serve' || type === 'serveError') sfx('serve', pan);
  else if (type === 'kill' || type === 'attack') sfx('spike', pan);
  else if (type === 'block' || type === 'blockPoint') sfx('block', pan);
  else if (type === 'dig' || type === 'receive') sfx('dig', pan);
  else if (type === 'ace' || type === 'point') { sfx('whistle'); sfx('cheer'); }
  else if (type === 'set') sfx('set', pan);
}

/** Play a low-level sfx kind (used at exact contact frames). */
export function sfxKind(kind: string, pan = 0) { sfx(kind, pan); }

