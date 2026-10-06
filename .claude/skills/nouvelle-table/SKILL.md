---
name: nouvelle-table
description: Procédure pour ajouter une table ou une colonne à la base Supabase du projet, avec migration, droits (GRANT), RLS, tests pgTAP, types TypeScript et accès aux données.
argument-hint: [nom-de-la-table]
---

Ajoute la table `$ARGUMENTS` en suivant ces étapes, dans l'ordre :

1. Relis `BRIEF.md` sections 3, 6, 7 et 8, en particulier la matrice des droits (section 7). Si la table n'y figure pas, demande confirmation avant d'aller plus loin.
2. `npx supabase migration new $ARGUMENTS` crée un fichier vide dans `supabase/migrations/`. Écris la migration dans ce fichier : table, contraintes `check` (jamais `now()` ni `current_date` dans un `check`), index des colonnes filtrées. Tant que le fichier n'est pas commité, tu peux le corriger ; une migration commitée ne se modifie plus (le hook `protect-files` la bloque).
3. Dans la même migration :
   - `enable row level security` ;
   - les politiques de la matrice (section 7), pour chaque opération et chaque type de compte, **plus la politique restrictive `aal2`** `for all` (section 8) ;
   - les GRANT exacts : pour `authenticated` ce que la matrice permet, pour `service_role` seulement si une Edge Function écrit la table, **rien** pour `anon` ;
   - si la table garde son auteur : colonnes `saisi_le` et `saisi_par` et trigger `private.forcer_auteur` ;
   - si la table est en ajout seul : aucun GRANT ni politique `update` ou `delete` ; si c'est une saisie, son trigger de journal par instruction (section 6).
4. Écris `supabase/tests/$ARGUMENTS.test.sql` à partir de la matrice : chaque opération, chaque type de compte et l'anonyme, en `aal1` (tout refusé, sauf la lecture de sa propre ligne de `compte`) et en `aal2`, avec les résultats attendus des refus (section 7).
5. Si Docker tourne (`npx supabase status` répond) : `npx supabase db reset` puis `npx supabase test db`. Sinon, les tests de base tournent en CI (job « base ») après l'envoi de la branche par la personne : dis-le dans ton compte rendu.
6. Régénère les types quand la base locale tourne : `npx supabase gen types --lang typescript --local > src/types/database.ts`. Sans base locale, signale que les types sont à régénérer.
7. Ajoute les fonctions d'accès dans `src/data/` (une par requête, typée, validée avec Zod).
8. Lance le sous-agent `rls-auditor` et corrige les points bloquants.

## Pièges connus des tests pgTAP

Sans Docker sur le poste, chaque erreur coûte un aller-retour de CI. Vérifie ces points avant d'envoyer :

- **Collation** : une colonne du catalogue (`information_schema`, `pg_catalog` : types `name` et `sql_identifier`, collation « C ») comparée à des textes littéraux ou à une colonne `text` donne « could not determine which collation to use for string comparison ». Écris `colonne::text collate "default"` (ou `collate "C"` des deux côtés) dans `results_eq`, `set_eq`, `bag_eq` et les `in (...)`. Erreur vue à l'étape 2 et trois fois au lot B6 de l'étape 4.
- **Date de Paris** : ne remplace jamais `private.aujourdhui()` dans un test. Pour tester minuit, passe la date en paramètre de la fonction testée, ou agis au nom du propriétaire de la fonction.
