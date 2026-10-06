// Types des événements et des réunions (étape 4). Fichier rempli par les lots B6, E5 et E6 :
// `evenement`, `evenement_etat`, `evenement_mention`, `v_evenement` (jours, `a_confirmer`,
// `reporte_du`), `reunion` et leurs fonctions, dans le format de `communs.ts`.
//
// E5 (saisies) : les deux tables où le ministère ajoute directement une ligne (`evenement_etat`
// pour une mise à jour, `reunion`), la fonction `ajouter_evenement` (B6, avec ses mentions) et
// les lectures du formulaire. Sources : supabase/migrations/20260930163150_types_et_tables.sql,
// 20261007120000_evenements_mentions.sql et 20261007120500_evenements_alerte_report.sql.

import type { Aucun, TableEnLecture, Vue } from './communs'

/** Statut d'un événement (`public.statut_evenement`), liste fixe changée par migration seulement. */
export type StatutEvenement =
  'brouillon' | 'attente_validation' | 'valide' | 'preparation' | 'termine' | 'annule'

/**
 * Table où le ministère ajoute directement une ligne, sous RLS (BRIEF section 7, « Insertion
 * directe ») : jamais de mise à jour. `saisi_le` et `saisi_par` sont posés par la base
 * (`forcer_auteur`) et ne figurent pas dans l'ajout.
 */
type TableEnAjout<Ligne, Ajout> = {
  Row: Ligne
  Insert: Ajout
  Update: Aucun
  Relationships: []
}

export type TablesEvenements = {
  /** Identité de l'événement : écrite par `ajouter_evenement` seulement (aucun GRANT insert). */
  evenement: TableEnLecture<{
    id: string
    ministere_id: string
    titre: string
    saisi_le: string
    saisi_par: string
  }>
  /** États successifs : la ligne la plus récente fait foi (règle 14, T37). */
  evenement_etat: TableEnAjout<
    {
      id: number
      evenement_id: string
      date: string
      statut: StatutEvenement
      saisi_le: string
      saisi_par: string
    },
    { evenement_id: string; date: string; statut: StatutEvenement }
  >
  /** Mentions fixées à la création (T32), écrites par `ajouter_evenement` seulement. */
  evenement_mention: TableEnLecture<{ evenement_id: string; ministere_id: string }>
  /** Déclarations de la prochaine réunion : la plus récente fait foi (règle 15). */
  reunion: TableEnAjout<
    {
      id: string
      ministere_id: string
      date: string
      /** « 20:00:00 », ou null sans heure. */
      heure: string | null
      objet: string | null
      decision_attendue: string | null
      saisi_le: string
      saisi_par: string
    },
    {
      ministere_id: string
      date: string
      heure: string | null
      objet: string | null
      decision_attendue: string | null
    }
  >
}

export type VuesEvenements = {
  /** Dernier état de chaque événement lisible (porteur, mentionnés, berger, conseil, EJP Tech). */
  v_evenement: Vue<{
    id: string
    ministere_id: string
    titre: string
    date: string
    statut: StatutEvenement
    mis_a_jour_le: string
    /** Date moins `private.aujourdhui()` : négatif pour une date passée. */
    jours: number
    /** En attente de validation, date au plus aujourd'hui plus 3, ministère porteur actif (T31). */
    a_confirmer: boolean
    /** Date de l'état précédent si la date a changé au dernier état, sinon null (K10b). */
    reporte_du: string | null
  }>
  /** Déclaration la plus récente de chaque ministère, si sa date n'est pas passée. */
  v_prochaine_reunion: Vue<{
    id: string
    ministere_id: string
    date: string
    heure: string | null
    objet: string | null
    decision_attendue: string | null
  }>
}

export type FonctionsEvenements = {
  /**
   * Ajoute un événement du ministère connecté avec ses mentions (B6) : rend son identifiant. Refus
   * repris tels quels : « La date ne peut pas être passée. », « Ce ministère ne peut pas être
   * mentionné. ». La version à trois arguments de l'étape 3 délègue à celle-ci.
   */
  ajouter_evenement: {
    Args: {
      p_titre: string
      p_date: string
      p_statut: StatutEvenement
      p_mentions: string[]
    }
    Returns: string
  }
}
