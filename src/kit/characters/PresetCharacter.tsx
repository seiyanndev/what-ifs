import { SKIN_TONES } from "../look";
import { Character, type CharacterProps } from "./Costume";
import { PRESETS, type PresetId } from "./presets";

/**
 * A named preset, ready to act: <PresetCharacter preset="napoleon" pose={...} face={{ talk }} />.
 * Any prop overrides the preset (e.g. a different expression or skin).
 */
export const PresetCharacter: React.FC<Omit<CharacterProps, "costume"> & { preset: PresetId; costume?: CharacterProps["costume"] }> = ({
  preset,
  costume,
  shape,
  skin,
  face,
  id,
  ...rest
}) => {
  const p = PRESETS[preset];
  return (
    <Character
      {...rest}
      id={id ?? preset}
      costume={costume ?? p.costume}
      shape={shape ?? p.shape}
      skin={skin ?? SKIN_TONES[p.skin]}
      face={{ expression: p.expression, ...face }}
    />
  );
};
