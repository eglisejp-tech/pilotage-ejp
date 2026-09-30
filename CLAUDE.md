# CLAUDE.md : Pilotage des ministères EJP

Outil web temporaire de prise d'information pour le berger et le conseil de l'EJP. Le détail complet est dans `BRIEF.md`. Relis-le au début de chaque étape.

## Commandes

- `npm run dev` : serveur local
- `npm run lint` · `npm run typecheck` · `npm test` : qualité et tests unitaires
- `npm run e2e` : parcours Playwright par type de compte
- `supabase start` · `supabase db reset` · `supabase test db` : base locale et tests RLS
- `/verifier` : lance toute la chaîne de vérification (skill du projet)

## Règles de travail

- Une étape du plan (`BRIEF.md`, section 13) à la fois. Mode plan d'abord, code ensuite.
- Ne change pas de stack, de dépendance majeure ou de modèle de données sans demander.
- Si une règle métier est ambiguë, arrête-toi et pose la question. N'invente pas.
- Commits petits et clairs, en français.

## Règles métier à ne jamais casser

- Mesures, participations et journal : **ajout seulement**. Pas d'`UPDATE`, pas de `DELETE`.
- Le pourcentage FIJ se **calcule** (somme en FIJ ÷ somme actifs), il ne se saisit pas.
- Tout total agrégé s'affiche avec sa **complétude** (« 6/8 ministères »).
- Cinq profils (ministère, berger, conseil, administration de l'église, EJP Tech), chacun avec sa navigation. Un ministère ne voit que sa fiche, la vue globale et les points qui le mentionnent.
- Aucune donnée personnelle. Rappel sous chaque champ libre. 280 caractères maximum.

## Sécurité

- RLS activée sur toute table exposée, avec tests pgTAP pour chaque type de compte.
- Fonctions d'aide dans le schéma `private`, `security definer`, `set search_path = ''`.
- Les changements de statut passent par des fonctions RPC, pas par des `update` directs.
- Double authentification obligatoire : politique restrictive `aal2` sur chaque table, `private.exige_aal2()` dans chaque RPC (BRIEF section 8).
- Connexion Google ou mot de passe, inscription désactivée. Les comptes se créent par l'Edge Function `creer-compte`.
- Jamais de secret dans le code. Jamais la clé `service_role` ni le secret Google côté navigateur ou dans une variable `VITE_*`.

## Style du code

- TypeScript strict, pas de `any`. Composants petits, un fichier par composant.
- Accès aux données regroupés dans `src/data/` (une fonction par requête, typée).
- Validation Zod partagée entre formulaire et appel base.
- Tokens de design dans `src/styles/tokens.css`, copiés de `docs/reference/tokens.css`. Pas de couleur en dur dans les composants.
- L'apparence suit les maquettes de `docs/reference/maquettes/` (elles priment sur le prototype). Avant de coder un écran, ouvre sa maquette.

## Textes de l'interface

Français, simple, voix active. Les boutons disent ce qu'ils font. Aucun tiret cadratin ni demi-cadratin : utiliser virgules, deux-points, parenthèses ou points. Pas d'emoji.
