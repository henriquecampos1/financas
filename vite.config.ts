import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// No GitHub Pages o site fica em https://<usuario>.github.io/<repositorio>/.
// O workflow de publicação define BASE_PATH=/<repositorio>/; localmente é "/".
const base = process.env.BASE_PATH || '/'

const versao = `${process.env.npm_package_version ?? '0.0.0'} (${new Date().toISOString().slice(0, 16).replace('T', ' ')})`

export default defineConfig({
  base,
  define: {
    __VERSAO__: JSON.stringify(versao),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // O registro é feito no main.tsx com `registerSW` de `virtual:pwa-register`.
      injectRegister: false,
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icone.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        // As rotas usam # (HashRouter), então qualquer navegação cai no index.html.
        navigateFallback: 'index.html',
      },
      manifest: {
        id: base,
        name: 'Minhas Finanças',
        short_name: 'Finanças',
        description: 'Controle de gastos, cartões, planejamento e metas — tudo guardado no próprio aparelho.',
        lang: 'pt-BR',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        theme_color: '#0d7a5f',
        background_color: '#f5f6f8',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'apple-touch-icon-180x180.png', sizes: '180x180', type: 'image/png' },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
})
