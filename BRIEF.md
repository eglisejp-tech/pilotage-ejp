# Brief de construction : Pilotage EJP

Ce document est la source de vérité pour construire l'application. Lis-le en entier avant d'écrire la moindre ligne. En cas de doute, pose la question plutôt que d'inventer.

Références jointes :

- `docs/reference/maquettes/` : **maquettes validées de tous les écrans, profil par profil** (direction visuelle C). Lis d'abord `LISEZMOI.md`, qui liste aussi les écrans non dessinés et les écarts connus. Pour l'apparence, elles priment sur tout le reste.
- `docs/reference/tokens.css` : couleurs, polices et tailles de la direction C, à copier dans `src/styles/tokens.css`.
- `docs/reference/prototype.html` : prototype interactif (comportement, textes, données d'exemple). Son apparence est **dépassée** par les maquettes, et ses règles le sont par ce brief.
- `docs/reference/reponse-cdc-v2.docx` : réponse au cahier des charges, version 2 (décisions produit). Quand elle contredit ce brief, ce brief fait foi.
- `docs/decisions.md` : journal des décisions (D1 à D7) et des propositions à confirmer.

---

## 1. Le produit en une phrase

**Pilotage EJP** est un outil web **temporaire** de prise d'information pour le berger et le conseil de l'Église des Jeunes Prodiges (EJP). Chaque ministère y saisit ses chiffres, événements, réunions et points d'attention. L'outil **conserve chaque saisie** pour montrer l'évolution, et affiche **qui a saisi et qui manque**. Il ne remplace aucune décision : les décisions se prennent en dehors.

La page d'accueil doit répondre en quelques secondes à quatre questions :

1. Où en sont les ministères ?
2. Qu'est-ce qui arrive prochainement ?
3. Qu'est-ce qui demande une attention ou une décision ?
4. Quelles informations sont à jour, lesquelles ne le sont pas ?

## 2. Utilisateurs et comptes

| Compte                               | Connexion                                                                         | Droits                                                                                                                                                                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ministère                            | **Un email partagé par ministère** (plusieurs personnes l'utilisent, c'est voulu) | Vue de l'église + sa fiche. Saisit ses données. Crée ses points d'attention et voit ceux qui le mentionnent. Change le statut de ces points et les marque traités, toujours avec un commentaire.                                    |
| Berger                               | Email personnel                                                                   | Lecture de tout, sauf la modération. Marque un point d'attention comme traité, commentaire facultatif.                                                                                                                              |
| Membre du conseil                    | Un email par membre                                                               | Comme le berger.                                                                                                                                                                                                                    |
| Administration de l'église           | **Un compte dédié, avec une adresse email dédiée** (décision D4)                  | Crée, désactive et réactive les ministères et tous les comptes (ministères, berger, conseil, EJP Tech), déclare les sessions et leurs ministères attendus. Voit la vue de l'église et le journal, mais ni les fiches ni les points. |
| Administration plateforme (EJP Tech) | Comptes EJP Tech                                                                  | Modération des champs libres et journal technique. Ne voit aucun chiffre. Ne décide pas des accès.                                                                                                                                  |

Tous les comptes se connectent **avec Google ou avec email et mot de passe, puis avec un code de double authentification** (section 8). Aucun compte ne peut s'en passer.

Chaque profil a sa propre navigation et son propre écran d'accueil (planche `maquettes/00-profils-qui-voit-quoi.png`) :

| Profil                     | Onglets (le premier est l'accueil)                      |
| -------------------------- | ------------------------------------------------------- |
| Ministère                  | Cette semaine, Ma fiche, Mes points, Mon journal        |
| Berger et conseil          | Cette semaine, Ministères, Points d'attention, Journal  |
| Administration de l'église | Cette semaine, Ministères et comptes, Sessions, Journal |
| EJP Tech                   | Modération, Journal technique                           |

Le nom du compte connecté reste toujours visible dans l'en-tête (un email de ministère est partagé). Un compte ne voit jamais les onglets d'un autre profil, et **le routage ne remplace pas la RLS** : un ministère qui tape l'adresse d'un écran berger ne reçoit aucune donnée.

« Mon journal » d'un ministère est l'écran Journal (06) limité par la RLS à son ministère et à son compte, sans filtre Compte. Le « Journal technique » d'EJP Tech est le même écran, limité par la RLS aux actions techniques (comptes, ministères, modération). Les connexions, les erreurs et les journaux du serveur restent dans le tableau de bord Supabase, hors de l'application.

Ne crée **pas** de profils personnels (nom, téléphone, date de naissance). Ne crée **pas** de rôles internes au ministère. Le libellé d'un compte n'est jamais le nom d'une personne (« Conseil, compte 3 »).

## 3. Règles métier (non négociables)

1. **On ajoute, on ne modifie jamais.** Chaque saisie est une nouvelle ligne datée ; une correction est une nouvelle saisie. Pas d'`UPDATE` ni de `DELETE` sur les tables de données : `mesure`, `fij_departement`, `participation`, `evenement`, `evenement_etat`, `reunion`, `point_attention`, `point_mention`, `point_suivi`, `journal`, `moderation`. Seules exceptions, toutes par des fonctions de la base et tracées au journal : `masquer_texte` remplace un champ libre (règle 9) ; l'administration corrige les ministères attendus d'une session ou supprime une session sans saisie ; les Edge Functions désactivent ou réactivent un compte et son ministère.
2. **Dernière valeur** d'un indicateur pour un ministère : sa ligne la plus récente selon `date_ref` décroissante, puis `saisi_le` décroissant, puis `id` décroissant (`id` départage deux lignes du même envoi). Pour un indicateur « à ce jour », la base pose `date_ref` = date du jour à Paris : la dernière valeur est donc la dernière saisie. Pour un indicateur « dimanche », c'est la valeur du dernier dimanche saisi.
3. **Totaux de l'église**, toujours avec la complétude à côté (« 6 sur 8 ») :
   - indicateur « dimanche » : le total du dimanche D additionne, pour chaque ministère, sa saisie la plus récente **pour D**. Un ministère qui n'a pas saisi D manque au total et à la complétude : on ne reprend jamais sa valeur d'un autre dimanche ;
   - indicateur « à ce jour » : somme des dernières valeurs des ministères actifs aujourd'hui ;
   - session : règle 5.
4. **Pourcentage de STARs en FIJ** = somme des « dont en FIJ » ÷ somme des « STARs actifs », les deux pris sur les mêmes ministères : les ministères actifs qui ont une dernière valeur pour les deux. Arrondi à l'entier le plus proche. Affichage « 64 sur 83 STARs actifs » et la complétude « 8 sur 8 ». Somme des actifs nulle : « Non calculé ». Jamais une moyenne de pourcentages, jamais saisi. La base refuse un « dont en FIJ » supérieur aux « STARs actifs » du même ministère. Chaque STAR actif compte dans un seul ministère, son **ministère principal** : une convention entre les personnes, que l'outil ne stocke jamais (D1, D2).
5. **Sessions et rassemblements hors culte** (Bâtir l'Église, Anti-Dispersion, autre rassemblement) : l'administration de l'église déclare la session et les ministères attendus. Chaque ministère saisit tous ses STARs présents, puis, parmi eux, ceux « déjà comptés par leur ministère principal » (les présents dont le ministère principal est un autre ministère). Total de la session = somme, sur la saisie la plus récente de chaque ministère, de (présents moins déjà comptés). Un STAR saisi par deux ministères compte ainsi une seule fois, sans aucun nom ni liste de personnes (D2). Tout ministère actif peut saisir une session datée d'aujourd'hui ou avant (heure de Paris) ; une session future n'accepte aucune saisie. La liste des attendus sert à la complétude et aux manquants. Le dimanche, un STAR ne sert que dans un ministère : aucune correction. Les événements du calendrier ne portent pas de comptage : un rassemblement à compter se déclare comme session « Autre rassemblement ».
6. **Fraîcheur d'un ministère** = date de la dernière ligne de journal écrite par un compte de ce ministère, quelle que soit l'action (chiffres, session, carte des FIJ, événement, réunion, point, traitement). Vert jusqu'à 7 jours, orange de 8 à 30 jours, rouge au-delà, toujours avec un libellé (« Aujourd'hui », « Hier », « Il y a 12 jours », « Aucune saisie »), jamais la couleur seule. Jours de calendrier, heure de Paris.
7. **Points d'attention** : statut (À traiter, En cours, En attente de décision, Traité) et priorité (Normale, Haute, Urgente) sont deux champs distincts. Seul un compte de ministère crée un point ; il naît « À traiter ». Il mentionne zéro, un ou plusieurs ministères actifs, jamais lui-même (le berger et le conseil voient tous les points). Titre, description, action attendue, priorité, échéance et mentions sont fixés à la création : pour associer un autre ministère, on crée un nouveau point. Un ministère mentionné voit **ce point uniquement**, pas le reste de la fiche. Le ministère créateur et les ministères mentionnés font passer le point d'un statut ouvert à un autre ; le berger et le conseil ne changent pas les statuts, ils marquent traité. Un point créé par erreur se marque traité avec un commentaire. Un ministère désactivé garde ses mentions passées (« @social (désactivé) ») et ne peut plus être mentionné.
8. **Marquer comme traité** (D3) : le ministère créateur, un ministère mentionné, le berger ou un membre du conseil. Un compte de ministère écrit toujours un commentaire qui dit ce qui a été traité et comment (10 à 280 caractères) ; pour le berger et le conseil, le commentaire est facultatif (280 au plus). L'administration de l'église et EJP Tech ne marquent jamais un point traité. La date, le compte et le commentaire sont enregistrés. Un point traité ne se rouvre pas : si le sujet revient, on crée un nouveau point (« Suite : ... »).
9. **Aucune donnée personnelle.** Chaque formulaire qui a un champ libre affiche une fois, sous le premier champ libre, le rappel : « N'écrivez aucun nom ni information personnelle. Les champs libres sont relus par EJP Tech. » (fenêtre « Marquer traité » et formulaire de réunion compris). Titres, actions attendues et objets : 80 caractères au plus ; descriptions et commentaires : 280. EJP Tech peut masquer un champ libre : tout le champ devient « [texte masqué par EJP Tech] ». Les textes écrits par l'administration (noms et descriptions des ministères, nom d'un rassemblement) suivent la même consigne (« N'écrivez aucun nom ni information personnelle. ») sans passer par la relecture.
10. **Journal** : chaque écriture (saisie, création, changement de statut, traitement, déclaration de session, action sur un compte, modération) produit une ligne : date, compte, action, ministère concerné, objet visé, détail. Un envoi de formulaire donne une seule ligne. Personne ne peut modifier ni effacer le journal. Il ne recopie **jamais** un texte libre ni un email : il garde l'identifiant de l'objet, et l'écran affiche le texte actuel de cet objet (donc masqué s'il l'a été).
11. **Dates et semaines, toujours à l'heure de Paris** (Europe/Paris), en base comme dans l'interface ; le fuseau du serveur ou du navigateur ne décide jamais. **Dimanche de référence** = le dernier dimanche dont midi (heure de Paris) est passé : du lundi au dimanche 11 h 59, c'est le dimanche précédent ; à partir du dimanche 12 h, c'est ce dimanche. Il fixe la semaine affichée, le dimanche proposé à la saisie et le bouton principal du ministère. Semaine affichée = semaine ISO 8601 (du lundi au dimanche) qui contient ce dimanche : « Semaine 39, du 21 au 27 sept. », « du 28 sept. au 4 oct. », « Semaine 53, du 28 déc. au 3 janv. ».
12. **Écarts à périmètre égal.** L'écart de l'église entre deux dimanches (ou deux sessions du même type) additionne, pour les seuls ministères qui ont saisi les deux fois, la différence de leurs valeurs (présents moins déjà comptés pour une session). Aucun ministère en commun : pas d'écart. Étiquette accessible : « +3 par rapport à dimanche dernier, pour les 6 ministères qui ont saisi les deux fois ». Sur une fiche, l'écart n'existe que si le ministère a saisi les deux fois, sinon la ligne dit « dimanche 20 sept. non saisi ». Les courbes gardent le total brut : cercle vide pour un dimanche incomplet, trou (pas zéro) pour un dimanche sans saisie.
13. **Complétude.**
    - Dimanche D : attendus = ministères actifs le jour D, plus ceux qui ont saisi D sans l'être ; saisis = ceux qui ont une saisie pour D. Chaque ministère actif saisit chaque dimanche, 0 compris (« Si personne n'a servi, enregistrez 0. »).
    - À ce jour : ministères actifs aujourd'hui. Si une valeur additionnée a plus de 30 jours : « À ce jour, 1 valeur de plus de 30 jours » (orange, avec le texte).
    - Pourcentage FIJ : ministères actifs qui ont les deux valeurs.
    - Session : attendus cochés et actifs à la date de la session, plus ceux qui ont saisi sans être attendus.
    - FIJ par département : départements qui ont une valeur (« 8 dép. »).
    - Un ministère désactivé sort des listes et des totaux du moment ; ses saisies restent dans les totaux et les courbes des dates où il était actif.
14. **Événements** : la validation se fait en dehors de l'outil. Le ministère qui porte l'événement reporte sa date et son statut, à la création puis à chaque changement ; chaque changement ajoute une ligne d'état et une ligne de journal. Le berger et le conseil lisent les statuts. L'administration ne les change pas : la liste est fixe (`statut_evenement`) et ne change que par une migration d'EJP Tech. Le nom ne change pas : pour renommer, on passe l'événement « Annulé » et on en ajoute un autre.
15. **Prochaine réunion** : chaque envoi déclare la prochaine réunion du ministère. La déclaration la plus récente fait foi, seulement si sa date est aujourd'hui ou plus tard. « Modifier » ajoute une déclaration ; une réunion passée disparaît d'elle-même.

## 4. Indicateurs, décisions et questions ouvertes

### Indicateurs de la vue de l'église

| Code                             | Libellé affiché                                                | Nature          | Saisi par                                                                 | Affichage                                                                                                                                                                                        |
| -------------------------------- | -------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `service`                        | STARs au service                                               | Chaque dimanche | Chaque ministère : les STARs qui ont servi chez lui ce dimanche           | Total du dimanche de référence, écart à périmètre égal, courbe (10 dimanches), complétude                                                                                                        |
| `actifs`                         | STARs actifs                                                   | À ce jour       | Chaque ministère : les STARs dont il est le ministère principal           | Total, complétude, valeurs de plus de 30 jours signalées                                                                                                                                         |
| `en_fij`                         | « Dont en FIJ » (saisie), « STARs présents en FIJ » (vue)      | À ce jour       | Chaque ministère, parmi ses STARs actifs                                  | Pourcentage calculé (règle 4)                                                                                                                                                                    |
| `fij_departement` (table à part) | FIJ par département                                            | À ce jour       | Le ministère dont le code est `fij`, les 8 départements en un envoi       | Carte en carrés des 8 départements (75, 77, 78, 91, 92, 93, 94, 95), placés comme sur la carte réelle. Valeur d'un département = sa saisie la plus récente, total = somme, date du dernier envoi |
| session `batir`                  | Présents à Bâtir l'Église                                      | Par session     | Chaque ministère : présents, et déjà comptés par leur ministère principal | Total sans double compte de la dernière session, écart à périmètre égal, courbe (4 sessions), complétude, manquants                                                                              |
| session `anti_dispersion`        | Présents à Anti-Dispersion                                     | Par session     | Idem                                                                      | Idem                                                                                                                                                                                             |
| session `autre`                  | Présents à un autre rassemblement (nom donné à la déclaration) | Par session     | Idem                                                                      | Bloc de la session (01 à 03) et écran 14 seulement : pas de ligne fixe ni de courbe dans le tableau des chiffres                                                                                 |

**Indicateurs propres à un ministère** (ex. « Enfants accueillis le dimanche » pour Prodiges Junior) : même table `indicateur`, avec `ministere_id` renseigné. EJP Tech les crée par une migration, sur demande écrite de l'administration de l'église (pas d'écran de création en V1 ; l'écran 13 les liste en lecture). Deux natures seulement, « dimanche » ou « à ce jour » (un indicateur « ce mois » devient « à ce jour », remis à zéro par le ministère chaque mois, et son libellé porte la période). Ils se saisissent dans le formulaire du dimanche (08) et s'affichent sur la fiche du ministère avec leur date et leur courbe, jamais sur la vue de l'église. Liste V1 à confirmer par la coordination (proposition : Communication, « Visuels livrés ce mois » ; Prodiges Junior, « Enfants accueillis le dimanche » ; EJP Formation, « Parcours en cours » ; Intégration, « NA », « NC », « Intégrés en FIJ »).

### Décisions du 30 septembre 2026

Détail et historique dans `docs/decisions.md`.

- **D1** : STARs de service et STARs actifs : une saisie par ministère ; l'outil calcule le total de l'église (règles 3 et 4).
- **D2** : le dimanche, un STAR ne sert que dans un ministère, donc pas de double compte. Aux sessions Bâtir l'Église, Anti-Dispersion et aux autres rassemblements hors culte, un STAR saisi par deux ministères ne compte qu'une fois dans les totaux, sans aucune donnée personnelle (règle 5).
- **D3** : un ministère mentionné peut marquer un point traité, avec un commentaire obligatoire qui dit ce qui a été traité et comment. Pour le berger, le commentaire est facultatif (règle 8).
- **D4** : l'administration de l'église est un compte dédié, avec une adresse email dédiée.
- **D5** : l'outil s'appelle « Pilotage EJP ».
- **D6** : le dépôt vit sur le compte GitHub de l'église, `https://github.com/eglisejp-tech/pilotage-ejp`, privé. Commits signés « EJP Tech » (eglisejptech@gmail.com), identité propre au dépôt.
- **D7** : React 19 au lieu de React 18 (React Router 8 exige React 19 ; shadcn/ui ne transmet plus les refs sous React 18).

### Questions ouvertes

- Date de mise en ligne.
- Existence d'une charte visuelle EJP (logo, couleurs, polices). Si elle existe, elle prime sur `BRIEF_DESIGN.md`.
- Toutes les propositions au statut « Proposé » de `docs/decisions.md`. Les principales, à confirmer par la coordination : la convention du « ministère principal » (règles 4 et 5) ; les autres rassemblements déclarés comme sessions « Autre rassemblement » ; le commentaire facultatif pour le conseil et obligatoire pour le ministère créateur (10 caractères au moins) ; les statuts intermédiaires posés par le ministère créateur et les ministères mentionnés ; la saisie d'une session ouverte à tout ministère actif ; ce que voient l'administration de l'église et les ministères (section 7) ; la création des comptes EJP Tech par l'administration ; la liste des indicateurs propres ; les durées de session ; le budget (production Supabase en offre Pro) ; les données personnelles et la fin de vie.

Tant qu'une proposition n'est pas confirmée, construis avec elle et garde le code paramétrable là où c'est simple. Mets à jour cette section et `docs/decisions.md` dès que la coordination répond.

## 5. Stack (installée à l'étape 0)

Cohérente avec les standards EJP Tech. Ne change pas de stack ni de version majeure sans demander.

- **Front** : React 19.2 (D7) + Vite 8 + TypeScript 6.0 strict (TypeScript 7 est incompatible avec typescript-eslint). Tailwind CSS 4 en mode CSS (`@theme` branché sur les tokens ; palette, rayons et ombres par défaut retirés). shadcn/ui (Radix, preset Lyra), icônes Phosphor (fonctionnelles seulement). Polices par `@fontsource`.
- **Routage** : React Router 8, en mode données (data mode).
- **Données** : Supabase (PostgreSQL 17, Auth avec Google et TOTP, Row Level Security, Edge Functions pour l'administration des comptes). Client `@supabase/supabase-js` + TanStack Query, à installer à l'étape 2. Le navigateur n'utilise que la **clé publique** (`sb_publishable_...`, variable `VITE_SUPABASE_PUBLISHABLE_KEY`) ; la **clé secrète** (`sb_secret_...`) ne sert que dans les Edge Functions. Supabase retire les anciennes clés `anon` et `service_role` d'ici fin 2026 : à l'étape 2, `.env.example` remplace `VITE_SUPABASE_ANON_KEY` par `VITE_SUPABASE_PUBLISHABLE_KEY`.
- **Formulaires** : React Hook Form + Zod (validation partagée), à installer à l'étape 4.
- **Graphiques** : SVG maison, comme dans le prototype. Pas de bibliothèque lourde.
- **Tests** : Vitest 5 (unitaires), pgTAP par `npx supabase test db` (politiques RLS et fonctions), Playwright 1.63 (projets `ordinateur` 1440, `tablette` 834, `telephone` 390), accessibilité par `@axe-core/playwright` (eslint-plugin-jsx-a11y ne supporte pas ESLint 10).
- **Qualité** : ESLint 10, Prettier avec le plugin Tailwind, `tsc -b`, `scripts/verifier-textes.mjs` (refuse les tirets cadratin et demi-cadratin, lancé par `npm run lint`).
- **CLI Supabase** : 2.118, dépendance de développement, appelée par `npx supabase`. `supabase/config.toml` vient de `supabase init` (PostgreSQL 17).
- **CI** : GitHub Actions, `.github/workflows/ci.yml` : job « qualite » (lint, `format:check`, types, tests unitaires, build), job « base » (`npx supabase db start` puis `npx supabase test db`), job « e2e » (Playwright, après « qualite »). Node selon `.nvmrc`. Aucun secret.
- **Poste de développement** : Windows 11 d'entreprise. Docker ne peut pas tourner (ni WSL ni Hyper-V) : **les tests de base tournent dans la CI**, pas sur le poste (section 12).
- **Hébergement** (proposition, à confirmer) : front sur Netlify, offre gratuite (Vercel Hobby n'accepte pas l'usage associatif d'un dépôt privé d'organisation). Supabase en trois environnements : local (Docker, données fictives, CI) ; préproduction (offre gratuite, région Paris, données fictives, recettes et MCP en lecture seule) ; production (**offre Pro**, région Paris : sauvegardes quotidiennes, pas de mise en pause, réglages de session). **Comptes, organisations et moyens de paiement au nom de l'église, jamais d'une personne.**

## 6. Modèle de données

Écris-le en migrations Supabase (`supabase/migrations/`, créées par `npx supabase migration new nom`). Ce modèle est complet pour l'étape 1 : n'ajoute ni ne retire de colonne sans demander.

### Types et tables

```sql
create schema private;                          -- jamais exposé dans l'API

create type public.type_compte as enum ('ministere','berger','conseil','admin_eglise','admin_plateforme');
create type public.statut_point as enum ('a_traiter','en_cours','attente_decision','traite');
create type public.priorite as enum ('normale','haute','urgente');      -- cet ordre sert aux tris
create type public.statut_evenement as enum ('brouillon','attente_validation','valide','preparation','termine','annule');
create type public.type_session as enum ('batir','anti_dispersion','autre');

-- Référence
create table public.ministere (
  id uuid primary key default gen_random_uuid(),
  code text unique,                             -- code technique posé par migration ('fij'), sinon null
  nom text not null unique check (char_length(btrim(nom)) between 1 and 60),
  description text check (char_length(description) <= 280),
  cree_le timestamptz not null default now(),
  desactive_le timestamptz,                     -- null = actif
  check (desactive_le is null or desactive_le >= cree_le)
);

create table public.compte (
  user_id uuid primary key references auth.users (id) on delete restrict,   -- on ne supprime jamais un compte
  type public.type_compte not null,
  ministere_id uuid references public.ministere,
  libelle text not null check (char_length(libelle) <= 60),                 -- fixé par creer-compte, jamais tapé
  cree_le timestamptz not null default now(),
  desactive_le timestamptz,                                                 -- null = actif
  check ((type = 'ministere') = (ministere_id is not null))
);
create unique index compte_un_par_ministere on public.compte (ministere_id) where desactive_le is null;
create unique index compte_un_berger on public.compte (type) where type = 'berger' and desactive_le is null;

create table public.indicateur (
  id uuid primary key default gen_random_uuid(),
  code text unique,                             -- 'service', 'actifs', 'en_fij' ; null pour un indicateur propre
  libelle text not null check (char_length(libelle) <= 60),
  nature text not null check (nature in ('dimanche','a_ce_jour')),
  ministere_id uuid references public.ministere,  -- null = indicateur commun
  ordre smallint not null default 0,
  actif boolean not null default true,          -- false : plus proposé à la saisie, historique gardé
  unique (ministere_id, libelle),
  check ((code is null) = (ministere_id is not null))
);

-- Saisies (AJOUT SEULEMENT)
create table public.mesure (
  id bigint generated always as identity primary key,
  indicateur_id uuid not null references public.indicateur,
  ministere_id uuid not null references public.ministere,
  date_ref date not null,                       -- dimanche concerné, ou date du jour posée par la base (à ce jour)
  valeur integer not null check (valeur between 0 and 9999),
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id)
);
create index on public.mesure (ministere_id, indicateur_id, date_ref desc, saisi_le desc, id desc);
create index on public.mesure (indicateur_id, date_ref);

create table public.fij_departement (           -- un envoi = les 8 départements
  id bigint generated always as identity primary key,
  ministere_id uuid not null references public.ministere,
  departement text not null check (departement in ('75','77','78','91','92','93','94','95')),
  valeur integer not null check (valeur between 0 and 9999),
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id)
);
create index on public.fij_departement (departement, saisi_le desc, id desc);

create table public.session (
  id uuid primary key default gen_random_uuid(),
  type public.type_session not null,
  date date not null,
  intitule text check (char_length(btrim(intitule)) between 1 and 80),   -- nom du rassemblement, seulement pour 'autre'
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id),
  check ((type = 'autre') = (intitule is not null))
);
create unique index session_type_date on public.session (type, date) where type <> 'autre';
create unique index session_autre_date_nom on public.session (date, intitule) where type = 'autre';

create table public.session_attendu (
  session_id uuid not null references public.session on delete cascade,
  ministere_id uuid not null references public.ministere,
  primary key (session_id, ministere_id)
);
create index on public.session_attendu (ministere_id);

create table public.participation (             -- la saisie la plus récente de chaque ministère fait foi
  id bigint generated always as identity primary key,
  session_id uuid not null references public.session,        -- sans cascade : une session saisie ne se supprime pas
  ministere_id uuid not null references public.ministere,
  valeur integer not null check (valeur between 0 and 9999), -- tous ses STARs présents
  deja_comptes integer not null default 0,                   -- dont déjà comptés par leur ministère principal (D2)
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id),
  check (deja_comptes between 0 and valeur)
);
create index on public.participation (session_id, ministere_id, saisi_le desc, id desc);

create table public.evenement (                 -- identité ; seul masquer_texte réécrit titre
  id uuid primary key default gen_random_uuid(),
  ministere_id uuid not null references public.ministere,
  titre text not null check (char_length(btrim(titre)) between 1 and 80),
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id)
);
create index on public.evenement (ministere_id);

create table public.evenement_etat (            -- la ligne la plus récente fait foi
  id bigint generated always as identity primary key,
  evenement_id uuid not null references public.evenement,
  date date not null,
  statut public.statut_evenement not null,
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id)
);
create index on public.evenement_etat (evenement_id, saisi_le desc, id desc);

create table public.reunion (                   -- la déclaration la plus récente fait foi
  id uuid primary key default gen_random_uuid(),
  ministere_id uuid not null references public.ministere,
  date date not null,
  heure time,
  objet text check (char_length(objet) <= 80),
  decision_attendue text check (char_length(decision_attendue) <= 80),
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id)
);
create index on public.reunion (ministere_id, saisi_le desc);

create table public.point_attention (           -- fixé à la création ; seul masquer_texte réécrit un texte
  id uuid primary key default gen_random_uuid(),
  ministere_id uuid not null references public.ministere,   -- ministère créateur
  titre text not null check (char_length(btrim(titre)) between 1 and 80),
  description text check (char_length(description) <= 280),
  action_attendue text check (char_length(action_attendue) <= 80),
  priorite public.priorite not null default 'normale',
  echeance date,
  saisi_le timestamptz not null default now(),              -- date de création
  saisi_par uuid not null default auth.uid() references public.compte (user_id)
);
create index on public.point_attention (ministere_id);

create table public.point_mention (             -- fixées à la création
  point_id uuid not null references public.point_attention,
  ministere_id uuid not null references public.ministere,
  primary key (point_id, ministere_id)
);
create index on public.point_mention (ministere_id);

create table public.point_suivi (               -- chaque statut ; le plus récent fait foi
  id uuid primary key default gen_random_uuid(),
  point_id uuid not null references public.point_attention,
  statut public.statut_point not null,
  commentaire text check (char_length(commentaire) <= 280),  -- commentaire de traitement (D3)
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id),
  check (commentaire is null or statut = 'traite')
);
create index on public.point_suivi (point_id, saisi_le desc);
create unique index point_suivi_un_traitement on public.point_suivi (point_id) where statut = 'traite';

-- Traces (AJOUT SEULEMENT, jamais modifiées)
create table public.journal (
  id bigint generated always as identity primary key,
  le timestamptz not null default now(),
  compte uuid references public.compte (user_id),   -- auteur ; null = « Système » (migration, jeu d'exemple, amorçage)
  ministere_id uuid references public.ministere,    -- ministère concerné (règle ci-dessous)
  action text not null check (action in (
    'mesure_saisie','fij_saisie','participation_saisie','evenement_ajoute','evenement_modifie',
    'reunion_saisie','point_cree','point_statut','point_traite',
    'session_declaree','session_modifiee','session_supprimee',
    'ministere_cree','compte_cree','invitation_relancee','compte_desactive','compte_reactive',
    'double_auth_reinitialisee','texte_relu','texte_masque')),
  cible text check (cible in ('session','evenement','reunion','point_attention','point_suivi','compte','ministere')),
  cible_id uuid,                                    -- sans clé étrangère : une session supprimée reste citée
  detail jsonb not null default '{}' check (jsonb_typeof(detail) = 'object')
);
create index on public.journal (ministere_id, le desc);
create index on public.journal (compte, le desc);
create index on public.journal (le desc);

create table public.moderation (                -- écrite seulement par marquer_relu et masquer_texte
  id bigint generated always as identity primary key,
  cible text not null check (cible in ('point_attention','point_suivi','evenement','reunion')),
  cible_id uuid not null,
  champ text,                                   -- champ masqué ; null pour rien_a_signaler
  decision text not null check (decision in ('rien_a_signaler','masque')),
  motif text check (motif in ('nom_personne','coordonnees','situation_personnelle','autre')),
  par uuid not null references public.compte (user_id),
  le timestamptz not null default now(),
  check ((decision = 'masque') = (champ is not null and motif is not null)),
  check (champ is null or (cible, champ) in (
    ('point_attention','titre'), ('point_attention','description'), ('point_attention','action_attendue'),
    ('point_suivi','commentaire'), ('evenement','titre'),
    ('reunion','objet'), ('reunion','decision_attendue')))
);
create index on public.moderation (cible, cible_id);
```

Libellés des motifs : `nom_personne` « Nom d'une personne », `coordonnees` « Coordonnées (téléphone, adresse, email) », `situation_personnelle` « Santé ou situation personnelle », `autre` « Autre information personnelle ».

`compte.libelle` n'est jamais tapé : `creer-compte` le fixe selon le type (« Ministère Communication », « Berger », « Conseil, compte 3 » avec le numéro suivant jamais réutilisé, « Administration de l'église », « EJP Tech, compte 2 »). Aucun email n'est copié dans une table publique : il reste dans `auth.users`.

### Règles d'intégrité appliquées par la base

- **Auteur et heure imposés.** Une valeur par défaut ne suffit pas : le client peut envoyer la sienne. Un trigger `before insert` sur chaque table qui a `saisi_le` et `saisi_par` (`mesure`, `fij_departement`, `session`, `participation`, `evenement`, `evenement_etat`, `reunion`, `point_attention`, `point_suivi`) :

  ```sql
  create function private.forcer_auteur() returns trigger
  language plpgsql set search_path = '' as $$
  begin
    if auth.uid() is not null then          -- compte de l'application ; le jeu d'exemple (rôle postgres) garde ses dates
      new.saisi_le := now();
      new.saisi_par := auth.uid();
    end if;
    return new;
  end $$;
  ```

- **Date d'une mesure** (trigger `before insert` `private.controler_mesure` sur `mesure`) : pour un indicateur « à ce jour », `date_ref := private.aujourdhui()` quand `auth.uid()` n'est pas nul ; pour un indicateur « dimanche », refus si `date_ref` n'est pas un dimanche (`extract(isodow from date_ref) <> 7`) ou si elle est après `private.aujourdhui()` : « La date doit être un dimanche passé ou aujourd'hui. ».
- **FIJ et actifs** (trigger `after insert ... referencing new table as nouvelles for each statement`, `private.verifier_fij_actifs`) : pour chaque ministère de l'envoi, la dernière valeur `en_fij` ne dépasse pas la dernière valeur `actifs`, sinon « Les STARs en FIJ ne peuvent pas dépasser les STARs actifs. ». Aucun contrôle « service inférieur ou égal à actifs » : un STAR peut servir dans un ministère qui n'est pas son ministère principal.
- **Jamais `now()` ni `current_date` dans une contrainte `check`** : Postgres suppose les `check` immuables et la restauration d'une sauvegarde échouerait. Les contrôles qui dépendent du jour vivent dans les triggers et dans les politiques d'ajout (section 7).
- **Journal et modération inaltérables** : un trigger `before update or delete` (par ligne) et `before truncate` (par instruction) lève une exception sur `journal` et sur `moderation`.

### Qui écrit quoi

- **Insertion directe sous RLS** (un envoi de formulaire = une seule instruction `insert` avec un tableau de lignes, donc une transaction et une ligne de journal) : `mesure` (chiffres du dimanche, actifs, en FIJ et indicateurs propres ensemble), `fij_departement` (les 8 départements), `participation`, `evenement_etat` (mise à jour d'un événement), `reunion`.
- **Fonction `security invoker`** (la RLS s'applique) : `ajouter_evenement`, qui insère `evenement` et son premier `evenement_etat` dans la même transaction.
- **Fonctions `security definer`** (section 7) : les points (`creer_point`, `changer_statut_point`, `marquer_traite`), les sessions (`declarer_session`, `modifier_session`, `supprimer_session`), la modération (`marquer_relu`, `masquer_texte`).
- **Edge Functions** (clé secrète, section 8) : `ministere`, `compte` et leurs lignes de journal.
- **Migrations** (EJP Tech) : `indicateur` et le ministère FIJ.

### Journal

Qui écrit le journal, et personne d'autre :

- les triggers `after insert ... referencing new table as nouvelles for each statement` de `mesure`, `fij_departement`, `participation`, `evenement_etat` et `reunion`, fonctions `security definer` du schéma `private`. Une ligne par groupe (`saisi_par`, `ministere_id`, `saisi_le`), avec `le = saisi_le` et `compte = saisi_par` : le jeu d'exemple garde ses dates. Rien n'est écrit si la table de transition est vide. Pour `evenement_etat`, l'action est `evenement_ajoute` s'il n'existe aucune ligne d'état plus ancienne pour cet événement, sinon `evenement_modifie` ;
- les fonctions de la section 7, pour leur propre action (`compte = auth.uid()`, `le = now()`) ;
- les Edge Functions, avec `compte` = identifiant de l'appelant tiré de son JWT vérifié (avec la clé secrète, `auth.uid()` est nul) ;
- l'amorçage du premier compte d'administration (section 8), avec `compte` nul.

```sql
create function private.journaliser_mesures() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.journal (le, compte, ministere_id, action, detail)
  select n.saisi_le, n.saisi_par, n.ministere_id, 'mesure_saisie',
         jsonb_build_object('lignes', jsonb_agg(jsonb_build_object(
           'indicateur_id', n.indicateur_id, 'date_ref', n.date_ref, 'valeur', n.valeur) order by n.id))
  from nouvelles n
  group by n.saisi_le, n.saisi_par, n.ministere_id;
  return null;
end $$;
create trigger journal_mesure after insert on public.mesure
  referencing new table as nouvelles for each statement execute function private.journaliser_mesures();
```

Valeur de `ministere_id` : pour une saisie, le ministère de la saisie ; pour un point, le ministère **créateur**, quel que soit l'auteur ; pour un événement ou une réunion, son ministère ; pour un compte, le ministère du compte (null pour le berger, le conseil et les administrations) ; pour un texte relu ou masqué, le ministère qui l'a écrit (null si c'est le berger ou le conseil) ; pour une session, null.

`detail` contient seulement des codes, des nombres, des dates et des identifiants, jamais un texte libre ni un email.

| Code                        | Libellé (colonne « Action » de 06) | `cible`, `cible_id`      | `detail`                                                | Détail affiché (exemple)                                                   |
| --------------------------- | ---------------------------------- | ------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------------- |
| `mesure_saisie`             | A saisi des chiffres               | aucune                   | `{"lignes": [{"indicateur_id", "date_ref", "valeur"}]}` | « STARs au service du 27 sept. : 10, STARs actifs : 14, dont en FIJ : 11 » |
| `fij_saisie`                | A saisi la carte des FIJ           | aucune                   | `{"total": 29}`                                         | « FIJ par département : 29 au total »                                      |
| `participation_saisie`      | A saisi une présence               | session                  | `{"valeur": 13, "deja_comptes": 2}`                     | « Bâtir l'Église du 26 sept. : 13 présents, dont 2 déjà comptés »          |
| `evenement_ajoute`          | A ajouté un événement              | evenement                | `{"date", "statut"}`                                    | titre actuel, date et statut                                               |
| `evenement_modifie`         | A mis à jour un événement          | evenement                | `{"date", "statut"}`                                    | titre actuel, « Validé »                                                   |
| `reunion_saisie`            | A renseigné la prochaine réunion   | reunion                  | `{"date", "heure"}`                                     | « lundi 5 oct., 20 h »                                                     |
| `point_cree`                | A créé un point                    | point_attention          | `{"priorite", "mentions": [uuid]}`                      | titre actuel, « mentionne Communication »                                  |
| `point_statut`              | A changé le statut d'un point      | point_attention          | `{"statut": ["a_traiter", "en_cours"]}`                 | titre actuel, « En cours »                                                 |
| `point_traite`              | A marqué traité                    | point_attention          | `{"avec_commentaire": true}`                            | titre actuel                                                               |
| `session_declaree`          | A déclaré une session              | session                  | `{"type", "date", "attendus": 8}`                       | « Anti-Dispersion, samedi 3 oct., 8 ministères attendus »                  |
| `session_modifiee`          | A modifié une session              | session                  | `{"attendus": [8, 7]}`                                  | « 7 ministères attendus au lieu de 8 »                                     |
| `session_supprimee`         | A supprimé une session             | session                  | `{"type", "date"}`                                      | « Anti-Dispersion, samedi 3 oct. »                                         |
| `ministere_cree`            | A créé un ministère                | ministere                | `{}`                                                    | nom du ministère                                                           |
| `compte_cree`               | A créé un compte                   | compte                   | `{"type"}`                                              | libellé du compte                                                          |
| `invitation_relancee`       | A relancé une invitation           | compte                   | `{}`                                                    | libellé du compte                                                          |
| `compte_desactive`          | A désactivé un compte              | compte                   | `{"type", "ministere_desactive": true}`                 | libellé du compte                                                          |
| `compte_reactive`           | A réactivé un compte               | compte                   | `{"type"}`                                              | libellé du compte                                                          |
| `double_auth_reinitialisee` | A refait l'activation              | compte                   | `{}`                                                    | libellé du compte                                                          |
| `texte_relu`                | A relu un texte                    | table du texte, sa ligne | `{}`                                                    | « Point de Social, rien à signaler »                                       |
| `texte_masque`              | A masqué un texte                  | table du texte, sa ligne | `{"champ", "motif"}`                                    | « Point de Social, motif : nom d'une personne »                            |

### Vues de lecture

Toutes les vues se créent `with (security_invoker = true)` : sans cette option, une vue s'exécute avec les droits de son propriétaire et contourne la RLS et la politique `aal2`. Les effectifs communs sont lisibles par tous les profils sauf EJP Tech (section 7) : un ministère obtient donc les mêmes totaux que le berger, et EJP Tech n'obtient aucune ligne.

```sql
create view public.v_semaine with (security_invoker = true) as
select private.aujourdhui() as aujourdhui, private.dimanche_reference() as dimanche,
       private.dimanche_reference() - 6 as lundi,
       extract(week from private.dimanche_reference())::int as numero;          -- semaine ISO

create view public.v_derniere_mesure with (security_invoker = true) as
select distinct on (m.ministere_id, m.indicateur_id)
       m.ministere_id, m.indicateur_id, i.code, i.nature, m.date_ref, m.valeur, m.saisi_le
from public.mesure m join public.indicateur i on i.id = m.indicateur_id
order by m.ministere_id, m.indicateur_id, m.date_ref desc, m.saisi_le desc, m.id desc;

create view public.v_mesure_dimanche with (security_invoker = true) as
select distinct on (m.indicateur_id, m.ministere_id, m.date_ref)
       m.indicateur_id, m.ministere_id, m.date_ref as dimanche, m.valeur
from public.mesure m join public.indicateur i on i.id = m.indicateur_id
where i.nature = 'dimanche'
order by m.indicateur_id, m.ministere_id, m.date_ref, m.saisi_le desc, m.id desc;

create view public.v_total_dimanche with (security_invoker = true) as        -- 10 dimanches, courbe et complétude
with dimanches as (
  select (private.dimanche_reference() - 7 * g)::date as dimanche from generate_series(0, 9) as g
)
select i.id as indicateur_id, d.dimanche,
       sum(v.valeur) as total,                                -- null si aucune saisie : trou dans la courbe
       count(v.ministere_id) as nb_saisis,
       (select count(*) from public.ministere mi
         where private.actif_le(mi.cree_le, mi.desactive_le, d.dimanche)
            or exists (select 1 from public.v_mesure_dimanche w
                        where w.indicateur_id = i.id and w.dimanche = d.dimanche and w.ministere_id = mi.id)
       ) as nb_attendus
from dimanches d
cross join public.indicateur i
left join public.v_mesure_dimanche v on v.indicateur_id = i.id and v.dimanche = d.dimanche
where i.ministere_id is null and i.nature = 'dimanche'
group by i.id, d.dimanche;

create view public.v_total_a_ce_jour with (security_invoker = true) as
select d.indicateur_id, d.code, sum(d.valeur) as total, count(*) as nb_saisis,
       (select count(*) from public.ministere mi where mi.desactive_le is null) as nb_actifs,
       min(d.date_ref) as plus_ancienne,
       count(*) filter (where d.date_ref < private.aujourdhui() - 30) as nb_plus_de_30_jours
from public.v_derniere_mesure d
join public.ministere m on m.id = d.ministere_id and m.desactive_le is null
where d.nature = 'a_ce_jour' and d.code is not null
group by d.indicateur_id, d.code;

create view public.v_pourcentage_fij with (security_invoker = true) as
select sum(f.valeur) as en_fij, sum(a.valeur) as actifs, count(*) as nb_ministeres,
       round(100.0 * sum(f.valeur) / nullif(sum(a.valeur), 0)) as pourcentage
from public.v_derniere_mesure a
join public.v_derniere_mesure f on f.ministere_id = a.ministere_id and f.code = 'en_fij'
join public.ministere m on m.id = a.ministere_id and m.desactive_le is null
where a.code = 'actifs';

create view public.v_carte_fij with (security_invoker = true) as             -- total et date : somme et max côté lecture
select distinct on (f.departement) f.departement, f.valeur, f.saisi_le
from public.fij_departement f
order by f.departement, f.saisi_le desc, f.id desc;

create view public.v_participation_courante with (security_invoker = true) as
select distinct on (p.session_id, p.ministere_id)
       p.session_id, p.ministere_id, p.valeur, p.deja_comptes,
       p.valeur - p.deja_comptes as compte_dans_total, p.saisi_le
from public.participation p
order by p.session_id, p.ministere_id, p.saisi_le desc, p.id desc;

create view public.v_session_completude with (security_invoker = true) as
with attendus as (
  select sa.session_id, sa.ministere_id
  from public.session_attendu sa
  join public.session s on s.id = sa.session_id
  join public.ministere m on m.id = sa.ministere_id
  where private.actif_le(m.cree_le, m.desactive_le, s.date)
),
concernes as (
  select session_id, ministere_id from attendus
  union
  select session_id, ministere_id from public.v_participation_courante
)
select s.id as session_id, s.type, s.date, s.intitule,
       s.date <= private.aujourdhui() as a_eu_lieu,
       count(c.ministere_id) as nb_attendus,
       count(p.ministere_id) as nb_saisis,
       coalesce(sum(p.valeur), 0) as total_saisi,
       coalesce(sum(p.compte_dans_total), 0) as total,          -- sans double compte (D2)
       coalesce(array_agg(mi.nom order by mi.nom)
                filter (where c.ministere_id is not null and p.ministere_id is null), '{}') as manquants
from public.session s
left join concernes c on c.session_id = s.id
left join public.ministere mi on mi.id = c.ministere_id
left join public.v_participation_courante p on p.session_id = c.session_id and p.ministere_id = c.ministere_id
group by s.id;

create view public.v_ecart_dimanche with (security_invoker = true) as          -- règle 12
select c.indicateur_id, c.dimanche, sum(c.valeur - p.valeur) as ecart, count(*) as nb_comparables
from public.v_mesure_dimanche c
join public.v_mesure_dimanche p
  on p.indicateur_id = c.indicateur_id and p.ministere_id = c.ministere_id and p.dimanche = c.dimanche - 7
group by c.indicateur_id, c.dimanche;

create view public.v_ecart_session with (security_invoker = true) as
with ordre as (
  select s.id, lag(s.id) over (partition by s.type order by s.date) as precedente
  from public.session s
  where s.type <> 'autre' and s.date <= private.aujourdhui()
)
select o.id as session_id, sum(c.compte_dans_total - p.compte_dans_total) as ecart, count(*) as nb_comparables
from ordre o
join public.v_participation_courante c on c.session_id = o.id
join public.v_participation_courante p on p.session_id = o.precedente and p.ministere_id = c.ministere_id
group by o.id;

create view public.v_evenement with (security_invoker = true) as
select distinct on (e.id) e.id, e.ministere_id, e.titre, x.date, x.statut, x.saisi_le as mis_a_jour_le
from public.evenement e
join public.evenement_etat x on x.evenement_id = e.id
order by e.id, x.saisi_le desc, x.id desc;

create view public.v_prochaine_reunion with (security_invoker = true) as
select d.id, d.ministere_id, d.date, d.heure, d.objet, d.decision_attendue
from (select distinct on (r.ministere_id) r.* from public.reunion r
      order by r.ministere_id, r.saisi_le desc) d
where d.date >= private.aujourdhui();

create view public.v_point with (security_invoker = true) as
select p.id, p.ministere_id, p.titre, p.description, p.action_attendue, p.priorite, p.echeance,
       p.saisi_le as cree_le, p.saisi_par as cree_par,
       s.statut, s.saisi_le as statut_le,
       t.id as traitement_id, t.saisi_le as traite_le, t.saisi_par as traite_par,
       t.commentaire as traite_commentaire
from public.point_attention p
join lateral (select x.statut, x.saisi_le from public.point_suivi x
              where x.point_id = p.id order by x.saisi_le desc limit 1) s on true
left join public.point_suivi t on t.point_id = p.id and t.statut = 'traite';
```

- `v_journal` (`security_invoker`) : les colonnes de `journal`, plus `compte_libelle` (« Système » si `compte` est nul), `auteur_ministere_id` (ministère du compte auteur), `ministere_nom` et `cible_texte`, le texte actuel de l'objet visé (titre du point ou de l'événement, libellé du compte, nom du ministère), lu sous RLS : un compte qui ne peut pas lire le point voit `null`, et l'écran écrit « un point de Communication ».
- Lectures qui doivent être identiques pour tous les lecteurs, ou qui ne rendent que certaines colonnes : une fonction `security definer` du schéma `private`, lue à travers une vue `security_invoker` (`create view public.v_x with (security_invoker = true) as select * from private.x();`). Chaque fonction ne rend rien hors `aal2` ou hors des profils prévus :
  - `private.tableau_ministeres()` pour `v_tableau_ministeres` (ministère, berger, conseil, administration ; aucune ligne pour EJP Tech) : pour chaque ministère actif, `ministere_id`, `nom`, `description`, `derniere_saisie` (fraîcheur, règle 6), `prochain_evenement_date` et `prochain_evenement_titre` (état le plus récent daté d'aujourd'hui ou après, ni « Terminé » ni « Annulé », le plus proche puis par titre), puis `prochaine_reunion_date`, `prochaine_reunion_heure` et `point_ouvert_priorite` (priorité la plus haute des points ouverts créés par ce ministère), ces trois colonnes à `null` sauf pour le berger et le conseil ;
  - `private.textes_a_relire()` pour `v_textes_a_relire` (EJP Tech seulement) : une ligne par écriture qui porte des champs libres (`point_attention` ; `point_suivi` dont le commentaire n'est pas vide ; `evenement` ; `reunion` dont l'objet ou la décision attendue n'est pas vide), avec `cible`, `cible_id`, `ministere_id` de l'auteur, `auteur_libelle`, `ecrit_le`, `champs` (jsonb des champs non vides), `etat` (`a_relire` tant qu'aucune ligne de `moderation` ne vise l'écriture, sinon `relu` ou `masque`), `decision_le` et `motif`. Elle rend tous les éléments à relire, puis ceux écrits dans les 30 derniers jours. Jamais de priorité, de statut ni de chiffre ;
  - `private.etat_comptes()` pour `v_etat_comptes` (administration de l'église seulement) : `user_id`, `type`, `libelle`, `ministere_id`, `email` (de `auth.users`), `desactive_le` et `etat` : `desactive`, `invitation_envoyee` (email non confirmé), `activee` (au moins un facteur TOTP vérifié dans `auth.mfa_factors`) ou `a_activer`. Elle ne lit jamais la colonne `secret` des facteurs (droit de lecture du propriétaire sur `auth.mfa_factors` à vérifier par un test).

### Données de référence

Une migration `..._donnees_reference.sql` crée ce qui doit exister partout, production comprise : les indicateurs communs `service` (« STARs au service », dimanche), `actifs` (« STARs actifs », à ce jour) et `en_fij` (« Dont en FIJ », à ce jour) ; le ministère FIJ avec `code = 'fij'` ; les indicateurs propres validés par la coordination. `supabase/seed.sql` ne sert qu'au local et à la CI (`supabase db push` ne l'applique pas sans `--include-seed` : ne jamais passer cette option).

## 7. Sécurité et RLS (à tester, pas seulement à écrire)

Principe : **le cloisonnement vit dans la base**, pas dans l'interface.

- `alter table ... enable row level security` sur **toutes** les tables de `public`.
- **Privilèges explicites.** Un nouveau projet Supabase ne donne plus de droits automatiques à `anon`, `authenticated` et `service_role` sur `public`. Sans GRANT, l'API répond « permission denied » ; la RLS ne filtre qu'après le GRANT. La première migration rend le local identique au distant, puis chaque migration écrit ses droits :

  ```sql
  alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated, service_role;
  alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated, service_role, public;
  alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated, service_role;
  revoke all on schema private from public;
  grant usage on schema private to authenticated;          -- les politiques appellent des fonctions private

  grant select on public.ministere, public.compte, public.indicateur, public.mesure, public.fij_departement,
    public.session, public.session_attendu, public.participation, public.evenement, public.evenement_etat,
    public.reunion, public.point_attention, public.point_mention, public.point_suivi, public.journal,
    public.moderation to authenticated;
  grant insert on public.mesure, public.fij_departement, public.participation, public.evenement,
    public.evenement_etat, public.reunion to authenticated;
  grant select, insert, update on public.ministere, public.compte to service_role;   -- Edge Functions
  grant insert on public.journal to service_role;
  grant select on public.v_semaine, public.v_derniere_mesure /* , ... chaque vue */ to authenticated;
  -- chaque fonction : revoke execute ... from public, anon ; grant execute ... to authenticated
  ```

  Aucun GRANT `update`, `delete` ni `truncate` pour `authenticated` ou `anon`, sur aucune table. `anon` n'a aucun droit sur aucun objet de `public`. Si une insertion échoue sur la séquence d'une colonne `identity`, accorder `usage` sur cette séquence (à vérifier en local).

- **Fonctions `security definer` seulement dans `private`**, avec `set search_path = ''` et des noms qualifiés. L'API appelle une fonction de `public` en `security invoker` d'une ligne, qui appelle la fonction de `private` (la documentation Supabase déconseille une fonction `security definer` dans un schéma exposé). Aucune alerte 0010, 0028 ou 0029 du conseiller Supabase sans explication écrite.
- **Fonctions d'aide** (utilisées par les politiques, `grant execute` à `authenticated`). Dans les politiques, écris `(select auth.uid())` et `(select private.mon_ministere())` pour la performance, et indexe les colonnes filtrées.

  ```sql
  create function private.mon_type() returns public.type_compte          -- null si compte ou ministère désactivé
  language sql stable security definer set search_path = '' as $$
    select c.type from public.compte c left join public.ministere m on m.id = c.ministere_id
    where c.user_id = (select auth.uid()) and c.desactive_le is null
      and (c.type <> 'ministere' or m.desactive_le is null)
  $$;
  create function private.mon_ministere() returns uuid                  -- null hors compte de ministère actif
  language sql stable security definer set search_path = '' as $$
    select c.ministere_id from public.compte c join public.ministere m on m.id = c.ministere_id
    where c.user_id = (select auth.uid()) and c.desactive_le is null and m.desactive_le is null
  $$;
  create function private.est_decideur() returns boolean               -- berger ou conseil, jamais null
  language sql stable security definer set search_path = '' as $$
    select coalesce(private.mon_type() in ('berger','conseil'), false)
  $$;
  create function private.exige_aal2() returns void                    -- première ligne de chaque fonction de l'API
  language plpgsql stable security definer set search_path = '' as $$
  begin
    if coalesce((select auth.jwt() ->> 'aal'), '') <> 'aal2' then
      raise exception 'Double authentification requise.' using errcode = '42501';
    end if;
    if private.mon_type() is null then
      raise exception 'Compte inactif ou inconnu.' using errcode = '42501';
    end if;
  end $$;
  create function private.points_mentionnant_mon_ministere() returns setof uuid   -- casse la récursion
  language sql stable security definer set search_path = '' as $$
    select m.point_id from public.point_mention m where m.ministere_id = private.mon_ministere()
  $$;
  create function private.aujourdhui() returns date
  language sql stable set search_path = '' as $$ select (now() at time zone 'Europe/Paris')::date $$;
  create function private.dimanche_reference_de(p_instant timestamptz) returns date   -- testée avec des instants fixes
  language sql stable set search_path = '' as $$
    select d - (extract(isodow from d)::int % 7)
    from (select ((p_instant at time zone 'Europe/Paris') - interval '12 hours')::date as d) as x
  $$;
  create function private.dimanche_reference() returns date
  language sql stable set search_path = '' as $$ select private.dimanche_reference_de(now()) $$;
  create function private.actif_le(p_cree_le timestamptz, p_desactive_le timestamptz, p_jour date) returns boolean
  language sql stable set search_path = '' as $$
    select (p_cree_le at time zone 'Europe/Paris')::date <= p_jour
       and (p_desactive_le is null or (p_desactive_le at time zone 'Europe/Paris')::date > p_jour)
  $$;
  create function private.ministere_fij() returns uuid
  language sql stable security definer set search_path = '' as $$
    select id from public.ministere where code = 'fij' and desactive_le is null
  $$;
  ```

  Un compte ou un ministère désactivé perd ainsi tous ses droits tout de suite, même si son jeton d'accès reste valable jusqu'à son expiration.

### Matrice des droits

Référence unique pour les politiques, les tests pgTAP et `rls-auditor`. « L » = lire (select), « A » = ajouter (insert). « Le sien » = `ministere_id = private.mon_ministere()`. Toute ligne suppose aussi la politique restrictive `aal2` (section 8) et un compte actif. **Update et delete : aucun profil, sur aucune table** (aucun GRANT) ; les seuls changements passent par les fonctions du tableau suivant ou par les Edge Functions.

| Table                                             | Ministère                                                                                                       | Berger, conseil                   | Administration de l'église | EJP Tech                              | Session `aal1` (tout profil) | Anonyme |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------- | -------------------------- | ------------------------------------- | ---------------------------- | ------- |
| `ministere`                                       | L                                                                                                               | L                                 | L                          | L                                     | Rien                         | Rien    |
| `compte`                                          | L                                                                                                               | L                                 | L                          | L                                     | L sa propre ligne            | Rien    |
| `indicateur`                                      | L                                                                                                               | L                                 | L                          | Rien                                  | Rien                         | Rien    |
| `mesure`                                          | L des indicateurs communs de tous et de ses indicateurs propres ; A le sien (indicateur actif, commun ou à lui) | L                                 | L des indicateurs communs  | Rien                                  | Rien                         | Rien    |
| `fij_departement`                                 | L ; A si c'est le ministère FIJ (`private.ministere_fij()`)                                                     | L                                 | L                          | Rien                                  | Rien                         | Rien    |
| `session`, `session_attendu`                      | L                                                                                                               | L                                 | L (écriture par fonctions) | Rien                                  | Rien                         | Rien    |
| `participation`                                   | L ; A le sien, session datée d'aujourd'hui ou avant                                                             | L                                 | L                          | Rien                                  | Rien                         | Rien    |
| `evenement`, `evenement_etat`                     | L et A les siens (`evenement` par `ajouter_evenement`)                                                          | L                                 | Rien                       | Rien (file de relecture par fonction) | Rien                         | Rien    |
| `reunion`                                         | L et A les siennes, date d'aujourd'hui ou après                                                                 | L                                 | Rien                       | Rien (file de relecture par fonction) | Rien                         | Rien    |
| `point_attention`, `point_mention`, `point_suivi` | L des points qu'il a créés ou qui le mentionnent ; écriture par fonctions                                       | L ; écriture par `marquer_traite` | Rien                       | Rien (file de relecture par fonction) | Rien                         | Rien    |
| `journal`                                         | L des lignes de son ministère et de celles de son compte                                                        | L                                 | L                          | L des actions techniques              | Rien                         | Rien    |
| `moderation`                                      | Rien                                                                                                            | Rien                              | Rien                       | L                                     | Rien                         | Rien    |

Actions techniques lisibles par EJP Tech : `ministere_cree`, `compte_cree`, `invitation_relancee`, `compte_desactive`, `compte_reactive`, `double_auth_reinitialisee`, `texte_relu`, `texte_masque`. Les vues suivent la RLS de leurs tables ; les vues sur fonction suivent leur propre contrôle (section 6).

Choix de visibilité (à confirmer par la coordination, la matrice 3.1 du .docx V2 est dépassée) : l'administration de l'église lit la vue de l'église, les comptes, les sessions et le journal, mais ni les fiches (indicateurs propres, réunions, calendrier) ni les points. Un ministère et l'administration voient pour les autres ministères le nom, la fraîcheur et le prochain événement, pas leur prochaine réunion ni leur point ouvert. EJP Tech ne voit aucun chiffre.

### Politiques

```sql
-- Lecture (permissives)
create policy lecture on public.ministere for select to authenticated using ((select private.mon_type()) is not null);
create policy lecture on public.compte for select to authenticated
  using ((select private.mon_type()) is not null or user_id = (select auth.uid()));
create policy lecture on public.indicateur for select to authenticated
  using ((select private.mon_type()) in ('ministere','berger','conseil','admin_eglise'));
-- même politique que indicateur pour fij_departement, session, session_attendu, participation
create policy lecture on public.mesure for select to authenticated using (
  (select private.est_decideur())
  or ministere_id = (select private.mon_ministere())
  or ((select private.mon_type()) in ('ministere','admin_eglise')
      and indicateur_id in (select i.id from public.indicateur i where i.ministere_id is null)));
create policy lecture on public.evenement for select to authenticated
  using ((select private.est_decideur()) or ministere_id = (select private.mon_ministere()));
-- même politique pour reunion
create policy lecture on public.evenement_etat for select to authenticated
  using (evenement_id in (select e.id from public.evenement e));
create policy lecture on public.point_attention for select to authenticated using (
  (select private.est_decideur())
  or ministere_id = (select private.mon_ministere())
  or id in (select private.points_mentionnant_mon_ministere()));
create policy lecture on public.point_mention for select to authenticated
  using (point_id in (select p.id from public.point_attention p));
-- même politique pour point_suivi
create policy lecture on public.journal for select to authenticated using (
  (select private.mon_type()) in ('berger','conseil','admin_eglise')
  or ((select private.mon_type()) = 'ministere'
      and (ministere_id = (select private.mon_ministere()) or compte = (select auth.uid())))
  or ((select private.mon_type()) = 'admin_plateforme'
      and action in ('ministere_cree','compte_cree','invitation_relancee','compte_desactive',
                     'compte_reactive','double_auth_reinitialisee','texte_relu','texte_masque')));
create policy lecture on public.moderation for select to authenticated
  using ((select private.mon_type()) = 'admin_plateforme');

-- Ajout (le with check s'évalue après les triggers before insert)
create policy ajout on public.mesure for insert to authenticated with check (
  ministere_id = (select private.mon_ministere())
  and exists (select 1 from public.indicateur i where i.id = mesure.indicateur_id and i.actif
              and (i.ministere_id is null or i.ministere_id = mesure.ministere_id)));
create policy ajout on public.fij_departement for insert to authenticated with check (
  ministere_id = (select private.mon_ministere()) and ministere_id = (select private.ministere_fij()));
create policy ajout on public.participation for insert to authenticated with check (
  ministere_id = (select private.mon_ministere())
  and exists (select 1 from public.session s where s.id = participation.session_id and s.date <= private.aujourdhui()));
create policy ajout on public.evenement for insert to authenticated
  with check (ministere_id = (select private.mon_ministere()));
create policy ajout on public.evenement_etat for insert to authenticated with check (
  exists (select 1 from public.evenement e
          where e.id = evenement_etat.evenement_id and e.ministere_id = (select private.mon_ministere())));
create policy ajout on public.reunion for insert to authenticated
  with check (ministere_id = (select private.mon_ministere()) and date >= private.aujourdhui());
```

La politique de `point_attention` lit les mentions par une fonction `security definer`, et celles de `point_mention` et `point_suivi` lisent `point_attention` sous RLS : aucune politique ne relit l'autre table (Postgres refuserait avec « infinite recursion detected in policy »).

### Fonctions de l'API

Chaque fonction ci-dessous (sauf `ajouter_evenement`) existe en deux parties : `private.<nom>` en `security definer`, qui porte tous les contrôles, et `public.<nom>` en `security invoker`, d'une ligne, que l'API appelle. `revoke execute ... from public, anon` et `grant execute ... to authenticated` sur les deux. Un refus de droit lève `errcode = '42501'` (PostgREST répond 403) avec le même message qu'un objet absent, pour ne rien révéler ; une erreur de saisie lève l'exception par défaut (400). L'interface affiche le message tel quel. Aucune fonction n'utilise de SQL dynamique.

| Fonction                                                                                                                                      | Appelant                                         | Contrôles, dans l'ordre                                                                                                                                                                                                                                                                                                                                                                                            | Écrit                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `creer_point(p_titre text, p_description text, p_action_attendue text, p_priorite priorite, p_echeance date, p_mentions uuid[]) returns uuid` | Ministère                                        | `exige_aal2()` ; compte de ministère actif (42501) ; titre de 1 à 80 caractères après `btrim` (« Donnez un titre au point (80 caractères au plus). ») ; description 280 et action attendue 80 au plus ; échéance vide ou pas avant `aujourdhui()` (« L'échéance ne peut pas être passée. ») ; chaque mention est un ministère actif autre que lui (« Ce ministère ne peut pas être mentionné. »), doublons retirés | `point_attention`, `point_mention`, `point_suivi` (`a_traiter`), journal `point_cree`                   |
| `changer_statut_point(p_point_id uuid, p_statut statut_point) returns void`                                                                   | Ministère créateur ou mentionné                  | `exige_aal2()` ; point créé par lui ou qui le mentionne, sinon « Ce point n'existe pas ou vous n'y avez pas accès. » (42501) ; verrou `for update` sur le point ; point non traité (« Ce point est traité : il ne change plus. ») ; `p_statut` différent de `traite` (« Utilisez le bouton Marquer traité. ») ; même statut que l'actuel : rien n'est écrit                                                        | `point_suivi`, journal `point_statut`                                                                   |
| `marquer_traite(p_point_id uuid, p_commentaire text default null) returns void`                                                               | Ministère créateur ou mentionné, berger, conseil | voir le modèle ci-dessous                                                                                                                                                                                                                                                                                                                                                                                          | `point_suivi` (`traite`, commentaire), journal `point_traite`                                           |
| `ajouter_evenement(p_titre text, p_date date, p_statut statut_evenement) returns uuid`                                                        | Ministère                                        | **`security invoker`, sans partie private** : la RLS s'applique aux deux insertions ; titre de 1 à 80 caractères ; date pas avant `aujourdhui()` (« La date ne peut pas être passée. »)                                                                                                                                                                                                                            | `evenement`, `evenement_etat` ; journal par trigger                                                     |
| `declarer_session(p_type type_session, p_date date, p_intitule text, p_ministeres uuid[]) returns uuid`                                       | Administration                                   | `exige_aal2()` ; type `admin_eglise` (42501) ; intitulé de 1 à 80 caractères pour `autre`, vide sinon ; au moins un ministère actif (« Cochez au moins un ministère. ») ; pas de doublon (« Une session Bâtir l'Église est déjà déclarée le samedi 10 octobre. »)                                                                                                                                                  | `session`, `session_attendu`, journal `session_declaree`                                                |
| `modifier_session(p_session_id uuid, p_ministeres uuid[]) returns void`                                                                       | Administration                                   | idem ; au moins un ministère actif                                                                                                                                                                                                                                                                                                                                                                                 | remplace les lignes de `session_attendu`, journal `session_modifiee`                                    |
| `supprimer_session(p_session_id uuid) returns void`                                                                                           | Administration                                   | idem ; aucune participation (« Des ministères ont déjà saisi : la session ne peut plus être supprimée. »)                                                                                                                                                                                                                                                                                                          | supprime la session et ses attendus, journal `session_supprimee`                                        |
| `marquer_relu(p_cible text, p_cible_id uuid) returns void`                                                                                    | EJP Tech                                         | `exige_aal2()` ; type `admin_plateforme` (42501) ; élément existant et porteur de champs libres ; aucune décision déjà prise (« Ce texte a déjà été relu. »)                                                                                                                                                                                                                                                       | `moderation` (`rien_a_signaler`), journal `texte_relu`                                                  |
| `masquer_texte(p_cible text, p_cible_id uuid, p_champ text, p_motif text) returns void`                                                       | EJP Tech                                         | `exige_aal2()` ; type `admin_plateforme` (« Seul EJP Tech peut masquer un texte. », 42501) ; motif de la liste (« Choisissez un motif dans la liste. ») ; couple (cible, champ) autorisé (« Ce champ ne peut pas être masqué. ») ; champ non vide et pas déjà masqué (« Texte introuvable, vide ou déjà masqué. »). Un texte déjà relu peut encore être masqué                                                     | tout le champ devient « [texte masqué par EJP Tech] » ; `moderation` (`masque`), journal `texte_masque` |

Modèle à suivre pour les fonctions `private` (ici `marquer_traite`) :

```sql
create function private.marquer_traite(p_point_id uuid, p_commentaire text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_point public.point_attention%rowtype;
  v_mon_ministere uuid := private.mon_ministere();
  v_commentaire text := nullif(btrim(p_commentaire), '');
  v_par_ministere boolean := false;
begin
  perform private.exige_aal2();
  select * into v_point from public.point_attention where id = p_point_id for update;
  if v_point.id is not null and v_mon_ministere is not null then
    v_par_ministere := v_point.ministere_id = v_mon_ministere
      or exists (select 1 from public.point_mention m
                 where m.point_id = p_point_id and m.ministere_id = v_mon_ministere);
  end if;
  if v_point.id is null or not (private.est_decideur() or v_par_ministere) then
    raise exception 'Ce point n''existe pas ou vous n''y avez pas accès.' using errcode = '42501';
  end if;
  if exists (select 1 from public.point_suivi s where s.point_id = p_point_id and s.statut = 'traite') then
    raise exception 'Ce point est déjà traité.';
  end if;
  if char_length(v_commentaire) > 280 then
    raise exception 'Le commentaire dépasse 280 caractères.';
  end if;
  if v_par_ministere and coalesce(char_length(v_commentaire), 0) < 10 then
    raise exception 'Expliquez ce qui a été traité et comment (10 caractères au moins).';
  end if;
  insert into public.point_suivi (point_id, statut, commentaire) values (p_point_id, 'traite', v_commentaire);
  insert into public.journal (compte, ministere_id, action, cible, cible_id, detail)
  values (auth.uid(), v_point.ministere_id, 'point_traite', 'point_attention', p_point_id,
          jsonb_build_object('avec_commentaire', v_commentaire is not null));
end $$;

create function public.marquer_traite(p_point_id uuid, p_commentaire text default null)
returns void language sql security invoker set search_path = '' as $$
  select private.marquer_traite(p_point_id, p_commentaire);
$$;
```

`masquer_texte` écrit une instruction `update` en dur pour chaque couple autorisé, par exemple :

```sql
if p_cible = 'point_attention' and p_champ = 'description' then
  update public.point_attention set description = '[texte masqué par EJP Tech]'
   where id = p_cible_id and description is not null and description <> '[texte masqué par EJP Tech]'
  returning ministere_id into v_ministere_auteur;
elsif ... -- un bloc par couple de la contrainte de moderation
else
  raise exception 'Ce champ ne peut pas être masqué.';
end if;
get diagnostics v_lignes = row_count;
if v_lignes = 0 then raise exception 'Texte introuvable, vide ou déjà masqué.'; end if;
```

Pour `point_suivi.commentaire`, le ministère auteur est celui du compte `saisi_par` (null pour le berger et le conseil).

### Navigateur

- Les champs libres s'affichent toujours comme du texte (React échappe par défaut). Interdit : `dangerouslySetInnerHTML`, rendu Markdown ou HTML d'un champ libre.
- En-têtes de l'hébergeur (étape 8) : `Content-Security-Policy` stricte (`default-src 'self'`, `img-src 'self' data:` pour le QR code, `connect-src` vers le projet Supabase, `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Robots-Tag: noindex`. Toute route renvoie `index.html`.
- Secrets dans les variables d'environnement, jamais dans le code. `.env` dans `.gitignore`. Clé secrète jamais côté navigateur, jamais dans une variable `VITE_*`.

### Données personnelles

- Données traitées : emails des comptes (les ministères utilisent des adresses partagées, jamais celle d'une personne) ; nom et photo du profil Google quand une personne se connecte avec Google (la portée `profile`, exigée par Supabase, les transmet ; l'outil ne les affiche pas et ne les copie pas) ; adresses IP dans les journaux techniques de Supabase et de l'hébergeur ; informations écrites par erreur dans un champ libre. Un compte dans l'outil d'une église révèle une appartenance religieuse (article 9 du RGPD) : accès limité, double authentification, hébergement UE, sous-traitants sous contrat.
- Page « Confidentialité » (texte statique, non dessinée, accessible depuis l'écran 16 et le menu) : responsable (l'association EJP), finalité, données, destinataires, durées, droits et contact. Aucun traceur, aucun appel à un tiers au chargement : pas de bandeau de consentement.
- Un texte masqué reste dans les sauvegardes Supabase jusqu'à leur expiration (7 jours en offre Pro). Jamais de copie des données de production vers la préproduction : Claude Code lit la préproduction par le serveur MCP.
- À confirmer par la coordination : inscription au registre des traitements, contrats des sous-traitants (Supabase, hébergeur, Google, fournisseur d'emails), fin de vie (section 13, étape 8).

### Tests obligatoires (pgTAP, `supabase/tests/*.test.sql`)

Sur ce poste, Docker ne tourne pas : `npx supabase test db` s'exécute dans la CI (job « base »). Les tests se lancent aussi en local dès que Docker est disponible.

- **Outils** dans `supabase/tests/000-outils.test.sql`, exécuté en premier et sans `rollback` (le schéma `tests` n'existe qu'en local et en CI, jamais dans une migration) : `tests.creer_compte(email, type, ministere)` (ligne minimale dans `auth.users` puis `compte`), `tests.se_connecter(user_id, aal)` (`set_config('role', 'authenticated', true)` et `request.jwt.claims` avec `sub`, `role` et `aal`), `tests.anonyme()`.
- **Matrice** écrite comme des données (table, opération, profil, niveau `aal`, résultat attendu), exécutée en boucle pour les sept profils (ministère créateur, ministère mentionné, autre ministère, berger, conseil, administration, EJP Tech) et l'anonyme, en `aal1` et en `aal2`. Résultats attendus : lecture refusée par la RLS, zéro ligne ; insertion refusée par la RLS, erreur 42501 ; update, delete ou droit absent, erreur 42501 ; en `aal1`, zéro ligne partout, sauf sa propre ligne de `compte`.
- **Fonctions** : chaque fonction appelée en `aal1` échoue. `marquer_traite` : ministère mentionné sans commentaire refusé, avec commentaire accepté ; ministère créateur sans commentaire refusé ; berger et conseil sans commentaire acceptés ; commentaire de 281 caractères refusé ; ministère ni créateur ni mentionné, administration, EJP Tech et anonyme refusés sans rien changer ; point déjà traité refusé. Après un appel accepté : une ligne `point_suivi` `traite` et une seule ligne de journal (compte de l'appelant, ministère créateur). `changer_statut_point` et `marquer_traite` échouent sur un point traité. `creer_point` refuse de se mentionner soi-même et un ministère désactivé. `masquer_texte` et `marquer_relu` : réservés à EJP Tech, couple (cible, champ) hors liste refusé.
- **Intégrité** : un ministère qui envoie `saisi_le = '2099-01-01'` ou le `saisi_par` du berger obtient une ligne datée de maintenant et à son nom ; un samedi ou un dimanche futur refusé ; une valeur « à ce jour » envoyée avec une date ancienne prend la date du jour ; « dont en FIJ » supérieur aux actifs refusé ; session future refusée ; réunion passée refusée ; un envoi de plusieurs lignes donne une seule ligne de journal ; `journal` et `moderation` refusent update, delete et truncate même au propriétaire.
- **Lectures** : un ministère et le berger obtiennent les mêmes totaux et la même fraîcheur ; un ministère reçoit `null` pour la réunion et le point ouvert des autres ; EJP Tech reçoit zéro ligne de chiffres ; un ministère mentionné lit le point, ses mentions et ses suivis, un autre ministère rien ; l'administration ne lit aucun point.
- **Double comptage (D2)** : une session à 13 présents dont 2 déjà comptés compte 11 ; deux ministères à 5 et 5 dont 1 déjà compté donnent 9.
- **Données personnelles** : créer un point dont la description contient un marqueur unique, le marquer traité avec un commentaire qui contient un autre marqueur, masquer les deux textes ; ensuite aucune ligne de `point_attention`, `point_suivi`, `journal` (`detail` compris) ni `moderation` ne contient ces marqueurs.
- **Dates** : `private.dimanche_reference_de` avec des instants fixes : mercredi 30 sept. 2026 12 h donne le 27 sept. (semaine 39) ; dimanche 4 oct. 2026 11 h 59 donne le 27 sept., 12 h 00 le 4 oct. (semaine 40) ; samedi 26 sept. 22 h 30 UTC est le dimanche 27 sept. à Paris ; dimanche 25 oct. 2026 (changement d'heure) 11 h 59 et 12 h 00 ; dimanche 3 janv. 2027 donne la semaine 53.

## 8. Authentification : Google, mot de passe et double authentification

### Les règles

1. **Personne ne s'inscrit seul.** L'inscription est désactivée : seuls les comptes existants se connectent. L'administration de l'église crée les comptes (Edge Function `creer-compte`).
2. **Deux façons de se connecter, au choix** (maquette 16) :
   - **« Continuer avec Google »** (`signInWithOAuth({ provider: 'google' })`), recommandé quand l'adresse du compte est une adresse Google (Gmail ou Google Workspace) ;
   - **email et mot de passe** (12 caractères au moins), pour les autres adresses.
     Quand quelqu'un se connecte avec Google pour la première fois, Supabase **rattache automatiquement** l'identité Google au compte existant qui a la même adresse email, à condition que cette adresse soit vérifiée. C'est pour cela que l'invitation doit être acceptée avant.
3. **Double authentification obligatoire pour tous les comptes** (TOTP, application d'authentification : Google Authenticator, Microsoft Authenticator, etc.).
   - Après le premier facteur (Google ou mot de passe), la session est de niveau `aal1`. Tant qu'elle n'est pas `aal2`, l'application n'affiche que l'écran de code (maquette 18) ou l'écran d'activation (maquette 17).
   - **La base l'impose, pas seulement l'interface** : une politique **restrictive** sur chaque table exposée, en plus des politiques de la section 7 :
     ```sql
     create policy double_authentification on public.<table>
       as restrictive for all to authenticated
       using ((select auth.jwt() ->> 'aal') = 'aal2')
       with check ((select auth.jwt() ->> 'aal') = 'aal2');
     ```
     Une seule exception : en `aal1`, un compte lit sa propre ligne de `compte` (libellé des écrans 17 et 18, détection d'un compte désactivé). Pour `compte`, qui n'a aucune écriture côté client, la politique restrictive devient `for select ... using ((select auth.jwt() ->> 'aal') = 'aal2' or user_id = (select auth.uid()))`. Les fonctions de l'API commencent toutes par `private.exige_aal2()`, car les fonctions `security definer` contournent la RLS. Aucune règle d'accès ne lit `user_metadata`, que l'utilisateur peut modifier lui-même.
   - Activation : supprimer d'abord les facteurs non vérifiés du compte (`mfa.listFactors()` puis `mfa.unenroll()`, sinon un deuxième essai échoue), puis `supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'Pilotage EJP', friendlyName: 'Pilotage EJP' })`. L'application d'authentification affiche alors « Pilotage EJP » ; ce nom reste enregistré dans chaque téléphone, il se fixe avant la mise en service.
   - La double authentification de Google (si le compte Google en a une) **ne compte pas** : Supabase ne peut pas la vérifier. Le code TOTP est toujours demandé. L'interface ne propose jamais de désactiver la double authentification.
4. **Comptes partagés des ministères.** L'email et le code sont partagés par les personnes du ministère. À l'activation, le responsable affiche le QR code une seule fois et chaque personne autorisée le scanne dans sa propre application (le même QR code produit les mêmes codes sur chaque téléphone). L'écran d'activation le dit en clair. **Si une personne quitte le ministère**, dans cet ordre et sans délai (proposition à confirmer par la coordination) :
   1. le responsable du ministère change le mot de passe de la boîte mail partagée (elle reçoit les liens « mot de passe oublié » : c'est la clé de secours du compte) ;
   2. l'administration clique « Refaire l'activation » (écran 13) : `reinitialiser-2fa` supprime les facteurs TOTP (Supabase déconnecte alors les sessions du compte), remplace le mot de passe par une valeur aléatoire et écrit le journal ;
   3. juste après, le responsable passe par « Mot de passe oublié », choisit un nouveau mot de passe et refait l'activation avec les personnes qui restent. Un jeton d'accès déjà émis reste valable jusqu'à son expiration (1 h) : risque accepté.
5. **Perte du téléphone ou du code.** Supabase ne fournit pas de codes de secours. À l'activation, l'écran propose de scanner le même QR code avec un deuxième téléphone, en secours (on n'enregistre pas de deuxième facteur distinct). Sinon, l'administration de l'église clique « Refaire l'activation » (même effet que ci-dessus). Si c'est le compte de l'administration, EJP Tech supprime ses facteurs depuis le tableau de bord Supabase, sur demande écrite de la coordination, et le note au registre d'exploitation.
6. **Sessions et déconnexion.**
   - « Se déconnecter » appelle `supabase.auth.signOut({ scope: 'local' })` : la portée par défaut est `global` et déconnecterait toutes les personnes d'un compte partagé. Ne jamais activer « Single session per user ».
   - Durées (tableau de bord, offre Pro, donc en production) : inactivité 14 jours, durée maximale 30 jours (à confirmer par la coordination). Un ministère saisit une fois par semaine : une inactivité plus courte imposerait mot de passe et code chaque dimanche, et Supabase limite la vérification des codes à 15 par minute (le Wi-Fi de l'église partage une adresse).
7. **Routage selon le niveau** (réévalué à chaque `onAuthStateChange`) :

   | Situation                                                                   | Écran                                                                                                          |
   | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
   | Pas de session                                                              | 16, connexion                                                                                                  |
   | Session, sa ligne `compte` absente ou désactivée                            | « Ce compte est désactivé. Adressez-vous à l'administration de l'église. », puis `signOut({ scope: 'local' })` |
   | `getAuthenticatorAssuranceLevel()` : `currentLevel` et `nextLevel` à `aal1` | 17, activation                                                                                                 |
   | `currentLevel = aal1` et `nextLevel = aal2`                                 | 18, code (facteur : le premier facteur TOTP vérifié de `mfa.listFactors()`)                                    |
   | `currentLevel = aal2`                                                       | l'adresse demandée si le profil y a droit, sinon l'accueil du profil                                           |

### Premier compte et comptes d'administration (proposition à confirmer)

1. **Amorçage, une seule fois**, par EJP Tech, sur demande écrite de la coordination qui donne l'adresse dédiée (D4) : inviter l'adresse dans le tableau de bord Supabase (Authentication, Users), puis dans l'éditeur SQL insérer la ligne `compte` (`admin_eglise`, « Administration de l'église ») et une ligne de journal `compte_cree` avec `compte` nul. L'administration accepte l'invitation, choisit son mot de passe et active la double authentification.
2. Tous les autres comptes (ministères, berger, conseil, EJP Tech) sont créés par l'administration dans l'écran 13, avec `creer-compte`. EJP Tech demande, l'administration décide. `creer-compte` refuse le type `admin_eglise`.
3. Changement d'adresse d'un compte : pas d'écran en V1. Sur demande écrite de l'administration, EJP Tech change l'adresse dans le tableau de bord et le note au registre d'exploitation.

### Les Edge Functions (seul endroit où sert la clé secrète)

| Fonction              | Qui peut l'appeler       | Ce qu'elle fait                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `creer-compte`        | `admin_eglise` en `aal2` | Types `ministere` (nouveau ministère avec son nom et sa description, ou ministère existant sans compte actif, comme FIJ), `berger` (s'il n'y a pas de berger actif), `conseil`, `admin_plateforme` ; jamais `admin_eglise`. Crée le ministère si besoin (journal `ministere_cree`), invite l'adresse (`auth.admin.inviteUserByEmail`, `redirectTo` vers `/acces`), crée la ligne `compte` avec le libellé imposé, écrit le journal `compte_cree`. Si la ligne `compte` échoue, supprime l'utilisateur Auth qu'elle vient de créer. |
| `relancer-invitation` | `admin_eglise` en `aal2` | Renvoie l'invitation d'une adresse pas encore confirmée, écrit le journal.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `desactiver-compte`   | `admin_eglise` en `aal2` | Bannit l'utilisateur dans Auth, pose `compte.desactive_le` et, pour un compte de ministère, `ministere.desactive_le` ; garde toutes les données ; refuse le compte de l'appelant ; écrit le journal.                                                                                                                                                                                                                                                                                                                               |
| `reactiver-compte`    | `admin_eglise` en `aal2` | Lève le bannissement, remet `desactive_le` à null (compte et ministère ; la période d'arrêt compte alors comme active), écrit le journal.                                                                                                                                                                                                                                                                                                                                                                                          |
| `reinitialiser-2fa`   | `admin_eglise` en `aal2` | Supprime les facteurs TOTP du compte (`auth.admin.mfa.deleteFactor`), remplace le mot de passe par une valeur aléatoire, écrit le journal `double_auth_reinitialisee`. Le compte refait l'activation à la connexion suivante.                                                                                                                                                                                                                                                                                                      |

Contrat commun : vérifier le JWT de l'appelant selon la documentation Supabase du moment (bibliothèque `@supabase/server` citée par les analystes, à vérifier à l'étape 2 sans rien inventer) ; refuser (403) tout JWT dont `aal` n'est pas `aal2` et tout appelant dont la ligne `compte` est absente, désactivée ou d'un autre type que `admin_eglise` ; valider le corps avec Zod (schéma partagé avec le formulaire) ; écrire avec le client de la clé secrète, qui lit l'environnement fourni par Supabase (GRANT pour `service_role` sur `compte`, `ministere` et `journal`) ; écrire la ligne de journal après le succès de l'action dans Auth, avec `compte` = identifiant de l'appelant, jamais d'email ; répondre `{ ok: true }` ou `{ erreur: '<code>' }` (400, 401, 403, 409, 500), traduit en français par le front ; aucun email, jeton ni mot de passe dans les journaux de la fonction ; en-têtes CORS et réponse à `OPTIONS`. Tests locaux (quand Docker est disponible, sinon en CI) : sans jeton 401, jeton `aal1` 403, jeton de ministère 403, administration `aal2` 200, et exactement une ligne de journal avec le compte de l'administration.

### Parcours par email : invitation et mot de passe oublié

- **Modèles d'email** (Invite user, Reset password) en français, expéditeur « Pilotage EJP ». Le lien ne consomme pas le jeton : il mène à la page `/acces` qui demande un clic (les antivirus de messagerie ouvrent les liens et consommeraient un jeton à usage unique) : `{{ .SiteURL }}/acces?token_hash={{ .TokenHash }}&type=invite` (`type=recovery` pour le mot de passe oublié). `inviteUserByEmail` ne fonctionne pas avec le flux PKCE.
- **Page `/acces`** (non dessinée, colonne des écrans 16 à 18) : bouton « Continuer ». Au clic : `supabase.auth.verifyOtp({ token_hash, type })`, puis `history.replaceState` pour retirer le jeton de l'adresse. Lien expiré ou déjà utilisé : « Ce lien n'est plus valable. », puis « Demandez à l'administration de l'église de relancer l'invitation. » ou « Demandez un nouveau lien depuis l'écran de connexion. ».
- **Invitation** : après `verifyOtp`, écran « Choisissez votre mot de passe » (12 caractères au moins, `updateUser({ password })`), puis activation (17). Une adresse Google peut ensuite utiliser « Continuer avec Google ».
- **Mot de passe oublié** (lien de l'écran 16) : `resetPasswordForEmail(email)`, puis toujours le même message : « Si un compte existe pour cette adresse, un lien vient de lui être envoyé. Pensez à regarder les courriers indésirables. » Après `verifyOtp` (session `aal1`), si le compte a un facteur vérifié : **écran 18 d'abord**, puis « Nouveau mot de passe » (Supabase refuse le changement de mot de passe en `aal1` quand la double authentification est active).
- **Messages d'erreur** (bandeau de 16, `role="alert"`) : code faux « Ce code ne correspond pas. Attendez le code suivant et réessayez. » ; session `aal1` annulée « Votre connexion a expiré. Reconnectez-vous. » ; compte désactivé « Ce compte est désactivé. Adressez-vous à l'administration de l'église. » ; Google avec une adresse sans compte actif « Cette adresse n'a pas encore de compte actif. Si vous avez reçu une invitation, ouvrez d'abord le lien de l'email. Sinon, adressez-vous à l'administration de l'église. » ; trop de tentatives « Trop de tentatives. Attendez quelques minutes, puis réessayez. ».

### Configuration

- **Google Cloud** : deux projets au nom de l'église (développement et préproduction, production), écran de consentement « Pilotage EJP » publié (statut « En production » : en « Test », seuls 100 utilisateurs listés peuvent se connecter), adresse d'assistance de l'église, portées `openid`, `userinfo.email`, `userinfo.profile`, rien de plus. Identifiant client OAuth de type « Application Web ». URI de redirection : `https://<ref-du-projet>.supabase.co/auth/v1/callback` (et `http://127.0.0.1:54321/auth/v1/callback` pour le local, sur le projet de développement seulement). Le secret de production n'existe que dans le tableau de bord Supabase de production et dans le coffre de l'église.
- **Supabase, local** : à l'étape 2, régler `supabase/config.toml` (les valeurs actuelles viennent de `supabase init`) : `[auth] site_url = "http://127.0.0.1:5173"`, `additional_redirect_urls = ["http://127.0.0.1:5173/acces", "http://localhost:5173/acces"]`, `enable_signup = false`, `minimum_password_length = 12` ; `[auth.email] enable_signup = false`, `otp_expiry = 86400` ; `[auth.mfa.totp] enroll_enabled = true`, `verify_enabled = true` ; `[auth.external.google] enabled = true`, `client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"`, `secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET)"`, `skip_nonce_check = false` ; modèles d'email locaux. Vérifie chaque nom de clé dans le `config.toml` commenté de la CLI installée, sans inventer. En local, les emails se lisent dans la boîte de test de la CLI.
- **Supabase, projets distants** (tableau de bord) : fournisseur Google, TOTP, inscription désactivée, « Email OTP Expiration » à 86400 secondes, Site URL = URL de l'environnement, liste de redirection exacte (production : son URL ; préproduction : aperçus Netlify et `http://localhost:5173`), longueur minimale 12, protection contre les mots de passe divulgués en production.
- **Envoi des emails (obligatoire avant la première recette)** : le service intégré de Supabase n'écrit qu'aux membres de l'équipe du projet, 2 messages par heure : les invitations n'arriveraient pas. SMTP personnalisé au nom de l'église sur la préproduction et la production (proposition : le compte Google de l'église, `smtp.gmail.com`, port 587, mot de passe d'application ; à confirmer), nom d'expéditeur « Pilotage EJP ». Le mot de passe SMTP ne vit que dans le tableau de bord et dans le coffre de l'église.
- **Le secret Google et la clé secrète ne vont jamais dans le code** ni dans une variable `VITE_*` (tout ce qui commence par `VITE_` part dans le navigateur).

### Tests obligatoires

- pgTAP : section 7 (`aal1`, fonctions, matrice).
- Playwright : parcours complet par profil avec mot de passe puis code TOTP, généré dans le test avec `otplib` à partir d'un secret de test (otplib 13 : `await generate({ secret })`), jamais un vrai secret.
- Comptes de test (base locale ou CI seulement) : un script d'installation des tests refuse toute URL autre que `http://127.0.0.1` ou `http://localhost`, donne à chaque compte du jeu d'exemple un mot de passe et un facteur TOTP par l'API d'administration Auth et l'API publique (`mfa.enroll` rend le secret ; jamais d'écriture dans `auth.mfa_factors`), sauf un compte laissé sans facteur, et écrit les secrets dans `e2e/.auth/` (à ajouter à `.gitignore` à l'étape 2). Un projet Playwright « connexion » passe une fois par profil par les écrans 16 puis 18 et enregistre `storageState` ; les autres tests le réutilisent (limite de 15 vérifications de code par minute). L'invitation se teste en lisant l'email dans la boîte locale.
- Playwright : un compte sans double authentification est envoyé vers l'activation et ne voit aucune donnée.
- Manuel, une fois par projet : connexion Google avec une adresse invitée (rattachement) et avec une adresse **non** invitée (refus, message clair de l'écran 16).
- Jamais de test de bout en bout contre la production.

## 9. Écrans

Reproduis les maquettes de `docs/reference/maquettes/`. Ordre de lecture : résumé d'abord, détail ensuite. `LISEZMOI.md` liste les écarts connus entre les maquettes et ce brief : ce brief fait foi.

| Profil                     | Écran                        | Maquette                              | Contenu                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------- | ---------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tous                       | Connexion                    | 16                                    | « Continuer avec Google », ou email et mot de passe. Lien « Mot de passe oublié ». Messages d'erreur de la section 8, pas d'inscription. Lien « Confidentialité ».                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Tous                       | Double authentification      | 17, 18                                | Activation à la première connexion (QR code ; consigne et encadré « Compte partagé » pour un ministère ; « Vous pouvez aussi scanner ce code avec un deuxième téléphone, en secours. »), puis code à chaque connexion (« ... le code à 6 chiffres de « Pilotage EJP » »).                                                                                                                                                                                                                                                                                                                                                                                                 |
| Tous                       | Accès par lien, mot de passe | non dessinés, colonne de 16 à 18      | `/acces` (bouton « Continuer »), « Choisissez votre mot de passe », « Mot de passe oublié », « Nouveau mot de passe » (section 8).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Berger et conseil          | Cette semaine                | 01, 02, 03                            | Numéro de semaine et phrase de la semaine (règles plus bas), tableau des chiffres (valeur, écart à périmètre égal, courbe, date, complétude), « À décider », dernière session et manquants, carte des FIJ, « Les ministères » triés du moins récent au plus récent (« Aucune saisie » d'abord), puis par nom.                                                                                                                                                                                                                                                                                                                                                             |
| Berger et conseil          | Ministères                   | bloc « Les ministères » de 01, 02, 03 | Titre « Ministères ». Phrase : « Du moins récent au plus récent. Ouvrez un ministère pour voir sa fiche. » Tableau de 01 avec la description sous le nom ; chaque nom ouvre la fiche. Ministères actifs seulement.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Berger et conseil          | Fiche d'un ministère         | 04                                    | Phrase de la fiche, ses chiffres avec historique (les indicateurs propres avec leur date, « Saisi le 24 sept. »), ses points (créés ou mentionnés, et les points traités depuis 7 jours), calendrier (événements datés d'au plus 7 jours dans le passé, par date puis nom, statuts en mots), prochaine réunion, « Dernières saisies » (5 dernières lignes écrites par ce ministère, « Tout le journal » vers le journal filtré). Lecture seule, sauf « Marquer traité ».                                                                                                                                                                                                  |
| Berger et conseil          | Points d'attention           | 05                                    | Onglets Ouverts, Traités, Tous, avec leur nombre. Ouverts : par priorité, puis échéance (sans échéance en dernier), puis création. Traités : du plus récent au plus ancien, avec « Traité le 30 sept. par Coordination » et le commentaire entre guillemets. Tous : les ouverts, puis les traités. « Traités récemment » : les 5 derniers. Filtre « Tous les ministères » : points créés par le ministère choisi ou qui le mentionnent. Échéance dépassée (avant aujourd'hui, heure de Paris) en rouge **et** avec le mot « dépassée ».                                                                                                                                   |
| Berger et conseil          | Journal                      | 06                                    | Date (heure de Paris), compte, action, détail, du plus récent au plus ancien, 50 lignes puis « Afficher 50 lignes de plus ». Filtres : Compte (libellés), Action (libellés du tableau des actions, section 6), Période (7 derniers jours, 30 derniers jours par défaut, 3 derniers mois, depuis le début), et le ministère pris dans l'adresse (« Ministère : Communication », bouton « Retirer le filtre »). Liste vide : « Aucune ligne pour ces filtres. »                                                                                                                                                                                                             |
| Ministère                  | Cette semaine                | 07, puis blocs de 01                  | Même contenu à toutes les tailles (« Accueil du ministère », plus bas).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Ministère                  | Ma fiche                     | 12                                    | Comme 04, avec les boutons de saisie. Sur ses points et ceux qui le mentionnent : « Changer le statut » et « Marquer traité » (commentaire obligatoire). Sur un point où il est mentionné : « Mentionné par Intégration. » et ces deux boutons. Sur chaque événement : « Mettre à jour ». Prochaine réunion : « Modifier » ou « Renseigner ».                                                                                                                                                                                                                                                                                                                             |
| Ministère                  | Saisies                      | 08, 09, 10, 11 et saisies dérivées    | Dimanche, session, nouveau point (mentions, compteur de 280 caractères), événement, et les saisies non dessinées plus bas. Page entière sous 600 px, panneau latéral de 460 px à partir de 600 px. Moins d'une minute chacune.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Ministère                  | Mes points, Mon journal      | 05, 06 filtrés                        | Mes points : points créés par le ministère ou qui le mentionnent, sans filtre de ministère. Mon journal : lignes de son ministère et de son compte, sans filtre Compte.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Ministère, berger, conseil | Marquer traité               | non dessinée, dérivée de 10           | Fenêtre ouverte par « Marquer traité », pour tous les profils (plein écran sur téléphone, panneau de 460 px au-delà). Titre « Marquer traité », titre du point entre guillemets, champ « Ce qui a été traité, et comment » (ministère, obligatoire) ou « Commentaire (facultatif) » (berger, conseil), rappel sur les données personnelles, compteur « 0 sur 280 », phrase « Un point traité ne se rouvre pas. », boutons « Marquer traité » (principal) et « Annuler ». Le bouton n'est jamais grisé : si le commentaire manque, « Expliquez ce qui a été traité et comment (10 caractères au moins). » s'affiche sous le champ. Après succès : « Point marqué traité. » |
| Administration de l'église | Cette semaine                | blocs de 01                           | Ouverture de 01 (numéro de semaine, phrase de l'église sans les points ni surligneur), puis les blocs de l'église, sans action.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Administration de l'église | Ministères et comptes        | 13                                    | Voir « Ministères et comptes », plus bas.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Administration de l'église | Sessions                     | 14                                    | Liste des sessions (« 6 sur 8 », puis « Manquent : Intégration, Coordination »), panneau « Déclarer une session » : type en trois boutons (« Bâtir l'Église », « Anti-Dispersion », « Autre rassemblement » avec le champ « Nom du rassemblement »), date, ministères attendus (tous les actifs cochés par défaut). « Modifier » (ministères attendus) sur chaque session ; « Supprimer » sur une session sans saisie, avec confirmation. Sous 1024 px, la colonne devient un bouton « Déclarer une session » qui ouvre le formulaire en page entière.                                                                                                                    |
| Administration de l'église | Journal                      | 06                                    | Comme le berger.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| EJP Tech                   | Modération                   | 15                                    | Voir « Modération », plus bas.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| EJP Tech                   | Journal technique            | 06                                    | Titre « Journal technique ». Phrase : « Les actions sur les comptes et la modération des champs libres. Les chiffres saisis n'y figurent pas. » Colonnes Date, Compte, Action, Détail ; filtres Action (actions techniques) et Période. Liste vide : « Aucune action technique sur cette période. »                                                                                                                                                                                                                                                                                                                                                                       |
| Tous                       | Confidentialité              | non dessinée                          | Page de texte statique (section 7, « Données personnelles »).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

États à construire même s'ils ne sont pas dessinés (chargement, vide, erreurs, réussite, session expirée, compte désactivé, premier dimanche, validation) : textes dans `maquettes/LISEZMOI.md`, section « États ».

### Vue de l'église selon le profil

| Élément                                                     | Berger, conseil                       | Ministère                            | Administration de l'église                        |
| ----------------------------------------------------------- | ------------------------------------- | ------------------------------------ | ------------------------------------------------- |
| Phrase                                                      | phrase de la semaine, avec surligneur | la sienne (accueil du ministère)     | phrase de l'église, sans les points ni surligneur |
| Chiffres de l'église, session, carte des FIJ                | oui                                   | oui (« L'église cette semaine »)     | oui                                               |
| « À décider »                                               | oui                                   | non (« Vos points » à la place)      | non                                               |
| Les ministères : Ministère, Mise à jour, Prochain événement | oui                                   | oui                                  | oui                                               |
| Les ministères : Prochaine réunion, Point ouvert            | oui                                   | non (colonnes retirées)              | non (colonnes retirées)                           |
| Nom d'un ministère cliquable                                | vers sa fiche                         | seulement le sien, vers « Ma fiche » | non                                               |

EJP Tech n'a pas de vue de l'église. Colonne « Point ouvert » : priorité la plus haute parmi les points ouverts créés par ce ministère, sinon « Aucun ». Toutes ces colonnes viennent de `v_tableau_ministeres`.

### Points ouverts, « À décider » et phrases

- **Ordre de « À décider »** : d'abord les points « En attente de décision », puis par priorité (Urgente, Haute, Normale), puis par échéance (sans échéance en dernier), puis du plus ancien au plus récent : `order by (statut = 'attente_decision') desc, priorite desc, echeance asc nulls last, cree_le asc`, sur les points dont le statut n'est pas `traite`. « À décider » montre les 3 premiers à toutes les tailles, chacun avec « Marquer traité », puis le lien « Tous les points » (onglet Ouverts de 05). Aucun point ouvert : « Aucun point ouvert. ». Sur téléphone, le bloc remonte juste après la phrase quand au moins un point ouvert a la priorité Urgente.
- **Phrase de la semaine** (berger et conseil), calculée dans l'interface par une fonction pure (`src/lib/phrases.ts`, testée avec Vitest) à partir des seules données que le compte peut lire :
  - A : « 52 STARs au service dimanche. » ; personne n'a saisi : « Aucun ministère n'a encore saisi les chiffres du dimanche 27 sept. » ;
  - B : « Tous les ministères ont saisi », « Un ministère n'a pas encore saisi » ou « Deux ministères n'ont pas encore saisi » ;
  - C, surligné, seulement s'il existe des points ouverts « En attente de décision » : « , et un point attend votre décision » ou « , et 3 points attendent votre décision ». La phrase ne reprend jamais un texte libre : « un budget », dans la maquette 01, est un exemple écrit à la main ;
  - assemblage « {A} {B}{C}. » ; nombres en lettres de un à dix en début de phrase, en chiffres ailleurs ;
  - ligne secondaire, deux phrases au plus : les ministères sans mise à jour depuis plus de 30 jours (« Social n'a rien mis à jour depuis 31 jours. ») ; la dernière session passée, à périmètre égal (« Bâtir l'Église progresse de 1 présent », « recule de 3 présents » ou « est stable », suivi de « , et le total est incomplet : Coordination et Intégration n'ont pas saisi. » ou de « . »). Listes de noms : « A », « A et B », « A, B et C ».
  - Administration de l'église : A, B et la ligne secondaire, sans C ni surligneur.
- **Phrase d'une fiche** (04, 12, la même pour tous) : « 10 STARs au service dimanche, 14 actifs dont 11 en FIJ. » Dimanche de référence non saisi : « Chiffres du dimanche 27 sept. non saisis. Dernière saisie : 9 STARs au service le 20 sept. » Une valeur jamais saisie est omise. Partie surlignée, s'il existe des points ouverts du ministère « En attente de décision » : « Un point attend une décision. » (« 2 points attendent une décision. »).
- Les nombres et les points des maquettes sont des exemples : l'écran affiche les données de la base.

### Accueil du ministère (07, puis blocs de 01)

Même contenu à toutes les tailles, dans cet ordre :

1. Surtitre « Semaine 39, du 21 au 27 sept. » et phrase de ce qu'il reste à faire.
2. Bouton principal jaune (s'il reste quelque chose à faire), puis les boutons secondaires « Saisir une session » et « Nouveau point » (et « Mettre à jour la carte des FIJ » pour le ministère FIJ). On retire des secondaires celui qui est devenu le bouton principal.
3. « Vos saisies » de la semaine de référence (règle 11), dans cet ordre : « Chiffres du dimanche 27 sept. » (Fait si une saisie `service` existe pour ce dimanche : « Fait, 10 au service ») ; chaque session où le ministère est attendu, datée du lundi de la semaine de référence à aujourd'hui (« Bâtir l'Église du 26 sept. », Fait « 13 présents ») ; « Prochaine réunion » (« Fait, lundi 5 oct., 20 h » ou « À faire, date non confirmée ») ; pour le seul ministère FIJ, « Carte des FIJ » (Fait si le dernier envoi a moins de 30 jours). Chaque ligne a son bouton : « Corriger » si Fait, « Saisir » ou « Renseigner » sinon.
4. « Vos points » : ses points ouverts et ceux qui le mentionnent, puis ses points traités depuis 7 jours (« Traité le 30 sept. par Coordination » et le commentaire) : c'est ainsi que le ministère créateur apprend qu'un ministère mentionné a traité son point. À partir de 1024 px, dans la colonne de droite de 380 px, à la place de « À décider ».
5. « L'église cette semaine » : sous 600 px, trois chiffres (STARs au service, STARs présents en FIJ, dernière session) et un bouton « Tout voir » (`aria-expanded`) qui déplie sur place le tableau des chiffres, la session, la carte des FIJ et les ministères. À partir de 600 px, ces blocs s'affichent directement.

Phrase et bouton principal : la première chose « À faire » de « Vos saisies » donne le bouton (« Saisir les chiffres du dimanche », « Saisir la présence à Bâtir l'Église », « Renseigner la prochaine réunion », « Mettre à jour la carte des FIJ »). Phrase : « Vos chiffres sont à jour. » si les chiffres et les sessions sont faits, puis, surligné, ce qui reste (« Il reste la date de la prochaine réunion. », « Il reste les chiffres du dimanche 4 oct. et la date de la prochaine réunion. »). Tout est fait : « Tout est à jour pour la semaine 39. », sans bouton jaune. Comme le dimanche de référence bascule le dimanche à 12 h, la ligne des chiffres redevient « À faire » à ce moment. La note de conception de 07 (« Le dimanche midi, ce bouton devient... ») ne s'affiche pas.

### Saisies non dessinées et précisions

- **Saisie du dimanche (08)** : titre = dimanche de référence ; lien « Choisir un autre dimanche » (les 4 derniers, « (déjà saisi) » s'il y a lieu). « STARs au service ce dimanche » : obligatoire, 0 à 999, aide « Les STARs qui ont servi dans votre ministère ce dimanche. Si personne n'a servi, enregistrez 0. » et « Dimanche dernier : 9 » (ou « non saisi »). « STARs actifs » (aide « Comptez chaque STAR dans un seul ministère : son ministère principal. ») et « Dont en FIJ » (aide « Parmi ces STARs actifs, ceux qui participent à une FIJ. », puis « 79 % des actifs ») : préremplis avec la dernière valeur et **enregistrés à chaque envoi**, même inchangés (l'envoi confirme la valeur à ce jour) ; vides, ils ne sont pas enregistrés. Les indicateurs propres actifs suivent, dans l'ordre de `ordre` (« dimanche » : vide ; « à ce jour » : prérempli). Tout part en **un seul insert**. Si une saisie existe déjà pour ce dimanche : « Déjà saisi : 10, le 27 sept. à 12 h 41. Votre saisie la remplacera dans les totaux. » Pendant l'envoi, le bouton affiche « Enregistrement en cours » et ne répond plus. « Corriger » (07) ouvre 08 sur ce dimanche avec le surtitre « Corriger les chiffres du dimanche » et le bouton « Enregistrer la correction ».
- **Saisie d'une session (09)** : « Saisir une session » ouvre directement 09 si une seule session passée ou du jour attend la saisie du ministère ; sinon le panneau « Choisir la session » (une ligne de 48 px par session, les plus récentes d'abord, « Bâtir l'Église, samedi 26 sept. : à saisir » ou « : 12 présents saisis »), avec « Changer de session » vers les 8 dernières sessions passées. Une session future n'apparaît pas. Champs : « STARs de votre ministère présents » (champ numérique entre moins et plus, 0 à 999 ; aide « Comptez tous vos STARs présents, même ceux qui servent aussi dans un autre ministère. ») ; « Dont déjà comptés par leur ministère principal » (petit compteur, 0 par défaut ; aide « Les STARs présents dont le ministère principal est un autre ministère. Ce ministère les compte déjà. ») ; ligne calculée « Comptés dans le total de l'église : 11. » ; erreur « Ce nombre ne peut pas dépasser les présents. » ; la ligne « Un nombre de personnes seulement, jamais de noms. » reste.
- **Bloc de la session (01 à 03)** : la dernière session passée, tous types confondus, avec un lien vers chaque autre type qui a une session passée (« Voir Anti-Dispersion », « Voir les autres rassemblements »), à toutes les tailles. Le grand chiffre est le total sans double compte ; la barre et la liste montrent l'apport de chaque ministère (présents moins déjà comptés, avec « (13 saisis) » quand il diffère). S'il y a des STARs déjà comptés : « 61 présences saisies : 3 STARs saisis par deux ministères ne sont comptés qu'une fois. » Note sous le tableau des chiffres : « Chaque chiffre additionne les saisies des ministères. Un STAR saisi par deux ministères n'est compté qu'une fois. Courbes : dix derniers dimanches ou quatre dernières sessions. » Titre d'un rassemblement : « {nom}, samedi 17 octobre ».
- **Nouveau point (10)** : titre obligatoire (80), « Ce qui se passe » (280, facultatif), « Ce qui est attendu » (80, facultatif), priorité, échéance facultative (aujourd'hui ou plus tard), mentions (cases à cocher des ministères actifs autres que lui). Note sous les mentions : « Le ministère mentionné verra ce point, et seulement ce point. Il pourra le marquer traité en expliquant ce qui a été fait. Le berger et le conseil voient tous les points. »
- **Changer le statut** (panneau dérivé de 10, pour le ministère créateur et les ministères mentionnés) : rappel du titre du point, trois boutons segmentés « À traiter », « En cours », « En attente de décision » (le statut actuel sélectionné), bouton « Enregistrer le statut ». Après succès : « Statut enregistré : En cours. »
- **Ajouter un événement (11)** : date (aujourd'hui ou plus tard), nom (80, rappel sur les données personnelles), statut. Pas d'heure ni de lieu. **Mettre à jour l'événement** : même panneau, ouvert par « Mettre à jour » sur chaque ligne du calendrier de 12, nom en lecture seule, date et statut préremplis, bouton « Enregistrer la mise à jour » ; aide « La validation se fait en dehors de l'outil. Ici, on reporte seulement le statut. ».
- **Prochaine réunion** (panneau dérivé de 11) : « Date » (obligatoire, aujourd'hui ou plus tard), « Heure » (facultative), « Objet » et « Décision attendue » (facultatifs, 80 caractères, rappel sur les données personnelles), bouton « Enregistrer la réunion ». « Renseigner » l'ouvre vide, « Modifier » prérempli. Affichage : 01 « 6 oct. » ou « Non renseignée » ; 04 et 12 « Prochaine réunion : lundi 5 oct., 20 h », puis l'objet et « Décision attendue : ... ».
- **FIJ par département** (panneau dérivé de 08, ministère FIJ seulement) : 8 champs numériques préremplis (« 75 Paris », « 77 Seine-et-Marne », « 78 Yvelines », « 91 Essonne », « 92 Hauts-de-Seine », « 93 Seine-Saint-Denis », « 94 Val-de-Marne », « 95 Val-d'Oise »), deux colonnes sous 600 px, quatre au-delà, ligne « Total : 29 FIJ » mise à jour en direct, bouton « Enregistrer la carte ». Les 8 lignes partent en un seul insert.

### Ministères et comptes (13)

- Colonne « Double authentification » (depuis `v_etat_comptes`) : « Invitation envoyée » (orange, action « Relancer l'invitation ») ; « À activer » (orange, pas d'action) ; « Activée » (vert, action « Refaire l'activation ») ; « Désactivé le 12 oct. » (action « Réactiver »).
- **Ajouter un ministère** (panneau dérivé de la colonne de 14) : « Nom du ministère » (unique), « Description » (facultative, 280, rappel « N'écrivez aucun nom ni information personnelle. »), « Email partagé du ministère » (aide « Une boîte mail partagée par le ministère, pas l'adresse d'une personne. »), bouton « Créer le ministère et envoyer l'invitation ».
- **Ajouter un membre du conseil** : « Email personnel », puis « Nom affiché : Conseil, compte 5 » (automatique, jamais réutilisé). « Ajouter le compte du berger » n'apparaît que s'il n'y a pas de berger actif. Section « EJP Tech » : « Ajouter un compte EJP Tech » (même panneau).
- Colonne « Indicateurs propres » en lecture (« FIJ par département » pour le ministère FIJ), avec sous le tableau : « Pour ajouter un indicateur propre ou changer la liste des statuts d'événement, faites une demande à EJP Tech. »
- **Confirmations** (fenêtre, « Annuler » et le bouton d'action) : « Désactiver Communication ? » (« Plus personne ne pourra se connecter avec communication@ejp.exemple. À partir d'aujourd'hui, Communication ne compte plus dans les totaux ni dans la complétude. Ses saisies et son historique restent. », bouton « Désactiver le ministère ») ; « Désactiver Conseil, compte 3 ? » (bouton « Désactiver le compte ») ; « Refaire l'activation de Communication ? » (« À faire quand une personne quitte ou rejoint le ministère, ou perd son téléphone. Changez d'abord le mot de passe de la boîte mail du ministère. », bouton « Refaire l'activation »).
- Sur téléphone, chaque compte devient un bloc (nom, email, état), boutons en pleine largeur l'un sous l'autre.

### Modération (15)

- Un élément de la file est une écriture : un point (titre, ce qui se passe, ce qui est attendu), un commentaire de traitement, un événement (nom) ou une réunion (objet, décision attendue). Tous ses champs libres non vides s'affichent ensemble, avec le type, l'auteur (ministère, « Berger » ou « Conseil, compte 3 ») et la date. L'écran montre tous les éléments à relire, puis ceux des 30 derniers jours. « N textes en attente » compte les éléments à relire.
- « Rien à signaler » appelle `marquer_relu` ; la ligne affiche ensuite « Relu le 29 sept. : rien à signaler ».
- « Masquer le texte » ouvre une fenêtre : choix du champ (seulement les champs non vides), motif par boutons radio (« Nom d'une personne », « Coordonnées (téléphone, adresse, email) », « Santé ou situation personnelle », « Autre information personnelle »), phrase « Le texte sera remplacé par « [texte masqué par EJP Tech] ». Cette action ne peut pas être annulée. », bouton « Masquer définitivement ». La ligne affiche ensuite « Masqué le 29 sept. : nom d'une personne ». Partout où il s'affiche, un texte masqué apparaît en `--encre-3`.

### Adresses

| Adresse                                                                                                                                             | Profils                                    | Écran                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| `/connexion`, `/connexion/mot-de-passe-oublie`                                                                                                      | non connectés                              | 16, demande du lien                                                    |
| `/acces`                                                                                                                                            | lien d'invitation ou de récupération       | bouton « Continuer », puis mot de passe                                |
| `/double-authentification`                                                                                                                          | session `aal1`                             | 17 si aucun facteur vérifié, sinon 18                                  |
| `/confidentialite`                                                                                                                                  | tous                                       | page statique                                                          |
| `/`                                                                                                                                                 | ministère, berger, conseil, administration | Cette semaine (EJP Tech est renvoyé vers `/moderation`)                |
| `/ma-fiche`                                                                                                                                         | ministère                                  | 12                                                                     |
| `/ministeres`, `/ministeres/:id`                                                                                                                    | berger, conseil                            | liste, 04 (un ministère qui ouvre sa propre fiche va vers `/ma-fiche`) |
| `/points` (`vue` : ouverts, traites, tous ; `ministere`)                                                                                            | ministère, berger, conseil                 | 05                                                                     |
| `/journal` (`compte`, `action`, `periode`, `ministere`)                                                                                             | ministère, berger, conseil, administration | 06                                                                     |
| `/comptes`, `/sessions`                                                                                                                             | administration                             | 13, 14                                                                 |
| `/moderation`, `/journal-technique`                                                                                                                 | EJP Tech                                   | 15, journal technique                                                  |
| `/saisir/dimanche` (`date`), `/saisir/session/:id`, `/saisir/point`, `/saisir/evenement`, `/saisir/evenement/:id`, `/saisir/reunion`, `/saisir/fij` | ministère (FIJ pour la carte)              | saisies                                                                |

Chaque route déclare ses profils ; la garde lit le type de compte (après `aal2`) avant tout appel de données. Adresse réservée à un autre profil : « Cette page n'est pas disponible avec votre compte. », « Elle est réservée à un autre profil. », bouton « Revenir à l'accueil », aucune requête. Adresse inconnue : « Page introuvable », « L'adresse est incomplète ou n'existe plus. ». Les filtres vivent dans l'adresse. Une saisie ouverte à partir de 600 px s'affiche en panneau au-dessus de la page d'origine ; « Retour », « Annuler » et le bouton Précédent la ferment.

### Formats

Heure de Paris pour tous les calculs et affichages, par `Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris' })` ; l'interface lit `v_semaine` au lieu de recalculer. « 27 sept. », « Dimanche 27 sept. », « Sam. 3 oct. », « lundi 5 oct., 20 h », « lundi 5 oct., 20 h 30 » ; journal « 27 sept., 12 h 41 » ; fraîcheur « Aujourd'hui », « Hier », « Il y a 3 jours ». Mois abrégés : janv., févr., mars, avr., mai, juin, juil., août, sept., oct., nov., déc. Un écart s'écrit « +2 » ou avec le signe moins U+2212 suivi du nombre, jamais avec un tiret.

## 10. Design et UX (direction C, validée)

- **Tokens** : copie `docs/reference/tokens.css` dans `src/styles/tokens.css` et branche-les dans la configuration Tailwind. Aucune couleur en dur dans les composants. Ajoute dans `src/styles/tokens.css` (jamais dans la référence) un token de focus bleu nuit (`--focus: var(--nuit)` ; le jaune n'aurait que 1,3:1 sur `--fond`) et cinq teintes pleines pour la carte des FIJ, chacune avec la couleur de texte qui passe AA (`--encre` sur les deux plus claires, `--papier` au-delà).
- **Trois polices, trois rôles** : Newsreader pour les phrases et les titres, Big Shoulders Display pour toutes les valeurs (effectifs, pourcentages, écarts, numéro de semaine) en `tabular-nums`, Public Sans pour l'interface ; les dates et les heures restent en Public Sans avec `tabular-nums`. Via `@fontsource` (pas d'appel à Google au chargement).
- **Une seule couleur de lumière, le jaune** `--lumiere`, et trois usages seulement : le surligneur de ce qui attend une décision (berger, conseil) ou une action (accueil et fiche du ministère), l'onglet actif, le bouton principal. Le bleu nuit est réservé aux données (courbes, barres, carte). Vert, orange, rouge réservés aux états, toujours doublés d'un mot.
- **Formes** : angles droits, pas d'ombre, pas de carte. Les sections sont séparées par un titre en serif et un filet de 2 px. Les lignes par des filets de 1 px.
- **Interdits** : dégradés, violet, emoji, icônes décoratives, barres de couleur sur le bord d'un bloc, pastilles partout, surtitres en capitales qui répètent un titre.
- **Responsive, mobile d'abord** (règles complètes dans `BRIEF_DESIGN.md`, section 6) : paliers 360, 600, 1024, 1440 px ; contenu plafonné à 1280 px ; les tableaux deviennent des listes sur téléphone ; aucun défilement horizontal à 360 px ; cibles de 44 px partout (y compris les boutons dessinés à 40 px dans 12 et 13), 64 px pour plus et moins (`--cible-saisie`) ; bouton d'enregistrement accessible au pouce.
- **Accessibilité** : contraste AA (les tokens sont vérifiés), focus visible, libellés sur tous les champs, `prefers-reduced-motion` respecté, utilisable avec un zoom à 200 %. Priorité, statut et type de session sont de vrais boutons radio dans un `fieldset` avec `legend` ; les mentions, de vraies cases à cocher. Chaque courbe a un équivalent texte (« Dix derniers dimanches : 49, 51, 55, 52 »). La carte des FIJ est une liste (« Paris (75) : 4 FIJ »). Audit par `@axe-core/playwright`.
- **Textes** : français simple, voix active. Les boutons disent ce qu'ils font (« Enregistrer les chiffres », « Marquer traité »). Aucun tiret cadratin ni demi-cadratin. Titre de page : « {écran}, Pilotage EJP » (« Cette semaine, Pilotage EJP »).

## 11. Hors périmètre de la première version

Thème sombre, notifications, validation dans l'outil, gestion des personnes ou des équipes, gestion documentaire, application mobile native, export automatique vers l'application complète. Aussi : rouvrir un point traité ; changer le titre, la priorité, l'échéance ou les mentions d'un point après sa création ; écran de création des indicateurs propres ; deuxième facteur TOTP distinct ; graphique d'évolution (seules les petites courbes des maquettes) ; comptage des événements du calendrier ; heure et lieu des événements ; changement d'adresse d'un compte depuis l'écran 13.

## 12. Définition de « terminé » pour chaque étape

- En local : `npm run lint` (ESLint et contrôle des textes), `npm run format:check`, `npm run typecheck`, `npm test -- --run`, `npm run build` et `npm run e2e` passent (`/verifier` les enchaîne). Tant que Docker manque sur ce poste, les parcours Playwright qui lisent la base ne tournent qu'en CI.
- Base : `npx supabase test db` passe. Sur ce poste, sans Docker, il tourne dans la CI : l'étape n'est terminée que quand la CI (jobs « qualite », « base » et « e2e ») est verte sur la branche envoyée par la personne.
- Captures Playwright de l'écran concerné en 1440, 834 et 390 px, comparées à la maquette par le sous-agent `ui-reviewer`.
- Toute nouvelle table a ses GRANT, sa politique RLS et ses tests, relus par le sous-agent `rls-auditor`.
- Aucun secret dans le dépôt.
- Un commit clair par étape, après `/verifier` au vert et l'accord de la personne. Claude ne pousse jamais : la personne pousse à la main vers le dépôt de l'église (D6).

## 13. Plan de construction (une étape à la fois)

Travaille en **mode plan** au début de chaque étape, présente le plan, attends mon accord, puis code.

| Étape | Contenu                                                                                                                                                                                                                                                                                                                                                                                                                                    | Vérification                                                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Échafaudage Vite + TS + Tailwind + shadcn, ESLint, Prettier, Vitest, Playwright, CI. **Fait.**                                                                                                                                                                                                                                                                                                                                             | Build et CI verts                                                                                                                              |
| 1     | Migrations de la section 6, dans l'ordre : droits par défaut et schéma `private` ; types et tables ; fonctions d'aide et triggers ; RLS, politiques et GRANT ; vues et fonctions de lecture ; fonctions de l'API ; données de référence. Puis `supabase/seed.sql` (jeu d'exemple ci-dessous) et les tests pgTAP de la section 7.                                                                                                           | CI job « base » vert (`npx supabase db start`, `npx supabase test db`), revue `rls-auditor`                                                    |
| 2     | Authentification (section 8) : `config.toml`, Google et mot de passe, `/acces`, activation et code, routage selon le niveau, Edge Functions de comptes, SMTP de la préproduction ; clé publique dans `.env.example` ; `e2e/.auth/` dans `.gitignore` ; comptes de test ; le job « e2e » de la CI démarre Supabase et charge le jeu d'exemple. Puis chargement du compte, navigation et accueil selon le profil (maquettes 00, 16, 17, 18). | pgTAP `aal1` refusé ; E2E : chaque profil passe par le code, arrive sur son accueil et ne voit que ses onglets ; adresse interdite sans donnée |
| 3     | Vue de l'église                                                                                                                                                                                                                                                                                                                                                                                                                            | E2E + captures + revue `ui-reviewer`                                                                                                           |
| 4     | Fiche ministère et saisies                                                                                                                                                                                                                                                                                                                                                                                                                 | E2E : une saisie crée une ligne, l'historique grandit, le journal aussi (une ligne par envoi)                                                  |
| 5     | Points d'attention, mentions, statuts et « Marquer traité »                                                                                                                                                                                                                                                                                                                                                                                | E2E : un ministère mentionné voit le point et le marque traité avec un commentaire, un autre ne le voit pas                                    |
| 6     | Journal, administration de l'église (comptes, sessions) et modération                                                                                                                                                                                                                                                                                                                                                                      | E2E administration et EJP Tech                                                                                                                 |
| 7     | Finitions : responsive 360 à 1440 px, accessibilité, états vides, erreurs réseau                                                                                                                                                                                                                                                                                                                                                           | Audit accessibilité Playwright (`@axe-core/playwright`)                                                                                        |
| 8     | Déploiement (comptes au nom de l'église) et `docs/exploitation.md` (plan ci-dessous)                                                                                                                                                                                                                                                                                                                                                       | Recette sur la préproduction, aucune erreur de politique de contenu dans la console                                                            |

### Jeu d'exemple de l'étape 1 (`supabase/seed.sql`, local et CI seulement)

- Les données du prototype, reproduites par son générateur (graine 7) : 8 ministères, 10 dimanches, actifs et FIJ, 8 sessions, 11 événements, 7 réunions ; les lignes du journal du prototype deviennent de vraies saisies. `deja_comptes` vaut 0 dans ces données ; le double comptage se teste par des jeux ciblés.
- Les données propres aux maquettes : l'indicateur propre « Visuels livrés ce mois » ; la carte des FIJ (75 : 4, 77 : 3, 78 : 2, 91 : 3, 92 : 5, 93 : 6, 94 : 4, 95 : 2, envoyée le 21 sept.).
- Les comptes d'exemple (un par ministère, le berger, deux membres du conseil, l'administration, EJP Tech), insérés dans `auth.users` avec des uuid fixes et des adresses en `@exemple.test` (colonnes minimales, comme les outils pgTAP), puis dans `compte`. L'étape 2 leur donne un mot de passe et un facteur TOTP (section 8).
- Points d'attention (union du prototype et des maquettes). Ouverts : Financement de Welcome Prodiges (Intégration, Urgente, En attente de décision, 5 oct., aucune mention) ; Planning du trimestre à valider (Coordination, Haute, À traiter, 28 sept.) ; Salle pour la soirée de louange (Communication, Haute, En cours, 3 oct., @coordination) ; Renfort de 4 STARs pour la sortie (Jeunesse, Normale, À traiter, 10 oct., @social) ; Visuels pour Welcome Prodiges (Intégration, Normale, À traiter, 8 oct., @communication) ; Réimpression des supports (Prodiges Junior, Normale, En cours, 11 oct.). Traités, chacun avec un commentaire d'exemple quand le compte n'est pas le berger : Micros pour Bâtir l'Église (Communication, par le berger, 30 sept.) ; Transport des Prodiges Junior (Prodiges Junior, par « Conseil, compte 3 », 26 sept.) ; Clés de la salle annexe (Coordination, par Coordination, 21 sept.) ; Lieu de stockage de la collecte (Social, par le berger, 14 sept., @coordination). Modération : un point de Social masqué (motif « nom d'une personne ») et un point de Coordination relu.
- Chaque ligne porte `saisi_le` (heure de Paris) et `saisi_par` explicites ; les lignes d'un même envoi partagent `saisi_le`. Toutes les dates sont décalées d'un nombre entier de semaines, calculé au chargement, pour que le dimanche 27 sept. 2026 devienne `private.dimanche_reference()` : le jeu reste « actuel » et les tests ne vieillissent pas.
- Valeurs attendues (dates avant décalage ; les tests vérifient ce qui ne dépend pas du jour) : service du 27 sept. 52, 6 sur 8, écart +3 sur 6 ministères ; STARs actifs 83, 8 sur 8, 1 valeur de plus de 30 jours (Social, 27 août) ; en FIJ 64 sur 83, 77 %, 8 sur 8 ; carte 29 FIJ, 8 dép. ; Bâtir l'Église du 26 sept. 58, 6 sur 8, manquent Coordination et Intégration, écart +1 sur 6 ; Anti-Dispersion du 19 sept. 61, 8 sur 8, écart +2 sur 8 ; « À décider » : Financement de Welcome Prodiges, Planning du trimestre à valider, Salle pour la soirée de louange. Les écarts avec les chiffres dessinés sont voulus : les règles priment. Si une valeur diffère, vérifie d'abord le calcul et le jeu, puis demande avant de changer une règle.
- Jeux ciblés (pgTAP et Vitest) : correction d'un même dimanche (la plus récente gagne) ; deux lignes du même envoi (`id` départage) ; dimanche manqué (pas d'écart de fiche) ; session à 13 présents dont 2 déjà comptés ; « dont en FIJ » sans actifs exclu du pourcentage ; ministère désactivé ; ministère créé en cours de route ; cas de dates de la règle 11.

### Documentation d'exploitation (étape 8, `docs/exploitation.md`)

Rôles et contacts (EJP Tech et suppléant, administration de l'église avec son adresse dédiée, coordination) ; environnements (URL, projet, région, offre) ; comptes et secrets au nom de l'église (coffre partagé par deux personnes désignées, double authentification partout, aucun secret de production sur le poste où tourne Claude) ; liste de contrôle des réglages Auth de chaque projet ; déploiement depuis un clone réservé où Claude Code ne tourne jamais (`npx supabase link` puis `npx supabase db push` sur la préproduction, recette, puis production ; migrations compatibles avec le front en ligne ; retour arrière du front par l'hébergeur, de la base par une nouvelle migration) ; sauvegardes (quotidiennes en offre Pro, export mensuel chiffré dans le Drive de l'église, test de restauration chaque trimestre) ; surveillance (conseillers Supabase après chaque mise en production, journaux chaque semaine, quotas et factures chaque mois) ; procédures de la section 8 (amorçage, départ d'une personne, perte du code de l'administration, changement d'adresse) ; modération hebdomadaire ; incidents ; mises à jour des dépendances ; coûts ; page « Confidentialité » ; fin de vie (décidée par la coordination : annonce un mois avant, désactivation des comptes de ministère, export final remis à la coordination, suppression des projets Supabase, du site, des clients OAuth et du mot de passe SMTP, archivage du dépôt) ; registre des opérations.
