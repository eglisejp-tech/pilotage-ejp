import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as ecriture from '@/data/pointsEcriture'
import { ActionsPoint } from '@/features/points-actions/ActionsPoint'
import type { CompteDesActions, PointDesActions } from '@/features/points-actions/ActionsPoint'
import { retirerAnnonce } from '@/features/points-actions/annonce'
import type { StatutPoint, TypeCompte } from '@/lib/base'
import { simulerLargeur } from '@/test/largeur'

vi.mock('@/data/pointsEcriture', async (importerOriginal) => {
  const original = await importerOriginal<typeof ecriture>()
  return {
    ...original,
    changerStatutPoint: vi.fn(() => Promise.resolve()),
    marquerTraite: vi.fn(() => Promise.resolve()),
  }
})

const CREATEUR = '10000000-0000-4000-8000-000000000001'
const MENTIONNE = '10000000-0000-4000-8000-000000000002'
const AUTRE = '10000000-0000-4000-8000-000000000003'
const POINT_ID = '30000000-0000-4000-8000-000000000001'
const RAPPEL =
  "N'écrivez aucun nom ni information personnelle. Les champs libres sont relus par EJP Tech."

const changerStatut = vi.mocked(ecriture.changerStatutPoint)
const marquer = vi.mocked(ecriture.marquerTraite)

function unPoint(statut: StatutPoint = 'a_traiter'): PointDesActions {
  return {
    id: POINT_ID,
    titre: { texte: 'Salle pour la soirée de louange', masque: false },
    statut,
    ministereId: CREATEUR,
    mentions: [MENTIONNE],
  }
}

function afficher(
  compte: CompteDesActions,
  point: PointDesActions = unPoint(),
  clientRequetes = new QueryClient(),
) {
  const invalider = vi.spyOn(clientRequetes, 'invalidateQueries')
  const rendu = render(
    <QueryClientProvider client={clientRequetes}>
      <ActionsPoint point={point} compte={compte} />
    </QueryClientProvider>,
  )
  return { ...rendu, invalider }
}

const ministere = (ministereId: string): CompteDesActions => ({ type: 'ministere', ministereId })
const sansMinistere = (type: TypeCompte): CompteDesActions => ({ type, ministereId: null })

beforeEach(() => {
  simulerLargeur(1440)
  changerStatut.mockReset()
  changerStatut.mockResolvedValue(undefined)
  marquer.mockReset()
  marquer.mockResolvedValue(undefined)
})

afterEach(() => {
  retirerAnnonce()
  vi.unstubAllGlobals()
})

