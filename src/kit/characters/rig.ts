// Rig definitions for the toy figurine: joints, pose format, body shape, hand shapes.
// Everything is plain data so actions (step 3e) can blend poses numerically.

/** Rigid pivots. L/R are the CHARACTER's left/right (character faces +Z; its left is +X). */
export const JOINTS = [
  "hips",
  "spine",
  "chest",
  "neck",
  "head",
  "shoulderL",
  "shoulderR",
  "elbowL",
  "elbowR",
  "wristL",
  "wristR",
  "legL",
  "legR",
  "kneeL",
  "kneeR",
  "ankleL",
  "ankleR",
] as const;
export type Joint = (typeof JOINTS)[number];

export type Vec3 = [number, number, number];

// ---------------------------------------------------------------------------
// Hands
// ---------------------------------------------------------------------------
export type HandShape = {
  /** Curl of the 3-finger mitten block (radians, + toward palm). */
  curl: number;
  /** Curl of the index finger (separate so it can point). */
  index: number;
  /** Thumb spread away from the hand. */
  thumbSpread: number;
  /** Thumb fold across the palm. */
  thumbCurl: number;
};

export const HAND_POSES = {
  open: { curl: 0.1, index: 0.1, thumbSpread: 0.45, thumbCurl: 0.15 },
  relaxed: { curl: 0.55, index: 0.45, thumbSpread: 0.25, thumbCurl: 0.35 },
  fist: { curl: 1.9, index: 1.9, thumbSpread: 0.05, thumbCurl: 1.1 },
  point: { curl: 1.9, index: 0, thumbSpread: 0.05, thumbCurl: 1.1 },
  hold: { curl: 1.25, index: 1.2, thumbSpread: 0.3, thumbCurl: 0.95 },
  wave: { curl: -0.15, index: -0.15, thumbSpread: 0.8, thumbCurl: 0 },
} satisfies Record<string, HandShape>;
export type HandPoseName = keyof typeof HAND_POSES;

// ---------------------------------------------------------------------------
// Pose
// ---------------------------------------------------------------------------
export type Pose = {
  /** Euler rotations (radians, XYZ) added on top of the rest pose. */
  joints?: Partial<Record<Joint, Vec3>>;
  /** Whole-figure offset (e.g. jumps, bobbing) and rotation. */
  rootOffset?: Vec3;
  rootRotation?: Vec3;
  /** Squash & stretch on the whole figure: >1 stretch, <1 squash (volume-preserving). */
  stretch?: number;
  handL?: HandPoseName | HandShape;
  handR?: HandPoseName | HandShape;
};

export const resolveHand = (h: HandPoseName | HandShape | undefined): HandShape =>
  h === undefined ? HAND_POSES.relaxed : typeof h === "string" ? HAND_POSES[h] : h;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpV = (a: Vec3 = [0, 0, 0], b: Vec3 = [0, 0, 0], t: number): Vec3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
export const mixHand = (a: HandShape, b: HandShape, t: number): HandShape => ({
  curl: lerp(a.curl, b.curl, t),
  index: lerp(a.index, b.index, t),
  thumbSpread: lerp(a.thumbSpread, b.thumbSpread, t),
  thumbCurl: lerp(a.thumbCurl, b.thumbCurl, t),
});

/** Blend two poses (t = 0 → a, 1 → b). Used for 6–8 frame action transitions. */
export const mixPose = (a: Pose, b: Pose, t: number): Pose => {
  const joints: Partial<Record<Joint, Vec3>> = {};
  for (const j of JOINTS) {
    if (a.joints?.[j] || b.joints?.[j]) joints[j] = lerpV(a.joints?.[j], b.joints?.[j], t);
  }
  return {
    joints,
    rootOffset: lerpV(a.rootOffset, b.rootOffset, t),
    rootRotation: lerpV(a.rootRotation, b.rootRotation, t),
    stretch: lerp(a.stretch ?? 1, b.stretch ?? 1, t),
    handL: mixHand(resolveHand(a.handL), resolveHand(b.handL), t),
    handR: mixHand(resolveHand(a.handR), resolveHand(b.handR), t),
  };
};

// ---------------------------------------------------------------------------
// Body shape
// ---------------------------------------------------------------------------
export type BodyShape = {
  /** Body (not head) height multiplier. 1 = standard chibi (~2.5 heads total). */
  height: number;
  /** Torso/hip width multiplier. */
  width: number;
  /** 0 = flat, 1 = big round belly. */
  belly: number;
  /** Shoulder width multiplier. */
  shoulders: number;
  /** Head size multiplier. */
  head: number;
};

export const DEFAULT_SHAPE: BodyShape = { height: 1, width: 1, belly: 0.15, shoulders: 1, head: 1 };

/** Handy named body types (combine with costumes in presets). */
export const BODY_TYPES = {
  standard: DEFAULT_SHAPE,
  kid: { height: 0.78, width: 0.9, belly: 0.1, shoulders: 0.85, head: 0.94 },
  slim: { height: 1.08, width: 0.86, belly: 0, shoulders: 0.92, head: 0.98 },
  stocky: { height: 0.95, width: 1.18, belly: 0.45, shoulders: 1.12, head: 1 },
  heroic: { height: 1.12, width: 1.05, belly: 0, shoulders: 1.3, head: 0.97 },
  round: { height: 0.94, width: 1.25, belly: 1, shoulders: 1.05, head: 1.02 },
  elder: { height: 0.94, width: 1.02, belly: 0.35, shoulders: 0.92, head: 1.02 },
} satisfies Record<string, BodyShape>;

/** Base measurements in world units (head radius 0.5 → 1 head = 1.0). */
export const MEASURE = {
  headRadius: 0.5,
  ankleHeight: 0.085,
  thigh: 0.24,
  shin: 0.25,
  pelvisToSpine: 0.18,
  chestHeight: 0.56,
  neck: 0.1,
  upperArm: 0.25,
  forearm: 0.22,
} as const;

/** Derived joint positions for a body shape (used by Body and by costumes/actions). */
export const bodyDims = (s: BodyShape) => {
  const h = s.height;
  const thigh = MEASURE.thigh * h;
  const shin = MEASURE.shin * h;
  const hipsY = MEASURE.ankleHeight + thigh + shin + 0.02;
  const spineY = MEASURE.pelvisToSpine * h;
  const chestH = MEASURE.chestHeight * h;
  const headR = MEASURE.headRadius * s.head;
  const torsoR = 0.3 * s.width;
  return {
    hipsY,
    thigh,
    shin,
    spineY,
    chestH,
    neckY: chestH - 0.02,
    headR,
    headCenterY: MEASURE.neck + headR * 0.92,
    torsoR,
    hipX: 0.14 * s.width,
    shoulderX: torsoR * 0.82 * s.shoulders + 0.05,
    shoulderY: chestH - 0.13,
    upperArm: MEASURE.upperArm * (0.85 + 0.15 * h),
    forearm: MEASURE.forearm * (0.85 + 0.15 * h),
    /** Total figure height (ground → top of head). */
    total: hipsY + spineY + chestH - 0.02 + MEASURE.neck + headR * 0.92 + headR * 0.96,
  };
};
