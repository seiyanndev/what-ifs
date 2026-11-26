import { useMemo } from "react";
import { random, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { Flame, Part, Prop, Sphere } from "../characters/Costume";
import { extruded, lathe, roundedBox, ToonMaterial } from "../look";
import { useSet } from "./context";

// Reusable diorama dressing. Origins sit on the ground (y = 0). Colours come from the set's era palette
// unless overridden. Keep everything toy-like: rounded, chunky, outlined.

type V3 = [number, number, number];
type At = { position?: V3; rotation?: number; scale?: number };
const G: React.FC<At & { children: React.ReactNode }> = ({ position, rotation = 0, scale = 1, children }) => (
  <group position={position} rotation={[0, rotation, 0]} scale={scale}>
    {children}
  </group>
);

// ---------------------------------------------------------------------------
// Nature
// ---------------------------------------------------------------------------
export const Cypress: React.FC<At> = (p) => {
  const { pal } = useSet();
  return (
    <G {...p}>
      <Part geo={<cylinderGeometry args={[0.09, 0.12, 0.6, 10]} />} position={[0, 0.3, 0]} color={pal.wood} ink={false} />
      <Part geo={Sphere(22)} position={[0, 1.7, 0]} scale={[0.55, 1.55, 0.55]} color={pal.foliage[1]} ink="set" />
      <Part geo={Sphere(18)} position={[0.05, 2.65, 0.05]} scale={[0.32, 0.7, 0.32]} color={pal.foliage[0]} ink="set" />
    </G>
  );
};

export const RoundTree: React.FC<At & { color?: string }> = ({ color, ...p }) => {
  const { pal } = useSet();
  return (
    <G {...p}>
      <Part geo={<cylinderGeometry args={[0.1, 0.16, 1.1, 10]} />} position={[0, 0.55, 0]} color={pal.wood} ink="set" />
      <Part geo={Sphere(22)} position={[0, 1.55, 0]} scale={[0.95, 0.8, 0.95]} color={color ?? pal.foliage[0]} ink="set" />
      <Part geo={Sphere(18)} position={[0.45, 1.3, 0.2]} scale={0.55} color={color ?? pal.foliage[1]} ink="set" />
      <Part geo={Sphere(18)} position={[-0.4, 1.35, -0.15]} scale={0.6} color={color ?? pal.foliage[1]} ink="set" />
    </G>
  );
};

export const PineTree: React.FC<At> = (p) => {
  const { pal } = useSet();
  return (
    <G {...p}>
      <Part geo={<cylinderGeometry args={[0.08, 0.12, 0.5, 8]} />} position={[0, 0.25, 0]} color={pal.wood} ink={false} />
      {[0, 1, 2].map((k) => (
        <Part key={k} geo={<coneGeometry args={[0.75 - k * 0.18, 0.9, 12]} />} position={[0, 0.8 + k * 0.55, 0]} color={k % 2 ? pal.foliage[0] : pal.foliage[1]} ink="set" />
      ))}
    </G>
  );
};

export const PalmTree: React.FC<At & { lean?: number }> = ({ lean = 0.15, ...p }) => {
  const frame = useCurrentFrame();
  const sway = Math.sin(frame / 25) * 0.05;
  return (
    <G {...p}>
      <group rotation={[0, 0, lean + sway * 0.3]}>
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <Part key={k} geo={<cylinderGeometry args={[0.09 - k * 0.005, 0.11 - k * 0.005, 0.42, 10]} />} position={[k * 0.03, 0.21 + k * 0.4, 0]} rotation={[0, 0, -0.03 * k]} color={k % 2 ? "#a7814f" : "#8e6a3e"} ink={k === 0 ? "set" : false} />
        ))}
        <group position={[0.2, 2.45, 0]}>
          {Array.from({ length: 7 }, (_, i) => (
            <group key={i} rotation={[0, (i / 7) * Math.PI * 2, -0.55 + sway]}>
              <Part geo={Sphere(12)} position={[0.55, 0.02, 0]} scale={[0.62, 0.05, 0.16]} rotation={[0, 0, -0.25]} color={i % 2 ? "#5f9a3e" : "#4d8a35"} ink="set" />
            </group>
          ))}
          <Part geo={Sphere(10)} position={[0.05, -0.12, 0.08]} scale={0.1} color="#6b4a2a" ink={false} />
        </group>
      </group>
    </G>
  );
};

export const Bush: React.FC<At & { color?: string }> = ({ color, ...p }) => {
  const { pal } = useSet();
  return (
    <G {...p}>
      {[
        [0, 0.25, 0, 0.42],
        [0.32, 0.18, 0.1, 0.3],
        [-0.3, 0.2, -0.05, 0.32],
      ].map(([x, y, z, s], i) => (
        <Part key={i} geo={Sphere(16)} position={[x, y, z]} scale={[s, s * 0.85, s]} color={color ?? (i ? pal.foliage[0] : pal.foliage[1])} ink="set" />
      ))}
    </G>
  );
};

export const Fern: React.FC<At> = (p) => (
  <G {...p}>
    {Array.from({ length: 7 }, (_, i) => (
      <group key={i} rotation={[0, (i / 7) * Math.PI * 2, 0]}>
        <Part geo={Sphere(10)} position={[0.32, 0.28, 0]} rotation={[0, 0, -0.7]} scale={[0.42, 0.06, 0.12]} color={i % 2 ? "#3f7a3a" : "#5a9a44"} ink={i % 2 ? "set" : false} />
      </group>
    ))}
  </G>
);

