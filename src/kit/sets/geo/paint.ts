import { random } from "remotion";
import { COUNTRIES, countries as resolveCountries, LAND, polygonsOf, type CountryFeature, type LonLat } from "./data";
import { toUnit, type GeoBounds } from "./project";

// Paints a map (any lon/lat window) onto a canvas: ocean, shore glow, land, borders, ink coastline,
// animated region fills (BORDER_SPREAD) and an optional parchment finish.

export type MapStyleName = "storybook" | "parchment" | "modern";

export const MAP_STYLES: Record<
  MapStyleName,
  { ocean: string; oceanDeep: string; shore: string; land: string[]; coast: string; border: string; grid: string; waves: string; paper?: boolean }
> = {
  storybook: {
    ocean: "#6cc0d8",
    oceanDeep: "#3f93b8",
    shore: "#bfe8ef",
    land: ["#f3e5bd", "#e9dca8", "#e2e9b3", "#f2d9b4", "#ead2b8", "#dde7bd"],
    coast: "#3b2a3f",
    border: "rgba(80,58,72,0.45)",
    grid: "rgba(255,255,255,0.22)",
    waves: "rgba(255,255,255,0.35)",
  },
  parchment: {
    ocean: "#d8c597",
    oceanDeep: "#c2a974",
    shore: "#e8d9b0",
    land: ["#f2e4bf", "#efdfb5", "#f4e8c8"],
    coast: "#5a3d28",
    border: "rgba(90,61,40,0.45)",
    grid: "rgba(90,61,40,0.22)",
    waves: "rgba(90,61,40,0.25)",
    paper: true,
  },
  modern: {
    ocean: "#4a8fe0",
    oceanDeep: "#2f6fd6",
    shore: "#9cc6f5",
    land: ["#f5f7fa", "#eef2f7", "#e8eef6"],
    coast: "#1d2f5a",
    border: "rgba(29,47,90,0.35)",
    grid: "rgba(255,255,255,0.18)",
    waves: "rgba(255,255,255,0.2)",
  },
};

/** Era → default map style. */
export const ERA_MAP_STYLE: Record<string, MapStyleName> = { ancient: "parchment", medieval: "parchment", ageOfSail: "parchment", modern: "modern" };

/** A coloured region (BORDER_SPREAD). Modern countries by name, or a custom lon/lat polygon. */
export type RegionFill = {
  countries?: string[];
  polygon?: LonLat[];
  color: string;
  /** 0 → 1: how far the colour has spread from `origin` (1 = fully filled). */
  progress?: number;
  /** Where the spread starts (defaults to the region's centre). */
  origin?: LonLat;
  opacity?: number;
};

export type MapPaint = {
  bounds: GeoBounds;
  width: number;
  height: number;
  style: MapStyleName;
  fills?: RegionFill[];
  grid?: boolean;
  /** Draw a compass rose + frame (flat parchment maps). */
  decor?: boolean;
  /** Draw country borders (off for very zoomed-out globes if it looks busy). */
  borders?: boolean;
};

type Ctx = CanvasRenderingContext2D;
type Paths = { countries: Path2D[]; land: Path2D };
const cache = new Map<string, Paths>();

const isWorld = (b: GeoBounds) => b.lon1 - b.lon0 >= 359;

/** Build a Path2D for polygons, handling the antimeridian (unwrap + duplicate for world maps). */
const buildPath = (polys: LonLat[][][], b: GeoBounds, W: number, H: number): Path2D => {
  const path = new Path2D();
  const centre = (b.lon0 + b.lon1) / 2;
  const world = isWorld(b);
  for (const poly of polys) {
    for (const ring of poly) {
      const pts: [number, number][] = [];
      let prev: number | null = null;
      let minX = Infinity;
      let maxX = -Infinity;
      for (const [lon0, lat] of ring) {
        let lon = lon0;
        if (!world) lon = ((((lon - centre) % 360) + 540) % 360) - 180 + centre;
        if (prev !== null) {
          while (lon - prev > 180) lon -= 360;
          while (lon - prev < -180) lon += 360;
        }
        prev = lon;
        const [u, v] = toUnit(b, [lon, lat]);
        const x = u * W;
        pts.push([x, v * H]);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
      }
      const offsets = world ? [0, ...(minX < 0 ? [W] : []), ...(maxX > W ? [-W] : [])] : [0];
      for (const off of offsets) {
        pts.forEach(([x, y], i) => (i === 0 ? path.moveTo(x + off, y) : path.lineTo(x + off, y)));
        path.closePath();
      }
    }
  }
  return path;
};

