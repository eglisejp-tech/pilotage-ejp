// Types des comptes et des sessions de l'administration (étape 6). Fichier rempli par les lots L1
// (`v_etat_comptes`, `v_usage_indicateurs` côté comptes, appels des Edge Functions) et L2
// (`session`, `declarer_session`, `modifier_session`, `supprimer_session`, `v_session_completude`),
// dans le format de `communs.ts`. Posé vide par le lot C0 et branché dans `src/lib/base.ts`.

import type { Aucun } from './communs'

export type TablesComptes = Aucun

export type VuesComptes = Aucun

export type FonctionsComptes = Aucun