export const Rock: React.FC<At & { color?: string; seed?: string }> = ({ color, seed = "rk", ...p }) => {
  const { pal } = useSet();
  return (
    <G {...p}>
      <Part geo={<dodecahedronGeometry args={[0.4, 1]} />} position={[0, 0.22, 0]} rotation={[random(`${seed}a`) * 3, random(`${seed}b`) * 3, 0]} scale={[1.2, 0.75, 1]} color={color ?? pal.stone[1]} ink="set" />
    </G>
  );
};

export const Volcano: React.FC<At> = (p) => {
  const frame = useCurrentFrame();
  return (
    <G {...p}>
      <Part geometry={lathe("volcano", [[0, 0], [2.6, 0], [2.2, 0.5], [1.3, 1.9], [0.75, 2.5], [0.55, 2.4], [0.5, 2.2]], 28)} color="#7a5a4a" ink="set" />
      <Part geo={<cylinderGeometry args={[0.55, 0.55, 0.05, 24]} />} position={[0, 2.28, 0]} color="#ff7a2a" emissive="#ff5a00" emissiveIntensity={0.9} ink={false} rim={0} />
      {[0, 1, 2, 3].map((k) => {
        const t = ((frame / 90 + k / 4) % 1 + 1) % 1;
        return <Part key={k} geo={Sphere(14)} position={[Math.sin(k * 2.1) * 0.3 * t, 2.6 + t * 2.2, Math.cos(k) * 0.2 * t]} scale={0.35 + t * 0.6} color="#bdb3b8" ink={false} rim={0.2} />;
      })}
    </G>
  );
};

/** Cute toy sauropod. */
export const Dino: React.FC<At & { color?: string }> = ({ color = "#7fb069", ...p }) => {
  const frame = useCurrentFrame();
  const nod = Math.sin(frame / 18) * 0.08;
  return (
    <G {...p}>
      <Part geo={Sphere(24)} position={[0, 0.85, 0]} scale={[1.05, 0.7, 0.62]} color={color} ink="character" />
      {[
        [0.55, 0.32],
        [-0.55, 0.32],
        [0.55, -0.32],
        [-0.55, -0.32],
      ].map(([x, z], i) => (
        <Part key={i} geo={<cylinderGeometry args={[0.17, 0.2, 0.55, 12]} />} position={[x, 0.28, z]} color={color} ink="character" />
      ))}
      <group position={[0.8, 1.15, 0]} rotation={[0, 0, -0.75 + nod]}>
        <Part geo={<capsuleGeometry args={[0.17, 0.95, 6, 12]} />} position={[0, 0.55, 0]} color={color} ink="character" />
        <group position={[0, 1.12, 0]} rotation={[0, 0, 0.9]}>
          <Part geo={Sphere(18)} scale={[0.34, 0.24, 0.26]} position={[0.1, 0, 0]} color={color} ink="character" />
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0.22, 0.07, s * 0.17]}>
              <sphereGeometry args={[0.045, 10, 8]} />
              <meshBasicMaterial color="#1d1420" />
            </mesh>
          ))}
        </group>
      </group>
      <Part geo={<coneGeometry args={[0.28, 1.4, 14]} />} position={[-1.15, 0.75, 0]} rotation={[0, 0, 1.25]} color={color} ink="character" />
      {[0, 1, 2].map((k) => (
        <Part key={k} geo={<coneGeometry args={[0.09, 0.2, 8]} />} position={[0.3 - k * 0.32, 1.33 - Math.abs(k - 1) * 0.04, 0]} color="#e8a03a" ink={false} />
      ))}
    </G>
  );
};

// ---------------------------------------------------------------------------
// Architecture
// ---------------------------------------------------------------------------
export const Column: React.FC<At & { height?: number; broken?: boolean }> = ({ height = 3.2, broken, ...p }) => {
  const { pal } = useSet();
  const h = broken ? height * 0.45 : height;
  return (
    <G {...p}>
      <Part geometry={roundedBox(0.95, 0.22, 0.95, 0.06)} position={[0, 0.11, 0]} color={pal.stone[1]} ink="set" />
      <Part geometry={lathe("col-shaft", [[0, 0], [0.36, 0], [0.4, 0.06], [0.33, 0.14], [0.3, 0.5], [0.27, 1], [0, 1]], 24)} position={[0, 0.2, 0]} scale={[1, h - 0.45, 1]} color={pal.stone[0]} ink="set" />
      {broken ? null : <Part geometry={roundedBox(0.86, 0.24, 0.86, 0.06)} position={[0, h - 0.13, 0]} color={pal.stone[1]} ink="set" />}
    </G>
  );
};

export type HouseStyle = "ancient" | "medieval" | "modern" | "tudor";

