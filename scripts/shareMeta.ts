import { resumeByLocale } from '../src/data/resume.ts'
import { LANGUAGE_TAGS } from '../src/components/resume/period.ts'
import type { Locale } from '../src/types/resume.ts'

/**
 * The head a link preview is built from.
 *
 * Telegram, WhatsApp and the rest never run the page, so everything they know
 * has to be in the HTML they are served. index.html carries the English block
 * between a pair of markers, and staticHostFallback() in vite.config.ts swaps
 * that block per locale as it writes /ua, /ru and /en.
 *
 * Lives in scripts/, not src/, because vite.config.ts imports it: that puts it
 * under tsconfig.node.json, where relative imports carry their `.ts` — which is
 * what Vite's native config loader needs to resolve them.
 */

/** The live site. Checked against package.json "homepage" by the spec. */
export const SITE_URL = 'https://konradiuss.github.io/MyDiscoCV/'

export const OG_LOCALES: Record<Locale, string> = {
  ua: 'uk_UA',
  ru: 'ru_RU',
  en: 'en_GB',
}

export const OG_IMAGE_WIDTH = 1200
export const OG_IMAGE_HEIGHT = 630

export const SHARE_META_START = '<!-- share-meta:start -->'
export const SHARE_META_END = '<!-- share-meta:end -->'

export interface ShareMetaOptions {
  readonly locale: Locale
  /** What og:url should claim, relative to SITE_URL. Defaults to the locale. */
  readonly urlPath?: string
  /** For 404.html, which GitHub Pages serves under every unknown path. */
  readonly noindex?: boolean
}

export function shareImageName(locale: Locale) {
  return `og-${locale}.jpg`
}

/**
 * The first sentence of a paragraph, terminator included.
 *
 * Split on a terminator followed by a space or the end, never on the dot alone:
 * every locale's summary ends its first sentence with "Node.js.", and a bare dot
 * would cut it back to "...and Node." The space is what tells an abbreviation
 * from a full stop.
 */
export function firstSentence(text: string) {
  const trimmed = text.trim()
  const end = trimmed.search(/[.!?](?=\s|$)/)

  return end === -1 ? trimmed : trimmed.slice(0, end + 1)
}

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function absolute(path: string) {
  return new URL(path, SITE_URL).href
}

/** The tags that go between the markers, without the markers themselves. */
export function buildShareMeta({ locale, urlPath = locale }: ShareMetaOptions) {
  const resume = resumeByLocale[locale]
  const { profile } = resume

  const title = `${profile.name} | ${profile.title}`
  const description = firstSentence(profile.summary)
  const imageAlt = `${profile.name} — ${profile.title}, ${profile.location}`
  const image = absolute(shareImageName(locale))
  const url = absolute(urlPath)

  const tag = (markup: string) => `    ${markup}`
  const meta = (key: 'property' | 'name', value: string, content: string) =>
    tag(`<meta ${key}="${value}" content="${escapeAttribute(content)}" />`)

  return [
    tag(`<title>${escapeAttribute(title)}</title>`),
    meta('name', 'description', description),
    tag(`<link rel="canonical" href="${absolute(locale)}" />`),
    // hreflang wants the language, not the route segment: "uk", never "ua".
    ...(['ua', 'ru', 'en'] as const).map((other) =>
      tag(
        `<link rel="alternate" hreflang="${LANGUAGE_TAGS[other].slice(0, 2)}" href="${absolute(other)}" />`,
      ),
    ),
    tag(`<link rel="alternate" hreflang="x-default" href="${absolute('en')}" />`),
    meta('property', 'og:type', 'profile'),
    meta('property', 'og:site_name', 'DiscoCV'),
    meta('property', 'og:locale', OG_LOCALES[locale]),
    ...(['ua', 'ru', 'en'] as const)
      .filter((other) => other !== locale)
      .map((other) => meta('property', 'og:locale:alternate', OG_LOCALES[other])),
    meta('property', 'og:url', url),
    meta('property', 'og:title', title),
    meta('property', 'og:description', description),
    meta('property', 'og:image', image),
    meta('property', 'og:image:type', 'image/jpeg'),
    meta('property', 'og:image:width', String(OG_IMAGE_WIDTH)),
    meta('property', 'og:image:height', String(OG_IMAGE_HEIGHT)),
    meta('property', 'og:image:alt', imageAlt),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', title),
    meta('name', 'twitter:description', description),
    meta('name', 'twitter:image', image),
    meta('name', 'twitter:image:alt', imageAlt),
  ].join('\n')
}

const BLOCK = /<!-- share-meta:start -->[\s\S]*?<!-- share-meta:end -->/
const LANG = /<html\s+lang="[^"]*"/

/** Swaps the marker block and the lang attribute for one locale's. */
export function applyShareMeta(html: string, options: ShareMetaOptions) {
  // Thrown, never skipped: a marker lost to a reformat would otherwise ship
  // three English cards to production with nothing to notice it.
  if (!BLOCK.test(html)) {
    throw new Error(`index.html has no ${SHARE_META_START} ... ${SHARE_META_END} block.`)
  }
  if (!LANG.test(html)) {
    throw new Error('index.html has no <html lang="..."> to localise.')
  }

  const robots = options.noindex ? '\n    <meta name="robots" content="noindex" />' : ''

  return html
    .replace(LANG, `<html lang="${LANGUAGE_TAGS[options.locale]}"`)
    .replace(
      BLOCK,
      `${SHARE_META_START}\n${buildShareMeta(options)}${robots}\n    ${SHARE_META_END}`,
    )
}
