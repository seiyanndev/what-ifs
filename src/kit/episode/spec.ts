import type { Caption } from "@remotion/captions";
import { ACTION_NAMES, type ActionName } from "../actions";
import { MUSIC_MOODS, SFX_NAMES, type MusicMood, type SfxName } from "../audio";
import { EXPRESSIONS, PRESETS, type ExpressionName, type PresetId } from "../characters";
import type { Era, TimeOfDay } from "../look";
import { DRESSING_ITEMS, SETS, type CameraMove, type CameraName, type SetName, type LonLat } from "../sets";

// ---------------------------------------------------------------------------
// scenes.json — one file per episode (episodes/<name>/scenes.json). Times are SECONDS relative to the
// scene start unless noted. Scene durations come from the voiceover (each scene lasts from its first
// narrated word to the next scene's first word), so you never type durations.
// ---------------------------------------------------------------------------

export type CharacterSpec = {
  preset: PresetId;
  /** A named mark of the set ("center", "left", "throne", …) or [x, y, z]. */
  mark?: string | [number, number, number];
  /** Facing in degrees (0 = toward camera). */
  heading?: number;
  /** Lip-sync this character to the narration. */
  talking?: boolean;
  /** Show this person in old age (elder body, grey hair/beard). */
  elder?: boolean;
  expression?: ExpressionName;
  /** Action cues; the first defaults to idle at 0. */
  actions?: { action: ActionName; at?: number; params?: Record<string, number | string>; expression?: ExpressionName; heading?: number }[];
};

export type GeoSpec = {
  /** GLOBE: lon/lat facing the camera; animate with viewTo. */
  view?: LonLat;
  viewTo?: LonLat;
  /** Zoom from the whole globe toward viewTo (ZOOM_TO_MAP). */
  zoom?: boolean;
  /** MAP_REGION window: centre + span in degrees of latitude. */
  center?: LonLat;
  span?: number;
  /** `shrink: true` starts full and recedes (an empire breaking apart); `pulse: true` glows on and off. */
  fills?: { countries?: string[]; polygon?: LonLat[]; color: string; from?: number; to?: number; origin?: LonLat; shrink?: boolean; pulse?: boolean; opacity?: number }[];
  /** `ships: 3` sails a small fleet along the route (staggered, side by side); `sail` colours the sails. */
  routes?: { path: LonLat[]; icon?: "ship" | "army" | "none"; color?: string; from?: number; to?: number; ships?: number; sail?: string }[];
  pins?: { at: LonLat; color?: string; at_time?: number }[];
  /** MAP_REGION: little flags planted on the map, popping in at `at_time` (e.g. a power spreading). */
  flags?: { at: LonLat; color?: string; accent?: string; at_time?: number }[];
  /** `size`: text height in world units (globe radius is 1.6; use ~0.045 on a zoomed globe). */
  labels?: { at: LonLat; text: string; style?: "region" | "city" | "title"; from?: number; size?: number }[];
};

export type EffectsSpec = {
  /** YEAR_STAMP slams in (with shake + stamp SFX). */
  yearStamp?: { text: string; subtitle?: string; at?: number; hold?: number };
  /** TIMELINE_SPLIT: REAL (left) vs WHAT IF (right), then WHAT IF takes over. Music drops here. Every later scene uses the What If grade. */
  timelineSplit?: { takeoverAt?: number; whatIfCharacters?: CharacterSpec[] };
  fire?: { mark?: string | [number, number, number]; scale?: number };
  /** Plague fog + sickly tint. `{ from: 0.5 }` rolls it in from that second. It never shows on the What If side of a split (the plague never came). */
  plagueFog?: boolean | { from?: number };
  /** `speed` in units per second (default 1.2; lower it for long scenes so the fleet stays in frame). */
  shipFleet?: { count?: number; formation?: "v" | "line" | "grid"; heading?: number; speed?: number; position?: [number, number, number]; scale?: number };
  fallingScrolls?: boolean;
  asteroid?: { at?: number; target?: [number, number, number] };
  /** `flanks: true` splits it into two groups left and right that frame the action instead of covering it. */
  /** A stone statue of a preset on a plinth. `vanishAt` crumbles it away, `returnAt` raises it back (seconds). */
  statue?: { preset: PresetId; mark?: string | [number, number, number]; heading?: number; scale?: number; vanishAt?: number; returnAt?: number };
  crowd?: { count?: number; pool?: string; cheerAt?: number; area?: [number, number]; position?: [number, number, number]; flanks?: boolean; scale?: number };
};

