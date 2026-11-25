import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Performer } from "../kit/actions";
import { Captions, estimateTimings, TitleCard, wordsToCaptions } from "../kit/captions";
import { talkFromWords } from "../kit/characters";
import { SetScene, SETS } from "../kit/sets";

// 10 s captions demo: hook title card, then word-by-word narration captions with lip sync.

const SCRIPT =
  "What if Magellan never left Spain in 1519? The fleet stays home. Instead, Zheng He's treasure ships reach Mactan first, and Lapulapu greets *friends*, not invaders.";
export const DEMO_WORDS = estimateTimings(SCRIPT, 2.7);
const DEMO_CAPTIONS = wordsToCaptions(DEMO_WORDS);

export const CaptionsDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const talk = talkFromWords(DEMO_WORDS, frame / fps);
  return (
    <AbsoluteFill>
      <SetScene set="PORT" camera="medium" move="push" duration={300}>
        <Performer preset="magellan" position={SETS.PORT.marks.center} heading={12} face={{ talk }} cues={[{ action: "idle", at: 0 }, { action: "talk", at: 80 }]} />
      </SetScene>
      <Sequence durationInFrames={84}>
        <TitleCard text="What if Magellan never left Spain?" exitAt={72} />
      </Sequence>
      <Captions captions={DEMO_CAPTIONS} />
    </AbsoluteFill>
  );
};
