import type { Caption } from "@remotion/captions";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Performer } from "../kit/actions";
import { Soundtrack, voiceSrc } from "../kit/audio";
import { Captions, captionsToWords } from "../kit/captions";
import { talkFromWords } from "../kit/characters";
import { Shake, STAMP_IMPACT, TimelineSplit, YearStamp } from "../kit/effects";
import { SetScene, SETS } from "../kit/sets";
import demoCaptions from "../../public/voice/demo/captions.json";

// 12 s sound check: transcribed voiceover → captions + lip sync, music ducking under the voice,
// a stamp SFX, and a music drop on the TIMELINE_SPLIT.

const CAPS = demoCaptions as Caption[];
const WORDS = captionsToWords(CAPS);
const VOICE_START = 15;
const SPLIT = Math.round(VOICE_START + (CAPS[12].startMs / 1000) * 30) - 6; // just before "Instead,"

export const AUDIO_DEMO_FRAMES = 12 * 30;

export const AudioDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame - VOICE_START) / fps;
  const talk = talkFromWords(WORDS, t);
  const scene = (whatIf: number) => (
    <SetScene set="PORT" whatIf={whatIf} camera="medium" move="push" duration={AUDIO_DEMO_FRAMES}>
      <Performer preset={whatIf ? "zheng_he" : "magellan"} id={whatIf ? "zh" : "mg"} position={SETS.PORT.marks.center} heading={whatIf ? -10 : 12} face={{ talk }} cues={[{ action: "idle", at: 0 }, { action: "talk", at: VOICE_START }]} />
    </SetScene>
  );
  return (
    <AbsoluteFill>
      <Shake impacts={[STAMP_IMPACT + 40]}>
        <TimelineSplitAt at={SPLIT} real={scene(0)} whatIf={scene(1)} />
      </Shake>
      <Sequence from={40} durationInFrames={60}>
        <YearStamp text="1519" subtitle="Seville" exitAt={50} />
      </Sequence>
      <Sequence from={VOICE_START}>
        <Captions captions={CAPS} names={["Zheng", "He"]} />
      </Sequence>
      <Soundtrack
        durationInFrames={AUDIO_DEMO_FRAMES}
        voice={{ src: voiceSrc("demo"), captions: CAPS, startFrame: VOICE_START }}
        music={[
          { at: 0, mood: "epic_tense" },
          { at: SPLIT + 30, mood: "mysterious" },
        ]}
        drops={[{ at: SPLIT, holdFrames: 26 }]}
        sfx={[
          { at: 40 + STAMP_IMPACT, name: "stamp_slam" },
          { at: SPLIT, name: "ripple" },
          { at: 0, name: "waves", duration: AUDIO_DEMO_FRAMES },
        ]}
      />
    </AbsoluteFill>
  );
};

const TimelineSplitAt: React.FC<{ at: number; real: React.ReactNode; whatIf: React.ReactNode }> = ({ at, real, whatIf }) => {
  const frame = useCurrentFrame();
  if (frame < at) return <>{real}</>;
  return (
    <Sequence from={at}>
      <TimelineSplit real={real} whatIf={whatIf} takeoverAt={40} />
    </Sequence>
  );
};
