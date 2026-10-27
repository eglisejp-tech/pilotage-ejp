import { describe, expect, it, vi } from 'vitest'
import { MESSAGE_ENVOI_AUTRES_VALEURS } from '@/data/messagesBase'
import { creerPuisRelire } from '@/features/evenements/useApresEcriture'

// Une création à numéro anti-doublon (T76, lot B) : quand relire, quand dire la réussite.

describe('creerPuisRelire', () => {
  it('réussite : relit', async () => {
    const relire = vi.fn()
    await creerPuisRelire(() => Promise.resolve('id'), relire)
    expect(relire).toHaveBeenCalledTimes(1)
  })

  it('statut 200 reçu, corps perdu : la base a enregistré, c’est une réussite (relue)', async () => {
    const relire = vi.fn()
    await expect(
      creerPuisRelire(
        () => Promise.reject({ code: '', message: 'ReponsePerdue: statut 200, corps perdu' }),
        relire,
      ),
    ).resolves.toBeUndefined()
    expect(relire).toHaveBeenCalledTimes(1)
  })

  it('issue inconnue (aucune réponse) : l’erreur remonte, la liste est relue', async () => {
    const relire = vi.fn()
    const erreur = { code: '', message: 'TypeError: Load failed' }
    await expect(creerPuisRelire(() => Promise.reject(erreur), relire)).rejects.toBe(erreur)
    expect(relire).toHaveBeenCalledTimes(1)
  })

  it('numéro déjà servi avec d’autres valeurs : le premier envoi est enregistré, la liste est relue', async () => {
    const relire = vi.fn()
    const erreur = { code: 'P0001', message: MESSAGE_ENVOI_AUTRES_VALEURS }
    await expect(creerPuisRelire(() => Promise.reject(erreur), relire)).rejects.toBe(erreur)
    expect(relire).toHaveBeenCalledTimes(1)
  })

  it('refus de la base : rien d’enregistré, rien à relire', async () => {
    const relire = vi.fn()
    const erreur = { code: 'P0001', message: 'La date ne peut pas être passée.' }
    await expect(creerPuisRelire(() => Promise.reject(erreur), relire)).rejects.toBe(erreur)
    expect(relire).not.toHaveBeenCalled()
  })
})
