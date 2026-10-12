// Types du journal (étape 6, écran 06 et journal technique), dans le format de `communs.ts`. Posé
// vide par le lot C0 et branché dans `src/lib/base.ts` : le lot L5 le remplit sans toucher
// `base.ts`. `v_journal` est déjà typée dans `fiche.ts` (« Dernières saisies ») : L5 y complète
// ses colonnes, ou la déplace ici en la retirant de `fiche.ts`, jamais dans les deux fichiers.

import type { Aucun } from './communs'

export type TablesJournal = Aucun

export type VuesJournal = Aucun

export type FonctionsJournal = Aucun
