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
    /** Série (T78, lot 2) : posée à la création par `ajouter_evenements_serie`, sinon null. */
    serie_id: string | null
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
      /**
       * Dernier jour d'un événement sur plusieurs jours (T78, lot 2), du lendemain du premier à
       * 30 jours après ; null pour un seul jour. Absent de l'ajout : la base reprend la durée du
       * dernier état ; égal à `date` : l'événement revient à un seul jour.
       */
      date_fin: string | null
      /** Heure de fin facultative (T78, lot 2), en minutes ; absente, la base reprend la dernière. */
      heure_fin: number | null
    },
    {
      evenement_id: string
      date: string
      statut: StatutEvenement
      heure_prevue?: number | null
      heure_debut?: number | null
      date_fin?: string | null
      heure_fin?: number | null
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
    /** Dernier jour d'un événement sur plusieurs jours (T78, lot 2), ou null pour un seul jour. */
    date_fin: string | null
    /** Heure de fin du dernier état (T78, lot 2), en minutes depuis minuit, ou null. */
    heure_fin: number | null
    /**
     * Dernier jour (ou le seul) moins `private.aujourdhui()` : les lectures qui dépendent de la
     * fin d'un événement (calendrier, « Vos saisies », mentions, retrait) le lisent ; `jours`
     * garde le premier jour (T78, lot 2).
     */
    jours_fin: number
    /** Série de l'événement (T78, lot 2), ou null. */
    serie_id: string | null
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
   * invalide. », « Le dernier jour doit suivre le premier. », « Un événement dure 31 jours au
   * plus. [...] », « L'heure de fin est invalide. ». L'écran appelle toujours la version à huit
   * arguments (T78, lot 2 : dernier jour et heure de fin, null pour un seul jour ou sans heure),
   * avec le numéro anti-doublon tiré au premier envoi (T76), obligatoire et sans valeur par
   * défaut : même numéro et même contenu, la base rend le même identifiant sans rien écrire ; même
   * numéro et autre contenu, « Cet envoi est déjà enregistré avec d'autres valeurs. ». Les
   * versions à six, cinq, quatre et trois arguments (ancien site) délèguent.
   */
  ajouter_evenement: {
    Args:
      | {
          p_titre: string
          p_date: string
          p_date_fin: string | null
          p_statut: StatutEvenement
          p_mentions: string[]
          p_heure_prevue: number | null
          p_heure_fin: number | null
          /** Numéro anti-doublon (uuid), le même à chaque nouvel essai du même envoi. */
          p_cle: string
        }
      /** Version à six arguments (T76), gardée pour l'ancien site : elle délègue sans fin. */
      | {
          p_titre: string
          p_date: string
          p_statut: StatutEvenement
          p_mentions: string[]
          p_heure_prevue: number | null
          p_cle: string
        }
    Returns: string
  }
  /**
   * Ajoute une série (T78, lot 2) : un événement ordinaire par date, en une fois, liés par la
   * série dont l'identifiant est rendu. 2 à 31 dates, aucune passée, 12 mois au plus ; mêmes
   * contrôles et même numéro anti-doublon que `ajouter_evenement`.
   */
  ajouter_evenements_serie: {
    Args: {
      p_titre: string
      p_dates: string[]
      p_statut: StatutEvenement
      p_mentions: string[]
      p_heure_prevue: number | null
      p_heure_fin: number | null
      p_cle: string
    }
    Returns: string
  }
  /** « Toute la série » (T78, lot 2) : le nom de toutes les dates non retirées, porteur seul. */
  corriger_titre_serie: {
    Args: { p_serie_id: string; p_titre: string }
    Returns: undefined
  }
  /** « Toute la série » : les mentions des dates à venir (dernier jour compris), porteur seul. */
  modifier_mentions_serie: {
    Args: { p_serie_id: string; p_mentions: string[] }
    Returns: undefined
  }
  /**
   * « Toute la série » : le porteur retire les dates à venir sans état final ; EJP Tech, toutes.
   */
  retirer_serie: {
    Args: { p_serie_id: string }
    Returns: undefined
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
