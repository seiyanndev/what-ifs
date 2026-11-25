import { random } from "remotion";
import { JOINTS, type Joint, type Pose, type Vec3 } from "../characters/rig";
import {
  addPose,
  easeOut,
  keyed,
  mirror,
  num,
  pose,
  smooth,
  str,
  symArms,
  type ActionCtx,
  type ActionFn,
  type ActionFrame,
} from "./core";

// Sign conventions (character faces +Z; its LEFT is +X):
//   shoulder X −  = arm forward      shoulderL Z + / shoulderR Z − = arm out/up sideways
//   elbow X −     = forearm forward  leg X − = thigh forward      knee X + = shin back
//   spine/chest X + = lean forward   head X + = look down         head Y + = turn to its left
// Gaze `look` is in SCREEN space for a character facing camera: +x = viewer's right = character's LEFT.

const TAU = Math.PI * 2;
const sec = (t: number, c: ActionCtx) => t / c.fps;
const phase = (c: ActionCtx, k = "ph") => random(`${c.seed}-${k}`) * TAU;

/** Swap left/right of a whole pose (for left-handed variants). */
export const mirrorPose = (p: Pose): Pose => {
  const joints: Partial<Record<Joint, Vec3>> = {};
  for (const j of JOINTS) {
    const v = p.joints?.[j];
    if (!v) continue;
    const other = (j.endsWith("L") ? j.slice(0, -1) + "R" : j.endsWith("R") ? j.slice(0, -1) + "L" : j) as Joint;
    joints[other] = mirror(v);
  }
  const ro = p.rootOffset ?? [0, 0, 0];
  const rr = p.rootRotation ?? [0, 0, 0];
  return { ...p, joints, rootOffset: [-ro[0], ro[1], ro[2]], rootRotation: [rr[0], -rr[1], -rr[2]], handL: p.handR, handR: p.handL };
};
const leftHanded = (c: ActionCtx) => str<"left" | "right">(c.params.hand, "right") === "left";
const withSide = (f: ActionFrame, c: ActionCtx): ActionFrame =>
  leftHanded(c) ? { ...f, pose: mirrorPose(f.pose), look: f.look ? [-f.look[0], f.look[1]] : undefined } : f;

// ---------------------------------------------------------------------------
// Idle — the base layer under most actions: breathing, weight shift, glances.
// ---------------------------------------------------------------------------
const idlePose = (t: number, c: ActionCtx, amount = 1): Pose => {
  const s = sec(t, c);
  const ph = phase(c);
  const breathe = Math.sin((s * TAU) / 3.2 + ph);
  const shift = Math.sin((s * TAU) / 6 + ph * 0.7);
  const a = amount;
  return pose(
    {
      hips: [0, 0, 0.035 * shift * a],
      legL: [0, 0, -0.035 * shift * a],
      legR: [0, 0, -0.035 * shift * a],
      spine: [0.015 * breathe * a, 0, -0.02 * shift * a],
      chest: [-0.015 * breathe * a, 0.03 * Math.sin(s * 0.9 + ph) * a, 0],
      head: [0.03 * Math.sin(s * 1.3 + ph) * a, 0.08 * Math.sin(s * 0.55 + ph) * a, -0.02 * shift * a],
      ...symArms([0.035 * breathe * a, 0, 0.03 * breathe * a], [-0.06, 0, 0]),
    },
    { stretch: 1 + 0.012 * breathe * a, rootOffset: [0.012 * shift * a, 0, 0], handL: "relaxed", handR: "relaxed" },
  );
};

const idle: ActionFn = (t, c) => {
  const s = sec(t, c);
  const glance = Math.sin(s * 0.55 + phase(c)) * 0.25;
  return { pose: idlePose(t, c), look: [glance, 0] };
};

// ---------------------------------------------------------------------------
// Locomotion — foot angles are SOLVED from the body speed, so planted feet never slide.
// ---------------------------------------------------------------------------
const legAngle = (forward: number, len: number) => -Math.asin(Math.max(-0.95, Math.min(0.95, forward / len)));

