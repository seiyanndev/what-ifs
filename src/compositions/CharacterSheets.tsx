import { AbsoluteFill } from "remotion";
import { BODY_TYPES, Body, Hand, HAND_POSES, type HandPoseName, type Pose } from "../kit/characters";
import { OrbitCamera, SKIN_TONES, SoftShadow, Stage } from "../kit/look";

// Review sheets for step 3a. Rendered as stills to out/char/.

const SHEET_BG = "radial-gradient(ellipse at 50% 40%, #fbf4e8 0%, #efe3cf 60%, #e2d2b8 100%)";

const Label: React.FC<{ x: number; y: number; children: React.ReactNode; size?: number }> = ({ x, y, children, size = 34 }) => (
  <div
    style={{
      position: "absolute",
      left: `${x * 100}%`,
      top: `${y * 100}%`,
      transform: "translateX(-50%)",
      fontFamily: "Helvetica, Arial, sans-serif",
      fontWeight: 800,
      fontSize: size,
      letterSpacing: 2,
      color: "#5b4636",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </div>
);

const A_POSE: Pose = { handL: "relaxed", handR: "relaxed" };

/** Front · 3/4 · side · back of the standard body. 2400×1350. */
export const BaseTurnaround: React.FC = () => {
  const views = [
    { label: "FRONT", rot: 0 },
    { label: "3/4", rot: -Math.PI / 4 },
    { label: "SIDE", rot: -Math.PI / 2 },
    { label: "BACK", rot: Math.PI },
  ];
  const spacing = 1.55;
  return (
    <Stage
      timeOfDay="day"
      background={SHEET_BG}
      shadowSize={4}
      overlay={
        <AbsoluteFill>
          <Label x={0.5} y={0.035} size={44}>
            BASE FIGURINE — STANDARD BODY
          </Label>
          {views.map((v, i) => (
            <Label key={v.label} x={0.5 + ((i - 1.5) * spacing) / 6.55} y={0.9}>
              {v.label}
            </Label>
          ))}
        </AbsoluteFill>
      }
    >
      <OrbitCamera target={[0, 1.2, 0]} distance={17} azimuth={0} elevation={5} fov={12.5} />
      {views.map((v, i) => {
        const x = (i - 1.5) * spacing;
        return (
          <group key={v.label}>
            <SoftShadow position={[x, 0.005, 0]} radius={0.55} opacity={0.5} />
            <Body position={[x, 0, 0]} rotation={[0, v.rot, 0]} pose={A_POSE} id={`turn-${i}`} />
          </group>
        );
      })}
    </Stage>
  );
};

/** Body types × skin tones. 2400×1350. */
export const BaseVariants: React.FC = () => {
  const types = Object.entries(BODY_TYPES);
  const skins = [0, 2, 4, 6, 7, 9, 5];
  const shirts = ["#e9e2d2", "#b5463c", "#3f6f9a", "#8fa35a", "#c9962e", "#7a5aa8", "#d9b47e"];
  const spacing = 1.3;
  const viewW = 10.6;
  return (
    <Stage
      timeOfDay="day"
      background={SHEET_BG}
      shadowSize={6}
      overlay={
        <AbsoluteFill>
          <Label x={0.5} y={0.035} size={44}>
            BODY TYPES · SKIN TONES
          </Label>
          {types.map(([name], i) => (
            <Label key={name} x={0.5 + ((i - (types.length - 1) / 2) * spacing) / viewW} y={0.88} size={30}>
              {name.toUpperCase()}
            </Label>
          ))}
        </AbsoluteFill>
      }
    >
      <OrbitCamera target={[0, 1.12, 0]} distance={30} azimuth={0} elevation={4} fov={11.3} />
      {types.map(([name, shape], i) => {
        const x = (i - (types.length - 1) / 2) * spacing;
        return (
          <group key={name}>
            <SoftShadow position={[x, 0.005, 0]} radius={0.5} opacity={0.45} />
            <Body
              position={[x, 0, 0]}
              rotation={[0, -0.35, 0]}
              shape={shape}
              skin={SKIN_TONES[skins[i]]}
              colors={{ shirt: shirts[i] }}
              id={name}
            />
          </group>
        );
      })}
    </Stage>
  );
};

/** Close-up of every hand pose (right hand, back + palm views). 2400×1350. */
export const HandPoses: React.FC = () => {
  const hands = Object.keys(HAND_POSES) as HandPoseName[];
  const spacing = 0.5;
  const viewW = 3.15;
  return (
    <Stage
      timeOfDay="day"
      background={SHEET_BG}
      shadowSize={3}
      overlay={
        <AbsoluteFill>
          <Label x={0.5} y={0.035} size={44}>
            HAND POSES (MITTEN + THUMB + INDEX)
          </Label>
          {hands.map((name, i) => (
            <Label key={name} x={0.5 + ((i - (hands.length - 1) / 2) * spacing) / viewW} y={0.88} size={32}>
              {name.toUpperCase()}
            </Label>
          ))}
          <Label x={0.028} y={0.33} size={24}>
            BACK
          </Label>
          <Label x={0.028} y={0.65} size={24}>
            PALM
          </Label>
        </AbsoluteFill>
      }
    >
      <OrbitCamera target={[0, 0, 0]} distance={20} azimuth={0} elevation={0} fov={5.1} />
      {hands.map((name, i) => {
        const x = (i - (hands.length - 1) / 2) * spacing;
        return (
          <group key={name}>
            {/* fingers up, back of hand to camera */}
            <group position={[x, 0.08, 0]} rotation={[0, Math.PI, Math.PI]}>
              <Hand side={-1} shape={HAND_POSES[name]} color={SKIN_TONES[3]} scale={1.6} />
            </group>
            {/* fingers up, palm to camera */}
            <group position={[x, -0.52, 0]} rotation={[0, 0, Math.PI]}>
              <Hand side={-1} shape={HAND_POSES[name]} color={SKIN_TONES[3]} scale={1.6} />
            </group>
          </group>
        );
      })}
    </Stage>
  );
};

/** Quick rig check: joints bend the right way. 2400×1350. */
export const RigTest: React.FC = () => {
  const poses: { label: string; pose: Pose; rot: number }[] = [
    {
      label: "POINT",
      rot: 0.3,
      pose: {
        joints: { shoulderR: [-1.45, 0.25, 0.15], elbowR: [-0.1, 0, 0], head: [0, -0.3, 0], chest: [0, -0.15, 0] },
        handR: "point",
      },
    },
    {
      label: "CHEER",
      rot: 0,
      pose: {
        joints: { shoulderL: [0, 0, 2.5], shoulderR: [0, 0, -2.5], elbowL: [0, 0, 0.3], elbowR: [0, 0, -0.3], head: [-0.25, 0, 0] },
        handL: "fist",
        handR: "fist",
        rootOffset: [0, 0.12, 0],
        stretch: 1.06,
      },
    },
    {
      label: "STEP",
      rot: -0.9,
      pose: {
        joints: {
          legL: [-0.55, 0, 0],
          kneeL: [0.35, 0, 0],
          ankleL: [0.2, 0, 0],
          legR: [0.35, 0, 0],
          kneeR: [0.45, 0, 0],
          ankleR: [-0.25, 0, 0],
          shoulderL: [0.5, 0, 0],
          shoulderR: [-0.5, 0, 0],
          elbowL: [-0.5, 0, 0],
          elbowR: [-0.5, 0, 0],
          spine: [0.08, 0, 0],
        },
        rootOffset: [0, -0.03, 0],
      },
    },
    {
      label: "WAVE",
      rot: 0.15,
      pose: {
        joints: { shoulderL: [0, 0, 2.2], elbowL: [0, 0, 0.6], wristL: [0, 0, 0], head: [0, 0, -0.2], hips: [0, 0, 0.04] },
        handL: "wave",
      },
    },
    {
      label: "SQUASH",
      rot: 0,
      pose: {
        joints: { kneeL: [0.5, 0, 0], kneeR: [0.5, 0, 0], legL: [-0.45, 0, 0], legR: [-0.45, 0, 0], spine: [0.3, 0, 0], shoulderL: [-0.4, 0, 0.4], shoulderR: [-0.4, 0, -0.4] },
        rootOffset: [0, -0.08, 0],
        stretch: 0.86,
        handL: "fist",
        handR: "fist",
      },
    },
  ];
  const spacing = 1.5;
  const viewW = 8.1;
  return (
    <Stage
      timeOfDay="day"
      background={SHEET_BG}
      shadowSize={5}
      overlay={
        <AbsoluteFill>
          <Label x={0.5} y={0.035} size={44}>
            RIG TEST — RIGID JOINTS, NO SKINNING
          </Label>
          {poses.map((p, i) => (
            <Label key={p.label} x={0.5 + ((i - (poses.length - 1) / 2) * spacing) / viewW} y={0.88} size={30}>
              {p.label}
            </Label>
          ))}
        </AbsoluteFill>
      }
    >
      <OrbitCamera target={[0, 1.25, 0]} distance={26} azimuth={0} elevation={5} fov={10} />
      {poses.map((p, i) => {
        const x = (i - (poses.length - 1) / 2) * spacing;
        return (
          <group key={p.label}>
            <SoftShadow position={[x, 0.005, 0]} radius={0.5} opacity={0.45} />
            <Body position={[x, 0, 0]} rotation={[0, p.rot, 0]} pose={p.pose} skin={SKIN_TONES[i * 2]} id={p.label} />
          </group>
        );
      })}
    </Stage>
  );
};
