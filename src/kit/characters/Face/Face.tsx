import { useLayoutEffect, useMemo } from "react";
import { random, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { useLook } from "../../look";
import { drawFace } from "./draw";
import { resolveExpression, type Expression, type ExpressionName, type FacialHair } from "./params";
import { applyTalk, type TalkState } from "./talk";

export type FaceProps = {
  expression?: ExpressionName | Expression;
  /** Gaze override [-1..1, -1..1] (x: viewer right, y: up). Defaults to the expression's gaze. */
  look?: [number, number];
  /** Talking mouth (from talkFromWords / talkFromLevel). */
  talk?: TalkState;
  /** Automatic seeded blinking (default on). */
  blink?: boolean;
  browColor?: string;
  facialHair?: FacialHair;
};

const CANVAS = 600;
/** Face decal tint per time of day (the decal is unlit, so dim it at night). */
const FACE_TINT = { dawn: "#fff2ee", day: "#ffffff", sunset: "#fff0e2", night: "#aab3d8" } as const;

/** Blink curve: frame offsets within a blink → lid openness. */
const BLINK = [1, 0.55, 0.12, 0, 0.3, 0.75, 1];
export const blinkAt = (frame: number, seed: string) => {
  const period = 85 + Math.floor(random(`blink-p-${seed}`) * 60);
  const phase = Math.floor(random(`blink-o-${seed}`) * period);
  const local = (frame + phase) % period;
  const cycle = Math.floor((frame + phase) / period);
  if (local < BLINK.length) return BLINK[local];
  if (random(`blink-d-${seed}-${cycle}`) < 0.25 && local >= 9 && local < 9 + BLINK.length) return BLINK[local - 9];
  return 1;
};

const decalCache = new Map<number, THREE.BufferGeometry>();
/** Front patch of the head sphere with planar (front-projected) UVs. */
export const faceDecal = (r: number) => {
  const key = Math.round(r * 1000);
  const hit = decalCache.get(key);
  if (hit) return hit;
  const R = r * 1.006;
  const g = new THREE.SphereGeometry(R, 56, 40, Math.PI / 2 - 1.4, 2.8, 0.2, Math.PI - 0.4);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, 0.5 + pos.getX(i) / (2 * R), 0.5 + pos.getY(i) / (2 * R));
  }
  uv.needsUpdate = true;
  decalCache.set(key, g);
  return g;
};

/**
 * Expressive 2D face drawn on a curved decal over the head.
 * Mounted automatically by <Body face={...} />; can also be used on any sphere head of radius r.
 */
export const Face: React.FC<FaceProps & { r: number; id: string; headScale?: [number, number, number] }> = ({
  expression,
  look,
  talk,
  blink = true,
  browColor = "#3b2418",
  facialHair,
  r,
  id,
  headScale = [1.04, 0.97, 1],
}) => {
  const frame = useCurrentFrame();
  const lookCtx = useLook();
  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = CANVAS;
    c.height = CANVAS;
    return c;
  }, []);
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [canvas]);

  const base = resolveExpression(expression);
  const expr: Expression = { ...base, mouth: applyTalk(base.mouth, talk) };
  const gaze = look ?? base.look;
  const b = blink ? blinkAt(frame, id) : 1;

  // Redraw every frame before Remotion captures it (layout effect → before the R3F render).
  useLayoutEffect(() => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawFace(ctx, CANVAS, { expression: expr, look: gaze, blink: b, frame, browColor, facialHair, seed: id });
    texture.needsUpdate = true;
  });

  return (
    <mesh geometry={faceDecal(r)} scale={headScale} renderOrder={2}>
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
        color={FACE_TINT[lookCtx.timeOfDay]}
      />
    </mesh>
  );
};
