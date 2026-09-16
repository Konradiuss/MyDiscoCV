import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { startAnimatedFavicon, stopAnimatedFavicon } from '../favicon/animatedFavicon'

const FRAME_MS = 90

function stubMotionPreference(reduced: boolean) {
  const listeners = new Set<(event: { matches: boolean }) => void>()

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: reduced,
      addEventListener: (_: string, listener: (event: { matches: boolean }) => void) =>
        listeners.add(listener),
      removeEventListener: (_: string, listener: (event: { matches: boolean }) => void) =>
        listeners.delete(listener),
    })),
  )

  return {
    change(matches: boolean) {
      listeners.forEach((listener) => listener({ matches }))
    },
  }
}

function stubImageLoading() {
  const requested: string[] = []

  vi.stubGlobal(
    'Image',
    class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      set src(value: string) {
        requested.push(value)
        this.onload?.()
      }
    },
  )

  return requested
}

function icon() {
  return document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
}

describe('animated favicon', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.head.innerHTML = '<link rel="icon" href="/favicon.ico">'
  })

  afterEach(() => {
    stopAnimatedFavicon()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    document.head.innerHTML = ''
  })

  it('cycles the icon through every frame and back to the first', async () => {
    stubMotionPreference(false)
    const requested = stubImageLoading()
    await startAnimatedFavicon()

    const first = icon()!.href
    const seen = new Set<string>([first])

    for (let i = 1; i < requested.length; i += 1) {
      vi.advanceTimersByTime(FRAME_MS)
      seen.add(icon()!.href)
    }

    expect(seen.size).toBe(requested.length)

    vi.advanceTimersByTime(FRAME_MS)
    expect(icon()!.href).toBe(first)
  })

  it('fetches every frame before showing the first one', async () => {
    stubMotionPreference(false)
    const requested = stubImageLoading()

    const started = startAnimatedFavicon()
    expect(icon()!.href).toContain('favicon.ico')

    await started
    expect(requested.length).toBeGreaterThan(1)
    expect(icon()!.href).not.toContain('favicon.ico')
  })

  it('swaps the icon in place rather than adding a link per frame', async () => {
    stubMotionPreference(false)
    stubImageLoading()
    const before = icon()
    await startAnimatedFavicon()
    vi.advanceTimersByTime(FRAME_MS * 5)

    expect(document.querySelectorAll('link[rel~="icon"]')).toHaveLength(1)
    expect(icon()).toBe(before)
    expect(icon()!.type).toBe('image/png')
  })

  it('holds one frame when the visitor asked for less motion', async () => {
    stubMotionPreference(true)
    stubImageLoading()
    await startAnimatedFavicon()

    const parked = icon()!.href
    vi.advanceTimersByTime(FRAME_MS * 20)

    expect(icon()!.href).toBe(parked)
  })

  it('follows the preference when it changes mid-visit', async () => {
    const motion = stubMotionPreference(false)
    stubImageLoading()
    await startAnimatedFavicon()
    vi.advanceTimersByTime(FRAME_MS)

    motion.change(true)
    const parked = icon()!.href
    vi.advanceTimersByTime(FRAME_MS * 20)
    expect(icon()!.href).toBe(parked)

    motion.change(false)
    vi.advanceTimersByTime(FRAME_MS)
    expect(icon()!.href).not.toBe(parked)
  })

  it('creates an icon link when the document has none', async () => {
    document.head.innerHTML = ''
    stubMotionPreference(false)
    stubImageLoading()
    await startAnimatedFavicon()

    expect(icon()).not.toBeNull()
    expect(icon()!.href).not.toBe('')
  })
})
