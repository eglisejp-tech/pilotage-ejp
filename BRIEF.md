# Brief de construction : Pilotage des ministères EJP

Ce document est la source de vérité pour construire l'application. Lis-le en entier avant d'écrire la moindre ligne. En cas de doute, pose la question plutôt que d'inventer.

Références jointes :

- `docs/reference/maquettes/` : **maquettes validées de tous les écrans, profil par profil** (direction visuelle C). Lis d'abord `LISEZMOI.md`. Pour l'apparence, elles priment sur tout le reste.
- `docs/reference/tokens.css` : couleurs, polices et tailles de la direction C, à copier dans `src/styles/tokens.css`.
- `docs/reference/prototype.html` : prototype interactif (comportement, textes, données d'exemple). Son apparence est **dépassée** par les maquettes.
- `docs/reference/reponse-cdc-v2.docx` : réponse au cahier des charges, version 2 (décisions produit).

---

## 1. Le produit en une phrase

Un outil web **temporaire** de prise d'information pour le berger et le conseil de l'Église des Jeunes Prodiges (EJP). Chaque ministère y saisit ses chiffres, événements, réunions et points d'attention. L'outil **conserve chaque saisie** pour montrer l'évolution, et affiche **qui a saisi et qui manque**. Il ne remplace aucune décision : les décisions se prennent en dehors.

La page d'accueil doit répondre en quelques secondes à quatre questions :

1. Où en sont les ministères ?
2. Qu'est-ce qui arrive prochainement ?
3. Qu'est-ce qui demande une attention ou une décision ?
4. Quelles informations sont à jour, lesquelles ne le sont pas ?

## 2. Utilisateurs et comptes

| Compte                               | Connexion                                                                         | Droits                                                                                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Ministère                            | **Un email partagé par ministère** (plusieurs personnes l'utilisent, c'est voulu) | Vue globale + sa fiche. Saisit ses données. Voit les points d'attention qui le mentionnent.                                            |
| Berger                               | Email personnel                                                                   | Lecture de tout. Marque un point d'attention comme traité.                                                                             |
| Membre du conseil                    | Un email par membre                                                               | Lecture de tout. Marque un point d'attention comme traité.                                                                             |
| Administration de l'église           | Email dédié                                                                       | Crée/désactive les ministères et leurs comptes, crée les comptes berger et conseil, déclare les sessions et leurs ministères attendus. |
| Administration plateforme (EJP Tech) | Comptes EJP Tech                                                                  | Technique et modération des champs libres. Ne décide pas des accès.                                                                    |

Tous les comptes se connectent **avec Google ou avec email et mot de passe, puis avec un code de double authentification** (section 8). Aucun compte ne peut s'en passer.

Chaque profil a sa propre navigation et son propre écran d'accueil (planche `maquettes/00-profils-qui-voit-quoi.png`) :

| Profil                     | Onglets (le premier est l'accueil)                      |
| -------------------------- | ------------------------------------------------------- |
| Ministère                  | Cette semaine, Ma fiche, Mes points, Mon journal        |
| Berger et conseil          | Cette semaine, Ministères, Points d'attention, Journal  |
| Administration de l'église | Cette semaine, Ministères et comptes, Sessions, Journal |
| EJP Tech                   | Modération, Journal technique                           |

Le nom du compte connecté reste toujours visible dans l'en-tête (un email de ministère est partagé). Un compte ne voit jamais les onglets d'un autre profil, et **le routage ne remplace pas la RLS** : un ministère qui tape l'adresse d'un écran berger ne reçoit aucune donnée.

Ne crée **pas** de profils personnels (nom, téléphone, date de naissance). Ne crée **pas** de rôles internes au ministère.

## 3. Règles métier (non négociables)

1. **On ajoute, on ne modifie jamais.** Chaque saisie de chiffre est une nouvelle ligne datée. Une correction est une nouvelle saisie. Pas d'`UPDATE` ni de `DELETE` sur les mesures, les participations et le journal.
2. **La dernière valeur** d'un indicateur pour un ministère = la saisie la plus récente (`saisi_le`) pour la date de référence la plus récente.
3. **Totaux de l'église** = somme des dernières valeurs de chaque ministère. Toujours afficher la **complétude** à côté (« 6/8 ministères »).
4. **Pourcentage de STARs en FIJ** = somme des « STARs en FIJ » ÷ somme des « STARs actifs ». Jamais une moyenne de pourcentages. Jamais saisi directement.
5. **Sessions** (Bâtir l'Église, Anti-Dispersion) : l'administration de l'église déclare la session et les ministères attendus. Chaque ministère saisit le nombre de ses STARs présents. L'écran liste les ministères qui n'ont pas encore saisi.
6. **Fraîcheur d'un ministère** = date de sa dernière saisie, tous types confondus. Vert ≤ 7 jours, orange 8 à 30 jours, rouge au-delà. Toujours avec un libellé texte, jamais la couleur seule.
7. **Points d'attention** : statut (À traiter, En cours, En attente de décision, Traité) et priorité (Normale, Haute, Urgente) sont deux champs distincts. Mentions possibles d'un ou plusieurs ministères. Un ministère mentionné voit **ce point uniquement**, pas le reste de la fiche.
8. **Marquer comme traité** : le ministère créateur, le berger ou un membre du conseil. Date et compte enregistrés.
9. **Aucune donnée personnelle** dans les chiffres. Rappel visible sous chaque champ libre : « N'écrivez aucun nom ni information personnelle. Les champs libres sont relus par EJP Tech. » Descriptions limitées à 280 caractères.
10. **Journal** : chaque écriture (saisie, création, changement de statut) produit une ligne de journal (date, compte, action). Personne ne peut modifier le journal.

## 4. Indicateurs de la vue globale

| Code                      | Libellé                    | Nature          | Saisi par        | Affichage                                                                                             |
| ------------------------- | -------------------------- | --------------- | ---------------- | ----------------------------------------------------------------------------------------------------- |
| `service`                 | STARs de service           | Chaque dimanche | Chaque ministère | Total du dernier dimanche, delta vs dimanche précédent, courbe, complétude                            |
| `actifs`                  | STARs actifs               | À ce jour       | Chaque ministère | Total                                                                                                 |
| `en_fij`                  | Dont présents en FIJ       | À ce jour       | Chaque ministère | Sert au calcul du %                                                                                   |
| `fij_departement`         | FIJ par département        | À ce jour       | Ministère FIJ    | Carte en carrés des 8 départements (75, 77, 78, 91, 92, 93, 94, 95), placés comme sur la carte réelle |
| session `batir`           | Présents à Bâtir l'Église  | Par session     | Chaque ministère | Total dernière session, courbe, complétude, liste des manquants                                       |
| session `anti_dispersion` | Présents à Anti-Dispersion | Par session     | Chaque ministère | Idem                                                                                                  |

Les indicateurs propres à un ministère (ex. « Enfants accueillis le dimanche » pour Prodiges Junior) utilisent la même table avec `ministere_id` renseigné. Ils s'affichent sur la fiche du ministère, pas sur la vue globale.

**Questions ouvertes à ne pas trancher seul** (garde le code paramétrable) :

- STARs de service et actifs : saisie par ministère (hypothèse retenue) ou saisie globale unique ?
- Double comptage d'un STAR présent dans deux ministères.
- Un ministère mentionné peut-il marquer « traité » ? (hypothèse : non)

## 5. Stack imposée

Cohérente avec les standards EJP Tech. Ne change pas de stack sans demander.

- **Front** : React 18 + Vite + TypeScript (strict) + Tailwind CSS + shadcn/ui.
- **Routage** : React Router (ou TanStack Router, au choix, une seule solution).
- **Données** : Supabase (PostgreSQL, Auth avec Google et TOTP, Row Level Security, Edge Functions pour l'administration des comptes). Client `@supabase/supabase-js` + TanStack Query.
- **Formulaires** : React Hook Form + Zod (validation partagée).
- **Graphiques** : SVG maison comme dans le prototype, ou Recharts. Pas de bibliothèque lourde.
- **Tests** : Vitest (unitaires), pgTAP via `supabase test db` (politiques RLS), Playwright (parcours par compte).
- **Qualité** : ESLint, Prettier, `tsc --noEmit`.
- **CI** : GitHub Actions (lint, types, tests, tests base, build).
- **Hébergement** : Vercel ou Netlify pour le front, projet Supabase en région UE. **Comptes au nom de l'église, jamais d'une personne.**

## 6. Modèle de données (point de départ)

Écris-le en migrations Supabase (`supabase/migrations/`). Adapte les détails, pas les principes.

```sql
create type type_compte as enum ('ministere','berger','conseil','admin_eglise','admin_plateforme');
create type statut_point as enum ('a_traiter','en_cours','attente_decision','traite');
create type priorite as enum ('normale','haute','urgente');
create type statut_evenement as enum ('brouillon','attente_validation','valide','preparation','termine','annule');
create type type_session as enum ('batir','anti_dispersion');

create table public.ministere (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  description text check (char_length(description) <= 280),
  actif boolean not null default true,
  cree_le timestamptz not null default now()
);

create table public.compte (
  user_id uuid primary key references auth.users on delete cascade,
  type type_compte not null,
  ministere_id uuid references public.ministere,
  libelle text not null,                      -- « Ministère Jeunesse », « Berger »
  check ((type = 'ministere') = (ministere_id is not null))
);

create table public.indicateur (
  id uuid primary key default gen_random_uuid(),
  code text unique,                           -- 'service', 'actifs', 'en_fij'... null si propre
  libelle text not null,
  unite text,
  nature text not null check (nature in ('dimanche','a_ce_jour')),
  ministere_id uuid references public.ministere  -- null = indicateur commun
);

create table public.mesure (                  -- AJOUT SEULEMENT
  id bigint generated always as identity primary key,
  indicateur_id uuid not null references public.indicateur,
  ministere_id uuid not null references public.ministere,
  date_ref date not null,
  valeur numeric not null check (valeur >= 0),
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte(user_id)
);

create table public.fij_departement (         -- AJOUT SEULEMENT
  id bigint generated always as identity primary key,
  departement text not null check (departement in ('75','77','78','91','92','93','94','95')),
  valeur int not null check (valeur >= 0),
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte(user_id)
);

create table public.session (
  id uuid primary key default gen_random_uuid(),
  type type_session not null,
  date date not null,
  unique (type, date)
);
create table public.session_attendu (
  session_id uuid references public.session on delete cascade,
  ministere_id uuid references public.ministere,
  primary key (session_id, ministere_id)
);
create table public.participation (           -- AJOUT SEULEMENT, la plus récente fait foi
  id bigint generated always as identity primary key,
  session_id uuid not null references public.session,
  ministere_id uuid not null references public.ministere,
  valeur int not null check (valeur >= 0),
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte(user_id)
);

create table public.evenement ( ... statut statut_evenement ... );
create table public.reunion ( ... date, heure, objet, decision_attendue ... );

create table public.point_attention (
  id uuid primary key default gen_random_uuid(),
  ministere_id uuid not null references public.ministere,
  titre text not null check (char_length(titre) <= 80),
  description text check (char_length(description) <= 280),
  priorite priorite not null default 'normale',
  statut statut_point not null default 'a_traiter',
  echeance date,
  action_attendue text check (char_length(action_attendue) <= 80),
  cree_le timestamptz not null default now(),
  traite_le timestamptz,
  traite_par uuid references public.compte(user_id)
);
create table public.point_mention (
  point_id uuid references public.point_attention on delete cascade,
  ministere_id uuid references public.ministere,
  primary key (point_id, ministere_id)
);

create table public.journal (                 -- AJOUT SEULEMENT, rempli par triggers
  id bigint generated always as identity primary key,
  le timestamptz not null default now(),
  compte uuid references public.compte(user_id),
  ministere_id uuid references public.ministere,
  action text not null
);
```

```sql
create table public.moderation (              -- AJOUT SEULEMENT
  id bigint generated always as identity primary key,
  cible text not null check (cible in ('point_attention','evenement')),
  cible_id uuid not null,
  decision text not null check (decision in ('rien_a_signaler','masque')),
  motif text check (char_length(motif) <= 120),
  par uuid not null references public.compte(user_id),
  le timestamptz not null default now()
);
```

Masquer un texte (maquette 15) passe par une fonction RPC `masquer_texte(cible, cible_id, motif)`, réservée à `admin_plateforme` : elle remplace le champ libre par « [texte masqué par EJP Tech] » (l'information personnelle ne doit pas rester en base), écrit une ligne dans `moderation` et une dans `journal`. C'est la seule modification permise sur un champ libre après coup.

Prévois des **vues** pour les lectures : `v_derniere_mesure`, `v_total_dimanche` (total + nombre de ministères ayant saisi), `v_session_completude`, `v_fraicheur_ministere`.

## 7. Sécurité et RLS (à tester, pas seulement à écrire)

Principe : **le cloisonnement vit dans la base**, pas dans l'interface.

- `alter table ... enable row level security` sur **toutes** les tables exposées.
- Fonctions d'aide dans un schéma `private`, `security definer`, `set search_path = ''`, noms qualifiés : `private.mon_type()`, `private.mon_ministere()`, `private.est_decideur()` (berger ou conseil).
- Dans les politiques, écris `(select auth.uid())` et `(select private.mon_ministere())` pour la performance. Indexe les colonnes filtrées (`ministere_id`, `session_id`, `indicateur_id`).
- **Lecture** :
  - chiffres agrégés (`mesure` des indicateurs communs, `participation`, `fij_departement`), liste des ministères, prochain événement et fraîcheur : tout compte authentifié (nécessaire à la vue globale ; ce sont des effectifs, pas des personnes) ;
  - indicateurs propres, réunions, détail de fiche : décideurs + le ministère concerné ;
  - `point_attention` : décideurs, ministère créateur, ministères mentionnés ;
  - `journal` : décideurs et admins tout ; ministère ses lignes.
  - `admin_plateforme` (EJP Tech) : les champs libres (`point_attention`, `evenement`) et `moderation`, pour relire. **Pas** les mesures ni les participations.
- **Écriture** : un compte ministère n'insère que pour `ministere_id = private.mon_ministere()`. Aucune politique `update`/`delete` sur les tables en ajout seul, et `revoke update, delete` sur ces tables.
- **Marquer traité** : pas d'`update` direct. Une fonction RPC `marquer_traite(point_id)` en `security definer` qui vérifie le droit, met `statut`, `traite_le`, `traite_par`, et écrit le journal.
- **Tests obligatoires** dans `supabase/tests/*.test.sql` : pour chaque table, les quatre opérations, pour chaque type de compte + anonyme. Un test qui prouve qu'un ministère **ne peut pas** lire les points d'attention d'un autre ministère sans mention.
- Authentification : voir la section 8 ci-dessous, elle fait partie de la sécurité.
- Secrets dans les variables d'environnement, jamais dans le code. `.env` dans `.gitignore`. Clé `service_role` jamais côté navigateur.

## 8. Authentification : Google, mot de passe et double authentification

### Les règles

1. **Personne ne s'inscrit seul.** Dans Supabase, « Allow new users to sign up » est **désactivé** : seuls les comptes existants peuvent se connecter. Les comptes sont créés par l'administration de l'église (Edge Function `creer-compte`, voir plus bas).
2. **Deux façons de se connecter, au choix** (maquette 16) :
   - **« Continuer avec Google »** (`signInWithOAuth({ provider: 'google' })`), recommandé quand l'adresse du compte est une adresse Google (Gmail ou Google Workspace) ;
   - **email et mot de passe**, pour les adresses qui ne sont pas des comptes Google.
     Quand quelqu'un se connecte avec Google pour la première fois, Supabase **rattache automatiquement** l'identité Google au compte existant qui a la même adresse email, à condition que cette adresse soit vérifiée. C'est pour cela que l'invitation doit être acceptée avant.
3. **Double authentification obligatoire pour tous les comptes** (TOTP, application d'authentification : Google Authenticator, Microsoft Authenticator, etc.). Gratuit et activé par défaut dans Supabase.
   - Après le premier facteur (Google ou mot de passe), la session est de niveau `aal1`. Tant qu'elle n'est pas `aal2`, l'application n'affiche que l'écran de code (maquette 18) ou l'écran d'activation (maquette 17).
   - **La base l'impose, pas seulement l'interface** : une politique **restrictive** sur chaque table exposée, en plus des politiques existantes :
     ```sql
     create policy "double authentification exigée"
       on public.<table>
       as restrictive
       to authenticated
       using ((select auth.jwt()->>'aal') = 'aal2');
     ```
     Mets-la aussi en `with check` sur les tables où l'on écrit. Les fonctions RPC `security definer` vérifient elles-mêmes `aal2` au début (`private.exige_aal2()`), car elles contournent la RLS.
   - La double authentification de Google (si le compte Google en a une) **ne compte pas** : Supabase ne peut pas la vérifier. Le code TOTP de l'application est toujours demandé.
4. **Comptes partagés des ministères.** L'email et le code sont partagés par les personnes du ministère. À l'activation, le responsable affiche le QR code une seule fois et chaque personne autorisée le scanne dans sa propre application d'authentification (le même QR code produit les mêmes codes sur chaque téléphone). L'écran d'activation le dit en clair. Si une personne quitte le ministère : l'administration réinitialise la double authentification et le mot de passe, puis on refait l'activation.
5. **Perte du téléphone ou du code.** Supabase ne fournit pas de codes de secours. Deux protections :
   - à l'activation, proposer d'enregistrer **un deuxième appareil** (deuxième facteur TOTP) ;
   - sinon, l'administration de l'église réinitialise la double authentification depuis l'écran 13 (Edge Function `reinitialiser-2fa`, qui supprime les facteurs du compte avec la clé `service_role` côté serveur, et écrit une ligne de journal). EJP Tech n'agit que sur demande de l'administration.
6. **Déconnexion** : sessions limitées (durée de session et inactivité réglées dans le tableau de bord Supabase, par exemple 12 h). Bouton « Se déconnecter » partout.

### Les Edge Functions (seul endroit où vit la clé `service_role`)

| Fonction            | Qui peut l'appeler       | Ce qu'elle fait                                                                                                                                |
| ------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `creer-compte`      | `admin_eglise` en `aal2` | Invite l'adresse par email (`auth.admin.inviteUserByEmail`), crée la ligne `compte` (type, ministère, libellé), écrit le journal.              |
| `desactiver-compte` | `admin_eglise` en `aal2` | Bannit l'utilisateur dans Auth, garde toutes ses données, écrit le journal.                                                                    |
| `reinitialiser-2fa` | `admin_eglise` en `aal2` | Supprime les facteurs TOTP du compte (`auth.admin.mfa.deleteFactor`), écrit le journal. Le compte refait l'activation à la connexion suivante. |

Chaque fonction vérifie le JWT de l'appelant, son type de compte **et** son niveau `aal2` avant d'agir.

### Configuration

- **Google Cloud** : un projet **au nom de l'église** (pas un compte personnel). Écran de consentement avec les portées `openid`, `userinfo.email`, `userinfo.profile`, rien de plus. Identifiant client OAuth de type « Application Web ». Origines autorisées : l'URL de l'application. URI de redirection : `https://<ref-du-projet>.supabase.co/auth/v1/callback` (et `http://127.0.0.1:54321/auth/v1/callback` pour le local).
- **Supabase** : fournisseur Google activé avec l'identifiant client et le secret, dans le tableau de bord pour les projets distants. En local, `supabase/config.toml` :
  ```toml
  [auth]
  enable_signup = false

  [auth.external.google]
  enabled = true
  client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"
  secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET)"
  skip_nonce_check = false

  [auth.mfa.totp]
  enroll_enabled = true
  verify_enabled = true
  ```
  Vérifie les noms de clés avec la version du CLI installée (`supabase init` génère un `config.toml` commenté) et adapte si besoin, sans inventer.
- **Le secret Google ne va jamais dans le code** ni dans une variable `VITE_*` (tout ce qui commence par `VITE_` part dans le navigateur).
- **URL de redirection** de l'application déclarées dans Supabase (Auth, URL Configuration) : l'URL de production et `http://localhost:5173`.

### Tests obligatoires

- pgTAP : avec un JWT `aal1`, **zéro ligne** lue et **aucune** écriture possible sur chaque table ; avec `aal2`, les droits normaux du profil.
- pgTAP : un appel RPC en `aal1` échoue.
- Playwright : parcours complet par profil avec mot de passe puis code TOTP (génère le code dans le test avec la bibliothèque `otplib` à partir d'un secret de test, jamais un vrai secret).
- Playwright : un compte sans double authentification est envoyé vers l'activation et ne voit aucune donnée.
- Manuel, une fois : connexion Google avec une adresse invitée (rattachement) et avec une adresse **non** invitée (doit être refusée).

## 9. Écrans

Reproduis les maquettes de `docs/reference/maquettes/`. Ordre de lecture : résumé d'abord, détail ensuite.

| Profil                     | Écran                   | Maquette       | Contenu                                                                                                                                                                                                                                                                                                |
| -------------------------- | ----------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tous                       | Connexion               | 16             | « Continuer avec Google », ou email et mot de passe. Message d'erreur clair, pas d'inscription.                                                                                                                                                                                                        |
| Tous                       | Double authentification | 17, 18         | Activation à la première connexion (QR code, consigne pour les comptes partagés), puis code à chaque connexion.                                                                                                                                                                                        |
| Berger et conseil          | Cette semaine           | 01, 02, 03     | Numéro de semaine, phrase de la semaine (générée à partir des données), tableau des chiffres (valeur, écart, courbe, date, complétude), colonne « À décider » (3 points ouverts les plus prioritaires), dernière session et manquants, carte des FIJ, ministères triés du moins récent au plus récent. |
| Berger et conseil          | Fiche d'un ministère    | 04             | Phrase du ministère, ses chiffres avec historique, ses points (créés ou mentionnés), calendrier prévisionnel avec statuts, dernières saisies. Lecture seule, sauf « Marquer traité ».                                                                                                                  |
| Berger et conseil          | Points d'attention      | 05             | Onglets Ouverts, Traités, Tous. Tri par priorité puis échéance. Échéance dépassée écrite en rouge **et** en mots.                                                                                                                                                                                      |
| Berger et conseil          | Journal                 | 06             | Date, compte, action, détail. Filtres compte, action, période.                                                                                                                                                                                                                                         |
| Ministère                  | Cette semaine           | 07 (téléphone) | Phrase qui dit ce qu'il reste à faire, bouton principal pour la prochaine action, ses saisies, ses points, puis un résumé de l'église. Sur ordinateur : vue de 01 **sans « À décider »**.                                                                                                              |
| Ministère                  | Ma fiche                | 12             | Comme 04, avec les boutons de saisie. Un point où il est seulement **mentionné** n'a pas de bouton « Marquer traité ».                                                                                                                                                                                 |
| Ministère                  | Saisies                 | 08, 09, 10, 11 | Dimanche, session, nouveau point (avec mentions et compteur de 280 caractères), événement. Plein écran sur téléphone, panneau latéral de 460 px sur ordinateur. Moins d'une minute chacune.                                                                                                            |
| Ministère                  | Mes points, Mon journal | 05, 06 filtrés | Mêmes écrans, limités à son ministère.                                                                                                                                                                                                                                                                 |
| Administration de l'église | Ministères et comptes   | 13             | Créer et désactiver un ministère et son compte, comptes berger et conseil (état de la double authentification). Les statuts d'événement sont affichés en lecture (liste fixe, `statut_evenement`).                                                                                                     |
| Administration de l'église | Sessions                | 14             | Liste des sessions et complétude, panneau « Déclarer une session » avec les ministères attendus.                                                                                                                                                                                                       |
| EJP Tech                   | Modération              | 15             | Champs libres récents, « Rien à signaler » ou « Masquer le texte » avec un motif. Chaque décision écrit une ligne de journal.                                                                                                                                                                          |

États à construire même s'ils ne sont pas dessinés : chargement, liste vide, erreur réseau, compte désactivé (voir `maquettes/LISEZMOI.md`).

## 10. Design et UX (direction C, validée)

- **Tokens** : copie `docs/reference/tokens.css` dans `src/styles/tokens.css` et branche-les dans la configuration Tailwind. Aucune couleur en dur dans les composants.
- **Trois polices, trois rôles** : Newsreader pour les phrases et les titres, Big Shoulders Display pour **tous** les chiffres (en `tabular-nums`), Public Sans pour l'interface. Via `@fontsource` de préférence (pas d'appel à Google au chargement).
- **Une seule couleur de lumière, le jaune** `--lumiere`, et trois usages seulement : le surligneur de ce qui attend une décision, l'onglet actif, le bouton principal. Le bleu nuit est réservé aux données (courbes, barres, carte). Vert, orange, rouge réservés aux états, toujours doublés d'un mot.
- **Formes** : angles droits, pas d'ombre, pas de carte. Les sections sont séparées par un titre en serif et un filet de 2 px. Les lignes par des filets de 1 px.
- **Interdits** : dégradés, violet, emoji, icônes décoratives, barres de couleur sur le bord d'un bloc, pastilles partout, surtitres en capitales qui répètent un titre.
- **Responsive, mobile d'abord** (règles complètes dans `BRIEF_DESIGN.md`, section 6) : paliers 360, 600, 1024, 1440 px ; contenu plafonné à 1280 px ; les tableaux deviennent des listes sur téléphone ; aucun défilement horizontal à 360 px ; cibles de 44 px, 64 px pour plus et moins ; bouton d'enregistrement accessible au pouce.
- **Accessibilité** : contraste AA (les tokens sont vérifiés), focus visible, libellés sur tous les champs, `prefers-reduced-motion` respecté, utilisable avec un zoom à 200 %.
- **Textes** : français simple, voix active. Les boutons disent ce qu'ils font (« Enregistrer les chiffres », « Marquer traité »). Aucun tiret cadratin ni demi-cadratin.

## 11. Hors périmètre de la première version

Thème sombre, notifications, validation dans l'outil, gestion des personnes ou des équipes, gestion documentaire, application mobile native, export automatique vers l'application complète.

## 12. Définition de « terminé » pour chaque étape

- `npm run lint`, `npm run typecheck`, `npm test`, `supabase test db`, `npm run e2e` passent.
- Captures Playwright de l'écran concerné en 1440, 834 et 390 px, comparées à la maquette par le sous-agent `ui-reviewer`.
- Toute nouvelle table a sa politique RLS et ses tests, relus par le sous-agent `rls-auditor`.
- Aucun secret dans le dépôt.
- Un commit clair par étape.

## 13. Plan de construction (une étape à la fois)

Travaille en **mode plan** au début de chaque étape, présente le plan, attends mon accord, puis code.

| Étape | Contenu                                                                                                                                                                                                                                         | Vérification                                                                                                   |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 0     | Échafaudage Vite + TS + Tailwind + shadcn, ESLint, Prettier, Vitest, Playwright, CI                                                                                                                                                             | Build et CI verts                                                                                              |
| 1     | Migrations, vues, fonctions `private`, RLS, jeu de données d'exemple (celui du prototype)                                                                                                                                                       | `supabase test db` vert, revue `rls-auditor`                                                                   |
| 2     | Authentification (section 8) : Google et mot de passe, activation et code de double authentification, politique `aal2`, Edge Functions de comptes ; puis chargement du compte, navigation et accueil selon le profil (maquettes 00, 16, 17, 18) | pgTAP `aal1` refusé ; E2E : chaque profil passe par le code, arrive sur son accueil et ne voit que ses onglets |
| 3     | Vue globale                                                                                                                                                                                                                                     | E2E + captures + revue `ui-reviewer`                                                                           |
| 4     | Fiche ministère et saisies                                                                                                                                                                                                                      | E2E : une saisie crée une ligne, l'historique grandit, le journal aussi                                        |
| 5     | Points d'attention et mentions                                                                                                                                                                                                                  | E2E : un ministère mentionné voit le point, un autre non                                                       |
| 6     | Journal et administration de l'église                                                                                                                                                                                                           | E2E admin                                                                                                      |
| 7     | Finitions : responsive 360 à 1440 px, accessibilité, états vides, erreurs réseau                                                                                                                                                                | Audit accessibilité Playwright                                                                                 |
| 8     | Déploiement (comptes au nom de l'église), documentation d'exploitation                                                                                                                                                                          | Recette sur l'environnement de préproduction                                                                   |
