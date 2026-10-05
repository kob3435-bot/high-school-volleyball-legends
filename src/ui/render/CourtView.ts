/** Courtside perspective volleyball match renderer. Simulation = Truth. */
import type { SimEvent } from '../../engine/types';
import type { Appearance } from '../../engine/types';
import { getPlayer } from '../../engine/db';
import { drawCharacter, exprFromState, type Anim, type CharDraw } from './CharacterDraw';

interface Char {
  id: string; team: 0 | 1; num: number; name: string; heightCm: number;
  appearance: Appearance; handedness: 'R' | 'L'; isLibero: boolean;
  signatures: string[];
  x: number; y: number; // court: x 0-18 length, y 0-9 width (0 = near sideline / camera)
  tx: number; ty: number;
  anim: Anim; animT: number; prevAnim: Anim; blend: number;
  jumpH: number; expression: number; facing: number;
  starSig: string | null;
}

interface Ball {
  x: number; y: number; z: number;
  sx: number; sy: number; sz: number;
  tx: number; ty: number; tz: number;
  t: number; dur: number; wobble: number;
  trail: { x: number; y: number; z: number }[];
}

type CamMode = 'courtside' | 'broadcast' | 'behindServe' | 'net' | 'closeup' | 'replay';

interface CamState {
  mode: CamMode;
  focusX: number; focusY: number; zoom: number;
  tfx: number; tfy: number; tzoom: number;
  timer: number;
}

interface ReplayClip {
  events: SimEvent[];
  i: number;
  t: number;
  label: string;
}

const COURT_L = 18, COURT_W = 9;

export class CourtView {
  chars = new Map<string, Char>();
  ball: Ball = { x: 9, y: 4.5, z: 1.2, sx: 9, sy: 4.5, sz: 1.2, tx: 9, ty: 4.5, tz: 1.2, t: 1, dur: 1, wobble: 0, trail: [] };
  colors: [[string, string], [string, string]];
  score: [number, number] = [0, 0];
  sets: [number, number] = [0, 0];
  setNumber = 1;
  serving: 0 | 1 = 0;
  flash: { text: string; t: number; color: string } | null = null;
  shake = 0;
  crowd = 0.35;
  graphics: 'low' | 'medium' | 'high' | 'ultra' = 'high';
  showLabels = true;
  /** smart = only ball-involved; all = everyone; off = none */
  labelMode: 'smart' | 'all' | 'off' = 'smart';
  private involved = new Set<string>();
  private burst: { x: number; y: number; text: string; t: number } | null = null;
  refSignal: 'none' | 'pointL' | 'pointR' | 'whistle' = 'none';
  refSignalT = 0;
  benchEnergy = 0;
  teamNames: [string, string] = ['HOME', 'AWAY'];
  lastEvent = '';
  huddle = false;
  huddleT = 0;
  replay: ReplayClip | null = null;
  replayMode: 'on' | 'important' | 'off' = 'important';
  private time = 0;
  private playT = 0;
  private cam: CamState = { mode: 'courtside', focusX: 9, focusY: 3.5, zoom: 1.05, tfx: 9, tfy: 3.5, tzoom: 1.05, timer: 0 };
  private importantBuf: SimEvent[] = [];
  private mobile = false;

  constructor(lineups: [string[], string[]], colors: [[string, string], [string, string]], names: [string, string]) {
    this.colors = colors;
    this.teamNames = names;
    this.setLineups(lineups);
  }

  setLineups(lineups: [string[], string[]]) {
    const keep = new Set<string>();
    for (const team of [0, 1] as const) {
      lineups[team].forEach((id, i) => {
        if (!id) return;
        keep.add(id);
        const def = getPlayer(id);
        let c = this.chars.get(id);
        if (!c) {
          c = {
            id, team, num: def?.jersey ?? i + 1, name: def?.name ?? id,
            heightCm: def?.heightCm ?? 180,
            appearance: def?.appearance ?? { hairColor: '#222', hairStyle: 1, skinTone: 2, eyeColor: '#333', build: 0.45, faceId: 0 },
            handedness: def?.handedness ?? 'R',
            isLibero: def?.pos === 'L',
            signatures: def?.signatures ?? [],
            x: 0, y: 0, tx: 0, ty: 0,
            anim: 'ready', animT: 0, prevAnim: 'ready', blend: 1,
            jumpH: 0, expression: 0, facing: team === 0 ? 1 : -1,
            starSig: null,
          };
          this.chars.set(id, c);
        }
        c.team = team;
        c.isLibero = def?.pos === 'L' || c.isLibero;
        const pos = zoneToPos(i + 1, team);
        c.tx = pos[0]; c.ty = pos[1];
        if (c.x === 0 && c.y === 0) { c.x = c.tx; c.y = c.ty; }
      });
    }
    for (const id of [...this.chars.keys()]) if (!keep.has(id)) this.chars.delete(id);
  }

  apply(events: SimEvent[]) {
    for (const e of events) {
      this.handleEvent(e);
      if (this.isImportant(e)) this.importantBuf.push(e);
    }
    // Trigger replay after big point
    const big = events.find((e) => e.type === 'kill' || e.type === 'ace' || e.type === 'blockPoint' || e.type === 'signature');
    if (big && this.replayMode !== 'off' && !this.replay) {
      const want = this.replayMode === 'on' || (this.replayMode === 'important' && this.isImportant(big));
      if (want && this.importantBuf.length >= 2) {
        this.startReplay(this.importantBuf.slice(-8), big.text || big.type);
        this.importantBuf = [];
      }
    }
    if (events.some((e) => e.type === 'rallyStart')) this.importantBuf = [];
  }

