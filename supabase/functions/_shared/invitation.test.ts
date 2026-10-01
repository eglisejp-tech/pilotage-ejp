// @vitest-environment node
// Tests unitaires (npm test) de l'invitation commune à creer-compte et relancer-invitation, et
// des refus ajoutés pour relancer-invitation et reactiver-compte.
import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { traduireErreurBase } from './base.ts'
import { adresseAcces, inviter } from './invitation.ts'

type Reponse = {
  data: { user: { id: string } | null }
  error: { code?: string; status?: number } | null
}

function clientFactice(reponse: Reponse) {
  const inviteUserByEmail = vi.fn<
    (email: string, options?: { redirectTo?: string }) => Promise<Reponse>
  >(async () => reponse)
  const client = { auth: { admin: { inviteUserByEmail } } } as unknown as SupabaseClient
  return { client, inviteUserByEmail }
}

function definirUrlApplication(valeur: string | undefined) {
  vi.stubGlobal('Deno', {
    env: { get: (nom: string) => (nom === 'URL_APPLICATION' ? valeur : undefined) },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('adresseAcces', () => {
  it('construit le lien /acces depuis URL_APPLICATION', () => {
    definirUrlApplication('https://pilotage.exemple.org/tableau')
    expect(adresseAcces()).toBe('https://pilotage.exemple.org/acces')
  })

  it('ne rend rien sans variable ou avec une adresse non web', () => {
    expect(adresseAcces()).toBeUndefined()
    definirUrlApplication('javascript:alert(1)')
    expect(adresseAcces()).toBeUndefined()
    definirUrlApplication('pas une adresse')
    expect(adresseAcces()).toBeUndefined()
  })
})

describe('inviter', () => {
  it('rend l’identifiant et passe le lien /acces', async () => {
    definirUrlApplication('http://127.0.0.1:5173')
    const { client, inviteUserByEmail } = clientFactice({
      data: { user: { id: 'u1' } },
      error: null,
    })
    expect(await inviter(client, 'essai', 'a@exemple.org')).toBe('u1')
    expect(inviteUserByEmail).toHaveBeenCalledWith('a@exemple.org', {
      redirectTo: 'http://127.0.0.1:5173/acces',
    })
  })

  it('traduit les refus d’Auth sans détail', async () => {
    const journal = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      inviter(
        clientFactice({ data: { user: null }, error: { code: 'email_exists', status: 422 } })
          .client,
        'essai',
        'a@exemple.org',
      ),
    ).rejects.toMatchObject({ statut: 409, code: 'adresse_deja_utilisee' })
    await expect(
      inviter(
        clientFactice({
          data: { user: null },
          error: { code: 'over_email_send_rate_limit', status: 429 },
        }).client,
        'essai',
        'a@exemple.org',
      ),
    ).rejects.toMatchObject({ statut: 409, code: 'invitation_trop_recente' })
    await expect(
      inviter(
        clientFactice({ data: { user: null }, error: { code: 'unexpected_failure', status: 500 } })
          .client,
        'essai',
        'a@exemple.org',
      ),
    ).rejects.toMatchObject({ statut: 500, code: 'invitation_non_envoyee' })
    const ecrit = journal.mock.calls.map((appel) => appel.join(' ')).join('\n')
    expect(ecrit).toContain('unexpected_failure')
    expect(ecrit).not.toContain('a@exemple.org')
  })
})

describe('refus de relancer-invitation et reactiver-compte', () => {
  it('traduit compte_actif et invitation_deja_acceptee en 409', () => {
    expect(traduireErreurBase({ code: 'P0001', message: 'compte_actif' })).toMatchObject({
      statut: 409,
      code: 'compte_actif',
    })
    expect(
      traduireErreurBase({ code: 'P0001', message: 'invitation_deja_acceptee' }),
    ).toMatchObject({
      statut: 409,
      code: 'invitation_deja_acceptee',
    })
  })
})
