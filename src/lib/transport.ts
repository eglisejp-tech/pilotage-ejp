// Transport des appels vers Supabase (base, Auth, Edge Functions), décision T76 : un délai
// maximal, le compte des écritures en vol (T73), la version du site dans chaque appel, et ce que
// l'on sait d'un envoi quand il échoue. postgrest-js rattrape toute exception de fetch et de la
// lecture du corps, et la rend avec un code vide et un statut 0 : sans ces faits, « rien n'est
// parti », « la réponse s'est perdue après l'enregistrement » et « bogue » se ressemblent.

/** Au-delà, une requête est abandonnée et l'écran affiche son erreur (LISEZMOI, « États »). */
export const DELAI_MAX_REQUETE = 10_000

/**
 * Version du site (sha court du commit, posé au build par `vite.config.ts`), ou « local ». Elle
 * part dans `X-Client-Info`, que la passerelle Supabase journalise : un appel sans « pilotage= »
 * vient de l'ancien site, figé.
 */
export const VERSION_SITE: string = __VERSION_SITE__

/**
 * Cible d'une écriture, lue dans l'adresse de la requête : une fonction de la base
 * (`/rest/v1/rpc/<nom>`), une table (`/rest/v1/<nom>`) ou une Edge Function
 * (`/functions/v1/<nom>`).
 */
export type CibleEnvoi = `rpc/${string}` | `table/${string}` | `functions/${string}`

/** Ce qui est arrivé à un envoi : réponse lue, aucune réponse, corps perdu, ou notre délai. */
export type PhaseEnvoi = 'reponse' | 'sans_reponse' | 'corps_perdu' | 'delai'

/** Faits d'un envoi, remplis par `fetchAvecDelai` ; jamais un texte saisi ni une réponse. */
export interface Suivi {
  readonly cible: CibleEnvoi
  /** Six caractères, posés dans `X-Client-Info` (« ref= ») et affichés sous le message. */
  readonly reference: string
  /** `navigator.onLine` juste avant l'envoi : faux, rien n'est parti. */
  enLigneAuDepart?: boolean
  /** Statut HTTP reçu, s'il est arrivé. */
  statut?: number
  phase?: PhaseEnvoi
  /** Nom de l'erreur du navigateur (TypeError, AbortError...), jamais son message. */
  nomErreur?: string
  /** Durée de l'envoi, en millisecondes. */
  duree?: number
}

/** Alphabet des références : sans 0, 1, I, L ni O, qui se confondent à la lecture. */
const ALPHABET_REFERENCE = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

/** Une référence courte, à dire ou à recopier depuis une capture d'écran. */
export function tirerReference(): string {
  const tirage = crypto.getRandomValues(new Uint32Array(6))
  return Array.from(
    tirage,
    (valeur) => ALPHABET_REFERENCE[valeur % ALPHABET_REFERENCE.length],
  ).join('')
}

/** Envois annoncés par `envoyer` (src/data/envoi.ts), en attente de leur requête, par cible. */
const enAttente = new Map<CibleEnvoi, Suivi[]>()

/**
 * Annonce l'envoi qui va partir vers `cible` : la prochaine écriture vers cette adresse reçoit ce
 * suivi. Deux envois vers la même cible ne partent jamais en même temps (le bouton est inactif
 * pendant l'envoi) ; s'il y en avait, ils garderaient leur ordre.
 */
export function annoncerEnvoi(cible: CibleEnvoi): Suivi {
  const suivi: Suivi = { cible, reference: tirerReference() }
  enAttente.set(cible, [...(enAttente.get(cible) ?? []), suivi])
  return suivi
}

/** Retire un envoi annoncé dont la requête n'est jamais partie (contrôle avant l'appel). */
export function oublierEnvoi(suivi: Suivi): void {
  const reste = (enAttente.get(suivi.cible) ?? []).filter((autre) => autre !== suivi)
  if (reste.length > 0) enAttente.set(suivi.cible, reste)
  else enAttente.delete(suivi.cible)
}

function prendreEnvoi(cible: CibleEnvoi | null): Suivi | undefined {
  if (cible === null) return undefined
  const [premier, ...reste] = enAttente.get(cible) ?? []
  if (!premier) return undefined
  if (reste.length > 0) enAttente.set(cible, reste)
  else enAttente.delete(cible)
  return premier
}

function adresseDe(entree: RequestInfo | URL): string {
  return typeof entree === 'string' ? entree : entree instanceof URL ? entree.href : entree.url
}

