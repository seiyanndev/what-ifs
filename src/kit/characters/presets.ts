import type { Era } from "../look";
import { HAIR_COLORS, METAL, type CostumeSpec } from "./Costume";
import type { ExpressionName } from "./Face";
import { BODY_TYPES, type BodyShape } from "./rig";

// Named historical (and everyday) characters. Each is a recipe: body + skin + costume + mood.
// Famous figures are recognisable by SILHOUETTE and SIGNATURE ITEM, never by a realistic likeness.

export type CharacterPreset = {
  label: string;
  era: Era;
  shape: BodyShape;
  /** Index into SKIN_TONES (0 light → 9 deep). Crowds vary it by ±1. */
  skin: number;
  costume: CostumeSpec;
  expression: ExpressionName;
  /** Named historical person (excluded from crowds). */
  named?: boolean;
  /** Why it reads as this person / accuracy notes. */
  note?: string;
};

const p = (x: CharacterPreset) => x;

export const PRESETS = {
  roman_emperor: p({
    label: "Roman Emperor",
    era: "ancient",
    shape: BODY_TYPES.standard,
    skin: 2,
    expression: "proud",
    costume: {
      outfit: { type: "toga", colors: { trim: "#6a2a7a", second: "#efe6d4" } },
      hair: { style: "short", color: HAIR_COLORS.darkBrown },
      headwear: { type: "laurel", color: "#c9a43a", accent: "#a8862a" },
      props: { right: { type: "scroll" } },
    },
    note: "Purple-trimmed toga + golden laurel.",
  }),
  roman_soldier: p({
    label: "Roman Soldier",
    era: "ancient",
    shape: BODY_TYPES.heroic,
    skin: 3,
    expression: "determined",
    costume: {
      outfit: { type: "legionary" },
      headwear: { type: "galea" },
      props: { right: { type: "spear" }, left: { type: "shield", color: "#a8322d", accent: METAL.gold } },
    },
  }),
  roman_engineer: p({
    label: "Roman Engineer",
    era: "ancient",
    shape: BODY_TYPES.stocky,
    skin: 4,
    expression: "focused",
    costume: {
      outfit: { type: "peasantTunic", colors: { main: "#c9a96b", second: "#8a6a4a", trim: "#7a4a2e" } },
      hair: { style: "curly", color: HAIR_COLORS.brown },
      props: { right: { type: "scroll", color: "#e8d6a8" } },
    },
  }),
  scholar_greek: p({
    label: "Greek Scholar",
    era: "ancient",
    shape: BODY_TYPES.elder,
    skin: 3,
    expression: "thinking",
    costume: {
      outfit: { type: "toga", colors: { main: "#ebe1cc", second: "#dcd0b6", trim: "#3f6f9a" } },
      hair: { style: "curly", color: HAIR_COLORS.grey },
      facialHair: { beard: "full", mustache: "full", color: HAIR_COLORS.grey },
      props: { right: { type: "scroll" } },
    },
  }),
  monk: p({
    label: "Monk",
    era: "medieval",
    shape: BODY_TYPES.round,
    skin: 1,
    expression: "neutral",
    costume: { outfit: { type: "monkRobe" }, headwear: { type: "monkHood" }, props: { right: { type: "book", color: "#5a2f2a" } } },
  }),
  peasant: p({
    label: "Peasant",
    era: "medieval",
    shape: BODY_TYPES.stocky,
    skin: 3,
    expression: "neutral",
    costume: { outfit: { type: "peasantTunic" }, hair: { style: "short", color: HAIR_COLORS.brown } },
  }),
  lord: p({
    label: "Lord",
    era: "medieval",
    shape: BODY_TYPES.round,
    skin: 1,
    expression: "smirk",
    costume: {
      outfit: { type: "royalRobe", colors: { main: "#2f5a4a", trim: METAL.gold } },
      hair: { style: "short", color: HAIR_COLORS.auburn },
      facialHair: { mustache: "curled" },
      props: { right: { type: "coinBag" } },
    },
  }),
  king: p({
    label: "King",
    era: "medieval",
    shape: BODY_TYPES.stocky,
    skin: 1,
    expression: "proud",
    costume: {
      outfit: { type: "royalRobe" },
      headwear: { type: "crown" },
      hair: { style: "short", color: HAIR_COLORS.grey },
      facialHair: { beard: "full", mustache: "full" },
      props: { right: { type: "scepter" } },
    },
  }),
  queen: p({
    label: "Queen",
    era: "medieval",
    shape: BODY_TYPES.slim,
    skin: 2,
    expression: "proud",
    costume: {
      outfit: { type: "royalRobe", colors: { main: "#5a2f7a" } },
      headwear: { type: "crown", accent: "#2f8a6a" },
      hair: { style: "bun", color: HAIR_COLORS.auburn },
      props: { right: { type: "scepter", accent: "#2f6fd6" } },
    },
  }),
  knight: p({
    label: "Knight",
    era: "medieval",
    shape: BODY_TYPES.heroic,
    skin: 1,
    expression: "determined",
    costume: {
      outfit: { type: "knightArmor" },
      hair: { style: "short", color: HAIR_COLORS.blonde },
      props: { right: { type: "sword" }, left: { type: "shield", color: "#2f5fa8", accent: METAL.gold } },
    },
  }),
  gutenberg: p({
    label: "Gutenberg",
    era: "medieval",
    shape: BODY_TYPES.elder,
    skin: 1,
    expression: "focused",
    named: true,
    costume: {
      outfit: { type: "scholarRobe", colors: { main: "#5a3a2a", second: "#d9c9a0", trim: "#3a2418" } },
      headwear: { type: "beret", color: "#3a2a22" },
      hair: { style: "short", color: "#5a3a22" },
      facialHair: { wizard: true, mustache: "walrus", color: "#5a3a22" },
      props: { right: { type: "book", color: "#3a2418" } },
    },
    note: "Fur-brown robe, soft cap, long beard, a printed book.",
  }),
  magellan: p({
    label: "Magellan",
    era: "ageOfSail",
    shape: BODY_TYPES.standard,
    skin: 2,
    expression: "determined",
    named: true,
    costume: {
      outfit: { type: "explorerCoat", colors: { main: "#2a2a36", second: "#e8dcc0", trim: METAL.gold } },
      hair: { style: "short", color: HAIR_COLORS.darkBrown },
      facialHair: { beard: "full", mustache: "full", color: HAIR_COLORS.darkBrown },
      props: { right: { type: "map" } },
    },
    note: "Dark navigator's coat, full beard, sea chart. No telescope (invented ~1608, after his voyage).",
  }),
  lapulapu: p({
    label: "Lapulapu",
    era: "ageOfSail",
    shape: BODY_TYPES.heroic,
    skin: 6,
    expression: "determined",
    named: true,
    costume: {
      outfit: { type: "filipinoWarrior" },
      headwear: { type: "headwrap" },
      hair: { style: "long", color: HAIR_COLORS.black },
      props: { right: { type: "kampilan" }, left: { type: "shield", color: "#7a4d2e", accent: METAL.bronze } },
    },
    note: "Datu of Mactan: red head wrap (putong), bahag, kampilan + shield. Generic and respectful.",
  }),
  filipino_warrior: p({
    label: "Mactan Warrior",
    era: "ageOfSail",
    shape: BODY_TYPES.standard,
    skin: 6,
    expression: "determined",
    costume: {
      outfit: { type: "filipinoWarrior", colors: { main: "#8e3b38" } },
      headwear: { type: "headwrap", color: "#8e3b38" },
      hair: { style: "short", color: HAIR_COLORS.black },
      props: { right: { type: "spear" } },
    },
  }),
  spanish_soldier: p({
    label: "Spanish Soldier",
    era: "ageOfSail",
    shape: BODY_TYPES.standard,
    skin: 2,
    expression: "focused",
    costume: {
      outfit: { type: "knightArmor", colors: { second: "#b5463c", trim: METAL.gold } },
      headwear: { type: "morion" },
      hair: { style: "short", color: HAIR_COLORS.darkBrown },
      facialHair: { mustache: "full" },
      props: { right: { type: "spear" } },
    },
  }),
  zheng_he: p({
    label: "Zheng He",
    era: "ageOfSail",
    shape: BODY_TYPES.heroic,
    skin: 3,
    expression: "proud",
    named: true,
    costume: {
      outfit: { type: "mingRobe", colors: { main: "#2f4f8a", trim: METAL.gold, metal: "#5fa88a" } },
      headwear: { type: "mingHat" },
      hair: { style: "bun", color: HAIR_COLORS.black },
      props: { right: { type: "map" } },
    },
    note: "Ming admiral: blue official robe, winged hat, sea chart; tall build.",
  }),
  ming_emperor: p({
    label: "Ming Emperor",
    era: "ageOfSail",
    shape: BODY_TYPES.stocky,
    skin: 3,
    expression: "proud",
    costume: {
      outfit: { type: "mingRobe", colors: { main: "#e2b42a", trim: "#c0392b", metal: "#c0392b" } },
      headwear: { type: "mingHat" },
      hair: { style: "bun", color: HAIR_COLORS.black },
      facialHair: { mustache: "thin", beard: "goatee" },
      props: { right: { type: "scroll", color: "#f2e2a8" } },
    },
    note: "Imperial yellow robe.",
  }),
  ming_sailor: p({
    label: "Ming Sailor",
    era: "ageOfSail",
    shape: BODY_TYPES.standard,
    skin: 3,
    expression: "happy",
    costume: {
      outfit: { type: "peasantTunic", colors: { main: "#3f5f7a", second: "#2a2f3a", trim: "#c9a96b" } },
      headwear: { type: "headwrap", color: "#e8dcc0", accent: "#c9a96b" },
      hair: { style: "bun", color: HAIR_COLORS.black },
    },
  }),
  native_leader: p({
    label: "Native Leader",
    era: "ageOfSail",
    shape: BODY_TYPES.heroic,
    skin: 5,
    expression: "proud",
    costume: {
      outfit: { type: "peasantTunic", colors: { main: "#b08a5a", second: "#8a6a4a", trim: "#2f8a8a" } },
      headwear: { type: "featherHeaddress" },
      hair: { style: "braids", color: HAIR_COLORS.black },
    },
    note: "Generic and respectful: no war paint, no specific nation's regalia.",
  }),
  napoleon: p({
    label: "Napoleon",
    era: "ageOfSail",
    shape: BODY_TYPES.standard,
    skin: 1,
    expression: "determined",
    named: true,
    costume: {
      outfit: { type: "napoleonic" },
      headwear: { type: "bicorne" },
      hair: { style: "short", color: HAIR_COLORS.darkBrown },
      props: { right: { type: "map" } },
    },
    note: "Bicorne worn sideways + blue coat with gold epaulettes. Average height (the 'short' myth is wrong).",
  }),
  samurai: p({
    label: "Samurai",
    era: "medieval",
    shape: BODY_TYPES.heroic,
    skin: 3,
    expression: "focused",
    costume: { outfit: { type: "samurai" }, headwear: { type: "kabuto" }, props: { right: { type: "sword" } } },
  }),
  viking: p({
    label: "Viking",
    era: "medieval",
    shape: BODY_TYPES.stocky,
    skin: 0,
    expression: "laughing",
    costume: {
      outfit: { type: "peasantTunic", colors: { main: "#5a6a7a", second: "#5a4a3a", trim: METAL.bronze } },
      headwear: { type: "vikingHelmet" },
      hair: { style: "braids", color: HAIR_COLORS.red },
      facialHair: { beard: "full", mustache: "full", color: HAIR_COLORS.red },
      props: { right: { type: "axe" }, left: { type: "shield", color: "#c9962e", accent: METAL.iron } },
    },
    note: "No horns on the helmet (historically accurate).",
  }),
  inventor: p({
    label: "Inventor",
    era: "modern",
    shape: BODY_TYPES.elder,
    skin: 4,
    expression: "wonder",
    costume: {
      outfit: { type: "suit", colors: { main: "#6b4a32", second: "#f1ede2", trim: "#c9962e" } },
      hair: { style: "curly", color: HAIR_COLORS.white },
      facialHair: { mustache: "walrus", color: HAIR_COLORS.white },
      props: { right: { type: "gears" } },
    },
  }),
  explorer: p({
    label: "Explorer",
    era: "ageOfSail",
    shape: BODY_TYPES.standard,
    skin: 4,
    expression: "happy",
    costume: {
      outfit: { type: "explorerCoat" },
      headwear: { type: "tricorne" },
      hair: { style: "ponytail", color: HAIR_COLORS.brown },
      props: { right: { type: "telescope" } },
    },
  }),
  modern_kid: p({
    label: "Kid",
    era: "modern",
    shape: BODY_TYPES.kid,
    skin: 6,
    expression: "happy",
    costume: {
      outfit: { type: "modernCasual", colors: { main: "#e8403a", second: "#3a5a8a" } },
      hair: { style: "curly", color: HAIR_COLORS.black },
      props: { right: { type: "book", color: "#2f6fd6" } },
    },
  }),
  modern_adult: p({
    label: "Adult",
    era: "modern",
    shape: BODY_TYPES.slim,
    skin: 5,
    expression: "neutral",
    costume: { outfit: { type: "modernCasual", colors: { main: "#4f8a5a" } }, hair: { style: "short", color: HAIR_COLORS.black } },
  }),
  news_anchor: p({
    label: "News Anchor",
    era: "modern",
    shape: BODY_TYPES.standard,
    skin: 7,
    expression: "neutral",
    costume: { outfit: { type: "suit", colors: { main: "#2a3550", trim: "#c9962e" } }, hair: { style: "bun", color: HAIR_COLORS.black } },
  }),
} satisfies Record<string, CharacterPreset>;

