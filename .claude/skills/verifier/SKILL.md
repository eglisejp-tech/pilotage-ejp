---
name: verifier
description: Lance toute la chaîne de vérification du projet (lint, types, tests unitaires, tests RLS, parcours Playwright, build) et résume ce qui échoue. À utiliser avant chaque commit et à la fin de chaque étape du plan.
disable-model-invocation: true
allowed-tools: Bash(npm run lint) Bash(npm run typecheck) Bash(npm test *) Bash(supabase test db) Bash(npm run e2e *) Bash(npm run build)
---

Exécute dans cet ordre et arrête-toi au premier échec bloquant :

1. `npm run lint`
2. `npm run typecheck`
3. `npm test -- --run`
4. `supabase test db` (démarre la base avec `supabase start` si besoin)
5. `npm run e2e`
6. `npm run build`

Puis rends un tableau : étape, résultat, cause probable de l'échec, fichier concerné.

Si tout passe, rappelle les deux relectures à lancer avant de clore l'étape : le sous-agent `rls-auditor` si `supabase/` a changé, le sous-agent `ui-reviewer` si l'interface a changé.
