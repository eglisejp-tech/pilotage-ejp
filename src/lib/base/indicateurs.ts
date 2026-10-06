// Types des indicateurs (étape 4) : table `indicateur` et ses colonnes ajoutées, `indicateur_terme`,
// `demande_indicateur`, `validation`, les vues de lecture (B2, B3, B4) et les fonctions de
// configuration (B3), dans le format de `communs.ts`. Écrits à la main d'après
// `docs/conception/contrat-etape-4.md` (sections 4 à 7) : noms, colonnes et signatures y sont
// fixés, aucun type n'est deviné. Les chiffres FIJ par département (`v_fij_statistique`) sont dans
// `fij.ts`, les événements dans `evenements.ts`.
//
// Dates : `date` arrive en chaîne « 2026-09-27 », `timestamptz` en chaîne ISO. Les `bigint` et
// `numeric` arrivent en nombres. Une absence de saisie est toujours `null`, jamais 0 ; un « moins
// de 3 » (seuil des sensibles) se rend par `valeur` à `null` et `moins_de_3` à vrai.

import type { TableEnLecture, Vue } from './communs'

/**
 * Unité d'un indicateur (plan de l'étape 4, B1) : plafond de chaque unité dans
 * `src/lib/metier/unites.ts`. Pas d'unité « minutes » : l'heure se saisit de 0 à 1439.
 */
export type UniteIndicateur = 'nombre' | 'grand_nombre' | 'euros' | 'heure' | 'jours'

/** Rythme : chaque dimanche, chaque mois (le 1er du mois), ou « à ce jour » (un stock). */
export type NatureIndicateur = 'dimanche' | 'mois' | 'a_ce_jour'

export type EtatIndicateur = 'en_attente' | 'actif' | 'retire'

/** Un commun n'a pas de ministère ; `eglise` : créé par l'administration ou EJP Tech. */
export type OrigineIndicateur = 'commun' | 'eglise' | 'ministere'

/** Calcul déclaré ; seuls `taux` et `moyenne` se lisent avant le lot L1 (`v_calcul`). */
export type CalculIndicateur = 'taux' | 'moyenne' | 'difference' | 'somme' | 'evolution'

/** Motifs de retrait : choisis, posés par la base, ou réservés (contrat, section 4). */
export type MotifRetrait =
  | 'plus_suivi'
  | 'doublon'
  | 'erreur'
  | 'se_calcule'
  | 'deja_commun'
  | 'domaine_sensible'
  | 'hors_regles'
  | 'remplace'
  | 'confidentialite'
  | 'source_retiree'
  | 'refuse'

/** Motifs qu'un écran peut envoyer à `retirer_indicateur` (les autres sont posés par la base). */
export type MotifRetraitChoisi =
  | 'plus_suivi'
  | 'doublon'
  | 'erreur'
  | 'se_calcule'
  | 'deja_commun'
  | 'domaine_sensible'
  | 'hors_regles'

export type RoleTerme = 'haut' | 'bas' | 'plus' | 'moins' | 'terme'
export type ComptageTerme =
  'prevus' | 'realises' | 'annules' | 'reportes' | 'en_attente' | 'sans_etat_final'
export type AgregatTerme = 'periode' | 'somme_dimanches_du_mois' | 'fin_de_mois'

/** État de la valeur de la dernière période attendue (`v_indicateur_suivi.etat_valeur`). */
export type EtatValeur = 'saisi' | 'non_saisi' | 'jamais_saisi'

/** Pourquoi un calcul ne se calcule pas (`v_calcul.non_calcule_raison`). */
export type RaisonNonCalcule = 'source_non_saisie' | 'bas_nul'

export type ObjetDemande = 'ajout' | 'correction'
export type DecisionValidation = 'valide' | 'refuse'

/** Familles de `verifier_libelle` (lot 1). */
export type FamilleVerification =
  'donnees_personnelles' | 'crochets' | 'calcul' | 'cumul' | 'periode' | 'sensible' | 'doublon'

