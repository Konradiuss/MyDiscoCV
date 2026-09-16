<script setup lang="ts">
import { useMusicPlayer } from '@/audio/musicPlayer'
import type { UiLabels } from '@/types/resume'

defineProps<{
  labels: UiLabels
}>()

// Destructured on purpose: nested refs are not unwrapped in templates.
const { isPlaying, toggle } = useMusicPlayer()
</script>

<template>
  <button
    type="button"
    class="music-button"
    :class="{ 'music-toggle--playing': isPlaying }"
    :aria-label="isPlaying ? labels.pauseMusic : labels.playMusic"
    :title="isPlaying ? labels.pauseMusic : labels.playMusic"
    :aria-pressed="isPlaying"
    @click="toggle()"
  >
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <g v-if="isPlaying" fill="currentColor">
        <rect x="4" y="3" width="3" height="10" rx="1.5" />
        <rect x="9" y="3" width="3" height="10" rx="1.5" />
      </g>
      <path
        v-else
        fill="currentColor"
        d="M5 3.2v9.6a.6.6 0 0 0 .92.5l7.3-4.8a.6.6 0 0 0 0-1L5.92 2.7A.6.6 0 0 0 5 3.2Z"
      />
    </svg>
  </button>
</template>
