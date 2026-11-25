import { Composition, Still } from "remotion";
import { BaseTurnaround, BaseVariants, HandPoses, RigTest } from "./compositions/CharacterSheets";
import { EffectDemo, EffectsDemo, EFFECTS_TOTAL } from "./compositions/EffectsDemo";
import { GlobeDemo } from "./compositions/GlobeDemo";
import { SetPreview } from "./compositions/SetSheets";
import { ActionsGrid, Showreel } from "./compositions/ActionSheets";
import { CastSheet, CrowdDemo } from "./compositions/CastSheets";
import { CostumesSheet, CostumeTurntable, HeadgearSheet, PropsSheet } from "./compositions/CostumeSheets";
import { ExpressionsSheet, FacePartsSheet, FaceTalkTest } from "./compositions/FaceSheets";
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
      <Still id="Expressions" component={ExpressionsSheet} width={2400} height={1500} />
      <Still id="FaceParts" component={FacePartsSheet} width={2400} height={1500} />
      <Still id="Headgear" component={HeadgearSheet} width={2400} height={1500} />
      <Still id="Costumes" component={CostumesSheet} width={2400} height={1500} />
      <Still id="Props" component={PropsSheet} width={2400} height={1000} />
      <Still id="Cast" component={CastSheet} width={2400} height={1700} />
      <Composition id="CrowdDemo" component={CrowdDemo} durationInFrames={5 * VIDEO.fps} {...VIDEO} />
      <Composition id="ActionsGrid" component={ActionsGrid} durationInFrames={4 * VIDEO.fps} fps={30} width={1920} height={1080} />
      <Composition id="EffectsDemo" component={EffectsDemo} durationInFrames={EFFECTS_TOTAL} {...VIDEO} />
      <Composition id="EffectDemo" component={EffectDemo} durationInFrames={120} defaultProps={{ effect: "year_stamp" as const }} {...VIDEO} />
      <Composition id="SetPreview" component={SetPreview} durationInFrames={90} defaultProps={{ set: "ANCIENT_CITY" as const }} {...VIDEO} />
      <Composition id="GlobeDemo" component={GlobeDemo} durationInFrames={5 * VIDEO.fps} {...VIDEO} />
      <Composition id="Showreel" component={Showreel} durationInFrames={15 * VIDEO.fps} {...VIDEO} />
      <Composition id="CostumeTurntable" component={CostumeTurntable} durationInFrames={4 * VIDEO.fps} {...VIDEO} />
      <Composition id="FaceTalkTest" component={FaceTalkTest} durationInFrames={4 * VIDEO.fps} {...VIDEO} />
    </>
  );
};
