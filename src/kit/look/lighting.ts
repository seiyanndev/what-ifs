// Time-of-day lighting rigs: warm key, cool fill, coloured rim, sky + fog.
// Directions are [azimuth°, elevation°]; azimuth 0 = from camera's default front (+Z), 90 = from +X (screen right).

export type TimeOfDay = "dawn" | "day" | "sunset" | "night";

export type LightRigPreset = {
  key: { color: string; intensity: number; dir: [number, number] };
  /** Hemisphere fill: cool sky from above, warm bounce from the ground. */
  fill: { sky: string; ground: string; intensity: number };
  /** Rim/back light colour used by the toon shader fresnel + a weak back light. */
  rim: { color: string; intensity: number };
  /** Colour shadows are tinted toward (never pure black). */
  shadowTint: string;
  /** CSS sky gradient stops, top → horizon. */
  sky: [string, string, string];
  /** Sun/moon glow position on screen (0–1) and colour. */
  glow: { x: number; y: number; color: string; size: number };
  fog: { color: string; near: number; far: number };
  /** Ink outline colour multiplier (night outlines go cooler). */
  ink: string;
  /** How painted 2D backdrops are darkened/tinted for this time (amount 0 = untouched). */
  backdrop: { tint: string; amount: number };
};

export const TIME_OF_DAY: Record<TimeOfDay, LightRigPreset> = {
  dawn: {
    key: { color: "#ffd2b0", intensity: 2.4, dir: [-70, 18] },
    fill: { sky: "#b9c4ff", ground: "#f0c8b4", intensity: 1.25 },
    rim: { color: "#ffc6d9", intensity: 0.9 },
    shadowTint: "#8e86c8",
    sky: ["#8fa6e0", "#e8b9cf", "#ffd9b8"],
    glow: { x: 0.15, y: 0.55, color: "#fff0d6", size: 0.5 },
    fog: { color: "#f3cdbf", near: 28, far: 100 },
    ink: "#3a2f4a",
    backdrop: { tint: "#c9a8d8", amount: 0.12 },
  },
  day: {
    key: { color: "#fff4e0", intensity: 2.6, dir: [-35, 55] },
    fill: { sky: "#bfe0ff", ground: "#e8d9b8", intensity: 1.35 },
    rim: { color: "#ffffff", intensity: 0.6 },
    shadowTint: "#7f90c8",
    sky: ["#5fa6e8", "#9fd0f4", "#e6f4ff"],
    glow: { x: 0.2, y: 0.12, color: "#ffffff", size: 0.35 },
    fog: { color: "#d8ecfb", near: 30, far: 120 },
    ink: "#2f2a3a",
    backdrop: { tint: "#ffffff", amount: 0 },
  },
  sunset: {
    key: { color: "#ffb36b", intensity: 2.8, dir: [-60, 16] },
    fill: { sky: "#8d8fe0", ground: "#e8a37c", intensity: 1.1 },
    rim: { color: "#ffcf7a", intensity: 1.2 },
    shadowTint: "#7a64b8",
    sky: ["#5d5aa8", "#e8889a", "#ffc583"],
    glow: { x: 0.18, y: 0.5, color: "#fff1c2", size: 0.55 },
    fog: { color: "#e7a2a8", near: 30, far: 130 },
    ink: "#3b2340",
    backdrop: { tint: "#c98aa0", amount: 0.12 },
  },
  night: {
    key: { color: "#b4c8ff", intensity: 2.1, dir: [30, 40] },
    fill: { sky: "#5566b0", ground: "#2e2a4a", intensity: 1.35 },
    rim: { color: "#9fd4ff", intensity: 1.1 },
    shadowTint: "#4a4f9c",
    sky: ["#0e1336", "#1f2a5e", "#3b3f7a"],
    glow: { x: 0.78, y: 0.14, color: "#e8f0ff", size: 0.22 },
    fog: { color: "#2a2f5e", near: 24, far: 85 },
    ink: "#141628",
    backdrop: { tint: "#1c2350", amount: 0.68 },
  },
};

/** Azimuth/elevation in degrees → unit direction pointing *toward* the light. */
export const dirFromAngles = ([az, el]: [number, number]): [number, number, number] => {
  const a = (az * Math.PI) / 180;
  const e = (el * Math.PI) / 180;
  return [Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)];
};
