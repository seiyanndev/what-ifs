import { Audio } from "@remotion/media";
import { AbsoluteFill, interpolate, random, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT_DISPLAY, FONT_STAMP } from "../look";

/** Frame (relative to the stamp's start) where it hits — use it for shake + SFX sync. */
export const STAMP_IMPACT = 7;

/** Parse "1521", "44 BC", "~3000 BC", "AD 79" → parts. */
export const parseYear = (text: string) => {
  const m = text.trim().match(/^(~|c\.?\s*)?\s*(AD\s*)?(\d[\d,]*)\s*(BC|BCE|AD|CE)?$/i);
  if (!m) return { approx: false, year: text, era: "" };
  return { approx: Boolean(m[1]), year: m[3], era: (m[4] ?? (m[2] ? "AD" : "")).toUpperCase() };
};

type Props = {
  /** "1521", "44 BC", "~3000 BC". */
  text: string;
  subtitle?: string;
  /** Vertical centre (0 top … 1 bottom). Default: upper third, clear of captions. */
  y?: number;
  color?: string;
  /** Frame (relative) to fly out; omit to stay. */
  exitAt?: number;
  /** Stamp SFX (staticFile path), played on impact. */
  sfx?: string;
  seed?: string;
};

/**
 * YEAR_STAMP — the year slams down like a rubber stamp: rough inked edges, squash on impact,
 * dust puff. Pair with <Shake impacts={[from + STAMP_IMPACT]}>.
 */
export const YearStamp: React.FC<Props> = ({ text, subtitle, y = 0.27, color = "#f2b134", exitAt, sfx, seed = "stamp" }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const { approx, year, era } = parseYear(text);
  const I = STAMP_IMPACT;

  // fly in (accelerating), squash on impact, spring settle
  const fall = interpolate(frame, [0, I], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const inScale = 3.4 - 2.4 * fall * fall;
  const settle = spring({ frame: frame - I, fps, config: { damping: 9, stiffness: 220, mass: 0.6 } });
  const squash = frame >= I ? 1 - 0.18 * (1 - settle) : 1;
  const exit = exitAt !== undefined ? interpolate(frame, [exitAt, exitAt + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const scale = (frame < I ? inScale : 1) * (1 - exit * 0.6);
  const opacity = interpolate(frame, [0, 3], [0, 1], { extrapolateRight: "clamp" }) * (1 - exit);
  const rot = -5 + (frame < I ? (1 - fall) * -10 : 0);

  const W = width * 0.86;
  const H = 300;
  const sub = interpolate(frame, [I + 5, I + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {sfx ? (
        <Sequence from={I} durationInFrames={45}>
          <Audio src={sfx} />
        </Sequence>
      ) : null}
      {/* dust puff on impact */}
      {frame >= I
        ? Array.from({ length: 14 }, (_, i) => {
            const t = (frame - I) / 18;
            if (t > 1) return null;
            const a = (i / 14) * Math.PI * 2 + random(`${seed}-d${i}`) * 0.4;
            const d = (0.42 + 0.2 * random(`${seed}-r${i}`)) * W * (0.55 + 0.5 * Math.sqrt(t));
            const s = 40 + 50 * random(`${seed}-s${i}`);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: width / 2 + Math.cos(a) * d * 0.62 - s / 2,
                  top: `calc(${y * 100}% + ${Math.sin(a) * d * 0.28 - s / 2}px)`,
                  width: s,
                  height: s,
                  borderRadius: "50%",
                  background: "#f3e3c3",
                  opacity: (1 - t) * 0.75,
                  transform: `scale(${0.6 + t})`,
                }}
              />
            );
          })
        : null}
      <div
        style={{
          position: "absolute",
          left: (width - W) / 2,
          top: `calc(${y * 100}% - ${H / 2}px)`,
          width: W,
          height: H,
          opacity,
          transform: `rotate(${rot}deg) scale(${scale * (2 - squash)}, ${scale * squash})`,
        }}
      >
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
          <defs>
            <filter id={`rough-${seed}`} x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves={2} seed={7} result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale={7} />
            </filter>
            <filter id={`wear-${seed}`}>
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={1} seed={3} result="g" />
              <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.9 1.55" result="m" />
              <feComposite in="SourceGraphic" in2="m" operator="in" />
            </filter>
          </defs>
          <g filter={`url(#rough-${seed})`}>
            <g filter={`url(#wear-${seed})`}>
              {/* rubber-stamp frame */}
              <rect x={10} y={20} width={W - 20} height={H - 40} rx={34} fill="none" stroke="#2b1b2b" strokeWidth={26} />
              <rect x={10} y={20} width={W - 20} height={H - 40} rx={34} fill="none" stroke={color} strokeWidth={14} />
              <rect x={38} y={46} width={W - 76} height={H - 92} rx={20} fill="none" stroke={color} strokeWidth={5} />
              <text
                x={W / 2}
                y={H / 2 + 66}
                textAnchor="middle"
                fontFamily={FONT_STAMP}
                fontSize={190}
                fill={color}
                stroke="#2b1b2b"
                strokeWidth={16}
                paintOrder="stroke"
                letterSpacing={6}
              >
                {approx ? <tspan fontSize={120} dy={-20}>~</tspan> : null}
                <tspan dy={approx ? 20 : 0}>{year}</tspan>
                {era ? (
                  <tspan fontSize={92} dx={18}>
                    {era}
                  </tspan>
                ) : null}
              </text>
            </g>
          </g>
        </svg>
      </div>
      {subtitle ? (
        <div
          style={{
            position: "absolute",
            width: "100%",
            top: `calc(${y * 100}% + ${H / 2 + 18}px)`,
            textAlign: "center",
            fontFamily: FONT_DISPLAY,
            fontSize: 64,
            color: "#ffffff",
            WebkitTextStroke: "14px #2b1b2b",
            paintOrder: "stroke",
            opacity: sub * (1 - exit),
            transform: `translateY(${(1 - sub) * 30}px)`,
            letterSpacing: 2,
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
