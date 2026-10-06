# Démarrer avec Claude Code

Ce kit prépare un dépôt pour que Claude Code construise l'application « Pilotage EJP » étape par étape, avec ses propres garde-fous. L'étape 0 (échafaudage, tests, CI) est faite.

## Contenu du kit

| Fichier                             | Rôle                                                                                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BRIEF.md`                          | Le cahier de construction : produit, règles métier, données, sécurité, écrans, plan                                                                                                  |
| `docs/decisions.md`                 | Le journal des décisions (D1 à D7) et des propositions à confirmer                                                                                                                   |
| `CLAUDE.md`                         | La mémoire du projet, relue par Claude Code à chaque session                                                                                                                         |
| `.claude/settings.json`             | Permissions (ce qu'il peut lancer sans demander, ce qui est interdit) et hooks                                                                                                       |
| `.claude/hooks/protect-files.sh`    | Bloque l'écriture dans les fichiers `.env` (sauf `.env.example`), `.git/`, `supabase/.temp/`, `package-lock.json` et les migrations déjà suivies par git. En cas de doute, il refuse |
| `.claude/hooks/format-and-check.sh` | Formate chaque fichier modifié avec le Prettier du projet et refuse les tirets cadratin et demi-cadratin                                                                             |
| `.claude/agents/rls-auditor.md`     | Sous-agent qui relit la sécurité de la base (lecture seule)                                                                                                                          |
| `.claude/agents/ui-reviewer.md`     | Sous-agent qui relit les écrans à partir de captures (lecture seule)                                                                                                                 |
| `.claude/agents/qa-parcours.md`     | Sous-agent qui écrit et lance les tests Playwright par type de compte                                                                                                                |
| `.claude/skills/verifier/`          | Commande `/verifier` : toute la chaîne de tests en une fois                                                                                                                          |
| `.claude/skills/nouvelle-table/`    | Commande `/nouvelle-table` : procédure migration + RLS + tests                                                                                                                       |
| `.mcp.json`                         | Serveurs MCP : Supabase (lecture seule, projet de préproduction) et Playwright (navigateur)                                                                                          |
| `docs/reference/maquettes/`         | Les maquettes validées de tous les écrans, profil par profil (images et HTML)                                                                                                        |
| `docs/reference/tokens.css`         | Couleurs, polices et tailles de la direction visuelle retenue                                                                                                                        |
| `docs/reference/`                   | Aussi : le prototype HTML (comportement) et la réponse V2 au cahier des charges                                                                                                      |

## Où travailler (poste Windows)

- Le dépôt vit dans `C:\Users\GraceManassePASSIDEM\dev\pilotage-ejp`, hors de OneDrive et de Documents : sur ce poste d'entreprise, l'« Accès contrôlé aux dossiers » de Windows Defender bloque git, npm et bash dans Documents et OneDrive. Un dépôt git, `node_modules` et un fichier `.env` n'ont de toute façon pas leur place dans un dossier synchronisé. Le dossier du kit dans OneDrive n'est plus qu'une archive.
- Identité git propre au dépôt (la configuration globale porte l'adresse de l'employeur), déjà réglée (D6) :
  `git config user.name "EJP Tech"` et `git config user.email "eglisejptech@gmail.com"`. Vérifie avec `git config --show-origin user.email`.
- Ce poste appartient à l'employeur : aucun secret de production n'y reste.

## Prérequis

1. Node.js selon `.nvmrc` (24, installé). Les hooks utilisent node : `jq` n'est pas nécessaire.
2. Git for Windows (installé) : il fournit Git Bash, que Claude Code et les hooks utilisent.
3. La CLI Supabase est une dépendance de développement du projet (2.118) : elle s'appelle par `npx supabase`, sans installation globale.
4. Docker : **indisponible sur ce poste** (ni WSL ni Hyper-V, il faut l'informatique). En attendant, la base locale ne démarre pas ici : les tests de base (`npx supabase db start` puis `npx supabase test db`) tournent dans GitHub Actions (job « base » de `.github/workflows/ci.yml`).
5. Claude Code dans VS Code (installé). `gh` est facultatif.
6. Les comptes de l'église : le dépôt GitHub `eglisejp-tech/pilotage-ejp` (D6) et un projet Supabase de **préproduction**, créé dans une organisation au nom de l'église, région Paris. Note son identifiant de projet (project ref).

## Mise en place

Le dépôt existe déjà, avec son distant (`https://eglisejp-tech@github.com/eglisejp-tech/pilotage-ejp.git` : le nom du compte dans l'adresse évite que Git utilise un autre compte GitHub enregistré sur le poste). Pour un nouveau poste, en PowerShell :

```powershell
git clone https://eglisejp-tech@github.com/eglisejp-tech/pilotage-ejp.git "$env:USERPROFILE\dev\pilotage-ejp"
Set-Location "$env:USERPROFILE\dev\pilotage-ejp"
git config user.name "EJP Tech"
git config user.email "eglisejptech@gmail.com"
npm ci
```

