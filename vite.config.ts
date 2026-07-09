import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { mockApiPlugin } from './vite-plugins/mockApi'

export default defineConfig({
  plugins: [
    vue(),
    mockApiPlugin(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@mlc-ai/web-llm')) return 'web-llm'
          if (id.includes('pdfjs-dist')) return 'pdf'
          if (id.includes('xlsx')) return 'xlsx'
        },
      },
    },
  },
})