const walk: ActionFn = (t, c) => {
  const v = num(c.params.speed, 0.9); // world units / second
  const L = c.dims.hipsY - 0.02; // hip joint → ground
  const S = 0.3 * c.shape.height + 0.06 * (v - 0.9); // step length
  const steps = (sec(t, c) * v) / S; // steps taken
  const legPose = (p: number) => {
    // p in [0, 2): [0,1) stance (planted), [1,2) swing
    if (p < 1) {
      const th = legAngle(S * (0.5 - p), L);
      return { th, knee: 0.08, ankle: -th * 0.6, lift: 0 };
    }
    const q = p - 1;
    const th = legAngle(S * (-0.5 + smooth(q)), L) - Math.sin(Math.PI * q) * 0.3;
    return { th, knee: 0.08 + Math.sin(Math.PI * q) * 0.95, ankle: 0.2 * Math.sin(Math.PI * q), lift: 1 };
  };
  const pL = steps % 2;
  const pR = (steps + 1) % 2;
  const l = legPose(pL);
  const r = legPose(pR);
  const stance = pL < 1 ? l.th : r.th;
  const bob = L * Math.cos(stance) - L;
  const side = pL < 1 ? 1 : -1; // which foot carries weight
  const sway = Math.sin(steps * Math.PI);
  return {
    pose: pose(
      {
        hips: [0, sway * 0.1, side * 0.04],
        legL: [l.th, 0, -side * 0.04],
        legR: [r.th, 0, -side * 0.04],
        kneeL: [l.knee, 0, 0],
        kneeR: [r.knee, 0, 0],
        ankleL: [l.ankle, 0, 0],
        ankleR: [r.ankle, 0, 0],
        spine: [0.06, -sway * 0.06, -side * 0.02],
        chest: [0, -sway * 0.08, 0],
        head: [-0.03 + Math.abs(sway) * 0.02, sway * 0.05, side * 0.02],
        // each arm swings opposite its own leg
        shoulderL: [-l.th * 1.15, 0, 0.04],
        shoulderR: [-r.th * 1.15, 0, -0.04],
        elbowL: [-0.35 - Math.max(0, -l.th) * 0.6, 0, 0],
        elbowR: [-0.35 - Math.max(0, -r.th) * 0.6, 0, 0],
      },
      { rootOffset: [0, bob + Math.abs(Math.cos(steps * Math.PI)) * 0.012, 0], handL: "relaxed", handR: "relaxed" },
    ),
    travel: sec(t, c) * v,
    look: [0, -0.05],
    capeLift: Math.min(1, v * 0.22),
  };
};

const run: ActionFn = (t, c) => {
  const v = num(c.params.speed, 2.6);
  const L = c.dims.hipsY - 0.02;
  const S = 0.52 * c.shape.height; // stride per step
  const T = (2 * S) / v; // seconds per cycle
  const u = (sec(t, c) / T) % 1;
  const stanceFrac = 0.4;
  const legPose = (p: number) => {
    if (p < stanceFrac) {
      const k = p / stanceFrac;
      const th = legAngle(v * T * stanceFrac * (0.5 - k), L);
      return { th, knee: 0.2 + Math.sin(Math.PI * k) * 0.25, ankle: -th * 0.5, stance: true };
    }
    const q = (p - stanceFrac) / (1 - stanceFrac);
    const back = legAngle(-v * T * stanceFrac * 0.5, L);
    const front = legAngle(v * T * stanceFrac * 0.5, L);
    const th = back + (front - back) * smooth(q) - Math.sin(Math.PI * q) * 0.75;
    return { th, knee: 0.2 + Math.sin(Math.PI * Math.min(1, q * 1.2)) * 1.7, ankle: 0.3 * Math.sin(Math.PI * q), stance: false };
  };
  const l = legPose(u);
  const r = legPose((u + 0.5) % 1);
  const stanceLeg = l.stance ? l : r.stance ? r : null;
  const flightU = (u % 0.5) / 0.5; // 0..1 within half-cycle
  const air = stanceLeg ? L * Math.cos(stanceLeg.th) - L - 0.03 : Math.sin(Math.PI * ((flightU - stanceFrac * 2) / (1 - stanceFrac * 2))) * 0.08;
  const pump = Math.sin(u * TAU);
  return {
    pose: pose(
      {
        hips: [0.05, pump * 0.12, 0],
        legL: [l.th, 0, 0],
        legR: [r.th, 0, 0],
        kneeL: [l.knee, 0, 0],
        kneeR: [r.knee, 0, 0],
        ankleL: [l.ankle, 0, 0],
        ankleR: [r.ankle, 0, 0],
        spine: [0.22, -pump * 0.1, 0],
        chest: [0.05, -pump * 0.12, 0],
        head: [-0.18, pump * 0.06, 0],
        shoulderL: [pump * 0.85, 0, 0.12],
        shoulderR: [-pump * 0.85, 0, -0.12],
        elbowL: [-1.45, 0, 0],
        elbowR: [-1.45, 0, 0],
      },
      {
        rootOffset: [0, air, 0],
        stretch: stanceLeg ? 0.97 : 1.03,
        handL: "fist",
        handR: "fist",
      },
    ),
    travel: sec(t, c) * v,
    look: [0, 0],
    capeLift: 1,
    expression: "determined",
  };
};

