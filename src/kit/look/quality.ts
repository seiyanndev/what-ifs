import { createContext, useContext } from "react";

/**
 * Render quality knobs. "final" is the locked look; "preview" trades a few invisible-at-phone-size
 * details for speed. Set by the Episode composition from props.quality (npm run episode --preview).
 */
export type Quality = {
  /** Film grain (full-screen SVG turbulence each frame — expensive). */
  grain: boolean;
  /** Shadow map resolution. */
  shadowMap: number;
  /** Multisample antialiasing on the 3D canvas. */
  antialias: boolean;
  /** Face texture resolution (px). */
  faceRes: number;
  /** Ink outlines. */
  ink: boolean;
};

export const QUALITY: Record<"final" | "preview", Quality> = {
  final: { grain: true, shadowMap: 2048, antialias: true, faceRes: 600, ink: true },
  preview: { grain: false, shadowMap: 1024, antialias: false, faceRes: 300, ink: true },
};

export const QualityContext = createContext<Quality>(QUALITY.final);
export const useQuality = () => useContext(QualityContext);
