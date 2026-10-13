import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { lecturesExemple } from '@/features/cette-semaine/lecturesExemple'
import { fauxSupabase } from '@/test/fauxSupabase'
import { useMaSemaine } from './useMaSemaine'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

const MINISTERE = 'm-communication'
const SEMAINE = {
  aujourdhui: '2026-09-29',
  lundi: '2026-09-21',
  dimanche: '2026-09-27',
  numero: 39,
}

/** Lignes minimales d'un ministère qui peut tout lire : le reste des vues est vide. */
function installer(
  lignes: Record<string, unknown[]> = { v_semaine: [SEMAINE] },
  enEchec: string[] = [],
) {
  const faux = fauxSupabase({
    lignes: { ministere: lecturesExemple().ministeres, ...lignes },
    enEchec,
  })
  courant.client = faux.client
  return faux
}

/** Une lecture qui ne répond jamais : le délai de 10 s est son seul dénouement. */
function suspendue() {
  const requete: Record<string, unknown> = {}
  for (const methode of ['select', 'order', 'eq', 'in', 'is', 'neq', 'or', 'lt', 'gte', 'lte']) {
    requete[methode] = () => requete
  }
  requete.then = () => undefined
  return requete
}

function rendre() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(() => useMaSemaine(MINISTERE), { wrapper })
}

const lectures = (faux: ReturnType<typeof installer>, table: string) =>
  faux.tables.filter((lue) => lue === table).length

afterEach(() => {
  vi.useRealTimers()
  courant.client = undefined
})

describe('useMaSemaine', () => {
  it('chargement d’abord, puis la page prête avec les quatre blocs', async () => {
    installer()
    const { result } = rendre()
    expect(result.current.etat).toBe('chargement')
    await waitFor(() => expect(result.current.etat).toBe('pret'), { timeout: 5000 })
    if (result.current.etat !== 'pret') return
    expect(result.current.donnees.semaine.numero).toBe(39)
    expect(result.current.donnees.chiffres.map((ligne) => ligne.cle)).toEqual([
      'service',
      'actifs',
      'en_fij',
    ])
  })

  it('une lecture en échec : erreur, et « Réessayer » relance cette lecture', async () => {
    const faux = installer({ v_semaine: [SEMAINE] }, ['v_total_dimanche'])
    const { result } = rendre()
    await waitFor(() => expect(result.current.etat).toBe('erreur'), { timeout: 5000 })
    const avant = lectures(faux, 'v_total_dimanche')
    expect(avant).toBeGreaterThan(0)
    // Les lectures réussies ne sont pas relancées.
    const semaineAvant = lectures(faux, 'v_semaine')
    const erreur = result.current
    if (erreur.etat !== 'erreur') return
    act(() => erreur.reessayer())
    await waitFor(() => expect(lectures(faux, 'v_total_dimanche')).toBe(avant + 1))
    expect(lectures(faux, 'v_semaine')).toBe(semaineAvant)
  })

  it('l’accueil en échec : erreur, et « Réessayer » relance aussi l’accueil', async () => {
    const faux = installer({ v_semaine: [SEMAINE] }, ['evenement_mention'])
    const { result } = rendre()
    await waitFor(() => expect(result.current.etat).toBe('erreur'), { timeout: 5000 })
    const avant = lectures(faux, 'evenement_mention')
    expect(avant).toBeGreaterThan(0)
    const erreur = result.current
    if (erreur.etat !== 'erreur') return
    act(() => erreur.reessayer())
    await waitFor(() => expect(lectures(faux, 'evenement_mention')).toBeGreaterThan(avant))
  })

  it('v_semaine sans ligne : erreur, jamais une page à moitié construite', async () => {
    installer({ v_semaine: [] })
    const { result } = rendre()
    await waitFor(() => expect(result.current.etat).toBe('erreur'), { timeout: 5000 })
  })

  it('sans réponse au bout de 10 s : erreur', async () => {
    const faux = installer()
    const lire = faux.from.getMockImplementation()
    faux.from.mockImplementation((table: string) =>
      table === 'v_total_dimanche' ? (suspendue() as never) : (lire?.(table) as never),
    )
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { result } = rendre()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9_000)
    })
    expect(result.current.etat).toBe('chargement')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500)
    })
    expect(result.current.etat).toBe('erreur')
  })
})
