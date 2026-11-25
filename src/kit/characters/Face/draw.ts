import { random } from "remotion";
import type { BrowParams, EyeParams, Expression, FacialHair, MouthParams } from "./params";

// Pure canvas-2D drawing of a face. Coordinates: head-radius units, origin = head centre,
// +y up, +x = viewer's right. The canvas covers x, y ∈ [-1, 1].

export const FACE_LAYOUT = {
  eyeX: 0.34,
  eyeY: -0.03,
  eyeRX: 0.135,
  eyeRY: 0.185,
  browLen: 0.2,
  mouthY: -0.36,
  blushX: 0.56,
  blushY: -0.27,
} as const;

const INK = "#2b1b2b";
const MOUTH_INSIDE = "#5a1f2e";
const TONGUE = "#e5737f";

export type DrawState = {
  expression: Expression;
  /** Gaze [-1..1, -1..1]. */
  look: [number, number];
  /** 0 = eyes shut by blink, 1 = no blink. */
  blink: number;
  frame: number;
  browColor: string;
  facialHair?: FacialHair;
  seed: string;
};

type Ctx = CanvasRenderingContext2D;

// ---------------------------------------------------------------------------
// Eyes
// ---------------------------------------------------------------------------
const drawEye = (ctx: Ctx, cx: number, cy: number, p: EyeParams, look: [number, number], blink: number) => {
  const L = FACE_LAYOUT;
  const rx = L.eyeRX * p.size;
  const ry = L.eyeRY * p.size;
  const inward = -Math.sign(cx);
  const open = p.open * blink;

  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (p.mode === "caret") {
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.moveTo(cx - rx, cy - 0.04);
    ctx.quadraticCurveTo(cx, cy + 0.13, cx + rx, cy - 0.04);
    ctx.stroke();
    return;
  }
  if (p.mode === "arc" || open < 0.1) {
    ctx.lineWidth = 0.045;
    ctx.beginPath();
    const tilt = p.lidTilt * 0.05;
    ctx.moveTo(cx - rx, cy + tilt * Math.sign(-inward));
    ctx.quadraticCurveTo(cx, cy - 0.075, cx + rx, cy + tilt * Math.sign(inward));
    ctx.stroke();
    return;
  }

  const lid = (x: number) => {
    const inner = ((x - cx) / rx) * inward;
    return cy + ry - (1 - open) * 2 * ry - p.lidTilt * ry * 0.6 * inner;
  };
  const low = (x: number) => {
    const u = (x - cx) / rx;
    return cy - ry + p.lower * ry * (0.9 + 0.35 * (1 - u * u));
  };
  const lidRegion = () => {
    ctx.beginPath();
    const x0 = cx - rx - 0.06;
    const x1 = cx + rx + 0.06;
    const N = 16;
    for (let i = 0; i <= N; i++) {
      const x = x0 + ((x1 - x0) * i) / N;
      if (i === 0) ctx.moveTo(x, lid(x));
      else ctx.lineTo(x, lid(x));
    }
    for (let i = N; i >= 0; i--) {
      const x = x0 + ((x1 - x0) * i) / N;
      ctx.lineTo(x, Math.min(low(x), lid(x)));
    }
    ctx.closePath();
  };
  const ellipse = () => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  };

  // sclera + iris, clipped to the eye and the lids
  ctx.save();
  ellipse();
  ctx.clip();
  lidRegion();
  ctx.clip();
  ellipse();
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  const irx = rx * 0.74 * p.iris;
  const iry = ry * 0.8 * p.iris;
  const icx = cx + look[0] * (rx - irx * 0.75) * 0.9;
  const icy = cy + look[1] * (ry - iry * 0.75) * 0.8;
  ctx.fillStyle = "#2b1b2b";
  ctx.beginPath();
  ctx.ellipse(icx, icy, irx, iry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5b3b52";
  ctx.beginPath();
  ctx.ellipse(icx, icy - iry * 0.35, irx * 0.7, iry * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#120a12";
  ctx.beginPath();
  ctx.ellipse(icx, icy, irx * 0.5, iry * 0.52, 0, 0, Math.PI * 2);
  ctx.fill();
  // highlights
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(icx + irx * 0.32, icy + iry * 0.38, irx * (0.3 + 0.1 * p.sparkle), iry * (0.28 + 0.1 * p.sparkle), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(icx - irx * 0.38, icy - iry * 0.42, irx * (0.13 + 0.06 * p.sparkle), 0, Math.PI * 2);
  ctx.fill();
  if (p.sparkle > 0.3) {
    ctx.globalAlpha = p.sparkle;
    ctx.beginPath();
    ctx.arc(icx + irx * 0.45, icy - iry * 0.2, irx * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // outline only where the eye is visible
  ctx.save();
  ctx.lineWidth = 0.08;
  lidRegion();
  ctx.clip();
  ellipse();
  ctx.lineWidth = 0.02;
  ctx.stroke();
  ctx.restore();

  // upper lid line (lash line) — thicker for a graphic look
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx + 0.02, ry + 0.02, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.lineWidth = 0.038;
  ctx.beginPath();
  for (let i = 0; i <= 16; i++) {
    const x = cx - rx + (2 * rx * i) / 16;
    const yy = Math.min(lid(x), cy + ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2)));
    if (i === 0) ctx.moveTo(x, yy);
    else ctx.lineTo(x, yy);
  }
  ctx.stroke();
  ctx.restore();
  // little outer lash flick
  ctx.lineWidth = 0.028;
  ctx.beginPath();
  const ox = cx - inward * rx * 0.92;
  const oy = Math.min(lid(ox), cy + ry * 0.4);
  ctx.moveTo(ox, oy);
  ctx.lineTo(ox - inward * 0.045, oy + 0.03);
  ctx.stroke();
};

// ---------------------------------------------------------------------------
// Brows
// ---------------------------------------------------------------------------
const drawBrow = (ctx: Ctx, cx: number, p: BrowParams, color: string) => {
  if (p.show <= 0.01) return;
  const L = FACE_LAYOUT;
  const inward = -Math.sign(cx);
  const by = L.eyeY + p.y;
  const half = L.browLen / 2;
  ctx.save();
  ctx.globalAlpha = p.show;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.055;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx + inward * half, by + p.angle * half);
  ctx.quadraticCurveTo(cx, by + p.curve * 1.6, cx - inward * half, by - p.angle * half);
  ctx.stroke();
  ctx.restore();
};

// ---------------------------------------------------------------------------
// Mouth
// ---------------------------------------------------------------------------
const drawMouth = (ctx: Ctx, m: MouthParams) => {
  const cy = FACE_LAYOUT.mouthY;
  const hw = m.w / 2;
  const cl = m.curve * 0.07;
  const Ly = cy + cl - m.asym * 0.05;
  const Ry = cy + cl + m.asym * 0.05;
  ctx.strokeStyle = "#3a1a24";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (m.open < 0.015) {
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.moveTo(-hw, Ly);
    ctx.quadraticCurveTo(0, cy - cl * 1.4, hw, Ry);
    ctx.stroke();
    return;
  }

  const k = 0.6 * m.round;
  const topY = cy - cl * 0.9 + m.open * 0.15;
  const botY = cy - cl * 1.1 - m.open;
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(-hw, Ly);
    ctx.bezierCurveTo(-hw * (0.45 + k), topY + k * m.open * 0.45, hw * (0.45 + k), topY + k * m.open * 0.45, hw, Ry);
    ctx.bezierCurveTo(hw * (0.5 + k), botY - k * m.open * 0.25, -hw * (0.5 + k), botY - k * m.open * 0.25, -hw, Ly);
    ctx.closePath();
  };

  ctx.save();
  shape();
  ctx.fillStyle = MOUTH_INSIDE;
  ctx.fill();
  ctx.clip();
  if (m.tongue > 0.01) {
    ctx.globalAlpha = m.tongue;
    ctx.fillStyle = TONGUE;
    ctx.beginPath();
    ctx.ellipse(0, botY + m.open * 0.15, hw * 0.62, m.open * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = "#ffffff";
  if (m.gritted > 0.01) {
    ctx.globalAlpha = m.gritted;
    ctx.fillRect(-hw - 0.05, botY - 0.1, m.w + 0.1, topY - botY + 0.2);
    ctx.strokeStyle = "#cdbcc0";
    ctx.lineWidth = 0.012;
    ctx.beginPath();
    ctx.moveTo(-hw, (topY + botY) / 2);
    ctx.lineTo(hw, (topY + botY) / 2);
    for (let i = 1; i < 5; i++) {
      const x = -hw + (m.w * i) / 5;
      ctx.moveTo(x, topY + 0.05);
      ctx.lineTo(x, botY - 0.05);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (m.teethTop > 0.01) {
    ctx.globalAlpha = m.teethTop;
    ctx.fillRect(-hw - 0.05, topY - 0.05, m.w + 0.1, 0.2);
    ctx.globalAlpha = 1;
  }
  if (m.teethBottom > 0.01) {
    ctx.globalAlpha = m.teethBottom;
    ctx.fillRect(-hw - 0.05, botY - 0.1, m.w + 0.1, 0.13);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  shape();
  ctx.strokeStyle = "#3a1a24";
  ctx.lineWidth = 0.026;
  ctx.stroke();
};

// ---------------------------------------------------------------------------
// Extras
// ---------------------------------------------------------------------------
const drawBlush = (ctx: Ctx, amount: number) => {
  if (amount <= 0.01) return;
  const L = FACE_LAYOUT;
  for (const s of [-1, 1]) {
    const x = s * L.blushX;
    const g = ctx.createRadialGradient(x, L.blushY, 0, x, L.blushY, 0.13);
    g.addColorStop(0, `rgba(255,110,125,${0.6 * Math.min(1, amount)})`);
    g.addColorStop(1, "rgba(255,110,125,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, L.blushY, 0.15, 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    if (amount > 0.6) {
      ctx.strokeStyle = `rgba(220,70,90,${(amount - 0.6) * 1.6})`;
      ctx.lineWidth = 0.014;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) {
        ctx.moveTo(x + i * 0.045 - 0.012, L.blushY - 0.03);
        ctx.lineTo(x + i * 0.045 + 0.012, L.blushY + 0.03);
      }
      ctx.stroke();
    }
  }
};

const drawSweat = (ctx: Ctx, amount: number, frame: number) => {
  if (amount <= 0.01) return;
  const slide = ((frame % 45) / 45) * 0.05;
  const x = 0.72;
  const y = 0.42 - slide;
  const s = 0.11;
  ctx.save();
  ctx.globalAlpha = Math.min(1, amount);
  ctx.beginPath();
  ctx.moveTo(x, y + s);
  ctx.bezierCurveTo(x + s * 0.15, y + s * 0.4, x + s * 0.55, y - s * 0.1, x + s * 0.5, y - s * 0.35);
  ctx.arc(x, y - s * 0.35, s * 0.5, 0, Math.PI, true);
  ctx.bezierCurveTo(x - s * 0.55, y - s * 0.1, x - s * 0.15, y + s * 0.4, x, y + s);
  ctx.closePath();
  ctx.fillStyle = "#a8dcff";
  ctx.fill();
  ctx.strokeStyle = "#3a6f9a";
  ctx.lineWidth = 0.014;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(x - s * 0.2, y - s * 0.4, s * 0.1, s * 0.16, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawTears = (ctx: Ctx, amount: number, frame: number) => {
  if (amount <= 0.01) return;
  const L = FACE_LAYOUT;
  ctx.save();
  ctx.globalAlpha = Math.min(1, amount);
  for (const s of [-1, 1]) {
    const x = s * (L.eyeX + 0.02);
    const top = L.eyeY - L.eyeRY * 0.55;
    const bottom = -0.98;
    const wob = Math.sin(frame / 5 + s) * 0.008;
    ctx.fillStyle = "rgba(150,205,255,0.85)";
    ctx.strokeStyle = "#4f86b8";
    ctx.lineWidth = 0.012;
    ctx.beginPath();
    ctx.moveTo(x - 0.035, top);
    ctx.quadraticCurveTo(x - 0.05 + wob, (top + bottom) / 2, x - 0.045, bottom);
    ctx.lineTo(x + 0.045, bottom);
    ctx.quadraticCurveTo(x + 0.05 + wob, (top + bottom) / 2, x + 0.035, top);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // flowing highlights
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    for (let k = 0; k < 2; k++) {
      const t = ((frame * 0.035 + k * 0.5 + (s > 0 ? 0.25 : 0)) % 1 + 1) % 1;
      const yy = top - t * (top - bottom);
      ctx.beginPath();
      ctx.ellipse(x - 0.008, yy, 0.012, 0.028, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
};

const drawAnger = (ctx: Ctx, amount: number, frame: number) => {
  if (amount <= 0.01) return;
  const pulse = 1 + 0.1 * Math.sin(frame * 0.6);
  const x = 0.6;
  const y = 0.6;
  const s = 0.11 * pulse;
  ctx.save();
  ctx.globalAlpha = Math.min(1, amount);
  ctx.translate(x, y);
  ctx.strokeStyle = "#e8403a";
  ctx.lineWidth = 0.04;
  ctx.lineCap = "round";
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 2 + Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(s * 0.25, s * 0.9);
    ctx.quadraticCurveTo(s * 0.3, s * 0.3, s * 0.9, s * 0.25);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
};

const drawFacialHair = (ctx: Ctx, fh: FacialHair | undefined, seed: string) => {
  if (!fh) return;
  const color = fh.color ?? "#3b2418";
  const my = FACE_LAYOUT.mouthY + 0.085;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (fh.beard) {
    case "stubble": {
      ctx.save();
      ctx.globalAlpha = 0.28;
      for (let i = 0; i < 260; i++) {
        const a = random(`${seed}-stx-${i}`) * Math.PI * 2;
        const rr = Math.sqrt(random(`${seed}-str-${i}`));
        const x = Math.cos(a) * 0.55 * rr;
        const y = -0.58 + Math.sin(a) * 0.34 * rr;
        if (y > -0.2) continue;
        ctx.beginPath();
        ctx.arc(x, y, 0.009, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case "goatee": {
      ctx.beginPath();
      ctx.moveTo(-0.1, -0.47);
      ctx.quadraticCurveTo(0, -0.43, 0.1, -0.47);
      ctx.quadraticCurveTo(0.09, -0.68, 0, -0.78);
      ctx.quadraticCurveTo(-0.09, -0.68, -0.1, -0.47);
      ctx.fill();
      break;
    }
    case "full": {
      ctx.beginPath();
      ctx.moveTo(-0.82, -0.05);
      ctx.quadraticCurveTo(-0.85, -0.75, -0.3, -0.95);
      ctx.quadraticCurveTo(0, -1.05, 0.3, -0.95);
      ctx.quadraticCurveTo(0.85, -0.75, 0.82, -0.05);
      ctx.quadraticCurveTo(0.72, -0.22, 0.5, -0.3);
      ctx.quadraticCurveTo(0, -0.12, -0.5, -0.3);
      ctx.quadraticCurveTo(-0.72, -0.22, -0.82, -0.05);
      ctx.fill();
      // clear a soft spot for the mouth
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.ellipse(0, FACE_LAYOUT.mouthY - 0.04, 0.19, 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    default:
      break;
  }

  switch (fh.mustache) {
    case "thin": {
      ctx.lineWidth = 0.03;
      ctx.beginPath();
      ctx.moveTo(-0.2, my - 0.03);
      ctx.quadraticCurveTo(-0.1, my + 0.03, 0, my + 0.01);
      ctx.quadraticCurveTo(0.1, my + 0.03, 0.2, my - 0.03);
      ctx.stroke();
      break;
    }
    case "full":
    case "walrus": {
      const big = fh.mustache === "walrus" ? 1.35 : 1;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, my + 0.04);
        ctx.bezierCurveTo(s * 0.12 * big, my + 0.09, s * 0.26 * big, my + 0.02, s * 0.27 * big, my - 0.08 * big);
        ctx.bezierCurveTo(s * 0.18 * big, my - 0.04, s * 0.08, my - 0.03, 0, my - 0.01);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case "curled": {
      ctx.lineWidth = 0.04;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, my + 0.02);
        ctx.quadraticCurveTo(s * 0.14, my + 0.06, s * 0.24, my + 0.0);
        ctx.quadraticCurveTo(s * 0.3, my + 0.06, s * 0.27, my + 0.1);
        ctx.quadraticCurveTo(s * 0.23, my + 0.11, s * 0.24, my + 0.07);
        ctx.stroke();
      }
      break;
    }
    default:
      break;
  }
};

// ---------------------------------------------------------------------------
// Whole face
// ---------------------------------------------------------------------------
export const drawFace = (ctx: Ctx, size: number, s: DrawState) => {
  const L = FACE_LAYOUT;
  const e = s.expression;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, size, size);
  ctx.setTransform(size / 2, 0, 0, -size / 2, size / 2, size / 2);

  drawBlush(ctx, e.extras.blush);
  if (s.facialHair?.beard && s.facialHair.beard !== "none") {
    drawFacialHair(ctx, { beard: s.facialHair.beard, color: s.facialHair.color }, s.seed);
  }
  drawEye(ctx, -L.eyeX, L.eyeY, e.eyeL, s.look, s.blink);
  drawEye(ctx, L.eyeX, L.eyeY, e.eyeR, s.look, s.blink);
  drawBrow(ctx, -L.eyeX, e.browL, s.browColor);
  drawBrow(ctx, L.eyeX, e.browR, s.browColor);
  drawTears(ctx, e.extras.tears, s.frame);
  drawMouth(ctx, e.mouth);
  // mustache sits over the top lip
  if (s.facialHair?.mustache && s.facialHair.mustache !== "none") {
    drawFacialHair(ctx, { mustache: s.facialHair.mustache, color: s.facialHair.color }, s.seed);
  }
  drawSweat(ctx, e.extras.sweat, s.frame);
  drawAnger(ctx, e.extras.anger, s.frame);
};
