/// <reference types="vitest/config" />
import { realpathSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, searchForWorkspaceRoot } from 'vite'

/**
 * Dossier réel des polices @fontsource. Dans une copie de travail (git worktree) dont
 * node_modules est une jonction vers le dépôt principal, Vite suit la jonction : les polices
 * sont hors de la copie, et le serveur local les refusait (l'outil s'affichait alors en polices
 * de remplacement). Sans node_modules, la liste reste vide.
 */
function dossierPolices(): string[] {
  try {
    return [realpathSync(fileURLToPath(new URL('./node_modules/@fontsource', import.meta.url)))]
  } catch {
    return []
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // La racine habituelle de Vite, plus le dossier réel des polices.
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), ...dossierPolices()] },
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
