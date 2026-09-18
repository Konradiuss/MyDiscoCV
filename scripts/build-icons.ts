/*
 * Builds the home-screen and install icons from src/assets/icons/compact-disc.svg.
 *
 *   npm run icons:build
 *   npm run icons:build -- --force   rebuild even when nothing has changed
 *
 * These are not the tab icon: that one is the spinning vinyl in
 * src/assets/favicon/, twenty hand-drawn 32x32 frames that this cannot stand in
 * for. What lives here is the single still disc iOS puts on a home screen and
 * Android puts in a launcher, at sizes the 48x48 favicon.ico could only blur up
 * to.
 *
 * Run this before touching index.html: Vite resolves <link href> against the
 * public folder at build time and fails on a file that is not there yet.
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'src/assets/icons/compact-disc.svg')
const outDir = join(root, 'public')

/** The loading screen's disc colour, so the two marks match. */
const DISC_COLOR = '#EAF6FF'
/** --bg, opaque: iOS composites a transparent icon onto a flat colour of its own. */
const BACKGROUND = { r: 0x07, g: 0x07, b: 0x0d, alpha: 1 }

interface IconSpec {
  readonly file: string
  readonly size: number
  /** How much of the canvas the disc fills. */
  readonly fill: number
  readonly note: string
}

const ICONS: IconSpec[] = [
  { file: 'apple-touch-icon.png', size: 180, fill: 0.72, note: 'iOS home screen' },
  { file: 'icon-192.png', size: 192, fill: 0.72, note: 'manifest, Android launcher' },
  { file: 'icon-512.png', size: 512, fill: 0.72, note: 'manifest, install splash' },
  // Android crops an adaptive icon to a circle 80% of the width, so this one
  // keeps the disc well inside that.
  { file: 'icon-maskable-512.png', size: 512, fill: 0.56, note: 'manifest, maskable' },
]

function kb(bytes: number) {
  return `${Math.round(bytes / 1024)} kB`
}

async function build(spec: IconSpec, svg: Buffer) {
  const inner = Math.round(spec.size * spec.fill)

  const disc = await sharp(svg, { density: 512 }).resize(inner, inner).png().toBuffer()

  await sharp({
    create: { width: spec.size, height: spec.size, channels: 4, background: BACKGROUND },
  })
    .composite([{ input: disc, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toFile(join(outDir, spec.file))
}

async function main() {
  const force = process.argv.includes('--force')

  if (!existsSync(source)) throw new Error(`No icon to build from: ${source} does not exist.`)

  mkdirSync(outDir, { recursive: true })

  // The file ships white on transparent; recolour in memory so the source stays
  // the one the loading screen mirrors.
  const original = readFileSync(source, 'utf8')
  if (!original.includes('#ffffff')) {
    throw new Error(`Expected fill="#ffffff" in ${source}. Has the icon been recoloured?`)
  }
  const svg = Buffer.from(original.replaceAll('#ffffff', DISC_COLOR))

  const sourceTime = statSync(source).mtimeMs
  let built = 0

  for (const spec of ICONS) {
    const out = join(outDir, spec.file)

    if (!force && existsSync(out) && statSync(out).mtimeMs >= sourceTime) {
      console.log(`${spec.file} is already up to date`)
      continue
    }

    await build(spec, svg)
    built += 1
    console.log(`${spec.file} ${spec.size}x${spec.size} ${kb(statSync(out).size)} — ${spec.note}`)
  }

  writeManifest()
  console.log(`\n${built} built, ${ICONS.length - built} already up to date`)
}

/*
 * Paths inside a manifest resolve against the manifest's own URL, so relative
 * ones work under any base and the file needs no build-time templating.
 */
function writeManifest() {
  const manifest = {
    name: 'Babii Oleksandr — Full-stack Web Developer',
    short_name: 'DiscoCV',
    description: 'Interactive resume and portfolio set in a 3D disco room.',
    lang: 'en',
    dir: 'ltr',
    id: './',
    start_url: './en',
    scope: './',
    display: 'standalone',
    background_color: '#07070d',
    theme_color: '#07070d',
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }

  const out = join(outDir, 'site.webmanifest')
  writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`site.webmanifest ${kb(statSync(out).size)}`)
}

await main()
