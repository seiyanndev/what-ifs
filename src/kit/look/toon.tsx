import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useLook } from "./LookContext";

// ---------------------------------------------------------------------------
// 3-tone toon ramp: shadow / mid / light. The ramp is sampled with
// (N·L * 0.5 + 0.5), so the texel count sets where the bands fall.
//   texels: [shadow, mid, light, light]
//   → N·L < -0.5 : shadow,  -0.5..0 : mid,  > 0 : light
// ---------------------------------------------------------------------------
export const TOON_RAMP = [0.18, 0.55, 1, 1] as const;
/** Softer ramp for skin: keeps faces readable (no hard dark band across the cheeks). */
export const TOON_RAMP_SOFT = [0.42, 0.78, 1, 1] as const;

const rampTextures: Partial<Record<"default" | "soft", THREE.DataTexture>> = {};
export const getToonRamp = (kind: "default" | "soft" = "default"): THREE.DataTexture => {
  const hit = rampTextures[kind];
  if (hit) return hit;
  const ramp = kind === "soft" ? TOON_RAMP_SOFT : TOON_RAMP;
  const data = new Uint8Array(ramp.map((v) => Math.round(v * 255)));
  const tex = new THREE.DataTexture(data, TOON_RAMP.length, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  rampTextures[kind] = tex;
  return tex;
};

/** Shader settings shared by every toon surface. Tweak here to change the whole show. */
export const TOON_SHADING = {
  /** Fresnel rim light: where it starts / is full (0 = facing camera, 1 = grazing). */
  rimStart: 0.62,
  rimEnd: 0.78,
  rimStrength: 0.55,
  /** Shadow tint: darker bands are pushed toward the light rig's shadowTint (cool, not black). */
  shadowTintLow: 0.35,
  shadowTintHigh: 0.85,
  shadowTintStrength: 0.7,
};

const injectToon = (shader: THREE.WebGLProgramParametersWithUniforms, uniforms: Record<string, THREE.IUniform>) => {
  Object.assign(shader.uniforms, uniforms);
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      /* glsl */ `#include <common>
uniform vec3 uRimColor;
uniform float uRimStart;
uniform float uRimEnd;
uniform float uRimStrength;
uniform vec3 uShadowTint;
uniform float uTintLow;
uniform float uTintHigh;
uniform float uTintStrength;`,
    )
    .replace(
      "#include <opaque_fragment>",
      /* glsl */ `
{
  // How lit is this pixel relative to its albedo (after shadows + bands)?
  const vec3 W = vec3(0.299, 0.587, 0.114);
  float albedoLum = max(dot(diffuseColor.rgb, W), 1e-3);
  float litness = dot(outgoingLight, W) / albedoLum;
  float darkness = 1.0 - smoothstep(uTintLow, uTintHigh, litness);
  outgoingLight = mix(outgoingLight, outgoingLight * uShadowTint * 1.6 + diffuseColor.rgb * uShadowTint * 0.12, darkness * uTintStrength);

  // Soft fresnel rim light, coloured by the light rig.
  float facing = 1.0 - max(dot(normalize(vViewPosition), normal), 0.0);
  float rim = smoothstep(uRimStart, uRimEnd, facing);
  outgoingLight += uRimColor * rim * uRimStrength * diffuseColor.rgb * 1.4;
}
#include <opaque_fragment>`,
    );
};

type ToonMaterialProps = {
  color?: THREE.ColorRepresentation;
  /** Use per-instance or per-vertex colors (base color becomes a multiplier). */
  vertexColors?: boolean;
  /** Multiply rim strength for this surface (0 disables). */
  rim?: number;
  /** "soft" for skin. */
  ramp?: "default" | "soft";
  side?: THREE.Side;
  transparent?: boolean;
  opacity?: number;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  /** Colour texture (maps, painted signs). */
  map?: THREE.Texture | null;
  bumpMap?: THREE.Texture | null;
  bumpScale?: number;
  depthWrite?: boolean;
};

/**
 * The house material. Use instead of meshStandardMaterial everywhere:
 *   <mesh><sphereGeometry /><ToonMaterial color="#c8553d" /></mesh>
 * Rim color and shadow tint come from the surrounding <LightRig>.
 */
export const ToonMaterial: React.FC<ToonMaterialProps> = ({ color = "#ffffff", rim = 1, ramp = "default", ...rest }) => {
  const look = useLook();
  const uniforms = useMemo(
    () => ({
      uRimColor: { value: new THREE.Color() },
      uRimStart: { value: TOON_SHADING.rimStart },
      uRimEnd: { value: TOON_SHADING.rimEnd },
      uRimStrength: { value: TOON_SHADING.rimStrength },
      uShadowTint: { value: new THREE.Color() },
      uTintLow: { value: TOON_SHADING.shadowTintLow },
      uTintHigh: { value: TOON_SHADING.shadowTintHigh },
      uTintStrength: { value: TOON_SHADING.shadowTintStrength },
    }),
    [],
  );

  // Layout effects run before Remotion's per-frame render, so this is frame-accurate.
  useLayoutEffect(() => {
    uniforms.uRimColor.value.set(look.rimColor);
    uniforms.uShadowTint.value.set(look.shadowTint);
    uniforms.uRimStrength.value = TOON_SHADING.rimStrength * rim * look.rimIntensity;
  }, [uniforms, look, rim]);

  const onBeforeCompile = useMemo(
    () => (shader: THREE.WebGLProgramParametersWithUniforms) => injectToon(shader, uniforms),
    [uniforms],
  );

  return (
    <meshToonMaterial
      color={color}
      gradientMap={getToonRamp(ramp)}
      onBeforeCompile={onBeforeCompile}
      customProgramCacheKey={() => "house-toon-v1"}
      {...rest}
    />
  );
};
