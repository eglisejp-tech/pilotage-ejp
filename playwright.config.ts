import { defineConfig, devices } from '@playwright/test'

// PORT_E2E permet de lancer plusieurs copies de travail en parallèle sans partager le serveur.
const port = Number(process.env.PORT_E2E ?? 5173)
const enCI = Boolean(process.env.CI)

// Trois formats de référence (BRIEF section 12) : ordinateur 1440, tablette 834, téléphone 390.
export default defineConfig({
  testDir: 'e2e',
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
    {
      name: 'ordinateur',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'tablette',
      use: { ...devices['Desktop Chrome'], viewport: { width: 834, height: 1194 }, hasTouch: true },
    },
    {
      name: 'telephone',
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
  },
})
