// Face building blocks as plain numbers, so expressions and talking can blend smoothly.
// Coordinates are in head-radius units, origin = head centre, +y up, +x = viewer's right.

// ---------------------------------------------------------------------------
// Eyes
// ---------------------------------------------------------------------------
export type EyeParams = {
  /** "normal" = sclera + iris; "arc" = closed ︶ line; "caret" = happy ^ arch. */
  mode: "normal" | "arc" | "caret";
  /** Upper lid opening, 0 (shut) → 1 (fully open). */
  open: number;
  /** Lid slant: + = inner corner lower (angry), − = outer corner lower (sad). */
  lidTilt: number;
  /** Lower lid raise (happy squint), 0 → 1. */
  lower: number;
  /** Eye size multiplier. */
  size: number;
  /** Iris size multiplier (small = shocked). */
  iris: number;
  /** Extra sparkle highlights (wonder, crying). */
  sparkle: number;
};

const EYE_BASE: EyeParams = { mode: "normal", open: 1, lidTilt: 0, lower: 0, size: 1, iris: 1, sparkle: 0 };
const eye = (p: Partial<EyeParams>): EyeParams => ({ ...EYE_BASE, ...p });

export const EYES = {
  open: eye({}),
  half: eye({ open: 0.5 }),
  closed: eye({ mode: "arc", open: 0 }),
  happy: eye({ mode: "caret", open: 0 }),
  wide: eye({ size: 1.15, iris: 0.62 }),
  angry: eye({ open: 0.72, lidTilt: 0.5 }),
  sad: eye({ open: 0.78, lidTilt: -0.45 }),
  sly: eye({ open: 0.48, lower: 0.25, lidTilt: 0.12 }),
} satisfies Record<string, EyeParams>;
export type EyeName = keyof typeof EYES;

// ---------------------------------------------------------------------------
// Brows
// ---------------------------------------------------------------------------
export type BrowParams = {
  /** Height above the eye line. */
  y: number;
  /** + = inner end up (worried), − = inner end down (angry). */
  angle: number;
  /** Arch amount. */
  curve: number;
  /** Visible at all (0 hides). */
  show: number;
};

const brow = (p: Partial<BrowParams>): BrowParams => ({ y: 0.3, angle: 0, curve: 0.025, show: 1, ...p });

export const BROWS = {
  neutral: brow({}),
  raised: brow({ y: 0.4, angle: -0.06, curve: 0.06 }),
  angry: brow({ y: 0.25, angle: -0.55, curve: 0 }),
  worried: brow({ y: 0.33, angle: 0.45, curve: 0.02 }),
  low: brow({ y: 0.26, angle: -0.15, curve: 0.01 }),
  none: brow({ show: 0 }),
} satisfies Record<string, BrowParams>;
export type BrowName = keyof typeof BROWS;

// ---------------------------------------------------------------------------
// Mouth
// ---------------------------------------------------------------------------
export type MouthParams = {
  /** Width. */
  w: number;
  /** Opening height (0 = closed line). */
  open: number;
  /** + = smile, − = frown. */
  curve: number;
  /** Lift one corner (smirk): + lifts the viewer-right corner. */
  asym: number;
  /** 0 = lens shape, 1 = round "O". */
  round: number;
  teethTop: number;
  teethBottom: number;
  tongue: number;
  /** Clenched teeth (full teeth with tooth lines). */
  gritted: number;
};

const mouth = (p: Partial<MouthParams>): MouthParams => ({
  w: 0.18,
  open: 0,
  curve: 0.2,
  asym: 0,
  round: 0,
  teethTop: 0,
  teethBottom: 0,
  tongue: 0,
  gritted: 0,
  ...p,
});

export const MOUTHS = {
  neutral: mouth({ w: 0.16, curve: 0.2 }),
  smile: mouth({ w: 0.26, curve: 1 }),
  grin: mouth({ w: 0.33, open: 0.13, curve: 1, teethTop: 1 }),
  laugh: mouth({ w: 0.36, open: 0.3, curve: 1.1, teethTop: 1, tongue: 1 }),
  frown: mouth({ w: 0.24, curve: -0.9 }),
  shockedO: mouth({ w: 0.14, open: 0.22, curve: 0, round: 1 }),
  gritted: mouth({ w: 0.3, open: 0.11, curve: -0.25, gritted: 1 }),
  smirk: mouth({ w: 0.22, curve: 0.45, asym: 1 }),
} satisfies Record<string, MouthParams>;
export type MouthName = keyof typeof MOUTHS;

