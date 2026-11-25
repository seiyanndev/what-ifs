import type * as THREE from "three";
import { Ink, ToonMaterial } from "../../look";
import type { Vec3 } from "../rig";

/** Natural + historical hair colours. */
export const HAIR_COLORS = {
  black: "#1f1a1e",
  darkBrown: "#3b2418",
  brown: "#6b4430",
  auburn: "#8a3d22",
  blonde: "#d9b465",
  red: "#b5532a",
  grey: "#9a9a9a",
  white: "#ecebe6",
} as const;

export const METAL = {
  steel: "#b9c2cc",
  darkSteel: "#7d8792",
  gold: "#d6a444",
  bronze: "#b8864b",
  iron: "#5d636b",
} as const;

type PartProps = {
  /** Geometry element, e.g. <sphereGeometry args={[1, 24, 16]} />. Or pass `geometry`. */
  geo?: React.ReactNode;
  geometry?: THREE.BufferGeometry;
  color: string;
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3 | number;
  /** Outline weight, or false for none (small details, flat decals). */
  ink?: "character" | "prop" | "set" | number | false;
  ramp?: "default" | "soft";
  rim?: number;
  emissive?: string;
  emissiveIntensity?: number;
  side?: THREE.Side;
  children?: React.ReactNode;
};

/** One toon-shaded, outlined mesh. The building block of every costume part and prop. */
export const Part: React.FC<PartProps> = ({
  geo,
  geometry,
  color,
  position,
  rotation,
  scale,
  ink = "character",
  ramp,
  rim,
  emissive,
  emissiveIntensity,
  side,
  children,
}) => (
  <mesh geometry={geometry} position={position} rotation={rotation} scale={scale} castShadow receiveShadow>
    {geo}
    <ToonMaterial color={color} ramp={ramp} rim={rim} emissive={emissive} emissiveIntensity={emissiveIntensity} side={side} />
    {ink !== false ? <Ink weight={ink} /> : null}
    {children}
  </mesh>
);

export const Sphere = (segs = 24) => <sphereGeometry args={[1, segs, Math.round(segs * 0.66)]} />;
