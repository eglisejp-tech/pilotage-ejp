import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { messagesConnexion } from '@/features/connexion/messages'
import { erreurDeRetourGoogle, traduireErreur } from '@/features/session/erreurs'

const api = (code: string, statut = 400) => new AuthApiError('message anglais', statut, code)

describe('traduireErreur', () => {
  it('traduit chaque erreur de Supabase vers un message français, jamais le message anglais', () => {
    expect(traduireErreur(api('invalid_credentials'), 'connexion')).toBe(
      messagesConnexion.identifiantsIncorrects,
    )
    expect(traduireErreur(api('mfa_verification_failed', 422), 'code')).toBe(
      messagesConnexion.codeFaux,
    )
    expect(traduireErreur(api('user_banned', 403), 'connexion')).toBe(
      messagesConnexion.compteDesactive,
    )
    expect(traduireErreur(api('over_request_rate_limit', 429), 'code')).toBe(
      messagesConnexion.tropDeTentatives,
    )
    expect(traduireErreur(api('signup_disabled', 422), 'connexion')).toBe(
      messagesConnexion.googleSansCompte,
    )
    expect(traduireErreur(api('weak_password', 422), 'mot-de-passe')).toBe(
      messagesConnexion.motDePasseFaible,
    )
    expect(traduireErreur(api('same_password', 422), 'mot-de-passe')).toBe(
      messagesConnexion.memeMotDePasse,
    )
  })

  it('une session aal1 perdue pendant le code : « Votre connexion a expiré »', () => {
    expect(traduireErreur(api('session_not_found', 403), 'code')).toBe(
      messagesConnexion.connexionExpiree,
    )
    expect(traduireErreur(api('session_not_found', 403), 'mot-de-passe')).toBe(
      messagesConnexion.sessionExpiree,
    )
  })

  it('réseau ou erreur inconnue : « La connexion a échoué »', () => {
    expect(traduireErreur(new AuthRetryableFetchError('Failed to fetch', 0), 'connexion')).toBe(
      messagesConnexion.echecReseau,
    )
    expect(traduireErreur(new TypeError('Failed to fetch'), 'code')).toBe(
      messagesConnexion.echecReseau,
    )
  })
})

describe('erreurDeRetourGoogle', () => {
  it("lit l'erreur dans la requête ou dans l'ancre", () => {
    expect(
      erreurDeRetourGoogle(
        '?error=access_denied&error_code=signup_disabled&error_description=Signups+not+allowed',
        '',
      ),
    ).toBe(messagesConnexion.googleSansCompte)
    expect(erreurDeRetourGoogle('', '#error=server_error&error_description=User+is+banned')).toBe(
      messagesConnexion.compteDesactive,
    )
    expect(erreurDeRetourGoogle('?error=server_error', '')).toBe(messagesConnexion.echecReseau)
  })

  it("rien sans paramètre d'erreur", () => {
    expect(erreurDeRetourGoogle('?retour=%2Fpoints', '')).toBeNull()
  })
})
