/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Modo demo comercial (`npm run build:demo`, ver src/lib/demo.js):
// usa public-demo/ en vez de public/ para que el build no publique logos
// ni el manual de marca del cliente, y cambia título e íconos del HTML.
function demoHtml() {
  return {
      name: 'demo-html',
      transformIndexHtml(html) {
        return html
          .replace('<html lang="es">', '<html lang="es" data-demo>')
          .replace(/<title>.*<\/title>/, '<title>Bitácora · Demo</title>')
          .replace(/\s*<link rel="icon"[^>]*>/, '\n    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />')
          .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, '')
      },
    }
  }

  export default defineConfig(({ mode }) => {
    const demo = loadEnv(mode, process.cwd(), '').VITE_DEMO_MODE === 'true'
    return {
    plugins: [react(), demo && demoHtml()],
    publicDir: demo ? 'public-demo' : 'public',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.js'],
      css: false,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        exclude: [
          'node_modules/**',
          'src/test/**',
          '**/*.config.{js,ts}',
          '**/*.test.{js,jsx}',
          'src/main.jsx',
        ],
      },
    },
  }
})
