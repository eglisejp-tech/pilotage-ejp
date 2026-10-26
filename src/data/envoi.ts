// Enveloppe de toute écriture de `src/data/` (décision T76). Elle annonce l'envoi au transport,
// qui lui donne sa référence et note ce qui arrive à la requête (statut reçu, corps perdu, notre
// délai, réseau coupé au départ), puis attache ces faits à l'erreur rendue, sans la remplacer :
// l'écran la lit par `lireEchec` (src/data/echecEnvoi.ts). Une écriture qui ne passe pas par ici
// ne serait classée que d'après son message (un test le vérifie : src/data/envoi.test.ts).
//
// Les trois créations à numéro anti-doublon (événement, point, signalement ; lot B) repartent une
// fois d'elles-mêmes après un échec rapide (Proposé, Q1) : le numéro rend ce second envoi sans
// risque, la base reconnaît le premier s'il est arrivé.

import { z } from 'zod'
import { annoncerEnvoi, oublierEnvoi } from '@/lib/transport'
import type { CibleEnvoi, Suivi } from '@/lib/transport'

const suivis = new WeakMap<object, Suivi>()

/** Faits de l'envoi qui a produit cette erreur, s'il est passé par `envoyer`. */
export function suiviDe(erreur: unknown): Suivi | undefined {
  return typeof erreur === 'object' && erreur !== null ? suivis.get(erreur) : undefined
}

function attacher(erreur: unknown, suivi: Suivi): void {
  if (typeof erreur === 'object' && erreur !== null && !suivis.has(erreur))
    suivis.set(erreur, suivi)
}

/**
 * Un échec d'envoi, tel que `envoyer` le voit passer : l'erreur (son suivi attaché), et si un
 * nouvel essai automatique l'a rattrapé. Les incidents d'envoi (lot C) s'y abonnent.
 */
export interface EchecVu {
  erreur: unknown
  suivi: Suivi
  /** Vrai si le nouvel essai automatique qui a suivi a réussi. */
  rattrape: boolean
}

type Ecouteur = (echec: EchecVu) => void

const ecouteurs = new Set<Ecouteur>()

/** S'abonne aux échecs d'envoi ; rend la fonction qui désabonne. */
export function surEchecEnvoi(ecouteur: Ecouteur): () => void {
  ecouteurs.add(ecouteur)
  return () => {
    ecouteurs.delete(ecouteur)
  }
}

function signaler(echec: EchecVu): void {
  for (const ecouteur of ecouteurs) {
    try {
      ecouteur(echec)
    } catch {
      // Un abonné en panne ne change jamais l'issue de l'envoi.
    }
  }
}

const ecouteursReussite = new Set<() => void>()

/**
 * S'abonne aux envois réussis (la file des incidents part après toute écriture réussie, T76,
 * lot C) ; rend la fonction qui désabonne.
 */
export function surEnvoiReussi(ecouteur: () => void): () => void {
  ecouteursReussite.add(ecouteur)
  return () => {
    ecouteursReussite.delete(ecouteur)
  }
}

function signalerReussite(): void {
  for (const ecouteur of ecouteursReussite) {
    try {
      ecouteur()
    } catch {
      // Sans effet sur l'envoi.
    }
  }
}

/** Ce que rend un essai : la réponse de supabase-js, ou l'exception levée. */
type Essai<R> = { reponse: R; suivi: Suivi } | { exception: unknown; suivi: Suivi }

async function essayer<R>(cible: CibleEnvoi, appel: () => PromiseLike<R>): Promise<Essai<R>> {
  const suivi = annoncerEnvoi(cible)
  try {
    const reponse = await appel()
    if (typeof reponse === 'object' && reponse !== null && 'error' in reponse) {
      attacher(reponse.error, suivi)
    }
    return { reponse, suivi }
  } catch (exception) {
    attacher(exception, suivi)
    return { exception, suivi }
  } finally {
    oublierEnvoi(suivi)
  }
}

