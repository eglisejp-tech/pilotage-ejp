import { defineConfig, devices } from '@playwright/test'

// PORT_E2E permet de lancer plusieurs copies de travail en parallèle sans partager le serveur.
const port = Number(process.env.PORT_E2E ?? 5173)
const enCI = Boolean(process.env.CI)
// Parcours avec la base locale (Supabase démarré par la CLI) : seulement si E2E_BASE=1, comme
// dans le job « e2e » de la CI. Sans base, seuls les aperçus et les écrans publics sont testés.
const avecBase = process.env.E2E_BASE === '1'

// Sans base, le client Supabase reçoit une adresse locale et une clé factice : les écrans
// publics et les aperçus ne font aucun appel. Avec la base, la CI fournit les vraies valeurs
// locales (npx supabase status -o env). Jamais de clé secrète ici.
const environnementNavigateur = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321',
  VITE_SUPABASE_PUBLISHABLE_KEY:
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_sans_base_locale',
}

const testsAvecBase = /base[\\/]/
const preparation = /\.setup\.ts$/
const ignores = avecBase ? [preparation] : [preparation, testsAvecBase]
const dependances = avecBase ? ['connexion'] : []

// Trois formats de référence (BRIEF section 12) : ordinateur 1440, tablette 834, téléphone 390.
export default defineConfig({
  testDir: 'e2e',
  // Avec la base : mot de passe et facteur TOTP de chaque compte d'exemple, par l'API, avant
  // tout parcours (e2e/installer-comptes.ts, adresse locale seulement).
  ...(avecBase ? { globalSetup: './e2e/installer-comptes.ts' } : {}),
  fullyParallel: true,
  forbidOnly: enCI,
  retries: enCI ? 1 : 0,
  reporter: enCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'on-first-retry',
  },
  projects: [
    // Une connexion par profil (mot de passe, puis code), réutilisée par les autres projets.
    ...(avecBase
      ? [
          {
            name: 'connexion',
            testMatch: preparation,
            retries: 0,
            use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
          },
        ]
      : []),
    {
      name: 'ordinateur',
      testIgnore: ignores,
      dependencies: dependances,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'tablette',
      testIgnore: ignores,
      dependencies: dependances,
      use: { ...devices['Desktop Chrome'], viewport: { width: 834, height: 1194 }, hasTouch: true },
    },
    {
      name: 'telephone',
      testIgnore: ignores,
      dependencies: dependances,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !enCI,
    timeout: 120_000,
    env: environnementNavigateur,
  },
})
