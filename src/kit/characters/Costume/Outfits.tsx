import * as THREE from "three";
import { extruded, lathe, roundedBox } from "../../look";
import { useBody, type BodyColors, type BodyPart, type Slot } from "../Body";
import { METAL, Part, Sphere } from "./shared";

// ---------------------------------------------------------------------------
// Building blocks (all size themselves from the body they're attached to)
// ---------------------------------------------------------------------------

/** Front of the torso (z) at the belly / chest, for panels and buttons. */
const useFront = () => {
  const { shape } = useBody();
  const w = shape.width;
  return {
    w,
    h: shape.height,
    belly: 0.31 * w * (0.9 + 0.38 * shape.belly) + 0.07 * shape.belly * w,
    chest: 0.3 * w * 0.88,
  };
};

type SkirtLength = "ankle" | "knee" | "thigh";

/** Robe / tunic / coat skirt on the hips slot. `open` leaves a gap at the front (coats). */
export const Skirt: React.FC<{ length: SkirtLength; color: string; flare?: number; open?: number; hem?: string; pleats?: boolean }> = ({
  length,
  color,
  flare = 1,
  open = 0,
  hem,
}) => {
  const { dims, shape } = useBody();
  const w = shape.width;
  const ground = -dims.hipsY;
  const bottom = length === "ankle" ? ground + 0.075 : length === "knee" ? -0.02 - dims.thigh - 0.03 : -0.02 - dims.thigh * 0.55;
  const fr = (0.33 + 0.1 * flare + (length === "ankle" ? 0.04 : 0)) / w;
  const profile: [number, number][] = [
    [fr, bottom],
    [fr * 0.98, bottom + 0.03],
    [0.36 + 0.02 * flare, Math.max(bottom + 0.06, -0.24)],
    [0.325, -0.02],
    [0.31, 0.12],
    [0.3, 0.22],
  ];
  const key = `skirt-${length}-${flare}-${open}-${bottom.toFixed(3)}-${w.toFixed(2)}`;
  const geo = lathe(key, profile, 40, open / 2, Math.PI * 2 - open);
  return (
    <group>
      <Part geometry={geo} scale={[w, 1, w * 0.94]} color={color} side={THREE.DoubleSide} />
      {hem ? (
        <Part
          geometry={lathe(`${key}-hem`, [[fr * 1.005, bottom], [fr * 1.0, bottom + 0.05]], 40, open / 2, Math.PI * 2 - open)}
          scale={[w * 1.01, 1, w * 0.95]}
          color={hem}
          ink={false}
          side={THREE.DoubleSide}
        />
      ) : null}
    </group>
  );
};

/** Belt / sash around the waist (torso slot). */
export const Belt: React.FC<{ color: string; buckle?: string; thick?: number; y?: number; tilt?: number }> = ({ color, buckle, thick = 1, y = 0.0, tilt = 0 }) => {
  const f = useFront();
  const R = f.belly * 1.01;
  return (
    <group position={[0, y, 0]} rotation={[tilt, 0, 0]}>
      <Part geo={<torusGeometry args={[R, 0.035 * thick, 8, 40]} />} rotation={[Math.PI / 2, 0, 0]} scale={[(0.31 * f.w) / R, 1, 1]} color={color} ink="prop" />
      {buckle ? <Part geometry={roundedBox(0.1, 0.08, 0.03, 0.012)} position={[0, 0, R + 0.02]} color={buckle} ink="prop" /> : null}
    </group>
  );
};

/** Flat panel on the front of the chest (chest slot) or belly (torso slot). */
export const Panel: React.FC<{ y: number; w: number; h: number; color: string; z?: number; rot?: number; slot?: "chest" | "torso"; ink?: boolean }> = ({
  y,
  w,
  h,
  color,
  z,
  rot = 0,
  slot = "chest",
  ink = true,
}) => {
  const f = useFront();
  const zz = z ?? (slot === "chest" ? f.chest : f.belly) + 0.008;
  return <Part geometry={roundedBox(w, h, 0.03, 0.012)} position={[0, y, zz]} rotation={[slot === "chest" ? -0.12 : 0, 0, rot]} color={color} ink={ink ? "prop" : false} />;
};

