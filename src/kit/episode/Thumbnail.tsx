import { AbsoluteFill, random, useVideoConfig } from "remotion";
import { Performer } from "../actions";
import type { ActionName } from "../actions";
import type { ExpressionName, PresetId } from "../characters";
import { FONT_DISPLAY, FONT_STAMP, type TimeOfDay } from "../look";
import { SetScene, SETS, type SetName } from "../sets";

export type ThumbSide = {
  preset: PresetId;
  set?: SetName;
  expression?: ExpressionName;
  /** Action held at its peak for the pose (e.g. sword_raise, cheer, point). */
  action?: ActionName;
  heading?: number;
  timeOfDay?: TimeOfDay;
};

export type ThumbnailSpec = {
  /** REAL side (left, normal grade). */
  left: ThumbSide;
  /** WHAT IF side (right, purple grade). */
  right: ThumbSide;
  /** 2–4 punchy words for the bottom banner (default: the title without "What if"). */
  text?: string;
  /** Small badge, usually the year. */
  badge?: string;
};

const POSE_FRAME = 22; // actions are past their wind-up here and holding the pose

/** One half: a close, low-angle hero shot of a single character. */
const Half: React.FC<{ side: ThumbSide; whatIf: number; shift: number }> = ({ side, whatIf, shift }) => {
  const set = side.set ?? "BEACH";
  const info = SETS[set];
  const pos: [number, number, number] = [0, info.floorY, 1.2];
  return (
    <AbsoluteFill style={{ transform: `translateX(${shift}px)` }}>
      <SetScene
        set={set}
        timeOfDay={side.timeOfDay}
        whatIf={whatIf}
        camera={{ target: [pos[0], pos[1] + 1.62, pos[2]], distance: 6.6, azimuth: 0, elevation: 4, fov: 30, tilt: -1 }}
        move="static"
        duration={60}
      >
        <Performer
          preset={side.preset}
          id={`thumb-${side.preset}-${whatIf}`}
          position={pos}
          heading={side.heading ?? 0}
          cues={[{ action: side.action ?? "idle", at: 0, expression: side.expression }]}
          face={{ blink: false }}
        />
      </SetScene>
    </AbsoluteFill>
  );
};

/**
 * Face-off thumbnail: REAL vs WHAT IF close-ups split by the glowing crack, huge "WHAT IF…?",
 * punchy banner and a year badge. Rendered at frame POSE_FRAME by `npm run episode -- <name> --thumb`.
 */
export const Thumbnail: React.FC<{ spec: ThumbnailSpec; title: string }> = ({ spec, title }) => {
  const { width: W, height: H } = useVideoConfig();
  const text = (spec.text ?? title.replace(/^\s*what\s+if\s*/i, "").replace(/\?\s*$/, "")).toUpperCase();
  // jagged crack, slightly diagonal
  const N = 14;
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const y = (i / N) * H;
    const x = W * (0.56 - 0.12 * (i / N)) + (i === 0 || i === N ? 0 : (random(`tcrack-${i}`) - 0.5) * 90);
    return [x, y] as [number, number];
  });
  const crack = pts.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
  const rightClip = `polygon(${[`${W}px 0px`, ...pts.map(([x, y]) => `${x + 5}px ${y}px`), `${W}px ${H}px`].join(", ")})`;
  const leftClip = `polygon(${["0px 0px", ...pts.map(([x, y]) => `${x - 5}px ${y}px`), `0px ${H}px`].join(", ")})`;
  return (
    <AbsoluteFill style={{ backgroundColor: "#140a24" }}>
      <AbsoluteFill style={{ clipPath: leftClip }}>
        <Half side={spec.left} whatIf={0} shift={-W * 0.2} />
      </AbsoluteFill>
      <AbsoluteFill style={{ clipPath: rightClip }}>
        <Half side={spec.right} whatIf={1} shift={W * 0.2} />
      </AbsoluteFill>
      {/* readability: darken top and bottom bands */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(20,8,40,0.85) 0%, rgba(20,8,40,0) 26%, rgba(20,8,40,0) 66%, rgba(20,8,40,0.85) 100%)" }} />
      {/* glowing crack */}
      <AbsoluteFill>
        <svg width={W} height={H}>
          <defs>
            <filter id="tglow" x="-50%" y="-10%" width="200%" height="120%">
              <feGaussianBlur stdDeviation={18} />
            </filter>
          </defs>
          <path d={crack} stroke="#b06bff" strokeWidth={70} fill="none" strokeLinejoin="round" opacity={0.85} filter="url(#tglow)" />
          <path d={crack} stroke="#1a0a2e" strokeWidth={16} fill="none" strokeLinejoin="round" />
          <path d={crack} stroke="#fff4d6" strokeWidth={6} fill="none" strokeLinejoin="round" />
        </svg>
      </AbsoluteFill>
      {/* side tags */}
      <div style={{ position: "absolute", top: 1180, left: 50, fontFamily: FONT_STAMP, fontSize: 64, color: "#fff", padding: "10px 26px 2px", borderRadius: 22, background: "#3f6f9a", border: "7px solid #1e1428", transform: "rotate(-5deg)", boxShadow: "0 8px 0 #1e1428" }}>REAL</div>
      <div style={{ position: "absolute", top: 1180, right: 50, fontFamily: FONT_STAMP, fontSize: 64, color: "#fff", padding: "10px 26px 2px", borderRadius: 22, background: "#7b3cff", border: "7px solid #1e1428", transform: "rotate(5deg)", boxShadow: "0 8px 0 #1e1428" }}>WHAT IF?</div>
      {/* title */}
      <div style={{ position: "absolute", top: 120, width: "100%", textAlign: "center", transform: "rotate(-4deg)" }}>
        <div style={{ fontFamily: FONT_STAMP, fontSize: 200, lineHeight: 1, whiteSpace: "nowrap", color: "#ffd23f", WebkitTextStroke: "32px #1e1428", paintOrder: "stroke", textShadow: "0 18px 0 #1e1428, 0 0 60px rgba(255,210,63,0.55)", letterSpacing: 2 }}>
          WHAT IF…?
        </div>
      </div>
      {/* punchy banner */}
      <div style={{ position: "absolute", bottom: 250, left: 40, right: 40, textAlign: "center" }}>
        <span
          style={{
            display: "inline-block",
            fontFamily: FONT_DISPLAY,
            fontSize: text.length > 18 ? 96 : 124,
            lineHeight: 1.05,
            color: "#ffffff",
            WebkitTextStroke: "20px #1e1428",
            paintOrder: "stroke",
            background: "linear-gradient(180deg, #8f55ff 0%, #6a2fe6 100%)",
            border: "10px solid #1e1428",
            borderRadius: 44,
            padding: "24px 44px 30px",
            boxShadow: "0 16px 0 #1e1428",
            transform: "rotate(2deg)",
          }}
        >
          {text}
        </span>
      </div>
      {spec.badge ? (
        <div style={{ position: "absolute", bottom: 150, right: 90, fontFamily: FONT_STAMP, fontSize: 70, color: "#1e1428", background: "#ffd23f", border: "8px solid #1e1428", borderRadius: 999, padding: "16px 34px 6px", transform: "rotate(-8deg)", boxShadow: "0 10px 0 #1e1428" }}>
          {spec.badge}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const THUMB_POSE_FRAME = POSE_FRAME;