/** Place any set-dressing item by name (see DRESSING_ITEMS): columns, statues, signs with text… */
export type DressingSpec = {
  item: import("../sets").DressingItem;
  /** A set mark or [x, y, z]. */
  at: string | [number, number, number];
  /** Rotation in degrees. */
  rotation?: number;
  scale?: number;
  /** Sign: text and style ("stone" | "neon" | "wood"). House: style ("medieval" | "tudor" | "ancient" | "modern"). */
  text?: string;
  style?: string;
  color?: string;
  height?: number;
  /** Size overrides for items that take them (House, Factory: w, d, h). */
  w?: number;
  d?: number;
  h?: number;
  /** House: open its window shutters, then swing them closed at this second. */
  closeAt?: number;
};

export type SceneSpec = {
  id?: string;
  set: SetName;
  era?: Era;
  timeOfDay?: TimeOfDay;
  camera?: CameraName;
  move?: CameraMove;
  /** What the narrator says during this scene (script markup allowed: *emphasis*, word{spoken}, ...). */
  narration: string;
  /** Show the "What if…?" title card over this scene (true = use the episode title). */
  titleCard?: boolean | string;
  /** Transition INTO this scene. */
  transition?: "cut" | "ripple";
  characters?: CharacterSpec[];
  /** Ship style for this scene's port ships, fleets and route icons ("junk" = Chinese treasure junks). */
  ships?: "galleon" | "junk";
  /** Extra set pieces for this scene only. */
  dressing?: DressingSpec[];
  effects?: EffectsSpec;
  /** GLOBE / MAP_REGION data. */
  geo?: GeoSpec;
  /** Change the music mood at the start of this scene ("silence" stops it). */
  music?: MusicMood | "silence";
  sfx?: { name: SfxName; at?: number; volume?: number }[];
  /** Move this scene's captions to the upper part of the screen (when the action is low in frame). */
  captions?: "bottom" | "top";
  /** Cut the music to silence at the start of this scene and swell it back (like the split does). */
  musicDrop?: boolean;
  /** Force the grade: 0 real, 1 what if (default: 0 before the split, 1 after). */
  whatIf?: number;
  /** Extra seconds after the narration of the LAST scene (outro breathing room). */
  tail?: number;
  /** Use this scene for the thumbnail. */
  thumb?: boolean;
};

export type EpisodeSpec = {
  title: string;
  /** Face-off thumbnail (REAL vs WHAT IF close-ups). Without it, --thumb uses a frame of the split scene. */
  thumbnail?: import("./Thumbnail").ThumbnailSpec;
  voice?: string;
  /** Extra words to colour as names in captions. */
  names?: string[];
  scenes: SceneSpec[];
};

/** What the pipeline resolves and passes to the Episode composition. */
export type ResolvedScene = SceneSpec & { from: number; durationInFrames: number; index: number; afterSplit: boolean };
export type EpisodeProps = {
  name: string;
  spec: EpisodeSpec;
  scenes: ResolvedScene[];
  captions: Caption[];
  durationInFrames: number;
  /** "voice/<name>/voice.wav" (staticFile path) or null for silent previews. */
  voice: string | null;
  /** Render as a thumbnail (adds the WHAT IF…? overlay). */
  thumbnail?: boolean;
  /** "final" (default) or "preview" (faster: no grain, smaller shadows/faces, no MSAA) or explicit knobs. */
  quality?: "final" | "preview" | Partial<import("../look").Quality>;
};

