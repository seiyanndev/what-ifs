import { createContext, useContext } from "react";

/**
 * Stone mode: every ToonMaterial (and face) inside renders as carved stone of this colour.
 * Wrap any character to make a statue: <StoneContext.Provider value={STONE}>…</StoneContext.Provider>
 */
export const STONE = "#b9b2a6";
export const StoneContext = createContext<string | null>(null);
export const useStone = () => useContext(StoneContext);
