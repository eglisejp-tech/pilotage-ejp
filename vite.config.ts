/// <reference types="vitest/config" />
import { realpathSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, searchForWorkspaceRoot } from 'vite'

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

/**
 * Version du site (T76) : le sha court du commit construit, que GitHub Actions donne dans
 * GITHUB_SHA (job « Mise en ligne » compris), sinon « local ». Elle part dans X-Client-Info de
 * chaque appel à Supabase (src/lib/transport.ts). Ce n'est pas un secret.
 */
function versionSite(): string {
  const sha = process.env.GITHUB_SHA?.trim().toLowerCase() ?? ''
  return /^[0-9a-f]{7,40}$/.test(sha) ? sha.slice(0, 7) : 'local'
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Vite lit process.env avant les fichiers .env : la valeur réduite remplace la leur.
  process.env.VITE_SITE_URL = adresseSite(loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL)
  return {
    plugins: [react(), tailwindcss()],
    define: { __VERSION_SITE__: JSON.stringify(versionSite()) },
    resolve: {
      alias: [
        // Au build seulement : les aperçus de développement (src/app/routesDeDeveloppement.tsx)
        // deviennent une liste vide, et leur code sort du bundle (découpage par écran). Le
        // serveur de développement et les tests gardent les aperçus. Avant « @ », plus général.
        ...(command === 'build'
          ? [
              {
                find: /^@\/app\/routesDeDeveloppement$/,
                replacement: fileURLToPath(
                  new URL('./src/app/routesDeDeveloppementAbsentes.ts', import.meta.url),
                ),
              },
            ]
          : []),
        { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      ],
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
  }
})
