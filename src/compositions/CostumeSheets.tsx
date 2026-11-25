import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import {
  Body,
  bodyDims,
  DEFAULT_SHAPE,
  HAIR_COLORS,
  HAIR_STYLES,
  Hair,
  HEADWEAR_TYPES,
  Headwear,
  WizardBeard,
  type BodyPart,
} from "../kit/characters";
import { Character, PROP_TYPES, Prop, type CostumeSpec, type Pose } from "../kit/characters";
import { OrbitCamera, SKIN_TONES, SoftShadow, Stage } from "../kit/look";

export const SHEET_BG = "radial-gradient(ellipse at 50% 40%, #fbf4e8 0%, #efe3cf 60%, #e2d2b8 100%)";
export const FONT: React.CSSProperties = { fontFamily: "Helvetica, Arial, sans-serif", fontWeight: 800, color: "#5b4636", letterSpacing: 2 };

const HEAD_ONLY: Partial<Record<BodyPart, boolean>> = {
  pelvis: true,
  torso: true,
  upperArms: true,
  forearms: true,
  hands: true,
  thighs: true,
  shins: true,
  feet: true,
};
const HEAD_Y = bodyDims(DEFAULT_SHAPE).total - 0.5 * 0.96 * 0.97;

/** Hair styles (row 1) and all headwear (rows 2–3) on heads. 2400×1500. */
export const HeadgearSheet: React.FC = () => {
  const hairColors = Object.values(HAIR_COLORS);
  const rows: { label: string; node: React.ReactNode; beard?: boolean }[][] = [
    HAIR_STYLES.map((h, i) => ({ label: h, node: <Hair style={h} color={hairColors[i % hairColors.length]} /> })),
    HEADWEAR_TYPES.slice(0, 8).map((t) => ({ label: t, node: <Headwear type={t} /> })),
    [
      ...HEADWEAR_TYPES.slice(8).map((t) => ({ label: t, node: <Headwear type={t} /> })),
      { label: "wizard beard", node: <><Hair style="bald" color={HAIR_COLORS.white} /><WizardBeard color={HAIR_COLORS.white} /></>, beard: true },
    ],
  ];
  const sx = 1.45;
  const sy = 1.75;
  const viewH = 2 * 40 * Math.tan((11.2 * Math.PI) / 360);
  const viewW = viewH * 1.6;
  return (
    <Stage
      timeOfDay="day"
      background={SHEET_BG}
      overlay={
        <AbsoluteFill>
          <div style={{ ...FONT, position: "absolute", top: 26, width: "100%", textAlign: "center", fontSize: 44 }}>HAIR · HEADWEAR</div>
          {rows.map((row, r) =>
            row.map((it, c) => {
              const x = 0.5 + ((c - 3.5) * sx) / viewW;
              const y = 0.5 - ((1 - r) * sy - 0.68 - 0.1) / viewH;
              return (
                <div key={`${r}-${c}`} style={{ ...FONT, position: "absolute", left: `${x * 100}%`, top: `${y * 100}%`, transform: "translateX(-50%)", fontSize: 24, whiteSpace: "nowrap" }}>
                  {it.label.toUpperCase()}
                </div>
              );
            }),
          )}
        </AbsoluteFill>
      }
    >
      <OrbitCamera target={[0, 0.1, 0]} distance={40} azimuth={0} elevation={8} fov={11.2} />
      {rows.map((row, r) =>
        row.map((it, c) => (
          <Body
            key={`${r}-${c}`}
            id={`hg-${r}-${c}`}
            position={[(c - 3.5) * sx, (1 - r) * sy - HEAD_Y, 0]}
            rotation={[0, -0.35, 0]}
            skin={SKIN_TONES[(r * 3 + c) % 10]}
            hide={HEAD_ONLY}
            face={{ expression: "neutral", facialHair: it.beard ? { mustache: "walrus", color: HAIR_COLORS.white } : undefined }}
            attach={{ head: it.node }}
          />
        )),
      )}
    </Stage>
  );
};

// ---------------------------------------------------------------------------
// Costume combos (all 14 outfits) and the props line-up
// ---------------------------------------------------------------------------

const HOLD_R: Pose = { joints: { shoulderR: [-0.45, 0, 0.05], elbowR: [-0.75, 0, 0] } };
const HOLD_BOTH: Pose = { joints: { shoulderR: [-0.45, 0, 0.05], elbowR: [-0.75, 0, 0], shoulderL: [-0.25, 0, 0], elbowL: [-0.5, 0, 0] } };

