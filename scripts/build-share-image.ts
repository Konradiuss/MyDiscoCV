/*
 * Builds the picture Telegram, WhatsApp, X and LinkedIn put beside the link.
 *
 *   npm run share:image                  all three languages
 *   npm run share:image -- en            just one
 *   npm run share:image -- --skip-build  reuse the dist/ that is already there
 *   npm run share:image -- --motion      let the halo animate before the shot
 *   npm run share:image -- --keep-png    also save the raw 2400x1260 to test-results/
 *   npm run share:image -- --quality 78
 *
 * The real room is photographed rather than drawn from scratch, so the card
 * shows what the visitor is about to open. The text is laid over it here, in the
 * page, because a preview is read at thumbnail size and the site's own hero copy
 * is far too small to survive that.
 *
 * Rerun after changing profile.name, title, location or availability — those are
 * baked into the picture. The description is not: it is rebuilt from
 * profile.summary on every `npm run build`.
 */

import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import sharp from 'sharp'
import { build, preview } from 'vite'

import { resumeByLocale } from '../src/data/resume.ts'
import type { Locale } from '../src/types/resume.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const WIDTH = 1200
const HEIGHT = 630
/* Shot at twice the size and downsampled, so the text keeps its edges. */
const SCALE = 2
/* 4173 belongs to playwright.config.ts. */
const PORT = 4319

function readNumber(name: string, fallback: number) {
  const at = process.argv.indexOf(`--${name}`)
  if (at < 0) return fallback

  const value = Number.parseInt(process.argv[at + 1] ?? '', 10)
  if (!Number.isFinite(value)) throw new Error(`--${name} needs a number`)

  return value
}

function kb(bytes: number) {
  return `${Math.round(bytes / 1024)} kB`
}

/*
 * Hidden, not removed. updateSceneFromScroll() measures .floor-stage to decide
 * how far the camera has travelled towards the floor; taking any of this out of
 * the layout collapses that box, sends the camera down to the turntable, and the
 * shot comes back showing the deck instead of the disco ball.
 */
const HIDE_CHROME = `
  .resume-page__chrome,
  .scroll-orb-slot,
  .scroll-rail,
  .screenshot-viewer,
  .record-sleeve-picker,
  .deck-controls,
  .disco-ball-hit-area,
  main.resume-page__content,
  .floor-stage { visibility: hidden !important; }

  /* Fixed, outside the flow, so this one is safe to take out entirely. */
  #loading-screen { display: none !important; }

  html { overflow: hidden !important; }
`

const CARD_STYLE = `
  #og-card {
    position: fixed;
    inset: 0;
    z-index: 60;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    color: #f5f7fb;
    pointer-events: none;
  }

  #og-card .og-card__scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to top,
      rgba(7, 7, 13, 0.93) 0%,
      rgba(7, 7, 13, 0.8) 26%,
      rgba(7, 7, 13, 0.3) 48%,
      transparent 66%
    );
  }

  /* X crops a large card to exactly 2:1, taking 15px off the top and bottom. */
  #og-card .og-card__text {
    position: absolute;
    right: 64px;
    bottom: 58px;
    left: 64px;
  }

  #og-card .og-card__kicker {
    margin: 0 0 14px;
    color: #7de3ff;
    font-size: 22px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  #og-card .og-card__name {
    margin: 0 0 10px;
    font-size: 76px;
    font-weight: 600;
    line-height: 1.02;
    letter-spacing: -0.015em;
  }

  #og-card .og-card__title {
    margin: 0;
    color: #aeb6c8;
    font-size: 34px;
    font-weight: 400;
  }
`

interface CardCopy {
  readonly name: string
  readonly title: string
  readonly kicker: string
}

