import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { Prop } from "../../characters/Costume";
import { Ink, roundedBox, ToonMaterial } from "../../look";
import { countries as resolveCountries, polygonsOf, type LonLat } from "./data";
import type { GeoLabel, GeoPin, GeoRoute } from "./Globe";
import { Label3D, Pin, Route } from "./markers";
import { paintMap, type MapStyleName, type RegionFill } from "./paint";
import { boundsAspect, toUnit, type GeoBounds } from "./project";

export type RaisedRegion = { countries: string[]; color: string; height?: number; /** 0..1 pop-up animation. */ rise?: number };

export type MapBoardProps = {
  bounds: GeoBounds;
  /** Board width in world units (height follows the map's aspect). */
  width?: number;
  style?: MapStyleName;
  fills?: RegionFill[];
  pins?: GeoPin[];
  labels?: GeoLabel[];
  routes?: (GeoRoute & { icon?: "ship" | "army" | "none" })[];
  raised?: RaisedRegion[];
  /** Planted flags (pop 0..1). */
  flags?: { at: LonLat; color?: string; accent?: string; pop?: number }[];
  frame?: "wood" | "none";
  decor?: boolean;
};

const shapeCache = new Map<string, THREE.ExtrudeGeometry>();

/** Flat "map table" diorama (MAP_REGION). Map plane lies in XZ at y = 0, north toward −Z. */
export const MapBoard: React.FC<MapBoardProps> = ({ bounds: b, width: w = 6, style = "parchment", fills = [], pins = [], labels = [], routes = [], raised = [], flags = [], frame = "wood", decor = true }) => {
  const aspect = boundsAspect(b);
  const h = w / aspect;
  const texW = 2048;
  const texH = Math.max(256, Math.round(texW / aspect));
  const toBoard = (ll: LonLat, y = 0): THREE.Vector3 => {
    const [u, v] = toUnit(b, ll);
    return new THREE.Vector3((u - 0.5) * w, y, (v - 0.5) * h);
  };

  const { canvas, texture, memo } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = texW;
    c.height = texH;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return { canvas: c, texture: t, memo: { key: "" } };
  }, [texW, texH]);
  const key = JSON.stringify([b, style, decor, fills.map((f) => [f.countries, f.color, Math.round((f.progress ?? 1) * 200), f.origin])]);
  useLayoutEffect(() => {
    if (memo.key === key) return;
    memo.key = key;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    paintMap(ctx, { bounds: b, width: texW, height: texH, style, fills, decor });
    texture.needsUpdate = true;
  });

  const raisedGeo = (names: string[]) => {
    const k = JSON.stringify([b, w, names]);
    const hit = shapeCache.get(k);
    if (hit) return hit;
    const shapes: THREE.Shape[] = [];
    for (const f of resolveCountries(names)) {
      for (const poly of polygonsOf(f)) {
        if (poly[0].length < 6) continue;
        const pt = (ll: LonLat) => {
          const p = toBoard(ll);
          return new THREE.Vector2(p.x, -p.z);
        };
        const shape = new THREE.Shape(poly[0].map(pt));
        for (const hole of poly.slice(1)) if (hole.length >= 6) shape.holes.push(new THREE.Path(hole.map(pt)));
        shapes.push(shape);
      }
    }
    const g = new THREE.ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    g.computeVertexNormals();
    shapeCache.set(k, g);
    return g;
  };

  return (
    <group>
      {frame === "wood" ? (
        <mesh geometry={roundedBox(w + 0.36, 0.22, h + 0.36, 0.08)} position={[0, -0.12, 0]} castShadow receiveShadow>
          <ToonMaterial color="#7a4d2e" />
          <Ink weight="set" />
        </mesh>
      ) : null}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow>
        <planeGeometry args={[w, h]} />
        <ToonMaterial color="#ffffff" map={texture} ramp="soft" rim={0} />
      </mesh>
      {raised.map((rg, i) => {
        const rise = Math.max(0.0001, rg.rise ?? 1);
        return (
          <mesh key={i} geometry={raisedGeo(rg.countries)} scale={[1, (rg.height ?? 0.12) * rise, 1]} castShadow receiveShadow>
            <ToonMaterial color={rg.color} />
            <Ink weight="set" />
          </mesh>
        );
      })}
      {routes.map((rt, i) => {
        const pts = [rt.from, ...(rt.via ?? []), rt.to].map((p) => toBoard(p));
        const segs = pts.slice(1).map((p, k) => p.distanceTo(pts[k]));
        const total = segs.reduce((a, c) => a + c, 0) || 1;
        const arc = (rt.arc ?? 0.06) * w;
        const at = (t: number) => {
          let d = Math.max(0, Math.min(1, t)) * total;
          let k = 0;
          while (k < segs.length - 1 && d > segs[k]) d -= segs[k++];
          const p = pts[k].clone().lerp(pts[k + 1], segs[k] ? Math.min(1, d / segs[k]) : 0);
          p.y = 0.03 + Math.sin(Math.PI * t) * arc * 0.15;
          return p;
        };
        return <Route key={i} at={at} upAt={() => new THREE.Vector3(0, 1, 0)} progress={rt.progress} color={rt.color} icon={rt.icon} iconScale={w * 0.07} dotSize={w * 0.0045} dashes={70} />;
      })}
      {flags.map((f, i) => (
        <group key={`f${i}`} position={toBoard(f.at)} scale={w * 0.075 * Math.max(0.0001, f.pop ?? 1)} rotation={[0, -0.5, 0]}>
          <group position={[0, -0.33, 0]}>
            <Prop type="flag" color={f.color ?? "#c0392b"} accent={f.accent ?? "#f2b134"} />
          </group>
        </group>
      ))}
      {pins.map((p, i) => (
        <Pin key={i} position={toBoard(p.at)} color={p.color} pop={p.pop ?? 1} scale={w * 0.12} />
      ))}
      {labels.map((l, i) => (
        <Label3D key={i} text={l.text} position={toBoard(l.at, w * 0.06)} size={l.size ?? w * 0.035} style={l.style} opacity={l.opacity ?? 1} />
      ))}
    </group>
  );
};