/** Wide hanging sleeve on the elbow slot. */
export const WideSleeve: React.FC<{ color: string; trim?: string }> = ({ color, trim }) => {
  const { dims } = useBody();
  const L = dims.forearm;
  return (
    <group>
      <Part geometry={lathe("wide-sleeve", [[0.21, -1], [0.2, -0.92], [0.14, -0.4], [0.1, 0.05]], 24)} scale={[1, L, 1]} color={color} side={THREE.DoubleSide} />
      {trim ? <Part geo={<torusGeometry args={[0.205, 0.02, 6, 24]} />} position={[0, -L * 0.97, 0]} rotation={[Math.PI / 2, 0, 0]} color={trim} ink={false} /> : null}
    </group>
  );
};

/** Shoulder armour / epaulette on a shoulder slot. */
export const ShoulderPiece: React.FC<{ side: 1 | -1; color: string; kind: "round" | "flat" | "epaulette" }> = ({ side: s, color, kind }) => {
  if (kind === "round")
    return <Part geo={<sphereGeometry args={[0.15, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />} position={[s * 0.02, 0.02, 0]} rotation={[0, 0, -s * 0.35]} scale={[1.15, 1, 1.05]} color={color} side={THREE.DoubleSide} />;
  if (kind === "flat")
    return (
      <group rotation={[0, 0, -s * 0.15]}>
        {[0, 1, 2].map((k) => (
          <Part key={k} geometry={roundedBox(0.2, 0.07, 0.24, 0.02)} position={[s * 0.06, -0.02 - k * 0.075, 0]} rotation={[0, 0, -s * 0.25]} color={k === 1 ? "#5a1414" : color} ink="prop" />
        ))}
      </group>
    );
  return (
    <group position={[s * 0.01, 0.07, 0]} rotation={[0, 0, -s * 0.3]}>
      <Part geo={<cylinderGeometry args={[0.1, 0.11, 0.035, 20]} />} color={color} ink="prop" />
      <Part geo={<torusGeometry args={[0.1, 0.022, 6, 20]} />} position={[0, -0.035, 0]} rotation={[Math.PI / 2, 0, 0]} color={color} ink={false} />
    </group>
  );
};

/** Neckline pieces (chest slot): ring collar, ermine collar, high military collar. */
export const Collar: React.FC<{ color: string; kind: "ring" | "ermine" | "high" | "vneck" }> = ({ color, kind }) => {
  const { shape } = useBody();
  const y = 0.31 * shape.height;
  if (kind === "ring") return <Part geo={<torusGeometry args={[0.15, 0.035, 8, 24]} />} position={[0, y, 0.01]} rotation={[Math.PI / 2 - 0.15, 0, 0]} color={color} ink="prop" />;
  if (kind === "high") return <Part geo={<cylinderGeometry args={[0.14, 0.16, 0.1, 20, 1, true]} />} position={[0, y + 0.02, 0]} color={color} side={THREE.DoubleSide} ink="prop" />;
  if (kind === "vneck")
    return (
      <group position={[0, y - 0.05, 0.17 * shape.width]}>
        {[-1, 1].map((s) => (
          <Part key={s} geometry={roundedBox(0.05, 0.24, 0.03, 0.01)} position={[s * 0.05, -0.05, 0.03]} rotation={[-0.35, 0, s * 0.5]} color={color} ink="prop" />
        ))}
      </group>
    );
  // ermine: white fur collar with black tail spots
  return (
    <group position={[0, y - 0.03, 0]}>
      <Part geo={<torusGeometry args={[0.23 * shape.width + 0.02, 0.075, 10, 32]} />} rotation={[Math.PI / 2 - 0.1, 0, 0]} scale={[1, 1, 0.85]} color="#f6f2ea" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const t = (i / 8) * Math.PI * 2;
        return <Part key={i} geo={Sphere(8)} position={[Math.sin(t) * 0.29 * shape.width, 0.03, Math.cos(t) * 0.25 * shape.width + 0.02]} scale={[0.018, 0.03, 0.018]} color="#1f1d26" ink={false} />;
      })}
    </group>
  );
};

