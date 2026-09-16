<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { UiLabels } from '@/types/resume'
import { measurePage } from './controls/pageScroll'
import { getScrollEnd, getScrollTarget, type ScrollEnd } from './controls/scrollEnds'

const props = defineProps<{
  labels: UiLabels
}>()

const end = ref<ScrollEnd>(null)

function update() {
  const next = getScrollEnd(measurePage(), end.value)
  if (next !== end.value) end.value = next
}

const label = computed(() =>
  end.value === 'top' ? props.labels.scrollToBottom : props.labels.scrollToTop,
)

function travel() {
  const destination = getScrollTarget(end.value, measurePage().documentHeight)
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  window.scrollTo({ top: destination, behavior: still ? 'auto' : 'smooth' })
}

onMounted(() => {
  update()
  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', update)
  window.removeEventListener('resize', update)
})
</script>

<template>
  <div class="scroll-orb-slot">
    <Transition name="scroll-orb">
      <button
        v-if="end"
        type="button"
        class="scroll-orb"
        :aria-label="label"
        :title="label"
        @click="travel"
      >
        <span
          class="scroll-orb__glyph"
          :class="{ 'scroll-orb__glyph--down': end === 'top' }"
          aria-hidden="true"
        ></span>
      </button>
    </Transition>
  </div>
</template>
