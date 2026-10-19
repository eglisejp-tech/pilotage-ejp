import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChargementEnLigne } from '@/components/etats/ChargementEnLigne'
import { ChargementPage } from '@/components/etats/ChargementPage'
import { IndicateurChargement } from '@/components/etats/IndicateurChargement'
import { DELAI_CHARGEMENT_LONG } from '@/lib/requetes'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('IndicateurChargement (T65, moment 2 : page de contenu)', () => {
  it('rien pendant 300 ms, puis la flamme vivante et le texte, lu par les lecteurs d’écran', () => {
    const { container } = render(<IndicateurChargement texte="Chargement de Ma semaine" />)
    const zone = screen.getByRole('status')
    // La zone existe dès le départ, vide : le texte qui y entre est annoncé.
    expect(zone).toBeEmptyDOMElement()
    act(() => vi.advanceTimersByTime(299))
    expect(zone).toBeEmptyDOMElement()
    act(() => vi.advanceTimersByTime(1))
    expect(zone).toHaveTextContent(/^Chargement de Ma semaine$/)
    const flamme = container.querySelector('[data-flamme="vivante"]')
    expect(flamme).toHaveAttribute('aria-hidden', 'true')
    // Trois formes en boucle (SMIL) et la lueur qui respire.
    expect(flamme?.querySelector('animate')?.getAttribute('values')?.split(';')).toHaveLength(4)
    expect(flamme?.querySelector('.flamme-lueur')).not.toBeNull()
  })

  it('après 4 s : « Chargement plus long que d’habitude », dans la même zone (m248)', () => {
    render(<IndicateurChargement texte="Chargement du journal" />)
    act(() => vi.advanceTimersByTime(DELAI_CHARGEMENT_LONG))
    expect(screen.getByRole('status')).toHaveTextContent("Chargement plus long que d'habitude")
  })

  it('ChargementPage : aria-busy et deux places réservées, grises seulement avec la flamme', () => {
    const { container } = render(<ChargementPage texte="Chargement des sessions" />)
    expect(container.firstElementChild).toHaveAttribute('aria-busy', 'true')
    const places = container.querySelectorAll('[data-place-reservee]')
    expect(places).toHaveLength(2)
    for (const place of places) {
      expect(place).toHaveAttribute('aria-hidden', 'true')
      expect(place).toHaveAttribute('data-place-reservee', 'attente')
      expect(place).toHaveClass('bg-transparent')
    }
    act(() => vi.advanceTimersByTime(300))
    for (const place of container.querySelectorAll('[data-place-reservee]')) {
      expect(place).toHaveAttribute('data-place-reservee', 'visible')
      // Gris immobile : aucune classe d'animation (pas de scintillement).
      expect(place.className).not.toMatch(/anim|pulse|flamme/)
    }
  })
})

describe('ChargementEnLigne (T65, moment 3 : bloc qui se relit)', () => {
  it('la petite flamme, de la taille du texte, et ce qui charge, après 300 ms', () => {
    const { container } = render(<ChargementEnLigne texte="Chargement de vos points" />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    act(() => vi.advanceTimersByTime(300))
    expect(screen.getByRole('status')).toHaveTextContent(/^Chargement de vos points$/)
    const flamme = container.querySelector('[data-flamme="petite"]')
    expect(flamme).toHaveAttribute('aria-hidden', 'true')
    expect(flamme).toHaveClass('h-[1.5em]', 'flamme-battement')
  })
})
