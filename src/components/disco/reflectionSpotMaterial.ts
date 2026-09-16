import * as THREE from 'three'

export const REFLECTION_SPOT_SHAPE_ATTRIBUTE = 'aSpotShape'

export interface ReflectionSpotMaterialOptions {
  readonly haloReach: number
  readonly lowQuality: boolean
}

export const REFLECTION_SPOT_VERTEX_SHADER = /* glsl */ `
attribute vec4 ${REFLECTION_SPOT_SHAPE_ATTRIBUTE};

varying vec2 vSpotUv;
varying vec4 vSpotShape;

#include <color_pars_vertex>

void main() {
  vSpotUv = uv;
  vSpotShape = ${REFLECTION_SPOT_SHAPE_ATTRIBUTE};

  #include <color_vertex>

  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`

export const REFLECTION_SPOT_FRAGMENT_SHADER = /* glsl */ `
uniform float uHaloReach;
uniform float uCornerRadius;
uniform float uCoreGain;
uniform float uCoreFloor;
uniform vec2 uHotOffset;
uniform float uHotTightness;
uniform vec3 uFringeTint;
uniform float uChromatic;
uniform float uHaloGain;
uniform float uHaloFalloff;
uniform float uBloomGain;
uniform float uBloomFalloff;
uniform float uStreakGain;
uniform float uStreakLong;
uniform float uStreakThin;
uniform float uDither;

varying vec2 vSpotUv;
varying vec4 vSpotShape;

#include <color_pars_fragment>

// Signed distance to a rounded rectangle (iq). The radius is subtracted
// internally, so the outer silhouette stays exactly on halfExtent.
float spotRoundBox( in vec2 point, in vec2 halfExtent, in float radius ) {
  vec2 delta = abs( point ) - halfExtent + radius;
  return min( max( delta.x, delta.y ), 0.0 ) + length( max( delta, 0.0 ) ) - radius;
}

float spotHash( in vec2 point ) {
  vec3 seed = fract( vec3( point.xyx ) * 0.1031 );
  seed += dot( seed, seed.yzx + 33.33 );
  return fract( ( seed.x + seed.y ) * seed.z );
}

void main() {
  float aspect = vSpotShape.x;
  float softness = vSpotShape.y;
  float seed = vSpotShape.z;

  // core is the mirror facet silhouette. q is world isotropic in units of the
  // core half height, so the quad border sits at uHaloReach on all four sides
  // whatever the aspect, and corners, falloffs and streaks stay undistorted.
  vec2 core = vec2( aspect, 1.0 );
  vec2 point = ( vSpotUv - 0.5 ) * 2.0;
  vec2 q = point * ( core + uHaloReach );

  float radius = min( uCornerRadius, min( aspect, 1.0 ) * 0.85 );
  float coreDistance = spotRoundBox( q, core, radius );

  // Screen space antialiasing floor, widened by the throw distance penumbra.
  float edge = max( fwidth( coreDistance ), softness );

  #ifdef SPOT_QUALITY_LOW

    vec3 mask = vec3( 1.0 - smoothstep( -edge, edge, coreDistance ) );

  #else

    float fringeAngle = seed * 6.2831853;
    vec2 fringe = vec2( cos( fringeAngle ), sin( fringeAngle ) ) * uChromatic * ( 1.0 + softness );
    vec3 mask = vec3(
      1.0 - smoothstep( -edge, edge, spotRoundBox( q - fringe, core, radius ) ),
      1.0 - smoothstep( -edge, edge, coreDistance ),
      1.0 - smoothstep( -edge, edge, spotRoundBox( q + fringe, core, radius ) )
    );

  #endif

  // Offset hot centre and a gentle inner gradient, the part of the old canvas
  // texture worth keeping, now without the blur that destroyed the silhouette.
  vec2 hotVector = ( q - uHotOffset * core ) / core;
  float hot = exp( -dot( hotVector, hotVector ) * uHotTightness );
  vec3 body = mask * uFringeTint * ( mix( uCoreFloor, 1.0, hot ) * uCoreGain );

  float outside = max( coreDistance, 0.0 );
  float glow = exp( -outside * uHaloFalloff ) * uHaloGain;

  #ifndef SPOT_QUALITY_LOW

    glow += exp( -outside * uBloomFalloff ) * uBloomGain;

    vec2 axis = abs( q / core );
    glow += ( exp( -axis.y * uStreakThin - axis.x * uStreakLong )
            + exp( -axis.x * uStreakThin - axis.y * uStreakLong ) )
          * uStreakGain * ( 0.55 + 0.9 * seed );

  #endif

  // Forces an exact zero on the quad border, where coreDistance equals
  // uHaloReach at every edge midpoint, so no glow can ever be clipped.
  float window = 1.0 - smoothstep( uHaloReach * 0.55, uHaloReach, coreDistance );
  vec3 energy = ( body + glow * window ) * vColor.rgb;

  // Alpha is written at the very end, so it stays at one through the chunks
  // below and they shape rgb exactly as they always did: the whole falloff goes
  // through tone mapping, which is what turns a flat sticker into a blown out
  // core with tinted edges.
  gl_FragColor = vec4( energy, 1.0 );

  #include <tonemapping_fragment>
  #include <colorspace_fragment>

  // Display domain dither, gated by coverage. The empty padding must stay at
  // exactly zero or hundreds of overlapping quads accumulate a haze.
  float coverage = clamp( max( max( energy.r, energy.g ), energy.b ) * 48.0, 0.0, 1.0 );
  gl_FragColor.rgb += ( spotHash( gl_FragCoord.xy ) - 0.5 ) * uDither * coverage;

  // Premultiplied output. rgb is still added whole, so nothing about the light
  // itself changes, but the surface behind is kept only in proportion to what
  // the spot is not already covering. Taking alpha from the displayed
  // brightness makes a blown out core hide the room grid under it while a faint
  // halo keeps adding to it, and it can never darken a pixel below what it
  // contributes, so no spot punches a hole in the wall.
  gl_FragColor.a =
    clamp( max( max( gl_FragColor.r, gl_FragColor.g ), gl_FragColor.b ), 0.0, 1.0 );
}
`

