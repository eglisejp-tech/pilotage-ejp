# CLAUDE.md : Pilotage EJP

Outil web temporaire de prise d'information pour le berger et le conseil de l'EJP. Le détail complet est dans `BRIEF.md`, les décisions dans `docs/decisions.md`. Relis le brief au début de chaque étape.

## Commandes

- `npm run dev` : serveur local
- `npm run lint` (ESLint et contrôle des tirets) · `npm run format:check` · `npm run typecheck` · `npm test -- --run` : qualité et tests unitaires ; `npm run format` corrige le format
- `npm run build` · `npm run e2e` : build et parcours Playwright (1440, 834 et 390 px)
- `npx supabase migration new nom` : nouvelle migration (fichier vide, à remplir avec Edit ou Write)
- `npx supabase start` · `npx supabase db reset` · `npx supabase test db` : base locale (Docker) et tests pgTAP. **Sur ce poste, Docker ne tourne pas : les tests de base tournent dans la CI (job « base »).**
- La CLI Supabase s'appelle toujours par `npx supabase`, en local seulement. `link`, `db push`, `functions deploy`, `secrets`, `--linked` et `--db-url` sont refusés : la préproduction et la production se gèrent à la main par la personne.
- `/verifier` : lance toute la chaîne de vérification (skill du projet)
- Sur Windows, les commandes passent par Git Bash (outil Bash) : l'outil PowerShell est désactivé pour ce projet.

## Règles de travail

- Une étape du plan (`BRIEF.md`, section 13) à la fois. Mode plan d'abord, code ensuite.
- Ne change pas de stack, de dépendance majeure ou de modèle de données sans demander.
- Si une règle métier est ambiguë, arrête-toi et pose la question. N'invente pas. Les propositions « Proposé » de `docs/decisions.md` s'appliquent en attendant la réponse de la coordination.
- Un commit par étape, en français, après `/verifier` au vert et l'accord de la personne. Tu pousses les branches d'étape par `git push -u origin etape-<nom>`, seul dans la commande (hook `.claude/hooks/garde-push.sh`). Tu ne pousses `main` (`git push origin main`, seul dans la commande) qu'avec l'accord écrit de la personne dans la conversation, pour ce push précis ; le hook demande en plus sa confirmation. Tout autre push est refusé (push forcé, refspec `a:b`, `--all`, `--tags`, `--delete`).
- Une migration suivie par git est figée : pour la changer, crée une nouvelle migration. Écris les fichiers avec Edit et Write, jamais par une redirection du shell (les hooks ne la verraient pas).

## Règles métier à ne jamais casser

- Mesures, carte des FIJ, participations, événements et leurs états, réunions, points, mentions, suivis de point, journal et modération, ainsi que `indicateur_terme`, `demande_indicateur`, `validation`, `fij_statistique`, `evenement_mention`, `signalement` et `signalement_suivi` : **ajout seulement**. Pas d'`UPDATE`, pas de `DELETE` (seule exception pour un texte : `masquer_texte`). La base impose `saisi_le` et `saisi_par`.
- Le pourcentage FIJ se **calcule** (somme en FIJ ÷ somme actifs, sur les ministères qui ont les deux valeurs), il ne se saisit pas.
- Tout total agrégé s'affiche avec sa **complétude** (« 6 sur 8 »).
- Un STAR n'est compté qu'une fois : total d'une session = somme de (présents moins déjà comptés par leur ministère principal). Aucun nom, aucune liste de personnes.
- « Marquer traité » : ministère créateur ou mentionné (commentaire obligatoire, 10 à 280 caractères), berger et conseil (commentaire facultatif), par `marquer_traite`. Un point traité ne se rouvre pas.
- Toute date métier se calcule à l'heure de Paris (`private.aujourdhui()`, `private.dimanche_reference()`, vue `v_semaine`). Jamais `current_date` ni la date du navigateur.
- Cinq profils (ministère, berger, conseil, administration de l'église, EJP Tech), chacun avec sa navigation. Un ministère ne voit que sa fiche, la vue de l'église, les points qu'il a créés ou qui le mentionnent, les événements qui le mentionnent et ses signalements ; exception : Coordination lit les totaux d'événements de l'église.
- Aucune donnée personnelle. Rappel une fois par formulaire, sous le premier champ libre (exception voulue par la personne responsable, T30 : le champ « Pourquoi cet indicateur ? » n'a pas de rappel). 280 caractères au plus. Le journal ne recopie jamais un texte libre ni un email.

## Sécurité

- RLS activée sur toute table exposée, GRANT explicites (rien pour `anon`), tests pgTAP construits sur la matrice des droits (BRIEF section 7).
- Fonctions `security definer` seulement dans le schéma `private`, avec `set search_path = ''`, appelées par une fonction `public` en `security invoker`. Vues toujours `with (security_invoker = true)`.
- Les points, les statuts, les sessions et la modération passent par des fonctions, pas par des `update` directs.
- Double authentification obligatoire : politique restrictive `aal2` sur chaque table, `private.exige_aal2()` au début de chaque fonction de l'API (BRIEF section 8).
- Connexion Google ou mot de passe, inscription désactivée. Les comptes se créent par l'Edge Function `creer-compte`.
- Jamais de secret dans le code. Le navigateur n'utilise que la clé publique (`sb_publishable_...`) ; la clé secrète (`sb_secret_...`, ancienne `service_role`) et le secret Google ne vont jamais côté navigateur ni dans une variable `VITE_*`.

## Style du code

- TypeScript strict, pas de `any`. Composants petits, un fichier par composant.
- Accès aux données regroupés dans `src/data/` (une fonction par requête, typée).
- Validation Zod partagée entre formulaire et appel base.
- Tokens de design dans `src/styles/tokens.css`, copiés de `docs/reference/tokens.css`. Pas de couleur en dur dans les composants.
- L'apparence suit les maquettes de `docs/reference/maquettes/` (elles priment sur le prototype). Avant de coder un écran, ouvre sa maquette et les écarts connus de `LISEZMOI.md`. Ne modifie jamais les maquettes (PNG et HTML), `tokens.css` ni le prototype de `docs/reference/` : les écarts s'écrivent dans `LISEZMOI.md`.
- Le nom de l'outil est « Pilotage EJP » : il remplace « Le point du berger » des maquettes et « Pilotage des ministères » du prototype.

## Textes de l'interface

Français, simple, voix active. Les boutons disent ce qu'ils font. Aucun tiret cadratin ni demi-cadratin : utiliser virgules, deux-points, parenthèses ou points. Pas d'emoji.
