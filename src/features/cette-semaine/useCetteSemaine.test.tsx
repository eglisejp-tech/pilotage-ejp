import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TypeSession } from '@/lib/metier/phrases'
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
    v_point_mention: ok(lectures.points?.mentions ?? []),
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

  it('lit les points pour le berger, le conseil et EJP Tech seulement', async () => {
    for (const lecteur of [{ profil: 'conseil' }, { profil: 'admin_plateforme' }] as const) {
      const faux = fauxRequete(reponsesExemple())
      courant.client = faux.client
      const { result } = renderHook(() => useCetteSemaine(lecteur, null), {
        wrapper: enveloppe(),
      })
      await waitFor(() => expect(result.current.donnees).not.toBeNull())
      expect(faux.de('v_point')).toHaveLength(1)
      expect(result.current.donnees?.profil).toBe(lecteur.profil)
    }

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
      expect(fauxAutre.de('v_point_mention')).toHaveLength(0)
    }
  })

  it('lit en une fois les participations de la dernière session de chaque type', async () => {
    const faux = fauxRequete(reponsesExemple())
    courant.client = faux.client
    const { result } = renderHook(() => useCetteSemaine(berger, 'anti_dispersion'), {
      wrapper: enveloppe(),
    })
    await waitFor(() => expect(result.current.donnees).not.toBeNull())
    const lectures = faux.de('v_participation_courante')
    expect(lectures).toHaveLength(1)
    expect(appelsDe(lectures[0])[1]).toBe('in("session_id", ["s-b4","s-a4"])')
  })

  it('changer de session (?session=) ne relit rien et garde la vue affichée', async () => {
    const faux = fauxRequete(reponsesExemple())
    courant.client = faux.client
    const { result, rerender } = renderHook(
      ({ type }: { type: TypeSession | null }) => useCetteSemaine(berger, type),
      { wrapper: enveloppe(), initialProps: { type: null as TypeSession | null } },
    )
    await waitFor(() => expect(result.current.donnees).not.toBeNull())
    const session = result.current.donnees?.session
    expect(session?.etat === 'session' && session.session.titre).toBe(
      "Bâtir l'Église, samedi 26 septembre",
    )

    rerender({ type: 'anti_dispersion' })
    // Aucun passage par le chargement : la vue reste montée, avec la session demandée.
    expect(result.current.enChargement).toBe(false)
    const autre = result.current.donnees?.session
    expect(autre?.etat === 'session' && autre.session.titre).toBe(
      'Anti-Dispersion, samedi 19 septembre',
    )
    expect(faux.de('v_participation_courante')).toHaveLength(1)
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

  it('v_semaine sans ligne : erreur ; « Réessayer » la relit', async () => {
    const reponses = reponsesExemple()
    const semaine = reponses.v_semaine
    let vide = true
    const faux = fauxRequete({
      ...reponses,
      v_semaine: () => (vide ? { data: null, error: null } : semaine!),
    })
    courant.client = faux.client
    const { result } = renderHook(() => useCetteSemaine(berger, null), { wrapper: enveloppe() })
    await waitFor(() => expect(result.current.erreur).toBe(true))
    expect(result.current.donnees).toBeNull()

    vide = false
    act(() => {
      result.current.reessayer()
    })
    await waitFor(() => expect(result.current.donnees).not.toBeNull())
    expect(faux.de('v_semaine')).toHaveLength(2)
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

  it('délai dépassé puis réponse : une nouvelle lecture repart en chargement, pas en erreur', async () => {
    vi.useFakeTimers()
    let libererCarte: (reponse: ReponseFausse) => void = () => undefined
    courant.client = fauxRequete({
      ...reponsesExemple(),
      v_carte_fij: () =>
        new Promise<ReponseFausse>((resoudre) => {
          libererCarte = resoudre
        }),
      v_point: () => new Promise<ReponseFausse>(() => undefined),
    }).client
    const { result, rerender } = renderHook(
      ({ lecteur }: { lecteur: Lecteur }) => useCetteSemaine(lecteur, null),
      { wrapper: enveloppe(), initialProps: { lecteur: { profil: 'admin_eglise' } as Lecteur } },
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DELAI_MAX_CHARGEMENT)
    })
    expect(result.current.erreur).toBe(true)

    // La réponse arrive après le délai : la vue s'affiche, sans « Réessayer ».
    await act(async () => {
      libererCarte({ data: [], error: null })
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(result.current.donnees).not.toBeNull()

    // Une nouvelle lecture attend sa réponse (les points, lus pour le berger) : chargement, avec
    // un nouveau délai de 10 s, et non une erreur tout de suite.
    rerender({ lecteur: berger })
    expect(result.current).toMatchObject({ enChargement: true, erreur: false })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DELAI_MAX_CHARGEMENT - 1)
    })
    expect(result.current.enChargement).toBe(true)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(result.current.erreur).toBe(true)
  })
})
