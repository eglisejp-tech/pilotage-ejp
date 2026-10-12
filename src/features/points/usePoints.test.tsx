import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lireSemaine } from '@/data/eglise'
import { lireMinisteres } from '@/data/ministeres'
import { lirePointsListe } from '@/data/pointsListe'
import {
  LECTURES_EXEMPLE_POINTS,
  MINISTERES_EXEMPLE,
} from '@/features/points/apercu/exemplesPoints'
import { DELAI_MAX_CHARGEMENT, usePoints } from '@/features/points/usePoints'

vi.mock('@/data/eglise', () => ({ lireSemaine: vi.fn() }))
vi.mock('@/data/ministeres', () => ({ lireMinisteres: vi.fn() }))
vi.mock('@/data/pointsListe', () => ({ lirePointsListe: vi.fn() }))
const semaine = vi.mocked(lireSemaine)
const ministeres = vi.mocked(lireMinisteres)
const points = vi.mocked(lirePointsListe)

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
  ministeres.mockResolvedValue(MINISTERES_EXEMPLE)
  points.mockResolvedValue({
    points: LECTURES_EXEMPLE_POINTS.points,
    mentions: LECTURES_EXEMPLE_POINTS.mentions,
    auteurs: LECTURES_EXEMPLE_POINTS.auteurs,
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('usePoints', () => {
  it('chargement, puis l’écran construit avec le jour de Paris de v_semaine', async () => {
    const { result } = renderHook(() => usePoints('berger', null), { wrapper: enveloppe })
    expect(result.current).toEqual({ etat: 'chargement' })
    await waitFor(() => expect(result.current.etat).toBe('pret'))
    if (result.current.etat !== 'pret') throw new Error('attendu : prêt')
    expect(result.current.donnees.ouverts).toHaveLength(5)
    expect(result.current.donnees.traites).toHaveLength(4)
    // L'échéance du 28 sept. est comparée au 1er octobre de la base, pas à la date du navigateur.
    expect(
      result.current.donnees.ouverts.find((ligne) => ligne.id === 'p-planning')?.echeance,
    ).toEqual({ texte: '28 sept., dépassée', depassee: true })
  })

  it('le ministère de l’adresse filtre sans nouvelle lecture', async () => {
    const { result, rerender } = renderHook(
      ({ ministere }: { ministere: string | null }) => usePoints('berger', ministere),
      { wrapper: enveloppe, initialProps: { ministere: null as string | null } },
    )
    await waitFor(() => expect(result.current.etat).toBe('pret'))
    rerender({ ministere: 'min-coordination' })
    if (result.current.etat !== 'pret') throw new Error('attendu : prêt')
    expect(result.current.donnees.ouverts).toHaveLength(2)
    expect(points).toHaveBeenCalledTimes(1)
  })

  it('une lecture en échec : l’erreur de page, puis « Réessayer » relit', async () => {
    points.mockRejectedValueOnce(new Error('refusé'))
    const { result } = renderHook(() => usePoints('berger', null), { wrapper: enveloppe })
    await waitFor(() => expect(result.current.etat).toBe('erreur'))
    if (result.current.etat !== 'erreur') throw new Error('attendu : erreur')
    act(() => result.current.etat === 'erreur' && result.current.reessayer())
    await waitFor(() => expect(result.current.etat).toBe('pret'))
    expect(points).toHaveBeenCalledTimes(2)
  })

  it('v_semaine sans ligne : l’erreur de page', async () => {
    semaine.mockResolvedValue(null)
    const { result } = renderHook(() => usePoints('berger', null), { wrapper: enveloppe })
    await waitFor(() => expect(result.current.etat).toBe('erreur'))
  })

  it('sans réponse après 10 s : l’erreur de page', async () => {
    vi.useFakeTimers()
    points.mockReturnValue(new Promise(() => undefined))
    const { result } = renderHook(() => usePoints('berger', null), { wrapper: enveloppe })
    expect(result.current.etat).toBe('chargement')
    await act(() => vi.advanceTimersByTimeAsync(DELAI_MAX_CHARGEMENT - 1))
    expect(result.current.etat).toBe('chargement')
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(result.current.etat).toBe('erreur')
  })

  it('un ministère reçoit son écran sans filtre', async () => {
    const { result } = renderHook(() => usePoints('ministere', 'min-coordination'), {
      wrapper: enveloppe,
    })
    await waitFor(() => expect(result.current.etat).toBe('pret'))
    if (result.current.etat !== 'pret') throw new Error('attendu : prêt')
    expect(result.current.donnees.ministeres).toBeNull()
    expect(result.current.donnees.ministereChoisi).toBeNull()
  })
})
