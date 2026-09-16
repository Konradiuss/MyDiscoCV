import { computed, readonly, ref, type Ref } from 'vue'
import type { ProjectShot } from '@/types/resume'

export interface OpenViewer {
  readonly title: string
  readonly shots: readonly ProjectShot[]
  readonly index: number
}

const shots = ref<readonly ProjectShot[]>([])
const title = ref('')
const index = ref(0)

let opener: HTMLElement | null = null

const isOpen = computed(() => shots.value.length > 0)
const current = computed<ProjectShot | null>(() => shots.value[index.value] ?? null)

function open(next: readonly ProjectShot[], shotTitle: string, at = 0, from?: HTMLElement | null) {
  if (next.length === 0) return

  shots.value = next
  title.value = shotTitle
  index.value = Math.min(Math.max(0, at), next.length - 1)
  opener = from ?? null
}

function close() {
  shots.value = []
  title.value = ''
  index.value = 0

  const target = opener
  opener = null
  target?.focus?.()
}

function step(by: number) {
  const count = shots.value.length
  if (count === 0) return

  index.value = (index.value + (by % count) + count) % count
}

export interface ScreenshotViewer {
  readonly shots: Readonly<Ref<readonly ProjectShot[]>>
  readonly title: Readonly<Ref<string>>
  readonly index: Readonly<Ref<number>>
  readonly isOpen: Readonly<Ref<boolean>>
  readonly current: Readonly<Ref<ProjectShot | null>>
  open: typeof open
  close: typeof close
  step: typeof step
}

export function useScreenshotViewer(): ScreenshotViewer {
  return {
    shots: readonly(shots) as Readonly<Ref<readonly ProjectShot[]>>,
    title: readonly(title),
    index: readonly(index),
    isOpen,
    current,
    open,
    close,
    step,
  }
}
