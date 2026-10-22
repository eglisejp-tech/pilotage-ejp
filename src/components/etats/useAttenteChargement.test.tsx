import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DELAI_INDICATEUR_MS,
  DUREE_MIN_INDICATEUR_MS,
  DUREE_OUVERTURE_MS,
} from '@/components/etats/tempsChargement'
import { useAttenteChargement } from '@/components/etats/useAttenteChargement'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function monter(enChargement: boolean, dureeMin?: number) {
  return renderHook(
    ({ lecture, duree }: { lecture: boolean; duree?: number }) =>
      useAttenteChargement(lecture, duree),
    { initialProps: { lecture: enChargement, duree: dureeMin } },
  )
}

/** Avance l'horloge en laissant React rendre entre deux minuteries, comme un navigateur. */
function avancer(ms: number) {
  for (let reste = ms; reste > 0; reste -= 50) {
    act(() => vi.advanceTimersByTime(Math.min(50, reste)))
  }
}

describe('useAttenteChargement (T65, règle de temps)', () => {
  it('les valeurs de la décision : 300 ms, 600 ms, 1,2 s pour l’ouverture', () => {
    expect(DELAI_INDICATEUR_MS).toBe(300)
    expect(DUREE_MIN_INDICATEUR_MS).toBe(600)
    expect(DUREE_OUVERTURE_MS).toBe(1200)
  })

  it('réponse en moins de 300 ms : rien ne reste, le contenu arrive aussitôt, en fondu', () => {
    const { result, rerender } = monter(true)
    expect(result.current).toEqual({ attente: true, fondu: true })
    avancer(250)
    rerender({ lecture: false, duree: undefined })
    expect(result.current).toEqual({ attente: false, fondu: true })
    // Aucune attente ne revient plus tard.
    avancer(1000)
    expect(result.current.attente).toBe(false)
  })

  it('réponse juste après l’indicateur : il reste 600 ms à partir de son apparition', () => {
    const { result, rerender } = monter(true)
    avancer(350)
    rerender({ lecture: false, duree: undefined })
    expect(result.current.attente).toBe(true)
    avancer(500)
    expect(result.current.attente).toBe(true)
    avancer(100)
    expect(result.current.attente).toBe(false)
  })

  it('lecture plus longue que 900 ms : le contenu arrive dès la réponse, sans attente de plus', () => {
    const { result, rerender } = monter(true)
    avancer(2000)
    expect(result.current.attente).toBe(true)
    rerender({ lecture: false, duree: undefined })
    expect(result.current.attente).toBe(false)
  })

  // Le crochet ignore le résultat de la lecture : une erreur attend comme un contenu. Les écrans
  // d'erreur qui suivent sont vérifiés par ApresChargement.test.tsx et Garde.test.tsx.
  it('réponse à 400 ms : l’indicateur, montré à 300 ms, part à 900 ms exactement', () => {
    const { result, rerender } = monter(true)
    avancer(400)
    rerender({ lecture: false, duree: undefined })
    expect(result.current.attente).toBe(true)
    act(() => vi.advanceTimersByTime(499))
    expect(result.current.attente).toBe(true)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.attente).toBe(false)
  })

  it('données déjà là : ni attente, ni fondu', () => {
    const { result } = monter(false)
    expect(result.current).toEqual({ attente: false, fondu: false })
  })

  it('une nouvelle lecture repart de zéro : rien pendant 300 ms', () => {
    const { result, rerender } = monter(false)
    rerender({ lecture: true, duree: undefined })
    expect(result.current).toEqual({ attente: true, fondu: true })
    avancer(200)
    rerender({ lecture: false, duree: undefined })
    expect(result.current.attente).toBe(false)
  })

  it('l’ouverture de l’outil tient 1,2 s, même si la durée demandée change ensuite', () => {
    const { result, rerender } = monter(true, DUREE_OUVERTURE_MS)
    avancer(350)
    rerender({ lecture: false, duree: DUREE_MIN_INDICATEUR_MS })
    avancer(1100)
    expect(result.current.attente).toBe(true)
    avancer(100)
    expect(result.current.attente).toBe(false)
  })
})
