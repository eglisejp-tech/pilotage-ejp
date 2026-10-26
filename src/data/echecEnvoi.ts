// Classement unique des échecs d'envoi (décision T76). Toute écriture de l'outil passe par
// `envoyer` (src/data/envoi.ts), qui attache à l'erreur ce que le transport a vu ; ce fichier en
// tire un genre et une issue, puis la phrase de l'écran. Une seule règle pour tout l'outil :
//
// - la base a répondu avec un code : la table de `messagesBase.ts` dit le refus ;
// - un statut 2xx reçu vaut « enregistré », quoi qu'il arrive ensuite (PostgREST valide la
//   transaction avant de répondre) ; un 4xx ou une réponse de PostgREST avec un code, « rien
//   d'enregistré » (la transaction est annulée) ; un 5xx sans code, ou aucune réponse, une issue
//   inconnue ;
// - une création à l'issue inconnue dit « Vérifiez la liste avant de réessayer » et la liste est
//   relue : un nouvel essai ferait un doublon qui ne s'efface plus (ajout seulement) ;
// - un bogue du code prend le repli, jamais « La connexion a échoué » ;
// - tout échec technique porte une référence courte, la même que dans `X-Client-Info`.

import { suiviDe } from '@/data/envoi'
import {
  estControleImprevu,
  lireErreurBase,
  MESSAGES_COMMUNS,
  traduireErreurBase,
} from '@/data/messagesBase'
import type { ChampRefus, ErreurLue, NaturePhrase } from '@/data/messagesBase'
import { erreurDeConnexion } from '@/features/saisie/textes'
import { tirerReference } from '@/lib/transport'

/** Ce qui a fait échouer un envoi. */
export type GenreEchec =
  /** Refus de la base ou d'un contrôle, dit par la table. */
  | 'refus'
  /** Refus d'accès (42501 sans phrase). */
  | 'acces'
  /** Compte, ou ministère du compte, désactivé. */
  | 'desactive'
  /** Connexion expirée, double authentification absente, requête partie sans jeton. */
  | 'session'
  /** fetch rejeté : aucune réponse. */
  | 'sans_reponse'
  /** Statut reçu, corps perdu. */
  | 'reponse_perdue'
  /** Statut reçu, corps illisible (page HTML d'une passerelle, JSON sans code). */
  | 'reponse_illisible'
  /** Notre délai de 10 s. */
  | 'delai'
  /** Code présent mais absent de la table (P0001 inconnu, 23505, 22P02, 57014...). */
  | 'refus_inconnu'
  /** Exception du code de l'application. */
  | 'bogue'

/** Ce que l'on sait de l'enregistrement. */
export type IssueEnvoi = 'enregistre' | 'rien_enregistre' | 'inconnue'

export interface Classement {
  genre: GenreEchec
  issue: IssueEnvoi
  /** Statut HTTP reçu, s'il est connu. */
  statut: number | null
  /** Référence de l'envoi (celle de `X-Client-Info`), ou tirée pour cette erreur. */
  reference: string
}

/** Les genres que la base ou un contrôle ont dits : ni référence, ni relecture. */
const GENRES_DITS: ReadonlySet<GenreEchec> = new Set(['refus', 'acces', 'desactive', 'session'])

/** Erreur de fetch des clients Supabase (`AuthRetryableFetchError`, `FunctionsFetchError`). */
const NOM_ERREUR_FETCH = /^\w*FetchError$/

/**
 * Message d'un fetch rejeté (réseau coupé, hors ligne) : Chrome, Firefox, Safari, Node. Le nom
 * TypeError ne suffit pas : une TypeError d'un autre message est un bogue du code, pas une coupure.
 * Une annulation (AbortError qui n'est pas notre délai : application mise en arrière-plan) est
 * aussi une requête restée sans réponse.
 */
const MESSAGE_ERREUR_FETCH = /Failed to fetch|NetworkError|Load failed|fetch failed|^AbortError\b/

/** Références tirées pour une erreur sans suivi : la même à chaque lecture de cette erreur. */
const references = new WeakMap<object, string>()