/** Diagonal sash / drape across the torso (chest slot). */
export const Sash: React.FC<{ color: string; width?: number; trim?: string; leftShoulder?: boolean }> = ({ color, width = 1, trim, leftShoulder = true }) => {
  const { shape } = useBody();
  const s = leftShoulder ? 1 : -1;
  return (
    <group position={[0, 0.06 * shape.height, 0]} rotation={[0, 0, s * 0.62]}>
      <Part geo={<torusGeometry args={[0.33 * shape.width, 0.065 * width, 10, 40]} />} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.94, 1]} color={color} />
      {trim ? <Part geo={<torusGeometry args={[0.33 * shape.width + 0.03, 0.018, 6, 40]} />} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.94, 1]} position={[0, 0.045 * width, 0]} color={trim} ink={false} /> : null}
    </group>
  );
};

/** Hanging strips (pteruges / kusazuri) around the hips. */
export const Strips: React.FC<{ color: string; count: number; length: number; width: number; flare?: number; alt?: string }> = ({ color, count, length, width, flare = 0.2, alt }) => {
  const { shape } = useBody();
  const R = 0.315 * shape.width;
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => {
        const t = (i / count) * Math.PI * 2;
        return (
          <group key={i} position={[Math.sin(t) * R, -0.02, Math.cos(t) * R * 0.95]} rotation={[0, t, 0]}>
            <Part geometry={roundedBox(width, length, 0.03, 0.012)} position={[0, -length / 2, 0.02]} rotation={[flare, 0, 0]} color={alt && i % 2 ? alt : color} ink="prop" />
          </group>
        );
      })}
    </group>
  );
};

/** Horizontal armour bands (lorica / dō lamellae) around belly or chest. */
export const Bands: React.FC<{ color: string; ys: number[]; slot: "torso" | "chest"; lacing?: string }> = ({ color, ys, slot, lacing }) => {
  const f = useFront();
  const R = slot === "torso" ? 0.315 : 0.305;
  return (
    <group>
      {ys.map((y, i) => (
        <group key={i} position={[0, y * f.h, 0]}>
          <Part
            geo={<cylinderGeometry args={[R * f.w + 0.012, R * f.w + 0.02, 0.075, 36, 1, true]} />}
            scale={[1, 1, slot === "torso" ? f.belly / (R * f.w) : 0.9]}
            color={color}
            side={THREE.DoubleSide}
            ink="prop"
          />
          {lacing ? (
            <Part geo={<torusGeometry args={[R * f.w + 0.022, 0.006, 4, 36]} />} rotation={[Math.PI / 2, 0, 0]} scale={[1, slot === "torso" ? f.belly / (R * f.w) : 0.9, 1]} position={[0, -0.02, 0]} color={lacing} ink={false} />
          ) : null}
        </group>
      ))}
    </group>
  );
};

/** Coat tails hanging at the back of the hips. */
export const CoatTails: React.FC<{ color: string; trim?: string }> = ({ color, trim }) => {
  const { shape, dims } = useBody();
  const L = dims.thigh + 0.1;
  return (
    <group position={[0, 0.02, -0.29 * shape.width]}>
      {[-1, 1].map((s) => (
        <Part key={s} geometry={roundedBox(0.16, L, 0.04, 0.02)} position={[s * 0.09, -L / 2, -0.02]} rotation={[0.18, 0, s * 0.06]} color={color}>
          {trim ? null : null}
        </Part>
      ))}
    </group>
  );
};

/** Row of buttons down the front. */
export const Buttons: React.FC<{ color: string; ys: number[]; slot: "chest" | "torso"; x?: number }> = ({ color, ys, slot, x = 0 }) => {
  const f = useFront();
  const z = (slot === "chest" ? f.chest : f.belly) + 0.04;
  return (
    <group>
      {ys.map((y, i) => (
        <Part key={i} geo={Sphere(10)} position={[x, y, z]} scale={0.025} color={color} ink={false} />
      ))}
    </group>
  );
};

