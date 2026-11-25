import { useLayoutEffect, useMemo, useRef } from "react";
import { Easing, interpolate, random, useCurrentFrame } from "remotion";
import * as THREE from "three";
import {
  ERA_PALETTES,
  horizonY,
  PaintedBackdrop,
  Ink,
  lathe,
  OrbitCamera,
  roundedBox,
  SKIN_TONES,
  SoftShadow,
  Stage,
  ToonMaterial,
  type TimeOfDay,
} from "../kit/look";

// Step 2 look test: a small stone plaza diorama at sunset, slow orbit camera.
// The character here is a throwaway placeholder: the real figurine is built in step 3.

const pal = ERA_PALETTES.ancient;

const Paving: React.FC<{ radius: number }> = ({ radius }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const tiles = useMemo(() => {
    const out: { x: number; z: number; y: number; r: number; c: string }[] = [];
    const step = 0.52;
    for (let x = -radius; x <= radius; x += step) {
      for (let z = -radius; z <= radius; z += step) {
        if (Math.hypot(x, z) > radius - 0.3) continue;
        const k = `${x.toFixed(2)}:${z.toFixed(2)}`;
        out.push({
          x: x + (random(`px${k}`) - 0.5) * 0.04,
          z: z + (random(`pz${k}`) - 0.5) * 0.04,
          y: (random(`py${k}`) - 0.5) * 0.03,
          r: (random(`pr${k}`) - 0.5) * 0.08,
          c: random(`pc${k}`) < 0.55 ? pal.stone[0] : random(`pd${k}`) < 0.7 ? pal.stone[1] : "#e3c08f",
        });
      }
    }
    return out;
  }, [radius]);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    tiles.forEach((t, i) => {
      o.position.set(t.x, t.y, t.z);
      o.rotation.set(0, t.r, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, col.set(t.c));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [tiles]);

  return (
    <instancedMesh ref={ref} args={[roundedBox(0.48, 0.14, 0.48, 0.05), undefined, tiles.length]} receiveShadow castShadow>
      <ToonMaterial color="#ffffff" rim={0.3} />
    </instancedMesh>
  );
};

export const DioramaBase: React.FC = () => (
  <group>
    <mesh geometry={lathe("plaza-base", [[0, -0.9], [4.55, -0.9], [4.7, -0.75], [4.7, -0.12], [4.55, 0], [0, 0]], 64)} receiveShadow>
      <ToonMaterial color={pal.stone[2]} rim={0.4} />
      <Ink weight="set" />
    </mesh>
    {/* grass ring peeking out from under the paving */}
    <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[4.5, 64]} />
      <ToonMaterial color={pal.foliage[0]} rim={0} />
    </mesh>
    <group position={[0, 0.07, 0]}>
      <Paving radius={4.3} />
    </group>
  </group>
);

export const Column: React.FC<{ position: [number, number, number]; height?: number; broken?: boolean }> = ({
  position,
  height = 3.2,
  broken,
}) => {
  const h = broken ? height * 0.45 : height;
  return (
    <group position={position}>
      <mesh geometry={roundedBox(0.95, 0.22, 0.95, 0.06)} position={[0, 0.25, 0]} castShadow receiveShadow>
        <ToonMaterial color={pal.stone[1]} />
        <Ink weight="set" />
      </mesh>
      <mesh
        geometry={lathe("col-shaft", [[0, 0], [0.36, 0], [0.4, 0.06], [0.33, 0.14], [0.3, 0.5], [0.27, 1], [0, 1]], 24)}
        position={[0, 0.34, 0]}
        scale={[1, h - 0.6, 1]}
        castShadow
        receiveShadow
      >
        <ToonMaterial color={pal.stone[0]} />
        <Ink weight="set" />
      </mesh>
      {broken ? (
        <mesh geometry={roundedBox(0.5, 0.3, 0.42, 0.08)} position={[0.9, 0.25, 0.3]} rotation={[0.2, 0.7, 0.4]} castShadow>
          <ToonMaterial color={pal.stone[0]} />
          <Ink weight="set" />
        </mesh>
      ) : (
        <mesh geometry={roundedBox(0.86, 0.24, 0.86, 0.06)} position={[0, h - 0.14, 0]} castShadow receiveShadow>
          <ToonMaterial color={pal.stone[1]} />
          <Ink weight="set" />
        </mesh>
      )}
    </group>
  );
};