// ---------------------------------------------------------------------------
// Talking: idle + seeded hand gestures + small head nods (face.talk does the mouth).
// ---------------------------------------------------------------------------
const talk: ActionFn = (t, c) => {
  const G = 40;
  const k = Math.floor(t / G);
  const u = (t % G) / G;
  const env = Math.sin(Math.PI * Math.min(1, u * 1.25)) ** 0.7;
  const pick = random(`${c.seed}-g-${k}`);
  const g = random(`${c.seed}-t-${k}`);
  const s = sec(t, c);
  const arm = (side: 1 | -1, amt: number): Partial<Record<Joint, Vec3>> => {
    const shoulder: Vec3 = [-0.55 - 0.35 * g, 0, side * (0.25 + 0.2 * g)];
    const elbow: Vec3 = [-0.95, 0, 0];
    const wrist: Vec3 = [0, side * 0.6, 0];
    return side === 1
      ? { shoulderL: shoulder.map((x) => x * amt) as Vec3, elbowL: elbow.map((x) => x * amt) as Vec3, wristL: wrist.map((x) => x * amt) as Vec3 }
      : { shoulderR: shoulder.map((x) => x * amt) as Vec3, elbowR: elbow.map((x) => x * amt) as Vec3, wristR: wrist.map((x) => x * amt) as Vec3 };
  };
  const which = pick < 0.4 ? "R" : pick < 0.75 ? "L" : "both";
  const gesture = pose(
    {
      ...(which !== "L" ? arm(-1, env) : {}),
      ...(which !== "R" ? arm(1, env) : {}),
      chest: [0.04 * env, (which === "R" ? -0.1 : which === "L" ? 0.1 : 0) * env, 0],
      head: [0.05 * Math.sin(s * 7) * 0.8, 0, (which === "R" ? 0.06 : -0.06) * env],
    },
    { handL: which !== "R" ? "open" : "relaxed", handR: which !== "L" ? "open" : "relaxed" },
  );
  return { pose: addPose(idlePose(t, c, 0.7), gesture), look: [Math.sin(s * 0.8 + phase(c)) * 0.2, 0] };
};

// ---------------------------------------------------------------------------
// One-shot gestures (keyframed: wind-up → snap with overshoot → hold with life)
// ---------------------------------------------------------------------------
const REST: Pose = pose({ ...symArms([0, 0, 0], [-0.06, 0, 0]) }, { handL: "relaxed", handR: "relaxed" });

const point: ActionFn = (t, c) => {
  const dir = str(c.params.dir, "side") as "forward" | "side" | "up";
  const target: Record<typeof dir, { sh: Vec3; head: Vec3; chest: Vec3; look: [number, number] }> = {
    forward: { sh: [-1.5, 0, -0.15], head: [-0.05, -0.15, 0], chest: [0, -0.15, 0], look: [-0.15, 0] },
    side: { sh: [-0.5, 0, -1.35], head: [0, -0.75, 0], chest: [0, -0.3, 0], look: [-0.9, 0] },
    up: { sh: [-2.55, 0, -0.3], head: [-0.45, -0.2, 0], chest: [-0.1, -0.1, 0], look: [-0.3, 0.9] },
  };
  const tg = target[dir];
  // head leads (turns first), then the arm snaps out with overshoot
  const p = keyed(t, [
    { at: 0, pose: REST },
    { at: 5, pose: pose({ shoulderR: [0.35, 0, -0.1], elbowR: [-0.7, 0, 0], head: tg.head, chest: [0.05, 0.08, 0] }, { handR: "fist" }), ease: "out" },
    { at: 12, pose: pose({ shoulderR: tg.sh, elbowR: [-0.05, 0, 0], head: tg.head, chest: tg.chest, spine: [0.04, 0, 0] }, { handR: "point", stretch: 1.02 }), ease: "back" },
  ]);
  const hold = t > 12 ? Math.sin(sec(t, c) * 2.4) * 0.03 : 0;
  return withSide(
    { pose: addPose(addPose(p, idlePose(t, c, 0.4)), pose({ shoulderR: [hold, 0, 0] })), look: t > 3 ? tg.look : [0, 0], expression: "determined" },
    c,
  );
};

const wave: ActionFn = (t, c) => {
  const s = sec(t, c);
  const up = easeOut(t / 9);
  const wag = t > 7 ? Math.sin(s * 11) : 0;
  return withSide(
    {
      pose: addPose(
        idlePose(t, c, 0.5),
        pose(
          {
            // chibi heads are wide: arm OUT to the side, forearm up, so the hand clears the head
            shoulderR: [-0.35 * up, 0, -1.4 * up],
            elbowR: [0, 0, -(1.15 + 0.38 * wag) * up],
            wristR: [0, 0, -0.2 * wag * up],
            head: [-0.04, -0.12 * up, 0.12 * up],
            chest: [0, -0.06 * up, 0.05 * up],
          },
          { handR: "wave" },
        ),
      ),
      look: [0, 0.05],
      expression: "happy",
    },
    c,
  );
};

const cheer: ActionFn = (t, c) => {
  const s = sec(t, c);
  const up = easeOut(t / 8);
  const beat = Math.sin(s * 9 + phase(c));
  const hop = Math.max(0, beat) * 0.07 * up;
  return {
    pose: pose(
      {
        ...symArms([-0.2 * up, 0, (2.55 + 0.25 * beat) * up], [0, 0, 0.35 * up]),
        head: [-0.25 * up, 0, 0.05 * beat],
        chest: [-0.08 * up, 0, 0],
        legL: [-0.1 * hop * 6, 0, 0],
        legR: [-0.1 * hop * 6, 0, 0],
        kneeL: [0.2 * hop * 6, 0, 0],
        kneeR: [0.2 * hop * 6, 0, 0],
      },
      { rootOffset: [0, hop, 0], stretch: 1 + (beat > 0 ? 0.04 : -0.03) * up, handL: "fist", handR: "fist" },
    ),
    look: [0, 0.5],
    expression: "laughing",
  };
};

