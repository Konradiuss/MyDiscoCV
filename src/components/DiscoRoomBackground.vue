<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import type { AudioLevelReading } from '@/audio/audioLevels'
import { chaseLevel, getLitRows, getPeakRow } from '@/audio/spectrum'
import type { LabelPattern, Track } from '@/types/music'
import type { UiLabels } from '@/types/resume'
import { drawLabelPattern } from './disco/labelPatterns'
import {
  clipAndSplitReflectionPolygonInto,
  createReflectionPolygonClipWorkspace,
  unfoldedToWorld,
  type MutableReflectionPolygonVertex,
  type ReflectionWall,
} from './disco/reflectionGeometry'
import {
  createStableReflectionFacetSamples,
  getReflectionTravelS,
  type StableReflectionFacetSample,
} from './disco/reflectionSampling'
import {
  REFLECTION_SPOT_SHAPE_ATTRIBUTE,
  createReflectionSpotMaterial,
} from './disco/reflectionSpotMaterial'
import { shouldAnimateScene } from './disco/sceneLoop'
import {
  getStaticQualityTier,
  SCENE_QUALITY_PROFILES,
  type SceneQualityTier,
} from './disco/sceneQuality'
import {
  createTrailingCall,
  getSceneViewport,
  isNarrowViewport,
  needsCameraUpdate,
  needsRendererResize,
  type SceneViewport,
  type ViewportReading,
} from './disco/viewportSync'
import {
  buildRoomGridPositions,
  getRoomGridCellSize,
  type RoomGridHalfSpace,
  type RoomGridPlane,
} from './disco/roomGrid'
import {
  getBallScreenGeometry,
  getObjectScreenRect,
  type BallScreenGeometry,
  type ScreenRect,
} from './disco/ballProjection'
import {
  createPrismaticBurstGeometry,
  createPrismaticBurstMaterial,
  getBurstQuadTransform,
  getBurstReach,
  isBurstQuadOnScreen,
} from './disco/prismaticBurst'
import {
  RECORD_LABEL_DIAMETER,
  RECORD_VINYL_DIAMETER,
  getRecordSleeveLayout,
  getRecordSleevePatch,
  getRecordSleeveRaise,
  getRecordSleeveSize,
  getRecordSlide,
  getSleeveScreenRect,
  getSleevesLeftExtent,
  unionScreenRects,
  type FloorView,
  type RecordSleevePlacement,
  type RecordSleeveRaise,
  type RecordSlide,
} from './disco/recordSleeves'
import {
  CABLE_METRES,
  DECK_METRES,
  SPEAKER_METRES,
  getFloorPropLayout,
  getFloorPropPatch,
  getFloorPropScale,
  getTonearmRestTurn,
  type FloorPropBox,
} from './disco/floorProps'
import { clampVolumePercent, getDraggedVolume, getSteppedVolume } from './controls/volumeControl'
import { METER_DIVISION, getMeterGrid } from './controls/levelMeter'
import {
  SEVEN_SEGMENT_CELL,
  SEVEN_SEGMENT_LAYOUT,
  SEVEN_SEGMENT_SHAPES,
  VOLUME_DIGIT_CELLS,
  getDigitSegments,
  getVolumeDigits,
} from './controls/sevenSegment'
import {
  REFLECTION_LANE_VERTICAL_INSET,
  REFLECTION_SPOT_HALF_HEIGHT,
  REFLECTION_SPOT_PROFILES,
  REFLECTION_TRAVEL_MARGIN,
  buildReflectionSpotFootprint,
  getIncidenceStretch,
  getSpotPenumbra,
  getWallIncidenceCosine,
  type ReflectionIncidenceOptions,
  type ReflectionPenumbraOptions,
  type ReflectionSpotFootprintTarget,
} from './disco/reflectionSpotShape'

const props = defineProps<{
  floorStage?: HTMLElement | null
  sleeves?: readonly Track[]
  activeSleeveId?: string | null
  playing?: boolean
  volume?: number
  labels?: UiLabels
  /** A getter rather than reactive state: it changes every frame. */
  readLevels?: () => AudioLevelReading
  /**
   * Something opaque is over the room. The scene stops: the frames would not be
   * seen, and a blurred backdrop over a live canvas is redrawn on every one.
   */
  covered?: boolean
}>()

const emit = defineEmits<{
  progress: [value: number]
  ready: [ball: BallScreenGeometry | null]
  selectSleeve: [id: string]
  toggleMusic: []
  restartMusic: []
  setVolume: [value: number]
}>()

const stage = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const ballHitArea = ref<HTMLElement | null>(null)
const sleeveHitAreas = ref<HTMLElement[]>([])
const hasWebgl = ref(false)
const floorReachable = ref(false)
const deckReachable = ref(false)
const deckPlayHitArea = ref<HTMLElement | null>(null)
const deckRestartHitArea = ref<HTMLElement | null>(null)
const deckVolumeHitArea = ref<HTMLElement | null>(null)

type DeckPressKey = 'play' | 'restart'
const deckPressKeys = ['play', 'restart'] as const satisfies readonly DeckPressKey[]
const deckHeld: Record<DeckPressKey, boolean> = { play: false, restart: false }
const deckPressedUntil: Record<DeckPressKey, number> = { play: 0, restart: 0 }

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let ballGroup: THREE.Group | null = null
let environmentMap: THREE.Texture | null = null
let ballEnvironmentMap: THREE.Texture | null = null
let topLight: THREE.SpotLight | null = null
let topLightTarget: THREE.Object3D | null = null
let reflectedLight: THREE.SpotLight | null = null
let reflectedLightTarget: THREE.Object3D | null = null
let reflectedSpots: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> | null = null
let reflectedSpotMaterial: THREE.ShaderMaterial | null = null
let reflectedSpotPositions: Float32Array | null = null
let reflectedSpotColors: Float32Array | null = null
let reflectedSpotUvs: Float32Array | null = null
let reflectedSpotShapes: Float32Array | null = null
let reflectedSpotCapacity = 0
/*
 * Resolved once, before the renderer exists, because `antialias` is a context
 * attribute and cannot be changed afterwards. The caches below hold the tier
 * they were built for, so a later change to it rebuilds through the same path a
 * viewport change already uses.
 */
let qualityTier: SceneQualityTier = 'high'
let activeQuality = SCENE_QUALITY_PROFILES.high
let reflectionQualityTier: SceneQualityTier | null = null
/** Cleared by applyViewport(); see the note in updateSceneFromScroll(). */
let floorMetrics: { documentTop: number; height: number } | null = null
let reflectionLatitudeSegments = 0
let reflectionFacets: ReflectionFacet[] = []
let reflectionSurfaces: ReflectionSurface[] = []
let roomGrid: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial> | null = null
let roomGridCellSize = 0
let prismaticBurst: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> | null = null
let burstQualityTier: SceneQualityTier | null = null
let burstTime = 0
let recordSleeves: RecordSleeve[] = []
let recordSleeveSize = 0
let floorProps: FloorPropSet | null = null
let sleevePatchKey = ''
let canvasRect: ScreenRect | null = null
let reflectionAnchorY = 1.88
let reflectionStrength = 1
let reflectionTravelTurns = 0
let animationFrame = 0
let lastFrame = 0
let resizeObserver: ResizeObserver | null = null
let appliedViewport: SceneViewport | null = null
let resizeFrame = 0
let motionQuery: MediaQueryList | null = null
let reducedMotion = false
let isDragging = false
let lastPointerX = 0
let lastPointerTime = 0
let spinVelocity = 0

const initialBallY = 1.88
const ballRadius = 0.48
const facetSeam = 0.11
const ballAutoSpinSpeed = 0.16
const ballReducedMotionSpinSpeed = 0.05
const reflectionTravelPerBallTurn = 0.29
const roomCornerZ = -3.4
const roomFrontZ = 5
const roomHalfWidth = 11
const roomFloorY = -2.7
const roomCeilingY = 7.5
const roomFloorWidth = 24
const roomFloorDepth = 22
const roomFloorCenterZ = 3.2
const floorViewCamera = { y: -0.05, z: 5.5 }
const floorViewTarget = { y: -2.05, z: 0.55 }
const pageViewCamera = { y: 0.08, z: 5.7 }
const pageViewTarget = { y: 0.78, z: -0.45 }
const roomWallDepth = roomFrontZ - roomCornerZ
const roomWallSpan = Math.hypot(roomHalfWidth, roomWallDepth)
const leftWallDirection = new THREE.Vector3(-roomHalfWidth, 0, roomWallDepth).normalize()
const rightWallDirection = new THREE.Vector3(roomHalfWidth, 0, roomWallDepth).normalize()
const roomGridCellPixels = 40
const roomGridReferenceDistance = Math.hypot(0.78 - 0.08, 5.7 - roomCornerZ)
const roomGridSurfaceOffset = 0.006
const roomGridFloorCellAspect = roomHalfWidth / roomWallDepth
const roomGridColor = 0x5bc7ff
const roomGridOpacity = 0.13
const reflectionMaxVerticesPerSpot = 24
const reflectionUnfoldedBounds = {
  minS: -roomWallSpan,
  maxS: roomWallSpan,
  minY: roomFloorY,
  maxY: roomCeilingY,
}
const reflectionLaneDomainAspect =
  (reflectionUnfoldedBounds.maxS - reflectionUnfoldedBounds.minS + REFLECTION_TRAVEL_MARGIN * 2) /
  (roomCeilingY - roomFloorY - REFLECTION_LANE_VERTICAL_INSET * 2)
const reflectionDensityProfiles = {
  desktop: { candidateCount: 220, activeBudget: 220, ...REFLECTION_SPOT_PROFILES.desktop },
  mobile: { candidateCount: 108, activeBudget: 108, ...REFLECTION_SPOT_PROFILES.mobile },
} as const
const reflectionMaximumIntensity = 1.15
const reflectionIncidenceExponent = 0.62
const reflectionIncidenceMinCosine = 0.2
const reflectionAreaCompensation = 0.5
const reflectionPenumbraOptions: ReflectionPenumbraOptions = { base: 0.0012, perUnit: 0.00022 }
const reflectionSoftnessMin = 0.02
const reflectionSoftnessMax = 0.075

const burstSpread = 0.34
const burstFocalScale = 1
const burstTimeScale = 0.5
const burstIntensity = 0.34

const recordSleeveProfiles = {
  desktop: { size: 0.9, margin: 0.15, depth: 3.85, leftReach: 0.6, minFarWidth: 1 },
  mobile: { size: 0.8, margin: 0.07, depth: 3.2, leftReach: 0.6, minFarWidth: 0.5 },
} as const
const recordSleeveFloorOffset = 0.014
const recordSleeveThickness = 0.017
const recordSleeveLift = 0.13
const recordSleeveLiftRate = 11
const recordSleeveRaiseRate = 7
const recordSlideOutRate = 6
const recordSlideInRate = 9
const recordSlideFloor = 0.002
const recordSleeveRevealThreshold = 0.35

const floorPropOptions = {
  margin: 0.15,
  clearance: 0.25,
  depth: 4,
  minFarWidth: 1.5,
  minFit: 0.7,
} as const
const floorPropFloorOffset = 0.009
const deckHitAreaMinimum = 44
const recordSpinSpeed = ((100 / 3) * Math.PI * 2) / 60
const recordSpinRate = 2.4
const conePulseHz = 0.9
const conePulseTravel = 0.012
const conePulseRate = 3
const coneBassTravel = 0.055
const coneMidTravel = 0.034
const soundRiseRate = 34
const meterFallRate = 7
const coneFallRate = 5
const meterPeakFall = 6
const meterRestingLevel = 0.45
const armSwingRate = 2.6
const deckWheelTravel = Math.PI * 2
const deckWheelRate = 18
const deckPressRate = 34
const deckPressHold = 0.12
const deckPressShade = 0.4
const deckPressFinish = { metalness: 0.18, roughness: 0.85 }
const labelSwapSeconds = 0.18
const recordLabelName = 'record-label'

interface FloorPropSet {
  readonly group: THREE.Group
  readonly record: THREE.Group
  readonly label: THREE.MeshStandardMaterial | null
  readonly drivers: readonly {
    readonly moving: THREE.Object3D
    readonly surround: THREE.Object3D
    readonly driven: 'bass' | 'mid'
    readonly travel: number
  }[]
  readonly driverLevels: number[]
  readonly lamp: THREE.MeshStandardMaterial
  readonly meter: readonly (readonly THREE.Mesh[])[]
  readonly meterMaterials: {
    readonly lit: THREE.Material
    readonly unlit: THREE.Material
    readonly peak: THREE.Material
  }
  readonly meterLevel: number[]
  readonly meterPeak: number[]
  readonly meterLitRows: number[]
  readonly meterPeakRows: number[]
  readonly arm: THREE.Object3D
  readonly armPlayTurn: number
  readonly armRestTurn: number
  readonly keys: DeckControls
  volume: number | null
  pattern: LabelPattern | undefined
  labelLight: number
  spin: number
  pulse: number
  armParked: number
  wheelTurn: number
  press: Record<DeckPressKey, number>
}

interface RecordSleeve {
  readonly id: string
  readonly placement: RecordSleevePlacement
  readonly group: THREE.Group
  readonly vinyl: THREE.Group
  readonly slideOut: RecordSlide
  lift: number
  liftTarget: number
  readonly swivel: THREE.Object3D
  readonly hinge: THREE.Object3D
  readonly raiseTo: RecordSleeveRaise
  raise: number
  slide: number
}

type ReflectionSurface = ReflectionWall
type ReflectionFacet = StableReflectionFacetSample

const reflectionColors = [
  new THREE.Color(0xffffff),
  new THREE.Color(0xf4fbff),
  new THREE.Color(0xe5f6ff),
  new THREE.Color(0xdaf1ff),
]

