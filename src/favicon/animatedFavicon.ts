/** Spins the record in the browser tab by swapping the favicon href on a timer. */

// `?no-inline` rather than `?url`: a plain URL import can still be inlined as base64.
const modules = import.meta.glob<string>('@/assets/favicon/vinyl-*.png', {
  eager: true,
  query: '?no-inline',
  import: 'default',
})

const FRAMES = Object.keys(modules)
  .sort()
  .map((path) => modules[path])
  .filter((url): url is string => typeof url === 'string')

const FRAME_MS = 90

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

let link: HTMLLinkElement | null = null
let timer = 0
let index = 0

function resolveLink(): HTMLLinkElement {
  const existing = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
  if (existing) return existing

  const created = document.createElement('link')
  created.rel = 'icon'
  document.head.appendChild(created)

  return created
}

function preloadFrames(): Promise<void> {
  const loads = FRAMES.map(
    (src) =>
      new Promise<void>((resolve) => {
        const image = new Image()
        image.onload = () => resolve()
        image.onerror = () => resolve()
        image.src = src
      }),
  )

  return Promise.all(loads).then(() => undefined)
}

function showFrame(next: number) {
  index = next % FRAMES.length
  const frame = FRAMES[index]
  if (link && frame) link.href = frame
}

function advance() {
  showFrame(index + 1)
}

function stopSpinning() {
  if (timer) window.clearInterval(timer)
  timer = 0
}

function applyMotionPreference(reduced: boolean) {
  if (reduced) {
    stopSpinning()
    showFrame(0)
    return
  }

  if (timer) return
  timer = window.setInterval(advance, FRAME_MS)
}

export async function startAnimatedFavicon(): Promise<void> {
  if (typeof document === 'undefined' || link || FRAMES.length === 0) return

  link = resolveLink()
  link.type = 'image/png'

  await preloadFrames()

  if (!link) return

  showFrame(0)

  const motion = window.matchMedia(REDUCED_MOTION_QUERY)
  motion.addEventListener('change', (event) => applyMotionPreference(event.matches))
  applyMotionPreference(motion.matches)
}

export function stopAnimatedFavicon() {
  stopSpinning()
  link = null
  index = 0
}
