// Saisies des chiffres (lot E3) : une fonction typée par requête. La saisie du dimanche écrit dans
// `mesure` en une seule instruction ; « Chiffres du mois » passe par un seul appel de
// `saisir_chiffres_mois` (B8), tout ou rien, avec les précisions et les répartitions des sensibles.
// La base pose `saisi_le` et `saisi_par`, écrit une ligne de journal par envoi, contrôle le plafond
// de l'unité et les dates (heure de Paris) : rien n'est daté par le navigateur.
//
// Les valeurs qui font foi (« Déjà saisi ») se lisent dans `v_mesure_periode`
// (`lireMesuresPeriode`, `src/data/indicateurs.ts`). Pour reprendre la précision et la répartition
// du total le plus récent d'un sensible, le ministère lit ses lignes brutes (`mesure`,
// `ventilation_sensible`, `precision_sensible`), que la RLS lui réserve.

import type { LigneTable } from '@/lib/base'
import { schemaSaisieDimanche, schemaSaisieMois } from '@/features/saisie-chiffres/schemas'
import type { SaisieDimanche, SaisieMois } from '@/features/saisie-chiffres/schemas'
import { premierJourDuMois } from '@/lib/metier/periodes'
import { supabase } from '@/lib/supabase'

/** Ce qu'un formulaire de saisie lit d'un indicateur. */
export type IndicateurASaisir = Pick<
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
  | 'ministere_id'
  | 'ordre'
  | 'saisi_dimanche_matin'
  | 'modele_code'
>

/**
 * Indicateurs qui reçoivent un champ : les communs et ceux du ministère, actifs ou à valider,
 * jamais un calcul (la politique d'ajout de `mesure` refuse les autres). Rangés par `ordre`.
 */
export async function lireIndicateursASaisir(ministereId: string): Promise<IndicateurASaisir[]> {
  const { data, error } = await supabase()
    .from('indicateur')
    .select(
      'id, code, libelle, definition, nature, unite, sensible, calcul, etat, ministere_id, ordre, saisi_dimanche_matin, modele_code',
    )
    .or(`ministere_id.is.null,ministere_id.eq.${ministereId}`)
    .in('etat', ['actif', 'en_attente'])
    .is('calcul', null)
    .order('ordre', { ascending: true })
  if (error) throw error
  return data
}

/** Une saisie brute d'un total du mois. */
export type TotalDuMois = Pick<LigneTable<'mesure'>, 'id' | 'indicateur_id' | 'valeur' | 'saisi_le'>

/**
 * Totaux d'un mois saisis par le ministère pour les indicateurs donnés, du plus récent au plus
 * ancien, dans l'ordre de la règle 2 du BRIEF (`saisi_le`, puis `id`) : le premier de chaque
 * indicateur est celui qui fait foi (le même que `v_mesure_periode`).
 */
export async function lireTotauxDuMois(
  ministereId: string,
  mois: string,
  indicateurIds: readonly string[],
): Promise<TotalDuMois[]> {
  if (indicateurIds.length === 0) return []
  const { data, error } = await supabase()
    .from('mesure')
    .select('id, indicateur_id, valeur, saisi_le')
    .eq('ministere_id', ministereId)
    .eq('date_ref', premierJourDuMois(mois))
    .in('indicateur_id', [...indicateurIds])
    .order('saisi_le', { ascending: false })
    .order('id', { ascending: false })
  if (error) throw error
  return data
}

/** Répartition de totaux donnés (lignes brutes, valeurs exactes du ministère). */
export async function lireRepartitions(
  mesureIds: readonly number[],
): Promise<Pick<LigneTable<'ventilation_sensible'>, 'mesure_id' | 'categorie' | 'valeur'>[]> {
  if (mesureIds.length === 0) return []
  const { data, error } = await supabase()
    .from('ventilation_sensible')
    .select('mesure_id, categorie, valeur')
    .in('mesure_id', [...mesureIds])
  if (error) throw error
  return data
}

/** Précisions de totaux donnés (« [texte masqué par EJP Tech] » si EJP Tech l'a masquée). */
export async function lirePrecisions(
  mesureIds: readonly number[],
): Promise<Pick<LigneTable<'precision_sensible'>, 'mesure_id' | 'texte'>[]> {
  if (mesureIds.length === 0) return []
  const { data, error } = await supabase()
    .from('precision_sensible')
    .select('mesure_id, texte')
    .in('mesure_id', [...mesureIds])
  if (error) throw error
  return data
}

/**
 * Enregistre la saisie du dimanche : toutes les valeurs en une seule instruction `insert` (une
 * ligne de journal `mesure_saisie`). Pour un indicateur « à ce jour », la base remplace la date
 * par le jour de Paris. Vérifiée par le schéma partagé avec le formulaire.
 */
export async function enregistrerChiffresDimanche(saisie: SaisieDimanche): Promise<void> {
  const { ministereId, dimanche, lignes } = schemaSaisieDimanche.parse(saisie)
  const { error } = await supabase()
    .from('mesure')
    .insert(
      lignes.map(({ indicateurId, valeur }) => ({
        indicateur_id: indicateurId,
        ministere_id: ministereId,
        date_ref: dimanche,
        valeur,
      })),
    )
  if (error) throw error
}

/**
 * Enregistre « Chiffres du mois » : un seul appel de `saisir_chiffres_mois`, tout ou rien (une
 * ligne de journal, sans valeur propre ni texte). Rend le nombre de chiffres écrits.
 */
export async function enregistrerChiffresMois(saisie: SaisieMois): Promise<number> {
  const { mois, lignes } = schemaSaisieMois.parse(saisie)
  const { data, error } = await supabase().rpc('saisir_chiffres_mois', {
    p_mois: premierJourDuMois(mois),
    p_lignes: lignes,
  })
  if (error) throw error
  return data
}
