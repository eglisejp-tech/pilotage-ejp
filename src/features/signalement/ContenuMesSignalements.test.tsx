import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { EtapeDuSuivi, LigneSignalement } from '@/data/signalements'
import type { GestesMinistere } from '@/features/signalement/ArticleSignalement'
import { ContenuMesSignalements } from '@/features/signalement/ContenuMesSignalements'
import type { ContenuSuivi } from '@/features/signalement/ContenuMesSignalements'
import type { Reponse } from '@/features/signalement/schemas'
import type { EtapeSuivi } from '@/lib/base'

// « Mes signalements » du ministère (`/signalements`, T77) : états, groupes, articles et gestes,
// sur le cas de Coordination (conception T77, section 6, critères 1, 4, 5, 7, 8, 17 et 21).

const COORDINATION = '10000000-0000-4000-8000-000000000003'
const ID = '43000000-0000-4000-8000-000000000006'
const TEXTE = 'Problème au niveau de la saisie des événement dans le calendrier'
const QUESTION = 'Quel événement, à quelle date, et quel message s’affiche quand vous enregistrez ?'
const RETOUR = "L'événement du 15 novembre ne s'enregistre pas, un message rouge s'affiche."
const RAPPEL = "N'écrivez aucun nom ni information personnelle."
const REFERENCE = /Référence pour EJP Tech : [2-9A-HJKMNP-Z]{6}/
/** Les guillemets d'un texte cité sont suivis et précédés d'une espace insécable. */
const INSECABLE = new RegExp(String.fromCharCode(0xa0), 'g')

function signalement(champs: Partial<LigneSignalement> = {}): LigneSignalement {
  return {
    id: ID,
    ministere_id: COORDINATION,
    ministere_nom: 'Coordination',
    ecran: 'saisie_evenement',
    texte: TEXTE,
    saisi_le: '2026-10-26T10:15:00+01:00',
    suivi_id: null,
    commentaire: null,
    clos_le: null,
    ouvert: true,
    clos_recent: false,
    statut: 'recu',
    derniere_etape: null,
    statut_le: '2026-10-26T10:15:00+01:00',
    jours_depuis: 0,
    fin: null,
    reponse_possible_jusquau: null,
    compte_actif: true,
    ...champs,
  }
}

let numero = 0
function ligne(
  etape: EtapeSuivi,
  saisiLe: string,
  commentaire: string | null = null,
  signalementId = ID,
): EtapeDuSuivi {
  numero += 1
  return {
    id: `d1000000-0000-4000-8000-${String(numero).padStart(12, '0')}`,
    signalement_id: signalementId,
    etape,
    commentaire,
    saisi_le: saisiLe,
    ordre: numero,
  }
}

const PRISE = ligne('en_cours', '2026-10-27T09:00:00+01:00')
const QUESTION_EJP = ligne('reponse', '2026-10-27T09:05:00+01:00', QUESTION)

/** Le signalement de Coordination, Répondu le 27 octobre (critère 4). */
const REPONDU = signalement({
  statut: 'repondu',
  derniere_etape: 'reponse',
  statut_le: QUESTION_EJP.saisi_le,
  reponse_possible_jusquau: '2026-11-03',
})

/** Un autre, clos sans retour le lundi 9 novembre (critère 8). */
const CLOS_AUTO_ID = '43000000-0000-4000-8000-000000000007'
const REPONSE_DIMANCHE = ligne('reponse', '2026-11-01T21:00:00+01:00', QUESTION, CLOS_AUTO_ID)
const CLOS_AUTO = signalement({
  id: CLOS_AUTO_ID,
  ecran: 'saisie_dimanche',
  saisi_le: '2026-10-31T12:00:00+01:00',
  statut: 'clos',
  derniere_etape: 'reponse',
  statut_le: '2026-11-09T00:00:00+01:00',
  clos_le: '2026-11-09T00:00:00+01:00',
  ouvert: false,
  clos_recent: true,
  fin: 'automatique',
})

function gestesFactices(gestes: Partial<GestesMinistere> = {}): GestesMinistere {
  return {
    confirmer: vi.fn<(id: string) => Promise<void>>(() => Promise.resolve()),
    repondre: vi.fn<(reponse: Reponse) => Promise<void>>(() => Promise.resolve()),
    ...gestes,
  }
}

