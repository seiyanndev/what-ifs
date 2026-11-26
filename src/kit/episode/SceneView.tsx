import type { Caption } from "@remotion/captions";
import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Performer, type Cue } from "../actions";
import { captionsToWords, TitleCard } from "../captions";
import { BODY_TYPES, HAIR_COLORS, PRESETS, PresetCharacter, talkFromWords } from "../characters";
import { Asteroid, Burst, Crowd, FallingScrolls, Fire, ImpactFlash, PlagueFog, PlagueTint, Shake, ShipFleet, STAMP_IMPACT, YearStamp } from "../effects";
import { STONE, StoneContext, ToonMaterial } from "../look";
import { boundsAround, DRESSING_ITEMS, mixView, SETS, SetScene, type GeoBounds, type LonLat } from "../sets";
import type { CharacterSpec, ResolvedScene } from "./spec";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Map a 0..1 progress window [from, to] (seconds) onto the scene clock. */
const window01 = (frame: number, fps: number, dur: number, from = 0, to?: number) => {
  const a = from * fps;
  const b = (to ?? Math.max(from + 1.5, dur / fps - 0.3)) * fps;
  return interpolate(frame, [a, Math.max(a + 1, b)], [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) });
};

const markPos = (scene: ResolvedScene, mark: CharacterSpec["mark"]): [number, number, number] => {
  const marks = SETS[scene.set].marks;
  if (Array.isArray(mark)) return mark;
  return marks[mark ?? "center"] ?? marks.center ?? [0, 0, 0];
};

const CharacterView: React.FC<{ c: CharacterSpec; scene: ResolvedScene; words: ReturnType<typeof captionsToWords>; idx: number; side: string }> = ({ c, scene, words, idx, side }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  type ActionSpec = NonNullable<CharacterSpec["actions"]>[number];
  const list: ActionSpec[] = c.actions?.length ? c.actions : [{ action: c.talking ? "talk" : "idle" }];
  const cues: Cue[] = list.map((a) => ({
    action: a.action,
    at: Math.round((a.at ?? 0) * fps),
    params: a.params,
    expression: a.expression ?? c.expression,
    heading: a.heading,
  }));
  if (cues[0].at > 0) cues.unshift({ action: "idle", at: 0, expression: c.expression });
  const t = (scene.from + frame) / fps;
  const talk = c.talking ? talkFromWords(words, t) : undefined;
  const p = PRESETS[c.preset];
  const elder = c.elder
    ? {
        shape: BODY_TYPES.elder,
        costume: {
          ...p.costume,
          hair: p.costume.hair ? { ...p.costume.hair, color: HAIR_COLORS.grey } : { style: "bald" as const, color: HAIR_COLORS.grey },
          facialHair: p.costume.facialHair ? { ...p.costume.facialHair, color: HAIR_COLORS.grey } : undefined,
        },
      }
    : {};
  return (
    <Performer
      {...elder}
      preset={c.preset}
      id={`${scene.index}-${side}-${idx}-${c.preset}`}
      position={markPos(scene, c.mark)}
      heading={c.heading ?? 0}
      cues={cues}
      face={talk ? { talk } : undefined}
    />
  );
};