const reflectionColor = new THREE.Color()
const reflectionBatchPoint = new THREE.Vector3()
const reflectionCenterUnfolded = { s: 0, y: 0 }
const reflectionCenterPoint = new THREE.Vector3()
const reflectionSpotShape = { aspect: 1, softness: 0.1, seed: 0 }
const reflectionFootprintVertices: ReflectionSpotFootprintTarget = [
  { s: 0, y: 0, u: 0, v: 0 },
  { s: 0, y: 0, u: 1, v: 0 },
  { s: 0, y: 0, u: 1, v: 1 },
  { s: 0, y: 0, u: 0, v: 1 },
]
const reflectionClipWorkspace = createReflectionPolygonClipWorkspace(16)

function clamp01(value: number) {
  return THREE.MathUtils.clamp(value, 0, 1)
}

function smoothstep(value: number) {
  return value * value * (3 - 2 * value)
}

function createMirrorShell(radius: number, latitudeSegments: number, longitudeSegments: number) {
  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []

  const pointOnSphere = (latitude: number, longitude: number) => {
    const ringRadius = Math.sin(latitude) * radius

    return new THREE.Vector3(
      Math.sin(longitude) * ringRadius,
      Math.cos(latitude) * radius,
      Math.cos(longitude) * ringRadius,
    )
  }

  for (let latitudeIndex = 0; latitudeIndex < latitudeSegments; latitudeIndex += 1) {
    const latitudeStart = (latitudeIndex / latitudeSegments) * Math.PI
    const latitudeEnd = ((latitudeIndex + 1) / latitudeSegments) * Math.PI
    const latitudeCenter = (latitudeStart + latitudeEnd) * 0.5

    for (let longitudeIndex = 0; longitudeIndex < longitudeSegments; longitudeIndex += 1) {
      const longitudeStart = (longitudeIndex / longitudeSegments) * Math.PI * 2
      const longitudeEnd = ((longitudeIndex + 1) / longitudeSegments) * Math.PI * 2
      const longitudeCenter = (longitudeStart + longitudeEnd) * 0.5
      const vertexOffset = positions.length / 3

      const facetCenter = pointOnSphere(latitudeCenter, longitudeCenter)
      const facetNormal = facetCenter.clone().normalize()
      const corners = [
        pointOnSphere(latitudeStart, longitudeStart),
        pointOnSphere(latitudeEnd, longitudeStart),
        pointOnSphere(latitudeEnd, longitudeEnd),
        pointOnSphere(latitudeStart, longitudeEnd),
      ].map((corner) => corner.lerp(facetCenter, facetSeam))

      corners.forEach((corner) => {
        positions.push(corner.x, corner.y, corner.z)
        normals.push(facetNormal.x, facetNormal.y, facetNormal.z)
      })

      indices.push(
        vertexOffset,
        vertexOffset + 1,
        vertexOffset + 2,
        vertexOffset,
        vertexOffset + 2,
        vertexOffset + 3,
      )
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()

  return geometry
}

function createQuadGeometry(points: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3]) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  geometry.setIndex([0, 1, 2, 0, 2, 3])
  geometry.computeVertexNormals()
  return geometry
}

function createRoom() {
  if (!scene) return

  /*
   * Three meshes that between them cover the whole screen, for a surface that is
   * very nearly black. On a weak device the physically based shading — image
   * based lighting, two spotlights with penumbra, the full ACES path — is the
   * third most expensive thing in the frame. Lambert keeps the light pools the
   * spots cast on the floor, which is all this surface actually shows.
   */
  const roomMaterial =
    activeQuality.wallShading === 'lambert'
      ? new THREE.MeshLambertMaterial({ color: 0x0b0712, side: THREE.DoubleSide })
      : new THREE.MeshStandardMaterial({
          color: 0x0b0712,
          metalness: 0,
          roughness: 0.98,
          side: THREE.DoubleSide,
        })

  const cornerBottom = new THREE.Vector3(0, roomFloorY, roomCornerZ)
  const cornerTop = new THREE.Vector3(0, roomCeilingY, roomCornerZ)
  const leftBottom = new THREE.Vector3(-roomHalfWidth, roomFloorY, roomFrontZ)
  const leftTop = new THREE.Vector3(-roomHalfWidth, roomCeilingY, roomFrontZ)
  const rightBottom = new THREE.Vector3(roomHalfWidth, roomFloorY, roomFrontZ)
  const rightTop = new THREE.Vector3(roomHalfWidth, roomCeilingY, roomFrontZ)

  const leftWall = new THREE.Mesh(
    createQuadGeometry([cornerBottom, cornerTop, leftTop, leftBottom]),
    roomMaterial,
  )
  const rightWall = new THREE.Mesh(
    createQuadGeometry([cornerBottom, rightBottom, rightTop, cornerTop]),
    roomMaterial,
  )
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(roomFloorWidth, roomFloorDepth),
    roomMaterial,
  )
  floor.rotation.x = -Math.PI * 0.5
  floor.position.set(0, roomFloorY, roomFloorCenterZ)

  scene.add(leftWall, rightWall, floor)

  const wallCornerOrigin = new THREE.Vector3(0, 0, roomCornerZ)
  const wallVertical = new THREE.Vector3(0, 1, 0)
  const makeSurface = (
    id: ReflectionSurface['id'],
    plane: THREE.Plane,
    horizontal: THREE.Vector3,
    unfoldedSign: ReflectionSurface['unfoldedSign'],
  ): ReflectionSurface => ({
    id,
    plane,
    cornerOrigin: wallCornerOrigin.clone(),
    horizontal: horizontal.clone(),
    vertical: wallVertical.clone(),
    normal: plane.normal.clone(),
    span: roomWallSpan,
    minY: roomFloorY,
    maxY: roomCeilingY,
    unfoldedSign,
  })

  const leftPlane = new THREE.Plane().setFromCoplanarPoints(cornerBottom, cornerTop, leftTop)
  const rightPlane = new THREE.Plane().setFromCoplanarPoints(cornerBottom, rightBottom, rightTop)

  reflectionSurfaces = [
    makeSurface('left', leftPlane, leftWallDirection, -1),
    makeSurface('right', rightPlane, rightWallDirection, 1),
  ]
}

function getFloorGridBounds(): RoomGridHalfSpace[] {
  return [
    { normal: { x: 1, y: 0, z: 0 }, constant: roomFloorWidth / 2 },
    { normal: { x: -1, y: 0, z: 0 }, constant: roomFloorWidth / 2 },
    { normal: { x: 0, y: 0, z: 1 }, constant: roomFloorDepth / 2 - roomFloorCenterZ },
    { normal: { x: 0, y: 0, z: -1 }, constant: roomFloorDepth / 2 + roomFloorCenterZ },
  ]
}

function getFloorGridReach() {
  const halfWidth = roomFloorWidth / 2

  return Math.max(
    Math.hypot(halfWidth, roomFloorCenterZ - roomFloorDepth / 2 - roomCornerZ),
    Math.hypot(halfWidth, roomFloorCenterZ + roomFloorDepth / 2 - roomCornerZ),
  )
}

function disposeRoomGrid() {
  if (!roomGrid) return

  scene?.remove(roomGrid)
  roomGrid.geometry.dispose()
  roomGrid.material.dispose()
  roomGrid = null
}

function createRoomGrid(cellSize: number) {
  if (!scene) return

  const leftSurface = reflectionSurfaces[0]
  const rightSurface = reflectionSurfaces[1]
  if (!leftSurface || !rightSurface) return

  const chunks = [leftSurface, rightSurface].map((surface) =>
    buildRoomGridPositions(
      {
        origin: {
          x: surface.cornerOrigin.x + surface.normal.x * roomGridSurfaceOffset,
          y: roomFloorY,
          z: surface.cornerOrigin.z + surface.normal.z * roomGridSurfaceOffset,
        },
        right: surface.horizontal,
        up: surface.vertical,
        width: surface.span,
        height: roomCeilingY - roomFloorY,
      } satisfies RoomGridPlane,
      cellSize,
    ),
  )

  const floorReach = getFloorGridReach()
  const floorBounds = getFloorGridBounds()

  chunks.push(
    ...[leftSurface, rightSurface].map((surface) =>
      buildRoomGridPositions(
        {
          origin: {
            x: surface.cornerOrigin.x,
            y: roomFloorY + roomGridSurfaceOffset,
            z: surface.cornerOrigin.z,
          },
          right: surface.horizontal,
          up: surface.normal,
          width: floorReach,
          height: floorReach,
        } satisfies RoomGridPlane,
        { acrossWidth: cellSize, acrossHeight: cellSize * roomGridFloorCellAspect },
        [
          leftSurface.plane,
          rightSurface.plane,
          { normal: { x: surface.unfoldedSign, y: 0, z: 0 }, constant: 0 },
          ...floorBounds,
        ],
      ),
    ),
  )

  const positions = new Float32Array(chunks.reduce((total, chunk) => total + chunk.length, 0))
  let offset = 0
  chunks.forEach((chunk) => {
    positions.set(chunk, offset)
    offset += chunk.length
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  roomGrid = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color: roomGridColor,
      transparent: true,
      opacity: roomGridOpacity,
      depthWrite: false,
    }),
  )
  roomGrid.renderOrder = 1
  scene.add(roomGrid)
}

function updateRoomGrid() {
  if (!scene || !camera) return

  const cellSize = getRoomGridCellSize(
    roomGridCellPixels,
    camera.fov,
    Math.max(1, window.innerHeight),
    roomGridReferenceDistance,
  )
  if (roomGrid && Math.abs(cellSize - roomGridCellSize) < 1e-4) return

  disposeRoomGrid()
  createRoomGrid(cellSize)
  roomGridCellSize = cellSize
}

function createRoomLights() {
  if (!scene) return

  scene.add(new THREE.AmbientLight(0x171020, 0.26))

  topLightTarget = new THREE.Object3D()
  topLightTarget.position.set(0, initialBallY, 0)
  topLight = new THREE.SpotLight(0xeaf8ff, 170, 12, 0.34, 0.48, 2)
  topLight.position.set(0, initialBallY + 3.1, 1.45)
  topLight.target = topLightTarget

  reflectedLightTarget = new THREE.Object3D()
  reflectedLightTarget.position.set(0, roomFloorY, -0.9)
  reflectedLight = new THREE.SpotLight(0x78cfff, 48, 18, 1.08, 0.42, 2)
  reflectedLight.position.set(0, initialBallY - 0.12, 0.05)
  reflectedLight.target = reflectedLightTarget

  scene.add(topLightTarget, topLight, reflectedLightTarget, reflectedLight)
}

function getReflectionDensityProfile() {
  return reflectionDensityProfiles[activeQuality.reflectionDensity]
}

function createReflectionFacets(latitudeSegments: number, longitudeSegments: number) {
  const totalFacetCount = latitudeSegments * longitudeSegments
  const densityProfile = getReflectionDensityProfile()
  const targetCount = Math.min(densityProfile.candidateCount, totalFacetCount)
  return createStableReflectionFacetSamples(latitudeSegments, longitudeSegments, targetCount, {
    domainAspect: reflectionLaneDomainAspect,
  })
}
function initializeReflectionFacets() {
  if (reflectionLatitudeSegments === 0) {
    reflectionLatitudeSegments = activeQuality.ballSegments
  }

  reflectionFacets = createReflectionFacets(
    reflectionLatitudeSegments,
    reflectionLatitudeSegments * 2,
  )
}

function createReflectedSpots() {
  if (!scene) return

  const densityProfile = getReflectionDensityProfile()
  reflectedSpotCapacity = densityProfile.activeBudget
  reflectedSpotMaterial = createReflectionSpotMaterial({
    haloReach: densityProfile.haloReach,
    lowQuality: densityProfile.lowQuality,
  })

  const vertexCapacity = reflectedSpotCapacity * reflectionMaxVerticesPerSpot
  reflectedSpotPositions = new Float32Array(vertexCapacity * 3)
  reflectedSpotColors = new Float32Array(vertexCapacity * 3)
  reflectedSpotUvs = new Float32Array(vertexCapacity * 2)
  reflectedSpotShapes = new Float32Array(vertexCapacity * 4)

  const geometry = new THREE.BufferGeometry()
  const positionAttribute = new THREE.BufferAttribute(reflectedSpotPositions, 3)
  const colorAttribute = new THREE.BufferAttribute(reflectedSpotColors, 3)
  const uvAttribute = new THREE.BufferAttribute(reflectedSpotUvs, 2)
  const shapeAttribute = new THREE.BufferAttribute(reflectedSpotShapes, 4)
  positionAttribute.setUsage(THREE.DynamicDrawUsage)
  colorAttribute.setUsage(THREE.DynamicDrawUsage)
  uvAttribute.setUsage(THREE.DynamicDrawUsage)
  shapeAttribute.setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('position', positionAttribute)
  geometry.setAttribute('color', colorAttribute)
  geometry.setAttribute('uv', uvAttribute)
  geometry.setAttribute(REFLECTION_SPOT_SHAPE_ATTRIBUTE, shapeAttribute)
  geometry.setDrawRange(0, 0)

  reflectedSpots = new THREE.Mesh(geometry, reflectedSpotMaterial)
  reflectedSpots.frustumCulled = false
  reflectedSpots.renderOrder = 2

  scene.add(reflectedSpots)
}

function disposeReflectedSpotResources() {
  if (reflectedSpots) {
    scene?.remove(reflectedSpots)
    reflectedSpots.geometry.dispose()
    reflectedSpots.material.dispose()
  } else {
    reflectedSpotMaterial?.dispose()
  }

  reflectedSpots = null
  reflectedSpotMaterial = null
  reflectedSpotPositions = null
  reflectedSpotColors = null
  reflectedSpotUvs = null
  reflectedSpotShapes = null
  reflectedSpotCapacity = 0
  reflectionFacets = []
}

