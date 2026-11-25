import { Performer } from "../kit/actions";
import type { PresetId } from "../kit/characters";
import type { TimeOfDay } from "../kit/look";
import { boundsAround, regionCentre, SetScene, SETS, type SetName } from "../kit/sets";
import { MAGELLAN_ROUTE } from "./GlobeDemo";

/** Who stands in each set for the preview, and on which mark. */
const CAST: Partial<Record<SetName, { preset: PresetId; mark: string; heading?: number }[]>> = {
  ANCIENT_CITY: [
    { preset: "roman_emperor", mark: "center", heading: 10 },
    { preset: "roman_soldier", mark: "left", heading: 25 },
  ],
  THRONE_ROOM: [
    { preset: "king", mark: "throne" },
    { preset: "knight", mark: "left", heading: 30 },
  ],
  BATTLEFIELD: [
    { preset: "knight", mark: "leftArmy", heading: 60 },
    { preset: "viking", mark: "rightArmy", heading: -60 },
  ],
  LIBRARY: [{ preset: "gutenberg", mark: "desk", heading: 10 }],
  PORT: [
    { preset: "magellan", mark: "center", heading: 15 },
    { preset: "ming_sailor", mark: "right", heading: -20 },
  ],
  MEDIEVAL_VILLAGE: [
    { preset: "peasant", mark: "center", heading: 10 },
    { preset: "monk", mark: "market", heading: -30 },
  ],
  WORKSHOP: [{ preset: "inventor", mark: "center", heading: 20 }],
  MODERN_CITY: [
    { preset: "news_anchor", mark: "left", heading: 15 },
    { preset: "modern_kid", mark: "right", heading: -15 },
  ],
  JUNGLE_PREHISTORIC: [{ preset: "explorer", mark: "center", heading: 20 }],
  BEACH: [{ preset: "lapulapu", mark: "center", heading: 0 }],
  TROPICAL_VILLAGE: [{ preset: "filipino_warrior", mark: "center", heading: 10 }],
};

export const SetPreview: React.FC<{ set: SetName; timeOfDay?: TimeOfDay }> = ({ set, timeOfDay }) => {
  const info = SETS[set];
  return (
    <SetScene
      set={set}
      timeOfDay={timeOfDay}
      camera="wide"
      move="push"
      duration={90}
      globe={{
        view: [-40, 15],
        fills: [{ countries: ["Spain", "Portugal"], color: "#c0392b" }],
        routes: [{ from: MAGELLAN_ROUTE[0], via: MAGELLAN_ROUTE.slice(1, -1), to: MAGELLAN_ROUTE[MAGELLAN_ROUTE.length - 1], progress: 0.45, icon: "ship" }],
        labels: [{ at: [-4, 43], text: "Spain", style: "region" }],
        pins: [{ at: [-6, 37.4] }],
      }}
      map={{
        bounds: boundsAround([122, 11], 22, 0.85),
        width: 5.4,
        fills: [{ countries: ["Philippines"], color: "#2f8a6a", progress: 1, opacity: 0.55 }],
        routes: [{ from: [144.8, 13.4], to: [124.0, 10.3], progress: 0.7, icon: "ship", color: "#c0392b" }],
        pins: [{ at: [124.0, 10.3], color: "#f2b134" }],
        labels: [
          { at: regionCentre(["Philippines"]), text: "Philippines", style: "region" },
          { at: [124.0, 9.0], text: "Mactan", style: "city" },
        ],
        raised: [],
      }}
    >
      {(CAST[set] ?? []).map((c, i) => (
        <Performer key={i} preset={c.preset} id={`${set}-${i}`} position={info.marks[c.mark] ?? info.marks.center} heading={c.heading ?? 0} cues={[{ action: "idle", at: 0 }]} />
      ))}
    </SetScene>
  );
};
