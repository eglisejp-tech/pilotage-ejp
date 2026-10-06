// Types des indicateurs (étape 4). Fichier rempli par les lots B1 à B4 et E1 : tables, vues et
// fonctions de la section 4 du plan, dans le format de `communs.ts`. W0 y pose seulement la table
// `indicateur` de l'étape 3 (retirée de `communs.ts` pour qu'un seul lot la change) et le type de
// l'unité, dont `src/lib/metier/unites.ts` a besoin.

import type { Aucun, TableEnLecture } from './communs'

/**
 * Unité d'un indicateur (plan de l'étape 4, B1) : plafond de chaque unité dans
 * `src/lib/metier/unites.ts`. Pas d'unité « minutes » : l'heure se saisit de 0 à 1439.
 */
export type UniteIndicateur = 'nombre' | 'grand_nombre' | 'euros' | 'heure' | 'jours'

export type TablesIndicateurs = {
  indicateur: TableEnLecture<{
    id: string
    /** « service », « actifs », « en_fij » ; null pour un indicateur propre. */
    code: string | null
    libelle: string
    nature: 'dimanche' | 'a_ce_jour'
    /** Null : indicateur commun. */
    ministere_id: string | null
    ordre: number
    actif: boolean
  }>
}

export type VuesIndicateurs = Aucun

export type FonctionsIndicateurs = Aucun