  showHuddle(on: boolean) {
    this.huddle = on;
    this.huddleT = on ? 0 : this.huddleT;
    if (on) {
      for (const c of this.chars.values()) {
        if (c.team === 0) { c.anim = 'timeout'; c.animT = 0; c.tx = 3 + Math.random(); c.ty = 2 + Math.random() * 2; }
      }
    }
  }

  private isImportant(e: SimEvent) {
    return ['kill', 'ace', 'blockPoint', 'signature', 'setterDump', 'dig'].includes(e.type)
      || (e.type === 'signature');
  }

  private startReplay(evs: SimEvent[], label: string) {
    this.replay = { events: evs, i: 0, t: 0, label };
    this.setCam('replay', this.ball.x, Math.min(5, this.ball.y), 1.28, 2.0);
  }

  private handleEvent(e: SimEvent) {
    // Track ball-involved for smart labels
    if (e.player) this.involved.add(e.player);
    if (e.player2) this.involved.add(e.player2);
    if (e.type === 'rallyStart' || e.type === 'serve') this.involved.clear();
    if (e.score) this.score = [e.score[0], e.score[1]];
    if (e.set) this.setNumber = e.set;
    if (e.text) this.lastEvent = e.text;

    if (e.type === 'timeout') this.showHuddle(true);
    if (e.type === 'rallyStart' || e.type === 'serve') this.huddle = false;

    if (e.type === 'point' || e.type === 'ace' || e.type === 'kill' || e.type === 'blockPoint') {
      this.shake = 0.45; this.crowd = Math.min(1, this.crowd + 0.2); this.benchEnergy = Math.min(1, this.benchEnergy + 0.55); this.refSignal = 'whistle'; this.refSignalT = 0.8;
      if (e.player) {
        const c = this.chars.get(e.player);
        if (c) { this.setAnim(c, 'celebrate'); c.expression = 1; }
      }
      const matchPoint = Math.max(this.score[0], this.score[1]) >= 24 || (this.setNumber >= 5 && Math.max(this.score[0], this.score[1]) >= 14);
      this.setCam('closeup', this.ball.x, Math.min(5, this.ball.y), 1.25, 1.2);
    }
    if (e.type === 'serveError' || e.type === 'attackError' || e.type === 'receiveError') {
      if (e.player) {
        const c = this.chars.get(e.player);
        if (c) { this.setAnim(c, 'frustrate'); c.expression = -1; }
      }
    }
    if (e.type === 'signature') {
      // One manga-style burst near the player (no centre banner / no clipped edge label)
      const short = (e.kind || 'SIGNATURE').replace(/_/g, ' ');
      if (e.player) {
        const c = this.chars.get(e.player);
        if (c) {
          c.starSig = null; // burst drawn separately, clamped on-screen
          this.burst = { x: c.x, y: c.y, text: short, t: 1.2 };
          this.involved.add(c.id);
          if (e.kind === 'FREAK_QUICK') this.setAnim(c, 'quickSpike');
          else if (e.kind === 'KINGS_TOSS' || e.kind === 'PINPOINT_QUICK') this.setAnim(c, 'jumpSet');
          else if (e.kind === 'GUARDIAN_DEITY') this.setAnim(c, 'dive');
          else if (e.kind === 'READ_BLOCK' || e.kind === 'IRON_WALL') this.setAnim(c, 'eyeTrack');
          else if (e.kind === 'SOUTHPAW_CANNON' || e.kind === 'ACE_CANNON') this.setAnim(c, 'spike');
          else if (e.kind === 'ACE_MODE') { c.expression = 1; this.setAnim(c, 'approach'); }
          else if (e.kind === 'ULTIMATE_DECOY') this.setAnim(c, 'approach');
        }
      } else {
        this.burst = { x: this.ball.x, y: this.ball.y, text: short, t: 1.2 };
      }
      this.setCam('net', 9, Math.min(5, this.ball.y), 1.15, 1.0);
    }

    this.animateFromEvent(e);
  }

  private setAnim(c: Char, a: Anim) {
    c.prevAnim = c.anim; c.anim = a; c.animT = 0; c.blend = 0;
  }

