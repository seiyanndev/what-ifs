import { useLayoutEffect, useMemo, useRef } from "react";
import { random, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { Ink, lathe, SKIN_TONES, ToonMaterial, type Era } from "../look";
import { HEADWEAR_DEFAULTS, OUTFIT_DEFAULTS, type HeadwearType } from "./Costume";
import { drawFace, EXPRESSIONS, faceDecal, mixExpression } from "./Face";
import { CROWD_POOLS, PRESETS, type PresetId } from "./presets";
import type { Vec3 } from "./rig";

// Cheap background crowd: every body part is ONE InstancedMesh, the face is one shared texture.
// 200 figures ≈ 7 draw calls (+ outlines). Members are seeded picks from a preset pool.

type CapKind = "hair" | "helmet" | "hat" | "hood" | "none";
const HELMETS: HeadwearType[] = ["vikingHelmet", "galea", "kabuto", "morion", "hardHat"];
const HATS: HeadwearType[] = ["topHat", "mingHat", "crown", "bicorne", "tricorne", "turban", "headwrap", "beret", "featherHeaddress"];
const ROBES = ["toga", "monkRobe", "royalRobe", "mingRobe", "samurai", "scholarRobe"];

type Member = {
  x: number;
  z: number;
  yaw: number;
  sx: number;
  sy: number;
  phase: number;
  upper: THREE.Color;
  lower: THREE.Color;
  skin: THREE.Color;
  cap: THREE.Color;
  capKind: CapKind;
};

const HEAD_R = 0.46;
const HEAD_Y = 1.6;
const SHOULDER_Y = 1.04;

const jitter = (hex: string, seed: string, amount = 1) => {
  const c = new THREE.Color(hex);
  c.offsetHSL((random(`${seed}-h`) - 0.5) * 0.06 * amount, (random(`${seed}-s`) - 0.5) * 0.15 * amount, (random(`${seed}-l`) - 0.5) * 0.12 * amount);
  return c;
};

const memberFrom = (id: PresetId, seed: string): Omit<Member, "x" | "z" | "yaw" | "phase"> => {
  const pr = PRESETS[id];
  const outfit = pr.costume.outfit;
  const oc = outfit ? { ...OUTFIT_DEFAULTS[outfit.type], ...outfit.colors } : { main: "#8c6b4a", second: "#6b5a48" };
  const skinIdx = Math.max(0, Math.min(9, pr.skin + Math.round((random(`${seed}-skin`) - 0.5) * 2.4)));
  const skin = SKIN_TONES[skinIdx];
  const robe = outfit && ROBES.includes(outfit.type);
  const bare = outfit?.type === "filipinoWarrior";
  const hw = pr.costume.headwear;
  const capKind: CapKind = hw
    ? hw.type === "monkHood"
      ? "hood"
      : HELMETS.includes(hw.type)
        ? "helmet"
        : HATS.includes(hw.type)
          ? "hat"
          : "hair"
    : pr.costume.hair && pr.costume.hair.style !== "bald"
      ? "hair"
      : "none";
  const capHex = hw ? (hw.color ?? HEADWEAR_DEFAULTS[hw.type].color) : (pr.costume.hair?.color ?? skin);
  return {
    sx: pr.shape.width * (0.95 + random(`${seed}-w`) * 0.1),
    sy: (0.85 + 0.15 * pr.shape.height) * (0.95 + random(`${seed}-hgt`) * 0.1),
    upper: bare ? new THREE.Color(skin) : jitter(oc.main, `${seed}-up`),
    lower: robe ? jitter(oc.main, `${seed}-up`) : jitter(bare ? oc.main : oc.second, `${seed}-lo`),
    skin: new THREE.Color(skin),
    cap: jitter(capHex, `${seed}-cap`, 0.5),
    capKind,
  };
};

export type CrowdProps = {
  count: number;
  /** Preset pool name (see CROWD_POOLS), list of presets, or an era. */
  pool?: keyof typeof CROWD_POOLS | PresetId[];
  era?: Era;
  seed?: string;
  /** Area [width, depth] centred on `position`; members fill it front to back. */
  area?: [number, number];
  position?: Vec3;
  /** Point the crowd turns toward (default: toward +Z / camera). */
  lookAt?: Vec3;
  /** 0 = idle, 1 = full cheer (jumping, arms up). Animate it! */
  cheer?: number;
  /** Seconds of delay across the crowd's width (a stadium-style wave). */
  wave?: number;
  /** Uniform size multiplier. */
  scale?: number;
  ink?: boolean;
};

export const Crowd: React.FC<CrowdProps> = ({
  count,
  pool,
  era = "medieval",
  seed = "crowd",
  area = [8, 4],
  position = [0, 0, 0],
  lookAt,
  cheer = 0,
  wave = 0,
  scale = 1,
  ink = true,
}) => {
  const frame = useCurrentFrame();
  const ids: PresetId[] = Array.isArray(pool) ? pool : CROWD_POOLS[pool ?? era] ?? CROWD_POOLS.medieval;

  const members = useMemo<Member[]>(() => {
    const [W, D] = area;
    const cols = Math.max(1, Math.round(Math.sqrt((count * W) / D)));
    const rows = Math.ceil(count / cols);
    const out: Member[] = [];
    for (let i = 0; i < count; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const s = `${seed}-${i}`;
      const x = (cols === 1 ? 0 : (c / (cols - 1) - 0.5) * W) + (random(`${s}-jx`) - 0.5) * (W / cols) * 0.7 + (r % 2 ? (W / cols) * 0.35 : 0);
      const z = (rows === 1 ? 0 : (0.5 - r / (rows - 1)) * D) + (random(`${s}-jz`) - 0.5) * (D / rows) * 0.6;
      const id = ids[Math.floor(random(`${s}-pick`) * ids.length)];
      out.push({ x, z, yaw: 0, phase: random(`${s}-ph`) * Math.PI * 2, ...memberFrom(id, s) });
    }
    return out;
  }, [count, seed, area, ids]);

  // --- geometries (shared) ---
  const geo = useMemo(
    () => ({
      lower: lathe("crowd-lower", [[0, 0.0], [0.3, 0.0], [0.335, 0.06], [0.31, 0.3], [0.3, 0.52], [0, 0.56]], 20),
      upper: lathe("crowd-upper", [[0, 0.46], [0.31, 0.46], [0.315, 0.62], [0.3, 0.82], [0.26, 1.0], [0.18, 1.1], [0, 1.14]], 20),
      arm: new THREE.CapsuleGeometry(0.085, 0.26, 4, 10),
      head: new THREE.SphereGeometry(HEAD_R, 24, 16),
      cap: new THREE.SphereGeometry(HEAD_R * 1.07, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      face: faceDecal(HEAD_R),
    }),
    [],
  );

  // --- shared face texture (one draw per frame for the whole crowd) ---
  const faceTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  const refs = {
    lower: useRef<THREE.InstancedMesh>(null),
    upper: useRef<THREE.InstancedMesh>(null),
    armL: useRef<THREE.InstancedMesh>(null),
    armR: useRef<THREE.InstancedMesh>(null),
    head: useRef<THREE.InstancedMesh>(null),
    cap: useRef<THREE.InstancedMesh>(null),
    face: useRef<THREE.InstancedMesh>(null),
  };

  // per-instance colours (once)
  useLayoutEffect(() => {
    members.forEach((m, i) => {
      refs.lower.current?.setColorAt(i, m.lower);
      refs.upper.current?.setColorAt(i, m.upper);
      refs.armL.current?.setColorAt(i, m.upper);
      refs.armR.current?.setColorAt(i, m.upper);
      refs.head.current?.setColorAt(i, m.skin);
      refs.cap.current?.setColorAt(i, m.cap);
    });
    for (const r of Object.values(refs)) if (r.current?.instanceColor) r.current.instanceColor.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members]);

  // per-frame transforms + face
  useLayoutEffect(() => {
    const ctx = (faceTex.image as HTMLCanvasElement).getContext("2d");
    if (ctx) {
      const expr = mixExpression(EXPRESSIONS.neutral, EXPRESSIONS.laughing, Math.min(1, cheer * 1.4));
      drawFace(ctx, 256, { expression: expr, look: [0, 0], blink: 1, frame, browColor: "#3b2418", seed });
      faceTex.needsUpdate = true;
    }

    const M = new THREE.Matrix4();
    const P = new THREE.Matrix4();
    const tmp = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const t = frame / 30;
    const W = area[0];

    members.forEach((m, i) => {
      // cheer ramps in with a delay across the width (wave)
      const delay = wave > 0 ? ((m.x / W + 0.5) * wave) : 0;
      const local = Math.max(0, Math.min(1, cheer * 1.0 - delay * 0.0));
      const ch = wave > 0 ? Math.max(0, Math.min(1, cheer * (1 + wave) - delay)) : local;
      const bounce = Math.max(0, Math.sin(t * 7.5 + m.phase));
      const jump = ch * bounce * 0.22;
      const idleBob = Math.sin(t * 2.2 + m.phase) * 0.012;
      const squash = 1 + ch * (bounce - 0.5) * 0.08;

      const wx = position[0] + m.x * scale;
      const wz = position[2] + m.z * scale;
      const yaw = lookAt ? Math.atan2(lookAt[0] - wx, lookAt[2] - wz) : Math.sin(m.phase) * 0.25;
      q.setFromEuler(e.set(0, yaw + Math.sin(t * 0.9 + m.phase) * 0.06 * (1 - ch), 0));
      M.compose(v.set(wx, position[1] + (jump + idleBob) * scale, wz), q, sc.set(m.sx * scale / Math.sqrt(squash), m.sy * scale * squash, m.sx * scale / Math.sqrt(squash)));

      refs.lower.current?.setMatrixAt(i, M);
      refs.upper.current?.setMatrixAt(i, M);

      // head (+ cap + face): slight tilt, looks up when cheering
      q.setFromEuler(e.set(-0.25 * ch + Math.sin(t * 1.3 + m.phase) * 0.04, Math.sin(t * 0.7 + m.phase * 2) * 0.15 * (1 - ch), Math.sin(t * 1.1 + m.phase) * 0.05));
      P.compose(v.set(0, HEAD_Y, 0), q, sc.set(1.04 / m.sx, 0.97 / m.sy, 1 / m.sx)).premultiply(M);
      refs.head.current?.setMatrixAt(i, P);
      refs.face.current?.setMatrixAt(i, P);
      const capScale = m.capKind === "none" ? 0.0001 : m.capKind === "helmet" ? 1.06 : m.capKind === "hat" ? 1.1 : m.capKind === "hood" ? 1.12 : 1;
      const capTilt = m.capKind === "hair" || m.capKind === "hood" ? -0.45 : -0.1;
      tmp.compose(v.set(0, m.capKind === "hat" ? HEAD_R * 0.25 : 0, 0), q.setFromEuler(e.set(capTilt, 0, 0)), sc.set(capScale, m.capKind === "hat" ? capScale * 0.75 : capScale, capScale));
      refs.cap.current?.setMatrixAt(i, tmp.premultiply(P));

      // arms: hang + sway (idle) → up and waving (cheer)
      for (const side of [1, -1] as const) {
        const up = ch * (2.55 + Math.sin(t * 9 + m.phase + side) * 0.25);
        const idle = 0.22 + Math.sin(t * 1.8 + m.phase + side) * 0.05;
        q.setFromEuler(e.set(-0.1 * (1 - ch), 0, side * (idle * (1 - ch) + up)));
        tmp.compose(v.set(side * 0.31, SHOULDER_Y, 0), q, sc.set(1, 1, 1));
        tmp.multiply(P.makeTranslation(0, -0.2, 0));
        (side === 1 ? refs.armL : refs.armR).current?.setMatrixAt(i, tmp.premultiply(M));
      }
    });
    for (const r of Object.values(refs)) if (r.current) r.current.instanceMatrix.needsUpdate = true;
  });

  const n = members.length;
  const inst = (key: keyof typeof refs, g: THREE.BufferGeometry, outline: boolean, ramp: "default" | "soft" = "default") => (
    <instancedMesh ref={refs[key]} args={[g, undefined, n]} castShadow receiveShadow frustumCulled={false}>
      <ToonMaterial color="#ffffff" ramp={ramp} />
      {ink && outline ? <Ink weight="set" /> : null}
    </instancedMesh>
  );

  return (
    <group>
      {inst("lower", geo.lower, true)}
      {inst("upper", geo.upper, true)}
      {inst("armL", geo.arm, false)}
      {inst("armR", geo.arm, false)}
      {inst("head", geo.head, true, "soft")}
      {inst("cap", geo.cap, false)}
      <instancedMesh ref={refs.face} args={[geo.face, undefined, n]} frustumCulled={false} renderOrder={2}>
        <meshBasicMaterial map={faceTex} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </instancedMesh>
    </group>
  );
};
