import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT_DISPLAY, FONT_STAMP } from "../look";

type Props = {
  /** The hook question, e.g. "What if Magellan never left Spain?" — a leading "What if" is styled as the stamp. */
  text: string;
  /** Frame (relative) to leave; omit to stay. */
  exitAt?: number;
  y?: number;
};

/**
 * "What if…?" title card for the opening hook: a gold WHAT IF stamp-pops on a purple banner,
 * then the rest of the question pops in word by word with a wobbling question mark.
 */
export const TitleCard: React.FC<Props> = ({ text, exitAt, y = 0.3 }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const m = text.match(/^\s*what\s+if\b[\s,]*/i);
  const rest = m ? text.slice(m[0].length) : text;
  const words = rest.split(/\s+/).filter(Boolean);

  const banner = spring({ frame, fps, config: { damping: 14, stiffness: 170 } });
  const stamp = spring({ frame: frame - 4, fps, config: { damping: 8, stiffness: 240, mass: 0.6 } });
  const exit = exitAt !== undefined ? interpolate(frame, [exitAt, exitAt + 9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: 1 - exit }}>
      {/* soft purple dim so the card reads over any shot */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 90% 55% at 50% 32%, rgba(58,15,107,0.55) 0%, rgba(58,15,107,0) 70%)", opacity: banner }} />
      <div
        style={{
          position: "absolute",
          top: `${y * 100}%`,
          left: 0,
          width,
          transform: `translateY(-50%) translateX(${exit * -width * 0.3}px)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        }}
      >
        {m ? (
          <div
            style={{
              fontFamily: FONT_STAMP,
              fontSize: 168,
              color: "#ffd23f",
              WebkitTextStroke: "26px #1e1428",
              paintOrder: "stroke",
              letterSpacing: 4,
              transform: `scale(${0.3 + 0.7 * stamp}) rotate(${-6 + 2 * Math.sin(frame / 9)}deg)`,
              textShadow: "0 14px 0 #1e1428",
            }}
          >
            WHAT IF
          </div>
        ) : null}
        <div
          style={{
            maxWidth: width * 0.86,
            textAlign: "center",
            fontFamily: FONT_DISPLAY,
            fontSize: 84,
            lineHeight: 1.1,
            textTransform: "uppercase",
            padding: "18px 34px 22px",
            borderRadius: 34,
            background: "#7b3cff",
            border: "8px solid #1e1428",
            boxShadow: "0 12px 0 #1e1428",
            transform: `scaleX(${banner}) rotate(2deg)`,
          }}
        >
          {words.map((w, i) => {
            const p = spring({ frame: frame - 10 - i * 3, fps, config: { damping: 10, stiffness: 260, mass: 0.5 } });
            const isQ = /\?$/.test(w);
            const wob = isQ ? Math.sin(frame / 5) * 6 : 0;
            return (
              <span key={i} style={{ display: "inline-block", whiteSpace: "pre", transform: `scale(${p}) rotate(${wob + (random(`tc${i}`) - 0.5) * 4}deg)`, color: "#ffffff", WebkitTextStroke: "14px #1e1428", paintOrder: "stroke" }}>
                {w}
                {i < words.length - 1 ? " " : ""}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
