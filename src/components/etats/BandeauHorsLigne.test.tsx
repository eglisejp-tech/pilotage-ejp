import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BandeauHorsLigne, TEXTE_HORS_LIGNE } from '@/components/etats/BandeauHorsLigne'

function changerReseau(enLigne: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(enLigne)
  act(() => {
    window.dispatchEvent(new Event(enLigne ? 'online' : 'offline'))
  })
}

describe('BandeauHorsLigne', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('n’affiche rien quand la connexion est là', () => {
    const { container } = render(<BandeauHorsLigne />)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('affiche la phrase annoncée (role="status", fond d’alerte) hors ligne', () => {
    render(<BandeauHorsLigne />)
    changerReseau(false)
    const bandeau = screen.getByRole('status')
    expect(bandeau).toHaveTextContent(
      'Pas de connexion internet. Les chiffres affichés peuvent dater.',
    )
    expect(bandeau).toHaveTextContent(TEXTE_HORS_LIGNE)
    expect(bandeau).toHaveClass('bg-alerte-fond')
  })

  it('disparaît au retour de la connexion', () => {
    render(<BandeauHorsLigne />)
    changerReseau(false)
    expect(screen.getByRole('status')).toBeInTheDocument()
    changerReseau(true)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('s’affiche d’emblée si la page s’ouvre hors ligne', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    render(<BandeauHorsLigne />)
    expect(screen.getByRole('status')).toHaveTextContent('Pas de connexion internet.')
  })

  it('ne contient aucun bouton ni lien : il informe seulement', () => {
    render(<BandeauHorsLigne />)
    changerReseau(false)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })
})
