import * as THREE from 'three'
import type { BallScreenGeometry, ScreenRect } from './ballProjection'

/**
 * The glow the disco ball throws into the room.
 *
 * The march, the noise and the ray pattern are adapted from the Prismatic Burst
 * background of vue-bits (https://vue-bits.dev/backgrounds/prismatic-burst),
 * MIT + Commons Clause, Copyright (c) David Haz.
 */

export const PRISMATIC_BURST_COLORS = {
  inner: 0x7de3ff,
  middle: 0x39d7c8,
  outer: 0x8f63ff,
} as const

export interface BurstQuadTransform {
  readonly centerX: number
  readonly centerY: number
  readonly halfWidth: number
  readonly halfHeight: number
}

export function getBurstReach(ball: BallScreenGeometry, view: ScreenRect, spread: number) {
  return ball.diameter / 2 + spread * view.height
}

export function getBurstQuadTransform(
  ball: BallScreenGeometry,
  view: ScreenRect,
  reach: number,
): BurstQuadTransform | null {
  if (!(view.width > 0) || !(view.height > 0) || !(reach > 0)) return null

  return {
    centerX: ((ball.centerX - view.left) / view.width) * 2 - 1,
    centerY: 1 - ((ball.centerY - view.top) / view.height) * 2,
    halfWidth: (reach / view.width) * 2,
    halfHeight: (reach / view.height) * 2,
  }
}

/**
 * The march is the most expensive thing in the room, and once the ball has
 * scrolled far enough away the quad cannot cover a single pixel. The test is on
 * the quad's own bounds, so it only ever hides a halo the rasterizer would have
 * thrown away whole: nothing can pop.
 */
export function isBurstQuadOnScreen(quad: BurstQuadTransform) {
  return (
    quad.centerX - quad.halfWidth <= 1 &&
    quad.centerX + quad.halfWidth >= -1 &&
    quad.centerY - quad.halfHeight <= 1 &&
    quad.centerY + quad.halfHeight >= -1
  )
}

export const PRISMATIC_BURST_VERTEX_SHADER = /* glsl */ `
uniform vec2 uQuadCenter;
uniform vec2 uQuadHalfSize;

void main() {
  // Screen space throughout: the halo is a picture laid over the room, not an
  // object standing in it, so the camera has no say in where it lands.
  gl_Position = vec4( uQuadCenter + position.xy * uQuadHalfSize, 0.0, 1.0 );
}
`