function rebuildReflectedSpotsForViewport(force = false) {
  if (!scene) return

  if (!force && reflectionQualityTier === qualityTier) return

  disposeReflectedSpotResources()
  initializeReflectionFacets()
  createReflectedSpots()
  reflectionQualityTier = qualityTier
  updateReflectedSpots()
}
function appendReflectionPolygonToBatch(
  polygon: readonly MutableReflectionPolygonVertex[],
  count: number,
  surface: ReflectionSurface,
  firstVertexIndex: number,
) {
  if (
    !reflectedSpotPositions ||
    !reflectedSpotColors ||
    !reflectedSpotUvs ||
    !reflectedSpotShapes
  ) {
    return firstVertexIndex
  }

  let vertexIndex = firstVertexIndex

  for (let triangleIndex = 1; triangleIndex < count - 1; triangleIndex += 1) {
    for (let fanVertexIndex = 0; fanVertexIndex < 3; fanVertexIndex += 1) {
      const polygonIndex =
        fanVertexIndex === 0 ? 0 : fanVertexIndex === 1 ? triangleIndex : triangleIndex + 1
      const vertex = polygon[polygonIndex]!
      unfoldedToWorld(vertex, surface, reflectionBatchPoint)

      const positionOffset = vertexIndex * 3
      reflectedSpotPositions[positionOffset] = reflectionBatchPoint.x + surface.normal.x * 0.012
      reflectedSpotPositions[positionOffset + 1] = reflectionBatchPoint.y + surface.normal.y * 0.012
      reflectedSpotPositions[positionOffset + 2] = reflectionBatchPoint.z + surface.normal.z * 0.012
      reflectedSpotColors[positionOffset] = reflectionColor.r
      reflectedSpotColors[positionOffset + 1] = reflectionColor.g
      reflectedSpotColors[positionOffset + 2] = reflectionColor.b

      const uvOffset = vertexIndex * 2
      reflectedSpotUvs[uvOffset] = vertex.u
      reflectedSpotUvs[uvOffset + 1] = vertex.v

      const shapeOffset = vertexIndex * 4
      reflectedSpotShapes[shapeOffset] = reflectionSpotShape.aspect
      reflectedSpotShapes[shapeOffset + 1] = reflectionSpotShape.softness
      reflectedSpotShapes[shapeOffset + 2] = reflectionSpotShape.seed
      reflectedSpotShapes[shapeOffset + 3] = 0
      vertexIndex += 1
    }
  }

  return vertexIndex
}

function updateReflectedSpots() {
  if (
    !ballGroup ||
    !reflectedSpots ||
    !reflectedSpotMaterial ||
    !reflectedSpotPositions ||
    !reflectedSpotColors ||
    !reflectedSpotUvs ||
    !reflectedSpotShapes
  ) {
    return
  }

  const leftSurface = reflectionSurfaces[0]
  const rightSurface = reflectionSurfaces[1]
  if (leftSurface?.id !== 'left' || rightSurface?.id !== 'right') return

  const densityProfile = getReflectionDensityProfile()
  const activeBudget = Math.min(reflectedSpotCapacity, densityProfile.activeBudget)
  const incidenceOptions: ReflectionIncidenceOptions = {
    minCosine: reflectionIncidenceMinCosine,
    exponent: reflectionIncidenceExponent,
    maxStretch: densityProfile.maxStretch,
  }

  let activeSpotCount = 0
  let activeVertexCount = 0
  const vertexCapacity = reflectedSpotPositions.length / 3

  for (let facetIndex = 0; facetIndex < reflectionFacets.length; facetIndex += 1) {
    const facet = reflectionFacets[facetIndex]!
    const centerS = getReflectionTravelS(
      facet.travelPhase,
      reflectionTravelTurns,
      reflectionUnfoldedBounds.minS,
      reflectionUnfoldedBounds.maxS,
      REFLECTION_TRAVEL_MARGIN,
    )
    const centerY = THREE.MathUtils.lerp(
      roomFloorY + REFLECTION_LANE_VERTICAL_INSET,
      roomCeilingY - REFLECTION_LANE_VERTICAL_INSET,
      facet.laneProgress,
    )

    const centerSurface = centerS < 0 ? leftSurface : rightSurface
    const stretch = getIncidenceStretch(
      getWallIncidenceCosine(centerSurface, Math.abs(centerS), 0, 0),
      incidenceOptions,
    )

    reflectionCenterUnfolded.s = centerS
    reflectionCenterUnfolded.y = centerY
    unfoldedToWorld(reflectionCenterUnfolded, centerSurface, reflectionCenterPoint)
    const throwDistance = Math.hypot(
      reflectionCenterPoint.x,
      reflectionCenterPoint.y - reflectionAnchorY,
      reflectionCenterPoint.z,
    )

    const halfHeight = REFLECTION_SPOT_HALF_HEIGHT * facet.spotScale
    buildReflectionSpotFootprint(
      {
        centerS,
        centerY,
        halfHeight,
        aspect: facet.aspect,
        rotation: facet.rotation,
        stretch,
        haloReach: densityProfile.haloReach,
      },
      reflectionFootprintVertices,
    )

    if (
      !clipAndSplitReflectionPolygonInto(
        reflectionFootprintVertices,
        reflectionUnfoldedBounds,
        reflectionClipWorkspace,
      )
    ) {
      continue
    }

    const leftVertexCount = Math.max(0, reflectionClipWorkspace.leftCount - 2) * 3
    const rightVertexCount = Math.max(0, reflectionClipWorkspace.rightCount - 2) * 3
    const footprintVertexCount = leftVertexCount + rightVertexCount
    if (footprintVertexCount === 0) continue
    if (activeVertexCount + footprintVertexCount > vertexCapacity) break

    const colorIndex = Math.min(
      reflectionColors.length - 1,
      Math.floor(facet.colorSeed * reflectionColors.length),
    )
    const spotIntensity = Math.min(
      reflectionMaximumIntensity,
      (facet.energy * 0.92 * reflectionStrength) / Math.pow(stretch, reflectionAreaCompensation),
    )
    reflectionColor.copy(reflectionColors[colorIndex]!).multiplyScalar(spotIntensity)
    reflectionSpotShape.aspect = facet.aspect
    reflectionSpotShape.softness = THREE.MathUtils.clamp(
      getSpotPenumbra(throwDistance, reflectionPenumbraOptions) / halfHeight,
      reflectionSoftnessMin,
      reflectionSoftnessMax,
    )
    reflectionSpotShape.seed = facet.styleSeed
    activeVertexCount = appendReflectionPolygonToBatch(
      reflectionClipWorkspace.left,
      reflectionClipWorkspace.leftCount,
      leftSurface,
      activeVertexCount,
    )
    activeVertexCount = appendReflectionPolygonToBatch(
      reflectionClipWorkspace.right,
      reflectionClipWorkspace.rightCount,
      rightSurface,
      activeVertexCount,
    )

    activeSpotCount += 1
    if (activeSpotCount >= activeBudget) break
  }

  reflectedSpots.geometry.setDrawRange(0, activeVertexCount)

  /*
   * Only the vertices actually written. Without a range three.js re-uploads the
   * whole capacity every frame — a couple of hundred kilobytes across the memory
   * bus whether four spots are live or two hundred.
   */
  for (const name of ['position', 'color', 'uv', REFLECTION_SPOT_SHAPE_ATTRIBUTE]) {
    const attribute = reflectedSpots.geometry.getAttribute(name) as THREE.BufferAttribute
    attribute.clearUpdateRanges()
    attribute.addUpdateRange(0, activeVertexCount * attribute.itemSize)
    attribute.needsUpdate = true
  }
}
function disposePrismaticBurst() {
  if (!prismaticBurst) return

  scene?.remove(prismaticBurst)
  prismaticBurst.geometry.dispose()
  prismaticBurst.material.dispose()
  prismaticBurst = null
}

function createPrismaticBurst() {
  if (!scene) return

  prismaticBurst = new THREE.Mesh(
    createPrismaticBurstGeometry(),
    createPrismaticBurstMaterial({
      steps: activeQuality.burstSteps,
      mode: activeQuality.burstMode,
    }),
  )
  prismaticBurst.frustumCulled = false
  prismaticBurst.renderOrder = 3
  prismaticBurst.visible = false

  scene.add(prismaticBurst)
}

function rebuildPrismaticBurstForViewport(force = false) {
  if (!scene) return

  if (!force && burstQualityTier === qualityTier) return

  disposePrismaticBurst()
  createPrismaticBurst()
  burstQualityTier = qualityTier
}

function updatePrismaticBurst() {
  if (!prismaticBurst || !renderer) return

  const view = canvasRect
  const ball = view ? measureBallOnScreen() : null
  const reach = ball && view ? getBurstReach(ball, view, burstSpread) : 0
  const quad = ball && view ? getBurstQuadTransform(ball, view, reach) : null

  if (!ball || !view || !quad || !isBurstQuadOnScreen(quad)) {
    prismaticBurst.visible = false
    return
  }

  prismaticBurst.visible = true

  const { uniforms } = prismaticBurst.material
  uniforms.uQuadCenter!.value.set(quad.centerX, quad.centerY)
  uniforms.uQuadHalfSize!.value.set(quad.halfWidth, quad.halfHeight)
  uniforms.uViewport!.value.set(view.width, view.height)
  uniforms.uPixelRatio!.value = renderer.getPixelRatio()
  uniforms.uCenter!.value.set(ball.centerX - view.left, ball.centerY - view.top)
  uniforms.uHoleRadius!.value = ball.diameter / 2
  uniforms.uReach!.value = reach
  uniforms.uFocal!.value = view.height * burstFocalScale
  uniforms.uAngle!.value = ballGroup?.rotation.y ?? 0
  uniforms.uTime!.value = burstTime
  uniforms.uIntensity!.value = burstIntensity * reflectionStrength
}

function createPlaceholderCover(track: Track) {
  const textureCanvas = document.createElement('canvas')
  textureCanvas.width = 256
  textureCanvas.height = 256

  const context = textureCanvas.getContext('2d')
  if (!context) return null

  const paper = context.createLinearGradient(0, 0, 256, 256)
  paper.addColorStop(0, '#1b2440')
  paper.addColorStop(0.55, '#101728')
  paper.addColorStop(1, '#221436')
  context.fillStyle = paper
  context.fillRect(0, 0, 256, 256)

  context.strokeStyle = 'rgba(125, 227, 255, 0.4)'
  context.lineWidth = 3
  context.strokeRect(11, 11, 234, 234)

  context.beginPath()
  context.arc(178, 84, 52, 0, Math.PI * 2)
  context.fillStyle = 'rgba(8, 11, 20, 0.85)'
  context.fill()
  context.beginPath()
  context.arc(178, 84, 12, 0, Math.PI * 2)
  context.fillStyle = 'rgba(125, 227, 255, 0.55)'
  context.fill()

  context.fillStyle = '#f5f7fb'
  context.font = 'bold 22px Inter, system-ui, sans-serif'
  context.fillText(track.title.slice(0, 16), 26, 196)
  context.fillStyle = '#8b95ab'
  context.font = '16px Inter, system-ui, sans-serif'
  context.fillText(track.artist.slice(0, 22), 26, 220)

  const texture = new THREE.CanvasTexture(textureCanvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createVinylTexture() {
  if (vinylTexture) return vinylTexture

  const textureCanvas = document.createElement('canvas')
  textureCanvas.width = 512
  textureCanvas.height = 512

  const context = textureCanvas.getContext('2d')
  if (!context) return null

  const middle = 256
  const disc = context.createRadialGradient(middle, middle, 40, middle, middle, middle)
  disc.addColorStop(0, '#0d0f15')
  disc.addColorStop(0.75, '#14161f')
  disc.addColorStop(1, '#080a0f')
  context.fillStyle = disc
  context.fillRect(0, 0, 512, 512)

  context.lineWidth = 1
  for (let radius = middle * 0.2; radius < middle * 0.99; radius += 2.2) {
    context.beginPath()
    context.arc(middle, middle, radius, 0, Math.PI * 2)
    context.strokeStyle = radius % 4.4 < 2.2 ? 'rgba(150, 168, 200, 0.07)' : 'rgba(0, 0, 0, 0.35)'
    context.stroke()
  }

  context.beginPath()
  context.arc(middle, middle, middle * 0.2, 0, Math.PI * 2)
  context.fillStyle = '#0b0d13'
  context.fill()

  vinylTexture = new THREE.CanvasTexture(textureCanvas)
  vinylTexture.colorSpace = THREE.SRGBColorSpace
  vinylTexture.anisotropy = renderer?.capabilities.getMaxAnisotropy() ?? 1
  return vinylTexture
}

const sleeveTextures = new Map<string, THREE.Texture>()
let vinylTexture: THREE.CanvasTexture | null = null
const labelTextures = new Map<LabelPattern, THREE.CanvasTexture>()
let contactShadowTexture: THREE.CanvasTexture | null = null

function createLabelTexture(pattern: LabelPattern) {
  const cached = labelTextures.get(pattern)
  if (cached) return cached

  const textureCanvas = document.createElement('canvas')
  textureCanvas.width = 512
  textureCanvas.height = 512

  const context = textureCanvas.getContext('2d')
  if (!context) return null

  drawLabelPattern(context, pattern, 512)

  const texture = new THREE.CanvasTexture(textureCanvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = renderer?.capabilities.getMaxAnisotropy() ?? 1
  labelTextures.set(pattern, texture)
  return texture
}

function createSleeveTexture(track: Track) {
  const cached = sleeveTextures.get(track.id)
  if (cached) return cached

  const texture = track.coverSrc
    ? new THREE.TextureLoader().load(track.coverSrc)
    : createPlaceholderCover(track)
  if (!texture) return null

  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = renderer?.capabilities.getMaxAnisotropy() ?? 1
  sleeveTextures.set(track.id, texture)
  return texture
}

function createVinylRecord(size: number, pattern?: LabelPattern) {
  const radius = (size * RECORD_VINYL_DIAMETER) / 2
  const record = new THREE.Group()

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 64),
    new THREE.MeshStandardMaterial({
      map: createVinylTexture(),
      envMapIntensity: 0.3,
      roughness: 0.55,
      metalness: 0.02,
      emissive: 0xffffff,
      emissiveIntensity: 0.03,
    }),
  )
  disc.rotation.x = -Math.PI * 0.5

  const printed = pattern ? createLabelTexture(pattern) : null
  const label = new THREE.Mesh(
    new THREE.CircleGeometry(radius * RECORD_LABEL_DIAMETER, 48),
    new THREE.MeshStandardMaterial({
      map: printed,
      emissiveMap: printed,
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0,
      emissive: 0xffffff,
      emissiveIntensity: printed ? 0.3 : 0.14,
    }),
  )
  label.rotation.x = -Math.PI * 0.5
  label.position.y = 0.0008
  label.name = recordLabelName

  const hole = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.024, 16),
    new THREE.MeshBasicMaterial({ color: 0x05060a }),
  )
  hole.rotation.x = -Math.PI * 0.5
  hole.position.y = 0.0016

  record.add(disc, label, hole)
  return record
}

