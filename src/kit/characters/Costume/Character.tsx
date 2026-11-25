import { Fragment } from "react";
import { Body, type BodyProps, type Slot } from "../Body";
import type { FacialHair } from "../Face";
import type { HandPoseName, Pose } from "../rig";
import { Cape, type CapeSpec } from "./Cape";
import { Hair, WizardBeard, type HairStyle } from "./Hair";
import { Headwear, type HeadwearType } from "./Headwear";
import { buildOutfit, type OutfitColors, type OutfitType } from "./Outfits";
import { Prop, PROP_MOUNT, type PropType } from "./Props";
import { HAIR_COLORS } from "./shared";

export type PropSpec = { type: PropType; color?: string; accent?: string };

export type CostumeSpec = {
  hair?: { style: HairStyle; color?: string };
  /** 2D facial hair on the face, plus `wizard` for a long 3D beard. */
  facialHair?: FacialHair & { wizard?: boolean };
  headwear?: { type: HeadwearType; color?: string; accent?: string };
  outfit?: { type: OutfitType; colors?: Partial<OutfitColors> };
  /** Extra cape (royal robe brings its own; pass false to remove it). */
  cape?: CapeSpec | false;
  props?: { left?: PropSpec; right?: PropSpec };
};

export type CharacterProps = Omit<BodyProps, "attach" | "colors" | "sleeves" | "hide"> & {
  costume?: CostumeSpec;
  /** Extra attachments on top of the costume. */
  attach?: BodyProps["attach"];
  /** Animate the cape (0 hanging → 1 streaming). */
  capeLift?: number;
};

/**
 * A dressed figurine: base Body + face + hair + headwear + outfit + cape + props.
 * Presets (step 3d) are just CostumeSpecs.
 */
export const Character: React.FC<CharacterProps> = ({ costume = {}, attach: extra = {}, capeLift = 0, skin, face, pose = {}, ...rest }) => {
  const skinTone = skin ?? "#e0a982";
  const outfit = costume.outfit ? buildOutfit(costume.outfit.type, costume.outfit.colors, skinTone) : undefined;
  const slots: Partial<Record<Slot, React.ReactNode[]>> = {};
  const add = (slot: Slot, node: React.ReactNode) => {
    if (!node) return;
    (slots[slot] ??= []).push(node);
  };

  for (const [slot, node] of Object.entries(outfit?.attach ?? {})) add(slot as Slot, node);
  const hairColor = costume.hair?.color ?? costume.facialHair?.color ?? HAIR_COLORS.darkBrown;
  if (costume.hair) add("head", <Hair style={costume.hair.style} color={hairColor} />);
  if (costume.headwear) add("head", <Headwear type={costume.headwear.type} color={costume.headwear.color} accent={costume.headwear.accent} />);
  if (costume.facialHair?.wizard) add("head", <WizardBeard color={costume.facialHair.color ?? hairColor} />);

  const cape = costume.cape === false ? undefined : (costume.cape ?? outfit?.cape);
  if (cape) add("chest", <Cape {...cape} lift={capeLift} />);

  const handPose: { handL?: Pose["handL"]; handR?: Pose["handR"] } = {};
  for (const side of ["left", "right"] as const) {
    const p = costume.props?.[side];
    if (!p) continue;
    const s = side === "left" ? 1 : -1;
    const L = side === "left" ? "L" : "R";
    if (PROP_MOUNT[p.type] === "forearm") {
      add(`elbow${L}`, (
        <group position={[s * 0.1, -0.12, 0.02]} rotation={[0, s * Math.PI * 0.5, 0]}>
          <Prop type={p.type} color={p.color} accent={p.accent} />
        </group>
      ));
    } else {
      add(`grip${L}`, (
        <group rotation={[0, 0, -s * Math.PI * 0.5]}>
          <Prop type={p.type} color={p.color} accent={p.accent} />
        </group>
      ));
      handPose[side === "left" ? "handL" : "handR"] = "hold" as HandPoseName;
    }
  }
  for (const [slot, node] of Object.entries(extra)) add(slot as Slot, node);

  const attach: Partial<Record<Slot, React.ReactNode>> = {};
  for (const [slot, nodes] of Object.entries(slots)) {
    attach[slot as Slot] = (
      <>
        {nodes.map((n, i) => (
          <Fragment key={i}>{n}</Fragment>
        ))}
      </>
    );
  }

  return (
    <Body
      {...rest}
      skin={skinTone}
      colors={outfit?.colors}
      sleeves={outfit?.sleeves}
      hide={outfit?.hide}
      attach={attach}
      pose={{ ...pose, handL: pose.handL ?? handPose.handL, handR: pose.handR ?? handPose.handR }}
      face={{
        browColor: hairColor,
        ...face,
        facialHair: face?.facialHair ?? (costume.facialHair ? { ...costume.facialHair, color: costume.facialHair.color ?? hairColor } : undefined),
      }}
    />
  );
};