/** Talking mouth shapes (visemes). */
export const VISEMES = {
  A: mouth({ w: 0.22, open: 0.24, curve: 0.1, tongue: 1, teethTop: 0.6 }),
  E: mouth({ w: 0.3, open: 0.1, curve: 0.25, teethTop: 1 }),
  O: mouth({ w: 0.14, open: 0.19, curve: 0, round: 1 }),
  MBP: mouth({ w: 0.19, open: 0, curve: 0.05 }),
  FV: mouth({ w: 0.22, open: 0.05, curve: 0.1, teethTop: 1 }),
  rest: mouth({ w: 0.17, open: 0.025, curve: 0.15 }),
} satisfies Record<string, MouthParams>;
export type VisemeName = keyof typeof VISEMES;

// ---------------------------------------------------------------------------
// Extras & facial hair
// ---------------------------------------------------------------------------
export type FaceExtras = {
  blush: number;
  sweat: number;
  tears: number;
  anger: number;
};

export type FacialHair = {
  mustache?: "none" | "thin" | "full" | "walrus" | "curled";
  beard?: "none" | "stubble" | "goatee" | "full";
  color?: string;
};

// ---------------------------------------------------------------------------
// Expressions
// ---------------------------------------------------------------------------
export type Expression = {
  eyeL: EyeParams; // viewer-left eye (character's right)
  eyeR: EyeParams;
  browL: BrowParams;
  browR: BrowParams;
  mouth: MouthParams;
  extras: FaceExtras;
  /** Default gaze for this expression, [-1..1, -1..1]. */
  look: [number, number];
};

const ex = (
  e: Partial<Omit<Expression, "extras">> & { eyes?: EyeParams; brows?: BrowParams; extras?: Partial<FaceExtras> },
): Expression => ({
  eyeL: e.eyeL ?? e.eyes ?? EYES.open,
  eyeR: e.eyeR ?? e.eyes ?? EYES.open,
  browL: e.browL ?? e.brows ?? BROWS.neutral,
  browR: e.browR ?? e.brows ?? BROWS.neutral,
  mouth: e.mouth ?? MOUTHS.neutral,
  extras: { blush: 0.4, sweat: 0, tears: 0, anger: 0, ...e.extras },
  look: e.look ?? [0, 0],
});

