/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

/**
 * Adresse publique du site (T70), pour l'image d'aperçu des liens : index.html écrit
 * %VITE_SITE_URL%, que Vite remplace au build. Sans valeur (poste local, CI hors mise en ligne),
 * l'adresse Cloudflare Pages du projet. Elle est réduite à son origine (sans chemin ni barre
 * finale) ; une adresse mal formée arrête le build plutôt que de publier un aperçu cassé.
 */
const ADRESSE_SITE_PAR_DEFAUT = 'https://pilotage-ejp.pages.dev'

function adresseSite(valeur: string | undefined): string {
  const texte = valeur?.trim() || ADRESSE_SITE_PAR_DEFAUT
  let url: URL
  try {
    url = new URL(texte)
  } catch {
    throw new Error(`VITE_SITE_URL n'est pas une adresse complète : « ${texte} »`)
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`VITE_SITE_URL doit commencer par https:// : « ${texte} »`)
  }
  return url.origin
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Vite lit process.env avant les fichiers .env : la valeur réduite remplace la leur.
  process.env.VITE_SITE_URL = adresseSite(loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL)
  return {
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
  }
})
