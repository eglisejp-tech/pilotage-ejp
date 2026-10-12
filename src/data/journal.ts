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

/**
 * Place dans le journal : la date et le numéro de la dernière ligne lue. La page suivante est celle
 * des lignes plus anciennes que celle-ci, quel que soit ce qui s'est ajouté entre-temps.
 */
export interface CurseurJournal {
  le: string
  id: number
}

/** Ce que demande l'écran : les filtres choisis, le début de la période et une page de lignes. */
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
  /** Dernière ligne déjà lue : la page rendue commence juste après elle. Null : la première page. */
  apres: CurseurJournal | null
  /** Nombre de lignes à rendre, au plus (bien en dessous du plafond de 1000 lignes de la base). */
  limite: number
}

export interface PageJournal {
  /** Du plus récent au plus ancien, `limite` lignes au plus. */
  lignes: LigneJournal[]
  /** Vrai s'il reste des lignes après celles-ci : « Afficher 50 lignes de plus ». */
  aPlus: boolean
  /** Où reprendre pour la page suivante ; null quand il ne reste rien. */
  suivant: CurseurJournal | null
  /** Les sessions citées par les lignes rendues. */
  sessions: SessionJournal[]
}

/** Identifiant sûr à écrire dans un filtre PostgREST : jamais de virgule ni de parenthèse. */
const IDENTIFIANT = /^[0-9A-Za-z_-]{1,64}$/

function identifiantSur(valeur: string, nom: string): string {
  if (!IDENTIFIANT.test(valeur)) throw new RangeError(`Identifiant invalide pour ${nom}`)
  return valeur
}

/** Instant ISO tel que la base le rend : chiffres, `T`, `:`, `.`, `+`, `-` et `Z`, rien d'autre. */
const INSTANT = /^\d{4}-\d{2}-\d{2}[T ][0-9:.]{5,20}(?:Z|[+-]\d{2}(?::?\d{2})?)?$/

/** Condition « plus ancienne que ce curseur » (date décroissante, puis numéro décroissant). */
function conditionApres(curseur: CurseurJournal): string {
  if (!INSTANT.test(curseur.le) || !Number.isSafeInteger(curseur.id)) {
    throw new RangeError('Curseur de journal invalide')
  }
  return `le.lt.${curseur.le},and(le.eq.${curseur.le},id.lt.${curseur.id})`
}

/**
 * Une page de lignes de journal, du plus récent au plus ancien, avec les filtres demandés. Elle lit
 * une ligne de plus que `limite` pour savoir s'il en reste, puis, en même temps, les sessions que
 * les lignes citent (leur nom n'est pas dans le journal). La page suivante reprend après le
 * curseur `suivant` : elle ne relit jamais les lignes déjà montrées, et la base ne rend jamais plus
 * de `limite + 1` lignes (son plafond de 1000 lignes par réponse ne coupe rien). Un échec de l'une
 * ou l'autre lecture remonte.
 */
export async function lireJournal(demande: DemandeJournal): Promise<PageJournal> {
  let requete = supabase().from('v_journal').select(COLONNES_JOURNAL)
  if (demande.compte !== null) {
    requete = requete.eq('compte', identifiantSur(demande.compte, 'compte'))
  }
  if (demande.action !== null) {
    requete = requete.eq('action', identifiantSur(demande.action, 'action'))
  }
  if (demande.depuis !== null) requete = requete.gte('le', demande.depuis)
  // Chaque « ou » est une liste de conditions ; deux « ou » se combinent par un « et » explicite,
  // écrit dans un seul paramètre : `or=(and(or(...),or(...)))`.
  const listesOu: string[] = []
  if (demande.ministere !== null) {
    const id = identifiantSur(demande.ministere, 'ministere')
    listesOu.push(`ministere_id.eq.${id},auteur_ministere_id.eq.${id}`)
  }
  if (demande.apres !== null) listesOu.push(conditionApres(demande.apres))
  if (listesOu.length === 1) requete = requete.or(listesOu[0] ?? '')
  if (listesOu.length === 2) {
    requete = requete.or(`and(${listesOu.map((liste) => `or(${liste})`).join(',')})`)
  }

  const lecture = await requete
    .order('le', { ascending: false })
    .order('id', { ascending: false })
    .limit(demande.limite + 1)
  if (lecture.error) throw lecture.error

  const aPlus = lecture.data.length > demande.limite
  const lignes = lecture.data.slice(0, demande.limite)
  const derniere = lignes.at(-1)
  const suivant = aPlus && derniere ? { le: derniere.le, id: derniere.id } : null
  const idsSessions = [
    ...new Set(
      lignes.flatMap((ligne) =>
        ligne.cible === 'session' && ligne.cible_id !== null ? [ligne.cible_id] : [],
      ),
    ),
  ]
  if (idsSessions.length === 0) return { lignes, aPlus, suivant, sessions: [] }

  const sessions = await supabase()
    .from('session')
    .select('id, type, date, intitule')
    .in('id', idsSessions)
  if (sessions.error) throw sessions.error
  return { lignes, aPlus, suivant, sessions: sessions.data }
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
