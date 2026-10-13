import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BandeauHorsLigne,
  DUREE_RETOUR_EN_LIGNE_MS,
  TEXTE_HORS_LIGNE,
} from '@/components/etats/BandeauHorsLigne'

function changerReseau(enLigne: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(enLigne)
  act(() => {
    window.dispatchEvent(new Event(enLigne ? 'online' : 'offline'))
  })
}

describe('BandeauHorsLigne', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
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
    // m245 : ce qui risque d'arriver, lectures et saisies.
    expect(region).toHaveTextContent(
      "Pas de connexion internet. Les chiffres affichés peuvent dater, et vos saisies ne s'enregistrent pas.",
    )
    expect(region).toHaveTextContent(TEXTE_HORS_LIGNE)
    expect(screen.getByText(TEXTE_HORS_LIGNE)).toHaveClass('bg-alerte-fond')
  })

  it('au retour du réseau, la même région annonce « Connexion rétablie. » 4 s, puis se vide (m246)', () => {
    vi.useFakeTimers()
    render(<BandeauHorsLigne />)
    const regionAvant = screen.getByRole('status')
    changerReseau(false)
    expect(screen.getByRole('status')).toHaveTextContent(TEXTE_HORS_LIGNE)
    changerReseau(true)
    const region = screen.getByRole('status')
    expect(region).toBe(regionAvant)
    expect(region).toHaveTextContent(/^Connexion rétablie\.$/)
    act(() => {
      vi.advanceTimersByTime(DUREE_RETOUR_EN_LIGNE_MS - 1)
    })
    expect(region).toHaveTextContent('Connexion rétablie.')
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(region).toBeEmptyDOMElement()
  })

  it('une nouvelle coupure efface aussitôt « Connexion rétablie. »', () => {
    render(<BandeauHorsLigne />)
    changerReseau(false)
    changerReseau(true)
    expect(screen.getByRole('status')).toHaveTextContent('Connexion rétablie.')
    changerReseau(false)
    expect(screen.getByRole('status')).toHaveTextContent(TEXTE_HORS_LIGNE)
    expect(screen.queryByText('Connexion rétablie.')).toBeNull()
  })

  it('ne dit rien à l’ouverture en ligne : « Connexion rétablie. » suit seulement une coupure', () => {
    render(<BandeauHorsLigne />)
    expect(screen.queryByText('Connexion rétablie.')).toBeNull()
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
