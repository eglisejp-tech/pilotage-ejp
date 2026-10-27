// Incidents d'envoi (T76, lot C ; conception erreurs-envoi, section 6). Un échec d'envoi vu par
// `envoyer` (src/data/envoi.ts) devient un incident : ce que le classement unique en dit, les faits
// du transport, l'écran (son modèle d'adresse), la version du site et la famille du navigateur.
// Jamais un texte saisi, un message d'erreur, une adresse, le compte, ni l'adresse complète de la
// page. `noter_incidents` ne passe pas par `envoyer` : pas de référence, jamais d'incident sur
// lui-même.

import { matchPath } from 'react-router'
import { classer } from '@/data/echecEnvoi'
import type { EchecVu } from '@/data/envoi'
import { estCodeIncident, schemaIncident } from '@/lib/fileIncidents'
import type { IncidentEnvoye, LigneIncident, NavigateurIncident, SystemeIncident } from '@/lib/base'
import { supabase } from '@/lib/supabase'
import { VERSION_SITE } from '@/lib/transport'

/**
 * Modèles d'adresse que la base garde (`private.ecrans_incident()`, même liste) ; toute autre
 * adresse arrive en « autre ». Un test compare les deux listes et vérifie que chaque adresse de
 * l'application y est.
 */
export const ECRANS_INCIDENT = [
  '/',
  '/ma-fiche',
  '/ma-fiche/indicateurs',
  '/ministeres',
  '/ministeres/:id',
  '/saisir/dimanche',
  '/saisir/mois',
  '/saisir/session/:id',
  '/saisir/fij',
  '/saisir/fij-statistiques',
  '/saisir/evenement',
  '/saisir/evenement/:id',
  '/saisir/reunion',
  '/saisir/point',
  '/signaler',
  '/signalements',
  '/points',
  '/journal',
  '/journal-technique',
  '/comptes',
  '/sessions',
  '/indicateurs',
  '/indicateurs/:id',
  '/moderation',
  '/personnes',
  '/conditions-a-accepter',
  '/qui-utilise',
  'autre',
] as const

/** Écritures que la base garde (`private.operations_incident()`, même liste), sinon « autre ». */
export const OPERATIONS_INCIDENT = [
  'accepter_conditions',
  'ajouter_evenement',
  'ajouter_suggestion',
  'changer_statut_point',
  'choisir_modele_prevus',
  'clore_signalement',
  'corriger_indicateur',
  'creer_calcul',
  'creer_indicateur',
  'creer_indicateurs_prevus',
  'creer_point',
  'declarer_intervenant',
  'declarer_session',
  'effacer_prenom',
  'effacer_prenoms_anciens',
  'marquer_relu',
  'marquer_traite',
  'masquer_texte',
  'modifier_mentions_point',
  'modifier_session',
  'retirer_indicateur',
  'retirer_mon_indicateur',
  'saisir_chiffres_mois',
  'saisir_fij_statistiques',
  'signaler_difficulte',
  'supprimer_session',
  'valider_indicateur',
  'prendre_en_charge_signalement',
  'repondre_au_ministere',
  'confirmer_signalement',
  'repondre_a_ejp_tech',
  // Corrections d'un événement (T78, lot 1 ; 20261027091106_retrait_apres_etat_final.sql).
  'corriger_titre_evenement',
  'modifier_mentions_evenement',
  'retirer_evenement',
  // Plages des événements (T78, lot 2 ; 20261027141108_evenements_plages.sql).
  'ajouter_evenements_serie',
  'corriger_titre_serie',
  'modifier_mentions_serie',
  'retirer_serie',
  'evenement_etat',
  'fij_departement',
  'mesure',
  'participation',
  'passage',
  'reunion',
  'creer-compte',
  'relancer-invitation',
  'desactiver-compte',
  'reactiver-compte',
  'reinitialiser-2fa',
  'corriger-adresse',
  'supprimer-ministere',
  'autre',
] as const

/** Noms d'erreur gardés (liste de la table) ; tout autre nom arrive en « autre ». */
const NOMS_ERREUR = new Set([
  'TypeError',
  'AbortError',
  'TimeoutError',
  'SyntaxError',
  'ZodError',
  'ReponsePerdue',
  'FunctionsFetchError',
  'FunctionsRelayError',
  'FunctionsHttpError',
  'Error',
])

/** Le modèle d'adresse d'une page (« /ministeres/:id »), jamais l'adresse elle-même. */
export function ecranDe(chemin: string): string {
  const trouve = ECRANS_INCIDENT.find(
    (modele) => modele !== 'autre' && matchPath({ path: modele, end: true }, chemin) !== null,
  )
  return trouve ?? 'autre'
}

/** L'écriture d'une cible d'envoi (`rpc/mesure` donne `mesure`), sinon « autre ». */
export function operationDe(cible: string): string {
  const nom = cible.slice(cible.indexOf('/') + 1)
  return (OPERATIONS_INCIDENT as readonly string[]).includes(nom) ? nom : 'autre'
}