const bow: ActionFn = (t) => ({
  pose: keyed(t, [
    { at: 0, pose: REST },
    { at: 5, pose: pose({ spine: [-0.06, 0, 0], head: [-0.08, 0, 0] }, { stretch: 1.02 }), ease: "out" },
    { at: 16, pose: pose({ spine: [0.55, 0, 0], chest: [0.35, 0, 0], neck: [0.15, 0, 0], head: [0.2, 0, 0], ...symArms([-0.35, 0, 0.05], [-0.2, 0, 0]) }, { rootOffset: [0, -0.02, -0.04] }), ease: "smooth" },
    { at: 34, pose: pose({ spine: [0.6, 0, 0], chest: [0.38, 0, 0], neck: [0.15, 0, 0], head: [0.22, 0, 0], ...symArms([-0.35, 0, 0.05], [-0.2, 0, 0]) }, { rootOffset: [0, -0.02, -0.04] }) },
    { at: 46, pose: REST, ease: "back" },
  ]),
  look: t > 10 && t < 38 ? [0, -0.8] : [0, 0],
  expression: "proud",
});

const salute: ActionFn = (t, c) =>
  withSide(
    {
      pose: addPose(
        keyed(t, [
          { at: 0, pose: REST },
          { at: 4, pose: pose({ shoulderR: [0.15, 0, 0.05] }, { stretch: 0.99 }), ease: "out" },
          {
            at: 11,
            pose: pose({ shoulderR: [-1.35, 0.3, -1.1], elbowR: [-2.0, 0, 0], wristR: [0.3, 0.9, 0], chest: [-0.06, 0, 0], head: [-0.06, 0, 0], shoulderL: [0, 0, -0.12] }, { handR: "open", stretch: 1.03 }),
            ease: "back",
          },
        ]),
        idlePose(t, c, 0.25),
      ),
      look: [0, 0.05],
      expression: "determined",
    },
    c,
  );

const swordRaise: ActionFn = (t, c) => {
  const shake = t > 16 ? Math.sin(t * 1.3) * 0.02 : 0;
  return withSide(
    {
      pose: keyed(t, [
        { at: 0, pose: REST },
        {
          at: 7,
          pose: pose(
            { legL: [-0.28, 0, 0.05], legR: [-0.28, 0, -0.05], kneeL: [0.45, 0, 0], kneeR: [0.45, 0, 0], ankleL: [-0.17, 0, 0], ankleR: [-0.17, 0, 0], spine: [0.15, 0, 0], head: [0.12, 0, 0], shoulderR: [0.4, 0, -0.35], elbowR: [-0.5, 0, 0] },
            { rootOffset: [0, -0.05, 0], stretch: 0.94, handR: "hold", handL: "fist" },
          ),
          ease: "out",
        },
        {
          at: 15,
          pose: pose(
            { spine: [-0.1, 0, 0], chest: [-0.12, 0.1, 0], head: [-0.3, 0, 0], shoulderR: [-2.85 + shake, 0, -0.2], elbowR: [-0.12, 0, 0], wristR: [1.35, 0, 0], shoulderL: [0, 0, 0.45], elbowL: [-0.6, 0, 0] },
            { stretch: 1.07, handR: "hold", handL: "fist" },
          ),
          ease: "back",
        },
      ]),
      look: t > 8 ? [-0.2, 0.85] : [0, 0],
      expression: "determined",
      capeLift: t > 10 ? 0.35 : 0,
    },
    c,
  );
};