/** Types de calcul acceptés par `creer_calcul` (lot 1). */
export type TypeCalcul = 'taux' | 'moyenne'

/** Chiffres communs d'une fiche (`v_commun_fiche.commun_code`). */
export type CodeCommunFiche = 'service' | 'actifs' | 'en_fij'

export type TablesIndicateurs = {
  indicateur: TableEnLecture<{
    id: string
    /** « service », « actifs », « en_fij » ; null pour un indicateur propre. */
    code: string | null
    libelle: string
    nature: NatureIndicateur
    /** Null : indicateur commun. */
    ministere_id: string | null
    ordre: number
    /** Dérivé de `etat` : vrai si et seulement si `etat = 'actif'`. */
    actif: boolean
    /** 10 à 140 caractères. */
    definition: string
    unite: UniteIndicateur
    /** Mois et nombre seulement, jamais source d'un calcul. */
    sensible: boolean
    /** Null pour un indicateur saisi ; les termes sont dans `indicateur_terme`. */
    calcul: CalculIndicateur | null
    etat: EtatIndicateur
    origine: OrigineIndicateur
    /** Code de `private.indicateur_prevu`, sinon null. */
    modele_code: string | null
    /** Indicateur que celui-ci remplace (un seul remplaçant par indicateur). */
    remplace_id: string | null
    cree_le: string
    /** Null pour Système (migration). */
    cree_par: string | null
    /** `not null default now()` (B1). */
    texte_le: string
    texte_par: string | null
    retire_le: string | null
    retrait_motif: MotifRetrait | null
    /** Vrai : pas de somme de l'année (personnes différentes, pics, heures, jours). */
    sans_somme: boolean
    /** Vrai : le dimanche du jour se saisit dès le matin (heure de Paris). */
    saisi_dimanche_matin: boolean
    libelle_sessions: boolean
  }>
  /** Termes d'un calcul : écrits à sa création, figés, lus comme `indicateur`. */
  indicateur_terme: TableEnLecture<{
    calcul_id: string
    ordre: number
    role: RoleTerme
    /** Exactement un de `source_id` et `comptage`. */
    source_id: string | null
    comptage: ComptageTerme | null
    agregat: AgregatTerme
    /** De 0 à 3 mois. */
    decalage: number
  }>
  demande_indicateur: TableEnLecture<{
    id: string
    indicateur_id: string
    ministere_id: string
    objet: ObjetDemande
    libelle: string
    definition: string
    pourquoi: string | null
    saisi_le: string
    saisi_par: string
  }>
  validation: TableEnLecture<{
    id: string
    demande_id: string
    ministere_id: string
    decision: DecisionValidation
    motif: string | null
    saisi_le: string
    saisi_par: string
  }>
  /**
   * Catégories d'un indicateur sensible prévu (B8, changement du 6 octobre) : table de référence,
   * lue comme `indicateur`, écrite seulement par migration. Une catégorie retirée ne s'affiche plus
   * dans la grille de saisie et reste lisible dans les anciennes répartitions.
   */
  categorie_sensible: TableEnLecture<{
    /** Code de `private.indicateur_prevu` (un prévu sensible). */
    prevu_code: string
    /** 1 à 30 caractères, minuscules et `_`. */
    code: string
    /** 1 à 40 caractères. */
    libelle: string
    ordre: number
    /** Date de retrait, null : catégorie en vigueur. */
    retiree_le: string | null
  }>
}

