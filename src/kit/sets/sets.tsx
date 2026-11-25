import { random, useCurrentFrame } from "remotion";
import { Part, Prop, Sphere } from "../characters/Costume";
import { roundedBox, ToonMaterial, type Era, type TimeOfDay } from "../look";
import { useSet } from "./context";
import {
  Anvil,
  Banner,
  Barrel,
  Bench,
  Bookshelf,
  Bush,
  Candle,
  Cannon,
  Car,
  Carpet,
  Column,
  Crate,
  Cypress,
  Dino,
  Dock,
  Fence,
  Fern,
  GearMachine,
  House,
  Market,
  PalmTree,
  PineTree,
  Rock,
  RoundTree,
  Skyscraper,
  StiltHut,
  Outrigger,
  Statue,
  StreetLamp,
  Table,
  Temple,
  Tent,
  Throne,
  TorchStand,
  Volcano,
  Wall,
  Well,
} from "./dressing";
import { ToyShip } from "./geo";
import { BASE_R, DioramaBase, RoomBase } from "./ground";

// The 12 sets. Each is a diorama component plus SET_INFO: default era/time, floor height,
// named marks for placing characters, camera framing and the painted backdrop colours.

/** Back half of the base turned to water (PORT, BEACH). */
const HalfSea: React.FC<{ y?: number; color?: string }> = ({ y = 0.16, color = "#5fb3d1" }) => {
  const frame = useCurrentFrame();
  return (
    <group position={[0, y, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[BASE_R + 0.05, 64, 0, Math.PI]} />
        <ToonMaterial color={color} emissive="#2f7fa8" emissiveIntensity={0.18} rim={0} />
      </mesh>
      {/* foam line along the shore */}
      <mesh position={[0, 0.01, -0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BASE_R * 2, 0.12 + 0.04 * Math.sin(frame / 10)]} />
        <meshBasicMaterial color="#f2fbff" transparent opacity={0.85} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const t = ((frame / 80 + random(`sea${i}`)) % 1 + 1) % 1;
        const a = Math.PI * (0.1 + random(`seaa${i}`) * 0.8);
        const r = 1 + random(`sear${i}`) * (BASE_R - 1.6);
        return (
          <mesh key={i} position={[Math.cos(a) * r, 0.01, -Math.sin(a) * r]} rotation={[-Math.PI / 2, 0, 0]} scale={0.2 + t * 0.5}>
            <ringGeometry args={[0.9, 1, 28]} />
            <meshBasicMaterial color="#e6f6fb" transparent opacity={(1 - t) * 0.55} />
          </mesh>
        );
      })}
    </group>
  );
};

