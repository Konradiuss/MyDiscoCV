<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch, watchEffect } from 'vue'
import { resolveShot } from '@/data/resumeAssets'
import type { UiLabels } from '@/types/resume'
import ContactMark from './ContactMark.vue'
import { useScreenshotViewer } from './resume/screenshotViewer'
import { createShotLoader } from './resume/shotLoader'

const props = defineProps<{
  labels: UiLabels
}>()

const viewer = useScreenshotViewer()
const dialog = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLElement | null>(null)

const loader = createShotLoader({
  createImage: () => (typeof Image === 'undefined' ? null : new Image()),
})

const source = computed(() => (viewer.current.value ? resolveShot(viewer.current.value.file) : ''))
const many = computed(() => viewer.shots.value.length > 1)
const counter = computed(() => `${viewer.index.value + 1} / ${viewer.shots.value.length}`)

/** The picture on screen lags the counter by however long the next one takes. */
const shownAlt = ref('')

watchEffect(() => {
  if (source.value === '') return

  loader.show(source.value)
  // Both neighbours, because the arrows go both ways and the gallery wraps.
  const shots = viewer.shots.value
  if (shots.length > 1) {
    const at = viewer.index.value
    const count = shots.length
    loader.prefetch(resolveShot(shots[(at + 1) % count]!.file))
    loader.prefetch(resolveShot(shots[(at - 1 + count) % count]!.file))
  }
})

watch(loader.shown, (ready) => {
  const match = viewer.shots.value.find((shot) => resolveShot(shot.file) === ready)
  if (match) shownAlt.value = match.alt
})

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
      loader.reset()
      shownAlt.value = ''
      return
    }

    bind()
    await nextTick()
    closeButton.value?.focus()
  },
)

onBeforeUnmount(() => {
  unbind()
  loader.destroy()
})
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
          <div
            class="screenshot-viewer__frame"
            :class="{ 'screenshot-viewer__frame--waiting': loader.pending.value }"
          >
            <img
              v-if="loader.shown.value"
              :src="loader.shown.value"
              :alt="shownAlt"
              decoding="async"
              fetchpriority="high"
            />

            <p v-else-if="loader.failed.value" class="screenshot-viewer__missing">
              {{ props.labels.screenshotFailed }}
            </p>

            <span
              v-if="loader.pending.value"
              class="screenshot-viewer__loading"
              role="status"
              :aria-label="props.labels.loadingScreenshot"
            >
              <ContactMark name="compact-disc" class="screenshot-viewer__spin" />
            </span>
          </div>

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
