import type { Compte } from '@/data/compte'
import { TEXTES_ESPACES } from '@/features/espaces/textes'
import type { EtatSession, Statut } from '@/features/session/etat'
import {
  analyserRegistre,
  avecActif,
  avecCompte,
  avecNouvelEspace,
  CLE_REGISTRE,
  ecrireRegistre,
  effacerRegistre,
  espaceActif,
  espacesConnus,
  lireRegistre,
  lireRegistreBrut,
  noterPassageDEspace,
  sansCompte,
  sansEspace,
} from '@/lib/espaces'
import type { Espace, Registre } from '@/lib/espaces'
import { rechargerA } from '@/lib/rechargement'
import { CLE_SESSION, clientRequetes } from '@/lib/requetes'
import { cleDeStockageDe, clientDeLEspaceInactif, idEspaceDuClient, supabase } from '@/lib/supabase'

// Actions de « Changer d'espace » (T73). Un seul client Supabase existe dans la page, celui de
// l'espace actif : tout changement d'espace actif vide le cache et recharge la page, pour que
// rien du compte précédent (données, écrans, requêtes en cours, client Auth) ne reste en mémoire.

export type ResultatEspace = { erreur?: string }

/** Efface ce qu'auth-js garde pour un espace : la connexion, le vérificateur PKCE, l'utilisateur. */
function effacerConnexionDe(espace: Espace): void {
  try {
    const cle = cleDeStockageDe(espace)
    for (const suffixe of ['', '-code-verifier', '-user']) {
      window.localStorage.removeItem(`${cle}${suffixe}`)
    }
  } catch {
    // Stockage inaccessible ou configuration absente : rien n'y est enregistré.
  }
}

/**
 * Ferme la connexion d'un espace inactif : signOut local par un client temporaire (le serveur
 * oublie cette connexion, et elle seule), puis ses clés s'effacent, même sans réponse.
 */
export async function fermerEspaceInactif(espace: Espace): Promise<void> {
  try {
    const client = clientDeLEspaceInactif(espace)
    try {
      await client.auth.signOut({ scope: 'local' })
    } finally {
      await client.auth.dispose()
    }
  } catch {
    // Sans réponse d'Auth : la connexion s'efface quand même de cet appareil.
  }
  effacerConnexionDe(espace)
}

/** Ferme la connexion de l'espace actif, et elle seule. */
async function fermerEspaceActif(espace: Espace): Promise<void> {
  try {
    await supabase().auth.signOut({ scope: 'local' })
  } catch {
    // Sans réponse d'Auth : la connexion s'efface quand même de cet appareil.
  }
  effacerConnexionDe(espace)
}

/** Vide tout le cache, puis recharge la page dans le nouvel espace actif. */
function recharger(adresse: string): void {
  clientRequetes.clear()
  noterPassageDEspace()
  rechargerA(adresse)
}

/** Un enregistrement en cours se ferait au nom du compte qu'on quitte : on attend sa fin. */
function enregistrementEnCours(): boolean {
  return clientRequetes.isMutating() > 0
}

/** États d'un espace inachevé : sans connexion, avant le code, ou compte désactivé. */
const INACHEVES: ReadonlySet<Statut> = new Set(['anonyme', 'activation', 'code', 'desactive'])

/**
 * Quitter un espace inachevé le ferme (ajout abandonné, connexion expirée) : la liste ne garde
 * que des comptes ouverts. Un espace dont l'état n'est pas lu reste.
 */
async function quitter(registre: Registre): Promise<Registre> {
  const etat = clientRequetes.getQueryData<EtatSession>(CLE_SESSION)
  if (!etat || !INACHEVES.has(etat.statut)) return registre
  const actif = espaceActif(registre)
  await fermerEspaceActif(actif)
  return sansEspace(registre, actif.id)
}

/** « Changer d'espace », puis un compte de la liste : la page se recharge dans son espace. */
export async function changerDEspace(id: string): Promise<ResultatEspace> {
  if (enregistrementEnCours()) return { erreur: TEXTES_ESPACES.enregistrementEnCours }
  const registre = lireRegistre()
  if (id === registre.actif || !registre.espaces.some((espace) => espace.id === id)) return {}
  ecrireRegistre(avecActif(await quitter(registre), id))
  recharger('/')
  return {}
}

/**
 * « Ajouter un compte » : un nouvel espace vide devient actif, puis l'écran de connexion. Le
 * compte qu'on quitte est d'abord noté dans le registre, pour la liste.
 */