const roomWalls = { cornerZ: roomCornerZ, frontZ: roomFrontZ, halfWidth: roomHalfWidth }

function floorViewFrom(
  lens: THREE.PerspectiveCamera,
  station: { y: number; z: number },
  target: { y: number; z: number },
): FloorView {
  return {
    cameraY: station.y,
    cameraZ: station.z,
    targetY: target.y,
    targetZ: target.z,
    fov: lens.fov,
    aspect: lens.aspect,
    floorY: roomFloorY,
  }
}

function currentFloorView(lens: THREE.PerspectiveCamera) {
  return floorViewFrom(lens, floorViewCamera, floorViewTarget)
}

function currentPageView(lens: THREE.PerspectiveCamera) {
  return floorViewFrom(lens, pageViewCamera, pageViewTarget)
}

function disposeRecordSleeves() {
  recordSleeves.forEach((sleeve) => {
    scene?.remove(sleeve.group)
    disposeObject(sleeve.group)
  })

  recordSleeves = []
}

function createRecordSleeves() {
  if (!scene || !camera) return

  const tracks = props.sleeves ?? []
  if (tracks.length === 0) return

  const profile = isNarrowViewport() ? recordSleeveProfiles.mobile : recordSleeveProfiles.desktop
  const floorView = currentFloorView(camera)
  const area = getRecordSleevePatch(floorView, roomWalls, profile)

  recordSleeveSize = getRecordSleeveSize(tracks.length, area, profile.size)
  const layout = getRecordSleeveLayout(tracks.length, area, recordSleeveSize)

  recordSleeves = tracks.flatMap((track, index) => {
    const placement = layout[index]
    if (!placement || !scene) return []

    const texture = createSleeveTexture(track)
    const printed = new THREE.MeshStandardMaterial({
      map: texture,
      emissiveMap: texture,
      emissive: 0xffffff,
      emissiveIntensity: 0.42,
      roughness: 0.52,
      metalness: 0.05,
    })
    const card = new THREE.MeshStandardMaterial({
      color: 0x161a24,
      emissive: 0xffffff,
      emissiveIntensity: 0.05,
      roughness: 0.92,
      metalness: 0,
    })
    const thickness = recordSleeveSize * recordSleeveThickness
    /* Face order: +x, -x, +y, -y, +z, -z; the top face carries the artwork. */
    const sleeve = new THREE.Mesh(
      new THREE.BoxGeometry(recordSleeveSize, thickness, recordSleeveSize),
      [card, card, printed, card, card, card],
    )
    sleeve.position.y = thickness / 2

    const vinyl = createVinylRecord(recordSleeveSize, track.label)
    vinyl.position.y = thickness / 2
    vinyl.visible = false

    const half = recordSleeveSize / 2
    const swivel = new THREE.Group()
    const hinge = new THREE.Group()
    hinge.position.z = half
    sleeve.position.z = -half
    hinge.add(sleeve)
    swivel.add(hinge)

    const group = new THREE.Group()
    group.position.set(placement.x, roomFloorY + recordSleeveFloorOffset, placement.z)
    group.rotation.y = placement.rotation
    group.add(swivel, vinyl)
    scene.add(group)

    return [
      {
        id: track.id,
        placement,
        group,
        vinyl,
        swivel,
        hinge,
        raiseTo: getRecordSleeveRaise(placement, floorView),
        raise: 0,
        slideOut: getRecordSlide(index, layout, area, recordSleeveSize),
        lift: 0,
        liftTarget: 0,
        slide: 0,
      },
    ]
  })
}

function createContactShadowTexture() {
  if (contactShadowTexture) return contactShadowTexture

  const size = 128
  const textureCanvas = document.createElement('canvas')
  textureCanvas.width = size
  textureCanvas.height = size

  const context = textureCanvas.getContext('2d')
  if (!context) return null

  const shadow = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  shadow.addColorStop(0, '#ffffff')
  shadow.addColorStop(0.42, '#9a9a9a')
  shadow.addColorStop(1, '#000000')
  context.fillStyle = shadow
  context.fillRect(0, 0, size, size)

  contactShadowTexture = new THREE.CanvasTexture(textureCanvas)
  return contactShadowTexture
}

function createContactShadow(width: number, depth: number) {
  const alphaMap = createContactShadowTexture()
  if (!alphaMap) return null

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 1.6, depth * 1.6),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      alphaMap,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    }),
  )
  shadow.rotation.x = -Math.PI * 0.5
  shadow.position.y = 0.007 - floorPropFloorOffset

  return shadow
}

function createFloorPropMaterials() {
  return {
    shell: new THREE.MeshStandardMaterial({
      color: 0x15181f,
      roughness: 0.72,
      metalness: 0.04,
      envMapIntensity: 0.35,
    }),
    metal: new THREE.MeshStandardMaterial({
      color: 0x474d57,
      roughness: 0.44,
      metalness: 0.82,
      envMapIntensity: 0.45,
    }),
    rubber: new THREE.MeshStandardMaterial({
      color: 0x0c0e13,
      roughness: 0.95,
      metalness: 0,
      envMapIntensity: 0.2,
    }),
    baffle: new THREE.MeshStandardMaterial({
      color: 0x0d1015,
      roughness: 0.85,
      metalness: 0.02,
      envMapIntensity: 0.25,
    }),
    cone: new THREE.MeshStandardMaterial({
      color: 0x2b313d,
      roughness: 0.94,
      metalness: 0,
      envMapIntensity: 0.3,
      side: THREE.DoubleSide,
    }),
    lamp: new THREE.MeshStandardMaterial({
      color: 0x0a1016,
      roughness: 0.4,
      metalness: 0,
      emissive: 0x7fe4ff,
      emissiveIntensity: 1.6,
    }),
    knurl: new THREE.MeshStandardMaterial({
      color: 0x474d57,
      roughness: 0.44,
      metalness: 0.82,
      envMapIntensity: 0.45,
      flatShading: true,
    }),
    glyph: new THREE.MeshStandardMaterial({
      color: 0x121820,
      roughness: 0.5,
      metalness: 0,
      emissive: 0x9fc4d8,
      emissiveIntensity: 0.42,
    }),
    readout: new THREE.MeshStandardMaterial({
      color: 0x04080c,
      roughness: 0.45,
      metalness: 0,
      emissive: 0x7fe4ff,
      emissiveIntensity: 0.6,
    }),
    peak: new THREE.MeshStandardMaterial({
      color: 0x0a141c,
      roughness: 0.45,
      metalness: 0,
      emissive: 0xd8f6ff,
      emissiveIntensity: 0.85,
    }),
    glyphOff: new THREE.MeshStandardMaterial({
      color: 0x060a0f,
      roughness: 0.6,
      metalness: 0,
      emissive: 0x7fe4ff,
      emissiveIntensity: 0.06,
    }),
    edge: new THREE.LineBasicMaterial({
      color: roomGridColor,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    }),
    cavity: new THREE.MeshStandardMaterial({
      color: 0x07090d,
      roughness: 0.9,
      metalness: 0,
      envMapIntensity: 0.15,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x04060a,
      roughness: 0.35,
      metalness: 0.05,
      envMapIntensity: 0.2,
    }),
  }
}

type FloorPropMaterials = ReturnType<typeof createFloorPropMaterials>
type DeckControls = ReturnType<typeof createDeckControls>

function createDeckGlyph(
  kind: 'play' | 'pause' | 'restart',
  scale: number,
  materials: FloorPropMaterials,
) {
  const { glyphRadius, glyphBar } = DECK_METRES.controls
  const radius = glyphRadius * scale
  const glyph = new THREE.Group()

  if (kind === 'pause') {
    const width = radius * 0.6
    const gap = glyphBar.gap * scale * 1.6

    for (const side of [-1, 1]) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(width, radius * 1.8), materials.glyph)
      bar.position.x = (side * (width + gap)) / 2
      glyph.add(bar)
    }

    return glyph
  }

  const triangle = new THREE.Mesh(new THREE.CircleGeometry(radius, 3), materials.glyph)
  if (kind === 'play') {
    glyph.add(triangle)

    return glyph
  }

  const barWidth = glyphBar.width * scale
  const half = (radius * 1.5 + glyphBar.gap * scale + barWidth) / 2

  triangle.rotation.z = Math.PI
  triangle.position.x = half - radius * 0.5

  const bar = new THREE.Mesh(new THREE.PlaneGeometry(barWidth, radius * 2), materials.glyph)
  bar.position.x = -half + barWidth / 2

  glyph.add(triangle, bar)

  return glyph
}

function createSegmentShape(
  points: readonly (readonly [number, number])[],
  unit: number,
  height: number,
) {
  const shape = new THREE.Shape()

  points.forEach(([x, y], index) => {
    const at: [number, number] = [x * unit, height - y * unit]
    if (index === 0) shape.moveTo(...at)
    else shape.lineTo(...at)
  })
  shape.closePath()

  return shape
}

function createDeckReadout(scale: number, materials: FloorPropMaterials) {
  const { readout } = DECK_METRES.controls
  const height = readout.glassHeight * scale
  const unit = height / SEVEN_SEGMENT_CELL.height
  const group = new THREE.Group()
  const inner = new THREE.Group()
  group.add(inner)
  const cells: THREE.Mesh[][] = []

  for (let cell = 0; cell < VOLUME_DIGIT_CELLS; cell += 1) {
    const segments = SEVEN_SEGMENT_SHAPES.map((shape) => {
      const mesh = new THREE.Mesh(
        new THREE.ShapeGeometry(createSegmentShape(shape.points, unit, height)),
        materials.glyphOff,
      )
      mesh.position.x = cell * SEVEN_SEGMENT_LAYOUT.cellPitch * unit
      inner.add(mesh)

      return mesh
    })

    cells.push(segments)
  }

  const unitMark = new THREE.Group()
  unitMark.position.x = SEVEN_SEGMENT_LAYOUT.unitOffset * unit

  const slash = new THREE.Mesh(
    new THREE.ShapeGeometry(
      createSegmentShape(
        [
          [1.5, 16.5],
          [3.5, 17.5],
          [10.5, 3.5],
          [8.5, 2.5],
        ],
        unit,
        height,
      ),
    ),
    materials.readout,
  )
  unitMark.add(slash)

  for (const [left, top] of [
    [0.6, 1.8],
    [7.2, 14],
  ] as const) {
    const size = 4.2
    const wall = 1.4
    const ring = new THREE.Shape()
    ring.moveTo(left * unit, height - top * unit)
    ring.lineTo((left + size) * unit, height - top * unit)
    ring.lineTo((left + size) * unit, height - (top + size) * unit)
    ring.lineTo(left * unit, height - (top + size) * unit)
    ring.closePath()

    const hole = new THREE.Path()
    hole.moveTo((left + wall) * unit, height - (top + wall) * unit)
    hole.lineTo((left + size - wall) * unit, height - (top + wall) * unit)
    hole.lineTo((left + size - wall) * unit, height - (top + size - wall) * unit)
    hole.lineTo((left + wall) * unit, height - (top + size - wall) * unit)
    hole.closePath()
    ring.holes.push(hole)

    unitMark.add(new THREE.Mesh(new THREE.ShapeGeometry(ring), materials.readout))
  }

  inner.add(unitMark)

  inner.position.x = (-SEVEN_SEGMENT_LAYOUT.width * unit) / 2
  inner.position.y = -height / 2

  return { group, cells, width: SEVEN_SEGMENT_LAYOUT.width * unit }
}

function createDeckControls(box: FloorPropBox, scale: number, materials: FloorPropMaterials) {
  const { plate, plateInset, pad, wheel, wheelReach, knurl, readout, spacing } =
    DECK_METRES.controls
  const metres = (value: number) => value * scale
  const controls = new THREE.Group()
  controls.name = 'deck-controls'

  const faceZ = box.depth / 2
  const plateRelief = metres(plate.relief)
  const plateFaceZ = faceZ + plateRelief
  const plateLeftX = -box.width / 2 + metres(plateInset)
  const centreY = box.height / 2

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(metres(plate.width), metres(plate.height), plateRelief * 2),
    materials.rubber,
  )
  panel.position.set(plateLeftX + metres(plate.width) / 2, centreY, faceZ)
  controls.add(panel)

  const padRelief = metres(pad.relief)
  const padGeometry = new THREE.BoxGeometry(metres(pad.width), metres(pad.height), padRelief * 2)
  const glyphZ = padRelief + metres(0.0008)

  const playFace = materials.metal.clone()
  const restartFace = materials.metal.clone()

  const play = new THREE.Mesh(padGeometry, playFace)
  play.name = 'deck-play'
  play.position.set(plateLeftX + metres(spacing.play), centreY, plateFaceZ)

  const playGlyph = createDeckGlyph('play', scale, materials)
  const pauseGlyph = createDeckGlyph('pause', scale, materials)
  playGlyph.position.z = glyphZ
  pauseGlyph.position.z = glyphZ
  play.add(playGlyph, pauseGlyph)
  controls.add(play)

  const restart = new THREE.Mesh(padGeometry, restartFace)
  restart.name = 'deck-restart'
  restart.position.set(plateLeftX + metres(spacing.restart), centreY, plateFaceZ)
  const restartGlyph = createDeckGlyph('restart', scale, materials)
  restartGlyph.position.z = glyphZ
  restart.add(restartGlyph)
  controls.add(restart)

  const wheelRadius = metres(wheel.diameter) / 2
  const wheelLength = metres(wheel.width)
  const volume = new THREE.Mesh(
    new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelLength, wheel.facets),
    materials.knurl,
  )
  volume.name = 'deck-volume'
  volume.rotation.z = Math.PI * 0.5
  volume.position.set(
    plateLeftX + metres(spacing.wheel),
    centreY,
    plateFaceZ - wheelRadius * (1 - wheelReach),
  )

  const knurlRelief = metres(knurl.relief)
  const ridge = new THREE.BoxGeometry(metres(knurl.width), wheelLength, knurlRelief * 2)
  for (let index = 0; index < knurl.count; index += 1) {
    const angle = (index / knurl.count) * Math.PI * 2
    const bar = new THREE.Mesh(ridge, materials.rubber)
    bar.position.set(Math.sin(angle) * wheelRadius, 0, Math.cos(angle) * wheelRadius)
    bar.rotation.y = angle
    volume.add(bar)
  }

  controls.add(volume)

  const wheelTarget = new THREE.Mesh(
    new THREE.BoxGeometry(wheelLength, wheelRadius * 2, wheelRadius * wheelReach),
  )
  wheelTarget.visible = false
  wheelTarget.position.set(volume.position.x, centreY, plateFaceZ)
  controls.add(wheelTarget)

  const display = createDeckReadout(scale, materials)
  const windowWidth = display.width + metres(readout.padding) * 2
  const windowHeight = metres(readout.glassHeight) + metres(readout.padding) * 2
  const windowRelief = metres(readout.relief)
  const windowX =
    plateLeftX + metres(spacing.wheel) + wheelLength / 2 + metres(readout.gap) + windowWidth / 2

  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(windowWidth, windowHeight, windowRelief * 2),
    materials.glass,
  )
  glass.position.set(windowX, centreY, plateFaceZ)
  display.group.position.set(windowX, centreY, plateFaceZ + windowRelief + metres(0.0008))
  controls.add(glass, display.group)

  return {
    controls,
    play,
    restart,
    volume,
    wheelTarget,
    playGlyph,
    pauseGlyph,
    padRestZ: plateFaceZ,
    padTravel: metres(pad.travel),
    padFaces: { play: playFace, restart: restartFace },
    padLit: materials.metal.color.clone(),
    padDim: materials.metal.color.clone().multiplyScalar(deckPressShade),
    padLitFinish: { metalness: materials.metal.metalness, roughness: materials.metal.roughness },
    padDimFinish: deckPressFinish,
    readout: display.cells,
    lit: materials.readout,
    unlit: materials.glyphOff,
  }
}

