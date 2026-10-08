// Lectures de l'écran 06 « Journal » (lot L5) : `v_journal` avec ses filtres, la liste des comptes
// du filtre « Compte » et les sessions citées par les lignes lues. Une fonction par requête. Tout
// passe par la RLS : un ministère ne lit que les lignes de son ministère et de son compte,
// l'administration de l'église sa liste fermée, EJP Tech tout (BRIEF, section 7). Aucune écriture :
// le journal s'écrit par la base seulement.

import type { LigneTable, LigneVue } from '@/lib/base'
import { supabase } from '@/lib/supabase'

/** Nombre de lignes montrées d'abord, et ajoutées par « Afficher 50 lignes de plus ». */
export const TAILLE_PAGE_JOURNAL = 50

const COLONNES_JOURNAL =
  'id, le, compte, ministere_id, auteur_ministere_id, action, cible, cible_id, detail, compte_libelle, ministere_nom, cible_texte'

/** Une ligne de journal lisible par le compte : les colonnes de `v_journal` que l'écran affiche. */
export type LigneJournal = Pick<
  LigneVue<'v_journal'>,
  | 'id'
  | 'le'
  | 'compte'
  | 'ministere_id'
  | 'auteur_ministere_id'
  | 'action'
  | 'cible'
  | 'cible_id'
  | 'detail'
  | 'compte_libelle'
  | 'ministere_nom'
  | 'cible_texte'
>

/** Session citée par une ligne (présence, déclaration, modification) : son type, sa date, son nom. */
export type SessionJournal = Pick<LigneTable<'session'>, 'id' | 'type' | 'date' | 'intitule'>

/** Compte du filtre « Compte » : son libellé (« Berger », « Conseil, compte 3 », un ministère). */
export type CompteJournal = Pick<LigneTable<'compte'>, 'user_id' | 'libelle' | 'desactive_le'>

/** Ce que demande l'écran : les filtres choisis, le début de la période et le nombre de lignes. */
export interface DemandeJournal {
  /** Compte auteur des lignes (`compte` de la ligne), ou null pour tous. */
  compte: string | null
  /** Code d'action, ou null pour toutes. */
  action: string | null
  /**
   * Ministère de l'adresse : les lignes qui le concernent (`ministere_id`) et celles qu'écrit un de
   * ses comptes (`auteur_ministere_id`), comme « Dernières saisies » de sa fiche. Null pour tous.
   */
  ministere: string | null
  /** Début de la période : instant ISO du premier jour de Paris. Null : depuis le début. */
  depuis: string | null
  /** Nombre de lignes à rendre, au plus. */
  limite: number
}

export interface PageJournal {
  /** Du plus récent au plus ancien, `limite` lignes au plus. */
  lignes: LigneJournal[]
  /** Vrai s'il reste des lignes après celles-ci : « Afficher 50 lignes de plus ». */
  aPlus: boolean
  /** Les sessions citées par les lignes rendues. */
  sessions: SessionJournal[]
}

/** Identifiant sûr à écrire dans un filtre PostgREST : jamais de virgule ni de parenthèse. */
const IDENTIFIANT = /^[0-9A-Za-z_-]{1,64}$/

function identifiantSur(valeur: string, nom: string): string {
  if (!IDENTIFIANT.test(valeur)) throw new RangeError(`Identifiant invalide pour ${nom}`)
  return valeur
}

/**
 * Les lignes de journal du plus récent au plus ancien, avec les filtres demandés. Elle lit une
 * ligne de plus que `limite` pour savoir s'il en reste, puis, en même temps, les sessions que les
 * lignes citent (leur nom n'est pas dans le journal). Un échec de l'une ou l'autre lecture remonte.
 */
export async function lireJournal(demande: DemandeJournal): Promise<PageJournal> {
  let requete = supabase().from('v_journal').select(COLONNES_JOURNAL)
  if (demande.compte !== null) {
    requete = requete.eq('compte', identifiantSur(demande.compte, 'compte'))
  }
  if (demande.action !== null) {
    requete = requete.eq('action', identifiantSur(demande.action, 'action'))
  }
  if (demande.ministere !== null) {
    const id = identifiantSur(demande.ministere, 'ministere')
    requete = requete.or(`ministere_id.eq.${id},auteur_ministere_id.eq.${id}`)
  }
  if (demande.depuis !== null) requete = requete.gte('le', demande.depuis)

  const lecture = await requete
    .order('le', { ascending: false })
    .order('id', { ascending: false })
    .range(0, demande.limite)
  if (lecture.error) throw lecture.error

  const aPlus = lecture.data.length > demande.limite
  const lignes = lecture.data.slice(0, demande.limite)
  const idsSessions = [
    ...new Set(
      lignes.flatMap((ligne) =>
        ligne.cible === 'session' && ligne.cible_id !== null ? [ligne.cible_id] : [],
      ),
    ),
  ]
  if (idsSessions.length === 0) return { lignes, aPlus, sessions: [] }

  const sessions = await supabase()
    .from('session')
    .select('id, type, date, intitule')
    .in('id', idsSessions)
  if (sessions.error) throw sessions.error
  return { lignes, aPlus, sessions: sessions.data }
}

/**
 * Les comptes du filtre « Compte » : tous ceux que la base laisse lire (désactivés compris, leurs
 * lignes restent au journal), par libellé. Le ministère n'a pas ce filtre et ne lit rien ici.
 */
export async function lireComptesJournal(): Promise<CompteJournal[]> {
  const { data, error } = await supabase()
    .from('compte')
    .select('user_id, libelle, desactive_le')
    .order('libelle', { ascending: true })
  if (error) throw error
  return data
}
