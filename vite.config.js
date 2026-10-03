import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: false,
      workbox: {
        // Cachea solo el "cascarón" de la app (HTML/CSS/JS/iconos), nunca datos de Supabase
        globPatterns: ['**/*.{js,css,html,png,svg}'],
        navigateFallbackDenylist: [/^\/admin/], // evita servir la app en caché dentro del panel admin tras un despliegue
        runtimeCaching: [
          {
            // Nunca cachear peticiones a Supabase: siempre red, nunca datos viejos de saldo
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
});