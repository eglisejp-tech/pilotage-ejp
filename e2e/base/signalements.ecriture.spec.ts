import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { fichierSession, seConnecter } from '../comptes.ts'
import { appeler, compter, lire } from './outils-evenements.ts'

// Le cas de Coordination (T77, conception du 26 octobre 2026, critères 1 à 7), avec la base
// locale : projet « ecritures » (en série, à 1440 px, après les projets de lecture). Coordination
// signale une difficulté depuis « Ajouter un événement » ; EJP Tech la voit à traiter, la prend en
// charge et répond par une question ; Coordination lit le bandeau de « Ma semaine », ouvre le
// signalement par son ancre, répond ; EJP Tech répond de nouveau ; Coordination confirme que
// c'est réglé. Une ligne de journal par geste, avec le seul code de l'écran, jamais un texte. Un
// autre ministère ne lit rien et ne peut rien ; le berger et l'administration n'ont pas la page.

// Le suffixe s'écrit en lettres : 5 chiffres de suite tombent dans la famille « données
// personnelles » de `private.verifier_texte`, et la base refuserait le texte.
const SUFFIXE = `${Date.now()}`.replace(/\d/g, (chiffre) => 'abcdefghij'.charAt(Number(chiffre)))
const TEXTE = `Problème au niveau de la saisie des événement dans le calendrier ${SUFFIXE}`
const QUESTION = `Quel événement, à quelle date, et quel message voyez-vous ? ${SUFFIXE}`
const RETOUR = `L'événement du 15 novembre ne s'enregistre pas, message rouge ${SUFFIXE}`
const SOLUTION = `Corrigé, la date du 15 novembre s'enregistre de nouveau ${SUFFIXE}`
const PAGE_NON_DISPONIBLE = 'Page non disponible'
const ECRAN = { ecran: 'saisie_evenement' }

test.describe.configure({ mode: 'serial' })

type LigneJournal = { id: number; action: string; detail: Record<string, unknown> | null }
type LigneSignalement = { id: string; statut: string; fin: string | null; ouvert: boolean }

/** Lignes de journal d'un signalement, lues par le compte de la page, dans l'ordre. */
const journalDe = (page: Page, signalementId: string) =>
  lire<LigneJournal>(
    page,
    `journal?select=id,action,detail&cible=eq.signalement&cible_id=eq.${signalementId}&order=id`,
  )

/** Le signalement du test, lu sous la RLS du compte de la page. */
const signalementDuTest = (page: Page) =>
  lire<LigneSignalement>(
    page,
    `v_signalement?select=id,statut,fin,ouvert&texte=eq.${encodeURIComponent(TEXTE)}`,
  )

const annonce = (page: Page, debut: string) => page.getByRole('status').filter({ hasText: debut })
const groupe = (page: Page, nom: string) => page.getByRole('region', { name: nom, exact: true })
const article = (page: Page, nom: string) =>
  groupe(page, nom).getByRole('article').filter({ hasText: TEXTE })

let signalementId = ''

