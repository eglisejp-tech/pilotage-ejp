import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor, configure } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lireIndicateursCommuns, lireSemaine } from '@/data/eglise'
import { lireComptesJournal, lireJournal } from '@/data/journal'
import { lireMinisteres } from '@/data/ministeres'
import {
  COMMUNS_EXEMPLE,
  COMPTES_EXEMPLE,
  lireExemple,
  MINISTERES_EXEMPLE,
  SESSIONS_EXEMPLE,
} from '@/features/journal/apercu/exemplesJournal'
import { SANS_FILTRE } from '@/features/journal/filtres'
import { useJournal } from '@/features/journal/useJournal'
import type { TypeCompte } from '@/lib/base'

// Sous la charge de toute la suite, une lecture simulée peut dépasser la seconde par défaut.
configure({ asyncUtilTimeout: 5000 })

vi.mock('@/data/eglise', () => ({ lireSemaine: vi.fn(), lireIndicateursCommuns: vi.fn() }))
vi.mock(import('@/data/journal'), async (importOriginal) => ({
  ...(await importOriginal()),
  lireJournal: vi.fn(),
  lireComptesJournal: vi.fn(),
}))
vi.mock('@/data/ministeres', () => ({ lireMinisteres: vi.fn() }))
const semaine = vi.mocked(lireSemaine)
const communs = vi.mocked(lireIndicateursCommuns)
const journal = vi.mocked(lireJournal)
const comptes = vi.mocked(lireComptesJournal)
const ministeres = vi.mocked(lireMinisteres)