export const PRISMATIC_BURST_FRAGMENT_SHADER = /* glsl */ `
uniform vec2 uViewport;
uniform float uPixelRatio;
uniform vec2 uCenter;
uniform float uHoleRadius;
uniform float uReach;
uniform float uFocal;
uniform float uTime;
uniform float uAngle;
uniform float uIntensity;
uniform float uNoiseAmount;
uniform float uDistort;
uniform vec3 uColorInner;
uniform vec3 uColorMiddle;
uniform vec3 uColorOuter;

float hash21( in vec2 p ) {
  p = floor( p );
  float f = 52.9829189 * fract( dot( p, vec2( 0.065, 0.005 ) ) );
  return fract( f );
}

mat2 rot30() {
  return mat2( 0.8, -0.5, 0.5, 0.8 );
}

float layeredNoise( in vec2 fragPx ) {
  vec2 p = mod( fragPx + vec2( uTime * 30.0, -uTime * 21.0 ), 1024.0 );
  vec2 q = rot30() * p;
  float n = 0.0;
  n += 0.40 * hash21( q );
  n += 0.25 * hash21( q * 2.0 + 17.0 );
  n += 0.20 * hash21( q * 4.0 + 47.0 );
  n += 0.10 * hash21( q * 8.0 + 113.0 );
  n += 0.05 * hash21( q * 16.0 + 191.0 );
  return n;
}

vec2 rot2( in vec2 v, in float a ) {
  float s = sin( a );
  float c = cos( a );
  return mat2( c, -s, s, c ) * v;
}

float smootherstep01( in float x ) {
  x = clamp( x, 0.0, 1.0 );
  return x * x * x * ( x * ( x * 6.0 - 15.0 ) + 10.0 );
}

/** Three stops across the ray depth, standing in for the original's texture. */
vec3 sampleGradient( in float t ) {
  float u = clamp( t, 0.0, 1.0 ) * 2.0;
  return u < 1.0 ? mix( uColorInner, uColorMiddle, u ) : mix( uColorMiddle, uColorOuter, u - 1.0 );
}

float bendAngle( in vec3 q, in float t ) {
  return 0.8 * sin( q.x * 0.55 + t * 0.6 )
       + 0.7 * sin( q.y * 0.50 - t * 0.5 )
       + 0.6 * sin( q.z * 0.60 + t * 0.7 );
}

/**
 * Nothing on the ball, a ramp just outside it, gone again by the reach.
 *
 * Measured in the band between the two radii rather than in pixels, so the
 * shape of the halo survives every viewport and every apparent ball size.
 */
float haloShape( in float distancePx ) {
  float band = ( distancePx - uHoleRadius ) / max( uReach - uHoleRadius, 1.0 );
  // A long tail rather than a ring: the light has to run out of the frame, and
  // any sharper pair of curves draws a visible disc edge around the ball.
  return smootherstep01( band / 0.25 ) * ( 1.0 - smootherstep01( band ) );
}

void main() {
  // gl_FragCoord counts device pixels from the bottom; everything handed in
  // from the page is CSS pixels from the top.
  vec2 frag = vec2( gl_FragCoord.x, uViewport.y * uPixelRatio - gl_FragCoord.y ) / uPixelRatio;
  vec2 toCenter = frag - uCenter;
  float distancePx = length( toCenter );

  // Leave before the noise, not after it: the grain below is scaled by the shape,
  // so on a pixel the halo does not reach it could never have changed anything.
  float shaped = haloShape( distancePx );
  if ( shaped <= 0.0 ) discard;

#ifdef BURST_CHEAP

  /*
   * The halo a weak device gets. The march below shades an area larger than a
   * phone's whole screen at roughly 340 transcendental ops a pixel; this is a
   * dozen, and it has to carry the same impression — light coming off *that*
   * ball, not a gradient stuck on the glass.
   *
   * Two things do that work. sampleGradient is the one the march uses, so the
   * cyan-teal-violet run is identical; and the spokes are indexed by uAngle, so
   * they turn with the ball. Drop either and it reads as a sticker.
   */
  float band = clamp( ( distancePx - uHoleRadius ) / max( uReach - uHoleRadius, 1.0 ), 0.0, 1.0 );
  float spoke = atan( toCenter.y, toCenter.x ) + uAngle;

  // Spokes, not a gradient. The march delivers its light in rays with darkness
  // between them; a smooth falloff on its own reads as fog and floods the top of
  // the page with one flat colour.
  float beat = sin( spoke * 9.0 + uTime * 1.3 ) * sin( spoke * 4.0 - uTime * 0.9 );
  float rays = pow( max( beat, 0.0 ), 0.8 );

  // Cubed, so the light stays near the ball and the room behind it stays black.
  float reach = pow( 1.0 - band, 2.2 );

  // Half the range, and only the near half. sampleGradient runs inner→middle
  // across the first half and middle→outer across the second, so stopping at
  // 0.5 gives blue at the ball fading to turquoise, and keeps the violet end
  // out of the picture entirely — cycling the whole palette by angle hung a
  // stray purple arc across the room, which is not light a mirror ball throws.
  vec3 tint = sampleGradient( band * 0.5 );

  vec3 col = tint * ( 0.18 + 2.3 * rays ) * reach * BURST_CHEAP_GAIN;

  // The grain the march adds is five octaves of hash noise at an amplitude of
  // 0.0015 — invisible on its own, and the most expensive thing left in this
  // branch if it were kept. The shape alone is the falloff here.
  float falloff = shaped;

#else

  float grain = ( layeredNoise( frag * 0.15 ) - 0.5 ) * 0.0015 * shaped;
  float falloff = clamp( shaped + grain, 0.0, 1.0 );
  if ( falloff <= 0.0 ) discard;

  float t = uTime;
  float jitterAmp = 0.1 * clamp( uNoiseAmount, 0.0, 1.0 );
  vec3 dir = normalize( vec3( 2.0 * toCenter, max( uFocal, 1.0 ) ) );
  float marchT = 0.0;
  float n = layeredNoise( frag );
  float amp = clamp( uDistort, 0.0, 50.0 ) * 0.15;
  vec3 col = vec3( 0.0 );

  for ( int i = 0; i < BURST_STEPS; i ++ ) {
    vec3 P = marchT * dir;
    P.z -= 2.0;
    float rad = length( P );

    // Every step is weighted by smoothstep( 5.0, 0.0, rad ), which is flat zero
    // from rad 5 outwards, and rad only ever grows once the march is past the
    // near point. Whatever is left of the loop out here adds nothing.
    if ( rad >= 5.0 ) break;

    vec3 Pl = P * ( 10.0 / max( rad, 1e-6 ) );

    // The one rotation in the effect, and it is the ball's own.
    Pl.xz = rot2( Pl.xz, uAngle );

    float stepLen = min( rad - 0.3, n * jitterAmp ) + 0.1;

    float grow = smoothstep( 0.35, 3.0, marchT );
    float a1 = amp * grow * bendAngle( Pl * 0.6, t );
    float a2 = 0.5 * amp * grow * bendAngle( Pl.zyx * 0.5 + 3.1, t * 0.9 );
    vec3 Pb = Pl;
    Pb.xz = rot2( Pb.xz, a1 );
    Pb.xy = rot2( Pb.xy, a2 );

    float rayPattern = smoothstep(
      0.5, 0.7,
      sin( Pb.x + cos( Pb.y ) * cos( Pb.z ) ) *
      sin( Pb.z + sin( Pb.y ) * cos( Pb.x + t ) )
    );

    float saw = fract( marchT * 0.25 );
    vec3 spectral = 2.0 * sampleGradient( saw * saw * ( 3.0 - 2.0 * saw ) );
    col += ( 0.05 / ( 0.4 + stepLen ) ) * smoothstep( 5.0, 0.0, rad ) * spectral * rayPattern;

    marchT += stepLen;
  }

#endif

  col = clamp( col * falloff * uIntensity, 0.0, 1.0 );

  gl_FragColor = vec4( col, 1.0 );

  #include <tonemapping_fragment>
  #include <colorspace_fragment>

  // Additive light: alpha only has to say how much of the canvas this pixel now
  // owns, which is what keeps the CSS fallback room from showing through it.
  gl_FragColor.a =
    clamp( max( max( gl_FragColor.r, gl_FragColor.g ), gl_FragColor.b ), 0.0, 1.0 );
}
`

