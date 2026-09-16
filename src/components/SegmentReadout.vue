<script setup lang="ts">
import { computed } from 'vue'
import {
  SEVEN_SEGMENT_COLON,
  SEVEN_SEGMENT_SHAPES,
  getDigitSegments,
  getReadoutLayout,
  toSvgPoints,
  type ReadoutCell,
  type Segment,
} from './controls/sevenSegment'

const props = defineProps<{
  cells: readonly ReadoutCell[]
}>()

const layout = computed(() => getReadoutLayout(props.cells))

function isLit(cell: ReadoutCell, segment: Segment) {
  return typeof cell === 'number' && getDigitSegments(cell).includes(segment)
}
</script>

<template>
  <svg
    class="segment-readout"
    :viewBox="`0 0 ${layout.width} ${layout.height}`"
    :style="{ aspectRatio: `${layout.width} / ${layout.height}` }"
    aria-hidden="true"
    focusable="false"
  >
    <g
      v-for="(placed, index) in layout.cells"
      :key="index"
      :transform="`translate(${placed.offset} 0)`"
    >
      <template v-if="placed.cell !== ':' && placed.cell !== '%'">
        <polygon
          v-for="shape in SEVEN_SEGMENT_SHAPES"
          :key="shape.id"
          class="segment-readout__segment"
          :class="{ 'segment-readout__segment--lit': isLit(placed.cell, shape.id) }"
          :points="toSvgPoints(shape.points)"
        />
      </template>

      <template v-else-if="placed.cell === ':'">
        <polygon
          v-for="(dot, dotIndex) in SEVEN_SEGMENT_COLON"
          :key="dotIndex"
          class="segment-readout__segment segment-readout__segment--lit"
          :points="toSvgPoints(dot)"
        />
      </template>

      <g v-else class="segment-readout__unit">
        <polygon points="1.5,16.5 3.5,17.5 10.5,3.5 8.5,2.5" />
        <rect x="0.6" y="1.8" width="4.2" height="4.2" rx="0.7" />
        <rect x="7.2" y="14" width="4.2" height="4.2" rx="0.7" />
      </g>
    </g>
  </svg>
</template>
