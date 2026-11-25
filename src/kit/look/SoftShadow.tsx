import { useMemo } from "react";
import * as THREE from "three";
import { TIME_OF_DAY } from "./lighting";
import { useLook } from "./LookContext";

/**
 * Cheap soft contact shadow: a radial-gradient disc on the ground.
 * Use under dioramas, characters and props to "seat" them without expensive shadow maps.
 */
export const SoftShadow: React.FC<{
  position?: [number, number, number];
  radius?: number;
  /** Ellipse stretch [x, z]. */
  stretch?: [number, number];
  opacity?: number;
}> = ({ position = [0, 0.01, 0], radius = 1, stretch = [1, 1], opacity = 0.45 }) => {
  const look = useLook();
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { color: { value: new THREE.Color() }, opacity: { value: 1 } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform vec3 color; uniform float opacity; varying vec2 vUv;
          void main(){
            float d = length(vUv - 0.5) * 2.0;
            float a = (1.0 - smoothstep(0.0, 1.0, d)); a = a * a;
            gl_FragColor = vec4(color, a * opacity);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );
  material.uniforms.color.value.set(TIME_OF_DAY[look.timeOfDay].shadowTint).multiplyScalar(0.35);
  material.uniforms.opacity.value = opacity;
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} scale={[radius * 2 * stretch[0], radius * 2 * stretch[1], 1]} material={material}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
};
