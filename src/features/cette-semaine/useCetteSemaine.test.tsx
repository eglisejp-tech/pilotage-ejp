import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appelsDe, fauxRequete, type ReponseFausse } from '@/test/fauxRequete'
import { lecturesExemple } from './lecturesExemple'
import type { Lecteur } from './types'
import { DELAI_MAX_CHARGEMENT, useCetteSemaine } from './useCetteSemaine'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

const berger: Lecteur = { profil: 'berger' }

function reponsesExemple(): Record<string, ReponseFausse> {
  const lectures = lecturesExemple()
  const ok = (data: unknown): ReponseFausse => ({ data, error: null })
  return {
    v_semaine: ok(lectures.semaine),
    indicateur: ok(lectures.indicateurs),
    v_total_dimanche: ok(lectures.totauxDimanche),
    v_ecart_dimanche: ok(lectures.ecartsDimanche),
    v_total_a_ce_jour: ok(lectures.totauxACeJour),
    v_pourcentage_fij: ok(lectures.pourcentageFij),
    v_carte_fij: ok(lectures.carteFij),
    v_session_completude: ok(lectures.sessions),
    v_ecart_session: ok(lectures.ecartsSessions),
    v_participation_courante: ok(lectures.participations),
    v_tableau_ministeres: ok(lectures.tableauMinisteres),
    ministere: ok(lectures.ministeres),
    v_point: ok(lectures.points?.points ?? []),
    point_mention: ok(lectures.points?.mentions ?? []),
  }
}

function enveloppe() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return function Enveloppe({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

afterEach(() => {
  vi.useRealTimers()
  courant.client = undefined
})

describe('useCetteSemaine', () => {
  beforeEach(() => {
    courant.client = fauxRequete(reponsesExemple()).client
  })

  it('charge, puis rend les données du berger', async () => {
    const { result } = renderHook(() => useCetteSemaine(berger, null), { wrapper: enveloppe() })
    expect(result.current).toMatchObject({ enChargement: true, erreur: false, donnees: null })
    await waitFor(() => expect(result.current.donnees).not.toBeNull())
    expect(result.current.enChargement).toBe(false)
    expect(result.current.erreur).toBe(false)
    const donnees = result.current.donnees
    expect(donnees?.profil).toBe('berger')
    expect(donnees?.semaine.numero).toBe(39)
    expect(donnees?.chiffres[0]?.valeur).toEqual({ etat: 'saisie', texte: '52', unite: null })
  })

  it('lit les points pour le berger et le conseil seulement', async () => {
    const faux = fauxRequete(reponsesExemple())
    courant.client = faux.client
    const { result } = renderHook(() => useCetteSemaine({ profil: 'conseil' }, null), {
      wrapper: enveloppe(),
    })
    await waitFor(() => expect(result.current.donnees).not.toBeNull())
    expect(faux.de('v_point')).toHaveLength(1)

    for (const lecteur of [
      { profil: 'admin_eglise' },
      { profil: 'ministere', ministereId: 'com' },
    ] as const) {
      const fauxAutre = fauxRequete(reponsesExemple())
      courant.client = fauxAutre.client
      const { result: autre } = renderHook(() => useCetteSemaine(lecteur, null), {
        wrapper: enveloppe(),
      })
      await waitFor(() => expect(autre.current.donnees).not.toBeNull())
      expect(fauxAutre.de('v_point')).toHaveLength(0)
      expect(fauxAutre.de('point_mention')).toHaveLength(0)
    }
  })

  it('lit les participations de la session affichée seulement', async () => {
    const faux = fauxRequete(reponsesExemple())
    courant.client = faux.client
    const { result } = renderHook(() => useCetteSemaine(berger, 'anti_dispersion'), {
      wrapper: enveloppe(),
    })
    await waitFor(() => expect(result.current.donnees).not.toBeNull())
    const lectures = faux.de('v_participation_courante')
    expect(lectures).toHaveLength(1)
    expect(appelsDe(lectures[0])[1]).toBe('eq("session_id", "s-a4")')
  })

  it('les écarts du dimanche sont lus pour le dimanche de v_semaine', async () => {
    const faux = fauxRequete(reponsesExemple())
    courant.client = faux.client
    const { result } = renderHook(() => useCetteSemaine(berger, null), { wrapper: enveloppe() })
    await waitFor(() => expect(result.current.donnees).not.toBeNull())
    expect(appelsDe(faux.de('v_ecart_dimanche')[0])[1]).toBe('eq("dimanche", "2026-09-27")')
  })

  it('sans session passée, aucune lecture de participations et un bloc vide', async () => {
    const reponses = reponsesExemple()
    reponses.v_session_completude = { data: [], error: null }
    const faux = fauxRequete(reponses)
    courant.client = faux.client
    const { result } = renderHook(() => useCetteSemaine(berger, null), { wrapper: enveloppe() })
    await waitFor(() => expect(result.current.donnees).not.toBeNull())
    expect(faux.de('v_participation_courante')).toHaveLength(0)
    expect(result.current.donnees?.session).toEqual({ etat: 'aucune_session' })
  })

  it("une lecture en échec donne l'erreur, « Réessayer » relit", async () => {
    const reponses = reponsesExemple()
    let echec = true
    const faux = fauxRequete({
      ...reponses,
      v_carte_fij: () =>
        echec ? { data: null, error: new Error('hors service') } : { data: [], error: null },
    })
    courant.client = faux.client
    const { result } = renderHook(() => useCetteSemaine(berger, null), { wrapper: enveloppe() })
    await waitFor(() => expect(result.current.erreur).toBe(true))
    expect(result.current).toMatchObject({ enChargement: false, donnees: null })

    echec = false
    act(() => {
      result.current.reessayer()
    })
    await waitFor(() => expect(result.current.donnees).not.toBeNull())
    expect(result.current.erreur).toBe(false)
    // Seule la lecture en échec est relancée.
    expect(faux.de('v_carte_fij')).toHaveLength(2)
    expect(faux.de('v_semaine')).toHaveLength(1)
    expect(result.current.donnees?.carte).toBeNull()
  })

  it('v_semaine sans ligne : erreur', async () => {
    const reponses = reponsesExemple()
    reponses.v_semaine = { data: null, error: null }
    courant.client = fauxRequete(reponses).client
    const { result } = renderHook(() => useCetteSemaine(berger, null), { wrapper: enveloppe() })
    await waitFor(() => expect(result.current.erreur).toBe(true))
    expect(result.current.donnees).toBeNull()
  })

  it('sans réponse après 10 s : erreur ; « Réessayer » repasse en chargement', async () => {
    vi.useFakeTimers()
    let bloque = true
    const reponses = reponsesExemple()
    courant.client = fauxRequete({
      ...reponses,
      v_carte_fij: () =>
        bloque ? new Promise<ReponseFausse>(() => undefined) : { data: [], error: null },
    }).client
    const { result } = renderHook(() => useCetteSemaine(berger, null), { wrapper: enveloppe() })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DELAI_MAX_CHARGEMENT - 1)
    })
    expect(result.current.enChargement).toBe(true)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(result.current).toMatchObject({ enChargement: false, erreur: true, donnees: null })

    bloque = false
    act(() => {
      result.current.reessayer()
    })
    expect(result.current.enChargement).toBe(true)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(result.current.donnees).not.toBeNull()
  })
})
