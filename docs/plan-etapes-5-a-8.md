# Plan des étapes 5 à 8 : ouvrir l'outil aux ministères le 7 octobre 2026

- **Date** : 7 octobre 2026, 10 h.
- **Statut** : **à approuver** par la personne responsable, en une seule fois, avec les réponses
  aux questions de la section 6.
- **Exception écrite** : la personne responsable a autorisé le 7 octobre 2026 la préparation des
  plans des étapes 5 à 8 en parallèle, par exception à la règle « une étape à la fois », pour
  ouvrir l'outil aux ministères ce soir. Toutes les autres règles de `CLAUDE.md` s'appliquent :
  ajout seulement, dates à l'heure de Paris, complétude, aucune donnée personnelle, cinq profils,
  RLS et `aal2`, aucun secret dans le dépôt, push vers `main` seulement avec l'accord écrit.
- **Sources** : `BRIEF.md` (sections 2, 3, 6 à 10, 12, 13 et documentation d'exploitation),
  `docs/decisions.md` (jusqu'à T44), `docs/plan-etape-4.md`,
  `docs/conception/configuration-indicateurs.md`, `docs/conception/validation-metier.md`,
  `docs/reference/maquettes/LISEZMOI.md`, le code de la branche `etape-4` (28 migrations, la
  dernière `20261009110000_signalements.sql` ; 5 Edge Functions de comptes ; écrans des étapes 3
  et 4).
- **Ce document remplace** les quatre plans d'étape préparés ce matin. Il garde l'essentiel de
  chacun et règle leurs recouvrements (mêmes fichiers, mêmes migrations, mêmes adresses).

## 1. Objectif : ouvrir aux ministères ce soir, et ce qui le conditionne

### L'objectif

Ce soir, chaque ministère qui a sa boîte mail partagée reçoit son invitation, active son compte
(mot de passe et code) et trouve sa fiche avec ses indicateurs. Il peut saisir dès dimanche
11 octobre. L'objectif métier qui compte vraiment est donc **le premier dimanche saisi le
11 octobre** : il laisse une marge jusqu'à samedi soir.

### Ce que « tout prêt ce soir » veut dire, honnêtement

Les quatre étapes représentent environ **75 h de travail d'agent** (section 3.5). Elles ne tiennent
pas toutes dans la journée, même en parallèle. Ce qui tient, c'est un **socle d'ouverture** qui
donne aux ministères tout ce dont ils ont besoin le premier dimanche, et le reste dans les jours
qui suivent, sans rien perdre : la base écrit le journal, la file de relecture et les demandes
dès le premier jour, les écrans qui les lisent arrivent ensuite.

**Le socle d'ouverture de ce soir :**

- l'étape 4 entière (saisies, fiches, accueil 07, calendrier, signalements, page Confidentialité) ;
- l'étape 5 entière (points d'attention, mentions, statuts, « Marquer traité », écran 05), si les
  limites d'usage des agents le permettent ; sinon sans l'écran 05 (section 7) ;
- de l'étape 6 : l'écran 13 « Ministères et comptes » (L1) et la création des indicateurs prévus
  par ministère (L3a) ;
- de l'étape 7 : le bandeau hors ligne et les erreurs réseau (F1), et la partie bloquante de
  l'audit d'accessibilité (F2 et F3 sur les écrans du ministère et de connexion) ;
- l'étape 8 entière (Netlify, contrôle du déploiement, `docs/exploitation.md`, production).

### Ce qui conditionne l'objectif

1. **L'étape 4 close vers 15 h** : E3, E6 et E8 fusionnés ce matin, E7 vers 13 h 30, puis le lot
   I (contrôle final, page Confidentialité).
2. **L'écran 13 et « Créer les indicateurs prévus » fusionnés vers 19 h** : sans eux, aucun compte
   de ministère ni aucun indicateur de fiche ne se crée en production. C'est le maillon le plus
   long.
3. **Le projet Supabase de production, le site Netlify, le SMTP Gmail** créés par la personne
   responsable dès ce matin (section 5).
4. **Vos accords écrits** : ce plan, la page Confidentialité, puis chaque push vers `main` (deux
   ce jour, section 2).
5. **La coordination** : l'adresse dédiée de l'administration (D4), les noms exacts des ministères
   et leurs boîtes partagées (K14), le modèle d'indicateurs de chacun, le texte de la page
   Confidentialité.
6. **L'administration de l'église disponible ce soir, vers 21 h 30** : elle seule crée les comptes
   (`creer-compte` exige `admin_eglise`).
7. **Les limites d'usage des agents** : jusqu'à sept agents tournent en même temps l'après-midi.

## 2. Calendrier de la journée et chemin critique

Heures indicatives. Chaque passage de CI raté coûte 30 à 45 min (pas de Docker sur ce poste :
pgTAP et e2e avec base ne tournent qu'en CI).

| Heure             | Agents                                                                                                                                                             | Personne responsable                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 10 h à 10 h 30    | E3, E6 et E8 finissent leurs corrections ; E7 démarre                                                                                                              | Lit ce plan, l'approuve, répond aux questions ; lance les actions A1 à A6 (section 5)                                                                        |
| 10 h 30 à 13 h    | **C0** (contrat commun des étapes 5 et 6) ; F1 (réseau) ; F2 (outils d'audit) ; D1, D2 et D3 (déploiement) ; E7 continue                                           | Transmet l'identifiant du projet de production (pour D1) ; règle l'Auth de la préproduction et de la production (B1) ; envoie les demandes à la coordination |
| 13 h à 13 h 30    | C0 fusionné dans `etape-ouverture` ; lancement de P1, P2, P3, L1 et L3a ; E7 fusionné dans `etape-4`                                                               | Relit la page Confidentialité (lot I)                                                                                                                        |
| 13 h 30 à 15 h    | P4 démarre (après E7 et C0) ; lot I termine l'étape 4 ; D1 fusionné dans `etape-4`                                                                                 | **Accord écrit : fusion de l'étape 4 et push vers `main` n° 1**                                                                                              |
| 15 h à 16 h 30    | P1, P2 et P3 finissent ; F3 corrige les fautes bloquantes des écrans de l'étape 4                                                                                  | Préproduction : `db push`, fonctions, secret ; recette de l'étape 4 ; puis production : `db push`, fonctions, secret (C1 à C3)                               |
| 16 h 30 à 18 h    | L3a finit (vers 17 h) ; P4 finit ; L1 continue                                                                                                                     | **Amorçage de l'administration** en production (D1) : elle active son compte sur la version de l'étape 4                                                     |
| 18 h à 19 h 30    | L1 finit ; intégration **IO** sur `etape-ouverture` : fusions, pgTAP des points, revues `rls-auditor` et `ui-reviewer`, audit F2 des écrans nouveaux, F3, CI verte | Disponible pour les retours de revue                                                                                                                         |
| 19 h 30           | **Point de décision** : L1 et L3a au vert ? Sinon, repli (section 7)                                                                                               | Décide                                                                                                                                                       |
| 19 h 30 à 20 h 15 | Corrections de recette                                                                                                                                             | Recette en préproduction sur l'aperçu `etape-ouverture` : créer un ministère, ses prévus, une saisie, un point marqué traité, le mode avion (C4)             |
| 20 h 15 à 21 h    | Lancement du script D2 contre la production                                                                                                                        | **Accord écrit : push vers `main` n° 2** ; build Netlify ; script D2 au vert                                                                                 |
| 21 h à 22 h 30    | Aucun                                                                                                                                                              | L'administration crée EJP Tech, le berger, le conseil, puis chaque ministère avec sa boîte et ses prévus (E1) ; invitations envoyées                         |
| 22 h 30           | Aucun                                                                                                                                                              | La coordination prévient les ministères                                                                                                                      |

### Chemin critique

Fin de l'étape 4 (E7 puis I) et C0 en parallèle, puis **L1 (5 h)**, puis l'intégration IO et la
CI (1,5 h), puis la recette et le push n° 2, puis la création des comptes. Tout le reste tourne à
côté et ne rallonge pas ce chemin :

- **Étapes 5 et 6 en parallèle** à partir de C0 : P1, P2, P3 et P4 (étape 5) à côté de L1 et L3a
  (étape 6). Aucun fichier commun après C0.
- **Étape 7 comme une passe** : F1 et les outils d'audit F2 dès 10 h 30 (aucun fichier commun avec
  les autres lots), puis F3 sur les écrans au fil de leurs fusions.
- **Étape 8 préparée maintenant** : D1, D2 et D3 dès 10 h 30. La production reçoit sa base dès
  15 h, avec l'étape 4 : le socle de ce soir n'ajoute aucune migration, donc le soir ne demande
  qu'un build Netlify.

### Les deux push vers `main`

- **N° 1, vers 15 h** : l'étape 4 close, plus `netlify.toml` (D1, fichier nouveau). Sans la
  redirection de D1, le lien d'invitation `/acces?token_hash=...` répondrait 404 et l'amorçage de
  l'administration de 16 h 30 échouerait.
- **N° 2, vers 20 h 15** : la branche `etape-ouverture` (étapes 5, 6 partielle, 7 partielle et 8).

## 3. Les étapes

### 3.0 Règles communes à toutes les étapes

**Branches.** Chaque lot a sa branche `etape-5-<lot>`, `etape-6-<lot>`, `etape-7-<lot>` ou
`etape-8-<lot>`, dans son propre worktree, avec un `PORT_E2E` distinct. Les lots du socle se
fusionnent dans `etape-ouverture`, partie de `etape-4` puis mise à jour à sa clôture. Chaque lot
pousse tôt : pgTAP et e2e ne tournent qu'en CI.

**C0, contrat commun des étapes 5 et 6 (2,5 h, un seul agent, 10 h 30 à 13 h).** Les plans des
étapes 5 (P0) et 6 (S0) touchaient les mêmes fichiers. Un seul lot les écrit, avant tous les
autres :

- `src/features/navigation/profils.ts` : `/saisir/point` pour le ministère ; onglet « Indicateurs »
  après « Sessions » (administration) et après « Modération » (EJP Tech) ; adresses
  `/indicateurs`, `/indicateurs/:id` et `/ma-fiche/indicateurs`. Le test qui vérifie aujourd'hui
  l'absence de `/saisir/point` change.
- `src/pages/pagesDesAdresses.ts` et les pages amorces : `PagePoints`, `PageSaisiePoint`,
  `PageJournal` (sert à `/journal` et `/journal-technique`), `PageComptes`, `PageSessions`,
  `PageModeration`, `PageIndicateurs`, `PageIndicateursMinistere`, `PageMesIndicateurs`.
- Amorces aux propriétés figées, qui ne rendent rien : `src/features/points-actions/ActionsPoint.tsx`
  et `BlocAValider`.
- **Deux emplacements dans la fiche 12**, chacun dans son fichier : le bouton « Nouveau point »
  (rempli par P4) et le lien « Gérer mes indicateurs » (rempli par L4). Ainsi P4 et L4 ne touchent
  jamais le même fichier de la fiche.
- `src/data/pointsEcriture.ts` (les trois appels RPC des points et leurs messages),
  `src/lib/metier/droitsPoint.ts` (`lienAuPoint`, `peutChangerStatut`, `peutMarquerTraite`), et
  `src/lib/base/{comptes,journal,moderation}.ts`, vides et branchés dans `base.ts`.
- `textesAide.ts` : toutes les aides des étapes 5 et 6, au statut « Proposé », **ajoutées à la fin
  du fichier seulement**. Le lot I de l'étape 4 reste le seul à modifier les aides existantes ;
  C0 se fusionne après I sans conflit.
- Tests Vitest de `routes`, `profils` et `droitsPoint`.

**Migrations.** Le socle de ce soir n'en ajoute aucune. Plages réservées :

- étape 5 : `20261010100000` à `20261010109999`, seulement si l'audit `rls-auditor` trouve un
  manque (nom réservé `20261010100000_points_etape_5.sql`) ;
- étape 6 : `20261010120000` à `20261010129999` (L6 :
  `20261010120000_moderation_file_precisions.sql`) ;
- étapes 7 et 8 : aucune.

**Règle après le premier `db push` en production.** Toute nouvelle migration doit être datée
**après la dernière appliquée en production**, sinon le push suivant échoue. Tant que la date
réelle n'a pas dépassé le 10 octobre, on utilise les plages ci-dessus ; une migration créée par
`npx supabase migration new` avant cette date est renommée dans la bonne plage. Cela vaut aussi
pour l'étape 4 bis.

**Propriété des fichiers après C0.** Un fichier n'a qu'un lot propriétaire à la fois :

- `src/features/cette-semaine/` : E7 jusqu'à sa fusion, puis P4 (`PointADecider.tsx`,
  `ADecider.tsx`) ;
- fiche : P4 (`CartePointFiche.tsx`, emplacement « Nouveau point ») ; L4 (emplacement « Gérer mes
  indicateurs ») ;
- `BlocSignalements.tsx` : E8 jusqu'à sa fusion, puis L6 ;
- `src/features/indicateurs/configuration/` : L3a, puis L3b après sa fusion ;
- `e2e/base/ejp-tech.spec.ts` : P4 ;
- `src/lib/requetes.ts` et `src/main.tsx` : F1 ;
- écrans fautifs de l'audit : F3, seulement après la fusion du lot qui les a construits.

**Ce que chaque lot livre lui-même** (règle de l'étape 7, comme à l'étape 4) : ses états vides,
ses aides, un contrôle axe et un contrôle à 360 px dans ses tests e2e, et des captures `@captures`
en 1440, 834 et 390 px pour chaque écran.

### 3.1 Étape 5 : points d'attention, mentions, statuts et « Marquer traité »

**Dans l'étape** : nouveau point `/saisir/point` (maquette 10) ; panneau « Changer le statut » et
fenêtre « Marquer traité » ; écran 05 `/points` (onglets Ouverts, Traités, Tous ; filtre
`ministere` dans l'adresse ; « Traités récemment ») ; « Mes points » du ministère (même écran) ;
boutons sur « À décider », sur les fiches 04 et 12 et sur « Vos points » (07).
**Hors de l'étape** : rouvrir un point, changer son titre, sa priorité, son échéance ou ses
mentions (BRIEF section 11), les notifications, l'écran Journal et la modération (étape 6).

**Ce qui existe.** La base est complète depuis l'étape 1 : tables `point_attention`,
`point_mention`, `point_suivi` ; fonctions `creer_point`, `changer_statut_point`, `marquer_traite`
(commentaire de 10 à 280 caractères pour un ministère, facultatif pour le berger et le conseil,
refus pour l'administration et EJP Tech, une ligne de journal sans texte) ; vue `v_point` ; tests
`rls-points-matrice`, `rls-points-fonctions`, `rls-points-journal`. Côté interface : le tri de
`src/lib/metier/points.ts`, `estDecideur`, `enLectureSeule`, `BlocPointsFiche` et
`CartePointFiche` en lecture seule, « À décider » sans bouton, `ChoixMentions`, `PanneauSaisie`,
`Compteur`, `RappelDonneesPersonnelles`, `LienSignalement`.

**Règle des boutons** : ils se montrent au créateur, à un ministère mentionné, ou par
`estDecideur` ; jamais à EJP Tech ni à l'administration. L'auteur d'un traitement se lit par
`compte.ministere_id`, puis le nom du ministère, sinon le libellé du compte (« Traité le 30 sept.
par Coordination »).

**Lots** (C0 en tient lieu de P0) :

- **P1. « Marquer traité » et « Changer le statut » (2,5 h, 13 h à 15 h 30).**
  `src/features/points-actions/*`. Plein écran sous 600 px, panneau de 460 px au-delà. Champ « Ce
  qui a été traité, et comment » pour un ministère, « Commentaire (facultatif) » pour le berger et
  le conseil. Bouton jamais grisé ; « Un point traité ne se rouvre pas. ». Statuts en vrais
  boutons radio. Messages « Point marqué traité. » et « Statut enregistré : En cours. ». Tests :
  Vitest ; `e2e/points.ecriture.spec.ts` (créé par P1) : un ministère mentionné voit le point et le
  marque traité avec un commentaire, un autre ministère ne le voit pas, le créateur lit « Traité
  le … par … ».
- **P2. Nouveau point (2 h, 13 h à 15 h).** `src/features/nouveau-point/*`, `PageSaisiePoint.tsx`.
  Titre (80), « Ce qui se passe » (280), « Ce qui est attendu » (80), priorité, échéance
  (aujourd'hui ou plus tard), mentions (ministères actifs autres que lui). Rappel sous le titre
  (question Q2) ; « Signaler une difficulté » sous les boutons. Message « Point créé. ». Tests :
  Vitest du schéma ; un parcours ajouté à `e2e/points.ecriture.spec.ts` à sa fusion (une seule
  ligne de journal par envoi).
- **P3. Écran 05 et « Mes points » (3 h, 13 h à 16 h).** `src/features/points/*`,
  `src/data/pointsListe.ts` (nouveau, sans toucher `points.ts`), `PagePoints.tsx`. Onglets avec
  leur nombre, filtre « Tous les ministères » (points créés par le ministère choisi ou qui le
  mentionnent), « dépassée » en rouge avec le mot, « @social (désactivé) ». États vides : « Aucun
  point ouvert. » et « Aucun point traité pour l'instant. ». Tests : Vitest du modèle ;
  `e2e/base/points.spec.ts` pour chaque profil (EJP Tech sans aucun bouton, le test échoue sinon ;
  l'administration reçoit la page non disponible, sans requête) ; aperçu `/apercu/points`.
- **P4. Pose des boutons (2 h, 13 h 30 à 15 h 30, après E7 et C0).** `PointADecider.tsx`,
  `ADecider.tsx`, `CartePointFiche.tsx`, `EmplacementVosPoints.tsx` reçoivent `ActionsPoint` ;
  bouton « Nouveau point » dans son emplacement de la fiche 12, si E7 ne l'a pas déjà mis sur
  l'accueil. Après une écriture, les requêtes des points, de la fiche et de « Cette semaine » sont
  relues. Tests : Vitest ; reprise de `e2e/base/ejp-tech.spec.ts` (aucun « Marquer traité » ni
  « Changer le statut »).
- **I5, dans l'intégration IO (1,5 h).** pgTAP des seuls cas manquants, dans le fichier nouveau
  `rls-points-etape-5.test.sql` (5 profils, `aal1` et anonyme) : ministère mentionné désactivé,
  commentaire de 9 caractères refusé, point traité figé. Revues `rls-auditor` et `ui-reviewer`.

**Effort** : 11,5 h d'agent (plus 1,5 h dans C0), environ 3 h de calendrier en parallèle.

### 3.2 Étape 6 : journal, administration, modération, indicateurs

**Dans l'étape** : 06 Journal (`/journal` pour le ministère, le berger, le conseil et
l'administration ; `/journal-technique` pour EJP Tech) ; 13 Ministères et comptes ; 14 Sessions ;
15 Modération (file, « Rien à signaler », « Masquer le texte », y compris d'un signalement) ;
`/indicateurs` et `/indicateurs/:id` (tableau, « Créer », panneaux ajouter, calcul, corriger,
remplacer, retirer, retirer pour confidentialité, bloc « À valider ») ; `/ma-fiche/indicateurs`
(suggestions et « Pourquoi ») et le lien « Gérer mes indicateurs » sur 12.
**Hors de l'étape** : le lot 2 (comptes écrits par les ministères, correction du nom, « Rendre
officiel », limite sur 30 jours), « Vérifiez ce chiffre », le changement d'adresse d'un compte.

**Ce qui existe.** Dans la base, avec leurs tests : `v_journal` (filtres T39, P51, B8) ;
`v_etat_comptes` et les 5 Edge Functions de comptes ; `declarer_session`, `modifier_session`,
`supprimer_session`, `v_session_completude` ; `marquer_relu` et `masquer_texte` (signalement,
précision, « Pourquoi », motif) ; toutes les fonctions et vues des indicateurs, lues par
`src/data/indicateurs.ts`. Dans le front : `BlocSignalements` et les adresses `/journal`,
`/comptes`, `/sessions`, `/journal-technique` en page « à venir ».
**Ce qui manque** : tous les écrans ; le client des Edge Functions (aucun `functions.invoke` dans
`src/`) ; l'onglet et les adresses des indicateurs (C0).
**Écart trouvé** : `private.textes_a_relire` date de l'étape 1 et ignore la précision des
sensibles, que le BRIEF (section 9) met dans la file : migration de L6.

**Lots** (C0 en tient lieu de S0) :

- **L1. Comptes 13 (5 h, socle, 13 h à 18 h, chemin critique).** `src/features/comptes/`,
  `src/data/comptes.ts` (`v_etat_comptes`, nombre d'indicateurs par `v_usage_indicateurs`, appel
  des 5 fonctions, codes 400 à 500 traduits en français), `PageComptes.tsx`. Panneaux : ajouter
  un ministère ; compte d'un ministère existant sans compte (FIJ, Coordination) ; berger (s'il n'y
  en a pas d'actif) ; conseil ; EJP Tech. Trois confirmations ; des blocs sur téléphone ; états
  vides proposés (T36), notés dans `LISEZMOI.md`. Aucune migration. Tests : pgTAP
  `rls-comptes-matrice.test.sql` (7 comptes et l'anonyme, `aal1` et `aal2`) ; Vitest des états,
  des actions, des erreurs et des schémas de `_shared/schemas.ts` ; e2e
  `comptes.ecriture.spec.ts` : l'administration crée un ministère, lit l'invitation dans la boîte
  locale, relance, désactive, réactive, refait l'activation ; les 4 autres profils reçoivent la
  page non disponible, sans requête.
- **L3a. Indicateurs, configuration en lecture et « Créer les prévus » (4 h, socle, 13 h à
  17 h).** `src/features/indicateurs/configuration/`, `PageIndicateurs.tsx`,
  `PageIndicateursMinistere.tsx`. Phrase et tableau (7.1) ; bloc « Prévus par la coordination »
  (7.2 : « Créer ces N indicateurs », choix du modèle, « Aucun prévu ») ; lignes par rythme, en
  lecture, avec l'usage. État vide : « Aucun indicateur pour Protocole. Il saisit les chiffres
  communs. ». Aucune migration ; les tests pgTAP existants suffisent. Tests : Vitest des phrases ;
  e2e : l'administration et EJP Tech créent les prévus de Kumi ; le ministère et le berger
  reçoivent la page non disponible.
- **L2. Sessions 14 (4 h, J+1 matin).** `src/features/sessions/`, `src/data/sessionsAdmin.ts`,
  `PageSessions.tsx`. 3 types, nom du rassemblement, attendus cochés par défaut, « Modifier »,
  « Supprimer » (session sans saisie) ; sous 1024 px, un bouton ouvre la page entière. État vide :
  « Aucune session déclarée. Déclarez la première avec le panneau. ». Tests : pgTAP
  `rls-sessions-matrice.test.sql` ; Vitest « Manquent : A, B et C » et du schéma ; e2e :
  l'administration déclare, modifie et supprime une session, le ministère attendu la voit dans
  « Choisir la session ».
- **L3b. Panneaux des indicateurs (9 h, J+1 à J+2, après L3a).** Les 6 panneaux et fenêtres
  (ajouter, calcul, corriger, remplacer, retirer, retirer pour confidentialité) et « Voir la
  fiche » pour EJP Tech. Tests : Vitest de l'aperçu d'un calcul et des plafonds ; e2e : ajouter un
  calcul, retirer un indicateur, en retirer un pour confidentialité.
- **L4. « À valider » et « Mes indicateurs » (9 h, J+1 à J+2).** `src/features/indicateurs/validation/`
  (remplit `BlocAValider`), `src/features/mes-indicateurs/`, `PageMesIndicateurs.tsx`, et
  l'emplacement « Gérer mes indicateurs » de la fiche. États vides : « Rien à valider... », « Votre
  ministère n'a pas encore d'indicateur à lui... », « Toutes les suggestions sont déjà sur votre
  fiche. ». Tests : Vitest (« Pourquoi » de 10 à 280 caractères, message selon le rythme, « en
  retard » au-delà de 7 jours) ; e2e : Communication envoie 3 suggestions et lit le refus d'une
  quatrième ; le berger les voit « à valider », sans le « Pourquoi » ; EJP Tech en valide une et
  en refuse une avec un motif ; l'administration lit le bloc sans bouton ni « Pourquoi ».
- **L5. Journal (5 h, J+1 à J+2).** `src/features/journal/`, `src/data/journal.ts`,
  `PageJournal.tsx`. Filtres dans l'adresse ; 30 jours par défaut ; 50 lignes puis « Afficher 50
  lignes de plus » ; libellés des actions (BRIEF section 6) ; texte actuel de l'objet, en
  `--encre-3` s'il est masqué. État vide : « Aucune ligne pour ces filtres. » et « Retirer les
  filtres ». Tests : Vitest des libellés et des périodes à l'heure de Paris ; e2e : le berger
  filtre et charge 50 lignes de plus ; le ministère n'a pas de filtre Compte ; l'administration ne
  voit ni signalement ni précision ; EJP Tech voit tout sous « Journal technique ».
- **L6. Modération (6 h, J+1 à J+2).** Migration `20261010120000_moderation_file_precisions.sql` :
  `private.textes_a_relire` recréée avec la même signature, plus la précision avec son libellé et
  son mois, jamais la valeur. `src/features/moderation/`, `src/data/moderation.ts`,
  `PageModeration.tsx`, « Masquer le texte » dans `BlocSignalements.tsx`. En tête : « N indicateurs
  attendent votre validation » et son lien. État vide : « Aucun texte à relire. ». Tests : pgTAP
  `moderation-file.test.sql` (seul EJP Tech en `aal2` lit la file ; aucune valeur n'y figure) ;
  e2e : EJP Tech relit un texte, masque un point puis un signalement, le texte masqué apparaît sur
  la fiche ; les autres profils reçoivent la page non disponible.
- **Intégration (3 h)** : revues `rls-auditor` (L1, L2, L6) et `ui-reviewer`, captures. Pour le
  socle, elle se fait dans IO ; pour le reste, à J+2.

**Effort** : 45 h d'agent (plus 1 h dans C0). Ce soir : L1 et L3a, 9 h d'agent, 5 h de calendrier.

### 3.3 Étape 7 : finitions (réseau, accessibilité, états vides)

**Dans l'étape** : bandeau hors ligne (T25), erreurs réseau et délai de 10 s ; audit axe WCAG 2.1
AA ; clavier (focus visible, Échap, piège du focus des panneaux) ; 360 px sans défilement
horizontal ; zoom à 200 % ; contrôle des états vides de `LISEZMOI.md`, section « États ».
**Hors de l'étape** : aucune migration, aucune table, aucune règle métier, aucun écran nouveau ;
thème sombre et notifications (section 11). Les états vides des écrans 05, 06, 13, 14, 15 et
Indicateurs se construisent dans leurs lots ; l'étape 7 les vérifie.

**Ce qui existe** : `fetchAvecDelai` (10 s) dans `src/lib/supabase.ts` ; `ErreurDePage.tsx` avec
« Réessayer » ; `ErreurFormulaire.tsx` qui garde les valeurs ; « Chargement » après 300 ms ;
session expirée et compte désactivé ; « Aller au contenu », `lang="fr"`, `prefers-reduced-motion`,
`usePiegeFocus` ; axe et 360 px dans 9 fichiers e2e de l'étape 4.

**Défaut trouvé en lisant le code** : `src/lib/requetes.ts` laisse TanStack Query en mode réseau
`online`. Hors ligne, une requête reste en pause au lieu d'échouer, `fetchAvecDelai` ne s'exécute
jamais, et « Chargement » ne finit pas sur `/ministeres`, le choix et la saisie d'une session et
la carte FIJ. Seul `useEtatSession` passe déjà `networkMode: 'always'`. Un ministère sans réseau
le dimanche serait bloqué : F1 est donc dans le socle.

**Lots :**

- **F1. Réseau (2,5 h, socle, 10 h 30 à 13 h).** `src/lib/requetes.ts` (`networkMode: 'always'`
  pour les requêtes et les écritures) ; nouveaux `src/components/etats/useEnLigne.ts` et
  `BandeauHorsLigne.tsx` (`role="status"`, fond `--alerte-fond`, texte « Pas de connexion
  internet. Les chiffres affichés peuvent dater. », au-dessus du routeur dans `src/main.tsx`, donc
  sur toute page, connexion comprise). Le bouton d'envoi n'est jamais grisé hors ligne. Tests :
  Vitest des deux fichiers ; `e2e/reseau.spec.ts` sur les aperçus : le bandeau paraît puis
  disparaît, une lecture interrompue affiche « La connexion a échoué. Réessayez. », un envoi en
  échec garde les valeurs et réactive le bouton, une route sans réponse donne l'erreur de page
  après 10 s.
- **F2. Audit transversal (3 h, outils dès 10 h 30, passe complète dans IO).** Nouveaux
  `e2e/outils/axe.ts` (étiquettes wcag2a, wcag2aa, wcag21a, wcag21aa) ; `e2e/accessibilite.spec.ts`
  (tous les aperçus : aucune faute axe, aucun défilement à 360 px, cibles de 44 px, Tab jusqu'à
  l'action principale, Échap ferme chaque panneau, anneau de focus visible) ;
  `e2e/base/accessibilite.spec.ts` en CI, pour le ministère, le ministère FIJ, le berger, le
  conseil, l'administration et EJP Tech, avec l'essai hors ligne et une erreur de page ;
  `docs/conception/audit-etape-7.md` (fautes, écran, lot propriétaire). Ne modifie aucun écran.
- **F3. Corrections (2 à 4 h, au fil des fusions).** Seulement les fichiers des écrans fautifs,
  un commit par écran, après la fusion du lot qui les a construits. Le test qui échouait reste
  dans la suite. Ce soir : les fautes bloquantes ; la passe complète `ui-reviewer` à J+7.

**Bloquant avant l'ouverture** : F1 complet ; aucune faute axe critique ou grave et aucun
défilement à 360 px sur la connexion et la double authentification (16 à 18), sur les écrans du
ministère (07, 08, chiffres du mois, 09, 10, 11, 12, « Signaler une difficulté », « Marquer
traité ») et sur « Cette semaine » (01 à 03).
**pgTAP** : aucun objet nouveau ; `structure.test.sql` reste vert.
**Effort** : 7,5 à 9,5 h d'agent, plus 2 ou 3 passages de CI.

### 3.4 Étape 8 : déploiement et `docs/exploitation.md`

**Dans l'étape** : site Netlify (build, redirection de l'application à page unique, en-têtes de
sécurité) ; projet Supabase de production et réglages Auth des deux projets ; migrations, Edge
Functions et secret `URL_APPLICATION` ; amorçage de l'administration ; liste de mise en service ;
`docs/exploitation.md` ; script de contrôle en lecture seule.
**Hors de l'étape** : le domaine de l'église (plus tard) ; les rappels par email (P31) ; l'étape 4
bis. **Interdits** : toute commande `link`, `db push`, `functions deploy`, `secrets`, `--linked` ou
`--db-url` lancée par Claude ; `supabase config push` (il pousserait les adresses locales), y
compris pour la personne responsable ; `db push --include-seed`.

**Ce qui existe** : 28 migrations, aucune extension à activer ; les 5 Edge Functions
(`verify_jwt = false` dans `config.toml`), qui lisent `SUPABASE_SECRET_KEYS` (fourni par
Supabase) et `URL_APPLICATION` ; les modèles `invitation.html` et `recuperation.html`
(`{{ .SiteURL }}/acces?token_hash=...`) ; `src/lib/supabase.ts`, qui refuse toute clé secrète ;
`.nvmrc` à 24 ; les pages `/confidentialite` et `/conditions` ; la préproduction
`ugbitornbspatpcowlvg` (Paris, offre gratuite), **encore vide** (aucune migration appliquée).

**Lots** (aucun fichier commun, aucune migration, aucun écran) :

- **D1. Hébergement (1,5 h, 10 h 30 à 12 h).** `netlify.toml`, `.env.example`,
  `src/test/netlify.test.ts`. Build `npm run build`, publication `dist`, `NODE_VERSION = "24"` ;
  redirection `/*` vers `/index.html` en 200 ; CSP `default-src 'self'; script-src 'self';
style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'
https://ugbitornbspatpcowlvg.supabase.co https://<ref-prod>.supabase.co; frame-ancestors 'none';
base-uri 'self'; form-action 'self'; object-src 'none'` (`data:` pour le QR code TOTP,
  `'unsafe-inline'` limité aux styles) ; HSTS, `nosniff`, `Referrer-Policy: no-referrer` (le jeton
  de `/acces` est dans l'adresse), `Permissions-Policy`, `X-Robots-Tag: noindex` ; cache immuable
  sur `/assets/*`. Vitest : redirection présente, CSP sans `unsafe-eval` ni `*`, `connect-src`
  limité aux 2 projets. **Fusionné dans `etape-4` avant le push n° 1** (section 2).
- **D2. Contrôles (2 h, 10 h 30 à 12 h 30).** `scripts/verifier-deploiement.mjs` et
  `src/test/verifierDeploiement.test.ts` (`fetch` simulé). Arguments : URL du site, URL Supabase,
  clé publique, jamais de secret. Vérifie : en-têtes du site ; `/ma-fiche` répond 200 ;
  `GET /auth/v1/settings` donne `disable_signup: true`, `external.email: true`, et `google` selon
  le choix fait ; pour chacune des 5 fonctions, `OPTIONS` répond 204 et `POST` sans jeton 401
  `non_authentifie` ; aucun `sb_secret_` ni `service_role` dans `dist/`.
- **D3. Exploitation (3 h, 10 h 30 à 13 h 30).** `docs/exploitation.md` : toutes les rubriques
  du BRIEF (rôles, environnements, coffre, liste de contrôle Auth, déploiement depuis le clone
  réservé, sauvegardes, surveillance, procédures de la section 8, modération hebdomadaire,
  incidents, dépendances, coûts, Confidentialité, fin de vie, registre des opérations) ; le pas à
  pas de la section 5 avec un contrôle après chaque geste ; l'amorçage en SQL, dont l'adresse se
  tape seulement dans l'éditeur SQL, jamais dans le dépôt.

**Tests** : aucun pgTAP nouveau, la suite complète passe sur la branche finale (jobs `qualite`,
`base`, `e2e`, `fonctions`) ; recette manuelle par profil en préproduction, console sans erreur de
CSP.
**Effort** : 7,5 h d'agent (3 h de calendrier) ; environ 4 h de gestes de la personne responsable.

### 3.5 Effort total et intégration IO

| Étape     | Effort d'agent   | Dont socle de ce soir                       |
| --------- | ---------------- | ------------------------------------------- |
| C0        | 2,5 h            | 2,5 h                                       |
| 5         | 11,5 h           | 11,5 h (P3 peut glisser)                    |
| 6         | 45 h             | 9 h (L1, L3a)                               |
| 7         | 7,5 à 9,5 h      | 5 à 6 h (F1, outils F2, F3 bloquant)        |
| 8         | 7,5 h            | 7,5 h                                       |
| IO        | 3 h              | 3 h                                         |
| **Total** | **environ 78 h** | **environ 39 h, soit 8 h 30 de calendrier** |

**IO, intégration de l'ouverture (18 h à 19 h 30)** sur `etape-ouverture` : fusion de
`etape-4` close, C0, P1 à P4, L1, L3a, F1, F2, F3, D2, D3 ; I5 ; revues `rls-auditor` (points,
comptes) et `ui-reviewer` (écrans nouveaux) ; `/verifier` ; CI `qualite`, `base`, `e2e` et
`fonctions` au vert.

## 4. Ce qui est reporté après l'ouverture

Rien de ce qui suit ne fait perdre une donnée : la base écrit le journal, la file de relecture et
les demandes dès le premier jour.

- **L2 Sessions 14, J+1 (jeudi 8 oct.)** : sans écran, aucune session ne se déclare en production.
  Une saisie de session peut se faire après la session ; L2 est prêt avant samedi 10 octobre.
  Si une session a lieu avant, L2 passe ce soir (question Q14).
- **L5 Journal, J+1 à J+2** : la base écrit le journal depuis le premier envoi ; l'écran ne fait
  que le lire.
- **L6 Modération, J+1 à J+2** : les textes saisis entrent dans la file et y restent jusqu'à leur
  relecture. La modération est hebdomadaire (BRIEF, exploitation) : un écran livré sous 48 h tient
  dans ce rythme.
- **L4 « À valider » et « Mes indicateurs », J+1 à J+2** : la section 13 les veut avant la mise
  en service ; le repli prévu par la conception (section 9) s'applique : en attendant, un ministère
  demande un indicateur à l'administration.
- **L3b panneaux des indicateurs, J+2** : ce soir, chaque ministère reçoit ses prévus ; corriger,
  remplacer ou retirer un indicateur peut attendre quelques jours.
- **Étape 7, J+1 à J+7** : fautes axe moyennes et mineures ; zoom à 200 % et paysage ; audit des
  écrans de l'administration et d'EJP Tech (13, 14, 15, journaux, Indicateurs) ; passe complète
  `ui-reviewer` ; essai WebKit à 390 px.
- **Étape 4 bis, dans les 4 semaines** : comme prévu, après la dernière migration passée en
  production.
- **Google, dès que l'écran de consentement est publié** : mot de passe et code suffisent pour
  ouvrir ; un compte se rattache à Google ensuite de lui-même.

## 5. Actions de la personne responsable, dans l'ordre

Les libellés du tableau de bord sont ceux du 7 octobre 2026 ; ils peuvent bouger. Chaque geste a
son contrôle ; chacun s'écrit dans le registre des opérations (`docs/exploitation.md`). Tous les
comptes, organisations et moyens de paiement sont au nom de l'église, jamais d'une personne.
**Aucun secret ne se colle dans la conversation avec Claude ni dans le dépôt** : seulement dans
le tableau de bord concerné et dans le coffre de l'église.

### A. Maintenant (10 h à 11 h)

- **A1. Projet Supabase de production.** supabase.com/dashboard, sélecteur d'organisation, « New
  organization » : nom « EJP production », offre **Pro**, moyen de paiement de l'église. Puis « New
  project » : nom `pilotage-ejp-production`, mot de passe de la base généré et rangé dans le
  coffre, région **West EU (Paris)**. La préproduction reste dans l'organisation gratuite « EJP
  TECH » (l'offre se paie par organisation). Contrôle : le projet est « Healthy » ; Project
  Settings, API Keys montre une clé `sb_publishable_` et une clé `sb_secret_`. **Transmettez
  l'identifiant du projet** (la partie avant `.supabase.co`, il n'est pas secret) : D1 en a besoin
  pour la CSP.
- **A2. Site Netlify.** app.netlify.com, compte de l'église, double authentification active (User
  settings, Security). « Add new project », « Import an existing project », GitHub, dépôt
  `eglisejp-tech/pilotage-ejp`, branche `main`, commande `npm run build`, dossier `dist`, nom du
  site `pilotage-ejp`. Puis Project configuration, Environment variables, « Add a variable »,
  « Different value for each deploy context » :
  - `VITE_SUPABASE_URL` : Production `https://<ref-prod>.supabase.co` ; Deploy Previews et Branch
    deploys `https://ugbitornbspatpcowlvg.supabase.co` ;
  - `VITE_SUPABASE_PUBLISHABLE_KEY` : la clé `sb_publishable_` de chaque projet. **Jamais une clé
    `sb_secret_`.**
  - Build & deploy, Continuous deployment, Branches and deploy contexts : Branch deploys, « Let me
    add individual branches » : `etape-4` et `etape-ouverture`.
  - Contrôle : l'adresse `https://pilotage-ejp.netlify.app` répond (version de `main`, sans
    compte : rien de visible).
- **A3. Mot de passe d'application Gmail (T40).** Avec le compte Gmail d'EJP Tech :
  myaccount.google.com, Sécurité, « Validation en deux étapes » activée, puis
  myaccount.google.com/apppasswords : nom « Pilotage EJP préproduction », Créer ; recommencer avec
  « Pilotage EJP production ». Les deux mots de passe de 16 lettres vont au coffre (deux mots de
  passe : on peut en révoquer un seul).
- **A4. Google OAuth (peut suivre l'ouverture, question Q17).** console.cloud.google.com, projet
  « Pilotage EJP production » au nom de l'église. Google Auth Platform : Branding (nom « Pilotage
  EJP », adresse d'assistance de l'église, sans logo pour éviter une vérification, liens
  `https://pilotage-ejp.netlify.app/confidentialite` et `/conditions`) ; Data access (portées
  `openid`, `userinfo.email`, `userinfo.profile`, rien d'autre) ; Clients, « Create client »,
  Application Web, origine `https://pilotage-ejp.netlify.app`, URI de redirection
  `https://<ref-prod>.supabase.co/auth/v1/callback` ; Audience, « Publish app » (statut « En
  production »). Pour la préproduction, dans le projet de développement :
  `https://ugbitornbspatpcowlvg.supabase.co/auth/v1/callback`. L'identifiant et le secret vont dans
  Supabase, Authentication, Sign In / Providers, Google, et au coffre.
- **A5. Demande à la coordination (message à envoyer maintenant)**, réponse attendue avant 18 h :
  - l'adresse dédiée de l'administration de l'église (D4) et sa disponibilité ce soir vers
    21 h 30 ;
  - la liste exacte des ministères (K14c) avec, pour chacun, sa boîte mail partagée (K14b) et son
    modèle d'indicateurs ;
  - pour les ministères sans boîte : une date de création, au plus tard samedi 10 octobre ;
  - l'accord sur le texte de la page Confidentialité (lot I) ;
  - les listes de catégories des indicateurs sensibles (P47), si elles sont prêtes.
- **A6. Poste réservé pour la CLI** : un PC personnel d'EJP Tech, où Claude Code ne tourne jamais,
  avec Node 24 et Git. Préparez le clone :

  ```bash
  git clone https://github.com/eglisejp-tech/pilotage-ejp.git pilotage-ejp-deploiement
  cd pilotage-ejp-deploiement
  npx supabase --version
  npx supabase login
  ```

### B. Fin de matinée (11 h à 13 h) : réglages Auth, sans attendre les migrations

- **B1. Pour chaque projet** (préproduction, puis production), dans le tableau de bord Supabase :
  - Authentication, Sign In / Providers : « Allow new users to sign up » désactivé ; fournisseur
    Email actif (T16) ; « Email OTP Expiration » à 86400 ; longueur minimale du mot de passe 12 ;
    en production, protection contre les mots de passe divulgués ;
  - Authentication, Multi-Factor : TOTP activé ;
  - Authentication, URL Configuration : production, Site URL `https://pilotage-ejp.netlify.app`,
    Redirect URLs `https://pilotage-ejp.netlify.app/acces` et
    `https://pilotage-ejp.netlify.app/connexion` ; préproduction, Site URL
    `https://etape-ouverture--pilotage-ejp.netlify.app`, Redirect URLs
    `https://*--pilotage-ejp.netlify.app/**` et `http://localhost:5173/**` ;
  - Authentication, Emails, SMTP Settings : activé, hôte `smtp.gmail.com`, port 587, identifiant
    et expéditeur l'adresse Gmail d'EJP Tech, nom « Pilotage EJP », mot de passe d'application de
    cet environnement ;
  - Authentication, Rate Limits : envois d'emails portés à **100 par heure** (ce soir, une
    trentaine d'invitations partent en une heure) ;
  - Authentication, Emails, Templates : « Invite user », sujet « Votre accès à Pilotage EJP »,
    contenu de `supabase/templates/invitation.html` ; « Reset password », sujet « Nouveau mot de
    passe pour Pilotage EJP », contenu de `supabase/templates/recuperation.html` ;
  - en production, Authentication, Sessions : inactivité 14 jours, durée maximale 30 jours (P11).
  - Contrôle : un email « Mot de passe oublié » envoyé à une adresse de test arrive (après C3).

### C. Après-midi (15 h à 16 h 30) : étape 4 en préproduction puis en production

- **C1. Accord écrit** pour la fusion de l'étape 4 (avec D1) et pour le push n° 1 vers `main`.
- **C2. Préproduction**, depuis le clone réservé :

  ```bash
  git switch main && git pull
  npx supabase link --project-ref ugbitornbspatpcowlvg
  npx supabase db push --dry-run
  npx supabase db push
  npx supabase migration list
  npx supabase functions deploy --project-ref ugbitornbspatpcowlvg --use-api
  npx supabase secrets set URL_APPLICATION=https://etape-ouverture--pilotage-ejp.netlify.app --project-ref ugbitornbspatpcowlvg
  npx supabase functions list --project-ref ugbitornbspatpcowlvg
  ```

  Contrôles : le `--dry-run` liste 28 migrations ; `migration list` montre les mêmes colonnes
  locale et distante ; dans l'éditeur SQL, `select code from public.ministere;` rend `fij` et
  `coordination` seulement ; Advisors, Security : 0 erreur ; 5 fonctions « ACTIVE ». Puis la
  recette de l'étape 4 (15 min) sur l'aperçu, avec un compte créé par l'amorçage de préproduction.

- **C3. Production** : les mêmes commandes avec `--project-ref <ref-prod>` et
  `URL_APPLICATION=https://pilotage-ejp.netlify.app`, puis
  `node scripts/verifier-deploiement.mjs` (D2) sur la production. Le soir n'ajoute aucune
  migration : la base de production est alors prête.

### D. Fin d'après-midi (16 h 30 à 17 h) : amorçage de l'administration en production

- Authentication, Users, « Invite user » : l'adresse dédiée (D4).
- SQL Editor, dans une seule exécution (l'adresse se tape ici seulement, jamais dans le dépôt) :

  ```sql
  begin;
  insert into public.compte (user_id, type, libelle)
  select id, 'admin_eglise', 'Administration de l''église' from auth.users where email = '<adresse>';
  insert into public.journal (compte, action, cible, cible_id, detail)
  select null, 'compte_cree', 'compte', id, '{"type":"admin_eglise"}'::jsonb
  from auth.users where email = '<adresse>';
  commit;
  ```

  Ces colonnes sont celles de la table `journal` (migration `20260930163150`) et de la ligne
  écrite par `creer-compte` ; `compte` nul veut dire « Système ». D3 reprend ce bloc dans
  `docs/exploitation.md`. Le même amorçage se fait d'abord en préproduction (C2), avec une adresse
  de test.

- L'administration ouvre l'invitation, choisit son mot de passe, active son code. Contrôle : elle
  arrive sur son accueil ; le journal a 1 ligne.

### E. Soir (19 h 30 à 22 h 30)

- **E1. Recette en préproduction (45 min)** sur `https://etape-ouverture--pilotage-ejp.netlify.app`,
  sur votre téléphone : connexion et code ; l'administration crée un ministère de test avec une
  boîte de test et ses prévus ; le ministère active son compte, saisit un dimanche, crée un point ;
  un autre compte le marque traité ; mode avion : le bandeau s'affiche et un envoi en échec garde
  les chiffres. Console sans erreur de CSP.
- **E2. Accord écrit pour le push n° 2 vers `main`.** Contrôle : build Netlify vert ; script D2 au
  vert sur la production.
- **E3. L'administration crée les comptes** à l'écran 13, dans cet ordre : EJP Tech, le berger,
  le conseil, puis chaque ministère qui a sa boîte, avec son modèle (« Créer ces N indicateurs »)
  **avant** que le ministère ouvre son invitation. Contrôle : chaque fiche montre ses indicateurs ;
  les invitations sont arrivées.
- **E4. La coordination prévient les ministères** (vers 22 h 30) : vérifier la boîte partagée,
  ouvrir l'invitation dans les 24 h, activer le code, saisir dimanche.

## 6. Questions, chacune avec sa recommandation

**Ouverture et organisation**

- **Q1. Ouvrir ce soir avec le socle seulement (section 1), le reste dans la semaine ?**
  Recommandation : oui. Écrire cette décision (T45) dans `docs/decisions.md` après votre accord.
- **Q2. Une branche d'intégration `etape-ouverture` et deux push vers `main` aujourd'hui ?**
  Recommandation : oui ; le n° 1 met la base de production en place dès l'après-midi et dégage la
  soirée.
- **Q3. Ordre de priorité si les limites d'usage coupent un agent ?** Recommandation : L1, L3a,
  F1, D1 à D3, P1, P2, P4, puis P3 et F3 ; L2, L3b, L4, L5 et L6 ne démarrent pas avant demain.

**Étape 5**

- **Q4. Place du rappel « données personnelles » sur le nouveau point.** La maquette 10 le met
  sous « Ce qui se passe ». Recommandation : sous le titre, premier champ libre (règle de
  `CLAUDE.md`).
- **Q5. Nombre sur l'onglet** (« Points d'attention 4 », maquette 05). Recommandation : pas pour
  l'ouverture.
- **Q6. Points de départ de Production et d'Entretien.** Recommandation : ces ministères les
  saisissent eux-mêmes après l'ouverture (auteur et journal justes) ; jamais par migration.
- **Q7. Textes des aides et des messages encore « Proposé ».** Recommandation : les valider avec
  ce plan, les relire pendant la recette E1.

**Étape 6**

- **Q8. « Mes indicateurs » et « À valider » juste après l'ouverture**, alors que la section 13
  dit « avant » ? Recommandation : oui, par le repli de la conception (section 9).
- **Q9. Précision des sensibles dans la file de modération ?** Recommandation : oui (L6). Le
  « Pourquoi » reste hors de la file : sa validation vaut relecture.
- **Q10. Ordre de mise en route ?** Recommandation : créer chaque ministère, puis ses prévus,
  avant qu'il ouvre son invitation (E3).

**Étape 7**

- **Q11. Seuil d'audit qui bloque l'ouverture ?** Recommandation : fautes axe critiques et graves
  bloquantes ; moyennes et mineures corrigées à J+7.
- **Q12. Le bandeau hors ligne bloque-t-il l'envoi ?** Recommandation : non. Le bouton reste
  actif, l'échec s'affiche sous le bouton, les valeurs restent.
- **Q13. Essai Safari mobile (WebKit) en CI ?** Recommandation : après l'ouverture ; ce soir,
  l'essai sur votre téléphone (E1) le remplace.

**Étape 8 et mise en service**

- **Q14. Une session a-t-elle lieu avant samedi 10 octobre ?** Recommandation : si oui, L2 passe
  ce soir après L1 ; sinon demain matin.
- **Q15. Offre de la production.** Recommandation : Pro (environ 25 $ par mois) dans une
  organisation séparée, pour les sauvegardes, l'absence de mise en pause, les sessions de 14 et
  30 jours et la protection des mots de passe ; la préproduction reste gratuite.
- **Q16. Adresse du site.** Recommandation : `pilotage-ejp.netlify.app` ce soir, le domaine de
  l'église plus tard (il faudra reprendre Site URL, redirections, Google et CSP).
- **Q17. Google ce soir ?** Recommandation : non. Mot de passe et code d'abord ; Google quand
  l'écran de consentement est publié.
- **Q18. SMTP.** Recommandation : Gmail d'EJP Tech avec mot de passe d'application ce soir (T40) ;
  Google Workspace pour les associations ensuite.
- **Q19. Ministères sans boîte partagée.** Recommandation : créer leurs comptes au fil de l'eau,
  au plus tard samedi 10 octobre ; un ministère sans compte ne peut rien saisir dimanche.
- **Q20. Administration indisponible ce soir ?** Recommandation : ne pas la remplacer (aucun autre
  profil ne crée de compte) ; décaler E3 à demain matin, le reste de la soirée ne change pas.

## 7. Risques et repli

### Risques

- **Limites d'usage des agents** : jusqu'à sept agents l'après-midi. Parade : l'ordre de Q3, et
  aucun lot reporté (section 4) lancé avant demain.
- **CI sans Docker** : chaque échec de pgTAP ou d'e2e coûte 30 à 45 min. Parade : chaque lot
  pousse tôt et souvent ; IO commence par les lots déjà verts.
- **Réponses de la coordination** : sans adresse de l'administration (D4), pas d'amorçage ; sans
  liste des ministères et de leurs boîtes, pas de comptes ; sans accord sur la page
  Confidentialité, pas de push n° 1. Parade : la demande A5 part maintenant, réponse avant 18 h.
- **Boîtes partagées manquantes** (13 d'après le dernier point) : ces ministères ne peuvent pas
  être invités. Parade : date limite samedi 10 octobre (Q19).
- **Emails** : limite d'envoi de Supabase (100 par heure après B1) et de Gmail (environ 500 par
  jour). Une trentaine d'invitations tient largement ; une invitation non reçue se relance à
  l'écran 13.
- **Horodatage des migrations** : une migration datée avant la dernière passée en production
  bloque le `db push` suivant (section 3.0).
- **Textes libres sans écran de modération pendant 48 h** : un nom de personne peut rester visible
  jusqu'à la relecture. Parade : le rappel sous le premier champ libre, et L6 livré sous 48 h.
- **Erreur de production** : retour arrière du front par Netlify (« Publish deploy » d'un build
  précédent) ; de la base, seulement par une nouvelle migration.

### Repli si ce soir ne tient pas

Le point de décision est à **19 h 30** :

1. **Repli 1, L1 ou L3a pas au vert** : la production est déjà prête depuis 16 h 30 (étape 4 et
   administration amorcée). Ce soir, rien de plus ; L1 et L3a passent demain matin, le push n° 2
   vers 12 h, les comptes des ministères demain après-midi. Les ministères ont trois jours pour
   activer avant dimanche.
2. **Repli 2, l'étape 5 n'est pas au vert** : ouvrir sans les points (L1, L3a, F1 et D suffisent à
   saisir) ; les points passent dans un push suivant dès qu'ils sont verts. Si seul P3 manque,
   ouvrir quand même : les boutons des fiches, de « À décider » et de « Vos points » suffisent pour
   traiter les points.
3. **Repli 3, l'étape 4 n'est pas close à 16 h** : pas de push n° 1 ; tout glisse d'un jour, avec
   une ouverture jeudi 8 octobre au soir, toujours avant le premier dimanche.

**Ce qui ouvre en premier, dans tous les cas** : les saisies de l'étape 4 et les comptes (écran 13
avec les prévus) ; puis les points (étape 5) ; puis les sessions (L2) ; puis le journal, la
modération et les indicateurs (L3b, L4, L5, L6) ; enfin la passe complète de l'étape 7. On ne
retire jamais un test de droits pour gagner du temps.
