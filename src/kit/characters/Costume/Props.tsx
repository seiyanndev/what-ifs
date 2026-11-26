import { useLayoutEffect, useMemo } from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import { extruded, Ink, lathe, roundedBox, ToonMaterial } from "../../look";
import { METAL, Part, Sphere } from "./shared";

// Props are modelled with the GRIP at the origin and the "up" direction (+Y) pointing
// out of the thumb side of the fist. They also work standing on the ground in sets.

export type PropType =
  | "scroll"
  | "book"
  | "quill"
  | "sword"
  | "spear"
  | "shield"
  | "kampilan"
  | "bow"
  | "telescope"
  | "map"
  | "flag"
  | "torch"
  | "globe"
  | "gears"
  | "coinBag"
  | "crownPillow"
  | "axe"
  | "scepter"
  | "aeolipile";

export const PROP_TYPES: PropType[] = [
  "scroll",
  "book",
  "quill",
  "sword",
  "spear",
  "shield",
  "kampilan",
  "bow",
  "telescope",
  "map",
  "flag",
  "torch",
  "globe",
  "gears",
  "coinBag",
  "crownPillow",
  "axe",
  "scepter",
  "aeolipile",
];

/** How a prop is carried: in the fist, or strapped to the forearm (shields). */
export const PROP_MOUNT: Partial<Record<PropType, "forearm">> = { shield: "forearm" };

const WOOD = "#7a4d2e";
const PAPER = "#f1e4c2";

export const Flame: React.FC<{ scale?: number }> = ({ scale = 1 }) => {
  const frame = useCurrentFrame();
  const f = (k: number) => 1 + 0.12 * Math.sin(frame * 0.9 + k) + 0.06 * Math.sin(frame * 2.3 + k * 2);
  return (
    <group scale={scale}>
      <Part geo={<coneGeometry args={[0.09, 0.3, 14]} />} position={[0, 0.13, 0]} scale={[f(0), f(1), f(0)]} color="#ff8a2a" emissive="#ff6a00" emissiveIntensity={0.9} ink={false} rim={0} />
      <Part geo={<coneGeometry args={[0.055, 0.2, 12]} />} position={[0.01, 0.1, 0.01]} scale={[f(2), f(3), f(2)]} color="#ffe27a" emissive="#ffcf3a" emissiveIntensity={1} ink={false} rim={0} />
    </group>
  );
};

const Gear: React.FC<{ teeth: number; r: number; color: string; angle: number }> = ({ teeth, r, color, angle }) => {
  const pts: [number, number][] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = (i / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.8;
    pts.push([Math.cos(a0 - 0.12) * rr, Math.sin(a0 - 0.12) * rr], [Math.cos(a0 + 0.12) * rr, Math.sin(a0 + 0.12) * rr]);
  }
  return (
    <group rotation={[0, 0, angle]}>
      <Part geometry={extruded(`gear-${teeth}-${r}`, pts, 0.05, 0.01)} color={color} ink="prop" />
      <Part geo={<cylinderGeometry args={[r * 0.25, r * 0.25, 0.08, 16]} />} rotation={[Math.PI / 2, 0, 0]} color="#5d636b" ink={false} />
    </group>
  );
};

/** Waving cloth (flags, banners): frame-driven ripple, pinned on the pole side. */
const Cloth: React.FC<{ w: number; h: number; color: string; accent?: string }> = ({ w, h, color, accent }) => {
  const frame = useCurrentFrame();
  const { geometry, base } = useMemo(() => {
    const g = new THREE.BoxGeometry(w, h, 0.015, 14, 6, 1);
    g.translate(w / 2, 0, 0);
    return { geometry: g, base: Float32Array.from(g.attributes.position.array as Float32Array) };
  }, [w, h]);
  useLayoutEffect(() => {
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      const u = x / w;
      const z = Math.sin(frame * 0.25 - u * 5 + y * 1.5) * 0.06 * u;
      pos.setXYZ(i, x * (1 - 0.04 * u), y - u * u * 0.04, base[i * 3 + 2] + z);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  });
  return (
    <group>
      <mesh geometry={geometry} castShadow>
        <ToonMaterial color={color} side={THREE.DoubleSide} />
        <Ink weight="prop" />
      </mesh>
      {accent ? (
        <mesh position={[w * 0.5, 0, 0.012]}>
          <circleGeometry args={[h * 0.22, 24]} />
          <meshBasicMaterial color={accent} />
        </mesh>
      ) : null}
    </group>
  );
};

