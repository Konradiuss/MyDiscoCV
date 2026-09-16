<script setup lang="ts">
import { computed } from 'vue'
import SegmentReadout from './SegmentReadout.vue'
import { useMusicPlayer } from '@/audio/musicPlayer'
import { getElapsedCells } from './controls/clock'

defineProps<{
  label: string
}>()

// Destructured on purpose: nested refs are not unwrapped in templates.
const { elapsed } = useMusicPlayer()

const cells = computed(() => getElapsedCells(elapsed.value))
const spoken = computed(() =>
  cells.value.map((cell) => (cell === ':' ? ':' : String(cell ?? ''))).join(''),
)
</script>

<template>
  <p class="track-time" role="timer" :aria-label="`${label} ${spoken}`">
    <SegmentReadout :cells="cells" />
  </p>
</template>
