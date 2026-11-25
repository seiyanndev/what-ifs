import { Easing, interpolate, useCurrentFrame } from "remotion";
import { OrbitCamera, Stage } from "../kit/look";
import { boundsAround, Globe, mixView, pathFn, vec3ToLonLat, type LonLat } from "../kit/sets/geo";

// 5 s globe demo: BORDER_SPREAD (Spain) → ROUTE_ARROW (Magellan's voyage) → ZOOM_TO_MAP (Mactan).

export const MAGELLAN_ROUTE: LonLat[] = [
  [-6.0, 37.4], // Seville / Sanlúcar
  [-16, 27.5], // Canary Islands
  [-34, -6], // off Brazil
  [-58, -36], // Río de la Plata
  [-69, -52.8], // Strait of Magellan
  [-95, -40],
  [-150, -12],
  [144.8, 13.4], // Guam
  [124.0, 10.3], // Cebu
];
const MACTAN: LonLat = [124.0, 10.3];

export const GlobeDemo: React.FC = () => {
  const f = useCurrentFrame();
  const spread = interpolate(f, [4, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  const route = interpolate(f, [24, 112], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) });
  const zoom = interpolate(f, [112, 146], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const head = vec3ToLonLat(pathFn(MAGELLAN_ROUTE)(route));
  const follow: LonLat = mixView([-6, 30], [head[0] - 10, head[1] * 0.7], interpolate(f, [18, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const view = mixView(follow, MACTAN, zoom);
  const distance = interpolate(zoom, [0, 1], [10.5, 2.75]);
  const elevation = interpolate(zoom, [0, 1], [4, 0]);
  return (
    <Stage timeOfDay="day" background="radial-gradient(circle at 50% 45%, #2a3f7a 0%, #141d42 60%, #0b1030 100%)" shadowSize={3}>
      <OrbitCamera target={[0, 0, 0]} distance={distance} azimuth={0} elevation={elevation} fov={30} />
      <Globe
        view={view}
        style="storybook"
        fills={[{ countries: ["Spain", "Portugal"], color: "#c0392b", progress: spread, origin: [-5, 40] }]}
        routes={[{ from: MAGELLAN_ROUTE[0], via: MAGELLAN_ROUTE.slice(1, -1), to: MAGELLAN_ROUTE[MAGELLAN_ROUTE.length - 1], progress: route, icon: "ship", color: "#c0392b" }]}
        pins={[
          { at: [-6, 37.4], color: "#c0392b", pop: interpolate(f, [8, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(2)) }) },
          { at: MACTAN, color: "#f2b134", pop: interpolate(f, [128, 138], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(2)) }) },
        ]}
        labels={[
          { at: [-4, 43], text: "Spain", style: "region", opacity: interpolate(f, [10, 20, 60, 70], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) },
          { at: [124.0, 12.4], text: "Mactan · 1521", style: "city", size: 0.035, opacity: interpolate(f, [132, 142], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) },
        ]}
        detail={{ bounds: boundsAround(MACTAN, 34, 0.8), opacity: interpolate(zoom, [0.5, 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}
      />
    </Stage>
  );
};