/**
 * The halo is a disc of radius `uReach`; everything outside it is discarded. A
 * square would hand the rasterizer the four corners as well, which is a fifth of
 * the fragments shaded for nothing.
 *
 * The polygon is circumscribed, so it covers the disc whole. Note that the
 * vertex shader never looks at the model matrix, so the size has to be baked in
 * here — scaling the mesh would do nothing at all.
 */
export const BURST_QUAD_SEGMENTS = 16

export function createPrismaticBurstGeometry() {
  return new THREE.CircleGeometry(1 / Math.cos(Math.PI / BURST_QUAD_SEGMENTS), BURST_QUAD_SEGMENTS)
}

export type PrismaticBurstMode = 'march' | 'glow'

export interface PrismaticBurstMaterialOptions {
  readonly steps: number
  /** Optional, and 'march' when absent: the full effect stays the default. */
  readonly mode?: PrismaticBurstMode
}

/*
 * The march accumulates over its steps, so uIntensity is tuned for a sum. The
 * analytic glow produces its whole value at once and needs its own scale, which
 * is a compile-time constant rather than a uniform: a new uniform would mean a
 * new entry in the material's contract, and the point of the cheap path is that
 * nothing outside this file has to know about it.
 */
const BURST_CHEAP_GAIN = 1.15

export function createPrismaticBurstMaterial(options: PrismaticBurstMaterialOptions) {
  const glow = options.mode === 'glow'

  return new THREE.ShaderMaterial({
    vertexShader: PRISMATIC_BURST_VERTEX_SHADER,
    fragmentShader: PRISMATIC_BURST_FRAGMENT_SHADER,
    defines: glow
      ? { BURST_STEPS: '1', BURST_CHEAP: '', BURST_CHEAP_GAIN: BURST_CHEAP_GAIN.toFixed(2) }
      : { BURST_STEPS: String(Math.max(1, Math.round(options.steps))) },
    uniforms: {
      uQuadCenter: { value: new THREE.Vector2() },
      uQuadHalfSize: { value: new THREE.Vector2(1, 1) },
      uViewport: { value: new THREE.Vector2(1, 1) },
      uPixelRatio: { value: 1 },
      uCenter: { value: new THREE.Vector2() },
      uHoleRadius: { value: 1 },
      uReach: { value: 2 },
      uFocal: { value: 1 },
      uTime: { value: 0 },
      uAngle: { value: 0 },
      uIntensity: { value: 1 },
      uNoiseAmount: { value: 0.8 },
      uDistort: { value: 0 },
      uColorInner: { value: new THREE.Color(PRISMATIC_BURST_COLORS.inner) },
      uColorMiddle: { value: new THREE.Color(PRISMATIC_BURST_COLORS.middle) },
      uColorOuter: { value: new THREE.Color(PRISMATIC_BURST_COLORS.outer) },
    },
    transparent: true,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendEquation: THREE.AddEquation,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneFactor,
    blendEquationAlpha: THREE.AddEquation,
    premultipliedAlpha: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: true,
  })
}
