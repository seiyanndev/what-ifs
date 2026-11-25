import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ACTION_NAMES, Performer, type ActionName } from "../kit/actions";
import { talkFromWords, type PresetId, type WordTiming } from "../kit/characters";
import { ERA_PALETTES, horizonY, OrbitCamera, PaintedBackdrop, SoftShadow, Stage } from "../kit/look";
import { FONT, SHEET_BG } from "./CostumeSheets";
import { Column, Cypress, DioramaBase, Fountain, Pot } from "./LookTest";

/** Who demonstrates each action (props that suit the move). */
const WHO: Partial<Record<ActionName, PresetId>> = {
  walk: "explorer",
  run: "roman_soldier",
  talk: "news_anchor",
  point: "news_anchor",
  wave: "modern_adult",
  cheer: "viking",
  bow: "lord",
  salute: "napoleon",
  sword_raise: "knight",
  fight_clash: "samurai",
  fall: "spanish_soldier",
  sit: "monk",
  write: "gutenberg",
  read_scroll: "roman_engineer",
  crank_machine: "inventor",
  look_up: "zheng_he",
  look_around: "magellan",
  shrug: "peasant",
  facepalm: "lord",
  celebrate_jump: "modern_adult",
  nod: "queen",
  shake_head: "scholar_greek",
  kneel: "knight",
  give_item: "ming_sailor",
  sail_steer: "explorer",
  idle: "lapulapu",
};

/** All 26 actions playing at once (walk/run in place). 1920×1080. */
export const ActionsGrid: React.FC<{ only?: ActionName[]; cols?: number; dist?: number }> = ({ only, cols = 9, dist = 46 }) => {
  const names = only ?? ACTION_NAMES;
  const sx = 1.6;
  const sy = 3.0;
  const fov = 13;
  const viewH = 2 * dist * Math.tan((fov * Math.PI) / 360);
  const viewW = (viewH * 16) / 9;
  return (
    <Stage
      timeOfDay="day"
      background={SHEET_BG}
      shadowSize={10}
      overlay={
        <AbsoluteFill>
          {names.map((a, i) => {
            const c = i % cols;
            const r = Math.floor(i / cols);
            const x = 0.5 + ((c - (cols - 1) / 2) * sx) / viewW;
            const rows = Math.ceil(names.length / cols);
            const y = 0.5 - (((rows - 1) / 2 - r) * sy - 0.5 - 0.1 - 1.1) / viewH;
            return (
              <div key={a} style={{ ...FONT, position: "absolute", left: `${x * 100}%`, top: `${y * 100}%`, transform: "translateX(-50%)", fontSize: 18, letterSpacing: 1, whiteSpace: "nowrap" }}>
                {a.toUpperCase().replace("_", " ")}
              </div>
            );
          })}
        </AbsoluteFill>
      }
    >
      <OrbitCamera target={[0, 1.1, 0]} distance={dist} azimuth={0} elevation={6} fov={fov} />
      {names.map((a, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const rows = Math.ceil(names.length / cols);
        const pos: [number, number, number] = [(c - (cols - 1) / 2) * sx, ((rows - 1) / 2 - r) * sy - 0.5, 0];
        const sideways = a === "walk" || a === "run" || a === "fall" || a === "bow" || a === "kneel" || a === "sit";
        return (
          <group key={a}>
            <SoftShadow position={[pos[0], pos[1] + 0.005, 0]} radius={0.55} opacity={0.4} />
            <Performer preset={WHO[a] ?? "modern_adult"} id={`act-${a}`} position={pos} heading={sideways ? 60 : -15} inPlace cues={[{ action: "idle", at: 0 }, { action: a, at: 10 }]} />
          </group>
        );
      })}
    </Stage>
  );
};

// ---------------------------------------------------------------------------
// 15 s showreel: three presets act out a tiny scene on the plaza diorama.
// ---------------------------------------------------------------------------

const LINE: WordTiming[] = [
  { word: "Join", start: 3.1, end: 3.4 },
  { word: "the", start: 3.42, end: 3.55 },
  { word: "crown", start: 3.6, end: 4.0 },
  { word: "of", start: 4.05, end: 4.15 },
  { word: "Spain", start: 4.2, end: 4.7 },
  { word: "and", start: 4.9, end: 5.05 },
  { word: "all", start: 5.1, end: 5.3 },
  { word: "this", start: 5.35, end: 5.6 },
  { word: "is", start: 5.65, end: 5.8 },
  { word: "yours!", start: 5.85, end: 6.4 },
];

export const Showreel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = interpolate(frame, [0, 449], [0, 1]);
  const az = interpolate(t, [0, 1], [-10, 9]);
  const dist = interpolate(t, [0, 1], [21, 17.5]);
  const el = 13;
  const tilt = 4;
  const pal = ERA_PALETTES.ancient;
  const talk = talkFromWords(LINE, frame / fps);
  // Zheng He runs from the back to beside the fountain
  const zhStart: [number, number, number] = [2.4, 0.07, -4.6];
  const zhHeading = (Math.atan2(-2.3, 3.75) * 180) / Math.PI;
  return (
    <Stage
      timeOfDay="day"
      shadowSize={6}
      backdrop={<PaintedBackdrop timeOfDay="day" horizon={horizonY(el, tilt, 28)} pan={az} colors={[pal.stone[1], "#b59a66", pal.foliage[0], pal.foliage[1]]} />}
    >
      <OrbitCamera target={[0, 1.1, -0.3]} distance={dist} azimuth={az} elevation={el} fov={28} tilt={tilt} />
      <SoftShadow position={[0, -0.92, 0]} radius={7} opacity={0.4} />
      <DioramaBase />
      <Fountain position={[0.3, 0.07, -2.3]} />
      <Column position={[-2.6, 0.07, -2.6]} />
      <Column position={[2.9, 0.07, -2.5]} />
      <Cypress position={[-3.6, 0.07, -1.2]} />
      <Cypress position={[3.6, 0.07, -0.9]} scale={0.85} />
      <Pot position={[-2.2, 0.07, 2.2]} />

      <Performer
        preset="magellan"
        position={[-3.6, 0.07, 0.8]}
        heading={90}
        face={frame > 90 && frame < 200 ? { talk } : undefined}
        cues={[
          { action: "walk", at: 0 },
          { action: "idle", at: 72, heading: 35 },
          { action: "talk", at: 88 },
          { action: "point", at: 150, params: { hand: "left" } },
          { action: "talk", at: 175 },
          { action: "shrug", at: 222 },
          { action: "facepalm", at: 262, params: { hand: "right" } },
          { action: "idle", at: 300, heading: 55 },
          { action: "bow", at: 352 },
          { action: "cheer", at: 405 },
        ]}
      />
      <Performer
        preset="lapulapu"
        position={[1.45, 0.07, 0.4]}
        heading={-35}
        cues={[
          { action: "idle", at: 0 },
          { action: "look_around", at: 25 },
          { action: "idle", at: 100 },
          { action: "shake_head", at: 160 },
          { action: "sword_raise", at: 205 },
          { action: "idle", at: 300, heading: -60 },
          { action: "nod", at: 360 },
          { action: "sword_raise", at: 405, expression: "laughing" },
        ]}
      />
      <Performer
        preset="zheng_he"
        position={zhStart}
        heading={zhHeading}
        cues={[
          { action: "idle", at: 0 },
          { action: "run", at: 252 },
          { action: "wave", at: 303, heading: 0 },
          { action: "celebrate_jump", at: 340 },
          { action: "cheer", at: 405 },
        ]}
      />
    </Stage>
  );
};