const Smoke: React.FC<{ position: [number, number, number]; seed?: string }> = ({ position, seed = "sm" }) => {
  const frame = useCurrentFrame();
  return (
    <group position={position}>
      {[0, 1, 2, 3].map((k) => {
        const t = ((frame / 75 + k / 4 + random(`${seed}${k}`)) % 1 + 1) % 1;
        return (
          <group key={k} position={[Math.sin(k * 2 + t) * 0.25, 0.3 + t * 2.4, Math.cos(k) * 0.15]} scale={0.18 + t * 0.32}>
            {[
              [0, 0, 0, 1],
              [0.7, -0.15, 0.1, 0.7],
              [-0.6, -0.1, -0.1, 0.75],
            ].map(([x, y, z, s], j) => (
              <mesh key={j} position={[x, y, z]} scale={s}>
                <sphereGeometry args={[1, 14, 10]} />
                <ToonMaterial color="#e6e0e4" ramp="soft" rim={0} transparent opacity={0.75 * (1 - t * 0.8)} depthWrite={false} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Outdoor sets
// ---------------------------------------------------------------------------
const AncientCity: React.FC = () => (
  <group>
    <DioramaBase ground="paving" seed="ac" />
    <Temple position={[0, 0.07, -2.5]} scale={0.95} />
    <House style="ancient" position={[-3.0, 0.07, -0.6]} rotation={0.5} w={1.6} d={1.5} h={1.3} />
    <House style="ancient" position={[3.1, 0.07, -0.4]} rotation={-0.5} w={1.5} d={1.4} h={1.5} wall="#f2d9b4" />
    <Column position={[-1.9, 0.07, 1.6]} height={2.6} />
    <Column position={[2.2, 0.07, 1.9]} broken />
    <Cypress position={[-3.5, 0.07, 1.4]} scale={0.9} />
    <Cypress position={[3.6, 0.07, 1.5]} scale={0.8} />
    <Statue position={[2.6, 0.07, -2.4]} scale={0.8} />
    <Market position={[-2.8, 0.07, -2.4]} rotation={0.4} color="#b5463c" />
  </group>
);

const MedievalVillage: React.FC = () => (
  <group>
    <DioramaBase ground="grass" seed="mv" />
    <Carpet position={[0.2, 0.0, 0.4]} w={1.3} d={8} color="#a88a5e" trim="#9a7c52" />
    <House style="tudor" position={[-2.6, 0, -1.6]} rotation={0.45} w={2.0} d={1.7} h={1.5} />
    <House style="medieval" position={[2.7, 0, -1.5]} rotation={-0.5} w={1.8} d={1.6} h={1.4} />
    <House style="medieval" position={[0.2, 0, -3.1]} w={1.6} d={1.3} h={1.3} roof="#6b4a32" />
    <Well position={[-1.3, 0, 0.6]} scale={0.85} />
    <Market position={[1.9, 0, 0.9]} rotation={-0.3} color="#2f5fa8" />
    <Fence position={[-3.0, 0, 1.9]} rotation={0.8} length={2.4} />
    <RoundTree position={[3.6, 0, 1.3]} scale={0.8} />
    <PineTree position={[-3.7, 0, -0.1]} scale={0.9} />
    <PineTree position={[3.4, 0, -3.0]} scale={0.75} />
    <Barrel position={[1.0, 0, -0.7]} />
    <Barrel position={[1.4, 0, -0.55]} scale={0.85} />
  </group>
);

const Battlefield: React.FC = () => {
  const { era } = useSet();
  return (
    <group>
      <DioramaBase ground="dirt" seed="bf" rimColor="#7a5a3e" />
      <Tent position={[-2.8, 0, -2.3]} color="#e8dcc0" stripe="#2f5fa8" />
      <Tent position={[2.9, 0, -2.2]} color="#e8dcc0" stripe="#8e3b38" />
      <Banner position={[-3.4, 0, -0.6]} color="#2f5fa8" h={2.2} />
      <Banner position={[3.5, 0, -0.5]} color="#8e3b38" h={2.2} />
      {era === "ageOfSail" || era === "modern" ? (
        <>
          <Cannon position={[-2.4, 0, 0.8]} rotation={0.9} />
          <Cannon position={[2.4, 0, 0.6]} rotation={-0.9} />
        </>
      ) : (
        <>
          <Fence position={[-2.3, 0, 1.0]} rotation={0.6} length={2} />
          <Fence position={[2.4, 0, 1.0]} rotation={-0.6} length={2} />
        </>
      )}
      <Rock position={[0.4, 0, -1.6]} seed="b1" />
      <Rock position={[-0.9, 0, 2.6]} scale={0.6} seed="b2" />
      <Barrel position={[1.2, 0, 2.3]} rotation={1} />
      <Smoke position={[-1.6, 0, -2.6]} seed="s1" />
      <Smoke position={[1.8, 0, -3.0]} seed="s2" />
      <Wall position={[0, 0, -3.6]} length={3.5} height={0.9} />
    </group>
  );
};

const Port: React.FC = () => (
  <group>
    <DioramaBase ground="paving" seed="pt" />
    <HalfSea />
    <Dock position={[-1.2, 0, -2.0]} length={3.6} width={1.3} />
    <group position={[1.6, 0.18, -2.3]} rotation={[0, -0.4, 0]}>
      <ToyShip scale={3.2} sail="#f6efe0" flag="#c0392b" seed={1} />
    </group>
    <group position={[-3.0, 0.18, -2.6]} rotation={[0, 0.5, 0]}>
      <ToyShip scale={2.2} sail="#e8dcc0" flag="#2f5fa8" seed={2} />
    </group>
    <House style="medieval" position={[-3.1, 0.07, 1.0]} rotation={0.9} w={1.8} d={1.6} h={1.5} wall="#e2d6bd" roof="#1f6f78" />
    <Crate position={[1.3, 0.07, 0.6]} />
    <Crate position={[1.85, 0.07, 0.75]} size={0.5} />
    <Crate position={[1.55, 0.67, 0.65]} size={0.45} />
    <Barrel position={[2.6, 0.07, 1.4]} />
    <Barrel position={[-1.8, 0.07, 2.4]} />
    <StreetLamp position={[0.1, 0.07, 0.0]} />
  </group>
);

const Beach: React.FC = () => (
  <group>
    <DioramaBase ground="sand" seed="be" rimColor="#c9a96b" />
    <HalfSea y={0.05} color="#62c3da" />
    <PalmTree position={[-3.0, 0, 1.0]} lean={0.25} />
    <PalmTree position={[3.1, 0, 1.5]} lean={-0.3} scale={0.85} />
    <PalmTree position={[-3.7, 0, -0.2]} lean={0.1} scale={0.7} />
    <Rock position={[2.6, 0, -0.1]} seed="r1" color="#9a8f86" />
    <Rock position={[3.2, 0, 0.3]} scale={0.6} seed="r2" color="#9a8f86" />
    <group position={[0.4, 0.06, -2.8]} rotation={[0, 0.7, 0]}>
      <ToyShip scale={2.6} seed={3} />
    </group>
    <Crate position={[1.6, 0, 1.6]} size={0.5} rotation={0.6} />
    {[
      [-1.2, 2.2, "#f4c6d4"],
      [0.9, 2.8, "#f2e2c4"],
      [-0.2, 3.3, "#f4c6d4"],
    ].map(([x, z, c], i) => (
      <Part key={i} geo={Sphere(10)} position={[x as number, 0.04, z as number]} scale={[0.1, 0.05, 0.1]} color={c as string} ink="prop" />
    ))}
  </group>
);

const ModernCity: React.FC = () => (
  <group>
    <DioramaBase ground="asphalt" seed="mc" rimColor="#8f9aa7" />
    <Skyscraper position={[-2.8, 0, -2.4]} h={5.5} w={1.5} seed="s1" />
    <Skyscraper position={[-0.7, 0, -3.3]} h={7} w={1.6} color="#d8e0ea" seed="s2" />
    <Skyscraper position={[1.6, 0, -3.0]} h={4.6} w={1.4} color="#bfd0e0" seed="s3" />
    <Skyscraper position={[3.3, 0, -1.6]} h={3.6} w={1.3} color="#e3e8ef" seed="s4" />
    <House style="modern" position={[-3.4, 0, 0.0]} rotation={0.9} w={1.6} d={1.4} h={1.6} />
    <Car position={[-0.6, 0, 0.9]} rotation={Math.PI / 2} color="#e8403a" />
    <Car position={[2.0, 0, 0.9]} rotation={-Math.PI / 2} color="#2f6fd6" />
    <StreetLamp position={[-1.8, 0.08, 2.2]} />
    <StreetLamp position={[1.8, 0.08, 2.2]} />
    <StreetLamp position={[0.0, 0.08, -0.45]} />
    <RoundTree position={[3.2, 0.08, 2.2]} scale={0.6} />
    <Bench position={[-0.3, 0.08, 2.4]} />
  </group>
);

const JunglePrehistoric: React.FC = () => (
  <group>
    <DioramaBase ground="grass" seed="jp" rimColor="#6b5a4a" />
    <mesh position={[1.9, 0.03, 0.9]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1.0, 32]} />
      <ToonMaterial color="#5fb3d1" emissive="#2f7fa8" emissiveIntensity={0.2} rim={0} />
    </mesh>
    <group position={[-0.5, 0, -3.0]} scale={0.95}>
      <VolcanoLazy />
    </group>
    <Dino position={[1.2, 0, -1.4]} rotation={-0.4} />
    <Dino position={[-2.7, 0, 0.2]} rotation={0.6} scale={0.6} color="#e8a03a" />
    <PalmTree position={[3.3, 0, -0.8]} lean={-0.2} />
    <PalmTree position={[-3.6, 0, -1.4]} lean={0.2} scale={0.9} />
    {[
      [-1.6, 1.8],
      [3.0, 1.9],
      [-3.2, 1.6],
      [0.6, 2.8],
      [2.8, -2.5],
    ].map(([x, z], i) => (
      <Fern key={i} position={[x, 0, z]} scale={1.1 + (i % 2) * 0.4} rotation={i} />
    ))}
    <Rock position={[-1.0, 0, 0.9]} seed="j1" />
    <Bush position={[3.6, 0, 0.6]} color="#3f7a3a" />
  </group>
);

const VolcanoLazy: React.FC = () => <Volcano />;

const TropicalVillage: React.FC = () => (
  <group>
    <DioramaBase ground="sand" seed="tv" rimColor="#c9a96b" />
    <HalfSea y={0.05} color="#62c3da" />
    <StiltHut position={[-2.5, 0, 0.7]} rotation={0.55} />
    <StiltHut position={[2.6, 0, 0.9]} rotation={-0.5} w={1.5} d={1.3} />
    <StiltHut position={[0.3, 0.05, -1.3]} rotation={0.1} w={1.4} d={1.2} />
    <Outrigger position={[1.6, 0.05, -2.6]} rotation={-0.35} />
    <PalmTree position={[-3.6, 0, -0.6]} lean={0.2} />
    <PalmTree position={[3.6, 0, -0.4]} lean={-0.25} scale={0.85} />
    <PalmTree position={[-1.2, 0, 2.9]} lean={0.1} scale={0.7} />
    <Fern position={[3.2, 0, 2.2]} scale={1.1} />
    <Bush position={[-3.3, 0, 2.1]} color="#4d8a35" />
    <Crate position={[1.2, 0, 2.6]} size={0.45} rotation={0.4} />
    <Barrel position={[-1.6, 0, 1.6]} scale={0.8} />
  </group>
);

// ---------------------------------------------------------------------------
// Interiors
// ---------------------------------------------------------------------------
const ThroneRoom: React.FC = () => {
  const { pal } = useSet();
  return (
    <group>
      <RoomBase floor="#b9a98a" wall={pal.stone[0]} trim="#d6a444" window={false} />
      <mesh geometry={roundedBox(3.4, 0.4, 1.9, 0.06)} position={[0, 0.2, -2.45]} castShadow receiveShadow>
        <ToonMaterial color={pal.stone[1]} />
      </mesh>
      <Throne position={[0, 0.4, -2.65]} />
      <Carpet position={[0, 0, 0.3]} w={1.5} d={5.6} />
      <Banner position={[-2.3, 0.4, -3.2]} color="#8e1f2f" h={2.6} />
      <Banner position={[2.3, 0.4, -3.2]} color="#8e1f2f" h={2.6} />
      <Column position={[-2.6, 0, -0.6]} height={3.2} />
      <Column position={[2.8, 0, -0.6]} height={3.2} />
      <TorchStand position={[-1.6, 0, -1.9]} />
      <TorchStand position={[1.6, 0, -1.9]} />
    </group>
  );
};

const Library: React.FC = () => (
  <group>
    <RoomBase floor="#8a5a3b" wall="#d9c9a8" trim="#7a4d2e" />
    <Bookshelf position={[-2.2, 0, -3.15]} w={2.6} h={3.0} />
    <Bookshelf position={[1.0, 0, -3.15]} w={1.4} h={2.2} />
    <Bookshelf position={[-3.75, 0, -0.6]} rotation={Math.PI / 2} w={2.8} h={2.8} />
    <Carpet position={[0.3, 0, 0.4]} w={3.2} d={2.6} color="#2f5fa8" trim="#c9962e" />
    <Table position={[0.3, 0, 0.2]} w={2.0} d={1.1} />
    <group position={[-0.2, 0.86, 0.25]} rotation={[0, 0, Math.PI / 2]}>
      <Prop type="book" color="#8e3b38" />
    </group>
    <group position={[0.75, 0.8, 0.1]}>
      <Prop type="globe" />
    </group>
    <Candle position={[0.2, 0.8, -0.1]} />
    <group position={[-0.65, 0.84, 0.4]} rotation={[Math.PI / 2, 0, 0.4]}>
      <Prop type="scroll" />
    </group>
  </group>
);

const Workshop: React.FC = () => (
  <group>
    <RoomBase floor="#a07a52" wall="#c9b48e" trim="#5a3d28" />
    <GearMachine position={[-1.9, 0, -2.6]} />
    <Table position={[1.3, 0, -2.6]} w={2.4} d={1.0} h={0.85} />
    <group position={[0.8, 0.9, -2.6]} scale={0.8}>
      <Prop type="gears" />
    </group>
    <group position={[1.8, 0.9, -2.5]} rotation={[0, 0, Math.PI / 2]}>
      <Prop type="map" color="#e8dcc0" />
    </group>
    <Anvil position={[1.6, 0, 0.3]} rotation={-0.4} />
    <Bookshelf position={[-3.75, 0, 0.0]} rotation={Math.PI / 2} w={2.2} h={2.2} />
    <Crate position={[2.8, 0, -1.2]} />
    <Crate position={[2.9, 0, -0.6]} size={0.5} />
    <Barrel position={[-2.9, 0, 1.9]} />
    <TorchStand position={[-0.3, 0, -2.9]} />
  </group>
);

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
export type SetName =
  | "GLOBE"
  | "MAP_REGION"
  | "ANCIENT_CITY"
  | "THRONE_ROOM"
  | "BATTLEFIELD"
  | "LIBRARY"
  | "PORT"
  | "MEDIEVAL_VILLAGE"
  | "WORKSHOP"
  | "MODERN_CITY"
  | "JUNGLE_PREHISTORIC"
  | "BEACH"
  | "TROPICAL_VILLAGE";

export type Mark = [number, number, number];
export type SetInfo = {
  label: string;
  component?: React.FC;
  era: Era;
  timeOfDay: TimeOfDay;
  interior?: boolean;
  /** Ground height characters stand on. */
  floorY: number;
  /** Named spots for characters (scenes.json uses these). */
  marks: Record<string, Mark>;
  /** Camera target height and the three standard distances. */
  camera: { target: Mark; wide: number; medium: number; close: number; elevation?: number };
};

const OUTDOOR_MARKS = (y: number): Record<string, Mark> => ({
  center: [0, y, 0.6],
  left: [-1.6, y, 0.9],
  right: [1.6, y, 0.9],
  back: [0, y, -1.1],
  backLeft: [-1.5, y, -0.8],
  backRight: [1.5, y, -0.8],
  front: [0, y, 2.2],
});

export const SETS: Record<SetName, SetInfo> = {
  GLOBE: { label: "Globe", era: "ageOfSail", timeOfDay: "day", floorY: 0, marks: { center: [0, 0, 0] }, camera: { target: [0, 0, 0], wide: 10.5, medium: 7, close: 3, elevation: 4 } },
  MAP_REGION: { label: "Map region", era: "ageOfSail", timeOfDay: "day", floorY: 0, marks: { center: [0, 0.3, 0] }, camera: { target: [0, 0, 0.3], wide: 12, medium: 9, close: 5.5, elevation: 52 } },
  ANCIENT_CITY: { label: "Ancient city", component: AncientCity, era: "ancient", timeOfDay: "day", floorY: 0.07, marks: { ...OUTDOOR_MARKS(0.07), temple: [0, 0.61, -1.6] }, camera: { target: [0, 1.1, -0.4], wide: 30, medium: 19, close: 9 } },
  THRONE_ROOM: { label: "Throne room", component: ThroneRoom, era: "medieval", timeOfDay: "day", interior: true, floorY: 0, marks: { ...OUTDOOR_MARKS(0), throne: [0, 0.4, -2.45], left: [-1.4, 0, 0.2], right: [1.4, 0, 0.2] }, camera: { target: [0, 1.2, -0.9], wide: 27, medium: 18, close: 8.5 } },
  BATTLEFIELD: { label: "Battlefield", component: Battlefield, era: "medieval", timeOfDay: "sunset", floorY: 0, marks: { ...OUTDOOR_MARKS(0), leftArmy: [-2.2, 0, 0.0], rightArmy: [2.2, 0, 0.0] }, camera: { target: [0, 1.0, -0.4], wide: 30, medium: 19, close: 9 } },
  LIBRARY: { label: "Library", component: Library, era: "medieval", timeOfDay: "night", interior: true, floorY: 0, marks: { ...OUTDOOR_MARKS(0), desk: [0.3, 0, 1.2], shelf: [-2.0, 0, -2.3] }, camera: { target: [0, 1.2, -0.6], wide: 27, medium: 18, close: 8.5 } },
  PORT: { label: "Port", component: Port, era: "ageOfSail", timeOfDay: "sunset", floorY: 0.07, marks: { center: [0, 0.07, 1.0], left: [-1.6, 0.07, 1.2], right: [1.2, 0.07, 1.6], dock: [-1.2, 0.34, -1.2], front: [0, 0.07, 2.4] }, camera: { target: [0, 1.0, -0.6], wide: 30, medium: 19, close: 9 } },
  MEDIEVAL_VILLAGE: { label: "Medieval village", component: MedievalVillage, era: "medieval", timeOfDay: "dawn", floorY: 0, marks: { ...OUTDOOR_MARKS(0), well: [-1.3, 0, 1.5], market: [1.9, 0, 1.8] }, camera: { target: [0, 1.0, -0.6], wide: 30, medium: 19, close: 9 } },
  WORKSHOP: { label: "Workshop", component: Workshop, era: "modern", timeOfDay: "day", interior: true, floorY: 0, marks: { ...OUTDOOR_MARKS(0), bench: [1.3, 0, -1.7], machine: [-1.9, 0, -1.6], anvil: [1.6, 0, 1.1] }, camera: { target: [0, 1.2, -0.7], wide: 27, medium: 18, close: 8.5 } },
  MODERN_CITY: { label: "Modern city", component: ModernCity, era: "modern", timeOfDay: "night", floorY: 0.08, marks: { center: [0, 0.08, 2.4], left: [-1.6, 0.08, 2.5], right: [1.6, 0.08, 2.5], street: [0.5, 0.0, 0.9], back: [0, 0.0, -0.4] }, camera: { target: [0, 1.6, -0.6], wide: 30, medium: 19, close: 9 } },
  JUNGLE_PREHISTORIC: { label: "Prehistoric jungle", component: JunglePrehistoric, era: "ancient", timeOfDay: "day", floorY: 0, marks: { ...OUTDOOR_MARKS(0), pond: [1.9, 0, 2.0] }, camera: { target: [0, 1.2, -0.6], wide: 30, medium: 19, close: 9 } },
  TROPICAL_VILLAGE: { label: "Tropical village", component: TropicalVillage, era: "ageOfSail", timeOfDay: "day", floorY: 0, marks: { center: [0, 0, 1.9], left: [-1.4, 0, 2.2], right: [1.5, 0, 2.3], front: [0, 0, 3.0], hutLeft: [-2.0, 0, 1.7], hutRight: [2.1, 0, 1.9], shore: [0.4, 0, 0.3] }, camera: { target: [0, 1.0, -0.2], wide: 30, medium: 19, close: 9 } },
  BEACH: { label: "Beach", component: Beach, era: "ageOfSail", timeOfDay: "sunset", floorY: 0, marks: { center: [0, 0, 1.4], left: [-1.6, 0, 1.6], right: [1.4, 0, 1.9], shore: [0, 0, 0.4], front: [0, 0, 2.8] }, camera: { target: [0, 1.0, -0.4], wide: 30, medium: 19, close: 9 } },
};

export const SET_NAMES = Object.keys(SETS) as SetName[];