const fightClash: ActionFn = (t, c) => {
  const loop = 26;
  const u = t % loop;
  const impact = u >= 12 && u < 15;
  const p = keyed(
    t,
    [
      { at: 0, pose: pose({ shoulderR: [-1.0, 0, -1.3], elbowR: [-1.3, 0, 0], wristR: [0.9, 0, 0], chest: [0, 0.3, 0], legL: [-0.35, 0, 0], kneeL: [0.25, 0, 0], legR: [0.25, 0, 0], kneeR: [0.2, 0, 0], shoulderL: [-0.4, 0, 0.5], elbowL: [-0.8, 0, 0] }, { handR: "hold", handL: "fist" }) },
      { at: 8, pose: pose({ shoulderR: [-1.4, 0, -1.6], elbowR: [-1.6, 0, 0], wristR: [1.0, 0, 0], chest: [-0.05, 0.45, 0], spine: [-0.05, 0.1, 0], legL: [-0.3, 0, 0], kneeL: [0.25, 0, 0], legR: [0.25, 0, 0], kneeR: [0.2, 0, 0], shoulderL: [-0.4, 0, 0.6], elbowL: [-0.8, 0, 0] }, { handR: "hold", handL: "fist", stretch: 1.03 }), ease: "out" },
      { at: 12, pose: pose({ shoulderR: [-1.35, 0, -0.15], elbowR: [-0.25, 0, 0], wristR: [0.6, 0, 0], chest: [0.12, -0.4, 0], spine: [0.12, -0.1, 0], legL: [-0.6, 0, 0], kneeL: [0.5, 0, 0], legR: [0.35, 0, 0], kneeR: [0.1, 0, 0], shoulderL: [0.2, 0, 0.3], elbowL: [-0.6, 0, 0] }, { handR: "hold", handL: "fist", rootOffset: [0, -0.04, 0.06], stretch: 0.96 }), ease: "in" },
      { at: 15, pose: pose({ shoulderR: [-1.3, 0, -0.2], elbowR: [-0.3, 0, 0], wristR: [0.6, 0, 0], chest: [0.1, -0.35, 0], spine: [0.1, -0.1, 0], legL: [-0.6, 0, 0], kneeL: [0.5, 0, 0], legR: [0.35, 0, 0], kneeR: [0.1, 0, 0], shoulderL: [0.2, 0, 0.3], elbowL: [-0.6, 0, 0] }, { handR: "hold", handL: "fist", rootOffset: [0, -0.04, 0.06] }) },
      { at: 26, pose: pose({ shoulderR: [-1.0, 0, -1.3], elbowR: [-1.3, 0, 0], wristR: [0.9, 0, 0], chest: [0, 0.3, 0], legL: [-0.35, 0, 0], kneeL: [0.25, 0, 0], legR: [0.25, 0, 0], kneeR: [0.2, 0, 0], shoulderL: [-0.4, 0, 0.5], elbowL: [-0.8, 0, 0] }, { handR: "hold", handL: "fist" }), ease: "smooth" },
    ],
    loop,
  );
  const jolt = impact ? Math.sin(u * 9) * 0.015 : 0;
  return withSide({ pose: addPose(p, pose({}, { rootOffset: [jolt, 0, 0] })), look: [-0.1, 0], expression: "angry" }, c);
};

const fall: ActionFn = (t) => {
  const p = keyed(t, [
    { at: 0, pose: REST },
    { at: 6, pose: pose({ chest: [-0.25, 0, 0.05], head: [0.15, 0, 0], ...symArms([-0.4, 0, 1.2], [-0.4, 0, 0]), legL: [-0.4, 0, 0], kneeL: [0.3, 0, 0] }, { handL: "open", handR: "open", rootOffset: [0, 0, -0.06] }), ease: "out" },
    { at: 13, pose: pose({ chest: [-0.35, 0, -0.05], head: [0.3, 0, 0], ...symArms([-1.2, 0, 1.9], [-0.2, 0, 0]), legL: [-0.8, 0, 0], legR: [-0.3, 0, 0], kneeL: [0.4, 0, 0] }, { handL: "open", handR: "open", rootRotation: [-0.6, 0, 0], rootOffset: [0, 0.05, -0.12] }), ease: "in" },
    { at: 21, pose: pose({ chest: [-0.1, 0, 0], head: [0.35, 0, 0], ...symArms([-1.6, 0, 1.4], [-0.2, 0, 0]), legL: [-0.9, 0, 0], legR: [-0.5, 0, 0], kneeL: [0.6, 0, 0], kneeR: [0.3, 0, 0] }, { handL: "open", handR: "open", rootRotation: [-1.5, 0, 0], rootOffset: [0, 0.32, -0.15] }), ease: "in" },
    { at: 25, pose: pose({ chest: [0, 0, 0], head: [0.15, 0, 0], ...symArms([-1.3, 0, 1.6], [-0.1, 0, 0]), legL: [-0.6, 0, 0], legR: [-0.3, 0, 0], kneeL: [0.4, 0, 0] }, { handL: "open", handR: "open", rootRotation: [-1.52, 0, 0], rootOffset: [0, 0.27, -0.15], stretch: 0.9 }), ease: "out" },
    { at: 32, pose: pose({ chest: [0, 0, 0], head: [0.1, 0.3, 0], ...symArms([-0.4, 0, 1.3], [-0.1, 0, 0]), legL: [-0.35, 0, 0], legR: [-0.15, 0, 0], kneeL: [0.3, 0, 0] }, { handL: "relaxed", handR: "relaxed", rootRotation: [-1.52, 0, 0], rootOffset: [0, 0.3, -0.15] }), ease: "smooth" },
  ]);
  return { pose: p, look: t < 21 ? [0, 0.6] : [0.3, 0.2], expression: t < 21 ? "shocked" : "defeated" };
};

const sitPose = (c: ActionCtx): Pose =>
  pose(
    {
      legL: [-1.5, 0, 0.06],
      legR: [-1.5, 0, -0.06],
      kneeL: [1.45, 0, 0],
      kneeR: [1.45, 0, 0],
      ankleL: [0.05, 0, 0],
      ankleR: [0.05, 0, 0],
      spine: [-0.04, 0, 0],
      ...symArms([-0.55, 0, 0.05], [-0.55, 0, 0]),
    },
    { rootOffset: [0, -c.dims.thigh * 0.97, -c.dims.thigh * 0.15] },
  );

