<script setup lang="ts">
import { computed } from 'vue'
import { resolveShot } from '@/data/resumeAssets'
import type { ProjectShot, UiLabels } from '@/types/resume'
import ContactMark from './ContactMark.vue'
import { useScreenshotViewer } from './resume/screenshotViewer'

const props = defineProps<{
  shots: readonly ProjectShot[]
  title: string
  labels: UiLabels
}>()

const viewer = useScreenshotViewer()

const lead = computed(() => props.shots[0] ?? null)

const count = computed(() => props.shots.length)

const label = computed(() => {
  const named = `${props.labels.openScreenshot}: ${lead.value?.alt ?? ''}`
  return count.value > 1 ? `${named} — ${props.labels.screenshots}: ${count.value}` : named
})

function open(event: MouseEvent) {
  const from = event.currentTarget

  viewer.open(props.shots, props.title, 0, from instanceof HTMLElement ? from : null)
}
</script>

<template>
  <div v-if="lead" class="project-shots">
    <button
      type="button"
      class="project-shots__thumb"
      :aria-label="label"
      :title="lead.alt"
      @click="open"
    >
      <img :src="resolveShot(lead.file)" alt="" loading="lazy" decoding="async" />

      <span class="project-shots__bar" aria-hidden="true">
        <span v-if="count > 1" class="project-shots__count">
          <ContactMark name="stack" class="project-shots__mark" />
          {{ count }}
        </span>

        <span class="project-shots__open">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M9.6 1.8h4.6v4.6" />
            <path d="M6.4 14.2H1.8V9.6" />
            <path d="M14.2 1.8 9.4 6.6" />
            <path d="M1.8 14.2 6.6 9.4" />
          </svg>
          {{ labels.openScreenshot }}
        </span>
      </span>
    </button>
  </div>
</template>
