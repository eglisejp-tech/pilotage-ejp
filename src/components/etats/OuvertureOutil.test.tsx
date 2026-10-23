import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FlammeVivante } from '@/components/etats/FlammeVivante'
import { OuvertureOutil, TEXTE_OUVERTURE } from '@/components/etats/OuvertureOutil'
import { DUREE_OUVERTURE_MS } from '@/components/etats/tempsChargement'
import { MESSAGES_COMMUNS } from '@/data/messagesBase'

/** « Réduire les animations » demandé par l'appareil, ou non. */
function moinsDAnimations(demande: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((requete: string) => ({
      matches: demande && requete === '(prefers-reduced-motion: reduce)',
      media: requete,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

/** jsdom n'a pas l'horloge SMIL : on la simule pour voir ce que le composant lui demande. */
function horlogeSmil() {
  const pause = vi.fn()
  const reprise = vi.fn()
  const temps = vi.fn()
  const prototype = SVGSVGElement.prototype as unknown as Record<string, unknown>
  prototype.pauseAnimations = pause
  prototype.unpauseAnimations = reprise
  prototype.setCurrentTime = temps
  return { pause, reprise, temps }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  const prototype = SVGSVGElement.prototype as unknown as Record<string, unknown>
  delete prototype.pauseAnimations
  delete prototype.unpauseAnimations
  delete prototype.setCurrentTime
})

describe('OuvertureOutil (T65, moment 1 ; T67 : vérification de la session)', () => {
  it('l’ouverture tout de suite : le monogramme se dessine, la flamme s’allume, 2,5 s, puis elle vit', () => {
    const { container } = render(<OuvertureOutil ouverture />)
    // Le dessin est là dès l'arrivée, sans les 300 ms de vide ; la zone lue existe, vide.
    const dessin = container.querySelector('svg')
    expect(dessin).toHaveAttribute('aria-hidden', 'true')
    expect(dessin).toHaveAttribute('data-ouverture', 'dessin')
    expect(container.querySelectorAll('.ouverture-trace')).toHaveLength(4)
    expect(container.querySelector('.ouverture-allumage')).not.toBeNull()
    const nom = screen.getByText('Pilotage EJP')
    expect(nom).toHaveAttribute('aria-hidden', 'true')
    expect(nom).toHaveClass('ouverture-nom')
    const zone = screen.getByRole('status')
    expect(zone).toBeEmptyDOMElement()
    // Le texte lu arrive à 300 ms, comme dans toute attente : il est annoncé à son arrivée. Le nom
    // de l'outil, qui le répète, n'est pas lu.
    act(() => vi.advanceTimersByTime(300))
    expect(zone).toHaveTextContent(TEXTE_OUVERTURE)
    act(() => vi.advanceTimersByTime(DUREE_OUVERTURE_MS - 301))
    expect(dessin).toHaveAttribute('data-ouverture', 'dessin')
    act(() => vi.advanceTimersByTime(1))
    expect(dessin).toHaveAttribute('data-ouverture', 'vivante')
    expect(dessin?.querySelector('animate')).not.toBeNull()
    expect(screen.getByText('Pilotage EJP')).not.toHaveClass('ouverture-nom')
  })

  it('« Chargement plus long que d’habitude » garde son temps : 4 s', () => {
    render(<OuvertureOutil ouverture />)
    act(() => vi.advanceTimersByTime(3999))
    expect(screen.getByRole('status')).toHaveTextContent(TEXTE_OUVERTURE)
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByRole('status')).toHaveTextContent(MESSAGES_COMMUNS.chargementLong)
  })

  it('les fois suivantes : rien pendant 300 ms, puis le monogramme entier et la flamme vivante', () => {
    const { container } = render(<OuvertureOutil ouverture={false} />)
    expect(container.querySelector('svg')).toBeNull()
    act(() => vi.advanceTimersByTime(300))
    expect(container.querySelector('svg')).toHaveAttribute('data-ouverture', 'vivante')
    expect(container.querySelector('.ouverture-allumage')).toBeNull()
  })

  it('moins d’animations : rien pendant 300 ms, puis le dessin entier et immobile (SMIL en pause)', () => {
    moinsDAnimations(true)
    const smil = horlogeSmil()
    const { container } = render(<OuvertureOutil ouverture />)
    expect(container.querySelector('svg')).toBeNull()
    act(() => vi.advanceTimersByTime(300))
    const dessin = container.querySelector('svg')
    expect(dessin).toHaveAttribute('data-ouverture', 'vivante')
    expect(dessin).toHaveAttribute('data-immobile')
    expect(smil.pause).toHaveBeenCalled()
    expect(smil.temps).toHaveBeenCalledWith(0)
    expect(screen.getByRole('status')).toHaveTextContent(TEXTE_OUVERTURE)
  })
})

describe('FlammeVivante et moins d’animations', () => {
  it('sans demande : les formes de la flamme bougent (SMIL relancé)', () => {
    moinsDAnimations(false)
    const smil = horlogeSmil()
    const { container } = render(<FlammeVivante />)
    expect(container.querySelector('svg')).not.toHaveAttribute('data-immobile')
    expect(smil.reprise).toHaveBeenCalled()
    expect(smil.pause).not.toHaveBeenCalled()
  })

  it('avec la demande : la flamme reste à sa première forme, immobile', () => {
    moinsDAnimations(true)
    const smil = horlogeSmil()
    const { container } = render(<FlammeVivante />)
    expect(container.querySelector('svg')).toHaveAttribute('data-immobile')
    expect(smil.pause).toHaveBeenCalled()
    expect(smil.temps).toHaveBeenCalledWith(0)
  })
})
