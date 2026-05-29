import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages alt-yol: https://cenkozgur.github.io/tarla-pano/
  base: command === 'build' ? '/tarla-pano/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Tarla Panosu',
        short_name: 'Tarla Pano',
        description: 'Çiftçi için günlük pano: hava, don/ilaçlama, fiyatlar, döviz',
        theme_color: '#15803d',
        background_color: '#f8faf5',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'tr',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // market.json'u network-first ile cache'le -> offline'da son veriyi goster
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('market.json'),
            handler: 'NetworkFirst',
            options: { cacheName: 'market-data', expiration: { maxEntries: 4, maxAgeSeconds: 86400 } },
          },
          {
            urlPattern: ({ url }) => url.hostname.includes('open-meteo.com'),
            handler: 'NetworkFirst',
            options: { cacheName: 'weather', expiration: { maxEntries: 16, maxAgeSeconds: 3600 } },
          },
        ],
      },
    }),
  ],
}))
