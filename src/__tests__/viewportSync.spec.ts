import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createTrailingCall,
  getSceneViewport,
  needsCameraUpdate,
  needsRendererResize,
} from '../components/disco/viewportSync'

const desktop = { width: 1440, height: 900, devicePixelRatio: 2 }
const phone = { width: 390, height: 844, devicePixelRatio: 3 }

describe('reading the viewport', () => {
  it('frames a desktop window wide', () => {
    expect(getSceneViewport(desktop).fov).toBe(35)
  })

  it('frames a phone narrower, so the room still fits across it', () => {
    expect(getSceneViewport(phone).fov).toBe(31)
  })

  it('asks a dense screen for fewer pixels than it offers', () => {
    expect(getSceneViewport(desktop).pixelRatio).toBe(1.8)
    expect(getSceneViewport(phone).pixelRatio).toBe(1.5)
  })

  it('leaves a plain screen at its own density', () => {
    expect(getSceneViewport({ ...desktop, devicePixelRatio: 1 }).pixelRatio).toBe(1)
  })

  it('survives a browser that reports no density at all', () => {
    expect(getSceneViewport({ ...desktop, devicePixelRatio: 0 }).pixelRatio).toBe(1)
  })

  it('carries the window size through untouched', () => {
    expect(getSceneViewport(desktop).width).toBe(1440)
    expect(getSceneViewport(desktop).height).toBe(900)
  })
})

describe('deciding whether anything has to be applied', () => {
  const applied = getSceneViewport(desktop)

  it('does everything the first time, when nothing has been applied yet', () => {
    expect(needsRendererResize(null, applied)).toBe(true)
    expect(needsCameraUpdate(null, applied)).toBe(true)
  })

  it('does nothing at all when the window has not moved', () => {
    expect(needsRendererResize(applied, getSceneViewport(desktop))).toBe(false)
    expect(needsCameraUpdate(applied, getSceneViewport(desktop))).toBe(false)
  })

  it('resizes when the address bar takes a slice of the height', () => {
    const next = getSceneViewport({ ...desktop, height: 812 })

    expect(needsRendererResize(applied, next)).toBe(true)
    expect(needsCameraUpdate(applied, next)).toBe(true)
  })

  it('resizes when the screen density changes under a moved window', () => {
    const next = getSceneViewport({ ...desktop, devicePixelRatio: 1 })

    expect(needsRendererResize(applied, next)).toBe(true)
    expect(needsCameraUpdate(applied, next)).toBe(false)
  })
})

describe('waiting for the window to settle', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not run while the calls keep coming', () => {
    vi.useFakeTimers()
    const run = vi.fn<() => void>()
    const call = createTrailingCall(run, 200)

    call.schedule()
    vi.advanceTimersByTime(150)
    call.schedule()
    vi.advanceTimersByTime(150)

    expect(run).not.toHaveBeenCalled()
  })

  it('runs once, after the last one', () => {
    vi.useFakeTimers()
    const run = vi.fn<() => void>()
    const call = createTrailingCall(run, 200)

    call.schedule()
    call.schedule()
    call.schedule()
    vi.advanceTimersByTime(200)

    expect(run).toHaveBeenCalledTimes(1)
  })

  it('can be asked for the work straight away', () => {
    vi.useFakeTimers()
    const run = vi.fn<() => void>()
    const call = createTrailingCall(run, 200)

    call.schedule()
    call.flush()

    expect(run).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(400)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('has nothing to flush when nothing is waiting', () => {
    vi.useFakeTimers()
    const run = vi.fn<() => void>()

    createTrailingCall(run, 200).flush()

    expect(run).not.toHaveBeenCalled()
  })

  it('drops the pending work when the scene goes away', () => {
    vi.useFakeTimers()
    const run = vi.fn<() => void>()
    const call = createTrailingCall(run, 200)

    call.schedule()
    call.cancel()
    vi.advanceTimersByTime(400)

    expect(run).not.toHaveBeenCalled()
  })
})