async function shoot(locale: Locale, origin: string, options: { motion: boolean }) {
  const { profile } = resumeByLocale[locale]
  const browser = await chromium.launch()

  try {
    const context = await browser.newContext({
      viewport: { width: WIDTH, height: HEIGHT },
      deviceScaleFactor: SCALE,
      // Calms the halo and the ball's tilt, and makes the loading screen leave at once.
      reducedMotion: options.motion ? 'no-preference' : 'reduce',
    })
    const page = await context.newPage()

    // The player starts itself once the loading screen is gone; the track is
    // megabytes we would only throw away. The covers are scene textures — keep those.
    await page.route('**/*.mp3', (route) => route.abort())

    await page.goto(new URL(locale, origin).href, { waitUntil: 'load' })

    // Not the loading screen: that leaves on a timeout whether the room was
    // built or not. This attribute means the room is actually drawn.
    await page.waitForSelector('html[data-scene-ready]', { timeout: 180_000 })

    if ((await page.locator('.disco-room-stage--webgl').count()) === 0) {
      throw new Error(
        `${locale}: this Chromium has no WebGL, so the shot would be the flat CSS fallback.`,
      )
    }

    await page.addStyleTag({ content: HIDE_CHROME + CARD_STYLE })
    await page.evaluate(() => window.scrollTo(0, 0))

    const copy: CardCopy = {
      name: profile.name,
      title: profile.title,
      kicker: `${profile.location} · ${profile.availability}`,
    }

    await page.evaluate((text: CardCopy) => {
      const card = document.createElement('div')
      card.id = 'og-card'

      const scrim = document.createElement('div')
      scrim.className = 'og-card__scrim'

      const block = document.createElement('div')
      block.className = 'og-card__text'

      const kicker = document.createElement('p')
      kicker.className = 'og-card__kicker'
      kicker.textContent = text.kicker

      const name = document.createElement('p')
      name.className = 'og-card__name'
      name.textContent = text.name

      const title = document.createElement('p')
      title.className = 'og-card__title'
      title.textContent = text.title

      block.append(kicker, name, title)
      card.append(scrim, block)
      document.body.append(card)
    }, copy)

    // Inter's Cyrillic subset is its own file; without this the ua and ru cards
    // come out in whatever the system offers.
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(400)

    return await page.screenshot({ type: 'png' })
  } finally {
    await browser.close()
  }
}

async function main() {
  const argv = process.argv.slice(2)
  const quality = readNumber('quality', 82)

  // Everything that is not a flag, and not the number belonging to one.
  const requested = argv.filter(
    (arg, index) => !arg.startsWith('--') && !argv[index - 1]?.startsWith('--quality'),
  )
  const targets = (requested.length > 0 ? requested : ['ua', 'ru', 'en']) as Locale[]
  const motion = process.argv.includes('--motion')
  const keepPng = process.argv.includes('--keep-png')

  targets.forEach((locale) => {
    if (!resumeByLocale[locale]) throw new Error(`Unknown locale "${locale}".`)
  })

  if (process.argv.includes('--skip-build')) {
    if (!existsSync(join(root, 'dist/index.html'))) {
      throw new Error('--skip-build was given, but there is no dist/. Run `npm run build` first.')
    }
  } else {
    console.log('Building, so the shot cannot be of stale code...')
    await build({ configFile: join(root, 'vite.config.ts'), logLevel: 'warn' })
  }

  const server = await preview({
    configFile: join(root, 'vite.config.ts'),
    logLevel: 'warn',
    preview: { port: PORT, strictPort: false, open: false },
  })

  const origin = server.resolvedUrls?.local[0]
  if (!origin) throw new Error('The preview server came up without an address.')

  try {
    for (const locale of targets) {
      const png = await shoot(locale, origin, { motion })

      if (keepPng) {
        const raw = join(root, 'test-results', `og-${locale}-raw.png`)
        mkdirSync(dirname(raw), { recursive: true })
        writeFileSync(raw, png)
        console.log(`  raw ${raw}`)
      }

      const out = join(root, 'public', `og-${locale}.jpg`)
      await sharp(png)
        .resize(WIDTH, HEIGHT, { fit: 'cover', kernel: 'lanczos3' })
        // 4:4:4, because the default smears cyan text on near-black badly.
        .jpeg({ quality, mozjpeg: true, chromaSubsampling: '4:4:4', progressive: false })
        .toFile(out)

      const { size } = statSync(out)
      console.log(`og-${locale}.jpg ${WIDTH}x${HEIGHT} ${kb(size)}`)

      if (size > 450_000) {
        throw new Error(
          `og-${locale}.jpg is ${kb(size)}, past what a preview should weigh. Lower --quality.`,
        )
      }
      if (size > 300_000) {
        console.warn(`  heavier than 300 kB — consider a lower --quality`)
      }
    }
  } finally {
    server.httpServer.close()
  }

  console.log(`\n${targets.length} built`)
}

await main()
