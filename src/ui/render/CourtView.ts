/** Courtside broadcast-camera volleyball match renderer. Simulation = Truth; this only visualises the event log. */
import type { SimEvent } from '../../engine/types';
import type { Appearance } from '../../engine/types';
import { getPlayer } from '../../engine/db';

type Anim =
  | 'idle' | 'ready' | 'run' | 'sideStep' | 'approach' | 'jump' | 'spike' | 'quickSpike'
  | 'backAttack' | 'tip' | 'set' | 'jumpSet' | 'dump' | 'block' | 'landing'
  | 'receive' | 'dig' | 'dive' | 'serve' | 'jumpServe' | 'celebrate' | 'frustrate' | 'timeout';

interface Char {
  id: string;
  team: 0 | 1;
  num: number;
  name: string;
  heightCm: number;
  appearance: Appearance;
  handedness: 'R' | 'L';
  x: number; y: number; z: number; // court coords: x along length 0-18, y across 0-9, z height
  tx: number; ty: number;
  anim: Anim;
  animT: number;
  facing: number; // radians
  jumpH: number;
  expression: number; // -1 frustrate .. 1 celebrate
}

interface Ball {
  x: number; y: number; z: number;
  tx: number; ty: number; tz: number;
  t: number; dur: number;
  spin: number;
  wobble: number;
  trail: { x: number; y: number; z: number }[];
}

interface Flash { text: string; t: number; color: string; }

const COURT_L = 18, COURT_W = 9;

export class CourtView {
  chars = new Map<string, Char>();
  ball: Ball = { x: 9, y: 4.5, z: 1.2, tx: 9, ty: 4.5, tz: 1.2, t: 1, dur: 1, spin: 0, wobble: 0, trail: [] };
  colors: [[string, string], [string, string]];
  score: [number, number] = [0, 0];
  sets: [number, number] = [0, 0];
  setNumber = 1;
  serving: 0 | 1 = 0;
  flash: Flash | null = null;
  shake = 0;
  crowd = 0.3;
  camMode: 'courtside' | 'broadcast' | 'behindServe' | 'net' | 'closeup' = 'courtside';
  camT = 0;
  slowMo = 1;
  graphics: 'low' | 'medium' | 'high' | 'ultra' = 'high';
  teamNames: [string, string] = ['HOME', 'AWAY'];
  lastEvent = '';
  private time = 0;
  private eventQueue: { e: SimEvent; at: number }[] = [];
  private playT = 0;

