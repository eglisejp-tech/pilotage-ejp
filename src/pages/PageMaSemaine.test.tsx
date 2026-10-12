import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exempleMaSemaine } from '@/features/ma-semaine/exempleMaSemaine'
import { useMaSemaine } from '@/features/ma-semaine/useMaSemaine'
import { AvecRequetes } from '@/test/AvecRequetes'
import { PageMaSemaine } from './PageMaSemaine'

vi.mock('@/features/ma-semaine/useMaSemaine', () => ({ useMaSemaine: vi.fn() }))
const hook = vi.mocked(useMaSemaine)
const reessayer = vi.fn()

function afficher() {
  return render(
    <MemoryRouter>
      <PageMaSemaine ministereId="com" />
    </MemoryRouter>,
    { wrapper: AvecRequetes },
  )
}

beforeEach(() => {
  hook.mockReturnValue({ etat: 'chargement' })
})

afterEach(() => {
  vi.clearAllMocks()
  document.title = ''
})

describe('PageMaSemaine', () => {
  it('titre de l’onglet « Ma semaine, Pilotage EJP »', () => {
    afficher()
    expect(document.title).toBe('Ma semaine, Pilotage EJP')
    expect(hook).toHaveBeenCalledWith('com')
  })

  it('chargement : les titres tout de suite, aria-busy, aucune alerte', () => {
    const { container } = afficher()
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Ma semaine' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Vos chiffres de la semaine' }),
    ).toBeTruthy()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('erreur : « La connexion a échoué. Réessayez. » et « Réessayer », qui relance', async () => {
    hook.mockReturnValue({ etat: 'erreur', reessayer })
    afficher()
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    expect(screen.getByRole('heading', { level: 1, name: 'Ma semaine' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(reessayer).toHaveBeenCalledTimes(1)
  })

  it('prête : la vue, sans alerte', () => {
    hook.mockReturnValue({ etat: 'pret', donnees: exempleMaSemaine() })
    afficher()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).map((titre) => titre.textContent)).toEqual([
      'Vos saisies',
      'Vos chiffres de la semaine',
      'Vos points',
      "Dans l'église",
    ])
  })
})
