/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Les tests d'intégration des Edge Functions (tests/fonctions) ont leur propre configuration.
    include: ['src/**/*.test.{ts,tsx}', 'supabase/functions/**/*.test.ts'],
    // Les formulaires complets (saisie du dimanche, réunion) dépassent 5 s quand le poste ou le
    // runner de CI est chargé : 15 s évite des échecs de délai qui ne disent rien du code.
    testTimeout: 15000,
  },
})
