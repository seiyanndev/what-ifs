import { useLayoutEffect, useMemo } from "react";
import { random, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { Ink, lathe, ToonMaterial } from "../../look";
import type { LonLat } from "./data";
import { Label3D, Pin, Route, type LabelStyle, type RouteIcon } from "./markers";
import { paintMap, type MapStyleName, type RegionFill } from "./paint";
import { faceRotation, lonLatToVec3, slerpLonLat, WORLD, type GeoBounds } from "./project";

export type GeoPin = { at: LonLat; color?: string; pop?: number };
export type GeoLabel = { at: LonLat; text: string; style?: LabelStyle; size?: number; opacity?: number };
export type GeoRoute = { from: LonLat; to: LonLat; via?: LonLat[]; progress: number; color?: string; icon?: RouteIcon; arc?: number };

/** Waypoint path → parametric point by arc length (great circles on the globe). */
export const pathFn = (pts: LonLat[]) => {
  const segLen = pts.slice(1).map((p, i) => lonLatToVec3(pts[i], 1).angleTo(lonLatToVec3(p, 1)));
  const total = segLen.reduce((a, b) => a + b, 0) || 1;
  return (t: number) => {
    let d = Math.max(0, Math.min(1, t)) * total;
    for (let i = 0; i < segLen.length; i++) {
      if (d <= segLen[i] || i === segLen.length - 1) return slerpLonLat(pts[i], pts[i + 1], segLen[i] ? Math.min(1, d / segLen[i]) : 0);
      d -= segLen[i];
    }
    return lonLatToVec3(pts[0], 1);
  };
};

/** A canvas texture repainted only when its paint key changes. */
const usePaintedTexture = (w: number, h: number, key: string, paint: (ctx: CanvasRenderingContext2D) => void) => {
  const { canvas, texture, memo } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return { canvas: c, texture: t, memo: { key: "" } };
  }, [w, h]);
  useLayoutEffect(() => {
    if (memo.key === key) return;
    memo.key = key;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    paint(ctx);
    texture.needsUpdate = true;
  });
  return texture;
};

export type GlobeProps = {
  radius?: number;
  /** lon/lat that faces the camera. Animate it to spin or fly. */
  view: LonLat;
  style?: MapStyleName;
  fills?: RegionFill[];
  pins?: GeoPin[];
  labels?: GeoLabel[];
  routes?: GeoRoute[];
  /** High-resolution patch for close zooms (ZOOM_TO_MAP). Fade it in as the camera gets close. */
  detail?: { bounds: GeoBounds; opacity: number };
  /** Brass meridian + wooden stand (desk globe). */
  stand?: boolean;
  atmosphere?: boolean;
  clouds?: boolean;
};