export const EXPRESSIONS = {
  neutral: ex({}),
  proud: ex({ eyes: eye({ open: 0.5, lower: 0.2 }), brows: BROWS.raised, mouth: mouth({ w: 0.26, curve: 0.85 }), extras: { blush: 0.5 } }),
  happy: ex({ eyes: eye({ lower: 0.22 }), brows: BROWS.raised, mouth: MOUTHS.grin, extras: { blush: 0.55 } }),
  laughing: ex({ eyes: EYES.happy, brows: BROWS.raised, mouth: MOUTHS.laugh, extras: { blush: 0.75 } }),
  scared: ex({
    eyes: eye({ size: 1.1, iris: 0.55 }),
    brows: BROWS.worried,
    mouth: mouth({ w: 0.26, open: 0.09, curve: -0.5, gritted: 1 }),
    extras: { sweat: 1, blush: 0.1 },
    look: [-0.5, 0],
  }),
  shocked: ex({ eyes: eye({ size: 1.2, iris: 0.5 }), brows: brow({ y: 0.48, angle: 0.05, curve: 0.08 }), mouth: mouth({ w: 0.16, open: 0.3, round: 1, curve: 0 }), extras: { blush: 0.1 } }),
  angry: ex({ eyes: EYES.angry, brows: BROWS.angry, mouth: MOUTHS.gritted, extras: { anger: 1, blush: 0.2 } }),
  sad: ex({ eyes: EYES.sad, brows: BROWS.worried, mouth: MOUTHS.frown, extras: { blush: 0.25 }, look: [0, -0.5] }),
  crying: ex({
    eyes: eye({ open: 0.6, lidTilt: -0.5, sparkle: 1 }),
    brows: BROWS.worried,
    mouth: mouth({ w: 0.26, open: 0.14, curve: -0.9 }),
    extras: { tears: 1, blush: 0.6 },
    look: [0, -0.2],
  }),
  thinking: ex({
    eyes: eye({ open: 0.85 }),
    browL: BROWS.raised,
    browR: BROWS.low,
    mouth: mouth({ w: 0.15, curve: -0.1, asym: -0.6 }),
    look: [0.6, 0.65],
  }),
  smirk: ex({ eyes: EYES.sly, browL: BROWS.low, browR: BROWS.raised, mouth: MOUTHS.smirk, look: [0.3, 0] }),
  focused: ex({ eyes: eye({ open: 0.62, lidTilt: 0.22 }), brows: brow({ y: 0.26, angle: -0.25 }), mouth: mouth({ w: 0.14, curve: -0.05 }), extras: { blush: 0.2 } }),
  wonder: ex({ eyes: eye({ size: 1.12, iris: 1.05, sparkle: 1 }), brows: BROWS.raised, mouth: mouth({ w: 0.12, open: 0.1, round: 1, curve: 0.2 }), extras: { blush: 0.65 }, look: [0, 0.35] }),
  determined: ex({ eyes: eye({ open: 0.78, lidTilt: 0.32 }), brows: BROWS.angry, mouth: mouth({ w: 0.24, curve: 0.15, asym: 0.25 }), extras: { blush: 0.3 } }),
  bored: ex({
    eyes: eye({ open: 0.42, lidTilt: -0.05 }),
    brows: brow({ y: 0.24, angle: 0.02, curve: 0 }),
    mouth: mouth({ w: 0.2, curve: -0.25, asym: 0.4 }),
    extras: { blush: 0.15 },
    look: [-0.6, -0.15],
  }),
  yawning: ex({ eyes: EYES.closed, brows: BROWS.raised, mouth: mouth({ w: 0.2, open: 0.34, round: 1, curve: 0 }), extras: { blush: 0.3 } }),
  defeated: ex({
    eyes: eye({ open: 0.38, lidTilt: -0.3 }),
    brows: brow({ y: 0.27, angle: 0.35 }),
    mouth: mouth({ w: 0.26, curve: -0.7 }),
    extras: { sweat: 1, blush: 0.15 },
    look: [0, -0.7],
  }),
} satisfies Record<string, Expression>;
export type ExpressionName = keyof typeof EXPRESSIONS;

// ---------------------------------------------------------------------------
// Blending
// ---------------------------------------------------------------------------
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mixNum = <T extends Record<string, unknown>>(a: T, b: T, t: number): T => {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(a)) {
    const va = a[k];
    const vb = b[k];
    out[k] = typeof va === "number" && typeof vb === "number" ? lerp(va, vb, t) : t < 0.5 ? va : vb;
  }
  return out as T;
};

export const mixEye = (a: EyeParams, b: EyeParams, t: number): EyeParams => {
  // Switching between drawn modes (open ↔ arc/caret) goes through a closed eye.
  if (a.mode !== b.mode) {
    if (t < 0.5) return { ...a, open: a.mode === "normal" ? a.open * (1 - t * 2) : a.open };
    return { ...b, open: b.mode === "normal" ? b.open * (t * 2 - 1) : b.open };
  }
  return mixNum(a, b, t);
};
export const mixMouth = (a: MouthParams, b: MouthParams, t: number) => mixNum(a, b, t);

export const mixExpression = (a: Expression, b: Expression, t: number): Expression => ({
  eyeL: mixEye(a.eyeL, b.eyeL, t),
  eyeR: mixEye(a.eyeR, b.eyeR, t),
  browL: mixNum(a.browL, b.browL, t),
  browR: mixNum(a.browR, b.browR, t),
  mouth: mixMouth(a.mouth, b.mouth, t),
  extras: mixNum(a.extras, b.extras, t),
  look: [lerp(a.look[0], b.look[0], t), lerp(a.look[1], b.look[1], t)],
});

export const resolveExpression = (e: ExpressionName | Expression | undefined): Expression =>
  e === undefined ? EXPRESSIONS.neutral : typeof e === "string" ? EXPRESSIONS[e] : e;
