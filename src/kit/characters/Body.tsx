import { createContext, useContext } from "react";
import { Ink, lathe, SKIN_TONES, ToonMaterial } from "../look";
import { Face, type FaceProps } from "./Face";
import { Hand } from "./Hand";
import { bodyDims, DEFAULT_SHAPE, resolveHand, type BodyShape, type Joint, type Pose, type Vec3 } from "./rig";

// ---------------------------------------------------------------------------
// The base toy figurine. Rigid parts on a hierarchy of pivots — no skinning.
//
// root (ground, between the feet)
//  └ hips ─┬ legL → kneeL → ankleL (foot)        ← legs hang from the hips
//          ├ legR → kneeR → ankleR
//          └ spine (belly) → chest ─┬ neck → head (face)
//                                    ├ shoulderL → elbowL → wristL (hand)
//                                    └ shoulderR → elbowR → wristR
// ---------------------------------------------------------------------------

/** Attachment points for costume parts and props (step 3c). */
export type Slot =
  | "root"
  | "hips"
  | "torso"
  | "chest"
  | "neck"
  | "head"
  | "face"
  | "shoulderL"
  | "shoulderR"
  | "elbowL"
  | "elbowR"
  | "handL"
  | "handR"
  | "gripL"
  | "gripR"
  | "legL"
  | "legR"
  | "kneeL"
  | "kneeR"
  | "footL"
  | "footR";

/** Base parts a costume shell can hide (e.g. a robe replaces the legs). */
export type BodyPart = "pelvis" | "torso" | "upperArms" | "forearms" | "hands" | "thighs" | "shins" | "feet" | "head" | "ears";

export type BodyColors = {
  /** Base outfit under any costume: shirt, pants, shoes. */
  shirt: string;
  pants: string;
  shoes: string;
};

export const DEFAULT_COLORS: BodyColors = { shirt: "#e9e2d2", pants: "#8b7a66", shoes: "#5a3d2b" };

export type BodyProps = {
  shape?: BodyShape;
  skin?: string;
  colors?: Partial<BodyColors>;
  pose?: Pose;
  /** Costume parts / props mounted on rig slots. */
  attach?: Partial<Record<Slot, React.ReactNode>>;
  hide?: Partial<Record<BodyPart, boolean>>;
  /** Short sleeves show skin on the forearm; long sleeves use the shirt colour. */
  sleeves?: "short" | "long";
  ink?: boolean;
  /** Expression, gaze, talking, facial hair — see Face/. */
  face?: FaceProps;
  /** Stable id: seeds blinking and other per-character randomness. */
  id?: string;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
};

type BodyCtx = { shape: BodyShape; dims: ReturnType<typeof bodyDims>; skin: string };
const BodyContext = createContext<BodyCtx>({ shape: DEFAULT_SHAPE, dims: bodyDims(DEFAULT_SHAPE), skin: SKIN_TONES[3] });
/** Costume parts call this to size themselves to the body they're attached to. */
export const useBody = () => useContext(BodyContext);

const ZERO: Vec3 = [0, 0, 0];
const add = (a: Vec3, b: Vec3 | undefined): Vec3 => (b ? [a[0] + b[0], a[1] + b[1], a[2] + b[2]] : a);

// Lathe profiles (radius, y) — unit height, scaled by body shape.
const PELVIS: [number, number][] = [
  [0, -0.17],
  [0.14, -0.165],
  [0.24, -0.11],
  [0.295, -0.02],
  [0.3, 0.1],
  [0.29, 0.2],
  [0, 0.22],
];
const BELLY: [number, number][] = [
  [0, -0.06],
  [0.285, -0.06],
  [0.305, 0.06],
  [0.31, 0.18],
  [0.305, 0.3],
  [0.2, 0.34],
  [0, 0.35],
];
const CHEST_PIVOT = 0.22; // chest pivot height above spine, unit height
const CHEST: [number, number][] = [
  [0, -0.06],
  [0.305, -0.06],
  [0.31, 0.02],
  [0.3, 0.1],
  [0.28, 0.18],
  [0.24, 0.25],
  [0.17, 0.3],
  [0.08, 0.33],
  [0, 0.34],
];