export interface Navigateur {
  navigateur: NavigateurIncident | null
  version_navigateur: number | null
  systeme: SystemeIncident | null
}

/**
 * Famille du navigateur, version majeure et système (Proposé, Q10), lus dans l'user agent, qui
 * n'est jamais gardé lui-même. Sur iPhone, tout navigateur est un Safari : la version est celle
 * d'iOS.
 */
export function navigateurDe(userAgent: string): Navigateur {
  const systeme: SystemeIncident = /iPhone|iPad|iPod/.test(userAgent)
    ? 'ios'
    : /Android/.test(userAgent)
      ? 'android'
      : /Windows/.test(userAgent)
        ? 'windows'
        : /Mac OS X|Macintosh/.test(userAgent)
          ? 'macos'
          : /Linux/.test(userAgent)
            ? 'linux'
            : 'autre'
  const familles: [NavigateurIncident, RegExp][] = [
    ['samsung', /SamsungBrowser\/(\d+)/],
    ['edge', /Edg(?:e|A|iOS)?\/(\d+)/],
    ['firefox', /(?:Firefox|FxiOS)\/(\d+)/],
    ['chrome', /(?:Chrome|CriOS)\/(\d+)/],
    ['safari', /Version\/(\d+).*Safari\//],
  ]
  for (const [navigateur, motif] of familles) {
    const trouve = motif.exec(userAgent)
    if (trouve) {
      const version = Number(trouve[1])
      return {
        navigateur,
        version_navigateur: version >= 1 && version <= 999 ? version : null,
        systeme,
      }
    }
  }
  return { navigateur: userAgent === '' ? null : 'autre', version_navigateur: null, systeme }
}

/** Ce qu'il faut savoir de la page au moment de l'échec. */
export interface ContexteIncident {
  /** Adresse de la page (`location.pathname`) : seul son modèle est gardé. */
  chemin: string
  userAgent: string
  /** La page était visible (pas en arrière-plan). */
  visible: boolean | null
  /** Heure du téléphone. */
  maintenant: Date
}

/** Les genres que la base ou un contrôle ont dits : ce ne sont pas des incidents. */
const GENRES_SANS_INCIDENT = new Set(['refus', 'acces', 'desactive'])

/** Le code d'une erreur de la base ou d'une Edge Function, s'il a la forme d'un code. */
function codeDe(erreur: unknown): string | null {
  if (typeof erreur !== 'object' || erreur === null) return null
  const code = (erreur as { code?: unknown }).code
  return typeof code === 'string' && estCodeIncident(code) ? code : null
}

/**
 * L'incident d'un échec d'envoi, ou null : un refus que la base ou un contrôle a dit (refus,
 * accès, compte désactivé) n'en est pas un. Une connexion expirée en est un (elle part après la
 * reconnexion).
 */
export function incidentDepuisEchec(
  echec: EchecVu,
  contexte: ContexteIncident,
): IncidentEnvoye | null {
  const { genre, issue, statut } = classer(echec.erreur)
  if (GENRES_SANS_INCIDENT.has(genre)) return null
  const { suivi } = echec
  const nom = suivi.nomErreur
  const incident: IncidentEnvoye = {
    reference: suivi.reference,
    survenu_le: contexte.maintenant.toISOString(),
    ecran: ecranDe(contexte.chemin),
    operation: operationDe(suivi.cible),
    genre: genre === 'refus' || genre === 'acces' || genre === 'desactive' ? 'bogue' : genre,
    issue,
    rattrape: echec.rattrape,
    statut_http: statut !== null && statut >= 100 && statut <= 599 ? statut : null,
    code: codeDe(echec.erreur),
    nom_erreur: nom === undefined ? null : NOMS_ERREUR.has(nom) ? nom : 'autre',
    duree_ms:
      suivi.duree === undefined ? null : Math.min(Math.max(Math.round(suivi.duree), 0), 120_000),
    en_ligne: suivi.enLigneAuDepart ?? null,
    visible: contexte.visible,
    version: VERSION_SITE,
    ...navigateurDe(contexte.userAgent),
  }
  const lu = schemaIncident.safeParse(incident)
  return lu.success ? lu.data : null
}

/**
 * Envoie un lot d'incidents (`noter_incidents`, tout compte actif en aal2) : rend le nombre
 * d'incidents gardés. Ne passe pas par `envoyer` (src/data/envoi.test.ts le sait).
 */
export async function noterIncidents(lot: IncidentEnvoye[]): Promise<number> {
  const incidents = lot.map((incident) => schemaIncident.parse(incident))
  const { data, error } = await supabase().rpc('noter_incidents', { p_incidents: incidents })
  if (error) throw error
  return data
}

/**
 * Les 50 incidents les plus récents (EJP Tech seul, en aal2), ou les 50 suivants avant `avant`
 * (heure de réception du plus ancien déjà lu).
 */
export async function lireIncidentsRecents(avant?: string): Promise<LigneIncident[]> {
  const { data, error } = await supabase().rpc(
    'incidents_recents',
    avant === undefined ? {} : { p_avant: avant },
  )
  if (error) throw error
  return data ?? []
}
