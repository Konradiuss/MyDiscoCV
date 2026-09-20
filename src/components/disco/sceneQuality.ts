/**
 * How much room the device can afford to draw.
 *
 * This is deliberately NOT the same question as "is the screen narrow". Those
 * two were one check — `window.innerWidth < 720`, repeated inline in ten places
 * — and conflating them costs both ways: a weak laptop at 1440px got none of the
 * savings, and anything demoted for being slow would have lost the turntable and
 * been re-framed, neither of which has anything to do with being slow.
 *
 * So there are two axes now. Framing — field of view, how far the ball travels,
 * the size of the record sleeves, whether the floor props are built — stays on
 * viewport width, in viewportSync.ts. Cost — pixel ratio, antialiasing, which
 * halo, how many light spots — lives here.
 */

import { PHONE_VIEWPORT_WIDTH } from './viewportSync'

export type SceneQualityTier = 'high' | 'low'

export interface SceneQualityProfile {
  /** Ceiling on devicePixelRatio; the scene is fill-bound, so this is the big one. */
  readonly maxPixelRatio: number
  /** A context attribute, fixed at construction — see the note on the resolver. */
  readonly antialias: boolean
  readonly burstSteps: number
  readonly burstMode: 'march' | 'glow'
  /** Read by the mirror shell and by the facet lattice the spots are sampled from. */
  readonly ballSegments: number
  /** Key into the component's reflectionDensityProfiles. */
  readonly reflectionDensity: 'desktop' | 'mobile'
  /** Points projected each frame to find the ball's box; see ballProjection.ts. */
  readonly silhouetteSamples: number
  readonly roomGridCellPixels: number
  readonly wallShading: 'standard' | 'lambert'
  readonly environmentLighting: boolean
}

/**
 * `high` is the desktop of today and must stay that way: a test compares it
 * against a frozen literal for exactly that reason. `low` starts out as the
 * phone of today, so introducing this file changes no picture anywhere; the
 * savings arrive by editing these numbers, one measured step at a time.
 */
export const SCENE_QUALITY_PROFILES: Record<SceneQualityTier, SceneQualityProfile> = {
  high: {
    maxPixelRatio: 1.8,
    antialias: true,
    burstSteps: 44,
    burstMode: 'march',
    ballSegments: 32,
    reflectionDensity: 'desktop',
    silhouetteSamples: 64,
    roomGridCellPixels: 40,
    wallShading: 'standard',
    environmentLighting: true,
  },
  low: {
    maxPixelRatio: 1,
    antialias: true,
    // Unused by the glow, kept so the tier can be flipped back in one edit.
    burstSteps: 20,
    burstMode: 'glow',
    ballSegments: 24,
    reflectionDensity: 'mobile',
    silhouetteSamples: 16,
    roomGridCellPixels: 40,
    wallShading: 'lambert',
    environmentLighting: true,
  },
}

/**
 * A tablet, or a narrow window on a touchscreen laptop. Above this a coarse
 * pointer says nothing useful about power — a desktop with a touch monitor is
 * still a desktop.
 */
const COARSE_POINTER_CEILING = 1100

export interface QualityReading {
  readonly width: number
  readonly coarsePointer: boolean
  /** `?quality=high|low`, which beats everything: the measuring rig needs it. */
  readonly override: string | null
}

export function getStaticQualityTier(reading: QualityReading): SceneQualityTier {
  if (reading.override === 'high' || reading.override === 'low') return reading.override
  if (reading.width < PHONE_VIEWPORT_WIDTH) return 'low'

  return reading.coarsePointer && reading.width < COARSE_POINTER_CEILING ? 'low' : 'high'
}
