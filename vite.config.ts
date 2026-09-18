import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { locales } from './src/types/resume.ts'
import { defaultLocale } from './src/data/resume.ts'
import { applyShareMeta } from './scripts/shareMeta.ts'

/*
 * GitHub Pages has no SPA fallback. A copy of index.html under every locale serves
 * `/ua`, `/ru` and `/en` directly, and 404.html catches any other path.
 *
 * The copies are not identical: each gets its own lang, title and link-preview
 * tags, because the scrapers behind those previews never run the app and would
 * otherwise show an English card for every language.
 */
function staticHostFallback(): Plugin {
  let outDir = 'dist'

  return {
    name: 'static-host-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      const indexPath = join(outDir, 'index.html')
      const built = readFileSync(indexPath, 'utf8')

      // The bare URL people actually paste; canonical still points at /en.
      writeFileSync(indexPath, applyShareMeta(built, { locale: defaultLocale, urlPath: '' }))

      // Served under every unknown path, so it must not be indexed as a duplicate.
      writeFileSync(
        join(outDir, '404.html'),
        applyShareMeta(built, { locale: defaultLocale, urlPath: '', noindex: true }),
      )

      for (const locale of locales) {
        mkdirSync(join(outDir, locale), { recursive: true })
        writeFileSync(join(outDir, locale, 'index.html'), applyShareMeta(built, { locale }))
      }
    },
  }
}

export default defineConfig({
  /* `/MyDiscoCV/` on GitHub Pages, set by the deploy workflow. */
  base: process.env.PAGES_BASE ?? '/',
  plugins: [vue(), vueJsx(), vueDevTools(), staticHostFallback()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    /* Never inline PDFs: a download link needs a real file, not a data URI. */
    assetsInlineLimit: (filePath) => (filePath.endsWith('.pdf') ? false : undefined),
  },
})
