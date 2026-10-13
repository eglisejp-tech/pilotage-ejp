import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { LigneListeMinistere } from '@/features/ministeres/construireListe'
import { ListeMinisteresTelephone } from '@/features/ministeres/ListeMinisteresTelephone'
import { TableauListeMinisteres } from '@/features/ministeres/TableauListeMinisteres'

// Audit d'accessibilité (faute A-04) : le lien d'un nom très court (« FIJ ») doit faire 44 px de
// large au moins, pas seulement 44 px de haut. jsdom ne mesure rien : on contrôle la classe, la
// mesure réelle est faite par l'audit avec la base (e2e/base/accessibilite.spec.ts).
const LIGNES: LigneListeMinistere[] = [
  {
    id: 'm1',
    nom: 'FIJ',
    description: null,
    href: '/ministeres/m1',
    fraicheur: { libelle: 'Aucune saisie', etat: 'alerte' },
    prochainEvenement: null,
    prochaineReunion: null,
    pointOuvert: null,
  },
]

describe('liens du nom dans la liste des ministères', () => {
  it('le tableau donne au lien une largeur minimale de 44 px', () => {
    render(
      <MemoryRouter>
        <TableauListeMinisteres ministeres={LIGNES} idTitre="titre" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'FIJ' })).toHaveClass('min-h-cible', 'min-w-cible')
  })

  it('la liste du téléphone donne au lien une largeur minimale de 44 px', () => {
    render(
      <MemoryRouter>
        <ListeMinisteresTelephone ministeres={LIGNES} idTitre="titre" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'FIJ' })).toHaveClass('min-h-cible', 'min-w-cible')
  })
})
