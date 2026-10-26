// Types des incidents d'envoi (T76, lot C), dans le format de `communs.ts`. Source :
// supabase/migrations/20261026180530_incidents_envoi.sql. La table `private.incident` n'est lue
// par aucun rôle de l'API : `noter_incidents` l'écrit (tout compte actif en aal2), et
// `incidents_recents` la lit (EJP Tech seul, en aal2).

import type { TypeCompte } from './communs'

/** Ce qui a fait échouer l'envoi (le classement unique de `src/data/echecEnvoi.ts`). */
export type GenreIncident =
  | 'session'
  | 'sans_reponse'
  | 'reponse_perdue'
  | 'reponse_illisible'
  | 'delai'
  | 'refus_inconnu'
  | 'bogue'

export type IssueIncident = 'enregistre' | 'inconnue' | 'rien_enregistre'

export type NavigateurIncident = 'safari' | 'chrome' | 'firefox' | 'edge' | 'samsung' | 'autre'

export type SystemeIncident = 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'autre'

/**
 * Un incident tel que la file du téléphone l'envoie. Jamais un texte saisi, un message d'erreur,
 * une adresse, le compte ni l'adresse complète de la page : la base impose le profil et le
 * ministère, et ignore toute autre clé.
 */
export interface IncidentEnvoye {
  /** La référence de l'envoi, celle de `X-Client-Info` et de l'écran (6 caractères). */
  reference: string
  /** Heure du téléphone (ISO 8601) ; la base la borne. */
  survenu_le: string
  /** Modèle d'adresse de l'écran (`/saisir/evenement`, `/ministeres/:id`), ou `autre`. */
  ecran: string
  /** L'écriture (`ajouter_evenement`, `mesure`, `creer-compte`), ou `autre`. */
  operation: string
  genre: GenreIncident
  issue: IssueIncident
  /** Vrai si le nouvel essai automatique qui a suivi a réussi. */
  rattrape: boolean
  statut_http: number | null
  /** SQLSTATE, code PostgREST ou code d'Edge Function ; jamais le message. */
  code: string | null
  nom_erreur: string | null
  duree_ms: number | null
  en_ligne: boolean | null
  visible: boolean | null
  /** Version du site : sha court ou `local`. */
  version: string
  navigateur: NavigateurIncident | null
  version_navigateur: number | null
  systeme: SystemeIncident | null
}

/** Un incident lu par EJP Tech (`incidents_recents`), du plus récent au plus ancien. */
export interface LigneIncident extends Omit<IncidentEnvoye, 'genre' | 'issue'> {
  genre: GenreIncident
  issue: IssueIncident
  recu_le: string
  profil: TypeCompte
  ministere_id: string | null
  /** Null hors ministère, ou pour un ministère supprimé depuis. */
  ministere_nom: string | null
  /** Nombre d'incidents gardés (90 jours), le même sur chaque ligne. */
  total: number
}

export type FonctionsIncidents = {
  /** Tout compte actif en aal2 : rend le nombre d'incidents gardés (20 par appel au plus). */
  noter_incidents: {
    Args: { p_incidents: IncidentEnvoye[] }
    Returns: number
  }
  /** EJP Tech seul, en aal2 : 50 incidents, avant `p_avant` pour la suite. */
  incidents_recents: {
    Args: { p_avant?: string }
    Returns: LigneIncident[]
  }
}
