import { useLayoutEffect, useMemo } from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import { Ink, ToonMaterial } from "../../look";
import { useBody } from "../Body";
import { Collar } from "./Outfits";

export type CapeSpec = {
  color: string;
  /** Inside colour (visible when it flares). */
  lining?: string;
  /** 0.3 = short mantle, 1 = to the ankles. */
  length?: number;
  collar?: "ermine";
  /** 0 = hanging, 1 = streaming behind (running / wind). Animate it from the action. */
  lift?: number;
  /** Wind strength for the idle flutter. */
  wind?: number;
};

/**
 * Cloth cape on the chest slot. Frame-driven "spring" sway: the bottom lags and ripples,
 * vertices are recomputed every frame (deterministic, no simulation state).
 */
export const Cape: React.FC<CapeSpec> = ({ color, lining, length = 1, collar, lift = 0, wind = 1 }) => {
  const { dims, shape } = useBody();
  const frame = useCurrentFrame();
  const w = shape.width;
  const topY = dims.shoulderY - 0.22 * shape.height + 0.05; // chest-local shoulder line
  const shoulderToGround = dims.hipsY + dims.spineY + 0.22 * shape.height + topY;
  const L = Math.max(0.3, (shoulderToGround - 0.1) * length);
  const W = 0.56 * w * shape.shoulders;

  const { geometry, base } = useMemo(() => {
    const g = new THREE.BoxGeometry(W, L, 0.025, 8, 18, 1);
    g.translate(0, -L / 2, 0);
    return { geometry: g, base: Float32Array.from(g.attributes.position.array as Float32Array) };
  }, [W, L]);

  useLayoutEffect(() => {
    const pos = geometry.attributes.position;
    const clearance = 0.2 * w; // keep clear of the body / robe skirt
    for (let i = 0; i < pos.count; i++) {
      const x0 = base[i * 3];
      const y0 = base[i * 3 + 1];
      const z0 = base[i * 3 + 2];
      const v = Math.min(1, -y0 / L); // 0 at the shoulders → 1 at the hem
      const u = x0 / (W / 2); // -1..1 across
      const flutter = wind * v;
      const x = x0 * (1 + 0.38 * v) + Math.sin(frame * 0.07 + v * 2.1 + u * 1.3) * 0.02 * flutter;
      const zWave = Math.sin(frame * 0.11 + v * 3.2 + u * 0.8) * 0.035 * flutter;
      const wrap = u * u * 0.07 * (1 - v * 0.5); // edges curl forward around the body
      const back = -clearance * Math.pow(v, 0.8) - 0.04 * v - lift * 0.55 * v * v;
      const y = y0 + lift * 0.3 * v * v;
      pos.setXYZ(i, x, y, z0 + back + wrap + zWave);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <group position={[0, topY, -0.27 * w]}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <ToonMaterial color={color} side={THREE.FrontSide} />
        <Ink weight="character" />
      </mesh>
      {lining ? (
        <mesh geometry={geometry} position={[0, 0, 0.004]}>
          <ToonMaterial color={lining} side={THREE.BackSide} rim={0} />
        </mesh>
      ) : null}
      {collar === "ermine" ? (
        <group position={[0, -topY, 0.27 * w]}>
          <Collar color={lining ?? "#f6f2ea"} kind="ermine" />
        </group>
      ) : null}
    </group>
  );
};
