import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useEnLigne } from '@/components/etats/useEnLigne'

function changerReseau(enLigne: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(enLigne)
  act(() => {
    window.dispatchEvent(new Event(enLigne ? 'online' : 'offline'))
  })
}

describe('useEnLigne', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('vaut vrai quand le navigateur est connecté', () => {
    const { result } = renderHook(() => useEnLigne())
    expect(result.current).toBe(true)
  })

  it('vaut faux dès que le navigateur est hors ligne, puis revient à vrai', () => {
    const { result } = renderHook(() => useEnLigne())
    changerReseau(false)
    expect(result.current).toBe(false)
    changerReseau(true)
    expect(result.current).toBe(true)
  })

  it('part de faux si la page s’ouvre hors ligne', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { result } = renderHook(() => useEnLigne())
    expect(result.current).toBe(false)
  })

  it('retire ses écouteurs au démontage', () => {
    const retrait = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useEnLigne())
    unmount()
    const evenements = retrait.mock.calls.map(([nom]) => nom)
    expect(evenements).toContain('online')
    expect(evenements).toContain('offline')
  })
})
