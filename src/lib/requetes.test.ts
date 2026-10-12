import { onlineManager } from '@tanstack/react-query'
import { afterEach, describe, expect, it } from 'vitest'
import { clientRequetes, estDelaiDepasse, relancer } from '@/lib/requetes'

describe('clientRequetes', () => {
  afterEach(() => {
    onlineManager.setOnline(true)
    clientRequetes.clear()
  })

  it('garde le mode réseau « always » pour les lectures et les écritures', () => {
    const options = clientRequetes.getDefaultOptions()
    expect(options.queries?.networkMode).toBe('always')
    expect(options.mutations?.networkMode).toBe('always')
  })

  it('relit au retour du réseau (TanStack Query le coupe en mode « always »)', () => {
    expect(clientRequetes.getDefaultOptions().queries?.refetchOnReconnect).toBe(true)
  })

  it('reconnaît un délai dépassé, sous toutes ses formes', () => {
    const delai = new DOMException('The operation was aborted due to timeout', 'TimeoutError')
    expect(estDelaiDepasse(delai)).toBe(true)
    // L'erreur de postgrest-js : un objet dont le message commence par le nom d'origine.
    expect(
      estDelaiDepasse({ message: 'TimeoutError: The operation was aborted due to timeout' }),
    ).toBe(true)
    expect(estDelaiDepasse({ message: 'TypeError: Failed to fetch' })).toBe(false)
    expect(estDelaiDepasse(new Error('La connexion a échoué.'))).toBe(false)
    expect(estDelaiDepasse(null)).toBe(false)
    expect(estDelaiDepasse('TimeoutError')).toBe(false)
  })

  it('relance une fois après un échec, jamais après un délai dépassé', () => {
    const echec = new TypeError('Failed to fetch')
    const delai = { message: 'TimeoutError: The operation was aborted due to timeout' }
    expect(relancer(0, echec)).toBe(true)
    expect(relancer(1, echec)).toBe(false)
    expect(relancer(0, delai)).toBe(false)
    expect(clientRequetes.getDefaultOptions().queries?.retry).toBe(relancer)
  })

  it('une lecture hors ligne part quand même, et son échec remonte', async () => {
    onlineManager.setOnline(false)
    const erreur = new Error('La connexion a échoué.')
    await expect(
      clientRequetes.fetchQuery({
        queryKey: ['test', 'hors-ligne'],
        queryFn: () => Promise.reject(erreur),
        retry: false,
      }),
    ).rejects.toBe(erreur)
  })

  it('une lecture hors ligne qui réussit rend ses données', async () => {
    onlineManager.setOnline(false)
    const donnees = await clientRequetes.fetchQuery({
      queryKey: ['test', 'hors-ligne-ok'],
      queryFn: () => Promise.resolve(42),
    })
    expect(donnees).toBe(42)
  })
})
