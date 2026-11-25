import * as THREE from "three";
import { RoundedBoxGeometry } from "three-stdlib";

// Shared, cached geometries. Smooth normals everywhere so <Ink> outlines stay clean.
const cache = new Map<string, THREE.BufferGeometry>();
const cached = <T extends THREE.BufferGeometry>(key: string, make: () => T): T => {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key) as T;
};

export const roundedBox = (w: number, h: number, d: number, radius = 0.08, segments = 3) =>
  cached(`rb:${w}:${h}:${d}:${radius}:${segments}`, () => new RoundedBoxGeometry(w, h, d, segments, radius));

/** Lathe from a 2D profile [radius, y][] — columns, vases, fountains, hats. */
export const lathe = (key: string, profile: [number, number][], segments = 32) =>
  cached(`lathe:${key}`, () => {
    const g = new THREE.LatheGeometry(
      profile.map(([x, y]) => new THREE.Vector2(x, y)),
      segments,
    );
    g.computeVertexNormals();
    return g;
  });
