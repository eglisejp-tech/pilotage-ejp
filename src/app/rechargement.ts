/**
 * Rechargement de l'outil quand le code d'un écran n'arrive pas (découpage par écran). Le cas
 * attendu : une nouvelle version a été mise en ligne pendant que l'outil était ouvert. Les noms
 * des fichiers de code changent à chaque version, et ceux de l'ancienne n'existent plus (404) ;
 * recharger la page donne la nouvelle version, à la même adresse.
 *
 * L'outil ne recharge que si le serveur répond (sinon le navigateur afficherait sa propre page
 * d'erreur) et au plus une fois par minute : après un rechargement, un nouvel échec affiche
 * l'erreur de l'écran, avec « Réessayer ». Hors ligne, rien ne se recharge.
 */

/** Clé du stockage de session : l'heure du dernier rechargement fait pour un écran. */
export const CLE_RECHARGEMENT = 'pilotage-ejp.rechargement-ecran'

/** Pas de second rechargement automatique moins d'une minute après le premier. */
export const INTERVALLE_RECHARGEMENT_MS = 60_000

/** Délai au-delà duquel le serveur est réputé muet. */
const DELAI_SERVEUR_MS = 5_000

function rechargementRecent(maintenant: number): boolean {
  try {
    const valeur = window.sessionStorage.getItem(CLE_RECHARGEMENT)
    if (valeur === null) return false
    const instant = Number(valeur)
    return Number.isFinite(instant) && maintenant - instant < INTERVALLE_RECHARGEMENT_MS
  } catch {
    // Sans stockage, rien ne garantit qu'on ne rechargerait pas en boucle : on ne recharge pas.
    return true
  }
}

function noterRechargement(maintenant: number): boolean {
  try {
    window.sessionStorage.setItem(CLE_RECHARGEMENT, String(maintenant))
    return true
  } catch {
    return false
  }
}

/** Le serveur de l'outil répond-il ? Une lecture de la page d'accueil, sans cache. */
async function serveurJoignable(): Promise<boolean> {
  const controle = new AbortController()
  const minuterie = window.setTimeout(() => controle.abort(), DELAI_SERVEUR_MS)
  try {
    const reponse = await fetch('/', { cache: 'no-store', signal: controle.signal })
    return reponse.ok
  } catch {
    return false
  } finally {
    window.clearTimeout(minuterie)
  }
}

/**
 * Après l'échec du chargement du code d'un écran : recharge l'outil si c'est utile et sûr, et dit
 * si le rechargement est lancé (l'écran garde alors son attente jusqu'à la nouvelle page).
 */
export async function rechargerApresEchec(): Promise<boolean> {
  if (!navigator.onLine) return false
  if (rechargementRecent(Date.now())) return false
  if (!(await serveurJoignable())) return false
  if (!noterRechargement(Date.now())) return false
  window.location.reload()
  return true
}
