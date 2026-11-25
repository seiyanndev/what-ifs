import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

// 3-second sanity check: a spinning cube. Animation is driven ONLY by useCurrentFrame().
export const TestCube: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const rotation = interpolate(frame, [0, durationInFrames], [0, Math.PI * 2]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#f3e3c3" }}>
      <ThreeCanvas width={width} height={height} camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 5, 4]} intensity={1.6} color="#ffe2b8" />
        <mesh rotation={[rotation * 0.5, rotation, 0]}>
          <boxGeometry args={[1.6, 1.6, 1.6]} />
          <meshStandardMaterial color="#c8553d" />
        </mesh>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
