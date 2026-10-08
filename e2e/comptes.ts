import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { generate } from 'otplib'

// Comptes d'exemple de supabase/seed.sql, pour les parcours avec la base locale (CI, ou poste
// avec Docker). Le script e2e/installer-comptes.ts leur donne un mot de passe de test et un
// facteur TOTP par l'API (BRIEF section 8, « Tests obligatoires ») ; les secrets restent dans
// e2e/.auth/, hors du dépôt, et ne s'affichent jamais.

/** Les parcours avec la base ne tournent que si E2E_BASE=1 (job « e2e » de la CI). */
export const AVEC_BASE = process.env.E2E_BASE === '1'

/** Mot de passe de test, donné par le script aux comptes de la base locale seulement. */
export const MOT_DE_PASSE_TEST = 'essai-local-pilotage-ejp'

export const DOSSIER_AUTH = 'e2e/.auth'
export const FICHIER_SECRETS = `${DOSSIER_AUTH}/secrets-totp.json`
const FICHIER_RYTHME = `${DOSSIER_AUTH}/derniere-verification.txt`

/**
 * Comptes du jeu d'exemple, dans l'ordre d'installation : d'abord ceux qu'utilisent les tests,
 * pour que leur code d'enrôlement soit loin de leur code de connexion. EJP Formation reste sans
 * facteur et passe par l'activation.
 */
export const COMPTES_JEU_EXEMPLE: { email: string; avecFacteur: boolean }[] = [
  { email: 'communication@exemple.test', avecFacteur: true },
  { email: 'berger@exemple.test', avecFacteur: true },
  { email: 'conseil1@exemple.test', avecFacteur: true },
  { email: 'administration@exemple.test', avecFacteur: true },
  { email: 'ejptech1@exemple.test', avecFacteur: true },
  { email: 'conseil3@exemple.test', avecFacteur: true },
  { email: 'integration@exemple.test', avecFacteur: true },
  { email: 'coordination@exemple.test', avecFacteur: true },
  { email: 'jeunesse@exemple.test', avecFacteur: true },
  { email: 'social@exemple.test', avecFacteur: true },
  { email: 'fij@exemple.test', avecFacteur: true },
  { email: 'junior@exemple.test', avecFacteur: true },
  { email: 'formation@exemple.test', avecFacteur: false },
]

export type CompteTest = {
  profil: 'ministere' | 'berger' | 'conseil' | 'admin_eglise' | 'admin_plateforme'
  email: string
  libelle: string
  /**
   * Accueil du profil. `titre` : l'écran, lu dans le titre de l'onglet (« Cette semaine, Pilotage
   * EJP ») ; sur « / », le h1 est la phrase de la semaine (étape 3).
   */
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
    accueil: { chemin: '/', titre: 'Cette semaine' },
    onglets: ['Cette semaine', 'Ma fiche', 'Mes points', 'Mon journal'],
    adresseInterdite: '/ministeres',
  },
  {
    profil: 'berger',
    email: 'berger@exemple.test',
    libelle: 'Berger',
    accueil: { chemin: '/', titre: 'Cette semaine' },
    onglets: ['Cette semaine', 'Ministères', "Points d'attention", 'Journal'],
    adresseInterdite: '/moderation',
  },
  {
    profil: 'conseil',
    email: 'conseil1@exemple.test',
    libelle: 'Conseil, compte 1',
    accueil: { chemin: '/', titre: 'Cette semaine' },
    onglets: ['Cette semaine', 'Ministères', "Points d'attention", 'Journal'],
    adresseInterdite: '/comptes',
  },
  {
    profil: 'admin_eglise',
    email: 'administration@exemple.test',
    libelle: "Administration de l'église",
    accueil: { chemin: '/', titre: 'Cette semaine' },
    onglets: ['Cette semaine', 'Ministères et comptes', 'Sessions', 'Indicateurs', 'Journal'],
    adresseInterdite: '/points',
  },
  {
    profil: 'admin_plateforme',
    email: 'ejptech1@exemple.test',
    libelle: 'EJP Tech, compte 1',
    accueil: { chemin: '/moderation', titre: 'Modération' },
    onglets: ['Modération', 'Indicateurs', 'Cette semaine', 'Journal technique'],
    adresseInterdite: '/ma-fiche',
  },
]

