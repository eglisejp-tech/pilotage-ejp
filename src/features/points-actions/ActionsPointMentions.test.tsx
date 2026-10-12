import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MinistereListe } from '@/data/ministeres'
import { ActionsPoint } from '@/features/points-actions/ActionsPoint'
import type { CompteDesActions, PointDesActions } from '@/features/points-actions/ActionsPoint'
import { retirerAnnonce } from '@/features/points-actions/annonce'
import { ContexteEcrituresPoint } from '@/features/points-actions/ecritures'
import type { EcrituresPoint } from '@/features/points-actions/ecritures'
import type { StatutPoint, TypeCompte } from '@/lib/base'
import { simulerLargeur } from '@/test/largeur'

// « Modifier les mentions » (T54) : le bouton selon le profil, la fenêtre (cases, ministère
// désactivé, enregistrement sans changement), l'écriture, la relecture et les refus.

const CREATEUR = 'min-communication'
const MENTIONNE = 'min-integration'
const SOCIAL = 'min-social'
const ACCUEIL = 'min-accueil'
const POINT_ID = '30000000-0000-4000-8000-000000000001'

const ministere = (id: string, nom: string, desactive = false): MinistereListe => ({
  id,
  code: null,
  nom,
  desactive_le: desactive ? '2026-09-01T10:00:00+00:00' : null,
})
const MINISTERES = [
  ministere(CREATEUR, 'Communication'),
  ministere(MENTIONNE, 'Intégration'),
  ministere(SOCIAL, 'Social'),
  ministere(ACCUEIL, 'Accueil', true),
]

function unPoint(statut: StatutPoint = 'a_traiter', mentions = [MENTIONNE]): PointDesActions {
  return {
    id: POINT_ID,
    titre: { texte: 'Salle pour la soirée de louange', masque: false },
    statut,
    ministereId: CREATEUR,
    mentions,
  }
}

const compteMinistere = (ministereId: string): CompteDesActions => ({
  type: 'ministere',
  ministereId,
})
const sansMinistere = (type: TypeCompte): CompteDesActions => ({ type, ministereId: null })

const modifierMentions = vi.fn<EcrituresPoint['modifierMentions']>()
const lireMinisteres = vi.fn<EcrituresPoint['lireMinisteres']>()

function afficher(compte: CompteDesActions, point: PointDesActions = unPoint()) {
  const clientRequetes = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalider = vi.spyOn(clientRequetes, 'invalidateQueries')
  const ecritures: EcrituresPoint = {
    changerStatut: () => Promise.resolve(),
    marquerTraite: () => Promise.resolve(),
    modifierMentions,
    lireMinisteres,
  }
  render(
    <QueryClientProvider client={clientRequetes}>
      <ContexteEcrituresPoint value={ecritures}>
        <ActionsPoint point={point} compte={compte} />
      </ContexteEcrituresPoint>
    </QueryClientProvider>,
  )
  return { invalider }
}

const bouton = () => screen.queryByRole('button', { name: 'Modifier les mentions' })

async function ouvrir() {
  const declencheur = bouton()
  if (declencheur === null) throw new Error('Bouton « Modifier les mentions » absent.')
  await userEvent.click(declencheur)
  return screen.getByRole('dialog', { name: 'Modifier les mentions' })
}

beforeEach(() => {
  simulerLargeur(1440)
  modifierMentions.mockReset()
  modifierMentions.mockResolvedValue(undefined)
  lireMinisteres.mockReset()
  lireMinisteres.mockResolvedValue(MINISTERES)
})

afterEach(() => {
  retirerAnnonce()
})

describe('« Modifier les mentions » selon le profil', () => {
  it.each([
    ['le ministère créateur', compteMinistere(CREATEUR)],
    ['le berger', sansMinistere('berger')],
    ['le conseil', sansMinistere('conseil')],
  ])('%s voit le bouton sur un point ouvert', (_nom, compte) => {
    afficher(compte)
    expect(bouton()).toBeInTheDocument()
  })

  it.each([
    ['un ministère mentionné', compteMinistere(MENTIONNE)],
    ['un autre ministère', compteMinistere(SOCIAL)],
    ['l’administration de l’église', sansMinistere('admin_eglise')],
    ['EJP Tech', sansMinistere('admin_plateforme')],
  ])('%s ne voit pas le bouton', (_nom, compte) => {
    afficher(compte)
    expect(bouton()).toBeNull()
  })

  it.each([
    ['le ministère créateur', compteMinistere(CREATEUR)],
    ['le berger', sansMinistere('berger')],
    ['le conseil', sansMinistere('conseil')],
  ])('%s ne voit pas le bouton sur un point traité', (_nom, compte) => {
    afficher(compte, unPoint('traite'))
    expect(bouton()).toBeNull()
  })
})