function createDeck(box: FloorPropBox, materials: FloorPropMaterials, pattern?: LabelPattern) {
  const deck = new THREE.Group()
  const scale = box.width / DECK_METRES.width
  const metres = (value: number) => value * scale
  const platterRadius = metres(DECK_METRES.platterDiameter) / 2
  const platterTop = box.height + metres(DECK_METRES.platterHeight)
  const platterX = -metres(0.035)
  const platterZ = metres(0.015)

  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(box.width, box.height, box.depth),
    materials.shell,
  )
  plinth.position.y = box.height / 2

  const platter = new THREE.Mesh(
    new THREE.CylinderGeometry(platterRadius, platterRadius, metres(DECK_METRES.platterHeight), 48),
    materials.shell,
  )
  platter.position.set(platterX, box.height + metres(DECK_METRES.platterHeight) / 2, platterZ)

  const mat = new THREE.Mesh(new THREE.CircleGeometry(platterRadius * 1.02, 48), materials.rubber)
  mat.rotation.x = -Math.PI * 0.5
  mat.position.set(platterX, platterTop + 0.001, platterZ)

  const recordSize = recordSleeveSize * (scale / getFloorPropScale(recordSleeveSize))
  const recordRadius = (recordSize * RECORD_VINYL_DIAMETER) / 2
  const record = createVinylRecord(recordSize, pattern)
  record.position.set(platterX, platterTop + metres(DECK_METRES.matHeight), platterZ)

  const spindle = new THREE.Mesh(
    new THREE.CylinderGeometry(
      metres(DECK_METRES.spindleDiameter) / 2,
      metres(DECK_METRES.spindleDiameter) / 2,
      metres(DECK_METRES.spindleHeight),
      12,
    ),
    materials.metal,
  )
  spindle.position.set(platterX, platterTop + metres(DECK_METRES.spindleHeight) / 2, platterZ)

  const armX = box.width / 2 - metres(0.05)
  const armZ = -box.depth / 2 + metres(0.055)
  const toPlatter = Math.hypot(platterX - armX, platterZ - armZ)
  const armLength = Math.max(metres(0.12), toPlatter - recordRadius * 0.62)

  const stylusReach = armLength * 0.97 + metres(DECK_METRES.headshell.depth) / 2
  const armPlayTurn = Math.atan2(platterX - armX, platterZ - armZ)
  const armRestTurn = getTonearmRestTurn(
    armPlayTurn,
    toPlatter,
    stylusReach,
    platterRadius + metres(DECK_METRES.armRest.clearance),
  )

  const arm = new THREE.Group()
  arm.position.set(armX, box.height, armZ)
  arm.rotation.y = armPlayTurn

  const armBase = new THREE.Mesh(
    new THREE.CylinderGeometry(
      metres(DECK_METRES.armBaseDiameter) / 2,
      metres(DECK_METRES.armBaseDiameter) / 2,
      metres(DECK_METRES.armBaseHeight),
      20,
    ),
    materials.shell,
  )
  armBase.position.y = metres(DECK_METRES.armBaseHeight) / 2

  const armTube = new THREE.Mesh(
    new THREE.BoxGeometry(
      metres(DECK_METRES.armDiameter),
      metres(DECK_METRES.armDiameter),
      armLength,
    ),
    materials.metal,
  )
  armTube.position.set(0, metres(DECK_METRES.armBaseHeight) * 0.8, armLength / 2)

  const headshell = new THREE.Mesh(
    new THREE.BoxGeometry(
      metres(DECK_METRES.headshell.width),
      metres(DECK_METRES.headshell.height),
      metres(DECK_METRES.headshell.depth),
    ),
    materials.rubber,
  )
  headshell.position.set(0, metres(DECK_METRES.armBaseHeight) * 0.5, armLength * 0.97)

  arm.add(armBase, armTube, headshell)

  const restPost = new THREE.Mesh(
    new THREE.CylinderGeometry(
      metres(DECK_METRES.armRest.diameter) / 2,
      metres(DECK_METRES.armRest.diameter) / 2,
      metres(DECK_METRES.armRest.height),
      12,
    ),
    materials.shell,
  )
  restPost.position.set(
    armX + Math.sin(armRestTurn) * stylusReach,
    box.height + metres(DECK_METRES.armRest.height) / 2,
    armZ + Math.cos(armRestTurn) * stylusReach,
  )

  const knob = new THREE.Mesh(
    new THREE.CylinderGeometry(
      metres(DECK_METRES.knobDiameter) / 2,
      metres(DECK_METRES.knobDiameter) / 2,
      metres(DECK_METRES.knobHeight),
      16,
    ),
    materials.metal,
  )
  knob.position.set(
    -box.width / 2 + metres(0.05),
    box.height + metres(DECK_METRES.knobHeight) / 2,
    box.depth / 2 - metres(0.05),
  )

  const fader = new THREE.Mesh(
    new THREE.BoxGeometry(
      metres(DECK_METRES.faderLength) * 0.34,
      metres(0.006),
      metres(DECK_METRES.faderLength),
    ),
    materials.rubber,
  )
  fader.position.set(
    box.width / 2 - metres(0.055),
    box.height + metres(0.003),
    box.depth / 2 - metres(DECK_METRES.faderLength) / 2 - metres(0.03),
  )

  const led = new THREE.Mesh(
    new THREE.CircleGeometry(metres(DECK_METRES.ledDiameter) / 2, 12),
    materials.lamp,
  )
  led.rotation.x = -Math.PI * 0.5
  led.position.set(
    -box.width / 2 + metres(0.05),
    box.height + metres(0.004),
    box.depth / 2 - metres(0.105),
  )

  deck.add(plinth, platter, mat, record, spindle, arm, restPost, knob, fader, led)
  const controls = createDeckControls(box, scale, materials)
  deck.add(controls.controls)

  const shadow = createContactShadow(box.width, box.depth)
  if (shadow) deck.add(shadow)

  deck.position.set(box.x, roomFloorY + floorPropFloorOffset, box.z)
  deck.rotation.y = box.rotation

  return { deck, record, arm, armPlayTurn, armRestTurn, controls }
}

function createDriver(
  diameter: number,
  depth: number,
  materials: FloorPropMaterials,
  faceZ: number,
) {
  const { driver: metrics } = SPEAKER_METRES
  const group = new THREE.Group()
  const radius = diameter / 2
  const moving = new THREE.Group()

  const cone = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.97, radius * 0.3, depth, 32, 1, true),
    materials.cone,
  )
  cone.rotation.x = Math.PI * 0.5
  cone.position.z = faceZ - depth / 2

  const capRadius = radius * 0.3
  const dustCap = new THREE.Mesh(
    new THREE.SphereGeometry(capRadius, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
    materials.rubber,
  )
  dustCap.scale.y = metrics.capReach * 2
  dustCap.rotation.x = Math.PI * 0.5
  dustCap.position.z = faceZ - depth

  moving.add(cone, dustCap)

  const flexing = new THREE.Group()
  const surround = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.99, radius * metrics.surroundRoll, 8, 32),
    materials.rubber,
  )
  surround.position.z = faceZ
  flexing.add(surround)

  const rimOuter = radius * (1 + metrics.rimWidth)
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(rimOuter, rimOuter, metrics.rimRelief, 40, 1, true),
    materials.metal,
  )
  rim.rotation.x = Math.PI * 0.5
  rim.position.z = faceZ + metrics.rimRelief / 2

  const rimFace = new THREE.Mesh(
    new THREE.RingGeometry(radius * 1.02, rimOuter, 40),
    materials.metal,
  )
  rimFace.position.z = faceZ + metrics.rimRelief

  group.add(moving, flexing, rim, rimFace)

  const boltRadius = (radius * metrics.boltDiameter) / 2
  const boltRing = (radius * 1.02 + rimOuter) / 2
  const boltGeometry = new THREE.CylinderGeometry(boltRadius, boltRadius, metrics.boltRelief, 8)
  for (let index = 0; index < metrics.bolts; index += 1) {
    const angle = ((index + 0.5) / metrics.bolts) * Math.PI * 2
    const bolt = new THREE.Mesh(boltGeometry, materials.rubber)
    bolt.rotation.x = Math.PI * 0.5
    bolt.position.set(
      Math.cos(angle) * boltRing,
      Math.sin(angle) * boltRing,
      faceZ + metrics.boltRelief / 2,
    )
    group.add(bolt)
  }

  return { driver: group, cone: moving, surround: flexing }
}

function createLevelMeter(scale: number, materials: FloorPropMaterials) {
  const { meter } = SPEAKER_METRES
  const width = meter.width * scale
  const height = meter.height * scale
  const relief = meter.relief * scale
  const padding = meter.padding * scale
  const grid = getMeterGrid(meter.columns, meter.rows, meter.rowPitch)
  const unit = Math.min((width - padding * 2) / grid.width, (height - padding * 2) / grid.height)

  const group = new THREE.Group()
  const glass = new THREE.Mesh(new THREE.BoxGeometry(width, height, relief * 2), materials.glass)
  group.add(glass)

  const block = new THREE.Group()
  block.position.set((-grid.width * unit) / 2, (-grid.height * unit) / 2, relief + scale * 0.0008)
  group.add(block)

  const geometry = new THREE.ShapeGeometry(
    createSegmentShape(METER_DIVISION.points, unit, grid.divisionHeight * unit),
  )
  const columns: THREE.Mesh[][] = []

  for (let column = 0; column < meter.columns; column += 1) {
    const divisions: THREE.Mesh[] = []

    for (let row = 0; row < meter.rows; row += 1) {
      const division = new THREE.Mesh(geometry, materials.glyphOff)
      division.position.set(column * grid.columnPitch * unit, row * grid.rowStep * unit, 0)
      block.add(division)
      divisions.push(division)
    }

    columns.push(divisions)
  }

  return { group, columns }
}

function createSpeaker(box: FloorPropBox, materials: FloorPropMaterials) {
  const speaker = new THREE.Group()
  const scale = box.width / SPEAKER_METRES.width
  const metres = (value: number) => value * scale
  const faceZ = box.depth / 2

  const openFront = materials.baffle.clone()
  openFront.visible = false
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(box.width, box.height, box.depth), [
    materials.shell,
    materials.shell,
    materials.shell,
    materials.shell,
    openFront,
    materials.shell,
  ])
  cabinet.position.y = box.height / 2

  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(cabinet.geometry), materials.edge)
  outline.position.copy(cabinet.position)
  outline.scale.setScalar(1.001)

  const { facing } = SPEAKER_METRES
  const wooferRadius = metres(SPEAKER_METRES.wooferDiameter) / 2
  const midRadius = metres(SPEAKER_METRES.midDiameter) / 2

  const face = new THREE.Shape()
  face.moveTo(-box.width / 2, -box.height / 2)
  face.lineTo(box.width / 2, -box.height / 2)
  face.lineTo(box.width / 2, box.height / 2)
  face.lineTo(-box.width / 2, box.height / 2)
  face.closePath()

  for (const [fraction, radius] of [
    [facing.woofer, wooferRadius],
    [facing.mid, midRadius],
  ] as const) {
    const cut = new THREE.Path()
    cut.absarc(0, (fraction - 0.5) * box.height, radius, 0, Math.PI * 2, true)
    face.holes.push(cut)
  }

  const baffle = new THREE.Mesh(new THREE.ShapeGeometry(face), materials.baffle)
  baffle.position.set(0, box.height / 2, faceZ)

  const cavity = new THREE.Mesh(new THREE.PlaneGeometry(box.width, box.height), materials.cavity)
  cavity.position.set(0, box.height / 2, faceZ - metres(0.13))

  const woofer = createDriver(
    metres(SPEAKER_METRES.wooferDiameter),
    metres(SPEAKER_METRES.wooferDepth),
    materials,
    faceZ,
  )
  woofer.driver.position.y = box.height * facing.woofer

  const mid = createDriver(
    metres(SPEAKER_METRES.midDiameter),
    metres(SPEAKER_METRES.midDepth),
    materials,
    faceZ,
  )
  mid.driver.position.y = box.height * facing.mid

  const meter = createLevelMeter(scale, materials)
  meter.group.position.set(0, box.height * facing.meter, faceZ)

  const led = new THREE.Mesh(
    new THREE.CircleGeometry(metres(SPEAKER_METRES.ledDiameter) / 2, 12),
    materials.lamp,
  )
  led.position.set(
    box.width / 2 - metres(SPEAKER_METRES.ledInset),
    box.height * facing.led,
    faceZ + 0.001,
  )

  speaker.add(cabinet, outline, cavity, baffle, woofer.driver, mid.driver, meter.group, led)

  const shadow = createContactShadow(box.width, box.depth)
  if (shadow) speaker.add(shadow)

  speaker.position.set(box.x, roomFloorY + floorPropFloorOffset, box.z)
  speaker.rotation.y = box.rotation

  return {
    speaker,
    meter: meter.columns,
    drivers: [
      { moving: woofer.cone, surround: woofer.surround, driven: 'bass', travel: coneBassTravel },
      { moving: mid.cone, surround: mid.surround, driven: 'mid', travel: coneMidTravel },
    ] as const,
  }
}

