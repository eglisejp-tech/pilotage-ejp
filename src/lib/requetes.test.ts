import { onlineManager } from '@tanstack/react-query'
import { afterEach, describe, expect, it } from 'vitest'
import { clientRequetes } from '@/lib/requetes'

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
