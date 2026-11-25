// Era palettes. Each era is a small, coherent set of colors so scenes read as one "world".
// Use these names in sets/costumes instead of raw hex so the look stays consistent.

export type Era = "ancient" | "medieval" | "ageOfSail" | "modern";

export type EraPalette = {
  label: string;
  /** Three stone/ground shades, light → dark (paving, walls). */
  stone: [string, string, string];
  ground: string; // grass / soil / sand
  foliage: [string, string]; // light, dark
  wood: string;
  cloth: [string, string, string]; // primary, secondary, accent fabrics
  metal: string;
  accent: string; // signature color of the era (banners, trims)
};

export const ERA_PALETTES: Record<Era, EraPalette> = {
  ancient: {
    label: "Ancient — warm sandstone",
    stone: ["#ecd3a6", "#d9b47e", "#b98d5c"],
    ground: "#c9a96b",
    foliage: ["#8fa35a", "#5e7a3e"],
    wood: "#8a5a3b",
    cloth: ["#f4ede0", "#b5463c", "#3f6f9a"],
    metal: "#d6a444",
    accent: "#b5463c",
  },
  medieval: {
    label: "Medieval — muted earth",
    stone: ["#c9c0ae", "#a39a88", "#7b7466"],
    ground: "#7f8a4e",
    foliage: ["#6f8a46", "#465f31"],
    wood: "#6b4a32",
    cloth: ["#8c6b4a", "#4f6b5a", "#8e3b38"],
    metal: "#9aa1a8",
    accent: "#8e3b38",
  },
  ageOfSail: {
    label: "Age of Sail — teal & gold",
    stone: ["#e2d6bd", "#bfae8e", "#8f7f63"],
    ground: "#d8c393",
    foliage: ["#5f9a6e", "#3c6d52"],
    wood: "#7a4d2e",
    cloth: ["#1f6f78", "#f1e6cc", "#c9962e"],
    metal: "#c9962e",
    accent: "#1f8a8a",
  },
  modern: {
    label: "Modern — clean blue/white",
    stone: ["#eef1f4", "#c7cfd8", "#8f9aa7"],
    ground: "#8cbf6a",
    foliage: ["#79b85e", "#4d8a45"],
    wood: "#b08a63",
    cloth: ["#2f6fd6", "#f5f7fa", "#f2b134"],
    metal: "#b9c2cc",
    accent: "#2f6fd6",
  },
};

/** 10 diverse skin tones for characters, light → deep. */
export const SKIN_TONES = [
  "#fde3cf",
  "#f6d0b1",
  "#ecbc96",
  "#e0a982",
  "#cf9268",
  "#b97a52",
  "#a0643f",
  "#86502f",
  "#6b3d24",
  "#4f2c1a",
] as const;
