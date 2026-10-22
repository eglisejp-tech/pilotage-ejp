import { act, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FlammeVivante } from '@/components/etats/FlammeVivante'
import { oublierOuverture, useOuverture } from '@/components/etats/ouverture'
import { OuvertureOutil, TEXTE_OUVERTURE } from '@/components/etats/OuvertureOutil'
import { DUREE_OUVERTURE_MS } from '@/components/etats/tempsChargement'

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
  oublierOuverture()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  const prototype = SVGSVGElement.prototype as unknown as Record<string, unknown>
  delete prototype.pauseAnimations
  delete prototype.unpauseAnimations
  delete prototype.setCurrentTime
})

describe('OuvertureOutil (T65, moment 1 : vérification de la session)', () => {
  it('rien pendant 300 ms, puis le monogramme se dessine et la flamme s’allume, puis elle vit', () => {
    const { container } = render(<OuvertureOutil ouverture />)
    const zone = screen.getByRole('status')
    expect(zone).toBeEmptyDOMElement()
    act(() => vi.advanceTimersByTime(300))
    // Le texte est lu ; le dessin et le nom de l'outil, qui le répète, ne le sont pas.
    expect(zone).toHaveTextContent(TEXTE_OUVERTURE)
    const dessin = container.querySelector('svg')
    expect(dessin).toHaveAttribute('aria-hidden', 'true')
    expect(dessin).toHaveAttribute('data-ouverture', 'dessin')
    expect(container.querySelectorAll('.ouverture-trace')).toHaveLength(4)
    expect(container.querySelector('.ouverture-allumage')).not.toBeNull()
    expect(screen.getByText('Pilotage EJP')).toHaveAttribute('aria-hidden', 'true')
    act(() => vi.advanceTimersByTime(DUREE_OUVERTURE_MS - 1))
    expect(dessin).toHaveAttribute('data-ouverture', 'dessin')
    act(() => vi.advanceTimersByTime(1))
    expect(dessin).toHaveAttribute('data-ouverture', 'vivante')
    expect(dessin?.querySelector('animate')).not.toBeNull()
  })

  it('les fois suivantes : le monogramme est déjà là, la flamme vit tout de suite', () => {
    const { container } = render(<OuvertureOutil ouverture={false} />)
    act(() => vi.advanceTimersByTime(300))
    expect(container.querySelector('svg')).toHaveAttribute('data-ouverture', 'vivante')
    expect(container.querySelector('.ouverture-allumage')).toBeNull()
  })

  it('moins d’animations : pas d’ouverture, le dessin entier et immobile (SMIL en pause)', () => {
    moinsDAnimations(true)
    const smil = horlogeSmil()
    const { container } = render(<OuvertureOutil ouverture />)
    act(() => vi.advanceTimersByTime(300))
    const dessin = container.querySelector('svg')
    expect(dessin).toHaveAttribute('data-ouverture', 'vivante')
    expect(dessin).toHaveAttribute('data-immobile')
    expect(smil.pause).toHaveBeenCalled()
    expect(smil.temps).toHaveBeenCalledWith(0)
    expect(screen.getByRole('status')).toHaveTextContent(TEXTE_OUVERTURE)
  })

  it('useOuverture : l’ouverture ne joue qu’une fois par chargement de l’application', () => {
    const premiere = renderHook(() => useOuverture(true))
    expect(premiere.result.current).toBe(true)
    const suivante = renderHook(() => useOuverture(true))
    expect(suivante.result.current).toBe(false)
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
