<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { resolveShot } from '@/data/resumeAssets'
import type { UiLabels } from '@/types/resume'
import { useScreenshotViewer } from './resume/screenshotViewer'

const props = defineProps<{
  labels: UiLabels
}>()

const viewer = useScreenshotViewer()
const dialog = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLElement | null>(null)

const source = computed(() => (viewer.current.value ? resolveShot(viewer.current.value.file) : ''))
const many = computed(() => viewer.shots.value.length > 1)
const counter = computed(() => `${viewer.index.value + 1} / ${viewer.shots.value.length}`)

function handleKey(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    viewer.close()
    return
  }

  if (!many.value) return

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    viewer.step(1)
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    viewer.step(-1)
  }
}

function handleTab(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !dialog.value) return

  const focusable = [
    ...dialog.value.querySelectorAll<HTMLElement>('button:not([disabled])'),
  ].filter((element) => element.offsetParent !== null)
  if (focusable.length === 0) return

  const first = focusable[0]!
  const last = focusable[focusable.length - 1]!
  const active = document.activeElement

  if (event.shiftKey && active === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

function bind() {
  document.addEventListener('keydown', handleKey)
  document.addEventListener('keydown', handleTab)
  document.documentElement.style.overflow = 'hidden'
}

function unbind() {
  document.removeEventListener('keydown', handleKey)
  document.removeEventListener('keydown', handleTab)
  document.documentElement.style.overflow = ''
}

watch(
  () => viewer.isOpen.value,
  async (open) => {
    if (!open) {
      unbind()
      return
    }

    bind()
    await nextTick()
    closeButton.value?.focus()
  },
)

onBeforeUnmount(unbind)
</script>

<template>
  <Transition name="screenshot-viewer">
    <div
      v-if="viewer.isOpen.value"
      class="screenshot-viewer"
      @click.self="viewer.close()"
      @pointerdown.self.prevent
    >
      <div
        ref="dialog"
        class="screenshot-viewer__dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="viewer.title.value"
      >
        <div class="screenshot-viewer__bar">
          <p class="screenshot-viewer__title">
            {{ viewer.title.value }}
            <span v-if="many" class="screenshot-viewer__count">{{ counter }}</span>
          </p>

          <button
            ref="closeButton"
            type="button"
            class="screenshot-viewer__key"
            :aria-label="props.labels.closeScreenshot"
            :title="props.labels.closeScreenshot"
            @click="viewer.close()"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                fill="none"
              />
            </svg>
          </button>
        </div>

        <figure class="screenshot-viewer__figure">
          <img :src="source" :alt="viewer.current.value?.alt ?? ''" />
          <figcaption>{{ viewer.current.value?.alt }}</figcaption>
        </figure>

        <div v-if="many" class="screenshot-viewer__arrows">
          <button
            type="button"
            class="screenshot-viewer__key"
            :aria-label="props.labels.previousScreenshot"
            :title="props.labels.previousScreenshot"
            @click="viewer.step(-1)"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path
                d="M10 3L5 8l5 5"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
              />
            </svg>
          </button>

          <button
            type="button"
            class="screenshot-viewer__key"
            :aria-label="props.labels.nextScreenshot"
            :title="props.labels.nextScreenshot"
            @click="viewer.step(1)"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path
                d="M6 3l5 5-5 5"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
