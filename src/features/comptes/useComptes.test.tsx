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
    installer(() => Promise.reject(new Error('délai')))
    const { actions, clesRelues } = monter()
    await expect(actions.desactiver(COMPTE)).rejects.toMatchObject({ code: 'connexion' })
    expect(clesRelues()).toEqual([['comptes'], ['ministeres']])
  })
})
