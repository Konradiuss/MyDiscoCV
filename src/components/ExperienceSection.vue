<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ExperienceItem, Locale, UiLabels } from '@/types/resume'
import ExperienceCard from './ExperienceCard.vue'
import { getTimeline } from './resume/timeline'

const props = defineProps<{
  items: ExperienceItem[]
  locale: Locale
  labels: UiLabels
}>()

const rows = computed(() => {
  const stops = getTimeline(props.items, new Date())
  const span = Math.max(1, props.items.length - 1)

  return props.items.map((item, index) => {
    const stop = stops.find((entry) => entry.id === item.id)

    return {
      item,
      year: stop?.year ?? Number(item.start.slice(0, 4)),
      current: stop?.current ?? item.end === null,
      gapBefore: stop?.gapBefore ?? false,
      at: (index / span).toFixed(4),
    }
  })
})

/* Measured, not computed: the last card's height depends on width, language and fonts. */
const timeline = ref<HTMLElement | null>(null)
const head = ref<number | null>(null)
const tail = ref<number | null>(null)
const over = ref<number | null>(null)
const phases = ref<number[]>([])

function measure() {
  const list = timeline.value
  if (!list) return

  const beads = [...list.querySelectorAll('.experience-timeline__bead')]
  const first = beads[0]?.getBoundingClientRect()
  const last = beads[beads.length - 1]?.getBoundingClientRect()
  if (!first || !last) return

  const box = list.getBoundingClientRect()
  const top = first.top + first.height / 2 - box.top
  const bottom = box.bottom - (last.top + last.height / 2)
  head.value = top
  tail.value = bottom

  const styles = getComputedStyle(list)
  const line = bottom === null ? 0 : box.height - top - bottom
  const band = parseFloat(styles.getPropertyValue('--rail-band')) || 0
  const turn = parseFloat(styles.getPropertyValue('--rail-cycle')) || 0
  const rest = parseFloat(styles.getPropertyValue('--rail-rest')) || 0

  const moving = turn - rest
  over.value = moving <= 0 ? 0 : rest * ((line + band) / moving)

  const sweep = line + band + over.value

  phases.value = beads.map((bead) => {
    const rect = bead.getBoundingClientRect()
    const down = rect.top + rect.height / 2 - box.top - top
    return sweep === 0 ? 0 : (down + band / 2) / sweep
  })
}

let watcher: ResizeObserver | null = null

onMounted(() => {
  measure()

  if (typeof ResizeObserver === 'undefined' || !timeline.value) return
  watcher = new ResizeObserver(measure)
  watcher.observe(timeline.value)
  watcher.observe(document.documentElement)
})

onBeforeUnmount(() => watcher?.disconnect())

watch(() => [props.locale, props.items], measure, { flush: 'post' })

const ends = computed(() => ({
  '--rail-head': head.value === null ? undefined : `${head.value.toFixed(2)}px`,
  '--rail-tail': tail.value === null ? undefined : `${tail.value.toFixed(2)}px`,
  '--rail-over': over.value === null ? undefined : `${over.value.toFixed(2)}px`,
}))
</script>

<template>
  <ol ref="timeline" class="experience-timeline" :style="ends">
    <li
      v-for="(row, index) in rows"
      :key="row.item.id"
      class="experience-timeline__row"
      :class="{ 'experience-timeline__row--gap': row.gapBefore }"
      :style="{ '--at': row.at, '--phase': phases[index]?.toFixed(4) }"
    >
      <div class="experience-timeline__rail" aria-hidden="true">
        <span class="experience-timeline__year">{{ row.year }}</span>
        <span
          class="experience-timeline__bead"
          :class="{ 'experience-timeline__bead--current': row.current }"
        ></span>
      </div>

      <ExperienceCard :item="row.item" :locale="locale" :labels="labels" />
    </li>
  </ol>
</template>
