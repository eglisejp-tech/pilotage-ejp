# Conception : export hebdomadaire chiffré par clé publique, lancé par Claude Code

**Décision de la personne responsable, 26 octobre 2026** : conception validée (« Oui vas-y »),
avec les réponses « Proposé » aux questions Q1 à Q10 (décision T79). Implémentée sur la branche
`etape-8-export-chiffre`. Base de travail : `origin/main` (2e3aabf).

**Changements à la validation** (reportés dans les sections concernées) :

1. **G0 disparaît comme geste de la personne** : le hook et `CLAUDE.md` refusent à Claude toute
   commande Supabase distante hors des formes du script, et `db dump` brut doit rester refusé. La
   première étape de l'action `export` fait donc elle-même ce contrôle : essai à blanc capturé dans
   une variable, jamais affiché ; si la ligne `PGPASSWORD` manque ou si Docker est demandé, arrêt
   net « option B nécessaire », sans rien montrer de la sortie de la CLI. Le premier `export` lancé
   après la fusion sert de test.
2. **G1 en binaires portables** : `winget` n'existe pas sur ce poste. `age` vient de la release
   officielle de GitHub, `pg_dump` de l'archive zip d'EDB, chacun vérifié par l'empreinte publiée,
   dans `C:/Users/GraceManassePASSIDEM/outils/` (commandes exactes : `docs/exploitation.md`, 9.2).
   Le script y trouve les outils (sinon le PATH) et vérifie leurs versions.
3. **G2 à G4 restent à la personne** : en attendant G4, `main` porte une valeur d'attente que
   l'action refuse avec un message clair.

**But en une phrase** : Claude Code lance l'export du lundi sur un « oui », sans détenir aucun
secret et sans voir une seule donnée en clair ; seule la personne (et la deuxième personne du
coffre) peut le déchiffrer.

---

## 0. Les choix structurants, en bref

1. **Chiffrement par clé publique avec `age`**. Le script chiffre pour une clé publique écrite sur
   `main` ; la clé privée vit au coffre et n'entre jamais sur le poste où tourne Claude Code. Claude
   peut produire l'export, il ne peut pas le lire : c'est une garantie mathématique, pas une règle.
2. **En flux** : `pg_dump | age > fichier`. Le clair passe d'un processus à l'autre en mémoire et ne
   touche jamais le disque. Un export interrompu laisse au plus un morceau chiffré, effacé.
3. **Connexion sans secret à saisir** : le script obtient de la CLI les identifiants temporaires du
   rôle de connexion (le même mécanisme que `migrer`), les lit en mémoire et les passe au seul
   `pg_dump`. Ils ne s'affichent jamais. Il faut installer `pg_dump` 17 et `age` sur le poste.
4. **Une seule forme nouvelle** : `bash scripts/production.sh export`, sans argument, seule dans la
   commande. Le hook l'accepte sans demander (elle n'écrit rien en production) ; Claude demande
   d'abord « Je lance l'export ? » dans la conversation. Le hook refuse le script s'il diffère, octet
   pour octet, de celui de `main` lu sur l'adresse officielle du dépôt, et lance à la place une
   copie extraite de ce `main` (section 6).
5. **Ce que Claude voit** : nom du fichier, taille, empreinte SHA-256, nombre de tables du
   sommaire, clé utilisée, dernière migration. Aucune ligne, aucun nombre de lignes, aucun texte.
6. **Contenu inchangé** : schémas `public` et `private`, structure et données, comme la section 9.2
   d'aujourd'hui. Ni `auth` (emails, mots de passe, double authentification), ni droits, ni rôles.
7. **Stockage** : un dossier local hors de tout dépôt, 28 jours ; la personne copie l'export de la
   semaine sur le Drive des exports. `migrer` refuse de partir sans export du jour (heure de Paris).
8. **Restauration** par la personne seule, jamais sur le poste de Claude, avec un script
   `restaurer.sh` ; la CI l'essaie à chaque run du job `base`, avec une paire de clés d'essai
   générée dans le job et le jeu d'exemple fictif.
9. **T52 tient** : Anthropic ne reçoit aucune donnée. La page Confidentialité ne change pas. Le
   registre des traitements corrige deux phrases.
10. **Gestes de la personne** : deux outils à installer (Claude peut lancer l'installation après
    relecture), une paire de clés à créer et ranger au coffre, une clé publique à donner, une
    restauration d'essai, la copie hebdomadaire sur le Drive.

Les 10 questions à trancher sont à la section 14, chacune avec sa réponse « Proposé ».

---

## 1. Besoin

- Sur l'offre gratuite, **seul l'export protège les données** : pas de sauvegarde de Supabase
  (`docs/exploitation.md:1330-1333`, T52). Un export en retard, c'est une semaine de saisies de
  plus qui peut se perdre.
- L'export du lundi est souvent en retard : il demande deux secrets du coffre (mot de passe de la
  base, phrase secrète de `gpg`) et un moment de la personne. Le 26 octobre, une migration est
  partie sans export du jour (`docs/exploitation.md:1657`).
- Claude Code lance déjà migrations et Edge Functions (7.3 bis). Il pourrait lancer l'export, à
  trois conditions : ne détenir aucun secret, ne voir aucune donnée, et ne pas pouvoir déchiffrer
  ce qu'il produit.

---

## 2. Faits établis (lecture du code, des documents et du poste, 26 octobre 2026)