describe('la fenêtre « Modifier les mentions »', () => {
  it('liste les ministères actifs sauf le créateur, les mentions actuelles cochées', async () => {
    afficher(compteMinistere(CREATEUR))
    const fenetre = await ouvrir()
    expect(fenetre).toHaveTextContent('« Salle pour la soirée de louange »')
    const cases = await within(fenetre).findAllByRole('checkbox')
    expect(cases.map((c) => c.getAttribute('value'))).toEqual([MENTIONNE, SOCIAL])
    expect(within(fenetre).getByRole('checkbox', { name: 'Intégration' })).toBeChecked()
    expect(within(fenetre).getByRole('checkbox', { name: 'Social' })).not.toBeChecked()
    expect(within(fenetre).getByRole('button', { name: 'Enregistrer les mentions' })).toBeVisible()
    expect(within(fenetre).getByText(/Un ministère retiré ne le voit plus/)).toBeInTheDocument()
  })

  it('garde coché un ministère mentionné puis désactivé, qu’on peut retirer', async () => {
    afficher(compteMinistere(CREATEUR), unPoint('a_traiter', [MENTIONNE, ACCUEIL]))
    const fenetre = await ouvrir()
    const accueil = await within(fenetre).findByRole('checkbox', { name: 'Accueil (désactivé)' })
    expect(accueil).toBeChecked()
    await userEvent.click(accueil)
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Enregistrer les mentions' }))
    await waitFor(() => expect(modifierMentions).toHaveBeenCalledTimes(1))
    expect(modifierMentions).toHaveBeenCalledWith(POINT_ID, [MENTIONNE])
  })

  it('envoie la liste voulue, dit « Mentions enregistrées. » et relit les lectures', async () => {
    const { invalider } = afficher(compteMinistere(CREATEUR))
    const fenetre = await ouvrir()
    await userEvent.click(await within(fenetre).findByRole('checkbox', { name: 'Social' }))
    await userEvent.click(within(fenetre).getByRole('checkbox', { name: 'Intégration' }))
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Enregistrer les mentions' }))
    await waitFor(() => expect(modifierMentions).toHaveBeenCalledWith(POINT_ID, [SOCIAL]))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await screen.findByText('Mentions enregistrées.')).toBeInTheDocument()
    await waitFor(() => expect(invalider).toHaveBeenCalled())
    // Le point reste ouvert : le bouton reste, et le focus y revient.
    expect(bouton()).toHaveFocus()
  })

  it('une liste vide retire toutes les mentions', async () => {
    afficher(sansMinistere('berger'))
    const fenetre = await ouvrir()
    await userEvent.click(await within(fenetre).findByRole('checkbox', { name: 'Intégration' }))
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Enregistrer les mentions' }))
    await waitFor(() => expect(modifierMentions).toHaveBeenCalledWith(POINT_ID, []))
  })

  it('enregistrer sans rien changer ferme la fenêtre sans écrire ni message', async () => {
    const { invalider } = afficher(compteMinistere(CREATEUR))
    const fenetre = await ouvrir()
    await within(fenetre).findByRole('checkbox', { name: 'Social' })
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Enregistrer les mentions' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(modifierMentions).not.toHaveBeenCalled()
    expect(invalider).not.toHaveBeenCalled()
    expect(screen.queryByText('Mentions enregistrées.')).toBeNull()
  })

  it('« Annuler » ferme sans rien écrire', async () => {
    afficher(compteMinistere(CREATEUR))
    const fenetre = await ouvrir()
    await userEvent.click(await within(fenetre).findByRole('checkbox', { name: 'Social' }))
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Annuler' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(modifierMentions).not.toHaveBeenCalled()
  })

  it('un refus de la base se dit tel quel, la fenêtre et les cases restent', async () => {
    modifierMentions.mockRejectedValue({
      code: 'P0001',
      message: 'Ce point est traité : ses mentions ne changent plus.',
    })
    const { invalider } = afficher(compteMinistere(CREATEUR))
    const fenetre = await ouvrir()
    await userEvent.click(await within(fenetre).findByRole('checkbox', { name: 'Social' }))
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Enregistrer les mentions' }))
    expect(await within(fenetre).findByRole('alert')).toHaveTextContent(
      'Ce point est traité : ses mentions ne changent plus.',
    )
    expect(within(fenetre).getByRole('checkbox', { name: 'Social' })).toBeChecked()
    // La page est périmée : elle est relue à la fermeture.
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Annuler' }))
    await waitFor(() => expect(invalider).toHaveBeenCalled())
  })

  it('une connexion perdue garde les cases et le dit', async () => {
    modifierMentions.mockRejectedValue({ message: 'FetchError: Failed to fetch', code: '' })
    const { invalider } = afficher(compteMinistere(CREATEUR))
    const fenetre = await ouvrir()
    await userEvent.click(await within(fenetre).findByRole('checkbox', { name: 'Social' }))
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Enregistrer les mentions' }))
    expect(await within(fenetre).findByRole('alert')).toHaveTextContent(
      'La connexion a échoué. Vos choix sont encore dans le formulaire : réessayez.',
    )
    expect(within(fenetre).getByRole('checkbox', { name: 'Social' })).toBeChecked()
    expect(invalider).not.toHaveBeenCalled()
  })

  it('la lecture des ministères qui échoue propose « Réessayer »', async () => {
    lireMinisteres.mockRejectedValueOnce(new Error('Failed to fetch'))
    afficher(compteMinistere(CREATEUR))
    const fenetre = await ouvrir()
    await userEvent.click(await within(fenetre).findByRole('button', { name: 'Réessayer' }))
    expect(await within(fenetre).findByRole('checkbox', { name: 'Social' })).toBeInTheDocument()
    expect(lireMinisteres).toHaveBeenCalledTimes(2)
  })

  it('sans autre ministère actif, une phrase à la place des cases', async () => {
    lireMinisteres.mockResolvedValue([ministere(CREATEUR, 'Communication')])
    afficher(compteMinistere(CREATEUR), unPoint('a_traiter', []))
    const fenetre = await ouvrir()
    expect(
      await within(fenetre).findByText('Aucun autre ministère actif à mentionner.'),
    ).toBeVisible()
    expect(within(fenetre).queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('ne lit les ministères qu’à l’ouverture de la fenêtre', async () => {
    afficher(compteMinistere(CREATEUR))
    expect(lireMinisteres).not.toHaveBeenCalled()
    await ouvrir()
    await waitFor(() => expect(lireMinisteres).toHaveBeenCalledTimes(1))
  })
})
