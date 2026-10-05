/** Anime-sports character drawing with skeletal poses. */
export type Anim =
  | 'idle' | 'ready' | 'run' | 'sideStep' | 'approach' | 'jump' | 'spike' | 'quickSpike'
  | 'backAttack' | 'tip' | 'set' | 'jumpSet' | 'dump' | 'block' | 'landing'
  | 'receive' | 'dig' | 'dive' | 'roll' | 'serve' | 'jumpServe' | 'jumpFloat'
  | 'celebrate' | 'frustrate' | 'timeout' | 'eyeTrack';

export type Expr = 'focused' | 'confident' | 'excited' | 'frustrated' | 'surprised' | 'celebrating' | 'neutral';

export interface CharDraw {
  heightCm: number;
  build: number; // 0 slim .. 1 bulky
  hairColor: string;
  hairStyle: number;
  skinTone: number;
  eyeColor: string;
  jersey: string;
  accent: string;
  shorts: string;
  num: number;
  handedness: 'R' | 'L';
  isLibero: boolean;
  name: string;
  anim: Anim;
  animT: number;
  expression: Expr;
  facing: number; // 1 = right, -1 = left
  starSig?: string | null;
  showLabel?: boolean;
  crestColor?: string;
  /** Extra jump height multiplier from contact cue (0-1+) */
  jumpBoost?: number;
}

function skin(tone: number): string {
  return ['#f6d5b8', '#e8b896', '#d4a074', '#c6865c', '#8d5524', '#5c3317'][Math.max(0, Math.min(5, tone))];
}

