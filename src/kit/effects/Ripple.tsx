import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

type Props = {
  from: React.ReactNode;
  to: React.ReactNode;
  /** Frames the wave takes to cover the screen. */
  frames?: number;
  /** Origin in 0..1 screen space. */
  center?: [number, number];
  color?: string;
  seed?: number;
};

/**
 * RIPPLE — "history rewrites itself": a glowing wave expands from `center`; inside it the new
 * reality (`to`) wobbles into place through a displacement warp that calms as it settles.
 */
export const Ripple: React.FC<Props> = ({ from, to, frames = 24, center = [0.5, 0.45], color = "#b06bff", seed = 4 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const p = interpolate(frame, [0, frames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const e = 1 - (1 - p) ** 2.2;
  const cx = center[0] * W;
  const cy = center[1] * H;
  const maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.05;
  const R = e * maxR;
  const warp = 70 * (1 - p) ** 1.5 * Math.min(1, p * 6);
  const id = `ripple-${seed}`;
  const done = p >= 1;

  return (
    <AbsoluteFill>
      {!done ? <AbsoluteFill>{from}</AbsoluteFill> : null}
      <AbsoluteFill style={{ clipPath: done ? undefined : `circle(${R}px at ${cx}px ${cy}px)`, filter: warp > 0.5 ? `url(#${id})` : undefined }}>{to}</AbsoluteFill>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id={id} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="turbulence" baseFrequency={`${0.006 + p * 0.004} ${0.018 + p * 0.01}`} numOctaves={2} seed={seed} result="t" />
          <feDisplacementMap in="SourceGraphic" in2="t" scale={warp} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      {!done ? (
        <AbsoluteFill>
          <svg width={W} height={H}>
            <defs>
              <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation={10} />
              </filter>
            </defs>
            {[0, 1, 2].map((k) => {
              const r = R + k * 70 * (1 - p);
              const o = (1 - p) * (1 - k * 0.3);
              return (
                <g key={k} opacity={o}>
                  <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={34 - k * 8} filter={`url(#${id}-glow)`} />
                  <circle cx={cx} cy={cy} r={r} fill="none" stroke="#fff4d6" strokeWidth={6 - k * 1.5} />
                </g>
              );
            })}
          </svg>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