/** A prop. `color` / `accent` recolour it (flag colours, shield paint, book cover…). */
export const Prop: React.FC<{ type: PropType; color?: string; accent?: string }> = ({ type, color, accent }) => {
  const frame = useCurrentFrame();
  switch (type) {
    case "scroll":
      return (
        <group>
          <Part geo={<cylinderGeometry args={[0.05, 0.05, 0.34, 18]} />} color={color ?? PAPER} />
          {[-1, 1].map((s) => (
            <Part key={s} geo={Sphere(10)} position={[0, s * 0.19, 0]} scale={[0.035, 0.03, 0.035]} color={accent ?? WOOD} ink="prop" />
          ))}
          <Part geo={<torusGeometry args={[0.053, 0.012, 6, 16]} />} rotation={[Math.PI / 2, 0, 0]} color="#b5463c" ink={false} />
        </group>
      );
    case "book":
      return (
        <group position={[0, 0.13, 0]}>
          <Part geometry={roundedBox(0.07, 0.3, 0.24, 0.015)} color={color ?? "#8e3b38"} />
          <Part geometry={roundedBox(0.075, 0.28, 0.2, 0.008)} position={[0, 0, 0.022]} color={PAPER} ink={false} />
          <Part geometry={roundedBox(0.08, 0.04, 0.05, 0.008)} position={[0, 0.06, -0.1]} color={accent ?? METAL.gold} ink={false} />
        </group>
      );
    case "quill":
      return (
        <group rotation={[0, 0, 0.2]}>
          <Part geo={<cylinderGeometry args={[0.008, 0.004, 0.36, 6]} />} position={[0, 0.06, 0]} color="#e8dcc0" ink={false} />
          <Part geo={Sphere(12)} position={[0, 0.17, 0]} rotation={[0, Math.PI / 2, 0]} scale={[0.05, 0.15, 0.02]} color={color ?? "#e8d6b0"} ink="prop" />
          <Part geo={<cylinderGeometry args={[0.005, 0.005, 0.26, 4]} />} position={[0, 0.17, 0]} color="#b89a6a" ink={false} />
        </group>
      );
    case "sword":
      return (
        <group>
          <Part geo={<cylinderGeometry args={[0.025, 0.025, 0.16, 10]} />} color="#5a3d28" ink="prop" />
          <Part geo={Sphere(10)} position={[0, -0.1, 0]} scale={0.04} color={accent ?? METAL.gold} ink="prop" />
          <Part geometry={roundedBox(0.04, 0.035, 0.24, 0.012)} position={[0, 0.095, 0]} color={accent ?? METAL.gold} ink="prop" />
          <Part
            geometry={extruded("sword-blade", [[-0.03, 0], [0.03, 0], [0.03, 0.62], [0, 0.7], [-0.03, 0.62]], 0.012, 0.006)}
            position={[0, 0.11, 0]}
            rotation={[0, Math.PI / 2, 0]}
            color={color ?? METAL.steel}
            ink="prop"
          />
        </group>
      );
    case "spear":
      return (
        <group position={[0, 0.25, 0]}>
          <Part geo={<cylinderGeometry args={[0.02, 0.02, 1.9, 10]} />} color={WOOD} ink="prop" />
          <Part
            geometry={extruded("spear-head", [[0, 0], [0.06, 0.1], [0.03, 0.26], [0, 0.32], [-0.03, 0.26], [-0.06, 0.1]], 0.015, 0.006)}
            position={[0, 0.93, 0]}
            rotation={[0, Math.PI / 2, 0]}
            color={color ?? METAL.steel}
            ink="prop"
          />
        </group>
      );
    case "shield":
      return (
        <group>
          <Part geo={<cylinderGeometry args={[0.36, 0.36, 0.05, 36]} />} rotation={[Math.PI / 2, 0, 0]} color={color ?? "#8e3b38"} />
          <Part geo={<torusGeometry args={[0.36, 0.025, 8, 36]} />} color={accent ?? METAL.bronze} ink={false} />
          <Part geo={Sphere(16)} position={[0, 0, 0.03]} scale={[0.09, 0.09, 0.06]} color={accent ?? METAL.bronze} ink="prop" />
          <Part geo={<torusGeometry args={[0.2, 0.015, 6, 30]} />} position={[0, 0, 0.026]} color={accent ?? METAL.bronze} ink={false} />
        </group>
      );
    case "kampilan":
      return (
        <group>
          <Part geo={<cylinderGeometry args={[0.025, 0.028, 0.2, 10]} />} color="#3a2418" ink="prop" />
          {/* flared pommel */}
          <Part geometry={extruded("kampilan-pommel", [[-0.03, 0], [0.03, 0], [0.09, -0.08], [0.06, -0.1], [0, -0.05], [-0.06, -0.1], [-0.09, -0.08]], 0.03, 0.008)} position={[0, -0.1, 0]} rotation={[0, Math.PI / 2, 0]} color="#3a2418" ink="prop" />
          <Part geometry={roundedBox(0.035, 0.03, 0.16, 0.01)} position={[0, 0.11, 0]} color={accent ?? METAL.bronze} ink="prop" />
          {/* long single-edged blade, widening to a forked tip */}
          <Part
            geometry={extruded("kampilan-blade", [[-0.025, 0], [0.03, 0], [0.06, 0.75], [0.075, 0.86], [0.045, 0.82], [0.02, 0.88], [-0.03, 0.8]], 0.012, 0.005)}
            position={[0, 0.12, 0]}
            rotation={[0, Math.PI / 2, 0]}
            color={color ?? METAL.steel}
            ink="prop"
          />
        </group>
      );
    case "bow":
      return (
        <group rotation={[0, Math.PI / 2, 0]}>
          <Part geo={<torusGeometry args={[0.55, 0.022, 8, 30, Math.PI * 0.7]} />} position={[-0.42, 0, 0]} rotation={[0, 0, -Math.PI * 0.35]} color={color ?? WOOD} ink="prop" />
          <Part geo={<cylinderGeometry args={[0.005, 0.005, 0.89, 4]} />} position={[-0.18, 0, 0]} color="#f1ece0" ink={false} />
          <Part geo={<cylinderGeometry args={[0.03, 0.03, 0.1, 10]} />} position={[0.13, 0, 0]} color="#3a2418" ink={false} />
        </group>
      );
    case "telescope":
      return (
        <group rotation={[0, 0, 0]}>
          <Part geo={<cylinderGeometry args={[0.04, 0.045, 0.22, 16]} />} position={[0, 0.0, 0]} color={color ?? "#5a3d28"} />
          <Part geo={<cylinderGeometry args={[0.05, 0.05, 0.2, 16]} />} position={[0, 0.2, 0]} color={accent ?? METAL.gold} />
          <Part geo={<cylinderGeometry args={[0.06, 0.055, 0.14, 16]} />} position={[0, 0.36, 0]} color={accent ?? METAL.gold} />
        </group>
      );
    case "map":
      return (
        <group position={[0, 0.12, 0.06]} rotation={[0, Math.PI / 2, 0]}>
          <Part geometry={roundedBox(0.46, 0.32, 0.012, 0.005)} color={color ?? PAPER} />
          {[
            [-0.1, 0.04, 0.09, "#8fa35a"],
            [0.08, -0.05, 0.07, "#8fa35a"],
            [0.13, 0.08, 0.04, "#8fa35a"],
          ].map(([x, y, r, col], i) => (
            <mesh key={i} position={[x as number, y as number, 0.008]}>
              <circleGeometry args={[r as number, 16]} />
              <meshBasicMaterial color={col as string} />
            </mesh>
          ))}
          <Part geometry={roundedBox(0.045, 0.012, 0.004, 0.002)} position={[0.0, 0.0, 0.01]} rotation={[0, 0, 0.78]} color="#c0392b" ink={false} />
          <Part geometry={roundedBox(0.045, 0.012, 0.004, 0.002)} position={[0.0, 0.0, 0.01]} rotation={[0, 0, -0.78]} color="#c0392b" ink={false} />
          {[-1, 1].map((s) => (
            <Part key={s} geo={<cylinderGeometry args={[0.018, 0.018, 0.34, 10]} />} position={[s * 0.24, 0, 0]} color={accent ?? WOOD} ink="prop" />
          ))}
        </group>
      );
    case "flag":
      return (
        <group position={[0, 0.55, 0]}>
          <Part geo={<cylinderGeometry args={[0.02, 0.02, 2.2, 10]} />} color={WOOD} ink="prop" />
          <Part geo={Sphere(10)} position={[0, 1.12, 0]} scale={0.04} color={METAL.gold} ink="prop" />
          <group position={[0.02, 0.86, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <Cloth w={0.62} h={0.4} color={color ?? "#c0392b"} accent={accent} />
          </group>
        </group>
      );
    case "torch":
      return (
        <group>
          <Part geo={<cylinderGeometry args={[0.035, 0.025, 0.42, 10]} />} position={[0, 0.06, 0]} color={WOOD} ink="prop" />
          <Part geo={<cylinderGeometry args={[0.05, 0.045, 0.1, 10]} />} position={[0, 0.27, 0]} color="#5a3d28" ink="prop" />
          <group position={[0, 0.31, 0]}>
            <Flame />
          </group>
        </group>
      );
    case "globe":
      return (
        <group position={[0, 0.02, 0]}>
          <Part geometry={lathe("globe-stand", [[0, 0], [0.1, 0], [0.1, 0.03], [0.03, 0.06], [0.025, 0.12], [0, 0.12]])} color={accent ?? WOOD} ink="prop" />
          <group position={[0, 0.3, 0]} rotation={[0, frame * 0.02, 0.4]}>
            <Part geo={Sphere(28)} scale={0.17} color={color ?? "#4f8fc9"} />
            {[
              [0.3, 0.4, 0.06],
              [-0.6, 0.1, 0.05],
              [1.9, -0.3, 0.07],
              [3.6, 0.5, 0.05],
            ].map(([th, ph, rr], i) => (
              <Part key={i} geo={Sphere(10)} position={[Math.sin(th) * Math.cos(ph) * 0.165, Math.sin(ph) * 0.165, Math.cos(th) * Math.cos(ph) * 0.165]} scale={[rr, rr * 0.8, rr * 0.35]} rotation={[-ph, th, 0]} color="#8fa35a" ink={false} />
            ))}
          </group>
          <Part geo={<torusGeometry args={[0.2, 0.012, 6, 30, Math.PI * 1.2]} />} position={[0, 0.3, 0]} rotation={[0, Math.PI / 2, -Math.PI * 0.1 + 0.4]} color={METAL.gold} ink={false} />
        </group>
      );
    case "gears":
      return (
        <group position={[0, 0.16, 0.05]} rotation={[0, Math.PI / 2, 0]}>
          <Gear teeth={10} r={0.15} color={color ?? METAL.bronze} angle={frame * 0.05} />
          <group position={[0.2, 0.13, 0]}>
            <Gear teeth={7} r={0.1} color={accent ?? METAL.gold} angle={-frame * 0.05 * (10 / 7) + 0.2} />
          </group>
        </group>
      );
    case "coinBag":
      return (
        <group position={[0, -0.03, 0]}>
          <Part geometry={lathe("coin-bag", [[0, -0.26], [0.12, -0.24], [0.17, -0.14], [0.15, -0.04], [0.06, 0.0], [0.08, 0.05], [0, 0.06]])} color={color ?? "#a37a4e"} />
          <Part geo={<torusGeometry args={[0.055, 0.015, 6, 16]} />} position={[0, 0.0, 0]} rotation={[Math.PI / 2, 0, 0]} color="#5a3d28" ink={false} />
          {[0, 1].map((k) => (
            <Part key={k} geo={<cylinderGeometry args={[0.04, 0.04, 0.012, 16]} />} position={[0.12 - k * 0.04, -0.27 - k * 0.01, 0.08 + k * 0.03]} rotation={[0.6 + k, 0, 0.3]} color={accent ?? METAL.gold} ink="prop" />
          ))}
        </group>
      );
    case "crownPillow":
      return (
        <group position={[0, 0.06, 0.12]}>
          <Part geometry={roundedBox(0.42, 0.1, 0.34, 0.05)} color={color ?? "#8e1f2f"} />
          {[-1, 1].map((sx) =>
            [-1, 1].map((sz) => <Part key={`${sx}${sz}`} geo={Sphere(8)} position={[sx * 0.21, -0.03, sz * 0.17]} scale={0.03} color={METAL.gold} ink={false} />),
          )}
          <group position={[0, 0.1, 0]}>
            <Part geometry={lathe("pillow-crown", [[0.13, 0], [0.14, 0.01], [0.14, 0.08], [0.12, 0.09], [0.12, 0.01]], 30)} color={accent ?? METAL.gold} />
            {[0, 1, 2, 3, 4].map((i) => {
              const t = (i / 5) * Math.PI * 2;
              return <Part key={i} geo={<coneGeometry args={[0.03, 0.08, 8]} />} position={[Math.sin(t) * 0.13, 0.12, Math.cos(t) * 0.13]} color={accent ?? METAL.gold} ink={false} />;
            })}
          </group>
        </group>
      );
    case "axe":
      return (
        <group>
          <Part geo={<cylinderGeometry args={[0.022, 0.026, 0.75, 10]} />} position={[0, 0.22, 0]} color={WOOD} ink="prop" />
          <Part
            geometry={extruded("axe-head", [[0, -0.06], [0.08, -0.07], [0.2, -0.16], [0.24, 0.0], [0.2, 0.16], [0.08, 0.07], [0, 0.06]], 0.025, 0.008)}
            position={[0.0, 0.52, 0]}
            rotation={[0, Math.PI / 2, 0]}
            color={color ?? METAL.steel}
            ink="prop"
          />
        </group>
      );
    case "scepter":
      return (
        <group>
          <Part geo={<cylinderGeometry args={[0.022, 0.022, 0.55, 10]} />} position={[0, 0.12, 0]} color={color ?? METAL.gold} ink="prop" />
          <Part geo={Sphere(14)} position={[0, 0.43, 0]} scale={0.06} color={color ?? METAL.gold} ink="prop" />
          <Part geo={Sphere(12)} position={[0, 0.5, 0]} scale={[0.035, 0.05, 0.035]} color={accent ?? "#c0392b"} ink={false} />
          <Part geo={<torusGeometry args={[0.035, 0.01, 6, 14]} />} position={[0, -0.12, 0]} rotation={[Math.PI / 2, 0, 0]} color={color ?? METAL.gold} ink={false} />
        </group>
      );
    case "aeolipile": {
      // Hero of Alexandria's steam ball: cauldron on a stand, a sphere on two pipes, spun by two bent jets
      const spin = frame * 0.32;
      return (
        <group>
          <Part geometry={lathe("aeo-cauldron", [[0, 0], [0.16, 0], [0.2, 0.08], [0.19, 0.18], [0.12, 0.22], [0, 0.22]], 20)} color={accent ?? METAL.bronze} ink="prop" />
          <group position={[0, -0.02, 0]} scale={0.55}>
            <Flame />
          </group>
          {[-1, 1].map((sx) => (
            <Part key={sx} geo={<cylinderGeometry args={[0.014, 0.014, 0.36, 8]} />} position={[sx * 0.15, 0.36, 0]} color={accent ?? METAL.bronze} ink={false} />
          ))}
          <group position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
            <group rotation={[spin, 0, 0]}>
              <Part geo={Sphere(20)} scale={0.11} color={color ?? METAL.bronze} ink="prop" />
              {[-1, 1].map((s2) => (
                <group key={s2} position={[0, 0, s2 * 0.1]} rotation={[s2 * Math.PI / 2, 0, 0]}>
                  <Part geo={<cylinderGeometry args={[0.013, 0.013, 0.08, 6]} />} position={[0, 0.04, 0]} color={color ?? METAL.bronze} ink={false} />
                  <Part geo={<cylinderGeometry args={[0.013, 0.013, 0.06, 6]} />} position={[0.025, 0.08, 0]} rotation={[0, 0, Math.PI / 2]} color={color ?? METAL.bronze} ink={false} />
                </group>
              ))}
            </group>
          </group>
          {/* steam puffs drifting up */}
          {[0, 1, 2, 3].map((k) => {
            const t = ((frame / 26 + k / 4) % 1 + 1) % 1;
            return (
              <mesh key={k} position={[Math.sin(k * 2.1 + frame * 0.05) * 0.1 * t, 0.6 + t * 0.6, Math.cos(k * 1.7) * 0.08 * t]} scale={0.04 + t * 0.12}>
                <sphereGeometry args={[1, 10, 8]} />
                <ToonMaterial color="#f4f1ea" ramp="soft" rim={0} transparent opacity={0.7 * (1 - t)} depthWrite={false} />
              </mesh>
            );
          })}
        </group>
      );
    }
    default:
      return null;
  }
};
