/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Project site живёт в подкаталоге: https://cyberpatriarch.github.io/fatecore-charlist/
  base: '/fatecore-charlist/',
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Fate Core — Анкеты',
        short_name: 'Fate Анкеты',
        description: 'Динамические анкеты персонажей для Fate Core',
        theme_color: '#8f3025',
        background_color: '#f4efe6',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        lang: 'ru',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallbackDenylist: [/^\/api\//]
      }
    })
  ]
})
