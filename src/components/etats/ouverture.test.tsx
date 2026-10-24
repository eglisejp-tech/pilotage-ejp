import { renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { oublierOuverture, passerOuverture, useOuverture } from '@/components/etats/ouverture'

// L'ouverture de l'outil ne joue qu'une fois par chargement de l'application (T65, T67).

beforeEach(() => {
  // src/test/setup.ts la passe pour les autres tests : ici, l'application vient d'être chargée.
  oublierOuverture()
})

describe('useOuverture (T67)', () => {
  it('la première vérification joue l’ouverture, les suivantes non', () => {
    const premiere = renderHook(() => useOuverture(true))
    expect(premiere.result.current).toBe(true)
    const suivante = renderHook(() => useOuverture(true))
    expect(suivante.result.current).toBe(false)
  })

  it('notée comme jouée dès qu’elle commence, même si la session est lue juste après', () => {
    const premiere = renderHook(({ lecture }) => useOuverture(lecture), {
      initialProps: { lecture: true },
    })
    premiere.rerender({ lecture: false })
    // L'écran qui a commencé l'ouverture la garde jusqu'au bout.
    expect(premiere.result.current).toBe(true)
    premiere.unmount()
    expect(renderHook(() => useOuverture(true)).result.current).toBe(false)
  })

  it('double montage de StrictMode : l’ouverture en cours reste, elle ne rejoue pas ensuite', () => {
    const premiere = renderHook(() => useOuverture(true), { wrapper: StrictMode })
    expect(premiere.result.current).toBe(true)
    const suivante = renderHook(() => useOuverture(true), { wrapper: StrictMode })
    expect(suivante.result.current).toBe(false)
  })

  it('sans lecture en cours, pas d’ouverture : elle reste pour la première vérification', () => {
    expect(renderHook(() => useOuverture(false)).result.current).toBe(false)
    expect(renderHook(() => useOuverture(true)).result.current).toBe(true)
  })

  it('passerOuverture (tests) : l’ouverture est réputée jouée', () => {
    passerOuverture()
    expect(renderHook(() => useOuverture(true)).result.current).toBe(false)
  })
})
