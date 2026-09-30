import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ADecider } from './ADecider'
import { exempleCetteSemaine } from './exemple'

const { aDecider, lienTousLesPoints } = exempleCetteSemaine('berger')

function afficher(points = aDecider) {
  render(
    <MemoryRouter>
      <ADecider points={points} lienTousLesPoints={lienTousLesPoints} />
    </MemoryRouter>,
  )
  return screen.getByRole('region', { name: 'À décider' })
}

describe('ADecider', () => {
  it("montre les trois premiers points ouverts, dans l'ordre reçu", () => {
    const region = afficher()
    expect(aDecider).toHaveLength(6)
    expect(
      within(region)
        .getAllByRole('heading', { level: 3 })
        .map((titre) => titre.textContent),
    ).toEqual([
      'Financement de Welcome Prodiges',
      'Planning du trimestre à valider',
      'Salle pour la soirée de louange',
    ])
    expect(within(region).getByRole('link', { name: 'Tous les points' })).toHaveAttribute(
      'href',
      '/points?vue=ouverts',
    )
  })

  it('donne à chaque point sa priorité en mot, son ministère, son échéance et son action attendue', () => {
    const region = afficher()
    const [premier, deuxieme, troisieme] = within(region).getAllByRole('article')
    expect(premier).toHaveTextContent('Priorité Urgente')
    expect(premier).toHaveTextContent('Intégration, avant le 5 oct.')
    expect(premier).toHaveTextContent('Attendu : Décision du conseil sur le budget')
    expect(deuxieme).toHaveTextContent('Priorité Haute')
    expect(within(deuxieme!).getByText('avant le 28 sept., dépassée')).toHaveClass('text-alerte')
    expect(within(troisieme!).getByText('@coordination')).toBeInTheDocument()
  })

  it('propose « Marquer traité » sur chaque point, décrit par son titre, en action secondaire', () => {
    const region = afficher()
    const boutons = within(region).getAllByRole('button', { name: 'Marquer traité' })
    expect(boutons).toHaveLength(3)
    expect(boutons[0]).toHaveAccessibleDescription('Financement de Welcome Prodiges')
    expect(boutons[0]).toHaveClass('bg-papier', 'min-h-cible')
    expect(boutons[0]).not.toHaveClass('bg-lumiere')
  })

  it("dit quand aucun point n'est ouvert", () => {
    const region = afficher([])
    expect(within(region).getByText('Aucun point ouvert.')).toBeInTheDocument()
    expect(within(region).queryByRole('button')).not.toBeInTheDocument()
  })
})
