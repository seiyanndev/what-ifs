import { AbsoluteFill, useCurrentFrame } from "remotion";

/** Camera-shake offset at `frame` from a list of impact frames (decays over ~0.6 s). */
export const shakeAt = (frame: number, impacts: number[], strength = 1) => {
  let x = 0;
  let y = 0;
  let r = 0;
  for (const at of impacts) {
    const t = frame - at;
    if (t < 0 || t > 22) continue;
    const a = strength * 26 * Math.exp(-t * 0.22);
    x += a * Math.sin(t * 2.9 + at * 0.7);
    y += a * 0.8 * Math.cos(t * 3.4 + at * 1.3);
    r += a * 0.035 * Math.sin(t * 2.2 + at);
  }
  return { x, y, r };
};

/** Wrap a whole shot to shake it on impacts (slightly zoomed so edges never show). */
export const Shake: React.FC<{ impacts: number[]; strength?: number; children: React.ReactNode }> = ({ impacts, strength = 1, children }) => {
  const frame = useCurrentFrame();
  const { x, y, r } = shakeAt(frame, impacts, strength);
  const active = x !== 0 || y !== 0;
  return <AbsoluteFill style={{ transform: active ? `translate(${x}px, ${y}px) rotate(${r}deg) scale(1.05)` : undefined }}>{children}</AbsoluteFill>;
};
