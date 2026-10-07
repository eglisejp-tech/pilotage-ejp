// Types des comptes et des sessions de l'administration (étape 6), dans le format de
// `communs.ts`. Posé vide par le lot C0 et branché dans `src/lib/base.ts` : les lots le remplissent
// sans toucher `base.ts`.
// - L1 (écran 13) : `v_etat_comptes`. Les Edge Functions de comptes ne passent pas par ce type.
// - L2 (écran 14) : la table `session`, `declarer_session`, `modifier_session`,
//   `supprimer_session`.
// Déjà typées ailleurs, à ne pas redéclarer ici : `v_session_completude` (communs.ts) et
// `v_usage_indicateurs` (indicateurs.ts).

import type { Aucun } from './communs'

export type TablesComptes = Aucun

export type VuesComptes = Aucun

export type FonctionsComptes = Aucun