/** One scene's 3D shot (no title card / year stamp — those are 2D overlays added by SceneView). */
export const SceneShot: React.FC<{ scene: ResolvedScene; captions: Caption[]; whatIf: number; characters?: CharacterSpec[]; side?: string }> = ({ scene, captions, whatIf, characters, side = "a" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = scene.durationInFrames;
  const words = captionsToWords(captions);
  const fx = scene.effects ?? {};
  const g = scene.geo;

  // ---- geo (GLOBE / MAP_REGION) ----
  const fills = (g?.fills ?? []).map((f) => {
    const p = window01(frame, fps, dur, f.from ?? 0.2, f.to ?? (f.from ?? 0.2) + 1.4);
    const pulse = f.pulse ? 0.55 + 0.3 * (0.5 + 0.5 * Math.sin((frame / fps) * Math.PI * 1.6)) : undefined;
    return { countries: f.countries, polygon: f.polygon, color: f.color, origin: f.origin, progress: f.shrink ? 1 - p : p, opacity: pulse ?? f.opacity };
  });
  const routes = (g?.routes ?? []).flatMap((r) => {
    const n = Math.max(1, r.ships ?? 1);
    // a fleet: n copies side by side (offset perpendicular-ish in lat/lon), each a little behind the last
    return Array.from({ length: n }, (_, k) => {
      const off = n === 1 ? 0 : (k - (n - 1) / 2) * 1.6;
      const path = r.path.map(([lon, lat], i, arr) => (i === 0 || i === arr.length - 1 ? [lon + off * 0.3, lat + off * 0.3] : [lon + off * 0.4, lat + off]) as LonLat);
      const from = (r.from ?? 0.3) + k * 0.25;
      return {
        from: path[0],
        via: path.slice(1, -1),
        to: path[path.length - 1],
        icon: r.icon ?? "ship",
        color: r.color ?? "#c0392b",
        trail: k === 0,
        sail: r.sail,
        progress: window01(frame, fps, dur, from, r.to !== undefined ? r.to + k * 0.25 : undefined),
      };
    });
  });
  const pins = (g?.pins ?? []).map((p) => ({ at: p.at, color: p.color, pop: interpolate(frame, [(p.at_time ?? 0.3) * fps, (p.at_time ?? 0.3) * fps + 8], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2)) }) }));
  const labels = (g?.labels ?? []).map((l) => ({ at: l.at, text: l.text, style: l.style, size: l.size, opacity: interpolate(frame, [(l.from ?? 0.4) * fps, (l.from ?? 0.4) * fps + 10], [0, 1], clamp) }));

  let globe;
  let cameraOverride;
  if (scene.set === "GLOBE" && g) {
    const t = window01(frame, fps, dur, 0, dur / fps);
    const from: LonLat = g.view ?? g.viewTo ?? [0, 20];
    const to: LonLat = g.viewTo ?? from;
    const zoom = g.zoom ? interpolate(t, [0.55, 1], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) }) : 0;
    const view = mixView(from, to, g.zoom ? Math.min(1, t / 0.55) : t);
    globe = {
      view,
      fills,
      routes,
      pins,
      labels,
      detail: g.zoom ? { bounds: boundsAround(to, 34, 0.8), opacity: interpolate(zoom, [0.5, 0.9], [0, 1], clamp) } : undefined,
    };
    cameraOverride = { target: [0, 0, 0] as [number, number, number], distance: interpolate(zoom, [0, 1], [10.5, 2.75]), azimuth: 0, elevation: interpolate(zoom, [0, 1], [4, 0]), fov: 30 };
  }
  let map;
  if (scene.set === "MAP_REGION" && g?.center) {
    const bounds: GeoBounds = boundsAround(g.center, g.span ?? 22, 0.85);
    const flags = (g.flags ?? []).map((f) => ({ at: f.at, color: f.color, accent: f.accent, pop: interpolate(frame, [(f.at_time ?? 0.5) * fps, (f.at_time ?? 0.5) * fps + 9], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2.2)) }) }));
    map = { bounds, width: 5.4, fills: fills.map((f) => ({ ...f, opacity: 0.6 })), routes, pins, labels, flags };
  }

  const chars = characters ?? scene.characters ?? [];
  // plague fog: optional roll-in; the What If side of a split never has it
  const fogSpec = side === "whatif" ? undefined : fx.plagueFog;
  const fogFrom = typeof fogSpec === "object" ? Math.round((fogSpec.from ?? 0) * fps) : -1;
  const fogAmt = !fogSpec ? 0 : fogFrom >= 0 ? interpolate(frame, [fogFrom, fogFrom + 55], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) }) : 1;
  const impact = fx.asteroid ? Math.round((fx.asteroid.at ?? 1.6) * fps) : -1;

  return (
    <Shake impacts={impact >= 0 ? [impact] : []} strength={1.3}>
      <SetScene
        set={scene.set}
        era={scene.era}
        timeOfDay={scene.timeOfDay}
        whatIf={whatIf}
        camera={cameraOverride ?? scene.camera ?? (scene.set === "MAP_REGION" ? "medium" : "medium")}
        move={scene.move ?? (scene.set === "GLOBE" ? "static" : "push")}
        duration={dur}
        globe={globe}
        map={map}
        overlay={fogAmt > 0 ? <PlagueTint amount={fogAmt} /> : undefined}
      >
        {chars.map((c, i) => (
          <CharacterView key={i} c={c} scene={scene} words={words} idx={i} side={side} />
        ))}
        {fx.fire ? <Fire position={markPos(scene, fx.fire.mark ?? "back")} scale={fx.fire.scale ?? 1.4} /> : null}
        {fx.fire ? <Burst position={markPos(scene, fx.fire.mark ?? "back")} at={10} kind="sparks" count={24} /> : null}
        {(scene.dressing ?? []).map((d, i) => {
          const Item = DRESSING_ITEMS[d.item] as React.FC<Record<string, unknown>>;
          const at = typeof d.at === "string" ? markPos(scene, d.at) : d.at;
          const shutters = d.closeAt !== undefined ? interpolate(frame, [d.closeAt * fps, d.closeAt * fps + 12], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.4)) }) : undefined;
          return <Item key={`dr${i}`} position={at} rotation={((d.rotation ?? 0) * Math.PI) / 180} scale={d.scale} text={d.text} style={d.style} color={d.color} height={d.height} w={d.w} d={d.d} h={d.h} shutters={shutters} />;
        })}
        {fogAmt > 0 ? <PlagueFog amount={fogAmt} position={[-(1 - fogAmt) * 4.5, 0, 0]} /> : null}
        {fx.statue ? <StatueFx spec={fx.statue} scene={scene} /> : null}
        {fx.shipFleet ? <ShipFleet count={fx.shipFleet.count ?? 7} formation={fx.shipFleet.formation ?? "v"} heading={fx.shipFleet.heading ?? 90} position={[-3.8, 0.06, -2.1]} speed={1.2} scale={1} spacing={1.25} /> : null}
        {fx.fallingScrolls ? <FallingScrolls position={[0, 0, -0.5]} area={[7, 4]} top={6} /> : null}
        {fx.asteroid ? <Asteroid impactAt={impact} start={Math.max(0, impact - 44)} from={[-5.5, 10.5, -7]} to={fx.asteroid.target ?? [1.6, 0, -2.2]} /> : null}
        {fx.crowd
          ? (fx.crowd.flanks ? [-1, 1] : [0]).map((side) => {
              const cr = fx.crowd!;
              const y = SETS[scene.set].floorY;
              const n = cr.count ?? 80;
              return (
                <Crowd
                  key={side}
                  count={side ? Math.ceil(n / 2) : n}
                  pool={cr.pool as never}
                  era={scene.era ?? SETS[scene.set].era}
                  area={cr.area ?? (side ? [1.7, 1.9] : [11, 4.5])}
                  position={cr.position ? [cr.position[0] + side * 3.15, cr.position[1], cr.position[2]] : side ? [side * 3.15, y, 1.0] : [0, y, -2.6]}
                  lookAt={side ? [0, 1, 1.2] : undefined}
                  scale={cr.scale ?? (side ? 0.82 : 1)}
                  cheer={cr.cheerAt !== undefined ? interpolate(frame, [cr.cheerAt * fps, cr.cheerAt * fps + 20], [0, 1], clamp) : 0}
                  wave={0.5}
                  seed={`crowd-${scene.index}-${side}`}
                />
              );
            })
          : null}
      </SetScene>
      {impact >= 0 ? <ImpactFlash at={impact} /> : null}
    </Shake>
  );
};

