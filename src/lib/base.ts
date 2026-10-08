// Types de la base lus par le navigateur (supabase/migrations). Point d'entrée : il réexporte les
// types de `src/lib/base/` et les assemble en un seul `Database`. Chaque lot ne remplit que son
// fichier : étape 4 (indicateurs.ts, fiche.ts, fij.ts, evenements.ts, signalements.ts), étape 5
// (points.ts, posé par C0), étape 6 (comptes.ts pour L1 et L2, journal.ts pour L5, moderation.ts
// pour L6, posés vides par C0). Ce fichier ne change plus avant le lot d'intégration. Écrits à la
// main tant que la génération (`npx supabase gen types typescript --local`) demande Docker, absent
// de ce poste.

import type { Aucun, EnumsCommuns, TablesCommunes, VuesCommunes } from './base/communs'
import type { FonctionsComptes, TablesComptes, VuesComptes } from './base/comptes'
import type { FonctionsConditions, TablesConditions } from './base/conditions'
import type { FonctionsEvenements, TablesEvenements, VuesEvenements } from './base/evenements'
import type { FonctionsFiche, TablesFiche, VuesFiche } from './base/fiche'
import type { FonctionsFij, TablesFij, VuesFij } from './base/fij'
import type { FonctionsIndicateurs, TablesIndicateurs, VuesIndicateurs } from './base/indicateurs'
import type { FonctionsJournal, TablesJournal, VuesJournal } from './base/journal'
import type { FonctionsModeration, TablesModeration, VuesModeration } from './base/moderation'
import type { FonctionsPoints, TablesPoints, VuesPoints } from './base/points'
import type {
  FonctionsSignalements,
  TablesSignalements,
  VuesSignalements,
} from './base/signalements'

export type * from './base/communs'
export type * from './base/comptes'
export type * from './base/conditions'
export type * from './base/evenements'
export type * from './base/fiche'
export type * from './base/fij'
export type * from './base/indicateurs'
export type * from './base/journal'
export type * from './base/moderation'
export type * from './base/points'
export type * from './base/signalements'

export type Database = {
  public: {
    Tables: TablesCommunes &
      TablesIndicateurs &
      TablesFiche &
      TablesFij &
      TablesEvenements &
      TablesSignalements &
      TablesConditions &
      TablesPoints &
      TablesComptes &
      TablesJournal &
      TablesModeration
    Views: VuesCommunes &
      VuesIndicateurs &
      VuesFiche &
      VuesFij &
      VuesEvenements &
      VuesSignalements &
      VuesPoints &
      VuesComptes &
      VuesJournal &
      VuesModeration
    Functions: FonctionsIndicateurs &
      FonctionsFiche &
      FonctionsFij &
      FonctionsEvenements &
      FonctionsSignalements &
      FonctionsConditions &
      FonctionsPoints &
      FonctionsComptes &
      FonctionsJournal &
      FonctionsModeration
    Enums: EnumsCommuns
    CompositeTypes: Aucun
  }
}

type Public = Database['public']

/** Ligne d'une table : `LigneTable<'ministere'>`. */
export type LigneTable<Nom extends keyof Public['Tables']> = Public['Tables'][Nom]['Row']

/** Ligne d'une vue : `LigneVue<'v_semaine'>`. */
export type LigneVue<Nom extends keyof Public['Views']> = Public['Views'][Nom]['Row']
