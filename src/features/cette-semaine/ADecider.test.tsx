import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ADecider } from './ADecider'
import { exempleCetteSemaine, pointsOuvertsExemple } from './exemple'

const aDecider = pointsOuvertsExemple
const { lienTousLesPoints } = exempleCetteSemaine('berger').aDecider

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
    expect(within(troisieme!).getByText('@Coordination')).toBeInTheDocument()
  })

  it('sans compte (lecture seule, EJP Tech), aucun bouton : la pose est vérifiée par PoseActionsPoint.test.tsx', () => {
    const region = afficher()
    expect(within(region).queryByRole('button')).not.toBeInTheDocument()
  })

  it('écrit le nom complet du ministère mentionné, sur une ligne (T24)', () => {
    const [premier] = aDecider
    const region = afficher([{ ...premier!, mentions: ['Prodiges Junior'] }])
    expect(within(region).getByText('@Prodiges Junior')).toHaveClass('whitespace-nowrap')
  })

  it('montre en encre-3 un texte masqué par EJP Tech, et lui seul', () => {
    const [premier] = aDecider
    const masque = { texte: '[texte masqué par EJP Tech]', masque: true }
    const region = afficher([
      { ...premier!, titre: masque, attendu: { texte: 'Décider', masque: false } },
    ])
    expect(within(region).getByRole('heading', { level: 3 }).firstElementChild).toHaveClass(
      'text-encre-3',
    )
    expect(within(region).getByText('Décider')).not.toHaveClass('text-encre-3')
  })

  it('sans échéance, ni description, ni action attendue : la ligne du ministère seule', () => {
    const [premier] = aDecider
    const region = afficher([
      { ...premier!, echeance: null, description: null, attendu: null, mentions: [] },
    ])
    const point = within(region).getByRole('article')
    expect(point).not.toHaveTextContent('avant le')
    expect(point).not.toHaveTextContent('Attendu')
  })

  it("dit quand aucun point n'est ouvert", () => {
    const region = afficher([])
    expect(within(region).getByText('Aucun point ouvert.')).toBeInTheDocument()
    expect(within(region).queryByRole('button')).not.toBeInTheDocument()
  })
})