export const Body: React.FC<BodyProps> = ({
  shape = DEFAULT_SHAPE,
  skin = SKIN_TONES[3],
  colors: colorOverrides,
  pose = {},
  attach = {},
  hide = {},
  sleeves = "short",
  ink = true,
  face,
  id = "body",
  position,
  rotation,
  scale,
}) => {
  const d = bodyDims(shape);
  const c = { ...DEFAULT_COLORS, ...colorOverrides };
  const j = (name: Joint) => pose.joints?.[name];
  const st = pose.stretch ?? 1;
  const w = shape.width;
  const h = shape.height;
  const line = ink ? <Ink weight="character" /> : null;
  const chestPivot = CHEST_PIVOT * h;
  const forearmColor = sleeves === "short" ? skin : c.shirt;

  const leg = (s: 1 | -1) => {
    const L = s === 1 ? "L" : "R";
    return (
      <group key={L} position={[s * d.hipX, -0.02, 0]} rotation={add(ZERO, j(`leg${L}`))}>
        {!hide.thighs ? (
          <mesh position={[0, -d.thigh / 2, 0]} castShadow>
            <capsuleGeometry args={[0.105 * Math.sqrt(w), Math.max(0.01, d.thigh - 0.1), 6, 16]} />
            <ToonMaterial color={c.pants} />
            {line}
          </mesh>
        ) : null}
        {attach[`leg${L}`]}
        <group position={[0, -d.thigh, 0]} rotation={add(ZERO, j(`knee${L}`))}>
          {!hide.shins ? (
            <mesh position={[0, -d.shin / 2, 0]} castShadow>
              <capsuleGeometry args={[0.092 * Math.sqrt(w), Math.max(0.01, d.shin - 0.08), 6, 16]} />
              <ToonMaterial color={c.pants} />
              {line}
            </mesh>
          ) : null}
          {attach[`knee${L}`]}
          <group position={[0, -d.shin, 0]} rotation={add(ZERO, j(`ankle${L}`))}>
            {!hide.feet ? (
              <mesh position={[s * 0.005, -0.008, 0.045]} scale={[0.105, 0.08, 0.165]} castShadow>
                <sphereGeometry args={[1, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
                <ToonMaterial color={c.shoes} />
                {line}
              </mesh>
            ) : null}
            {attach[`foot${L}`]}
          </group>
        </group>
      </group>
    );
  };

  const arm = (s: 1 | -1) => {
    const L = s === 1 ? "L" : "R";
    const handShape = resolveHand(s === 1 ? pose.handL : pose.handR);
    return (
      <group
        key={L}
        position={[s * d.shoulderX, d.shoulderY - chestPivot, 0]}
        rotation={add([0, 0, s * 0.2], j(`shoulder${L}`))}
      >
        {!hide.upperArms ? (
          <mesh position={[s * 0.01, 0, 0]} castShadow>
            <sphereGeometry args={[0.105, 20, 14]} />
            <ToonMaterial color={c.shirt} />
            {line}
          </mesh>
        ) : null}
        {!hide.upperArms ? (
          <mesh position={[0, -d.upperArm / 2 + 0.02, 0]} castShadow>
            <capsuleGeometry args={[0.088, d.upperArm - 0.1, 6, 16]} />
            <ToonMaterial color={c.shirt} />
            {line}
          </mesh>
        ) : null}
        {attach[`shoulder${L}`]}
        <group position={[0, -d.upperArm, 0]} rotation={add([-0.12, 0, 0], j(`elbow${L}`))}>
          {!hide.forearms ? (
            <mesh position={[0, -d.forearm / 2 + 0.01, 0]} castShadow>
              <capsuleGeometry args={[0.078, d.forearm - 0.09, 6, 16]} />
              <ToonMaterial color={forearmColor} />
              {line}
            </mesh>
          ) : null}
          {attach[`elbow${L}`]}
          <group position={[0, -d.forearm, 0]} rotation={add([0, -s * Math.PI * 0.5, 0], j(`wrist${L}`))}>
            {!hide.hands ? (
              <Hand side={s} shape={handShape} color={skin} ink={ink} grip={attach[`grip${L}`]} />
            ) : null}
            {attach[`hand${L}`]}
          </group>
        </group>
      </group>
    );
  };

  return (
    <BodyContext.Provider value={{ shape, dims: d, skin }}>
      <group position={position} rotation={rotation} scale={scale}>
        <group
          position={pose.rootOffset ?? ZERO}
          rotation={pose.rootRotation ?? ZERO}
          scale={[1 / Math.sqrt(st), st, 1 / Math.sqrt(st)]}
        >
          {attach.root}
          <group position={[0, d.hipsY, 0]} rotation={add(ZERO, j("hips"))}>
            {!hide.pelvis ? (
              <mesh geometry={lathe("body-pelvis", PELVIS, 36)} scale={[w, h, w * 0.92]} castShadow receiveShadow>
                <ToonMaterial color={c.pants} />
                {line}
              </mesh>
            ) : null}
            {attach.hips}
            {leg(1)}
            {leg(-1)}

            {/* spine: belly section */}
            <group position={[0, d.spineY, 0]} rotation={add(ZERO, j("spine"))}>
              {!hide.torso ? (
                <>
                  {/* belly: one lathe, pushed forward and widened by shape.belly (clean single outline) */}
                  <mesh
                    geometry={lathe("body-belly", BELLY, 36)}
                    position={[0, 0, 0.07 * shape.belly * w]}
                    scale={[w * (1 + 0.12 * shape.belly), h, w * (0.9 + 0.38 * shape.belly)]}
                    castShadow
                    receiveShadow
                  >
                    <ToonMaterial color={c.shirt} />
                    {line}
                  </mesh>
                </>
              ) : null}
              {attach.torso}

              {/* chest */}
              <group position={[0, chestPivot, 0]} rotation={add(ZERO, j("chest"))}>
                {!hide.torso ? (
                  <mesh
                    geometry={lathe("body-chest", CHEST, 36)}
                    scale={[w * (0.9 + 0.1 * shape.shoulders), h, w * 0.88]}
                    castShadow
                    receiveShadow
                  >
                    <ToonMaterial color={c.shirt} />
                    {line}
                  </mesh>
                ) : null}
                {attach.chest}
                {arm(1)}
                {arm(-1)}

                {/* neck + head */}
                <group position={[0, 0.33 * h - 0.03, 0]} rotation={add(ZERO, j("neck"))}>
                  <mesh position={[0, 0.05, 0]} castShadow>
                    <cylinderGeometry args={[0.1, 0.115, 0.14, 16]} />
                    <ToonMaterial color={skin} ramp="soft" />
                  </mesh>
                  {attach.neck}
                  <group position={[0, 0.09, 0]} rotation={add(ZERO, j("head"))}>
                    <group position={[0, d.headR * 0.92, 0]}>
                      {!hide.head ? (
                        <mesh scale={[1.04, 0.97, 1]} castShadow>
                          <sphereGeometry args={[d.headR, 48, 32]} />
                          <ToonMaterial color={skin} ramp="soft" />
                          {line}
                        </mesh>
                      ) : null}
                      {!hide.ears && !hide.head
                        ? [-1, 1].map((s) => (
                            <mesh
                              key={s}
                              position={[s * d.headR * 1.0, -d.headR * 0.08, -d.headR * 0.05]}
                              scale={[d.headR * 0.1, d.headR * 0.17, d.headR * 0.13]}
                              castShadow
                            >
                              <sphereGeometry args={[1, 16, 12]} />
                              <ToonMaterial color={skin} ramp="soft" />
                            </mesh>
                          ))
                        : null}
                      {attach.face ?? <Face r={d.headR} id={id} {...face} />}
                      {attach.head}
                    </group>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </BodyContext.Provider>
  );
};
