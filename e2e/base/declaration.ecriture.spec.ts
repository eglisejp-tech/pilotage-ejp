import { expect, test } from '@playwright/test'
import type { Browser, Page } from '@playwright/test'
import { COMPTE_CONDITIONS, declarerPrenom, fichierSession, seConnecter } from '../comptes.ts'
import { ajouter, aujourdhuiDeLaBase, jetonAcces, lire, plusJours } from './outils-evenements.ts'

// « Qui utilise l'outil ? » (T56) avec la base locale : projet « ecritures » (en série, 1440 px).
// Le compte partagé de Prodiges Junior (installé par le parcours des conditions, qui passe avant)
// se connecte dans un premier navigateur et déclare « Marie D. », note son jour d'utilisation
// comme l'écran (upsert de PostgREST), puis déclare sa prochaine réunion. EJP Tech lit
// « Ministère Prodiges Junior (Marie D.) » dans le Journal technique et Marie D. dans
// « Personnes », avec un jour d'utilisation au moins. Le berger et l'administration de l'église
// ne lisent aucun prénom. Une seconde connexion du même compte, dans un autre navigateur, déclare
// un second prénom, propre à chaque exécution (le parcours écrit en base sans rien effacer) : les
// deux connexions apparaissent chez EJP Tech.

test.describe.configure({ mode: 'serial' })

const COMPTE = COMPTE_CONDITIONS
const TITRE = "Qui utilise l'outil ?"

/** « Paul Kqz » : trois lettres tirées au hasard, sans chiffre (la base refuse les chiffres). */
function prenomUnique(): string {
  const lettre = () => String.fromCharCode(97 + Math.floor(Math.random() * 26))
  return `Paul ${lettre().toUpperCase()}${lettre()}${lettre()}`
}
const SECOND_PRENOM = prenomUnique()

/** Connexion du compte partagé, jusqu'à l'écran de déclaration (les conditions acceptées s'il le faut). */
async function connecterJusquALaDeclaration(page: Page) {
  await seConnecter(page, COMPTE.email, { prenom: null })
  if (new URL(page.url()).pathname === '/conditions-a-accepter') {
    await page.getByRole('checkbox', { name: /J'accepte les conditions d'utilisation/ }).check()
    await page.getByRole('button', { name: 'Accepter et continuer' }).click()
  }
  await expect(page).toHaveURL(/\/qui-utilise/)
  await expect(page.getByRole('heading', { level: 1, name: TITRE })).toBeVisible()
}

async function ouvrirAvec(
  browser: Browser,
  profil: 'admin_plateforme' | 'berger' | 'admin_eglise',
) {
  const contexte = await browser.newContext({ storageState: fichierSession(profil) })
  return { contexte, page: await contexte.newPage() }
}

/** Identifiant du compte de la page, lu dans son jeton (la ligne `compte` de tous est lisible). */
async function idDuCompte(page: Page): Promise<string> {
  const charge = (await jetonAcces(page)).split('.')[1] ?? ''
  const { sub } = JSON.parse(Buffer.from(charge, 'base64url').toString('utf8')) as {
    sub?: string
  }
  if (!sub) throw new Error('Jeton sans compte.')
  return sub
}