test('le cas de Coordination : signalement, prise en charge, question, réponse, seconde réponse, « Oui, c’est réglé »', async ({
  browser,
}) => {
  test.setTimeout(240_000)
  const contexteCoordination = await browser.newContext()
  const coordination = await contexteCoordination.newPage()
  await seConnecter(coordination, 'coordination@exemple.test')
  const contexteTech = await browser.newContext({
    storageState: fichierSession('admin_plateforme'),
  })
  const tech = await contexteTech.newPage()

  // Critère 1 : Coordination signale depuis « Ajouter un événement ».
  await coordination.goto('/signaler?ecran=saisie_evenement')
  await expect(coordination.getByText('Écran concerné : Ajouter un événement')).toBeVisible()
  await coordination.getByLabel('Quelle difficulté rencontrez-vous ?').fill(TEXTE)
  await coordination.getByRole('button', { name: 'Envoyer le signalement' }).click()
  await expect(annonce(coordination, 'Signalement envoyé')).toHaveText(
    "Signalement envoyé. Suivez la réponse d'EJP Tech dans « Mes signalements ».",
  )
  const [envoye] = await signalementDuTest(coordination)
  expect(envoye).toMatchObject({ statut: 'recu', ouvert: true, fin: null })
  signalementId = envoye?.id ?? ''
  expect((await journalDe(coordination, signalementId)).map((l) => l.action)).toEqual([
    'difficulte_signalee',
  ])

  // « Ma semaine » : la ligne discrète, pas de bandeau ; « Mes signalements » le montre Reçu.
  await coordination.goto('/')
  await expect(coordination.getByText(/^\d+ signalements? suivis? par EJP Tech\.$/)).toBeVisible()
  await expect(coordination.getByRole('link', { name: 'Voir la réponse' })).toHaveCount(0)
  await coordination.getByRole('link', { name: 'Voir le suivi' }).click()
  await expect(coordination).toHaveURL((url) => url.pathname === '/signalements')
  await expect(coordination).toHaveTitle('Mes signalements, Pilotage EJP')
  await expect(article(coordination, 'En cours')).toContainText('Reçu')
  await expect(article(coordination, 'En cours')).toContainText(
    /EJP Tech a reçu votre signalement le \d{1,2} /,
  )

  // Critère 1, EJP Tech : à traiter, reçu aujourd'hui, les trois gestes.
  await tech.goto('/moderation')
  const aTraiter = article(tech, 'À traiter')
  await expect(aTraiter).toContainText('Coordination')
  await expect(aTraiter).toContainText("Reçu aujourd'hui.")
  await expect(aTraiter.getByRole('button', { name: /^(Prendre|Répondre|Clore)/ })).toHaveText([
    'Prendre en charge',
    'Répondre au ministère',
    'Clore le signalement',
  ])

  // Critère 2 : « Prendre en charge ».
  await aTraiter.getByRole('button', { name: 'Prendre en charge' }).click()
  await expect(annonce(tech, 'pris en charge')).toHaveText('Signalement pris en charge.')
  await expect(aTraiter).toContainText("Pris en charge aujourd'hui.")

  // Critère 3 : « Répondre au ministère », une question.
  await aTraiter.getByRole('button', { name: 'Répondre au ministère' }).click()
  await tech.getByLabel('Votre réponse à Coordination').fill(QUESTION)
  await tech.getByRole('button', { name: 'Envoyer la réponse' }).click()
  await expect(annonce(tech, 'Réponse envoyée')).toHaveText('Réponse envoyée.')
  await expect(article(tech, 'En attente du ministère')).toContainText(
    /Le ministère peut répondre jusqu'au \d{1,2} /,
  )
  expect((await signalementDuTest(tech))[0]?.statut).toBe('repondu')

  // Critère 4 : le bandeau de « Ma semaine », puis le signalement par son ancre.
  await coordination.goto('/')
  await expect(
    coordination.getByText(
      /^EJP Tech a répondu à (votre signalement du \d{1,2} \S+|\d+ de vos signalements)\. Dites-nous si c'est réglé\.$/,
    ),
  ).toBeVisible()
  await expect(coordination.getByRole('link', { name: 'Voir la réponse' })).toHaveAttribute(
    'href',
    /^\/signalements#/,
  )
  await coordination.goto(`/signalements#${signalementId}`)
  const aVerifier = article(coordination, 'À vérifier')
  await expect(aVerifier).toContainText(QUESTION)
  await expect(aVerifier.getByRole('heading', { level: 3 })).toBeFocused()
  await expect(
    aVerifier.getByRole('group', { name: 'Est-ce réglé ?' }).getByRole('button'),
  ).toHaveText(["Oui, c'est réglé", 'Répondre à EJP Tech'])
  await expect(aVerifier).toContainText(/Vous pouvez répondre jusqu'au \d{1,2} /)

  // Critère 5 : « Répondre à EJP Tech ».
  await aVerifier.getByRole('button', { name: 'Répondre à EJP Tech' }).click()
  await coordination.getByLabel('Votre réponse à EJP Tech').fill(RETOUR)
  await coordination.getByRole('button', { name: 'Envoyer la réponse' }).click()
  await expect(annonce(coordination, 'Réponse envoyée')).toHaveText(
    'Réponse envoyée. EJP Tech reprend votre signalement.',
  )
  await expect(article(coordination, 'En cours')).toContainText(
    /Vous avez répondu le \d{1,2} \S+ EJP Tech reprend votre signalement\./,
  )
  await tech.goto('/moderation')
  await expect(article(tech, 'À traiter')).toContainText("Le ministère a répondu aujourd'hui.")
  await expect(article(tech, 'À traiter')).toContainText(RETOUR)

  // Critère 6 : seconde réponse d'EJP Tech.
  await article(tech, 'À traiter').getByRole('button', { name: 'Répondre au ministère' }).click()
  await tech.getByLabel('Votre réponse à Coordination').fill(SOLUTION)
  await tech.getByRole('button', { name: 'Envoyer la réponse' }).click()
  await expect(annonce(tech, 'Réponse envoyée')).toHaveText('Réponse envoyée.')

  // Critère 7 : de nouveau le bandeau, puis « Oui, c'est réglé ». Le passage par « Ma semaine »
  // recharge aussi la page : une adresse qui ne change que d'ancre ne relirait rien.
  await coordination.goto('/')
  await expect(coordination.getByRole('link', { name: 'Voir la réponse' })).toBeVisible()
  await coordination.goto(`/signalements#${signalementId}`)
  await expect(article(coordination, 'À vérifier')).toContainText(SOLUTION)
  await article(coordination, 'À vérifier')
    .getByRole('button', { name: "Oui, c'est réglé" })
    .click()
  await expect(annonce(coordination, 'Merci')).toHaveText('Merci. Le signalement est clos.')
  const clos = article(coordination, 'Clos ces 30 derniers jours')
  await expect(clos).toContainText(/Vous avez confirmé que c'est réglé le \d{1,2} /)
  await expect(clos.getByRole('button')).toHaveCount(0)
  expect((await signalementDuTest(coordination))[0]).toMatchObject({
    statut: 'clos',
    fin: 'confirme',
    ouvert: false,
  })
  const seconde = await appeler(coordination, 'confirmer_signalement', {
    p_signalement_id: signalementId,
  })
  expect(seconde.status()).toBe(400)
  expect(((await seconde.json()) as { message: string }).message).toBe(
    'Ce signalement est déjà clos.',
  )
  await tech.goto('/moderation')
  await expect(article(tech, 'Clos ces 30 derniers jours')).toContainText(
    /Confirmé par le ministère le \d{1,2} /,
  )

  // Le journal : une ligne par geste, le seul code de l'écran, aucun texte.
  const journal = await journalDe(coordination, signalementId)
  expect(journal.map((l) => l.action)).toEqual([
    'difficulte_signalee',
    'signalement_pris_en_charge',
    'signalement_repondu',
    'signalement_reponse_ministere',
    'signalement_repondu',
    'signalement_regle',
  ])
  for (const l of journal) expect(l.detail).toEqual(ECRAN)
  expect(JSON.stringify(journal)).not.toContain(SUFFIXE)
  // « Mon journal » de Coordination nomme ces gestes.
  await coordination.goto('/journal')
  await expect(
    coordination.getByText("A confirmé qu'un signalement est réglé").first(),
  ).toBeVisible()

  await contexteCoordination.close()
  await contexteTech.close()
})

test.describe('un autre ministère (Intégration)', () => {
  test('ne lit ni le signalement de Coordination, ni son suivi, ni son journal, et ne peut rien', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    expect(signalementId).not.toBe('')
    await seConnecter(page, 'integration@exemple.test')
    await page.goto('/signalements')
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 })
    await expect(page.getByText(TEXTE)).toHaveCount(0)
    expect(await signalementDuTest(page)).toHaveLength(0)
    expect(
      await compter(page, `signalement_suivi?select=id&signalement_id=eq.${signalementId}`),
    ).toBe(0)
    expect(await journalDe(page, signalementId)).toHaveLength(0)
    for (const [nom, args] of [
      ['confirmer_signalement', { p_signalement_id: signalementId }],
      ['repondre_a_ejp_tech', { p_signalement_id: signalementId, p_texte: `Essai ${SUFFIXE}` }],
      ['prendre_en_charge_signalement', { p_signalement_id: signalementId }],
    ] as const) {
      const reponse = await appeler(page, nom, args)
      expect(reponse.status(), nom).toBe(403)
      expect(((await reponse.json()) as { code: string }).code, nom).toBe('42501')
    }
  })
})

for (const profil of ['berger', 'admin_eglise'] as const) {
  test.describe(`profil ${profil}`, () => {
    test.use({ storageState: fichierSession(profil) })

    test('/signalements et /signaler : la page non disponible ; ni le signalement, ni son suivi, ni son journal', async ({
      page,
    }) => {
      for (const adresse of ['/signalements', '/signaler?ecran=saisie_evenement']) {
        await page.goto(adresse)
        await expect(
          page.getByRole('heading', { level: 1, name: PAGE_NON_DISPONIBLE }),
          adresse,
        ).toBeVisible()
      }
      expect(await compter(page, `v_signalement?select=id&id=eq.${signalementId}`)).toBe(0)
      expect(
        await compter(page, `signalement_suivi?select=id&signalement_id=eq.${signalementId}`),
      ).toBe(0)
      expect(await journalDe(page, signalementId)).toHaveLength(0)
    })
  })
}
