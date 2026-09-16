<script setup lang="ts">
import { computed } from 'vue'
import SegmentReadout from './SegmentReadout.vue'
import { getVolumeDigits, type ReadoutCell } from './controls/sevenSegment'

const props = defineProps<{
  percent: number
  label: string
}>()

const cells = computed<ReadoutCell[]>(() => [...getVolumeDigits(props.percent), '%'])
</script>

<template>
  <p class="volume-display" role="status" :aria-label="`${props.label} ${props.percent}%`">
    <SegmentReadout :cells="cells" />
  </p>
</template>
