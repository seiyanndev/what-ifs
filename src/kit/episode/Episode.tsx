import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import { Soundtrack, type MusicCue, type SfxCue } from "../audio";
import { Captions } from "../captions";
import { Ripple, STAMP_IMPACT, TimelineSplit } from "../effects";
import { FONT_DISPLAY, FONT_STAMP } from "../look";
import { SceneShot, SceneView } from "./SceneView";
import type { EpisodeProps, ResolvedScene } from "./spec";

const RIPPLE_FRAMES = 24;

const gradeOf = (s: ResolvedScene) => s.whatIf ?? (s.afterSplit ? 1 : 0);

/** A scene placed on the timeline, with its transition in. */
const ScenePlacement: React.FC<{ scene: ResolvedScene; prev?: ResolvedScene; props: EpisodeProps }> = ({ scene, prev, props }) => {
  const { fps } = useVideoConfig();
  const split = scene.effects?.timelineSplit;
  const body = split ? (
    <TimelineSplit
      real={<SceneShot scene={scene} captions={props.captions} whatIf={0} side="real" />}
      whatIf={<SceneShot scene={scene} captions={props.captions} whatIf={1} characters={split.whatIfCharacters ?? scene.characters} side="whatif" />}
      takeoverAt={Math.round((split.takeoverAt ?? Math.min(2.6, scene.durationInFrames / fps - 0.6)) * fps)}
      labels={!props.thumbnail}
    />
  ) : (
    <SceneView scene={scene} captions={props.captions} title={props.spec.title} whatIf={gradeOf(scene)} />
  );
  if (scene.transition === "ripple" && prev) {
    // the previous scene keeps running underneath while the ripple reveals this one
    return (
      <Ripple
        frames={RIPPLE_FRAMES}
        from={
          <Sequence from={-prev.durationInFrames} layout="none">
            <SceneView scene={prev} captions={props.captions} title={props.spec.title} whatIf={gradeOf(prev)} />
          </Sequence>
        }
        to={body}
      />
    );
  }
  return body;
};

/** Big "WHAT IF…?" thumbnail overlay. */
const ThumbOverlay: React.FC<{ title: string }> = ({ title }) => {
  const q = title.replace(/^\s*what\s+if\s*/i, "").replace(/\?\s*$/, "");
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(30,10,60,0.75) 0%, rgba(30,10,60,0) 42%, rgba(30,10,60,0) 70%, rgba(30,10,60,0.6) 100%)" }} />
      <div style={{ position: "absolute", top: 150, width: "100%", textAlign: "center", transform: "rotate(-4deg)" }}>
        <div style={{ fontFamily: FONT_STAMP, fontSize: 176, lineHeight: 1, whiteSpace: "nowrap", color: "#ffd23f", WebkitTextStroke: "30px #1e1428", paintOrder: "stroke", textShadow: "0 16px 0 #1e1428", letterSpacing: 2 }}>WHAT IF…?</div>
      </div>
      <div style={{ position: "absolute", bottom: 210, left: 60, right: 60, textAlign: "center" }}>
        <span
          style={{
            display: "inline-block",
            fontFamily: FONT_DISPLAY,
            fontSize: 96,
            lineHeight: 1.1,
            textTransform: "uppercase",
            color: "#ffffff",
            WebkitTextStroke: "18px #1e1428",
            paintOrder: "stroke",
            background: "#7b3cff",
            border: "10px solid #1e1428",
            borderRadius: 40,
            padding: "22px 40px 26px",
            boxShadow: "0 14px 0 #1e1428",
          }}
        >
          {q}?
        </span>
      </div>
    </AbsoluteFill>
  );
};

/** The whole episode, assembled from resolved scenes.json + voiceover timings. */
export const Episode: React.FC<EpisodeProps> = (props) => {
  const { fps } = useVideoConfig();
  const { scenes, captions, durationInFrames, spec } = props;

  // music: a cue at every scene that sets one; drop at the split
  const music: MusicCue[] = [];
  const sfx: SfxCue[] = [];
  const drops: { at: number; holdFrames?: number }[] = [];
  for (const s of scenes) {
    if (s.music) music.push({ at: s.from, mood: s.music });
    for (const x of s.sfx ?? []) sfx.push({ at: s.from + Math.round((x.at ?? 0) * fps), name: x.name, volume: x.volume });
    const fx = s.effects ?? {};
    if (fx.yearStamp) sfx.push({ at: s.from + Math.round((fx.yearStamp.at ?? 0.25) * fps) + STAMP_IMPACT, name: "stamp_slam" });
    if (fx.timelineSplit) {
      drops.push({ at: s.from, holdFrames: 26 });
      sfx.push({ at: s.from, name: "ripple" });
    }
    if (s.transition === "ripple") sfx.push({ at: s.from, name: "whoosh" });
    if (fx.asteroid) sfx.push({ at: s.from + Math.round((fx.asteroid.at ?? 1.6) * fps), name: "impact" });
    if (fx.fire) sfx.push({ at: s.from, name: "crackle", duration: s.durationInFrames });
    if (fx.crowd?.cheerAt !== undefined) sfx.push({ at: s.from + Math.round(fx.crowd.cheerAt * fps), name: "crowd_cheer" });
    if (s.set === "PORT" || s.set === "BEACH") sfx.push({ at: s.from, name: "waves", duration: s.durationInFrames, volume: 0.18 });
  }
  if (!music.length) music.push({ at: 0, mood: "epic_tense" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {scenes.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.durationInFrames} premountFor={Math.round(fps * 0.5)} name={`${i + 1}. ${s.id ?? s.set}`}>
          <ScenePlacement scene={s} prev={scenes[i - 1]} props={props} />
        </Sequence>
      ))}
      {props.thumbnail ? (
        <ThumbOverlay title={spec.title} />
      ) : (
        <>
          {/* no captions while a title card shows the same words */}
          <Captions
            captions={captions.filter((c) =>
              !scenes.some((s) => s.titleCard && c.startMs >= (s.from / fps) * 1000 && c.startMs < ((s.from + s.durationInFrames) / fps) * 1000),
            )}
            names={spec.names}
          />
          <Soundtrack durationInFrames={durationInFrames} voice={props.voice ? { src: staticFile(props.voice), captions } : undefined} music={music} sfx={sfx} drops={drops} />
        </>
      )}
    </AbsoluteFill>
  );
};
