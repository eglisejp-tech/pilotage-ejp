import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DELAI_AFFICHAGE_CHARGEMENT, useMotChargement } from '@/components/etats/useMotChargement'
import { DELAI_CHARGEMENT_LONG } from '@/lib/requetes'

afterEach(() => {
  vi.useRealTimers()
})

describe('useMotChargement (m248)', () => {
  it('rien pendant 300 ms, puis le mot, puis « plus long que d’habitude » après 4 s', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useMotChargement())
    expect(result.current).toBeNull()
    act(() => vi.advanceTimersByTime(DELAI_AFFICHAGE_CHARGEMENT))
    expect(result.current).toBe('Chargement')
    act(() => vi.advanceTimersByTime(DELAI_CHARGEMENT_LONG - DELAI_AFFICHAGE_CHARGEMENT - 1))
    expect(result.current).toBe('Chargement')
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe("Chargement plus long que d'habitude")
  })

  it('garde le mot de l’écran jusqu’à 4 s', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useMotChargement('Chargement du journal'))
    act(() => vi.advanceTimersByTime(DELAI_AFFICHAGE_CHARGEMENT))
    expect(result.current).toBe('Chargement du journal')
  })
})
