import type { Compte } from '@/data/compte'
import { TEXTES_ESPACES } from '@/features/espaces/textes'
import { accueil } from '@/features/navigation/profils'
import type { EtatSession, Statut } from '@/features/session/etat'
import { effacerMotDePasseAChoisir } from '@/features/session/motDePasseAChoisir'
import {
  analyserRegistre,
  avecActif,
  avecCompte,
  avecNouvelEspace,
  CLE_REGISTRE,
  ecrireRegistre,
  effacerRegistre,
  ESPACE_PRINCIPAL,
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
import {
  cleDeStockageDe,
  cleDuClient,
  clientDeLEspaceInactif,
  ecrituresEnVol,
  idEspaceDuClient,
  supabase,
} from '@/lib/supabase'

// Actions de « Changer d'espace » (T73). Un seul client Supabase existe dans la page, celui de
// l'espace actif : tout changement d'espace actif vide le cache et recharge la page, pour que
// rien du compte précédent (données, écrans, requêtes en cours, client Auth) ne reste en mémoire.

export type ResultatEspace = { erreur?: string }

/**
 * Efface ce qu'auth-js garde pour un espace : la connexion et tout ce qui porte sa clé en préfixe
 * (vérificateurs PKCE `-code-verifier`, `-flow-<id>-code-verifier`, `-flows-code-verifier`,
 * utilisateur à part `-user`).
 */
function effacerConnexionDe(espace: Espace): void {
  try {
    const cle = cleDeStockageDe(espace)
    for (const candidate of Object.keys(window.localStorage)) {
      if (candidate === cle || candidate.startsWith(`${cle}-`)) {
        window.localStorage.removeItem(candidate)
      }
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

/** Ferme la connexion de l'espace du client de la page, et elle seule. */
async function fermerEspaceActif(espace: Espace): Promise<void> {
  try {
    await supabase().auth.signOut({ scope: 'local' })
  } catch {
    // Sans réponse d'Auth : la connexion s'efface quand même de cet appareil.
  }
  effacerConnexionDe(espace)
}

/**
 * L'espace du client de la page. Un autre onglet a pu changer l'espace actif du registre juste
 * avant : c'est bien la connexion de ce client qu'il faut fermer.
 */
function espaceDuClient(registre: Registre): Espace {
  const id = idEspaceDuClient()
  return registre.espaces.find((espace) => espace.id === id) ?? espaceActif(registre)
}

/**
 * Vide tout le cache, puis recharge la page dans le nouvel espace actif. L'étape « mot de passe
 * à choisir » (lien d'invitation ou de récupération) appartient au compte qu'on quitte : elle ne
 * suit pas la personne dans l'autre espace.
 */
function recharger(adresse: string): void {
  clientRequetes.clear()
  effacerMotDePasseAChoisir()
  noterPassageDEspace()
  rechargerA(adresse)
}

/**
 * Un enregistrement en cours (écriture vers la base ou une Edge Function) : recharger la page
 * cacherait sa réussite, et la personne le referait. On attend sa fin.
 */
function enregistrementEnCours(): boolean {
  return clientRequetes.isMutating() > 0 || ecrituresEnVol() > 0
}

/** Au plus le délai d'une requête (10 s), un peu plus : attend la fin des écritures en vol. */
async function attendreLesEcritures(): Promise<void> {
  const limite = Date.now() + 11_000
  while (enregistrementEnCours() && Date.now() < limite) {
    await new Promise((resoudre) => setTimeout(resoudre, 100))
  }
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
  const actif = espaceDuClient(registre)
  await fermerEspaceActif(actif)
  return sansEspace(registre, actif.id)
}

/** L'accueil du compte de l'espace (la modération pour EJP Tech), ou « / » s'il n'est pas connu. */
function accueilDe(espace: Espace | undefined): string {
  return espace?.type ? accueil(espace.type) : '/'
}

/** « Changer d'espace », puis un compte de la liste : la page se recharge dans son espace. */
export async function changerDEspace(id: string): Promise<ResultatEspace> {
  if (enregistrementEnCours()) return { erreur: TEXTES_ESPACES.enregistrementEnCours }
  const registre = lireRegistre()
  const cible = registre.espaces.find((espace) => espace.id === id)
  if (id === espaceDuClient(registre).id || !cible) return {}
  ecrireRegistre(avecActif(await quitter(registre), id))
  recharger(accueilDe(cible))
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
    registre = avecCompte(registre, espaceDuClient(registre).id, {
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
  const actif = espaceDuClient(registre)
  await fermerEspaceActif(actif)
  const suivant = sansEspace(registre, actif.id)
  ecrireRegistre(suivant)
  recharger(accueilDe(espaceActif(suivant)))
  return {}
}

const MOTIF_CLE_ESPACE = /^sb-pilotage-espace-([a-z0-9]{1,24})-auth-token$/

/**
 * Connexions gardées dans ce navigateur hors du registre : un doublon dont la fermeture n'a pas
 * abouti, un registre illisible ou écrasé par un autre onglet. Jamais celle du client de la page.
 */
function espacesOrphelins(registre: Registre): Espace[] {
  const connues = new Set(registre.espaces.map(({ cle }) => cle))
  const orphelins: Espace[] = []
  try {
    for (const cle of Object.keys(window.localStorage)) {
      const trouve = MOTIF_CLE_ESPACE.exec(cle)
      if (trouve?.[1] && !connues.has(cle)) orphelins.push({ id: trouve[1], cle })
    }
    // La clé par défaut, quand plus aucun espace du registre ne la porte.
    if (!connues.has(null)) {
      const principal: Espace = { id: ESPACE_PRINCIPAL, cle: null }
      if (window.localStorage.getItem(cleDeStockageDe(principal)) !== null) {
        orphelins.push(principal)
      }
    }
  } catch {
    // Stockage inaccessible : rien n'y est enregistré.
  }
  if (orphelins.length === 0) return orphelins
  const duClient = cleDuClient()
  return orphelins.filter(
    (espace) => espace.cle !== duClient && cleDeStockageDe(espace) !== duClient,
  )
}

/**
 * Au chargement : ferme les connexions orphelines (serveur et appareil). Rien ne reste ouvert
 * sans figurer dans la liste « Changer d'espace ».
 */
export async function fermerLesConnexionsOrphelines(): Promise<void> {
  const orphelins = espacesOrphelins(lireRegistre())
  await Promise.all(orphelins.map((espace) => fermerEspaceInactif(espace)))
}

/**
 * Début de « Se déconnecter » (T73 : tous les comptes de l'appareil). Le registre ne garde aussitôt
 * que l'espace du client, sans compte (aucun autre compte ne s'affiche plus, même si la fermeture
 * prend du temps) ; rend les autres espaces et les connexions orphelines, à fermer en même temps
 * que celle du client. Sans registre ni orpheline, rien.
 */
export function detacherLesAutresEspaces(): Espace[] {
  const brut = lireRegistreBrut()
  const registre = analyserRegistre(brut)
  const orphelins = espacesOrphelins(registre)
  if (brut === null) return orphelins
  const actif = espaceDuClient(registre)
  const autres = registre.espaces.filter((espace) => espace.id !== actif.id)
  // Dans la clé par défaut, l'appareil revient au cas d'un seul compte, sans registre ; sinon, le
  // registre garde la clé de l'espace actif, où se fera la prochaine connexion.
  if (actif.cle === null) effacerRegistre()
  else ecrireRegistre({ actif: actif.id, espaces: [{ id: actif.id, cle: actif.cle }] })
  return [...autres, ...orphelins]
}

/** Ferme ces espaces inactifs, tous en même temps. */
export async function fermerEspaces(espaces: readonly Espace[]): Promise<void> {
  await Promise.all(espaces.map((espace) => fermerEspaceInactif(espace)))
}

/**
 * Compte désactivé, avec d'autres comptes ouverts sur l'appareil : seule la connexion de l'espace
 * actif se ferme, et il oublie son compte ; les autres restent ouverts. Faux s'il n'y a qu'un
 * compte : « Se déconnecter » s'applique alors, comme avant.
 */
export async function fermerSeulementCetEspace(): Promise<boolean> {
  const registre = lireRegistre()
  if (registre.espaces.length < 2) return false
  const actif = espaceDuClient(registre)
  ecrireRegistre(sansCompte(registre, actif.id))
  await fermerEspaceActif(actif)
  return true
}

/**
 * Note le compte connecté dans l'espace du client (lecture de la session). Sans registre (un seul
 * compte sur l'appareil), rien n'est écrit. Un compte déjà ouvert dans un autre espace (ajouté une
 * deuxième fois, ou Google qui ouvre le compte de la plateforme) ferme l'ancien espace, qui ne
 * quitte la liste qu'une fois sa connexion fermée (sinon « Se déconnecter » la fermera).
 */
export function noterCompteDeLEspace(utilisateur: string, compte: Compte | null): void {
  const brut = lireRegistreBrut()
  if (brut === null || !compte) return
  const registre = analyserRegistre(brut)
  const espace = espaceDuClient(registre)
  if (
    espace.utilisateur === utilisateur &&
    espace.libelle === compte.libelle &&
    espace.type === compte.type
  ) {
    return
  }
  const { registre: suivant, doublons } = avecCompte(registre, espace.id, {
    utilisateur,
    libelle: compte.libelle,
    type: compte.type,
  })
  ecrireRegistre(suivant)
  for (const doublon of doublons) {
    void fermerEspaceInactif(doublon).then(() => {
      ecrireRegistre(sansEspace(lireRegistre(), doublon.id))
    })
  }
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
 * Au premier chargement de la session : ferme les connexions orphelines, puis suit les autres
 * onglets. Un autre onglet a changé d'espace actif (ou vidé le stockage) : cet onglet le suit,
 * pour que tous les onglets de l'appareil agissent au nom du même compte, après la fin de ses
 * propres écritures en vol.
 */
export function suivreLesAutresOnglets(): void {
  if (suivi) return
  suivi = true
  void fermerLesConnexionsOrphelines()
  window.addEventListener('storage', (evenement) => {
    if (evenement.key !== CLE_REGISTRE && evenement.key !== null) return
    const id = idEspaceDuClient()
    if (id === undefined || lireRegistre().actif === id) return
    void attendreLesEcritures().then(() => recharger('/'))
  })
}