export type VuesIndicateurs = {
  /** Saisie la plus récente de chaque indicateur et période (départage par `id`). */
  v_mesure_periode: Vue<{
    indicateur_id: string
    ministere_id: string
    nature: NatureIndicateur
    /** Le dimanche, le 1er du mois, ou la date d'un « à ce jour ». */
    periode: string
    /** Null si masquée : voir `moins_de_3`. */
    valeur: number | null
    moins_de_3: boolean
    saisi_le: string
  }>
  /** 10 dimanches ou 12 mois, du plus ancien au plus récent. */
  v_indicateur_serie: Vue<{
    indicateur_id: string
    ministere_id: string
    periode: string
    /** 1 pour la plus ancienne période. */
    rang: number
    /** Null : trou (ou masquée, avec `moins_de_3`). */
    valeur: number | null
    moins_de_3: boolean
    /** Faux : cercle vide (période incomplète). */
    complete: boolean
  }>
  v_indicateur_suivi: Vue<{
    indicateur_id: string
    /** Null pour un commun. */
    ministere_id: string | null
    libelle: string
    definition: string
    nature: NatureIndicateur
    unite: UniteIndicateur
    sensible: boolean
    etat: EtatIndicateur
    origine: OrigineIndicateur
    calcul: CalculIndicateur | null
    /** Null : pas encore de saisie. */
    derniere_periode: string | null
    derniere_valeur: number | null
    derniere_moins_de_3: boolean
    derniere_saisie_le: string | null
    /** Valeur du mois en cours, à part de la somme de l'année ; pour un sensible aussi (P45), null si masquée. */
    mois_en_cours_valeur: number | null
    /** Vrai : 1 ou 2 au mois en cours d'un sensible, masqué pour ce profil (« moins de 3 », pas une absence). */
    mois_en_cours_moins_de_3: boolean
    /** Null si `sans_somme`, « à ce jour », ajout à valider ou rien de saisi. */
    somme_annee: number | null
    /** Somme de l'année égale à 1 ou 2 d'un sensible. */
    somme_moins_de_3: boolean
    /** Départ de la somme (« Depuis juillet »). */
    somme_depuis: string | null
    /** Complétude : « 9 mois sur 9 ». */
    somme_nb_saisies: number | null
    somme_nb_attendues: number | null
    /** « À ce jour » saisi il y a plus de 30 jours. */
    plus_de_30_jours: boolean
    etat_valeur: EtatValeur
    /** Ajout à valider : jours depuis `cree_le` (heure de Paris), sinon null. */
    attente_jours: number | null
    retire_le: string | null
  }>
  /** Taux et moyennes de deux indicateurs saisis (V1). */
  v_calcul: Vue<{
    indicateur_id: string
    ministere_id: string
    calcul: 'taux' | 'moyenne'
    /** Dernière période finie. */
    periode: string
    haut: number | null
    bas: number | null
    /** Pour un taux, en pour cent (plafond 100 pour une part) ; null : non calculé. */
    resultat: number | null
    annee_haut: number | null
    annee_bas: number | null
    /** Jamais une moyenne de taux. */
    annee_resultat: number | null
    annee_nb_periodes: number | null
    annee_nb_attendues: number | null
    non_calcule_raison: RaisonNonCalcule | null
    /** La source qui manque. */
    non_calcule_source_id: string | null
  }>
  /** Jamais une valeur : administration et EJP Tech seulement. */
  v_usage_indicateurs: Vue<{
    indicateur_id: string
    ministere_id: string | null
    nb_periodes_saisies: number
    nb_periodes_attendues: number
    derniere_saisie_le: string | null
    jamais_saisi: boolean
    attente_jours: number | null
  }>
  /** Administration et EJP Tech. */
  v_catalogue: Vue<{
    code: string
    modele: string
    libelle: string
    definition: string
    nature: NatureIndicateur
    unite: UniteIndicateur
    sensible: boolean
    calcul: CalculIndicateur | null
    ordre: number
  }>
  /** Le ministère pour sa fiche, administration et EJP Tech. */
  v_suggestions: Vue<{
    ministere_id: string
    code: string
    libelle: string
    definition: string
    nature: NatureIndicateur
    unite: UniteIndicateur
  }>
  /** EJP Tech seul. */
  v_a_valider: Vue<{
    demande_id: string
    objet: ObjetDemande
    indicateur_id: string
    ministere_id: string
    ministere_nom: string
    libelle_actuel: string | null
    libelle_envoye: string
    definition: string
    nature: NatureIndicateur
    pourquoi: string | null
    saisi_le: string
    attente_jours: number
    /** Plus de 7 jours. */
    en_retard: boolean
    nb_valeurs: number
  }>
  /** Chiffres communs d'une fiche, avec le libellé de la demande du ministère (B4). */
  v_commun_fiche: Vue<{
    ministere_id: string
    commun_code: CodeCommunFiche
    /** Libellé de la demande, 60 caractères au plus. */
    libelle: string
    ordre: number
    /** Les deux lignes de référence de MDS (valeurs de `v_total_a_ce_jour` et `v_total_dimanche`). */
    reference_eglise: boolean
  }>
}

