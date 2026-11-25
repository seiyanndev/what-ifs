import type { ExpressionName } from "../characters/Face";
import { bodyDims, mixPose, type BodyShape, type HandPoseName, type HandShape, type Joint, type Pose, type Vec3 } from "../characters/rig";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type ActionCtx = {
  fps: number;
  shape: BodyShape;
  dims: ReturnType<typeof bodyDims>;
  /** Stable per-character seed (gesture variety, timing offsets). */
  seed: string;
  params: Record<string, number | string | undefined>;
};

export type ActionFrame = {
  pose: Pose;
  /** Suggested gaze for the face, [-1..1, -1..1]. */
  look?: [number, number];
  /** Suggested expression (a cue's own expression wins). */
  expression?: ExpressionName;
  /** Cape streaming amount 0..1. */
  capeLift?: number;
  /** Distance travelled along the heading since the action started (world units). */
  travel?: number;
};

/** An action: frames since it started → frame. Pure & deterministic. */
export type ActionFn = (t: number, ctx: ActionCtx) => ActionFrame;

// ---------------------------------------------------------------------------
// Easing & timing
// ---------------------------------------------------------------------------
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
export const easeOut = (x: number) => 1 - (1 - clamp01(x)) ** 3;
export const easeIn = (x: number) => clamp01(x) ** 3;
/** Overshoots past 1 then settles — "snap" into a pose. */
export const easeOutBack = (x: number, s = 1.7) => {
  const t = clamp01(x) - 1;
  return 1 + (s + 1) * t * t * t + s * t * t;
};
/** Decaying oscillation (settle wobble) — 1 at t=0, → 0. */
export const wobble = (t: number, freq = 0.45, decay = 0.12) => Math.cos(t * freq) * Math.exp(-t * decay);

export type Ease = "linear" | "smooth" | "out" | "in" | "back";
const EASE: Record<Ease, (x: number) => number> = {
  linear: clamp01,
  smooth,
  out: easeOut,
  in: easeIn,
  back: (x) => easeOutBack(x),
};

export type Key = { at: number; pose: Pose; ease?: Ease };

/**
 * Keyframed pose: interpolates between keys (frames), with per-key easing INTO that key.
 * Use an extra wind-up key before a big move for anticipation, and ease "back" for overshoot.
 */
export const keyed = (t: number, keys: Key[], loop?: number): Pose => {
  const tt = loop ? ((t % loop) + loop) % loop : t;
  if (tt <= keys[0].at) return keys[0].pose;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (tt <= k.at) {
      const prev = keys[i - 1];
      const x = (tt - prev.at) / Math.max(1e-6, k.at - prev.at);
      return mixPose(prev.pose, k.pose, EASE[k.ease ?? "smooth"](x));
    }
  }
  return keys[keys.length - 1].pose;
};

// ---------------------------------------------------------------------------
// Pose helpers
// ---------------------------------------------------------------------------
type J = Partial<Record<Joint, Vec3>>;

/** Mirror a left-side rotation to the right side (character's left = +X). */
export const mirror = ([x, y, z]: Vec3): Vec3 => [x, -y, -z];

/** Both arms / legs symmetric: give the LEFT values. */
export const symArms = (shoulder: Vec3, elbow: Vec3 = [0, 0, 0], wrist: Vec3 = [0, 0, 0]): J => ({
  shoulderL: shoulder,
  shoulderR: mirror(shoulder),
  elbowL: elbow,
  elbowR: mirror(elbow),
  wristL: wrist,
  wristR: mirror(wrist),
});

export const pose = (joints: J, extra: Omit<Pose, "joints"> = {}): Pose => ({ joints, ...extra });

/** Add rotations of b onto a (layering: base action + overlay). */
export const addPose = (a: Pose, b: Pose, w = 1): Pose => {
  const joints: J = { ...a.joints };
  for (const [k, v] of Object.entries(b.joints ?? {}) as [Joint, Vec3][]) {
    const base = joints[k] ?? [0, 0, 0];
    joints[k] = [base[0] + v[0] * w, base[1] + v[1] * w, base[2] + v[2] * w];
  }
  const ro = a.rootOffset ?? [0, 0, 0];
  const bo = b.rootOffset ?? [0, 0, 0];
  const rr = a.rootRotation ?? [0, 0, 0];
  const br = b.rootRotation ?? [0, 0, 0];
  return {
    ...a,
    joints,
    rootOffset: [ro[0] + bo[0] * w, ro[1] + bo[1] * w, ro[2] + bo[2] * w],
    rootRotation: [rr[0] + br[0] * w, rr[1] + br[1] * w, rr[2] + br[2] * w],
    stretch: (a.stretch ?? 1) * (1 + ((b.stretch ?? 1) - 1) * w),
    handL: b.handL ?? a.handL,
    handR: b.handR ?? a.handR,
  };
};

export type Hand = HandPoseName | HandShape;
export const num = (v: number | string | undefined, d: number) => (typeof v === "number" ? v : d);
export const str = <T extends string>(v: number | string | undefined, d: T): T => (typeof v === "string" ? (v as T) : d);
