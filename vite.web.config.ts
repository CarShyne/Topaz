import { readFileSync } from 'fs'
import { resolve } from 'path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const APP_BUILD = process.env.TOPAZ_BUILD ?? '2026-06-16'

const ICON_180 = resolve(__dirname, 'resources/icon-180.png')

function embeddedWebIcons(): Plugin {
  const iconDataUri = `data:image/png;base64,${readFileSync(ICON_180).toString('base64')}`
  const iconTags = [
    `<link rel="icon" type="image/png" href="${iconDataUri}" />`,
    `<link rel="apple-touch-icon" href="${iconDataUri}" />`,
    `<link rel="apple-touch-icon" sizes="180x180" href="${iconDataUri}" />`,
    `<link rel="manifest" href="/manifest.webmanifest" />`,
  ].join('\n    ')

  return {
    name: 'topaz-embedded-web-icons',
    transformIndexHtml(html) {
      return html
        .replace('<!-- topaz-embedded-icons -->', iconTags)
        .replace('<!-- topaz-build -->', APP_BUILD)
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.webmanifest',
        source: JSON.stringify({
          name: 'Topaz',
          short_name: 'Topaz',
          description: 'Next Level Notes',
          display: 'standalone',
          start_url: '/',
          background_color: '#0d0d0d',
          theme_color: '#0d0d0d',
          icons: [
            {
              src: iconDataUri,
              sizes: '180x180',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        }, null, 2),
      })
    },
  }
}

export default defineConfig({
  root: resolve(__dirname),
  base: '/',
  define: {
    'import.meta.env.VITE_PLATFORM': JSON.stringify('web'),
    'import.meta.env.VITE_APP_BUILD': JSON.stringify(APP_BUILD),
  },
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.web.html'),
    },
  },
  resolve: {
    alias: {
      '@': resolve('src'),
    },
  },
  plugins: [react(), embeddedWebIcons()],
})