/** `shutters`: wooden window shutters, 0 = swung open against the wall, 1 = closed (animate it to close them). */
export const House: React.FC<At & { style?: HouseStyle; w?: number; d?: number; h?: number; wall?: string; roof?: string; shutters?: number }> = ({ style = "medieval", w = 2, d = 1.8, h = 1.6, wall, roof, shutters, ...p }) => {
  const { pal, night } = useSet();
  const wallC = wall ?? (style === "ancient" ? "#efe2c6" : style === "modern" ? "#e9eef5" : style === "tudor" ? "#f1e6cc" : "#d9c9a8");
  const roofC = roof ?? (style === "ancient" ? "#b5533c" : style === "modern" ? "#5a6a7a" : "#8e3b38");
  const win = night ? "#ffd27a" : "#3b4a6a";
  return (
    <G {...p}>
      <Part geometry={roundedBox(w, h, d, 0.06)} position={[0, h / 2, 0]} color={wallC} ink="set" />
      {style === "ancient" || style === "modern" ? (
        <Part geometry={roundedBox(w + 0.15, 0.16, d + 0.15, 0.04)} position={[0, h + 0.06, 0]} color={roofC} ink="set" />
      ) : (
        <Part geometry={extruded(`roof-${w}-${d}`, [[-w / 2 - 0.15, 0], [w / 2 + 0.15, 0], [0, w * 0.45]], d + 0.2, 0.03)} position={[0, h, 0]} color={roofC} ink="set" />
      )}
      {style === "tudor"
        ? [-w * 0.3, 0, w * 0.3].map((x) => <Part key={x} geometry={roundedBox(0.08, h * 0.95, 0.04, 0.01)} position={[x, h / 2, d / 2 + 0.02]} color="#4a3326" ink={false} />)
        : null}
      <Part geometry={roundedBox(0.42, 0.7, 0.06, 0.04)} position={[0, 0.35, d / 2 + 0.02]} color={pal.wood} ink="set" />
      {(style === "modern" ? [-0.6, 0.6] : [-w * 0.3, w * 0.3]).map((x) => (
        <Part key={x} geometry={roundedBox(0.32, 0.32, 0.05, 0.03)} position={[x, h * 0.62, d / 2 + 0.02]} color={win} emissive={night ? "#ffb84a" : undefined} emissiveIntensity={night ? 0.8 : 0} ink={false} rim={0} />
      ))}
      {shutters !== undefined && style !== "modern"
        ? [-w * 0.3, w * 0.3].flatMap((x) =>
            [-1, 1].map((side) => (
              // hinge on the window's outer edge; open = folded flat against the wall
              <group key={`${x}${side}`} position={[x + side * 0.19, h * 0.62, d / 2 + 0.05]} rotation={[0, side * (1 - Math.max(0, Math.min(1, shutters))) * Math.PI * 0.55, 0]}>
                <Part geometry={roundedBox(0.19, 0.36, 0.035, 0.012)} position={[-side * 0.095, 0, 0]} color={pal.wood} ink="prop" />
                <Part geometry={roundedBox(0.15, 0.03, 0.04, 0.008)} position={[-side * 0.095, 0.09, 0.012]} color="#4a3326" ink={false} />
                <Part geometry={roundedBox(0.15, 0.03, 0.04, 0.008)} position={[-side * 0.095, -0.09, 0.012]} color="#4a3326" ink={false} />
              </group>
            )),
          )
        : null}
    </G>
  );
};

export const Temple: React.FC<At> = (p) => {
  const { pal } = useSet();
  return (
    <G {...p}>
      {[0, 1, 2].map((k) => (
        <Part key={k} geometry={roundedBox(4.2 - k * 0.3, 0.18, 2.6 - k * 0.3, 0.04)} position={[0, 0.09 + k * 0.18, 0]} color={k % 2 ? pal.stone[1] : pal.stone[0]} ink="set" />
      ))}
      {[-1.5, -0.5, 0.5, 1.5].map((x) => (
        <group key={x} position={[x, 0.54, 0.85]}>
          <Column height={2.4} scale={0.75} />
        </group>
      ))}
      <Part geometry={roundedBox(3.7, 1.9, 1.4, 0.05)} position={[0, 1.5, -0.35]} color={pal.stone[1]} ink="set" />
      <Part geometry={roundedBox(3.9, 0.2, 2.2, 0.04)} position={[0, 2.4, 0.05]} color={pal.stone[0]} ink="set" />
      <Part geometry={extruded("pediment", [[-2.0, 0], [2.0, 0], [0, 0.7]], 2.1, 0.03)} position={[0, 2.5, 0.05]} color={pal.stone[0]} ink="set" />
    </G>
  );
};

export const Tower: React.FC<At & { height?: number; roof?: "cone" | "crenel" }> = ({ height = 3.2, roof = "cone", ...p }) => {
  const { pal, night } = useSet();
  return (
    <G {...p}>
      <Part geometry={lathe("tower", [[0, 0], [0.75, 0], [0.7, 1], [0, 1]], 24)} scale={[1, height, 1]} color={pal.stone[1]} ink="set" />
      {roof === "cone" ? (
        <Part geo={<coneGeometry args={[0.95, 1.3, 20]} />} position={[0, height + 0.62, 0]} color="#8e3b38" ink="set" />
      ) : (
        Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return <Part key={i} geometry={roundedBox(0.28, 0.3, 0.28, 0.04)} position={[Math.sin(a) * 0.62, height + 0.15, Math.cos(a) * 0.62]} color={pal.stone[1]} ink="set" />;
        })
      )}
      <Part geometry={roundedBox(0.24, 0.42, 0.05, 0.04)} position={[0, height * 0.65, 0.72]} color={night ? "#ffd27a" : "#2f2a3a"} emissive={night ? "#ffb84a" : undefined} emissiveIntensity={night ? 0.8 : 0} ink={false} rim={0} />
    </G>
  );
};

export const Wall: React.FC<At & { length?: number; height?: number; crenel?: boolean }> = ({ length = 3, height = 1.2, crenel = true, ...p }) => {
  const { pal } = useSet();
  return (
    <G {...p}>
      <Part geometry={roundedBox(length, height, 0.45, 0.06)} position={[0, height / 2, 0]} color={pal.stone[1]} ink="set" />
      {crenel
        ? Array.from({ length: Math.floor(length / 0.5) }, (_, i) => (
            <Part key={i} geometry={roundedBox(0.26, 0.24, 0.45, 0.04)} position={[-length / 2 + 0.25 + i * 0.5, height + 0.12, 0]} color={pal.stone[1]} ink="set" />
          ))
        : null}
    </G>
  );
};

