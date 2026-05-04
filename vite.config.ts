import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'PUBG Mobile Performance Toolkit',
        short_name: 'PUBGM Toolkit',
        description:
          'Sensitivity Builder, HUD Layout Generator, Gyro Calibration, Recoil Pattern Lab, Headshot Drill Trainer, Weapon TTK Calculator, and more.',
        theme_color: '#f5a524',
        background_color: '#0b0d12',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
})