export const COSTUME_COMBOS: { label: string; skin: number; costume: CostumeSpec; pose?: Pose }[] = [
  { label: "toga", skin: 2, costume: { outfit: { type: "toga" }, hair: { style: "short", color: HAIR_COLORS.darkBrown }, headwear: { type: "laurel" }, props: { right: { type: "scroll" } } }, pose: HOLD_R },
  { label: "legionary", skin: 4, costume: { outfit: { type: "legionary" }, headwear: { type: "galea" }, props: { right: { type: "spear" }, left: { type: "shield" } } }, pose: HOLD_R },
  { label: "peasant", skin: 3, costume: { outfit: { type: "peasantTunic" }, hair: { style: "curly", color: HAIR_COLORS.auburn }, props: { right: { type: "torch" } } }, pose: HOLD_R },
  { label: "monk", skin: 1, costume: { outfit: { type: "monkRobe" }, headwear: { type: "monkHood" }, props: { right: { type: "book" } } }, pose: HOLD_R },
  { label: "royal robe + cape", skin: 5, costume: { outfit: { type: "royalRobe" }, hair: { style: "short", color: HAIR_COLORS.grey }, facialHair: { beard: "full", mustache: "full" }, headwear: { type: "crown" }, props: { right: { type: "globe" } } }, pose: HOLD_R },
  { label: "knight", skin: 0, costume: { outfit: { type: "knightArmor" }, hair: { style: "short", color: HAIR_COLORS.blonde }, props: { right: { type: "sword" }, left: { type: "shield", color: "#2f5fa8", accent: "#d6a444" } } }, pose: HOLD_R },
  { label: "explorer coat", skin: 3, costume: { outfit: { type: "explorerCoat" }, hair: { style: "ponytail", color: HAIR_COLORS.brown }, headwear: { type: "tricorne" }, props: { right: { type: "telescope" } } }, pose: HOLD_R },
  { label: "napoleonic", skin: 1, costume: { outfit: { type: "napoleonic" }, hair: { style: "short", color: HAIR_COLORS.darkBrown }, headwear: { type: "bicorne" }, props: { right: { type: "map" } } }, pose: HOLD_R },
  { label: "ming robe", skin: 2, costume: { outfit: { type: "mingRobe" }, hair: { style: "bun", color: HAIR_COLORS.black }, headwear: { type: "mingHat" }, facialHair: { mustache: "thin", beard: "goatee" }, props: { right: { type: "scroll" } } }, pose: HOLD_R },
  { label: "samurai", skin: 3, costume: { outfit: { type: "samurai" }, headwear: { type: "kabuto" }, props: { right: { type: "sword" } } }, pose: HOLD_R },
  { label: "filipino warrior", skin: 6, costume: { outfit: { type: "filipinoWarrior" }, hair: { style: "long", color: HAIR_COLORS.black }, props: { right: { type: "kampilan" }, left: { type: "shield", color: "#7a4d2e", accent: "#b8864b" } } }, pose: HOLD_R },
  { label: "scholar robe", skin: 7, costume: { outfit: { type: "scholarRobe" }, hair: { style: "bald", color: HAIR_COLORS.white }, facialHair: { wizard: true, mustache: "walrus", color: HAIR_COLORS.white }, props: { right: { type: "quill" } } }, pose: HOLD_R },
  { label: "modern casual", skin: 8, costume: { outfit: { type: "modernCasual", colors: { main: "#f2b134" } }, hair: { style: "braids", color: HAIR_COLORS.black }, headwear: { type: "hardHat" }, props: { right: { type: "gears" } } }, pose: HOLD_R },
  { label: "suit", skin: 4, costume: { outfit: { type: "suit" }, hair: { style: "short", color: HAIR_COLORS.darkBrown }, props: { right: { type: "flag", color: "#2f6fd6", accent: "#f5f7fa" } } }, pose: HOLD_BOTH },
];