export const Skyscraper: React.FC<At & { w?: number; d?: number; h?: number; color?: string; seed?: string }> = ({ w = 1.4, d = 1.4, h = 5, color = "#c7d3e0", seed = "sk", ...p }) => {
  const { night } = useSet();
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 512;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 128, 512);
    for (let y = 0; y < 22; y++)
      for (let x = 0; x < 5; x++) {
        const lit = random(`${seed}-${x}-${y}`) < (night ? 0.55 : 0.0);
        ctx.fillStyle = lit ? "#ffd27a" : "#3d5a80";
        ctx.fillRect(10 + x * 23, 10 + y * 22.5, 15, 14);
      }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [color, seed, night]);
  return (
    <G {...p}>
      <mesh geometry={roundedBox(w, h, d, 0.05)} position={[0, h / 2, 0]} castShadow receiveShadow>
        <ToonMaterial color="#ffffff" map={tex} emissive={night ? "#ffcf7a" : undefined} emissiveIntensity={night ? 0.25 : 0} />
      </mesh>
      <Part geometry={roundedBox(w * 0.6, 0.3, d * 0.6, 0.04)} position={[0, h + 0.15, 0]} color="#8f9aa7" ink="set" />
    </G>
  );
};

// ---------------------------------------------------------------------------
// Furniture & props
// ---------------------------------------------------------------------------
export const Table: React.FC<At & { w?: number; d?: number; h?: number; color?: string }> = ({ w = 1.8, d = 1, h = 0.75, color, ...p }) => {
  const { pal } = useSet();
  return (
    <G {...p}>
      <Part geometry={roundedBox(w, 0.1, d, 0.03)} position={[0, h, 0]} color={color ?? pal.wood} ink="set" />
      {[
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
      ].map(([sx, sz], i) => (
        <Part key={i} geometry={roundedBox(0.1, h, 0.1, 0.02)} position={[sx * (w / 2 - 0.12), h / 2, sz * (d / 2 - 0.12)]} color={color ?? pal.wood} ink={false} />
      ))}
    </G>
  );
};

export const Throne: React.FC<At & { color?: string; gold?: string }> = ({ color = "#8e1f2f", gold = "#d6a444", ...p }) => (
  <G {...p}>
    <Part geometry={roundedBox(1.2, 0.5, 1.0, 0.08)} position={[0, 0.25, 0]} color={gold} ink="set" />
    <Part geometry={roundedBox(1.0, 0.18, 0.85, 0.08)} position={[0, 0.58, 0.02]} color={color} ink="set" />
    <Part geometry={roundedBox(1.2, 1.9, 0.2, 0.08)} position={[0, 1.2, -0.42]} color={gold} ink="set" />
    <Part geometry={roundedBox(0.9, 1.4, 0.06, 0.06)} position={[0, 1.15, -0.3]} color={color} ink={false} />
    {[-1, 1].map((s) => (
      <Part key={s} geometry={roundedBox(0.18, 0.4, 0.9, 0.06)} position={[s * 0.6, 0.75, 0]} color={gold} ink="set" />
    ))}
    <Part geo={Sphere(12)} position={[0, 2.25, -0.42]} scale={0.16} color={gold} ink="set" />
  </G>
);

export const Carpet: React.FC<At & { w?: number; d?: number; color?: string; trim?: string }> = ({ w = 1.4, d = 5, color = "#a8322d", trim = "#d6a444", ...p }) => (
  <G {...p}>
    <Part geometry={roundedBox(w, 0.04, d, 0.015)} position={[0, 0.02, 0]} color={trim} ink={false} />
    <Part geometry={roundedBox(w - 0.16, 0.05, d - 0.16, 0.015)} position={[0, 0.025, 0]} color={color} ink={false} />
  </G>
);

export const Banner: React.FC<At & { color?: string; emblem?: string; h?: number }> = ({ color = "#8e3b38", emblem = "#d6a444", h = 1.8, ...p }) => {
  const frame = useCurrentFrame();
  return (
    <G {...p}>
      <Part geo={<cylinderGeometry args={[0.03, 0.03, 1.0, 8]} />} position={[0, h, 0]} rotation={[0, 0, Math.PI / 2]} color="#5a3d28" ink={false} />
      <group rotation={[Math.sin(frame / 30) * 0.03, 0, 0]} position={[0, h, 0]}>
        <Part geometry={extruded(`banner-${h}`, [[-0.42, 0], [0.42, 0], [0.42, -h * 0.8], [0, -h * 0.95], [-0.42, -h * 0.8]], 0.04, 0.01)} color={color} ink="set" />
        <Part geo={Sphere(12)} position={[0, -h * 0.4, 0.04]} scale={[0.18, 0.18, 0.02]} color={emblem} ink={false} />
      </group>
    </G>
  );
};

export const Bookshelf: React.FC<At & { w?: number; h?: number }> = ({ w = 2, h = 2.6, ...p }) => {
  const { pal } = useSet();
  const books = useMemo(() => {
    const out: { x: number; y: number; hh: number; c: string; lean: number }[] = [];
    const cols = ["#8e3b38", "#2f5fa8", "#3f7a3a", "#c9962e", "#5a2f7a", "#7a4d2e", "#1f6f78"];
    for (let r = 0; r < 4; r++) {
      let x = -w / 2 + 0.14;
      let i = 0;
      while (x < w / 2 - 0.18) {
        const bw = 0.08 + random(`bk-w-${r}-${i}`) * 0.06;
        out.push({ x: x + bw / 2, y: 0.18 + r * (h / 4.2), hh: 0.32 + random(`bk-h-${r}-${i}`) * 0.12, c: cols[Math.floor(random(`bk-c-${r}-${i}`) * cols.length)], lean: random(`bk-l-${r}-${i}`) < 0.1 ? 0.25 : 0 });
        x += bw + 0.01;
        i++;
      }
    }
    return out;
  }, [w, h]);
  return (
    <G {...p}>
      {/* open shelving: back, sides, top — books sit in front of the back panel */}
      <Part geometry={roundedBox(w, h, 0.08, 0.02)} position={[0, h / 2, -0.21]} color="#5a3d28" ink="set" />
      {[-1, 1].map((sx) => (
        <Part key={sx} geometry={roundedBox(0.1, h, 0.5, 0.03)} position={[sx * (w / 2 - 0.05), h / 2, 0]} color={pal.wood} ink="set" />
      ))}
      <Part geometry={roundedBox(w, 0.1, 0.52, 0.03)} position={[0, h - 0.05, 0]} color={pal.wood} ink="set" />
      {[0, 1, 2, 3].map((r) => (
        <Part key={r} geometry={roundedBox(w - 0.1, 0.06, 0.42, 0.02)} position={[0, 0.1 + r * (h / 4.2), 0.03]} color={pal.wood} ink={false} />
      ))}
      {books.map((b, i) => (
        <mesh key={i} position={[b.x, b.y + b.hh / 2, 0.06]} rotation={[0, 0, b.lean]}>
          <boxGeometry args={[0.09, b.hh, 0.3]} />
          <ToonMaterial color={b.c} />
        </mesh>
      ))}
    </G>
  );
};