function referenceDe(erreur: unknown): string {
  const suivi = suiviDe(erreur)
  if (suivi) return suivi.reference
  if (typeof erreur !== 'object' || erreur === null) return tirerReference()
  const connue = references.get(erreur)
  if (connue) return connue
  const tiree = tirerReference()
  references.set(erreur, tiree)
  return tiree
}

function texte(erreur: unknown, nom: 'name' | 'message'): string {
  if (typeof erreur !== 'object' || erreur === null) return ''
  const valeur = (erreur as Record<string, unknown>)[nom]
  return typeof valeur === 'string' ? valeur : ''
}

/** Une réponse de PostgREST au corps non JSON : `{ message: corps }`, sans code ni nom. */
function estCorpsIllisible(erreur: unknown): boolean {
  if (typeof erreur !== 'object' || erreur === null || erreur instanceof Error) return false
  return !('code' in erreur) && typeof (erreur as { message?: unknown }).message === 'string'
}

/** Statut porté par le message d'une `ReponsePerdue` sans suivi (« statut 200, corps perdu »). */
function statutDuMessage(message: string): number | null {
  const trouve = /^ReponsePerdue: statut (\d{3})\b/.exec(message)
  return trouve?.[1] ? Number(trouve[1]) : null
}

/** Vrai si l'erreur vient d'une réponse que la base a dite (code, ou consigne de Zod). */
function ditParLaBase(lue: ErreurLue): lue is Exclude<ErreurLue, { genre: 'technique' }> {
  return lue.genre !== 'technique'
}

/**
 * Genre et issue d'un échec d'envoi, sans effet (la session n'est pas relue). Les faits de
 * l'envoi (src/data/envoi.ts) décident d'abord ; sans eux (aperçus, tests), le nom et le message
 * de l'erreur.
 */
export function classer(erreur: unknown): Classement {
  const suivi = suiviDe(erreur)
  const message = texte(erreur, 'message')
  const nom = texte(erreur, 'name')
  const statut = suivi?.statut ?? statutDuMessage(message)
  const reference = referenceDe(erreur)
  const selonStatut = (sinon: IssueEnvoi): IssueEnvoi => {
    if (statut === null) return sinon
    if (statut < 300) return 'enregistre'
    return statut < 500 ? 'rien_enregistre' : 'inconnue'
  }
  const resultat = (genre: GenreEchec, issue: IssueEnvoi): Classement => ({
    genre,
    issue,
    statut,
    reference,
  })

  const lue = traduireErreurBase(erreur)
  if (ditParLaBase(lue)) {
    // Une consigne de Zod imprévue ou une exception levée après un 2xx : un bogue du code.
    const issue = statut !== null && statut < 300 ? 'enregistre' : 'rien_enregistre'
    if (lue.genre === 'acces') return resultat('acces', issue)
    if (estControleImprevu(erreur)) return resultat('bogue', issue)
    const genres: Record<NaturePhrase, GenreEchec> = {
      refus: 'refus',
      expiree: 'session',
      desactive: 'desactive',
      repli: 'refus_inconnu',
    }
    return resultat(genres[lue.nature], issue)
  }

  if (suivi?.phase === 'delai' || nom === 'TimeoutError' || /^TimeoutError\b/.test(message)) {
    return resultat('delai', selonStatut('inconnue'))
  }
  if (
    suivi?.phase === 'corps_perdu' ||
    nom === 'ReponsePerdue' ||
    /^ReponsePerdue\b/.test(message)
  ) {
    return resultat('reponse_perdue', selonStatut('inconnue'))
  }
  if (nom === 'FunctionsRelayError') return resultat('refus_inconnu', 'rien_enregistre')
  if (
    suivi?.phase === 'sans_reponse' ||
    NOM_ERREUR_FETCH.test(nom) ||
    nom === 'AbortError' ||
    MESSAGE_ERREUR_FETCH.test(message)
  ) {
    // Hors ligne au départ, le navigateur n'a rien envoyé (T76, Q9) ; « en ligne » ne prouve rien.
    const enLigne =
      suivi?.enLigneAuDepart ?? (typeof navigator === 'undefined' ? true : navigator.onLine)
    return resultat('sans_reponse', enLigne ? 'inconnue' : 'rien_enregistre')
  }
  if (suivi?.phase === 'reponse' || estCorpsIllisible(erreur)) {
    return resultat('reponse_illisible', selonStatut('inconnue'))
  }
  // Exception du code : avant toute requête, rien n'est parti ; après une réponse, son statut dit.
  return resultat('bogue', selonStatut('rien_enregistre'))
}

