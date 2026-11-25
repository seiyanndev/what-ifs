import { random, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { lathe } from "../../look";
import { useBody } from "../Body";
import { Part, Sphere } from "./shared";

export type HairStyle =
  | "short"
  | "long"
  | "bun"
  | "curly"
  | "bald"
  | "braids"
  | "ponytail"
  | "topknot";
export const HAIR_STYLES: HairStyle[] = [
  "short",
  "long",
  "bun",
  "curly",
  "bald",
  "braids",
  "ponytail",
  "topknot",
];

const HEAD_SCALE: [number, number, number] = [1.04, 0.97, 1];

/** Hair cap: covers the crown, hairline above the brows, lower at the back. */
const Cap: React.FC<{
  r: number;
  color: string;
  bangs?: boolean;
  tilt?: number;
  hidden?: boolean;
}> = ({ r, color, bangs = true, tilt = -0.45, hidden }) =>
  hidden ? null : (
    <group>
      <Part
        geo={
          <sphereGeometry
            args={[r * 1.065, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.5]}
          />
        }
        color={color}
        rotation={[tilt, 0, 0]}
        side={THREE.DoubleSide}
      />
      {bangs
        ? [-0.42, -0.14, 0.14, 0.42].map((x, i) => (
            <Part
              key={x}
              geo={Sphere(16)}
              color={color}
              position={[
                x * r,
                r * (0.5 - Math.abs(x) * 0.25),
                r * (0.84 - Math.abs(x) * 0.18),
              ]}
              rotation={[0.5, x * 1.2, (i - 1.5) * 0.25]}
              scale={[r * 0.24, r * 0.15, r * 0.12]}
              ink={false}
            />
          ))
        : null}
    </group>
  );

/** Hair on the head slot. Sways a little (frame-driven) for long styles.
 *  `covered`: a helmet/hood/wrap sits on the skull, so skip the cap and keep only what shows below it. */
export const Hair: React.FC<{
  style: HairStyle;
  color: string;
  covered?: boolean;
}> = ({ style, color, covered = false }) => {
  const { dims } = useBody();
  const frame = useCurrentFrame();
  const r = dims.headR;
  const sway = Math.sin(frame / 14) * 0.06;

  const body = (() => {
    switch (style) {
      case "short":
        return <Cap hidden={covered} r={r} color={color} />;
      case "long":
        return (
          <group>
            <Cap hidden={covered} r={r} color={color} />
            <group rotation={[sway * 0.4, 0, 0]}>
              <Part
                geometry={lathe(
                  "hair-long",
                  [
                    [0.98, 0.25],
                    [1.06, -0.1],
                    [1.05, -0.6],
                    [0.98, -1.15],
                    [0.9, -1.25],
                  ].map(([x, y]) => [x, y]) as [number, number][],
                  32,
                  Math.PI - 1.95,
                  3.9,
                )}
                scale={[r, r, r]}
                color={color}
                side={THREE.DoubleSide}
              />
            </group>
          </group>
        );
      case "bun":
        return (
          <group>
            <Cap
              hidden={covered}
              r={r}
              color={color}
              bangs={false}
              tilt={-0.38}
            />
            <Part
              geo={Sphere(20)}
              color={color}
              position={[0, r * 0.72, -r * 0.55]}
              scale={r * 0.34}
            />
            <Part
              geo={<torusGeometry args={[r * 0.2, r * 0.05, 8, 20]} />}
              color="#8e3b38"
              position={[0, r * 0.62, -r * 0.45]}
              rotation={[0.9, 0, 0]}
              ink={false}
            />
          </group>
        );
      case "curly": {
        if (covered) return null;
        const curls = [];
        for (let i = 0; i < 34; i++) {
          const th = random(`curl-th-${i}`) * Math.PI * 2;
          const ph = Math.acos(1 - random(`curl-ph-${i}`) * 1.15);
          const x = Math.sin(ph) * Math.sin(th);
          const z = Math.sin(ph) * Math.cos(th);
          const y = Math.cos(ph);
          if (z > 0.55 && y < 0.62) continue; // keep the face clear
          curls.push(
            <Part
              key={i}
              geo={Sphere(14)}
              color={color}
              position={[x * r * 1.04, y * r * 1.0, z * r * 1.04]}
              scale={r * (0.22 + random(`curl-s-${i}`) * 0.06)}
              ink={i % 2 === 0 ? "character" : false}
            />,
          );
        }
        return (
          <group>
            <Cap hidden={covered} r={r} color={color} bangs={false} />
            {curls}
          </group>
        );
      }
      case "bald":
        return (
          // fringe around the back of the head, ear to ear
          <group
            position={[0, -r * 0.08, 0]}
            rotation={[0, -Math.PI * 0.075, 0]}
          >
            <Part
              geo={
                <torusGeometry
                  args={[r * 1.0, r * 0.17, 10, 30, Math.PI * 1.15]}
                />
              }
              color={color}
              rotation={[-Math.PI / 2, 0, 0]}
            />
          </group>
        );
      case "braids":
        return (
          <group>
            <Cap hidden={covered} r={r} color={color} />
            {[-1, 1].map((s) => (
              <group
                key={s}
                position={[s * r * 0.82, -r * 0.15, -r * 0.05]}
                rotation={[sway * 0.3, 0, s * 0.12]}
              >
                {[0, 1, 2, 3, 4].map((k) => (
                  <Part
                    key={k}
                    geo={Sphere(14)}
                    color={color}
                    position={[0, -k * r * 0.24, k * r * 0.05]}
                    scale={r * (0.15 - k * 0.012)}
                  />
                ))}
                <Part
                  geo={<torusGeometry args={[r * 0.08, r * 0.03, 6, 14]} />}
                  color="#b5463c"
                  position={[0, -r * 1.05, r * 0.25]}
                  rotation={[Math.PI / 2, 0, 0]}
                  ink={false}
                />
              </group>
            ))}
          </group>
        );
      case "ponytail":
        return (
          <group>
            <Cap hidden={covered} r={r} color={color} />
            <Part
              geo={<torusGeometry args={[r * 0.12, r * 0.045, 8, 16]} />}
              color="#2f6fd6"
              position={[0, r * 0.35, -r * 0.98]}
              rotation={[0.4, 0, 0]}
              ink={false}
            />
            <group
              position={[0, r * 0.35, -r * 1.02]}
              rotation={[0.25 + sway * 0.6, sway, 0]}
            >
              {[0, 1, 2, 3, 4].map((k) => (
                <Part
                  key={k}
                  geo={Sphere(14)}
                  color={color}
                  position={[
                    0,
                    -k * r * 0.2,
                    -r * 0.12 - Math.sin(k * 0.6) * r * 0.1,
                  ]}
                  scale={[
                    r * (0.17 - k * 0.022),
                    r * 0.2,
                    r * (0.17 - k * 0.022),
                  ]}
                />
              ))}
            </group>
          </group>
        );
      case "topknot":
        return (
          <group>
            <Cap
              hidden={covered}
              r={r}
              color={color}
              bangs={false}
              tilt={-0.6}
            />
            <Part
              geo={<capsuleGeometry args={[r * 0.09, r * 0.38, 6, 12]} />}
              color={color}
              position={[0, r * 1.05, r * 0.05]}
              rotation={[Math.PI / 2 - 0.25, 0, 0]}
            />
            <Part
              geo={<cylinderGeometry args={[r * 0.1, r * 0.1, r * 0.08, 12]} />}
              color="#f1ece0"
              position={[0, r * 1.03, -r * 0.18]}
              rotation={[0.35, 0, 0]}
              ink={false}
            />
          </group>
        );
      default:
        return null;
    }
  })();

  return <group scale={HEAD_SCALE}>{body}</group>;
};

/** Long "wizard" beard (3D) hanging from the chin — for sages, elders, old kings. */
export const WizardBeard: React.FC<{ color: string; length?: number }> = ({
  color,
  length = 1,
}) => {
  const { dims } = useBody();
  const frame = useCurrentFrame();
  const r = dims.headR;
  return (
    <group
      position={[0, -r * 0.48, r * 0.6]}
      rotation={[0.18 + Math.sin(frame / 18) * 0.03, 0, 0]}
    >
      <Part
        geometry={lathe("wizard-beard", [
          [0, 0.12],
          [0.42, 0.08],
          [0.5, -0.2],
          [0.42, -0.6],
          [0.26, -0.95],
          [0.08, -1.2],
          [0, -1.25],
        ])}
        scale={[r * 1.05, r * length, r * 0.55]}
        color={color}
      />
    </group>
  );
};
