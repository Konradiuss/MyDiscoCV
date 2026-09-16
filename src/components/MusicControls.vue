<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { useMusicPlayer } from '@/audio/musicPlayer'
import type { UiLabels } from '@/types/resume'
import MusicToggle from './MusicToggle.vue'
import TrackTime from './TrackTime.vue'
import VolumeDisplay from './VolumeDisplay.vue'
import WallClock from './WallClock.vue'
import { createHoldRepeat } from './controls/holdRepeat'
import { clampVolumePercent } from './controls/volumeControl'

defineProps<{
  labels: UiLabels
}>()

// Destructured on purpose: nested refs are not unwrapped in templates.
const { volume, restart, setVolume } = useMusicPlayer()

const percent = computed(() => Math.round(volume.value * 100))

const holdDelay = 420
const holdInterval = 70

function step(by: number) {
  setVolume(clampVolumePercent(percent.value + by) / 100)
}

const louder = createHoldRepeat({ delay: holdDelay, interval: holdInterval, onStep: () => step(1) })
const quieter = createHoldRepeat({
  delay: holdDelay,
  interval: holdInterval,
  onStep: () => step(-1),
})

function hold(event: PointerEvent, control: { press(): void }) {
  const target = event.currentTarget
  if (target instanceof Element && target.hasPointerCapture?.(event.pointerId) === false) {
    target.setPointerCapture(event.pointerId)
  }

  control.press()
}

/* `detail === 0` means keyboard activation; pointer presses are handled on pointerdown. */
function keyStep(event: MouseEvent, by: number) {
  if (event.detail === 0) step(by)
}

onBeforeUnmount(() => {
  louder.release()
  quieter.release()
})
</script>

<template>
  <div class="music-controls">
    <div class="music-controls__keys">
      <MusicToggle :labels="labels" />

      <button
        type="button"
        class="music-button"
        :aria-label="labels.restartTrack"
        :title="labels.restartTrack"
        @click="restart()"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <g fill="currentColor">
            <rect x="3" y="3.4" width="2.2" height="9.2" rx="1" />
            <path
              d="M13 3.9v8.2a.6.6 0 0 1-.92.5L6.2 8.5a.6.6 0 0 1 0-1l5.88-4.1a.6.6 0 0 1 .92.5Z"
            />
          </g>
        </svg>
      </button>

      <button
        type="button"
        class="music-button"
        :aria-label="labels.volumeDown"
        :title="labels.volumeDown"
        @pointerdown="hold($event, quieter)"
        @pointerup="quieter.release()"
        @pointercancel="quieter.release()"
        @click="keyStep($event, -1)"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <rect x="3" y="7" width="10" height="2" rx="1" fill="currentColor" />
        </svg>
      </button>

      <button
        type="button"
        class="music-button"
        :aria-label="labels.volumeUp"
        :title="labels.volumeUp"
        @pointerdown="hold($event, louder)"
        @pointerup="louder.release()"
        @pointercancel="louder.release()"
        @click="keyStep($event, 1)"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <g fill="currentColor">
            <rect x="3" y="7" width="10" height="2" rx="1" />
            <rect x="7" y="3" width="2" height="10" rx="1" />
          </g>
        </svg>
      </button>
    </div>

    <div class="status-panel">
      <WallClock class="status-panel__aside" :label="labels.localTime" />
      <VolumeDisplay :percent="percent" :label="labels.volume" />
      <TrackTime class="status-panel__aside" :label="labels.trackTime" />
    </div>
  </div>
</template>
