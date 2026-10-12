import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { generate } from 'otplib'
import {
  AVEC_BASE,
  attendreTourDeVerification,
  fichierSession,
  suivreRequetesDeDonnees,
} from './comptes.ts'
import type { CompteTest } from './comptes.ts'
import { jetonAcces, lire } from './base/outils-evenements.ts'
import { verifierAdresseLocale } from './installer-comptes.ts'

// Écran 13, « Ministères et comptes » (lot L1), avec la base locale, Auth, Mailpit et les Edge
// Functions de comptes : projet « ecritures » (en série, à 1440 px, après les projets de
// lecture). L'administration crée un ministère « Tech » (T48 : l'alias « +ministere » d'une
// adresse d'EJP Tech), lit l'invitation dans la boîte locale, la relance, désactive puis réactive
// le ministère, le compte active son code (par l'API, comme e2e/installer-comptes.ts), puis
// l'administration refait l'activation. À la fin (test.afterAll, même après un échec), le
// ministère d'essai est désactivé : il ne compte plus dans les totaux des parcours suivants. Les
// quatre autres profils reçoivent la page non disponible, sans requête de données ni appel de
// fonction.
//
// Sans base (E2E_BASE absent), tout est ignoré. En local, sans edge runtime ou sans Mailpit, le
// parcours de l'administration est ignoré avec sa raison ; en CI (le job « e2e » démarre l'edge
// runtime), il échoue.

// Le suffixe s'écrit en lettres : 5 chiffres de suite ressemblent à une donnée personnelle.
const SUFFIXE = `${Date.now()}`.replace(/\d/g, (chiffre) => 'abcdefghij'.charAt(Number(chiffre)))
const NOM = `Tech essai ${SUFFIXE}`
const EMAIL = `ejptech1+ministere-${SUFFIXE}@exemple.test`
const PAGE_NON_DISPONIBLE = "Cette page n'est pas disponible avec votre compte."
const MOT_DE_PASSE = `essai-l1-${SUFFIXE}-Aa1!`

test.describe.configure({ mode: 'serial' })
test.skip(!AVEC_BASE, 'Parcours avec la base locale seulement (E2E_BASE=1).')

function adresseBase(): string {
  const url = process.env.VITE_SUPABASE_URL
  if (!url) throw new Error('VITE_SUPABASE_URL manque.')
  return verifierAdresseLocale(url).toString().replace(/\/$/, '')
}

/** Boîte de test de la CLI Supabase (Mailpit), sur l'hôte de la pile locale. */
function adresseMailpit(): string {
  const base = new URL(adresseBase())
  return process.env.E2E_MAILPIT_URL ?? `http://${base.hostname}:54324`
}

type MessageMailpit = { Subject: string; To: { Address: string }[] }

/** Messages reçus par une adresse dans la boîte locale. */
async function messagesPour(page: Page, email: string): Promise<MessageMailpit[]> {
  const reponse = await page.request.get(
    `${adresseMailpit()}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`,
  )
  expect(reponse.ok()).toBe(true)
  const corps = (await reponse.json()) as { messages?: MessageMailpit[] }
  return corps.messages ?? []
}

/** Ligne du compte d'essai dans v_etat_comptes, lue par l'administration. */
async function compteDuTest(page: Page) {
  const [ligne] = await lire<{ user_id: string; etat: string; ministere_id: string }>(
    page,
    `v_etat_comptes?select=user_id,etat,ministere_id&email=eq.${encodeURIComponent(EMAIL)}`,
  )
  if (!ligne) throw new Error("Le compte d'essai est introuvable.")
  return ligne
}

const bouton = (page: Page, nom: string) => page.getByRole('button', { name: nom, exact: true })
const reussite = (page: Page) => page.getByRole('status').filter({ hasText: /\S/ })

