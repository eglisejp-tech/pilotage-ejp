import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { messagesConnexion } from '@/features/connexion/messages'

const verifyOtp = vi.fn()
const resetPasswordForEmail = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: () => ({ auth: { verifyOtp, resetPasswordForEmail } }),
}))
vi.mock('@/features/session/useEtatSession', () => ({ rafraichirSession: vi.fn() }))

const { demanderLien, verifierLien } = await import('@/features/session/actions')

beforeEach(() => {
  verifyOtp.mockReset()
  resetPasswordForEmail.mockReset()
})

describe('verifierLien', () => {
  it('compte désactivé : le dire, au lieu d’un lien à renvoyer qui ne servirait pas (m016)', async () => {
    verifyOtp.mockResolvedValue({ error: new AuthApiError('User is banned', 403, 'user_banned') })
    await expect(verifierLien('jeton', 'invitation')).resolves.toEqual({
      etat: 'erreur',
      erreur: 'Ce compte est désactivé. Contactez EJP Tech.',
    })
  })

  it('lien expiré ou déjà utilisé (autre 4xx) : lien plus valable', async () => {
    verifyOtp.mockResolvedValue({ error: new AuthApiError('expired', 403, 'otp_expired') })
    await expect(verifierLien('jeton', 'recuperation')).resolves.toEqual({ etat: 'invalide' })
  })
})

describe('demanderLien', () => {
  it('panne de la passerelle (502 à 504) : dite, le lien n’est pas parti (m019)', async () => {
    for (const statut of [502, 503, 504]) {
      resetPasswordForEmail.mockResolvedValue({
        error: new AuthRetryableFetchError('Bad Gateway', statut),
      })
      await expect(demanderLien({ email: 'a@exemple.fr' })).resolves.toEqual({
        erreur: messagesConnexion.panneConnexion,
      })
    }
  })

  it('erreur 500 d’Auth (envoi de l’email d’un compte qui existe) : rien, aucune énumération', async () => {
    // Auth répond 200 pour une adresse inconnue : dire cette panne révélerait le compte.
    resetPasswordForEmail.mockResolvedValue({
      error: new AuthApiError('Error sending recovery email', 500, 'unexpected_failure'),
    })
    await expect(demanderLien({ email: 'a@exemple.fr' })).resolves.toEqual({})
  })

  it('refus 4xx (adresse inconnue...) : rien, comme une réussite (aucune énumération)', async () => {
    resetPasswordForEmail.mockResolvedValue({
      error: new AuthApiError('not found', 400, 'user_not_found'),
    })
    await expect(demanderLien({ email: 'a@exemple.fr' })).resolves.toEqual({})
  })

  it('réseau coupé : la connexion a échoué', async () => {
    resetPasswordForEmail.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(demanderLien({ email: 'a@exemple.fr' })).resolves.toEqual({
      erreur: messagesConnexion.echecReseau,
    })
  })
})
