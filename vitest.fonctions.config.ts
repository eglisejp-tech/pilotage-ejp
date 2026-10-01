// Tests d'intégration des Edge Functions de comptes, contre la pile Supabase locale
// (npx supabase start). Lancés par npm run test:fonctions, jamais par npm test.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/fonctions/**/*.test.ts'],
    environment: 'node',
    // Un seul fichier à la fois, tests dans l'ordre : ils partagent la base locale.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
})