const pathsFor = (b: GeoBounds, W: number, H: number): Paths => {
  const key = `${b.lon0.toFixed(3)},${b.lon1.toFixed(3)},${b.lat0.toFixed(3)},${b.lat1.toFixed(3)}|${W}x${H}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const landFeatures = "features" in LAND ? LAND.features : [LAND];
  const out: Paths = {
    countries: COUNTRIES.map((f) => buildPath(polygonsOf(f), b, W, H)),
    land: buildPath(landFeatures.flatMap((f) => polygonsOf(f)), b, W, H),
  };
  if (cache.size > 24) cache.clear();
  cache.set(key, out);
  return out;
};

const indexOf = new Map(COUNTRIES.map((f, i) => [f, i]));

const centroid = (fs: CountryFeature[]): LonLat => {
  // area-ish weighted average of the largest polygon of each feature
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const f of fs) {
    const polys = polygonsOf(f);
    const biggest = polys.reduce((a, p) => (p[0].length > a[0].length ? p : a), polys[0]);
    for (const [lon, lat] of biggest[0]) {
      sx += lon;
      sy += lat;
      n++;
    }
  }
  return n ? [sx / n, sy / n] : [0, 0];
};

/** Centre of a list of countries (for labels / spread origins). */
export const regionCentre = (names: string[]): LonLat => centroid(resolveCountries(names));

const paintPaper = (ctx: Ctx, W: number, H: number) => {
  for (let i = 0; i < 46; i++) {
    const x = random(`paper-x-${i}`) * W;
    const y = random(`paper-y-${i}`) * H;
    const r = (0.04 + random(`paper-r-${i}`) * 0.12) * Math.max(W, H);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = random(`paper-d-${i}`) < 0.5;
    g.addColorStop(0, dark ? "rgba(120,80,40,0.07)" : "rgba(255,250,230,0.08)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // burnt edges
  const e = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  e.addColorStop(0, "rgba(0,0,0,0)");
  e.addColorStop(1, "rgba(90,55,25,0.35)");
  ctx.fillStyle = e;
  ctx.fillRect(0, 0, W, H);
};

const paintCompass = (ctx: Ctx, x: number, y: number, r: number, color: string) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = r * 0.04;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const long = i % 2 === 0;
    ctx.save();
    ctx.rotate((i * Math.PI) / 4);
    ctx.beginPath();
    ctx.moveTo(0, -r * (long ? 1 : 0.6));
    ctx.lineTo(r * 0.12, 0);
    ctx.lineTo(-r * 0.12, 0);
    ctx.closePath();
    ctx.globalAlpha = long ? 0.9 : 0.6;
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.font = `bold ${r * 0.32}px Helvetica, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("N", 0, -r * 1.08);
  ctx.restore();
};

