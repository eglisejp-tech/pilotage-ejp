import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { EvenementLu } from '@/data/evenements'
import { construireCalendrier } from '@/features/fiche/construireCalendrier'
import { VueCalendrier } from '@/features/fiche/VueCalendrier'
import type { EtatCalendrier } from '@/features/fiche/VueCalendrier'
import type { TypeCompte } from '@/lib/base'

const MOI = 'm-com'
const AUTRE = 'm-coo'
const ministeres = [
  { id: MOI, code: 'communication', nom: 'Communication', desactive_le: null },
  { id: AUTRE, code: 'coordination', nom: 'Coordination', desactive_le: null },
]

function evenement(surcharge: Partial<EvenementLu> & { id: string }): EvenementLu {
  return {
    ministere_id: MOI,
    titre: 'Soirée de louange',
    date: '2026-10-10',
    statut: 'preparation',
    jours: 4,
    a_confirmer: false,
    reporte_du: null,
    ...surcharge,
  }
}

function afficher(profil: TypeCompte, evenements: EvenementLu[], mentions = [] as never[]) {
  const etat: EtatCalendrier = {
    etat: 'donnees',
    lignes: construireCalendrier(
      { evenements, mentions, ministeres },
      { ministereId: MOI, profil },
    ),
  }
  return render(
    <MemoryRouter>
      <VueCalendrier etat={etat} profil={profil} />
    </MemoryRouter>,
  )
}

const aConfirmer = evenement({
  id: 'a',
  titre: 'Visuels',
  statut: 'attente_validation',
  a_confirmer: true,
  jours: 2,
})
const mentionnant = evenement({
  id: 'm',
  titre: 'Collecte',
  ministere_id: AUTRE,
  statut: 'valide',
  date: '2026-10-14',
  jours: 8,
})

describe('VueCalendrier', () => {
  it('le ministère porteur : « Ajouter un événement » et « Mettre à jour » sur ses événements seulement', () => {
    afficher('ministere', [aConfirmer, mentionnant])
    expect(
      screen.getByRole('heading', { level: 2, name: 'Calendrier prévisionnel' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ajouter un événement' })).toHaveAttribute(
      'href',
      '/saisir/evenement',
    )
    const mettreAJour = screen.getAllByRole('link', { name: /^Mettre à jour/ })
    expect(mettreAJour).toHaveLength(1)
    expect(mettreAJour[0]).toHaveAttribute('href', '/saisir/evenement/a')
    const ligneMentionnee = screen.getByText('Collecte').closest('li') as HTMLElement
    expect(within(ligneMentionnee).queryByRole('link')).toBeNull()
    expect(within(ligneMentionnee).getByText('Mentionné par Coordination.')).toBeInTheDocument()
  })

  it.each(['berger', 'conseil', 'admin_plateforme'] as const)(
    '%s : aucun bouton de saisie',
    (profil) => {
      afficher(profil, [aConfirmer, mentionnant])
      expect(screen.queryByRole('link')).toBeNull()
      expect(screen.queryByRole('button')).toBeNull()
    },
  )

  it('le statut s’écrit en mots, et le texte de la date suit « En attente de validation »', () => {
    afficher('ministere', [aConfirmer])
    const ligne = screen.getByText('Visuels').closest('li') as HTMLElement
    expect(ligne).toHaveTextContent('En attente de validation, dans 2 jours')
  })

  it('un événement à confirmer ouvre le bloc par un bandeau, sans role="alert"', () => {
    const { container } = afficher('ministere', [aConfirmer])
    const bandeau = container.querySelector('[data-alerte-fiche]')
    expect(bandeau).not.toBeNull()
    expect(bandeau).toHaveTextContent('À confirmer')
    expect(bandeau).toHaveTextContent('Mettez à jour son statut.')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(within(bandeau as HTMLElement).queryByRole('button')).toBeNull()
  })

  it('rien à confirmer : aucun bandeau', () => {
    const { container } = afficher('ministere', [mentionnant])
    expect(container.querySelector('[data-alerte-fiche]')).toBeNull()
  })

  it('une date passée s’écrit avec les mots « date passée »', () => {
    afficher('berger', [{ ...aConfirmer, date: '2026-10-03', jours: -3 }])
    expect(screen.getByText('date passée depuis 3 jours')).toBeInTheDocument()
  })

  it('vide, ministère : « Aucun événement prévu. » et « Ajouter un événement », sans bandeau', () => {
    const { container } = afficher('ministere', [])
    expect(screen.getByText('Aucun événement prévu.')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Ajouter un événement' })).toHaveLength(1)
    expect(container.querySelector('[data-alerte-fiche]')).toBeNull()
  })

  it('vide, berger : « Aucun événement prévu. » sans aucune action', () => {
    afficher('berger', [])
    expect(screen.getByText('Aucun événement prévu.')).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('problème passager : le titre reste, « Réessayer » rappelle la lecture', async () => {
    let appels = 0
    render(
      <MemoryRouter>
        <VueCalendrier
          etat={{ etat: 'erreur', reessayer: () => (appels += 1) }}
          profil="ministere"
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Calendrier prévisionnel' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    screen.getByRole('button', { name: 'Réessayer' }).click()
    expect(appels).toBe(1)
  })
})