export function ajouterUnCompte(): ResultatEspace {
  if (enregistrementEnCours()) return { erreur: TEXTES_ESPACES.enregistrementEnCours }
  let registre = lireRegistre()
  const etat = clientRequetes.getQueryData<EtatSession>(CLE_SESSION)
  if (etat && 'compte' in etat) {
    const { compte } = etat
    registre = avecCompte(registre, registre.actif, {
      utilisateur: compte.id,
      libelle: compte.libelle,
      type: compte.type,
    }).registre
  }
  const ajout = avecNouvelEspace(registre)
  if (!ajout) return { erreur: TEXTES_ESPACES.tropDeComptes }
  ecrireRegistre(ajout.registre)
  recharger('/connexion')
  return {}
}

/** « Retirer ce compte » : seule sa connexion se ferme, puis la page passe à un autre espace. */
export async function retirerCeCompte(): Promise<ResultatEspace> {
  if (enregistrementEnCours()) return { erreur: TEXTES_ESPACES.enregistrementEnCours }
  const registre = lireRegistre()
  if (registre.espaces.length < 2) return {}
  const actif = espaceActif(registre)
  await fermerEspaceActif(actif)
  ecrireRegistre(sansEspace(registre, actif.id))
  recharger('/')
  return {}
}

/**
 * Partie de « Se déconnecter » (T73 : tous les comptes de l'appareil) : ferme chaque espace
 * inactif, puis ne garde que l'espace actif, sans compte. La connexion de l'espace actif se ferme
 * ensuite comme avant (`seDeconnecter`). Sans registre, rien ne change.
 */
export async function fermerLesAutresEspaces(): Promise<void> {
  if (lireRegistreBrut() === null) return
  const registre = lireRegistre()
  const actif = espaceActif(registre)
  const autres = registre.espaces.filter((espace) => espace.id !== actif.id)
  await Promise.all(autres.map((espace) => fermerEspaceInactif(espace)))
  // Dans la clé par défaut, l'appareil revient au cas d'un seul compte, sans registre ; sinon, le
  // registre garde la clé de l'espace actif, où se fera la prochaine connexion.
  if (actif.cle === null) effacerRegistre()
  else ecrireRegistre(sansCompte({ actif: actif.id, espaces: [actif] }, actif.id))
}

/**
 * Compte désactivé, avec d'autres comptes ouverts sur l'appareil : seule la connexion de l'espace
 * actif se ferme, et il oublie son compte ; les autres restent ouverts. Faux s'il n'y a qu'un
 * compte : « Se déconnecter » s'applique alors, comme avant.
 */
export async function fermerSeulementCetEspace(): Promise<boolean> {
  const registre = lireRegistre()
  if (registre.espaces.length < 2) return false
  ecrireRegistre(sansCompte(registre, registre.actif))
  await fermerEspaceActif(espaceActif(registre))
  return true
}

/**
 * Note le compte connecté dans l'espace du client (lecture de la session). Sans registre (un seul
 * compte sur l'appareil), rien n'est écrit. Un compte déjà ouvert dans un autre espace (ajouté une
 * deuxième fois, ou Google qui ouvre le compte de la plateforme) ferme l'ancien espace.
 */
export function noterCompteDeLEspace(utilisateur: string, compte: Compte | null): void {
  const brut = lireRegistreBrut()
  if (brut === null || !compte) return
  const registre = analyserRegistre(brut)
  const id = idEspaceDuClient() ?? registre.actif
  const espace = registre.espaces.find((candidat) => candidat.id === id)
  if (!espace) return
  if (
    espace.utilisateur === utilisateur &&
    espace.libelle === compte.libelle &&
    espace.type === compte.type
  ) {
    return
  }
  const { registre: suivant, doublons } = avecCompte(registre, id, {
    utilisateur,
    libelle: compte.libelle,
    type: compte.type,
  })
  ecrireRegistre(doublons.reduce((resultat, doublon) => sansEspace(resultat, doublon.id), suivant))
  for (const doublon of doublons) void fermerEspaceInactif(doublon)
}

/**
 * Message de l'écran de connexion d'un espace dont la connexion a pris fin, quand d'autres
 * comptes restent ouverts sur l'appareil : il nomme le compte à reconnecter. Sinon undefined.
 */
export function messageEspaceExpire(): string | undefined {
  const registre = lireRegistre()
  const actif = espaceActif(registre)
  const autres = espacesConnus(registre).filter(({ id }) => id !== actif.id)
  return actif.libelle !== undefined && autres.length > 0
    ? TEXTES_ESPACES.connexionExpiree(actif.libelle)
    : undefined
}

let suivi = false

/**
 * Un autre onglet a changé d'espace actif (ou vidé le stockage) : cet onglet le suit, pour que
 * tous les onglets de l'appareil agissent au nom du même compte.
 */
export function suivreLesAutresOnglets(): void {
  if (suivi) return
  suivi = true
  window.addEventListener('storage', (evenement) => {
    if (evenement.key !== CLE_REGISTRE && evenement.key !== null) return
    const id = idEspaceDuClient()
    if (id === undefined || lireRegistre().actif === id) return
    recharger('/')
  })
}
