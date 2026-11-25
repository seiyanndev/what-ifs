import { createContext, useContext } from "react";
import { ERA_PALETTES, type Era, type EraPalette, type TimeOfDay } from "../look";

/** Era + time of day for everything inside a set (dressing pulls colours from here). */
export type SetCtx = { era: Era; timeOfDay: TimeOfDay; pal: EraPalette; night: boolean };
export const SetContext = createContext<SetCtx>({ era: "ancient", timeOfDay: "day", pal: ERA_PALETTES.ancient, night: false });
export const useSet = () => useContext(SetContext);
export const makeSetCtx = (era: Era, timeOfDay: TimeOfDay): SetCtx => ({ era, timeOfDay, pal: ERA_PALETTES[era], night: timeOfDay === "night" });
