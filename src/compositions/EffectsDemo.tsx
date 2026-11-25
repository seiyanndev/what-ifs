import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { Performer } from "../kit/actions";
import { Asteroid, Burst, FallingScrolls, Fire, ImpactFlash, PlagueFog, PlagueTint, Ripple, Shake, ShipFleet, STAMP_IMPACT, TimelineSplit, YearStamp } from "../kit/effects";
import { SetScene, SETS } from "../kit/sets";

// One demo per effect. EffectsDemo plays them all back to back; EffectDemo renders one (for stills).

const Title: React.FC<{ text: string }> = ({ text }) => (
  <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 160, pointerEvents: "none" }}>
    <div style={{ fontFamily: "Helvetica, Arial, sans-serif", fontWeight: 900, fontSize: 44, color: "#fff", WebkitTextStroke: "10px #2b1b2b", paintOrder: "stroke", letterSpacing: 4 }}>{text}</div>
  </AbsoluteFill>
);

const YearStampDemo: React.FC = () => (
  <AbsoluteFill>
    <Shake impacts={[10 + STAMP_IMPACT]}>
      <SetScene set="ANCIENT_CITY" camera="medium" move="push" duration={75}>
        <Performer preset="roman_emperor" position={SETS.ANCIENT_CITY.marks.center} heading={10} cues={[{ action: "idle", at: 0 }, { action: "look_up", at: 14 }]} />
      </SetScene>
    </Shake>
    <Sequence from={10}>
      <YearStamp text="44 BC" subtitle="Rome" />
    </Sequence>
    <Title text="YEAR_STAMP" />
  </AbsoluteFill>
);

const SplitDemo: React.FC = () => {
  const scene = (whatIf: number) => (
    <SetScene set="PORT" whatIf={whatIf} camera="medium" move="static" duration={120}>
      <Performer preset={whatIf ? "zheng_he" : "magellan"} id={whatIf ? "zh" : "mg"} position={SETS.PORT.marks.center} heading={whatIf ? -10 : 10} cues={[{ action: "idle", at: 0 }, { action: whatIf ? "wave" : "point", at: 30 }]} />
    </SetScene>
  );
  return (
    <AbsoluteFill>
      <Sequence from={14}>
        <TimelineSplit real={scene(0)} whatIf={scene(1)} takeoverAt={72} />
      </Sequence>
      <Sequence durationInFrames={14}>{scene(0)}</Sequence>
      <Title text="TIMELINE_SPLIT" />
    </AbsoluteFill>
  );
};

const RippleDemo: React.FC = () => (
  <AbsoluteFill>
    <Ripple
      frames={34}
      center={[0.5, 0.5]}
      from={
        <SetScene set="BEACH" camera="medium" move="static" duration={60}>
          <Performer preset="lapulapu" position={SETS.BEACH.marks.center} cues={[{ action: "idle", at: 0 }]} />
        </SetScene>
      }
      to={
        <SetScene set="MODERN_CITY" whatIf={1} camera="medium" move="pull" duration={60}>
          <Performer preset="news_anchor" position={SETS.MODERN_CITY.marks.center} cues={[{ action: "idle", at: 0 }, { action: "wave", at: 26 }]} />
        </SetScene>
      }
    />
    <Title text="RIPPLE" />
  </AbsoluteFill>
);

const FireDemo: React.FC = () => (
  <AbsoluteFill>
    <SetScene set="MEDIEVAL_VILLAGE" timeOfDay="night" camera="medium" move="push" duration={60}>
      <Fire position={[0.6, 0, -0.4]} scale={1.6} />
      <Burst position={[0.6, 0.3, -0.4]} at={18} kind="sparks" count={30} />
      <Burst position={[0.6, 0.1, -0.4]} at={18} kind="dust" count={16} color="#8a8088" />
      <Performer preset="peasant" position={SETS.MEDIEVAL_VILLAGE.marks.left} heading={30} cues={[{ action: "idle", at: 0 }, { action: "shrug", at: 20, expression: "scared" }]} />
    </SetScene>
    <Title text="FIRE · SPARKS · DUST" />
  </AbsoluteFill>
);

const FogDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const amt = interpolate(frame, [0, 25], [0.2, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <SetScene set="MEDIEVAL_VILLAGE" timeOfDay="night" camera="wide" move="push" duration={60} overlay={<PlagueTint amount={amt} />}>
        <PlagueFog amount={amt} />
        <Performer preset="monk" position={SETS.MEDIEVAL_VILLAGE.marks.center} cues={[{ action: "idle", at: 0, expression: "sad" }]} />
      </SetScene>
      <Title text="PLAGUE_FOG" />
    </AbsoluteFill>
  );
};

const FleetDemo: React.FC = () => (
  <AbsoluteFill>
    <SetScene set="BEACH" camera="wide" move="static" duration={75} timeOfDay="day">
      <ShipFleet count={7} formation="v" position={[-3.8, 0.06, -2.1]} heading={90} speed={1.3} scale={1.05} spacing={1.25} />
    </SetScene>
    <Title text="SHIP_FLEET" />
  </AbsoluteFill>
);

const ScrollsDemo: React.FC = () => (
  <AbsoluteFill>
    <SetScene set="LIBRARY" camera="wide" move="push" duration={60}>
      <FallingScrolls position={[0, 0, -0.5]} area={[7, 4]} top={6} />
      <Performer preset="gutenberg" position={SETS.LIBRARY.marks.desk} cues={[{ action: "idle", at: 0 }, { action: "look_up", at: 10 }]} />
    </SetScene>
    <Title text="FALLING SCROLLS" />
  </AbsoluteFill>
);

const AsteroidDemo: React.FC = () => {
  const IMPACT = 48;
  return (
    <AbsoluteFill>
      <Shake impacts={[IMPACT]} strength={1.3}>
        <SetScene set="JUNGLE_PREHISTORIC" camera="wide" move="static" duration={90}>
          <Asteroid impactAt={IMPACT} from={[-5.5, 10.5, -7]} to={[1.6, 0, -2.2]} start={4} />
          <Performer preset="explorer" position={SETS.JUNGLE_PREHISTORIC.marks.front} heading={0} cues={[{ action: "idle", at: 0 }, { action: "look_up", at: 20, expression: "scared" }, { action: "fall", at: IMPACT + 2 }]} />
        </SetScene>
      </Shake>
      <ImpactFlash at={IMPACT} />
      <Title text="ASTEROID IMPACT" />
    </AbsoluteFill>
  );
};

export const EFFECT_DEMOS = [
  { id: "year_stamp", frames: 75, C: YearStampDemo },
  { id: "timeline_split", frames: 120, C: SplitDemo },
  { id: "ripple", frames: 60, C: RippleDemo },
  { id: "fire", frames: 60, C: FireDemo },
  { id: "plague_fog", frames: 60, C: FogDemo },
  { id: "ship_fleet", frames: 75, C: FleetDemo },
  { id: "falling_scrolls", frames: 60, C: ScrollsDemo },
  { id: "asteroid", frames: 90, C: AsteroidDemo },
] as const;

export const EFFECTS_TOTAL = EFFECT_DEMOS.reduce((a, d) => a + d.frames, 0);

export const EffectsDemo: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {EFFECT_DEMOS.map(({ id, frames, C }) => {
        const s = (
          <Sequence key={id} from={from} durationInFrames={frames} premountFor={0}>
            <C />
          </Sequence>
        );
        from += frames;
        return s;
      })}
    </AbsoluteFill>
  );
};

export const EffectDemo: React.FC<{ effect: (typeof EFFECT_DEMOS)[number]["id"] }> = ({ effect }) => {
  const d = EFFECT_DEMOS.find((x) => x.id === effect) ?? EFFECT_DEMOS[0];
  return <d.C />;
};
