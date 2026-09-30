# Pilotage EJP

Outil web temporaire de prise d'information pour le berger et le conseil de l'Église des Jeunes Prodiges. Chaque ministère y saisit ses chiffres, événements, réunions et points d'attention ; l'outil conserve chaque saisie et montre qui a saisi et qui manque. Les décisions se prennent en dehors de l'outil.

## Documents de référence

| Document                           | Contenu                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| [BRIEF.md](BRIEF.md)               | Source de vérité : produit, règles métier, données, sécurité, écrans, plan de construction |
| [BRIEF_DESIGN.md](BRIEF_DESIGN.md) | Intention visuelle et règles responsive (direction C)                                      |
| [CLAUDE.md](CLAUDE.md)             | Mémoire du projet pour Claude Code                                                         |
| [DEMARRAGE.md](DEMARRAGE.md)       | Mise en route avec Claude Code                                                             |
| [docs/reference/](docs/reference/) | Maquettes validées, tokens de design, prototype, réponse V2 au cahier des charges          |

## Stack

React 19, Vite, TypeScript strict, Tailwind CSS 4, shadcn/ui (Radix), React Router. Supabase (PostgreSQL, Auth avec double authentification, RLS). Tests : Vitest, Playwright (avec audit axe), pgTAP.

## Démarrer

Prérequis : Node.js 22.12 ou plus (voir `.nvmrc`), npm.

```bash
npm install
npx playwright install chromium   # une seule fois, pour les tests de parcours
npm run dev                       # http://localhost:5173
```

## Commandes

| Commande                                  | Rôle                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| `npm run dev`                             | Serveur local                                                            |
| `npm run lint`                            | ESLint, puis contrôle des textes (aucun tiret cadratin ni demi-cadratin) |
| `npm run format` / `npm run format:check` | Prettier                                                                 |
| `npm run typecheck`                       | Vérification TypeScript                                                  |
| `npm test`                                | Tests unitaires (Vitest)                                                 |
| `npm run e2e`                             | Parcours Playwright en 1440, 834 et 390 px, avec audit d'accessibilité   |
| `npm run build`                           | Build de production                                                      |

## Avancement

Construction étape par étape (BRIEF, section 13). Étape en cours : **0, échafaudage**.

## Règles à ne jamais casser

- Aucun secret dans le dépôt : `.env` est ignoré, seul `.env.example` est versionné. La clé `service_role` ne va jamais côté navigateur.
- Les données se construisent en ajout seulement (mesures, participations, journal).
- Aucune donnée personnelle dans les chiffres.
