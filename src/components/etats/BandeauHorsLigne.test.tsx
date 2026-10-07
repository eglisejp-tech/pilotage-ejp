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

  it('garde une région « status » vide quand la connexion est là', () => {
    render(<BandeauHorsLigne />)
    const region = screen.getByRole('status')
    expect(region).toBeEmptyDOMElement()
    expect(region).not.toHaveClass('bg-alerte-fond')
  })

  it('remplit la même région avec la phrase annoncée (fond d’alerte) hors ligne', () => {
    render(<BandeauHorsLigne />)
    const regionAvant = screen.getByRole('status')
    changerReseau(false)
    const region = screen.getByRole('status')
    // La région existait déjà : un lecteur d'écran annonce le changement de son contenu.
    expect(region).toBe(regionAvant)
    expect(region).toHaveTextContent(
      'Pas de connexion internet. Les chiffres affichés peuvent dater.',
    )
    expect(region).toHaveTextContent(TEXTE_HORS_LIGNE)
    expect(screen.getByText(TEXTE_HORS_LIGNE)).toHaveClass('bg-alerte-fond')
  })

  it('vide la région au retour de la connexion, sans la retirer', () => {
    render(<BandeauHorsLigne />)
    changerReseau(false)
    expect(screen.getByRole('status')).toHaveTextContent(TEXTE_HORS_LIGNE)
    changerReseau(true)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
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
