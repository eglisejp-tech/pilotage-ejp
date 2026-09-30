---
name: verifier
description: Lance toute la chaîne de vérification du projet (lint et textes, format, types, tests unitaires, build, parcours Playwright, tests de base) et résume ce qui échoue. À utiliser avant chaque commit et à la fin de chaque étape du plan.
allowed-tools: Bash(npm run lint) Bash(npm run format:check) Bash(npm run typecheck) Bash(npm test *) Bash(npm run build) Bash(npm run e2e *) Bash(npx supabase status *) Bash(npx supabase test db) Bash(git status)
---

Exécute dans cet ordre (le même que la CI, `.github/workflows/ci.yml`) et arrête-toi au premier échec bloquant :

1. `npm run lint` : ESLint, puis `scripts/verifier-textes.mjs` (aucun tiret cadratin ni demi-cadratin).
2. `npm run format:check` : Prettier. Si des fichiers sont signalés, lance `npm run format`, relis le diff, puis recommence.
3. `npm run typecheck`
4. `npm test -- --run`
5. `npm run build`
6. `npm run e2e` (Playwright démarre le serveur de développement lui-même). Sans base locale, les parcours qui lisent la base échouent : note-le et renvoie au job « e2e » de la CI au lieu de chercher à les corriger.
7. Tests de base (pgTAP) : si `npx supabase status` répond, lance `npx supabase test db`. Sinon (pas de Docker sur ce poste), ne force rien : note « Tests de base : en CI (job base) » et rappelle que l'étape n'est terminée qu'avec la CI verte, une fois la branche envoyée à la main par la personne.

Puis rends un tableau : étape, résultat, cause probable de l'échec, fichier concerné.

Si tout passe, rappelle les relectures à lancer avant de clore l'étape : le sous-agent `rls-auditor` si `supabase/` a changé, le sous-agent `ui-reviewer` si l'interface a changé. Ne commite pas et ne pousse pas : la personne commite après son accord et pousse elle-même.
