import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'

import {
  OG_LOCALES,
  SITE_URL,
  applyShareMeta,
  buildShareMeta,
  firstSentence,
  shareImageName,
} from '../../scripts/shareMeta'
import { resumeByLocale } from '../data/resume'
import { LANGUAGE_TAGS } from '../components/resume/period'
import { locales } from '../types/resume'

/* jsdom leaves import.meta.url as an http address, so resolve from the project root. */
const fromRoot = (path: string) => resolve(process.cwd(), path)

const indexHtml = readFileSync(fromRoot('index.html'), 'utf8')

describe('cutting a summary down to a share description', () => {
  it.each(locales)('stops at the full stop in %s, not at the dot inside Node.js', (locale) => {
    const sentence = firstSentence(resumeByLocale[locale].profile.summary)

    expect(sentence).not.toMatch(/Node\.$/)
    expect(sentence).toMatch(/Node\.js\.$/)
  })

  it('keeps the terminator', () => {
    expect(firstSentence('One thing. Another thing.')).toBe('One thing.')
  })

  it('takes the whole text when there is no terminator at all', () => {
    expect(firstSentence('No terminator here')).toBe('No terminator here')
  })

  it('handles a lone sentence that ends the string', () => {
    expect(firstSentence('Just this.')).toBe('Just this.')
  })

  it('stops at a question or an exclamation too', () => {
    expect(firstSentence('Why? Because.')).toBe('Why?')
    expect(firstSentence('Look! Over there.')).toBe('Look!')
  })

  it('walks past an abbreviation that a letter follows', () => {
    expect(firstSentence('Uses vue.js daily. Yes.')).toBe('Uses vue.js daily.')
  })

  it.each(locales)('leaves no room for a scraper to truncate %s', (locale) => {
    const sentence = firstSentence(resumeByLocale[locale].profile.summary)

    expect(sentence.length).toBeGreaterThan(40)
    expect(sentence.length).toBeLessThan(200)
  })
})

describe('the tags a link preview is built from', () => {
  it('points at the live site package.json advertises', () => {
    const pkg = JSON.parse(readFileSync(fromRoot('package.json'), 'utf8'))

    expect(SITE_URL).toBe(pkg.homepage)
  })

  it.each(locales)('writes %s urls absolute, which is all a scraper can follow', (locale) => {
    const meta = buildShareMeta({ locale })

    expect(meta).toContain(`content="${SITE_URL}${locale}"`)
    expect(meta).toContain(`content="${SITE_URL}${shareImageName(locale)}"`)
    expect(meta).not.toMatch(/content="\/[^/]/)
  })

  it.each(locales)('claims %s, the language of the link, not the default', (locale) => {
    expect(buildShareMeta({ locale })).toContain(
      `property="og:locale" content="${OG_LOCALES[locale]}"`,
    )
  })

  it('offers the other two languages as alternates', () => {
    const meta = buildShareMeta({ locale: 'ua' })

    expect(meta).toContain('content="ru_RU"')
    expect(meta).toContain('content="en_GB"')
    expect(meta.match(/og:locale:alternate/g)).toHaveLength(2)
  })

  it('names languages by their code, never by the route segment', () => {
    const meta = buildShareMeta({ locale: 'ua' })

    expect(meta).toContain('hreflang="uk"')
    expect(meta).not.toContain('hreflang="ua"')
  })

  it('lets the bare url describe itself while the canonical stays on a locale', () => {
    const meta = buildShareMeta({ locale: 'en', urlPath: '' })

    expect(meta).toContain(`property="og:url" content="${SITE_URL}"`)
    expect(meta).toContain(`rel="canonical" href="${SITE_URL}en"`)
  })

  it('escapes what goes into an attribute', () => {
    const meta = buildShareMeta({ locale: 'en' })

    expect(meta).not.toMatch(/content="[^"]*&(?!amp;|quot;|lt;|gt;)/)
  })
})

describe('localising the built page', () => {
  it.each(locales)('gives %s its own head', (locale) => {
    const out = applyShareMeta(indexHtml, { locale })

    expect(out).toContain(`<html lang="${LANGUAGE_TAGS[locale]}"`)
    expect(out).toContain(`content="${OG_LOCALES[locale]}"`)
    expect(out).toContain(`content="${SITE_URL}${shareImageName(locale)}"`)
    expect(out).toContain(resumeByLocale[locale].profile.name)
  })

  it('leaves none of the default language in the tags that speak for the page', () => {
    const ua = applyShareMeta(indexHtml, { locale: 'ua' })

    // en_GB is still there, but only as an alternate — never as the page's own.
    expect(ua).not.toContain(shareImageName('en'))
    expect(ua).not.toContain('property="og:locale" content="en_GB"')
    expect(ua).not.toContain(resumeByLocale.en.profile.title)
  })

  it('keeps the markers, so the next build can find them', () => {
    const out = applyShareMeta(indexHtml, { locale: 'ru' })

    expect(out.match(/share-meta:start/g)).toHaveLength(1)
    expect(out.match(/share-meta:end/g)).toHaveLength(1)
  })

  it('keeps the icons and the loading screen, which are not the block', () => {
    const out = applyShareMeta(indexHtml, { locale: 'ru' })

    expect(out).toContain('rel="apple-touch-icon"')
    expect(out).toContain('rel="manifest"')
    expect(out).toContain('loading-screen__disc')
  })

  it('asks a search engine to skip the page served for unknown paths', () => {
    expect(applyShareMeta(indexHtml, { locale: 'en', noindex: true })).toContain(
      'name="robots" content="noindex"',
    )
    expect(applyShareMeta(indexHtml, { locale: 'en' })).not.toContain('noindex')
  })

  it('refuses a page whose markers someone has removed', () => {
    expect(() => applyShareMeta('<html lang="en"><head></head></html>', { locale: 'en' })).toThrow(
      /share-meta/,
    )
  })

  it('refuses a page with no language to replace', () => {
    expect(() =>
      applyShareMeta('<html><head><!-- share-meta:start --><!-- share-meta:end --></head></html>', {
        locale: 'en',
      }),
    ).toThrow(/lang/)
  })
})

describe('the share images themselves', () => {
  it.each(locales)('ships one for %s', (locale) => {
    const file = fromRoot(`public/${shareImageName(locale)}`)

    expect(existsSync(file), `run \`npm run share:image\` to build ${shareImageName(locale)}`).toBe(
      true,
    )
    // WhatsApp is the tightest of the platforms about how heavy a preview may be.
    expect(statSync(file).size).toBeLessThan(450_000)
  })

  it.each(['apple-touch-icon.png', 'site.webmanifest', 'icon-192.png', 'icon-512.png'])(
    'ships the %s that index.html points at',
    (file) => {
      expect(existsSync(fromRoot(`public/${file}`))).toBe(true)
    },
  )
})