  private animateFromEvent(e: SimEvent) {
    const actor = e.player ? this.chars.get(e.player) : null;
    const target = e.player2 ? this.chars.get(e.player2) : null;

    switch (e.type) {
      case 'serve': {
        if (!actor) break;
        const jump = e.kind === 'jump' || e.kind === 'powerJump' || e.kind === 'jumpFloat';
        this.setAnim(actor, jump ? (e.kind === 'jumpFloat' ? 'jumpFloat' : 'jumpServe') : 'serve');
        this.setCam('behindServe', actor.x, Math.min(4, actor.y), 1.2, 1.4);
        const to = target ?? [...this.chars.values()].find((c) => c.team !== actor.team);
        if (to) this.flyBall(actor.x, actor.y, 2.4, to.x, to.y, 1.1, 0.95, e.kind === 'float' || e.kind === 'jumpFloat' ? 1 : 0);
        break;
      }
      case 'receive': case 'dig': {
        if (!actor) break;
        this.setAnim(actor, e.type === 'dig' ? (Math.random() > 0.5 ? 'dive' : 'dig') : 'receive');
        const midX = actor.team === 0 ? 7.2 : 10.8;
        this.flyBall(actor.x, actor.y, 0.9, midX, 3.5 + Math.random(), 2.6, 0.6, 0);
        break;
      }
      case 'set': {
        if (!actor) break;
        this.setAnim(actor, 'jumpSet');
        if (target) {
          this.setAnim(target, e.kind?.startsWith('quick') ? 'approach' : 'approach');
          const hx = target.team === 0 ? Math.min(target.x + 0.8, 8.5) : Math.max(target.x - 0.8, 9.5);
          this.flyBall(actor.x, actor.y, 2.5, hx, target.y, 3.1, 0.42, 0);
          this.setCam(e.kind?.startsWith('quick') ? 'net' : 'courtside', hx, Math.min(5, target.y), 1.2, 1.0);
        }
        break;
      }
      case 'attack': case 'kill': {
        if (!actor) break;
        const a: Anim = e.kind?.startsWith('quick') ? 'quickSpike'
          : e.kind === 'tip' ? 'tip'
          : e.kind === 'backAttack' || e.kind === 'pipe' ? 'backAttack' : 'spike';
        this.setAnim(actor, a);
        const landX = actor.team === 0 ? 11 + Math.random() * 5 : 2 + Math.random() * 5;
        const landY = 1.2 + Math.random() * 6.5;
        this.flyBall(actor.x, actor.y, 3.3, landX, landY, 0.35, 0.5, 0);
        this.shake = 0.3;
        this.setCam('net', 9, Math.min(5, actor.y), 1.22, 0.9);
        break;
      }
      case 'block': case 'blockPoint': {
        if (!actor) break;
        this.setAnim(actor, 'block');
        this.setCam('net', 9, Math.min(5, actor.y), 1.22, 1.1);
        if (e.type === 'blockPoint') {
          const bx = actor.team === 0 ? actor.x - 3.5 : actor.x + 3.5;
          this.flyBall(this.ball.x, this.ball.y, 3.0, bx, actor.y, 0.4, 0.35, 0);
        }
        break;
      }
      case 'setterDump': {
        if (!actor) break;
        this.setAnim(actor, 'dump');
        this.setCam('net', 9, Math.min(5, actor.y), 1.2, 1.0);
        this.flyBall(actor.x, actor.y, 2.3, actor.team === 0 ? 11 : 7, actor.y, 0.5, 0.4, 0);
        break;
      }
      case 'ace':
        this.flash = { text: 'ACE!', t: 1.6, color: '#ffd166' };
        this.shake = 0.55; this.crowd = 1; this.benchEnergy = 1; this.refSignal = Math.random() > 0.5 ? 'pointL' : 'pointR'; this.refSignalT = 1.2;
        break;
    }
  }

  private flyBall(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, dur: number, wobble: number) {
    this.ball.sx = x0; this.ball.sy = y0; this.ball.sz = z0;
    this.ball.x = x0; this.ball.y = y0; this.ball.z = z0;
    this.ball.tx = x1; this.ball.ty = y1; this.ball.tz = z1;
    this.ball.t = 0; this.ball.dur = Math.max(0.18, dur);
    this.ball.wobble = wobble;
    this.ball.trail = [{ x: x0, y: y0, z: z0 }];
  }

  private setCam(mode: CamMode, fx: number, fy: number, zoom: number, dur: number) {
    this.cam.mode = mode;
    this.cam.tfx = fx; this.cam.tfy = fy; this.cam.tzoom = zoom;
    this.cam.timer = dur;
  }

  update(dt: number) {
    // Replay playback
    let d = dt;
    if (this.replay) {
      d = dt * 0.4;
      this.replay.t += dt;
      if (this.replay.t > 0.35 && this.replay.i < this.replay.events.length) {
        this.handleEvent(this.replay.events[this.replay.i++]);
        this.replay.t = 0;
      }
      if (this.replay.i >= this.replay.events.length && this.replay.t > 1.2) {
        this.replay = null;
        this.setCam('courtside', 9, 3.5, 1.05, 0.8);
      }
    }

    this.time += d;
    this.playT += d;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - d * 2.2);
    if (this.flash) { this.flash.t -= d; if (this.flash.t <= 0) this.flash = null; }
    if (this.burst) { this.burst.t -= d; if (this.burst.t <= 0) this.burst = null; }
    if (this.huddle) this.huddleT += d;
    this.crowd = Math.max(0.28, this.crowd - d * 0.04);
    this.benchEnergy = Math.max(0, this.benchEnergy - d * 0.35);
    if (this.refSignalT > 0) { this.refSignalT -= d; if (this.refSignalT <= 0) this.refSignal = 'none'; }

    // Smooth camera
    const k = 1 - Math.pow(0.001, d);
    this.cam.focusX += (this.cam.tfx - this.cam.focusX) * k;
    this.cam.focusY += (this.cam.tfy - this.cam.focusY) * k;
    this.cam.zoom += (this.cam.tzoom - this.cam.zoom) * k;
    if (this.cam.timer > 0) {
      this.cam.timer -= d;
      if (this.cam.timer <= 0 && this.cam.mode !== 'courtside' && !this.replay) {
        this.setCam('courtside', 9, 3.5, this.mobile ? 1.2 : 1.05, 0.6);
      }
    }
    // Mobile: always ease toward ball
    if (this.mobile && !this.replay) {
      // Keep full court width — mild ball bias, never clip far-side wings
      this.cam.tfx = 9 * 0.75 + this.ball.x * 0.25;
      this.cam.tfx = Math.min(11, Math.max(7, this.cam.tfx));
      this.cam.tfy = 3.5 * 0.7 + Math.min(5, this.ball.y) * 0.3;
      this.cam.tzoom = 1.02;
    }