/** 14 dressed figures. 2400×1500. */
export const CostumesSheet: React.FC = () => {
  const cols = 7;
  const sx = 1.55;
  const sy = 3.25;
  const viewH = 2 * 40 * Math.tan((10 * Math.PI) / 360);
  const viewW = viewH * 1.6;
  return (
    <Stage
      timeOfDay="day"
      background={SHEET_BG}
      shadowSize={7}
      overlay={
        <AbsoluteFill>
          <div style={{ ...FONT, position: "absolute", top: 20, width: "100%", textAlign: "center", fontSize: 44 }}>COSTUMES</div>
          {COSTUME_COMBOS.map((it, i) => {
            const c = i % cols;
            const r = Math.floor(i / cols);
            const x = 0.5 + ((c - (cols - 1) / 2) * sx) / viewW;
            const y = 0.5 - ((0.5 - r) * sy - 0.5 - 0.12 - 1.1) / viewH;
            return (
              <div key={it.label} style={{ ...FONT, position: "absolute", left: `${x * 100}%`, top: `${y * 100}%`, transform: "translateX(-50%)", fontSize: 24, whiteSpace: "nowrap" }}>
                {it.label.toUpperCase()}
              </div>
            );
          })}
        </AbsoluteFill>
      }
    >
      <OrbitCamera target={[0, 1.1, 0]} distance={40} azimuth={0} elevation={5} fov={10} />
      {COSTUME_COMBOS.map((it, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const x = (c - (cols - 1) / 2) * sx;
        const y = (0.5 - r) * sy - 0.5;
        return (
          <group key={it.label} position={[x, y, 0]}>
            <SoftShadow radius={0.55} opacity={0.45} />
            <Character id={`c-${i}`} rotation={[0, -0.35, 0]} skin={SKIN_TONES[it.skin]} costume={it.costume} pose={it.pose} face={{ expression: "neutral" }} />
          </group>
        );
      })}
    </Stage>
  );
};

/** Every prop, standing. 2400×1000. */
export const PropsSheet: React.FC = () => {
  const cols = 8;
  const sx = 0.95;
  const sy = 1.7;
  const viewH = 2 * 30 * Math.tan((7.5 * Math.PI) / 360);
  const viewW = viewH * 2.4;
  return (
    <Stage
      timeOfDay="day"
      background={SHEET_BG}
      shadowSize={5}
      overlay={
        <AbsoluteFill>
          <div style={{ ...FONT, position: "absolute", top: 20, width: "100%", textAlign: "center", fontSize: 40 }}>PROPS</div>
          {PROP_TYPES.map((p, i) => {
            const c = i % cols;
            const r = Math.floor(i / cols);
            const x = 0.5 + ((c - (cols - 1) / 2) * sx) / viewW;
            const y = 0.5 - ((0.5 - r) * sy - 0.45 - 0.2 - 0.1) / viewH;
            return (
              <div key={p} style={{ ...FONT, position: "absolute", left: `${x * 100}%`, top: `${y * 100}%`, transform: "translateX(-50%)", fontSize: 22, whiteSpace: "nowrap" }}>
                {p.toUpperCase()}
              </div>
            );
          })}
        </AbsoluteFill>
      }
    >
      <OrbitCamera target={[0, 0.1, 0]} distance={30} azimuth={0} elevation={8} fov={7.5} />
      {PROP_TYPES.map((p, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const tall = p === "spear" || p === "flag";
        return (
          <group key={p} position={[(c - (cols - 1) / 2) * sx, (0.5 - r) * sy - 0.45, 0]} rotation={[0, -0.5, 0]} scale={tall ? 0.55 : 1}>
            <Prop type={p} />
          </group>
        );
      })}
    </Stage>
  );
};

/** 4 s turntable: cape sway, waving flag, torch flame, in the look-dev world. 1080×1920. */
export const CostumeTurntable: React.FC = () => {
  const frame = useCurrentFrame();
  const spin = interpolate(frame, [0, 120], [-0.6, 0.6]);
  const cast = [COSTUME_COMBOS[2], COSTUME_COMBOS[4], COSTUME_COMBOS[13]];
  return (
    <Stage timeOfDay="sunset" shadowSize={4} background="linear-gradient(#5d5aa8, #e8889a 55%, #ffc583)">
      <OrbitCamera target={[0, 1.0, 0]} distance={17} azimuth={spin * 20} elevation={9} fov={24} tilt={3} />
      {cast.map((it, i) => (
        <group key={it.label} position={[(i - 1) * 1.2, 0, i === 1 ? -0.6 : 0]}>
          <SoftShadow radius={0.6} opacity={0.5} />
          <Character
            id={`tt-${i}`}
            rotation={[0, (i - 1) * -0.3 + (i === 1 ? spin * 2.2 : spin), 0]}
            skin={SKIN_TONES[it.skin]}
            costume={it.costume}
            pose={it.pose}
            face={{ expression: (["happy", "proud", "determined"] as const)[i] }}
            capeLift={0.15 + 0.1 * Math.sin(frame / 20)}
          />
        </group>
      ))}
    </Stage>
  );
};