describe('les boutons se montrent selon le profil', () => {
  it.each([
    ['le ministère créateur', ministere(CREATEUR)],
    ['un ministère mentionné', ministere(MENTIONNE)],
  ])('%s : « Changer le statut » et « Marquer traité »', (_nom, compte) => {
    afficher(compte)
    expect(screen.getByRole('button', { name: 'Changer le statut' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Marquer traité' })).toBeInTheDocument()
  })

  it.each([
    ['le berger', sansMinistere('berger')],
    ['le conseil', sansMinistere('conseil')],
  ])('%s : « Marquer traité » seulement', (_nom, compte) => {
    afficher(compte)
    expect(screen.getByRole('button', { name: 'Marquer traité' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Changer le statut' })).toBeNull()
  })

  it.each([
    ['un autre ministère', ministere(AUTRE)],
    ["l'administration de l'église", sansMinistere('admin_eglise')],
    ['EJP Tech', sansMinistere('admin_plateforme')],
  ])('%s : aucun bouton', (_nom, compte) => {
    const { container } = afficher(compte)
    expect(screen.queryByRole('button')).toBeNull()
    expect(container).toBeEmptyDOMElement()
  })

  it.each([
    ['le ministère créateur', ministere(CREATEUR)],
    ['un ministère mentionné', ministere(MENTIONNE)],
    ['le berger', sansMinistere('berger')],
    ['le conseil', sansMinistere('conseil')],
  ])('%s : un point traité n’a plus aucun bouton', (_nom, compte) => {
    const { container } = afficher(compte, unPoint('traite'))
    expect(screen.queryByRole('button')).toBeNull()
    expect(container).toBeEmptyDOMElement()
  })

  it('chaque bouton est décrit par le titre du point, pour les lecteurs d’écran', () => {
    afficher(ministere(CREATEUR))
    expect(screen.getByRole('button', { name: 'Marquer traité' })).toHaveAccessibleDescription(
      'Salle pour la soirée de louange',
    )
  })
})

describe('« Marquer traité » pour un ministère', () => {
  it('ouvre la fenêtre : titre du point, champ obligatoire, rappel une fois, compteur, phrase', async () => {
    const utilisateur = userEvent.setup()
    afficher(ministere(MENTIONNE))
    await utilisateur.click(screen.getByRole('button', { name: 'Marquer traité' }))

    const fenetre = screen.getByRole('dialog', { name: 'Marquer traité' })
    expect(fenetre).toHaveTextContent('« Salle pour la soirée de louange »')
    expect(screen.getByLabelText('Ce qui a été traité, et comment')).toBeInTheDocument()
    expect(screen.getAllByText(RAPPEL)).toHaveLength(1)
    expect(screen.getByText('0 sur 280')).toBeInTheDocument()
    expect(screen.getByText('Un point traité ne se rouvre pas.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument()
    expect(fenetre).toHaveFocus()
  })

  it('un commentaire vide ou de 9 caractères : le texte est dit sous le champ, rien n’est envoyé, le bouton reste actif', async () => {
    const utilisateur = userEvent.setup()
    afficher(ministere(CREATEUR))
    await utilisateur.click(screen.getByRole('button', { name: 'Marquer traité' }))
    const champ = screen.getByLabelText('Ce qui a été traité, et comment')
    const valider = screen.getAllByRole('button', { name: 'Marquer traité' }).at(-1)
    if (!valider) throw new Error('bouton absent')
    expect(valider).not.toHaveAttribute('aria-disabled')

    await utilisateur.click(valider)
    const message = 'Expliquez ce qui a été traité et comment (10 caractères au moins).'
    expect(screen.getByText(message)).toBeInTheDocument()
    expect(champ).toHaveAttribute('aria-invalid', 'true')
    expect(champ).toHaveFocus()

    await utilisateur.type(champ, '123456789')
    expect(screen.queryByText(message)).toBeNull()
    await utilisateur.click(valider)
    expect(screen.getByText(message)).toBeInTheDocument()
    expect(marquer).not.toHaveBeenCalled()
  })

  it('10 caractères : envoie le commentaire, ferme la fenêtre, dit « Point marqué traité. » et relit la page', async () => {
    const utilisateur = userEvent.setup()
    const { invalider } = afficher(ministere(MENTIONNE))
    await utilisateur.click(screen.getByRole('button', { name: 'Marquer traité' }))
    await utilisateur.type(
      screen.getByLabelText('Ce qui a été traité, et comment'),
      '  Salle confirmée pour le 10 octobre.  ',
    )
    const boutons = screen.getAllByRole('button', { name: 'Marquer traité' })
    await utilisateur.click(boutons.at(-1) as HTMLElement)

    await waitFor(() => expect(marquer).toHaveBeenCalledTimes(1))
    // Les blancs de bord sont retirés avant l'envoi, comme le fait la base.
    expect(marquer).toHaveBeenCalledWith(POINT_ID, 'Salle confirmée pour le 10 octobre.')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(await screen.findByText('Point marqué traité.')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Point marqué traité.')
    expect(invalider).toHaveBeenCalledTimes(1)
  })

  it('le message de réussite reste affiché même quand le bouton disparaît avec la ligne du point', async () => {
    const utilisateur = userEvent.setup()
    const { rerender } = afficher(ministere(MENTIONNE))
    await utilisateur.click(screen.getByRole('button', { name: 'Marquer traité' }))
    await utilisateur.type(
      screen.getByLabelText('Ce qui a été traité, et comment'),
      'Salle confirmée pour le 10 octobre.',
    )
    await utilisateur.click(screen.getAllByRole('button', { name: 'Marquer traité' }).at(-1)!)
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <ActionsPoint point={unPoint('traite')} compte={ministere(MENTIONNE)} />
      </QueryClientProvider>,
    )
    expect(screen.queryByRole('button', { name: 'Marquer traité' })).toBeNull()
    expect(await screen.findByText('Point marqué traité.')).toBeInTheDocument()
  })

  it('un envoi en cours ignore un second clic', async () => {
    const utilisateur = userEvent.setup()
    let finir: () => void = () => undefined
    marquer.mockReturnValue(new Promise<void>((resolu) => (finir = resolu)))
    afficher(ministere(CREATEUR))
    await utilisateur.click(screen.getByRole('button', { name: 'Marquer traité' }))
    await utilisateur.type(
      screen.getByLabelText('Ce qui a été traité, et comment'),
      'Réglé avec le propriétaire.',
    )
    await utilisateur.click(screen.getAllByRole('button', { name: 'Marquer traité' }).at(-1)!)
    const enCours = await screen.findByRole('button', { name: 'Envoi en cours' })
    expect(enCours).toHaveAttribute('aria-disabled', 'true')
    await utilisateur.click(enCours)
    expect(marquer).toHaveBeenCalledTimes(1)
    finir()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('un refus de la base se dit tel quel sous le bouton, le texte reste dans le champ', async () => {
    const utilisateur = userEvent.setup()
    marquer.mockRejectedValue({ code: 'P0001', message: 'Ce point est déjà traité.' })
    const { invalider } = afficher(ministere(CREATEUR))
    await utilisateur.click(screen.getByRole('button', { name: 'Marquer traité' }))
    const champ = screen.getByLabelText('Ce qui a été traité, et comment')
    await utilisateur.type(champ, 'Réglé avec le propriétaire.')
    await utilisateur.click(screen.getAllByRole('button', { name: 'Marquer traité' }).at(-1)!)

    expect(await screen.findByRole('alert')).toHaveTextContent('Ce point est déjà traité.')
    expect(champ).toHaveValue('Réglé avec le propriétaire.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // La page est périmée : elle est relue.
    expect(invalider).toHaveBeenCalledTimes(1)
  })

  it('une connexion perdue garde le texte et dit de réessayer', async () => {
    const utilisateur = userEvent.setup()
    marquer.mockRejectedValue(new TypeError('Failed to fetch'))
    const { invalider } = afficher(ministere(CREATEUR))
    await utilisateur.click(screen.getByRole('button', { name: 'Marquer traité' }))
    const champ = screen.getByLabelText('Ce qui a été traité, et comment')
    await utilisateur.type(champ, 'Réglé avec le propriétaire.')
    await utilisateur.click(screen.getAllByRole('button', { name: 'Marquer traité' }).at(-1)!)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La connexion a échoué. Votre commentaire est encore dans le formulaire : réessayez.',
    )
    expect(champ).toHaveValue('Réglé avec le propriétaire.')
    expect(invalider).not.toHaveBeenCalled()
    // Le bouton redevient actif : un second essai part.
    marquer.mockResolvedValue(undefined)
    await utilisateur.click(screen.getAllByRole('button', { name: 'Marquer traité' }).at(-1)!)
    await waitFor(() => expect(marquer).toHaveBeenCalledTimes(2))
  })

  it('« Annuler », « Retour » et Échap ferment sans rien écrire', async () => {
    const utilisateur = userEvent.setup()
    afficher(ministere(CREATEUR))
    const ouvrir = screen.getByRole('button', { name: 'Marquer traité' })

    await utilisateur.click(ouvrir)
    await utilisateur.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(screen.queryByRole('dialog')).toBeNull()

    await utilisateur.click(ouvrir)
    await utilisateur.click(screen.getByRole('button', { name: 'Retour' }))
    expect(screen.queryByRole('dialog')).toBeNull()

    await utilisateur.click(ouvrir)
    await utilisateur.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(ouvrir).toHaveFocus()
    expect(marquer).not.toHaveBeenCalled()
  })

  it('un titre masqué par EJP Tech s’affiche tel quel, sans guillemets', async () => {
    const utilisateur = userEvent.setup()
    afficher(ministere(CREATEUR), {
      ...unPoint(),
      titre: { texte: '[texte masqué par EJP Tech]', masque: true },
    })
    await utilisateur.click(screen.getByRole('button', { name: 'Marquer traité' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('[texte masqué par EJP Tech]')
    expect(screen.queryByText(/«/)).toBeNull()
  })

  it('le compteur passe de 0 sur 280 à la longueur écrite, et un texte de 281 caractères est refusé', async () => {
    const utilisateur = userEvent.setup()
    afficher(ministere(CREATEUR))
    await utilisateur.click(screen.getByRole('button', { name: 'Marquer traité' }))
    const champ = screen.getByLabelText('Ce qui a été traité, et comment')
    await utilisateur.click(champ)
    await utilisateur.paste('é'.repeat(281))
    expect(screen.getByText('281 sur 280')).toBeInTheDocument()
    await utilisateur.click(screen.getAllByRole('button', { name: 'Marquer traité' }).at(-1)!)
    expect(screen.getByText('Le commentaire dépasse 280 caractères.')).toBeInTheDocument()
    expect(marquer).not.toHaveBeenCalled()
  })
})

describe('« Marquer traité » pour le berger et le conseil', () => {
  it.each([['berger'], ['conseil']] as const)(
    '%s : « Commentaire (facultatif) », envoi sans commentaire possible',
    async (type) => {
      const utilisateur = userEvent.setup()
      afficher(sansMinistere(type))
      await utilisateur.click(screen.getByRole('button', { name: 'Marquer traité' }))
      expect(screen.getByLabelText('Commentaire (facultatif)')).toBeInTheDocument()
      expect(screen.queryByLabelText('Ce qui a été traité, et comment')).toBeNull()
      expect(screen.getAllByText(RAPPEL)).toHaveLength(1)

      await utilisateur.click(screen.getAllByRole('button', { name: 'Marquer traité' }).at(-1)!)
      await waitFor(() => expect(marquer).toHaveBeenCalledWith(POINT_ID, null))
      expect(await screen.findByText('Point marqué traité.')).toBeInTheDocument()
    },
  )

  it('un commentaire écrit est envoyé', async () => {
    const utilisateur = userEvent.setup()
    afficher(sansMinistere('berger'))
    await utilisateur.click(screen.getByRole('button', { name: 'Marquer traité' }))
    await utilisateur.type(screen.getByLabelText('Commentaire (facultatif)'), 'Vu en réunion.')
    await utilisateur.click(screen.getAllByRole('button', { name: 'Marquer traité' }).at(-1)!)
    await waitFor(() => expect(marquer).toHaveBeenCalledWith(POINT_ID, 'Vu en réunion.'))
  })
})

describe('« Changer le statut »', () => {
  it('trois vrais boutons radio, le statut actuel choisi, la note visible, une aide sur « Statut »', async () => {
    const utilisateur = userEvent.setup()
    afficher(ministere(CREATEUR), unPoint('en_cours'))
    await utilisateur.click(screen.getByRole('button', { name: 'Changer le statut' }))

    const fenetre = screen.getByRole('dialog', { name: 'Changer le statut' })
    expect(fenetre).toHaveTextContent('« Salle pour la soirée de louange »')
    const groupe = screen.getByRole('group', { name: 'Statut' })
    const radios = screen.getAllByRole('radio')
    expect(radios.map((radio) => radio.getAttribute('type'))).toEqual(['radio', 'radio', 'radio'])
    expect(screen.getByRole('radio', { name: 'À traiter' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'En cours' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'En attente de décision' })).not.toBeChecked()
    expect(groupe).toHaveAccessibleDescription(
      'Un point « En attente de décision » passe avant les autres dans « À décider ».',
    )
    expect(screen.getByRole('button', { name: 'Aide : Statut' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enregistrer le statut' })).toBeInTheDocument()
    // Aucun champ libre : pas de rappel sur les données personnelles.
    expect(screen.queryByText(RAPPEL)).toBeNull()
  })

  it('« À traiter » est choisi à l’ouverture pour un point À traiter', async () => {
    const utilisateur = userEvent.setup()
    afficher(ministere(MENTIONNE), unPoint('a_traiter'))
    await utilisateur.click(screen.getByRole('button', { name: 'Changer le statut' }))
    expect(screen.getByRole('radio', { name: 'À traiter' })).toBeChecked()
  })

  it('choisir « En cours » et enregistrer : envoi, fermeture, « Statut enregistré : En cours. », page relue', async () => {
    const utilisateur = userEvent.setup()
    const { invalider } = afficher(ministere(CREATEUR))
    await utilisateur.click(screen.getByRole('button', { name: 'Changer le statut' }))
    await utilisateur.click(screen.getByRole('radio', { name: 'En cours' }))
    await utilisateur.click(screen.getByRole('button', { name: 'Enregistrer le statut' }))

    await waitFor(() => expect(changerStatut).toHaveBeenCalledWith(POINT_ID, 'en_cours'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(await screen.findByText('Statut enregistré : En cours.')).toBeInTheDocument()
    expect(invalider).toHaveBeenCalledTimes(1)
  })

  it('« En attente de décision » : le message porte le libellé complet', async () => {
    const utilisateur = userEvent.setup()
    afficher(ministere(CREATEUR))
    await utilisateur.click(screen.getByRole('button', { name: 'Changer le statut' }))
    await utilisateur.click(screen.getByRole('radio', { name: 'En attente de décision' }))
    await utilisateur.click(screen.getByRole('button', { name: 'Enregistrer le statut' }))
    expect(await screen.findByText('Statut enregistré : En attente de décision.')).toBeVisible()
  })

  it('les flèches du clavier changent de statut dans le groupe', async () => {
    const utilisateur = userEvent.setup()
    afficher(ministere(CREATEUR))
    await utilisateur.click(screen.getByRole('button', { name: 'Changer le statut' }))
    screen.getByRole('radio', { name: 'À traiter' }).focus()
    await utilisateur.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'En cours' })).toBeChecked()
  })

  it('un refus de la base (point traité entre-temps) se dit sous le bouton, tel quel', async () => {
    const utilisateur = userEvent.setup()
    changerStatut.mockRejectedValue({
      code: 'P0001',
      message: 'Ce point est traité : il ne change plus.',
    })
    const { invalider } = afficher(ministere(CREATEUR))
    await utilisateur.click(screen.getByRole('button', { name: 'Changer le statut' }))
    await utilisateur.click(screen.getByRole('button', { name: 'Enregistrer le statut' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ce point est traité : il ne change plus.',
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(invalider).toHaveBeenCalledTimes(1)
  })

  it('une connexion perdue garde le choix et dit de réessayer', async () => {
    const utilisateur = userEvent.setup()
    changerStatut.mockRejectedValue(new TypeError('Failed to fetch'))
    afficher(ministere(CREATEUR))
    await utilisateur.click(screen.getByRole('button', { name: 'Changer le statut' }))
    await utilisateur.click(screen.getByRole('radio', { name: 'En cours' }))
    await utilisateur.click(screen.getByRole('button', { name: 'Enregistrer le statut' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La connexion a échoué. Votre choix est encore dans le formulaire : réessayez.',
    )
    expect(screen.getByRole('radio', { name: 'En cours' })).toBeChecked()
  })
})

describe('la fenêtre aux deux largeurs', () => {
  it.each([390, 599])('à %s px : pleine largeur, sans fond cliquable', async (largeur) => {
    simulerLargeur(largeur)
    const utilisateur = userEvent.setup()
    afficher(ministere(CREATEUR))
    await utilisateur.click(screen.getByRole('button', { name: 'Changer le statut' }))
    const fenetre = screen.getByRole('dialog')
    expect(fenetre).toHaveClass('w-full')
    expect(fenetre).toHaveClass('min-[600px]:max-w-[460px]')
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('la fenêtre se pose sur le corps de la page, hors de la ligne du point, et rend le défilement à la fermeture', async () => {
    const utilisateur = userEvent.setup()
    const { container } = afficher(ministere(CREATEUR))
    await utilisateur.click(screen.getByRole('button', { name: 'Marquer traité' }))
    expect(container.querySelector('[role="dialog"]')).toBeNull()
    expect(screen.getByRole('dialog').parentElement?.parentElement).toBe(document.body)
    await utilisateur.keyboard('{Escape}')
    expect(document.body.style.overflow).toBe('')
  })

  it('garde Tab dans la fenêtre', async () => {
    const utilisateur = userEvent.setup()
    afficher(ministere(CREATEUR))
    await utilisateur.click(screen.getByRole('button', { name: 'Changer le statut' }))
    const fenetre = screen.getByRole('dialog')
    for (let i = 0; i < 12; i += 1) {
      await utilisateur.tab()
      expect(fenetre.contains(document.activeElement)).toBe(true)
    }
  })
})