const sit: ActionFn = (t, c) => ({
  pose: addPose(
    keyed(t, [
      { at: 0, pose: REST },
      { at: 5, pose: pose({ spine: [0.25, 0, 0], legL: [-0.4, 0, 0], legR: [-0.4, 0, 0], kneeL: [0.5, 0, 0], kneeR: [0.5, 0, 0] }, { rootOffset: [0, -0.06, 0] }), ease: "out" },
      { at: 14, pose: sitPose(c), ease: "back" },
    ]),
    idlePose(t, c, 0.4),
  ),
  look: [0, 0],
});

const write: ActionFn = (t, c) => {
  const s = sec(t, c);
  const scribble = Math.sin(s * 14) * 0.08;
  const line = ((s * 0.8) % 1) - 0.5;
  const base = num(c.params.seated, 0) ? sitPose(c) : REST;
  return {
    pose: addPose(
      base,
      pose(
        {
          shoulderR: [-0.5 + scribble * 0.3, 0, -0.05 + line * 0.2],
          elbowR: [-0.95, 0, 0],
          wristR: [scribble, 0, 0],
          shoulderL: [-0.45, 0, 0.08],
          elbowL: [-0.85, 0, 0],
          chest: [0.15, 0, 0],
          head: [0.38, line * 0.15, 0],
        },
        { handR: "hold", handL: "open" },
      ),
    ),
    look: [line * 0.6, -0.9],
    expression: "focused",
  };
};

const readScroll: ActionFn = (t, c) => {
  const s = sec(t, c);
  const scan = ((s * 0.6) % 1) * 2 - 1;
  const up = easeOut(t / 10);
  return {
    pose: addPose(
      idlePose(t, c, 0.5),
      pose({ ...symArms([-0.8 * up, 0, 0.18 * up], [-1.05 * up, 0, 0]), chest: [0.06 * up, 0, 0], head: [0.25 * up, scan * 0.08, 0] }, { handL: "hold", handR: "hold" }),
    ),
    look: [scan * 0.7, -0.6],
    expression: "focused",
  };
};

const crankMachine: ActionFn = (t, c) => {
  const a = sec(t, c) * TAU * 0.8;
  return withSide(
    {
      pose: pose(
        {
          shoulderR: [-0.85 + 0.35 * Math.sin(a), 0, -0.1 + 0.12 * Math.cos(a)],
          elbowR: [-0.85 + 0.4 * Math.cos(a), 0, 0],
          shoulderL: [-0.55, 0, 0.25],
          elbowL: [-0.55, 0, 0],
          spine: [0.2 + 0.05 * Math.sin(a), -0.08 * Math.cos(a), 0],
          head: [0.08, 0.1, 0],
          legL: [-0.2, 0, 0.12],
          legR: [0.15, 0, -0.12],
          kneeL: [0.25, 0, 0],
          kneeR: [0.1, 0, 0],
          ankleL: [0.0, 0, -0.12],
          ankleR: [0, 0, 0.12],
        },
        { rootOffset: [0, -0.03 - 0.015 * Math.abs(Math.sin(a)), 0], handR: "fist", handL: "open" },
      ),
      look: [-0.2, -0.3],
      expression: "focused",
    },
    c,
  );
};

const lookUp: ActionFn = (t, c) => ({
  pose: addPose(
    keyed(t, [
      { at: 0, pose: REST },
      { at: 7, pose: pose({ head: [-0.5, 0, 0], neck: [-0.1, 0, 0] }), ease: "back" },
      { at: 12, pose: pose({ head: [-0.5, 0, 0], neck: [-0.12, 0, 0], chest: [-0.12, 0, 0], spine: [-0.05, 0, 0] }), ease: "smooth" },
    ]),
    idlePose(t, c, 0.5),
  ),
  look: t > 2 ? [0, 0.95] : [0, 0],
  expression: "wonder",
});

const lookAround: ActionFn = (t, c) => {
  const yaw = (tt: number) => {
    const k = keyed(tt, [
      { at: 0, pose: pose({ head: [0, 0, 0] }) },
      { at: 12, pose: pose({ head: [0, 0.75, 0] }), ease: "back" },
      { at: 32, pose: pose({ head: [0.05, 0.7, 0] }) },
      { at: 46, pose: pose({ head: [0, -0.75, 0] }), ease: "back" },
      { at: 66, pose: pose({ head: [0.05, -0.7, 0] }) },
      { at: 80, pose: pose({ head: [0, 0, 0] }), ease: "smooth" },
    ], 96);
    return k.joints?.head?.[1] ?? 0;
  };
  const h = yaw(t); // head leads
  const b = yaw(t - 4); // chest follows 4 frames later
  const eyes = yaw(t + 5); // eyes lead the head
  return {
    pose: addPose(idlePose(t, c, 0.5), pose({ head: [0, h, 0], chest: [0, b * 0.35, 0], spine: [0, b * 0.1, 0] })),
    look: [(eyes / 0.75) * 0.85, 0],
    expression: "thinking",
  };
};

