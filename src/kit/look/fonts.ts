import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Bundled display fonts (in public/fonts, licences alongside) so renders look identical on every machine.
//   Luckiest Guy (Apache-2.0) — year stamps, titles, big punchy words.
//   Lilita One (OFL-1.1)      — secondary display text, labels.

export const FONTS = {
  stamp: "Luckiest Guy",
  display: "Lilita One",
} as const;

/** CSS font stacks to use everywhere. */
export const FONT_STAMP = `"${FONTS.stamp}", "Lilita One", Impact, sans-serif`;
export const FONT_DISPLAY = `"${FONTS.display}", "Luckiest Guy", Helvetica, Arial, sans-serif`;

let loaded: Promise<unknown> | null = null;
/** Load the bundled fonts once (loadFont holds the render until they're ready). */
export const ensureFonts = () => {
  if (!loaded) {
    loaded = Promise.all([
      loadFont({ family: FONTS.stamp, url: staticFile("fonts/LuckiestGuy.woff2"), weight: "400" }),
      loadFont({ family: FONTS.display, url: staticFile("fonts/LilitaOne.woff2"), weight: "400" }),
    ]);
  }
  return loaded;
};
ensureFonts();
