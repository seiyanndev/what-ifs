import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { TIME_OF_DAY } from "./lighting";
import { useLook } from "./LookContext";

/** Outline settings. Thickness is in pixels at 1080px width (auto-scaled for previews). */
export const INK = {
  character: 4,
  prop: 3.2,
  set: 2.4,
} as const;

/** Camera depth (world units) below which outlines start to thicken for close-ups. */
export const INK_REF_DEPTH = 14;

// Screen-space inverted hull: back faces pushed out along the projected normal by N pixels.
// Guarded against zero-length normals (lathe poles, sphere caps) which would otherwise explode.
const vertexShader = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
uniform float thickness;
uniform vec2 size;
uniform float refDepth;
void main() {
  vec4 pos = vec4(position, 1.0);
  vec3 n = normal;
  #ifdef USE_INSTANCING
    pos = instanceMatrix * pos;
    n = mat3(instanceMatrix) * n;
  #endif
  vec4 mvPosition = modelViewMatrix * pos;
  vec4 clip = projectionMatrix * mvPosition;
  vec3 viewN = normalMatrix * n;
  vec2 cn = (projectionMatrix * vec4(viewN, 0.0)).xy;
  float l = length(cn);
  if (l > 1e-5) {
    // close-ups get proportionally bolder lines (up to 2.5×); wide shots keep the base width
    float boost = clamp(refDepth / max(clip.w, 0.001), 1.0, 2.5);
    clip.xy += (cn / l) * thickness * boost / size * clip.w * 2.0;
  }
  gl_Position = clip;
  #include <fog_vertex>
}
`;

const fragmentShader = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform vec3 color;
void main() {
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

type Props = {
  /** Preset weight or explicit pixel thickness at 1080 wide. */
  weight?: keyof typeof INK | number;
  color?: string;
};

/**
 * Soft ink outline. Place inside a <mesh> (or <instancedMesh>) next to its material:
 *   <mesh><sphereGeometry /><ToonMaterial /><Ink weight="character" /></mesh>
 * Works best on meshes with smooth normals (spheres, capsules, rounded boxes, lathes).
 */
export const Ink: React.FC<Props> = ({ weight = "prop", color }) => {
  const look = useLook();
  const { width, height } = useThree((s) => s.size);
  const px = typeof weight === "number" ? weight : INK[weight];
  const group = useRef<THREE.Group>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            thickness: { value: 1 },
            size: { value: new THREE.Vector2(1080, 1920) },
            color: { value: new THREE.Color() },
            refDepth: { value: INK_REF_DEPTH },
          },
        ]),
        vertexShader,
        fragmentShader,
        side: THREE.BackSide,
        fog: true,
      }),
    [],
  );

  // Attach the hull to the parent mesh's geometry (layout effect → ready before the frame renders).
  useLayoutEffect(() => {
    const g = group.current;
    const parent = g?.parent as THREE.Mesh | THREE.InstancedMesh | undefined;
    if (!g || !parent?.geometry) return;
    const hull =
      (parent as THREE.InstancedMesh).isInstancedMesh
        ? new THREE.InstancedMesh(parent.geometry, material, (parent as THREE.InstancedMesh).count)
        : new THREE.Mesh(parent.geometry, material);
    if ((hull as THREE.InstancedMesh).isInstancedMesh) {
      (hull as THREE.InstancedMesh).instanceMatrix = (parent as THREE.InstancedMesh).instanceMatrix;
    }
    hull.raycast = () => null;
    g.add(hull);
    return () => {
      g.remove(hull);
    };
  });

  useLayoutEffect(() => {
    material.uniforms.thickness.value = (px * width) / 1080;
    material.uniforms.size.value.set(width, height);
    material.uniforms.color.value.set(color ?? TIME_OF_DAY[look.timeOfDay].ink);
  }, [material, px, width, height, color, look]);

  return <group ref={group} />;
};
