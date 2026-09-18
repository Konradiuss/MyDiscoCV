/*
 * Builds the screenshots the site ships from the originals in
 * src/assets/shots-source/.
 *
 *   npm run shots:optimize                 everything that is out of date
 *   npm run shots:optimize -- --force      everything, again
 *   npm run shots:optimize -- --width 2000 a different cap
 *   npm run shots:optimize -- --quality 86
 *
 * The originals stay where they are and are never written to, so the settings
 * can be changed and the whole set rebuilt without ever recompressing a picture
 * that has already been compressed once.
 *
 * Only the output folder is bundled: src/data/resumeAssets.ts globs
 * src/assets/shots/, which is why the two folders must not hold the same stem
 * twice — the resolver in src/lib/assetResolver.ts would not know which to pick.
 */

import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { dirname } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = join(root, 'src/assets/shots-source')
const outDir = join(root, 'src/assets/shots')

const SOURCE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp'])

interface Options {
  readonly width: number
  readonly quality: number
  readonly force: boolean
}

function readOptions(argv: readonly string[]): Options {
  const flag = (name: string) => {
    const at = argv.indexOf(`--${name}`)
    if (at < 0) return null

    const value = Number.parseInt(argv[at + 1] ?? '', 10)
    if (!Number.isFinite(value)) throw new Error(`--${name} needs a number`)

    return value
  }

  return {
    // Twice the widest the viewer ever paints it, which covers a dense screen.
    width: flag('width') ?? 1600,
    quality: flag('quality') ?? 80,
    force: argv.includes('--force'),
  }
}

function stemOf(file: string) {
  return file.slice(0, file.length - extname(file).length)
}

function kb(bytes: number) {
  return `${Math.round(bytes / 1024)} kB`
}

async function main() {
  const options = readOptions(process.argv.slice(2))

  if (!existsSync(sourceDir)) {
    throw new Error(`No originals to build from: ${sourceDir} does not exist.`)
  }

  mkdirSync(outDir, { recursive: true })

  const sources = readdirSync(sourceDir)
    .filter((file) => SOURCE_EXTENSIONS.has(extname(file).toLowerCase()))
    .sort()

  if (sources.length === 0) throw new Error(`No screenshots in ${sourceDir}.`)

  const seen = new Map<string, string>()
  sources.forEach((file) => {
    const stem = stemOf(file)
    const first = seen.get(stem)
    if (first) {
      throw new Error(
        `"${first}" and "${file}" would both become "${stem}.webp". Rename one of them.`,
      )
    }
    seen.set(stem, file)
  })

  let built = 0
  let skipped = 0
  let sourceBytes = 0
  let outBytes = 0

  for (const file of sources) {
    const from = join(sourceDir, file)
    const to = join(outDir, `${stemOf(file)}.webp`)

    const source = statSync(from)
    sourceBytes += source.size

    // Rebuilt only when the original is newer, so a rerun costs nothing.
    if (!options.force && existsSync(to) && statSync(to).mtimeMs >= source.mtimeMs) {
      outBytes += statSync(to).size
      skipped += 1
      continue
    }

    const { width } = await sharp(from).metadata()

    await sharp(from)
      // `withoutEnlargement`: a picture narrower than the cap is left alone.
      .resize({ width: options.width, withoutEnlargement: true })
      .webp({ quality: options.quality, effort: 6 })
      .toFile(to)

    const out = statSync(to)
    outBytes += out.size
    built += 1

    const resized = width && width > options.width ? ` ${width}px -> ${options.width}px` : ''
    console.log(
      `${file} ${kb(source.size)} -> ${stemOf(file)}.webp ${kb(out.size)}` +
        ` (${Math.round((1 - out.size / source.size) * 100)}% off)${resized}`,
    )
  }

  // A screenshot dropped from the originals must not linger in the bundle.
  const wanted = new Set(sources.map((file) => `${stemOf(file)}.webp`))
  const stale = readdirSync(outDir).filter((file) => !wanted.has(file))
  stale.forEach((file) => {
    unlinkSync(join(outDir, file))
    console.log(`removed ${file}, which no longer has an original`)
  })

  console.log(
    `\n${built} built, ${skipped} already up to date` +
      `\n${kb(sourceBytes)} of originals -> ${kb(outBytes)} shipped` +
      ` (${Math.round((1 - outBytes / sourceBytes) * 100)}% off)`,
  )
}

await main()