function createFloorProps() {
  if (!scene || !camera || recordSleeves.length === 0 || !(recordSleeveSize > 0)) return
  if (isNarrowViewport()) return

  const view = currentFloorView(camera)
  const area = getFloorPropPatch(
    view,
    roomWalls,
    getSleevesLeftExtent(
      recordSleeves.map((sleeve) => sleeve.placement),
      recordSleeves.map((sleeve) => sleeve.slideOut),
      recordSleeveSize,
    ),
    floorPropOptions,
  )
  const nearest = recordSleeves.reduce((front, sleeve) =>
    sleeve.placement.z > front.placement.z ? sleeve : front,
  ).placement
  const layout = getFloorPropLayout(area, view, recordSleeveSize, floorPropOptions, {
    aimAt: nearest,
    whileScrolling: currentPageView(camera),
  })
  if (!layout) return

  const materials = createFloorPropMaterials()
  const pattern = props.sleeves?.find((track) => track.id === props.activeSleeveId)?.label
  const deck = createDeck(layout.deck, materials, pattern)
  const speaker = createSpeaker(layout.speaker, materials)

  const cableRadius = (CABLE_METRES.diameter / 2) * getFloorPropScale(recordSleeveSize)
  const cable = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(
        layout.cable.map(
          (point) =>
            new THREE.Vector3(point.x, roomFloorY + floorPropFloorOffset + cableRadius, point.z),
        ),
      ),
      40,
      cableRadius,
      6,
      false,
    ),
    materials.rubber,
  )

  const label = deck.record.getObjectByName(recordLabelName)
  const group = new THREE.Group()
  group.add(deck.deck, speaker.speaker, cable)
  scene.add(group)

  const parked = (props.playing ?? false) ? 0 : 1
  deck.arm.rotation.y = deck.armPlayTurn + (deck.armRestTurn - deck.armPlayTurn) * parked
  deck.controls.volume.rotation.x = -(
    (clampVolumePercent((props.volume ?? 0) * 100) / 100) *
    deckWheelTravel
  )

  deckReachable.value = true
  floorProps = {
    group,
    record: deck.record,
    keys: deck.controls,
    volume: null,
    arm: deck.arm,
    armPlayTurn: deck.armPlayTurn,
    armRestTurn: deck.armRestTurn,
    armParked: parked,
    wheelTurn: -((clampVolumePercent((props.volume ?? 0) * 100) / 100) * deckWheelTravel),
    press: { play: 0, restart: 0 },
    label:
      label instanceof THREE.Mesh && label.material instanceof THREE.MeshStandardMaterial
        ? label.material
        : null,
    drivers: speaker.drivers,
    driverLevels: speaker.drivers.map(() => 0),
    lamp: materials.lamp,
    meter: speaker.meter,
    meterMaterials: {
      lit: materials.readout,
      unlit: materials.glyphOff,
      peak: materials.peak,
    },
    meterLevel: speaker.meter.map(() => 0),
    meterPeak: speaker.meter.map(() => 0),
    meterLitRows: speaker.meter.map(() => -1),
    meterPeakRows: speaker.meter.map(() => -1),
    pattern,
    labelLight: 1,
    spin: 0,
    pulse: 0,
  }
}

function disposeFloorProps() {
  if (!floorProps) return

  deckReachable.value = false
  deckHeld.play = false
  deckHeld.restart = false

  scene?.remove(floorProps.group)
  disposeObject(floorProps.group)
  floorProps = null
}

function rebuildFloorForViewport(force = false) {
  if (!scene || !camera) return

  const key = `${isNarrowViewport() ? 'phone' : 'desk'}:${camera.aspect.toFixed(2)}`
  if (!force && sleevePatchKey === key) return

  disposeFloorProps()
  disposeRecordSleeves()
  createRecordSleeves()
  createFloorProps()
  sleevePatchKey = key
}

function updateFloorProps(delta: number, now: number) {
  if (!floorProps) return

  const running = (props.playing ?? false) && !reducedMotion

  floorProps.spin +=
    ((running ? recordSpinSpeed : 0) - floorProps.spin) * (1 - Math.exp(-recordSpinRate * delta))
  floorProps.record.rotation.y += floorProps.spin * delta

  floorProps.pulse +=
    ((running ? 1 : 0) - floorProps.pulse) * (1 - Math.exp(-conePulseRate * delta))

  const parked = (props.playing ?? false) ? 0 : 1
  floorProps.armParked +=
    (parked - floorProps.armParked) * (reducedMotion ? 1 : 1 - Math.exp(-armSwingRate * delta))
  floorProps.arm.rotation.y =
    floorProps.armPlayTurn +
    (floorProps.armRestTurn - floorProps.armPlayTurn) * floorProps.armParked

  floorProps.keys.playGlyph.visible = parked === 1
  floorProps.keys.pauseGlyph.visible = parked === 0

  const { padLit, padDim, padLitFinish, padDimFinish } = floorProps.keys
  for (const key of deckPressKeys) {
    const down = deckHeld[key] || now < deckPressedUntil[key] ? 1 : 0
    floorProps.press[key] +=
      (down - floorProps.press[key]) * (reducedMotion ? 1 : 1 - Math.exp(-deckPressRate * delta))

    const sunk = floorProps.press[key]
    floorProps.keys[key].position.z = floorProps.keys.padRestZ - sunk * floorProps.keys.padTravel

    const face = floorProps.keys.padFaces[key]
    face.color.lerpColors(padLit, padDim, sunk)
    face.metalness =
      padLitFinish.metalness + (padDimFinish.metalness - padLitFinish.metalness) * sunk
    face.roughness =
      padLitFinish.roughness + (padDimFinish.roughness - padLitFinish.roughness) * sunk
  }

  const shown = clampVolumePercent((props.volume ?? 0) * 100)

  const turn = -((shown / 100) * deckWheelTravel)
  floorProps.wheelTurn +=
    (turn - floorProps.wheelTurn) * (reducedMotion ? 1 : 1 - Math.exp(-deckWheelRate * delta))
  floorProps.keys.volume.rotation.x = floorProps.wheelTurn

  if (shown !== floorProps.volume) {
    const keys = floorProps.keys
    floorProps.volume = shown

    getVolumeDigits(shown).forEach((digit, cell) => {
      const segments = keys.readout[cell]
      if (!segments) return

      const alight = digit === null ? [] : getDigitSegments(digit)
      SEVEN_SEGMENT_SHAPES.forEach((shape, index) => {
        const mesh = segments[index]
        if (mesh) mesh.material = alight.includes(shape.id) ? keys.lit : keys.unlit
      })
    })
  }

  updateSpeaker(delta, now)

  const label = floorProps.label
  if (!label) return

  const wanted = props.sleeves?.find((track) => track.id === props.activeSleeveId)?.label
  if (wanted !== floorProps.pattern) {
    floorProps.labelLight -= delta / labelSwapSeconds
    if (floorProps.labelLight <= 0) {
      floorProps.labelLight = 0
      const printed = wanted ? createLabelTexture(wanted) : null
      label.map = printed
      label.emissiveMap = printed
      label.needsUpdate = true
      floorProps.pattern = wanted
    }
  } else if (floorProps.labelLight < 1) {
    floorProps.labelLight = Math.min(1, floorProps.labelLight + delta / labelSwapSeconds)
  }

  label.color.setScalar(floorProps.labelLight)
  label.emissiveIntensity = (floorProps.pattern ? 0.3 : 0.14) * floorProps.labelLight
}

function updateSpeaker(delta: number, now: number) {
  const state = floorProps
  if (!state) return

  const playing = props.playing ?? false
  const heard = props.readLevels?.()
  const tapped = heard?.live ?? false
  const { rows } = SPEAKER_METRES.meter

  const breath = Math.sin(now * 0.001 * conePulseHz * Math.PI * 2) * state.pulse

  state.drivers.forEach((driver, index) => {
    const driven = tapped ? heard![driver.driven] : 0
    state.driverLevels[index] = reducedMotion
      ? 0
      : chaseLevel(state.driverLevels[index] ?? 0, driven, soundRiseRate, coneFallRate, delta)

    const stroke = tapped
      ? (state.driverLevels[index] ?? 0) * driver.travel
      : breath * conePulseTravel
    driver.moving.position.z = stroke
    driver.surround.position.z = stroke / 2
  })

  state.lamp.emissiveIntensity = 1.6 + (tapped ? (state.driverLevels[0] ?? 0) * 0.7 : breath * 0.5)

  state.meter.forEach((divisions, column) => {
    let wanted = 0
    if (playing && reducedMotion) wanted = meterRestingLevel
    else if (tapped) wanted = heard!.bands[column] ?? 0
    else if (playing) {
      wanted = meterRestingLevel * (1 - column * 0.06) * (0.7 + 0.3 * breath)
    }

    state.meterLevel[column] = reducedMotion
      ? wanted
      : chaseLevel(state.meterLevel[column] ?? 0, wanted, soundRiseRate, meterFallRate, delta)

    const lit = getLitRows(state.meterLevel[column] ?? 0, rows)
    state.meterPeak[column] = reducedMotion
      ? lit
      : getPeakRow(state.meterPeak[column] ?? 0, lit, meterPeakFall, delta)

    const peak = Math.min(rows - 1, Math.round(state.meterPeak[column] ?? 0) - 1)

    if (lit === state.meterLitRows[column] && peak === state.meterPeakRows[column]) return

    state.meterLitRows[column] = lit
    state.meterPeakRows[column] = peak

    const { lit: alight, unlit, peak: capped } = state.meterMaterials
    divisions.forEach((division, row) => {
      division.material = row === peak ? capped : row < lit ? alight : unlit
    })
  })
}

function updateRecordSleeves(delta: number) {
  if (recordSleeves.length === 0) return

  const ease = 1 - Math.exp(-recordSleeveLiftRate * delta)
  const outEase = 1 - Math.exp(-recordSlideOutRate * delta)
  const inEase = 1 - Math.exp(-recordSlideInRate * delta)

  const raiseEase = 1 - Math.exp(-recordSleeveRaiseRate * delta)

  recordSleeves.forEach((sleeve) => {
    sleeve.lift += (sleeve.liftTarget - sleeve.lift) * ease
    sleeve.group.position.y = roomFloorY + recordSleeveFloorOffset + sleeve.lift * recordSleeveLift

    const playing = sleeve.id === props.activeSleeveId

    const raiseTarget = sleeve.liftTarget > 0 && !playing ? 1 : 0
    sleeve.raise += (raiseTarget - sleeve.raise) * (reducedMotion ? 1 : raiseEase)
    sleeve.swivel.rotation.y = sleeve.raiseTo.turn * sleeve.raise
    sleeve.hinge.rotation.x = sleeve.raiseTo.tilt * sleeve.raise

    sleeve.slide += ((playing ? 1 : 0) - sleeve.slide) * (playing ? outEase : inEase)
    sleeve.vinyl.visible = sleeve.slide > recordSlideFloor
    const travelled = sleeve.slide * sleeve.slideOut.distance
    sleeve.vinyl.position.x = travelled * sleeve.slideOut.x
    sleeve.vinyl.position.z = travelled * sleeve.slideOut.z
  })
}

function updateSleeveHitAreas() {
  if (!camera || !canvasRect || recordSleeves.length === 0) return

  camera.updateMatrixWorld()

  recordSleeves.forEach((sleeve, index) => {
    const element = sleeveHitAreas.value[index]
    if (!element || !camera || !canvasRect) return

    const resting = roomFloorY + recordSleeveFloorOffset + recordSleeveSize * recordSleeveThickness
    const rect = unionScreenRects(
      getSleeveScreenRect(camera, sleeve.placement, resting, recordSleeveSize, canvasRect),
      getSleeveScreenRect(
        camera,
        sleeve.placement,
        resting + recordSleeveLift,
        recordSleeveSize,
        canvasRect,
      ),
    )

    if (!rect) {
      element.style.visibility = 'hidden'
      return
    }

    element.style.visibility = 'visible'
    element.style.transform = `translate3d(${rect.left.toFixed(1)}px, ${rect.top.toFixed(1)}px, 0)`
    element.style.width = `${rect.width.toFixed(1)}px`
    element.style.height = `${rect.height.toFixed(1)}px`
  })
}

function handleSleeveHover(index: number, hovering: boolean) {
  const sleeve = recordSleeves[index]
  if (sleeve) sleeve.liftTarget = hovering ? 1 : 0
}

function handleSleeveSelect(id: string) {
  emit('selectSleeve', id)
}

