import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AvecRequetes } from '@/test/AvecRequetes'
import { PoseActionsPoint } from './PoseActionsPoint'

// Ici `ActionsPoint` n'est PAS remplacé : le test suit la vraie version (l'amorce de C0 aujourd'hui,
// celle du lot P1 après sa fusion). Un point traité n'a ni bouton ni fenêtre : le conteneur de la
// pose doit alors rester vide, donc caché (`empty:hidden`), sans espace en trop sous l'article.

const TRAITE = {
  id: 'p-traite',
  titre: { texte: 'Point déjà traité', masque: false },
  statut: 'traite',
  ministereId: 'com',
  mentionIds: ['coo'],
} as const

describe('PoseActionsPoint, point traité', () => {
  it.each([
    ['berger', { type: 'berger', ministereId: null }],
    ['conseil', { type: 'conseil', ministereId: null }],
    ['ministère créateur', { type: 'ministere', ministereId: 'com' }],
    ['ministère mentionné', { type: 'ministere', ministereId: 'coo' }],
  ] as const)('%s : aucun bouton, le conteneur reste vide', (_nom, compte) => {
    const { container } = render(
      <AvecRequetes>
        <MemoryRouter>
          <PoseActionsPoint point={TRAITE} compte={compte} />
        </MemoryRouter>
      </AvecRequetes>,
    )
    expect(container.querySelectorAll('button')).toHaveLength(0)
    const conteneurs = container.querySelectorAll('div.empty\\:hidden')
    for (const conteneur of conteneurs) expect(conteneur).toBeEmptyDOMElement()
  })

  it('sans compte (EJP Tech) : aucun conteneur', () => {
    const { container } = render(
      <AvecRequetes>
        <MemoryRouter>
          <PoseActionsPoint point={TRAITE} compte={null} />
        </MemoryRouter>
      </AvecRequetes>,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