/** Compte pour le parcours « Se déconnecter » (sa propre session, pas celle des autres tests). */
export const COMPTE_DECONNEXION = { email: 'conseil3@exemple.test', libelle: 'Conseil, compte 3' }

/**
 * Compte qui n'a pas accepté les conditions (T53) : le script d'installation accepte la version
 * courante pour tous les autres comptes à facteur, pour que les parcours existants ne voient pas
 * l'écran d'acceptation. Seul e2e/base/acceptation-conditions.ecriture.spec.ts utilise ce compte.
 */
export const COMPTE_CONDITIONS = {
  email: 'junior@exemple.test',
  libelle: 'Ministère Prodiges Junior',
}

/** Compte laissé sans facteur par le script : il doit passer par l'activation. */
export const COMPTE_SANS_FACTEUR = {
  email: 'formation@exemple.test',
  libelle: 'Ministère EJP Formation',
}

export const fichierSession = (profil: CompteTest['profil']) => `${DOSSIER_AUTH}/${profil}.json`

/** Secret TOTP écrit par le script d'installation (jamais affiché). */
export function secretDe(email: string): string {
  const secrets = JSON.parse(readFileSync(FICHIER_SECRETS, 'utf8')) as Record<string, string>
  const secret = secrets[email]
  if (!secret) throw new Error(`Aucun secret de test pour ${email} : lancez l'installation.`)
  return secret
}

export async function enregistrerSecrets(secrets: Record<string, string>) {
  await mkdir(DOSSIER_AUTH, { recursive: true })
  await writeFile(FICHIER_SECRETS, JSON.stringify(secrets), { mode: 0o600 })
}

const attendre = (ms: number) => new Promise((fin) => setTimeout(fin, ms))

/**
 * Supabase limite la vérification des codes à 15 par minute et par adresse IP (BRIEF section 8),
 * sans réglage local dans config.toml : chaque vérification attend 4,5 s après la précédente
 * (moins de 14 par minute), pour le script comme pour les tests qui se connectent.
 */
export async function attendreTourDeVerification() {
  await mkdir(DOSSIER_AUTH, { recursive: true })
  const derniere = Number(await readFile(FICHIER_RYTHME, 'utf8').catch(() => '0')) || 0
  const attente = derniere + 4_500 - Date.now()
  if (attente > 0) await attendre(attente)
  await writeFile(FICHIER_RYTHME, String(Date.now()))
}

/**
 * Code TOTP du moment (otplib 13), après le tour de vérification. Près de la fin d'une période
 * de 30 s, on attend la suivante : le code reste valable le temps de l'envoi.
 */
export async function codeTotp(secret: string): Promise<string> {
  await attendreTourDeVerification()
  const resteDansLaPeriode = 30 - (Math.floor(Date.now() / 1000) % 30)
  if (resteDansLaPeriode < 5) await attendre(resteDansLaPeriode * 1000)
  return generate({ secret })
}

/** Écran 16 : email et mot de passe. */
export async function saisirMotDePasse(page: Page, email: string) {
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE_TEST)
  await page.getByRole('button', { name: 'Se connecter' }).click()
}

/** Écrans 16 puis 18 : mot de passe, puis code à 6 chiffres. */
export async function seConnecter(page: Page, email: string) {
  await page.goto('/connexion')
  await saisirMotDePasse(page, email)
  await expect(page.getByRole('heading', { level: 1, name: 'Code de vérification' })).toBeVisible()
  await page.getByLabel('Code à 6 chiffres').fill(await codeTotp(secretDe(email)))
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
