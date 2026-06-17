import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: resolve(__dirname),
  base: '/',
  define: {
    'import.meta.env.VITE_PLATFORM': JSON.stringify('web')
  },
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.web.html')
    }
  },
  resolve: {
    alias: {
      '@': resolve('src')
    }
  },
  plugins: [react()]
})
