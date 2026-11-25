import { Composition, Still } from "remotion";
import { BaseTurnaround, BaseVariants, HandPoses, RigTest } from "./compositions/CharacterSheets";
import { LookTest } from "./compositions/LookTest";
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
      <Composition
        id="LookTest"
        component={LookTest}
        durationInFrames={4 * VIDEO.fps}
        defaultProps={{ timeOfDay: "sunset" as const, whatIf: 0 }}
        {...VIDEO}
      />
      <Still id="BaseTurnaround" component={BaseTurnaround} width={2400} height={1350} />
      <Still id="BaseVariants" component={BaseVariants} width={2400} height={1350} />
      <Still id="HandPoses" component={HandPoses} width={2400} height={1350} />
      <Still id="RigTest" component={RigTest} width={2400} height={1350} />
    </>
  );
};
