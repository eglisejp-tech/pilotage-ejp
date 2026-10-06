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

Statut des noms : ceux que les documents de conception donnent sont repris tels quels ; ceux
qu'ils laissaient ouverts sont **fixés ici** (marqués « fixé par W0 ») pour que les lots codent en
parallèle. Aucun ne change une règle métier.

## 1. Codes du journal et de la modération

Posés une fois par `supabase/migrations/20261007090000_contrats_etape_4.sql`, vérifiés par
`supabase/tests/contrats-etape-4.test.sql`. **Aucun lot ne retouche ces contraintes.** Noms des
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

- `mesure_saisie` (B2) : `{"lignes": [{"indicateur_id", "date_ref", "valeur", "corrige"}]}`. La
  valeur n'est écrite que pour un chiffre commun ; `corrige` vaut `true` sur une ligne qui remplace
  une valeur déjà saisie pour la même période (fixé par W0 : le drapeau est porté par chaque ligne).
- `evenement_ajoute` (B6) : `{"date", "statut", "mentions": [uuid]}`, jamais le nom d'un ministère.
- `evenement_modifie` (B6) : `{"date", "statut", "date_precedente"}`.
- `texte_relu`, `texte_masque` : `cible` vaut la cible de la modération (donc aussi
  `demande_indicateur`, `validation`, `signalement`, `signalement_suivi`), et `ministere_id` le
  ministère de l'auteur du texte.

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
et par EJP Tech.

Absents, réservés au lot 2 des indicateurs (refusés par la contrainte) :
`indicateur_correction_demandee`, `indicateur_officiel`.

