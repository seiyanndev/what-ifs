import * as THREE from "three";
import { extruded, lathe, roundedBox, warpedLathe } from "../../look";
import { useBody } from "../Body";
import { METAL, Part, Sphere } from "./shared";

export type HeadwearType =
  | "laurel"
  | "crown"
  | "bicorne"
  | "tricorne"
  | "vikingHelmet"
  | "galea"
  | "kabuto"
  | "morion"
  | "monkHood"
  | "turban"
  | "mingHat"
  | "featherHeaddress"
  | "topHat"
  | "leafCrown"
  | "hardHat"
  | "headwrap"
  | "beret";

export const HEADWEAR_TYPES: HeadwearType[] = [
  "laurel",
  "crown",
  "bicorne",
  "tricorne",
  "vikingHelmet",
  "galea",
  "kabuto",
  "morion",
  "monkHood",
  "turban",
  "mingHat",
  "featherHeaddress",
  "topHat",
  "leafCrown",
  "hardHat",
  "headwrap",
  "beret",
];

/** Default colours per headwear (override with color / accent). */
export const HEADWEAR_DEFAULTS: Record<HeadwearType, { color: string; accent: string }> = {
  laurel: { color: "#6f9a3a", accent: "#4f7a2a" },
  crown: { color: METAL.gold, accent: "#c0392b" },
  bicorne: { color: "#1f1d26", accent: "#d6a444" },
  tricorne: { color: "#262230", accent: "#d6a444" },
  vikingHelmet: { color: METAL.iron, accent: METAL.bronze },
  galea: { color: METAL.steel, accent: "#c0392b" },
  kabuto: { color: "#2a2a38", accent: METAL.gold },
  morion: { color: METAL.steel, accent: METAL.gold },
  monkHood: { color: "#6b4a32", accent: "#5a3d28" },
  turban: { color: "#f1e6cc", accent: "#2f6fd6" },
  mingHat: { color: "#1f1d26", accent: "#1f1d26" },
  featherHeaddress: { color: "#b5463c", accent: "#f4ede0" },
  topHat: { color: "#1f1d26", accent: "#8e3b38" },
  leafCrown: { color: "#7fa84a", accent: "#f4c6d4" },
  hardHat: { color: "#f2b134", accent: "#e09a1a" },
  headwrap: { color: "#a8322d", accent: "#f2b134" },
  beret: { color: "#3a2f4a", accent: "#2a2236" },
};

const Leaves: React.FC<{ r: number; color: string; dark: string; count: number; y: number; gap: number; size?: number; flowers?: string }> = ({
  r,
  color,
  dark,
  count,
  y,
  gap,
  size = 1,
  flowers,
}) => {
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = gap / 2 + (i / (count - 1)) * (Math.PI * 2 - gap);
    const x = Math.sin(t) * r * 0.93;
    const z = Math.cos(t) * r * 0.93;
    const yy = y - Math.cos(t) * r * 0.08;
    out.push(
      <Part
        key={i}
        geo={Sphere(10)}
        color={i % 2 ? color : dark}
        position={[x, yy + (i % 2 ? 0.04 : -0.02) * r, z]}
        rotation={[0, t + Math.PI / 2, (i % 2 ? 0.7 : -0.7) * (t < Math.PI ? 1 : -1)]}
        scale={[r * 0.19 * size, r * 0.075 * size, r * 0.045 * size]}
        ink={i % 3 === 0 ? "prop" : false}
      />,
    );
    if (flowers && i % 5 === 2) {
      out.push(<Part key={`f${i}`} geo={Sphere(10)} color={flowers} position={[x * 1.05, yy + r * 0.05, z * 1.05]} scale={r * 0.07} ink="prop" />);
    }
  }
  return <group>{out}</group>;
};

/** Dome helmet shell that sits over the skull. */
const Dome: React.FC<{ r: number; color: string; height?: number }> = ({ r, color, height = 1 }) => (
  <Part
    geometry={lathe("helm-dome", [
      [0, 1.02],
      [0.35, 0.98],
      [0.7, 0.8],
      [0.93, 0.5],
      [1.04, 0.18],
      [1.06, 0.05],
      [0, 0.05],
    ])}
    scale={[r * 1.04, r * height, r * 1.02]}
    color={color}
  />
);