/** Emblem (cross / disc) for tabards and badges. */
export const Emblem: React.FC<{ kind: "cross" | "disc" | "square"; color: string; y: number; z: number; size?: number }> = ({ kind, color, y, z, size = 1 }) => {
  if (kind === "cross")
    return (
      <group position={[0, y, z]} scale={size}>
        <Part geometry={roundedBox(0.05, 0.2, 0.02, 0.008)} color={color} ink={false} />
        <Part geometry={roundedBox(0.16, 0.05, 0.02, 0.008)} position={[0, 0.03, 0]} color={color} ink={false} />
      </group>
    );
  if (kind === "disc") return <Part geo={<cylinderGeometry args={[0.07 * size, 0.07 * size, 0.02, 20]} />} position={[0, y, z]} rotation={[Math.PI / 2, 0, 0]} color={color} ink={false} />;
  return (
    <group position={[0, y, z]} scale={size}>
      <Part geometry={roundedBox(0.2, 0.2, 0.02, 0.01)} color={color} ink="prop" />
      <Part geometry={extruded("crane", [[-0.06, -0.04], [0.0, 0.07], [0.07, -0.05], [0.0, -0.01]], 0.01, 0.004)} position={[0, 0, 0.015]} color="#f4ede0" ink={false} />
    </group>
  );
};

// ---------------------------------------------------------------------------
// Outfits
// ---------------------------------------------------------------------------
export type OutfitType =
  | "toga"
  | "legionary"
  | "peasantTunic"
  | "monkRobe"
  | "royalRobe"
  | "knightArmor"
  | "explorerCoat"
  | "napoleonic"
  | "mingRobe"
  | "samurai"
  | "filipinoWarrior"
  | "scholarRobe"
  | "modernCasual"
  | "suit";

export const OUTFIT_TYPES: OutfitType[] = [
  "toga",
  "legionary",
  "peasantTunic",
  "monkRobe",
  "royalRobe",
  "knightArmor",
  "explorerCoat",
  "napoleonic",
  "mingRobe",
  "samurai",
  "filipinoWarrior",
  "scholarRobe",
  "modernCasual",
  "suit",
];

/** Recolour knobs per outfit: main, second, trim, metal. */
export type OutfitColors = { main: string; second: string; trim: string; metal: string };

const OUTFIT_DEFAULTS: Record<OutfitType, OutfitColors> = {
  toga: { main: "#f4ede0", second: "#ebe1cc", trim: "#7a2b5a", metal: METAL.gold },
  legionary: { main: "#b5463c", second: "#7a4a2e", trim: METAL.bronze, metal: METAL.steel },
  peasantTunic: { main: "#8c6b4a", second: "#6b5a48", trim: "#c9a96b", metal: METAL.iron },
  monkRobe: { main: "#6b4a32", second: "#5a3d28", trim: "#d9c9a0", metal: METAL.iron },
  royalRobe: { main: "#8e1f2f", second: "#f6f2ea", trim: METAL.gold, metal: METAL.gold },
  knightArmor: { main: METAL.steel, second: "#2f5fa8", trim: METAL.gold, metal: METAL.darkSteel },
  explorerCoat: { main: "#1f6f78", second: "#efe5cc", trim: METAL.gold, metal: METAL.gold },
  napoleonic: { main: "#24324f", second: "#f1ede2", trim: "#c0392b", metal: METAL.gold },
  mingRobe: { main: "#a8322d", second: "#2f8a6a", trim: METAL.gold, metal: "#5fa88a" },
  samurai: { main: "#3c3a5a", second: "#7a1f1f", trim: "#f4ede0", metal: METAL.gold },
  filipinoWarrior: { main: "#a8322d", second: "#f2b134", trim: "#1f1d26", metal: METAL.bronze },
  scholarRobe: { main: "#3f5f7a", second: "#f1ede2", trim: "#c9962e", metal: METAL.gold },
  modernCasual: { main: "#2f6fd6", second: "#3a5a8a", trim: "#f5f7fa", metal: METAL.steel },
  suit: { main: "#2a2f3a", second: "#f5f7fa", trim: "#b5463c", metal: METAL.gold },
};