const shrug: ActionFn = (t, c) => ({
  pose: addPose(
    keyed(t, [
      { at: 0, pose: REST },
      { at: 5, pose: pose({ head: [0.05, 0, 0] }, { stretch: 0.98 }), ease: "out" },
      { at: 12, pose: pose({ ...symArms([-0.15, 0, 0.3], [-0.85, 0, 1.0], [0, -1.1, 0]), head: [0, 0, 0.22], neck: [0.05, 0, 0] }, { handL: "open", handR: "open", stretch: 1.04, rootOffset: [0, 0.015, 0] }), ease: "back" },
      { at: 30, pose: pose({ ...symArms([-0.15, 0, 0.28], [-0.8, 0, 0.95], [0, -1.1, 0]), head: [0, 0, 0.18], neck: [0.05, 0, 0] }, { handL: "open", handR: "open", stretch: 1.03 }) },
      { at: 42, pose: REST, ease: "smooth" },
    ]),
    idlePose(t, c, 0.4),
  ),
  look: [0.4, 0.3],
  expression: "thinking",
});

const facepalm: ActionFn = (t, c) => {
  const s = sec(t, c);
  const p = keyed(t, [
    { at: 0, pose: REST },
    { at: 7, pose: pose({ shoulderR: [-0.9, 0, -0.1], elbowR: [-1.2, 0, 0], head: [0.05, 0, 0] }), ease: "out" },
    { at: 13, pose: pose({ shoulderR: [-1.05, 0.2, 0.25], elbowR: [-2.25, 0, 0], wristR: [0.2, 0.4, 0], head: [0.38, 0, 0.05], neck: [0.12, 0, 0], chest: [0.18, 0, 0], spine: [0.06, 0, 0] }, { handR: "open", stretch: 0.97 }), ease: "back" },
  ]);
  const shake = t > 16 ? Math.sin(s * 5) * 0.08 : 0;
  return withSide({ pose: addPose(p, pose({ head: [0, shake, 0] })), look: [0, -0.8], expression: "defeated" }, c);
};

const celebrateJump: ActionFn = (t, c) => {
  const takeoff = 9;
  const land = 27;
  const H = num(c.params.height, 0.55);
  const p = keyed(t, [
    { at: 0, pose: REST },
    { at: 7, pose: pose({ legL: [-0.45, 0, 0], legR: [-0.45, 0, 0], kneeL: [0.8, 0, 0], kneeR: [0.8, 0, 0], ankleL: [-0.35, 0, 0], ankleR: [-0.35, 0, 0], spine: [0.25, 0, 0], ...symArms([0.6, 0, 0.1], [-0.3, 0, 0]), head: [0.1, 0, 0] }, { stretch: 0.84, rootOffset: [0, -0.1, 0], handL: "fist", handR: "fist" }), ease: "out" },
    { at: 11, pose: pose({ spine: [-0.1, 0, 0], ...symArms([-0.4, 0, 2.6], [0, 0, 0.2]), head: [-0.3, 0, 0], ankleL: [0.4, 0, 0], ankleR: [0.4, 0, 0] }, { stretch: 1.14, handL: "open", handR: "open" }), ease: "out" },
    { at: 18, pose: pose({ legL: [-0.7, 0, 0.1], legR: [-0.5, 0, -0.1], kneeL: [1.1, 0, 0], kneeR: [0.9, 0, 0], ...symArms([-0.3, 0, 2.7], [0, 0, 0.25]), head: [-0.3, 0, 0] }, { stretch: 1.02, handL: "fist", handR: "fist" }), ease: "smooth" },
    { at: land, pose: pose({ ...symArms([-0.2, 0, 2.4], [0, 0, 0.2]), head: [-0.2, 0, 0] }, { stretch: 1.06, handL: "fist", handR: "fist" }), ease: "in" },
    { at: land + 3, pose: pose({ legL: [-0.4, 0, 0], legR: [-0.4, 0, 0], kneeL: [0.7, 0, 0], kneeR: [0.7, 0, 0], ankleL: [-0.3, 0, 0], ankleR: [-0.3, 0, 0], spine: [0.2, 0, 0], ...symArms([-0.2, 0, 2.2], [0, 0, 0.3]) }, { stretch: 0.84, rootOffset: [0, -0.09, 0], handL: "fist", handR: "fist" }), ease: "out" },
    { at: land + 12, pose: pose({ ...symArms([-0.2, 0, 2.5], [0, 0, 0.3]), head: [-0.2, 0, 0] }, { stretch: 1, handL: "fist", handR: "fist" }), ease: "back" },
  ]);
  const u = (t - takeoff) / (land - takeoff);
  const y = u > 0 && u < 1 ? 4 * H * u * (1 - u) : 0;
  return { pose: addPose(p, pose({}, { rootOffset: [0, y, 0] })), look: [0, 0.6], expression: t < 6 ? "determined" : "laughing", capeLift: u > 0 && u < 1 ? 0.6 : 0.1 };
};

