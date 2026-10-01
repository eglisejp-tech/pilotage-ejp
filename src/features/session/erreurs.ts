import { isAuthError } from '@supabase/supabase-js'
import { messagesConnexion } from '@/features/connexion/messages'

// Traduction des erreurs de Supabase Auth vers les messages français des écrans (BRIEF
// section 8, « Messages d'erreur »). Aucun message de Supabase n'est affiché tel quel.

/** Ce que faisait l'écran quand l'erreur est arrivée. */
export type Contexte = 'connexion' | 'code' | 'mot-de-passe' | 'lien-email'

const FIN_DE_SESSION = new Set([
  'session_not_found',
  'session_expired',
  'refresh_token_not_found',
  'refresh_token_already_used',
  'bad_jwt',
  'no_authorization',
  'insufficient_aal',
  'reauthentication_needed',
])

/** Code d'erreur d'Auth (`code`), ou undefined pour une erreur réseau ou inconnue. */
function codeDe(erreur: unknown): string | undefined {
  return isAuthError(erreur) ? erreur.code : undefined
}

function statutDe(erreur: unknown): number | undefined {
  return isAuthError(erreur) ? erreur.status : undefined
}

export function traduireErreur(erreur: unknown, contexte: Contexte): string {
  const code = codeDe(erreur)
  const statut = statutDe(erreur)

  if (
    code === 'over_request_rate_limit' ||
    code === 'over_email_send_rate_limit' ||
    statut === 429
  ) {
    return messagesConnexion.tropDeTentatives
  }
  if (code === 'user_banned') return messagesConnexion.compteDesactive
  if (code === 'signup_disabled' || code === 'email_address_not_authorized') {
    return messagesConnexion.googleSansCompte
  }
  if (code === 'invalid_credentials' || code === 'email_not_confirmed') {
    return messagesConnexion.identifiantsIncorrects
  }
  if (
    code === 'mfa_verification_failed' ||
    code === 'mfa_verification_rejected' ||
    code === 'mfa_challenge_expired'
  ) {
    return messagesConnexion.codeFaux
  }
  if (code === 'weak_password') return messagesConnexion.motDePasseFaible
  if (code === 'same_password') return messagesConnexion.memeMotDePasse
  if (code !== undefined && FIN_DE_SESSION.has(code)) {
    return contexte === 'code'
      ? messagesConnexion.connexionExpiree
      : messagesConnexion.sessionExpiree
  }
  return messagesConnexion.echecReseau
}

/**
 * Erreurs d'un retour de Google (paramètres `error_code` et `error_description` ajoutés par
 * Supabase à l'adresse de retour, dans la requête ou l'ancre). Null s'il n'y en a pas.
 */
export function erreurDeRetourGoogle(recherche: string, ancre: string): string | null {
  const parametres = new URLSearchParams(recherche)
  const parametresAncre = new URLSearchParams(ancre.replace(/^#/, ''))
  const lire = (nom: string) => parametres.get(nom) ?? parametresAncre.get(nom)
  const erreur = lire('error')
  const code = lire('error_code')
  const description = lire('error_description') ?? ''
  if (!erreur && !code) return null
  if (code === 'signup_disabled' || /signups? not allowed/i.test(description)) {
    return messagesConnexion.googleSansCompte
  }
  if (code === 'user_banned' || /banned/i.test(description))
    return messagesConnexion.compteDesactive
  return messagesConnexion.echecReseau
}
