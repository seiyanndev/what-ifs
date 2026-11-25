import { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  Body,
  BROWS,
  drawFace,
  EXPRESSIONS,
  EYES,
  Face,
  MOUTHS,
  talkFromWords,
  VISEMES,
  type Expression,
  type ExpressionName,
  type FacialHair,
  type WordTiming,
} from "../kit/characters";
import { Ink, OrbitCamera, SKIN_TONES, SoftShadow, Stage, ToonMaterial } from "../kit/look";

const SHEET_BG = "radial-gradient(ellipse at 50% 40%, #fbf4e8 0%, #efe3cf 60%, #e2d2b8 100%)";
const FONT: React.CSSProperties = { fontFamily: "Helvetica, Arial, sans-serif", fontWeight: 800, color: "#5b4636", letterSpacing: 2 };

/** Head-only bust for sheets: toon head + ears + face. */
const Head: React.FC<{ skin: string; expression: ExpressionName; position: [number, number, number]; rotation: [number, number, number]; id: string }> = ({
  skin,
  expression,
  position,
  rotation,
  id,
}) => (
  <group position={position} rotation={rotation}>
    <mesh scale={[1.04, 0.97, 1]}>
      <sphereGeometry args={[0.5, 48, 32]} />
      <ToonMaterial color={skin} ramp="soft" />
      <Ink weight="character" />
    </mesh>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * 0.5, -0.04, -0.025]} scale={[0.05, 0.085, 0.065]}>
        <sphereGeometry args={[1, 16, 12]} />
        <ToonMaterial color={skin} ramp="soft" />
      </mesh>
    ))}
    <Face r={0.5} id={id} expression={expression} blink={false} />
  </group>
);

/** Head tilt that sells each expression on the sheet. */
const TILT: Partial<Record<ExpressionName, [number, number, number]>> = {
  proud: [-0.22, 0.15, 0.05],
  sad: [0.25, 0, 0],
  crying: [0.15, 0, 0.08],
  thinking: [-0.1, -0.25, 0.15],
  smirk: [0, 0.25, -0.1],
  defeated: [0.35, 0, 0],
  scared: [0.08, 0.2, 0],
  angry: [0.12, 0, 0],
  determined: [0.1, -0.1, 0],
  wonder: [-0.18, 0, 0],
  laughing: [-0.15, 0, 0.08],
};

/** All 15 expression presets. 2400×1500. */
export const ExpressionsSheet: React.FC = () => {
  const names = Object.keys(EXPRESSIONS) as ExpressionName[];
  const cols = 5;
  const sx = 1.42;
  const sy = 1.55;
  const viewH = 2 * 30 * Math.tan((10.6 * Math.PI) / 360);
  const viewW = viewH * 1.6;
  return (
    <Stage
      timeOfDay="day"
      background={SHEET_BG}
      overlay={
        <AbsoluteFill>
          <div style={{ ...FONT, position: "absolute", top: 34, width: "100%", textAlign: "center", fontSize: 46 }}>EXPRESSION PRESETS</div>
          {names.map((n, i) => {
            const c = i % cols;
            const r = Math.floor(i / cols);
            const x = 0.5 + ((c - (cols - 1) / 2) * sx) / viewW;
            const y = 0.5 - ((1 - r) * sy - 0.56 + 0.15) / viewH;
            return (
              <div key={n} style={{ ...FONT, position: "absolute", left: `${x * 100}%`, top: `${y * 100}%`, transform: "translateX(-50%)", fontSize: 30 }}>
                {n.toUpperCase()}
              </div>
            );
          })}
        </AbsoluteFill>
      }
    >
      <OrbitCamera target={[0, -0.15, 0]} distance={30} azimuth={0} elevation={0} fov={10.6} />
      {names.map((n, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        return (
          <Head
            key={n}
            id={n}
            expression={n}
            skin={SKIN_TONES[[1, 3, 5, 7, 2][c]]}
            position={[(c - (cols - 1) / 2) * sx, (1 - r) * sy, 0]}
            rotation={TILT[n] ?? [0, 0, 0]}
          />
        );
      })}
    </Stage>
  );
};

// ---------------------------------------------------------------------------
// 2D parts library (direct canvas drawing — the exact same drawFace used on heads)
// ---------------------------------------------------------------------------
const Swatch: React.FC<{ expr: Expression; label: string; facialHair?: FacialHair; skin?: string; size?: number }> = ({
  expr,
  label,
  facialHair,
  skin = SKIN_TONES[2],
  size = 190,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) drawFace(ctx, 400, { expression: expr, look: expr.look, blink: 1, frame: frame + 10, browColor: "#3b2418", facialHair, seed: label });
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ width: size, height: size, borderRadius: "50%", background: skin, boxShadow: "inset -10px -14px 0 rgba(120,80,110,0.18), 0 0 0 5px #2f2a3a", overflow: "hidden" }}>
        <canvas ref={ref} width={400} height={400} style={{ width: size, height: size }} />
      </div>
      <div style={{ ...FONT, fontSize: 20 }}>{label}</div>
    </div>
  );
};

