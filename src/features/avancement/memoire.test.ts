import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CLE_FERMETURE,
  ecrireFermeture,
  lireFermeture,
  oublierMemoire,
} from '@/features/avancement/memoire'

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
  oublierMemoire()
})

describe('memoire de la fermeture', () => {
  it('écrit et relit la version dans le stockage', () => {
    expect(lireFermeture()).toBeNull()
    ecrireFermeture('2026-10-08')
    expect(window.localStorage.getItem(CLE_FERMETURE)).toBe('2026-10-08')
    expect(lireFermeture()).toBe('2026-10-08')
  })

  it('se rabat sur la mémoire quand le stockage lève une erreur', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqué')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqué')
    })
    expect(lireFermeture()).toBeNull()
    expect(() => ecrireFermeture('2026-10-08')).not.toThrow()
    expect(lireFermeture()).toBe('2026-10-08')
  })
})
