import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { generate } from 'otplib'

// Comptes d'exemple de supabase/seed.sql, pour les parcours avec la base locale (CI, ou poste
// avec Docker). Le mot de passe et les secrets TOTP sont des valeurs de test fixes, écrites dans
// seed.sql : jamais de vrais secrets, jamais un projet distant.

/** Les parcours avec la base ne tournent que si E2E_BASE=1 (job « e2e » de la CI). */
export const AVEC_BASE = process.env.E2E_BASE === '1'

export const MOT_DE_PASSE_TEST = 'essai-local-pilotage-ejp'

export type CompteTest = {
  profil: 'ministere' | 'berger' | 'conseil' | 'admin_eglise' | 'admin_plateforme'
  email: string
  libelle: string
  /** Secret TOTP de seed.sql ; absent pour le compte laissé sans facteur. */
  secret?: string
  accueil: { chemin: string; titre: string }
  onglets: string[]
  /** Adresse réservée à un autre profil. */
  adresseInterdite: string
}

/** Un compte par profil : chacun passe une fois par les écrans 16 et 18 (projet « connexion »). */
export const COMPTES_PROFILS: CompteTest[] = [
  {
    profil: 'ministere',
    email: 'communication@exemple.test',
    libelle: 'Ministère Communication',
    secret: 'YJTOKMCFVXDQLKWSSDG62WS4CBUNIOWU',
    accueil: { chemin: '/', titre: 'Cette semaine' },
    onglets: ['Cette semaine', 'Ma fiche', 'Mes points', 'Mon journal'],
    adresseInterdite: '/ministeres',
  },
  {
    profil: 'berger',
    email: 'berger@exemple.test',
    libelle: 'Berger',
    secret: 'PAZKKX42TXYWVHS4EANMAHL6HNIQSIIY',
    accueil: { chemin: '/', titre: 'Cette semaine' },
    onglets: ['Cette semaine', 'Ministères', "Points d'attention", 'Journal'],
    adresseInterdite: '/moderation',
  },
  {
    profil: 'conseil',
    email: 'conseil1@exemple.test',
    libelle: 'Conseil, compte 1',
    secret: 'EK2Z5HTKXWGENCEU64D5P3G37MVGXZJY',
    accueil: { chemin: '/', titre: 'Cette semaine' },
    onglets: ['Cette semaine', 'Ministères', "Points d'attention", 'Journal'],
    adresseInterdite: '/comptes',
  },
  {
    profil: 'admin_eglise',
    email: 'administration@exemple.test',
    libelle: "Administration de l'église",
    secret: 'RVZWRYDFFXXUBQR5LUD4RQMD5OHHCW3U',
    accueil: { chemin: '/', titre: 'Cette semaine' },
    onglets: ['Cette semaine', 'Ministères et comptes', 'Sessions', 'Journal'],
    adresseInterdite: '/points',
  },
  {
    profil: 'admin_plateforme',
    email: 'ejptech1@exemple.test',
    libelle: 'EJP Tech, compte 1',
    secret: 'UC42SX5DFYC556NXA5SXZDGRALYXXHA4',
    accueil: { chemin: '/moderation', titre: 'Modération' },
    onglets: ['Modération', 'Journal technique'],
    adresseInterdite: '/ma-fiche',
  },
]

/** Compte pour le parcours « Se déconnecter » (sa propre session, pas celle des autres tests). */
export const COMPTE_DECONNEXION = {
  email: 'conseil3@exemple.test',
  libelle: 'Conseil, compte 3',
  secret: 'LR4FVZOOEIUXAOWPBYAQZYODFLZP45W7',
}

/** Compte laissé sans facteur dans seed.sql : il doit passer par l'activation. */
export const COMPTE_SANS_FACTEUR = {
  email: 'formation@exemple.test',
  libelle: 'Ministère EJP Formation',
}

export const fichierSession = (profil: CompteTest['profil']) => `e2e/.auth/${profil}.json`

/**
 * Code TOTP du moment (otplib 13). Près de la fin d'une période de 30 s, on attend la suivante :
 * le code saisi reste valable le temps de l'envoi.
 */
export async function codeTotp(secret: string): Promise<string> {
  const resteDansLaPeriode = 30 - (Math.floor(Date.now() / 1000) % 30)
  if (resteDansLaPeriode < 5) await new Promise((fin) => setTimeout(fin, resteDansLaPeriode * 1000))
  return generate({ secret })
}

/** Écran 16 : email et mot de passe. */
export async function saisirMotDePasse(page: Page, email: string) {
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE_TEST)
  await page.getByRole('button', { name: 'Se connecter' }).click()
}

/** Écrans 16 puis 18 : mot de passe, puis code à 6 chiffres. */
export async function seConnecter(page: Page, email: string, secret: string) {
  await page.goto('/connexion')
  await saisirMotDePasse(page, email)
  await expect(page.getByRole('heading', { level: 1, name: 'Code de vérification' })).toBeVisible()
  await page.getByLabel('Code à 6 chiffres').fill(await codeTotp(secret))
  await page.getByRole('button', { name: 'Vérifier' }).click()
}

/** Chemins des requêtes de données (PostgREST) faites par la page. */
export function suivreRequetesDeDonnees(page: Page): string[] {
  const chemins: string[] = []
  page.on('request', (requete) => {
    const url = new URL(requete.url())
    if (url.pathname.startsWith('/rest/v1/')) chemins.push(url.pathname)
  })
  return chemins
}

/** Ouvre le menu sous 1024 px ; à partir de 1024 px, les onglets sont déjà dans l'en-tête. */
export async function ouvrirMenuSiBesoin(page: Page) {
  const bouton = page.getByRole('button', { name: 'Ouvrir le menu' })
  if (await bouton.isVisible()) await bouton.click()
}
