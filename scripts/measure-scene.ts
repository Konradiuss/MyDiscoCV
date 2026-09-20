/*
 * Measures how long the disco room takes to draw a frame.
 *
 *   npm run scene:measure                     phone viewport, top and below the fold
 *   npm run scene:measure -- --desktop        1440x900 instead
 *   npm run scene:measure -- --landscape      the same phone on its side, 844x390
 *   npm run scene:measure -- --throttle 4     slow the CPU down 4x
 *   npm run scene:measure -- --dpr 3          what the device reports, before the app caps it
 *   npm run scene:measure -- --seconds 6
 *   npm run scene:measure -- --skip-build     reuse the dist/ that is already there
 *   npm run scene:measure -- --reduce         with prefers-reduced-motion on
 *
 * WHAT THIS NUMBER IS AND IS NOT. Headless Chromium has no GPU: it rasterises
 * through SwiftShader, on the CPU. So the absolute frame times below are far
 * worse than any real phone and must never be quoted as "the site runs at N fps".
 *
 * What it does do honestly is exaggerate the cost of shading pixels, which is
 * exactly where this scene is bound. That makes it a fair way to compare one
 * revision against another. Use it for the delta; use the ?fps=1 overlay on a
 * real handset for the verdict.
 */

import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { build, preview } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/* The hook DiscoRoomBackground.vue opens when `?perf` is in the query. */
declare global {
  interface Window {
    __discoPerf?: {
      dropBurst?: () => void
      dropSpots?: () => void
      dropGrid?: () => void
      cheapWalls?: () => void
      dropEnvironment?: () => void
      dropBall?: () => void
      setPixelRatio?: (value: number) => void
      info?: () => Record<string, unknown>
    }
  }
}

/* 4173 belongs to playwright.config.ts, 4319 to build-share-image.ts. */
const PORT = 4320

const PHONE = { width: 390, height: 844 }
const DESKTOP = { width: 1440, height: 900 }
/* The same phone on its side, where the room zooms in — see heroFraming.ts. */
const LANDSCAPE = { width: 844, height: 390 }

/* Thrown away before measuring: shader compilation lands in the first few. */
const WARMUP_FRAMES = 10

function readNumber(name: string, fallback: number) {
  const at = process.argv.indexOf(`--${name}`)
  if (at < 0) return fallback

  const value = Number.parseFloat(process.argv[at + 1] ?? '')
  if (!Number.isFinite(value)) throw new Error(`--${name} needs a number`)

  return value
}

interface FrameStats {
  readonly frames: number
  readonly p50: number
  readonly p95: number
  readonly worst: number
}

/*
 * The warm-up is dropped here rather than in the page, and never more than a
 * third of what came back: at desktop settings under software rendering a frame
 * can take most of a second, and dropping a fixed ten would leave nothing at all.
 */
function summarise(gaps: readonly number[]): FrameStats {
  const drop = Math.min(WARMUP_FRAMES, Math.floor(gaps.length / 3))
  const sorted = gaps.slice(drop).sort((a, b) => a - b)
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0

  return { frames: sorted.length, p50: at(0.5), p95: at(0.95), worst: sorted.at(-1) ?? 0 }
}

function report(label: string, stats: FrameStats) {
  if (stats.frames === 0) {
    console.log(`  ${label.padEnd(18)} no frames — raise --seconds`)
    return
  }

  const fps = stats.p50 > 0 ? 1000 / stats.p50 : 0
  const low = stats.p95 > 0 ? 1000 / stats.p95 : 0

  console.log(
    `  ${label.padEnd(18)} ${fps.toFixed(1).padStart(5)} fps   ` +
      `median ${stats.p50.toFixed(1).padStart(6)} ms   ` +
      `p95 ${stats.p95.toFixed(1).padStart(6)} ms (${low.toFixed(1)} fps)   ` +
      `worst ${stats.worst.toFixed(0)} ms   ${stats.frames} frames`,
  )
}

export function measurementScript(seconds: number) {
  return `
    new Promise((done) => {
      const gaps = []
      let previous = 0
      const until = performance.now() + ${seconds} * 1000

      function tick(now) {
        // The gap between presentations is the frame cost, including whatever
        // the compositor adds — which is what the visitor actually feels.
        if (previous) gaps.push(now - previous)
        previous = now

        if (now < until) requestAnimationFrame(tick)
        else done(gaps)
      }

      requestAnimationFrame(tick)
    })
  `
}

