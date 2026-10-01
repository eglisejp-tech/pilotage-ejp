import { AuthApiError } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { chargerEtatSession } from '@/features/session/chargement'
import { fauxSupabase } from '@/test/fauxSupabase'
import type { ScenarioSession } from '@/test/fauxSupabase'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

function installer(scenario: ScenarioSession) {
  const faux = fauxSupabase(scenario)
  courant.client = faux.client
  return faux
}

const berger: NonNullable<ScenarioSession['compte']> = {
  user_id: 'u-berger',
  type: 'berger',
  ministere_id: null,
  libelle: 'Berger',
  desactive_le: null,
}
const utilisateur = { id: 'u-berger', email: 'berger@exemple.test' }

afterEach(() => {
  vi.clearAllMocks()
})

describe('chargerEtatSession', () => {
  it('sans session : anonyme, sans aucune requête de données', async () => {
    const faux = installer({})
    expect(await chargerEtatSession()).toEqual({ statut: 'anonyme' })
    expect(faux.from).not.toHaveBeenCalled()
  })

  it('lit sa propre ligne de compte, filtrée sur son identifiant', async () => {
    const faux = installer({
      utilisateur,
      compte: berger,
      niveau: { currentLevel: 'aal2', nextLevel: 'aal2' },
    })
    const etat = await chargerEtatSession()
    expect(etat).toMatchObject({
      statut: 'connecte',
      compte: { type: 'berger', libelle: 'Berger', actif: true },
    })
    expect(faux.tables).toEqual(['compte'])
    expect(faux.eq).toHaveBeenCalledWith('user_id', 'u-berger')
    // En aal2, la liste des facteurs ne sert pas.
    expect(faux.auth.mfa.listFactors).not.toHaveBeenCalled()
  })

  it('aal1 avec un facteur vérifié : code, sur le premier facteur', async () => {
    installer({
      utilisateur,
      compte: berger,
      niveau: { currentLevel: 'aal1', nextLevel: 'aal2' },
      facteursVerifies: ['f1', 'f2'],
    })
    expect(await chargerEtatSession()).toMatchObject({ statut: 'code', facteurId: 'f1' })
  })

  it('aal1 sans facteur : activation', async () => {
    installer({ utilisateur, compte: berger })
    expect((await chargerEtatSession()).statut).toBe('activation')
  })

  it('compte désactivé ou absent : désactivé', async () => {
    installer({ utilisateur, compte: { ...berger, desactive_le: '2026-09-01T10:00:00Z' } })
    expect(await chargerEtatSession()).toEqual({ statut: 'desactive' })
    installer({ utilisateur, compte: null })
    expect(await chargerEtatSession()).toEqual({ statut: 'desactive' })
  })

  it('session révoquée par le serveur : déconnexion locale, puis anonyme', async () => {
    const faux = installer({
      utilisateur,
      compte: berger,
      niveau: { currentLevel: 'aal1', nextLevel: 'aal2' },
    })
    faux.auth.mfa.listFactors.mockResolvedValueOnce({
      data: null as never,
      error: new AuthApiError('Session not found', 403, 'session_not_found') as never,
    })
    expect(await chargerEtatSession()).toEqual({ statut: 'anonyme' })
    expect(faux.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('panne réseau : erreur, pour que la page propose « Réessayer »', async () => {
    const faux = installer({ utilisateur, compte: berger })
    faux.auth.mfa.getAuthenticatorAssuranceLevel.mockRejectedValueOnce(
      new TypeError('Failed to fetch'),
    )
    await expect(chargerEtatSession()).rejects.toThrow('Failed to fetch')
  })
})
