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
// Parcours qui écrivent dans la base (étape 4, plan section 4) : suffixe `.ecriture.spec.ts`. Ils
// tournent seuls, dans le projet « ecritures », jamais dans un projet de lecture, car rien ne
// remet la base à zéro entre deux tests et les parcours de lecture comptent des chiffres exacts.
const parcoursEcriture = /\.ecriture\.spec\.ts$/
const ignores = avecBase
  ? [preparation, parcoursEcriture]
  : [preparation, parcoursEcriture, testsAvecBase]
const ignoresEcriture = avecBase ? [preparation] : [preparation, testsAvecBase]
const dependances = avecBase ? ['connexion'] : []
const projetsDeLecture = ['ordinateur', 'tablette', 'telephone']
// En CI, chaque format et les écritures tournent dans des jobs séparés, chacun avec sa base neuve
// (E2E_ECRITURES_SEULES=1 dans le job des écritures) : aucune lecture ne partage alors la base des
// écritures, qui n'attendent plus que la connexion.
const ecrituresSeules = process.env.E2E_ECRITURES_SEULES === '1'

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
    // Parcours en écriture : en série (un seul worker, tests dans l'ordre du fichier), à 1440 px,
    // et seulement après les trois projets de lecture, qui comptent des chiffres du jeu
    // d'exemple. Un parcours crée ses propres lignes (nom suffixé, événement du test) et compare
    // les comptes avant et après.
    {
      name: 'ecritures',
      testMatch: parcoursEcriture,
      testIgnore: ignoresEcriture,
      dependencies: ecrituresSeules ? dependances : projetsDeLecture,
      workers: 1,
      fullyParallel: false,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
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