// ---------------------------------------------------------------------------
// Validation with friendly messages
// ---------------------------------------------------------------------------
const lev = (a: string, b: string) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};
const suggest = (v: string, options: readonly string[]) => {
  const best = [...options].sort((x, y) => lev(v.toLowerCase(), x.toLowerCase()) - lev(v.toLowerCase(), y.toLowerCase()))[0];
  return best ? ` Did you mean "${best}"?` : "";
};

export const validateEpisode = (spec: EpisodeSpec): string[] => {
  const errs: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) errs.push(msg);
  };
  if (!spec.title) errs.push("Missing \"title\".");
  if (!Array.isArray(spec.scenes) || !spec.scenes.length) errs.push("\"scenes\" must be a non-empty list.");
  const presets = Object.keys(PRESETS);
  const exprs = Object.keys(EXPRESSIONS);
  let splits = 0;
  (spec.scenes ?? []).forEach((s, i) => {
    const where = `scene ${i + 1}${s.id ? ` (${s.id})` : ""}`;
    check(s.set in SETS, `${where}: unknown set "${s.set}".${suggest(String(s.set), Object.keys(SETS))}`);
    check(typeof s.narration === "string" && s.narration.trim().length > 0, `${where}: "narration" is required (the scene length comes from it).`);
    if (s.music) check(s.music === "silence" || (MUSIC_MOODS as readonly string[]).includes(s.music), `${where}: unknown music "${s.music}".${suggest(s.music, [...MUSIC_MOODS, "silence"])}`);
    for (const x of s.sfx ?? []) check((SFX_NAMES as readonly string[]).includes(x.name), `${where}: unknown sfx "${x.name}".${suggest(x.name, SFX_NAMES)}`);
    const chars = [...(s.characters ?? []), ...(s.effects?.timelineSplit?.whatIfCharacters ?? [])];
    if (s.effects?.statue) check(presets.includes(s.effects.statue.preset), `${where}: unknown statue preset "${s.effects.statue.preset}".${suggest(s.effects.statue.preset, presets)}`);
    for (const c of chars) {
      check(presets.includes(c.preset), `${where}: unknown preset "${c.preset}".${suggest(c.preset, presets)}`);
      if (typeof c.mark === "string" && s.set in SETS) {
        const marks = Object.keys(SETS[s.set].marks);
        check(marks.includes(c.mark), `${where}: set ${s.set} has no mark "${c.mark}".${suggest(c.mark, marks)} (marks: ${marks.join(", ")})`);
      }
      if (c.expression) check(exprs.includes(c.expression), `${where}: unknown expression "${c.expression}".${suggest(c.expression, exprs)}`);
      for (const a of c.actions ?? []) {
        check((ACTION_NAMES as readonly string[]).includes(a.action), `${where}: unknown action "${a.action}".${suggest(a.action, ACTION_NAMES)}`);
        if (a.expression) check(exprs.includes(a.expression), `${where}: unknown expression "${a.expression}".${suggest(a.expression, exprs)}`);
      }
    }
    if (s.effects?.timelineSplit) splits++;
    for (const d of s.dressing ?? []) {
      check(d.item in DRESSING_ITEMS, `${where}: unknown dressing item "${d.item}".${suggest(String(d.item), Object.keys(DRESSING_ITEMS))}`);
      if (typeof d.at === "string" && s.set in SETS) check(d.at in SETS[s.set].marks, `${where}: dressing mark "${d.at}" doesn't exist on ${s.set}.`);
      if (d.item === "Sign") check(Boolean(d.text), `${where}: a Sign needs "text".`);
    }
    if ((s.set === "GLOBE" || s.set === "MAP_REGION") && !s.geo) errs.push(`${where}: ${s.set} needs a "geo" block.`);
    if (s.set === "MAP_REGION" && s.geo && !s.geo.center) errs.push(`${where}: MAP_REGION needs geo.center (and optionally geo.span).`);
  });
  check(splits <= 1, `Only one scene can have effects.timelineSplit (found ${splits}).`);
  return errs;
};

export type { MusicMood, SfxName };
