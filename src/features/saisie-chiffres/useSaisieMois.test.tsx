import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { lireSemaine } from '@/data/eglise'
import { lireCategoriesSensibles, lireMesuresPeriode } from '@/data/indicateurs'
import {
  enregistrerChiffresMois,
  lireIndicateursASaisir,
  lirePrecisions,
  lireRepartitions,
  lireTotauxDuMois,
} from '@/data/saisies'
import {
  CATEGORIES_EXEMPLE,
  MESURES_MOIS_CORRECTION,
  indicateursMoisExemple,
  PRECISION_EXEMPLE,
} from '@/features/saisie-chiffres/apercu/exemples'
import { useSaisieMois } from '@/features/saisie-chiffres/useSaisieMois'

vi.mock('@/data/eglise', () => ({ lireSemaine: vi.fn() }))
vi.mock('@/data/indicateurs', () => ({
  lireCategoriesSensibles: vi.fn(),
  lireMesuresPeriode: vi.fn(),
}))
vi.mock('@/data/saisies', () => ({
  enregistrerChiffresMois: vi.fn(),
  lireIndicateursASaisir: vi.fn(),
  lirePrecisions: vi.fn(),
  lireRepartitions: vi.fn(),
  lireTotauxDuMois: vi.fn(),
}))

const SEMAINE = {
  aujourdhui: '2026-09-29',
  dimanche: '2026-09-27',
  lundi: '2026-09-21',
  numero: 39,
}
const total = (id: number) => ({
  id,
  indicateur_id: 'mois-passages',
  valeur: 7,
  saisi_le: '2026-09-28T18:00:00+00:00',
})

function enveloppe() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(lireSemaine).mockResolvedValue(SEMAINE)
  vi.mocked(lireIndicateursASaisir).mockResolvedValue(indicateursMoisExemple(true))
  vi.mocked(lireMesuresPeriode).mockResolvedValue(
    MESURES_MOIS_CORRECTION.map((mesure) => ({
      ...mesure,
      ministere_id: 'ministere-exemple',
      nature: 'mois' as const,
      moins_de_3: false,
    })),
  )
  vi.mocked(lireCategoriesSensibles).mockResolvedValue(CATEGORIES_EXEMPLE)
  vi.mocked(enregistrerChiffresMois).mockResolvedValue(11)
  vi.mocked(lireTotauxDuMois)
    .mockResolvedValueOnce([total(10)])
    .mockResolvedValue([total(11)])
  vi.mocked(lireRepartitions).mockImplementation((ids) =>
    Promise.resolve(ids.map((id) => ({ mesure_id: id, categorie: 'malaise', valeur: 4 }))),
  )
  vi.mocked(lirePrecisions).mockImplementation((ids) =>
    Promise.resolve(ids.map((id) => ({ mesure_id: id, texte: PRECISION_EXEMPLE }))),
  )
})

describe('useSaisieMois', () => {
  it('après un envoi, les lectures sont relues sans repasser par le chargement', async () => {
    const etats: string[] = []
    const { result } = renderHook(
      () => {
        const etat = useSaisieMois('ministere-exemple', '2026-09')
        etats.push(etat.etat)
        return etat
      },
      { wrapper: enveloppe() },
    )
    await waitFor(() => expect(result.current.etat).toBe('pret'))
    const premier = etats.length

    // L'envoi change l'identifiant du total (10 devient 11) : la clé des détails ne doit pas bouger.
    await act(async () => {
      if (result.current.etat !== 'pret') throw new Error('formulaire attendu')
      await result.current.enregistrer([{ indicateur_id: 'mois-passages', valeur: 7 }])
    })
    await waitFor(() => expect(lireTotauxDuMois).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(lireRepartitions).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(lirePrecisions).toHaveBeenCalledTimes(2))

    expect(etats.slice(premier - 1)).not.toContain('chargement')
    expect(result.current.etat).toBe('pret')
  })

  it('les détails (précision, répartition) du total le plus récent arrivent avec les champs', async () => {
    const { result } = renderHook(() => useSaisieMois('ministere-exemple', '2026-09'), {
      wrapper: enveloppe(),
    })
    await waitFor(() => expect(result.current.etat).toBe('pret'))
    if (result.current.etat !== 'pret') throw new Error('formulaire attendu')
    const passages = result.current.champs.find((champ) => champ.id === 'mois-passages')
    expect(passages?.sensible?.precisionDepart).toBe(PRECISION_EXEMPLE)
    expect(passages?.sensible?.repartitionDepart).toEqual({ malaise: 4, blessure: 0, autre: 0 })
  })
})