/** A scene: the 3D shot plus its 2D overlays (title card, year stamp). */
export const SceneView: React.FC<{ scene: ResolvedScene; captions: Caption[]; title: string; whatIf: number }> = ({ scene, captions, title, whatIf }) => {
  const { fps } = useVideoConfig();
  const ys = scene.effects?.yearStamp;
  const ysAt = Math.round((ys?.at ?? 0.25) * fps);
  const ysHold = Math.round((ys?.hold ?? 2.2) * fps);
  const tc = scene.titleCard ? (typeof scene.titleCard === "string" ? scene.titleCard : title) : null;
  return (
    <AbsoluteFill>
      <Shake impacts={ys ? [ysAt + STAMP_IMPACT] : []}>
        <SceneShot scene={scene} captions={captions} whatIf={whatIf} />
      </Shake>
      {ys ? (
        <Sequence from={ysAt} durationInFrames={ysHold + 10}>
          <YearStamp text={ys.text} subtitle={ys.subtitle} exitAt={ysHold} />
        </Sequence>
      ) : null}
      {tc ? (
        <Sequence durationInFrames={scene.durationInFrames}>
          <TitleCard text={tc} exitAt={Math.max(20, scene.durationInFrames - 10)} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};

/** A stone statue of any preset on a plinth; crumbles away at vanishAt and rises back at returnAt. */
const StatueFx: React.FC<{ spec: NonNullable<NonNullable<ResolvedScene["effects"]>["statue"]>; scene: ResolvedScene }> = ({ spec, scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pos = markPos(scene, spec.mark ?? "center");
  const v = spec.vanishAt !== undefined ? Math.round(spec.vanishAt * fps) : -1;
  const r = spec.returnAt !== undefined ? Math.round(spec.returnAt * fps) : -1;
  let h = 1;
  if (v >= 0 && frame >= v) h = interpolate(frame, [v, v + 14], [1, 0], { ...clamp, easing: Easing.in(Easing.quad) });
  if (r >= 0 && frame >= r) h = interpolate(frame, [r, r + 18], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
  const s = spec.scale ?? 1.35;
  const plinthH = 0.55;
  return (
    <group position={pos}>
      <mesh position={[0, plinthH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.25, plinthH, 1.25]} />
        <ToonMaterial color={STONE} />
      </mesh>
      {h > 0.002 ? (
        <StoneContext.Provider value={STONE}>
          <group position={[0, plinthH, 0]} scale={[s * (0.6 + 0.4 * h), s * h, s * (0.6 + 0.4 * h)]}>
            <PresetCharacter preset={spec.preset} id={`statue-${scene.index}`} rotation={[0, ((spec.heading ?? 0) * Math.PI) / 180, 0]} face={{ expression: "proud", blink: false }} pose={{ joints: { chest: [-0.05, 0, 0] } }} />
          </group>
        </StoneContext.Provider>
      ) : null}
      {v >= 0 ? <Burst position={[0, plinthH + 0.6, 0]} at={v + 4} kind="dust" count={26} power={1.3} color={STONE} seed={`sv-${scene.index}`} /> : null}
      {r >= 0 ? <Burst position={[0, plinthH + 1.2, 0]} at={r + 6} kind="sparks" count={28} seed={`sr-${scene.index}`} color="#ffe27a" /> : null}
    </group>
  );
};
