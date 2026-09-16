import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { locales } from './src/types/resume'

/*
 * GitHub Pages has no SPA fallback. A copy of index.html under every locale serves
 * `/ua`, `/ru` and `/en` directly, and 404.html catches any other path.
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
      const index = join(outDir, 'index.html')
      copyFileSync(index, join(outDir, '404.html'))
      for (const locale of locales) {
        mkdirSync(join(outDir, locale), { recursive: true })
        copyFileSync(index, join(outDir, locale, 'index.html'))
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
