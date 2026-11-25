import { createContext, useContext } from "react";
import { TIME_OF_DAY, type TimeOfDay } from "./lighting";

export type LookState = {
  timeOfDay: TimeOfDay;
  rimColor: string;
  rimIntensity: number;
  shadowTint: string;
};

const fromTime = (t: TimeOfDay): LookState => ({
  timeOfDay: t,
  rimColor: TIME_OF_DAY[t].rim.color,
  rimIntensity: TIME_OF_DAY[t].rim.intensity,
  shadowTint: TIME_OF_DAY[t].shadowTint,
});

export const LookContext = createContext<LookState>(fromTime("day"));
export const lookFromTime = fromTime;
export const useLook = () => useContext(LookContext);