export const Barrel: React.FC<At> = (p) => {
  const { pal } = useSet();
  return (
    <G {...p}>
      <Part geometry={lathe("barrel", [[0, 0], [0.3, 0], [0.36, 0.3], [0.3, 0.62], [0, 0.62]], 18)} color={pal.wood} ink="set" />
      {[0.12, 0.5].map((y) => (
        <Part key={y} geo={<torusGeometry args={[0.335, 0.02, 6, 20]} />} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} color="#5d636b" ink={false} />
      ))}
    </G>
  );
};

export const Crate: React.FC<At & { size?: number }> = ({ size = 0.6, ...p }) => (
  <G {...p}>
    <Part geometry={roundedBox(size, size, size, 0.04)} position={[0, size / 2, 0]} color="#b08a5a" ink="set" />
    <Part geometry={roundedBox(size * 1.02, size * 0.12, size * 1.02, 0.01)} position={[0, size / 2, 0]} color="#8a6a42" ink={false} />
  </G>
);

export const TorchStand: React.FC<At> = (p) => (
  <G {...p}>
    <Part geo={<cylinderGeometry args={[0.04, 0.06, 1.5, 8]} />} position={[0, 0.75, 0]} color="#5a3d28" ink="set" />
    <Part geo={<cylinderGeometry args={[0.14, 0.08, 0.16, 10]} />} position={[0, 1.55, 0]} color="#5d636b" ink="set" />
    <group position={[0, 1.6, 0]}>
      <Flame scale={1.3} />
    </group>
  </G>
);

export const StreetLamp: React.FC<At> = (p) => {
  const { night } = useSet();
  return (
    <G {...p}>
      <Part geo={<cylinderGeometry args={[0.05, 0.07, 2.4, 10]} />} position={[0, 1.2, 0]} color="#3a3f4a" ink="set" />
      <Part geo={Sphere(14)} position={[0, 2.5, 0]} scale={0.2} color={night ? "#ffe6a0" : "#f5f1e0"} emissive={night ? "#ffd27a" : undefined} emissiveIntensity={night ? 1 : 0} ink="set" rim={0} />
    </G>
  );
};

export const Tent: React.FC<At & { color?: string; stripe?: string }> = ({ color = "#e8dcc0", stripe = "#8e3b38", ...p }) => (
  <G {...p}>
    <Part geo={<coneGeometry args={[1.0, 1.5, 6]} />} position={[0, 0.75, 0]} color={color} ink="set" />
    <Part geo={<coneGeometry args={[1.02, 0.3, 6, 1, true]} />} position={[0, 0.16, 0]} color={stripe} ink={false} side={THREE.DoubleSide} />
    <Part geo={<cylinderGeometry args={[0.02, 0.02, 0.5, 6]} />} position={[0, 1.65, 0]} color="#5a3d28" ink={false} />
    <Part geometry={roundedBox(0.25, 0.14, 0.02, 0.01)} position={[0.13, 1.82, 0]} color={stripe} ink={false} />
  </G>
);

export const Fence: React.FC<At & { length?: number }> = ({ length = 3, ...p }) => {
  const { pal } = useSet();
  const n = Math.max(2, Math.round(length / 0.6) + 1);
  return (
    <G {...p}>
      {Array.from({ length: n }, (_, i) => (
        <Part key={i} geometry={roundedBox(0.1, 0.7, 0.1, 0.02)} position={[-length / 2 + (i * length) / (n - 1), 0.35, 0]} color={pal.wood} ink="set" />
      ))}
      {[0.25, 0.52].map((y) => (
        <Part key={y} geometry={roundedBox(length, 0.07, 0.05, 0.02)} position={[0, y, 0.06]} color={pal.wood} ink={false} />
      ))}
    </G>
  );
};

export const Well: React.FC<At> = (p) => {
  const { pal } = useSet();
  return (
    <G {...p}>
      <Part geometry={lathe("well", [[0.5, 0], [0.62, 0], [0.62, 0.7], [0.5, 0.7]], 24)} color={pal.stone[1]} ink="set" />
      {[-1, 1].map((s) => (
        <Part key={s} geometry={roundedBox(0.1, 1.3, 0.1, 0.02)} position={[s * 0.55, 1.05, 0]} color={pal.wood} ink="set" />
      ))}
      <Part geometry={extruded("well-roof", [[-0.85, 0], [0.85, 0], [0, 0.5]], 0.9, 0.02)} position={[0, 1.65, 0]} color="#8e3b38" ink="set" />
    </G>
  );
};

