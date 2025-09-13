import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: '.',
  base: '/',
  publicDir: 'public',
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      input: {
        main: './index.html',
        login: './login.html',
        arboles: './arboles.html',
        clima: './clima.html',
        gastos: './gastos.html',
        produccion: './produccion.html',
        ventas: './ventas.html',
        precios: './precios.html',
        recordatorios: './recordatorios.html',
        tratamientos: './tratamientos.html',
        negocios: './negocios.html',
        riegos: './riegos.html'
      }
    }
  },
  
  server: {
    port: 3000,
    host: true,
    open: true
  },
  
  preview: {
    port: 4173,
    host: true
  },
  
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      '~': new URL('./public', import.meta.url).pathname
    }
  },
  
  optimizeDeps: {
    include: [
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/storage',
      'firebase/analytics'
    ]
  },
  
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true
      },
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Finca La Herradura',
        short_name: 'Finca Manager',
        description: 'Sistema integral de gestión agrícola',
        theme_color: '#22c55e',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});