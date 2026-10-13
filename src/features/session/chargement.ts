import { isAuthApiError } from '@supabase/supabase-js'
import { lireMonCompte } from '@/data/compte'
import { lireConditionsAcceptees } from '@/data/conditions'
import { lireMaDeclaration, noterPassage } from '@/data/personnes'
import { deduireEtat } from '@/features/session/etat'
import type { EtatSession } from '@/features/session/etat'
import { noterTransition } from '@/features/session/motif'
import { VERSION_CONDITIONS } from '@/lib/metier/conditions'
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

/** Message de la console quand le jour d'utilisation n'est pas noté (T56). */
export const MESSAGE_PASSAGE_NON_NOTE = "Jour d'utilisation non noté."

/**
 * Un jour d'utilisation non noté ne bloque pas l'outil, mais ne passe pas inaperçu : un message
 * fixe et le code de l'erreur dans la console, sans prénom ni autre donnée de la personne.
 */
function signalerPassageNonNote(erreur: unknown): void {
  const code =
    typeof erreur === 'object' && erreur !== null && 'code' in erreur
      ? String(erreur.code)
      : 'inconnu'
  console.warn(MESSAGE_PASSAGE_NON_NOTE, code)
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

    // Acceptation des conditions (T53) : lisible en aal2 seulement ; avant, elle ne sert à rien.
    const conditionsAcceptees =
      compte?.actif && niveau.currentLevel === 'aal2'
        ? await lireConditionsAcceptees(session.user.id, VERSION_CONDITIONS)
        : false

    // Personne qui utilise un compte de ministère sur cet appareil (T56) : lue après les
    // conditions, pour un compte de ministère seulement.
    const declaration =
      compte?.actif && compte.type === 'ministere' && conditionsAcceptees
        ? await lireMaDeclaration()
        : null

    const etat = deduireEtat({
      utilisateur: { id: session.user.id, email: session.user.email ?? null },
      niveau: { actuel: niveau.currentLevel, suivant: niveau.nextLevel },
      compte,
      facteurVerifie,
      conditionsAcceptees,
      declaration,
    })
    // Jour d'utilisation (une ligne par jour, la base ignore les suivantes). Sans attendre : un
    // échec ne bloque jamais l'outil, mais il se voit dans la console.
    if (etat.statut === 'connecte' && declaration !== null) {
      noterPassage(declaration.id).catch(signalerPassageNonNote)
    }
    return etat
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

/** Au-delà, la lecture de la session échoue : « Chargement » ne dure jamais (LISEZMOI, « États »). */
export const DELAI_MAX_SESSION = 10_000

function avecDelaiMaximal<T>(promesse: Promise<T>): Promise<T> {
  let minuterie: ReturnType<typeof setTimeout> | undefined
  // Une erreur nommée TimeoutError, comme le délai de fetchAvecDelai : l'écran d'erreur dit alors
  // « La réponse met trop de temps » (m252, `estDelaiDepasse`).
  const delai = new Promise<never>((_, refuser) => {
    minuterie = setTimeout(
      () => refuser(new DOMException('Lecture de la session trop longue.', 'TimeoutError')),
      DELAI_MAX_SESSION,
    )
  })
  return Promise.race([promesse, delai]).finally(() => clearTimeout(minuterie))
}

/**
 * Fonction de la requête de session : 10 s au plus (serveur injoignable, verrou ou
 * renouvellement du jeton bloqués), puis l'écran d'erreur et « Réessayer ». Note aussi comment
 * la session s'est terminée.
 */
export async function chargerEtatSessionSuivi(): Promise<EtatSession> {
  const precedent = clientRequetes.getQueryData<EtatSession>(CLE_SESSION)
  const etat = await avecDelaiMaximal(chargerEtatSession())
  noterTransition(precedent?.statut, etat.statut)
  return etat
}

/** Au plus une vérification par période : un écran qui relit son erreur ne relance rien. */
export const INTERVALLE_VERIFICATION_SESSION = 10_000

let derniereVerification: number | null = null

/**
 * Un refus de la base dit que la session a changé : connexion expirée ou compte désactivé (m271,
 * `surSessionChangee` de `src/data/messagesBase.ts`). Auth vérifie d'abord la session auprès du
 * serveur : révoquée ailleurs, elle s'oublie sur cet appareil. Puis l'état est relu : la garde mène
 * à l'écran de connexion ou de code, avec la page en retour, ou à « Compte désactivé ». Une
 * session encore bonne (jeton renouvelé entre-temps) laisse la page en place : réessayer suffit.
 */
export async function verifierSessionChangee(): Promise<void> {
  const maintenant = Date.now()
  if (
    derniereVerification !== null &&
    maintenant - derniereVerification < INTERVALLE_VERIFICATION_SESSION
  ) {
    return
  }
  derniereVerification = maintenant
  try {
    const auth = supabase().auth
    const { error } = await auth.getUser()
    if (sessionPerdue(error)) await auth.signOut({ scope: 'local' })
  } catch {
    // Pas de réponse d'Auth : la relecture de l'état dira ce qu'il en est.
  }
  await clientRequetes.invalidateQueries({ queryKey: CLE_SESSION })
}