async function main() {
  const seconds = readNumber('seconds', 5)
  const throttle = readNumber('throttle', 1)
  const desktop = process.argv.includes('--desktop')
  const landscape = process.argv.includes('--landscape')
  const viewport = desktop ? DESKTOP : landscape ? LANDSCAPE : PHONE
  const dpr = readNumber('dpr', desktop ? 2 : 3)
  const experiments = process.argv.includes('--experiments')

  if (process.argv.includes('--skip-build')) {
    if (!existsSync(join(root, 'dist/index.html'))) {
      throw new Error('--skip-build was given, but there is no dist/. Run `npm run build` first.')
    }
  } else {
    console.log('Building, so the measurement cannot be of stale code...')
    await build({ configFile: join(root, 'vite.config.ts'), logLevel: 'warn' })
  }

  const server = await preview({
    configFile: join(root, 'vite.config.ts'),
    logLevel: 'warn',
    preview: { port: PORT, strictPort: false, open: false },
  })

  const origin = server.resolvedUrls?.local[0]
  if (!origin) throw new Error('The preview server came up without a local address.')

  // Without these, rAF gaps land on multiples of 16.7 ms and a 40 ms frame and a
  // 50 ms frame report the same number. We want the cost, not the cadence.
  const browser = await chromium.launch({
    args: ['--disable-gpu-vsync', '--disable-frame-rate-limit'],
  })

  try {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: dpr,
      /*
       * A phone viewport has to answer `(pointer: coarse)` like a phone, or
       * getStaticQualityTier reads it as a small desktop. Upright that made no
       * difference — the width rule catches 390px on its own — but on its side
       * the window is 844 wide, and without this the measurement was of the
       * full desktop scene: 1.8x pixels, 220 spots, the raymarched halo.
       */
      hasTouch: !desktop,
      reducedMotion: process.argv.includes('--reduce') ? 'reduce' : 'no-preference',
    })
    const page = await context.newPage()

    // Megabytes of audio we would only throw away. Covers are scene textures — keep those.
    await page.route('**/*.mp3', (route) => route.abort())

    if (throttle > 1) {
      const session = await context.newCDPSession(page)
      await session.send('Emulation.setCPUThrottlingRate', { rate: throttle })
    }

    // ?perf opens the hook in DiscoRoomBackground.vue that the cuts below reach through.
    await page.goto(new URL('en?perf', origin).href, { waitUntil: 'load' })

    // Not the loading screen: that leaves on a 12 s timeout whether the room was
    // built or not. This attribute means the room is actually drawn.
    await page.waitForSelector('html[data-scene-ready]', { timeout: 180_000 })

    if ((await page.locator('.disco-room-stage--webgl').count()) === 0) {
      throw new Error('This Chromium has no WebGL, so there would be no scene to measure.')
    }

    const appliedDpr = await page.evaluate(() => window.devicePixelRatio)

    console.log()
    console.log(
      `${viewport.width}x${viewport.height} @ dpr ${appliedDpr}` +
        `${throttle > 1 ? `, cpu /${throttle}` : ''}` +
        `${process.argv.includes('--reduce') ? ', reduced motion' : ''}` +
        ` — ${seconds}s per position, warm-up dropped`,
    )

    const info = await page.evaluate(() => window.__discoPerf?.info?.() ?? null)
    if (info) {
      console.log(
        `tier ${info.tier}, pixelRatio ${info.pixelRatio}, spots ${info.spots}, ` +
          `ballSegments ${info.ballSegments}, burstSteps ${info.burstSteps}, ` +
          `draws ${info.calls}, triangles ${info.triangles}`,
      )
    }
    console.log()

    async function atTop() {
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(500)
      return summarise((await page.evaluate(measurementScript(seconds))) as number[])
    }

    report('top (ball)', await atTop())

    // Far enough that the ball and its halo have left the screen entirely.
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2))
    await page.waitForTimeout(500)
    report(
      'below the fold',
      summarise((await page.evaluate(measurementScript(seconds))) as number[]),
    )

    /*
     * Bounding runs, cumulative and measured only at the top, where the scene is
     * at its worst. The point is not to propose these as changes — dropping the
     * spots outright is not on the table — but to learn what each costs before
     * any optimisation is written, so the effort goes where the milliseconds are.
     */
    if (experiments) {
      console.log()
      const cuts = [
        ['minus halo', () => window.__discoPerf?.dropBurst?.()],
        ['+ dpr 1', () => window.__discoPerf?.setPixelRatio?.(1)],
        ['+ unlit walls', () => window.__discoPerf?.cheapWalls?.()],
        ['+ no environment', () => window.__discoPerf?.dropEnvironment?.()],
        ['+ no spots drawn', () => window.__discoPerf?.dropSpots?.()],
        ['+ no grid', () => window.__discoPerf?.dropGrid?.()],
        ['+ no ball', () => window.__discoPerf?.dropBall?.()],
      ] as const

      for (const [label, cut] of cuts) {
        await page.evaluate(cut)
        report(label, await atTop())
      }
      console.log()
    }
  } finally {
    await browser.close()
    await server.close()
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
