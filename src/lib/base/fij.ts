// Types des saisies du lot E4 (étape 4) : présences aux sessions, carte des FIJ et chiffres FIJ par
// département. `fij_statistique`, `v_fij_statistique` et `saisir_fij_statistiques` (lot B5) ;
// `session_attendu`, `participation` et `fij_departement` (étape 1), que le navigateur écrit ou
// lit pour la première fois à l'étape 4. Format de `communs.ts`. La carte des FIJ (`v_carte_fij`)
// et les vues des sessions (`v_session_completude`, `v_participation_courante`) restent dans
// `communs.ts`.

import type { Aucun, Departement, TableEnLecture, Vue } from './communs'

/** Code d'une rubrique de `private.fij_rubrique` (contrat de l'étape 4, section 4). */
export type RubriqueFij = 'culte_ejp' | 'reunion_fij' | 'evangelisation' | 'membres_mardi'

/**
 * Table en ajout seulement, écrite directement par le navigateur (une seule instruction `insert`
 * par envoi, BRIEF section 6, « Qui écrit quoi ») : `saisi_le` et `saisi_par` sont posés par la
 * base (`forcer_auteur`), jamais envoyés. Aucune mise à jour.
 */
type TableEnAjout<Ligne, Ajout> = {
  Row: Ligne
  Insert: Ajout
  Update: Aucun
  Relationships: []
}

/** Une valeur de l'envoi de `saisir_fij_statistiques` (32 au plus, sans doublon). */
export type ValeurFijStatistique = {
  rubrique: RubriqueFij
  departement: Departement
  valeur: number
}

export type TablesFij = {
  /** Ministères attendus d'une session (déclarés par l'administration de l'église). */
  session_attendu: TableEnLecture<{ session_id: string; ministere_id: string }>
  /** Présence d'un ministère à une session : la saisie la plus récente fait foi. */
  participation: TableEnAjout<
    {
      id: number
      session_id: string
      ministere_id: string
      /** Tous les STARs présents du ministère. */
      valeur: number
      /** Dont déjà comptés par leur ministère principal (D2), entre 0 et `valeur`. */
      deja_comptes: number
      saisi_le: string
      saisi_par: string
    },
    { session_id: string; ministere_id: string; valeur: number; deja_comptes: number }
  >
  /** Carte des FIJ : les 8 départements en un envoi, par le ministère `fij`. */
  fij_departement: TableEnAjout<
    {
      id: number
      ministere_id: string
      departement: Departement
      valeur: number
      saisi_le: string
      saisi_par: string
    },
    { ministere_id: string; departement: Departement; valeur: number }
  >
  /** Chiffres par département : l'ajout passe par `saisir_fij_statistiques` (aucun GRANT insert). */
  fij_statistique: TableEnLecture<{
    id: number
    ministere_id: string
    rubrique: RubriqueFij
    departement: Departement
    /** Dimanche de la semaine (du lundi au dimanche). */
    dimanche: string
    valeur: number
    saisi_le: string
    saisi_par: string
  }>
}

export type VuesFij = {
  /**
   * Une ligne par rubrique et par dimanche, sur les 10 dimanches jusqu'au dimanche de référence
   * (heure de Paris). Lue par le ministère `fij`, le berger, le conseil et EJP Tech ; aucune ligne
   * pour l'administration ni un autre ministère.
   */
  v_fij_statistique: Vue<{
    rubrique: RubriqueFij
    /** « Présents au culte EJP »... */
    rubrique_libelle: string
    rubrique_ordre: number
    dimanche: string
    /** Somme des départements saisis ; null si aucun (un trou, jamais 0). */
    total: number | null
    /** Complétude « 6 dép. sur 8 » (sur 8). */
    nb_departements: number
    /** Dernière saisie de chaque département saisi ; un département absent n'y est pas. */
    departements: Partial<Record<Departement, number>>
    derniere_saisie_le: string | null
  }>
}

export type FonctionsFij = {
  saisir_fij_statistiques: {
    Args: { p_dimanche: string; p_valeurs: ValeurFijStatistique[] }
    Returns: undefined
  }
}