function liste(
  signalements: LigneSignalement[],
  suivi: EtapeDuSuivi[] = [],
  gestes: GestesMinistere = gestesFactices(),
  relire = vi.fn(),
): Extract<ContenuSuivi, { etat: 'liste' }> {
  return { etat: 'liste', signalements, suivi, gestes, relire }
}

function afficher(contenu: ContenuSuivi, adresse = '/signalements') {
  return render(
    <MemoryRouter initialEntries={[adresse]}>
      <ContenuMesSignalements contenu={contenu} titre="Mes signalements" />
    </MemoryRouter>,
  )
}

const article = (nom: string) =>
  screen.getByRole('heading', { level: 3, name: nom }).closest('article') as HTMLElement

beforeAll(() => {
  // jsdom ne fait pas défiler : l'ancre `#<id>` appelle `scrollIntoView`.
  Element.prototype.scrollIntoView = vi.fn()
})

describe('« Mes signalements » : états', () => {
  it('chargement : la petite flamme et « Chargement de vos signalements »', async () => {
    afficher({ etat: 'chargement' })
    expect(screen.getByRole('heading', { level: 1, name: 'Mes signalements' })).toBeInTheDocument()
    expect(await screen.findByText('Chargement de vos signalements')).toBeInTheDocument()
  })

  it('problème passager : le texte commun et « Réessayer »', async () => {
    const reessayer = vi.fn()
    afficher({ etat: 'probleme', reessayer })
    expect(screen.getByText('La connexion a échoué. Réessayez.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(reessayer).toHaveBeenCalled()
  })

  it('rien du tout : le texte vide, qui dit où signaler', () => {
    afficher(liste([]))
    expect(
      screen.getByText(
        'Aucun signalement. En cas de difficulté sur un formulaire de saisie, utilisez le lien « Signaler une difficulté » en bas du formulaire.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull()
  })

  it('seulement des clos : « Aucun signalement ouvert. » puis le groupe des clos', () => {
    afficher(liste([CLOS_AUTO], [REPONSE_DIMANCHE]))
    expect(screen.getByText('Aucun signalement ouvert.')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Clos ces 30 derniers jours',
    ])
  })

  it('le titre de l’onglet du navigateur', () => {
    afficher(liste([]))
    expect(document.title).toBe('Mes signalements, Pilotage EJP')
  })
})

describe('« Mes signalements » : groupes et articles', () => {
  it('trois groupes dans l’ordre : « À vérifier », « En cours », « Clos ces 30 derniers jours »', () => {
    const recu = signalement({ id: '43000000-0000-4000-8000-000000000008', ecran: 'saisie_mois' })
    afficher(liste([recu, REPONDU, CLOS_AUTO], [PRISE, QUESTION_EJP, REPONSE_DIMANCHE]))
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'À vérifier',
      'En cours',
      'Clos ces 30 derniers jours',
    ])
    expect(screen.queryByText('Aucun signalement ouvert.')).toBeNull()
  })

  it('critère 1 : un Reçu dans « En cours », son en-tête, son étiquette en texte, aucun bouton', () => {
    afficher(liste([signalement()]))
    // Un groupe vide n'apparaît pas.
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'En cours',
    ])
    const enCours = screen.getByRole('region', { name: 'En cours' })
    const entete = within(enCours).getByRole('heading', {
      level: 3,
      name: 'Ajouter un événement, 26 oct.',
    })
    expect(entete).toHaveAttribute('tabindex', '-1')
    const lu = article('Ajouter un événement, 26 oct.')
    expect(lu).toHaveAttribute('id', ID)
    expect(within(lu).getByText('Reçu')).toBeInTheDocument()
    expect(lu).toHaveTextContent(`« ${TEXTE} »`)
    expect(lu).toHaveTextContent('EJP Tech a reçu votre signalement le 26 oct.')
    expect(within(lu).queryByRole('button')).toBeNull()
  })

  it('le suivi daté : une liste, une ligne par étape, chaque date dans un <time>', () => {
    afficher(liste([REPONDU], [PRISE, QUESTION_EJP]))
    const suivi = within(article('Ajouter un événement, 26 oct.')).getByRole('list', {
      name: 'Suivi',
    })
    expect(suivi.tagName).toBe('OL')
    const etapes = within(suivi).getAllByRole('listitem')
    expect(etapes.map((etape) => etape.textContent?.replace(INSECABLE, ' '))).toEqual([
      '26 oct. Signalement envoyé',
      '27 oct. Pris en charge par EJP Tech',
      `27 oct. Réponse d'EJP Tech : « ${QUESTION} »`,
    ])
    const dates = suivi.querySelectorAll('time')
    expect([...dates].map((date) => date.getAttribute('datetime'))).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-27',
    ])
  })

  it('critère 4 : un Répondu dans « À vérifier », la question, « Est-ce réglé ? », la date limite', () => {
    afficher(liste([REPONDU], [PRISE, QUESTION_EJP]))
    const aVerifier = screen.getByRole('region', { name: 'À vérifier' })
    expect(aVerifier).toHaveTextContent('EJP Tech vous a répondu le 27 oct.')
    // La réponse d'EJP Tech, entre guillemets, sous la ligne d'état (et dans le suivi daté).
    expect(aVerifier).toHaveTextContent(`« ${QUESTION} »`)
    const question = within(aVerifier).getByRole('group', { name: 'Est-ce réglé ?' })
    expect(within(question).getByRole('button', { name: "Oui, c'est réglé" })).toBeInTheDocument()
    expect(within(question).getByRole('button', { name: 'Répondre à EJP Tech' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(aVerifier).toHaveTextContent("Vous pouvez répondre jusqu'au 3 nov.")
  })

  it('critère 4 : l’ancre `#<id>` met le focus sur l’en-tête du signalement', async () => {
    afficher(liste([REPONDU], [PRISE, QUESTION_EJP]), `/signalements#${ID}`)
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { level: 3, name: 'Ajouter un événement, 26 oct.' }),
      ).toHaveFocus(),
    )
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
  })

  it('une ancre inconnue (clos depuis plus de 30 jours) ouvre la page normalement', () => {
    afficher(liste([REPONDU], [PRISE, QUESTION_EJP]), '/signalements#inconnu')
    expect(screen.getByRole('region', { name: 'À vérifier' })).toBeInTheDocument()
    expect(document.body).toHaveFocus()
  })

  it('critère 8 : clos sans retour, la raison dite, aucun bouton', () => {
    afficher(liste([CLOS_AUTO], [REPONSE_DIMANCHE]))
    const clos = screen.getByRole('region', { name: 'Clos ces 30 derniers jours' })
    expect(clos).toHaveTextContent(
      'Clos le 9 nov., sans retour de votre part. Si la difficulté revient, faites un nouveau signalement.',
    )
    expect(clos).toHaveTextContent('9 nov. Clos, sans retour de votre part')
    expect(within(clos).getByText('Clos')).toBeInTheDocument()
    expect(within(clos).queryByRole('button')).toBeNull()
  })

  it('critère 15 : clos par EJP Tech, puis « Réponse : » et sa réponse', () => {
    const cloture = ligne('clos', '2026-10-08T15:00:00+02:00', 'Transmis à l’administration.')
    afficher(
      liste(
        [
          signalement({
            statut: 'clos',
            derniere_etape: 'clos',
            statut_le: cloture.saisi_le,
            clos_le: cloture.saisi_le,
            suivi_id: cloture.id,
            commentaire: cloture.commentaire,
            ouvert: false,
            clos_recent: true,
            fin: 'ejp_tech',
          }),
        ],
        [cloture],
      ),
    )
    const clos = screen.getByRole('region', { name: 'Clos ces 30 derniers jours' })
    expect(clos).toHaveTextContent('Clos par EJP Tech le 8 oct.')
    expect(clos).toHaveTextContent('Réponse : Transmis à l’administration.')
  })
})