/** L'erreur d'un essai : l'exception, ou l'erreur de la réponse de supabase-js ; sinon null. */
function erreurDe<R>(essai: Essai<R>): unknown {
  if ('exception' in essai) return essai.exception
  const { reponse } = essai
  if (typeof reponse === 'object' && reponse !== null && 'error' in reponse) {
    return reponse.error ?? null
  }
  return null
}

function rendre<R>(essai: Essai<R>): R {
  if ('exception' in essai) throw essai.exception
  return essai.reponse
}

/**
 * Un échec rapide qu'un nouvel essai peut rattraper (Q1) : aucune réponse alors que le téléphone
 * était en ligne (souvent, sur Safari, une connexion réutilisée périmée), ou une réponse au corps
 * perdu sans statut 2xx. Jamais après notre délai de 10 s (l'attente doublerait), ni hors ligne au
 * départ (rien n'est parti), ni après un 2xx (la base a enregistré).
 */
export function aRattraper(suivi: Suivi): boolean {
  if (suivi.phase === 'sans_reponse') return suivi.enLigneAuDepart !== false
  if (suivi.phase === 'corps_perdu') {
    return suivi.statut === undefined || suivi.statut < 200 || suivi.statut >= 300
  }
  return false
}

export interface OptionsEnvoi {
  /**
   * Création à numéro anti-doublon (T76, lot B) : après un échec rapide (`aRattraper`), l'envoi
   * repart une fois, tout de suite, avec le même appel (donc le même numéro) et une nouvelle
   * référence. Le bouton reste « Enregistrement en cours ».
   */
  nouvelEssai?: boolean
}

/**
 * Lance l'écriture `appel` vers `cible` (`rpc/ajouter_evenement`, `table/mesure`,
 * `functions/creer-compte`). Rend sa réponse telle quelle ; l'erreur d'une réponse
 * (`{ data, error }` de supabase-js) ou une exception gardent leur identité et reçoivent le
 * suivi de l'envoi. Chaque échec est signalé aux abonnés (`surEchecEnvoi`).
 */
export async function envoyer<R>(
  cible: CibleEnvoi,
  appel: () => PromiseLike<R>,
  options: OptionsEnvoi = {},
): Promise<R> {
  const premier = await essayer(cible, appel)
  const erreur = erreurDe(premier)
  if (erreur === null) {
    signalerReussite()
    return rendre(premier)
  }
  if (!options.nouvelEssai || !aRattraper(premier.suivi)) {
    signaler({ erreur, suivi: premier.suivi, rattrape: false })
    return rendre(premier)
  }
  const second = await essayer(cible, appel)
  const erreurSeconde = erreurDe(second)
  signaler({ erreur, suivi: premier.suivi, rattrape: erreurSeconde === null })
  if (erreurSeconde === null) signalerReussite()
  else signaler({ erreur: erreurSeconde, suivi: second.suivi, rattrape: false })
  return rendre(second)
}

/**
 * Numéro anti-doublon, contrôlé avant l'appel (même règle que `p_cle uuid` de la base). Un
 * numéro invalide est un bogue du code : il prend le repli, rien ne part.
 */
export const schemaNumero = z.uuid()

/**
 * Numéro anti-doublon d'un envoi (T76, lot B) : un uuid tiré au premier envoi d'un formulaire et
 * renvoyé à chaque nouvel essai, automatique ou à la main. `crypto.randomUUID` manque sur un iOS
 * d'avant 15.4 : le repli tire les mêmes 122 bits aléatoires par `crypto.getRandomValues`.
 */
export function tirerNumero(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return numeroDepuisOctets(crypto.getRandomValues(new Uint8Array(16)))
}

/** Un uuid de version 4 écrit à partir de 16 octets aléatoires. */
export function numeroDepuisOctets(aleatoires: Uint8Array): string {
  const octets = Array.from(aleatoires)
  octets[6] = ((octets[6] ?? 0) & 0x0f) | 0x40
  octets[8] = ((octets[8] ?? 0) & 0x3f) | 0x80
  const hex = octets.map((octet) => octet.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}
