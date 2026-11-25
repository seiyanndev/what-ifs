import * as THREE from "three";
import { RoundedBoxGeometry } from "three-stdlib";

// Shared, cached geometries. Smooth normals everywhere so <Ink> outlines stay clean.
const cache = new Map<string, THREE.BufferGeometry>();

/** Lathe profiles must run bottom → top for outward-facing surfaces; fix top-down profiles. */
const upward = (profile: [number, number][]) =>
  profile.length > 1 && profile[0][1] > profile[profile.length - 1][1] ? [...profile].reverse() : profile;
const cached = <T extends THREE.BufferGeometry>(key: string, make: () => T): T => {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key) as T;
};

export const roundedBox = (w: number, h: number, d: number, radius = 0.08, segments = 3) =>
  cached(`rb:${w}:${h}:${d}:${radius}:${segments}`, () => new RoundedBoxGeometry(w, h, d, segments, radius));

/** Lathe from a 2D profile [radius, y][] — columns, vases, fountains, hats. */
export const lathe = (key: string, profile: [number, number][], segments = 32, phiStart = 0, phiLength = Math.PI * 2) =>
  cached(`lathe:${key}:${phiStart}:${phiLength}`, () => {
    const g = new THREE.LatheGeometry(
      upward(profile).map(([x, y]) => new THREE.Vector2(x, y)),
      segments,
      phiStart,
      phiLength,
    );
    g.computeVertexNormals();
    return g;
  });

/**
 * Lathe whose vertices are then warped by angle — for lobed or curled shapes
 * (tricorne brims, morion brims, flared armour). theta = 0 faces +Z (front).
 */
export const warpedLathe = (
  key: string,
  profile: [number, number][],
  warp: (x: number, y: number, z: number, theta: number) => [number, number, number],
  segments = 48,
) =>
  cached(`wlathe:${key}`, () => {
    const g = new THREE.LatheGeometry(
      upward(profile).map(([x, y]) => new THREE.Vector2(x, y)),
      segments,
    );
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const theta = Math.atan2(x, z);
      const [nx, ny, nz] = warp(x, y, z, theta);
      pos.setXYZ(i, nx, ny, nz);
    }
    g.computeVertexNormals();
    return g;
  });

/** Extruded 2D shape with soft bevels (flat props: blades, plates, crests). */
export const extruded = (key: string, points: [number, number][], depth: number, bevel = 0.012) =>
  cached(`extrude:${key}`, () => {
    const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      curveSegments: 12,
    });
    g.translate(0, 0, -depth / 2);
    g.computeVertexNormals();
    return g;
  });
