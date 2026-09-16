<script setup lang="ts">
import discIcon from '@/assets/icons/compact-disc.svg'
import { useMusicPlayer } from '@/audio/musicPlayer'
import type { UiLabels } from '@/types/resume'

defineProps<{
  labels: UiLabels
}>()

// Destructured on purpose: nested refs are not unwrapped in templates.
const { currentTrack, isPlaying } = useMusicPlayer()
</script>

<template>
  <div
    v-if="currentTrack"
    class="now-playing"
    :class="{ 'now-playing--playing': isPlaying }"
    :title="labels.nowPlaying"
  >
    <img class="now-playing__disc" :src="discIcon" alt="" width="24" height="24" />

    <div class="now-playing__text" role="status" aria-live="polite" :aria-label="labels.nowPlaying">
      <p class="now-playing__title">{{ currentTrack.title }}</p>
      <p class="now-playing__artist">{{ currentTrack.artist }}</p>
    </div>
  </div>
</template>
