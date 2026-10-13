import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { usePersonnes } from '@/features/personnes/usePersonnes'

// Effacement d'un prénom (T56) : un refus de la base dit que l'onglet a changé entre-temps
// (« Prénom introuvable ou déjà effacé. ») ; l'onglet se relit derrière la fenêtre. Une coupure ne
// relit rien : la lecture échouerait aussi.

const donnees = vi.hoisted(() => ({
  lirePersonnes: vi.fn(() => Promise.resolve([])),
  lireLibellesComptes: vi.fn(() => Promise.resolve(new Map<string, string>())),
  lireConnexions: vi.fn(() => Promise.resolve({ connexions: [], suivant: null })),
  effacerPrenom: vi.fn<(id: number) => Promise<number>>(),
  effacerPrenomsAnciens: vi.fn(() => Promise.resolve(0)),
}))
vi.mock('@/data/personnes', () => donnees)

function enveloppe() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('usePersonnes, effacement refusé', () => {
  it('« Prénom introuvable ou déjà effacé. » : l’erreur remonte et l’onglet se relit', async () => {
    const refus = { code: 'P0001', message: 'Prénom introuvable ou déjà effacé.' }
    donnees.effacerPrenom.mockRejectedValueOnce(refus)
    const { result } = renderHook(() => usePersonnes(), { wrapper: enveloppe() })
    await waitFor(() => expect(result.current.resultat.etat).toBe('pret'))
    const lectures = donnees.lirePersonnes.mock.calls.length
    await expect(result.current.actions.effacer(7)).rejects.toBe(refus)
    await waitFor(() => expect(donnees.lirePersonnes.mock.calls.length).toBe(lectures + 1))
  })

  it('une coupure : l’erreur remonte, rien ne se relit', async () => {
    const coupure = new TypeError('Failed to fetch')
    donnees.effacerPrenom.mockRejectedValueOnce(coupure)
    const { result } = renderHook(() => usePersonnes(), { wrapper: enveloppe() })
    await waitFor(() => expect(result.current.resultat.etat).toBe('pret'))
    const lectures = donnees.lirePersonnes.mock.calls.length
    await expect(result.current.actions.effacer(7)).rejects.toBe(coupure)
    expect(donnees.lirePersonnes.mock.calls.length).toBe(lectures)
  })
})