Une décision d'EJP Tech (`indicateur_valide`, `indicateur_refuse`, `signalement_clos`) est écrite
au nom de son compte : la fraîcheur du ministère ne bouge pas. `difficulte_signalee` est écrite au
nom du compte du ministère : B7 recrée `private.tableau_ministeres()` pour l'ignorer dans la
fraîcheur (un signalement n'est pas une saisie).

### Cibles du journal (`journal.cible`)

`session`, `evenement`, `reunion`, `point_attention`, `point_suivi`, `compte`, `ministere` (étapes 1
à 3), puis `indicateur`, `signalement`, et les cibles de modération `demande_indicateur`,
`validation`, `signalement_suivi`. Règle : **toute cible de la modération est une cible du
journal**, parce que `marquer_relu` et `masquer_texte` écrivent leur ligne (`texte_relu`,
`texte_masque`) avec la cible de la modération. `v_journal` (B3 pour `indicateur`, B7 pour
`signalement`) calcule `cible_texte` sous la RLS du lecteur.

### Cibles et couples de la modération

| Cible                | Champ masquable (couple)                  | Origine       | Lot qui étend `masquer_texte` et `marquer_relu` |
| -------------------- | ----------------------------------------- | ------------- | ----------------------------------------------- |
| `point_attention`    | `titre`, `description`, `action_attendue` | étapes 1 à 3  | aucun                                           |
| `point_suivi`        | `commentaire`                             | étapes 1 à 3  | aucun                                           |
| `evenement`          | `titre`                                   | étapes 1 à 3  | aucun                                           |
| `reunion`            | `objet`, `decision_attendue`              | étapes 1 à 3  | aucun                                           |
| `demande_indicateur` | `pourquoi`                                | étape 4       | B3                                              |
| `validation`         | `motif`                                   | étape 4       | B3                                              |
| `signalement`        | `texte`                                   | étape 4 (T39) | B7, après B3                                    |
| `signalement_suivi`  | `commentaire`                             | étape 4 (T39) | B7, après B3                                    |

Onze couples en tout. Le texte masqué reste « [texte masqué par EJP Tech] ». L'écran Modération
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

| Fichier                                 | Lot | Contenu                                                                                                                                                                                                 |
| --------------------------------------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/seed.sql`                     | B1  | définition de « Visuels livrés ce mois » ; reprise du ministère Coordination créé par la migration (comme FIJ)                                                                                          |
| `supabase/seed/40-indicateurs.sql`      | B4  | prévus des ministères d'exemple, sensibles compris (un sensible à 2 pour « moins de 3 ») ; une valeur par unité ; un ajout à valider, un validé, un refusé ; un retiré avec saisies ; mois et dimanches |
| `supabase/seed/41-fij-statistiques.sql` | B5  | deux semaines des 4 rubriques, une semaine incomplète (« 6 dép. sur 8 »)                                                                                                                                |
| `supabase/seed/42-evenements.sql`       | B6  | « Réunion des responsables » (Coordination, en attente, reporté, @Communication), décalage de semaines recalculé                                                                                        |
| `supabase/seed/43-signalements.sql`     | B7  | deux signalements de Communication, sans donnée personnelle : un ouvert sur `saisie_evenement`, un clos avec un commentaire d'EJP Tech                                                                  |

Règles pour chaque fichier de `seed/` :

- il se suffit à lui-même : il redéfinit les aides `pg_temp` dont il a besoin (`pg_temp.j`,
  `pg_temp.h` de `seed.sql`), sans compter sur la session d'un autre fichier ;
- il retrouve les ministères et les comptes par leurs identifiants fixes de `seed.sql`
  (`10000000-...` pour les ministères, `20000000-...` pour les comptes) ;
- ses dates suivent le décalage de semaines de `seed.sql` (le dimanche 27 sept. 2026 devient
  `private.dimanche_reference()`) ;
- adresses en `@exemple.test` seulement, aucun nom de personne ;
- les signalements ne passent pas par le journal (insertion directe sous
  `set_config('pilotage.migration', 'oui', true)`), pour ne pas changer la fraîcheur que vérifient
  les tests de l'étape 3.

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

| Colonne                 | Type                  | Règle                                                                        |
| ----------------------- | --------------------- | ---------------------------------------------------------------------------- |
| `definition`            | `text`                | 10 à 140 caractères, obligatoire (remplie pour les communs par la migration) |
| `unite`                 | `text`                | section 4, défaut `nombre`                                                   |
| `sensible`              | `boolean`             | défaut `false` ; `mois` et `nombre` seulement, jamais source d'un calcul     |
| `calcul`                | `text`                | section 4, null pour un indicateur saisi ; termes dans `indicateur_terme`    |
| `etat`                  | `text`                | section 4, défaut `actif` ; `check (actif = (etat = 'actif'))`               |
| `origine`               | `text`                | section 4 ; `commun` si et seulement si `ministere_id` est null              |
| `modele_code`           | `text`                | code de `private.indicateur_prevu`, sinon null                               |
| `remplace_id`           | `uuid`                | unique, référence `indicateur`                                               |
| `cree_le`, `cree_par`   | `timestamptz`, `uuid` | `cree_par` null pour Système (migration)                                     |
| `texte_le`, `texte_par` | `timestamptz`, `uuid` | dernière écriture des textes                                                 |
| `retire_le`             | `timestamptz`         | posé avec `etat = 'retire'`                                                  |
| `retrait_motif`         | `text`                | section 4, posé avec `retire_le`                                             |
| `sans_somme`            | `boolean`             | défaut `false` : pas de somme de l'année                                     |
| `saisi_dimanche_matin`  | `boolean`             | défaut `false` : le dimanche du jour se saisit dès le matin (heure de Paris) |
| `libelle_sessions`      | `boolean`             | défaut `false` (X3)                                                          |

`nature` accepte `mois`. `mesure.valeur` passe à 0 à 9 999 999, le plafond de l'unité étant
contrôlé par `controler_mesure`. Libellé unique par ministère sur `private.normaliser(libelle)`,
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
`definition text`, `nature text`, `unite text`, `sensible boolean`, `calcul text`, termes (codes
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

| Colonne                 | Type          | Sens                                                                                        |
| ----------------------- | ------------- | ------------------------------------------------------------------------------------------- |
| `indicateur_id`         | `uuid`        |                                                                                             |
| `ministere_id`          | `uuid`        | null pour un commun                                                                         |
| `libelle`, `definition` | `text`        | textes actuels                                                                              |
| `nature`, `unite`       | `text`        |                                                                                             |
| `sensible`              | `boolean`     |                                                                                             |
| `etat`, `origine`       | `text`        |                                                                                             |
| `calcul`                | `text`        | null pour un indicateur saisi                                                               |
| `derniere_periode`      | `date`        | null : pas encore de saisie                                                                 |
| `derniere_valeur`       | `integer`     |                                                                                             |
| `derniere_moins_de_3`   | `boolean`     |                                                                                             |
| `derniere_saisie_le`    | `timestamptz` |                                                                                             |
| `mois_en_cours_valeur`  | `integer`     | à part, jamais pour un sensible                                                             |
| `somme_annee`           | `bigint`      | null si `sans_somme`, « à ce jour », ajout à valider, ou rien de saisi                      |
| `somme_moins_de_3`      | `boolean`     | somme de l'année égale à 1 ou 2 d'un sensible (K5c)                                         |
| `somme_depuis`          | `date`        | départ de la somme (« Depuis juillet »)                                                     |
| `somme_nb_saisies`      | `integer`     | complétude : « 9 mois sur 9 »                                                               |
| `somme_nb_attendues`    | `integer`     |                                                                                             |
| `plus_de_30_jours`      | `boolean`     | « à ce jour » saisi il y a plus de 30 jours                                                 |
| `etat_valeur`           | `text`        | `saisi`, `non_saisi` (rien pour la dernière période attendue), `jamais_saisi` (fixé par W0) |
| `attente_jours`         | `integer`     | ajout à valider : jours depuis `cree_le`, heure de Paris ; sinon null                       |
| `retire_le`             | `timestamptz` | pour le bloc « Retirés »                                                                    |

Un refusé et un retiré pour confidentialité n'y figurent pas (Q11).

### `v_calcul` (B2)

| Colonne                   | Type      | Sens                                                                        |
| ------------------------- | --------- | --------------------------------------------------------------------------- |
| `indicateur_id`           | `uuid`    | le calcul                                                                   |
| `ministere_id`            | `uuid`    |                                                                             |
| `calcul`                  | `text`    | `taux` ou `moyenne` (V1)                                                    |
| `periode`                 | `date`    | dernière période finie                                                      |
| `haut`, `bas`             | `bigint`  | sommes de la période                                                        |
| `resultat`                | `numeric` | pour un taux, en pour cent (plafond 100 pour une part) ; null : non calculé |
| `annee_haut`, `annee_bas` | `bigint`  | Σ sur les périodes de l'année qui ont toutes les valeurs                    |
| `annee_resultat`          | `numeric` | jamais une moyenne de taux                                                  |
| `annee_nb_periodes`       | `integer` | complétude                                                                  |
| `annee_nb_attendues`      | `integer` |                                                                             |
| `non_calcule_raison`      | `text`    | `source_non_saisie` ou `bas_nul`, null si calculé (fixé par W0)             |
| `non_calcule_source_id`   | `uuid`    | la source qui manque (« demandes reçues de septembre non saisies »)         |

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

### `v_journal` (B3, B7)

Mêmes colonnes ; `cible_texte` gagne `indicateur` (libellé actuel, B3) et `signalement` (B7 : code
de l'écran, jamais le texte, fixé par W0).

## 7. Fonctions nouvelles

Chaque fonction de l'API : `private.<nom>` en `security definer`, `set search_path = ''`,
`perform private.exige_aal2();` en première instruction, et `public.<nom>` d'une ligne en
`security invoker` qui l'appelle ; GRANT `execute` à `authenticated` seulement. Un refus de droit
lève 42501 avec « Cet élément n'existe pas ou vous n'y avez pas accès. » ; une erreur de saisie
lève l'exception par défaut (P0001), affichée telle quelle. Aucun SQL dynamique.

| Fonction (`public`)                                                                                                                                                                                   | Rend                                                                                                    | Lot | Appelants                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --- | --------------------------------------------------------------------------- |
| `creer_indicateurs_prevus(p_ministere_id uuid, p_modele text)`                                                                                                                                        | `integer` (indicateurs créés)                                                                           | B3  | administration, EJP Tech                                                    |
| `creer_indicateur(p_ministere_id uuid, p_libelle text, p_definition text, p_nature text, p_unite text, p_sensible boolean, p_pas_sensible boolean, p_remplace_id uuid, p_pourquoi text default null)` | `uuid`                                                                                                  | B3  | administration, EJP Tech (ministère au lot 2)                               |
| `creer_calcul(p_libelle text, p_definition text, p_type text, p_haut_id uuid, p_bas_id uuid, p_remplace_id uuid)`                                                                                     | `uuid`                                                                                                  | B3  | administration, EJP Tech                                                    |
| `ajouter_suggestion(p_ministere_id uuid, p_code text, p_pourquoi text default null)`                                                                                                                  | `uuid`                                                                                                  | B3  | ministère sur sa fiche (« Pourquoi » obligatoire), administration, EJP Tech |
| `corriger_indicateur(p_indicateur_id uuid, p_libelle text, p_definition text)`                                                                                                                        | `text` (`corrige` ou `envoye`)                                                                          | B3  | administration, EJP Tech                                                    |
| `retirer_indicateur(p_indicateur_id uuid, p_motif text)`                                                                                                                                              | `integer` (calculs retirés avec lui)                                                                    | B3  | administration, EJP Tech                                                    |
| `valider_indicateur(p_demande_id uuid, p_decision text, p_motif text default null)`                                                                                                                   | `void`                                                                                                  | B3  | EJP Tech seul                                                               |
| `verifier_libelle(p_libelle text, p_nature text, p_ministere_id uuid)`                                                                                                                                | `table (famille text, message text, bloquant boolean)`                                                  | B3  | ministère sur sa fiche, administration, EJP Tech                            |
| `limites_indicateurs(p_ministere_id uuid)`                                                                                                                                                            | `table (ajouts integer, ajouts_max integer, lignes integer, lignes_max integer)` (3 et 30, fixé par W0) | B3  | ministère sur sa fiche, administration, EJP Tech                            |
| `saisir_fij_statistiques(p_dimanche date, p_valeurs jsonb)`                                                                                                                                           | `void`                                                                                                  | B5  | ministère `fij` seulement                                                   |
| `ajouter_evenement(p_titre text, p_date date, p_statut public.statut_evenement, p_mentions uuid[])`                                                                                                   | `uuid`                                                                                                  | B6  | ministère ; la version à trois arguments délègue avec `'{}'`                |
| `signaler_difficulte(p_ecran text, p_texte text)`                                                                                                                                                     | `uuid` (le signalement)                                                                                 | B7  | ministère actif seulement (le ministère vient de la session)                |
| `clore_signalement(p_signalement_id uuid, p_commentaire text default null)`                                                                                                                           | `void`                                                                                                  | B7  | EJP Tech seul                                                               |

`p_valeurs` de `saisir_fij_statistiques` (fixé par W0) : un tableau
`[{"rubrique": "culte_ejp", "departement": "75", "valeur": 12}, ...]`, 32 éléments au plus (4
rubriques sur 8 départements), sans doublon ; une seule ligne de journal par envoi.

Fonctions `private` sans partie publique : `private.normaliser(text) returns text` (immutable,
B1) ; `private.mois_courant() returns date` (1er du mois de `private.aujourdhui()`, B1) ;
`private.verifier_texte(p_texte text, p_pour_ministere boolean) returns table (famille text,
message text, bloquant boolean)` (B1, fixé par W0 ; B3 et B7 l'appellent) ;
`private.peut_configurer() returns boolean` (administration et EJP Tech, B3) ;
`private.communs_de_fiche()` (B4) ; `private.evenements_mentionnant_mon_ministere() returns setof
uuid` (B6) ; triggers `private.controler_indicateur()` (B1), `private.controler_evenement_etat()`
(B6), `private.controler_mesure()` réécrit (B1).

Messages repris tels quels par les formulaires : « La date ne peut pas être passée. » (ajout
d'événement, étape 3) ; « La nouvelle date doit être aujourd'hui ou plus tard. » et « Rien n'a
changé : ce statut et cette date sont déjà enregistrés. » (B6) ; « Ce signalement est déjà
clos. » (B7).

## 8. Matrice des droits

Celle de `docs/plan-etape-4.md`, section 4, avec la décision du 6 octobre 2026 sur les
signalements, qui remplace les lignes « à confirmer » :

| Objet                      | Ministère                                 | Berger, conseil                                      | Administration                                                                                        | EJP Tech                           | `aal1`, anonyme |
| -------------------------- | ----------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------- | --------------- |
| `signalement`              | L les siens ; A par `signaler_difficulte` | rien                                                 | rien                                                                                                  | L tous                             | rien            |
| `signalement_suivi`        | L celui de ses signalements               | rien                                                 | rien                                                                                                  | L tous ; A par `clore_signalement` | rien            |
| `signaler_difficulte`      | sa fiche seulement                        | refusé                                               | refusé                                                                                                | refusé                             | refusé          |
| `clore_signalement`        | refusé                                    | refusé                                               | refusé                                                                                                | oui                                | refusé          |
| `journal` (codes nouveaux) | lignes de sa fiche                        | toutes, sauf les lignes des signalements (section 1) | `mesure_saisie` et `indicateur_*`, sans valeur ; ni FIJ ni événements ; aucune ligne des signalements | toutes                             | rien            |

Les lignes des signalements du journal (`difficulte_signalee`, `signalement_clos`, et
`texte_relu` ou `texte_masque` de cible `signalement` ou `signalement_suivi`) ne se lisent que par
le ministère auteur et par EJP Tech (T39, décidé ; condition de la section 1, écrite par B7).

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
  types s'écrivent à la main d'après ce document.
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

Décidés le 6 octobre 2026, retirés des points ouverts : le journal des signalements (lu par le
ministère auteur et EJP Tech seulement, section 1 ; B7 recrée la politique de `journal`) et la
forme du bouton d'aide (rond, section 10).
