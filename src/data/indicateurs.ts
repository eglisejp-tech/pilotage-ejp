// Lectures des indicateurs de l'étape 4 : une fonction typée par requête. Les vues de la base font
// les sommes, les taux, la complétude et le seuil « moins de 3 » ; rien n'est recompté ici
// (BRIEF règles 3, 4 et 13). Les noms et les colonnes sont ceux de
// `docs/conception/contrat-etape-4.md`. Les lignes d'une période ne sont jamais triées ici : le
// rangement par rythme est un choix d'affichage (`src/lib/metier/indicateurs.ts`).

import type { LigneTable, LigneVue, NatureIndicateur } from '@/lib/base'
import type { LimitesIndicateurs, VerificationLibelle } from '@/lib/base'
import { supabase } from '@/lib/supabase'

/** Définition d'un indicateur : ce que lit un formulaire de saisie (libellé, unité, drapeaux). */
export type DefinitionIndicateur = Pick<
  LigneTable<'indicateur'>,
  | 'id'
  | 'code'
  | 'libelle'
  | 'definition'
  | 'nature'
  | 'unite'
  | 'sensible'
  | 'calcul'
  | 'etat'
  | 'origine'
  | 'ministere_id'
  | 'ordre'
  | 'sans_somme'
  | 'saisi_dimanche_matin'
  | 'libelle_sessions'
  | 'remplace_id'
  | 'cree_le'
  | 'retire_le'
  | 'retrait_motif'
>

const COLONNES_DEFINITION =
  'id, code, libelle, definition, nature, unite, sensible, calcul, etat, origine, ministere_id, ordre, sans_somme, saisi_dimanche_matin, libelle_sessions, remplace_id, cree_le, retire_le, retrait_motif'

/**
 * Indicateurs propres d'un ministère, tous états (actif, à valider, retiré), calculs compris. Les
 * communs (`ministere_id` nul) n'y sont pas : `lireDefinitionsCommuns` les lit. La base filtre déjà
 * les lignes d'un ministère ; le filtre nomme la fiche voulue. Le motif d'un refus
 * (`validation.motif`) n'est pas lu ici : E2 ajoute sa lecture typée.
 */
export async function lireIndicateursDuMinistere(
  ministereId: string,
): Promise<DefinitionIndicateur[]> {
  const { data, error } = await supabase()
    .from('indicateur')
    .select(COLONNES_DEFINITION)
    .eq('ministere_id', ministereId)
  if (error) throw error
  return data
}

/**
 * Définitions des trois chiffres communs (service, actifs, en FIJ) : libellé, définition et unité
 * que le formulaire du dimanche (E3) écrit sous chaque champ. Les communs n'ont pas de ministère.
 */
export async function lireDefinitionsCommuns(): Promise<DefinitionIndicateur[]> {
  const { data, error } = await supabase()
    .from('indicateur')
    .select(COLONNES_DEFINITION)
    .is('ministere_id', null)
  if (error) throw error
  return data
}

/**
 * Catégories des indicateurs sensibles prévus (B8) : la grille de répartition du formulaire du mois
 * (E3). Une catégorie retirée (`retiree_le` renseigné) reste lue, pour les anciennes répartitions :
 * l'écran de saisie ne propose que celles qui n'ont pas de date de retrait.
 */
export async function lireCategoriesSensibles(): Promise<LigneTable<'categorie_sensible'>[]> {
  const { data, error } = await supabase()
    .from('categorie_sensible')
    .select('prevu_code, code, libelle, ordre, retiree_le')
    .order('prevu_code', { ascending: true })
    .order('ordre', { ascending: true })
  if (error) throw error
  return data
}

/** Termes des calculs donnés (haut, bas, source ou comptage), dans l'ordre de chaque calcul. */
export async function lireTermes(
  calculIds: readonly string[],
): Promise<LigneTable<'indicateur_terme'>[]> {
  if (calculIds.length === 0) return []
  const { data, error } = await supabase()
    .from('indicateur_terme')
    .select('calcul_id, ordre, role, source_id, comptage, agregat, decalage')
    .in('calcul_id', [...calculIds])
    .order('calcul_id', { ascending: true })
    .order('ordre', { ascending: true })
  if (error) throw error
  return data
}

/**
 * Suivi des indicateurs : dernière valeur, somme de l'année et sa complétude, état de la dernière
 * période, attente de validation. Un ministère donné, ou toutes les lignes lisibles par le profil
 * (berger, conseil, administration, EJP Tech) quand `ministereId` manque.
 */
export async function lireSuiviIndicateurs(
  ministereId?: string,
): Promise<LigneVue<'v_indicateur_suivi'>[]> {
  const requete = supabase()
    .from('v_indicateur_suivi')
    .select(
      'indicateur_id, ministere_id, libelle, definition, nature, unite, sensible, etat, origine, calcul, derniere_periode, derniere_valeur, derniere_moins_de_3, derniere_saisie_le, mois_en_cours_valeur, mois_en_cours_moins_de_3, somme_annee, somme_moins_de_3, somme_depuis, somme_nb_saisies, somme_nb_attendues, plus_de_30_jours, etat_valeur, attente_jours, retire_le',
    )
  const { data, error } = await (ministereId === undefined
    ? requete
    : requete.eq('ministere_id', ministereId))
  if (error) throw error
  return data
}

