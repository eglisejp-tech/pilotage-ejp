// Types de la base lus par le navigateur : tables et vues communes (étapes 1 à 3), types de base
// partagés par les cinq autres fichiers de `src/lib/base/` et énumérations. Écrits à la main tant
// que la génération (`npx supabase gen types typescript --local`) demande Docker, absent de ce
// poste : seulement ce que l'application lit déjà. Chaque lot de l'étape 4 ne remplit que son
// fichier (indicateurs.ts, fiche.ts, fij.ts, evenements.ts, signalements.ts) ; `src/lib/base.ts`
// les assemble en un seul type `Database`.
//
// Dates : `date` arrive en chaîne « 2026-09-27 » (jour de Paris), `timestamptz` en chaîne ISO,
// `time` en « 20:00:00 ». Les `count` et `sum` (bigint, numeric) arrivent en nombres.

export type TypeCompte = 'ministere' | 'berger' | 'conseil' | 'admin_eglise' | 'admin_plateforme'

export type TypeSession = 'batir' | 'anti_dispersion' | 'autre'
export type Priorite = 'normale' | 'haute' | 'urgente'
export type StatutPoint = 'a_traiter' | 'en_cours' | 'attente_decision' | 'traite'
export type Departement = '75' | '77' | '78' | '91' | '92' | '93' | '94' | '95'

export type Aucun = { [_ in never]: never }

/** Table lue seulement : les écritures passent par les fonctions de l'API (CLAUDE.md). */
export type TableEnLecture<Ligne> = {
  Row: Ligne
  Insert: Aucun
  Update: Aucun
  Relationships: []
}
export type Vue<Ligne> = { Row: Ligne; Relationships: [] }

export type TablesCommunes = {
  // Aucune écriture côté navigateur : les comptes passent par les Edge Functions.
  compte: TableEnLecture<{
    user_id: string
    type: TypeCompte
    ministere_id: string | null
    libelle: string
    cree_le: string
    desactive_le: string | null
  }>
  ministere: TableEnLecture<{
    id: string
    /** Code technique posé par migration (« fij », « coordination »), sinon null. */
    code: string | null
    nom: string
    description: string | null
    cree_le: string
    /** Null : actif. */
    desactive_le: string | null
  }>
  /**
   * Une ligne par ajout de mention (T54) : à la création du point, puis chaque ajout ultérieur. Un
   * ministère retiré puis ajouté de nouveau a deux lignes. La mention en vigueur se lit dans
   * `v_point_mention`, jamais dans cette table.
   */
  point_mention: TableEnLecture<{
    id: string
    point_id: string
    ministere_id: string
    saisi_le: string
    saisi_par: string
  }>
}

export type VuesCommunes = {
  v_semaine: Vue<{ aujourdhui: string; dimanche: string; lundi: string; numero: number }>
  v_total_dimanche: Vue<{
    indicateur_id: string
    dimanche: string
    /** Null si aucun ministère n'a saisi ce dimanche : trou dans la courbe. */
    total: number | null
    nb_saisis: number
    nb_attendus: number
  }>
  v_ecart_dimanche: Vue<{
    indicateur_id: string
    dimanche: string
    ecart: number
    nb_comparables: number
  }>
  v_total_a_ce_jour: Vue<{
    indicateur_id: string
    code: string
    total: number
    nb_saisis: number
    nb_actifs: number
    plus_ancienne: string
    nb_plus_de_30_jours: number
  }>
  /** Aucune ligne quand aucun ministère actif n'a les deux valeurs. */
  v_pourcentage_fij: Vue<{
    en_fij: number
    actifs: number
    nb_ministeres: number
    /** Null quand la somme des actifs est nulle : « Non calculé ». */
    pourcentage: number | null
  }>
  v_carte_fij: Vue<{ departement: Departement; valeur: number; saisi_le: string }>
  v_participation_courante: Vue<{
    session_id: string
    ministere_id: string
    valeur: number
    deja_comptes: number
    compte_dans_total: number
    saisi_le: string
  }>
  v_session_completude: Vue<{
    session_id: string
    type: TypeSession
    date: string
    /** Nom d'un autre rassemblement, null pour les autres types. */
    intitule: string | null
    a_eu_lieu: boolean
    nb_attendus: number
    nb_saisis: number
    total_saisi: number
    /** Sans double compte ; 0 quand personne n'a saisi (voir nb_saisis). */
    total: number
    /** Noms des ministères attendus qui n'ont pas saisi, par ordre alphabétique. */
    manquants: string[]
  }>
  v_ecart_session: Vue<{ session_id: string; ecart: number; nb_comparables: number }>
  v_tableau_ministeres: Vue<{
    ministere_id: string
    nom: string
    description: string | null
    derniere_saisie: string | null
    prochain_evenement_date: string | null
    prochain_evenement_titre: string | null
    /** Berger et conseil seulement, null pour les autres profils. */
    prochaine_reunion_date: string | null
    prochaine_reunion_heure: string | null
    point_ouvert_priorite: Priorite | null
  }>
  v_point: Vue<{
    id: string
    ministere_id: string
    titre: string
    description: string | null
    action_attendue: string | null
    priorite: Priorite
    echeance: string | null
    cree_le: string
    cree_par: string
    statut: StatutPoint
    statut_le: string
    traitement_id: string | null
    traite_le: string | null
    traite_par: string | null
    traite_commentaire: string | null
  }>
}

export type EnumsCommuns = {
  type_compte: TypeCompte
  type_session: TypeSession
  priorite: Priorite
  statut_point: StatutPoint
}