export type PresetId = keyof typeof PRESETS;

/** The 26 characters from the brief, in lineup order. */
export const CAST: PresetId[] = [
  "roman_emperor",
  "roman_soldier",
  "roman_engineer",
  "scholar_greek",
  "monk",
  "peasant",
  "lord",
  "king",
  "queen",
  "knight",
  "gutenberg",
  "magellan",
  "lapulapu",
  "spanish_soldier",
  "zheng_he",
  "ming_emperor",
  "ming_sailor",
  "native_leader",
  "napoleon",
  "samurai",
  "viking",
  "inventor",
  "explorer",
  "modern_kid",
  "modern_adult",
  "news_anchor",
];

/** Crowd pools: who fills the background of a scene. Named people are never in crowds. */
export const CROWD_POOLS: Record<string, PresetId[]> = {
  ancient: ["roman_soldier", "roman_engineer", "scholar_greek", "peasant", "peasant"],
  medieval: ["peasant", "peasant", "monk", "knight", "lord"],
  ageOfSail: ["explorer", "spanish_soldier", "peasant", "ming_sailor"],
  modern: ["modern_adult", "modern_adult", "modern_kid", "news_anchor", "inventor"],
  romanArmy: ["roman_soldier"],
  vikings: ["viking"],
  mactan: ["filipino_warrior"],
  spanishExpedition: ["spanish_soldier", "spanish_soldier", "explorer"],
  mingFleet: ["ming_sailor"],
  samuraiArmy: ["samurai"],
  court: ["lord", "knight", "monk"],
};
