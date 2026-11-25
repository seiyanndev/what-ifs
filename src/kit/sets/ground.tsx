import { useLayoutEffect, useMemo, useRef } from "react";
import { random, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { Ink, lathe, roundedBox, ToonMaterial } from "../look";
import { useSet } from "./context";

// Diorama bases and ground surfaces. Every outdoor set sits on a round toy base (radius ≈ 4.5);
// interiors sit on a square "dollhouse" block with two cut-away walls.

export const BASE_R = 4.5;

/** Seeded instanced tiles / planks / tufts inside a disc or rectangle. */
const Scatter: React.FC<{
  geometry: THREE.BufferGeometry;
  items: { x: number; z: number; y?: number; ry?: number; s?: number; c: string }[];
  rim?: number;
}> = ({ geometry, items, rim = 0.3 }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    items.forEach((t, i) => {
      o.position.set(t.x, t.y ?? 0, t.z);
      o.rotation.set(0, t.ry ?? 0, 0);
      o.scale.setScalar(t.s ?? 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, col.set(t.c));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, items.length]} receiveShadow castShadow>
      <ToonMaterial color="#ffffff" rim={rim} />
    </instancedMesh>
  );
};

export type GroundKind = "paving" | "grass" | "sand" | "dirt" | "planks" | "asphalt";

/** Round diorama base with a chosen top surface. */
export const DioramaBase: React.FC<{ ground?: GroundKind; radius?: number; rimColor?: string; seed?: string }> = ({ ground = "paving", radius = BASE_R, rimColor, seed = "g" }) => {
  const { pal } = useSet();
  const top = {
    paving: pal.foliage[0],
    grass: pal.foliage[0],
    sand: "#ead7a4",
    dirt: "#b08a5a",
    planks: pal.wood,
    asphalt: "#5a5f6a",
  }[ground];
  const items = useMemo(() => {
    const out: { x: number; z: number; y?: number; ry?: number; s?: number; c: string }[] = [];
    if (ground === "paving") {
      const step = 0.52;
      for (let x = -radius; x <= radius; x += step)
        for (let z = -radius; z <= radius; z += step) {
          if (Math.hypot(x, z) > radius - 0.25) continue;
          const k = `${seed}${x.toFixed(2)}:${z.toFixed(2)}`;
          out.push({
            x: x + (random(`px${k}`) - 0.5) * 0.04,
            z: z + (random(`pz${k}`) - 0.5) * 0.04,
            y: 0.07 + (random(`py${k}`) - 0.5) * 0.03,
            ry: (random(`pr${k}`) - 0.5) * 0.08,
            c: random(`pc${k}`) < 0.55 ? pal.stone[0] : random(`pd${k}`) < 0.7 ? pal.stone[1] : pal.stone[2],
          });
        }
    }
    if (ground === "grass" || ground === "dirt" || ground === "sand") {
      const n = ground === "grass" ? 110 : 40;
      for (let i = 0; i < n; i++) {
        const a = random(`${seed}ta${i}`) * Math.PI * 2;
        const r = Math.sqrt(random(`${seed}tr${i}`)) * (radius - 0.3);
        out.push({
          x: Math.cos(a) * r,
          z: Math.sin(a) * r,
          y: 0.02,
          ry: random(`${seed}ty${i}`) * 6,
          s: 0.6 + random(`${seed}ts${i}`) * 0.8,
          c: ground === "grass" ? (random(`${seed}tc${i}`) < 0.5 ? pal.foliage[0] : pal.foliage[1]) : ground === "sand" ? "#dcc48c" : "#9a7650",
        });
      }
    }
    return out;
  }, [ground, radius, seed, pal]);
  const tile = ground === "paving" ? roundedBox(0.48, 0.14, 0.48, 0.05) : ground === "grass" ? new THREE.ConeGeometry(0.06, 0.22, 5) : roundedBox(0.14, 0.05, 0.1, 0.02);
  return (
    <group>
      <mesh geometry={lathe(`base-${radius}`, [[0, -0.9], [radius + 0.05, -0.9], [radius + 0.2, -0.75], [radius + 0.2, -0.12], [radius + 0.05, 0], [0, 0]], 64)} receiveShadow>
        <ToonMaterial color={rimColor ?? pal.stone[2]} rim={0.4} />
        <Ink weight="set" />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[radius, 64]} />
        <ToonMaterial color={top} rim={0} />
      </mesh>
      {items.length ? <Scatter geometry={tile} items={items} /> : null}
      {ground === "planks"
        ? Array.from({ length: Math.floor((radius * 2) / 0.42) }, (_, i) => {
            const x = -radius + 0.21 + i * 0.42;
            const len = 2 * Math.sqrt(Math.max(0, (radius - 0.2) ** 2 - x * x));
            return len < 0.3 ? null : (
              <mesh key={i} geometry={roundedBox(0.38, 0.1, len, 0.03)} position={[x, 0.06, 0]} receiveShadow>
                <ToonMaterial color={random(`${seed}pl${i}`) < 0.5 ? pal.wood : "#9a6a45"} rim={0.3} />
              </mesh>
            );
          })
        : null}
      {ground === "asphalt" ? <RoadMarks radius={radius} /> : null}
    </group>
  );
};

