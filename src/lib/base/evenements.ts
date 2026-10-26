// Types des événements et des réunions (étape 4). Fichier rempli par les lots B6, E5 et E6 :
// `evenement`, `evenement_etat`, `evenement_mention`, `v_evenement` (jours, `a_confirmer`,
// `reporte_du`), `reunion` et leurs fonctions, dans le format de `communs.ts`.
//
// E5 (saisies) : les deux tables où le ministère ajoute directement une ligne (`evenement_etat`
// pour une mise à jour, `reunion`), la fonction `ajouter_evenement` (B6, avec ses mentions) et
// les lectures du formulaire. Sources : supabase/migrations/20260930163150_types_et_tables.sql,
// 20261007120000_evenements_mentions.sql et 20261007120500_evenements_alerte_report.sql ; heures
// et ponctualité (T68) : 20261023120000_evenements_heures.sql.

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
  /**
   * États successifs : la ligne la plus récente fait foi (règle 14, T37). Les deux heures (T68)
   * sont en minutes depuis minuit, heure de Paris (0 à 1439), comme l'unité « heure » d'une
   * mesure. Une heure absente de l'ajout reprend celle du dernier état (`controler_evenement_etat`) :
   * une heure enregistrée se corrige, elle ne s'efface pas. L'heure de début ne va qu'avec Terminé.
   */
  evenement_etat: TableEnAjout<
    {
      id: number
      evenement_id: string
      date: string
      statut: StatutEvenement
      saisi_le: string
      saisi_par: string
      heure_prevue: number | null
      heure_debut: number | null
    },
    {
      evenement_id: string
      date: string
      statut: StatutEvenement
      heure_prevue?: number | null
      heure_debut?: number | null
    }
  >
  /**
   * Lignes d'ajout des mentions (T32), écrites par `ajouter_evenement` et
   * `modifier_mentions_evenement` seulement. Une mention retirée garde sa ligne (T78) : la mention
   * en vigueur se lit dans `v_evenement_mention`. Une ligne d'avant T78 n'a ni date ni auteur.
   */
  evenement_mention: TableEnLecture<{
    id: string
    evenement_id: string
    ministere_id: string
    saisi_le: string | null
    saisi_par: string | null
  }>
  /** Retrait d'une mention (T78) : la ligne d'ajout qu'il annule. */
  evenement_mention_retrait: TableEnLecture<{
    id: string
    mention_id: string
    saisi_le: string
    saisi_par: string
  }>
  /**
   * Nom corrigé d'un événement (T78) : la ligne la plus récente fait foi ; `evenement.titre` garde
   * le nom de création. Seul `masquer_texte` réécrit un nom.
   */
  evenement_titre: TableEnLecture<{
    id: string
    evenement_id: string
    titre: string
    saisi_le: string
    saisi_par: string
  }>
  /** Retrait d'un événement créé par erreur (T78) : une ligne au plus, définitive. */
  evenement_retrait: TableEnLecture<{
    evenement_id: string
    saisi_le: string
    saisi_par: string
  }>
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
    /** Heure prévue du dernier état, en minutes depuis minuit (T68), ou null. */
    heure_prevue: number | null
    /** Heure de début du dernier état (Terminé seulement), en minutes depuis minuit, ou null. */
    heure_debut: number | null
    /**
     * Retard en minutes, calculé par la base (`private.retard_minutes`) pour un Terminé qui a ses
     * deux heures, sinon null. Négatif : en avance. Passage de minuit compris (23 h 30 puis 0 h 05
     * donnent 35).
     */
    retard: number | null
    /** Retard d'au plus 5 minutes (K22b, avance comprise) ; null quand `retard` l'est. */
    a_l_heure: boolean | null
    /** Nom en vigueur avant la dernière correction (T78), ou null sans correction. */
    titre_precedent: string | null
    /** Jour (heure de Paris) de la dernière correction du nom (T78), ou null. */
    titre_corrige_le: string | null
  }>
  /**
   * Mentions en vigueur des événements lisibles et non retirés (T78). `saisi_le` : la date de la
   * mention, ou celle de la création de son événement pour une mention d'avant T78.
   */
  v_evenement_mention: Vue<{ evenement_id: string; ministere_id: string; saisi_le: string }>
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
   * Ajoute un événement du ministère connecté avec ses mentions (B6) et son heure prévue (T68) :
   * rend son identifiant. Refus de la base (clés de `src/data/messagesBase.ts`) : « La date ne
   * peut pas être passée. », « Ce ministère ne peut pas être mentionné. », « L'heure prévue est
   * invalide. ». L'écran appelle toujours la version à cinq arguments, sans valeur par défaut :
   * celles à quatre et trois arguments délèguent avec une heure nulle.
   */
  ajouter_evenement: {
    Args: {
      p_titre: string
      p_date: string
      p_statut: StatutEvenement
      p_mentions: string[]
      p_heure_prevue: number | null
    }
    Returns: string
  }
  /**
   * Corrige le nom d'un événement du ministère connecté (T78) : une ligne de `evenement_titre`.
   * Même nom : rien n'est écrit. Refus : élément absent ou d'un autre ministère (42501),
   * « Cet événement a été retiré. », nom vide ou trop long.
   */
  corriger_titre_evenement: {
    Args: { p_evenement_id: string; p_titre: string }
    Returns: undefined
  }
  /**
   * Remplace les mentions d'un événement du ministère connecté par la liste donnée (T78) : la
   * base écrit la différence. Refus : « Les mentions de cet événement ne changent plus. » (date
   * passée), « Ce ministère ne peut pas être mentionné. », événement retiré.
   */
  modifier_mentions_evenement: {
    Args: { p_evenement_id: string; p_mentions: string[] }
    Returns: undefined
  }
  /**
   * Retire un événement créé par erreur (T78) : le porteur jusqu'à sa date comprise, EJP Tech à
   * tout moment. Définitif ; déjà retiré : rien n'est écrit. Refus : « Un événement passé se
   * retire par EJP Tech. ».
   */
  retirer_evenement: {
    Args: { p_evenement_id: string }
    Returns: undefined
  }
}
