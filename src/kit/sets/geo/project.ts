import * as THREE from "three";
import type { LonLat } from "./data";

// One convention everywhere: lon/lat → sphere point matches three's SphereGeometry UVs,
// so the equirectangular canvas texture, markers and routes all line up.

export const lonLatToVec3 = ([lon, lat]: LonLat, r: number): THREE.Vector3 => {
  const phi = ((lon + 180) / 360) * Math.PI * 2;
  const theta = ((90 - lat) / 180) * Math.PI;
  return new THREE.Vector3(-Math.cos(phi) * Math.sin(theta) * r, Math.cos(theta) * r, Math.sin(phi) * Math.sin(theta) * r);
};

/** Globe rotation [x, y, 0] (Euler XYZ) that brings lon/lat to face +Z (the camera). */
export const faceRotation = ([lon, lat]: LonLat): [number, number, number] => {
  const p = lonLatToVec3([lon, 0], 1);
  const yaw = Math.atan2(p.x, p.z);
  return [(lat * Math.PI) / 180, -yaw, 0];
};

/** Great-circle interpolation between two lon/lats (t 0..1) → unit vector. */
export const slerpLonLat = (a: LonLat, b: LonLat, t: number): THREE.Vector3 => {
  const va = lonLatToVec3(a, 1);
  const vb = lonLatToVec3(b, 1);
  const omega = Math.acos(Math.max(-1, Math.min(1, va.dot(vb))));
  if (omega < 1e-6) return va;
  const s = Math.sin(omega);
  return va.multiplyScalar(Math.sin((1 - t) * omega) / s).add(vb.multiplyScalar(Math.sin(t * omega) / s));
};

/** Rectangular lon/lat window for flat maps & detail patches. */
export type GeoBounds = { lon0: number; lon1: number; lat0: number; lat1: number };

/** Bounds centred on a point, sized in degrees of latitude, with a target aspect (w/h on the map). */
export const boundsAround = ([lon, lat]: LonLat, latSpan: number, aspect = 1): GeoBounds => {
  const lonSpan = (latSpan * aspect) / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  return { lon0: lon - lonSpan / 2, lon1: lon + lonSpan / 2, lat0: lat - latSpan / 2, lat1: lat + latSpan / 2 };
};

/** Width/height ratio of a bounds window as seen on a flat (cos-lat corrected) map. */
export const boundsAspect = (b: GeoBounds) =>
  ((b.lon1 - b.lon0) * Math.cos((((b.lat0 + b.lat1) / 2) * Math.PI) / 180)) / (b.lat1 - b.lat0);

/** lon/lat → 0..1 position inside bounds (x right, y down). */
export const toUnit = (b: GeoBounds, [lon, lat]: LonLat): [number, number] => [(lon - b.lon0) / (b.lon1 - b.lon0), (b.lat1 - lat) / (b.lat1 - b.lat0)];

export const WORLD: GeoBounds = { lon0: -180, lon1: 180, lat0: -90, lat1: 90 };

/** Inverse of lonLatToVec3. */
export const vec3ToLonLat = (v: THREE.Vector3): LonLat => {
  const n = v.clone().normalize();
  const theta = Math.acos(Math.max(-1, Math.min(1, n.y)));
  let phi = Math.atan2(n.z, -n.x);
  if (phi < 0) phi += Math.PI * 2;
  return [(phi / (Math.PI * 2)) * 360 - 180, 90 - (theta / Math.PI) * 180];
};

/** Shortest-way interpolation of two lon/lat views (handles the antimeridian). */
export const mixView = (a: LonLat, b: LonLat, t: number): LonLat => {
  let dl = b[0] - a[0];
  if (dl > 180) dl -= 360;
  if (dl < -180) dl += 360;
  return [a[0] + dl * t, a[1] + (b[1] - a[1]) * t];
};