function shadeHex(hex: string, amt: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return hex;
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  const r = clamp(parseInt(m[1], 16) + amt);
  const g = clamp(parseInt(m[2], 16) + amt);
  const b = clamp(parseInt(m[3], 16) + amt);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

interface Pose {
  hipY: number; torsoLean: number;
  lThigh: number; lShin: number; rThigh: number; rShin: number;
  lArm: number; lFore: number; rArm: number; rFore: number;
  squat: number; jump: number;
}

const BASE: Pose = {
  hipY: 0.42, torsoLean: 0,
  lThigh: 0.08, lShin: 0.02, rThigh: -0.08, rShin: 0.02,
  lArm: 0.25, lFore: 0.45, rArm: 0.25, rFore: 0.45,
  squat: 0, jump: 0,
};

function poseFor(anim: Anim, t: number, hand: 'R' | 'L'): Pose {
  const p = { ...BASE };
  const u = Math.min(1, t);
  const swing = Math.sin(u * Math.PI);
  switch (anim) {
    case 'ready': case 'idle':
      p.squat = 0.08; p.lThigh = 0.14; p.rThigh = -0.14;
      p.lArm = 0.35; p.rArm = 0.35; p.torsoLean = 0.05;
      break;
    case 'run': case 'sideStep': case 'approach': {
      const g = Math.sin(t * 14);
      p.lThigh = g * 0.35; p.rThigh = -g * 0.35;
      p.lShin = Math.max(0, g) * 0.2; p.rShin = Math.max(0, -g) * 0.2;
      p.lArm = 0.2 - g * 0.3; p.rArm = 0.2 + g * 0.3;
      p.torsoLean = 0.12; p.squat = 0.05;
      if (anim === 'approach') { p.torsoLean = 0.2; p.squat = 0.1; }
      break;
    }
    case 'jump': case 'landing':
      p.jump = anim === 'jump' ? swing * 1.2 : (1 - u) * 0.4;
      p.lThigh = 0.2; p.rThigh = -0.15; p.squat = anim === 'landing' ? 0.25 : 0.05;
      break;
    case 'spike': case 'quickSpike': case 'backAttack': {
      p.jump = Math.sin(Math.min(1, t * 1.2) * Math.PI) * 1.35;
      p.squat = 0.02; p.torsoLean = -0.15 + u * 0.35;
      const armUp = -0.85 + swing * 1.1;
      if (hand === 'R') { p.rArm = armUp; p.rFore = armUp + 0.15; p.lArm = 0.3; }
      else { p.lArm = armUp; p.lFore = armUp + 0.15; p.rArm = 0.3; }
      break;
    }
    case 'tip': case 'dump':
      p.jump = swing * 0.7; p.torsoLean = 0.1;
      if (hand === 'R') { p.rArm = -0.35; p.rFore = -0.15; } else { p.lArm = -0.35; p.lFore = -0.15; }
      break;
    case 'block': case 'eyeTrack':
      p.jump = Math.sin(Math.min(1, t * 1.3) * Math.PI) * 1.15;
      p.lArm = -0.95; p.rArm = -0.95; p.lFore = -1.05; p.rFore = -1.05;
      p.torsoLean = -0.05;
      break;
    case 'set': case 'jumpSet':
      p.jump = anim === 'jumpSet' ? swing * 0.9 : 0.05;
      p.lArm = -0.7; p.rArm = -0.7; p.lFore = -0.85; p.rFore = -0.85;
      p.squat = 0.06;
      break;
    case 'receive':
      p.squat = 0.28; p.torsoLean = 0.25; p.lThigh = 0.22; p.rThigh = -0.22;
      p.lArm = 0.55; p.rArm = 0.55; p.lFore = 0.7; p.rFore = 0.7;
      break;
    case 'dig':
      p.squat = 0.35; p.torsoLean = 0.3; p.lArm = 0.65; p.rArm = 0.65;
      break;
    case 'dive': case 'roll':
      p.squat = 0.55; p.torsoLean = 0.55; p.hipY = 0.22;
      p.lArm = 0.8; p.rArm = 0.8; p.jump = -0.15;
      break;
    case 'serve':
      p.torsoLean = -0.1 + u * 0.3;
      if (hand === 'R') { p.rArm = -0.7 + swing * 1.0; p.lArm = 0.4; }
      else { p.lArm = -0.7 + swing * 1.0; p.rArm = 0.4; }
      break;
    case 'jumpServe': case 'jumpFloat':
      p.jump = swing * 1.2; p.torsoLean = -0.2 + u * 0.4;
      if (hand === 'R') { p.rArm = -0.9 + swing * 1.2; } else { p.lArm = -0.9 + swing * 1.2; }
      break;
    case 'celebrate':
      p.lArm = -0.9; p.rArm = -0.9; p.jump = Math.abs(Math.sin(t * 8)) * 0.25;
      p.lThigh = 0.1; p.rThigh = -0.1;
      break;
    case 'frustrate':
      p.torsoLean = 0.2; p.lArm = 0.5; p.rArm = 0.5; p.squat = 0.15;
      break;
    case 'timeout':
      p.squat = 0.2; p.lArm = 0.2; p.rArm = 0.2;
      break;
  }
  return p;
}

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  c: CharDraw,
  sx: number, sy: number,
  bodyH: number,
  bob = 0,
) {
  if (bodyH < 8) return;
  const sk = skin(c.skinTone);
  const pose = poseFor(c.anim, c.animT, c.handedness);
  if (c.jumpBoost && c.jumpBoost > 0) pose.jump *= (0.75 + c.jumpBoost);
  const face = c.facing || 1;
  const build = 0.75 + c.build * 0.45;
  const jersey = c.isLibero ? contrastLibero(c.jersey, c.accent) : c.jersey;
  const jerseyDark = shadeHex(jersey, -28);
  const jerseyLite = shadeHex(jersey, 22);

  ctx.save();
  ctx.translate(sx, sy + bob - pose.jump * bodyH * 0.55);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 4, bodyH * 0.18 * (1 - pose.jump * 0.3), bodyH * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();

  const hipY = -bodyH * (pose.hipY - pose.squat * 0.15);
  const shoulderY = hipY - bodyH * 0.28;
  const headR = bodyH * 0.095;
  const headY = shoulderY - headR * 1.35;

  const drawLeg = (side: number, thigh: number, shin: number) => {
    const hx = side * bodyH * 0.06 * build;
    const kneeX = hx + side * thigh * bodyH * 0.35;
    const kneeY = hipY + bodyH * 0.2;
    const footX = kneeX + side * shin * bodyH * 0.15;
    const footY = 0;
    ctx.strokeStyle = c.shorts;
    ctx.lineWidth = bodyH * 0.09 * build;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx, hipY); ctx.lineTo(kneeX, kneeY); ctx.stroke();
    ctx.strokeStyle = sk;
    ctx.lineWidth = bodyH * 0.07 * build;
    ctx.beginPath(); ctx.moveTo(kneeX, kneeY); ctx.lineTo(footX, footY); ctx.stroke();
    ctx.fillStyle = '#eee';
    ctx.beginPath(); ctx.ellipse(kneeX, kneeY, bodyH * 0.045, bodyH * 0.04, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.ellipse(footX + side * bodyH * 0.03, footY, bodyH * 0.07, bodyH * 0.03, 0, 0, Math.PI * 2); ctx.fill();
  };
  drawLeg(-1, pose.lThigh, pose.lShin);
  drawLeg(1, pose.rThigh, pose.rShin);

  // Torso with shading + thin collar stripe
  const tw = bodyH * 0.15 * build;
  const tg = ctx.createLinearGradient(-tw, shoulderY, tw, hipY);
  tg.addColorStop(0, jerseyLite);
  tg.addColorStop(0.45, jersey);
  tg.addColorStop(1, jerseyDark);
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(-tw * 0.85, hipY);
  ctx.lineTo(-tw * 1.05, shoulderY);
  ctx.lineTo(tw * 1.05, shoulderY);
  ctx.lineTo(tw * 0.85, hipY);
  ctx.closePath();
  ctx.fill();
  // Collar accent
  ctx.strokeStyle = c.accent;
  ctx.lineWidth = Math.max(1, bodyH * 0.018);
  ctx.beginPath();
  ctx.moveTo(-tw * 0.7, shoulderY + bodyH * 0.02);
  ctx.lineTo(tw * 0.7, shoulderY + bodyH * 0.02);
  ctx.stroke();
  // Mini crest on chest
  if (bodyH > 36) {
    drawMiniCrest(ctx, -tw * 0.35, (shoulderY + hipY) / 2 - bodyH * 0.02, bodyH * 0.055, c.accent, c.crestColor || c.jersey);
  }
  // Number
  ctx.fillStyle = c.accent;
  ctx.font = `bold ${Math.max(9, bodyH * 0.13)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(c.num), tw * 0.25, (shoulderY + hipY) / 2);

  // Arms with hands
  const drawArm = (side: number, arm: number, fore: number) => {
    const sx0 = side * tw * 1.0;
    const sy0 = shoulderY + bodyH * 0.02;
    const ex = sx0 + side * 0.05 * bodyH;
    const ey = sy0 + arm * bodyH * 0.55;
    const fx = ex + side * 0.02 * bodyH;
    const fy = ey + (fore - arm) * bodyH * 0.35;
    ctx.strokeStyle = jersey;
    ctx.lineWidth = bodyH * 0.065 * build;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = sk;
    ctx.lineWidth = bodyH * 0.055 * build;
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(fx, fy); ctx.stroke();
    // Hand
    ctx.fillStyle = sk;
    ctx.beginPath();
    ctx.ellipse(fx + side * bodyH * 0.01, fy + bodyH * 0.01, bodyH * 0.035, bodyH * 0.028, side * 0.2, 0, Math.PI * 2);
    ctx.fill();
    // Fingers hint
    if (bodyH > 40) {
      ctx.strokeStyle = shadeHex(sk, -20);
      ctx.lineWidth = Math.max(1, bodyH * 0.012);
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + side * bodyH * 0.02 + i * bodyH * 0.012, fy + bodyH * 0.04);
        ctx.stroke();
      }
    }
  };
  drawArm(-1, pose.lArm, pose.lFore);
  drawArm(1, pose.rArm, pose.rFore);

  // Head
  const hg = ctx.createRadialGradient(-headR * 0.3, headY - headR * 0.3, headR * 0.1, 0, headY, headR);
  hg.addColorStop(0, shadeHex(sk, 18));
  hg.addColorStop(1, sk);
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(0, headY, headR, 0, Math.PI * 2); ctx.fill();

  drawHair(ctx, c.hairStyle, c.hairColor, headR, headY, face);
  drawFace(ctx, c.expression, c.eyeColor, headR, headY, face);

  // Compact label: #num ShortName — only when enabled and large enough; drawn ABOVE head to avoid floor clutter / clipping handled by caller padding
  if (c.showLabel !== false && bodyH > 52) {
    const short = (c.name.split(' ').pop() || c.name).slice(0, 8);
    const label = `#${c.num} ${short}`;
    ctx.font = `600 ${Math.max(9, Math.min(13, bodyH * 0.085))}px sans-serif`;
    const tw2 = ctx.measureText(label).width;
    // Stagger by jersey to reduce overlap
    const ox = ((c.num % 3) - 1) * Math.max(10, bodyH * 0.12);
    const oy = (c.num % 2) * -10;
    const ly = headY - headR * 1.55 + oy;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-tw2 / 2 - 4 + ox, ly - 2, tw2 + 8, 13);
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.fillText(label, ox, ly);
  }
  // starSig bursts handled by CourtView.drawBurst (single callout)

  ctx.restore();
}

