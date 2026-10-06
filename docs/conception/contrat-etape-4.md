# Contrat de l'étape 4

Écrit par le lot W0 (`docs/plan-etape-4.md`, section 3, point 1). Chaque lot code contre ce
document : noms, colonnes, types, codes, adresses et emplacements. Un lot qui a besoin d'un écart
le dit dans sa revue ; le contrat ne change qu'au lot I, en même temps que `structure.test.sql`
retrouve ses listes exhaustives.

Décisions appliquées (6 octobre 2026, accord écrit de la personne responsable) : plan de l'étape 4
approuvé (questions 1 à 13) ; question 14 : **oui**, « Signaler une difficulté » existe (B7, E8) ;
un signalement n'est lu **que** par le ministère qui l'a écrit et par EJP Tech (ni
l'administration, ni le berger, ni le conseil). Tout texte qui dit qui le lit dit « EJP Tech lit
votre signalement. ». « Formation » et « Prodiges Academy » sont deux ministères différents.

**Changement du 6 octobre 2026 (indicateurs sensibles, P45 à P47, modèle T41).** Après la lecture
des libellés, la personne responsable a décidé que le mois en cours d'un indicateur sensible se
saisit (P45), qu'un texte « Précision » peut accompagner son total (P46) et que ce total se répartit
entre des catégories fixées par la coordination (P47). Ce contrat change donc avant le lot I, une
seule fois, aux endroits marqués « changement du 6 octobre » : `controler_mesure` (B1),
`v_indicateur_suivi` (B2), et le lot nouveau B8 (trois tables, une fonction, deux vues, la cible et
le couple de modération de la précision). Les noms de B8 sont fixés ici ; son code attend l'accord
de la personne responsable sur le modèle (plan, question 16).

Statut des noms : ceux que les documents de conception donnent sont repris tels quels ; ceux
qu'ils laissaient ouverts sont **fixés ici** (marqués « fixé par W0 ») pour que les lots codent en
parallèle. Aucun ne change une règle métier.

## 1. Codes du journal et de la modération

Posés une fois par `supabase/migrations/20261007090000_contrats_etape_4.sql`, vérifiés par
`supabase/tests/contrats-etape-4.test.sql`. **Aucun lot ne retouche ces contraintes**, sauf B8
(changement du 6 octobre) : la migration de W0 étant fusionnée et figée, la migration nouvelle de
B8 (`20261009105000_sensibles_precisions_repartitions.sql`) réécrit `journal_cible_check`,
`moderation_cible_check` et `moderation_cible_champ_check` avec l'union de tous les codes, plus la
cible `precision_sensible` et le couple (`precision_sensible`, `texte`) ; `journal_action_check`
ne change pas. B8 met à jour les listes attendues de `contrats-etape-4.test.sql`. Noms des
contraintes : `journal_action_check`, `journal_cible_check`, `moderation_cible_check`,
`moderation_cible_champ_check`, et `moderation_masque_check` (une décision « masque » si et
seulement si un champ et un motif sont donnés : contrainte des étapes 1 à 3, nommée par
`20261007090500_contrats_etape_4_correctifs.sql`).

### Actions du journal (`journal.action`)

Les 20 codes des étapes 1 à 3 restent. Codes nouveaux :

| Code                       | Lot | Écrit par                                                | `cible`, `cible_id`                          | `ministere_id`        | `detail` (codes, identifiants, dates et nombres seulement)                                                   |
| -------------------------- | --- | -------------------------------------------------------- | -------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `indicateur_cree`          | B3  | `creer_indicateur`, `ajouter_suggestion`, `creer_calcul` | `indicateur`, l'indicateur créé              | celui de l'indicateur | `{"nature", "unite", "origine", "remplace"}`, et pour un ajout d'un ministère `"attente": true`, `"demande"` |
| `indicateurs_prevus_crees` | B3  | `creer_indicateurs_prevus`                               | `ministere`, le ministère                    | le ministère          | `{"modele", "nombre"}` (code du catalogue, ou « aucun »)                                                     |
| `indicateur_corrige`       | B3  | `corriger_indicateur`                                    | `indicateur`                                 | celui de l'indicateur | `{"champs": ["libelle", "definition"]}`                                                                      |
| `indicateur_valide`        | B3  | `valider_indicateur`                                     | `indicateur`                                 | celui de l'indicateur | `{"demande", "objet": "ajout"}`                                                                              |
| `indicateur_refuse`        | B3  | `valider_indicateur`                                     | `indicateur`                                 | celui de l'indicateur | `{"demande", "objet": "ajout"}`                                                                              |
| `indicateur_retire`        | B3  | `retirer_indicateur`                                     | `indicateur`                                 | celui de l'indicateur | `{"motif", "avec_saisies", "calculs"}` (code du motif, section 4)                                            |
| `fij_statistiques_saisies` | B5  | `saisir_fij_statistiques`                                | aucune (`null`), comme `fij_saisie`          | le ministère `fij`    | `{"dimanche", "nombre"}` (nombre de valeurs envoyées), jamais une valeur (fixé par W0)                       |
| `difficulte_signalee`      | B7  | `signaler_difficulte`                                    | `signalement`, le signalement                | le ministère auteur   | `{"ecran"}` (code de l'écran), jamais le texte                                                               |
| `signalement_clos`         | B7  | `clore_signalement`                                      | `signalement`, le signalement (pas le suivi) | le ministère auteur   | `{"ecran", "avec_commentaire"}` (T39 : le code de l'écran ; `true` ou `false`), jamais le commentaire        |

Codes repris et étendus (déjà dans la liste) :

- `mesure_saisie` (B2) : `{"lignes": [{"indicateur_id", "date_ref", "valeur", "corrige"}]}`. **Une
  ligne d'indicateur sensible n'y figure jamais** (P45 : sinon chaque saisie intermédiaire du mois
  en cours et sa date seraient lisibles au journal) ; un envoi qui ne contient que des sensibles a
  `{"lignes": []}`. La valeur n'est écrite que pour un chiffre commun ; `corrige` vaut `true` sur une ligne qui remplace
  une valeur déjà saisie pour la même période (fixé par W0 : le drapeau est porté par chaque ligne).
  Changement du 6 octobre : un envoi de « Chiffres du mois » passe par `saisir_chiffres_mois` (B8),
  qui fait une seule instruction `insert` dans `mesure` : il garde donc une seule ligne
  `mesure_saisie`, qui ne dit rien de la précision ni de la répartition (ni texte, ni valeur).
- `evenement_ajoute` (B6) : `{"date", "statut", "mentions": [uuid]}`, jamais le nom d'un ministère.
- `evenement_modifie` (B6) : `{"date", "statut", "date_precedente"}`.
- `texte_relu`, `texte_masque` : `cible` vaut la cible de la modération (donc aussi
  `demande_indicateur`, `validation`, `signalement`, `signalement_suivi` et, depuis le changement
  du 6 octobre, `precision_sensible`), et `ministere_id` le ministère de l'auteur du texte. Deux
  exceptions : pour la cible `precision_sensible`, celui de la précision (B8) ; pour les cibles
  `signalement` et `signalement_suivi`, **celui du signalement** (le commentaire d'une clôture est
  écrit par EJP Tech, dont le compte n'a pas de ministère : la ligne prend le ministère du
  signalement clos, pour que le ministère auteur la lise comme sa clôture, T39).
- Texte d'un signalement et commentaire de clôture : les familles « données personnelles » de
  `private.verifier_texte` **et** « crochets » sont refusées, par `private.texte_libre_refuse`
  (T43, « Proposé » : T39 ne citait que les données personnelles ; les crochets protègent le
  marqueur de masquage).

**Lecture des lignes des signalements (T39, décidé).** Une ligne `difficulte_signalee` ou
`signalement_clos`, et toute ligne `texte_relu` ou `texte_masque` dont la cible est `signalement`
ou `signalement_suivi`, ne se lit que par le ministère auteur et par EJP Tech : elle dit qu'un
signalement existe, et `texte_masque` en donne même le motif. B7 recrée la politique de lecture de
`journal` depuis sa dernière version et ajoute, aux branches `private.lit_tout()` et
administration, la condition :

```sql
(coalesce(cible, '') not in ('signalement', 'signalement_suivi')
 and action not in ('difficulte_signalee', 'signalement_clos'))
or (select private.mon_type()) = 'admin_plateforme'
```

La branche du ministère (`ministere_id = (select private.mon_ministere())`) reste : le ministère
auteur garde ces lignes dans « Mon journal ». `v_journal` applique la même condition (B7). La liste
fermée de `private.journal_lisible_administration` (B2) contient `texte_relu` et `texte_masque` :
c'est la condition sur la cible, pas cette liste, qui retire ces lignes à l'administration. Le
test de matrice de B7 vérifie qu'une ligne `texte_masque` sur un signalement reste invisible pour
le berger, le conseil, l'administration et un autre ministère, et lisible par le ministère auteur
et par EJP Tech. Risque résiduel (T44, « Proposé ») : un trou dans la suite de `journal.id` montre à
un lecteur de l'API qu'une ligne cachée existe, sans rien dire de son contenu.

**Lecture des lignes du texte « Pourquoi » (P51, décidé le 6 octobre 2026).** Une ligne
`texte_relu` ou `texte_masque` dont la cible est `demande_indicateur` se lit par le ministère
auteur, EJP Tech, le berger et le conseil, **jamais par l'administration** de l'église : le berger
et le conseil suivent la modération des textes comme celle des points. Aujourd'hui (B2),
`private.journal_lisible_administration` contient `texte_relu` et `texte_masque`, donc
l'administration lit ces lignes pour toutes les cibles. B7, qui recrée la politique de lecture de
`journal` et `v_journal`, ajoute à la branche de l'administration la condition :

```sql
coalesce(cible, '') <> 'demande_indicateur'
or action not in ('texte_relu', 'texte_masque')
```

Les branches `private.lit_tout()` (berger, conseil, EJP Tech) et `ministere_id` (ministère
auteur) ne changent pas. Le test de matrice de B7 vérifie qu'une ligne `texte_masque` et une ligne
`texte_relu` de cible `demande_indicateur` sont lisibles par le ministère auteur, EJP Tech, le
berger et le conseil, et invisibles pour l'administration et un autre ministère.

Absents, réservés au lot 2 des indicateurs (refusés par la contrainte) :
`indicateur_correction_demandee`, `indicateur_officiel`.

Une décision d'EJP Tech (`indicateur_valide`, `indicateur_refuse`, `signalement_clos`) est écrite
au nom de son compte : la fraîcheur du ministère ne bouge pas. `difficulte_signalee` est écrite au
nom du compte du ministère : B7 recrée `private.tableau_ministeres()` pour l'ignorer dans la
fraîcheur (un signalement n'est pas une saisie).

### Cibles du journal (`journal.cible`)

`session`, `evenement`, `reunion`, `point_attention`, `point_suivi`, `compte`, `ministere` (étapes 1
à 3), puis `indicateur`, `signalement`, et les cibles de modération `demande_indicateur`,
`validation`, `signalement_suivi`, et `precision_sensible` (B8, changement du 6 octobre). Règle :
**toute cible de la modération est une cible du journal**, parce que `marquer_relu` et
`masquer_texte` écrivent leur ligne (`texte_relu`, `texte_masque`) avec la cible de la modération.
`v_journal` (B3 pour `indicateur`, B8 pour `precision_sensible`, B7 pour `signalement`) calcule
`cible_texte` sous la RLS du lecteur.

### Cibles et couples de la modération

| Cible                | Champ masquable (couple)                  | Origine                                | Lot qui étend `masquer_texte` et `marquer_relu`                                   |
| -------------------- | ----------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------- |
| `point_attention`    | `titre`, `description`, `action_attendue` | étapes 1 à 3                           | aucun                                                                             |
| `point_suivi`        | `commentaire`                             | étapes 1 à 3                           | aucun                                                                             |
| `evenement`          | `titre`                                   | étapes 1 à 3                           | aucun                                                                             |
| `reunion`            | `objet`, `decision_attendue`              | étapes 1 à 3                           | aucun                                                                             |
| `demande_indicateur` | `pourquoi`                                | étape 4                                | B3                                                                                |
| `validation`         | `motif`                                   | étape 4                                | B3                                                                                |
| `signalement`        | `texte`                                   | étape 4 (T39)                          | B7, après B3 et B8                                                                |
| `signalement_suivi`  | `commentaire`                             | étape 4 (T39)                          | B7, après B3 et B8                                                                |
| `precision_sensible` | `texte`                                   | étape 4 (P46, changement du 6 octobre) | B8, après B3 et B4, avant B7 (B7 reprend `masquer_texte` depuis la version de B8) |

Douze couples en tout (onze posés par W0, un par B8). Le texte masqué reste « [texte masqué par EJP Tech] ». L'écran Modération
(étape 6) relit et masque ; à l'étape 4, seul le bloc « Signalements » existe sur `/moderation`.

## 2. Horodatages réservés des migrations

Chaque lot crée sa migration directement sous son nom réservé (Write), après
`20261005172228`. Une correction après fusion passe par une **nouvelle** migration horodatée après
la dernière migration déjà fusionnée dans `etape-4`, jamais dans une plage réservée.

| Lot | Fichiers, dans l'ordre d'application                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------- |
| W0  | `20261007090000_contrats_etape_4.sql`                                                                                             |
| B1  | `20261007100000_indicateurs_definition.sql`, `20261007100500_indicateurs_lexique.sql`                                             |
| B5  | `20261007110000_fij_statistique.sql`                                                                                              |
| B6  | `20261007120000_evenements_mentions.sql`, `20261007120500_evenements_alerte_report.sql`                                           |
| B2  | `20261008100000_indicateurs_lectures.sql`, `20261008100500_indicateurs_seuil_sensibles.sql`, `20261008101000_journal_mesures.sql` |
| B3  | `20261008110000_validation_indicateurs.sql`, `20261008110500_indicateurs_fonctions.sql`                                           |
| B4  | `20261009100000_indicateurs_vague_1.sql`                                                                                          |
| B8  | `20261009105000_sensibles_precisions_repartitions.sql` (changement du 6 octobre ; après B4, avant B7)                             |
| B7  | `20261009110000_signalements.sql`                                                                                                 |
| L   | horodatage réel du jour de création, après la dernière migration passée en production ; ordre L2, L4, L1, L3                      |

Horodatages des données : toute date métier se calcule à l'heure de Paris
(`private.aujourdhui()`, `private.dimanche_reference()`, `private.mois_courant()` de B1, vue
`v_semaine`). `saisi_le` et `saisi_par` sont posés par le trigger `forcer_auteur` sur toute table
qui porte `saisi_par` (contrôle générique de `structure.test.sql`). Une période se nomme par sa
date : un dimanche par sa date, un mois par son 1er jour (`date`, jamais du texte).

## 3. Jeux d'exemple

`supabase/config.toml` : `sql_paths = ["./seed.sql", "./seed/*.sql"]`. La CLI charge `seed.sql`,
puis chaque fichier de `supabase/seed/` dans l'ordre lexical de son nom. Tant que le dossier est
vide, elle écrit seulement l'avertissement « no files matched pattern ». Jamais appliqués en
préproduction ni en production (`db push` sans `--include-seed`).

| Fichier                                  | Lot | Contenu                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------- | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/seed.sql`                      | B1  | définition de « Visuels livrés ce mois » ; reprise du ministère Coordination créé par la migration (comme FIJ)                                                                                                                                                                                                       |
| `supabase/seed/40-indicateurs.sql`       | B4  | prévus des ministères d'exemple, sensibles compris (un sensible à 2 pour « moins de 3 ») ; une valeur par unité ; un ajout à valider, un validé, un refusé ; un retiré avec saisies ; mois et dimanches                                                                                                              |
| `supabase/seed/41-fij-statistiques.sql`  | B5  | deux semaines des 4 rubriques, une semaine incomplète (« 6 dép. sur 8 »)                                                                                                                                                                                                                                             |
| `supabase/seed/42-evenements.sql`        | B6  | « Réunion des responsables » (Coordination, en attente, reporté, @Communication), décalage de semaines recalculé                                                                                                                                                                                                     |
| `supabase/seed/43-signalements.sql`      | B7  | deux signalements de Communication, sans donnée personnelle : un ouvert sur `saisie_evenement`, un clos avec un commentaire d'EJP Tech                                                                                                                                                                               |
| `supabase/seed/44-sensibles-details.sql` | B8  | catégories d'exemple du sensible de `seed/40` (`malaise`, `blessure`, `autre` ; jeu d'exemple seulement) ; un mois réparti avec une catégorie à 2 (« moins de 3 » et une catégorie masquée pour le berger) ; un mois réparti sans petit nombre ; une précision sans donnée personnelle ; une valeur du mois en cours |

Règles pour chaque fichier de `seed/` :

- il se suffit à lui-même : il redéfinit les aides `pg_temp` dont il a besoin (`pg_temp.j`,
  `pg_temp.h` de `seed.sql`), sans compter sur la session d'un autre fichier ;
- il retrouve les ministères et les comptes par leurs identifiants fixes de `seed.sql`
  (`10000000-...` pour les ministères, `20000000-...` pour les comptes) ;
- ses dates suivent le décalage de semaines de `seed.sql` (le dimanche 27 sept. 2026 devient
  `private.dimanche_reference()`) ;
- adresses en `@exemple.test` seulement, aucun nom de personne ;
- les signalements ne passent pas par le journal (insertion directe par le rôle du jeu, sans
  compte connecté ; aucun réglage de session `pilotage.migration` : les triggers des deux tables
  ne le lisent pas), pour ne pas changer la fraîcheur que vérifient les tests de l'étape 3.
  `signalements.test.sql` vérifie le contenu du jeu (deux signalements de Communication, un seul
  ouvert), dont dépend E8.

`jeu-exemple.test.sql` n'est touché que par B6 (11 puis 12 événements) et B2 (ligne de journal de
Communication).

## 4. Valeurs fermées

| Colonne ou paramètre                         | Valeurs                                                                                                                                                                                                                        | Source                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `indicateur.nature`                          | `dimanche`, `mois`, `a_ce_jour`                                                                                                                                                                                                | B1                                                                 |
| `indicateur.unite`                           | `nombre` (0 à 9 999), `grand_nombre` (0 à 9 999 999), `euros` (0 à 9 999 999), `heure` (minutes, 0 à 1 439), `jours` (0 à 99 999)                                                                                              | B1                                                                 |
| `indicateur.etat`                            | `en_attente`, `actif`, `retire`                                                                                                                                                                                                | B1                                                                 |
| `indicateur.origine`                         | `commun`, `eglise`, `ministere`                                                                                                                                                                                                | B1                                                                 |
| `indicateur.calcul`                          | `taux`, `moyenne`, `difference`, `somme`, `evolution` (null pour un indicateur saisi)                                                                                                                                          | B1                                                                 |
| `indicateur.retrait_motif`                   | choisis : `plus_suivi`, `doublon`, `erreur` (tous) ; `se_calcule`, `deja_commun`, `domaine_sensible`, `hors_regles` (administration, EJP Tech) ; posés par la base : `remplace`, `confidentialite`, `source_retiree`, `refuse` | codes fixés par W0, libellés de `configuration-indicateurs.md` 4.6 |
| `indicateur_terme.role`                      | `haut`, `bas`, `plus`, `moins`, `terme`                                                                                                                                                                                        | B1                                                                 |
| `indicateur_terme.comptage`                  | `prevus`, `realises`, `annules`, `reportes`, `en_attente`, `sans_etat_final`                                                                                                                                                   | B1                                                                 |
| `indicateur_terme.agregat`                   | `periode`, `somme_dimanches_du_mois`, `fin_de_mois`                                                                                                                                                                            | B1                                                                 |
| familles de `verifier_texte`                 | `donnees_personnelles`, `crochets`, `calcul`, `cumul`, `periode`, `sensible`, `doublon` (lot 1)                                                                                                                                | `configuration-indicateurs.md` 6.1, codes fixés par W0             |
| `demande_indicateur.objet`                   | `ajout` (lot 1), `correction` (lot 2)                                                                                                                                                                                          | B3                                                                 |
| `validation.decision`, `p_decision`          | `valide`, `refuse`                                                                                                                                                                                                             | B3                                                                 |
| `fij_statistique.rubrique`                   | `culte_ejp` (Présents au culte EJP), `reunion_fij` (Présents à la réunion FIJ), `evangelisation` (Présents à l'évangélisation), `membres_mardi` (Membres du mardi)                                                             | codes fixés par W0, libellés du plan (B5)                          |
| `fij_statistique.departement`                | `75`, `77`, `78`, `91`, `92`, `93`, `94`, `95` (comme `fij_departement`)                                                                                                                                                       | étape 1                                                            |
| `categorie_sensible.code`                    | codes écrits par migration d'après la liste de la coordination, par indicateur sensible du catalogue (1 à 30 caractères, minuscules et `_`) ; aucun en production avant la première liste                                      | B8                                                                 |
| `signalement.ecran`, `ecran=` de `/signaler` | `saisie_dimanche`, `saisie_mois`, `saisie_session`, `saisie_fij`, `saisie_fij_statistiques`, `saisie_evenement`, `saisie_reunion`, `autre`                                                                                     | B7                                                                 |

Libellés proposés de la ligne « Écran concerné : ... » (E8, « Proposé » tant qu'ils ne sont pas
dans `LISEZMOI.md`) : `saisie_dimanche` Chiffres du dimanche ; `saisie_mois` Chiffres du mois ;
`saisie_session` Présence à une session ; `saisie_fij` Carte des FIJ ; `saisie_fij_statistiques`
Chiffres par département ; `saisie_evenement` Ajouter un événement ; `saisie_reunion` Prochaine
réunion ; `autre` Autre écran. Un code inconnu dans l'adresse devient `autre`.

## 5. Tables nouvelles

Les sept tables nouvelles (`indicateur_terme`, `demande_indicateur`, `validation`,
`fij_statistique`, `evenement_mention`, `signalement`, `signalement_suivi`) : toutes en ajout
seulement (trigger d'inaltérabilité avant `update` et `delete`, seule exception `masquer_texte`
sous `pilotage.masquage` ; contrôle générique de `structure.test.sql`), RLS active, politique
restrictive `double_authentification` en `aal2`, GRANT `select` seulement à `authenticated`
(l'ajout passe par les fonctions), rien pour `anon` ni `service_role`.

`indicateur` n'est pas une table nouvelle ni une table en ajout seulement : B1 lui ajoute des
colonnes, et les fonctions de B3 (`corriger_indicateur`, `retirer_indicateur`,
`valider_indicateur`) mettent à jour `etat`, `retire_le`, `retrait_motif`, `texte_le` et
`texte_par`. Aucun GRANT `update` pour autant : ces mises à jour passent par les fonctions
`private` en `security definer`.

### `indicateur`, colonnes ajoutées (B1)

| Colonne                 | Type                  | Règle                                                                                                         |
| ----------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `definition`            | `text`                | 10 à 140 caractères, obligatoire (remplie pour les communs par la migration)                                  |
| `unite`                 | `text`                | section 4, défaut `nombre`                                                                                    |
| `sensible`              | `boolean`             | défaut `false` ; `mois` et `nombre` seulement, jamais source d'un calcul                                      |
| `calcul`                | `text`                | section 4, null pour un indicateur saisi ; termes dans `indicateur_terme`                                     |
| `etat`                  | `text`                | section 4, défaut `actif` ; `check (actif = (etat = 'actif'))`                                                |
| `origine`               | `text`                | section 4 ; `commun` si et seulement si `ministere_id` est null                                               |
| `modele_code`           | `text`                | code de `private.indicateur_prevu`, sinon null                                                                |
| `remplace_id`           | `uuid`                | unique, référence `indicateur`                                                                                |
| `cree_le`, `cree_par`   | `timestamptz`, `uuid` | `cree_par` null pour Système (migration)                                                                      |
| `texte_le`, `texte_par` | `timestamptz`, `uuid` | dernière écriture des textes                                                                                  |
| `retire_le`             | `timestamptz`         | posé avec `etat = 'retire'`                                                                                   |
| `retrait_motif`         | `text`                | section 4, posé avec `retire_le`                                                                              |
| `sans_somme`            | `boolean`             | défaut `false` : pas de somme de l'année                                                                      |
| `saisi_dimanche_matin`  | `boolean`             | défaut `false` : le dimanche du jour se saisit dès le matin (heure de Paris)                                  |
| `libelle_sessions`      | `boolean`             | défaut `false` (X3)                                                                                           |
| `part`                  | `boolean`             | défaut `false` (P49) : un calcul `taux` « part » ne dépasse jamais 100 % ; posé à la création, jamais modifié |

`nature` accepte `mois`. `mesure.valeur` passe à 0 à 9 999 999, le plafond de l'unité étant
contrôlé par `controler_mesure`. Changement du 6 octobre (P45) : `controler_mesure` accepte le mois
en cours d'un indicateur sensible, comme celui de tout indicateur du mois ; il refuse toujours un
mois futur, un autre jour que le 1er et un mois avant le 1er janvier de l'année précédente. Libellé unique par ministère sur `private.normaliser(libelle)`,
hors retirés. Pas de colonnes `haut_id` ni `bas_id` : les termes vivent dans `indicateur_terme`.

### `indicateur_terme` (B1)

| Colonne     | Type       | Règle                                                            |
| ----------- | ---------- | ---------------------------------------------------------------- |
| `calcul_id` | `uuid`     | référence `indicateur` (un calcul)                               |
| `ordre`     | `smallint` | clé (`calcul_id`, `ordre`)                                       |
| `role`      | `text`     | section 4                                                        |
| `source_id` | `uuid`     | un indicateur du même ministère, ni sensible ni commun ; ou null |
| `comptage`  | `text`     | section 4 ; ou null. Exactement un de `source_id` et `comptage`  |
| `agregat`   | `text`     | section 4, défaut `periode`                                      |
| `decalage`  | `smallint` | 0 à 3 mois, défaut 0                                             |

Écrite seulement à la création du calcul, figée ; lue comme `indicateur` (Q3).

### `demande_indicateur` et `validation` (B3)

Telles que `validation-metier.md`, section 6.2 : `demande_indicateur` (`id uuid`,
`indicateur_id uuid`, `ministere_id uuid`, `objet text`, `libelle text`, `definition text`,
`pourquoi text`, `saisi_le timestamptz`, `saisi_par uuid`) ; `validation` (`id uuid`,
`demande_id uuid` unique, `ministere_id uuid`, `decision text`, `motif text`,
`saisi_le timestamptz`, `saisi_par uuid`). `chiffre_confirme` vient après la mise en service.

### `private.indicateur_prevu` (B3) et `private.libelle_commun` (B4)

Illisibles par l'API. `indicateur_prevu` : `code text` (clé), `modele text`, `libelle text`,
`definition text`, `nature text`, `unite text`, `sensible boolean`, `part boolean` (P49, ajoutée par
B4, copiée sur `indicateur.part` à la création), `calcul text`, termes (codes
des sources du même modèle), drapeaux, `ordre smallint`. `libelle_commun` : `modele text`,
`commun_code text`, `libelle text` (60 caractères au plus).

### `fij_statistique` (B5)

| Colonne        | Type          | Règle                                      |
| -------------- | ------------- | ------------------------------------------ |
| `id`           | `bigint`      | identité                                   |
| `ministere_id` | `uuid`        | le ministère `fij`                         |
| `rubrique`     | `text`        | code de `private.fij_rubrique` (section 4) |
| `departement`  | `text`        | section 4                                  |
| `dimanche`     | `date`        | dimanche de la semaine (lundi au dimanche) |
| `valeur`       | `integer`     | 0 à 9 999                                  |
| `saisi_le`     | `timestamptz` | `forcer_auteur`                            |
| `saisi_par`    | `uuid`        | `forcer_auteur`                            |

`private.fij_rubrique` : `code text` (clé), `libelle text`, `ordre smallint`.

### `evenement_mention` (B6)

`evenement_id uuid` et `ministere_id uuid`, clé des deux, index sur `ministere_id`. Pas de
`saisi_par` : les mentions s'écrivent avec l'événement, par `ajouter_evenement`, et ne changent
plus.

### `signalement` et `signalement_suivi` (B7)

| Table               | Colonnes                                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `signalement`       | `id uuid`, `ministere_id uuid`, `ecran text` (section 4), `texte text` (10 à 280 après `trim`), `saisi_le timestamptz`, `saisi_par uuid`                    |
| `signalement_suivi` | `id uuid`, `signalement_id uuid` (unique : une seule clôture, définitive), `commentaire text` (null, ou 10 à 280), `saisi_le timestamptz`, `saisi_par uuid` |

Lecture (décision du 6 octobre 2026) : le ministère lit ses signalements et leur clôture ; EJP
Tech lit tout ; **l'administration, le berger et le conseil ne lisent rien**. Ajout seulement par
`signaler_difficulte` et `clore_signalement`.

### `categorie_sensible`, `ventilation_sensible` et `precision_sensible` (B8, changement du 6 octobre)

| Table                  | Colonnes                                                                                                                                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `categorie_sensible`   | `prevu_code text` (référence `private.indicateur_prevu(code)`, un prévu sensible), `code text` (section 4), `libelle text` (1 à 40 caractères), `ordre smallint` (au moins 1, unique par `prevu_code`), `retiree_le date` (null) ; clé (`prevu_code`, `code`)       |
| `ventilation_sensible` | `id bigint` (identité), `mesure_id bigint` (référence `mesure`), `indicateur_id uuid`, `ministere_id uuid`, `mois date` (1er du mois), `categorie text`, `valeur integer` (0 à 9 999), `saisi_le timestamptz`, `saisi_par uuid` ; unique (`mesure_id`, `categorie`) |
| `precision_sensible`   | `id uuid`, `mesure_id bigint` (unique, référence `mesure`), `indicateur_id uuid`, `ministere_id uuid`, `mois date` (1er du mois), `texte text` (10 à 280 après `trim`), `saisi_le timestamptz`, `saisi_par uuid`                                                    |

- `categorie_sensible` : table de référence, écrite seulement par migration (`pilotage.migration`)
  d'après les listes de la coordination ; vide en production tant qu'aucune liste n'est arrivée ;
  un trigger refuse modification et suppression dès qu'une ligne de `ventilation_sensible` utilise
  la catégorie, sauf la pose de `retiree_le` (de null à une date, par migration, quand la
  coordination change sa liste : une catégorie retirée ne s'affiche plus dans la grille de saisie
  et reste lisible dans les anciennes répartitions) ; 3 à 6 catégories en cours par indicateur
  (consigne proposée par EJP Tech, supposée par la règle d'affichage de P47) : **la base
  l'impose** à chaque répartition (le trigger de `ventilation_sensible` et `saisir_chiffres_mois`
  refusent une répartition dont la liste en cours, hors catégories retirées, compte moins de 3 ou
  plus de 6 catégories : l'indicateur n'a alors pas de répartition) ; l'ordre est unique dans une
  liste (la règle de P47 départage « la première dans l'ordre de la liste » : trier par `ordre`
  suffit) ; lue comme `indicateur` (Q3) : il existe un indicateur sensible lisible dont
  `modele_code` vaut `prevu_code`. RLS, `aal2`, GRANT `select` seulement.
- `ventilation_sensible` et `precision_sensible` : ajout seulement (`forcer_auteur`, trigger
  d'inaltérabilité ; seule exception `masquer_texte` pour `precision_sensible.texte`), RLS, `aal2`,
  GRANT `select` seulement : seule `saisir_chiffres_mois` y écrit. `indicateur_id`, `ministere_id`
  et `mois` reprennent ceux de la ligne de `mesure` (la fonction les pose). La somme des catégories
  d'un `mesure_id` ne dépasse jamais sa `valeur`. **Une répartition reprend toute la liste en
  cours** (T42, proposé) : une catégorie que le ministère ne renseigne pas est écrite à 0, jamais
  absente ; le lien entre `categorie` et `categorie_sensible` ne tient que par les triggers, un
  test vérifie qu'aucune ligne n'a une catégorie absente de la liste de son indicateur.
- Lecture : `ventilation_sensible` par le seul ministère (`ministere_id = private.mon_ministere()`),
  les autres passent par `v_ventilation_sensible` ; `precision_sensible` (table brute) par le
  ministère auteur (`ministere_id = private.mon_ministere()`) et par EJP Tech seul (relecture et
  masquage), jamais par le berger ni le conseil, qui lisent `v_precision_sensible`, adossée à
  `private.precisions_sensibles()` : ils verraient sinon les envois intermédiaires (textes
  remplacés, dates, `mesure_id`). Ni l'administration, ni un autre ministère. Toutes deux excluent un indicateur retiré pour
  confidentialité (Q11).

## 6. Vues nouvelles ou étendues

Toutes `with (security_invoker = true)`, lecture seule pour `authenticated`. Une vue servie par
une fonction `private` en `security definer` contrôle `aal2` dans son jeton et réapplique le filtre
du lecteur (`private.lit_tout()`, `private.mon_ministere()`), comme `tableau_ministeres`.

Un « moins de 3 » (seuil des sensibles, X4) se rend par `valeur` à null et `moins_de_3` à vrai ;
un 0 reste 0. Une absence de saisie est toujours null, jamais 0.

### `v_mesure_periode` (B2)

| Colonne         | Type          | Sens                                                          |
| --------------- | ------------- | ------------------------------------------------------------- |
| `indicateur_id` | `uuid`        |                                                               |
| `ministere_id`  | `uuid`        |                                                               |
| `nature`        | `text`        |                                                               |
| `periode`       | `date`        | le dimanche, le 1er du mois, ou la date d'un « à ce jour »    |
| `valeur`        | `integer`     | saisie la plus récente (départage par `id`) ; null si masquée |
| `moins_de_3`    | `boolean`     | vrai pour 1 et 2 d'un sensible lu par un autre profil         |
| `saisi_le`      | `timestamptz` | heure de la saisie qui fait foi                               |

Changement du 6 octobre (P45) : le mois en cours d'un sensible y figure comme les autres mois, avec
le seuil ; une seule ligne par période, celle de la saisie qui fait foi, jamais une saisie
intermédiaire (pour le berger, le conseil et EJP Tech).

### `v_indicateur_serie` (B2)

| Colonne         | Type       | Sens                                                   |
| --------------- | ---------- | ------------------------------------------------------ |
| `indicateur_id` | `uuid`     |                                                        |
| `ministere_id`  | `uuid`     |                                                        |
| `periode`       | `date`     | 10 dimanches ou 12 mois, du plus ancien au plus récent |
| `rang`          | `smallint` | 1 pour la plus ancienne période                        |
| `valeur`        | `integer`  | null : trou (ou masquée, avec `moins_de_3`)            |
| `moins_de_3`    | `boolean`  |                                                        |
| `complete`      | `boolean`  | faux : cercle vide (période incomplète)                |

### `v_indicateur_suivi` (B2)

| Colonne                    | Type          | Sens                                                                                                                    |
| -------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `indicateur_id`            | `uuid`        |                                                                                                                         |
| `ministere_id`             | `uuid`        | null pour un commun                                                                                                     |
| `libelle`, `definition`    | `text`        | textes actuels                                                                                                          |
| `nature`, `unite`          | `text`        |                                                                                                                         |
| `sensible`                 | `boolean`     |                                                                                                                         |
| `etat`, `origine`          | `text`        |                                                                                                                         |
| `calcul`                   | `text`        | null pour un indicateur saisi                                                                                           |
| `derniere_periode`         | `date`        | null : pas encore de saisie                                                                                             |
| `derniere_valeur`          | `integer`     |                                                                                                                         |
| `derniere_moins_de_3`      | `boolean`     |                                                                                                                         |
| `derniere_saisie_le`       | `timestamptz` |                                                                                                                         |
| `mois_en_cours_valeur`     | `integer`     | à part ; pour un sensible aussi depuis le 6 octobre (P45), null si masquée                                              |
| `mois_en_cours_moins_de_3` | `boolean`     | changement du 6 octobre (P45) : vrai pour 1 et 2 du mois en cours d'un sensible lu par un autre profil que le ministère |
| `somme_annee`              | `bigint`      | null si `sans_somme`, « à ce jour », ajout à valider, ou rien de saisi                                                  |
| `somme_moins_de_3`         | `boolean`     | somme de l'année égale à 1 ou 2 d'un sensible (K5c)                                                                     |
| `somme_depuis`             | `date`        | départ de la somme (« Depuis juillet »)                                                                                 |
| `somme_nb_saisies`         | `integer`     | complétude : « 9 mois sur 9 »                                                                                           |
| `somme_nb_attendues`       | `integer`     |                                                                                                                         |
| `plus_de_30_jours`         | `boolean`     | « à ce jour » saisi il y a plus de 30 jours                                                                             |
| `etat_valeur`              | `text`        | `saisi`, `non_saisi` (rien pour la dernière période attendue), `jamais_saisi` (fixé par W0)                             |
| `attente_jours`            | `integer`     | ajout à valider : jours depuis `cree_le`, heure de Paris ; sinon null                                                   |
| `retire_le`                | `timestamptz` | pour le bloc « Retirés »                                                                                                |

Un refusé et un retiré pour confidentialité n'y figurent pas (Q11).

### `v_calcul` (B2)

| Colonne                   | Type      | Sens                                                                                                                                                                                |
| ------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `indicateur_id`           | `uuid`    | le calcul                                                                                                                                                                           |
| `ministere_id`            | `uuid`    |                                                                                                                                                                                     |
| `calcul`                  | `text`    | `taux` ou `moyenne` (V1)                                                                                                                                                            |
| `periode`                 | `date`    | dernière période finie                                                                                                                                                              |
| `haut`, `bas`             | `bigint`  | sommes de la période                                                                                                                                                                |
| `resultat`                | `numeric` | pour un taux, en pour cent ; jamais plus de 100 pour une part (`part`), non calculé sinon (P49) ; null : non calculé                                                                |
| `annee_haut`, `annee_bas` | `bigint`  | Σ sur les périodes de l'année qui ont toutes les valeurs                                                                                                                            |
| `annee_resultat`          | `numeric` | jamais une moyenne de taux ; null pour une part dont Σ haut dépasse Σ bas (P49 : « Non calculé, à vérifier », aucune période écartée, `annee_haut` et `annee_bas` restent lisibles) |
| `annee_nb_periodes`       | `integer` | complétude                                                                                                                                                                          |
| `annee_nb_attendues`      | `integer` |                                                                                                                                                                                     |
| `non_calcule_raison`      | `text`    | `source_non_saisie`, `bas_nul` ou `haut_depasse_bas` (P49, ajouté par B4), null si calculé                                                                                          |
| `non_calcule_source_id`   | `uuid`    | la source qui manque (« demandes reçues de septembre non saisies »)                                                                                                                 |

Les calculs étendus (différence, somme, évolution, agrégats, décalages, comptages) n'y figurent
pas avant L1.

### `v_usage_indicateurs` (B2)

`indicateur_id uuid`, `ministere_id uuid`, `nb_periodes_saisies integer`,
`nb_periodes_attendues integer`, `derniere_saisie_le timestamptz`, `jamais_saisi boolean`,
`attente_jours integer`. Jamais une valeur. Administration et EJP Tech seulement.

### `v_catalogue`, `v_suggestions` et `v_a_valider` (B3)

- `v_catalogue` (administration, EJP Tech) : `code text`, `modele text`, `libelle text`,
  `definition text`, `nature text`, `unite text`, `sensible boolean`, `calcul text`,
  `ordre smallint`.
- `v_suggestions` (ministère pour sa fiche, administration, EJP Tech) : `ministere_id uuid`,
  `code text`, `libelle text`, `definition text`, `nature text`, `unite text`.
- `v_a_valider` (EJP Tech seul) : `demande_id uuid`, `objet text`, `indicateur_id uuid`,
  `ministere_id uuid`, `ministere_nom text`, `libelle_actuel text`, `libelle_envoye text`,
  `definition text`, `nature text`, `pourquoi text`, `saisi_le timestamptz`,
  `attente_jours integer`, `en_retard boolean` (plus de 7 jours), `nb_valeurs integer`.

### `v_commun_fiche` (B4)

`ministere_id uuid`, `commun_code text` (`service`, `actifs`, `en_fij`), `libelle text` (libellé
de la demande, 60 caractères au plus), `ordre smallint`, `reference_eglise boolean` (les deux
lignes de référence de MDS, dont les valeurs viennent de `v_total_a_ce_jour` et
`v_total_dimanche`). Servie par `private.communs_de_fiche()`. Le ministère lit les siennes ;
berger, conseil et EJP Tech toutes ; l'administration rien.

### `v_fij_statistique` (B5)

Une ligne par rubrique et par dimanche, sur les 10 derniers dimanches jusqu'à
`private.dimanche_reference()` (fixé par W0) :

| Colonne              | Type          | Sens                                                            |
| -------------------- | ------------- | --------------------------------------------------------------- |
| `rubrique`           | `text`        | code (section 4)                                                |
| `rubrique_libelle`   | `text`        | « Présents au culte EJP »...                                    |
| `rubrique_ordre`     | `smallint`    |                                                                 |
| `dimanche`           | `date`        |                                                                 |
| `total`              | `bigint`      | somme des départements saisis ; null si aucun (trou, jamais 0)  |
| `nb_departements`    | `integer`     | complétude « 6 dép. sur 8 » (sur 8)                             |
| `departements`       | `jsonb`       | `{"75": 12, ...}` : dernière saisie de chaque département saisi |
| `derniere_saisie_le` | `timestamptz` |                                                                 |

Ministère `fij`, berger, conseil et EJP Tech ; rien pour l'administration ni un autre ministère.

### `v_evenement` étendue (B6)

Colonnes actuelles (`id`, `ministere_id`, `titre`, `date`, `statut`, `mis_a_jour_le`), puis en fin :
`jours integer` (date moins `private.aujourdhui()`), `a_confirmer boolean` (en attente de
validation, date au plus aujourd'hui plus 3, ministère actif), `reporte_du date` (date de l'état
précédent si la date a changé, sinon null). Les mentions se lisent dans `evenement_mention`.

### `v_ventilation_sensible` (B8, changement du 6 octobre)

Servie par `private.ventilations_sensibles()` (`security definer`, `aal2` contrôlé dans le jeton,
filtre du lecteur réappliqué : `private.lit_tout()` ou `ministere_id = private.mon_ministere()` ;
rien pour l'administration ni pour un autre ministère). Une ligne par catégorie de la liste en
cours de la répartition du total le plus récent de chaque mois (une catégorie non renseignée vaut
0, T42 proposé ; une catégorie retirée depuis garde sa ligne dans une ancienne répartition), plus
une ligne « Non réparti » :

| Colonne         | Type       | Sens                                                                                                   |
| --------------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| `indicateur_id` | `uuid`     |                                                                                                        |
| `ministere_id`  | `uuid`     |                                                                                                        |
| `periode`       | `date`     | 1er du mois                                                                                            |
| `categorie`     | `text`     | code de `categorie_sensible` ; null pour la ligne « Non réparti »                                      |
| `libelle`       | `text`     | libellé de la catégorie, ou « Non réparti »                                                            |
| `ordre`         | `smallint` | ordre de la liste ; « Non réparti » en dernier                                                         |
| `valeur`        | `integer`  | exacte pour le ministère ; null si « moins de 3 » ou masquée                                           |
| `moins_de_3`    | `boolean`  | vrai pour une case de 1 ou 2 lue par un autre profil que le ministère                                  |
| `masquee`       | `boolean`  | vrai pour une case masquée par le masquage secondaire (« masqué »)                                     |
| `tout_masque`   | `boolean`  | vrai sur toutes les lignes d'un mois dont la répartition est masquée en entier (P47, règles 2, 5 et 6) |

Règle d'affichage : celle de P47 (`docs/decisions.md`, règles 1 à 6, dont le départage « la
première dans l'ordre de la liste, Non réparti en dernier » et la borne de la règle 6) ; une seule
fonction `private` la calcule, appelée par la vue et par le test qui joue le lecteur. Aucune somme
de l'année ni série par catégorie. **Un mois dont le total le plus récent n'a pas de répartition
n'a aucune ligne** (l'écran dit « Pas de répartition pour septembre. », BRIEF section 9) ; E3
pré-remplit la grille avec la répartition actuelle quand le ministère corrige le total.

### `v_precision_sensible` (B8, changement du 6 octobre)

Adossée à `private.precisions_sensibles()` (`security definer`, `aal2` contrôlé dans le jeton,
filtre du lecteur réappliqué : `private.lit_tout()` ou `ministere_id = private.mon_ministere()` ;
rien pour l'administration ni pour un autre ministère ; rien pour un indicateur retiré pour
confidentialité), parce que le berger et le conseil ne lisent pas la table brute : la précision
**attachée au total le plus récent** de chaque indicateur, ministère et mois (le même `mesure_id`
que `v_mesure_periode`), sans `mesure_id` ni date d'envoi. Colonnes : `indicateur_id uuid`,
`ministere_id uuid`, `mois date`, `texte text` (« [texte masqué par EJP Tech] » s'il est masqué).
Un total plus récent sans précision n'a aucune ligne.

### `v_journal` (B3, B8, B7)

Mêmes colonnes ; `cible_texte` gagne `indicateur` (libellé actuel, B3), `precision_sensible` (B8 :
« Précision : » suivi du libellé actuel de l'indicateur et du mois, jamais le texte) et
`signalement` et `signalement_suivi` (B7 : code de l'écran du signalement, jamais le texte ni le
commentaire ; l'un et l'autre se lisent sous la RLS du lecteur : le ministère auteur et EJP Tech).

### `v_signalement` (B7)

Un signalement avec sa clôture, pour le bloc « Signalements » d'EJP Tech (E8 : les ouverts, puis
les clos des 30 derniers jours) et « Vos derniers signalements » d'un ministère. `security_invoker`
sur `signalement` et `signalement_suivi` : le ministère auteur ne lit que les siens, EJP Tech tous,
personne d'autre (ni l'administration, ni le berger, ni le conseil), rien en `aal1`. Les dates se
calculent à l'heure de Paris par la base (`private.aujourdhui()`) : **E8 ne filtre jamais avec la
date du navigateur**, il lit `ouvert` et `clos_recent` et trie par `saisi_le`.

| Colonne         | Type          | Sens                                                                             |
| --------------- | ------------- | -------------------------------------------------------------------------------- |
| `id`            | `uuid`        | le signalement (cible de la modération du texte)                                 |
| `ministere_id`  | `uuid`        |                                                                                  |
| `ministere_nom` | `text`        |                                                                                  |
| `ecran`         | `text`        | code de la section 4                                                             |
| `texte`         | `text`        | « [texte masqué par EJP Tech] » s'il est masqué                                  |
| `saisi_le`      | `timestamptz` | envoi                                                                            |
| `suivi_id`      | `uuid`        | la clôture (cible de la modération du commentaire) ; null si ouvert              |
| `commentaire`   | `text`        | commentaire de clôture ; null si ouvert ou sans commentaire                      |
| `clos_le`       | `timestamptz` | clôture ; null si ouvert                                                         |
| `ouvert`        | `boolean`     | vrai sans clôture                                                                |
| `clos_recent`   | `boolean`     | vrai pour une clôture d'il y a 30 jours au plus (jour de Paris) ; faux si ouvert |

La liste des codes d'écran est écrite une seule fois, dans `private.ecrans_signalement()` : le
check de `signalement.ecran` et `signaler_difficulte` la lisent. Une nouvelle saisie ajoute son code
en recréant cette fonction par migration.

Pour `precision_sensible`, `cible_texte` se lit sous la RLS de la table brute : le ministère auteur
et EJP Tech reçoivent le texte « Précision : … » ; **le berger et le conseil reçoivent null** (ils
lisent la ligne de journal mais pas la précision, ce qui ne révèle pas qu'une précision remplacée
a existé). Les écrans du journal affichent alors un texte de repli, par exemple « Précision d'un
indicateur sensible ». B7 part de la version de B8 de la politique de lecture de `journal`, de
`v_journal`, de `masquer_texte`, de `marquer_relu` et de `auteur_texte`, puis ajoute la condition
de P51 (l'administration ne lit plus les lignes `texte_relu` et `texte_masque` de cible
`demande_indicateur`) avec son test de matrice.

## 7. Fonctions nouvelles

Chaque fonction de l'API : `private.<nom>` en `security definer`, `set search_path = ''`,
`perform private.exige_aal2();` en première instruction, et `public.<nom>` d'une ligne en
`security invoker` qui l'appelle ; GRANT `execute` à `authenticated` seulement. Un refus de droit
lève 42501 avec « Cet élément n'existe pas ou vous n'y avez pas accès. » ; une erreur de saisie
lève l'exception par défaut (P0001), affichée telle quelle. Aucun SQL dynamique.

| Fonction (`public`)                                                                                                                                                                                                                                        | Rend                                                                                                    | Lot | Appelants                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --- | --------------------------------------------------------------------------- |
| `creer_indicateurs_prevus(p_ministere_id uuid, p_modele text)`                                                                                                                                                                                             | `integer` (indicateurs créés)                                                                           | B3  | administration, EJP Tech                                                    |
| `creer_indicateur(p_ministere_id uuid, p_libelle text, p_definition text, p_nature text, p_unite text, p_sensible boolean, p_pas_sensible boolean, p_remplace_id uuid, p_pourquoi text default null)`                                                      | `uuid`                                                                                                  | B3  | administration, EJP Tech (ministère au lot 2)                               |
| `creer_calcul(p_libelle text, p_definition text, p_type text, p_haut_id uuid, p_bas_id uuid, p_remplace_id uuid, p_part boolean default null)` (7e paramètre ajouté par B4 : part du calcul, par défaut celle du calcul remplacé, jamais pour une moyenne) | `uuid`                                                                                                  | B3  | administration, EJP Tech                                                    |
| `ajouter_suggestion(p_ministere_id uuid, p_code text, p_pourquoi text default null)`                                                                                                                                                                       | `uuid`                                                                                                  | B3  | ministère sur sa fiche (« Pourquoi » obligatoire), administration, EJP Tech |
| `corriger_indicateur(p_indicateur_id uuid, p_libelle text, p_definition text)`                                                                                                                                                                             | `text` (`corrige` ou `envoye`)                                                                          | B3  | administration, EJP Tech                                                    |
| `retirer_indicateur(p_indicateur_id uuid, p_motif text)`                                                                                                                                                                                                   | `integer` (calculs retirés avec lui)                                                                    | B3  | administration, EJP Tech                                                    |
| `valider_indicateur(p_demande_id uuid, p_decision text, p_motif text default null)`                                                                                                                                                                        | `void`                                                                                                  | B3  | EJP Tech seul                                                               |
| `verifier_libelle(p_libelle text, p_nature text, p_ministere_id uuid)`                                                                                                                                                                                     | `table (famille text, message text, bloquant boolean)`                                                  | B3  | ministère sur sa fiche, administration, EJP Tech                            |
| `limites_indicateurs(p_ministere_id uuid)`                                                                                                                                                                                                                 | `table (ajouts integer, ajouts_max integer, lignes integer, lignes_max integer)` (3 et 30, fixé par W0) | B3  | ministère sur sa fiche, administration, EJP Tech                            |
| `saisir_fij_statistiques(p_dimanche date, p_valeurs jsonb)`                                                                                                                                                                                                | `void`                                                                                                  | B5  | ministère `fij` seulement                                                   |
| `ajouter_evenement(p_titre text, p_date date, p_statut public.statut_evenement, p_mentions uuid[])`                                                                                                                                                        | `uuid`                                                                                                  | B6  | ministère ; la version à trois arguments délègue avec `'{}'`                |
| `signaler_difficulte(p_ecran text, p_texte text)`                                                                                                                                                                                                          | `uuid` (le signalement)                                                                                 | B7  | ministère actif seulement (le ministère vient de la session)                |
| `saisir_chiffres_mois(p_mois date, p_lignes jsonb)` (changement du 6 octobre)                                                                                                                                                                              | `integer` (lignes de `mesure` écrites)                                                                  | B8  | ministère actif seulement (le ministère vient de la session)                |
| `clore_signalement(p_signalement_id uuid, p_commentaire text default null)`                                                                                                                                                                                | `void`                                                                                                  | B7  | EJP Tech seul                                                               |

`p_valeurs` de `saisir_fij_statistiques` (fixé par W0) : un tableau
`[{"rubrique": "culte_ejp", "departement": "75", "valeur": 12}, ...]`, 32 éléments au plus (4
rubriques sur 8 départements), sans doublon ; une seule ligne de journal par envoi.

`p_lignes` de `saisir_chiffres_mois` (changement du 6 octobre, B8) : un tableau de 1 à 30 éléments
`[{"indicateur_id": "...", "valeur": 7, "categories": {"malaise": 4, "blessure": 2}, "precision":
"..."}, ...]`, sans doublon d'indicateur. `indicateur_id` et `valeur` sont obligatoires ;
`categories` et `precision` sont facultatifs et réservés aux indicateurs sensibles (`categories`
seulement si la liste en cours de l'indicateur compte de 3 à 6 catégories ; une catégorie absente
de l'objet est écrite à 0, T42 proposé). Tout le mois part en un appel : une seule instruction
`insert` dans `mesure` (une ligne de journal `mesure_saisie`), puis les lignes de
`ventilation_sensible` et de `precision_sensible`, tout ou rien. La partie `private` réapplique les
conditions de la politique d'ajout de `mesure` (ministère de la session, indicateur du mois à lui,
actif ou à valider, non calculé) ; `controler_mesure` s'applique toujours.

Fonctions `private` sans partie publique : `private.normaliser(text) returns text` (immutable,
B1) ; `private.mois_courant() returns date` (1er du mois de `private.aujourdhui()`, B1) ;
`private.verifier_texte(p_texte text, p_pour_ministere boolean) returns table (famille text,
message text, bloquant boolean)` (B1, fixé par W0 ; B3 et B7 l'appellent) ;
`private.peut_configurer() returns boolean` (administration et EJP Tech, B3) ;
`private.communs_de_fiche()` (B4) ; `private.evenements_mentionnant_mon_ministere() returns setof
uuid` (B6) ; `private.ventilations_sensibles()` et `private.precisions_sensibles()` (B8, servent
`v_ventilation_sensible` et `v_precision_sensible`) ; triggers
`private.controler_indicateur()` (B1), `private.controler_evenement_etat()` (B6),
`private.controler_mesure()` réécrit (B1, mois en cours d'un sensible accepté depuis le 6 octobre),
et le trigger de `categorie_sensible` qui refuse de changer une catégorie utilisée (B8).
`masquer_texte` et `marquer_relu` acceptent le couple (`precision_sensible`, `texte`) depuis B8.

Messages repris tels quels par les formulaires : « La date ne peut pas être passée. » (ajout
d'événement, étape 3) ; « La nouvelle date doit être aujourd'hui ou plus tard. » et « Rien n'a
changé : ce statut et cette date sont déjà enregistrés. » (B6) ; « Ce signalement est déjà
clos. » (B7) ; « La somme des catégories (9) dépasse le total du mois (7). » et « La précision doit
faire entre 10 et 280 caractères. » (B8, les nombres étant ceux de l'envoi).

## 8. Matrice des droits

Celle de `docs/plan-etape-4.md`, section 4, avec la décision du 6 octobre 2026 sur les
signalements, qui remplace les lignes « à confirmer » :

| Objet                                                     | Ministère                                                    | Berger, conseil                                      | Administration                                                                                                                                                                   | EJP Tech                           | `aal1`, anonyme |
| --------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | --------------- |
| `signalement`                                             | L les siens ; A par `signaler_difficulte`                    | rien                                                 | rien                                                                                                                                                                             | L tous                             | rien            |
| `signalement_suivi`                                       | L celui de ses signalements                                  | rien                                                 | rien                                                                                                                                                                             | L tous ; A par `clore_signalement` | rien            |
| `signaler_difficulte`                                     | sa fiche seulement                                           | refusé                                               | refusé                                                                                                                                                                           | refusé                             | refusé          |
| `clore_signalement`                                       | refusé                                                       | refusé                                               | refusé                                                                                                                                                                           | oui                                | refusé          |
| `journal` (codes nouveaux)                                | lignes de sa fiche                                           | toutes, sauf les lignes des signalements (section 1) | `mesure_saisie` et `indicateur_*`, sans valeur ; ni FIJ ni événements ; aucune ligne des signalements ; aucun `texte_relu` ni `texte_masque` de cible `demande_indicateur` (P51) | toutes                             | rien            |
| `categorie_sensible` (B8)                                 | L des siens (comme `indicateur`, Q3)                         | L                                                    | L (définitions, sans valeur)                                                                                                                                                     | L                                  | rien            |
| `ventilation_sensible` (B8)                               | L les siennes (lignes brutes) ; A par `saisir_chiffres_mois` | rien (par la vue)                                    | rien                                                                                                                                                                             | rien (par la vue)                  | rien            |
| `v_ventilation_sensible` (B8)                             | valeurs exactes des siennes                                  | « moins de 3 », masquage secondaire, « non réparti » | rien                                                                                                                                                                             | comme le berger                    | rien            |
| `precision_sensible` (B8, table brute)                    | L les siennes ; A par `saisir_chiffres_mois`                 | rien (par la vue)                                    | rien                                                                                                                                                                             | L (relecture et masquage)          | rien            |
| `v_precision_sensible` (B8)                               | L la sienne (total le plus récent)                           | L (total le plus récent, sans date d'envoi)          | rien                                                                                                                                                                             | L comme le berger                  | rien            |
| `saisir_chiffres_mois` (B8)                               | sa fiche seulement, ministère actif                          | refusé                                               | refusé                                                                                                                                                                           | refusé                             | refusé          |
| `moderation`, couple (`precision_sensible`, `texte`) (B8) | rien                                                         | rien                                                 | rien                                                                                                                                                                             | L, relecture et masquage           | rien            |

Les lignes des signalements du journal (`difficulte_signalee`, `signalement_clos`, et
`texte_relu` ou `texte_masque` de cible `signalement` ou `signalement_suivi`) ne se lisent que par
le ministère auteur et par EJP Tech (T39, décidé ; condition de la section 1, écrite par B7).

Les lignes `texte_relu` et `texte_masque` de cible `demande_indicateur` (le texte « Pourquoi »)
se lisent par le ministère auteur, EJP Tech, le berger et le conseil, pas par l'administration
(P51, décidé ; condition de la section 1, écrite par B7).

Les sept dernières lignes viennent du changement du 6 octobre (P46, P47, T41) ; la matrice complète
reste celle de `docs/plan-etape-4.md`, section 4.

Chaque lot de base écrit ses lignes en données et les parcourt avec l'aide de
`supabase/tests/000-outils.test.sql` :

```sql
select plan(12 + tests.nombre_essais(:matrice, :profils, true));  -- 12 : les autres tests du fichier
select * from tests.verifier_matrice(
  $$ values ('ministère A', 'signalement', 'lire', 'aal2', '1', 'select 1 from public.signalement'),
            ('EJP Tech', 'clore_signalement', 'appeler', 'aal2', 'ok', 'select public.clore_signalement(...)') $$,
  $$ select 'ministère A', a from ctx union all select 'EJP Tech', tech from ctx $$,
  true);  -- vrai : ajoute les lignes aal1 dérivées et la ligne de l'anonyme
```

Colonnes de la matrice : `profil`, `objet`, `action` (« lire » compte les lignes, toute autre
action exécute la requête), `aal` (`aal1` ou `aal2`), `attendu` (nombre de lignes, `ok`, ou un
code d'erreur comme `42501`), `requete`. Un test pgTAP par ligne ; chaque essai est annulé
aussitôt. `tests.essai(compte, aal, requête, mode)` sert aussi seul.

Règles de l'aide (`000-outils.test.sql`) :

- **Lignes dérivées** (troisième argument à vrai). Une ligne aal1 n'est dérivée que d'une ligne
  aal2 **acceptée** (`ok`, ou pour « lire » un nombre de lignes de 0 à 9999 ; un code d'erreur
  a cinq caractères, comme `42501`) : elle attend `0` pour une lecture d'une table
  ou d'une vue, `42501` pour toute autre action et pour une lecture qui appelle une fonction de
  `public` (`exige_aal2`). Une ligne refusée en aal2 n'a pas de ligne aal1 dérivée (l'erreur en
  aal1 dépend de l'ordre des contrôles : un trigger avant l'ajout passe avant la RLS) : le lot
  écrit sa ligne aal1 s'il veut la tester. L'anonyme a une ligne par objet, action et requête,
  qui attend `42501`.
- **Une ligne écrite remplace la ligne dérivée** de même profil, objet, action et requête (en
  aal1, ou pour l'anonyme). C'est le cas de `compte` : un compte lit sa propre ligne en aal1, la
  ligne aal1 attend donc `1`.
- **Nombre de tests** : `tests.nombre_essais(matrice, profils, dériver)` rend le nombre d'essais,
  lignes dérivées comprises, pour `plan()`. L'ordre des essais est fixe (objet, action, requête).
- **Profils** : un profil présent deux fois dans la requête des profils lève une erreur.
- **Écriture sans ligne** : `tests.essai` rend `ok` pour un appel (requête qui commence par
  `select`) ou pour une écriture qui touche au moins une ligne, et `ok:0` pour une écriture qui
  n'en touche aucune (un `insert ... select` vide, un `update` filtré par la RLS) : une ligne
  « acceptée » doit vraiment écrire.

Contrôles génériques de `structure.test.sql` que chaque objet nouveau doit passer dès son lot :
RLS et **exactement** la politique restrictive `aal2` de référence sur toute table (comparée
à une copie écrite dans le test) ; aucun droit pour `anon` ; aucun `update`, `delete` ni
`truncate` pour `authenticated` ; `insert` seulement sur `mesure`, `fij_departement`,
`participation`, `evenement_etat` et `reunion` ; rien pour `anon` ni `authenticated` sur une
table de `private` ; un GRANT sur une seule colonne compte comme un droit
(`has_any_column_privilege`) ; `service_role` seulement sur `ministere`, `compte` et `journal` ;
toute vue en `security_invoker` ; aucune fonction `security definer` hors de `private`, dans aucun
schéma du projet ; toute fonction de `public` en `security invoker`, qui appelle sa partie
`private` du même nom, `security definer`, commençant par `perform private.exige_aal2();` ; toute
fonction `private` en `security definer` qui sert une vue (`returns table`) contrôle `aal2` dans
son jeton, par l'expression `(select auth.jwt() ->> 'aal') = 'aal2'` (avec ou sans `coalesce`)
ou par `perform private.exige_aal2()`, hors commentaire ; `forcer_auteur` (la fonction
`private.forcer_auteur()`, avant l'ajout de chaque ligne) sur toute table qui porte `saisi_par` ;
un trigger avant `update` et `delete`, par ligne, sur toute table nouvelle de `public` ; aucun SQL
dynamique ; aucun check avec `now()` ou `current_date`.

## 9. Adresses, pages amorces et aperçus

Déclarées une fois par W0 dans `src/features/navigation/profils.ts`, `src/app/routes.tsx` et
`src/pages/PageApplication.tsx`. Une adresse réservée à un autre profil donne la page non
disponible, sans aucune requête. L'administration n'a aucune adresse nouvelle.

| Adresse                                      | Paramètres          | Profils                                   | Page amorce                        | Lot |
| -------------------------------------------- | ------------------- | ----------------------------------------- | ---------------------------------- | --- |
| `/` (ouverture 07 pour le ministère)         |                     | ministère                                 | `PageCetteSemaine` existante       | E7  |
| `/ma-fiche`                                  |                     | ministère                                 | `PageMaFiche.tsx`                  | E2  |
| `/ministeres`                                |                     | berger, conseil, EJP Tech (lecture seule) | `PageMinisteres.tsx`               | E2  |
| `/ministeres/:id`                            |                     | berger, conseil, EJP Tech (lecture seule) | `PageFicheMinistere.tsx`           | E2  |
| `/saisir/dimanche`                           | `date` (AAAA-MM-JJ) | ministère                                 | `PageSaisieDimanche.tsx`           | E3  |
| `/saisir/mois`                               | `mois` (AAAA-MM)    | ministère                                 | `PageSaisieMois.tsx`               | E3  |
| `/saisir/session/:id`                        |                     | ministère                                 | `PageSaisieSession.tsx`            | E4  |
| `/saisir/fij`                                |                     | ministère `fij`                           | `PageSaisieFij.tsx`                | E4  |
| `/saisir/fij-statistiques`                   |                     | ministère `fij`                           | `PageSaisieFijStatistiques.tsx`    | E4  |
| `/saisir/evenement`, `/saisir/evenement/:id` |                     | ministère                                 | `PageSaisieEvenement.tsx`          | E5  |
| `/saisir/reunion`                            |                     | ministère                                 | `PageSaisieReunion.tsx`            | E5  |
| `/signaler`                                  | `ecran` (section 4) | ministère                                 | `PageSignalement.tsx`              | E8  |
| `/moderation`                                |                     | EJP Tech                                  | emplacement `BlocSignalements.tsx` | E8  |

Règle de `/ministeres/:id` pour un ministère : son propre identifiant renvoie vers `/ma-fiche` ;
tout autre identifiant donne la page non disponible, sans requête.

Aperçus sans base ni écriture (captures) : `/apercu/fiche`, `/apercu/saisies`,
`/apercu/evenements`.

## 10. Emplacements et types partagés

- `src/lib/base.ts` réexporte `src/lib/base/communs.ts` (contenu de l'étape 3), `indicateurs.ts`
  (E1), `fiche.ts` (E2), `fij.ts` (E4), `evenements.ts` (E5, E6) et `signalements.ts` (E8). Les
  types s'écrivent à la main d'après ce document. Changement du 6 octobre : les types de lecture de
  B8 (`v_ventilation_sensible`, `v_precision_sensible`) vont dans `fiche.ts` (E2) ; ceux de
  `categorie_sensible` et de `p_lignes` de `saisir_chiffres_mois` vont dans `indicateurs.ts` (E1
  s'il n'est pas fusionné, sinon E3, seule exception à la propriété de ce fichier) ; aucun fichier
  nouveau, donc `base.ts` ne change pas.
- `src/features/fiche/emplacements.tsx` : blocs calendrier et réunion (E6), statistiques FIJ
  (`ChiffresParDepartement.tsx`, E4), puis comptages et graphiques (lot de lecture), chacun un
  fichier amorce qui ne rend rien.
- `src/features/accueil-ministere/types.ts` : `LigneVosSaisies` (`cle`, `libelle`, `etat`,
  `detail`, `action`), et les amorces `lignesChiffres.ts` (E3), `lignesSessions.ts` et
  `lignesFij.ts` (E4), `lignesReunion.ts` et `lignesEvenements.ts` (E6).
- `GrilleCetteSemaine.tsx` : deux emplacements, « Vos points » (E7) et « Événements à
  confirmer » (E6).
- `src/features/signalement/LienSignalement.tsx` : « Signaler une difficulté », lien vers
  `/signaler?ecran=<code>`, posé par chaque formulaire de saisie en bas, sous ses boutons.
- Aides (T38) : `src/components/aide/Aide.tsx`, `LibelleAvecAide.tsx`, `textesAide.ts`. Le
  bouton d'aide est un **bouton rond** de 20 px, seul élément rond de l'outil (T38, décidé le
  6 octobre 2026 ; forme dans la seule classe `.aide-forme` de `src/index.css`), cible de 44 px ;
  la bulle garde ses angles droits, aux tokens de `aides-contextuelles.md`. Les variables
  `--aide-disque` et `--aide-largeur` vivent dans `src/index.css` : `src/styles/tokens.css` ne
  reçoit aucun token nouveau.
- Briques de saisie (`src/features/saisie/`) : `ChampNombre` nomme ses boutons « Ajouter un :
  <libellé> » et « Retirer un : <libellé> » ; `MessageReussite` prend `envoi` (un compteur des
  envois réussis) pour afficher de nouveau le même message après une correction.

## 11. Points ouverts

- **Page Confidentialité** (lot I) : dire « EJP Tech lit votre signalement. », sans
  l'administration (le plan, lot I, citait encore l'administration).
- **Modèle de B8** (changement du 6 octobre, question 16 du plan) : accord écrit de la personne
  responsable le 6 octobre 2026 (T41, décidé). Les noms ci-dessus sont fixés pour que E2 et E3
  codent contre eux. Les listes de catégories viennent de la coordination, chacune par une petite
  migration.
- **Aides nouvelles** (changement du 6 octobre) : `mois.repartition` et `fiche.repartition`
  entrent dans `textesAide.ts` par W0 s'il n'est pas fusionné, sinon par un commit de documents et
  de textes sur `etape-4` avant la vague 4 ; `mois.sensible` change de texte
  (`docs/conception/aides-contextuelles.md`, section 6).

Décidés le 6 octobre 2026, retirés des points ouverts : le journal des signalements (lu par le
ministère auteur et EJP Tech seulement, section 1 ; B7 recrée la politique de `journal`) et la
forme du bouton d'aide (rond, section 10).