/** Cible d'une adresse de l'API, ou null (Auth, adresse inconnue). */
export function cibleDe(adresse: string): CibleEnvoi | null {
  let chemin: string
  try {
    chemin = new URL(adresse).pathname
  } catch {
    return null
  }
  const rpc = /\/rest\/v1\/rpc\/([^/]+)$/.exec(chemin)
  if (rpc?.[1]) return `rpc/${rpc[1]}`
  const table = /\/rest\/v1\/([^/]+)$/.exec(chemin)
  if (table?.[1]) return `table/${table[1]}`
  const fonction = /\/functions\/v1\/([^/]+)$/.exec(chemin)
  if (fonction?.[1]) return `functions/${fonction[1]}`
  return null
}

/**
 * Une écriture vers la base ou une Edge Function (tout appel autre qu'une lecture GET ou HEAD
 * vers /rest/v1/ ou /functions/v1/). Les appels à Auth ne comptent pas.
 */
export function estEcriture(entree: RequestInfo | URL, init?: RequestInit): boolean {
  const methode = (
    init?.method ?? (entree instanceof Request ? entree.method : 'GET')
  ).toUpperCase()
  if (methode === 'GET' || methode === 'HEAD') return false
  return /\/(?:rest|functions)\/v1\//.test(adresseDe(entree))
}

let ecrituresEnCours = 0

/**
 * Écritures en vol (T73) : changer d'espace attend qu'elles soient finies, pour ne jamais
 * recharger la page au milieu d'un enregistrement (sa réussite ne s'afficherait pas).
 */
export function ecrituresEnVol(): number {
  return ecrituresEnCours
}

/**
 * La réponse est arrivée (statut connu), mais son corps s'est perdu. Le statut est dans le
 * message : postgrest-js ne garde que le nom et le message d'une erreur (« ReponsePerdue: ... »).
 */
export class ReponsePerdue extends Error {
  override name = 'ReponsePerdue'

  constructor(statut: number) {
    super(`statut ${statut}, corps perdu`)
  }
}

/** `X-Client-Info` de supabase-js, complété par la version du site et, pour un envoi, sa référence. */
function enTetes(entree: RequestInfo | URL, init: RequestInit | undefined, suivi?: Suivi): Headers {
  const entetes = new Headers(init?.headers ?? (entree instanceof Request ? entree.headers : {}))
  const parties = [entetes.get('X-Client-Info'), `pilotage=${VERSION_SITE}`]
  if (suivi) parties.push(`ref=${suivi.reference}`)
  entetes.set('X-Client-Info', parties.filter(Boolean).join('; '))
  return entetes
}

/** Statuts sans corps : une réponse refaite pour eux n'en porte pas (sinon le constructeur lève). */
const SANS_CORPS = new Set([204, 205, 304])

/**
 * fetch avec un délai maximal, en gardant le signal d'annulation fourni par l'appelant. Le corps
 * est lu ici : une lecture qui échoue après la réponse se distingue d'une requête restée sans
 * réponse, et notre délai se reconnaît à notre signal, quel que soit le nom que lui donne le
 * navigateur (Safari rejette parfois avec AbortError).
 */
export async function fetchAvecDelai(
  entree: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const delai = AbortSignal.timeout(DELAI_MAX_REQUETE)
  const signal = init?.signal ? AbortSignal.any([init.signal, delai]) : delai
  const ecriture = estEcriture(entree, init)
  const suivi = ecriture ? prendreEnvoi(cibleDe(adresseDe(entree))) : undefined
  const headers = enTetes(entree, init, suivi)
  const debut = performance.now()
  if (suivi) suivi.enLigneAuDepart = typeof navigator === 'undefined' || navigator.onLine
  /** Notre délai, et pas une annulation de l'appelant (page quittée, lecture remplacée). */
  const notreDelai = () => delai.aborted && !init?.signal?.aborted
  const echec = (phase: PhaseEnvoi, erreur: unknown) => {
    if (suivi) {
      suivi.phase = notreDelai() ? 'delai' : phase
      suivi.nomErreur = erreur instanceof Error ? erreur.name : typeof erreur
    }
    return notreDelai() ? new DOMException('Délai de 10 s dépassé.', 'TimeoutError') : erreur
  }
  if (ecriture) ecrituresEnCours += 1
  try {
    let reponse: Response
    try {
      reponse = await fetch(entree, { ...init, headers, signal })
    } catch (erreur) {
      throw echec('sans_reponse', erreur)
    }
    if (suivi) suivi.statut = reponse.status
    if (reponse.status < 200 || reponse.status > 599) return reponse
    let corps: string
    try {
      corps = await reponse.text()
    } catch (erreur) {
      const levee = echec('corps_perdu', erreur)
      throw levee === erreur ? new ReponsePerdue(reponse.status) : levee
    }
    if (suivi) suivi.phase = 'reponse'
    return new Response(SANS_CORPS.has(reponse.status) ? null : corps, {
      status: reponse.status,
      statusText: reponse.statusText,
      headers: reponse.headers,
    })
  } finally {
    if (suivi) suivi.duree = Math.round(performance.now() - debut)
    if (ecriture) ecrituresEnCours -= 1
  }
}