let client: QueryClient
function enveloppe({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const LIGNE_SEMAINE = {
  aujourdhui: '2026-10-01',
  dimanche: '2026-09-27',
  lundi: '2026-09-21',
  numero: 39,
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  semaine.mockResolvedValue(LIGNE_SEMAINE)
  communs.mockResolvedValue(COMMUNS_EXEMPLE)
  ministeres.mockResolvedValue(MINISTERES_EXEMPLE)
  comptes.mockResolvedValue([...COMPTES_EXEMPLE])
  // La base d'exemple répond comme `lireJournal` : mêmes filtres, mêmes limites.
  journal.mockImplementation(async (demande) => ({
    ...lireExemple(demande, 'berger'),
    sessions: SESSIONS_EXEMPLE,
  }))
})

afterEach(() => {
  vi.clearAllMocks()
})

function lire(profil: TypeCompte, filtres = SANS_FILTRE) {
  return renderHook(({ filtresCourants }) => useJournal(profil, filtresCourants), {
    wrapper: enveloppe,
    initialProps: { filtresCourants: filtres },
  })
}

describe('useJournal', () => {
  it('chargement, puis 50 lignes sur 30 jours avec le jour de Paris de v_semaine', async () => {
    const { result } = lire('berger')
    expect(result.current).toEqual({ etat: 'chargement' })
    await waitFor(() => expect(result.current.etat).toBe('pret'))
    if (result.current.etat !== 'pret') throw new Error('attendu : prêt')
    expect(result.current.donnees.lignes).toHaveLength(50)
    expect(result.current.donnees.aPlus).toBe(true)
    // 30 jours avant le 1er octobre de la base : 1er septembre, minuit de Paris.
    expect(journal).toHaveBeenCalledWith({
      compte: null,
      action: null,
      ministere: null,
      depuis: '2026-08-31T22:00:00.000Z',
      apres: null,
      limite: 50,
    })
  })

  it('« Afficher 50 lignes de plus » lit les 50 suivantes après la dernière ligne, sans doublon', async () => {
    const { result } = lire('berger')
    await waitFor(() => expect(result.current.etat).toBe('pret'))
    if (result.current.etat !== 'pret') throw new Error('attendu : prêt')
    const premiere = (await journal.mock.results[0]?.value) as { suivant: unknown }
    expect(premiere.suivant).not.toBeNull()
    const { afficherPlus } = result.current
    act(() => afficherPlus())
    await waitFor(() => {
      expect(
        result.current.etat === 'pret' && result.current.donnees.lignes.length,
      ).toBeGreaterThan(50)
    })
    // La deuxième lecture ne relit pas le début : elle reprend après le curseur de la première.
    expect(journal).toHaveBeenCalledTimes(2)
    expect(journal).toHaveBeenLastCalledWith(
      expect.objectContaining({ limite: 50, apres: premiere.suivant }),
    )
    if (result.current.etat !== 'pret') throw new Error('attendu : prêt')
    const ids = result.current.donnees.lignes.map((ligne) => ligne.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('changer de filtre revient à la première page de 50 lignes', async () => {
    const { result, rerender } = lire('berger')
    await waitFor(() => expect(result.current.etat).toBe('pret'))
    if (result.current.etat !== 'pret') throw new Error('attendu : prêt')
    const { afficherPlus } = result.current
    act(() => afficherPlus())
    await waitFor(() => expect(journal).toHaveBeenCalledTimes(2))
    rerender({ filtresCourants: { ...SANS_FILTRE, action: 'mesure_saisie' } })
    await waitFor(() =>
      expect(journal).toHaveBeenLastCalledWith(
        expect.objectContaining({ action: 'mesure_saisie', apres: null, limite: 50 }),
      ),
    )
  })

  it('une page suivante en échec garde les lignes lues, puis « Réessayer » relit cette page', async () => {
    const { result } = lire('berger')
    await waitFor(() => expect(result.current.etat).toBe('pret'))
    if (result.current.etat !== 'pret') throw new Error('attendu : prêt')
    expect(result.current.reessayerPlus).toBeNull()
    journal.mockRejectedValueOnce(new Error('coupé'))
    const { afficherPlus } = result.current
    act(() => afficherPlus())
    await waitFor(() =>
      expect(result.current.etat === 'pret' && result.current.reessayerPlus).toBeTruthy(),
    )
    if (result.current.etat !== 'pret') throw new Error('page gardée attendue, pas l’erreur')
    expect(result.current.donnees.lignes).toHaveLength(50)
    expect(result.current.donnees.filtres).toEqual(SANS_FILTRE)
    const { reessayerPlus } = result.current
    act(() => reessayerPlus?.())
    await waitFor(() => {
      expect(
        result.current.etat === 'pret' && result.current.donnees.lignes.length,
      ).toBeGreaterThan(50)
    })
    if (result.current.etat !== 'pret') throw new Error('attendu : prêt')
    expect(result.current.reessayerPlus).toBeNull()
  })

  it('une relecture en échec alors que des lignes sont là garde la page', async () => {
    const { result } = lire('berger')
    await waitFor(() => expect(result.current.etat).toBe('pret'))
    journal.mockRejectedValueOnce(new Error('coupé'))
    await act(async () => {
      await client.refetchQueries({ queryKey: ['journal', 'lignes'] })
    })
    await waitFor(() =>
      expect(result.current.etat === 'pret' && result.current.reessayerPlus).toBeTruthy(),
    )
    if (result.current.etat !== 'pret') throw new Error('page gardée attendue, pas l’erreur')
    expect(result.current.donnees.lignes).toHaveLength(50)
  })

  it('un ministère ne lit ni les comptes ni un ministère d’adresse', async () => {
    const { result } = lire('ministere', {
      ...SANS_FILTRE,
      compte: 'compte-berger',
      ministere: 'min-jeunesse',
    })
    await waitFor(() => expect(result.current.etat).toBe('pret'))
    if (result.current.etat !== 'pret') throw new Error('attendu : prêt')
    expect(comptes).not.toHaveBeenCalled()
    expect(result.current.donnees.comptes).toBeNull()
    expect(result.current.donnees.filtres).toMatchObject({ compte: null, ministere: null })
  })

  it('le ministère de l’adresse est nommé, un ministère inconnu est ignoré', async () => {
    const { result, rerender } = lire('berger', { ...SANS_FILTRE, ministere: 'min-jeunesse' })
    await waitFor(() => expect(result.current.etat).toBe('pret'))
    if (result.current.etat !== 'pret') throw new Error('attendu : prêt')
    expect(result.current.donnees.ministereChoisi).toEqual({ id: 'min-jeunesse', nom: 'Jeunesse' })
    rerender({ filtresCourants: { ...SANS_FILTRE, ministere: 'inconnu' } })
    await waitFor(() =>
      expect(result.current.etat === 'pret' && result.current.donnees.ministereChoisi).toBeNull(),
    )
  })

  it('une lecture en échec : l’erreur de page, puis « Réessayer » relit', async () => {
    journal.mockRejectedValueOnce(new Error('refusé'))
    const { result } = lire('berger')
    await waitFor(() => expect(result.current.etat).toBe('erreur'))
    act(() => {
      if (result.current.etat === 'erreur') result.current.reessayer()
    })
    await waitFor(() => expect(result.current.etat).toBe('pret'))
  })

  it('un jour de Paris absent est une erreur, jamais la date du navigateur', async () => {
    semaine.mockResolvedValue(null)
    const { result } = lire('berger')
    await waitFor(() => expect(result.current.etat).toBe('erreur'))
    expect(journal).not.toHaveBeenCalled()
  })
})
