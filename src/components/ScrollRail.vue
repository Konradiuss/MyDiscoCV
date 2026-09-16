<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { isScrollLocked, measurePage, type ScrollMetrics } from './controls/pageScroll'
import {
  SCROLL_RAIL_IDLE,
  getRailThumb,
  getScrollFromThumb,
  isNearRightEdge,
} from './controls/scrollRail'

const rail = ref<HTMLElement | null>(null)

const metrics = shallowRef<ScrollMetrics>({
  scrollTop: 0,
  viewportHeight: 0,
  documentHeight: 0,
})

const trackHeight = ref(0)

const nearEdge = ref(false)
const scrolling = ref(false)
const dragging = ref(false)

const thumb = computed(() => getRailThumb(metrics.value, trackHeight.value))

const visible = computed(
  () => thumb.value !== null && (nearEdge.value || scrolling.value || dragging.value),
)

let frame = 0
let idleTimer = 0
let observer: ResizeObserver | null = null
let lockWatch: MutationObserver | null = null

function schedule() {
  if (frame) return

  frame = requestAnimationFrame(() => {
    frame = 0

    const page = measurePage()

    metrics.value = isScrollLocked() ? { ...page, documentHeight: page.viewportHeight } : page
    trackHeight.value = rail.value?.clientHeight ?? 0
  })
}

function wake() {
  scrolling.value = true
  window.clearTimeout(idleTimer)
  idleTimer = window.setTimeout(() => {
    scrolling.value = false
  }, SCROLL_RAIL_IDLE)
}

function handleScroll() {
  wake()
  schedule()
}

function handleResize() {
  schedule()
}

function handlePointerMove(event: PointerEvent) {
  nearEdge.value = isNearRightEdge(event.clientX, window.innerWidth)
}

function handlePointerOut(event: PointerEvent) {
  if (event.relatedTarget === null) nearEdge.value = false
}

function trackTop() {
  return rail.value?.getBoundingClientRect().top ?? 0
}

function scrollTo(top: number, smooth: boolean) {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  window.scrollTo({ top, behavior: smooth && !still ? 'smooth' : 'auto' })
}

let grabOffset = 0

function startDrag(event: PointerEvent) {
  const current = thumb.value
  if (!current || event.button !== 0) return

  event.preventDefault()

  dragging.value = true
  grabOffset = event.clientY - trackTop() - current.offset
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function moveDrag(event: PointerEvent) {
  if (!dragging.value) return

  const offset = event.clientY - trackTop() - grabOffset

  scrollTo(getScrollFromThumb(offset, metrics.value, trackHeight.value), false)
}

function endDrag(event: PointerEvent) {
  if (!dragging.value) return

  dragging.value = false
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
  nearEdge.value = isNearRightEdge(event.clientX, window.innerWidth)
  wake()
}

function jump(event: PointerEvent) {
  const current = thumb.value
  if (!current) return

  const offset = event.clientY - trackTop() - current.height / 2

  scrollTo(getScrollFromThumb(offset, metrics.value, trackHeight.value), true)
}

onMounted(() => {
  schedule()
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', handleResize, { passive: true })
  window.addEventListener('pointermove', handlePointerMove, { passive: true })
  window.addEventListener('pointerout', handlePointerOut, { passive: true })

  // jsdom has no ResizeObserver.
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(schedule)
    observer.observe(document.documentElement)
  }

  lockWatch = new MutationObserver(schedule)
  lockWatch.observe(document.documentElement, { attributeFilter: ['style'] })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerout', handlePointerOut)
  observer?.disconnect()
  observer = null
  lockWatch?.disconnect()
  lockWatch = null
  if (frame) cancelAnimationFrame(frame)
  window.clearTimeout(idleTimer)
})
</script>

<template>
  <div
    ref="rail"
    class="scroll-rail"
    :class="{ 'scroll-rail--visible': visible, 'scroll-rail--held': dragging }"
    aria-hidden="true"
    @pointerdown="jump"
  >
    <div class="scroll-rail__track"></div>
    <div
      v-if="thumb"
      class="scroll-rail__thumb"
      :style="{ '--thumb-height': `${thumb.height}px`, '--thumb-offset': `${thumb.offset}px` }"
      @pointerdown.stop="startDrag"
      @pointermove="moveDrag"
      @pointerup="endDrag"
      @pointercancel="endDrag"
    ></div>
  </div>
</template>