| Fait                                                                                                                                                                                                                                                                    | Source                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| L'export actuel demande le mot de passe de la base (tapé à l'invite) et la phrase secrète de `gpg --symmetric`, toutes deux au coffre.                                                                                                                                  | `docs/exploitation.md:1347-1360`, `:294`                                                                                        |
| L'export contient `public` et `private`, textes libres compris : il est sensible et ne vit jamais en clair.                                                                                                                                                             | `docs/exploitation.md:1344-1345`                                                                                                |
| Claude ne fait jamais l'export ; 7.3 bis le laisse à la personne et fait demander s'il est fait avant `migrer`.                                                                                                                                                         | `docs/exploitation.md:50-53`, `:826-828`, `:848-849`                                                                            |
| Règle 8 : export le même jour avant toute migration.                                                                                                                                                                                                                    | `docs/exploitation.md:626-629`, `:654`                                                                                          |
| Le script vérifie le clone (projet relié, aucune modification, CLI du lock) avant chaque action ; il ne lit aucune donnée.                                                                                                                                              | `scripts/production.sh:2-4`, `:19-21`, `:28-47`                                                                                 |
| Le hook n'accepte que cinq formes exactes, refuse tout autre usage du script et tout `db dump` direct de la CLI.                                                                                                                                                        | `.claude/hooks/garde-production.sh:35-46`                                                                                       |
| Les réglages autorisent les cinq formes et refusent `npx supabase db dump *`, `--linked`, `--db-url`.                                                                                                                                                                   | `.claude/settings.json:40-44`, `:61-64`                                                                                         |
| La CLI fixée est la 2.122.0. Dans la 2.118.0 installée, l'essai à blanc de `db dump` « imprime le script pg_dump », dont les premières lignes sont `export PGHOST="$PGHOST"` ... `export PGPASSWORD="$PGPASSWORD"`, et appelle `pg_dump --role "postgres"`.             | `package-lock.json` ; chaînes de `node_modules/@supabase/cli-windows-x64/bin/supabase.exe`                                      |
| La CLI crée un rôle de connexion temporaire par l'API (`cli/login-role`, `cli_login_postgres`, options `read_only` et `ttl_seconds`) : c'est lui qui évite le mot de passe de la base. **Conséquence** : la sortie de l'essai à blanc contient un mot de passe valable. | mêmes chaînes du binaire ; constat de la personne pour `migrer`                                                                 |
| Sur ce poste : ni `pg_dump`, ni `pg_restore`, ni `psql`, ni `age`. `gpg` 2.4.9 (Git pour Windows) et `sha256sum` sont là. Docker Desktop est installé mais ne tourne pas. Le fichier `~/.supabase/access-token` n'existe pas.                                           | commandes locales ; `CLAUDE.md` (Docker)                                                                                        |
| La section 9.2 dit que « le poste a les outils client de PostgreSQL 17 » : c'est faux pour ce poste.                                                                                                                                                                    | `docs/exploitation.md:1343`                                                                                                     |
| La section 4.1 dit qu'aucun secret de production n'est sur le poste de Claude ; or le clone relié et la CLI connectée y sont depuis 7.3 bis.                                                                                                                            | `docs/exploitation.md:280-281`, `:642-643`                                                                                      |
| La base est en PostgreSQL 17 ; `db reset` charge le jeu d'exemple.                                                                                                                                                                                                      | `supabase/config.toml:41`, `:65-67`                                                                                             |
| `compte.user_id` référence `auth.users` : sans `auth`, un compte restauré ailleurs n'a plus d'identité de connexion.                                                                                                                                                    | `supabase/migrations/20260930163150_types_et_tables.sql:27`                                                                     |
| La base impose `saisi_le` et `saisi_par` par déclencheur, et des déclencheurs refusent `TRUNCATE` sur les tables en ajout seulement : un chargement doit couper les déclencheurs (mode réplique), sinon les dates seraient réécrites.                                   | `20260930163154_fonctions_aide_et_triggers.sql:92-93`, `:250`, `:254` ; `20261007100000_indicateurs_definition.sql:306`, `:433` |
| Des migrations insèrent des données de référence (ministère FIJ, indicateurs) : charger un export sur une base neuve demande de vider d'abord les tables.                                                                                                               | `20260930163207_donnees_reference.sql:15`                                                                                       |
| Aucun rôle propre, aucun bucket de stockage, ni `cron` ni `vault` dans les migrations.                                                                                                                                                                                  | `supabase/migrations` (recherche)                                                                                               |
| Page Confidentialité : « une copie chiffrée chaque semaine ; les 4 dernières sont gardées. Un texte masqué reste dans ces copies jusqu'à leur suppression, 4 semaines au plus. » (validée le 8 octobre).                                                                | `src/pages/PageConfidentialite.tsx:185-187` ; `docs/decisions.md:1089`                                                          |
| Registre : « Les données de production ne sont jamais copiées vers le poste de développement ni la CI. » Supabase y est cité pour les « sauvegardes » ; le Drive des exports n'y figure pas.                                                                            | `docs/conformite/registre-traitements.md:126-127`, `:56`, `:149`                                                                |
| T52 : Claude ne lit pas la base, car Anthropic n'est pas déclaré sous-traitant.                                                                                                                                                                                         | `docs/decisions.md:1084`                                                                                                        |
| Le job `base` de la CI démarre la pile locale (Docker) ; un envoi de documentation seule ne lance que `qualite`.                                                                                                                                                        | `.github/workflows/ci.yml:63-70`, `:137-140` ; `docs/exploitation.md` 7.8                                                       |
| Git Bash ignore `TZ=Europe/Paris` : `date` donne l'heure UTC.                                                                                                                                                                                                           | constat du poste (mémoire du projet)                                                                                            |

---

## 3. Scénarios réels (critères d'acceptation)