/** Le jour d'utilisation, noté comme l'écran le fait (`noterPassage`) : upsert sans doublon. */
async function noterPassageCommeLEcran(page: Page, declaration: number) {
  const url = process.env.VITE_SUPABASE_URL
  const cle = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !cle) throw new Error('VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY manquent.')
  return page.request.post(`${url}/rest/v1/passage?on_conflict=intervenant_id,jour`, {
    headers: {
      apikey: cle,
      Authorization: `Bearer ${await jetonAcces(page)}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates',
    },
    data: { intervenant_id: declaration },
  })
}

test('un compte de ministère déclare « Marie D. », saisit, et EJP Tech seul lit le prénom', async ({
  page,
  browser,
}) => {
  test.setTimeout(180_000)
  await connecterJusquALaDeclaration(page)
  // Ni onglets ni données avant la déclaration ; une saisie invalide est refusée.
  await expect(page.getByRole('navigation')).toHaveCount(0)
  await page.getByLabel('Votre prénom').fill('marie@exemple.test')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(page.getByText('Écrivez seulement votre prénom, en lettres.')).toBeVisible()
  await declarerPrenom(page, 'Marie D.')
  await expect(page).toHaveTitle('Ma semaine, Pilotage EJP')
  await expect(page.getByRole('banner')).toContainText('Vous : Marie D.')

  // Le compte ne lit que sa propre déclaration.
  const [declaration] = await lire<{ id: number; prenom: string }>(
    page,
    'v_ma_declaration?select=id,prenom',
  )
  expect(declaration?.prenom).toBe('Marie D.')
  expect(await lire(page, 'intervenant?select=prenom')).toEqual([{ prenom: 'Marie D.' }])

  // Le jour d'utilisation, deux fois comme deux relectures de la page : accepté, sans doublon.
  for (const fois of [1, 2]) {
    const passage = await noterPassageCommeLEcran(page, declaration?.id ?? 0)
    expect(passage.status(), `passage ${fois}`).toBe(201)
  }

  // Une saisie : sa prochaine réunion, sur son propre ministère.
  const id = await idDuCompte(page)
  const [compte] = await lire<{ ministere_id: string }>(
    page,
    `compte?select=ministere_id&user_id=eq.${id}`,
  )
  expect(compte?.ministere_id).toBeTruthy()
  const aujourdhui = await aujourdhuiDeLaBase(page)
  const reponse = await ajouter(page, 'reunion', {
    ministere_id: compte?.ministere_id,
    date: plusJours(aujourdhui, 5),
  })
  expect(reponse.status()).toBe(201)

  // EJP Tech : la ligne du journal porte le prénom, et « Personnes » le montre.
  const tech = await ouvrirAvec(browser, 'admin_plateforme')
  await tech.page.goto('/journal-technique')
  await expect(
    tech.page.getByRole('heading', { level: 1, name: 'Journal technique' }),
  ).toBeVisible()
  await expect(
    tech.page
      .getByRole('list', { name: 'Lignes du journal' })
      .getByText(`${COMPTE.libelle} (Marie D.)`)
      .first(),
  ).toBeVisible()
  const personnes = await lire<{ prenom: string; jours_30_jours: number }>(
    tech.page,
    `v_personnes?select=prenom,jours_30_jours&compte=eq.${id}`,
  )
  expect(personnes.find((p) => p.prenom === 'Marie D.')?.jours_30_jours).toBeGreaterThanOrEqual(1)
  await tech.page.goto('/personnes')
  await expect(tech.page.getByRole('heading', { level: 1, name: 'Personnes' })).toBeVisible()
  const actives = tech.page.getByRole('region', { name: 'Actives sur 30 jours' })
  await expect(actives.getByRole('heading', { level: 3, name: COMPTE.libelle })).toBeVisible()
  await expect(actives.getByText('Marie D.', { exact: true })).toBeVisible()
  await tech.contexte.close()

  // Le berger et l'administration de l'église : aucun prénom, ni à l'écran ni par l'API.
  for (const profil of ['berger', 'admin_eglise'] as const) {
    const lecteur = await ouvrirAvec(browser, profil)
    await lecteur.page.goto('/journal')
    await expect(lecteur.page.getByRole('heading', { level: 1, name: 'Journal' })).toBeVisible()
    await expect(lecteur.page.getByText(/Marie D\./)).toHaveCount(0)
    expect(await lire(lecteur.page, 'intervenant?select=prenom'), profil).toEqual([])
    expect(await lire(lecteur.page, 'v_personnes?select=prenom'), profil).toEqual([])
    expect(await lire(lecteur.page, 'v_journal_intervenant?select=prenom'), profil).toEqual([])
    await lecteur.page.goto('/personnes')
    await expect(
      lecteur.page.getByText("Cette page n'est pas disponible avec votre compte."),
    ).toBeVisible()
    await lecteur.contexte.close()
  }
})

test('une seconde connexion du même compte, ailleurs, déclare un autre prénom : deux connexions chez EJP Tech', async ({
  browser,
}) => {
  test.setTimeout(180_000)
  const ailleurs = await browser.newContext()
  const page = await ailleurs.newPage()
  await connecterJusquALaDeclaration(page)
  // Une autre session : la déclaration de Marie ne la concerne pas.
  expect(await lire(page, 'v_ma_declaration?select=prenom')).toEqual([])
  expect(await lire(page, 'intervenant?select=prenom')).toEqual([])
  await declarerPrenom(page, SECOND_PRENOM)
  await expect(page.getByRole('banner')).toContainText(`Vous : ${SECOND_PRENOM}`)
  await ailleurs.close()

  const tech = await ouvrirAvec(browser, 'admin_plateforme')
  await tech.page.goto('/personnes')
  const connexions = tech.page.getByRole('region', { name: 'Dernières connexions' })
  await expect(connexions.getByText(`${COMPTE.libelle}, ${SECOND_PRENOM}`)).toHaveCount(1)
  await expect(connexions.getByText(`${COMPTE.libelle}, Marie D.`).first()).toBeVisible()
  const actives = tech.page.getByRole('region', { name: 'Actives sur 30 jours' })
  await expect(actives.getByText(SECOND_PRENOM, { exact: true })).toBeVisible()
  await expect(actives.getByText('Marie D.', { exact: true })).toBeVisible()
  await tech.contexte.close()
})
