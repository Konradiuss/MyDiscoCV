import { readonly, ref, type Ref } from 'vue'

/**
 * Holding the picture back until it can actually be shown.
 *
 * An <img> keeps painting the picture it already has until the next one has
 * arrived, so swapping `src` on a slow line leaves the old screenshot under a
 * counter that has already moved on. The loader fetches out of the document,
 * hands the viewer a source only once it is ready to paint, and says meanwhile
 * that it is working — but not straight away, or a cached picture would flash a
 * spinner on its way past.
 */

export interface ImageLike {
  src: string
  decoding: string
  addEventListener(type: string, listener: () => void, options?: AddEventListenerOptions): void
  decode?: () => Promise<void>
}

export interface ShotLoaderDeps {
  readonly createImage: () => ImageLike | null
  /** How long a picture may take before the viewer admits it is waiting. */
  readonly spinnerDelayMs?: number
}

export interface ShotLoader {
  /** The source the <img> should carry: the last one known to be paintable. */
  readonly shown: Readonly<Ref<string>>
  readonly pending: Readonly<Ref<boolean>>
  readonly failed: Readonly<Ref<boolean>>
  /** Show this one, once it is ready. */
  show(source: string): void
  /** Warm the cache without showing anything. */
  prefetch(source: string): void
  /** Forget everything, for when the viewer closes. */
  reset(): void
  destroy(): void
}

export const DEFAULT_SPINNER_DELAY_MS = 150

export function createShotLoader(deps: ShotLoaderDeps): ShotLoader {
  const spinnerDelayMs = deps.spinnerDelayMs ?? DEFAULT_SPINNER_DELAY_MS

  const shown = ref('')
  const pending = ref(false)
  const failed = ref(false)

  /** Sources already known to be in the cache; re-showing one is free. */
  const ready = new Set<string>()
  let wanted = ''
  let spinnerTimer: ReturnType<typeof setTimeout> | null = null

  function clearSpinnerTimer() {
    if (spinnerTimer === null) return

    clearTimeout(spinnerTimer)
    spinnerTimer = null
  }

  function settle(source: string, ok: boolean) {
    if (ok) ready.add(source)
    // A picture the visitor has already scrolled past must not take the screen.
    if (source !== wanted) return

    clearSpinnerTimer()
    pending.value = false
    failed.value = !ok
    if (ok) shown.value = source
  }

  function fetch(source: string, onSettled?: (ok: boolean) => void) {
    const image = deps.createImage()
    if (!image) {
      onSettled?.(false)
      return
    }

    image.decoding = 'async'

    image.addEventListener(
      'load',
      () => {
        // Decoding too, where it is offered: load alone still leaves the first
        // paint to hitch on the main thread.
        const decoded = image.decode?.()
        if (!decoded) {
          onSettled?.(true)
          return
        }

        void decoded.then(
          () => onSettled?.(true),
          // A picture that will not decode is still better tried than spun over.
          () => onSettled?.(true),
        )
      },
      { once: true },
    )

    image.addEventListener('error', () => onSettled?.(false), { once: true })
    image.src = source
  }

  return {
    shown: readonly(shown),
    pending: readonly(pending),
    failed: readonly(failed),

    show(source) {
      if (source === '') return

      wanted = source

      if (ready.has(source)) {
        clearSpinnerTimer()
        pending.value = false
        failed.value = false
        shown.value = source
        return
      }

      failed.value = false
      // Nothing on screen yet, so there is no picture to wait politely behind.
      if (shown.value === '') pending.value = true
      else if (spinnerTimer === null) {
        spinnerTimer = setTimeout(() => {
          spinnerTimer = null
          if (wanted !== '' && !ready.has(wanted)) pending.value = true
        }, spinnerDelayMs)
      }

      fetch(source, (ok) => settle(source, ok))
    },

    prefetch(source) {
      if (source === '' || ready.has(source)) return

      fetch(source, (ok) => {
        if (ok) ready.add(source)
      })
    },

    reset() {
      clearSpinnerTimer()
      wanted = ''
      shown.value = ''
      pending.value = false
      failed.value = false
    },

    destroy() {
      clearSpinnerTimer()
      wanted = ''
      ready.clear()
    },
  }
}