/** Paint the whole map. Call every frame while something animates (fills are cheap; paths are cached). */
export const paintMap = (ctx: Ctx, p: MapPaint) => {
  const { width: W, height: H, bounds: b } = p;
  const st = MAP_STYLES[p.style];
  const s = Math.max(W, H) / 4096; // line-width scale (world texture = 4096)
  const px = Math.max(1, s * (isWorld(b) ? 1 : 2.2));
  const paths = pathsFor(b, W, H);

  // ocean
  const og = ctx.createLinearGradient(0, 0, 0, H);
  og.addColorStop(0, st.oceanDeep);
  og.addColorStop(0.5, st.ocean);
  og.addColorStop(1, st.oceanDeep);
  ctx.fillStyle = og;
  ctx.fillRect(0, 0, W, H);

  // grid
  if (p.grid !== false) {
    ctx.strokeStyle = st.grid;
    ctx.lineWidth = 2 * px;
    const step = b.lon1 - b.lon0 > 60 ? 30 : b.lon1 - b.lon0 > 20 ? 10 : 5;
    ctx.beginPath();
    for (let lon = Math.ceil(b.lon0 / step) * step; lon <= b.lon1; lon += step) {
      const [u] = toUnit(b, [lon, 0]);
      ctx.moveTo(u * W, 0);
      ctx.lineTo(u * W, H);
    }
    for (let lat = Math.ceil(b.lat0 / step) * step; lat <= b.lat1; lat += step) {
      const [, v] = toUnit(b, [0, lat]);
      ctx.moveTo(0, v * H);
      ctx.lineTo(W, v * H);
    }
    ctx.stroke();
  }

  // little storybook wave marks in the open sea
  ctx.strokeStyle = st.waves;
  ctx.lineWidth = 3 * px;
  ctx.lineCap = "round";
  for (let i = 0; i < 140; i++) {
    const x = random(`wave-x-${i}`) * W;
    const y = random(`wave-y-${i}`) * H;
    const w = (18 + random(`wave-w-${i}`) * 26) * px;
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.quadraticCurveTo(x - w / 2, y - w * 0.35, x, y);
    ctx.quadraticCurveTo(x + w / 2, y + w * 0.35, x + w, y);
    ctx.stroke();
  }

  // shore glow, then land
  ctx.lineJoin = "round";
  ctx.strokeStyle = st.shore;
  ctx.lineWidth = 16 * px;
  ctx.stroke(paths.land);
  ctx.fillStyle = st.land[0];
  ctx.fill(paths.land);
  if (st.land.length > 1) {
    COUNTRIES.forEach((f, i) => {
      const tone = st.land[Math.floor(random(`land-${f.id}`) * st.land.length)];
      ctx.fillStyle = tone;
      ctx.fill(paths.countries[i]);
    });
  }

  // region fills (BORDER_SPREAD)
  for (const fill of p.fills ?? []) {
    const fs = fill.countries ? resolveCountries(fill.countries) : [];
    const region = new Path2D();
    fs.forEach((f) => region.addPath(paths.countries[indexOf.get(f) ?? 0]));
    if (fill.polygon) region.addPath(buildPath([[fill.polygon]], b, W, H));
    const prog = Math.max(0, Math.min(1, fill.progress ?? 1));
    if (prog <= 0) continue;
    const origin = fill.origin ?? (fill.polygon ? centroidOfRing(fill.polygon) : centroid(fs));
    const [ou, ov] = toUnit(b, origin);
    const ox = ou * W;
    const oy = ov * H;
    ctx.save();
    ctx.clip(region, "nonzero");
    ctx.globalAlpha = fill.opacity ?? 0.85;
    if (prog >= 1) {
      ctx.fillStyle = fill.color;
      ctx.fillRect(0, 0, W, H);
    } else {
      const maxR = Math.hypot(W, H) * (isWorld(b) ? 0.12 : 0.9);
      const R = Math.max(1, maxR * prog);
      const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, R);
      g.addColorStop(0, fill.color);
      g.addColorStop(0.88, fill.color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(ox - R, oy - R, R * 2, R * 2);
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = Math.min(1, prog * 3) * 0.9;
    ctx.strokeStyle = fill.color;
    ctx.lineWidth = 6 * px;
    ctx.stroke(region);
    ctx.restore();
  }

  // borders + ink coastline
  if (p.borders !== false) {
    ctx.strokeStyle = st.border;
    ctx.lineWidth = 1.6 * px;
    ctx.setLineDash([6 * px, 5 * px]);
    paths.countries.forEach((c) => ctx.stroke(c));
    ctx.setLineDash([]);
  }
  ctx.strokeStyle = st.coast;
  ctx.lineWidth = 2.6 * px;
  ctx.stroke(paths.land);

  if (st.paper) paintPaper(ctx, W, H);
  if (p.decor) {
    paintCompass(ctx, W * 0.88, H * 0.82, Math.min(W, H) * 0.09, st.coast);
    ctx.strokeStyle = st.coast;
    ctx.lineWidth = 10 * px;
    ctx.strokeRect(14 * px, 14 * px, W - 28 * px, H - 28 * px);
    ctx.lineWidth = 3 * px;
    ctx.strokeRect(32 * px, 32 * px, W - 64 * px, H - 64 * px);
  }
};

const centroidOfRing = (ring: LonLat[]): LonLat => {
  const n = ring.length;
  return [ring.reduce((a, p) => a + p[0], 0) / n, ring.reduce((a, p) => a + p[1], 0) / n];
};
