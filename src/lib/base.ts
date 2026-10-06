// Types de la base lus par le navigateur (supabase/migrations). Point d'entrée : il réexporte les
// types de `src/lib/base/` et les assemble en un seul `Database`. Chaque lot de l'étape 4 ne
// remplit que son fichier (indicateurs.ts, fiche.ts, fij.ts, evenements.ts, signalements.ts) ;
// ce fichier ne change plus avant le lot I. Écrits à la main tant que la génération
// (`npx supabase gen types typescript --local`) demande Docker, absent de ce poste.

import type { Aucun, EnumsCommuns, TablesCommunes, VuesCommunes } from './base/communs'
import type { FonctionsEvenements, TablesEvenements, VuesEvenements } from './base/evenements'
import type { FonctionsFiche, TablesFiche, VuesFiche } from './base/fiche'
import type { FonctionsFij, TablesFij, VuesFij } from './base/fij'
import type { FonctionsIndicateurs, TablesIndicateurs, VuesIndicateurs } from './base/indicateurs'
import type {
  FonctionsSignalements,
  TablesSignalements,
  VuesSignalements,
} from './base/signalements'

export type * from './base/communs'
export type * from './base/evenements'
export type * from './base/fiche'
export type * from './base/fij'
export type * from './base/indicateurs'
export type * from './base/signalements'

export type Database = {
  public: {
    Tables: TablesCommunes &
      TablesIndicateurs &
      TablesFiche &
      TablesFij &
      TablesEvenements &
      TablesSignalements
    Views: VuesCommunes & VuesIndicateurs & VuesFiche & VuesFij & VuesEvenements & VuesSignalements
    Functions: FonctionsIndicateurs &
      FonctionsFiche &
      FonctionsFij &
      FonctionsEvenements &
      FonctionsSignalements
    Enums: EnumsCommuns
    CompositeTypes: Aucun
  }
}

type Public = Database['public']

/** Ligne d'une table : `LigneTable<'ministere'>`. */
export type LigneTable<Nom extends keyof Public['Tables']> = Public['Tables'][Nom]['Row']

/** Ligne d'une vue : `LigneVue<'v_semaine'>`. */
export type LigneVue<Nom extends keyof Public['Views']> = Public['Views'][Nom]['Row']
