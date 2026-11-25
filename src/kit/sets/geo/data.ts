import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import countries50 from "world-atlas/countries-50m.json";
import land50 from "world-atlas/land-50m.json";

// Natural Earth 1:50m (public domain) via world-atlas. Modern country outlines —
// historical regions are built from lists of modern countries or custom polygons.

export type LonLat = [number, number];
export type CountryFeature = Feature<Polygon | MultiPolygon, { name: string }> & { id: string };

const topo = countries50 as unknown as Topology<{ countries: GeometryCollection<{ name: string }>; land: GeometryCollection }>;
const landTopo = land50 as unknown as Topology<{ land: GeometryCollection }>;

export const COUNTRIES: CountryFeature[] = (feature(topo, topo.objects.countries) as FeatureCollection<Geometry, { name: string }>).features.filter(
  (f): f is CountryFeature => f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon",
);

export const LAND = feature(landTopo, landTopo.objects.land) as Feature<MultiPolygon> | FeatureCollection<MultiPolygon>;

const byName = new Map(COUNTRIES.map((f) => [f.properties.name.toLowerCase(), f]));
/** Common aliases → Natural Earth names. */
const ALIASES: Record<string, string> = {
  usa: "united states of america",
  "united states": "united states of america",
  us: "united states of america",
  uk: "united kingdom",
  britain: "united kingdom",
  england: "united kingdom",
  russia: "russia",
  "south korea": "south korea",
  drc: "dem. rep. congo",
  congo: "congo",
  persia: "iran",
  holland: "netherlands",
  czechia: "czechia",
};

/** Find a country by (case-insensitive) name or alias. */
export const country = (name: string): CountryFeature | undefined => {
  const k = name.toLowerCase();
  return byName.get(ALIASES[k] ?? k);
};

/** Resolve a list of names, warning (once) about typos. */
export const countries = (names: string[]): CountryFeature[] =>
  names.flatMap((n) => {
    const f = country(n);
    if (!f) console.warn(`[geo] unknown country "${n}"`);
    return f ? [f] : [];
  });

/** Polygon rings of a feature (outer + holes per polygon). */
export const polygonsOf = (f: Feature<Polygon | MultiPolygon>): LonLat[][][] =>
  f.geometry.type === "Polygon" ? [f.geometry.coordinates as LonLat[][]] : (f.geometry.coordinates as LonLat[][][]);

/** Handy historical-ish groupings (modern borders, for quick regions). */
export const REGIONS: Record<string, string[]> = {
  romanEmpireCore: ["Italy", "France", "Spain", "Portugal", "Greece", "Turkey", "Tunisia", "Egypt", "Syria", "Israel", "Lebanon", "Croatia", "Albania", "Bulgaria", "Libya", "Algeria", "Morocco", "Switzerland", "Austria", "Slovenia", "Bosnia and Herz.", "Serbia", "Montenegro", "North Macedonia", "Romania", "Belgium", "Luxembourg", "Cyprus", "Jordan"],
  iberia: ["Spain", "Portugal"],
  mingChina: ["China"],
  philippines: ["Philippines"],
  japan: ["Japan"],
  scandinavia: ["Norway", "Sweden", "Denmark"],
  britishIsles: ["United Kingdom", "Ireland"],
  mexico: ["Mexico"],
  andes: ["Peru", "Ecuador", "Bolivia", "Chile"],
};
