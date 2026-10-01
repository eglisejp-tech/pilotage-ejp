import { isAuthApiError } from '@supabase/supabase-js'
import { lireMonCompte } from '@/data/compte'
import { deduireEtat } from '@/features/session/etat'
import type { EtatSession } from '@/features/session/etat'
import { noterTransition } from '@/features/session/motif'
import { clientRequetes, CLE_SESSION } from '@/lib/requetes'
import { supabase } from '@/lib/supabase'

/** Erreurs d'Auth qui veulent dire que la session enregistrée n'est plus reconnue. */
const SESSION_PERDUE = new Set([
  'session_not_found',
  'session_expired',
  'refresh_token_not_found',
  'refresh_token_already_used',
  'user_not_found',
  'bad_jwt',
])

function sessionPerdue(erreur: unknown): boolean {
  return isAuthApiError(erreur) && erreur.code !== undefined && SESSION_PERDUE.has(erreur.code)
}

/** Lit la session, son niveau, la ligne `compte` et, si besoin, le facteur vérifié. */
export async function chargerEtatSession(): Promise<EtatSession> {
  const auth = supabase().auth
  const {
    data: { session },
    error: erreurSession,
  } = await auth.getSession()
  if (erreurSession) throw erreurSession
  if (!session) return { statut: 'anonyme' }

  try {
    const { data: niveau, error: erreurNiveau } = await auth.mfa.getAuthenticatorAssuranceLevel()
    if (erreurNiveau) throw erreurNiveau
    const compte = await lireMonCompte(session.user.id)

    let facteurVerifie: string | null = null
    if (compte?.actif && niveau.currentLevel === 'aal1' && niveau.nextLevel === 'aal2') {
      // mfa.listFactors interroge le serveur : `totp` ne contient que les facteurs vérifiés.
      const { data: facteurs, error: erreurFacteurs } = await auth.mfa.listFactors()
      if (erreurFacteurs) throw erreurFacteurs
      facteurVerifie = facteurs.totp[0]?.id ?? null
    }

    return deduireEtat({
      utilisateur: { id: session.user.id, email: session.user.email ?? null },
      niveau: { actuel: niveau.currentLevel, suivant: niveau.nextLevel },
      compte,
      facteurVerifie,
    })
  } catch (erreur) {
    // Session révoquée ailleurs (double authentification réinitialisée, compte supprimé) :
    // on l'oublie sur cet appareil, et la connexion s'affiche.
    if (sessionPerdue(erreur)) {
      await auth.signOut({ scope: 'local' })
      return { statut: 'anonyme' }
    }
    throw erreur
  }
}

/** Fonction de la requête de session : note aussi comment la session s'est terminée. */
export async function chargerEtatSessionSuivi(): Promise<EtatSession> {
  const precedent = clientRequetes.getQueryData<EtatSession>(CLE_SESSION)
  const etat = await chargerEtatSession()
  noterTransition(precedent?.statut, etat.statut)
  return etat
}