function updateDeckHitAreas() {
  if (!camera || !canvasRect || !floorProps) return

  const keys = floorProps.keys
  for (const [element, mesh] of [
    [deckPlayHitArea.value, keys.play],
    [deckRestartHitArea.value, keys.restart],
    [deckVolumeHitArea.value, keys.wheelTarget],
  ] as const) {
    if (!element || !camera || !canvasRect) continue

    const rect = getObjectScreenRect(camera, mesh, canvasRect)
    if (!rect) {
      element.style.visibility = 'hidden'
      continue
    }

    const width = Math.max(rect.width, deckHitAreaMinimum)
    const height = Math.max(rect.height, deckHitAreaMinimum)
    const left = rect.left + (rect.width - width) / 2
    const top = rect.top + (rect.height - height) / 2

    element.style.visibility = 'visible'
    element.style.transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0)`
    element.style.width = `${width.toFixed(1)}px`
    element.style.height = `${height.toFixed(1)}px`
  }
}

function pressDeckKey(key: DeckPressKey) {
  deckHeld[key] = true
  deckPressedUntil[key] = performance.now() + deckPressHold * 1000
}

function releaseDeckKey(key: DeckPressKey) {
  deckHeld[key] = false
}

function activateDeckKey(key: DeckPressKey, event: MouseEvent) {
  if (event.detail !== 0) return

  pressDeckKey(key)
  releaseDeckKey(key)
}

function handleDeckPlay(event: MouseEvent) {
  activateDeckKey('play', event)
  emit('toggleMusic')
}

function handleDeckRestart(event: MouseEvent) {
  activateDeckKey('restart', event)
  emit('restartMusic')
}

const volumePercent = computed(() => clampVolumePercent((props.volume ?? 0) * 100))

let wheelGrabY = 0
let wheelGrabPercent = 0

function handleWheelGrab(event: PointerEvent) {
  const target = event.currentTarget
  if (!(target instanceof Element)) return

  target.setPointerCapture(event.pointerId)
  wheelGrabY = event.clientY
  wheelGrabPercent = volumePercent.value
  event.preventDefault()
}

function handleWheelDrag(event: PointerEvent) {
  const target = event.currentTarget
  if (!(target instanceof Element) || !target.hasPointerCapture(event.pointerId)) return

  const wanted = getDraggedVolume(wheelGrabPercent, event.clientY - wheelGrabY)
  if (wanted !== volumePercent.value) emit('setVolume', wanted / 100)
}

function handleWheelRelease(event: PointerEvent) {
  const target = event.currentTarget
  if (!(target instanceof Element)) return

  if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId)
}

function handleWheelKey(event: KeyboardEvent) {
  const wanted = getSteppedVolume(volumePercent.value, event.key)
  if (wanted === null) return

  event.preventDefault()
  if (wanted !== volumePercent.value) emit('setVolume', wanted / 100)
}

function createEnvironmentTexture() {
  const textureCanvas = document.createElement('canvas')
  textureCanvas.width = 512
  textureCanvas.height = 256

  const context = textureCanvas.getContext('2d')
  if (!context) return null

  const wall = context.createLinearGradient(0, 0, 512, 256)
  wall.addColorStop(0, '#07101f')
  wall.addColorStop(0.45, '#a8e8ff')
  wall.addColorStop(1, '#24152f')
  context.fillStyle = wall
  context.fillRect(0, 0, 512, 256)

  const glow = context.createRadialGradient(250, 72, 0, 250, 72, 150)
  glow.addColorStop(0, 'rgba(255,255,255,.82)')
  glow.addColorStop(0.3, 'rgba(125,227,255,.34)')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  context.fillStyle = glow
  context.fillRect(0, 0, 512, 256)

  const texture = new THREE.CanvasTexture(textureCanvas)
  texture.mapping = THREE.EquirectangularReflectionMapping
  return texture
}

function createBallEnvironmentTexture() {
  const textureCanvas = document.createElement('canvas')
  textureCanvas.width = 512
  textureCanvas.height = 256

  const context = textureCanvas.getContext('2d')
  if (!context) return null

  const room = context.createLinearGradient(0, 0, 0, 256)
  room.addColorStop(0, '#0a1424')
  room.addColorStop(0.5, '#070a14')
  room.addColorStop(1, '#120c1c')
  context.fillStyle = room
  context.fillRect(0, 0, 512, 256)

  const lamps: [number, number, number, string, number][] = [
    [250, 42, 74, '255,255,255', 1],
    [96, 96, 46, '150,220,255', 0.5],
    [408, 88, 52, '190,215,255', 0.42],
    [318, 176, 60, '120,170,255', 0.22],
  ]

  lamps.forEach(([x, y, radius, rgb, alpha]) => {
    const glow = context.createRadialGradient(x, y, 0, x, y, radius)
    glow.addColorStop(0, `rgba(${rgb},${alpha})`)
    glow.addColorStop(0.35, `rgba(${rgb},${alpha * 0.24})`)
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    context.fillStyle = glow
    context.fillRect(0, 0, 512, 256)
  })

  const texture = new THREE.CanvasTexture(textureCanvas)
  texture.mapping = THREE.EquirectangularReflectionMapping
  return texture
}

function createDiscoBall() {
  if (!scene) return

  ballGroup = new THREE.Group()
  ballGroup.position.set(0, initialBallY, 0)
  scene.add(ballGroup)

  const latitudeSegments = activeQuality.ballSegments
  const longitudeSegments = latitudeSegments * 2
  const mirrorMaterial = new THREE.MeshStandardMaterial({
    color: 0xf4f8ff,
    metalness: 1,
    roughness: 0.16,
    envMap: ballEnvironmentMap,
    envMapIntensity: 1.15,
    side: THREE.DoubleSide,
  })
  const mirrorShell = new THREE.Mesh(
    createMirrorShell(ballRadius, latitudeSegments, longitudeSegments),
    mirrorMaterial,
  )
  const mirrorCore = new THREE.Mesh(
    new THREE.SphereGeometry(ballRadius * 0.965, 32, 24),
    new THREE.MeshBasicMaterial({ color: 0x080b14 }),
  )

  ballGroup.add(mirrorCore, mirrorShell)
}

/**
 * The canvas box, not the window.
 *
 * The stage is `100svh`, which on a phone is the height with the address bar
 * showing — while `innerHeight` grows once it retracts. Sizing the drawing
 * buffer from the window therefore paints rows the phone never shows and
 * squashes the ones it does. It is also the steadier number: `svh` does not move
 * with the address bar, so the guards below stop firing during a scroll.
 */
function readViewport(): ViewportReading {
  const element = renderer?.domElement ?? canvas.value

  return {
    width: element?.clientWidth || window.innerWidth,
    height: element?.clientHeight || window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
  }
}

/**
 * The part that has to keep up with the window: the canvas size, the framing and
 * the box the hit areas are placed against. Guarded, because three reallocates
 * the drawing buffer on every setSize, including the ones that change nothing.
 */
function applyViewport() {
  // The page has reflowed, so the floor's place in the document may have moved.
  invalidateFloorMetrics()

  const next = getSceneViewport(readViewport(), activeQuality)

  if (renderer && needsRendererResize(appliedViewport, next)) {
    renderer.setPixelRatio(next.pixelRatio)
    renderer.setSize(next.width, next.height, false)
  }

  if (camera && needsCameraUpdate(appliedViewport, next)) {
    camera.fov = next.fov
    camera.aspect = next.width / Math.max(1, next.height)
    camera.updateProjectionMatrix()
  }

  appliedViewport = next

  if (renderer) canvasRect = renderer.domElement.getBoundingClientRect()

  updateSceneFromScroll()
}

/**
 * The part that tears down and rebuilds geometry. Held back until the window has
 * stopped moving: on a phone the address bar slides through dozens of sizes on
 * the way, and every one of them used to rebuild the floor and the grid.
 */
function rebuildForViewport() {
  rebuildReflectedSpotsForViewport()
  rebuildPrismaticBurstForViewport()
  rebuildFloorForViewport()
  updateRoomGrid()
  updatePrismaticBurst()
  if (reducedMotion) renderOnce()
}

/* Long enough to sit out a phone's address-bar slide, short enough to feel attached. */
const deferredRebuild = createTrailingCall(rebuildForViewport, 200)

function resize() {
  applyViewport()
  rebuildForViewport()
}

function invalidateFloorMetrics() {
  floorMetrics = null
}

function scheduleResize() {
  if (!resizeFrame) {
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0
      applyViewport()
    })
  }

  deferredRebuild.schedule()
}

function updateSceneFromScroll() {
  const viewportHeight = Math.max(1, window.innerHeight)
  const scrollTop = window.scrollY || document.documentElement.scrollTop || 0
  const floorElement = props.floorStage
  let floorReveal = 0

  if (floorElement) {
    /*
     * Measured against the document, not the viewport, so scrolling alone does
     * not need a fresh rect. The frame before this one wrote four custom
     * properties onto the stage, which makes any read here a forced layout, and
     * it was happening on every single frame.
     *
     * The box itself only moves when the page reflows — a resize, an image
     * decoding, a change of language — and the ResizeObserver on the document
     * element already reports every one of those.
     */
    if (!floorMetrics) {
      const rect = floorElement.getBoundingClientRect()
      floorMetrics = { documentTop: rect.top + scrollTop, height: rect.height }
    }

    const top = floorMetrics.documentTop - scrollTop
    const rawReveal = clamp01(
      (viewportHeight - top) / Math.max(viewportHeight, floorMetrics.height),
    )
    floorReveal = smoothstep(rawReveal)
  }

  const reachable = floorReveal >= recordSleeveRevealThreshold
  if (floorReachable.value !== reachable) floorReachable.value = reachable

  const worldPerViewport = isNarrowViewport() ? 5.15 : 5.8
  const ballTravel = (scrollTop / viewportHeight) * worldPerViewport
  const ballY = initialBallY + ballTravel
  reflectionAnchorY = initialBallY + Math.min(ballTravel, 1.28)
  const deviceLightStrength = isNarrowViewport() ? 0.72 : 1
  reflectionStrength =
    THREE.MathUtils.lerp(1, 0.68, clamp01(scrollTop / (viewportHeight * 2.6))) * deviceLightStrength

  if (ballGroup) ballGroup.position.y = ballY

  if (topLight && topLightTarget) {
    topLight.position.set(0, ballY + 3.1, 1.45)
    topLightTarget.position.set(0, ballY, 0)
  }

  if (reflectedLight) {
    reflectedLight.position.set(0, reflectionAnchorY - 0.12, 0.05)
    reflectedLight.intensity = 48 * reflectionStrength
  }

  if (camera) {
    camera.position.set(
      0,
      THREE.MathUtils.lerp(pageViewCamera.y, floorViewCamera.y, floorReveal),
      THREE.MathUtils.lerp(pageViewCamera.z, floorViewCamera.z, floorReveal),
    )
    camera.lookAt(
      0,
      THREE.MathUtils.lerp(pageViewTarget.y, floorViewTarget.y, floorReveal),
      THREE.MathUtils.lerp(pageViewTarget.z, floorViewTarget.z, floorReveal),
    )
  }

  stage.value?.style.setProperty('--ball-scroll-y', `${-scrollTop}px`)
  ballHitArea.value?.style.setProperty('--ball-scroll-y', `${-scrollTop}px`)
  stage.value?.style.setProperty('--floor-reveal', floorReveal.toFixed(3))
  stage.value?.style.setProperty('--floor-translate', `${((1 - floorReveal) * 36).toFixed(2)}%`)
}

function handleScroll() {
  updateSceneFromScroll()
}

function renderOnce() {
  if (!renderer || !scene || !camera) return
  renderer.render(scene, camera)
}

const ballScreenPoint = new THREE.Vector3()

function measureBallOnScreen(): BallScreenGeometry | null {
  if (!renderer || !camera || !ballGroup) return null

  // The canvas box, not the renderer size: the two differ by the scrollbar width.
  const view = canvasRect ?? renderer.domElement.getBoundingClientRect()
  ballScreenPoint.set(0, ballGroup.position.y, 0)

  return getBallScreenGeometry(
    camera,
    ballScreenPoint,
    ballRadius,
    view,
    activeQuality.silhouetteSamples,
  )
}

function advanceReflectionTravel(rotationDelta: number) {
  reflectionTravelTurns =
    (reflectionTravelTurns + (rotationDelta / (Math.PI * 2)) * reflectionTravelPerBallTurn) % 1
}

function rotateBallFromPointer(deltaX: number, eventTime: number) {
  if (!ballGroup) return

  const elapsed = Math.max(16, eventTime - lastPointerTime) / 1000
  const rotationDelta = deltaX * 0.007
  ballGroup.rotation.y += rotationDelta
  advanceReflectionTravel(rotationDelta)
  spinVelocity = THREE.MathUtils.clamp(rotationDelta / elapsed, -7, 7)
  lastPointerTime = eventTime
  updateReflectedSpots()
  updatePrismaticBurst()
  renderOnce()
}

function handlePointerDown(event: PointerEvent) {
  isDragging = true
  lastPointerX = event.clientX
  lastPointerTime = performance.now()
  spinVelocity = 0
  ;(event.currentTarget as HTMLElement).classList.add('disco-ball-hit-area--dragging')
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function handlePointerMove(event: PointerEvent) {
  if (!isDragging) return

  rotateBallFromPointer(event.clientX - lastPointerX, performance.now())
  lastPointerX = event.clientX
}

function handlePointerUp(event: PointerEvent) {
  if (!isDragging) return

  isDragging = false
  ;(event.currentTarget as HTMLElement).classList.remove('disco-ball-hit-area--dragging')
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
}

function frame(now: number) {
  animationFrame = 0
  const delta = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0
  lastFrame = now

  if (ballGroup) {
    const autoSpeed = reducedMotion ? ballReducedMotionSpinSpeed : ballAutoSpinSpeed
    const rotationDelta = (autoSpeed + spinVelocity) * delta
    ballGroup.rotation.y += rotationDelta
    advanceReflectionTravel(rotationDelta)
    ballGroup.rotation.x = reducedMotion ? 0 : Math.sin(now * 0.00018) * 0.035

    if (!isDragging && spinVelocity !== 0) {
      spinVelocity *= Math.exp(-delta * 1.65)
      if (Math.abs(spinVelocity) < 0.018) spinVelocity = 0
    }
  }

  if (!reducedMotion) burstTime += delta * burstTimeScale

  updateSceneFromScroll()
  updateReflectedSpots()
  updatePrismaticBurst()
  updateRecordSleeves(delta)
  updateFloorProps(delta, now)
  renderOnce()

  if (floorReachable.value) {
    updateSleeveHitAreas()
    updateDeckHitAreas()
  }

  // Asked again rather than assumed: `frame` clears the handle on the way in, so
  // a stop() raised while this frame was running would otherwise be undone here.
  if (shouldAnimateScene({ hidden: document.hidden, covered: props.covered ?? false })) {
    animationFrame = requestAnimationFrame(frame)
  }
}

function start() {
  if (animationFrame) return
  lastFrame = 0
  animationFrame = requestAnimationFrame(frame)
}

function stop() {
  if (!animationFrame) return
  cancelAnimationFrame(animationFrame)
  animationFrame = 0
}

function syncLoop() {
  if (shouldAnimateScene({ hidden: document.hidden, covered: props.covered ?? false })) start()
  else stop()
}

function handleMotionPreference() {
  reducedMotion = motionQuery?.matches ?? false
  if (reducedMotion && ballGroup) ballGroup.rotation.x = 0
  updateSceneFromScroll()
  renderOnce()
  syncLoop()
}

function handleVisibilityChange() {
  syncLoop()
}

watch(() => props.covered, syncLoop)

function disposeObject(object: THREE.Object3D) {
  if (
    object instanceof THREE.Mesh ||
    object instanceof THREE.InstancedMesh ||
    object instanceof THREE.Line
  ) {
    object.geometry.dispose()
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => material.dispose())
  }

  object.children.forEach(disposeObject)
}

onMounted(() => {
  const target = canvas.value
  if (!target) {
    emit('ready', null)
    return
  }

  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion = motionQuery.matches
  motionQuery.addEventListener('change', handleMotionPreference)
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', scheduleResize)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  /*
   * Before the renderer, not after: antialias is fixed at construction, and
   * every build step below reads the profile this picks.
   */
  qualityTier = getStaticQualityTier({
    width: window.innerWidth,
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    override: new URLSearchParams(window.location.search).get('quality'),
  })
  activeQuality = SCENE_QUALITY_PROFILES[qualityTier]

  try {
    renderer = new THREE.WebGLRenderer({
      canvas: target,
      alpha: true,
      // A context attribute: it cannot be changed later, so it is decided here
      // from the static reading alone and never by anything measured at runtime.
      antialias: activeQuality.antialias,
    })
  } catch {
    renderer = null
    resize()
    emit('ready', null)
    return
  }

  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
  camera.position.set(0, pageViewCamera.y, pageViewCamera.z)
  camera.lookAt(0, pageViewTarget.y, pageViewTarget.z)

  const envTexture = createEnvironmentTexture()
  const ballEnvTexture = createBallEnvironmentTexture()
  const pmrem = new THREE.PMREMGenerator(renderer)
  if (envTexture) {
    environmentMap = pmrem.fromEquirectangular(envTexture).texture
    scene.environment = environmentMap
    envTexture.dispose()
  }
  if (ballEnvTexture) {
    ballEnvironmentMap = pmrem.fromEquirectangular(ballEnvTexture).texture
    ballEnvTexture.dispose()
  }
  pmrem.dispose()
  emit('progress', 0.35)

  createRoom()
  createDiscoBall()
  rebuildReflectedSpotsForViewport(true)
  rebuildPrismaticBurstForViewport(true)
  createRoomLights()
  hasWebgl.value = true
  emit('progress', 0.7)

  /*
   * Measurement hook for scripts/measure-scene.ts, off unless `?perf` is in the
   * query. A query param rather than import.meta.env.DEV on purpose: the build
   * worth measuring is the one that ships.
   *
   * Each entry exists to bound one cost before any optimisation is written, so
   * we cut the thing that is actually expensive rather than the thing that looks
   * expensive. Disposing the burst is enough to switch it off for good —
   * updatePrismaticBurst() returns early once the mesh is gone.
   */
  if (new URLSearchParams(window.location.search).has('perf')) {
    ;(window as unknown as Record<string, unknown>).__discoPerf = {
      dropBurst: () => disposePrismaticBurst(),
      dropSpots: () => {
        if (reflectedSpots) reflectedSpots.visible = false
      },
      dropGrid: () => {
        if (roomGrid) roomGrid.visible = false
      },
      cheapWalls: () => {
        scene?.traverse((object) => {
          const mesh = object as THREE.Mesh
          const material = mesh.material as THREE.Material | undefined
          if (
            material instanceof THREE.MeshStandardMaterial &&
            material.color.getHex() === 0x0b0712
          )
            mesh.material = new THREE.MeshBasicMaterial({ color: 0x0b0712 })
        })
      },
      dropEnvironment: () => {
        if (scene) scene.environment = null
      },
      dropBall: () => {
        if (ballGroup) ballGroup.visible = false
      },
      setPixelRatio: (value: number) => renderer?.setPixelRatio(value),
      info: () => ({
        ...renderer?.info.render,
        tier: qualityTier,
        pixelRatio: renderer?.getPixelRatio(),
        spots: getReflectionDensityProfile().candidateCount,
        ballSegments: activeQuality.ballSegments,
        burstSteps: activeQuality.burstSteps,
      }),
    }
  }

  resize()
  renderOnce()
  emit('progress', 0.95)
  // Two frames, so shaders have compiled and the picture is on screen before the
  // loading screen starts its exit.
  requestAnimationFrame(() => requestAnimationFrame(() => emit('ready', measureBallOnScreen())))

  // Watches the content box, so it also catches the page growing under the room
  // — images decoding, a locale swap — which a window resize never reports.
  resizeObserver = new ResizeObserver(scheduleResize)
  resizeObserver.observe(document.documentElement)

  start()
})

onBeforeUnmount(() => {
  stop()
  deferredRebuild.cancel()
  if (resizeFrame) cancelAnimationFrame(resizeFrame)
  resizeFrame = 0
  resizeObserver?.disconnect()
  motionQuery?.removeEventListener('change', handleMotionPreference)
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', scheduleResize)
  document.removeEventListener('visibilitychange', handleVisibilityChange)

  disposeReflectedSpotResources()
  disposeRoomGrid()
  disposePrismaticBurst()
  disposeFloorProps()
  disposeRecordSleeves()
  sleeveTextures.forEach((texture) => texture.dispose())
  sleeveTextures.clear()
  vinylTexture?.dispose()
  vinylTexture = null
  labelTextures.forEach((texture) => texture.dispose())
  labelTextures.clear()
  contactShadowTexture?.dispose()
  contactShadowTexture = null
  if (scene) scene.children.forEach(disposeObject)
  environmentMap?.dispose()
  ballEnvironmentMap?.dispose()
  renderer?.dispose()

  hasWebgl.value = false
  renderer = null
  scene = null
  camera = null
  ballGroup = null
  environmentMap = null
  ballEnvironmentMap = null
  motionQuery = null
  topLight = null
  topLightTarget = null
  reflectedLight = null
  reflectedLightTarget = null
  roomGridCellSize = 0
  reflectionQualityTier = null
  reflectionLatitudeSegments = 0
  reflectionTravelTurns = 0
  reflectionSurfaces = []
  burstQualityTier = null
  burstTime = 0
  canvasRect = null
  recordSleeveSize = 0
  sleevePatchKey = ''
  floorReachable.value = false
})
</script>

<template>
  <div
    ref="stage"
    class="disco-room-stage"
    :class="{ 'disco-room-stage--webgl': hasWebgl }"
    aria-hidden="true"
  >
    <div class="disco-room-fallback">
      <div class="disco-room-fallback__wall disco-room-fallback__wall--left"></div>
      <div class="disco-room-fallback__wall disco-room-fallback__wall--right"></div>
      <div class="disco-room-fallback__floor"></div>
      <div class="disco-room-fallback__ball"></div>
    </div>
    <canvas ref="canvas" class="disco-room-layer"></canvas>
  </div>
  <div
    v-if="hasWebgl"
    ref="ballHitArea"
    class="disco-ball-hit-area"
    aria-hidden="true"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerUp"
  ></div>

  <div
    v-if="hasWebgl && floorReachable && sleeves && sleeves.length > 0"
    class="record-sleeve-picker"
    role="group"
    :aria-label="labels?.chooseTrack"
  >
    <button
      v-for="(track, index) in sleeves"
      :key="track.id"
      ref="sleeveHitAreas"
      type="button"
      class="record-sleeve-picker__target"
      :aria-label="`${track.artist} — ${track.title}`"
      :aria-pressed="track.id === activeSleeveId"
      @click="handleSleeveSelect(track.id)"
      @pointerenter="handleSleeveHover(index, true)"
      @pointerleave="handleSleeveHover(index, false)"
      @focus="handleSleeveHover(index, true)"
      @blur="handleSleeveHover(index, false)"
    ></button>
  </div>

  <div
    v-if="hasWebgl && floorReachable && deckReachable"
    class="deck-controls"
    role="group"
    :aria-label="labels?.turntable"
  >
    <button
      ref="deckPlayHitArea"
      type="button"
      class="deck-controls__target"
      :aria-label="playing ? labels?.pauseMusic : labels?.playMusic"
      :aria-pressed="playing ?? false"
      @pointerdown="pressDeckKey('play')"
      @pointerup="releaseDeckKey('play')"
      @pointercancel="releaseDeckKey('play')"
      @pointerleave="releaseDeckKey('play')"
      @blur="releaseDeckKey('play')"
      @click="handleDeckPlay"
    ></button>

    <button
      ref="deckRestartHitArea"
      type="button"
      class="deck-controls__target"
      :aria-label="labels?.restartTrack"
      @pointerdown="pressDeckKey('restart')"
      @pointerup="releaseDeckKey('restart')"
      @pointercancel="releaseDeckKey('restart')"
      @pointerleave="releaseDeckKey('restart')"
      @blur="releaseDeckKey('restart')"
      @click="handleDeckRestart"
    ></button>

    <div
      ref="deckVolumeHitArea"
      class="deck-controls__target deck-controls__wheel"
      role="slider"
      tabindex="0"
      aria-orientation="vertical"
      :aria-label="labels?.volume"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="volumePercent"
      :aria-valuetext="`${volumePercent}%`"
      @pointerdown="handleWheelGrab"
      @pointermove="handleWheelDrag"
      @pointerup="handleWheelRelease"
      @pointercancel="handleWheelRelease"
      @keydown="handleWheelKey"
    ></div>
  </div>
</template>

<style scoped>
.disco-room-stage {
  position: fixed;
  inset: 0;
  z-index: 0;
  height: 100vh;
  height: 100svh;
  overflow: hidden;
  background: #07050d;
  pointer-events: none;
}

.disco-room-layer,
.disco-room-fallback {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.disco-room-layer {
  z-index: 1;
  pointer-events: none;
}

.disco-room-fallback {
  z-index: 0;
  overflow: hidden;
  background: #07050d;
  opacity: 1;
  transition: opacity 180ms ease;
}

.disco-room-stage--webgl .disco-room-fallback {
  opacity: 0;
}

.disco-room-fallback__wall {
  position: absolute;
  inset: 0;
}

.disco-room-fallback__wall--left {
  clip-path: polygon(0 0, 50% 0, 50% 100%, 0 100%);
  background:
    radial-gradient(circle at 18% 32%, rgba(91, 199, 255, 0.16), transparent 44%),
    linear-gradient(100deg, #100a1a 0%, #09060f 78%, #06040a 100%);
}

.disco-room-fallback__wall--right {
  clip-path: polygon(50% 0, 100% 0, 100% 100%, 50% 100%);
  background:
    radial-gradient(circle at 82% 32%, rgba(143, 99, 255, 0.16), transparent 44%),
    linear-gradient(260deg, #100a1a 0%, #09060f 78%, #06040a 100%);
}

.disco-room-fallback__floor {
  position: absolute;
  inset: auto 0 0;
  height: 48%;
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  background:
    radial-gradient(ellipse at 50% 36%, rgba(79, 255, 225, 0.08), transparent 55%), #0b0712;
  opacity: var(--floor-reveal, 0);
  transform: translateY(var(--floor-translate, 36%));
}

.disco-room-fallback__ball {
  position: absolute;
  top: 34px;
  left: 50%;
  width: min(280px, 34vh);
  aspect-ratio: 1;
  transform: translate3d(-50%, var(--ball-scroll-y, 0px), 0);
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 28%, rgba(255, 255, 255, 0.92), transparent 22%),
    repeating-conic-gradient(
      from 0deg,
      rgba(225, 239, 247, 0.32) 0 5deg,
      rgba(16, 12, 25, 0.18) 5deg 7deg
    ),
    radial-gradient(circle, #9ec9d7, #24182f 78%);
  box-shadow: 0 0 64px rgba(91, 199, 255, 0.16);
}

.disco-ball-hit-area {
  position: fixed;
  top: 34px;
  left: 50%;
  z-index: 3;
  width: 280px;
  height: 280px;
  transform: translate3d(-50%, var(--ball-scroll-y, 0px), 0);
  border-radius: 50%;
  cursor: grab;
  pointer-events: auto;
  touch-action: none;
}

.disco-ball-hit-area--dragging {
  cursor: grabbing;
}

.record-sleeve-picker {
  position: fixed;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.record-sleeve-picker__target {
  position: absolute;
  top: 0;
  left: 0;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  pointer-events: auto;
  touch-action: manipulation;
  visibility: hidden;
}

.record-sleeve-picker__target:focus-visible {
  outline: 2px solid var(--accent, #7de3ff);
  outline-offset: 3px;
}

.deck-controls {
  position: fixed;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.deck-controls__target {
  position: absolute;
  top: 0;
  left: 0;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  pointer-events: auto;
  touch-action: none;
  visibility: hidden;
}

.deck-controls__target:focus-visible {
  outline: 2px solid var(--accent, #7de3ff);
  outline-offset: 3px;
}

.deck-controls__wheel {
  cursor: ns-resize;
}

@media (max-width: 720px) {
  .disco-room-fallback__ball {
    top: 42px;
    width: min(230px, 32vh);
  }

  .disco-ball-hit-area {
    top: 42px;
    width: 230px;
    height: 230px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .disco-room-fallback {
    transition: none;
  }
}
</style>
