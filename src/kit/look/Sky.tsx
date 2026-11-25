import { AbsoluteFill } from "remotion";
import { TIME_OF_DAY, type TimeOfDay } from "./lighting";

/** Painted CSS sky behind the (transparent) 3D canvas: gradient + soft sun/moon glow. */
export const Sky: React.FC<{ timeOfDay: TimeOfDay; glowOffsetX?: number }> = ({ timeOfDay, glowOffsetX = 0 }) => {
  const p = TIME_OF_DAY[timeOfDay];
  const gx = (p.glow.x + glowOffsetX) * 100;
  const gy = p.glow.y * 100;
  return (
    <AbsoluteFill
      style={{
        background: [
          `radial-gradient(circle at ${gx}% ${gy}%, ${p.glow.color} 0%, ${p.glow.color}cc ${p.glow.size * 6}%, ${p.glow.color}33 ${p.glow.size * 30}%, transparent ${p.glow.size * 70}%)`,
          `linear-gradient(to bottom, ${p.sky[0]} 0%, ${p.sky[1]} 45%, ${p.sky[2]} 75%, ${p.sky[2]} 100%)`,
        ].join(","),
      }}
    />
  );
};
