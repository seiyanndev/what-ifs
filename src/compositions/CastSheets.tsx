import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { CAST, Crowd, PRESETS, PresetCharacter, type Pose } from "../kit/characters";
import { ERA_PALETTES, lathe, OrbitCamera, PaintedBackdrop, SoftShadow, Stage, ToonMaterial, horizonY } from "../kit/look";
import { FONT, SHEET_BG } from "./CostumeSheets";

const HOLD_R: Pose = { joints: { shoulderR: [-0.45, 0, 0.05], elbowR: [-0.75, 0, 0] } };

/** All 26 presets from the brief. 2400×1700. */
export const CastSheet: React.FC = () => {
  const cols = 9;
  const sx = 1.5;
  const sy = 3.15;
  const fov = 10.5;
  const dist = 60;
  const viewH = 2 * dist * Math.tan((fov * Math.PI) / 360);
  const viewW = (viewH * 2400) / 1700;
  return (
    <Stage
      timeOfDay="day"
      background={SHEET_BG}
      shadowSize={9}
      overlay={
        <AbsoluteFill>
          <div style={{ ...FONT, position: "absolute", top: 20, width: "100%", textAlign: "center", fontSize: 46 }}>THE CAST</div>
          {CAST.map((id, i) => {
            const c = i % cols;
            const r = Math.floor(i / cols);
            const x = 0.5 + ((c - (cols - 1) / 2) * sx) / viewW;
            const y = 0.5 - ((1 - r) * sy - 0.5 - 0.12 - 1.1) / viewH;
            return (
              <div key={id} style={{ ...FONT, position: "absolute", left: `${x * 100}%`, top: `${y * 100}%`, transform: "translateX(-50%)", fontSize: 21, letterSpacing: 1, whiteSpace: "nowrap" }}>
                {PRESETS[id].label.toUpperCase()}
              </div>
            );
          })}
        </AbsoluteFill>
      }
    >
      <OrbitCamera target={[0, 1.1, 0]} distance={dist} azimuth={0} elevation={5} fov={fov} />
      {CAST.map((id, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        return (
          <group key={id} position={[(c - (cols - 1) / 2) * sx, (1 - r) * sy - 0.5, 0]}>
            <SoftShadow radius={0.55} opacity={0.45} />
            <PresetCharacter preset={id} rotation={[0, -0.3, 0]} pose={PRESETS[id].costume.props?.right ? HOLD_R : undefined} />
          </group>
        );
      })}
    </Stage>
  );
};

/** 5 s: a king on a dais, a medieval crowd idles then breaks into a cheering wave. 1080×1920. */
export const CrowdDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const cheer = interpolate(frame, [40, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
  const az = interpolate(frame, [0, 150], [-10, 10]);
  const el = 17;
  const tilt = 5;
  const pal = ERA_PALETTES.medieval;
  return (
    <Stage
      timeOfDay="sunset"
      shadowSize={9}
      shadowTarget={[0, 0, -2]}
      backdrop={<PaintedBackdrop timeOfDay="sunset" horizon={horizonY(el, tilt, 28)} pan={az} colors={[pal.stone[1], "#9a9470", pal.foliage[0], pal.foliage[1]]} />}
    >
      <OrbitCamera target={[0, 1.3, -2.6]} distance={18} azimuth={az} elevation={el} fov={28} tilt={tilt} />
      {/* town square ground disc */}
      <mesh geometry={lathe("square-ground", [[0, -0.5], [7.6, -0.5], [7.8, -0.35], [7.8, -0.05], [7.6, 0], [0, 0]], 64)} receiveShadow>
        <ToonMaterial color={pal.stone[0]} />
      </mesh>
      {/* dais */}
      <mesh geometry={lathe("dais", [[0, 0], [1.3, 0], [1.3, 0.35], [1.2, 0.4], [0, 0.4]], 40)} position={[0, 0, 1.6]} castShadow receiveShadow>
        <ToonMaterial color={pal.stone[1]} />
      </mesh>
      <PresetCharacter
        preset="king"
        position={[0, 0.4, 1.6]}
        rotation={[0, Math.PI, 0]}
        pose={{ joints: { shoulderR: [-0.2, 0, -2.3], elbowR: [0, 0, -0.3] }, handR: "hold" }}
        face={{ expression: cheer > 0.5 ? "laughing" : "proud" }}
        capeLift={0.2}
      />
      <Crowd count={130} era="medieval" area={[13, 5.5]} position={[0, 0, -4.6]} lookAt={[0, 1, 1.6]} cheer={cheer} wave={0.6} seed="town" />
      <SoftShadow position={[0, 0.41, 1.6]} radius={0.6} />
    </Stage>
  );
};