/** Stylised toy globe (GLOBE). Everything is positioned in lon/lat and rotates with `view`. */
export const Globe: React.FC<GlobeProps> = ({
  radius: r = 1.6,
  view,
  style = "storybook",
  fills = [],
  pins = [],
  labels = [],
  routes = [],
  detail,
  stand = false,
  atmosphere = true,
  clouds = true,
}) => {
  const frame = useCurrentFrame();
  const fillKey = JSON.stringify([style, fills.map((f) => [f.countries, f.polygon?.length, f.color, Math.round((f.progress ?? 1) * 200), f.origin])]);
  const texture = usePaintedTexture(4096, 2048, fillKey, (ctx) => paintMap(ctx, { bounds: WORLD, width: 4096, height: 2048, style, fills }));

  // detail patch
  const patch = useMemo(() => {
    if (!detail) return null;
    const b = detail.bounds;
    const phiStart = ((b.lon0 + 180) / 360) * Math.PI * 2;
    const phiLen = ((b.lon1 - b.lon0) / 360) * Math.PI * 2;
    const thStart = ((90 - b.lat1) / 180) * Math.PI;
    const thLen = ((b.lat1 - b.lat0) / 180) * Math.PI;
    return new THREE.SphereGeometry(r * 1.003, 64, 48, phiStart, phiLen, thStart, thLen);
  }, [detail, r]);
  const dKey = detail ? JSON.stringify([detail.bounds, fillKey]) : "none";
  const dAspect = detail ? Math.max(0.25, Math.min(4, (detail.bounds.lon1 - detail.bounds.lon0) / (detail.bounds.lat1 - detail.bounds.lat0))) : 1;
  const detailTex = usePaintedTexture(2048, Math.round(2048 / dAspect), dKey, (ctx) => {
    if (detail) paintMap(ctx, { bounds: detail.bounds, width: 2048, height: Math.round(2048 / dAspect), style, fills });
  });

  const cloudPuffs = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        at: [random(`cl-lon-${i}`) * 360 - 180, random(`cl-lat-${i}`) * 110 - 55] as LonLat,
        s: 0.6 + random(`cl-s-${i}`) * 0.6,
      })),
    [],
  );

  // screen-up expressed in the globe's rotated frame (keeps route icons upright on screen)
  const rot = faceRotation(view);
  const screenUp = new THREE.Vector3(0, 1, 0).applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)).invert());
  return (
    <group>
      <group rotation={rot}>
        <mesh castShadow>
          <sphereGeometry args={[r, 96, 64]} />
          <ToonMaterial color="#ffffff" map={texture} ramp="soft" rim={0.6} />
          <Ink weight="set" />
        </mesh>
        {patch && detail && detail.opacity > 0.01 ? (
          <mesh geometry={patch} renderOrder={1}>
            <ToonMaterial color="#ffffff" map={detailTex} ramp="soft" transparent opacity={detail.opacity} depthWrite={false} />
          </mesh>
        ) : null}
        {clouds ? (
          <group rotation={[0, frame * 0.0025, 0]}>
            {cloudPuffs.map((c, i) => {
              const p = lonLatToVec3(c.at, r * 1.045);
              const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().normalize());
              return (
                <group key={i} position={p} quaternion={q} scale={r * 0.07 * c.s}>
                  {[-0.6, 0, 0.6].map((x, k) => (
                    <mesh key={k} position={[x, 0, k === 1 ? 0.2 : 0]} scale={[k === 1 ? 1 : 0.75, 0.35, k === 1 ? 0.8 : 0.6]}>
                      <sphereGeometry args={[1, 14, 10]} />
                      <ToonMaterial color="#ffffff" rim={0.3} />
                    </mesh>
                  ))}
                </group>
              );
            })}
          </group>
        ) : null}
        {pins.map((p, i) => {
          const pos = lonLatToVec3(p.at, r);
          return <Pin key={i} position={pos} up={pos.clone().normalize()} color={p.color} pop={p.pop ?? 1} scale={r * 0.22} />;
        })}
        {routes.map((rt, i) => {
          const f = pathFn([rt.from, ...(rt.via ?? []), rt.to]);
          const arc = rt.arc ?? 0.06;
          return (
            <Route
              key={i}
              at={(t) => f(t).multiplyScalar(r * (1.01 + Math.sin(Math.PI * t) * arc))}
              upAt={(t) => f(t)}
              progress={rt.progress}
              color={rt.color}
              icon={rt.icon}
              iconScale={r * 0.2}
              iconUp={screenUp}
              iconLift={r * 0.035}
              dotSize={r * 0.009}
              dashes={60}
            />
          );
        })}
        {labels.map((l, i) => (
          <Label3D key={i} text={l.text} position={lonLatToVec3(l.at, r * 1.06)} size={l.size ?? r * 0.07} style={l.style} opacity={l.opacity ?? 1} />
        ))}
      </group>
      {atmosphere ? (
        <mesh scale={1.075}>
          <sphereGeometry args={[r, 48, 32]} />
          <meshBasicMaterial color="#9fdcff" transparent opacity={0.45} side={THREE.BackSide} depthWrite={false} />
        </mesh>
      ) : null}
      {stand ? (
        <group>
          <mesh rotation={[0, Math.PI / 2, 0.41]}>
            <torusGeometry args={[r * 1.1, r * 0.025, 10, 60, Math.PI * 1.15]} />
            <ToonMaterial color="#c9962e" />
            <Ink weight="prop" />
          </mesh>
          <mesh geometry={lathe("globe-desk-stand", [[0, 0], [0.55, 0], [0.55, 0.08], [0.18, 0.16], [0.08, 0.5], [0.12, 0.62], [0, 0.64]], 32)} position={[0, -r * 1.75, 0]} scale={r}>
            <ToonMaterial color="#7a4d2e" />
            <Ink weight="prop" />
          </mesh>
        </group>
      ) : null}
    </group>
  );
};
