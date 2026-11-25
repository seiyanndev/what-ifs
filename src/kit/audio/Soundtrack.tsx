import { Audio } from "@remotion/media";
import type { Caption } from "@remotion/captions";
import { interpolate, Sequence, useVideoConfig } from "remotion";
import { musicSrc, SFX_GAIN, SFX_LOOPS, sfxSrc, type MusicMood, type SfxName } from "./library";

export type MusicCue = {
  /** Frame this mood starts (crossfades from the previous cue). */
  at: number;
  mood: MusicMood | "silence";
  volume?: number;
};
export type SfxCue = { at: number; name: SfxName; volume?: number; /** loops (waves/crackle): how long, in frames */ duration?: number };

export type SoundtrackProps = {
  durationInFrames: number;
  voice?: { src: string; captions?: Caption[]; volume?: number; startFrame?: number };
  music?: MusicCue[];
  sfx?: SfxCue[];
  /** "Music drop": frames where music cuts to silence (e.g. the TIMELINE_SPLIT impact) and swells back. */
  drops?: { at: number; holdFrames?: number }[];
  /** Music level under narration (ducking), 0..1 of the cue volume. */
  duckTo?: number;
  musicVolume?: number;
  crossfadeFrames?: number;
};

/** 0..1 "voice is speaking" envelope from word timings (with small attack/release). */
const speechEnvelope = (captions: Caption[] | undefined, fps: number, startFrame: number) => {
  if (!captions?.length) return () => 0;
  // merge words into phrases (gaps < 350 ms join)
  const phrases: [number, number][] = [];
  for (const c of captions) {
    const s = startFrame + (c.startMs / 1000) * fps;
    const e = startFrame + (c.endMs / 1000) * fps;
    const last = phrases[phrases.length - 1];
    if (last && s - last[1] < 0.35 * fps) last[1] = e;
    else phrases.push([s, e]);
  }
  const att = 0.12 * fps;
  const rel = 0.45 * fps;
  return (f: number) => {
    let v = 0;
    for (const [s, e] of phrases) {
      if (f < s - att || f > e + rel) continue;
      v = Math.max(v, f < s ? (f - (s - att)) / att : f <= e ? 1 : 1 - (f - e) / rel);
    }
    return Math.max(0, Math.min(1, v));
  };
};

/**
 * The whole mix for an episode: narration, music (looped, crossfaded between moods, ducked under
 * the voice, with music drops) and one-shot / looping SFX. Pure function of the frame.
 */
export const Soundtrack: React.FC<SoundtrackProps> = ({ durationInFrames, voice, music = [], sfx = [], drops = [], duckTo = 0.2, musicVolume = 0.38, crossfadeFrames = 24 }) => {
  const { fps } = useVideoConfig();
  const speech = speechEnvelope(voice?.captions, fps, voice?.startFrame ?? 0);
  const cues = [...music].sort((a, b) => a.at - b.at);

  const dropGain = (f: number) => {
    let g = 1;
    for (const d of drops) {
      const hold = d.holdFrames ?? Math.round(0.9 * fps);
      g = Math.min(
        g,
        interpolate(f, [d.at - 3, d.at, d.at + hold, d.at + hold + Math.round(1.2 * fps)], [1, 0, 0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      );
    }
    return g;
  };

  return (
    <>
      {voice ? (
        <Sequence from={voice.startFrame ?? 0} name="Narration">
          <Audio src={voice.src} volume={voice.volume ?? 0.85} />
        </Sequence>
      ) : null}

      {cues.map((c, i) => {
        if (c.mood === "silence") return null;
        const next = cues[i + 1];
        const start = Math.max(0, c.at - (i === 0 ? 0 : crossfadeFrames));
        const end = Math.min(durationInFrames, next ? next.at + crossfadeFrames : durationInFrames);
        if (end <= start) return null;
        const vol = (c.volume ?? 1) * musicVolume;
        return (
          <Sequence key={`m${i}`} from={start} durationInFrames={end - start} name={`Music: ${c.mood}`}>
            <Audio
              src={musicSrc(c.mood)}
              loop
              loopVolumeCurveBehavior="extend"
              volume={(local) => {
                const f = start + local;
                const fadeIn = i === 0 ? interpolate(f, [0, 12], [0, 1], { extrapolateRight: "clamp" }) : interpolate(f, [c.at - crossfadeFrames, c.at], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                const fadeOut = next ? interpolate(f, [next.at, next.at + crossfadeFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : interpolate(f, [durationInFrames - 30, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                const duck = 1 - (1 - duckTo) * speech(f);
                return vol * fadeIn * fadeOut * duck * dropGain(f);
              }}
            />
          </Sequence>
        );
      })}

      {sfx.map((s, i) => {
        const loopSec = SFX_LOOPS[s.name];
        const dur = loopSec ? (s.duration ?? Math.round(loopSec * fps)) : undefined;
        return (
          <Sequence key={`s${i}`} from={s.at} durationInFrames={dur} name={`SFX: ${s.name}`}>
            <Audio
              src={sfxSrc(s.name)}
              loop={Boolean(loopSec)}
              volume={(f) => (s.volume ?? SFX_GAIN[s.name] ?? 0.7) * (dur ? interpolate(f, [0, 10, dur - 12, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1)}
            />
          </Sequence>
        );
      })}
    </>
  );
};
