import { AbsoluteFill, random, useVideoConfig } from "remotion";
import * as THREE from "three";
import { TIME_OF_DAY, type TimeOfDay } from "./lighting";

/** Mix two CSS hex colors (t = 0 → a, 1 → b). */
export const mixColor = (a: string, b: string, t: number) =>
  "#" + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

type Layer = {
  /** Silhouette colour before haze. */
  color: string;
  /** 0 = no haze, 1 = fully fog coloured. */
  haze: number;
  /** Peak height as a fraction of screen height. */
  amplitude: number;
  /** Number of rolling bumps across the screen. */
  bumps: number;
  /** Baseline offset below the horizon (fraction of screen height). */
  drop: number;
  /** Parallax factor (far layers move less). */
  parallax: number;
};

type Props = {
  timeOfDay: TimeOfDay;
  /** Screen-space horizon (0 = top, 1 = bottom). Use horizonY() from camera.tsx to match the 3D camera. */
  horizon: number;
  /** Horizontal camera movement (e.g. azimuth in degrees) to drive parallax. */
  pan?: number;
  /** Silhouette colours far → near (usually stone/sand → foliage). */
  colors: [string, string, string, string];
  seed?: string;
};

/**
 * Painted storybook hills behind the 3D diorama: 3 layered silhouettes pinned to the
 * camera horizon, hazed toward the fog colour (aerial perspective), with parallax.
 */
export const PaintedBackdrop: React.FC<Props> = ({ timeOfDay, horizon, pan = 0, colors, seed = "hills" }) => {
  const { width, height } = useVideoConfig();
  const fog = TIME_OF_DAY[timeOfDay].fog.color;
  const p = TIME_OF_DAY[timeOfDay];
  const layers: Layer[] = [
    { color: colors[0], haze: 0.72, amplitude: 0.055, bumps: 2.1, drop: 0.0, parallax: 0.003 },
    { color: colors[1], haze: 0.5, amplitude: 0.05, bumps: 2.9, drop: 0.07, parallax: 0.007 },
    { color: colors[2], haze: 0.22, amplitude: 0.06, bumps: 2.4, drop: 0.2, parallax: 0.012 },
    { color: colors[3], haze: 0.08, amplitude: 0.07, bumps: 1.8, drop: 0.42, parallax: 0.02 },
  ];

  return (
    <AbsoluteFill>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {layers.map((l, i) => {
          const phase = random(`${seed}-${i}`) * Math.PI * 2;
          const phase2 = random(`${seed}-${i}-b`) * Math.PI * 2;
          const shift = pan * l.parallax * width;
          const pts: string[] = [];
          const N = 80;
          for (let k = 0; k <= N; k++) {
            const x = (k / N) * width;
            const u = (x + shift) / width;
            const w = u * l.bumps * Math.PI * 2;
            const n =
              0.62 * Math.sin(w + phase) +
              0.28 * Math.sin(w * 2.37 + phase2) +
              0.1 * Math.sin(w * 5.13 + phase * 1.7);
            // pow → rounder hilltops, flatter valleys
            const hgt = Math.pow(Math.min(1, Math.max(0, 0.5 + 0.5 * n)), 1.4);
            const y = (horizon + l.drop) * height - l.amplitude * height * (0.25 + 0.75 * hgt);
            pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
          }
          const d = `M0,${height} L${pts.join(" L")} L${width},${height} Z`;
          const base = mixColor(mixColor(l.color, fog, l.haze), p.backdrop.tint, p.backdrop.amount);
          return (
            <g key={i}>
              <defs>
                <linearGradient id={`${seed}-g${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={mixColor(base, p.key.color, 0.22)} />
                  <stop offset="0.35" stopColor={base} />
                  <stop offset="1" stopColor={mixColor(base, p.shadowTint, 0.15)} />
                </linearGradient>
              </defs>
              <path d={d} fill={`url(#${seed}-g${i})`} />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