const nod: ActionFn = (t, c) => {
  const s = sec(t, c);
  const env = s < 1.4 ? 1 : Math.max(0, 1 - (s - 1.4) * 3);
  return { pose: addPose(idlePose(t, c, 0.5), pose({ head: [Math.max(0, Math.sin(s * TAU * 1.6)) * 0.28 * env, 0, 0], neck: [0.05 * env, 0, 0] })), look: [0, -0.1], expression: "happy" };
};

const shakeHead: ActionFn = (t, c) => {
  const s = sec(t, c);
  const env = s < 1.4 ? smooth(s * 4) : Math.max(0, 1 - (s - 1.4) * 3);
  const y = Math.sin(s * TAU * 2.1) * 0.38 * env;
  return { pose: addPose(idlePose(t, c, 0.5), pose({ head: [0.05, y, 0], chest: [0, -y * 0.15, 0] })), look: [y * 1.2, 0], expression: "sad" };
};

const kneel: ActionFn = (t, c) => {
  const k = pose(
    {
      legL: [-1.45, 0, 0.05],
      kneeL: [1.45, 0, 0],
      ankleL: [0, 0, 0],
      legR: [0.15, 0, -0.04],
      kneeR: [1.55, 0, 0],
      ankleR: [0.6, 0, 0],
      spine: [0.12, 0, 0],
      head: [0.3, 0, 0],
      shoulderL: [-0.5, 0, 0.05],
      elbowL: [-0.7, 0, 0],
      shoulderR: [0.05, 0, -0.05],
    },
    { rootOffset: [0, -c.dims.thigh * 0.98, 0.04] },
  );
  return {
    pose: addPose(
      keyed(t, [
        { at: 0, pose: REST },
        { at: 6, pose: pose({ spine: [0.2, 0, 0], legL: [-0.5, 0, 0], kneeL: [0.6, 0, 0] }, { rootOffset: [0, -0.06, 0] }), ease: "out" },
        { at: 16, pose: k, ease: "back" },
      ]),
      idlePose(t, c, 0.3),
    ),
    look: [0, -0.7],
    expression: "neutral",
  };
};

const giveItem: ActionFn = (t, c) => {
  const both = str(c.params.hands, "both") === "both";
  const offer = pose(
    {
      shoulderR: [-1.1, 0, 0.05],
      elbowR: [-0.4, 0, 0],
      wristR: [0, 0, 0],
      ...(both ? { shoulderL: [-1.1, 0, -0.05] as Vec3, elbowL: [-0.4, 0, 0] as Vec3 } : {}),
      spine: [0.18, 0, 0],
      head: [0.08, 0, 0],
    },
    { handR: "hold", handL: both ? "hold" : "relaxed", rootOffset: [0, 0, 0.05] },
  );
  return withSide(
    {
      pose: addPose(
        keyed(t, [
          { at: 0, pose: REST },
          { at: 6, pose: pose({ shoulderR: [0.15, 0, 0], ...(both ? { shoulderL: [0.15, 0, 0] as Vec3 } : {}), spine: [-0.05, 0, 0] }, { handR: "hold", handL: both ? "hold" : "relaxed" }), ease: "out" },
          { at: 15, pose: offer, ease: "back" },
        ]),
        idlePose(t, c, 0.3),
      ),
      look: [0, 0],
      expression: "happy",
    },
    c,
  );
};

const sailSteer: ActionFn = (t, c) => {
  const s = sec(t, c);
  const w = Math.sin(s * 0.9 + phase(c)) * 0.45;
  const roll = Math.sin(s * 0.7) * 0.05;
  return {
    pose: pose(
      {
        shoulderL: [-0.95 + w * 0.35, 0, 0.12],
        shoulderR: [-0.95 - w * 0.35, 0, -0.12],
        elbowL: [-0.9 - w * 0.2, 0, 0],
        elbowR: [-0.9 + w * 0.2, 0, 0],
        chest: [0.05, w * 0.25, 0],
        spine: [0.06, 0, -roll],
        head: [-0.08, -w * 0.1, -roll],
        legL: [0, 0, 0.14 - roll],
        legR: [0, 0, -0.14 - roll],
        ankleL: [0, 0, -0.14 + roll],
        ankleR: [0, 0, 0.14 + roll],
      },
      { rootRotation: [0, 0, roll], rootOffset: [0, -0.02, 0], handL: "fist", handR: "fist" },
    ),
    look: [0, 0.15],
    expression: "determined",
    capeLift: 0.35,
  };
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
export const ACTIONS = {
  idle,
  walk,
  run,
  talk,
  point,
  wave,
  cheer,
  bow,
  salute,
  sword_raise: swordRaise,
  fight_clash: fightClash,
  fall,
  sit,
  write,
  read_scroll: readScroll,
  crank_machine: crankMachine,
  look_up: lookUp,
  look_around: lookAround,
  shrug,
  facepalm,
  celebrate_jump: celebrateJump,
  nod,
  shake_head: shakeHead,
  kneel,
  give_item: giveItem,
  sail_steer: sailSteer,
} satisfies Record<string, ActionFn>;

export type ActionName = keyof typeof ACTIONS;
export const ACTION_NAMES = Object.keys(ACTIONS) as ActionName[];