    // Ball
    if (this.ball.t < this.ball.dur) {
      this.ball.t += d;
      const u = Math.min(1, this.ball.t / this.ball.dur);
      const arc = Math.sin(u * Math.PI) * (1.0 + Math.abs(this.ball.tz - this.ball.sz) * 0.25);
      let x = this.ball.sx + (this.ball.tx - this.ball.sx) * u;
      let y = this.ball.sy + (this.ball.ty - this.ball.sy) * u;
      let z = this.ball.sz + (this.ball.tz - this.ball.sz) * u + arc;
      if (this.ball.wobble) {
        x += Math.sin(u * 20) * 0.12 * this.ball.wobble;
        y += Math.cos(u * 16) * 0.08 * this.ball.wobble;
      }
      this.ball.x = x; this.ball.y = y; this.ball.z = z;
      if (this.graphics !== 'low') {
        this.ball.trail.push({ x, y, z });
        if (this.ball.trail.length > 14) this.ball.trail.shift();
      }
    }

    for (const c of this.chars.values()) {
      const dx = c.tx - c.x, dy = c.ty - c.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.04) {
        const spd = (c.anim === 'approach' || c.anim === 'run' ? 5.5 : 3.2) * d;
        const m = Math.min(dist, spd);
        c.x += (dx / dist) * m;
        c.y += (dy / dist) * m;
        if (c.anim === 'ready' || c.anim === 'idle') this.setAnim(c, 'run');
        c.facing = dx > 0.05 ? 1 : dx < -0.05 ? -1 : c.facing;
      } else if (c.anim === 'run' || c.anim === 'sideStep') {
        this.setAnim(c, 'ready');
      }
      c.animT += d;
      c.blend = Math.min(1, c.blend + d * 4);
      if (c.expression !== 0) c.expression *= 0.985;
      if (c.starSig && c.animT > 1.2) c.starSig = null;
      if (c.animT > 1.15 && !['ready', 'idle', 'timeout', 'run'].includes(c.anim)) {
        if (['spike', 'quickSpike', 'block', 'jumpServe', 'jumpFloat', 'backAttack', 'eyeTrack'].includes(c.anim)) this.setAnim(c, 'landing');
        else this.setAnim(c, 'ready');
      }
      if (c.anim === 'landing' && c.animT > 0.3) this.setAnim(c, 'ready');
    }
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    this.mobile = w < 700;
    ctx.save();
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * 12 * this.shake, (Math.random() - 0.5) * 9 * this.shake);

    const cam = this.makeCam(w, h);
    this.drawGym(ctx, w, h);
    if (this.graphics !== 'low') this.drawCrowd(ctx, w, h, cam);
    this.drawGymWall(ctx, w, h, cam);
    this.drawScoreboardBoard(ctx, w, h, cam);
    this.drawFloorApron(ctx, w, h, cam);
    this.drawCourt(ctx, cam);
    this.drawNet(ctx, cam);
    if (this.graphics !== 'low') {
      this.drawBenches(ctx, cam);
      this.drawReferee(ctx, cam);
      this.drawCoach(ctx, cam);
    }

    // Characters sorted by depth (far first = higher y)
    const list = [...this.chars.values()].sort((a, b) => b.y - a.y);
    for (const c of list) this.drawChar(ctx, c, cam, h);
    this.drawBall(ctx, cam);
    this.drawBurst(ctx, cam, w, h);

    if (this.huddle) this.drawHuddleOverlay(ctx, w, h);
    if (this.replay) {
      ctx.fillStyle = 'rgba(255, 209, 102, 0.9)';
      ctx.font = `bold ${Math.floor(h * 0.035)}px sans-serif`;
      ctx.fillText(`▶ ${this.replay.label || 'REPLAY'}`, 16, 36);
    }
    if (this.flash) {
      ctx.globalAlpha = Math.min(1, this.flash.t);
      ctx.font = `bold ${Math.floor(h * 0.09)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 5;
      ctx.strokeText(this.flash.text, w / 2, h * 0.2);
      ctx.fillStyle = this.flash.color;
      ctx.fillText(this.flash.text, w / 2, h * 0.2);
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  /** Courtside: low sideline camera. Near sideline (y~0) large in foreground; far (y~9) smaller. Always frames full court with mild focus bias. */
  private makeCam(w: number, h: number) {
    // Soft focus — never lose the court. Clamp zoom.
    const zoom = Math.min(1.55, Math.max(0.95, this.cam.zoom));
    const focusX = Math.min(14, Math.max(4, this.cam.focusX));
    const focusY = Math.min(6, Math.max(2, this.cam.focusY));
    // Base scale so court length fills ~88% of width at mid-depth
    const base = (w * 0.88) / COURT_L;
    return {
      w, h, zoom,
      project: (x: number, y: number, z = 0): [number, number, number] => {
        // Courtside perspective — near larger, with headroom at top
        const persp = 1.7 / (0.9 + y * 0.13);
        const scale = base * persp * zoom;
        const midPull = (y / COURT_W) * 0.18;
        const cx = w * 0.5 - (focusX - 9) * base * 0.22 * zoom;
        const sx = cx + (x - 9) * scale * (1 - midPull);
        // Floor extends into bottom; leave ~12% headroom above far action
        const y0 = h * (this.mobile ? 0.86 : 0.90);
        const ySpan = h * (this.mobile ? 0.58 : 0.54) * zoom;
        const sy = y0 - (y / COURT_W) * ySpan - (focusY - 3.5) * 5 - z * scale * 0.85;
        return [sx, sy, scale];
      },
    };
  }

  private drawGym(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1c2d4a');
    g.addColorStop(0.35, '#243a5c');
    g.addColorStop(0.7, '#1a2a40');
    g.addColorStop(1, '#0d1828');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Lights
    if (this.graphics !== 'low') {
      for (let i = 0; i < 6; i++) {
        const x = w * (0.1 + i * 0.16);
        const rg = ctx.createRadialGradient(x, h * 0.05, 2, x, h * 0.08, 50);
        rg.addColorStop(0, 'rgba(255,245,200,0.35)');
        rg.addColorStop(1, 'rgba(255,245,200,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(x - 60, 0, 120, h * 0.25);
      }
    }
  }

  private drawCrowd(ctx: CanvasRenderingContext2D, w: number, h: number, cam: ReturnType<CourtView['makeCam']>) {
    const rows = this.graphics === 'ultra' ? 6 : this.graphics === 'high' ? 4 : 2;
    const bounce = this.crowd;
    for (let r = 0; r < rows; r++) {
      const n = 36 - r * 2;
      for (let i = 0; i < n; i++) {
        const wave = Math.sin(this.time * (2.5 + bounce * 4) + i * 0.4 + r) * bounce * 3;
        const x = w * (0.04 + i / (n + 1)) * 0.92 + w * 0.04;
        const y = h * (0.06 + r * 0.028) + wave;
        ctx.fillStyle = `hsl(${(i * 47 + r * 30) % 360} 45% ${28 + bounce * 25}%)`;
        ctx.fillRect(x, y, 4 + (this.graphics === 'ultra' ? 2 : 0), 7);
        // head
        ctx.beginPath(); ctx.arc(x + 2, y - 2, 2.2, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  private drawGymWall(ctx: CanvasRenderingContext2D, w: number, h: number, cam: ReturnType<CourtView['makeCam']>) {
    const far = cam.project(9, 9.5, 0);
    ctx.fillStyle = 'rgba(30,50,80,0.5)';
    ctx.fillRect(0, Math.min(h * 0.25, far[1] - 40), w, 50);
  }


  private drawScoreboardBoard(ctx: CanvasRenderingContext2D, w: number, h: number, cam: ReturnType<CourtView['makeCam']>) {
    const [sx, sy] = cam.project(9, 9.2, 4.2);
    const bw = Math.min(w * 0.42, 340), bh = Math.max(44, h * 0.055);
    // Panel
    ctx.fillStyle = 'rgba(8,12,20,0.92)';
    ctx.fillRect(sx - bw / 2, sy - bh, bw, bh);
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2;
    ctx.strokeRect(sx - bw / 2, sy - bh, bw, bh);
    // Team colour bars
    ctx.fillStyle = this.colors[0][0];
    ctx.fillRect(sx - bw / 2 + 2, sy - bh + 2, 6, bh - 4);
    ctx.fillStyle = this.colors[1][0];
    ctx.fillRect(sx + bw / 2 - 8, sy - bh + 2, 6, bh - 4);
    const nameSize = Math.max(11, Math.min(16, bw * 0.045));
    const scoreSize = Math.max(16, Math.min(22, bw * 0.07));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const midY = sy - bh / 2;
    // Home
    ctx.fillStyle = this.readableColor(this.colors[0][1], '#ffd166');
    ctx.font = `bold ${nameSize}px sans-serif`;
    const n0 = (this.teamNames[0] || 'HOME').slice(0, 14);
    ctx.fillText(n0, sx - bw * 0.28, midY - 6);
    ctx.font = `bold ${scoreSize}px sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.fillText(String(this.score[0]), sx - bw * 0.12, midY + 4);
    // Set
    ctx.fillStyle = '#ffd166';
    ctx.font = `bold ${Math.max(10, nameSize - 1)}px sans-serif`;
    ctx.fillText(`SET ${this.setNumber}`, sx, midY - 6);
    ctx.fillStyle = '#a0c4e8';
    ctx.font = `${Math.max(9, nameSize - 2)}px sans-serif`;
    ctx.fillText(`${this.sets[0]} - ${this.sets[1]}`, sx, midY + 10);
    // Away
    ctx.fillStyle = this.readableColor(this.colors[1][1], '#74b9ff');
    ctx.font = `bold ${nameSize}px sans-serif`;
    const n1 = (this.teamNames[1] || 'AWAY').slice(0, 14);
    ctx.fillText(n1, sx + bw * 0.28, midY - 6);
    ctx.font = `bold ${scoreSize}px sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.fillText(String(this.score[1]), sx + bw * 0.12, midY + 4);
    ctx.textAlign = 'left';
  }


  private readableColor(preferred: string, fallback: string): string {
    // Ensure away team text visible — prefer light accent
    const c = preferred || fallback || '#fff';
    if (isDark(c) && isDark(fallback)) return '#ffe08a';
    if (isDark(c)) return '#fff';
    return c;
  }


  private drawFloorApron(ctx: CanvasRenderingContext2D, w: number, h: number, cam: ReturnType<CourtView['makeCam']>) {
    const nearL = cam.project(-2.2, -1.2, 0);
    const nearR = cam.project(20.2, -1.2, 0);
    const midL = cam.project(-1.5, 0, 0);
    const midR = cam.project(19.5, 0, 0);
    const g = ctx.createLinearGradient(0, h * 0.7, 0, h);
    g.addColorStop(0, '#8a6a3e');
    g.addColorStop(0.5, '#7a5c35');
    g.addColorStop(1, '#5c4224');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w, h);
    ctx.lineTo(Math.max(w, nearR[0]), Math.min(h, nearR[1] + 40));
    ctx.lineTo(midR[0], midR[1]);
    ctx.lineTo(midL[0], midL[1]);
    ctx.lineTo(Math.min(0, nearL[0]), Math.min(h, nearL[1] + 40));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(midL[0], midL[1]);
    ctx.lineTo(midR[0], midR[1]);
    ctx.stroke();
  }

  private drawCourt(ctx: CanvasRenderingContext2D, cam: ReturnType<CourtView['makeCam']>) {
    const c0 = cam.project(0, 0), c1 = cam.project(18, 0), c2 = cam.project(18, 9), c3 = cam.project(0, 9);
    ctx.beginPath();
    ctx.moveTo(c0[0], c0[1]); ctx.lineTo(c1[0], c1[1]); ctx.lineTo(c2[0], c2[1]); ctx.lineTo(c3[0], c3[1]);
    ctx.closePath();
    const g = ctx.createLinearGradient(c0[0], c0[1], c3[0], c3[1]);
    g.addColorStop(0, '#c9a66b');
    g.addColorStop(0.5, '#d8b87e');
    g.addColorStop(1, '#b8925a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2.5;
    const line = (x0: number, y0: number, x1: number, y1: number) => {
      const a = cam.project(x0, y0), b = cam.project(x1, y1);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    };
    line(0, 0, 18, 0); line(18, 0, 18, 9); line(18, 9, 0, 9); line(0, 9, 0, 0);
    line(9, 0, 9, 9); line(3, 0, 3, 9); line(15, 0, 15, 9);
  }

  private drawNet(ctx: CanvasRenderingContext2D, cam: ReturnType<CourtView['makeCam']>) {
    const botN = cam.project(9, 0, 0), botF = cam.project(9, 9, 0);
    const topN = cam.project(9, 0, 2.43), topF = cam.project(9, 9, 2.43);
    ctx.strokeStyle = 'rgba(230,230,240,0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(topN[0], topN[1]); ctx.lineTo(topF[0], topF[1]); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,200,220,0.45)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const x0 = botN[0] + (botF[0] - botN[0]) * t, y0 = botN[1] + (botF[1] - botN[1]) * t;
      const x1 = topN[0] + (topF[0] - topN[0]) * t, y1 = topN[1] + (topF[1] - topN[1]) * t;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    // Posts
    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(botN[0], botN[1]); ctx.lineTo(topN[0], topN[1] - 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(botF[0], botF[1]); ctx.lineTo(topF[0], topF[1] - 12); ctx.stroke();
  }


  private drawBenches(ctx: CanvasRenderingContext2D, cam: ReturnType<CourtView['makeCam']>) {
    const energy = this.benchEnergy;
    const seats = this.graphics === 'ultra' ? 5 : 4;
    const drawBench = (team: 0 | 1, bx: number, by: number) => {
      const [sx, sy, sc] = cam.project(bx, by, 0);
      // Bench plank
      ctx.fillStyle = '#3a2a18';
      ctx.fillRect(sx - sc * 0.85, sy - sc * 0.08, sc * 1.7, sc * 0.12);
      ctx.fillStyle = this.colors[team][0];
      ctx.fillRect(sx - sc * 0.85, sy - sc * 0.14, sc * 1.7, sc * 0.05);
      for (let i = 0; i < seats; i++) {
        const px = sx - sc * 0.65 + i * sc * 0.35;
        const stand = energy > 0.35 && (i + team) % 2 === 0;
        const py = sy - (stand ? sc * 0.55 : sc * 0.32) - Math.sin(this.time * 8 + i) * energy * sc * 0.08;
        const ph = stand ? sc * 0.55 : sc * 0.38;
        // Body
        ctx.fillStyle = this.colors[team][0];
        ctx.fillRect(px - sc * 0.06, py - ph * 0.55, sc * 0.12, ph * 0.45);
        // Head
        ctx.fillStyle = '#e8b896';
        ctx.beginPath(); ctx.arc(px, py - ph * 0.65, sc * 0.07, 0, Math.PI * 2); ctx.fill();
        // Arms up when cheering
        if (stand || energy > 0.6) {
          ctx.strokeStyle = this.colors[team][0];
          ctx.lineWidth = Math.max(2, sc * 0.04);
          ctx.beginPath();
          ctx.moveTo(px - sc * 0.05, py - ph * 0.4);
          ctx.lineTo(px - sc * 0.18, py - ph * 0.75 - energy * sc * 0.1);
          ctx.moveTo(px + sc * 0.05, py - ph * 0.4);
          ctx.lineTo(px + sc * 0.18, py - ph * 0.75 - energy * sc * 0.1);
          ctx.stroke();
        }
      }
      // Coach beside bench
      const cx = sx + (team === 0 ? -sc * 1.05 : sc * 1.05);
      const cy = sy - sc * 0.5 - energy * sc * 0.06;
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(cx - sc * 0.08, cy - sc * 0.35, sc * 0.16, sc * 0.4);
      ctx.fillStyle = '#c6865c';
      ctx.beginPath(); ctx.arc(cx, cy - sc * 0.45, sc * 0.09, 0, Math.PI * 2); ctx.fill();
      // Clipboard
      ctx.fillStyle = '#f5e6c8';
      ctx.fillRect(cx + sc * 0.06, cy - sc * 0.2, sc * 0.1, sc * 0.14);
    };
    drawBench(0, -1.8, 0.6);
    drawBench(1, 19.8, 0.6);
  }



  private drawReferee(ctx: CanvasRenderingContext2D, cam: ReturnType<CourtView['makeCam']>) {
    // Far-side net post — small, in depth, never occludes near action
    const [sx, sy, sc] = cam.project(9.35, 9.15, 0);
    const h = sc * 1.15;
    ctx.save();
    ctx.globalAlpha = 0.72;
    // Elevated stand (platform + rail)
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(sx - h * 0.28, sy - h * 0.22, h * 0.56, h * 0.22);
    ctx.strokeStyle = '#718096';
    ctx.lineWidth = Math.max(2, h * 0.03);
    ctx.strokeRect(sx - h * 0.28, sy - h * 0.22, h * 0.56, h * 0.22);
    // Legs of stand
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = Math.max(2, h * 0.035);
    ctx.beginPath();
    ctx.moveTo(sx - h * 0.22, sy); ctx.lineTo(sx - h * 0.18, sy - h * 0.22);
    ctx.moveTo(sx + h * 0.22, sy); ctx.lineTo(sx + h * 0.18, sy - h * 0.22);
    ctx.stroke();
    // Referee body on stand
    const footY = sy - h * 0.22;
    const bodyTop = footY - h * 0.55;
    // Legs
    ctx.strokeStyle = '#1a202c';
    ctx.lineWidth = h * 0.07;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx - h * 0.06, footY); ctx.lineTo(sx - h * 0.05, footY - h * 0.25);
    ctx.moveTo(sx + h * 0.06, footY); ctx.lineTo(sx + h * 0.05, footY - h * 0.25);
    ctx.stroke();
    // Torso (official black/white)
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(sx - h * 0.1, bodyTop, h * 0.2, h * 0.32);
    ctx.fillStyle = '#fff';
    ctx.fillRect(sx - h * 0.1, bodyTop + h * 0.08, h * 0.2, h * 0.06);
    // Head
    ctx.fillStyle = '#e8b896';
    ctx.beginPath(); ctx.arc(sx, bodyTop - h * 0.08, h * 0.09, 0, Math.PI * 2); ctx.fill();
    // Cap
    ctx.fillStyle = '#1a202c';
    ctx.beginPath(); ctx.ellipse(sx, bodyTop - h * 0.14, h * 0.1, h * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(sx - h * 0.02, bodyTop - h * 0.2, h * 0.04, h * 0.06);
    // Arm signals
    ctx.strokeStyle = '#1a202c';
    ctx.lineWidth = h * 0.055;
    const sig = this.refSignal;
    let lArm = 0.15, rArm = 0.15;
    if (sig === 'pointL') { lArm = -0.95; rArm = 0.2; }
    else if (sig === 'pointR') { rArm = -0.95; lArm = 0.2; }
    else if (sig === 'whistle') { lArm = -0.4; rArm = 0.35; }
    const shoulderY = bodyTop + h * 0.04;
    ctx.beginPath();
    ctx.moveTo(sx - h * 0.1, shoulderY);
    ctx.lineTo(sx - h * 0.1 + Math.sin(lArm) * h * 0.05, shoulderY + lArm * h * 0.35);
    ctx.moveTo(sx + h * 0.1, shoulderY);
    ctx.lineTo(sx + h * 0.1 + Math.sin(rArm) * h * 0.05, shoulderY + rArm * h * 0.35);
    ctx.stroke();
    // Whistle
    if (sig === 'whistle' || this.refSignalT > 0.5) {
      ctx.fillStyle = '#cbd5e0';
      ctx.beginPath();
      ctx.arc(sx + h * 0.02, bodyTop - h * 0.02, h * 0.025, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }




  private drawBurst(ctx: CanvasRenderingContext2D, cam: ReturnType<CourtView['makeCam']>, w: number, h: number) {
    if (!this.burst) return;
    const c = [...this.chars.values()].find((ch) => Math.hypot(ch.x - this.burst!.x, ch.y - this.burst!.y) < 0.01)
      || [...this.chars.values()].find((ch) => Math.hypot(ch.x - this.burst!.x, ch.y - this.burst!.y) < 1.5);
    const bx = c ? c.x : this.burst.x;
    const by = c ? c.y : this.burst.y;
    const [sx, sy, sc] = cam.project(bx, by, 1.2);
    const fade = Math.min(1, this.burst.t / 0.25) * Math.min(1, this.burst.t);
    const text = this.burst.text.length > 16 ? this.burst.text.slice(0, 14) + '…' : this.burst.text;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.font = `bold ${Math.max(13, Math.min(22, h * 0.028))}px sans-serif`;
    const tw = ctx.measureText(text).width;
    let lx = sx;
    let ly = sy - sc * 1.8;
    // Keep fully on-screen
    lx = Math.max(tw / 2 + 8, Math.min(w - tw / 2 - 8, lx));
    ly = Math.max(22, Math.min(h * 0.55, ly));
    // Manga burst panel
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    const pad = 8;
    ctx.beginPath();
    ctx.moveTo(lx - tw / 2 - pad - 4, ly - 12);
    ctx.lineTo(lx + tw / 2 + pad, ly - 14);
    ctx.lineTo(lx + tw / 2 + pad + 6, ly + 6);
    ctx.lineTo(lx - tw / 2 - pad, ly + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, lx, ly - 2);
    ctx.restore();
  }

  private drawCoach(ctx: CanvasRenderingContext2D, _cam: ReturnType<CourtView['makeCam']>) {
    // Coaches are drawn inside drawBenches for v3
    void ctx; void _cam;
  }


  private drawHuddleOverlay(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = 'rgba(8, 18, 32, 0.55)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(20, 40, 70, 0.92)';
    const bw = Math.min(420, w * 0.8), bh = 120;
    ctx.fillRect((w - bw) / 2, h * 0.35, bw, bh);
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2;
    ctx.strokeRect((w - bw) / 2, h * 0.35, bw, bh);
    ctx.fillStyle = '#ffd166';
    ctx.font = `bold ${Math.floor(h * 0.035)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('TIMEOUT HUDDLE', w / 2, h * 0.35 + 36);
    ctx.fillStyle = '#cfe6ff';
    ctx.font = `${Math.floor(h * 0.025)}px sans-serif`;
    ctx.fillText('Adjust tactics · Sub players · Reset momentum', w / 2, h * 0.35 + 70);
    ctx.textAlign = 'left';
  }

  private shouldShowLabel(c: Char): boolean {
    if (this.labelMode === 'off' || !this.showLabels) return false;
    if (this.labelMode === 'all') return true;
    if (this.involved.has(c.id)) return true;
    if (['spike','quickSpike','block','receive','dig','dive','set','jumpSet','serve','jumpServe','jumpFloat','celebrate'].includes(c.anim)) return true;
    return false;
  }

  private drawChar(ctx: CanvasRenderingContext2D, c: Char, cam: ReturnType<CourtView['makeCam']>, viewH: number) {
    const jump = (c.anim === 'spike' || c.anim === 'block' || c.anim === 'jumpServe' || c.anim === 'quickSpike'
      || c.anim === 'jumpSet' || c.anim === 'backAttack' || c.anim === 'jumpFloat' || c.anim === 'eyeTrack')
      ? Math.sin(Math.min(1, c.animT * 1.2) * Math.PI) * 1.2 : 0;
    const [sx, sy, sc] = cam.project(c.x, c.y, jump);
    // Target: near-side characters ~25-45% of visible court / view height
    const heightFactor = 1.0 + (c.heightCm - 170) * 0.012;
    // Near players ~30-42% of view height; far ~16-24%
    const nearBoost = 1.05 + Math.max(0, (5 - c.y) / 5) * 0.85;
    let bodyH = sc * 1.55 * heightFactor * nearBoost;
    bodyH = Math.max(viewH * 0.14, Math.min(viewH * 0.36, bodyH));

    const bob = Math.sin(this.time * 5 + c.num) * (c.anim === 'ready' || c.anim === 'idle' ? 1.5 : 0);
    const draw: CharDraw = {
      heightCm: c.heightCm, build: c.appearance.build,
      hairColor: c.appearance.hairColor, hairStyle: c.appearance.hairStyle,
      skinTone: c.appearance.skinTone, eyeColor: c.appearance.eyeColor,
      jersey: this.colors[c.team][0], accent: this.colors[c.team][1],
      shorts: shade(this.colors[c.team][0], -40),
      num: c.num, handedness: c.handedness, isLibero: c.isLibero,
      name: c.name, anim: c.anim, animT: c.animT,
      expression: exprFromState(c.expression, c.anim),
      facing: c.facing, starSig: null,
      showLabel: this.shouldShowLabel(c),
      crestColor: this.colors[c.team][1],
    };
    drawCharacter(ctx, draw, sx, sy, bodyH, bob);
  }

  private drawBall(ctx: CanvasRenderingContext2D, cam: ReturnType<CourtView['makeCam']>) {
    if (this.graphics !== 'low' && this.ball.trail.length > 2) {
      for (let i = 0; i < this.ball.trail.length; i++) {
        const p = this.ball.trail[i];
        const [x, y, sc] = cam.project(p.x, p.y, p.z);
        ctx.globalAlpha = (i / this.ball.trail.length) * 0.35;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x, y, Math.max(2, sc * 0.06), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    const [bx, by, sc] = cam.project(this.ball.x, this.ball.y, this.ball.z);
    const r = Math.max(5, sc * 0.12);
    const [, sy] = cam.project(this.ball.x, this.ball.y, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(bx, sy + 3, r * 0.85, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(bx - r * 0.3, by - r * 0.3, r * 0.1, bx, by, r);
    g.addColorStop(0, '#fff'); g.addColorStop(1, '#e8dcc8');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c45c26'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx - r, by); ctx.quadraticCurveTo(bx, by - r * 0.25, bx + r, by); ctx.stroke();
  }
}

function zoneToPos(zone: number, team: 0 | 1): [number, number] {
  // Remap so y=0 is NEAR camera (sideline). Zones: 1 RB, 2 RF, 3 MF, 4 LF, 5 LB, 6 CB
  // Near sideline y small: zones 2,3,4 toward y=1.5-2.5; back row y=5-7
  const home: Record<number, [number, number]> = {
    1: [7.2, 6.5], 2: [7.4, 0.9], 3: [5.0, 1.4], 4: [2.2, 0.9], 5: [2.2, 6.5], 6: [3.5, 5.2],
  };
  const p = home[zone] ?? [4.5, 4.5];
  if (team === 1) return [18 - p[0], p[1]]; // same near/far — both teams use same sideline perspective
  return p;
}

function isDark(hex: string): boolean {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return false;
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

function shade(hex: string, amt: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return '#333';
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  const r = clamp(parseInt(m[1], 16) + amt);
  const g = clamp(parseInt(m[2], 16) + amt);
  const b = clamp(parseInt(m[3], 16) + amt);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
