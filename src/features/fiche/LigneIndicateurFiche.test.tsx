import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { LigneIndicateurFiche } from '@/features/fiche/LigneIndicateurFiche'
import type { LigneIndicateurFiche as Ligne } from '@/features/fiche/modeleFiche'
import { simulerLargeur } from '@/test/largeur'

beforeEach(() => {
  simulerLargeur(1440)
})

const BASE: Ligne = {
  id: 'i-1',
  libelle: 'Bénéficiaires (passages)',
  aValider: null,
  calcul: false,
  jamaisSaisi: true,
  valeur: { etat: 'vide' },
  courbe: null,
  detail: null,
  detailSignale: false,
  somme: null,
  moisEnCours: null,
  sensible: { precisions: [], repartitions: null },
  aides: {},
}

function afficher(ligne: Ligne) {
  return render(
    <MemoryRouter>
      <ul>
        <LigneIndicateurFiche ligne={ligne} />
      </ul>
    </MemoryRouter>,
  )
}

describe('LigneIndicateurFiche : répartition d’un sensible', () => {
  it('sans catégories (null) : aucune ligne repliable', () => {
    afficher(BASE)
    expect(screen.queryByText('Répartition par catégorie')).toBeNull()
  })

  it('une liste vide ne montre jamais une ligne repliable sur un bloc vide (T36)', () => {
    afficher({ ...BASE, sensible: { precisions: [], repartitions: [] } })
    expect(screen.queryByText('Répartition par catégorie')).toBeNull()
  })

  it('un mois à montrer : la ligne repliable est là', () => {
    afficher({
      ...BASE,
      sensible: {
        precisions: [],
        repartitions: [
          {
            mois: '2026-09-01',
            titre: 'Septembre 2026',
            etat: 'aucune',
            texte: 'Pas de répartition pour septembre.',
          },
        ],
      },
    })
    expect(screen.getByText('Répartition par catégorie')).toBeInTheDocument()
  })
})
