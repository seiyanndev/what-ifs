import { useCurrentFrame, useVideoConfig } from "remotion";
import { PRESETS, PresetCharacter, type PresetId } from "../characters";
import type { CharacterProps } from "../characters/Costume";
import { mixExpression, resolveExpression, type ExpressionName } from "../characters/Face";
import { bodyDims, DEFAULT_SHAPE, mixPose, type Vec3 } from "../characters/rig";
import { smooth, type ActionCtx, type ActionFrame } from "./core";
import { ACTIONS, type ActionName } from "./library";

/** One beat of a performance: start `action` at frame `at`. */
export type Cue = {
  action: ActionName;
  at: number;
  params?: Record<string, number | string | undefined>;
  /** Override the action's suggested expression. */
  expression?: ExpressionName;
  /** New facing in degrees (0 = toward camera / +Z). Turns smoothly over the blend. */
  heading?: number;
};

export type PerformerProps = Omit<CharacterProps, "pose" | "position" | "rotation" | "costume"> & {
  preset: PresetId;
  costume?: CharacterProps["costume"];
  cues: Cue[];
  /** Start position on the ground. */
  position?: Vec3;
  /** Starting heading in degrees. */
  heading?: number;
  /** Blend length between actions, in frames (6–8 looks natural). */
  blend?: number;
  /** Ignore root travel (treadmill walk/run — for previews and grids). */
  inPlace?: boolean;
};

const shortestAngle = (a: number, b: number) => {
  let d = ((b - a + 540) % 360) - 180;
  if (d < -180) d += 360;
  return a + d;
};

/**
 * A preset character performing a list of cued actions, with smooth blends,
 * root motion (walk/run travel), turning, expression and gaze blending.
 */
export const Performer: React.FC<PerformerProps> = ({ preset, cues: rawCues, position = [0, 0, 0], heading = 0, blend = 7, inPlace = false, face, id, shape, capeLift, ...rest }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = PRESETS[preset];
  const sh = shape ?? p.shape;
  const dims = bodyDims(sh ?? DEFAULT_SHAPE);
  const cues = [...rawCues].sort((a, b) => a.at - b.at);
  const seed = id ?? preset;
  const ctx = (c: Cue): ActionCtx => ({ fps, shape: sh, dims, seed, params: c.params ?? {} });
  const run = (c: Cue, t: number): ActionFrame => ACTIONS[c.action](Math.max(0, t), ctx(c));

  // headings per cue
  const headings: number[] = [];
  cues.forEach((c, k) => headings.push(c.heading ?? (k === 0 ? heading : headings[k - 1])));

  let i = 0;
  for (let k = 0; k < cues.length; k++) if (cues[k].at <= frame) i = k;
  const cur = cues[i];
  const t = frame - cur.at;
  const curF = run(cur, t);
  const prev = i > 0 ? cues[i - 1] : undefined;
  const w = prev ? smooth(t / blend) : 1;
  const prevF = prev ? run(prev, frame - prev.at) : curF;

  // root motion: completed cues + current one
  let x = position[0];
  let z = position[2];
  for (let k = 0; k < i; k++) {
    const d = cues[k + 1].at - cues[k].at;
    const tr = run(cues[k], d).travel ?? 0;
    const h = (headings[k] * Math.PI) / 180;
    x += Math.sin(h) * tr;
    z += Math.cos(h) * tr;
  }
  if (inPlace) {
    x = position[0];
    z = position[2];
  }
  const trNow = inPlace ? 0 : (curF.travel ?? 0);
  const hNow = (headings[i] * Math.PI) / 180;
  x += Math.sin(hNow) * trNow;
  z += Math.cos(hNow) * trNow;

  const yawDeg = prev ? headings[i - 1] + (shortestAngle(headings[i - 1], headings[i]) - headings[i - 1]) * w : headings[i];

  const pose = prev ? mixPose(prevF.pose, curF.pose, w) : curF.pose;
  const lookA = prevF.look ?? [0, 0];
  const lookB = curF.look ?? [0, 0];
  const look: [number, number] = [lookA[0] + (lookB[0] - lookA[0]) * w, lookA[1] + (lookB[1] - lookA[1]) * w];
  const exprOf = (c: Cue | undefined, f: ActionFrame) => resolveExpression(c?.expression ?? f.expression ?? p.expression);
  const expression = prev ? mixExpression(exprOf(prev, prevF), exprOf(cur, curF), w) : exprOf(cur, curF);
  const cape = (prevF.capeLift ?? 0) + ((curF.capeLift ?? 0) - (prevF.capeLift ?? 0)) * w;

  return (
    <PresetCharacter
      {...rest}
      id={seed}
      preset={preset}
      shape={sh}
      position={[x, position[1], z]}
      rotation={[0, (yawDeg * Math.PI) / 180, 0]}
      pose={pose}
      capeLift={capeLift ?? cape}
      face={{ expression, look, ...face }}
    />
  );
};