export const Cypress: React.FC<{ position: [number, number, number]; scale?: number }> = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 0.3, 0]} castShadow>
      <cylinderGeometry args={[0.09, 0.12, 0.6, 10]} />
      <ToonMaterial color={pal.wood} />
    </mesh>
    <mesh position={[0, 1.7, 0]} scale={[0.55, 1.55, 0.55]} castShadow receiveShadow>
      <sphereGeometry args={[1, 24, 18]} />
      <ToonMaterial color={pal.foliage[1]} />
      <Ink weight="set" />
    </mesh>
    <mesh position={[0.05, 2.65, 0.05]} scale={[0.32, 0.7, 0.32]} castShadow>
      <sphereGeometry args={[1, 20, 14]} />
      <ToonMaterial color={pal.foliage[0]} />
      <Ink weight="set" />
    </mesh>
  </group>
);

export const Fountain: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const frame = useCurrentFrame();
  return (
    <group position={position}>
      <mesh
        geometry={lathe("fountain-basin", [[0, 0], [1.25, 0], [1.32, 0.08], [1.32, 0.48], [1.2, 0.55], [1.12, 0.45], [1.1, 0.2], [0, 0.2]], 48)}
        castShadow
        receiveShadow
      >
        <ToonMaterial color={pal.stone[1]} />
        <Ink weight="prop" />
      </mesh>
      <mesh position={[0, 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.12, 48]} />
        <ToonMaterial color="#6fc3d6" emissive="#3a8fb0" emissiveIntensity={0.25 + 0.05 * Math.sin(frame / 6)} rim={0} />
      </mesh>
      <mesh
        geometry={lathe("fountain-post", [[0, 0], [0.22, 0], [0.16, 0.5], [0.14, 0.9], [0.5, 1.0], [0.52, 1.1], [0.2, 1.15], [0.1, 1.35], [0.14, 1.45], [0, 1.5]], 32)}
        position={[0, 0.2, 0]}
        castShadow
        receiveShadow
      >
        <ToonMaterial color={pal.stone[0]} />
        <Ink weight="prop" />
      </mesh>
    </group>
  );
};

export const Pot: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position}>
    <mesh geometry={lathe("pot", [[0, 0], [0.22, 0], [0.32, 0.18], [0.3, 0.38], [0.22, 0.48], [0.26, 0.54], [0, 0.54]], 24)} castShadow receiveShadow>
      <ToonMaterial color="#c56a43" />
      <Ink weight="prop" />
    </mesh>
    <mesh position={[0, 0.72, 0]} scale={[0.42, 0.36, 0.42]} castShadow>
      <sphereGeometry args={[1, 20, 14]} />
      <ToonMaterial color={pal.foliage[0]} />
      <Ink weight="prop" />
    </mesh>
  </group>
);

