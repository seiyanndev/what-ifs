import { PerspectiveCamera } from "@react-three/drei";

export type OrbitShot = {
  /** Point the camera looks at. */
  target: [number, number, number];
  /** Distance from target. */
  distance: number;
  /** Horizontal angle in degrees (0 = camera on +Z looking toward -Z). */
  azimuth: number;
  /** Vertical angle in degrees above the target. */
  elevation: number;
  /** Vertical field of view. Low values (25–35) give the "toy diorama" compressed look. */
  fov?: number;
  /** Dutch tilt in degrees. */
  roll?: number;
  /**
   * Extra pitch in degrees (+ = look up) applied after aiming at the target.
   * Keeps the horizon/sky in frame on high shots — important in 9:16.
   */
  tilt?: number;
};

/**
 * Declarative camera: position + rotation are computed from props each frame
 * (no lookAt in effects), so it stays frame-accurate inside Remotion.
 * Animate by passing frame-derived values, e.g. azimuth={interpolate(frame, ...)}.
 */
export const OrbitCamera: React.FC<OrbitShot> = ({ target, distance, azimuth, elevation, fov = 30, roll = 0, tilt = 0 }) => {
  const az = (azimuth * Math.PI) / 180;
  const el = (elevation * Math.PI) / 180;
  const position: [number, number, number] = [
    target[0] + distance * Math.sin(az) * Math.cos(el),
    target[1] + distance * Math.sin(el),
    target[2] + distance * Math.cos(az) * Math.cos(el),
  ];
  return (
    <PerspectiveCamera
      makeDefault
      position={position}
      rotation={[-el + (tilt * Math.PI) / 180, az, (roll * Math.PI) / 180, "YXZ"]}
      fov={fov}
      near={0.1}
      far={200}
    />
  );
};

/**
 * Where the horizon lands on screen (0 = top, 1 = bottom) for a camera that looks
 * down by (elevation - tilt) degrees. Use to pin painted backdrops to the 3D world.
 */
export const horizonY = (elevation: number, tilt = 0, fov = 30) => {
  const pitchDown = ((elevation - tilt) * Math.PI) / 180;
  return 0.5 - (Math.tan(pitchDown) / Math.tan((fov * Math.PI) / 360)) * 0.5;
};
