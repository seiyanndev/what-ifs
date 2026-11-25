import { Ink, ToonMaterial } from "../look";
import type { HandShape } from "./rig";

type Props = {
  /** +1 = character's left hand, -1 = right hand. */
  side: 1 | -1;
  shape: HandShape;
  color: string;
  ink?: boolean;
  /** Rendered at the grip point (centre of the curled hand), oriented along the fist. */
  grip?: React.ReactNode;
  scale?: number;
};

/**
 * Mitten hand: palm + 3-finger mitten block + separate index finger + thumb.
 * Local space: fingers point -Y, palm faces +Z, thumb on the +X side for the left hand.
 * (The wrist's rest rotation turns the palm toward the body.)
 */
export const Hand: React.FC<Props> = ({ side: s, shape, color, ink = true, grip, scale = 1 }) => {
  const mat = <ToonMaterial color={color} ramp="soft" />;
  const line = ink ? <Ink weight="character" /> : null;
  return (
    <group scale={scale}>
      {/* palm */}
      <mesh position={[0, -0.065, 0]} scale={[0.082, 0.085, 0.058]} castShadow>
        <sphereGeometry args={[1, 24, 16]} />
        {mat}
        {line}
      </mesh>
      {/* 3-finger mitten block, pivots at the knuckles */}
      <group position={[-s * 0.012, -0.115, 0]} rotation={[-shape.curl, 0, 0]}>
        <mesh position={[0, -0.045, 0]} scale={[0.066, 0.062, 0.052]} castShadow>
          <sphereGeometry args={[1, 20, 14]} />
          {mat}
          {line}
        </mesh>
      </group>
      {/* index finger — hidden inside the mitten unless it differs (pointing) */}
      <group position={[s * 0.038, -0.115, 0]} rotation={[-shape.index, 0, 0]}>
        <mesh position={[0, -0.046, 0]} castShadow>
          <capsuleGeometry args={[0.026, 0.05, 6, 12]} />
          {mat}
          {line}
        </mesh>
      </group>
      {/* thumb */}
      <group
        position={[s * 0.062, -0.05, 0.018]}
        rotation={[-shape.thumbCurl * 0.8, 0, s * (0.35 + shape.thumbSpread)]}
      >
        <mesh position={[0, -0.045, 0]} castShadow>
          <capsuleGeometry args={[0.03, 0.045, 6, 12]} />
          {mat}
          {line}
        </mesh>
      </group>
      {/* grip point: in front of the palm, where curled fingers close */}
      {grip ? <group position={[0, -0.11, 0.07]}>{grip}</group> : null}
    </group>
  );
};
