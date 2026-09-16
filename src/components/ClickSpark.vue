<template>
  <canvas ref="canvas" class="click-spark" aria-hidden="true"></canvas>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import {
  createClickSparkBurst,
  getClickSparkLine,
  isClickSparkDrag,
  type ClickSpark,
  type ClickSparkEasing,
} from './effects/clickSpark'

interface PointerDragState {
  readonly startX: number
  readonly startY: number
  dragged: boolean
}

interface Props {
  sparkColor?: string
  sparkSize?: number
  sparkRadius?: number
  sparkCount?: number
  duration?: number
  easing?: ClickSparkEasing
  extraScale?: number
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  sparkColor: '#7de3ff',
  sparkSize: 13,
  sparkRadius: 26,
  sparkCount: 10,
  duration: 420,
  easing: 'ease-out',
  extraScale: 1,
  disabled: false,
})

const MAX_BURSTS = 10
const MAX_DPR = 2
const SUPPRESS_CLICK_AFTER_DRAG_MS = 80

const canvas = ref<HTMLCanvasElement | null>(null)
const sparks: ClickSpark[] = []
const pointerDrags = new Map<number, PointerDragState>()

let context: CanvasRenderingContext2D | null = null
let animationFrame = 0
let resizeFrame = 0
let width = 0
let height = 0
let dpr = 1
let motionQuery: MediaQueryList | null = null
let suppressClickAfterDrag = false
let suppressClickTimer: number | null = null

function prefersReducedMotion() {
  return motionQuery?.matches ?? false
}

function getContext(target: HTMLCanvasElement) {
  try {
    return target.getContext('2d')
  } catch {
    return null
  }
}

function resizeCanvas() {
  resizeFrame = 0
  const target = canvas.value
  if (!target || typeof window === 'undefined') return

  const nextWidth = window.innerWidth
  const nextHeight = window.innerHeight
  const nextDpr = Math.min(MAX_DPR, Math.max(1, window.devicePixelRatio || 1))

  if (nextWidth === width && nextHeight === height && nextDpr === dpr) return

  width = nextWidth
  height = nextHeight
  dpr = nextDpr
  target.width = Math.max(1, Math.round(width * dpr))
  target.height = Math.max(1, Math.round(height * dpr))
  context = null
}

function getDrawingContext() {
  const target = canvas.value
  if (!target) return null

  context = context ?? getContext(target)
  context?.setTransform(dpr, 0, 0, dpr, 0, 0)
  return context
}
function scheduleResize() {
  if (resizeFrame || typeof requestAnimationFrame === 'undefined') return
  resizeFrame = requestAnimationFrame(resizeCanvas)
}

function draw(now: number) {
  animationFrame = 0
  resizeCanvas()

  const drawingContext = getDrawingContext()

  if (!drawingContext || props.disabled || prefersReducedMotion()) {
    sparks.length = 0
    return
  }

  drawingContext.clearRect(0, 0, width, height)
  drawingContext.lineCap = 'round'
  drawingContext.strokeStyle = props.sparkColor
  drawingContext.lineWidth = 2

  let kept = 0
  for (const spark of sparks) {
    const line = getClickSparkLine(spark, now, props)
    if (!line) continue

    drawingContext.globalAlpha = line.alpha
    drawingContext.beginPath()
    drawingContext.moveTo(line.x1, line.y1)
    drawingContext.lineTo(line.x2, line.y2)
    drawingContext.stroke()
    sparks[kept] = spark
    kept += 1
  }

  sparks.length = kept
  drawingContext.globalAlpha = 1

  if (sparks.length > 0) {
    animationFrame = requestAnimationFrame(draw)
  }
}

function startDrawing() {
  if (animationFrame || typeof requestAnimationFrame === 'undefined') return
  animationFrame = requestAnimationFrame(draw)
}

function suppressNextClick() {
  suppressClickAfterDrag = true

  if (suppressClickTimer !== null) {
    window.clearTimeout(suppressClickTimer)
  }

  suppressClickTimer = window.setTimeout(() => {
    suppressClickAfterDrag = false
    suppressClickTimer = null
  }, SUPPRESS_CLICK_AFTER_DRAG_MS)
}

function handlePointerDown(event: PointerEvent) {
  pointerDrags.set(event.pointerId, {
    startX: event.clientX,
    startY: event.clientY,
    dragged: false,
  })
}

function handlePointerMove(event: PointerEvent) {
  const drag = pointerDrags.get(event.pointerId)
  if (!drag || drag.dragged) return

  drag.dragged = isClickSparkDrag(drag.startX, drag.startY, event.clientX, event.clientY)
}

function handlePointerUp(event: PointerEvent) {
  const drag = pointerDrags.get(event.pointerId)
  pointerDrags.delete(event.pointerId)

  if (drag?.dragged) {
    suppressNextClick()
  }
}

function handlePointerCancel(event: PointerEvent) {
  pointerDrags.delete(event.pointerId)
  suppressNextClick()
}
function handleClick(event: MouseEvent) {
  if (props.disabled || prefersReducedMotion() || event.detail === 0 || suppressClickAfterDrag)
    return
  if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return

  const target = event.target instanceof Element ? event.target : null
  if (target?.closest('#loading-screen')) return

  const burst = createClickSparkBurst(
    event.clientX,
    event.clientY,
    performance.now(),
    props.sparkCount,
  )
  sparks.push(...burst)

  const maxSparks = Math.max(props.sparkCount, props.sparkCount * MAX_BURSTS)
  if (sparks.length > maxSparks) {
    sparks.splice(0, sparks.length - maxSparks)
  }

  startDrawing()
}

onMounted(() => {
  if (typeof window === 'undefined') return

  motionQuery =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null
  resizeCanvas()
  window.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: true })
  window.addEventListener('pointermove', handlePointerMove, { capture: true, passive: true })
  window.addEventListener('pointerup', handlePointerUp, { capture: true, passive: true })
  window.addEventListener('pointercancel', handlePointerCancel, { capture: true, passive: true })
  window.addEventListener('click', handleClick)
  window.addEventListener('resize', scheduleResize, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', handlePointerDown, { capture: true })
  window.removeEventListener('pointermove', handlePointerMove, { capture: true })
  window.removeEventListener('pointerup', handlePointerUp, { capture: true })
  window.removeEventListener('pointercancel', handlePointerCancel, { capture: true })
  window.removeEventListener('click', handleClick)
  window.removeEventListener('resize', scheduleResize)

  pointerDrags.clear()
  if (suppressClickTimer !== null) window.clearTimeout(suppressClickTimer)

  if (animationFrame) cancelAnimationFrame(animationFrame)
  if (resizeFrame) cancelAnimationFrame(resizeFrame)
})
</script>

<style scoped>
.click-spark {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: block;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
}

@media print {
  .click-spark {
    display: none;
  }
}
</style>
