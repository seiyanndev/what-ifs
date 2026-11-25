import { Composition } from "remotion";
import { TestCube } from "./compositions/TestCube";

// Series format: vertical 9:16 Shorts, 1080x1920 @ 30fps.
export const VIDEO = { width: 1080, height: 1920, fps: 30 } as const;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TestCube"
        component={TestCube}
        durationInFrames={3 * VIDEO.fps}
        {...VIDEO}
      />
    </>
  );
};