export const Dock: React.FC<At & { length?: number; width?: number }> = ({ length = 4, width = 1.4, ...p }) => {
  const { pal } = useSet();
  return (
    <G {...p}>
      {Array.from({ length: Math.floor(length / 0.32) }, (_, i) => (
        <Part key={i} geometry={roundedBox(width, 0.08, 0.28, 0.02)} position={[0, 0.3, -length / 2 + 0.16 + i * 0.32]} color={i % 2 ? pal.wood : "#9a6a45"} ink={false} />
      ))}
      {[-1, 1].flatMap((s) =>
        [0, 1, 2].map((k) => <Part key={`${s}${k}`} geo={<cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />} position={[s * (width / 2 - 0.05), 0.0, -length / 2 + 0.3 + k * (length / 2 - 0.3)]} color="#5a3d28" ink="set" />),
      )}
    </G>
  );
};

export const Cannon: React.FC<At> = (p) => (
  <G {...p}>
    <Part geometry={lathe("cannon", [[0, 0], [0.18, 0], [0.16, 0.2], [0.12, 1.1], [0.14, 1.15], [0, 1.15]], 18)} position={[0, 0.42, -0.4]} rotation={[1.35, 0, 0]} color="#3a3f4a" ink="set" />
    {[-1, 1].map((s) => (
      <Part key={s} geo={<cylinderGeometry args={[0.3, 0.3, 0.08, 16]} />} position={[s * 0.25, 0.3, -0.2]} rotation={[0, 0, Math.PI / 2]} color="#7a4d2e" ink="set" />
    ))}
  </G>
);

export const Anvil: React.FC<At> = (p) => (
  <G {...p}>
    <Part geometry={roundedBox(0.4, 0.45, 0.35, 0.04)} position={[0, 0.22, 0]} color="#7a4d2e" ink="set" />
    <Part geometry={extruded("anvil", [[-0.45, 0], [0.35, 0], [0.55, 0.12], [0.35, 0.22], [-0.45, 0.22]], 0.28, 0.02)} position={[0, 0.45, 0]} color="#5d636b" ink="set" />
  </G>
);

export const GearMachine: React.FC<At> = (p) => {
  const { pal } = useSet();
  return (
    <G {...p}>
      <Part geometry={roundedBox(1.6, 1.0, 0.8, 0.06)} position={[0, 0.5, 0]} color={pal.wood} ink="set" />
      {/* gears face the camera (the prop is modelled sideways for hands) */}
      <group position={[-0.25, 1.15, 0.2]} rotation={[0, -Math.PI / 2, 0]} scale={4}>
        <Prop type="gears" />
      </group>
    </G>
  );
};

export const Statue: React.FC<At> = (p) => {
  const { pal } = useSet();
  return (
    <G {...p}>
      <Part geometry={roundedBox(0.9, 0.9, 0.9, 0.06)} position={[0, 0.45, 0]} color={pal.stone[1]} ink="set" />
      <Part geometry={lathe("statue-body", [[0, 0], [0.3, 0], [0.26, 0.6], [0.18, 0.95], [0, 1.0]], 20)} position={[0, 0.9, 0]} color={pal.stone[0]} ink="set" />
      <Part geo={Sphere(18)} position={[0, 2.15, 0]} scale={0.28} color={pal.stone[0]} ink="set" />
    </G>
  );
};

export const Car: React.FC<At & { color?: string }> = ({ color = "#e8403a", ...p }) => (
  <G {...p}>
    <Part geometry={roundedBox(0.9, 0.38, 1.7, 0.14)} position={[0, 0.36, 0]} color={color} ink="set" />
    <Part geometry={roundedBox(0.8, 0.34, 0.9, 0.12)} position={[0, 0.68, -0.1]} color="#bfe6f7" ink="set" />
    {[
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ].map(([sx, sz], i) => (
      <Part key={i} geo={<cylinderGeometry args={[0.18, 0.18, 0.12, 14]} />} position={[sx * 0.45, 0.18, sz * 0.55]} rotation={[0, 0, Math.PI / 2]} color="#2a2a30" ink="set" />
    ))}
  </G>
);

export const Bench: React.FC<At> = (p) => {
  const { pal } = useSet();
  return (
    <G {...p}>
      <Part geometry={roundedBox(1.5, 0.08, 0.45, 0.02)} position={[0, 0.45, 0]} color={pal.wood} ink="set" />
      <Part geometry={roundedBox(1.5, 0.35, 0.06, 0.02)} position={[0, 0.7, -0.2]} color={pal.wood} ink="set" />
      {[-1, 1].map((s) => (
        <Part key={s} geometry={roundedBox(0.08, 0.45, 0.4, 0.02)} position={[s * 0.65, 0.22, 0]} color="#3a3f4a" ink={false} />
      ))}
    </G>
  );
};

export const Candle: React.FC<At> = (p) => (
  <G {...p}>
    <Part geo={<cylinderGeometry args={[0.05, 0.05, 0.22, 10]} />} position={[0, 0.11, 0]} color="#f4ede0" ink="prop" />
    <group position={[0, 0.22, 0]} scale={0.35}>
      <Flame />
    </group>
  </G>
);

export const Market: React.FC<At & { color?: string }> = ({ color = "#c0392b", ...p }) => {
  const { pal } = useSet();
  return (
    <G {...p}>
      <Table w={1.6} d={0.8} h={0.8} />
      {[-1, 1].map((s) => (
        <Part key={s} geometry={roundedBox(0.08, 1.6, 0.08, 0.02)} position={[s * 0.75, 0.8, -0.35]} color={pal.wood} ink="set" />
      ))}
      <Part geometry={extruded("awning", [[-0.95, 0], [0.95, 0], [0.95, 0.1], [-0.95, 0.35]], 1.0, 0.02)} position={[0, 1.55, 0]} rotation={[0, Math.PI / 2, 0]} color={color} ink="set" />
      {[-0.5, -0.15, 0.2, 0.5].map((x, i) => (
        <Part key={x} geo={Sphere(10)} position={[x, 0.95, 0.1]} scale={0.12} color={["#e8403a", "#f2b134", "#7fb069", "#e8803a"][i]} ink={false} />
      ))}
    </G>
  );
};