**S1. L'export du lundi, sur un « oui ».** Étant donné le lundi 2 novembre, 9 h 10 à Paris, le
clone propre et relié, `age` et `pg_dump` 17 installés, la clé publique sur `main` ; quand Claude
demande « Je lance l'export du lundi ? » et que la personne répond « oui », alors Claude lance
`bash scripts/production.sh export`, le hook l'accepte sans confirmation, et la sortie tient en
sept lignes : fichier `ejp-2026-11-02-0910.dump.age`, taille, empreinte SHA-256, nombre de tables du
sommaire, clé publique entière (`age1...`, elle n'est pas secrète), dernière migration, exports
gardés. Claude propose la ligne du registre des opérations. Aucune donnée n'apparaît.

**S2. L'export avant une migration.** Étant donné une migration validée et `preparer` fait ; quand
Claude lance `migrer` sans export du jour, alors le script s'arrête : « Arrêt : aucun export
aujourd'hui (heure de Paris). Lancez d'abord export. » Quand Claude lance `export` puis `migrer`,
la migration part.

**S3. La personne restaure un export sur une pile locale.** Étant donné sa machine (pas le poste de
Claude) avec Docker, le dépôt, `age` et sa clé privée copiée du coffre ; quand elle met le dépôt au
commit indiqué par la fiche de l'export, lance `npx supabase start`, `npx supabase db reset
--no-seed`, puis `bash scripts/export/restaurer.sh <fichier.age> <clé>`, alors le script vérifie
l'empreinte, déchiffre une première fois sans rien écrire (intégrité), puis charge les données dans
une seule transaction, déclencheurs coupés ; les `saisi_le` sont ceux de la production ; il affiche
le nombre de lignes par table, égal à celui de la production du même jour (annexe, section 19).

**S4. Une clé perdue.** Étant donné la clé privée introuvable au coffre ; alors les exports existants
sont illisibles, mais la base est intacte. La personne crée une nouvelle paire (G2, G3), donne la
clé publique, Claude l'écrit sur une branche, la personne valide l'envoi sur `main`, Claude lance
`export` aussitôt, et les anciens exports sont supprimés. La fenêtre de risque va de la découverte
au nouvel export (quelques heures).

**S5. Une clé compromise.** Étant donné la clé privée vue par une personne non autorisée ; alors :
nouvelle paire et nouvel export comme en S4 ; la personne rechiffre sur sa machine les exports de
moins de 28 jours pour la nouvelle clé (ou les supprime), supprime les anciens fichiers et vide la
corbeille du Drive ; si les fichiers ont pu être lus aussi (accès au Drive), c'est une violation de
données possible : la coordination et EJP Tech décident le jour même d'une déclaration à la CNIL
(72 heures, `docs/exploitation.md` section 12).

**S6. Un export interrompu.** Étant donné un export en cours ; quand le réseau tombe, le poste se met
en veille ou la commande est arrêtée, alors : `pipefail` rend l'échec, le fichier
`...dump.age.partiel` (chiffré, jamais en clair) est effacé, aucun export ancien n'est supprimé,
la sortie dit « Arrêt : export incomplet, aucun fichier gardé ». Si le processus est tué sans
nettoyage, le prochain `export` efface les `.partiel` restants. Le rôle temporaire expire seul.

**S7. Rien en clair, nulle part chez Claude.** Étant donné un export réussi ; alors : sur le disque,
le dossier des exports ne contient que des `.dump.age` et leurs fiches `.json` (sans donnée) ; dans
le terminal, seules les lignes fixes de S1 ; dans le contexte de Claude, rien d'autre ; le mot de
passe temporaire n'est jamais écrit ni affiché ; Claude ne lit jamais un `.dump.age`.

**S8. Une erreur de la base.** Étant donné un `pg_dump` qui échoue (version du serveur plus récente,
rôle temporaire expiré) ; alors la sortie dit l'étape et au plus 10 lignes d'erreur de `pg_dump`,
coupées à 200 caractères, après masquage de tout `PGPASSWORD=`, `password=` et de toute adresse
`postgres://...`. Rien n'est gardé.

**S9. Une forme inexacte.** Quand Claude écrit `bash scripts/production.sh export --verbose`,
`... export; ls`, une écriture découpée (`"export"`, `produ"ction".sh`, `prod*.sh`, une variable, une
copie renommée, `source`, `env`), ou lance le script alors que `scripts/production.sh` ou un fichier
de `scripts/export/` diffère de `main` dans son dossier (même caché par `assume-unchanged`,
`skip-worktree`, un filtre ou un `origin/main` local déplacé), alors le hook refuse. `age -d`,
`age --decrypt` et `age-keygen` lancés par Claude sont refusés aussi, même écrits autrement.

**S10. Un texte masqué pour donnée personnelle.** Étant donné un masquage (`masquer_texte`) ; alors
Claude propose un export tout de suite ; après le « oui » et l'export, Claude supprime les exports
locaux plus anciens à la demande de la personne, qui supprime ceux du Drive et vide la corbeille
(sinon le texte resterait 30 jours de plus dans la corbeille du Drive).

**S11. La CI essaie la restauration.** Étant donné le job `base` et le jeu d'exemple ; alors le job
génère une paire d'essai, exporte la base locale par le même code que la production, vérifie S7,
remet la base à zéro sans le jeu d'exemple, restaure avec `restaurer.sh`, et compare, table par
table, le nombre de lignes et une empreinte md5 des lignes triées : égalité exacte. Un `.age`
tronqué fait échouer `restaurer.sh` sans rien charger.

---

## 4. Options étudiées

### 4.1 Outil de chiffrement

| Option                                    | Pour                                                                                                                                                        | Contre                                                                                                                                                                         | Verdict             |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| **`age`** (X25519, ChaCha20-Poly1305)     | Clé publique d'une ligne (`age1...`), aucun trousseau, aucune expiration, chiffrement en flux authentifié (un fichier tronqué est détecté), deux commandes. | Outil à installer sur le poste, sur la machine de restauration et dans la CI (paquet `age` d'Ubuntu 24.04).                                                                    | **Recommandé** (Q1) |
| GPG par clé publique (`--recipient-file`) | Déjà sur le poste (Git pour Windows), standard OpenPGP.                                                                                                     | Trousseau et base de confiance, expiration par défaut des clés, `pinentry` capricieux sous Git Bash, nombreuses options : plus d'erreurs possibles le jour d'une restauration. | Secours si refus    |
| `openssl cms` avec certificat             | Déjà sur le poste.                                                                                                                                          | Certificat à fabriquer, flux mal pris en charge, commandes obscures.                                                                                                           | Écarté              |
| Chiffrement écrit en Node                 | Aucun outil.                                                                                                                                                | Cryptographie maison.                                                                                                                                                          | Écarté              |
| GPG symétrique (aujourd'hui)              | En place.                                                                                                                                                   | La phrase secrète sert à chiffrer : quiconque chiffre peut déchiffrer. Claude devrait la détenir.                                                                              | Retiré              |

### 4.2 Flux ou fichier temporaire

- **Flux** (recommandé) : `pg_dump --format=custom` écrit sur sa sortie, `age` chiffre au fil de
  l'eau. Le clair ne vit qu'en mémoire, quelques secondes.
- Fichier temporaire puis chiffrement : écarté. Le clair resterait sur le disque (récupérable même
  effacé, lu par l'antivirus ou l'indexation), ce que la section 9.2 interdit déjà.

### 4.3 Comment se connecter sans secret

| Option                                                                                                                                                                        | Verdict                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Essai à blanc de la CLI** (`db dump --linked --dry-run`), lu en mémoire par le script : on n'en garde que les cinq lignes `export PG...`, puis notre `pg_dump` 17 local. | **Recommandé** (Q2). Aucun secret nouveau, le même rôle temporaire que `migrer`, nos options de `pg_dump`. Contrôlé par la première étape de l'action (« option B nécessaire » sinon).      |
| B. `db dump` de la CLI en vrai, sortie vers `age`.                                                                                                                            | Secours. Plus simple, mais lance `pg_dump` dans Docker, qui ne tourne pas sur ce poste. Possible si la personne démarre Docker Desktop avant l'export.                                      |
| C. API de gestion appelée par le script avec le jeton de la CLI.                                                                                                              | Écarté : aucun fichier de jeton sur le poste (il est sans doute dans le gestionnaire d'identifiants de Windows), il faudrait l'en extraire ; on referait à la main ce que la CLI fait déjà. |
| D. Mot de passe de la base tapé par la personne.                                                                                                                              | Écarté : c'est la situation d'aujourd'hui.                                                                                                                                                  |
| E. Rôle dédié en lecture, mot de passe dans un fichier du poste.                                                                                                              | Écarté : un secret de plus, lisible par toute commande Bash de Claude.                                                                                                                      |
| F. Export par la CI GitHub (secret du dépôt).                                                                                                                                 | Écarté : les données passeraient en clair sur les machines de GitHub, prestataire non déclaré ; mot de passe de la base dans GitHub (interdit, 4.2).                                        |
| G. Export dans la base (`pgcrypto`, `pgp_pub_encrypt`).                                                                                                                       | Écarté : pas un vrai `pg_dump`, restauration maison.                                                                                                                                        |

### 4.4 Où vit la clé publique

- **Recommandé** : `scripts/export/destinataires.txt` sur `main`, lu par le script dans le clone
  réservé par `git show <SHA>:...`, après un `fetch` depuis l'adresse officielle du dépôt (refspec
  explicite, réécritures d'adresse neutralisées), jamais depuis le `origin` du clone. Une clé
  changée dans une branche de travail ne sert jamais ; tout changement passe par l'accord de la
  personne pour `main` et se voit dans l'historique. Le script affiche la clé utilisée, entière.
- Écarté : un fichier du poste hors dépôt (Claude pourrait le remplacer sans que personne ne le
  voie) ; une variable GitHub (rien ne la lit sur le poste).

### 4.5 Qui détient quoi

| Qui                                  | Détient                                                                 | Ne détient jamais                                    |
| ------------------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------- |
| La personne et la deuxième du coffre | Clé privée (coffre), accès au Drive des exports, restauration           |                                                      |
| Claude Code                          | Rien de secret. Lance `export`, lit taille, empreinte, nombre de tables | Clé privée, mot de passe, une donnée, un `.dump.age` |
| Le poste (clone réservé)             | Jeton de la CLI (déjà là depuis 7.3 bis), exports chiffrés de 28 jours  | Clé privée, export en clair                          |
| `main` (GitHub)                      | Clé publique (pas secrète)                                              | Clé privée, export                                   |
| CI                                   | Paire d'essai créée et jetée à chaque run, données fictives             | Donnée de production, clé réelle privée              |
| Google Drive                         | Exports chiffrés                                                        | Clé privée                                           |
| Supabase                             | Les données en clair (déjà, sous-traitant déclaré)                      |                                                      |

---

## 5. L'action `export`, pas à pas

0. **Environnement propre** (toutes les actions) : `set +xv` en première ligne, puis le script se
   relance sous `env -i` (PATH fixé, sans `~/bin` ; seules les variables utiles à Windows, node,
   git et la CLI), par `/usr/bin/bash --noprofile --norc`. Aucune trace héritée (`-x`,
   `SHELLOPTS`, `BASH_ENV`, profil) ne peut donc afficher le mot de passe temporaire.
1. **Garde-fous existants** : clone relié à `ugbitornbspatpcowlvg`, sans modification locale, CLI
   du lock. `set -euo pipefail`, `umask 077`, jamais `set -x`.
2. **Outils** : `age` et `pg_dump` du dossier des outils seulement (ni `EXPORT_PG_BIN`, ni PATH),
   chacun avec les DLL que `pg_dump` charge, à l'empreinte SHA-256 épinglée dans
   `scripts/export/commun.sh` ; une DLL inconnue dans `pgsql/bin` est refusée. `pg_dump` de la
   majeure de la base (17), `age` 1.x. Sinon : « Arrêt : outil absent », « empreinte inattendue »
   ou « DLL inattendue ».
3. **Clé** : `fetch` du clone depuis l'adresse officielle du dépôt (refspec explicite, sans
   configuration globale ni système, une règle `url.*.insteadOf` du clone arrête tout), puis
   `git show <SHA de main>:scripts/export/destinataires.txt` ; exactement une ligne `age1` valide,
   sinon arrêt.
4. **Nom** : date et heure de Paris calculées par `node` (Git Bash ignore `TZ`) :
   `ejp-AAAA-MM-JJ-HHMM.dump.age`, dans le dossier des exports (section 8). Les `.partiel` et
   `.journal` restants sont effacés. Mode TLS : `verify-full` avec le certificat d'autorité de
   Supabase (`scripts/export/supabase-ca.crt`, public) dès qu'il est dans le dépôt, sans repli ;
   `require` tant qu'il n'y est pas, annoncé à l'écran (geste G7).
5. **Identifiants** : la sortie de l'essai à blanc de la CLI va dans une variable, jamais à
   l'écran ni sur le disque. Le script y cherche exactement une ligne
   `export PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE="..."` de chaque sorte, sans `eval` ; sinon
   « Arrêt : identifiants temporaires introuvables », sans rien montrer de la sortie. La variable
   est vidée aussitôt ; les cinq valeurs ne vont qu'à l'environnement de `pg_dump`, lancé sans
   aucune variable héritée (ni `PGSERVICE`, ni `PGHOSTADDR`, ni `PGSSLMODE`...).
6. **Flux** : `pg_dump --format=custom --schema=public --schema=private --no-owner --no-privileges
--role=postgres`, puis `tee` vers un contrôle de forme (`pg_restore --list`, qui compte les
   entrées `TABLE DATA` puis lit le flux jusqu'au bout), puis `age --encrypt -R <clé>` vers
   `<nom>.partiel`.
7. **Contrôles** : tous les codes de sortie à 0 ; taille au-dessus d'un seuil (Proposé : 10 Kio) ;
   en-tête `age-encryption.org/v1` ; au moins une table au sommaire. Puis `mv` vers le nom final.
8. **Fiche** `ejp-AAAA-MM-JJ-HHMM.json`, en clair, sans donnée : date de Paris, taille, SHA-256, clé publique,
   commit de `main`, dernière migration appliquée (`migration list`, comme `etat`), versions de
   `pg_dump`, `age` et de la CLI, nombre de tables.
9. **Purge** (après succès seulement) : fichiers `ejp-AAAA-MM-JJ-HHMM.dump.age` et leur fiche de
   plus de 28 jours (date du nom), jamais le plus récent, rien d'autre.
10. **Sortie** : les sept lignes de S1. En cas d'échec : l'étape, le code, et l'extrait filtré de S8.

Le journal de `pg_dump` (noms de tables, erreurs) s'écrit dans le dossier des exports
(`<nom>.journal`), jamais dans le dossier temporaire du système, et s'efface à la fin.

`migrer` gagne une vérification (Q6) : un `.dump.age` complet daté d'aujourd'hui (Paris) existe,
avec sa fiche `.json`, au moins 10 Kio, l'en-tête `age-encryption.org/v1`, et le nom, la taille et
l'empreinte SHA-256 notés dans la fiche.

---

## 6. Garanties techniques

| Garantie                                    | Comment                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Preuve                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Claude ne peut pas déchiffrer               | La clé privée n'est jamais sur le poste ; le hook refuse `age -d`, `age --decrypt`, `age-keygen`, après normalisation (guillemets et barres obliques inverses retirés, motifs et variables en position de commande, `-decrypt`, `--decrypt=...`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Cryptographie ; test du hook                                   |
| Une seule forme exacte                      | Hook : `^bash scripts/production\.sh export$` accepté sans demander. Refusés, après normalisation : toute autre forme qui cite le script avec une action ; `bash`, `sh`, `source`, `.` ou `env` qui vise un fichier de `scripts/` (seul `bash -n scripts/<fichier>.sh` passe) ; un interpréteur ou un fichier `.sh` suivi d'une action (copie renommée, motif, variable, lecture sur l'entrée standard) ; une copie du script (`cp`, `tee`, redirection)                                                                                                                                                                                                                                                                                                                                                                       | Test du hook (vitest, job `qualite`)                           |
| Le script lancé est celui de `main`         | Le hook lit le SHA de `main` par `git ls-remote` sur l'adresse officielle fixe (`https://github.com/eglisejp-tech/pilotage-ejp.git`, sans configuration globale ni système), vérifie les objets de ce commit par leur empreinte, puis compare octet pour octet (le calcul de `git hash-object --no-filters`) `scripts/production.sh` et chaque fichier de `scripts/export/` du dossier de la commande à leurs blobs ; un fichier en plus (suivi, ignoré ou non) ou un lien est refusé. `assume-unchanged`, `skip-worktree`, un filtre `clean` ou un `origin/main` local déplacé ne cachent donc plus rien. Le hook réécrit ensuite la commande (`updatedInput`) : `/usr/bin/bash --noprofile --norc '<copie>/scripts/production.sh' <action>`, où `<copie>` est un dossier temporaire neuf rempli à partir des objets vérifiés | Test du hook                                                   |
| La clé publique est celle de `main`         | `fetch` du clone depuis l'adresse officielle, refspec explicite vers `refs/remotes/origin/main`, réécritures d'adresse neutralisées (`-c`, configuration globale et système ignorées, règle du clone refusée), puis `git show <SHA>:...` ; la clé s'affiche entière                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Test de `export_recuperer`                                     |
| Les binaires sont ceux installés            | `age.exe`, `pg_dump.exe` et ses DLL de `pgsql/bin` : empreintes SHA-256 épinglées dans `scripts/export/commun.sh`, DLL inconnue refusée ; jamais `EXPORT_PG_BIN` ni le PATH en production                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Test des empreintes ; contrôle sur le poste                    |
| `pg_dump` ne reçoit rien d'hérité           | Variables exportées retirées dans un sous-shell (ni `PGSERVICE`, ni `PGHOSTADDR`, ni `PGSSLMODE`, ni `PGPASSFILE`...), puis seulement les `PG*` utiles, par l'environnement, jamais par les arguments. Mode TLS fixé par le script : `verify-full` avec le certificat de Supabase du dépôt, sinon `require` annoncé, sans repli                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Test du flux (outils simulés)                                  |
| La sortie ne montre que la forme du fichier | Lignes fixes ; erreurs filtrées et masquées (S8) ; sortie de la CLI jetée en cas de succès                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | CI : sortie comparée à une liste blanche                       |
| Le clair ne touche jamais le disque         | Tube `pg_dump`, `tee`, `age` ; aucune option `--file` ; le `.partiel` est déjà chiffré                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | CI : seuls `.dump.age` et `.json` sont créés                   |
| Le mot de passe temporaire ne s'affiche pas | Variable du script, jamais `echo` ; relance sous `env -i` sans trace héritée (`set +xv`, ni `SHELLOPTS`, ni `BASH_ENV`, ni profil) ; masquage dans les erreurs ; journal de `pg_dump` dans le dossier des exports, effacé ; le hook refuse tout `db dump` direct de Claude                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Test de la lecture stricte ; test de la relance sous `bash -x` |
| Un export incomplet ne passe pas pour bon   | Nom final seulement après tous les contrôles ; `age` authentifie le flux, un fichier tronqué ne se déchiffre pas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | CI : fichier tronqué refusé                                    |
| Les données restaurées sont exactes         | Mode réplique, une transaction, deux passages (intégrité puis chargement)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | CI : lignes et md5 égaux                                       |

**Risque résiduel de la copie** : la copie lancée vit dans un dossier temporaire du même compte
Windows. Entre sa création par le hook et son lancement (le temps de votre confirmation pour
`migrer` et `fonction`), un programme de ce compte pourrait la modifier ; une fois lancée, le
script se relit encore une fois, à la relance sous `env -i`. Le hook nettoie les copies de plus de
12 heures. La première ligne du script dit d'où il tourne (« Script : copie de main <SHA> ») : si
elle ne cite pas la copie, Claude Code n'a pas appliqué la réécriture et le script vérifié dans le
dossier a été lancé tel quel. La CLI Supabase du clone n'est pas épinglée : elle change à chaque
mise à jour du `package-lock.json`, et `npm ci` en vérifie l'intégrité à l'installation.

**Limite de fond** : Claude Code, le jeton de la CLI, `pg_dump` et les outils tournent sous le
même compte Windows. Les gardes du hook et du script protègent contre une erreur, pas contre un
agent qui chercherait à les contourner ; la garantie forte est que le fichier exporté ne se lit pas
sans la clé privée du coffre.

---

## 7. Ce que l'export contient, ou non

| Contient                                                                                                                                                                             | Ne contient pas                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schémas `public` et `private` : tables, vues, fonctions, politiques RLS, déclencheurs, séquences, et **toutes les lignes** (chiffres sensibles, textes libres, journal, prénoms T56) | **Droits** (`--no-privileges`) et **propriétaires** (`--no-owner`) : ils reviennent par les migrations                                                    |
| Format `custom` de `pg_dump`, compressé                                                                                                                                              | **`auth`** : comptes de connexion, emails, empreintes de mots de passe, secrets de double authentification, sessions (Q7)                                 |
|                                                                                                                                                                                      | **Rôles** (aucun rôle propre), **stockage** (aucun fichier stocké), `cron` et `vault` (inutilisés), historique des migrations (la fiche donne la version) |
|                                                                                                                                                                                      | Réglages Auth, SMTP, secrets des Edge Functions, journaux techniques : tableau de bord et coffre (section 6 de l'exploitation)                            |

---

## 8. Stockage et conservation

- **Poste** : `C:/Users/GraceManassePASSIDEM/exports-ejp/`, hors de tout dépôt (aucun `git add`
  possible), hors d'un dossier synchronisé (à vérifier : ni OneDrive ni Bureau). 28 jours, purge
  par le script.
- **Drive** : le dossier des exports existant (accès : les deux personnes du coffre). Chaque lundi,
  la personne y copie le dernier export et sa fiche, supprime ceux de plus de 28 jours et **vide la
  corbeille** du Drive (Q5).
- **Durée** : 28 jours, ce que la page Confidentialité promet (« 4 semaines au plus »). Le jour
  d'une migration, un export de plus peut exister ; il suit la même règle (Q4).
- **Exports `.gpg` d'avant** : ils vieillissent et disparaissent en 4 semaines ; la phrase secrète
  quitte alors le coffre.

---

## 9. Restauration, et son essai

**Par la personne** (section 9.3 réécrite), jamais sur le poste de Claude (Q8) :

1. Machine avec Docker, Node, le dépôt et `age`. Copier la clé privée du coffre dans un fichier
   temporaire.
2. Vérifier l'empreinte (`sha256sum`) avec la fiche ; mettre le dépôt au commit de la fiche ;
   `npm ci`, `npx supabase start`, `npx supabase db reset --no-seed`.
3. `bash scripts/export/restaurer.sh <fichier.age> <clé>` : premier passage, déchiffrement complet
   vers `pg_restore --list` (si le fichier est tronqué ou faux, arrêt avant tout chargement) ;
   second passage, dans **une seule transaction** : mode réplique (déclencheurs coupés, dates
   gardées), vidage des tables de `public` et `private`, chargement des données, puis nombre de
   lignes par table. La cible est la pile locale (`127.0.0.1:54322`) seulement. `pg_restore` est
   celui du conteneur de la base (`docker exec`) : rien à installer d'autre que `age`.
4. Comparer avec la production du même jour (annexe, requête de comptage).
5. `npx supabase stop --no-backup`, supprimer le fichier de clé, noter au registre.

Sans Docker : un projet Supabase gratuit temporaire (9.3 actuelle), avec une cible donnée
explicitement. La restauration **en production** (7.5, dernier recours) reste un geste de la
personne, décidé avec la coordination ; ce lot ne l'automatise pas.

**Par la CI** (S11) : oui, dans le job `base`, après pgTAP, environ une minute. Paire générée par
`age-keygen` dans le job (aucune clé privée dans le dépôt), `age` et le client PostgreSQL 17
installés par `apt`, identifiants locaux lus par la même fonction que la production (essai à blanc
avec `--local`), jeu d'exemple fictif. Comme le job tourne à chaque changement de code, chaque
nouvelle migration prouve qu'elle reste restaurable (un nouveau déclencheur en ajout seulement, par
exemple).

---

## 10. Effets sur les documents et les règles

- **T52** : inchangé. Anthropic ne reçoit que des métadonnées (taille, empreinte, nombre de tables,
  version) : aucune donnée personnelle, donc pas de sous-traitance nouvelle. Le fichier chiffré ne
  change rien à condition que Claude ne puisse ni le lire en clair ni le déchiffrer (section 6).
- **Page Confidentialité** : inchangée (`PageConfidentialite.tsx:185-187` reste vraie), pas de
  nouvelle `VERSION_CONDITIONS`.
- **Registre des traitements** : la phrase des lignes 126-127 devient « Les données de production ne
  sont jamais copiées en clair vers le poste de développement ni la CI ; le poste garde les exports
  chiffrés de 28 jours, illisibles sans la clé privée du coffre. » ; ajouter le Drive (Google) comme
  lieu des exports chiffrés, clé hors de Google ; noter que Supabase ne fait pas de sauvegarde sur
  l'offre gratuite (ligne 56).
- **`docs/exploitation.md`** : 1 (Claude lance l'export, ne le lit jamais) ; 4.1 et 4.2 (clé privée
  et clé publique à la place de la phrase secrète ; dire que le jeton de la CLI est sur ce poste
  depuis 7.3 bis) ; 7.3 bis (ligne `export`, ordre `preparer`, `export`, `migrer`) ; 9.2 et 9.3
  réécrites ; 12 (clé compromise, S5) ; 16 (l'export final s'ouvre avec la clé privée ; Proposé :
  la personne le rechiffre pour une clé de la coordination) ; 17 (une ligne par export) ; 18.
- **`docs/decisions.md`** : entrée T79 après validation.

---

## 11. Risques

| Risque                                                                                  | Effet                                    | Parade                                                                                                                                     |
| --------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| L'essai à blanc demande Docker, ou le rôle temporaire meurt avec la CLI avant `pg_dump` | L'option A ne marche pas                 | Première étape de l'action : arrêt « option B nécessaire » ; alors option B (Docker démarré pour l'export)                                 |
| Une version de la CLI change la forme de l'essai à blanc                                | Export en échec                          | Lecture stricte, arrêt fermé ; la CI l'essaie avec la CLI du lock                                                                          |
| La base passe en PostgreSQL 18                                                          | `pg_dump` 17 refuse                      | Message clair ; installer le client 18                                                                                                     |
| Clé perdue                                                                              | Exports illisibles                       | Coffre partagé à deux ; restauration d'essai chaque trimestre ; S4                                                                         |
| Clé compromise                                                                          | Exports lisibles par un tiers            | S5 ; violation possible (section 12)                                                                                                       |
| Un message d'erreur contient une donnée                                                 | Donnée chez Anthropic                    | Filtre, masquage, 10 lignes au plus ; les erreurs de `pg_dump` citent des tables et des commandes, en principe jamais une ligne de données |
| La purge supprime le mauvais fichier                                                    | Perte d'un export                        | Motif strict, dossier dédié, jamais le plus récent, test                                                                                   |
| La corbeille du Drive garde 30 jours                                                    | Texte masqué gardé au-delà de 4 semaines | Vider la corbeille (déjà vrai aujourd'hui)                                                                                                 |
| Poste perdu ou volé                                                                     | Exports chiffrés exposés                 | Illisibles sans la clé ; révoquer le jeton de la CLI (12)                                                                                  |
| Restauration faite sur le poste de Claude                                               | Clair et clé à portée de Claude          | Règle écrite (Q8) ; `restaurer.sh` le rappelle                                                                                             |
| Le clair en mémoire part dans le fichier d'échange de Windows                           | Résidu théorique                         | Accepté (quelques secondes, quelques Mo)                                                                                                   |

---

## 12. Gestes de la personne

| Geste | Quoi                                                                                                                                                                                                                                                                                                                                                                                                                 | Quand                            |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| G0    | Retiré à la validation : la première étape de l'action `export` fait ce contrôle (changement 1 en tête).                                                                                                                                                                                                                                                                                                             | Sans objet                       |
| G1    | Installer `age` 1.3.2 et le client PostgreSQL 17 (archive zip d'EDB) en binaires portables dans `C:/Users/GraceManassePASSIDEM/outils/`, empreintes vérifiées (`docs/exploitation.md`, 9.2) ; Claude peut lancer ces commandes après relecture.                                                                                                                                                                      | Avant le premier export          |
| G2    | Sur **sa** machine, pas dans le terminal de Claude : `age-keygen -o cle-export-ejp.txt`. Noter la ligne `Public key: age1...`.                                                                                                                                                                                                                                                                                       | Avant la fusion du lot 1         |
| G3    | Coller le contenu du fichier au coffre, entrée « Clé privée des exports » ; supprimer le fichier ; vérifier que la deuxième personne du coffre y a accès.                                                                                                                                                                                                                                                            | Avec G2                          |
| G4    | Donner la clé publique (`age1...`, elle n'est pas secrète) à Claude ; vérifier la clé entière dans la requête de fusion, puis dans la ligne « Clé » du premier export.                                                                                                                                                                                                                                               | Avec G2                          |
| G5    | Après le premier export : restauration d'essai (section 9), résultat au registre.                                                                                                                                                                                                                                                                                                                                    | La semaine du premier export     |
| G6    | Chaque lundi : copier l'export sur le Drive, supprimer ceux de plus de 28 jours, vider la corbeille.                                                                                                                                                                                                                                                                                                                 | Chaque semaine                   |
| G7    | Dans le tableau de bord de Supabase (Database Settings, SSL Configuration, « Download certificate ») : télécharger le certificat d'autorité (public, publié seulement là) et le donner à Claude, qui l'ajoute sur une branche (`scripts/export/supabase-ca.crt`) ; vérifier l'empreinte SHA-256 affichée dans la requête de fusion. Dès son arrivée sur `main`, l'export passe en `verify-full` et refuse `require`. | Avant ou après le premier export |

---

## 13. Lots et tests

- **Lot 0** : retiré (changement 1 en tête) ; le premier `export` après la fusion fait le contrôle.
- **Lot 1** (une branche, CI verte, accord pour `main`) : `scripts/export/commun.sh` (lecture
  stricte des identifiants, date de Paris, purge, fiche), `scripts/export/restaurer.sh`, action
  `export` et vérification de `migrer` dans `scripts/production.sh`, hook et réglage, étape
  d'essai dans le job `base`, documents de la section 10. Environ 300 lignes de Bash, 150 de tests.
- **Lot 2** : G1 à G4, fusion, premier export par Claude sur un « oui », G5. Quatre semaines plus
  tard : retrait des `.gpg` et de la phrase secrète.

Tests écrits d'abord (ils échouent avant, passent après) : hook (formes acceptées et refusées de
S9, script différent de `main`) ; lecture stricte (cinq lignes, ligne absente, en double ou en
trop) ; date de Paris (dimanche 23 h 30 UTC en été donne lundi) ; purge (28 jours, jamais le plus
récent, autres fichiers intacts) ; essai complet de S11 dans `base` (sortie en liste blanche,
fichiers créés, égalité des lignes et des md5, fichier tronqué refusé).

---

## 14. Questions ouvertes, avec la recommandation « Proposé »

1. **Q1. `age` ou GPG ?** Proposé : `age` (plus simple le jour de la restauration) ; GPG par clé
   publique si vous refusez un outil de plus.
2. **Q2. Connexion par l'essai à blanc de la CLI et `pg_dump` 17 local ?** Proposé : oui, contrôlé par
   la première étape de l'action ; sinon Docker démarré pour l'export.
3. **Q3. Le hook demande-t-il votre confirmation pour `export` ?** Proposé : non ; Claude vous
   demande dans la conversation et lance sur votre « oui ». L'export n'écrit rien en production et
   ne peut rien effacer de moins de 28 jours.
4. **Q4. Garder « les 4 derniers » ou « 28 jours » ?** Proposé : 28 jours, jamais le plus récent ;
   la page reste vraie (4 semaines au plus), un export de jour de migration ne chasse pas celui du
   lundi.
5. **Q5. Copie vers le Drive : à la main ou par Google Drive pour ordinateur ?** Proposé : à la
   main, le lundi (aucun logiciel de plus, et le Drive ne se mélange pas au poste).
6. **Q6. `migrer` refuse-t-il sans export du jour ?** Proposé : oui. Une exception (comme le 26
   octobre) passe par vous, à la main (7.3).
7. **Q7. Ajouter `auth` à l'export ?** Proposé : non, comme aujourd'hui. L'ajouter mettrait emails,
   empreintes de mots de passe et secrets de double authentification dans chaque export. Revers :
   si le projet entier est perdu, les comptes se recréent et leur lien avec les données demande une
   procédure à écrire (risque déjà accepté par T52).
8. **Q8. Où restaurer ?** Proposé : sur votre machine avec Docker, jamais sur le poste de Claude ;
   sinon un projet Supabase gratuit temporaire.
9. **Q9. Une seconde clé de secours ?** Proposé : non, une seule paire, au coffre partagé à deux ; à
   revoir quand la deuxième personne du coffre est désignée (section 18).
10. **Q10. Une ligne au registre des opérations par export ?** Proposé : oui, proposée par Claude
    (date, taille, 8 premiers caractères de l'empreinte).