const N = EXPRESSIONS.neutral;
const Row: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
    <div style={{ ...FONT, width: 190, fontSize: 26, textAlign: "right" }}>{title}</div>
    <div style={{ display: "flex", gap: 22 }}>{children}</div>
  </div>
);

/** Every eye / brow / mouth / viseme / extra / facial-hair layer. 2400×1500. */
export const FacePartsSheet: React.FC = () => (
  <AbsoluteFill style={{ background: SHEET_BG, padding: "40px 50px", gap: 18, display: "flex", flexDirection: "column" }}>
    <div style={{ ...FONT, fontSize: 46, textAlign: "center" }}>FACE LAYERS</div>
    <Row title="EYES">
      {Object.entries(EYES).map(([k, e]) => (
        <Swatch key={k} label={k} expr={{ ...N, eyeL: e, eyeR: e, mouth: MOUTHS.neutral }} size={182} />
      ))}
    </Row>
    <Row title="BROWS">
      {Object.entries(BROWS)
        .filter(([k]) => k !== "none")
        .map(([k, b]) => (
          <Swatch key={k} label={k} expr={{ ...N, browL: b, browR: b }} size={182} />
        ))}
      <Swatch label="skeptical" expr={{ ...N, browL: BROWS.raised, browR: BROWS.low }} size={182} />
    </Row>
    <Row title="MOUTHS">
      {Object.entries(MOUTHS).map(([k, m]) => (
        <Swatch key={k} label={k} expr={{ ...N, mouth: m }} size={182} />
      ))}
    </Row>
    <Row title="TALKING">
      {Object.entries(VISEMES).map(([k, m]) => (
        <Swatch key={k} label={k} expr={{ ...N, mouth: m }} size={182} />
      ))}
    </Row>
    <Row title="EXTRAS">
      <Swatch label="blush" expr={{ ...N, extras: { ...N.extras, blush: 1 } }} size={182} />
      <Swatch label="sweat" expr={{ ...N, extras: { ...N.extras, sweat: 1 } }} size={182} />
      <Swatch label="tears" expr={{ ...N, extras: { ...N.extras, tears: 1 } }} size={182} />
      <Swatch label="anger" expr={{ ...N, extras: { ...N.extras, anger: 1 } }} size={182} />
      <Swatch label="mustache" expr={N} facialHair={{ mustache: "full" }} size={182} />
      <Swatch label="walrus" expr={N} facialHair={{ mustache: "walrus", color: "#8a8a8a" }} size={182} />
      <Swatch label="curled" expr={N} facialHair={{ mustache: "curled" }} size={182} />
      <Swatch label="stubble" expr={N} facialHair={{ beard: "stubble" }} size={182} />
      <Swatch label="goatee" expr={N} facialHair={{ beard: "goatee", mustache: "thin" }} size={182} />
      <Swatch label="full beard" expr={N} facialHair={{ beard: "full", mustache: "full", color: "#5a3a22" }} size={182} />
    </Row>
  </AbsoluteFill>
);

// ---------------------------------------------------------------------------
// Talk test: a narrator figurine says a line, blinks, glances, changes expression.
// ---------------------------------------------------------------------------
const LINE: WordTiming[] = [
  { word: "What", start: 0.35, end: 0.6 },
  { word: "if", start: 0.62, end: 0.78 },
  { word: "Magellan", start: 0.82, end: 1.42 },
  { word: "never", start: 1.48, end: 1.8 },
  { word: "left", start: 1.84, end: 2.1 },
  { word: "Spain?", start: 2.14, end: 2.75 },
];

export const FaceTalkTest: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const talk = talkFromWords(LINE, t);
  // neutral → wonder at the end of the question, glance away and back
  const lookX = interpolate(frame, [0, 20, 30, 60, 70, 120], [0, 0, -0.6, -0.6, 0, 0], { extrapolateRight: "clamp" });
  const expression = frame < 88 ? "neutral" : "wonder";
  const nod = Math.sin(frame / 7) * 0.04 * talk.amount;
  return (
    <Stage timeOfDay="day" background="linear-gradient(#9fd0f4, #e6f4ff)" shadowSize={3}>
      <OrbitCamera target={[0, 1.55, 0]} distance={9} azimuth={8} elevation={6} fov={14} tilt={0} />
      <SoftShadow radius={0.6} />
      <Body
        id="narrator"
        skin={SKIN_TONES[4]}
        colors={{ shirt: "#3f6f9a" }}
        face={{ expression, talk, look: [lookX, expression === "wonder" ? 0.35 : 0] }}
        pose={{ joints: { head: [nod, lookX * -0.25, 0], neck: [0, 0, 0] } }}
      />
    </Stage>
  );
};
