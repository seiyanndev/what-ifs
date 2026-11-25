import { Easing, interpolate, useCurrentFrame } from "remotion";
import { ERA_PALETTES, horizonY, OrbitCamera, PaintedBackdrop, SoftShadow, Stage, type Era, type OrbitShot, type TimeOfDay } from "../look";
import { SetContext, makeSetCtx } from "./context";
import { Globe, MapBoard, type GlobeProps, type MapBoardProps, ERA_MAP_STYLE } from "./geo";
import { SETS, type SetName } from "./sets";
import { Candle } from "./dressing";

export type CameraName = "wide" | "medium" | "close";
export type CameraMove = "static" | "push" | "pull" | "orbitLeft" | "orbitRight";

export type SetSceneProps = {
  set: SetName;
  era?: Era;
  timeOfDay?: TimeOfDay;
  /** 0 = real grade, 1 = What If grade. */
  whatIf?: number;
  camera?: CameraName | OrbitShot;
  move?: CameraMove;
  /** Frames the camera move takes (usually the scene length). */
  duration?: number;
  /** GLOBE options (view is required for GLOBE). */
  globe?: Partial<GlobeProps>;
  /** MAP_REGION options (bounds required for MAP_REGION). */
  map?: MapBoardProps;
  overlay?: React.ReactNode;
  children?: React.ReactNode;
};

const FOV = 30;

/** Build the camera shot for a set, framing + move over `duration` frames. */
export const setCamera = (set: SetName, cam: CameraName | OrbitShot, move: CameraMove, t: number): OrbitShot => {
  if (typeof cam !== "string") return cam;
  const info = SETS[set].camera;
  const base = info[cam];
  const el = info.elevation ?? (cam === "close" ? 9 : cam === "medium" ? 12 : 15);
  const e = Easing.inOut(Easing.sin)(t);
  const dist = move === "push" ? base * (1 - 0.14 * e) : move === "pull" ? base * (0.88 + 0.12 * e) : base;
  const az = move === "orbitLeft" ? -14 + 28 * e : move === "orbitRight" ? 14 - 28 * e : 0;
  const target: [number, number, number] = cam === "close" ? [info.target[0], info.target[1] + 0.35, info.target[2] + 0.9] : info.target;
  return { target, distance: dist, azimuth: az, elevation: el, fov: FOV, tilt: set === "MAP_REGION" ? 6 : cam === "close" ? 2 : 4 };
};

/**
 * A complete 3D shot on one of the 12 sets: sky/backdrop, lights, diorama, camera move and grade.
 * Characters go in `children` (place them on SETS[set].marks).
 */
export const SetScene: React.FC<SetSceneProps> = ({ set, era, timeOfDay, whatIf = 0, camera = "wide", move = "push", duration = 120, globe, map, overlay, children }) => {
  const frame = useCurrentFrame();
  const info = SETS[set];
  const e = era ?? info.era;
  const tod = timeOfDay ?? info.timeOfDay;
  const pal = ERA_PALETTES[e];
  const t = interpolate(frame, [0, Math.max(1, duration - 1)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shot = setCamera(set, camera, move, t);
  const Comp = info.component;

  const background =
    set === "GLOBE"
      ? "radial-gradient(circle at 50% 45%, #2a3f7a 0%, #141d42 60%, #0b1030 100%)"
      : set === "MAP_REGION"
        ? "radial-gradient(ellipse at 50% 40%, #6b4a32 0%, #3a2418 70%, #24160e 100%)"
        : info.interior
          ? `radial-gradient(ellipse at 50% 35%, ${tod === "night" ? "#3a3560" : "#f3e3c8"} 0%, ${tod === "night" ? "#1c1a33" : "#c9a982"} 100%)`
          : undefined;

  return (
    <Stage
      timeOfDay={tod}
      whatIf={whatIf}
      background={background}
      shadowSize={set === "GLOBE" ? 3 : 7}
      overlay={overlay}
      backdrop={
        background ? undefined : (
          <PaintedBackdrop timeOfDay={tod} horizon={horizonY(shot.elevation, shot.tilt ?? 0, FOV)} pan={shot.azimuth} colors={[pal.stone[1], "#b59a66", pal.foliage[0], pal.foliage[1]]} seed={set} />
        )
      }
    >
      <SetContext.Provider value={makeSetCtx(e, tod)}>
        <OrbitCamera {...shot} />
        {set === "GLOBE" ? <Globe view={globe?.view ?? [0, 20]} style={globe?.style ?? ERA_MAP_STYLE[e] ?? "storybook"} {...globe} /> : null}
        {set === "MAP_REGION" && map ? (
          <group>
            <MapBoard style={ERA_MAP_STYLE[e] ?? "parchment"} {...map} />
            <Candle position={[(map.width ?? 6) / 2 + 0.05, 0.0, -1.2]} scale={2} />
          </group>
        ) : null}
        {Comp ? (
          <group>
            <SoftShadow position={[0, -0.92, 0]} radius={7} opacity={0.4} />
            <Comp />
          </group>
        ) : null}
        {children}
      </SetContext.Provider>
    </Stage>
  );
};