/** Ce que l'envoi risque à être refait : une ligne de plus, rien, ou une action sans formulaire. */
export type NatureEnvoi = 'creation' | 'reprise' | 'action'

/** Phrases d'un écran, pour les cas que la table ne dit pas. */
export interface PhrasesEcran {
  /**
   * `creation` : refaire peut créer une ligne de plus, ou rendrait un refus trompeur (« existe
   * déjà ») ; `reprise` : refaire ne crée rien de plus ; `action` : sans formulaire.
   */
  nature: NatureEnvoi
  /**
   * Phrase de connexion de l'écran, quand refaire ne risque rien ; par défaut « La connexion a
   * échoué. Votre saisie est encore dans le formulaire : réessayez. ».
   */
  connexion?: string
  /** Refus d'accès ; par défaut, la phrase commune. */
  acces?: string
}

/** Ce qu'un écran dit d'un échec d'envoi. */
export interface EchecLu extends Omit<Classement, 'reference'> {
  /** La phrase à dire, sous `champ` si l'écran l'a, sinon sous le bouton. */
  message: string
  champ: ChampRefus | null
  /** `technique` : une phrase de connexion ou « Vérifiez la liste », jamais sous un champ. */
  nature: NaturePhrase | 'technique'
  /** Référence à montrer sous la phrase (échec technique ou repli), sinon null. */
  reference: string | null
  /** Vrai quand la base a peut-être enregistré : l'écran relit ses listes. */
  relire: boolean
}

/**
 * Phrase d'un échec d'envoi pour un écran (T76). Relit la session après une connexion expirée ou
 * un compte désactivé (`lireErreurBase`).
 */
export function lireEchec(erreur: unknown, ecran: PhrasesEcran): EchecLu {
  const classement = classer(erreur)
  const { genre, issue } = classement
  const lue = lireErreurBase(erreur, { formulaire: ecran.nature !== 'action' })
  const relire = issue !== 'rien_enregistre'
  const avec = (
    message: string,
    nature: NaturePhrase | 'technique',
    champ: ChampRefus | null = null,
  ): EchecLu => ({
    ...classement,
    message,
    champ,
    nature,
    reference: GENRES_DITS.has(genre) ? null : classement.reference,
    relire,
  })
  const connexion = ecran.connexion ?? erreurDeConnexion('saisie')

  if (lue.genre === 'acces') return avec(ecran.acces ?? MESSAGES_COMMUNS.acces, 'refus')
  if (lue.genre === 'message' && issue === 'rien_enregistre') {
    return avec(lue.message, lue.nature, lue.champ)
  }
  if (issue === 'rien_enregistre') {
    // Hors ligne au départ : rien n'est parti, refaire ne risque rien.
    if (genre === 'sans_reponse') return avec(connexion, 'technique')
    return avec(
      ecran.nature === 'action' ? MESSAGES_COMMUNS.repliAction : MESSAGES_COMMUNS.repliSaisie,
      'repli',
    )
  }
  // Enregistré ou inconnu : refaire une création pourrait la doubler.
  return avec(ecran.nature === 'creation' ? MESSAGES_COMMUNS.peutEtreFait : connexion, 'technique')
}

/**
 * Phrase unique d'un échec, pour un écran qui la dit sous son bouton (sans placer de champ) :
 * `creation` pour une création, `formulaire: false` pour une action sans formulaire.
 */
export function phraseErreur(
  erreur: unknown,
  ecran: { connexion: string; acces?: string; creation?: boolean },
  options: { formulaire?: boolean } = {},
): string {
  const nature: NatureEnvoi = ecran.creation
    ? 'creation'
    : options.formulaire === false
      ? 'action'
      : 'reprise'
  return lireEchec(erreur, { nature, connexion: ecran.connexion, acces: ecran.acces }).message
}
