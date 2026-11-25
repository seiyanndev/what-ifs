import { useMemo } from "react";
import { LookContext, lookFromTime } from "./LookContext";
import { dirFromAngles, TIME_OF_DAY, type TimeOfDay } from "./lighting";

type Props = {
  timeOfDay: TimeOfDay;
  /** World-space centre the key light's shadow frustum is aimed at. */
  target?: [number, number, number];
  /** Half-size of the shadow frustum in world units (bigger set → bigger value). */
  shadowSize?: number;
  /** Rotate the key light around Y (degrees) to re-light a shot without changing the preset. */
  keyAzimuthOffset?: number;
  children?: React.ReactNode;
};

/**
 * Lighting for every 3D scene: warm key (shadow-casting), cool hemisphere fill,
 * coloured back light, fog. Also provides the toon look context to <ToonMaterial>s inside.
 */
export const LightRig: React.FC<Props> = ({
  timeOfDay,
  target = [0, 0, 0],
  shadowSize = 7,
  keyAzimuthOffset = 0,
  children,
}) => {
  const p = TIME_OF_DAY[timeOfDay];
  const look = useMemo(() => lookFromTime(timeOfDay), [timeOfDay]);
  const keyDir = dirFromAngles([p.key.dir[0] + keyAzimuthOffset, p.key.dir[1]]);
  const dist = 20;
  const keyPos: [number, number, number] = [
    target[0] + keyDir[0] * dist,
    target[1] + keyDir[1] * dist,
    target[2] + keyDir[2] * dist,
  ];
  const backDir = dirFromAngles([p.key.dir[0] + keyAzimuthOffset + 180, 35]);

  return (
    <LookContext.Provider value={look}>
      <fog attach="fog" args={[p.fog.color, p.fog.near, p.fog.far]} />
      <hemisphereLight args={[p.fill.sky, p.fill.ground, p.fill.intensity]} />
      <directionalLight
        position={keyPos}
        color={p.key.color}
        intensity={p.key.intensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0008}
        shadow-normalBias={0.06}
        shadow-radius={4}
        shadow-camera-left={-shadowSize}
        shadow-camera-right={shadowSize}
        shadow-camera-top={shadowSize}
        shadow-camera-bottom={-shadowSize}
        shadow-camera-near={1}
        shadow-camera-far={dist * 2 + shadowSize}
      >
        <object3D attach="target" position={target} />
      </directionalLight>
      <directionalLight
        position={[backDir[0] * dist, backDir[1] * dist, backDir[2] * dist]}
        color={p.rim.color}
        intensity={p.rim.intensity * 0.6}
      />
      {children}
    </LookContext.Provider>
  );
};
