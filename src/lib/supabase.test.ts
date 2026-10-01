import { describe, expect, it } from 'vitest'
import { ErreurConfiguration, lireConfiguration } from '@/lib/supabase'

function jwt(charge: object): string {
  const encoder = (valeur: object) => btoa(JSON.stringify(valeur)).replace(/=+$/, '')
  return `${encoder({ alg: 'HS256' })}.${encoder(charge)}.signature`
}

describe('lireConfiguration', () => {
  it("accepte l'URL et la clé publique", () => {
    expect(
      lireConfiguration({
        VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc',
      }),
    ).toEqual({ url: 'http://127.0.0.1:54321', cle: 'sb_publishable_abc' })
  })

  it('refuse une configuration incomplète', () => {
    expect(() => lireConfiguration({ VITE_SUPABASE_URL: 'http://127.0.0.1:54321' })).toThrow(
      ErreurConfiguration,
    )
  })

  it('refuse toute clé secrète dans le navigateur', () => {
    for (const cle of ['sb_secret_abc', jwt({ role: 'service_role' })]) {
      expect(() =>
        lireConfiguration({ VITE_SUPABASE_URL: 'http://x', VITE_SUPABASE_PUBLISHABLE_KEY: cle }),
      ).toThrow(/clé secrète/)
    }
    expect(
      lireConfiguration({
        VITE_SUPABASE_URL: 'http://x',
        VITE_SUPABASE_PUBLISHABLE_KEY: jwt({ role: 'anon' }),
      }).cle,
    ).toContain('.')
  })
})
