import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLectureAffichee } from '@/components/etats/useLectureAffichee'

type Lecture =
  { etat: 'chargement'; mode: 'ajout' | 'mise_a_jour' } | { etat: 'donnees'; nombre: number }

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useLectureAffichee (T65)', () => {
  it('pendant la tenue de 600 ms, l’écran garde la dernière lecture « chargement », avec ses champs', () => {
    const chargement: Lecture = { etat: 'chargement', mode: 'mise_a_jour' }
    const { result, rerender } = renderHook(({ lecture }) => useLectureAffichee(lecture), {
      initialProps: { lecture: chargement as Lecture },
    })
    act(() => vi.advanceTimersByTime(300))
    act(() => vi.advanceTimersByTime(100))
    rerender({ lecture: { etat: 'donnees', nombre: 3 } })
    // Rien d'avance : ni le nombre, ni la liste, tant que la flamme tient.
    expect(result.current.lecture).toEqual({ etat: 'chargement', mode: 'mise_a_jour' })
    act(() => vi.advanceTimersByTime(500))
    expect(result.current.lecture).toEqual({ etat: 'donnees', nombre: 3 })
    expect(result.current.fondu).toBe(true)
  })

  it('réponse rapide : la lecture reçue tout de suite', () => {
    const { result, rerender } = renderHook(({ lecture }) => useLectureAffichee(lecture), {
      initialProps: { lecture: { etat: 'chargement', mode: 'ajout' } as Lecture },
    })
    act(() => vi.advanceTimersByTime(100))
    rerender({ lecture: { etat: 'donnees', nombre: 1 } })
    expect(result.current.lecture).toEqual({ etat: 'donnees', nombre: 1 })
  })
})
