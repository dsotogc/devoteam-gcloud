import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: { sourcemap: false, assetsInlineLimit: 0 },
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/catalogo.json': 'http://localhost:8080',
    },
  },
})
