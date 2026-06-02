import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/*.svg', '*.png'],
      manifest: {
        name: 'DroneTarım',
        short_name: 'DroneTarım',
        description: 'Drone ile tarla ilaçlama iş yönetimi',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Tüm uygulama varlıklarını önceden cache'le
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json}'],
        // SPA: tüm navigasyonları index.html'e yönlendir (offline routing)
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // Yeni SW hemen devreye girsin, eski sekmeleri bekletmesin
        clientsClaim: true,
        skipWaiting: true,
        // Eski cache'leri temizle
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          // Google Fonts CSS → CacheFirst, 1 yıl
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-css',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Fonts dosyaları → CacheFirst, 1 yıl
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Dev modda da SW aktif olsun (offline test için)
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
})