  constructor(
    lineups: [string[], string[]],
    colors: [[string, string], [string, string]],
    names: [string, string],
  ) {
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
            appearance: def?.appearance ?? { hairColor: '#222', hairStyle: 0, skinTone: 2, eyeColor: '#333', build: 0.5, faceId: 0 },
            handedness: def?.handedness ?? 'R',
            x: 0, y: 0, z: 0, tx: 0, ty: 0, anim: 'idle', animT: 0, facing: team === 0 ? 0 : Math.PI,
            jumpH: 0, expression: 0,
          };
          this.chars.set(id, c);
        }
        c.team = team;
        // home left (x 0-9), away right (x 9-18). Zones 1-6 mapped.
        const zone = i + 1;
        const pos = zoneToPos(zone, team);
        c.tx = pos[0]; c.ty = pos[1];
        if (c.x === 0 && c.y === 0) { c.x = c.tx; c.y = c.ty; }
      });
    }
    for (const id of [...this.chars.keys()]) if (!keep.has(id)) this.chars.delete(id);
  }

  apply(events: SimEvent[]) {
    for (const e of events) {
      this.eventQueue.push({ e, at: this.playT + this.eventQueue.length * 0.08 });
      this.handleImmediate(e);
    }
  }

  private handleImmediate(e: SimEvent) {
    if (e.score) this.score = [e.score[0], e.score[1]];
    if (e.set) this.setNumber = e.set;
    if (e.type === 'point' || e.type === 'ace' || e.type === 'kill' || e.type === 'blockPoint') {
      this.shake = 0.4;
      this.crowd = Math.min(1, this.crowd + 0.15);
      if (e.player) {
        const c = this.chars.get(e.player);
        if (c) { c.anim = 'celebrate'; c.animT = 0; c.expression = 1; }
      }
    }
    if (e.type === 'serveError' || e.type === 'attackError' || e.type === 'receiveError') {
      if (e.player) {
        const c = this.chars.get(e.player);
        if (c) { c.anim = 'frustrate'; c.animT = 0; c.expression = -1; }
      }
    }
    if (e.text) this.lastEvent = e.text;
    if (e.type === 'signature' && e.text) {
      this.flash = { text: e.text, t: 1.8, color: '#ffd166' };
      this.slowMo = 0.45;
    }
    if (e.type === 'kill' || e.type === 'ace' || e.type === 'blockPoint') {
      this.flash = { text: (e.text || e.type).toUpperCase(), t: 1.2, color: '#ff4d6d' };
      this.camMode = 'closeup'; this.camT = 1.2;
    }

    // Animate ball / characters from event
    this.animateEvent(e);
  }

  private animateEvent(e: SimEvent) {
    const actor = e.player ? this.chars.get(e.player) : null;
    const target = e.player2 ? this.chars.get(e.player2) : null;

    switch (e.type) {
      case 'serve': {
        if (!actor) break;
        actor.anim = (e.kind === 'jump' || e.kind === 'powerJump' || e.kind === 'jumpFloat') ? 'jumpServe' : 'serve';
        actor.animT = 0;
        this.camMode = 'behindServe'; this.camT = 1.5;
        const to = target ?? [...this.chars.values()].find((c) => c.team !== actor.team);
        if (to) this.flyBall(actor.x, actor.y, 2.2, to.x, to.y, 1.0, 0.9, e.kind === 'float' || e.kind === 'jumpFloat' ? 1 : 0);
        break;
      }
      case 'receive':
      case 'dig': {
        if (!actor) break;
        actor.anim = e.type === 'dig' ? (Math.random() > 0.6 ? 'dive' : 'dig') : 'receive';
        actor.animT = 0;
        this.ball.x = actor.x; this.ball.y = actor.y; this.ball.z = 0.8;
        // pass toward setter-ish mid
        const midX = actor.team === 0 ? 7 : 11;
        this.flyBall(actor.x, actor.y, 0.8, midX, 4.5, 2.5, 0.65, 0);
        break;
      }
      case 'set': {
        if (!actor) break;
        actor.anim = 'jumpSet'; actor.animT = 0;
        const to = target;
        if (to) {
          to.anim = e.kind?.startsWith('quick') ? 'quickSpike' : 'approach';
          to.animT = 0;
          const hx = to.team === 0 ? Math.min(to.x + 1.2, 8.7) : Math.max(to.x - 1.2, 9.3);
          this.flyBall(actor.x, actor.y, 2.4, hx, to.y, 3.0, 0.45, 0);
          this.camMode = e.kind?.startsWith('quick') ? 'net' : 'courtside';
          this.camT = 1;
        }
        break;
      }
      case 'attack':
      case 'kill': {
        if (!actor) break;
        actor.anim = e.kind?.startsWith('quick') ? 'quickSpike' : e.kind === 'tip' ? 'tip' : e.kind === 'backAttack' || e.kind === 'pipe' ? 'backAttack' : 'spike';
        actor.animT = 0;
        actor.jumpH = 1;
        const landX = actor.team === 0 ? 12 + Math.random() * 4 : 2 + Math.random() * 4;
        const landY = 1.5 + Math.random() * 6;
        this.flyBall(actor.x, actor.y, 3.2, landX, landY, 0.3, 0.55, 0);
        this.shake = 0.25;
        break;
      }
      case 'block':
      case 'blockPoint': {
        if (!actor) break;
        actor.anim = 'block'; actor.animT = 0; actor.jumpH = 1;
        this.camMode = 'net'; this.camT = 1;
        if (e.type === 'blockPoint') {
          const bx = actor.team === 0 ? actor.x - 3 : actor.x + 3;
          this.flyBall(this.ball.x, this.ball.y, 3.0, bx, actor.y, 0.4, 0.4, 0);
        }
        break;
      }
      case 'setterDump': {
        if (!actor) break;
        actor.anim = 'dump'; actor.animT = 0;
        this.camMode = 'net'; this.camT = 1;
        const dx = actor.team === 0 ? 11 : 7;
        this.flyBall(actor.x, actor.y, 2.2, dx, actor.y + (Math.random() - 0.5), 0.5, 0.4, 0);
        break;
      }
      case 'ace': {
        this.flash = { text: 'ACE!', t: 1.5, color: '#ffd166' };
        this.shake = 0.5; this.crowd = 1;
        break;
      }
    }
  }

  private flyBall(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, dur: number, wobble: number) {
    this.ball.x = x0; this.ball.y = y0; this.ball.z = z0;
    this.ball.tx = x1; this.ball.ty = y1; this.ball.tz = z1;
    this.ball.t = 0; this.ball.dur = Math.max(0.2, dur);
    this.ball.wobble = wobble;
    this.ball.spin = (x1 - x0) * 2;
    this.ball.trail = [];
  }

  update(dt: number) {
    const d = dt * this.slowMo;
    this.time += d;
    this.playT += d;
    if (this.slowMo < 1) this.slowMo = Math.min(1, this.slowMo + d * 0.35);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - d * 2);
    if (this.flash) { this.flash.t -= d; if (this.flash.t <= 0) this.flash = null; }
    if (this.camT > 0) { this.camT -= d; if (this.camT <= 0) this.camMode = 'courtside'; }
    this.crowd = Math.max(0.25, this.crowd - d * 0.05);

    // Ball flight with arc
    if (this.ball.t < this.ball.dur) {
      this.ball.t += d;
      const u = Math.min(1, this.ball.t / this.ball.dur);
      const arc = Math.sin(u * Math.PI) * Math.max(0.5, Math.abs(this.ball.tz - this.ball.z) * 0.3 + 1.2);
      const bx = this.ball.x, by = this.ball.y, bz = this.ball.z;
      // store start on first frame via trail trick — use lerp from initial
      // We overwrite x each frame from stored start in tx fields... keep start in trail[0]
      if (this.ball.trail.length === 0) this.ball.trail.push({ x: bx, y: by, z: bz });
      const s = this.ball.trail[0];
      let x = s.x + (this.ball.tx - s.x) * u;
      let y = s.y + (this.ball.ty - s.y) * u;
      let z = s.z + (this.ball.tz - s.z) * u + arc * (1 - Math.abs(2 * u - 1) * 0.3);
      if (this.ball.wobble > 0) {
        x += Math.sin(u * 18) * 0.15 * this.ball.wobble;
        y += Math.cos(u * 14) * 0.1 * this.ball.wobble;
      }
      this.ball.x = x; this.ball.y = y; this.ball.z = z;
      if (this.graphics !== 'low') {
        this.ball.trail.push({ x, y, z });
        if (this.ball.trail.length > 12) this.ball.trail.splice(1, 1); // keep start
      }
    }

    for (const c of this.chars.values()) {
      // move toward target
      const dx = c.tx - c.x, dy = c.ty - c.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.05) {
        const spd = (c.anim === 'approach' || c.anim === 'run' ? 6 : 3.5) * d;
        const m = Math.min(dist, spd);
        c.x += (dx / dist) * m;
        c.y += (dy / dist) * m;
        if (c.anim === 'idle' || c.anim === 'ready') c.anim = 'run';
      } else if (c.anim === 'run' || c.anim === 'sideStep') {
        c.anim = 'ready';
      }
      c.animT += d;
      if (c.jumpH > 0) c.jumpH = Math.max(0, c.jumpH - d * 1.8);
      if (c.expression !== 0) c.expression *= 0.98;
      // return to idle
      if (c.animT > 1.2 && ['spike','quickSpike','block','serve','jumpServe','receive','dig','dive','set','jumpSet','dump','celebrate','frustrate','landing','tip','backAttack','approach'].includes(c.anim)) {
        if (['spike','quickSpike','block','jumpServe','backAttack'].includes(c.anim)) c.anim = 'landing';
        else c.anim = 'ready';
        c.animT = 0;
      }
      if (c.anim === 'landing' && c.animT > 0.35) { c.anim = 'ready'; c.animT = 0; }
    }
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    // shake
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * 10 * this.shake, (Math.random() - 0.5) * 8 * this.shake);
    }

    // Camera projection — courtside slightly low from sideline
    const cam = this.camera(w, h);

    // Background gym
    this.drawGym(ctx, w, h);
    // Audience
    if (this.graphics !== 'low') this.drawAudience(ctx, w, h, cam);
    // Court floor (perspective)
    this.drawCourt(ctx, cam);
    // Net
    this.drawNet(ctx, cam);
    // Benches / coach
    if (this.graphics === 'high' || this.graphics === 'ultra') this.drawBenches(ctx, cam);
    // Characters sorted by depth (y)
    const list = [...this.chars.values()].sort((a, b) => a.y - b.y);
    for (const c of list) this.drawChar(ctx, c, cam);
    // Ball
    this.drawBall(ctx, cam);
    // Flash text
    if (this.flash) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.flash.t);
      ctx.font = `bold ${Math.floor(h * 0.08)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = this.flash.color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.strokeText(this.flash.text, w / 2, h * 0.22);
      ctx.fillText(this.flash.text, w / 2, h * 0.22);
      ctx.restore();
    }
    ctx.restore();
  }

  private camera(w: number, h: number) {
    // Project court (x:0-18, y:0-9) to screen with courtside perspective
    const padX = w * 0.06, padY = h * 0.12;
    let focusX = 9, focusY = 4.5, zoom = 1;
    if (this.camMode === 'behindServe') {
      focusX = this.serving === 0 ? 2 : 16;
      zoom = 1.25;
    } else if (this.camMode === 'net') {
      focusX = 9; focusY = this.ball.y; zoom = 1.35;
    } else if (this.camMode === 'closeup') {
      focusX = this.ball.x; focusY = this.ball.y; zoom = 1.5;
    } else if (this.camMode === 'broadcast') {
      zoom = 0.92;
    }
    // Mobile: pan toward ball
    if (w < 700) {
      focusX = this.ball.x; focusY = this.ball.y; zoom = 1.55;
    }
    const scaleX = ((w - padX * 2) / COURT_L) * zoom;
    const scaleY = ((h - padY * 2) / COURT_W) * zoom * 0.85;
    const cx = w / 2 - (focusX - 9) * scaleX * 0.4;
    const cy = h * 0.68 - (focusY - 4.5) * scaleY * 0.35;
    return {
      project(x: number, y: number, z = 0): [number, number, number] {
        // slight perspective: farther (smaller y toward top of screen? sideline cam looks across y)
        // Courtside: x -> horizontal, y -> depth (up screen = far), z -> up
        const depth = 1 + (y / COURT_W) * 0.25;
        const sx = cx + (x - 9) * scaleX * depth;
        const sy = cy - y * scaleY * 0.48 - z * scaleY * 1.35 - (h * 0.05);
        const sc = scaleY * depth;
        return [sx, sy, sc];
      },
      scaleX, scaleY, w, h,
    };
  }

  private drawGym(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1a2740');
    g.addColorStop(0.45, '#243656');
    g.addColorStop(1, '#0d1a28');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // ceiling lights
    if (this.graphics !== 'low') {
      for (let i = 0; i < 5; i++) {
        const x = w * (0.15 + i * 0.18);
        ctx.fillStyle = 'rgba(255,240,200,0.15)';
        ctx.beginPath(); ctx.ellipse(x, h * 0.06, 40, 10, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  private drawAudience(ctx: CanvasRenderingContext2D, w: number, h: number, cam: ReturnType<CourtView['camera']>) {
    const rows = this.graphics === 'ultra' ? 5 : 3;
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < 28 - r * 2; i++) {
        const x = w * (0.05 + i / 30) + Math.sin(this.time * (2 + this.crowd * 3) + i) * this.crowd * 2;
        const y = h * (0.08 + r * 0.035);
        ctx.fillStyle = `hsl(${(i * 37 + r * 20) % 360} 40% ${30 + this.crowd * 20}%)`;
        ctx.fillRect(x, y, 5, 8);
      }
    }
  }

  private drawCourt(ctx: CanvasRenderingContext2D, cam: ReturnType<CourtView['camera']>) {
    const corners = [
      cam.project(0, 0), cam.project(18, 0), cam.project(18, 9), cam.project(0, 9),
    ];
    ctx.beginPath();
    ctx.moveTo(corners[0][0], corners[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(corners[i][0], corners[i][1]);
    ctx.closePath();
    const g = ctx.createLinearGradient(corners[0][0], corners[0][1], corners[2][0], corners[2][1]);
    g.addColorStop(0, '#c4a574');
    g.addColorStop(0.5, '#d4b896');
    g.addColorStop(1, '#b8956a');
    ctx.fillStyle = g;
    ctx.fill();
    // lines
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    const line = (x0: number, y0: number, x1: number, y1: number) => {
      const a = cam.project(x0, y0), b = cam.project(x1, y1);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    };
    line(0, 0, 18, 0); line(18, 0, 18, 9); line(18, 9, 0, 9); line(0, 9, 0, 0);
    line(9, 0, 9, 9); // center / under net
    line(3, 0, 3, 9); line(15, 0, 15, 9); // attack lines
  }

  private drawNet(ctx: CanvasRenderingContext2D, cam: ReturnType<CourtView['camera']>) {
    const a = cam.project(9, 0, 0), b = cam.project(9, 9, 0);
    const at = cam.project(9, 0, 2.43), bt = cam.project(9, 9, 2.43);
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(at[0], at[1]); ctx.lineTo(bt[0], bt[1]); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,200,220,0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const x0 = a[0] + (b[0] - a[0]) * t, y0 = a[1] + (b[1] - a[1]) * t;
      const x1 = at[0] + (bt[0] - at[0]) * t, y1 = at[1] + (bt[1] - at[1]) * t;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    // posts
    ctx.strokeStyle = '#888'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(at[0], at[1] - 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(bt[0], bt[1] - 10); ctx.stroke();
  }

  private drawBenches(ctx: CanvasRenderingContext2D, cam: ReturnType<CourtView['camera']>) {
    const left = cam.project(-1.2, 4.5, 0);
    const right = cam.project(19.2, 4.5, 0);
    ctx.fillStyle = this.colors[0][0];
    ctx.fillRect(left[0] - 30, left[1] - 20, 50, 18);
    ctx.fillStyle = this.colors[1][0];
    ctx.fillRect(right[0] - 20, right[1] - 20, 50, 18);
  }

  private drawChar(ctx: CanvasRenderingContext2D, c: Char, cam: ReturnType<CourtView['camera']>) {
    const jump = c.jumpH * 1.1 + (c.anim === 'spike' || c.anim === 'block' || c.anim === 'jumpServe' || c.anim === 'quickSpike' || c.anim === 'jumpSet' || c.anim === 'backAttack' ? Math.sin(Math.min(1, c.animT) * Math.PI) * 1.3 : 0);
    const [sx, sy, sc] = cam.project(c.x, c.y, jump);
    // Character height on screen: near-camera ~25-45% of court height
    const bodyH = sc * (1.85 + (c.heightCm - 170) * 0.018);
    const build = 0.7 + c.appearance.build * 0.5;
    const skin = skinColor(c.appearance.skinTone);
    const jersey = this.colors[c.team][0];
    const accent = this.colors[c.team][1];
    const bob = Math.sin(this.time * 6 + c.num) * (c.anim === 'idle' || c.anim === 'ready' ? 1.2 : 0);

    ctx.save();
    ctx.translate(sx, sy + bob);

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, 4, bodyH * 0.22, bodyH * 0.06, 0, 0, Math.PI * 2); ctx.fill();

    const facing = c.team === 0 ? 1 : -1;
    // legs
    ctx.strokeStyle = jersey;
    ctx.lineWidth = bodyH * 0.08 * build;
    ctx.lineCap = 'round';
    const legSpread = c.anim === 'ready' || c.anim === 'receive' || c.anim === 'dig' ? 0.18 : c.anim === 'dive' ? 0.35 : 0.1;
    const squat = ['ready','receive','dig','block','approach'].includes(c.anim) ? 0.12 : 0;
    ctx.beginPath();
    ctx.moveTo(-bodyH * legSpread, -bodyH * 0.15);
    ctx.lineTo(-bodyH * (legSpread + 0.02), bodyH * 0.02);
    ctx.moveTo(bodyH * legSpread, -bodyH * 0.15);
    ctx.lineTo(bodyH * (legSpread + 0.02), bodyH * 0.02);
    ctx.stroke();

    // torso
    const torsoTop = -bodyH * (0.55 - squat);
    const torsoBot = -bodyH * 0.15;
    ctx.fillStyle = jersey;
    ctx.beginPath();
    ctx.moveTo(-bodyH * 0.14 * build, torsoBot);
    ctx.lineTo(-bodyH * 0.16 * build, torsoTop);
    ctx.lineTo(bodyH * 0.16 * build, torsoTop);
    ctx.lineTo(bodyH * 0.14 * build, torsoBot);
    ctx.closePath();
    ctx.fill();
    // number
    ctx.fillStyle = accent;
    ctx.font = `bold ${Math.max(8, bodyH * 0.14)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(String(c.num), 0, (torsoTop + torsoBot) / 2 + bodyH * 0.05);

    // arms based on anim
    ctx.strokeStyle = skin;
    ctx.lineWidth = bodyH * 0.06;
    const armAnim = armPose(c.anim, c.animT, c.handedness, facing);
    ctx.beginPath();
    ctx.moveTo(-bodyH * 0.15 * build, torsoTop + bodyH * 0.05);
    ctx.lineTo(-bodyH * 0.15 * build + armAnim.lx * bodyH, torsoTop + armAnim.ly * bodyH);
    ctx.moveTo(bodyH * 0.15 * build, torsoTop + bodyH * 0.05);
    ctx.lineTo(bodyH * 0.15 * build + armAnim.rx * bodyH, torsoTop + armAnim.ry * bodyH);
    ctx.stroke();

    // head
    const headR = bodyH * 0.11;
    const headY = torsoTop - headR * 1.1;
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(0, headY, headR, 0, Math.PI * 2); ctx.fill();
    // hair
    ctx.fillStyle = c.appearance.hairColor;
    ctx.beginPath();
    if (c.appearance.hairStyle <= 2) {
      // short / spiky
      ctx.arc(0, headY - headR * 0.2, headR * 1.05, Math.PI * 1.1, Math.PI * 1.9);
      for (let i = 0; i < 5; i++) {
        const ang = Math.PI * 1.2 + i * 0.2;
        ctx.lineTo(Math.cos(ang) * headR * 1.35, headY + Math.sin(ang) * headR * 1.1 - headR * 0.3);
      }
    } else if (c.appearance.hairStyle <= 4) {
      ctx.ellipse(0, headY - headR * 0.3, headR * 1.15, headR * 0.9, 0, 0, Math.PI * 2);
    } else {
      // longish
      ctx.ellipse(0, headY - headR * 0.1, headR * 1.1, headR * 1.2, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    // eyes
    ctx.fillStyle = c.appearance.eyeColor;
    const eyeY = headY - headR * 0.05;
    ctx.beginPath(); ctx.ellipse(-headR * 0.35 * facing, eyeY, headR * 0.12, headR * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(headR * 0.25 * facing, eyeY, headR * 0.12, headR * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    // expression mouth
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (c.expression > 0.3 || c.anim === 'celebrate') {
      ctx.arc(0, headY + headR * 0.35, headR * 0.25, 0.1, Math.PI - 0.1);
    } else if (c.expression < -0.3 || c.anim === 'frustrate') {
      ctx.arc(0, headY + headR * 0.5, headR * 0.25, Math.PI + 0.2, -0.2);
    } else {
      ctx.moveTo(-headR * 0.2, headY + headR * 0.4);
      ctx.lineTo(headR * 0.2, headY + headR * 0.4);
    }
    ctx.stroke();

    // name tag for stars / nearby
    if (bodyH > 40) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      const label = c.name.split(' ').pop()!;
      ctx.font = `${Math.max(9, bodyH * 0.1)}px sans-serif`;
      const tw = ctx.measureText(label).width;
      ctx.fillRect(-tw / 2 - 3, 6, tw + 6, 12);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, 0, 15);
    }
    ctx.restore();
  }

  private drawBall(ctx: CanvasRenderingContext2D, cam: ReturnType<CourtView['camera']>) {
    // trail
    if (this.graphics !== 'low' && this.ball.trail.length > 2) {
      for (let i = 1; i < this.ball.trail.length; i++) {
        const p = this.ball.trail[i];
        const [x, y, sc] = cam.project(p.x, p.y, p.z);
        ctx.globalAlpha = i / this.ball.trail.length * 0.4;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x, y, sc * 0.08, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    const [bx, by, sc] = cam.project(this.ball.x, this.ball.y, this.ball.z);
    const r = Math.max(4, sc * 0.14);
    // shadow
    const [, sy] = cam.project(this.ball.x, this.ball.y, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(bx, sy + 2, r * 0.8, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    // ball
    const g = ctx.createRadialGradient(bx - r * 0.3, by - r * 0.3, r * 0.1, bx, by, r);
    g.addColorStop(0, '#fff');
    g.addColorStop(1, '#e8e0d0');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c45c26';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.stroke();
    // panels
    ctx.beginPath();
    ctx.moveTo(bx - r, by); ctx.quadraticCurveTo(bx, by - r * 0.3, bx + r, by);
    ctx.stroke();
  }
}

function zoneToPos(zone: number, team: 0 | 1): [number, number] {
  // zones: 1 RB, 2 RF, 3 MF, 4 LF, 5 LB, 6 MB(back)
  const home: Record<number, [number, number]> = {
    1: [7.5, 7.2], 2: [7.5, 1.8], 3: [5.5, 4.5], 4: [2.5, 1.8], 5: [2.5, 7.2], 6: [3.5, 4.5],
  };
  const p = home[zone] ?? [4.5, 4.5];
  if (team === 1) return [18 - p[0], 9 - p[1]];
  return p;
}

function skinColor(tone: number): string {
  const tones = ['#f5d0b0', '#e8b898', '#d4a074', '#c6865c', '#8d5524', '#5c3317'];
  return tones[Math.max(0, Math.min(5, tone))] ?? tones[2];
}

function armPose(anim: Anim, t: number, hand: 'R' | 'L', facing: number) {
  const swing = Math.min(1, t * 2);
  switch (anim) {
    case 'spike': case 'quickSpike': case 'backAttack':
      return hand === 'R'
        ? { lx: -0.1, ly: 0.15, rx: 0.05 * facing, ry: -0.45 + swing * 0.6 }
        : { lx: -0.05 * facing, ly: -0.45 + swing * 0.6, rx: 0.1, ry: 0.15 };
    case 'block':
      return { lx: -0.05, ly: -0.5, rx: 0.05, ry: -0.5 };
    case 'set': case 'jumpSet':
      return { lx: -0.08, ly: -0.4, rx: 0.08, ry: -0.4 };
    case 'receive': case 'dig':
      return { lx: -0.2, ly: 0.25, rx: 0.2, ry: 0.25 };
    case 'dive':
      return { lx: -0.35, ly: 0.1, rx: 0.35, ry: 0.1 };
    case 'serve': case 'jumpServe':
      return { lx: -0.1, ly: 0.1, rx: 0.1 * facing, ry: -0.4 + swing * 0.5 };
    case 'dump': case 'tip':
      return { lx: -0.05, ly: -0.2, rx: 0.15, ry: -0.25 };
    case 'celebrate':
      return { lx: -0.15, ly: -0.45, rx: 0.15, ry: -0.45 };
    default:
      return { lx: -0.08, ly: 0.2, rx: 0.08, ry: 0.2 };
  }
}