describe('« Oui, c’est réglé » (critères 7 et 21)', () => {
  it('« Envoi en cours » pendant l’appel, puis le message annoncé et le focus sur l’en-tête', async () => {
    let finir: () => void = () => undefined
    const confirmer = vi.fn<(id: string) => Promise<void>>(
      () =>
        new Promise<void>((fin) => {
          finir = fin
        }),
    )
    afficher(liste([REPONDU], [PRISE, QUESTION_EJP], gestesFactices({ confirmer })))
    await userEvent.click(screen.getByRole('button', { name: "Oui, c'est réglé" }))
    expect(confirmer).toHaveBeenCalledWith(ID)
    expect(screen.getByRole('button', { name: /Envoi en cours/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    finir()
    expect(await screen.findByRole('status')).toHaveTextContent('Merci. Le signalement est clos.')
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { level: 3, name: 'Ajouter un événement, 26 oct.' }),
      ).toHaveFocus(),
    )
  })

  it('sans réseau : « L’envoi n’a pas abouti. Réessayez. » sous les boutons, avec la référence', async () => {
    const confirmer = vi.fn<(id: string) => Promise<void>>(() =>
      Promise.reject(new TypeError('Failed to fetch')),
    )
    afficher(liste([REPONDU], [PRISE, QUESTION_EJP], gestesFactices({ confirmer })))
    const bouton = screen.getByRole('button', { name: "Oui, c'est réglé" })
    await userEvent.click(bouton)
    const alerte = await screen.findByRole('alert')
    expect(alerte).toHaveTextContent("L'envoi n'a pas abouti. Réessayez.")
    expect(alerte).toHaveTextContent(REFERENCE)
    expect(bouton).toHaveFocus()
  })

  it('« Ce signalement est déjà clos. » : le message sous les boutons, puis la liste relue', async () => {
    const relire = vi.fn()
    const confirmer = vi.fn<(id: string) => Promise<void>>(() =>
      Promise.reject({ code: 'P0001', message: 'Ce signalement est déjà clos.' }),
    )
    afficher(liste([REPONDU], [PRISE, QUESTION_EJP], gestesFactices({ confirmer }), relire))
    await userEvent.click(screen.getByRole('button', { name: "Oui, c'est réglé" }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ce signalement est déjà clos.')
    expect(relire).toHaveBeenCalledTimes(1)
  })
})

describe('« Répondre à EJP Tech » (critères 5, 17 et 21)', () => {
  const ouvrir = async () => {
    const bouton = screen.getByRole('button', { name: 'Répondre à EJP Tech' })
    await userEvent.click(bouton)
    return bouton
  }
  const champ = () => screen.getByLabelText('Votre réponse à EJP Tech')

  it('ouvre le panneau : focus dans le champ, aide, rappel dessous, compteur', async () => {
    afficher(liste([REPONDU], [PRISE, QUESTION_EJP]))
    const bouton = await ouvrir()
    expect(bouton).toHaveAttribute('aria-expanded', 'true')
    const panneau = document.getElementById(bouton.getAttribute('aria-controls') ?? '')
    expect(panneau).toContainElement(champ())
    await waitFor(() => expect(champ()).toHaveFocus())
    expect(champ()).toHaveAccessibleDescription(
      `Répondez à sa question, ou dites ce qui ne va toujours pas. ${RAPPEL} 0 sur 280`,
    )
    expect(screen.getAllByText(RAPPEL)).toHaveLength(1)
  })

  it('critère 5 : la réponse part, « Réponse envoyée. EJP Tech reprend votre signalement. »', async () => {
    const repondre = vi.fn<(reponse: Reponse) => Promise<void>>(() => Promise.resolve())
    afficher(liste([REPONDU], [PRISE, QUESTION_EJP], gestesFactices({ repondre })))
    await ouvrir()
    await userEvent.click(champ())
    await userEvent.paste(RETOUR)
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer la réponse' }))
    expect(repondre).toHaveBeenCalledWith({ signalementId: ID, texte: RETOUR })
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Réponse envoyée. EJP Tech reprend votre signalement.',
    )
    expect(screen.queryByLabelText('Votre réponse à EJP Tech')).toBeNull()
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { level: 3, name: 'Ajouter un événement, 26 oct.' }),
      ).toHaveFocus(),
    )
  })

  it('moins de 10 caractères : l’erreur sous le champ, rien n’est envoyé', async () => {
    const repondre = vi.fn<(reponse: Reponse) => Promise<void>>(() => Promise.resolve())
    afficher(liste([REPONDU], [PRISE, QUESTION_EJP], gestesFactices({ repondre })))
    await ouvrir()
    await userEvent.type(champ(), 'Non')
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer la réponse' }))
    expect(await screen.findByText('Écrivez au moins 10 caractères.')).toBeInTheDocument()
    expect(repondre).not.toHaveBeenCalled()
  })

  it('critère 17 : un numéro de téléphone refusé par la base, sous le champ, texte gardé', async () => {
    const repondre = vi.fn<(reponse: Reponse) => Promise<void>>(() =>
      Promise.reject({ code: 'P0001', message: "N'écrivez aucun nom ni information personnelle." }),
    )
    afficher(liste([REPONDU], [PRISE, QUESTION_EJP], gestesFactices({ repondre })))
    await ouvrir()
    await userEvent.click(champ())
    await userEvent.paste('Appelez Jean au 06 12 34 56 78')
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer la réponse' }))
    expect(
      await screen.findByText(
        'Retirez de votre texte les emails, liens, numéros et noms de personnes.',
        { selector: '.text-alerte' },
      ),
    ).toBeInTheDocument()
    expect(champ()).toHaveValue('Appelez Jean au 06 12 34 56 78')
    await waitFor(() => expect(champ()).toHaveFocus())
  })

  it('sans réseau : la saisie est gardée, l’erreur sous le bouton avec la référence', async () => {
    const repondre = vi.fn<(reponse: Reponse) => Promise<void>>(() =>
      Promise.reject(new TypeError('Failed to fetch')),
    )
    afficher(liste([REPONDU], [PRISE, QUESTION_EJP], gestesFactices({ repondre })))
    await ouvrir()
    await userEvent.click(champ())
    await userEvent.paste(RETOUR)
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer la réponse' }))
    const alerte = await screen.findByRole('alert')
    expect(alerte).toHaveTextContent(
      'La connexion a échoué. Votre saisie est encore dans le formulaire : réessayez.',
    )
    expect(alerte).toHaveTextContent(REFERENCE)
    expect(champ()).toHaveValue(RETOUR)
  })

  it('date limite passée entre-temps : « Ce signalement est déjà clos. », panneau fermé, liste relue', async () => {
    const relire = vi.fn()
    const repondre = vi.fn<(reponse: Reponse) => Promise<void>>(() =>
      Promise.reject({ code: 'P0001', message: 'Ce signalement est déjà clos.' }),
    )
    afficher(liste([REPONDU], [PRISE, QUESTION_EJP], gestesFactices({ repondre }), relire))
    await ouvrir()
    await userEvent.click(champ())
    await userEvent.paste(RETOUR)
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer la réponse' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ce signalement est déjà clos.')
    expect(screen.queryByLabelText('Votre réponse à EJP Tech')).toBeNull()
    expect(relire).toHaveBeenCalledTimes(1)
  })

  it('« Annuler » sans texte ferme le panneau et rend le focus au bouton', async () => {
    afficher(liste([REPONDU], [PRISE, QUESTION_EJP]))
    const bouton = await ouvrir()
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(screen.queryByLabelText('Votre réponse à EJP Tech')).toBeNull()
    expect(bouton).toHaveAttribute('aria-expanded', 'false')
    await waitFor(() => expect(bouton).toHaveFocus())
  })

  it('« Annuler » avec un texte : « Fermer sans enregistrer ? » d’abord, puis le focus au bouton', async () => {
    const repondre = vi.fn<(reponse: Reponse) => Promise<void>>(() => Promise.resolve())
    afficher(liste([REPONDU], [PRISE, QUESTION_EJP], gestesFactices({ repondre })))
    const bouton = await ouvrir()
    await userEvent.type(champ(), 'Toujours bloqué')
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(screen.getByRole('alertdialog', { name: 'Fermer sans enregistrer ?' })).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Continuer la saisie' }))
    expect(champ()).toHaveValue('Toujours bloqué')
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    await userEvent.click(screen.getByRole('button', { name: 'Fermer sans enregistrer' }))
    expect(screen.queryByLabelText('Votre réponse à EJP Tech')).toBeNull()
    expect(repondre).not.toHaveBeenCalled()
    await waitFor(() => expect(bouton).toHaveFocus())
  })
})