// ---------------------------------------------------------------------------
// Tropical / island dressing (generic Southeast Asian & Pacific: stilt huts, outriggers)
// ---------------------------------------------------------------------------
/** Stilt hut with woven walls and a steep thatched roof (generic island dwelling). */
export const StiltHut: React.FC<At & { w?: number; d?: number }> = ({ w = 1.7, d = 1.4, ...p }) => {
  const { night } = useSet();
  const stilt = 0.55;
  const wallH = 0.85;
  return (
    <G {...p}>
      {[
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
      ].map(([sx, sz], i) => (
        <Part key={i} geo={<cylinderGeometry args={[0.05, 0.06, stilt + 0.1, 8]} />} position={[sx * (w / 2 - 0.1), stilt / 2, sz * (d / 2 - 0.1)]} color="#7a5a3a" ink="set" />
      ))}
      <Part geometry={roundedBox(w + 0.15, 0.08, d + 0.15, 0.02)} position={[0, stilt, 0]} color="#a07a4e" ink="set" />
      <Part geometry={roundedBox(w, wallH, d, 0.04)} position={[0, stilt + wallH / 2 + 0.04, 0]} color="#d8bf8a" ink="set" />
      {/* woven bands */}
      {[0.2, 0.45, 0.7].map((y) => (
        <Part key={y} geometry={roundedBox(w + 0.01, 0.025, d + 0.01, 0.01)} position={[0, stilt + y, 0]} color="#b89a62" ink={false} />
      ))}
      {/* steep thatch roof */}
      <Part
        geometry={extruded(`thatch-${w}-${d}`, [[-w / 2 - 0.32, 0], [w / 2 + 0.32, 0], [0, w * 0.62]], d + 0.45, 0.04)}
        position={[0, stilt + wallH + 0.02, 0]}
        color="#b8955a"
        ink="set"
      />
      <Part geometry={roundedBox(w * 0.12, 0.08, d + 0.5, 0.03)} position={[0, stilt + wallH + w * 0.6, 0]} color="#8a6a3e" ink={false} />
      {/* doorway + ladder */}
      <Part geometry={roundedBox(0.34, 0.52, 0.04, 0.03)} position={[0, stilt + 0.32, d / 2 + 0.01]} color={night ? "#ffcf7a" : "#4a3326"} emissive={night ? "#ffb84a" : undefined} emissiveIntensity={night ? 0.7 : 0} ink={false} rim={0} />
      <group position={[0, stilt / 2, d / 2 + 0.25]} rotation={[-0.35, 0, 0]}>
        {[-1, 1].map((s) => (
          <Part key={s} geometry={roundedBox(0.04, stilt + 0.25, 0.04, 0.01)} position={[s * 0.15, 0, 0]} color="#7a5a3a" ink={false} />
        ))}
        {[-0.18, 0, 0.18].map((y) => (
          <Part key={y} geometry={roundedBox(0.32, 0.03, 0.04, 0.01)} position={[0, y, 0]} color="#7a5a3a" ink={false} />
        ))}
      </group>
    </G>
  );
};

/** Outrigger canoe (bangka-style, generic) pulled up on the shore or afloat. */
export const Outrigger: React.FC<At & { color?: string }> = ({ color = "#9a6a45", ...p }) => (
  <G {...p}>
    <Part geometry={lathe("canoe-hull", [[0, -0.12], [0.16, -0.1], [0.2, 0.02], [0.18, 0.1], [0, 0.1]], 16)} position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 6.5, 0.8]} color={color} ink="set" />
    {[-0.45, 0.45].map((z) => (
      <Part key={z} geo={<cylinderGeometry args={[0.025, 0.025, 1.3, 8]} />} position={[0.55, 0.22, z]} rotation={[0, 0, Math.PI / 2]} color="#7a5a3a" ink={false} />
    ))}
    <Part geo={<capsuleGeometry args={[0.06, 1.3, 4, 10]} />} position={[1.15, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} color="#c9a96b" ink="set" />
  </G>
);

