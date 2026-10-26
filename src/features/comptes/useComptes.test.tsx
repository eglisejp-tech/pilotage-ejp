import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useActionsComptes } from '@/features/comptes/useComptes'

// Actions de l'écran 13 branchées sur le vrai accès aux données (src/data/comptes.ts) : seul le
// client Supabase est simulé. Chaque action appelle sa fonction avec le corps validé, puis relit
// les clés ['comptes'] et ['ministeres'], après une réussite comme après un échec.

type ReponseInvoke = { data: unknown; error: unknown }

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

const COMPTE = '20000000-0000-4000-8000-000000000014'

function installer(reponse: () => Promise<ReponseInvoke>) {
  const invoke = vi.fn<(nom: string, options: { body: unknown }) => Promise<ReponseInvoke>>(reponse)
  courant.client = { functions: { invoke } }
  return invoke
}

function monter() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalider = vi.spyOn(client, 'invalidateQueries')
  const enveloppe = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useActionsComptes(), { wrapper: enveloppe })
  const clesRelues = () => invalider.mock.calls.map(([filtre]) => filtre?.queryKey)
  return { actions: result.current, clesRelues }
}

beforeEach(() => {
  courant.client = undefined
})

describe('useActionsComptes', () => {
  it('creer : creer-compte avec la demande du panneau, puis relit comptes et ministères', async () => {
    const invoke = installer(() => Promise.resolve({ data: { ok: true }, error: null }))
    const { actions, clesRelues } = monter()
    await actions.creer({
      type: 'ministere',
      nom: ' Tech ',
      description: '',
      email: 'EJPTech1+Ministere@Exemple.test',
    })
    expect(invoke).toHaveBeenCalledWith('creer-compte', {
      body: {
        type: 'ministere',
        email: 'ejptech1+ministere@exemple.test',
        ministere: { nom: 'Tech' },
      },
    })
    expect(clesRelues()).toEqual([['comptes'], ['ministeres']])
  })

  it.each([
    ['relancer', 'relancer-invitation'],
    ['desactiver', 'desactiver-compte'],
    ['reactiver', 'reactiver-compte'],
    ['refaireActivation', 'reinitialiser-2fa'],
  ] as const)('%s : %s avec { user_id }, puis la relecture', async (action, fonction) => {
    const invoke = installer(() => Promise.resolve({ data: { ok: true }, error: null }))
    const { actions, clesRelues } = monter()
    await actions[action](COMPTE)
    expect(invoke).toHaveBeenCalledWith(fonction, { body: { user_id: COMPTE } })
    expect(clesRelues()).toEqual([['comptes'], ['ministeres']])
  })

  it('réponse perdue : l’erreur « connexion » remonte, et la liste est relue quand même', async () => {
    installer(() => Promise.reject(new DOMException('Délai de 10 s dépassé.', 'TimeoutError')))
    const { actions, clesRelues } = monter()
    await expect(actions.desactiver(COMPTE)).rejects.toMatchObject({ code: 'connexion' })
    expect(clesRelues()).toEqual([['comptes'], ['ministeres']])
  })

  it('corriger : corriger-adresse avec l’adresse lue par le schéma, puis la relecture (T74)', async () => {
    const invoke = installer(() => Promise.resolve({ data: { ok: true }, error: null }))
    const { actions, clesRelues } = monter()
    await actions.corriger(COMPTE, ' Tech+Ministere@Exemple.test ')
    expect(invoke).toHaveBeenCalledWith('corriger-adresse', {
      body: { user_id: COMPTE, email: 'tech+ministere@exemple.test' },
    })
    expect(clesRelues()).toEqual([['comptes'], ['ministeres']])
  })

  it('supprimer : supprimer-ministere avec { ministere_id }, puis la relecture (T74)', async () => {
    const invoke = installer(() => Promise.resolve({ data: { ok: true }, error: null }))
    const { actions, clesRelues } = monter()
    const ministere = '10000000-0000-4000-8000-000000000010'
    await actions.supprimer(ministere)
    expect(invoke).toHaveBeenCalledWith('supprimer-ministere', {
      body: { ministere_id: ministere },
    })
    expect(clesRelues()).toEqual([['comptes'], ['ministeres']])
  })

  it('lireSuppression : les raisons d’un ministère, relues après un refus, puis la liste (T75)', async () => {
    const ministere = '10000000-0000-4000-8000-000000000010'
    const rpc = vi.fn(() =>
      Promise.resolve({
        data: [
          { ministere_id: ministere, code: 'chiffres', nombre: 2, bloque: true },
          { ministere_id: ministere, code: 'sessions_attendues', nombre: 1, bloque: false },
        ],
        error: null,
      }),
    )
    courant.client = { rpc }
    const { actions, clesRelues } = monter()
    await expect(actions.lireSuppression(ministere)).resolves.toEqual({
      raisons: [{ code: 'chiffres', nombre: 2 }],
      sessions: 1,
    })
    expect(rpc).toHaveBeenCalledWith('raisons_suppression_ministere', {
      p_ministere_id: ministere,
    })
    expect(clesRelues()).toEqual([['comptes'], ['ministeres']])
  })
})
