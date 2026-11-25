import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT_STAMP } from "../look";

type Props = {
  /** The history we know (render it with whatIf={0}). */
  real: React.ReactNode;
  /** The alternate timeline (render the same shot with whatIf={1}, or a different one). */
  whatIf: React.ReactNode;
  /** Frames for the crack to tear from top to bottom. */
  crackFrames?: number;
  /** Frame (relative) where WHAT IF starts taking over the whole screen; omit to stay split. */
  takeoverAt?: number;
  takeoverFrames?: number;
  labels?: boolean;
  seed?: string;
};

/**
 * TIMELINE_SPLIT — the series' signature moment. A glowing jagged crack tears down the screen:
 * REAL stays on the left, WHAT IF (purple grade) opens on the right. Optionally the crack then
 * sweeps left so the alternate timeline takes over.
 */
export const TimelineSplit: React.FC<Props> = ({ real, whatIf, crackFrames = 16, takeoverAt, takeoverFrames = 16, labels = true, seed = "split" }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H, fps } = useVideoConfig();

  // jagged crack points from top to bottom
  const N = 18;
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const y = (i / N) * H;
    const jag = i === 0 || i === N ? 0 : (random(`${seed}-${i}`) - 0.5) * 120;
    return [W / 2 + jag, y] as [number, number];
  });

  const draw = interpolate(frame, [0, crackFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tipY = draw * H;
  const open = spring({ frame: frame - crackFrames + 2, fps, config: { damping: 12, stiffness: 120 } });
  const gap = 6 + 16 * open;
  const take = takeoverAt !== undefined ? interpolate(frame, [takeoverAt, takeoverAt + takeoverFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const shift = -take * (W / 2 + 200); // crack slides left during takeover

  // right-hand (WHAT IF) region: everything right of the crack, down to the tip
  const visible = pts.filter(([, y]) => y <= tipY + 1);
  const tip: [number, number] = visible.length ? [visible[visible.length - 1][0], tipY] : [W / 2, 0];
  const right = [...visible, tip].map(([x, y]) => `${x + shift + gap / 2}px ${y}px`);
  const clip = `polygon(${[`${W + 400}px 0px`, ...right, `${W + 400}px ${tipY}px`].join(", ")})`;
  const crackPath = [...visible, tip].map(([x, y], i) => `${i ? "L" : "M"}${x + shift} ${y}`).join(" ");

  const label = (txt: string, side: "left" | "right", bg: string, delay: number) => {
    const p = spring({ frame: frame - crackFrames - delay, fps, config: { damping: 10, stiffness: 160 } });
    return (
      <div
        style={{
          position: "absolute",
          top: 150,
          [side]: 60,
          transform: `scale(${p}) rotate(${side === "left" ? -4 : 4}deg)`,
          opacity: Math.min(1, p * 1.5) * (1 - take),
          fontFamily: FONT_STAMP,
          fontSize: 76,
          letterSpacing: 3,
          color: "#ffffff",
          padding: "16px 34px 8px",
          borderRadius: 26,
          background: bg,
          border: "8px solid #2b1b2b",
          boxShadow: "0 10px 0 rgba(43,27,43,0.5)",
        }}
      >
        {txt}
      </div>
    );
  };

  return (
    <AbsoluteFill>
      <AbsoluteFill>{real}</AbsoluteFill>
      {draw > 0 ? <AbsoluteFill style={{ clipPath: take >= 1 ? undefined : clip }}>{whatIf}</AbsoluteFill> : null}
      {draw > 0 && take < 1 ? (
        <AbsoluteFill>
          <svg width={W} height={H}>
            <defs>
              <filter id={`glow-${seed}`} x="-50%" y="-10%" width="200%" height="120%">
                <feGaussianBlur stdDeviation={14} />
              </filter>
            </defs>
            <path d={crackPath} stroke="#b06bff" strokeWidth={gap + 46} fill="none" strokeLinejoin="round" opacity={0.75} filter={`url(#glow-${seed})`} />
            <path d={crackPath} stroke="#1a0a2e" strokeWidth={gap} fill="none" strokeLinejoin="round" />
            <path d={crackPath} stroke="#fff4d6" strokeWidth={Math.max(3, gap * 0.35)} fill="none" strokeLinejoin="round" />
            {/* sparks at the tearing tip */}
            {draw < 1
              ? Array.from({ length: 10 }, (_, i) => {
                  const a = random(`${seed}-sa${i}-${Math.floor(frame / 2)}`) * Math.PI * 2;
                  const d = 20 + random(`${seed}-sd${i}-${frame}`) * 70;
                  return <circle key={i} cx={tip[0] + shift + Math.cos(a) * d} cy={tip[1] + Math.sin(a) * d * 0.6} r={4 + random(`${seed}-sr${i}`) * 5} fill={i % 2 ? "#f2b134" : "#ffffff"} />;
                })
              : null}
          </svg>
        </AbsoluteFill>
      ) : null}
      {labels ? (
        <>
          {label("REAL", "left", "#3f6f9a", 0)}
          {label("WHAT IF?", "right", "#7b3cff", 4)}
        </>
      ) : null}
    </AbsoluteFill>
  );
};
