/**
 * A frame-rate readout, shown only when `?fps` is in the address.
 *
 * It exists because the measuring rig in scripts/measure-scene.ts runs in
 * headless Chromium, which rasterises on the CPU. That is a fair way to compare
 * two revisions, and a useless way to predict a phone: no handset has anything
 * like a desktop CPU standing in for its GPU. The only instrument that tells the
 * truth about a real device is one running on it, which is this.
 *
 * Open the site on the phone with ?fps on the end and read the numbers. p95 is
 * the one that matters for whether it feels smooth — a good median with a bad
 * p95 is exactly what a stutter is.
 */

const SAMPLE_COUNT = 120
const REDRAW_EVERY = 20

export interface FpsOverlayHandle {
  stop(): void
}

function styleOverlay(node: HTMLElement) {
  /*
   * Left, not right: the music and language controls own the top-right corner.
   * pointer-events none so it can never swallow a tap meant for the room.
   */
  node.style.cssText = [
    'position:fixed',
    'top:8px',
    'left:8px',
    'z-index:99',
    'padding:6px 9px',
    'border-radius:6px',
    'background:rgba(7,7,13,0.82)',
    'color:#7de3ff',
    'font:600 12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace',
    'white-space:pre',
    'pointer-events:none',
  ].join(';')
}

function quantile(sorted: readonly number[], q: number) {
  if (sorted.length === 0) return 0
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0
}

export function startFpsOverlay(search: string = window.location.search): FpsOverlayHandle | null {
  if (!new URLSearchParams(search).has('fps')) return null

  const node = document.createElement('div')
  styleOverlay(node)
  node.textContent = 'measuring…'
  document.body.append(node)

  // A ring buffer, so a reading that runs for an hour allocates nothing.
  const gaps = new Float64Array(SAMPLE_COUNT)
  let written = 0
  let previous = 0
  let frame = 0
  let stopped = false

  function draw() {
    const filled = Math.min(written, SAMPLE_COUNT)
    const sorted = [...gaps.subarray(0, filled)].sort((a, b) => a - b)
    const p50 = quantile(sorted, 0.5)
    const p95 = quantile(sorted, 0.95)

    node.textContent =
      `${p50 > 0 ? (1000 / p50).toFixed(0) : '–'} fps\n` +
      `p50 ${p50.toFixed(1)} ms\n` +
      `p95 ${p95.toFixed(1)} ms`
  }

  function tick(now: number) {
    if (stopped) return

    if (previous > 0) {
      gaps[written % SAMPLE_COUNT] = now - previous
      written += 1
      if (written % REDRAW_EVERY === 0) draw()
    }

    previous = now
    frame = requestAnimationFrame(tick)
  }

  frame = requestAnimationFrame(tick)

  return {
    stop() {
      stopped = true
      if (frame) cancelAnimationFrame(frame)
      node.remove()
    },
  }
}