async function ouvrirComptes(page: Page) {
  await page.goto('/comptes')
  await expect(page.getByRole('heading', { level: 1, name: 'Ministères et comptes' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Ministères', exact: true })).toBeVisible()
}

test.describe("l'administration gère le compte d'un nouveau ministère", () => {
  test.use({ storageState: fichierSession('admin_eglise') })

  test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext()
    const fonction = await request
      .fetch(`${adresseBase()}/functions/v1/creer-compte`, { method: 'OPTIONS' })
      .catch(() => null)
    const boite = await request.get(`${adresseMailpit()}/api/v1/messages`).catch(() => null)
    const fonctionsPretes = fonction !== null && fonction.status() === 204
    const boitePrete = boite !== null && boite.ok()
    await request.dispose()
    const raison = !fonctionsPretes
      ? "Edge runtime arrêté : ce parcours demande npx supabase start avec l'edge runtime."
      : !boitePrete
        ? 'Boîte locale (Mailpit) injoignable.'
        : null
    if (raison === null) return
    // En CI, ce parcours doit tourner : un service absent fait échouer, jamais ignorer en silence.
    if (process.env.CI) throw new Error(`${raison} Le job « e2e » doit démarrer ce service.`)
    test.skip(true, raison)
  })

  // Nettoyage, même si un test du parcours a échoué (les suivants sont alors sautés) : le
  // ministère d'essai encore actif est désactivé par desactiver-compte, avec la session de
  // l'administration, pour qu'il ne compte pas dans les totaux et la complétude des parcours
  // suivants.
  test.afterAll(async ({ browser }, infos) => {
    const contexte = await browser.newContext({
      storageState: fichierSession('admin_eglise'),
      baseURL: infos.project.use.baseURL,
    })
    try {
      const page = await contexte.newPage()
      await ouvrirComptes(page)
      const [ligne] = await lire<{ user_id: string; etat: string }>(
        page,
        `v_etat_comptes?select=user_id,etat&email=eq.${encodeURIComponent(EMAIL)}`,
      )
      if (!ligne || ligne.etat === 'desactive') return
      const reponse = await page.request.post(`${adresseBase()}/functions/v1/desactiver-compte`, {
        headers: {
          apikey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
          Authorization: `Bearer ${await jetonAcces(page)}`,
          'Content-Type': 'application/json',
        },
        data: { user_id: ligne.user_id },
      })
      expect(reponse.status(), 'désactivation du ministère d’essai').toBe(200)
    } finally {
      await contexte.close()
    }
  })

  test('crée le ministère et lit l’invitation dans la boîte locale', async ({ page }) => {
    await ouvrirComptes(page)
    await bouton(page, 'Ajouter un ministère').click()
    await page.getByRole('textbox', { name: 'Nom du ministère', exact: true }).fill(NOM)
    await page.getByRole('textbox', { name: 'Email partagé du ministère', exact: true }).fill(EMAIL)
    await bouton(page, "Créer le ministère et envoyer l'invitation").click()
    await expect(reussite(page)).toHaveText(`Ministère ${NOM} créé. Invitation envoyée à ${EMAIL}.`)
    await expect(bouton(page, `Relancer l'invitation ${NOM}`)).toBeVisible()

    const compte = await compteDuTest(page)
    expect(compte.etat).toBe('invitation_envoyee')
    const [ministere] = await lire<{ nom: string; desactive_le: string | null }>(
      page,
      `ministere?select=nom,desactive_le&id=eq.${compte.ministere_id}`,
    )
    expect(ministere).toEqual({ nom: NOM, desactive_le: null })
    // Journal : le ministère et le compte, au nom de l'administration, jamais l'adresse.
    const journal = await lire<{ action: string; detail: unknown }>(
      page,
      `journal?select=action,detail&cible_id=in.(${compte.ministere_id},${compte.user_id})`,
    )
    expect(journal.map((ligne) => ligne.action).sort()).toEqual(['compte_cree', 'ministere_cree'])
    expect(JSON.stringify(journal)).not.toContain(EMAIL)

    await expect
      .poll(async () => (await messagesPour(page, EMAIL)).length, { timeout: 15_000 })
      .toBe(1)
    const [message] = await messagesPour(page, EMAIL)
    expect(message?.Subject).toBe('Votre accès à Pilotage EJP')
  })

  test('relance l’invitation : un deuxième message arrive', async ({ page }) => {
    test.setTimeout(150_000)
    await ouvrirComptes(page)
    // Auth espace deux envois vers la même adresse ; un refus « trop récent » se réessaie une fois.
    for (let essai = 1; essai <= 2; essai += 1) {
      await page.waitForTimeout(essai === 1 ? 2_000 : 61_000)
      await bouton(page, `Relancer l'invitation ${NOM}`).click()
      const resultat = page
        .getByRole('status')
        .or(page.getByRole('alert'))
        .filter({ hasText: /\S/ })
      await expect(resultat.first()).toBeVisible()
      if ((await reussite(page).count()) > 0) break
    }
    await expect(reussite(page)).toHaveText(`Invitation renvoyée à ${EMAIL}.`)
    await expect
      .poll(async () => (await messagesPour(page, EMAIL)).length, { timeout: 15_000 })
      .toBe(2)
  })

  test('désactive le ministère, puis le réactive', async ({ page }) => {
    await ouvrirComptes(page)
    await bouton(page, `Désactiver ${NOM}`).click()
    const fenetre = page.getByRole('alertdialog', { name: `Désactiver ${NOM} ?` })
    await expect(fenetre).toContainText(`Plus personne ne pourra se connecter avec ${EMAIL}.`)
    await fenetre.getByRole('button', { name: 'Désactiver le ministère' }).click()
    await expect(reussite(page)).toHaveText(`Ministère ${NOM} désactivé.`)
    await expect(bouton(page, `Réactiver ${NOM}`)).toBeVisible()
    expect((await compteDuTest(page)).etat).toBe('desactive')

    await bouton(page, `Réactiver ${NOM}`).click()
    await expect(reussite(page)).toHaveText(`Ministère ${NOM} réactivé.`)
    await expect(bouton(page, `Relancer l'invitation ${NOM}`)).toBeVisible()
    expect((await compteDuTest(page)).etat).toBe('invitation_envoyee')
  })

  test('le compte active son code, puis l’administration refait l’activation', async ({ page }) => {
    await ouvrirComptes(page)
    const { user_id: id } = await compteDuTest(page)

    // Le compte accepte l'invitation et active son code (API locale, comme le script
    // d'installation : clé secrète locale lue dans l'environnement du test, jamais VITE_).
    const cleSecrete = process.env.E2E_CLE_SECRETE_LOCALE
    const clePublique = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    if (!cleSecrete || !clePublique) throw new Error('Clés locales absentes (voir le job « e2e »).')
    const options = {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }
    const admin = createClient(adresseBase(), cleSecrete, options)
    const { error: erreurConfirmation } = await admin.auth.admin.updateUserById(id, {
      password: MOT_DE_PASSE,
      email_confirm: true,
    })
    expect(erreurConfirmation).toBeNull()
    const client = createClient(adresseBase(), clePublique, options)
    const { error: erreurConnexion } = await client.auth.signInWithPassword({
      email: EMAIL,
      password: MOT_DE_PASSE,
    })
    expect(erreurConnexion).toBeNull()
    const { data: facteur, error: erreurEnrolement } = await client.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'Pilotage EJP',
      friendlyName: 'Pilotage EJP',
    })
    expect(erreurEnrolement).toBeNull()
    if (!facteur) throw new Error('Enrôlement refusé.')
    await attendreTourDeVerification()
    const { error: erreurCode } = await client.auth.mfa.challengeAndVerify({
      factorId: facteur.id,
      code: await generate({ secret: facteur.totp.secret }),
    })
    expect(erreurCode).toBeNull()
    await client.auth.signOut({ scope: 'local' })

    await ouvrirComptes(page)
    expect((await compteDuTest(page)).etat).toBe('activee')
    await bouton(page, `Refaire l'activation ${NOM}`).click()
    const fenetre = page.getByRole('alertdialog', { name: `Refaire l'activation de ${NOM} ?` })
    await expect(fenetre).toContainText(
      "Changez d'abord le mot de passe de la boîte mail du ministère.",
    )
    await fenetre.getByRole('button', { name: "Refaire l'activation" }).click()
    await expect(reussite(page)).toContainText(`Activation à refaire pour Ministère ${NOM}.`)
    expect((await compteDuTest(page)).etat).toBe('a_activer')
    // Le mot de passe d'essai ne sert plus : la fonction l'a remplacé.
    const { error: ancien } = await client.auth.signInWithPassword({
      email: EMAIL,
      password: MOT_DE_PASSE,
    })
    expect(ancien).not.toBeNull()
  })
})

const AUTRES_PROFILS: CompteTest['profil'][] = [
  'ministere',
  'berger',
  'conseil',
  'admin_plateforme',
]

for (const profil of AUTRES_PROFILS) {
  test.describe(`profil ${profil}`, () => {
    test.use({ storageState: fichierSession(profil) })

    test('/comptes : page non disponible, sans requête de données ni appel de fonction', async ({
      page,
    }) => {
      const requetes = suivreRequetesDeDonnees(page)
      const fonctions: string[] = []
      page.on('request', (requete) => {
        if (new URL(requete.url()).pathname.startsWith('/functions/v1/')) {
          fonctions.push(requete.url())
        }
      })
      await page.goto('/comptes')
      await expect(page.getByRole('heading', { level: 1, name: PAGE_NON_DISPONIBLE })).toBeVisible()
      expect(requetes.filter((chemin) => chemin !== '/rest/v1/compte')).toEqual([])
      expect(fonctions).toEqual([])
    })
  })
}