const RoadMarks: React.FC<{ radius: number }> = ({ radius }) => (
  <group position={[0, 0.012, 0]}>
    {Array.from({ length: 9 }, (_, i) => (
      <mesh key={i} position={[-radius + 0.6 + i * 0.95, 0, 0.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, 0.08]} />
        <meshBasicMaterial color="#f2e8c8" />
      </mesh>
    ))}
    {[-1, 1].map((s) => (
      <mesh key={s} position={[0, 0.03, 0.9 + s * 1.25]} receiveShadow>
        <boxGeometry args={[radius * 1.9, 0.08, 0.5]} />
        <ToonMaterial color="#c7cfd8" />
      </mesh>
    ))}
  </group>
);

/** Animated toon water: a disc/rectangle with drifting ripple rings. */
export const Water: React.FC<{ width: number; depth: number; position?: [number, number, number]; color?: string; round?: boolean }> = ({
  width,
  depth,
  position = [0, 0, 0],
  color = "#5fb3d1",
  round = false,
}) => {
  const frame = useCurrentFrame();
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        {round ? <circleGeometry args={[width / 2, 48]} /> : <planeGeometry args={[width, depth]} />}
        <ToonMaterial color={color} emissive="#2f7fa8" emissiveIntensity={0.18 + 0.03 * Math.sin(frame / 9)} rim={0} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => {
        const t = ((frame / 70 + random(`rp${i}`)) % 1 + 1) % 1;
        const x = (random(`rx${i}`) - 0.5) * width * 0.8;
        const z = (random(`rz${i}`) - 0.5) * depth * 0.8;
        return (
          <mesh key={i} position={[x, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]} scale={0.2 + t * 0.6}>
            <ringGeometry args={[0.9, 1, 32]} />
            <meshBasicMaterial color="#e6f6fb" transparent opacity={(1 - t) * 0.6} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Square dollhouse base with back + left walls (interiors). Floor top at y = 0. */
export const RoomBase: React.FC<{ width?: number; depth?: number; floor?: string; wall?: string; wallHeight?: number; window?: boolean; trim?: string }> = ({
  width = 8,
  depth = 7,
  floor,
  wall,
  wallHeight = 3.4,
  window: win = true,
  trim,
}) => {
  const { pal, night } = useSet();
  const f = floor ?? pal.wood;
  const wl = wall ?? pal.stone[0];
  return (
    <group>
      {/* warm interior lamp light (strong at night, gentle by day) */}
      <pointLight position={[0.5, 2.6, 0.8]} intensity={night ? 14 : 3} distance={12} decay={1.6} color="#ffbf73" />
      <mesh geometry={roundedBox(width + 0.4, 0.9, depth + 0.4, 0.12)} position={[0, -0.45, 0]} receiveShadow>
        <ToonMaterial color={pal.stone[2]} />
        <Ink weight="set" />
      </mesh>
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <ToonMaterial color={f} rim={0} />
      </mesh>
      {/* floor boards */}
      {Array.from({ length: Math.floor(width / 0.5) }, (_, i) => (
        <mesh key={i} position={[-width / 2 + 0.25 + i * 0.5, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.02, depth]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.12} />
        </mesh>
      ))}
      <mesh geometry={roundedBox(width + 0.4, wallHeight, 0.3, 0.06)} position={[0, wallHeight / 2, -depth / 2 - 0.05]} castShadow receiveShadow>
        <ToonMaterial color={wl} />
        <Ink weight="set" />
      </mesh>
      <mesh geometry={roundedBox(0.3, wallHeight, depth + 0.1, 0.06)} position={[-width / 2 - 0.05, wallHeight / 2, 0]} castShadow receiveShadow>
        <ToonMaterial color={wl} />
        <Ink weight="set" />
      </mesh>
      {trim ? (
        <mesh geometry={roundedBox(width + 0.42, 0.16, 0.34, 0.04)} position={[0, wallHeight - 0.3, -depth / 2 - 0.03]}>
          <ToonMaterial color={trim} />
        </mesh>
      ) : null}
      {win ? (
        <group position={[width * 0.22, wallHeight * 0.6, -depth / 2 + 0.11]}>
          <mesh geometry={roundedBox(1.1, 1.3, 0.06, 0.05)}>
            <ToonMaterial color={night ? "#2a3570" : "#bfe6f7"} emissive={night ? "#3a4a9a" : "#9fd8f0"} emissiveIntensity={0.4} rim={0} />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <boxGeometry args={[0.06, 1.3, 0.04]} />
            <ToonMaterial color={pal.wood} />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <boxGeometry args={[1.1, 0.06, 0.04]} />
            <ToonMaterial color={pal.wood} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
};