/** Calculs (taux et moyennes) d'un ministère : résultat, sommes de l'année, raison du « Non calculé ». */
export async function lireCalculs(ministereId: string): Promise<LigneVue<'v_calcul'>[]> {
  const { data, error } = await supabase()
    .from('v_calcul')
    .select(
      'indicateur_id, ministere_id, calcul, periode, haut, bas, resultat, annee_haut, annee_bas, annee_resultat, annee_nb_periodes, annee_nb_attendues, non_calcule_raison, non_calcule_source_id',
    )
    .eq('ministere_id', ministereId)
  if (error) throw error
  return data
}

/**
 * Petite courbe : 10 dimanches ou 12 mois de chaque indicateur donné, du plus ancien au plus
 * récent. Un trou reste `null` (jamais 0).
 */
export async function lireSeries(
  indicateurIds: readonly string[],
): Promise<LigneVue<'v_indicateur_serie'>[]> {
  if (indicateurIds.length === 0) return []
  const { data, error } = await supabase()
    .from('v_indicateur_serie')
    .select('indicateur_id, ministere_id, periode, rang, valeur, moins_de_3, complete')
    .in('indicateur_id', [...indicateurIds])
    .order('indicateur_id', { ascending: true })
    .order('rang', { ascending: true })
  if (error) throw error
  return data
}

/**
 * Valeurs en vigueur d'un ministère pour un rythme (« Déjà saisi : ... » des formulaires, mois
 * proposés). `periode` : une seule période (le dimanche ou le 1er du mois) ; sinon toutes.
 */
export async function lireMesuresPeriode(
  ministereId: string,
  nature: NatureIndicateur,
  periode?: string,
): Promise<LigneVue<'v_mesure_periode'>[]> {
  const requete = supabase()
    .from('v_mesure_periode')
    .select('indicateur_id, ministere_id, nature, periode, valeur, moins_de_3, saisi_le')
    .eq('ministere_id', ministereId)
    .eq('nature', nature)
  const { data, error } = await (periode === undefined ? requete : requete.eq('periode', periode))
  if (error) throw error
  return data
}

/** Chiffres communs de la fiche, avec le libellé de la demande du ministère (60 caractères au plus). */
export async function lireCommunsFiche(ministereId: string): Promise<LigneVue<'v_commun_fiche'>[]> {
  const { data, error } = await supabase()
    .from('v_commun_fiche')
    .select('ministere_id, commun_code, libelle, ordre, reference_eglise')
    .eq('ministere_id', ministereId)
    .order('ordre', { ascending: true })
  if (error) throw error
  return data
}

/** Suggestions d'indicateurs offertes à la fiche d'un ministère. */
export async function lireSuggestions(ministereId: string): Promise<LigneVue<'v_suggestions'>[]> {
  const { data, error } = await supabase()
    .from('v_suggestions')
    .select('ministere_id, code, libelle, definition, nature, unite')
    .eq('ministere_id', ministereId)
  if (error) throw error
  return data
}

/** Catalogue des indicateurs prévus (administration et EJP Tech). */
export async function lireCatalogue(): Promise<LigneVue<'v_catalogue'>[]> {
  const { data, error } = await supabase()
    .from('v_catalogue')
    .select('code, modele, libelle, definition, nature, unite, sensible, calcul, ordre')
    .order('ordre', { ascending: true })
  if (error) throw error
  return data
}

/** Usage des indicateurs, jamais une valeur (administration et EJP Tech). */
export async function lireUsageIndicateurs(): Promise<LigneVue<'v_usage_indicateurs'>[]> {
  const { data, error } = await supabase()
    .from('v_usage_indicateurs')
    .select(
      'indicateur_id, ministere_id, nb_periodes_saisies, nb_periodes_attendues, derniere_saisie_le, jamais_saisi, attente_jours',
    )
  if (error) throw error
  return data
}

/** Demandes d'ajout qui attendent la validation d'EJP Tech (lecture réservée à EJP Tech). */
export async function lireAValider(): Promise<LigneVue<'v_a_valider'>[]> {
  const { data, error } = await supabase()
    .from('v_a_valider')
    .select(
      'demande_id, objet, indicateur_id, ministere_id, ministere_nom, libelle_actuel, libelle_envoye, definition, nature, pourquoi, saisi_le, attente_jours, en_retard, nb_valeurs',
    )
    .order('saisi_le', { ascending: true })
  if (error) throw error
  return data
}

/**
 * Limites d'une fiche : ajouts en attente (3 au plus) et lignes (30 au plus). `null` : la base ne
 * rend aucune ligne.
 */
export async function lireLimitesIndicateurs(
  ministereId: string,
): Promise<LimitesIndicateurs | null> {
  const { data, error } = await supabase().rpc('limites_indicateurs', {
    p_ministere_id: ministereId,
  })
  if (error) throw error
  return data[0] ?? null
}

/**
 * Contrôles d'un libellé avant l'envoi : données personnelles, doublon, période, calcul... Une
 * ligne par famille touchée ; une ligne `bloquant` empêche l'envoi.
 */
export async function verifierLibelle(
  libelle: string,
  nature: NatureIndicateur,
  ministereId: string,
): Promise<VerificationLibelle[]> {
  const { data, error } = await supabase().rpc('verifier_libelle', {
    p_libelle: libelle,
    p_nature: nature,
    p_ministere_id: ministereId,
  })
  if (error) throw error
  return data
}
