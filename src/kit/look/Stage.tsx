import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { Grade } from "./Grade";
import { LightRig } from "./LightRig";
import type { TimeOfDay } from "./lighting";
import { Sky } from "./Sky";
import { QualityContext, useQuality } from "./quality";

type Props = {
  timeOfDay: TimeOfDay;
  /** 0 = real grade, 1 = What If grade. */
  whatIf?: number;
  /** Shadow frustum half-size and centre. */
  shadowSize?: number;
  shadowTarget?: [number, number, number];
  /** Shift the painted sun glow horizontally (e.g. to follow a camera orbit). */
  glowOffsetX?: number;
  /** Distance fog on/off (off for character sheets). */
  fog?: boolean;
  /** Replace the painted sky with a flat CSS background (character sheets, studio shots). */
  background?: string;
  /** 2D painted layer between the sky and the 3D (e.g. <PaintedBackdrop>). */
  backdrop?: React.ReactNode;
  /** 2D overlays drawn above the 3D but under the grade (labels, effects). */
  overlay?: React.ReactNode;
  /** 3D content — include an <OrbitCamera /> among the children. */
  children: React.ReactNode;
};

/**
 * One-stop wrapper for every 3D shot: painted sky → 3D canvas (toon renderer settings,
 * soft shadows, light rig) → overlays → colour grade.
 */
export const Stage: React.FC<Props> = ({
  timeOfDay,
  whatIf = 0,
  shadowSize,
  shadowTarget,
  glowOffsetX,
  overlay,
  backdrop,
  background,
  fog = true,
  children,
}) => {
  const { width, height } = useVideoConfig();
  const q = useQuality();
  return (
    <Grade whatIf={whatIf} grain={q.grain ? 0.06 : 0}>
      {background ? (
        <AbsoluteFill style={{ background }} />
      ) : (
        <Sky timeOfDay={timeOfDay} glowOffsetX={glowOffsetX} />
      )}
      {backdrop}
      <ThreeCanvas
        width={width}
        height={height}
        shadows="soft"
        flat
        gl={{
          antialias: q.antialias,
          alpha: true,
          preserveDrawingBuffer: true,
        }}
        dpr={1}
      >
        <QualityContext.Provider value={q}>
          <LightRig
            timeOfDay={timeOfDay}
            shadowSize={shadowSize}
            target={shadowTarget}
            fog={fog && !background}
          >
            {children}
          </LightRig>
        </QualityContext.Provider>
      </ThreeCanvas>
      {overlay ? <AbsoluteFill>{overlay}</AbsoluteFill> : null}
    </Grade>
  );
};
