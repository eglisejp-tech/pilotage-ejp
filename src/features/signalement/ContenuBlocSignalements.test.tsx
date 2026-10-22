import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { LigneSignalement } from '@/data/signalements'
import { ContenuBlocSignalements } from '@/features/signalement/ContenuBlocSignalements'
import type { ContenuBloc } from '@/features/signalement/ContenuBlocSignalements'

const RAPPEL = "N'écrivez aucun nom ni information personnelle."
const VIDE = 'Aucun signalement.'
const REPONSE = 'Réponse au ministère (facultatif)'
const CLORE = 'Clore le signalement'

// Le même libellé ouvre le panneau et confirme (T66) : l'ouvreur seul porte `aria-expanded`.
const tousLesClore = () => screen.getAllByRole('button', { name: CLORE })
const ouvreurs = () => tousLesClore().filter((bouton) => bouton.hasAttribute('aria-expanded'))
const confirmer = () => tousLesClore().find((bouton) => !bouton.hasAttribute('aria-expanded'))!

function ligne(numero: number, champs: Partial<LigneSignalement> = {}): LigneSignalement {
  return {
    id: `43000000-0000-4000-8000-00000000000${numero}`,
    ministere_id: '10000000-0000-4000-8000-000000000001',
    ministere_nom: 'Communication',
    ecran: 'saisie_evenement',
    texte: `Texte du signalement numéro ${numero}.`,
    saisi_le: '2026-10-02T18:40:00+02:00',
    suivi_id: null,
    commentaire: null,
    clos_le: null,
    ouvert: true,
    clos_recent: false,
    ...champs,
  }
}

const PLUS_ANCIEN = ligne(1, { ministere_nom: 'Intégration', ecran: 'saisie_session' })
const PLUS_RECENT = ligne(2, { saisi_le: '2026-10-05T21:15:00+02:00' })
const CLOS = ligne(3, {
  ecran: 'saisie_dimanche',
  saisi_le: '2026-09-27T13:10:00+02:00',
  suivi_id: '43000000-0000-4000-8000-000000000011',
  commentaire: 'Réglé avec le ministère.',
  clos_le: '2026-09-29T10:00:00+02:00',
  ouvert: false,
  clos_recent: true,
})

function liste(signalements: LigneSignalement[], champs: Partial<ContenuBloc> = {}) {
  const cloturer = vi.fn(() => Promise.resolve())
  const relire = vi.fn()
  const contenu = { etat: 'liste', signalements, cloturer, relire, ...champs } as ContenuBloc
  render(<ContenuBlocSignalements contenu={contenu} />)
  return { cloturer, relire }
}

const blocOuverts = () => screen.getAllByRole('list')[0]!