/** Headwear on the head slot (origin = head centre). */
export const Headwear: React.FC<{ type: HeadwearType; color?: string; accent?: string }> = ({ type, color, accent }) => {
  const { dims } = useBody();
  const r = dims.headR;
  const c = color ?? HEADWEAR_DEFAULTS[type].color;
  const a = accent ?? HEADWEAR_DEFAULTS[type].accent;

  switch (type) {
    case "laurel":
      return (
        <group rotation={[-0.15, 0, 0]}>
          <Leaves r={r} color={c} dark={a} count={22} y={r * 0.56} gap={1.0} />
        </group>
      );
    case "leafCrown":
      return (
        <group rotation={[-0.12, 0, 0]}>
          <Leaves r={r} color={c} dark="#5f8a3a" count={30} y={r * 0.58} gap={0} size={1.3} flowers={a} />
        </group>
      );
    case "crown":
      return (
        <group position={[0, r * 0.62, 0]}>
          <Part geo={Sphere(24)} color="#8e1f2f" position={[0, r * 0.08, 0]} scale={[r * 0.72, r * 0.32, r * 0.72]} ink="prop" />
          <Part geometry={lathe("crown-band", [[0.8, 0], [0.84, 0.02], [0.84, 0.28], [0.8, 0.3], [0.76, 0.28], [0.76, 0.02]], 40)} scale={r} color={c} />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const t = (i / 6) * Math.PI * 2;
            return (
              <group key={i}>
                <Part geo={<coneGeometry args={[r * 0.13, r * 0.32, 10]} />} color={c} position={[Math.sin(t) * r * 0.8, r * 0.42, Math.cos(t) * r * 0.8]} ink="prop" />
                <Part geo={Sphere(10)} color={c} position={[Math.sin(t) * r * 0.8, r * 0.6, Math.cos(t) * r * 0.8]} scale={r * 0.06} ink={false} />
                <Part geo={Sphere(12)} color={i % 2 ? a : "#2f6fd6"} position={[Math.sin(t) * r * 0.85, r * 0.15, Math.cos(t) * r * 0.85]} scale={r * 0.07} ink={false} />
              </group>
            );
          })}
        </group>
      );
    case "bicorne":
      return (
        <group position={[0, r * 0.38, 0]} rotation={[-0.08, 0, 0.05]}>
          <Part
            geometry={extruded("bicorne", [
              [-1.3, 0],
              [-1.05, 0.28],
              [-0.6, 0.6],
              [0, 0.78],
              [0.6, 0.6],
              [1.05, 0.28],
              [1.3, 0],
              [0, -0.06],
            ], 0.5, 0.05)}
            scale={r}
            color={c}
          />
          {/* cockade on the front */}
          {[0.16, 0.11, 0.06].map((rr, i) => (
            <Part
              key={i}
              geo={<cylinderGeometry args={[r * rr, r * rr, r * 0.03, 20]} />}
              color={["#2f4fa8", "#f4f1ea", "#c0392b"][i]}
              position={[r * 0.75, r * 0.32, r * 0.27 + i * r * 0.012]}
              rotation={[Math.PI / 2, 0, 0]}
              ink={i === 0 ? "prop" : false}
            />
          ))}
          <Part geo={<torusGeometry args={[r * 1.1, r * 0.025, 6, 40, Math.PI]} />} color={a} position={[0, -r * 0.02, r * 0.26]} scale={[1, 0.65, 1]} ink={false} />
        </group>
      );
    case "tricorne":
      return (
        <group position={[0, r * 0.32, 0]}>
          <Part
            geometry={warpedLathe(
              "tricorne",
              [
                [0, 0.62],
                [0.55, 0.6],
                [0.72, 0.5],
                [0.8, 0.18],
                [0.95, 0.12],
                [1.22, 0.12],
                [1.3, 0.16],
              ],
              (x, y, z, th) => {
                const rad = Math.hypot(x, z);
                const lobes = (1 - Math.cos(3 * th)) / 2; // 0 at the 3 points, 1 between
                if (rad < 0.78) return [x, y, z];
                const k = (rad - 0.78) / 0.52;
                const shrink = 1 - 0.3 * lobes * k;
                return [x * shrink, y + 0.85 * lobes * k, z * shrink];
              },
              60,
            )}
            scale={r}
            color={c}
            side={THREE.DoubleSide}
          />
          <Part geo={<torusGeometry args={[r * 0.79, r * 0.035, 6, 40]} />} color={a} position={[0, r * 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} ink={false} />
        </group>
      );
    case "vikingHelmet":
      return (
        <group>
          <Dome r={r} color={c} height={0.98} />
          <Part geo={<torusGeometry args={[r * 1.07, r * 0.06, 8, 40]} />} color={a} position={[0, r * 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} ink="prop" />
          <Part geo={<torusGeometry args={[r * 1.0, r * 0.05, 8, 30, Math.PI]} />} color={a} position={[0, r * 0.08, 0]} ink={false} />
          <Part geo={<torusGeometry args={[r * 1.0, r * 0.05, 8, 30, Math.PI]} />} color={a} position={[0, r * 0.08, 0]} rotation={[0, Math.PI / 2, 0]} ink={false} />
          <Part geometry={extruded("viking-nose", [[-0.09, 0.2], [0.09, 0.2], [0.06, -0.32], [0, -0.38], [-0.06, -0.32]], 0.05, 0.02)} scale={r} position={[0, 0, r * 1.06]} color={c} ink="prop" />
          {[-1, 1].map((s) => (
            <Part key={s} geo={Sphere(8)} color={a} position={[s * r * 0.6, r * 0.12, r * 0.88]} scale={r * 0.05} ink={false} />
          ))}
        </group>
      );
    case "galea":
      return (
        <group>
          <Dome r={r} color={c} height={1.0} />
          {/* crest */}
          <Part geo={<torusGeometry args={[r * 0.85, r * 0.16, 10, 24, Math.PI]} />} color={a} position={[0, r * 0.35, -r * 0.05]} rotation={[0, Math.PI / 2, 0]} scale={[0.55, 1, 1]} />
          <Part geo={<boxGeometry args={[r * 0.12, r * 0.18, r * 0.5]} />} color={c} position={[0, r * 0.98, 0]} ink={false} />
          {/* brow ridge + neck guard */}
          <Part geo={<torusGeometry args={[r * 1.06, r * 0.05, 8, 30, Math.PI]} />} color={METAL.bronze} position={[0, r * 0.2, 0]} rotation={[Math.PI / 2, 0, Math.PI]} ink="prop" />
          <Part geometry={lathe("galea-neck", [[1.02, 0.12], [1.12, -0.05], [1.3, -0.18]], 24, Math.PI - 1.2, 2.4)} scale={r} color={c} side={THREE.DoubleSide} />
          {/* cheek guards */}
          {[-1, 1].map((s) => (
            <Part
              key={s}
              geometry={extruded("galea-cheek", [[-0.2, 0.2], [0.2, 0.2], [0.18, -0.25], [0.02, -0.45], [-0.18, -0.25]], 0.05, 0.02)}
              scale={r}
              position={[s * r * 0.97, -r * 0.05, r * 0.25]}
              rotation={[0, s * 1.35, s * 0.08]}
              color={METAL.bronze}
              ink="prop"
            />
          ))}
        </group>
      );
    case "kabuto":
      return (
        <group>
          <Dome r={r} color={c} height={1.02} />
          {/* layered neck guard (shikoro) around back and sides */}
          {[0, 1, 2].map((k) => (
            <Part
              key={k}
              geometry={lathe(`shikoro-${k}`, [[1.05 + k * 0.1, 0.18 - k * 0.17], [1.16 + k * 0.1, 0.02 - k * 0.17]], 30, Math.PI - 2.1, 4.2)}
              scale={r}
              color={k === 1 ? "#3a3a52" : c}
              side={THREE.DoubleSide}
            />
          ))}
          {/* turn-backs at the front + crescent crest */}
          {[-1, 1].map((s) => (
            <Part key={s} geo={<boxGeometry args={[r * 0.28, r * 0.22, r * 0.05]} />} color={a} position={[s * r * 0.95, r * 0.12, r * 0.5]} rotation={[0, s * 0.9, 0]} ink="prop" />
          ))}
          <Part
            geometry={extruded("kabuto-crest", [[-0.7, 0.75], [-0.45, 0.3], [-0.12, 0.08], [0, 0.04], [0.12, 0.08], [0.45, 0.3], [0.7, 0.75], [0.4, 0.42], [0, 0.18], [-0.4, 0.42]], 0.04, 0.012)}
            scale={r}
            position={[0, r * 0.55, r * 0.9]}
            rotation={[-0.25, 0, 0]}
            color={a}
            ink="prop"
          />
        </group>
      );
    case "morion":
      return (
        <group>
          <Part
            geometry={lathe("morion-crown", [[0, 1.15], [0.45, 1.08], [0.8, 0.85], [0.98, 0.5], [1.04, 0.22], [0, 0.22]])}
            scale={[r * 1.0, r, r * 1.05]}
            color={c}
          />
          <Part geometry={extruded("morion-comb", [[-0.75, 0.75], [-0.6, 1.25], [0, 1.55], [0.6, 1.25], [0.75, 0.75]], 0.06, 0.015)} scale={r} rotation={[0, Math.PI / 2, 0]} color={c} ink="prop" />
          <Part
            geometry={warpedLathe("morion-brim", [[0.98, 0.24], [1.25, 0.24], [1.42, 0.3]], (x, y, z, th) => [x, y + Math.pow(Math.abs(Math.cos(th)), 2) * 0.42 * (Math.hypot(x, z) - 0.9), z])}
            scale={r}
            color={c}
            side={THREE.DoubleSide}
          />
          <Part geo={<torusGeometry args={[r * 1.0, r * 0.035, 6, 40]} />} color={a} position={[0, r * 0.27, 0]} rotation={[Math.PI / 2, 0, 0]} ink={false} />
        </group>
      );
    case "monkHood":
      return (
        <Part
          geo={<sphereGeometry args={[r * 1.14, 40, 28, Math.PI / 2 + 1.15, Math.PI * 2 - 2.3, 0, Math.PI * 0.78]} />}
          color={c}
          scale={[1.05, 1.02, 1.05]}
          position={[0, r * 0.04, -r * 0.04]}
          side={THREE.DoubleSide}
        />
      );
    case "turban":
      return (
        <group>
          {[0, 1, 2].map((k) => (
            <Part
              key={k}
              geo={<torusGeometry args={[r * (0.9 - k * 0.12), r * 0.2, 12, 36]} />}
              color={c}
              position={[0, r * (0.36 + k * 0.2), -r * 0.03]}
              rotation={[Math.PI / 2 + (k % 2 ? 0.12 : -0.1), k % 2 ? 0.1 : -0.1, 0]}
            />
          ))}
          <Part geo={Sphere(20)} color={c} position={[0, r * 0.82, -r * 0.03]} scale={[r * 0.55, r * 0.3, r * 0.55]} />
          <Part geo={Sphere(12)} color={a} position={[0, r * 0.5, r * 1.02]} scale={[r * 0.1, r * 0.13, r * 0.06]} ink="prop" />
          <Part geo={Sphere(10)} color="#f4ede0" position={[0, r * 0.78, r * 0.9]} rotation={[0.3, 0, 0]} scale={[r * 0.05, r * 0.22, r * 0.03]} ink={false} />
        </group>
      );
    case "mingHat":
      return (
        <group>
          <Part geometry={lathe("ming-cap", [[0, 0.95], [0.6, 0.92], [0.92, 0.7], [1.02, 0.3], [1.04, 0.12], [0, 0.12]])} scale={[r, r, r * 1.02]} color={c} />
          <Part geo={Sphere(20)} color={c} position={[0, r * 0.78, -r * 0.35]} scale={[r * 0.62, r * 0.5, r * 0.5]} />
          {[-1, 1].map((s) => (
            <group key={s} position={[s * r * 0.5, r * 0.8, -r * 0.6]}>
              <Part geo={<cylinderGeometry args={[r * 0.025, r * 0.025, r * 0.7, 8]} />} color={c} position={[s * r * 0.35, 0, 0]} rotation={[0, 0, Math.PI / 2]} ink={false} />
              <Part geo={<cylinderGeometry args={[r * 0.28, r * 0.28, r * 0.04, 24]} />} color={c} position={[s * r * 0.85, 0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.25, 1, 0.7]} ink="prop" />
            </group>
          ))}
        </group>
      );
    case "featherHeaddress":
      return (
        <group>
          <Part geo={<torusGeometry args={[r * 1.0, r * 0.08, 8, 40]} />} color={c} position={[0, r * 0.3, 0]} rotation={[Math.PI / 2 - 0.12, 0, 0]} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Part key={`b${i}`} geo={Sphere(8)} color={i % 2 ? "#f2b134" : "#2f8a8a"} position={[Math.sin(-0.9 + i * 0.36) * r * 1.07, r * 0.3, Math.cos(-0.9 + i * 0.36) * r * 1.07]} scale={r * 0.05} ink={false} />
          ))}
          {[-2, -1, 0, 1, 2].map((i) => (
            <group key={i} position={[i * r * 0.14, r * 0.55, -r * 0.92]} rotation={[-0.25, 0, -i * 0.28]}>
              <Part geo={Sphere(12)} color={a} position={[0, r * 0.45, 0]} scale={[r * 0.08, r * 0.42, r * 0.025]} ink="prop" />
              <Part geo={Sphere(10)} color="#2b2230" position={[0, r * 0.78, 0]} scale={[r * 0.06, r * 0.12, r * 0.028]} ink={false} />
            </group>
          ))}
        </group>
      );
    case "topHat":
      return (
        <group position={[0, r * 0.6, 0]} rotation={[-0.06, 0, 0]}>
          <Part geo={<cylinderGeometry args={[r * 1.12, r * 1.12, r * 0.06, 40]} />} color={c} ink="prop" />
          <Part geo={<cylinderGeometry args={[r * 0.72, r * 0.68, r * 1.0, 32]} />} color={c} position={[0, r * 0.5, 0]} />
          <Part geo={<cylinderGeometry args={[r * 0.7, r * 0.7, r * 0.16, 32]} />} color={a} position={[0, r * 0.12, 0]} ink={false} />
        </group>
      );
    case "hardHat":
      return (
        <group position={[0, r * 0.12, 0]}>
          <Part geometry={lathe("hard-hat", [[0, 1.0], [0.5, 0.94], [0.85, 0.66], [1.02, 0.3], [1.08, 0.12], [0, 0.12]])} scale={[r * 1.04, r, r * 1.04]} color={c} />
          <Part geo={<cylinderGeometry args={[r * 1.18, r * 1.18, r * 0.05, 40]} />} color={c} position={[0, r * 0.12, r * 0.08]} scale={[1, 1, 1.08]} ink="prop" />
          <Part geo={<boxGeometry args={[r * 0.16, r * 0.1, r * 1.5]} />} color={a} position={[0, r * 0.95, 0]} rotation={[0, 0, 0]} ink={false} />
        </group>
      );
    case "headwrap":
      // cloth wrapped around the head with a knot and short tail at the side
      return (
        <group rotation={[-0.1, 0, 0]}>
          {[0, 1].map((k) => (
            <Part
              key={k}
              geo={<torusGeometry args={[r * (0.95 - k * 0.1), r * 0.13, 10, 36]} />}
              color={k ? a : c}
              position={[0, r * (0.38 + k * 0.17), 0]}
              rotation={[Math.PI / 2 + (k ? 0.1 : -0.06), 0, 0]}
              ink={k ? false : "character"}
            />
          ))}
          <Part geo={Sphere(14)} color={c} position={[r * 0.9, r * 0.45, -r * 0.25]} scale={r * 0.17} />
          <Part geometry={roundedBox(r * 0.12, r * 0.4, r * 0.05, r * 0.02)} color={c} position={[r * 0.98, r * 0.22, -r * 0.35]} rotation={[0.2, 0.4, 0.25]} />
        </group>
      );
    case "beret":
      return (
        <group position={[0, r * 0.62, -r * 0.02]} rotation={[-0.12, 0, 0.18]}>
          <Part geo={Sphere(28)} color={c} scale={[r * 1.0, r * 0.32, r * 0.98]} />
          <Part geo={<torusGeometry args={[r * 0.8, r * 0.07, 8, 32]} />} color={a} position={[0, -r * 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} ink={false} />
        </group>
      );
    default:
      return null;
  }
};
