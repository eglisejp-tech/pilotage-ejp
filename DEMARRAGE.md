# Démarrer avec Claude Code

Ce kit prépare un dépôt pour que Claude Code construise l'application « Pilotage des ministères » étape par étape, avec ses propres garde-fous.

## Contenu du kit

| Fichier | Rôle |
|---|---|
| `BRIEF.md` | Le cahier de construction : produit, règles métier, données, sécurité, écrans, plan |
| `CLAUDE.md` | La mémoire du projet, relue par Claude Code à chaque session |
| `.claude/settings.json` | Permissions (ce qu'il peut lancer sans demander, ce qui est interdit) et hooks |
| `.claude/hooks/protect-files.sh` | Bloque l'écriture dans `.env`, `.git/` et les migrations déjà créées |
| `.claude/hooks/format-and-check.sh` | Formate chaque fichier modifié et refuse les tirets cadratin dans les textes |
| `.claude/agents/rls-auditor.md` | Sous-agent qui relit la sécurité de la base (lecture seule) |
| `.claude/agents/ui-reviewer.md` | Sous-agent qui relit les écrans à partir de captures (lecture seule) |
| `.claude/agents/qa-parcours.md` | Sous-agent qui écrit et lance les tests Playwright par type de compte |
| `.claude/skills/verifier/` | Commande `/verifier` : toute la chaîne de tests en une fois |
| `.claude/skills/nouvelle-table/` | Commande `/nouvelle-table` : procédure migration + RLS + tests |
| `.mcp.json` | Serveurs MCP : Supabase (lecture seule, projet de dev) et Playwright (navigateur) |
| `docs/reference/maquettes/` | Les maquettes validées de tous les écrans, profil par profil (images et HTML) |
| `docs/reference/tokens.css` | Couleurs, polices et tailles de la direction visuelle retenue |
| `docs/reference/` | Aussi : le prototype HTML (comportement) et la réponse V2 au cahier des charges |

## Prérequis

1. Node.js 20 ou plus, `git`, `jq` (utilisé par les hooks).
2. Supabase CLI et Docker (pour la base locale).
3. Claude Code installé et connecté.
4. Un projet Supabase **de développement**, créé dans une organisation au nom de l'église. Note son identifiant de projet.

## Mise en place (10 minutes)

```bash
mkdir ejp-pilotage && cd ejp-pilotage
git init
# copier ici tout le contenu du kit (y compris les dossiers cachés .claude et .mcp.json)
chmod +x .claude/hooks/*.sh
export SUPABASE_DEV_PROJECT_REF=ton_identifiant_de_projet_dev
claude
```

Dans Claude Code :
1. Tape `/mcp`, sélectionne `supabase` et termine la connexion dans le navigateur.
2. Accepte les serveurs du projet quand Claude Code le demande.
3. Passe en **mode plan** (Maj+Tab jusqu'à « plan mode ») avant le premier message.

## Premier message à envoyer

```
Lis BRIEF.md, CLAUDE.md, docs/reference/maquettes/LISEZMOI.md,
regarde les images de docs/reference/maquettes/ et ouvre docs/reference/prototype.html.
Résume en 10 lignes ce que tu as compris du produit et des règles métier,
puis liste les questions qui te bloquent. Ensuite, propose le plan détaillé
de l'étape 0 uniquement. N'écris aucun code avant mon accord.
```

## Messages pour les étapes suivantes

Toujours le même schéma : plan, accord, code, vérification, relecture.

```
Étape 1 du BRIEF. Mode plan : propose les migrations, les vues, les fonctions
private et la liste des tests RLS. Après mon accord, utilise /nouvelle-table
pour chaque table, puis lance /verifier et le sous-agent rls-auditor.
```

```
Étape 3 du BRIEF : la vue globale. Reproduis les maquettes 01, 02 et 03
(et la variante ministère sans « À décider »). Quand c'est prêt, lance le
sous-agent qa-parcours pour les tests, puis ui-reviewer sur les captures
1440, 834 et 390 px, pour chaque profil. Corrige les points bloquants.
```

## Bonnes pratiques pendant la construction

- **Une étape par session.** Utilise `/clear` entre deux étapes pour repartir avec un contexte propre ; `CLAUDE.md` et `BRIEF.md` restent la mémoire.
- **Relis chaque plan.** C'est le moment le moins cher pour corriger une erreur.
- **Ne donne jamais de clé de production.** Le MCP Supabase est en lecture seule sur le projet de dev. Le déploiement en production se fait à la main (`supabase db push` et `git push` sont interdits à Claude Code dans les permissions).
- **Garde les réponses aux questions ouvertes à jour dans `BRIEF.md`**, section 4, dès que la coordination répond.
- **Commits** : un par étape, après `/verifier` au vert.

## Si quelque chose ne marche pas

- Un hook bloque une écriture : le message explique pourquoi. C'est voulu. Pour une migration, créer une nouvelle migration plutôt que modifier l'ancienne.
- Le MCP Supabase ne répond pas : relancer `/mcp` et se reconnecter.
- Les tests RLS échouent : ne pas désactiver la RLS pour « faire passer ». Demander à `rls-auditor` d'analyser l'échec.