/** Ligne de `verifier_libelle` : une famille de contrôle, son message, et s'il bloque l'envoi. */
export type VerificationLibelle = {
  famille: FamilleVerification
  message: string
  bloquant: boolean
}

/** Ligne de `limites_indicateurs` : ajouts en attente et lignes de la fiche, avec leurs plafonds. */
export type LimitesIndicateurs = {
  ajouts: number
  ajouts_max: number
  lignes: number
  lignes_max: number
}

/**
 * Un élément de `p_lignes` de `saisir_chiffres_mois` (B8, contrat section 6) : 1 à 30 éléments, sans
 * doublon d'indicateur. `categories` et `precision` sont réservés aux indicateurs sensibles
 * (`categories` seulement s'ils en ont) ; la somme des catégories ne dépasse jamais `valeur`.
 */
export type LigneSaisieMois = {
  indicateur_id: string
  /** Entier de 0 au plafond de l'unité. */
  valeur: number
  /** Valeur par code de `categorie_sensible`. */
  categories?: Record<string, number>
  /** 10 à 280 caractères après `trim`. */
  precision?: string
}

export type FonctionsIndicateurs = {
  creer_indicateurs_prevus: {
    Args: { p_ministere_id: string; p_modele: string }
    /** Nombre d'indicateurs créés. */
    Returns: number
  }
  creer_indicateur: {
    Args: {
      p_ministere_id: string
      p_libelle: string
      p_definition: string
      p_nature: NatureIndicateur
      p_unite: UniteIndicateur
      p_sensible: boolean
      p_pas_sensible: boolean
      p_remplace_id: string | null
      p_pourquoi?: string | null
    }
    Returns: string
  }
  creer_calcul: {
    Args: {
      p_libelle: string
      p_definition: string
      p_type: TypeCalcul
      p_haut_id: string
      p_bas_id: string
      p_remplace_id: string | null
      /** P49 : part du calcul ; omise, celle du calcul remplacé (sinon faux). */
      p_part?: boolean | null
    }
    Returns: string
  }
  ajouter_suggestion: {
    Args: { p_ministere_id: string; p_code: string; p_pourquoi?: string | null }
    Returns: string
  }
  corriger_indicateur: {
    Args: { p_indicateur_id: string; p_libelle: string; p_definition: string }
    /** `corrige` (appliqué) ou `envoye` (en attente de validation). */
    Returns: 'corrige' | 'envoye'
  }
  retirer_indicateur: {
    Args: { p_indicateur_id: string; p_motif: MotifRetraitChoisi }
    /** Nombre de calculs retirés avec lui. */
    Returns: number
  }
  valider_indicateur: {
    Args: { p_demande_id: string; p_decision: DecisionValidation; p_motif?: string | null }
    Returns: undefined
  }
  verifier_libelle: {
    Args: { p_libelle: string; p_nature: NatureIndicateur; p_ministere_id: string }
    Returns: VerificationLibelle[]
  }
  limites_indicateurs: {
    Args: { p_ministere_id: string }
    Returns: LimitesIndicateurs[]
  }
  /** Tout le mois en un appel, tout ou rien (B8, changement du 6 octobre). */
  saisir_chiffres_mois: {
    /** `p_mois` : le 1er du mois, « 2026-09-01 ». */
    Args: { p_mois: string; p_lignes: LigneSaisieMois[] }
    /** Nombre de lignes de `mesure` écrites. */
    Returns: number
  }
}