Le serveur MCP Supabase pointe par défaut sur le projet de préproduction (`ugbitornbspatpcowlvg`, en lecture seule) : rien à régler. Cet identifiant n'est pas un secret, il figure déjà dans l'adresse publique du projet. Pour viser un autre projet, enregistre la variable `SUPABASE_DEV_PROJECT_REF` pour ton utilisateur, puis ferme et rouvre VS Code (un `export` dans Git Bash ne suffit pas : Claude Code hérite de l'environnement de VS Code) :

```powershell
[Environment]::SetEnvironmentVariable('SUPABASE_DEV_PROJECT_REF', 'identifiant_du_projet_de_preproduction', 'User')
```

Dans VS Code, ajoute aussi `"claudeCode.initialPermissionMode": "plan"` aux réglages utilisateur (JSON) : l'extension ne lit pas le mode de départ dans le `settings.json` du projet, et le mode Auto laisserait un classifieur approuver à ta place ce que le kit te fait valider (dépendances, commits).

Dans Claude Code :

1. Tape `/mcp`, sélectionne `supabase` et connecte-toi avec ton compte Supabase. Quand Supabase demande quelle organisation autoriser, choisis seulement celle de la préproduction, jamais celle de la production. Le serveur est en lecture seule.
2. Accepte les serveurs du projet quand Claude Code le demande.
3. Vérifie que la conversation est en **mode plan** (Maj+Tab) avant le premier message. Après ton accord sur le plan, passe en « Manual » ou « Edit automatically ».

## Premier message d'une nouvelle étape

```
Lis BRIEF.md, docs/decisions.md, CLAUDE.md et docs/reference/maquettes/LISEZMOI.md,
regarde les images de docs/reference/maquettes/ et ouvre docs/reference/prototype.html.
Résume en 10 lignes ce que tu as compris du produit et des règles métier,
puis liste les questions qui te bloquent. Ensuite, propose le plan détaillé
de l'étape 1 uniquement. N'écris aucun code avant mon accord.
```

## Messages pour les étapes suivantes

Toujours le même schéma : plan, accord, code, vérification, relecture.

```
Étape 1 du BRIEF. Mode plan : propose les migrations (dans l'ordre de la
section 13), les vues, les fonctions private et de l'API, la matrice des
tests pgTAP et le jeu d'exemple. Après mon accord, utilise /nouvelle-table
pour chaque table, puis lance /verifier et le sous-agent rls-auditor.
Les tests de base tournent en CI : dis-moi quand envoyer la branche.
```

```
Étape 3 du BRIEF : la vue de l'église. Reproduis les maquettes 01, 02 et 03
(et les vues du ministère et de l'administration, BRIEF section 9,
« Vue de l'église selon le profil »). Quand c'est prêt, lance le
sous-agent qa-parcours pour les tests, puis ui-reviewer sur les captures
1440, 834 et 390 px, pour chaque profil. Corrige les points bloquants.
```

## Bonnes pratiques pendant la construction

- **Une étape par session.** Utilise `/clear` entre deux étapes pour repartir avec un contexte propre ; `CLAUDE.md` et `BRIEF.md` restent la mémoire.
- **Relis chaque plan.** C'est le moment le moins cher pour corriger une erreur.
- **Ne donne jamais de clé de production.** Le MCP Supabase est en lecture seule sur la préproduction. Les commandes qui touchent un projet distant (`npx supabase link`, `db push`, `functions deploy`, `secrets`, `--linked`, `--db-url`) et `git push` sont interdites à Claude Code dans les permissions : tu les lances toi-même, dans ton terminal.
- **Garde les réponses de la coordination à jour** dans `docs/decisions.md` et dans `BRIEF.md`, section 4, dès qu'elle répond.
- **Commits** : un par étape, sur une branche d'étape (`etape-1-base`), après `/verifier` au vert et ta relecture du diff.

## Envoyer sur GitHub (toujours à la main)

Claude ne pousse jamais. Tu pousses toi-même, dans ton terminal (pas dans Claude Code) :

1. `git push -u origin etape-1-base` (la première fois, le gestionnaire d'identifiants de Git ouvre le navigateur : connecte-toi avec le compte GitHub de l'église).
2. Dans l'onglet Actions du dépôt, attends la CI : jobs « qualite », « base » (migrations et tests pgTAP, puisque Docker manque sur ce poste) et « e2e ».
3. Si la CI est verte et l'étape relue, ouvre une pull request et fusionne sur `main`. Sans offre payante, GitHub ne protège pas `main` sur un dépôt privé : la règle « fusion seulement avec la CI verte » se tient à la main.

## Si quelque chose ne marche pas

- Un hook bloque une écriture : le message explique pourquoi. C'est voulu. Une migration déjà suivie par git ne se modifie pas : crée une nouvelle migration (`npx supabase migration new nom`). Une migration créée pendant l'étape et pas encore commitée se corrige librement.
- Un hook refuse « par précaution » : il n'a pas pu lire son entrée ou lancer node ou git. Vérifie que node et Git Bash répondent, puis recommence.
- `git`, `npm` ou `bash` échouent sans raison claire : vérifie que tu travailles bien dans `C:\Users\GraceManassePASSIDEM\dev\pilotage-ejp`, pas dans Documents ni OneDrive (accès contrôlé aux dossiers).
- `npx supabase start` ou `npx supabase test db` échouent en local : c'est attendu tant que Docker manque. Envoie la branche et lis le job « base » de la CI.
- Le MCP Supabase ne répond pas : relance `/mcp` et reconnecte-toi avec le compte de l'organisation EJP TECH. Le message « Resource must be a valid MCP endpoint » veut dire que l'adresse du serveur est invalide : vérifie l'identifiant du projet dans `.mcp.json` (et `SUPABASE_DEV_PROJECT_REF` si tu l'as enregistrée).
- Les tests RLS échouent : ne pas désactiver la RLS pour « faire passer ». Demander à `rls-auditor` d'analyser l'échec.