/** Placeholder "bean" figurine — proves the shading on a character-like form. */
const PlaceholderFigure: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const frame = useCurrentFrame();
  const breathe = Math.sin((frame / 30) * Math.PI * 0.8);
  const blinkAt = 52 + Math.floor(random("blink") * 10);
  const blink = frame >= blinkAt && frame < blinkAt + 4 ? 0.12 : 1;
  const headTilt = Math.sin(frame / 22) * 0.06;
  const skin = SKIN_TONES[3];
  return (
    <group position={position}>
      {/* feet */}
      {[-0.17, 0.17].map((x) => (
        <mesh key={x} position={[x, 0.1, 0.06]} scale={[0.15, 0.1, 0.21]} castShadow>
          <sphereGeometry args={[1, 20, 14]} />
          <ToonMaterial color="#6b4430" />
          <Ink weight="character" />
        </mesh>
      ))}
      <group position={[0, 0.18, 0]} scale={[1 - breathe * 0.012, 1 + breathe * 0.02, 1 - breathe * 0.012]}>
        {/* robe */}
        <mesh geometry={lathe("robe", [[0, 0], [0.42, 0], [0.44, 0.1], [0.38, 0.5], [0.3, 0.82], [0.16, 0.95], [0, 0.97]], 32)} castShadow receiveShadow>
          <ToonMaterial color={pal.cloth[0]} />
          <Ink weight="character" />
        </mesh>
        {/* sash */}
        <mesh position={[0, 0.5, 0]} rotation={[0.1, 0, 0.5]} scale={[1, 1, 1]} castShadow>
          <torusGeometry args={[0.37, 0.06, 10, 32]} />
          <ToonMaterial color={pal.accent} />
        </mesh>
        {/* arms */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.33, 0.78, 0]} rotation={[0, 0, s * (0.35 + breathe * 0.03)]}>
            <mesh position={[0, -0.24, 0]} castShadow>
              <capsuleGeometry args={[0.09, 0.3, 6, 12]} />
              <ToonMaterial color={pal.cloth[0]} />
              <Ink weight="character" />
            </mesh>
            <mesh position={[0, -0.48, 0]} castShadow>
              <sphereGeometry args={[0.1, 16, 12]} />
              <ToonMaterial color={skin} />
              <Ink weight="character" />
            </mesh>
          </group>
        ))}
        {/* head */}
        <group position={[0, 1.42, 0]} rotation={[0.05, headTilt, headTilt * 0.5]}>
          <mesh castShadow>
            <sphereGeometry args={[0.52, 40, 28]} />
            <ToonMaterial color={skin} />
            <Ink weight="character" />
          </mesh>
          {/* hair cap */}
          <mesh position={[0, 0.08, -0.04]} scale={[1.05, 0.95, 1.05]} rotation={[-0.35, 0, 0]} castShadow>
            <sphereGeometry args={[0.52, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
            <ToonMaterial color="#3b2418" side={THREE.DoubleSide} />
          </mesh>
          {/* laurel */}
          <mesh position={[0, 0.16, -0.02]} rotation={[Math.PI / 2 - 0.25, 0, 0]}>
            <torusGeometry args={[0.47, 0.05, 8, 40]} />
            <ToonMaterial color="#6f9a3a" />
          </mesh>
          {/* eyes */}
          {[-0.17, 0.17].map((x) => (
            <group key={x} position={[x, -0.02, 0.47]} rotation={[0, x * 0.9, 0]}>
              <mesh scale={[0.075, 0.1 * blink, 0.03]}>
                <sphereGeometry args={[1, 16, 12]} />
                <meshBasicMaterial color="#1d1420" />
              </mesh>
              {blink > 0.5 ? (
                <mesh position={[0.022, 0.035, 0.03]} scale={[0.025, 0.03, 0.01]}>
                  <sphereGeometry args={[1, 10, 8]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
              ) : null}
            </group>
          ))}
          {/* blush */}
          {[-0.3, 0.3].map((x) => (
            <mesh key={x} position={[x, -0.15, 0.43]} rotation={[0, x * 1.4, 0]}>
              <circleGeometry args={[0.07, 20]} />
              <meshBasicMaterial color="#ff8a8a" transparent opacity={0.55} />
            </mesh>
          ))}
          {/* smile */}
          <mesh position={[0, -0.17, 0.495]} rotation={[0, 0, Math.PI]} scale={[1, 0.8, 1]}>
            <torusGeometry args={[0.06, 0.014, 8, 20, Math.PI]} />
            <meshBasicMaterial color="#5a2430" />
          </mesh>
        </group>
      </group>
    </group>
  );
};

const FOV = 30;
const TILT = 4;

export const LookTest: React.FC<{ timeOfDay: TimeOfDay; whatIf: number }> = ({ timeOfDay, whatIf }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, 119], [0, 1], { easing: Easing.inOut(Easing.sin) });
  const azimuth = interpolate(t, [0, 1], [-24, 20]);
  const elevation = interpolate(t, [0, 1], [15, 11]);

  return (
    <Stage
      timeOfDay={timeOfDay}
      whatIf={whatIf}
      shadowSize={6}
      glowOffsetX={-azimuth * 0.003}
      backdrop={
        <PaintedBackdrop
          timeOfDay={timeOfDay}
          horizon={horizonY(elevation, TILT, FOV)}
          pan={azimuth}
          colors={[pal.stone[1], "#b59a66", pal.foliage[0], pal.foliage[1]]}
        />
      }
    >
      <OrbitCamera target={[0, 0.9, -0.4]} distance={23} azimuth={azimuth} elevation={elevation} fov={FOV} tilt={TILT} />
      <SoftShadow position={[0, -0.92, 0]} radius={7} stretch={[1, 1]} opacity={0.5} />
      <DioramaBase />
      <Fountain position={[0.3, 0.07, -1.9]} />
      <Column position={[-2.6, 0.07, -2.5]} />
      <Column position={[2.7, 0.07, -2.3]} />
      <Column position={[-3.3, 0.07, 0.6]} broken />
      <Cypress position={[-3.5, 0.07, -1.0]} />
      <Cypress position={[3.4, 0.07, -0.6]} scale={0.85} />
      <Pot position={[1.6, 0.07, 1.4]} />
      <Pot position={[-1.5, 0.07, 1.9]} />
      <PlaceholderFigure position={[0, 0.07, 0.4]} />
    </Stage>
  );
};
