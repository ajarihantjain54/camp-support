import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'images/*.jpg'],
      manifest: {
        name: 'Camp Support',
        short_name: 'CampSupp',
        description: 'Staff support portal for the camp',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MiB
        runtimeCaching: [
          {
            // Cache read-only Supabase REST queries (GET) for offline ticket feed.
            // RPC calls (/rpc/) are explicitly excluded — they carry session tokens
            // and mutate data, so they must never be served from cache.
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/(?!rpc\/).*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  base: '/camp-support/',
});