export type OutfitResult = {
  colors: Partial<BodyColors>;
  sleeves: "short" | "long";
  hide: Partial<Record<BodyPart, boolean>>;
  attach: Partial<Record<Slot, React.ReactNode>>;
  /** Cape that belongs to this outfit (royal robe). */
  cape?: { color: string; lining?: string; collar?: "ermine" };
};

const ROBE_HIDE: Partial<Record<BodyPart, boolean>> = { thighs: true, shins: true, pelvis: true };

/** Resolve an outfit to body colours, hidden parts and attached pieces. */
export const buildOutfit = (type: OutfitType, colors: Partial<OutfitColors> = {}, skin: string): OutfitResult => {
  const c = { ...OUTFIT_DEFAULTS[type], ...colors };
  const both = (fn: (s: 1 | -1) => React.ReactNode) => ({ L: fn(1), R: fn(-1) });

  switch (type) {
    case "toga":
      return {
        colors: { shirt: c.main, pants: skin, shoes: "#8a5a3b" },
        sleeves: "short",
        hide: ROBE_HIDE,
        attach: {
          hips: <Skirt length="ankle" color={c.main} hem={c.trim} flare={0.8} />,
          chest: <Sash color={c.second} width={1.6} trim={c.trim} />,
        },
      };
    case "legionary": {
      const sh = both((s) => <ShoulderPiece side={s} color={c.metal} kind="round" />);
      return {
        colors: { shirt: c.main, pants: skin, shoes: "#7a4a2e", boots: skin },
        sleeves: "short",
        hide: { pelvis: false },
        attach: {
          hips: <Strips color={c.second} count={14} length={0.26} width={0.075} flare={0.12} />,
          torso: (
            <>
              <Bands color={c.metal} ys={[0.04, 0.12, 0.2, 0.28]} slot="torso" />
              <Belt color={c.second} buckle={c.trim} y={-0.04} />
            </>
          ),
          chest: <Bands color={c.metal} ys={[0.04, 0.12]} slot="chest" />,
          shoulderL: sh.L,
          shoulderR: sh.R,
        },
      };
    }
    case "peasantTunic":
      return {
        colors: { shirt: c.main, pants: c.second, shoes: "#4a3326" },
        sleeves: "long",
        hide: { pelvis: true },
        attach: {
          hips: <Skirt length="knee" color={c.main} flare={0.6} />,
          torso: <Belt color={c.trim} thick={0.7} y={0.02} />,
          chest: <Collar color={c.second} kind="ring" />,
        },
      };
    case "monkRobe": {
      const sl = both(() => <WideSleeve color={c.main} />);
      return {
        colors: { shirt: c.main, pants: c.main, shoes: "#4a3326" },
        sleeves: "long",
        hide: ROBE_HIDE,
        attach: {
          hips: (
            <>
              <Skirt length="ankle" color={c.main} flare={0.7} />
              <Part geo={<capsuleGeometry args={[0.018, 0.4, 4, 8]} />} position={[0.12, -0.05, 0.36]} rotation={[0.1, 0, 0.05]} color={c.trim} ink="prop" />
            </>
          ),
          torso: <Belt color={c.trim} thick={0.6} y={0.0} />,
          chest: (
            <>
              <Part geo={<torusGeometry args={[0.2, 0.08, 10, 24]} />} position={[0, 0.3, -0.08]} rotation={[Math.PI / 2 - 0.5, 0, 0]} color={c.second} />
              <Part geo={Sphere(16)} position={[0, 0.24, -0.27]} scale={[0.2, 0.18, 0.1]} color={c.second} />
            </>
          ),
          elbowL: sl.L,
          elbowR: sl.R,
        },
      };
    }
    case "royalRobe":
      return {
        colors: { shirt: c.main, pants: c.main, shoes: "#3a2418" },
        sleeves: "long",
        hide: ROBE_HIDE,
        attach: {
          hips: <Skirt length="ankle" color={c.main} hem={c.trim} flare={1} />,
          torso: <Belt color={c.trim} buckle={c.trim} y={0.02} />,
          chest: (
            <>
              <Collar color={c.second} kind="ermine" />
              <Buttons color={c.trim} ys={[0.05, 0.13, 0.21]} slot="chest" />
            </>
          ),
        },
        cape: { color: c.main, lining: "#f6f2ea", collar: "ermine" },
      };
    case "knightArmor": {
      const sh = both((s) => <ShoulderPiece side={s} color={c.main} kind="round" />);
      return {
        colors: { shirt: c.main, pants: c.main, shoes: c.metal, hands: c.metal, boots: c.main },
        sleeves: "long",
        hide: {},
        attach: {
          hips: (
            <>
              <Part geometry={roundedBox(0.36, 0.42, 0.03, 0.015)} position={[0, -0.1, 0.33]} rotation={[0.08, 0, 0]} color={c.second} />
              <Part geometry={roundedBox(0.36, 0.42, 0.03, 0.015)} position={[0, -0.1, -0.33]} rotation={[-0.08, 0, 0]} color={c.second} />
            </>
          ),
          torso: (
            <>
              <Part geometry={roundedBox(0.36, 0.42, 0.03, 0.015)} position={[0, 0.12, 0.33]} color={c.second} />
              <Emblem kind="cross" color={c.trim} y={0.16} z={0.355} />
              <Belt color="#5a3d28" buckle={c.trim} y={-0.04} />
            </>
          ),
          shoulderL: sh.L,
          shoulderR: sh.R,
        },
      };
    }
    case "explorerCoat":
      return {
        colors: { shirt: c.main, pants: c.second, shoes: "#3a2418", boots: "#4a2e1e" },
        sleeves: "long",
        hide: { pelvis: false },
        attach: {
          hips: <Skirt length="knee" color={c.main} open={0.9} flare={0.8} />,
          torso: (
            <>
              <Panel slot="torso" y={0.14} w={0.2} h={0.32} color={c.second} ink={false} />
              <Belt color="#4a2e1e" buckle={c.trim} y={0.0} />
              <Buttons color={c.trim} ys={[0.1, 0.2]} slot="torso" x={0.12} />
            </>
          ),
          chest: (
            <>
              <Panel y={0.12} w={0.16} h={0.26} color={c.second} ink={false} />
              <Collar color={c.main} kind="vneck" />
            </>
          ),
        },
      };
    case "napoleonic": {
      const ep = both((s) => <ShoulderPiece side={s} color={c.metal} kind="epaulette" />);
      return {
        colors: { shirt: c.main, pants: c.second, shoes: "#16141c", boots: "#16141c" },
        sleeves: "long",
        hide: {},
        attach: {
          hips: <CoatTails color={c.main} />,
          torso: (
            <>
              <Panel slot="torso" y={0.15} w={0.24} h={0.3} color={c.second} ink={false} />
              <Buttons color={c.metal} ys={[0.06, 0.14, 0.22]} slot="torso" x={0.07} />
              <Buttons color={c.metal} ys={[0.06, 0.14, 0.22]} slot="torso" x={-0.07} />
            </>
          ),
          chest: (
            <>
              <Panel y={0.12} w={0.2} h={0.24} color={c.second} ink={false} />
              <Collar color={c.trim} kind="high" />
            </>
          ),
          shoulderL: ep.L,
          shoulderR: ep.R,
        },
      };
    }
    case "mingRobe": {
      const sl = both(() => <WideSleeve color={c.main} />);
      return {
        colors: { shirt: c.main, pants: c.main, shoes: "#1f1d26" },
        sleeves: "long",
        hide: ROBE_HIDE,
        attach: {
          hips: <Skirt length="ankle" color={c.main} flare={0.9} />,
          torso: <Belt color={c.metal} thick={1.3} y={0.0} tilt={0.15} />,
          chest: (
            <>
              <Collar color={c.main} kind="ring" />
              <Emblem kind="square" color={c.trim} y={0.08} z={0.29} />
            </>
          ),
          elbowL: sl.L,
          elbowR: sl.R,
        },
      };
    }
    case "samurai": {
      const sl = both(() => <WideSleeve color={c.main} />);
      const sh = both((s) => <ShoulderPiece side={s} color={c.second} kind="flat" />);
      return {
        colors: { shirt: c.main, pants: c.main, shoes: "#3a2418" },
        sleeves: "long",
        hide: ROBE_HIDE,
        attach: {
          hips: (
            <>
              <Skirt length="ankle" color="#2a2840" flare={1.3} />
              <Strips color={c.second} count={7} length={0.24} width={0.13} flare={0.18} alt="#5a1414" />
            </>
          ),
          torso: <Bands color={c.second} ys={[0.03, 0.11, 0.19, 0.27]} slot="torso" lacing={c.metal} />,
          chest: (
            <>
              <Bands color={c.second} ys={[0.04, 0.12]} slot="chest" lacing={c.metal} />
              <Collar color={c.trim} kind="vneck" />
            </>
          ),
          elbowL: sl.L,
          elbowR: sl.R,
          shoulderL: sh.L,
          shoulderR: sh.R,
        },
      };
    }
    case "filipinoWarrior":
      return {
        colors: { shirt: skin, pants: skin, shoes: skin },
        sleeves: "short",
        hide: { pelvis: false },
        attach: {
          hips: (
            <>
              <Part geo={<torusGeometry args={[0.3, 0.06, 8, 32]} />} position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.95, 1]} color={c.main} />
              <Part geometry={roundedBox(0.16, 0.36, 0.03, 0.015)} position={[0, -0.12, 0.31]} rotation={[0.1, 0, 0]} color={c.main} />
              <Part geometry={roundedBox(0.16, 0.05, 0.035, 0.01)} position={[0, -0.22, 0.33]} rotation={[0.1, 0, 0]} color={c.second} ink={false} />
              <Part geometry={roundedBox(0.16, 0.3, 0.03, 0.015)} position={[0, -0.1, -0.31]} rotation={[-0.1, 0, 0]} color={c.main} />
            </>
          ),
          torso: <Belt color={c.second} thick={0.6} y={-0.04} />,
          chest: <Sash color={c.main} width={1.1} trim={c.second} />,
          shoulderL: <Part geo={<torusGeometry args={[0.095, 0.022, 6, 20]} />} position={[0, -0.13, 0]} rotation={[Math.PI / 2, 0, 0]} color={c.metal} ink="prop" />,
          shoulderR: <Part geo={<torusGeometry args={[0.095, 0.022, 6, 20]} />} position={[0, -0.13, 0]} rotation={[Math.PI / 2, 0, 0]} color={c.metal} ink="prop" />,
        },
      };
    case "scholarRobe": {
      const sl = both(() => <WideSleeve color={c.main} trim={c.second} />);
      return {
        colors: { shirt: c.main, pants: c.main, shoes: "#3a2418" },
        sleeves: "long",
        hide: ROBE_HIDE,
        attach: {
          hips: <Skirt length="ankle" color={c.main} hem={c.second} flare={0.8} />,
          torso: <Belt color={c.trim} thick={1.4} y={0.02} />,
          chest: <Collar color={c.second} kind="vneck" />,
          elbowL: sl.L,
          elbowR: sl.R,
        },
      };
    }
    case "modernCasual":
      return {
        colors: { shirt: c.main, pants: c.second, shoes: c.trim },
        sleeves: "short",
        hide: {},
        attach: {
          chest: <Collar color={c.main} kind="ring" />,
        },
      };
    case "suit":
      return {
        colors: { shirt: c.main, pants: c.main, shoes: "#16141c" },
        sleeves: "long",
        hide: {},
        attach: {
          hips: <Skirt length="thigh" color={c.main} open={1.0} flare={0.2} />,
          torso: (
            <>
              <Buttons color="#16141c" ys={[0.08]} slot="torso" x={0.03} />
            </>
          ),
          chest: (
            <>
              <Panel y={0.17} w={0.12} h={0.22} color={c.second} ink={false} />
              <Part geometry={extruded("tie", [[-0.03, 0.1], [0.03, 0.1], [0.045, -0.12], [0, -0.17], [-0.045, -0.12]], 0.02, 0.006)} position={[0, 0.17, 0.3]} rotation={[-0.12, 0, 0]} color={c.trim} ink="prop" />
              <Collar color={c.main} kind="vneck" />
            </>
          ),
        },
      };
    default:
      return { colors: {}, sleeves: "short", hide: {}, attach: {} };
  }
};
