---
name: nouvelle-table
description: Procédure pour ajouter une table ou une colonne à la base Supabase du projet, avec migration, RLS, tests pgTAP, types TypeScript et accès aux données.
argument-hint: [nom-de-la-table]
---

Ajoute la table `$ARGUMENTS` en suivant ces étapes, dans l'ordre :

1. Relis `BRIEF.md` sections 3, 6, 7 et 8. Si la table n'y figure pas, demande confirmation avant d'aller plus loin.
2. `supabase migration new $ARGUMENTS` puis écris la migration : table, contraintes `check`, index des colonnes filtrées.
3. Dans la même migration : `enable row level security`, politiques pour chaque opération et chaque type de compte, **plus la politique restrictive `aal2`** (section 8 du brief), `revoke update, delete` si la table est en ajout seul.
4. Écris `supabase/tests/$ARGUMENTS.test.sql` : chaque opération, chaque type de compte, l'anonyme, en `aal1` (tout refusé) et en `aal2`, y compris les refus attendus.
5. `supabase db reset` puis `supabase test db`.
6. Régénère les types : `supabase gen types typescript --local > src/types/database.ts`.
7. Ajoute les fonctions d'accès dans `src/data/` (une par requête, typée, validée avec Zod).
8. Lance le sous-agent `rls-auditor` et corrige les points bloquants.
