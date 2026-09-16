<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import SegmentReadout from './SegmentReadout.vue'
import { getClockCells, getMillisecondsToNextMinute } from './controls/clock'

defineProps<{
  label: string
}>()

const now = ref(new Date())
const cells = computed(() => getClockCells(now.value))
const spoken = computed(() =>
  cells.value.map((cell) => (cell === ':' ? ':' : String(cell ?? ''))).join(''),
)
let timer: ReturnType<typeof setTimeout> | null = null

function tick() {
  now.value = new Date()
  if (timer !== null) clearTimeout(timer)
  timer = setTimeout(tick, getMillisecondsToNextMinute(now.value))
}

function resync() {
  if (document.visibilityState === 'visible') tick()
}

onMounted(() => {
  tick()
  document.addEventListener('visibilitychange', resync)
})

onBeforeUnmount(() => {
  if (timer !== null) clearTimeout(timer)
  document.removeEventListener('visibilitychange', resync)
})
</script>

<template>
  <p class="wall-clock" :aria-label="`${label} ${spoken}`">
    <SegmentReadout :cells="cells" />
  </p>
</template>