function drawMiniCrest(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, accent: string, fill: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.7, -r * 0.2);
  ctx.lineTo(r * 0.45, r);
  ctx.lineTo(-r * 0.45, r);
  ctx.lineTo(-r * 0.7, -r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function contrastLibero(jersey: string, accent: string): string {
  return accent && accent !== jersey ? accent : '#f5f5f5';
}

function drawHair(ctx: CanvasRenderingContext2D, style: number, color: string, r: number, hy: number, face: number) {
  const dark = shadeHex(color, -30);
  const lite = shadeHex(color, 25);
  const s = ((style % 8) + 8) % 8;
  ctx.fillStyle = color;
  ctx.beginPath();
  if (s === 0) {
    // Spiky bedhead / orange fluff
    ctx.arc(0, hy - r * 0.1, r * 1.02, Math.PI * 1.05, Math.PI * 1.95);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * 1.1 + i * 0.16;
      const tip = 1.35 + (i % 3) * 0.22;
      ctx.lineTo(Math.cos(a) * r * tip, hy + Math.sin(a) * r * 0.75 - r * 0.55);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = lite;
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, hy - r * 1.1); ctx.lineTo(0, hy - r * 1.55); ctx.lineTo(r * 0.15, hy - r * 1.05);
    ctx.fill();
  } else if (s === 1) {
    // Sharp spiky upward
    ctx.arc(0, hy - r * 0.15, r * 1.05, Math.PI * 1.05, Math.PI * 1.95);
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * 1.15 + i * 0.18;
      ctx.lineTo(Math.cos(a) * r * (1.45 + (i % 2) * 0.3), hy + Math.sin(a) * r * 0.85 - r * 0.55);
    }
    ctx.closePath(); ctx.fill();
  } else if (s === 2) {
    // Bowl / neat black
    ctx.ellipse(0, hy - r * 0.25, r * 1.15, r * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.ellipse(0, hy - r * 0.35, r * 0.9, r * 0.55, 0, Math.PI, Math.PI * 2); ctx.fill();
  } else if (s === 3) {
    // Long / flowing
    ctx.ellipse(0, hy - r * 0.05, r * 1.15, r * 1.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-r * 1.1, hy); ctx.quadraticCurveTo(-r * 1.4, hy + r * 1.2, -r * 0.6, hy + r * 1.5);
    ctx.lineTo(-r * 0.3, hy); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 1.1, hy); ctx.quadraticCurveTo(r * 1.4, hy + r * 1.2, r * 0.6, hy + r * 1.5);
    ctx.lineTo(r * 0.3, hy); ctx.fill();
  } else if (s === 4) {
    // Slick / swept
    ctx.ellipse(0, hy - r * 0.4, r * 1.1, r * 0.75, -0.25 * face, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(face * r * 0.2, hy - r * 0.9);
    ctx.quadraticCurveTo(face * r * 1.3, hy - r * 0.5, face * r * 1.1, hy + r * 0.1);
    ctx.lineTo(face * r * 0.4, hy); ctx.fill();
  } else if (s === 5) {
    // Volume twin tips / curly volume
    ctx.ellipse(0, hy - r * 0.2, r * 1.25, r * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath(); ctx.ellipse(-r * 0.85, hy - r * 0.7, r * 0.35, r * 0.4, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * 0.85, hy - r * 0.7, r * 0.35, r * 0.4, 0.4, 0, Math.PI * 2); ctx.fill();
  } else if (s === 6) {
    // Buzz / short crop
    ctx.arc(0, hy - r * 0.15, r * 1.0, Math.PI * 1.02, Math.PI * 1.98);
    ctx.lineTo(r * 0.95, hy + r * 0.15); ctx.lineTo(-r * 0.95, hy + r * 0.15);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = dark;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(-r * 0.9, hy - r * 0.5, r * 1.8, r * 0.25);
    ctx.globalAlpha = 1;
  } else {
    // Bedhead messy tufts
    ctx.ellipse(0, hy - r * 0.15, r * 1.1, r * 1.0, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      const a = -0.9 + i * 0.45;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.5, hy - r * 0.3);
      ctx.lineTo(Math.cos(a) * r * 1.5, hy - r * (1.1 + (i % 2) * 0.25));
      ctx.lineTo(Math.cos(a + 0.25) * r * 0.6, hy - r * 0.25);
      ctx.fill();
    }
  }
  // Side bang
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(face * r * 0.55, hy - r * 0.05, r * 0.28, r * 0.5, face * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawFace(ctx: CanvasRenderingContext2D, expr: Expr, eyeColor: string, r: number, hy: number, face: number) {
  const eyeY = hy - r * 0.05;
  const eyeW = r * 0.15, eyeH = r * 0.19;
  ctx.strokeStyle = '#2a1a12';
  ctx.lineWidth = Math.max(1, r * 0.06);
  const browY = eyeY - r * 0.28;
  let browA = 0;
  if (expr === 'frustrated') browA = 0.35;
  if (expr === 'surprised' || expr === 'excited') browA = -0.25;
  if (expr === 'focused') browA = 0.15;
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, browY + browA * r);
  ctx.lineTo(-r * 0.15, browY - browA * r * 0.5);
  ctx.moveTo(r * 0.15, browY - browA * r * 0.5);
  ctx.lineTo(r * 0.45, browY + browA * r);
  ctx.stroke();

  const open = expr === 'surprised' ? 1.35 : expr === 'celebrating' ? 0.7 : 1;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-r * 0.28 * face, eyeY, eyeW, eyeH * open, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.22 * face, eyeY, eyeW, eyeH * open, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = eyeColor;
  const pupil = r * 0.085;
  ctx.beginPath(); ctx.arc(-r * 0.28 * face + face * 0.02 * r, eyeY, pupil, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.22 * face + face * 0.02 * r, eyeY, pupil, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-r * 0.28 * face - r * 0.03, eyeY - r * 0.04, pupil * 0.35, 0, Math.PI * 2); ctx.fill();
  // Nose hint
  ctx.strokeStyle = 'rgba(90,50,40,0.35)';
  ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.beginPath(); ctx.moveTo(0, hy + r * 0.05); ctx.lineTo(face * r * 0.06, hy + r * 0.22); ctx.stroke();

  ctx.strokeStyle = '#5a3030';
  ctx.lineWidth = Math.max(1.2, r * 0.07);
  ctx.beginPath();
  const my = hy + r * 0.38;
  if (expr === 'celebrating' || expr === 'excited') {
    ctx.arc(0, my - r * 0.05, r * 0.22, 0.15, Math.PI - 0.15);
  } else if (expr === 'frustrated') {
    ctx.arc(0, my + r * 0.12, r * 0.2, Math.PI + 0.3, -0.3);
  } else if (expr === 'surprised') {
    ctx.ellipse(0, my, r * 0.1, r * 0.14, 0, 0, Math.PI * 2);
  } else if (expr === 'confident') {
    ctx.moveTo(-r * 0.15, my); ctx.quadraticCurveTo(0, my + r * 0.1, r * 0.18, my - r * 0.02);
  } else {
    ctx.moveTo(-r * 0.12, my); ctx.lineTo(r * 0.12, my);
  }
  ctx.stroke();
}

export function exprFromState(expression: number, anim: Anim): Expr {
  if (anim === 'celebrate' || expression > 0.5) return 'celebrating';
  if (anim === 'frustrate' || expression < -0.5) return 'frustrated';
  if (anim === 'spike' || anim === 'quickSpike' || anim === 'approach') return 'focused';
  if (anim === 'block' || anim === 'eyeTrack') return 'focused';
  if (anim === 'dive' || anim === 'dig') return 'surprised';
  if (expression > 0.2) return 'excited';
  if (expression > 0) return 'confident';
  return 'neutral';
}