// ---------------------------------------------------------------------------
// Sign board with custom text (Latin inscriptions, shop signs, neon) — canvas-textured, cached per text.
// ---------------------------------------------------------------------------
export const Sign: React.FC<At & { text: string; style?: "stone" | "neon" | "wood"; w?: number; h?: number; posts?: boolean; color?: string; /** Post height (default 1). */ height?: number }> = ({
  text,
  height = 1,
  style = "stone",
  w = 1.8,
  h = 0.55,
  posts = true,
  color,
  ...p
}) => {
  const { night } = useSet();
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 768;
    c.height = Math.round((768 * h) / w);
    const ctx = c.getContext("2d")!;
    const bg = style === "stone" ? "#e9dcc0" : style === "wood" ? "#8a5a3b" : "#1b1430";
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const size = Math.min(c.height * 0.62, (c.width * 1.5) / Math.max(4, text.length));
    ctx.font = `${style === "neon" ? 700 : 600} ${size}px ${style === "stone" ? "Georgia, 'Times New Roman', serif" : "Helvetica, Arial, sans-serif"}`;
    if (style === "neon") {
      const glow = color ?? "#ff5ad8";
      ctx.shadowColor = glow;
      ctx.shadowBlur = 28;
      ctx.fillStyle = "#fff4fb";
      ctx.fillText(text, c.width / 2, c.height / 2 + 4);
      ctx.shadowBlur = 12;
      ctx.fillText(text, c.width / 2, c.height / 2 + 4);
      ctx.strokeStyle = glow;
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, c.width - 20, c.height - 20);
    } else {
      // carved: dark inset letters with a light bevel
      ctx.fillStyle = style === "stone" ? "#ffffff" : "#b58456";
      ctx.fillText(text, c.width / 2 + 2, c.height / 2 + 6);
      ctx.fillStyle = style === "stone" ? "#5a4636" : "#3a2418";
      ctx.fillText(text, c.width / 2, c.height / 2 + 4);
      ctx.strokeStyle = style === "stone" ? "#b89f78" : "#5a3d28";
      ctx.lineWidth = 8;
      ctx.strokeRect(12, 12, c.width - 24, c.height - 24);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [text, style, w, h, color]);
  const lift = posts ? height : 0;
  const glowing = style === "neon";
  return (
    <G {...p}>
      {posts
        ? [-1, 1].map((s) => <Part key={s} geometry={roundedBox(0.08, lift + h / 2, 0.08, 0.02)} position={[s * (w / 2 - 0.12), (lift + h / 2) / 2, -0.04]} color={style === "neon" ? "#3a3f4a" : "#6b4a32"} ink="set" />)
        : null}
      <mesh position={[0, lift + h / 2, 0]} castShadow>
        <boxGeometry args={[w + 0.08, h + 0.08, 0.06]} />
        <ToonMaterial color={style === "neon" ? "#2a2236" : style === "wood" ? "#5a3d28" : "#c9b48e"} />
      </mesh>
      <mesh position={[0, lift + h / 2, 0.032]}>
        <planeGeometry args={[w, h]} />
        {glowing ? <meshBasicMaterial map={tex} toneMapped={false} /> : <ToonMaterial color="#ffffff" map={tex} rim={0} />}
      </mesh>
      {glowing && night ? <pointLight position={[0, lift + h / 2, 0.5]} intensity={3} distance={4} color={color ?? "#ff5ad8"} /> : null}
    </G>
  );
};

/** Hero's aeolipile as a set piece (put it on a table: at = table top). */
export const Aeolipile: React.FC<At> = (p) => (
  <G {...p}>
    <Prop type="aeolipile" />
  </G>
);

/** Brick factory: sawtooth roof, two chimneys puffing smoke (frame-driven), lit windows at night. */
export const Factory: React.FC<At & { w?: number; d?: number; h?: number; color?: string; smoke?: boolean }> = ({ w = 2.6, d = 1.6, h = 1.3, color = "#9a4e3c", smoke = true, ...p }) => {
  const frame = useCurrentFrame();
  const { night } = useSet();
  const teeth = 3;
  const win = night ? "#ffd27a" : "#3b4a6a";
  const chimneys: [number, number][] = [
    [-w * 0.28, 2.1],
    [w * 0.12, 1.7],
  ];
  return (
    <G {...p}>
      <Part geometry={roundedBox(w, h, d, 0.05)} position={[0, h / 2, 0]} color={color} ink="set" />
      {Array.from({ length: teeth }, (_, i) => (
        <Part
          key={i}
          geometry={extruded(`saw-${w}-${teeth}`, [[0, 0], [w / teeth, 0], [w / teeth, 0.42]], d, 0.02)}
          position={[-w / 2 + (i * w) / teeth, h, 0]}
          color="#5f4a44"
          ink="set"
        />
      ))}
      {[-0.32, 0, 0.32].map((x) => (
        <Part key={x} geometry={roundedBox(0.34, 0.42, 0.05, 0.03)} position={[x * w, h * 0.55, d / 2 + 0.02]} color={win} emissive={night ? "#ffb84a" : undefined} emissiveIntensity={night ? 0.8 : 0} ink={false} rim={0} />
      ))}
      {chimneys.map(([x, ch], k) => (
        <group key={k} position={[x, h, -d * 0.15]}>
          <Part geometry={lathe("chimney", [[0, 0], [0.17, 0], [0.13, 1], [0.16, 1.02], [0.16, 1.1], [0, 1.1]], 16)} scale={[1, ch, 1]} color="#7d3b2e" ink="set" />
          {smoke
            ? Array.from({ length: 6 }, (_, i) => {
                const t = ((frame / 30) * 0.45 + i / 6 + k * 0.37) % 1;
                const r = 0.14 + t * 0.32;
                return (
                  <mesh key={i} position={[t * 0.55, ch * 1.1 + t * 1.6, Math.sin(i * 2 + k) * 0.08]} scale={r}>
                    <sphereGeometry args={[1, 12, 9]} />
                    <ToonMaterial color={night ? "#5d5a68" : "#b9b4ae"} ramp="soft" rim={0.2} transparent opacity={0.75 * (1 - t) ** 0.7} depthWrite={false} />
                  </mesh>
                );
              })
            : null}
        </group>
      ))}
    </G>
  );
};

/** Name → component registry so episodes can place any dressing item by name ("dressing" in scenes.json). */
export const DRESSING_ITEMS = {
  Column,
  Statue,
  House,
  Temple,
  Tower,
  Wall,
  Skyscraper,
  Cypress,
  RoundTree,
  PineTree,
  PalmTree,
  Bush,
  Fern,
  Rock,
  Table,
  Throne,
  Carpet,
  Banner,
  Bookshelf,
  Barrel,
  Crate,
  TorchStand,
  StreetLamp,
  Tent,
  Fence,
  Well,
  Cannon,
  Anvil,
  GearMachine,
  Car,
  Bench,
  Candle,
  Market,
  StiltHut,
  Outrigger,
  Sign,
  Aeolipile,
  Factory,
} as const;
export type DressingItem = keyof typeof DRESSING_ITEMS;
