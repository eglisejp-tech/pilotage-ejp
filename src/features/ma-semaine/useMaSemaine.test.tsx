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
    // Les mentions en vigueur se lisent dans v_evenement_mention (T78).
    const faux = installer({ v_semaine: [SEMAINE] }, ['v_evenement_mention'])
    const { result } = rendre()
    await waitFor(() => expect(result.current.etat).toBe('erreur'), { timeout: 5000 })
    const avant = lectures(faux, 'v_evenement_mention')
    expect(avant).toBeGreaterThan(0)
    const erreur = result.current
    if (erreur.etat !== 'erreur') return
    act(() => erreur.reessayer())
    await waitFor(() => expect(lectures(faux, 'v_evenement_mention')).toBeGreaterThan(avant))
  })

  it('T77 : le suivi des signalements se lit avec le reste, puis le bandeau d’un Répondu', async () => {
    const faux = installer({
      v_semaine: [SEMAINE],
      v_signalement: [
        { id: 's-recu', saisi_le: '2026-10-20T10:00:00+02:00', statut: 'recu' },
        { id: 's-repondu', saisi_le: '2026-10-26T10:15:00+01:00', statut: 'repondu' },
      ],
    })
    const { result } = rendre()
    await waitFor(() => expect(result.current.etat).toBe('pret'), { timeout: 5000 })
    if (result.current.etat !== 'pret') return
    expect(result.current.donnees.signalements).toEqual({
      genre: 'bandeau',
      nombre: 1,
      plusAncien: { id: 's-repondu', saisi_le: '2026-10-26T10:15:00+01:00' },
    })
    expect(lectures(faux, 'v_signalement')).toBe(1)
    // Les seuls ouverts du ministère : jamais un autre ministère, jamais une date du navigateur.
    expect(faux.filtres).toEqual(
      expect.arrayContaining([
        { table: 'v_signalement', operateur: 'eq', colonne: 'ministere_id', valeur: MINISTERE },
        { table: 'v_signalement', operateur: 'eq', colonne: 'ouvert', valeur: true },
      ]),
    )
  })

  it('T77 : des Reçu ou En cours seulement, la ligne discrète', async () => {
    installer({
      v_semaine: [SEMAINE],
      v_signalement: [
        { id: 's-en-cours', saisi_le: '2026-10-20T10:00:00+02:00', statut: 'en_cours' },
      ],
    })
    const { result } = rendre()
    await waitFor(() => expect(result.current.etat).toBe('pret'), { timeout: 5000 })
    if (result.current.etat !== 'pret') return
    expect(result.current.donnees.signalements).toEqual({ genre: 'ligne', nombre: 1 })
  })

  it('T77 : aucun ouvert, rien', async () => {
    installer()
    const { result } = rendre()
    await waitFor(() => expect(result.current.etat).toBe('pret'), { timeout: 5000 })
    if (result.current.etat !== 'pret') return
    expect(result.current.donnees.signalements).toBeNull()
  })

  it('T77 : la lecture du suivi en échec, la page s’affiche quand même, sans bandeau ni ligne', async () => {
    installer({ v_semaine: [SEMAINE] }, ['v_signalement'])
    const { result } = rendre()
    await waitFor(() => expect(result.current.etat).toBe('pret'), { timeout: 5000 })
    if (result.current.etat !== 'pret') return
    expect(result.current.donnees.signalements).toBeNull()
    expect(result.current.donnees.semaine.numero).toBe(39)
  })

  it('T77 : le suivi qui ne répond pas en 10 s ne bloque pas la page', async () => {
    const faux = installer()
    const lire = faux.from.getMockImplementation()
    faux.from.mockImplementation((table: string) =>
      table === 'v_signalement' ? (suspendue() as never) : (lire?.(table) as never),
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
    expect(result.current.etat).toBe('pret')
    if (result.current.etat !== 'pret') return
    expect(result.current.donnees.signalements).toBeNull()
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
