import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

// Colour grades applied on top of the whole frame (3D + 2D).
// "real"   — the history we know: natural, slightly warm.
// "whatif" — the alternate timeline: more saturated, purple-tinted, dreamy edges.
export const GRADES = {
  real: { saturate: 1.04, contrast: 1.02, brightness: 1.0, hue: 0, tint: "#ffb070", tintOpacity: 0.05, vignette: "#2a1630", vignetteOpacity: 0.32, lift: "#000000" },
  whatif: { saturate: 1.18, contrast: 1.05, brightness: 1.02, hue: 0, tint: "#7b3cff", tintOpacity: 0.34, vignette: "#3a0f6b", vignetteOpacity: 0.6, lift: "#2c1460" },
} as const;

export type GradeName = keyof typeof GRADES;

type Props = {
  /** 0 = real, 1 = what if. Animate this for transitions (e.g. during TIMELINE_SPLIT / RIPPLE). */
  whatIf?: number;
  /** Film grain strength (0 disables). Grain is seeded by frame → deterministic. */
  grain?: number;
  children: React.ReactNode;
};

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export const Grade: React.FC<Props> = ({ whatIf = 0, grain = 0.06, children }) => {
  const frame = useCurrentFrame();
  const t = interpolate(whatIf, [0, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const a = GRADES.real;
  const b = GRADES.whatif;
  const filter = `saturate(${mix(a.saturate, b.saturate, t)}) contrast(${mix(a.contrast, b.contrast, t)}) brightness(${mix(a.brightness, b.brightness, t)}) hue-rotate(${mix(a.hue, b.hue, t)}deg)`;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ filter }}>{children}</AbsoluteFill>
      {/* Colour tint (soft-light keeps highlights clean) */}
      <AbsoluteFill style={{ backgroundColor: a.tint, opacity: a.tintOpacity * (1 - t), mixBlendMode: "soft-light" }} />
      <AbsoluteFill style={{ backgroundColor: b.tint, opacity: b.tintOpacity * t, mixBlendMode: "soft-light" }} />
      {/* Gentle purple colour wash so the timeline reads as "other" in any lighting */}
      <AbsoluteFill style={{ backgroundColor: "#8a5cff", opacity: 0.16 * t, mixBlendMode: "color" }} />
      {/* Lift the blacks toward purple — the classic "dreamy" alternate-timeline grade */}
      <AbsoluteFill style={{ backgroundColor: b.lift, opacity: t, mixBlendMode: "lighten" }} />
      {/* Vignette */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 80% 62% at 50% 46%, transparent 60%, ${t > 0.5 ? b.vignette : a.vignette} 140%)`,
          opacity: mix(a.vignetteOpacity, b.vignetteOpacity, t),
          mixBlendMode: "multiply",
        }}
      />
      {grain > 0 ? (
        <AbsoluteFill style={{ opacity: grain, mixBlendMode: "overlay" }}>
          <svg width="100%" height="100%">
            <filter id={`grain-${frame}`}>
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={frame % 97} />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter={`url(#grain-${frame})`} />
          </svg>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