function createReflectionSpotUniforms(options: ReflectionSpotMaterialOptions) {
  const { lowQuality } = options

  return {
    uHaloReach: { value: options.haloReach },
    uCornerRadius: { value: 0.22 },
    uCoreGain: { value: lowQuality ? 1.15 : 1.25 },
    uCoreFloor: { value: lowQuality ? 0.12 : 0.08 },
    uHotOffset: { value: new THREE.Vector2(-0.16, 0.12) },
    uHotTightness: { value: 2.2 },
    uFringeTint: {
      value: lowQuality ? new THREE.Vector3(1.1, 1, 1.03) : new THREE.Vector3(1.16, 1, 1.05),
    },
    uChromatic: { value: 0.085 },
    uHaloGain: { value: lowQuality ? 0.09 : 0.075 },
    uHaloFalloff: { value: 5.5 },
    uBloomGain: { value: 0.03 },
    uBloomFalloff: { value: 1.25 },
    uStreakGain: { value: 0.1 },
    uStreakLong: { value: 1.1 },
    uStreakThin: { value: 8.5 },
    uDither: { value: 0.0035 },
  }
}

export function createReflectionSpotMaterial(options: ReflectionSpotMaterialOptions) {
  return new THREE.ShaderMaterial({
    vertexShader: REFLECTION_SPOT_VERTEX_SHADER,
    fragmentShader: REFLECTION_SPOT_FRAGMENT_SHADER,
    uniforms: createReflectionSpotUniforms(options),
    defines: options.lowQuality ? { SPOT_QUALITY_LOW: '' } : {},
    transparent: true,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendEquation: THREE.AddEquation,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    blendEquationAlpha: THREE.AddEquation,
    premultipliedAlpha: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: true,
    vertexColors: true,
    dithering: false,
  })
}
