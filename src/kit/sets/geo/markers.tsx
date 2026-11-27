import { createContext, useContext, useLayoutEffect, useMemo } from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import { extruded, lathe, roundedBox, Ink, ToonMaterial } from "../../look";

// ---------------------------------------------------------------------------
// Labels — text drawn on a canvas sprite (always faces the camera, deterministic).
// ---------------------------------------------------------------------------
export type LabelStyle = "region" | "city" | "title";

const LABEL_STYLE: Record<LabelStyle, { font: string; fill: string; stroke: string; pill?: string; tracking: number }> = {
  region: { font: "900 120px Helvetica, Arial, sans-serif", fill: "#ffffff", stroke: "#2b1b2b", tracking: 10 },
  city: { font: "800 96px Helvetica, Arial, sans-serif", fill: "#2b1b2b", stroke: "#ffffff", pill: "rgba(255,255,255,0.92)", tracking: 2 },
  title: { font: "900 140px Helvetica, Arial, sans-serif", fill: "#f2b134", stroke: "#2b1b2b", tracking: 6 },
};

export const Label3D: React.FC<{
  text: string;
  position: THREE.Vector3 | [number, number, number];
  /** Text height in world units. */
  size?: number;
  style?: LabelStyle;
  opacity?: number;
  color?: string;
  /** false = always drawn on top (globe labels: the curved surface would otherwise hide part of the text). */
  depthTest?: boolean;
}> = ({ text, position, size = 0.22, style = "city", opacity = 1, color, depthTest = true }) => {
  const st = LABEL_STYLE[style];
  const { texture, aspect } = useMemo(() => {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d")!;
    ctx.font = st.font;
    const label = style === "region" || style === "title" ? text.toUpperCase() : text;
    const w = Math.ceil(ctx.measureText(label).width + st.tracking * label.length + 90);
    const h = 190;
    c.width = w;
    c.height = h;
    ctx.font = st.font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${st.tracking}px`;
    if (st.pill) {
      ctx.fillStyle = st.pill;
      const r = 60;
      ctx.beginPath();
      ctx.roundRect(10, 30, w - 20, h - 60, r);
      ctx.fill();
      ctx.strokeStyle = "#2b1b2b";
      ctx.lineWidth = 8;
      ctx.stroke();
    } else {
      ctx.lineWidth = 26;
      ctx.lineJoin = "round";
      ctx.strokeStyle = st.stroke;
      ctx.strokeText(label, w / 2, h / 2 + 6);
    }
    ctx.fillStyle = color ?? st.fill;
    ctx.fillText(label, w / 2, h / 2 + 6);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return { texture: t, aspect: w / h };
  }, [text, style, color, st]);
  return (
    <sprite position={position} scale={[size * aspect * (190 / 120), size * (190 / 120), 1]} renderOrder={10}>
      <spriteMaterial map={texture} transparent opacity={opacity} depthWrite={false} depthTest={depthTest} toneMapped={false} />
    </sprite>
  );
};

// ---------------------------------------------------------------------------
// Pin — a toy map pin standing on a surface with normal `up`.
// ---------------------------------------------------------------------------
const UP = new THREE.Vector3(0, 1, 0);
export const orientTo = (up: THREE.Vector3) => new THREE.Quaternion().setFromUnitVectors(UP, up.clone().normalize());

export const Pin: React.FC<{ position: THREE.Vector3; up?: THREE.Vector3; color?: string; scale?: number; pop?: number }> = ({
  position,
  up = UP,
  color = "#c0392b",
  scale = 1,
  pop = 1,
}) => (
  <group position={position} quaternion={orientTo(up)} scale={scale * Math.max(0.0001, pop)}>
    <mesh position={[0, 0.11, 0]} castShadow>
      <coneGeometry args={[0.035, 0.22, 12]} />
      <ToonMaterial color="#e8e2d4" />
    </mesh>
    <mesh position={[0, 0.26, 0]} castShadow>
      <sphereGeometry args={[0.075, 20, 14]} />
      <ToonMaterial color={color} />
      <Ink weight="prop" />
    </mesh>
  </group>
);

// ---------------------------------------------------------------------------
// Toy ship & army token (route icons; the ship is reused by PORT / SHIP_FLEET)
// ---------------------------------------------------------------------------
export type ShipStyle = "galleon" | "junk";
/** Default ship style for everything inside (set by SetScene `ships`): ports, fleets and route icons follow it. */
export const ShipStyleContext = createContext<ShipStyle>("galleon");

export const ToyShip: React.FC<{ scale?: number; sail?: string; hull?: string; flag?: string; bob?: boolean; seed?: number; style?: ShipStyle }> = (props) => {
  const ctx = useContext(ShipStyleContext);
  return (props.style ?? ctx) === "junk" ? <ToyJunk {...props} /> : <ToyGalleon {...props} />;
};

/**
 * Chinese treasure junk (generic, Ming-era silhouette): flat sheer with a high stern castle, painted bow eyes,
 * three masts with battened sails set fore-and-aft (so they read from the side). Bow toward +Z.
 */
export const ToyJunk: React.FC<{ scale?: number; sail?: string; hull?: string; flag?: string; bob?: boolean; seed?: number }> = ({
  scale = 1,
  sail,
  hull = "#6b3a26",
  flag = "#d8a531",
  bob = true,
  seed = 0,
}) => {
  const frame = useCurrentFrame();
  const roll = bob ? Math.sin(frame * 0.08 + seed) * 0.05 : 0;
  const pitch = bob ? Math.sin(frame * 0.06 + seed * 2) * 0.035 : 0;
  // galleon-white defaults read as a European ship; junks get rust-red battened sails
  const sailC = !sail || sail === "#f6efe0" || sail === "#e8dcc0" ? "#b5463c" : sail;
  const masts: [number, number, number][] = [
    // z, height, sail width
    [0.3, 0.62, 0.3],
    [0.04, 0.82, 0.4],
    [-0.24, 0.6, 0.3],
  ];
  return (
    <group scale={scale} rotation={[pitch, 0, roll]}>
      <mesh geometry={extruded("junk-hull", [[-0.52, 0.34], [-0.48, 0.06], [-0.34, 0.0], [0.34, 0.0], [0.5, 0.14], [0.55, 0.26], [0.42, 0.24], [0.3, 0.17], [-0.3, 0.17], [-0.38, 0.3], [-0.46, 0.38]], 0.34, 0.03)} rotation={[0, -Math.PI / 2, 0]} castShadow>
        <ToonMaterial color={hull} />
        <Ink weight="prop" />
      </mesh>
      {/* gold rail stripe + deck */}
      <mesh geometry={roundedBox(0.36, 0.025, 0.74, 0.01)} position={[0, 0.115, 0.02]}>
        <ToonMaterial color="#d8a531" />
      </mesh>
      <mesh geometry={roundedBox(0.3, 0.03, 0.7, 0.01)} position={[0, 0.17, 0.02]}>
        <ToonMaterial color="#b08a5a" />
      </mesh>
      {/* stern castle with a little roof */}
      <mesh geometry={roundedBox(0.3, 0.14, 0.18, 0.02)} position={[0, 0.3, -0.36]} castShadow>
        <ToonMaterial color="#8e3b38" />
        <Ink weight="prop" />
      </mesh>
      <mesh geometry={roundedBox(0.36, 0.03, 0.24, 0.012)} position={[0, 0.385, -0.36]}>
        <ToonMaterial color="#2f4a3e" />
      </mesh>
      {/* painted eyes on the bow */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.172, 0.15, 0.4]} rotation={[0, side * Math.PI / 2, 0]}>
          <mesh>
            <circleGeometry args={[0.035, 16]} />
            <meshBasicMaterial color="#f6efe0" />
          </mesh>
          <mesh position={[0.008, 0, 0.002]}>
            <circleGeometry args={[0.018, 12]} />
            <meshBasicMaterial color="#1e1428" />
          </mesh>
        </group>
      ))}
      {masts.map(([z, h, w], i) => (
        <group key={i} position={[0, 0.17, z]}>
          <mesh position={[0, h / 2 + 0.05, 0]}>
            <cylinderGeometry args={[0.012, 0.016, h + 0.1, 8]} />
            <ToonMaterial color="#5a3d28" />
          </mesh>
          {/* battened lug sail, fore-and-aft, a little ahead of the mast */}
          <group position={[0, 0.12 + h * 0.5, w * 0.12]} rotation={[0.06, 0, 0]}>
            <mesh geometry={roundedBox(0.016, h * 0.82, w, 0.006)} castShadow>
              <ToonMaterial color={sailC} side={THREE.DoubleSide} />
              <Ink weight="prop" />
            </mesh>
            {Array.from({ length: 5 }, (_, k) => (
              <mesh key={k} geometry={roundedBox(0.026, 0.012, w * 1.02, 0.004)} position={[0, -h * 0.41 + ((k + 0.5) * h * 0.82) / 5, 0]}>
                <ToonMaterial color="#4a2b20" />
              </mesh>
            ))}
          </group>
        </group>
      ))}
      <mesh position={[0, 1.08, 0.05]}>
        <boxGeometry args={[0.01, 0.07, 0.12]} />
        <meshBasicMaterial color={flag} />
      </mesh>
    </group>
  );
};

const ToyGalleon: React.FC<{ scale?: number; sail?: string; hull?: string; flag?: string; bob?: boolean; seed?: number }> = ({
  scale = 1,
  sail = "#f6efe0",
  hull = "#7a4d2e",
  flag = "#c0392b",
  bob = true,
  seed = 0,
}) => {
  const frame = useCurrentFrame();
  const roll = bob ? Math.sin(frame * 0.09 + seed) * 0.06 : 0;
  const pitch = bob ? Math.sin(frame * 0.07 + seed * 2) * 0.04 : 0;
  return (
    <group scale={scale} rotation={[pitch, 0, roll]}>
      {/* hull: side profile extruded across the beam; bow toward +Z */}
      <mesh geometry={extruded("ship-hull", [[-0.5, 0.18], [-0.42, 0.0], [0.3, 0.0], [0.55, 0.22], [0.42, 0.24], [0.3, 0.16], [-0.38, 0.16], [-0.44, 0.3]], 0.3, 0.03)} rotation={[0, -Math.PI / 2, 0]} castShadow>
        <ToonMaterial color={hull} />
        <Ink weight="prop" />
      </mesh>
      <mesh geometry={roundedBox(0.26, 0.03, 0.72, 0.01)} position={[0, 0.17, 0]}>
        <ToonMaterial color="#b08a5a" />
      </mesh>
      {[0.12, -0.18].map((z, i) => (
        <group key={z} position={[0, 0.17, z]}>
          <mesh position={[0, 0.34 - i * 0.06, 0]}>
            <cylinderGeometry args={[0.014, 0.018, 0.68 - i * 0.12, 8]} />
            <ToonMaterial color="#5a3d28" />
          </mesh>
          <mesh position={[0, 0.38 - i * 0.06, 0.03]} rotation={[0, Math.PI / 2, 0]} scale={[1, 1, 1]}>
            <cylinderGeometry args={[0.3 - i * 0.05, 0.3 - i * 0.05, 0.4 - i * 0.08, 16, 1, true, -0.6, 1.2]} />
            <ToonMaterial color={sail} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.88, 0.16]}>
        <boxGeometry args={[0.01, 0.07, 0.14]} />
        <meshBasicMaterial color={flag} />
      </mesh>
    </group>
  );
};

export const ArmyToken: React.FC<{ scale?: number; color?: string; banner?: string }> = ({ scale = 1, color = "#8e3b38", banner = "#f2b134" }) => {
  const frame = useCurrentFrame();
  const step = Math.abs(Math.sin(frame * 0.4)) * 0.03;
  return (
    <group scale={scale}>
      {[
        [0, 0, 0.08],
        [-0.14, 0, -0.08],
        [0.14, 0, -0.08],
      ].map(([x, , z], i) => (
        <group key={i} position={[x, i === 0 ? step : 0.03 - step, z]}>
          <mesh geometry={lathe("army-pawn", [[0, 0], [0.08, 0], [0.085, 0.04], [0.05, 0.16], [0, 0.17]], 16)} castShadow>
            <ToonMaterial color={color} />
            <Ink weight="prop" />
          </mesh>
          <mesh position={[0, 0.22, 0]} castShadow>
            <sphereGeometry args={[0.06, 14, 10]} />
            <ToonMaterial color="#e0a982" ramp="soft" />
            <Ink weight="prop" />
          </mesh>
        </group>
      ))}
      <mesh position={[0.02, 0.3, 0.12]}>
        <cylinderGeometry args={[0.008, 0.008, 0.5, 6]} />
        <ToonMaterial color="#5a3d28" />
      </mesh>
      <mesh position={[0.09, 0.48, 0.12]}>
        <boxGeometry args={[0.14, 0.09, 0.01]} />
        <ToonMaterial color={banner} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Route (ROUTE_ARROW): dotted path drawn by `progress`, icon travelling at the head, arrowhead at the end.
// ---------------------------------------------------------------------------
export type RouteIcon = "ship" | "army" | "none";

export const Route: React.FC<{
  /** Path position for t ∈ [0,1]. */
  at: (t: number) => THREE.Vector3;
  /** Surface normal at t. */
  upAt: (t: number) => THREE.Vector3;
  progress: number;
  color?: string;
  icon?: RouteIcon;
  iconScale?: number;
  dashes?: number;
  dotSize?: number;
  /** Keep the icon upright along this (local) direction instead of the surface normal — e.g. screen-up on a globe. */
  iconUp?: THREE.Vector3;
  /** Lift the icon off the surface along its normal. */
  iconLift?: number;
  /** Sail colour for ship icons. */
  sail?: string;
  /** Draw the dotted trail + arrowhead (false for extra ships in a fleet). */
  trail?: boolean;
}> = ({ at, upAt, progress, color = "#c0392b", icon = "ship", iconScale = 0.35, dashes = 44, dotSize = 0.03, iconUp, iconLift = 0, sail, trail = true }) => {
  const p = Math.max(0, Math.min(1, progress));
  const dots = useMemo(() => Array.from({ length: dashes }, (_, i) => (i + 0.5) / dashes), [dashes]);
  const head = at(p);
  const ahead = at(Math.min(1, p + 0.01));
  const behind = at(Math.max(0, p - 0.01));
  const tan = ahead.clone().sub(behind);
  if (tan.lengthSq() < 1e-10) tan.set(0, 0, 1);
  const up = iconUp ? iconUp.clone().normalize() : upAt(p);
  if (iconUp) {
    // sail across the screen: drop the tangent's component along `up`
    tan.sub(up.clone().multiplyScalar(tan.dot(up)));
    if (tan.lengthSq() < 1e-10) tan.copy(new THREE.Vector3(1, 0, 0));
  }
  const iconPos = head.clone().add(upAt(p).normalize().multiplyScalar(iconLift));
  const m = new THREE.Matrix4().lookAt(iconPos, iconPos.clone().sub(tan), up);
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  const end = at(1);
  const endTan = at(1).sub(at(0.985));
  const endQ = new THREE.Quaternion().setFromUnitVectors(UP, endTan.normalize());
  return (
    <group>
      {(trail ? dots : [])
        .filter((t) => t <= p)
        .map((t) => {
          const pos = at(t);
          const nxt = at(Math.min(1, t + 0.4 / dashes));
          const dir = nxt.clone().sub(pos);
          const qq = dir.lengthSq() > 1e-10 ? new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()) : new THREE.Quaternion();
          return (
            <mesh key={t} position={pos} quaternion={qq}>
              <capsuleGeometry args={[dotSize, dotSize * 2.2, 4, 8]} />
              <meshBasicMaterial color={color} />
            </mesh>
          );
        })}
      {trail && p > 0.97 ? (
        <mesh position={end} quaternion={endQ} scale={Math.min(1, (p - 0.97) / 0.03)}>
          <coneGeometry args={[dotSize * 2.4, dotSize * 5, 14]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ) : null}
      {icon !== "none" && p > 0 && p < 0.995 ? (
        <group position={iconPos} quaternion={q}>
          {icon === "ship" ? <ToyShip scale={iconScale} sail={sail} /> : <ArmyToken scale={iconScale} />}
        </group>
      ) : null}
    </group>
  );
};

/** Animate a dynamic BufferGeometry each frame (helper for custom map effects). */
export const useFrameGeometry = (g: THREE.BufferGeometry, update: (g: THREE.BufferGeometry) => void) => {
  useLayoutEffect(() => update(g));
};