describe('bloc « Signalements »', () => {
  it('titre et « 2 signalements ouverts », sans sous-titre ; les ouverts du plus ancien au plus récent', () => {
    liste([CLOS, PLUS_ANCIEN, PLUS_RECENT])
    expect(screen.getByRole('heading', { level: 2, name: 'Signalements' })).toBeInTheDocument()
    // Le sous-titre est retiré par T66 (t361).
    expect(screen.queryByText('Difficultés signalées par les ministères')).toBeNull()
    expect(screen.getByText('2 signalements ouverts')).toBeInTheDocument()
    const ouverts = within(blocOuverts()).getAllByRole('article')
    expect(ouverts).toHaveLength(2)
    // Chaque ligne se nomme par son ministère.
    expect(ouverts[0]).toHaveAccessibleName('Intégration')
    expect(ouverts[0]).toHaveTextContent('Intégration')
    expect(ouverts[0]).toHaveTextContent('Présence à une session, 2 oct.')
    expect(ouverts[1]).toHaveTextContent('Communication')
    expect(ouverts[1]).toHaveTextContent('Ajouter un événement, 5 oct.')
    expect(
      within(blocOuverts()).getAllByRole('button', { name: 'Clore le signalement' }),
    ).toHaveLength(2)
  })

  it('les clos des 30 derniers jours, sous les ouverts, avec la date et la réponse, sans bouton', () => {
    liste([CLOS, PLUS_ANCIEN])
    const clos = screen.getByRole('region', { name: 'Clos ces 30 derniers jours' })
    expect(clos).toHaveTextContent('Chiffres du dimanche, 27 sept.')
    // La date sur une ligne, la réponse sur la suivante.
    expect(within(clos).getByText('Clos le 29 sept.')).toBeInTheDocument()
    expect(clos).toHaveTextContent('Réponse : Réglé avec le ministère.')
    expect(within(clos).queryByRole('button')).toBeNull()
  })

  it('les clos : le dernier clos en premier, pas le plus anciennement envoyé', () => {
    const CLOS_HIER = ligne(5, {
      ...CLOS,
      id: '43000000-0000-4000-8000-000000000005',
      texte: 'Envoyé tôt, clos hier.',
      saisi_le: '2026-09-01T10:00:00+02:00',
      clos_le: '2026-10-06T09:00:00+02:00',
    })
    liste([CLOS_HIER, CLOS])
    const clos = screen.getByRole('region', { name: 'Clos ces 30 derniers jours' })
    const lignes = within(clos).getAllByRole('article')
    expect(lignes[0]).toHaveTextContent('Clos le 6 oct.')
    expect(lignes[1]).toHaveTextContent('Clos le 29 sept.')
  })

  it('sans ouvert mais avec des clos : le compteur du titre suffit, titre et clos gardés', () => {
    liste([CLOS])
    // T66 (m171) : plus de phrase sous le titre quand des clos suivent.
    expect(screen.queryByText(VIDE)).toBeNull()
    expect(screen.getByText('Aucun signalement ouvert')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Clos ces 30 derniers jours' })).toBeInTheDocument()
  })

  it('chaque « Clore le signalement » se décrit par le ministère de sa ligne', () => {
    liste([PLUS_ANCIEN, PLUS_RECENT])
    const boutons = screen.getAllByRole('button', { name: 'Clore le signalement' })
    expect(boutons[0]).toHaveAccessibleDescription('Intégration')
    expect(boutons[1]).toHaveAccessibleDescription('Communication')
  })

  it('un texte sans espace (lien collé) se coupe au lieu de déborder', () => {
    const lien = `https://exemple.test/${'a'.repeat(90)}`
    liste([ligne(6, { texte: lien })])
    const texte = screen.getByText(lien, { exact: false })
    expect(texte.closest('p')).toHaveClass('wrap-anywhere', 'min-w-0')
  })

  it('rien du tout : la phrase de l’état vide, sans section des clos', () => {
    liste([])
    expect(screen.getByText(VIDE).closest('[data-situation]')).toHaveAttribute(
      'data-situation',
      'tout_est_fait',
    )
    expect(screen.queryByRole('region', { name: 'Clos ces 30 derniers jours' })).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('un clos plus ancien que 30 jours (clos_recent faux) n’est pas montré', () => {
    liste([ligne(4, { ...CLOS, id: CLOS.id, clos_recent: false })])
    expect(screen.queryByRole('region', { name: 'Clos ces 30 derniers jours' })).toBeNull()
  })

  it('problème passager : « Réessayer » ; chargement : ni compte ni ligne', async () => {
    const reessayer = vi.fn()
    const { unmount } = render(
      <ContenuBlocSignalements contenu={{ etat: 'probleme', reessayer }} />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(reessayer).toHaveBeenCalled()
    unmount()
    render(<ContenuBlocSignalements contenu={{ etat: 'chargement' }} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Signalements' })).toBeInTheDocument()
    expect(screen.queryByText(/signalements? ouverts?/)).toBeNull()
  })
})

describe('« Clore le signalement »', () => {
  it('ouvre le petit panneau : réponse facultative, rappel en dessous, focus dans le champ', async () => {
    liste([PLUS_ANCIEN])
    const bouton = screen.getByRole('button', { name: CLORE })
    expect(bouton).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(bouton)
    expect(bouton).toHaveAttribute('aria-expanded', 'true')
    const commentaire = screen.getByLabelText(REPONSE)
    expect(commentaire).toHaveFocus()
    expect(commentaire).toHaveAccessibleDescription(
      expect.stringContaining(`${RAPPEL} 0 sur 280`) as string,
    )
    expect(screen.getByText('Un signalement clos ne se rouvre pas.')).toBeInTheDocument()
    // Le même libellé confirme (T66, t368).
    expect(confirmer()).toHaveAttribute('type', 'submit')
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(screen.queryByLabelText(REPONSE)).toBeNull()
    expect(bouton).toHaveFocus()
  })

  it('sans réponse : clore avec null, puis « Signalement clos. » et le focus sur le titre', async () => {
    const { cloturer } = liste([PLUS_ANCIEN])
    await userEvent.click(screen.getByRole('button', { name: CLORE }))
    await userEvent.click(confirmer())
    expect(cloturer).toHaveBeenCalledWith({ signalementId: PLUS_ANCIEN.id, commentaire: null })
    expect(await screen.findByText('Signalement clos.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Signalements' })).toHaveFocus()
  })

  it('réponse de 9 caractères : l’erreur sous le champ, rien n’est envoyé', async () => {
    const { cloturer } = liste([PLUS_ANCIEN])
    await userEvent.click(screen.getByRole('button', { name: CLORE }))
    await userEvent.type(screen.getByLabelText(REPONSE), 'Trop court')
    await userEvent.clear(screen.getByLabelText(REPONSE))
    await userEvent.type(screen.getByLabelText(REPONSE), 'Neuf lett')
    await userEvent.click(confirmer())
    expect(
      await screen.findByText('Écrivez au moins 10 caractères, ou laissez la réponse vide.'),
    ).toBeInTheDocument()
    expect(cloturer).not.toHaveBeenCalled()
  })

  it('« Ce signalement est déjà clos. » : le bloc le dit et relit la liste', async () => {
    const { relire } = liste([PLUS_ANCIEN], {
      cloturer: vi.fn(() =>
        Promise.reject({ code: 'P0001', message: 'Ce signalement est déjà clos.' }),
      ),
    } as Partial<ContenuBloc>)
    await userEvent.click(screen.getByRole('button', { name: CLORE }))
    await userEvent.type(screen.getByLabelText(REPONSE), 'transmis à l’administration')
    await userEvent.click(confirmer())
    expect(await screen.findByRole('alert')).toHaveTextContent('Ce signalement est déjà clos.')
    expect(relire).toHaveBeenCalled()
  })

  it('le refus « déjà clos » s’efface quand on ouvre un autre panneau de clôture', async () => {
    liste([PLUS_ANCIEN, PLUS_RECENT], {
      cloturer: vi.fn(() =>
        Promise.reject({ code: 'P0001', message: 'Ce signalement est déjà clos.' }),
      ),
    } as Partial<ContenuBloc>)
    await userEvent.click(ouvreurs()[0]!)
    await userEvent.click(confirmer())
    expect(await screen.findByRole('alert')).toHaveTextContent('Ce signalement est déjà clos.')
    await userEvent.click(ouvreurs()[1]!)
    expect(screen.queryByText('Ce signalement est déjà clos.')).toBeNull()
  })

  it('le libellé du champ dit que la réponse va au ministère', async () => {
    liste([PLUS_ANCIEN])
    await userEvent.click(screen.getByRole('button', { name: CLORE }))
    expect(screen.getByRole('textbox', { name: REPONSE })).toBeInTheDocument()
  })

  it('connexion perdue : l’erreur sous le bouton, réponse gardée', async () => {
    liste([PLUS_ANCIEN], {
      cloturer: vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    } as Partial<ContenuBloc>)
    await userEvent.click(screen.getByRole('button', { name: CLORE }))
    await userEvent.type(screen.getByLabelText(REPONSE), 'Réglé par téléphone.')
    await userEvent.click(confirmer())
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La connexion a échoué. Votre saisie est encore dans le formulaire : réessayez.',
    )
    expect(screen.getByLabelText(REPONSE)).toHaveValue('Réglé par téléphone.')
  })
})
