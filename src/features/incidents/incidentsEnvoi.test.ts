import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { envoyer } from '@/data/envoi'
import { noterIncidents } from '@/data/incidents'
import { installerIncidents, sessionPrete } from '@/features/incidents/incidentsEnvoi'
import { ESPACE_PRINCIPAL } from '@/lib/espaces'
import { lireFile, viderMemoireFiles } from '@/lib/fileIncidents'
import { supabase } from '@/lib/supabase'

// Branchement des incidents d'envoi (T76, lot C ; conception 6.3) : l'incident entre dans la file
// de l'espace actif à tout moment ; la file ne part que quand la session de l'espace est en aal2,
// puis au retour du réseau et après une écriture réussie. L'envoi des incidents ne passe pas par
// `envoyer` : il ne crée jamais d'incident sur lui-même.

vi.mock('@/data/incidents', async (importer) => ({
  ...(await importer<Record<string, unknown>>()),
  noterIncidents: vi.fn(() => Promise.resolve(1)),
}))

const noter = vi.mocked(noterIncidents)

/** Un ajout d'événement dont la requête reste sans réponse. */
async function ajoutSansReponse(): Promise<void> {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new TypeError('Load failed'))),
  )
  await envoyer('rpc/marquer_relu', () =>
    supabase().rpc('marquer_relu', { p_cible: 'evenement', p_cible_id: 'x' }),
  )
}

async function ecritureReussie(): Promise<void> {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))),
  )
  await envoyer('rpc/marquer_relu', () =>
    supabase().rpc('marquer_relu', { p_cible: 'evenement', p_cible_id: 'x' }),
  )
}

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321')
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
  localStorage.clear()
  viderMemoireFiles()
  sessionPrete(null)
  noter.mockClear()
  installerIncidents()
})

afterEach(() => {
  sessionPrete(null)
  vi.unstubAllGlobals()
})

describe('incidents d’envoi : la file et son envoi', () => {
  it('sans session aal2, l’incident attend dans la file de l’espace actif', async () => {
    await ajoutSansReponse()
    expect(lireFile(ESPACE_PRINCIPAL)).toHaveLength(1)
    expect(lireFile(ESPACE_PRINCIPAL)[0]).toMatchObject({
      operation: 'marquer_relu',
      genre: 'sans_reponse',
    })
    expect(noter).not.toHaveBeenCalled()
  })

  it('la session de l’espace passe en aal2 : la file part, une fois, puis se vide', async () => {
    await ajoutSansReponse()
    sessionPrete(ESPACE_PRINCIPAL)
    await vi.waitFor(() => expect(noter).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(lireFile(ESPACE_PRINCIPAL)).toEqual([]))
  })

  it('au retour du réseau, la file part', async () => {
    sessionPrete(ESPACE_PRINCIPAL)
    noter.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await ajoutSansReponse()
    await vi.waitFor(() => expect(noter).toHaveBeenCalledTimes(1))
    expect(lireFile(ESPACE_PRINCIPAL)).toHaveLength(1)
    window.dispatchEvent(new Event('online'))
    await vi.waitFor(() => expect(noter).toHaveBeenCalledTimes(2))
    await vi.waitFor(() => expect(lireFile(ESPACE_PRINCIPAL)).toEqual([]))
  })

  it('après une écriture réussie, la file part', async () => {
    await ajoutSansReponse()
    // À l'ouverture de la session, l'envoi échoue : la file attend.
    noter.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    sessionPrete(ESPACE_PRINCIPAL)
    await vi.waitFor(() => expect(noter).toHaveBeenCalledTimes(1))
    expect(lireFile(ESPACE_PRINCIPAL)).toHaveLength(1)
    await ecritureReussie()
    await vi.waitFor(() => expect(noter).toHaveBeenCalledTimes(2))
    await vi.waitFor(() => expect(lireFile(ESPACE_PRINCIPAL)).toEqual([]))
  })

  it('l’envoi des incidents qui échoue ne crée aucun incident', async () => {
    sessionPrete(ESPACE_PRINCIPAL)
    noter.mockRejectedValue(new TypeError('Load failed'))
    await ajoutSansReponse()
    await vi.waitFor(() => expect(noter).toHaveBeenCalled())
    expect(lireFile(ESPACE_PRINCIPAL)).toHaveLength(1)
    noter.mockReset()
    noter.mockResolvedValue(1)
  })
})
