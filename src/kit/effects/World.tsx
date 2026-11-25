import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { Prop } from "../characters/Costume";
import { Ink, ToonMaterial } from "../look";
import { ToyShip } from "../sets/geo";

// 3D effects that live inside a scene (put them in a <SetScene> / <Stage>), plus their 2D companions.
// Everything is a pure function of the frame (seeded randomness, closed-form motion).

type V3 = [number, number, number];

// ---------------------------------------------------------------------------
// FIRE
// ---------------------------------------------------------------------------
export const Fire: React.FC<{ position?: V3; scale?: number; light?: boolean; seed?: string }> = ({ position = [0, 0, 0], scale = 1, light = true, seed = "fire" }) => {
  const frame = useCurrentFrame();
  const f = (k: number) => 1 + 0.16 * Math.sin(frame * 0.8 + k * 1.7) + 0.08 * Math.sin(frame * 2.1 + k);
  const flames = [
    [0, 0, 0, 1],
    [0.22, 0, 0.1, 0.7],
    [-0.2, 0, 0.08, 0.75],
    [0.08, 0, -0.2, 0.65],
    [-0.1, 0, -0.15, 0.55],
  ];
  return (
    <group position={position} scale={scale}>
      {light ? <pointLight position={[0, 0.8, 0]} intensity={6 + 2 * Math.sin(frame * 0.9)} distance={6} decay={1.5} color="#ff9a3a" /> : null}
      {/* logs */}
      {[0.5, -0.6, 1.6].map((r, i) => (
        <mesh key={i} position={[0, 0.07, 0]} rotation={[0, r, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[0.07, 0.55, 4, 10]} />
          <ToonMaterial color="#5a3d28" />
          <Ink weight="prop" />
        </mesh>
      ))}
      {flames.map(([x, , z, s], i) => (
        <group key={i} position={[x, 0.1, z]} scale={[s * f(i), s * f(i + 3) * 1.15, s * f(i)]} rotation={[0, 0, Math.sin(frame * 0.5 + i) * 0.12]}>
          <mesh position={[0, 0.35, 0]}>
            <coneGeometry args={[0.22, 0.75, 14]} />
            <ToonMaterial color="#ff8a2a" emissive="#ff5a00" emissiveIntensity={0.95} rim={0} />
          </mesh>
          <mesh position={[0, 0.27, 0.02]}>
            <coneGeometry args={[0.13, 0.48, 12]} />
            <ToonMaterial color="#ffe27a" emissive="#ffcf3a" emissiveIntensity={1} rim={0} />
          </mesh>
        </group>
      ))}
      {/* embers */}
      {Array.from({ length: 12 }, (_, i) => {
        const t = ((frame / 40 + random(`${seed}-e${i}`)) % 1 + 1) % 1;
        const a = random(`${seed}-ea${i}`) * Math.PI * 2;
        return (
          <mesh key={`e${i}`} position={[Math.cos(a) * 0.3 * t + Math.sin(frame * 0.2 + i) * 0.08, 0.3 + t * 1.8, Math.sin(a) * 0.3 * t]} scale={0.035 * (1 - t)}>
            <sphereGeometry args={[1, 6, 4]} />
            <meshBasicMaterial color={i % 2 ? "#ffcf3a" : "#ff6a1a"} />
          </mesh>
        );
      })}
      {/* smoke */}
      {Array.from({ length: 4 }, (_, i) => {
        const t = ((frame / 70 + i / 4) % 1 + 1) % 1;
        return (
          <mesh key={`s${i}`} position={[Math.sin(i * 2.3 + t * 2) * 0.25, 1.1 + t * 1.8, 0]} scale={0.18 + t * 0.4}>
            <sphereGeometry args={[1, 12, 8]} />
            <ToonMaterial color="#8a8088" ramp="soft" rim={0} transparent opacity={0.55 * (1 - t)} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

// ---------------------------------------------------------------------------
// DUST & SPARKS bursts
// ---------------------------------------------------------------------------
export const Burst: React.FC<{ position?: V3; at: number; kind?: "dust" | "sparks"; count?: number; power?: number; seed?: string; color?: string }> = ({
  position = [0, 0, 0],
  at,
  kind = "dust",
  count = 24,
  power = 1,
  seed = "burst",
  color,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame - at) / fps;
  const life = kind === "dust" ? 1.4 : 0.9;
  if (t < 0 || t > life) return null;
  return (
    <group position={position}>
      {Array.from({ length: count }, (_, i) => {
        const a = random(`${seed}-a${i}`) * Math.PI * 2;
        const up = kind === "dust" ? 0.15 + random(`${seed}-u${i}`) * 0.5 : 0.5 + random(`${seed}-u${i}`) * 0.9;
        const sp = power * (kind === "dust" ? 1.6 + random(`${seed}-s${i}`) * 1.4 : 3 + random(`${seed}-s${i}`) * 3);
        const v = new THREE.Vector3(Math.cos(a) * (1 - up * 0.5), up, Math.sin(a) * (1 - up * 0.5)).multiplyScalar(sp);
        const drag = kind === "dust" ? Math.exp(-t * 2.2) : 1;
        const g = kind === "dust" ? -0.4 : -9;
        const p = v.clone().multiplyScalar(kind === "dust" ? (1 - drag) / 2.2 : t);
        p.y += 0.5 * g * t * t;
        if (p.y < -0.05 && kind === "sparks") p.y = -0.05;
        const k = t / life;
        if (kind === "dust") {
          return (
            <mesh key={i} position={p} scale={(0.18 + k * 0.5) * power}>
              <sphereGeometry args={[1, 12, 8]} />
              <ToonMaterial color={color ?? "#d9c9a8"} ramp="soft" rim={0} transparent opacity={0.8 * (1 - k)} depthWrite={false} />
            </mesh>
          );
        }
        const vel = v.clone().add(new THREE.Vector3(0, g * t, 0)).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vel);
        return (
          <mesh key={i} position={p} quaternion={q} scale={[0.025, 0.14 * (1 - k), 0.025]}>
            <capsuleGeometry args={[1, 1, 3, 6]} />
            <meshBasicMaterial color={color ?? (i % 2 ? "#ffe27a" : "#ff9a3a")} transparent opacity={1 - k * 0.6} />
          </mesh>
        );
      })}
    </group>
  );
};

// ---------------------------------------------------------------------------
// PLAGUE_FOG (+ PlagueTint overlay)
// ---------------------------------------------------------------------------
export const PlagueFog: React.FC<{ area?: [number, number]; position?: V3; density?: number; color?: string; seed?: string; amount?: number }> = ({
  area = [9, 7],
  position = [0, 0, 0],
  density = 34,
  color = "#a7b98a",
  seed = "fog",
  amount = 1,
}) => {
  const frame = useCurrentFrame();
  return (
    <group position={position}>
      {Array.from({ length: density }, (_, i) => {
        const x0 = (random(`${seed}-x${i}`) - 0.5) * area[0];
        const z0 = (random(`${seed}-z${i}`) - 0.5) * area[1];
        const drift = Math.sin(frame / 60 + i) * 0.4;
        const s = 0.6 + random(`${seed}-s${i}`) * 0.9;
        const breathe = 1 + 0.08 * Math.sin(frame / 25 + i * 1.3);
        return (
          <mesh key={i} position={[x0 + drift, 0.25 + random(`${seed}-y${i}`) * 0.5, z0 + Math.cos(frame / 70 + i) * 0.3]} scale={[s * 1.6 * breathe, s * 0.55, s * breathe]}>
            <sphereGeometry args={[1, 14, 10]} />
            <ToonMaterial color={color} ramp="soft" rim={0.2} transparent opacity={0.28 * amount} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Sickly green vignette that sells the plague mood (2D overlay). */
export const PlagueTint: React.FC<{ amount?: number }> = ({ amount = 1 }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 60% at 50% 50%, transparent 40%, #4d5a2a 140%)", opacity: 0.7 * amount, mixBlendMode: "multiply" }} />
    <AbsoluteFill style={{ backgroundColor: "#9fb27a", opacity: 0.12 * amount, mixBlendMode: "color" }} />
  </AbsoluteFill>
);

// ---------------------------------------------------------------------------
// SHIP_FLEET
// ---------------------------------------------------------------------------
export const ShipFleet: React.FC<{
  count?: number;
  formation?: "v" | "line" | "grid";
  spacing?: number;
  position?: V3;
  /** Heading in degrees (0 = toward camera). */
  heading?: number;
  /** World units per second. */
  speed?: number;
  scale?: number;
  sail?: string;
  flag?: string;
  seed?: string;
}> = ({ count = 9, formation = "v", spacing = 1.4, position = [0, 0, 0], heading = 0, speed = 0.35, scale = 1, sail = "#f6efe0", flag = "#c0392b", seed = "fleet" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const travel = (frame / fps) * speed;
  const h = (heading * Math.PI) / 180;
  const slots: [number, number][] = Array.from({ length: count }, (_, i) => {
    if (formation === "line") return [(i - (count - 1) / 2) * spacing, 0];
    if (formation === "grid") {
      const cols = Math.ceil(Math.sqrt(count));
      return [((i % cols) - (cols - 1) / 2) * spacing, -Math.floor(i / cols) * spacing];
    }
    const k = Math.ceil(i / 2);
    return [(i % 2 ? -1 : 1) * k * spacing * 0.75, -k * spacing * 0.8];
  });
  return (
    <group position={position} rotation={[0, h, 0]}>
      <group position={[0, 0, travel]}>
        {slots.map(([x, z], i) => (
          <group key={i} position={[x + (random(`${seed}-x${i}`) - 0.5) * 0.2, 0, z + (random(`${seed}-z${i}`) - 0.5) * 0.3 + Math.sin(frame / 30 + i) * 0.05]}>
            <ToyShip scale={scale * (i === 0 ? 1.25 : 1)} sail={sail} flag={flag} seed={i * 1.7} />
            {/* wake */}
            <mesh position={[0, 0.02, -0.45 * scale]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.25 * scale, 0.9 * scale]} />
              <meshBasicMaterial color="#e6f6fb" transparent opacity={0.45 + 0.1 * Math.sin(frame / 6 + i)} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Falling scrolls ("history being rewritten")
// ---------------------------------------------------------------------------
export const FallingScrolls: React.FC<{ count?: number; area?: [number, number]; top?: number; bottom?: number; speed?: number; position?: V3; seed?: string }> = ({
  count = 22,
  area = [7, 4],
  top = 7,
  bottom = 0,
  speed = 1.4,
  position = [0, 0, 0],
  seed = "scrolls",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const span = top - bottom;
  return (
    <group position={position}>
      {Array.from({ length: count }, (_, i) => {
        const t = (frame / fps) * speed * (0.8 + random(`${seed}-v${i}`) * 0.5) + random(`${seed}-o${i}`) * span;
        const y = top - (t % span);
        const spin = t * (1.5 + random(`${seed}-r${i}`) * 2);
        return (
          <group
            key={i}
            position={[(random(`${seed}-x${i}`) - 0.5) * area[0] + Math.sin(t * 1.3 + i) * 0.35, y, (random(`${seed}-z${i}`) - 0.5) * area[1]]}
            rotation={[spin, spin * 0.6 + i, Math.sin(t + i) * 0.8]}
            scale={1.6}
          >
            <Prop type="scroll" color={i % 3 === 0 ? "#efe1b8" : undefined} />
          </group>
        );
      })}
    </group>
  );
};

// ---------------------------------------------------------------------------
// ASTEROID with impact (+ ImpactFlash overlay)
// ---------------------------------------------------------------------------
export const Asteroid: React.FC<{ from?: V3; to?: V3; start?: number; impactAt: number; size?: number; seed?: string }> = ({ from = [-9, 14, -12], to = [0, 0, -1], start = 0, impactAt, size = 0.9, seed = "rock" }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [start, impactAt], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tt = t * t; // accelerating
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const pos = a.clone().lerp(b, tt);
  const dir = b.clone().sub(a).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
  const after = frame - impactAt;
  return (
    <group>
      {frame >= start && frame < impactAt ? (
        <group position={pos}>
          <mesh rotation={[frame * 0.15, frame * 0.1, 0]} scale={size} castShadow>
            <dodecahedronGeometry args={[1, 1]} />
            <ToonMaterial color="#6b5a5a" />
            <Ink weight="prop" />
          </mesh>
          {/* fiery trail */}
          <group quaternion={q}>
            <mesh position={[0, size * 1.9, 0]}>
              <coneGeometry args={[size * 0.95, size * 3.6, 16, 1, true]} />
              <ToonMaterial color="#ff8a2a" emissive="#ff5a00" emissiveIntensity={0.9} rim={0} transparent opacity={0.85} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, size * 1.3, 0]}>
              <coneGeometry args={[size * 0.6, size * 2.4, 14, 1, true]} />
              <ToonMaterial color="#ffe27a" emissive="#ffcf3a" emissiveIntensity={1} rim={0} transparent opacity={0.9} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
          </group>
        </group>
      ) : null}
      {after >= 0 && after < 40 ? (
        <group position={to}>
          {/* shockwave ring */}
          <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.5 + after * 0.3}>
            <ringGeometry args={[0.85, 1, 48]} />
            <meshBasicMaterial color="#fff4d6" transparent opacity={Math.max(0, 1 - after / 30)} />
          </mesh>
          {/* fireball */}
          <mesh position={[0, 0.4, 0]} scale={size * (1 + after * 0.12) * Math.max(0, 1 - after / 24)}>
            <sphereGeometry args={[1.4, 20, 14]} />
            <ToonMaterial color="#ffb03a" emissive="#ff7a1a" emissiveIntensity={1} rim={0} />
          </mesh>
          <pointLight position={[0, 1, 0]} intensity={Math.max(0, 30 * (1 - after / 20))} distance={14} color="#ffb05a" />
        </group>
      ) : null}
      <Burst position={to} at={impactAt} kind="dust" count={30} power={1.5} seed={`${seed}-dust`} color="#c9a982" />
      <Burst position={to} at={impactAt} kind="sparks" count={36} power={1.3} seed={`${seed}-sparks`} />
    </group>
  );
};

/** White impact flash (2D overlay) — pair with <Shake impacts={[impactAt]}>. */
export const ImpactFlash: React.FC<{ at: number; color?: string }> = ({ at, color = "#fff7e6" }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at - 1, at, at + 10], [0, 0.95, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return o > 0 ? <AbsoluteFill style={{ backgroundColor: color, opacity: o, pointerEvents: "none" }} /> : null;
};
