# Conception : calendrier des événements (plages, corrections, retrait, agendas) (T78)

**Décision de la personne responsable, 26 octobre 2026** : conception validée avec les réponses
« Proposé », sauf Q18 : **le verrou « ajout seulement » n'est jamais levé**, même le temps d'une
reprise ; la date des mentions déjà enregistrées se lit sur l'événement (sa création), sans
modifier aucune ligne. Ordre : lot 1 (nom, mentions, retrait), puis lot 2 (plages), puis lot 3
(bouton d'agenda, après l'essai sur un vrai iPhone et un vrai Android) ; l'abonnement (lot 4)
attend une décision. Le lot 1 commence quand les erreurs d'envoi (T76) sont livrées.

Conception écrite seulement : aucun code, aucun commit, aucun fichier du dépôt modifié. Méthode :
mémoire « démarche ingénieur » (besoin, cas réels en critères d'acceptation, états de l'écran,
effets sur les règles existantes, options écartées, risques, tests d'abord, point de validation
avant le code). Base de travail : `main` (0b5284a, T75 compris). Les migrations de ce document
sont datées après `20261026084227_supprimer_partout.sql` et après celles de T76.

Lus : migrations `20261007120000_evenements_mentions.sql`, `20261023120000_evenements_heures.sql`,
`20261023120500_evenements_comptages.sql`, `20261010122000_mentions_modifiables.sql` (T54),
`20261014090000_retrait_par_le_ministere.sql` (`masquer_texte`) ; `src/data/evenements.ts`,
`src/data/evenementsEcriture.ts`, `src/features/evenements/` (formulaires, textes) ; maquettes
11 et 12, `LISEZMOI.md` ; BRIEF (règle 14, section 7, matrice) ; décisions T32, T37, T54, T68,
T75 ; conception T76 (`scratchpad/audit-evenement/conception.md`) ; `docs/exploitation.md`, 7.1.

---

## 0. Les choix structurants, en bref

1. **Deux formes de plage, un seul choix en tête du formulaire** : « Quand ? » avec trois cases,
   « Un jour » (par défaut, le formulaire d'aujourd'hui), « Plusieurs jours » (un seul événement,
   du premier au dernier jour) et « Se répète » (un événement par date, créés en une fois).
2. **Plusieurs jours** : `evenement_etat` gagne `date_fin` et `heure_fin`. L'événement compte
   une fois, dans le mois de son premier jour ; il n'est « passé » qu'après son dernier jour ; la
   ponctualité se mesure au début du premier jour.
3. **Se répète** : N événements ordinaires, liés par `evenement.serie_id`. Le téléphone calcule
   les dates (aperçu visible) et les envoie ; la base les contrôle (31 dates au plus, sur 12 mois
   au plus) et les crée en une transaction, avec le numéro anti-doublon de T76.
4. **Corrections en lignes nouvelles, jamais de modification** : nom (`evenement_titre`, la plus
   récente fait foi), mentions (modèle de T54 : ligne d'ajout, ligne de retrait), retrait d'un
   événement créé par erreur (`evenement_retrait` : il sort du calendrier et des comptages, il
   reste en base et au journal).
5. **Droits** : le ministère porteur fait tout ; EJP Tech peut aussi retirer (un événement passé,
   sur signalement) ; personne d'autre n'écrit. Tout profil qui lit un événement peut l'ajouter à
   son agenda.
6. **Agendas** : un bouton « Ajouter à mon agenda » qui fabrique un fichier `.ics` dans le
   navigateur, rappels compris, sans rien changer à la base. L'abonnement à un flux mis à jour
   tout seul est conçu (section 13.3) mais **Proposé « pas maintenant »** : il impose une
   exception à la double authentification. L'API de Google est écartée.
7. **Quatre lots** : 1 corrections (nom, mentions, retrait) ; 2 plages (plusieurs jours, série) ;
   3 agenda `.ics` (front seul) ; 4 facultatif, plus tard : flux d'abonnement.

---

## 1. Besoin

Demandes de la personne responsable (26 octobre 2026) :

1. **Plages**, demandées par Coordination : « Pour le calendrier ça serait super qu'il y ait une
   plage, genre plage de date et plage horaire, pour qu'on ne saisisse pas tout un par un. »
   Précision : la personne veut **les deux formes** (un événement sur plusieurs jours **et** une
   série d'événements répétés).
2. **Corriger le nom** d'un événement ; l'ancien nom reste dans l'historique.
3. **Modifier les mentions** tant que l'événement n'est pas passé, à la manière de T54.
4. **Retirer un événement créé par erreur** : il sort du calendrier et des comptages, différent
   d'« Annulé », jamais effacé, tracé au journal.
5. **Pour tout le monde, selon les droits** : chaque geste conçu pour chaque profil qui a le
   droit d'agir, matrice mise à jour.
6. **Agendas des téléphones** : ajouter les événements au Calendrier d'iOS ou à Google Agenda,
   automatiquement si possible, avec des rappels.

Ce que la personne n'a pas demandé, et qui reste hors de ce lot : changer le ministère porteur
d'un événement ; mettre à jour plusieurs dates d'une série en un geste (Q17) ; un lieu.

---

## 2. Faits établis (lecture du code)

- `evenement` (identité : ministère, nom, auteur) ; seul `masquer_texte` réécrit `titre`.
  `evenement_etat` : une ligne par changement (date, statut, `heure_prevue`, `heure_debut`), la
  plus récente fait foi ; le ministère porteur l'écrit **directement** (GRANT insert, politique
  « ajout »), contrôlé par le trigger `private.controler_evenement_etat()` (date passée, ligne
  identique, heures). Ce trigger ne joue que pour le porteur en aal2.
- `evenement_mention` : clé (événement, ministère), triggers `ajout_seulement` déjà posés, écrite
  par `ajouter_evenement` seulement. La politique de `evenement` lit
  `private.evenements_mentionnant_mon_ministere()`.
- `ajouter_evenement` existe à 3, 4 et 5 arguments (les plus courtes délèguent) ; T76 (lot B)
  ajoute la version à 6 arguments (`p_cle uuid`, obligatoire, table `private.envoi`).
- `v_evenement` (security_invoker) : dernier état, `jours`, `a_confirmer`, `reporte_du`, heures,
  `retard`, `a_l_heure`. Toutes les lectures de l'écran passent par elle (calendrier 04 et 12,
  « Vos saisies », événements à confirmer, retards du mois), plus `evenement_mention` en brut
  (calendrier d'un ministère mentionné, panneau de mise à jour).
- `private.comptages_evenements_mois()` lit `evenement` et `evenement_etat` directement ; elle
  nourrit `v_evenements_mois` et `evenements_eglise_mois()` (Coordination, berger, conseil, EJP
  Tech).
- Journal : `evenement_ajoute` et `evenement_modifie` écrits par le trigger d'instruction de
  `evenement_etat`, une ligne par envoi et par événement ; aucun texte libre.
- `masquer_texte` connaît le couple (`evenement`, `titre`) ; `v_textes_a_relire` (EJP Tech) liste
  les noms d'événements.
- Le formulaire d'ajout dit « Vous ne pourrez plus changer les mentions. » ; le panneau de mise à
  jour montre le nom et les mentions en lecture seule (« Seul Communication peut mettre à jour cet
  événement. » pour les autres).
- Aucun fichier manifeste ni balise `apple-mobile-web-app-capable` : une icône posée sur l'écran
  d'accueil d'un iPhone ouvre Safari (utile pour le fichier `.ics`, section 13).
- Aucune fonction Cloudflare Pages ; sept Edge Functions Supabase (comptes), toutes derrière un
  jeton de session.

---

## 3. Inventaire des droits aujourd'hui, par profil

Source : BRIEF section 7 (matrice), politiques RLS, `rls-evenements-matrice.test.sql`,
`rls-evenements-comptages-matrice.test.sql`. Toute ligne suppose aal2 et un compte actif.

| Geste sur un événement                        | Porteur             | Mentionné                | Autre ministère | Coordination (en plus)   | Berger, conseil | Administration | EJP Tech              |
| --------------------------------------------- | ------------------- | ------------------------ | --------------- | ------------------------ | --------------- | -------------- | --------------------- |
| Lire l'événement, ses états, ses mentions     | oui                 | oui                      | non             | comme tout ministère     | oui, tous       | non            | oui, tous             |
| Ajouter (`ajouter_evenement`)                 | oui (son ministère) | sans objet               | sans objet      | oui, pour Coordination   | non             | non            | non                   |
| Mettre à jour (date, statut, heures)          | oui                 | non (« Seul X peut... ») | non             | ses événements seulement | non             | non            | non                   |
| Masquer le nom                                | non                 | non                      | non             | non                      | non             | non            | oui (`masquer_texte`) |
| Comptages par ministère (`v_evenements_mois`) | les siens           | non                      | non             | les siens                | tous            | non            | tous                  |
| Totaux de l'église (`evenements_eglise_mois`) | non                 | non                      | non             | **oui** (seul ministère) | oui             | non            | oui                   |
| Journal des événements                        | lignes de sa fiche  | non                      | non             | lignes de sa fiche       | oui             | non            | oui                   |

---

## 4. Matrice cible (Proposé, questions Q5 à Q8)

| Geste nouveau                              | Porteur                            | Mentionné | Autre | Berger, conseil | Administration | EJP Tech                           |
| ------------------------------------------ | ---------------------------------- | --------- | ----- | --------------- | -------------- | ---------------------------------- |
| Ajouter sur plusieurs jours                | oui                                | non       | non   | non             | non            | non                                |
| Ajouter une série                          | oui                                | non       | non   | non             | non            | non                                |
| Corriger le nom (un événement ou sa série) | oui, tant qu'il n'est pas retiré   | non       | non   | non             | non            | non (il masque, comme aujourd'hui) |
| Modifier les mentions                      | oui, jusqu'au dernier jour compris | non       | non   | non (Q6)        | non            | non                                |
| Retirer                                    | oui, jusqu'au dernier jour compris | non       | non   | non             | non            | **oui, à tout moment** (Q7)        |
| Ajouter à mon agenda (`.ics`)              | oui                                | oui       | non   | oui             | non            | oui                                |
| Lire le nom en vigueur et l'ancien nom     | oui                                | oui       | non   | oui             | non            | oui                                |

Coordination n'a aucun droit de plus que tout ministère porteur. Lignes à ajouter au tableau de
la section 7 du BRIEF : section 10.4.

---

## 5. Plages : deux lectures, comparaison, recommandation

### 5.1 Lecture A : un événement sur plusieurs jours

Un seul événement, du premier au dernier jour, avec une heure de début (prévue) et une heure de
fin facultatives. Exemple : « Camp de Toussaint, du sam. 31 oct. au lun. 2 nov., 10 h à 17 h ».
Un statut, une ligne au calendrier, une mise à jour, une ponctualité.

### 5.2 Lecture B : une série d'événements répétés

Plusieurs événements créés en une fois, un par date : chaque jour d'une période, ou certains
jours de la semaine. Exemple : « Réunion des responsables, chaque lundi du 2 nov. au 14 déc.,
19 h à 21 h » donne 7 événements. Chacun a ensuite sa vie propre : son statut, son report, son
annulation, son heure de début réelle.

### 5.3 Comparaison

| Critère                         | A : plusieurs jours                                                   | B : série                                                                      |
| ------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Ce que c'est                    | un événement long                                                     | des rendez-vous séparés                                                        |
| Lignes au calendrier            | une (« Du sam. 31 oct. au lun. 2 nov. »)                              | une par date                                                                   |
| Comptages (prévus, réalisés...) | 1                                                                     | N, chacun dans le mois de sa date                                              |
| Ponctualité (T68)               | une mesure, au début du premier jour                                  | une mesure par date                                                            |
| « Vos saisies » (À faire)       | une ligne, après le dernier jour                                      | une ligne par date passée sans état final                                      |
| Annuler une seule date          | impossible (c'est un seul événement)                                  | possible                                                                       |
| Agenda du téléphone             | un bloc continu sur plusieurs jours                                   | N rendez-vous                                                                  |
| Base                            | deux colonnes sur `evenement_etat`                                    | une colonne `serie_id`, une fonction de création                               |
| Risque                          | un rendez-vous quotidien saisi en A perd sa ponctualité jour par jour | gonfle les comptages et les « À faire » si on l'emploie pour un événement long |

### 5.4 Recommandation

La personne veut les deux : **les deux, choisies par une seule question en tête du formulaire**.
La règle donnée sous le choix, en une phrase chacune : « Plusieurs jours » quand c'est un seul
événement qui dure (camp, retraite, convention) ; « Se répète » quand chaque date est un
rendez-vous à part, avec ses présents et son heure de début (répétitions, réunions, prières du
matin). Limites (Proposé, Q2 et Q3) :

- plusieurs jours : 31 jours au plus (au-delà, c'est presque toujours une erreur de saisie) ;
- série : 31 dates au plus, entre la première et la dernière date 12 mois au plus ; des jours de
  la semaine (au moins un), le jour de la première date coché d'avance ; une série n'a pas de
  date sur plusieurs jours (une série de week-ends se saisit en deux séries, ou en « Plusieurs
  jours » chaque fois).

### 5.5 Le formulaire « Ajouter un événement » (maquette 11, étendue)

Ordre des champs (la maquette met la date en tête ; « Quand ? » la précède) :

1. **Quand ?** : choix côte à côte de trois cases (`ChoixSegmente`, T69), « Un jour » coché.
   Sous le choix, une phrase visible selon la case (section 8.1).
2. Dates :
   - « Un jour » : « Date » (inchangé) ;
   - « Plusieurs jours » : « Premier jour », « Dernier jour » ;
   - « Se répète » : « Première date », « Dernière date », puis le groupe « Jours de la semaine »
     (sept cases de 44 px, « lun. » à « dim. », dans un `fieldset` avec sa légende).
3. « Heure prévue (facultatif) » et « Heure de fin (facultatif) », côte à côte dès 600 px,
   l'une sous l'autre en dessous ; la note de T68 sur les cultes reste sous le premier.
4. Nom, statut, mentions : inchangés (le statut et les mentions s'appliquent à chaque date).
5. « Se répète » : un aperçu des dates, annoncé poliment aux lecteurs d'écran, au-dessus du
   bouton (« 7 dates : lun. 2 nov., lun. 9 nov., ... »). Le bouton dit le nombre : « Ajouter 7
   événements au calendrier ».

Le jour de Paris (`v_semaine.aujourdhui`) reste la plus petite date permise ; le calcul des jours
de la semaine porte sur des dates `AAAA-MM-JJ`, sans heure ni fuseau, jamais sur la date du
navigateur.

---

## 6. Corrections : nom, mentions, retrait

### 6.1 Corriger le nom

- **Qui** : le porteur. **Quand** : à tout moment, tant que l'événement n'est pas retiré (une
  coquille sur un événement passé gêne la lecture des retards du mois).
- **Comment** : une ligne dans `evenement_titre` ; `evenement.titre` garde le nom de création ;
  `v_evenement.titre` donne le nom en vigueur, donc toutes les lectures, l'ancien site compris,
  voient le nouveau nom sans changement.
- **Historique** : la base garde toutes les versions. Le panneau de l'événement montre la
  précédente sur une ligne (« Ancien nom : Soirée de lounge, corrigé le 26 oct. ») à tous ceux
  qui lisent l'événement (Q5). Le journal dit « A corrigé le nom d'un événement », sans aucun des
  deux textes.
- **Modération** : chaque nom corrigé entre dans `v_textes_a_relire` ; `masquer_texte` gagne le
  couple (`evenement_titre`, `titre`) et ne masque que cette version.
- **Même nom** (espaces autour compris) : rien n'est écrit, la fonction rend sans erreur (un
  second envoi après une réponse perdue ne trompe personne).

### 6.2 Modifier les mentions (modèle T54)

- **Qui** : le porteur (Q6 : pas le berger ni le conseil ; pour un point, ils décident ; un
  événement appartient au ministère). **Quand** : jusqu'au dernier jour de l'événement compris
  (heure de Paris), s'il n'est pas retiré.
- **Comment** : identique à T54. `evenement_mention` gagne `id`, `saisi_le`, `saisi_par` ; un
  retrait est une ligne de `evenement_mention_retrait` qui désigne la ligne d'ajout ; la mention en
  vigueur est la ligne d'ajout sans retrait ; la vue `v_evenement_mention` la donne. Une seule
  fonction pour l'écran : `modifier_mentions_evenement(p_evenement_id, p_mentions uuid[])` (la
  liste voulue ; la base écrit la différence en une transaction).
- **Effet** : un ministère retiré ne voit plus l'événement nulle part (calendrier, mises à jour,
  agenda) ; ajouté, il le voit. Un ministère désactivé encore mentionné s'affiche « (désactivé) » :
  on peut le retirer, pas l'ajouter. Jamais le porteur lui-même.
- **Liste identique** : rien n'est écrit, sans erreur.

### 6.3 Retirer un événement créé par erreur

- **Ce que c'est** : différent d'« Annulé ». Annulé dit « il était prévu et n'aura pas lieu » et
  compte dans les annulés ; retiré dit « il n'aurait jamais dû exister » (doublon, mauvais espace,
  essai) et ne compte nulle part.
- **Qui et quand** (Q7) : le porteur, jusqu'au dernier jour compris ; après, EJP Tech seul, sur
  signalement. Raison : un événement passé est déjà dans les comptages et la ponctualité que le
  berger et le conseil ont lus ; le porteur ne doit pas pouvoir faire disparaître un retard, et
  EJP Tech vérifie que c'est bien une erreur. EJP Tech peut aussi retirer un événement à venir
  (doublon d'un ministère qui n'y arrive pas).
- **Comment** : une ligne dans `evenement_retrait` (une seule par événement). Rien n'est effacé :
  `evenement`, ses états, ses mentions, ses noms et ses lignes de journal restent.
- **Effet** : l'événement sort de `v_evenement` (donc du calendrier, des alertes, de « Vos
  saisies », des retards du mois, de l'agenda), de `v_evenement_mention` et des comptages. Une
  mise à jour d'un événement retiré est refusée par la base (« Cet événement a été retiré. »),
  ancien site compris. Le panneau ouvert par un ancien lien dit « Cet événement a été retiré le 26
  oct. ».
- **Définitif** (Q7) : un retrait ne se défait pas, comme « Marquer traité ». Une erreur de
  retrait se répare en ajoutant l'événement de nouveau. La fenêtre de confirmation le dit.
- **Sans motif** (Q7) : la fenêtre ne demande rien de plus ; le journal dit « A retiré un
  événement », avec la date et le statut du dernier état (jamais le nom).
- **Déjà retiré** : rien n'est écrit, sans erreur.
- **Suppression d'un ministère (T75)** : inchangée. Un événement retiré reste une donnée du
  ministère et empêche sa suppression, comme un événement annulé.

### 6.4 Une série : la portée du geste (lot 2)

Pour un événement d'une série, chaque fenêtre (nom, mentions, retrait) demande d'abord :
« Cet événement seulement » ou « Toute la série » (Q8) :

- nom : toutes les dates non retirées de la série ;
- mentions : les dates de la série qui ne sont pas passées (« les 5 dates à venir ») ;
- retrait par le porteur : les dates de la série qui ne sont pas passées ; les dates passées
  restent (« Les dates passées restent au calendrier. ») ; EJP Tech : toutes.

Une ligne de journal par événement touché (règle 10 du BRIEF : même exception que T54).

---

## 7. Scénarios réels (critères d'acceptation)

Chaque scénario devient un test (section 16). Jour de référence : lundi 26 octobre 2026, heure de
Paris. « Coordination » : `coordination@exemple.test` du jeu d'exemple.

**S1. Coordination saisit une série (lot 2).** Étant donné Coordination sur iPhone (390 px),
quand elle choisit « Se répète », première date lun. 2 nov., dernière date lun. 14 déc., « lun. »
coché, 19 h 00 à 21 h 00, nom « Réunion des responsables », statut « Validé », huit mentions dont
FIJ, alors l'aperçu dit « 7 dates : lun. 2 nov., lun. 9 nov., lun. 16 nov., lun. 23 nov., lun. 30
nov., lun. 7 déc., lun. 14 déc. », le bouton dit « Ajouter 7 événements au calendrier », et après
l'envoi : 7 événements (même `serie_id`), 56 mentions, 7 lignes `evenement_ajoute` (chacune avec
`serie`), le message « 7 événements ajoutés au calendrier. », le formulaire vidé ; FIJ voit les 7
lignes dans son calendrier ; les totaux de l'église comptent 5 prévus en novembre et 2 en
décembre.

**S2. Réponse perdue pendant une série (lot 2, T76).** Étant donné S1, quand la réponse se perd
et que Coordination touche de nouveau le bouton, alors la base reconnaît le numéro, rend la même
série et n'écrit rien : toujours 7 événements, pas 14. Si elle a changé une date entre les deux
envois : refus « Votre premier envoi est déjà enregistré. Vérifiez la liste avant de réessayer. »
(texte de T76).

**S3. Le doublon du 26 octobre (lot 1).** Étant donné deux événements identiques de Coordination
datés du 26 oct., huit mentions chacun (le cas de T76), quand Coordination ouvre l'un, touche
« Retirer l'événement » et confirme, alors il disparaît de son calendrier et de celui des huit
ministères mentionnés, les prévus d'octobre baissent de 1, le journal de sa fiche dit « A retiré
un événement », l'autre reste. Le 27 oct., le bouton reste visible mais dit pourquoi il ne
s'applique plus (section 8.2) et propose « Signaler une difficulté » ; EJP Tech, lui, peut le
retirer.

**S4. Une coquille dans le nom (lot 1).** Étant donné « Soirée de lounge » de Communication,
quand Communication touche « Corriger le nom », écrit « Soirée de louange » et enregistre, alors
le calendrier de Communication, du berger et des ministères mentionnés montre « Soirée de
louange » ; le panneau montre « Ancien nom : Soirée de lounge, corrigé le 26 oct. » ; le journal
dit « A corrigé le nom d'un événement » sans aucun des deux textes ; EJP Tech voit le nouveau nom
dans les textes à relire. L'ancien site, encore ouvert, montre aussi le nouveau nom.

**S5. Changer les mentions avant la date (lot 1).** Étant donné un événement de Coordination du
sam. 7 nov. qui mentionne FIJ, quand Coordination décoche FIJ, coche Accueil et enregistre, alors
FIJ ne le voit plus (calendrier, mise à jour, agenda), Accueil le voit ; le journal a deux lignes
(une mention retirée, une ajoutée, l'identifiant du ministère seulement). Le 8 nov., « Modifier
les mentions » dit « Les mentions ne changent plus : la date de l'événement est passée. ».

**S6. Le camp sur plusieurs jours (lot 2).** Étant donné Jeunesse (exemple) qui saisit « Plusieurs
jours », du sam. 31 oct. au lun. 2 nov., 10 h 00 à 17 h 00, « Camp de Toussaint », « Validé »,
alors une seule ligne « Du sam. 31 oct. au lun. 2 nov., 10 h à 17 h » ; un prévu en octobre ; le
dim. 1er nov., il n'est pas « passé sans état final » ; le 31 oct., Jeunesse peut indiquer
l'heure de début réelle après « Terminé » (ponctualité mesurée une fois) ; le 3 nov., « Vos
saisies » demande son statut s'il n'a pas d'état final.

**S7. Report du camp par l'ancien site (lot 2, compatibilité).** Étant donné S6, quand l'ancien
site (sans les champs de fin) reporte le camp au sam. 7 nov., alors la base garde sa durée : du 7
au 9 nov.

**S8. Série créée avec le mauvais jour (lot 2).** Étant donné S1 saisie par erreur le mardi,
quand Coordination ouvre une date et choisit « Retirer l'événement », « Toute la série », alors
les 7 dates à venir sortent du calendrier et des comptages, 7 lignes de journal ; elle saisit de
nouveau la série le lundi.

**S9. Le mauvais espace (lot 1, T73).** Étant donné une personne qui a deux espaces et ajoute
l'événement de Coordination dans l'espace de Communication, quand elle le retire depuis
Communication et l'ajoute depuis Coordination, alors le calendrier de Communication ne le montre
plus et ses comptages ne l'ont jamais compté au-delà du retrait.

**S10. Un ministère mentionné (lot 1).** Étant donné FIJ mentionné par Coordination, quand FIJ
ouvre l'événement, alors aucun geste d'écriture : « Seul Coordination peut modifier cet
événement. » ; un appel direct aux fonctions est refusé (42501).

**S11. Ajouter à mon agenda (lot 3).** Étant donné une personne de FIJ sur iPhone, quand elle
touche « Ajouter les événements à venir à mon agenda » sous le calendrier, alors l'iPhone propose
les événements (« Tout ajouter ») avec deux rappels (la veille et une heure avant) ; sur un
téléphone Android, l'agenda installé propose de les ajouter (à vérifier sur un vrai téléphone,
Q16). Le fichier ne contient que les noms, dates, heures, statuts et le ministère porteur.

**S12. Administration de l'église.** Étant donné l'administration, alors elle ne lit aucun
événement, aucun nom, aucun retrait ; tous les gestes nouveaux lui sont refusés (42501), comme
aujourd'hui.

**S13. EJP Tech masque un nom corrigé (lot 1).** Étant donné un nom corrigé qui contient un prénom,
quand EJP Tech le masque, alors le calendrier montre « [texte masqué par EJP Tech] » ; les autres
versions du nom ne changent pas.

---

## 8. États de l'écran et textes proposés

Tous « Proposé » (guide de rédaction de T66 ; aucun tiret long ; la phrase nécessaire pour
remplir est visible, jamais dans une bulle).

### 8.1 « Ajouter un événement » (lot 2)

| Élément                       | Texte                                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Choix                         | « Quand ? » : « Un jour », « Plusieurs jours », « Se répète »                                                               |
| Sous « Plusieurs jours »      | « Un seul événement, du premier au dernier jour. Par exemple, un camp. »                                                    |
| Sous « Se répète »            | « Un événement par date, chacun avec son statut. Par exemple, une réunion chaque lundi. »                                   |
| Champs                        | « Premier jour », « Dernier jour » ; « Première date », « Dernière date », « Jours de la semaine »                          |
| Heures                        | « Heure prévue (facultatif) » (inchangé), « Heure de fin (facultatif) »                                                     |
| Aperçu                        | « 7 dates : lun. 2 nov., lun. 9 nov., ... »                                                                                 |
| Bouton                        | « Ajouter au calendrier » ; série : « Ajouter 7 événements au calendrier »                                                  |
| Réussite                      | « Événement ajouté au calendrier. » ; « 7 événements ajoutés au calendrier. »                                               |
| Sous les mentions             | « Vous pourrez les changer jusqu'à la date de l'événement. » (remplace « Vous ne pourrez plus changer les mentions. », Q15) |
| Dernier jour vide             | « Choisissez le dernier jour. »                                                                                             |
| Dernier jour avant le premier | « Le dernier jour doit suivre le premier. »                                                                                 |
| Plus de 31 jours              | « Un événement dure 31 jours au plus. Pour des dates séparées, choisissez Se répète. »                                      |
| Aucun jour coché              | « Choisissez au moins un jour de la semaine. »                                                                              |
| Aucune date trouvée           | « Aucune date ne correspond. Changez les jours ou les dates. »                                                              |
| Plus de 31 dates              | « Une série compte 31 dates au plus. Raccourcissez la période. »                                                            |
| Plus de 12 mois               | « Une série tient sur 12 mois au plus. »                                                                                    |
| Échec d'envoi                 | classement unique de T76 (aucun texte nouveau)                                                                              |

### 8.2 Panneau de l'événement (dérivé de 11, `/saisir/evenement/:id`) (lots 1 et 2)

Une seule action qui attire l'œil par ligne (T69, point 12) ; une action impossible reste
visible avec sa raison (leçon de T75).

| Profil, état                   | Ce qui s'affiche                                                                                                                                                                                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Porteur                        | Nom et lien « Corriger le nom » ; ligne des mentions et bouton « Modifier les mentions » ; formulaire de mise à jour ; en bas, bouton discret « Retirer l'événement »                                                                                                                                                    |
| Porteur, nom corrigé           | « Ancien nom : Soirée de lounge, corrigé le 26 oct. »                                                                                                                                                                                                                                                                    |
| Corriger le nom                | champ « Nom de l'événement » prérempli (rappel sur les données personnelles sous le champ), bouton « Enregistrer le nom », réussite « Nom corrigé. »                                                                                                                                                                     |
| Modifier les mentions          | fenêtre de T54 (cases, mentions actuelles cochées), « Enregistrer les mentions », réussite « Mentions enregistrées. »                                                                                                                                                                                                    |
| Mentions, date passée          | « Les mentions ne changent plus : la date de l'événement est passée. »                                                                                                                                                                                                                                                   |
| Retirer, fenêtre               | titre « Retirer cet événement ? » ; texte « Il sort du calendrier et des comptages, chez vous et chez les ministères mentionnés. Il reste au journal. Ce retrait est définitif. Pour un événement qui n'aura pas lieu, choisissez plutôt le statut Annulé. » ; boutons « Retirer l'événement » et « Garder l'événement » |
| Retrait réussi                 | retour à la fiche, « Événement retiré du calendrier. »                                                                                                                                                                                                                                                                   |
| Retirer, date passée (porteur) | « Un événement passé se retire par EJP Tech. S'il a été créé par erreur, signalez-le. » et le lien « Signaler une difficulté »                                                                                                                                                                                           |
| Série (lot 2)                  | « Fait partie d'une série de 7 dates. » ; dans chaque fenêtre, « Cet événement seulement » ou « Toute la série » (« les 5 dates à venir » pour les mentions et le retrait)                                                                                                                                               |
| Mentionné, berger, conseil     | lecture seule ; « Seul Coordination peut modifier cet événement. » (remplace « mettre à jour ») ; « Ajouter à mon agenda »                                                                                                                                                                                               |
| EJP Tech                       | lecture seule, plus « Retirer l'événement » (même fenêtre)                                                                                                                                                                                                                                                               |
| Événement retiré               | « Cet événement a été retiré le 26 oct. » (au lieu de « introuvable »)                                                                                                                                                                                                                                                   |
| Erreur d'envoi                 | classement de T76                                                                                                                                                                                                                                                                                                        |

### 8.3 Calendrier (04 et 12) et journal

- Plusieurs jours : colonne Date « Du sam. 31 oct. au lun. 2 nov. », heures « 10 h à 17 h » (même
  règle de coupure que T68).
- Sous le calendrier, lien « Ajouter les événements à venir à mon agenda » (lot 3), et la note :
  « Une copie dans l'agenda de votre téléphone, avec un rappel la veille et une heure avant. Si une
  date change ici, ajoutez l'événement de nouveau. »
- Journal (libellés de `v_journal`) : « A corrigé le nom d'un événement », « A mentionné un
  ministère sur un événement », « A retiré une mention d'un événement », « A retiré un
  événement ». Le nom affiché est le nom en vigueur.

---

## 9. Effets sur les comptages, la ponctualité et les autres lectures

| Lecture                                      | Plusieurs jours                                             | Série                     | Retrait            | Nom                   | Mentions                                |
| -------------------------------------------- | ----------------------------------------------------------- | ------------------------- | ------------------ | --------------------- | --------------------------------------- |
| Prévus, réalisés, annulés, en attente (K10a) | 1, mois du premier jour ; « à venir » jusqu'au dernier jour | 1 par date                | sort               | aucun effet           | aucun effet                             |
| Passés sans état final (K10c)                | après le dernier jour                                       | par date                  | sort               | aucun                 | aucun                                   |
| Reportés (K10b)                              | premier jour reculé ; allonger la fin n'est pas un report   | par date                  | sort               | aucun                 | aucun                                   |
| Ponctualité (T68)                            | heure prévue = début du premier jour ; une mesure           | une par date              | sort               | aucun                 | aucun                                   |
| À confirmer (3 jours, T31)                   | premier jour                                                | par date                  | sort               | aucun                 | aucun                                   |
| « Vos saisies » (À faire, 30 jours)          | compte depuis le dernier jour                               | une ligne par date        | sort               | aucun                 | aucun                                   |
| Calendrier (7 jours passés)                  | visible jusqu'au dernier jour plus 7                        | par date                  | sort               | nouveau nom           | apparaît ou disparaît chez le ministère |
| `evenements_eglise_mois()`, « depuis »       | inchangé                                                    | inchangé                  | ignore les retirés | aucun                 | aucun                                   |
| Textes à relire (EJP Tech)                   | inchangé                                                    | une ligne par série (Q14) | reste              | une ligne par version | aucun                                   |
| Journal                                      | une ligne                                                   | une par date              | une                | une                   | une par ministère ajouté ou retiré      |

Pour les lectures qui dépendent du « dernier jour », `v_evenement` gagne `jours_fin`
(dernier jour moins aujourd'hui) ; `jours` garde son sens (premier jour), pour l'ancien site.

---

## 10. Modèle de données et fonctions

Toute fonction : partie `private` en `security definer`, `set search_path = ''`,
`private.exige_aal2()` d'abord ; partie `public` en `security invoker`, une ligne ; `grant
execute` à `authenticated` seulement. Toute table : RLS, politique restrictive aal2, GRANT select
seulement, triggers `forcer_auteur`, `ajout_seulement` et `ajout_seulement_vider`.

### 10.1 Lot 1, migration `..._evenements_corrections.sql`

```sql
-- Nom : la ligne la plus récente fait foi ; evenement.titre garde le nom de création.
create table public.evenement_titre (
  id uuid primary key default gen_random_uuid(),
  evenement_id uuid not null references public.evenement,
  titre text not null check (char_length(btrim(titre)) between 1 and 80),  -- seul masquer_texte le réécrit
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id)
);
create index on public.evenement_titre (evenement_id, saisi_le desc, id desc);
-- trigger refuser_modification_sauf_masquage('titre') (modèle de retrait_indicateur.motif)

-- Mentions : modèle exact de 20261010122000_mentions_modifiables.sql.
-- evenement_mention gagne id, saisi_le, saisi_par ; les lignes existantes prennent la date et
-- l'auteur de leur événement (posées dans la même transaction que lui). Le trigger
-- ajout_seulement est suspendu le temps de cette seule instruction, dans la transaction de la
-- migration (Q18), puis la clé devient id, et le trigger mention_unique refuse un second ajout
-- en vigueur.
create table public.evenement_mention_retrait (
  id uuid primary key default gen_random_uuid(),
  mention_id uuid not null unique references public.evenement_mention (id),
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id)
);
create view public.v_evenement_mention with (security_invoker = true) as ...  -- en vigueur, non retirés

-- Retrait : une ligne par événement, au plus.
create table public.evenement_retrait (
  evenement_id uuid primary key references public.evenement,
  saisi_le timestamptz not null default now(),
  saisi_par uuid not null default auth.uid() references public.compte (user_id)
);
```

Fonctions et changements :

- `private.evenements_mentionnant_mon_ministere()` : mentions en vigueur seulement (même
  signature, droits gardés).
- `private.controler_evenement_etat()` : refuse en tête, pour tout auteur, un état sur un
  événement retiré (« Cet événement a été retiré. »).
- `v_evenement` (create or replace, mêmes colonnes dans le même ordre) : `titre` = nom en vigueur
  (dernière ligne de `evenement_titre`, sinon `evenement.titre`) ; les retirés sont exclus.
- `private.comptages_evenements_mois()` et le « depuis » de `evenements_eglise_mois()` : retirés
  exclus.
- `corriger_titre_evenement(p_evenement_id uuid, p_titre text) returns void` : porteur ; refus :
  absent ou sans droit (42501, « Cet élément est introuvable... » côté écran), retiré, nom vide ou
  trop long (messages d'aujourd'hui) ; même nom : rien.
- `modifier_mentions_evenement(p_evenement_id uuid, p_mentions uuid[]) returns void` : porteur ;
  verrou sur l'événement ; refus : dernier jour passé (« Les mentions de cet événement ne changent
  plus. »), retiré, ministère créateur, désactivé ou inconnu (message de T54) ; liste identique :
  rien.
- `retirer_evenement(p_evenement_id uuid) returns void` : porteur si dernier jour au plus tôt
  aujourd'hui (`private.aujourdhui()`), EJP Tech (`private.peut_configurer()`) toujours ; refus du
  porteur après la date (« Un événement passé se retire par EJP Tech. ») ; déjà retiré : rien.
- Journal : codes `evenement_titre_corrige` (`{}`), `evenement_mention_ajoutee` et
  `evenement_mention_retiree` (`{"ministere": uuid}`), `evenement_retire` (`{"date", "statut"}`),
  au ministère porteur, cible `evenement`. Le `check` de `journal` est recréé depuis sa dernière
  version ; `v_journal` gagne les libellés.
- Modération : `masquer_texte` recréée depuis sa dernière version avec (`evenement_titre`,
  `titre`) ; `v_textes_a_relire` lit `evenement_titre` ; `check` de `moderation` recréé.

### 10.2 Lot 2, migration `..._evenements_plages.sql`

```sql
alter table public.evenement add column serie_id uuid;      -- posé à la création, jamais changé
create index on public.evenement (serie_id) where serie_id is not null;
alter table public.evenement_etat
  add column date_fin date,                                 -- null : un seul jour
  add column heure_fin smallint check (heure_fin between 0 and 1439),
  add constraint evenement_etat_date_fin check (date_fin is null or date_fin between date + 1 and date + 30);
```

- Trigger `controler_evenement_etat()` : une `date_fin` vide reprend **la durée** du dernier état
  (un report de l'ancien site garde la durée, S7) ; une `date_fin` égale à `date` devient null
  (retour à un seul jour, envoyé par le nouveau site) ; une `heure_fin` vide reprend la dernière
  (règle de T68) ; une nouvelle `date_fin` passée et différente est refusée (« La date de fin doit
  être aujourd'hui ou plus tard. ») ; « Rien n'a changé » compare aussi `date_fin` et `heure_fin`.
- `v_evenement` : colonnes ajoutées à la fin : `date_fin`, `heure_fin`, `jours_fin`, `serie_id`.
- Comptages : « à venir » et « passé » se lisent sur `coalesce(date_fin, date)` ; le mois et le
  report sur `date`.
- `ajouter_evenement(p_titre, p_date, p_date_fin, p_statut, p_mentions, p_heure_prevue,
p_heure_fin, p_cle)` à 8 arguments, tous obligatoires (règle PGRST203 de T76) ; la version à 6
  de T76 délègue avec null ; 5, 4 et 3 délèguent déjà.
- `ajouter_evenements_serie(p_titre, p_dates date[], p_statut, p_mentions, p_heure_prevue,
p_heure_fin, p_cle) returns uuid` (la série) : dates sans doublon, 2 à 31, toutes au plus tôt
  aujourd'hui, 12 mois au plus entre la première et la dernière ; mêmes contrôles que l'ajout ;
  numéro et empreinte de T76 (opération `ajouter_evenements_serie`, la liste fermée de
  `private.envoi` est recréée ; l'empreinte porte sur les dates triées) ; une instruction
  `insert` par table, donc une ligne de journal par événement, chacune avec `serie`.
- `retirer_serie(p_serie_id)`, `corriger_titre_serie(p_serie_id, p_titre)`,
  `modifier_mentions_serie(p_serie_id, p_mentions)` : appliquent la règle de l'événement à
  chaque date concernée (section 6.4), en une transaction.

### 10.3 Lot 3 : aucune migration

Le fichier `.ics` se fabrique dans le navigateur à partir de `v_evenement` déjà lue.

### 10.4 Matrice du BRIEF, lignes à ajouter ou changer

| Objet                                                      | Ministère                                                                                   | Berger, conseil | Administration | EJP Tech |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------- | -------------- | -------- |
| `evenement`, `evenement_etat` (changée)                    | « ceux qui le mentionnent » = mention en vigueur ; A `evenement_etat` les siens non retirés | L               | Rien           | L        |
| `evenement_mention` (changée), `evenement_mention_retrait` | L des événements lisibles ; A par les fonctions seulement                                   | L               | Rien           | L        |
| `evenement_titre`, `evenement_retrait`                     | L des événements lisibles ; A par les fonctions seulement                                   | L               | Rien           | L        |
| `v_evenement_mention`                                      | siens et ceux qui le mentionnent                                                            | tous            | Rien           | tous     |
| `corriger_titre_evenement`, `corriger_titre_serie`         | porteur                                                                                     | refusé          | refusé         | refusé   |
| `modifier_mentions_evenement`, `modifier_mentions_serie`   | porteur, jusqu'au dernier jour                                                              | refusé (Q6)     | refusé         | refusé   |
| `retirer_evenement`, `retirer_serie`                       | porteur, jusqu'au dernier jour                                                              | refusé          | refusé         | oui (Q7) |
| `ajouter_evenement` (8), `ajouter_evenements_serie`        | sa fiche, ministère actif                                                                   | refusé          | refusé         | refusé   |

---

## 11. Ce que devient la règle « ajout seulement » (pour décision)

**Ce qui ne change pas** : aucune ligne d'événement n'est modifiée ni effacée par l'application.
Pas d'`UPDATE`, pas de `DELETE`, pour aucun profil, sur aucune de ces tables ; `saisi_le` et
`saisi_par` imposés par la base ; seule exception, `masquer_texte` sur un nom.

**Ce qui change** :

1. Le nom et les mentions ne sont plus « fixés à la création » (BRIEF règle 14, T32) : ils ont des
   versions, comme les états. La valeur en vigueur est la plus récente ; les anciennes restent.
2. Un événement peut être **retiré** : une ligne de plus le sort de toutes les lectures, sans rien
   effacer. Annulé reste un statut ; retiré n'en est pas un.
3. Une migration unique donne une date et un auteur aux mentions existantes (même geste que T54),
   en suspendant le trigger le temps d'une instruction (Q18).
4. Un envoi de série écrit une ligne de journal par événement (exception à la règle 10, comme T54).

**Texte proposé pour CLAUDE.md** (règles métier) : « Événements, leurs états, leurs noms, leurs
mentions et retraits de mention, leurs retraits [...] : ajout seulement. Une correction (nom,
mentions) ou un retrait est une ligne nouvelle ; la plus récente fait foi ; rien n'est modifié ni
effacé (seule exception : `masquer_texte` sur un nom). » La liste nomme `evenement_titre`,
`evenement_mention_retrait` et `evenement_retrait`.

**Texte proposé pour la règle 14 du BRIEF** (ajout) : « Le porteur corrige le nom (l'ancien
reste), modifie les mentions jusqu'au dernier jour compris et retire un événement créé par erreur
jusqu'au dernier jour compris ; après, seul EJP Tech le retire. Un événement retiré sort du
calendrier et des comptages ; il reste en base et au journal. »

---

## 12. Compatibilité et ordre de mise en ligne

Règle 7 de l'exploitation (7.1) : la base d'abord, compatible avec le site en ligne et l'ancien
site (Netlify).

| Changement                                     | Ancien site                                                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `v_evenement` : nom en vigueur, retirés exclus | voit les nouveaux noms ; ne voit plus les retirés : sans erreur                                                                 |
| Politique de `evenement` (mentions en vigueur) | un ministère retiré ne lit plus l'événement : sans erreur                                                                       |
| `evenement_mention` lue en brut                | colonnes `evenement_id`, `ministere_id` gardées ; il peut montrer une mention retirée dans un panneau (passager, sans écriture) |
| Mise à jour d'un événement retiré              | refusée par la base, message générique de l'ancien site                                                                         |
| `date_fin`, `heure_fin` (lot 2)                | il ne les envoie pas : la durée et l'heure de fin sont reprises (S7)                                                            |
| `ajouter_evenement` à 3, 4, 5, 6 arguments     | gardées ; elles délèguent (retrait au lot D de T76)                                                                             |
| Colonnes ajoutées à `v_evenement`              | à la fin, l'ancien site les ignore                                                                                              |

Ordre : **T76 lot A, puis T76 lot B** (numéro anti-doublon), puis **lot 1** (indépendant de T76,
peut partir avant ou en parallèle, migration datée en conséquence), puis **lot 2** (dépend de
`private.envoi` du lot B de T76 et des fonctions du lot 1), puis **lot 3**. Chaque lot : CI verte,
accord écrit, migration en production avant le front, puis vérification sur le cas réel
(Coordination).

---

## 13. Agendas des téléphones

### 13.1 Faits recueillis (sources en fin de document)

- **iCalendar (RFC 5545)** : un fichier `.ics` porte des `VEVENT` ; un `VALARM` dans un `VEVENT`
  décrit un rappel (`ACTION:DISPLAY`, `DESCRIPTION` obligatoire, `TRIGGER:-PT1H`, ou `-P1D`) ; un
  `UID` stable identifie l'événement ; un événement d'un jour entier s'écrit
  `DTSTART;VALUE=DATE` avec un `DTEND` exclusif ; un fuseau nommé exige son `VTIMEZONE`.
- **iPhone** : Safari ouvre un fichier `.ics` téléchargé dans Calendrier (aperçu, « Tout
  ajouter »). Plusieurs développeurs signalent que, depuis une application web posée sur l'écran
  d'accueil en mode autonome, le fichier n'arrive pas à Calendrier ; ce n'est pas notre cas (pas de
  manifeste), mais **un essai sur un vrai iPhone est un critère d'acceptation**. L'abonnement se
  fait dans Calendrier (« Ajouter un calendrier avec abonnement ») ; Apple conseille de ne
  s'abonner qu'à une source de confiance ; sur Mac, un abonnement retire les alertes du flux par
  défaut (case « Supprimer : alertes »).
- **Google Agenda** : l'import d'un `.ics` se fait **sur un ordinateur** (« You can import with
  ICS and CSV files on a computer ») ; l'abonnement par adresse aussi, et la page d'aide dit qu'on
  ne s'abonne pas depuis l'application Android ou iPhone. Un flux est relu par Google **jusqu'à 12
  heures** après (souvent rapporté jusqu'à 24 heures), sans bouton pour forcer. Le sort des
  `VALARM` à l'import et dans un abonnement n'est pas documenté ; un fil de 2019 dit que Google
  applique son propre rappel. À vérifier sur un vrai téléphone Android (Q16).
- **API Google Calendar** : la permission `calendar.events` est « sensible » : sans vérification
  de l'application par Google, 100 utilisateurs au plus sur toute la vie du projet et un écran
  « application non vérifiée » ; la vérification prend des semaines.

### 13.2 (a) Bouton « Ajouter à mon agenda » (fichier `.ics`), recommandé

- **Où** : sous le calendrier (04, 12) : « Ajouter les événements à venir à mon agenda » (tous les
  événements affichés dont le dernier jour est au plus tôt aujourd'hui, ni Annulés ni Terminés) ;
  dans le panneau d'un événement : « Ajouter à mon agenda ». Pour tout profil qui lit l'événement.
- **Contenu** : `PRODID:-//EJP Tech//Pilotage EJP//FR`, `VTIMEZONE` Europe/Paris ; un `VEVENT`
  par événement : `UID:<identifiant>@pilotage-ejp.pages.dev`, `DTSTAMP`, `DTSTART`/`DTEND` en
  heure de Paris (jour entier si pas d'heure ; fin exclusive), `SUMMARY` = nom en vigueur (masqué
  s'il l'est), `DESCRIPTION` = « Coordination. Statut : Validé. Pilotage EJP. », `STATUS`
  (`TENTATIVE` pour Brouillon et En attente, `CONFIRMED` pour Validé et En préparation), et deux
  `VALARM` (Q11) : la veille (`-P1D`) et une heure avant (`-PT1H`) ; pour un jour entier, la
  veille à 18 h (`-PT6H`). Lignes en CRLF, pliées à 75 octets, `,` `;` `\` et retours échappés.
  Une série donne un fichier de N `VEVENT` (pas de `RRULE` : chaque date peut changer seule).
- **Pas de données nouvelles** : rien ne part vers nos serveurs ; la base ne change pas ; le nom
  est déjà lu par la personne. La page Confidentialité gagne une phrase : « Ajouter à mon agenda
  copie le nom et la date dans l'agenda de votre téléphone, qui les garde selon ses propres
  règles. »
- **Limite dite à l'écran** : c'est une copie ; un report, une annulation ou un retrait ne la
  suivent pas (« Si une date change ici, ajoutez l'événement de nouveau. »). Le même `UID` permet
  à Calendrier de reconnaître l'événement (à vérifier : remplacement ou doublon).
- **Code** : une fonction pure `construireIcs()` dans `src/lib/metier/agenda.ts` (testée), un
  composant `LienAgenda` (Blob, `a[download]`). La date de fabrication (`DTSTAMP`) vient de
  l'horloge du téléphone : ce n'est pas une date métier.

### 13.3 (b) Abonnement à un flux par ministère : conçu, Proposé « pas maintenant » (Q12)

Ce qu'il apporte : les changements arrivent tout seuls. Ce qu'il coûte :

1. **Exception à la double authentification** : un agenda relit le flux sans session ; le lien
   seul ouvre la lecture. Toute la sécurité repose sur un secret dans une adresse, que Google et
   Apple gardent sur leurs serveurs et relisent depuis leurs machines.
2. **Lien secret** : 32 octets aléatoires (256 bits), un lien par ministère ; la base ne garde que
   son empreinte (SHA-256) dans une table privée `private.lien_agenda` (ministère, empreinte,
   créé le, par, coupé le, par), sans aucun droit pour les rôles de l'API. Conséquence : le lien
   ne s'affiche qu'une fois ; perdu, on en crée un autre, et les abonnements à l'ancien s'arrêtent.
   Pour un compte partagé (T61), chaque personne doit le recevoir : il circulera (risque principal).
3. **Révocation** : « Remplacer le lien » (ministère, aal2), « Couper le lien » (EJP Tech, aal2),
   coupure automatique à la désactivation ou à la suppression du ministère ; réponse identique
   (404) pour un lien inconnu ou coupé, pour ne rien laisser deviner.
4. **Contenu limité** : événements du ministère et ceux qui le mentionnent, non retirés, de 30
   jours avant à 12 mois après ; nom (masqué s'il l'est), dates, heures, statut, ministère
   porteur ; ni mentions, ni compte, ni journal. Un nom est un texte libre : malgré le rappel, il
   peut contenir un prénom ; il partirait alors chez Google ou Apple sans connexion.
5. **Service** : une Edge Function `agenda` (`verify_jwt = false`, GET seulement, sans CORS,
   `Content-Type: text/calendar`, `Cache-Control: private, max-age=900`, `X-Robots-Tag: noindex`)
   qui hache le jeton et appelle une fonction SQL `private.flux_agenda(empreinte)` réservée à
   `service_role` : la règle de lecture (sections 6.2, 6.3) est écrite une fois, en SQL, testée
   en pgTAP. Pas de fonction Cloudflare Pages : elle mettrait la clé secrète dans un second
   endroit.
6. **Rappels** : un abonnement ne garantit pas les rappels (alertes retirées par défaut sur
   Apple, comportement non documenté chez Google) ; chacun règle les rappels du calendrier abonné.
7. **Délais et quotas** : Google relit en 12 à 24 heures ; un iPhone relit souvent (jusqu'à toutes
   les 15 minutes) : chaque relecture est une invocation d'Edge Function, à mesurer contre le
   quota du plan gratuit. Les journaux des Edge Functions gardent l'adresse, donc le jeton, le
   temps de leur conservation.
8. **Documents** : page Confidentialité (le lien donne à qui le possède les noms et dates des
   événements, sans connexion ; Google et Apple les gardent), registre des traitements, BRIEF
   section 8 (exception), matrice, exploitation (couper un lien).

### 13.4 (c) API Google Calendar : écartée

Il faudrait que chaque personne autorise l'outil sur son compte Google (permission sensible,
vérification de plusieurs semaines ou 100 personnes au plus), garder des jetons par personne (un
secret et une donnée personnelle de plus), écrire une synchronisation (créer, changer, supprimer)
et laisser de côté les iPhone sans Google. Disproportionné pour un outil temporaire.

### 13.5 Comparaison et recommandation

| Critère                     | (a) fichier `.ics`                                 | (b) abonnement                                      | (c) API Google                        |
| --------------------------- | -------------------------------------------------- | --------------------------------------------------- | ------------------------------------- |
| Mise à jour automatique     | non (une copie)                                    | oui, en 15 min (iPhone) à 24 h (Google)             | oui                                   |
| Rappels                     | oui, dans le fichier (iPhone ; Android à vérifier) | non garantis                                        | oui                                   |
| iPhone                      | oui, dans Safari                                   | oui                                                 | seulement avec un compte Google       |
| Google Agenda sur téléphone | à vérifier (Q16)                                   | abonnement à faire sur un ordinateur                | oui                                   |
| Sécurité                    | inchangée                                          | exception à la double authentification, lien secret | jetons par personne                   |
| Base, serveur               | rien                                               | table, fonction, Edge Function                      | beaucoup                              |
| Taille                      | 1,5 jour                                           | 3 jours, plus la décision                           | plus de 5 jours, plus la vérification |

**Recommandation (KISS)** : (a) maintenant ; (b) seulement si, après un mois d'usage, la
coordination dit que les copies ne suffisent pas, avec une décision écrite sur l'exception ; (c)
jamais pour cet outil.

---

## 14. Options écartées

- **Retrait par un statut « Retiré »** dans `statut_evenement` : il se mêlerait au cycle de vie
  (reports, « Rien n'a changé », comptages par statut, choix du statut à l'écran), pourrait être
  suivi d'un autre état, et changer un type énuméré gêne l'ancien site. La personne veut un geste
  différent d'Annulé.
- **Retrait par « Annulé »** (piste de la conception T76 pour un doublon) : fausse les annulés.
  La ligne de l'exploitation (section 12, doublon) dira « retirer ».
- **Effacer** (`DELETE`) un événement créé par erreur : contraire à la règle, perd l'historique.
- **Nom dans `evenement_etat`** : un texte libre dans une table écrite directement par le
  ministère, à modérer à chaque changement de statut.
- **Mentions par une table de changements à part** (sans toucher `evenement_mention`) : évite la
  reprise des lignes existantes, mais deux modèles différents pour les points et les événements ;
  écartée pour la cohérence avec T54 (reste le repli si Q18 est refusée).
- **Série par un seul événement à règle de répétition** (`RRULE` en base) : une date ne pourrait
  plus avoir son statut, son report ni sa ponctualité.
- **Règle de série calculée par la base** (jours, période) : deux calculs (aperçu et base) qui
  peuvent diverger ; la liste explicite de dates est ce que la personne a vu.
- **Mêler plusieurs jours et série** (série de week-ends) : rare, double la complexité.
- **Plusieurs jours compté dans chaque mois touché** : un camp compterait deux fois.
- **Lien « Google Agenda » (modèle d'URL) à la place du fichier** : un événement à la fois,
  rappels réglés par Google ; gardé en repli si Android échoue (Q16).
- **Abonnement servi par Cloudflare Pages** : clé secrète hors de Supabase.

---

## 15. Risques

1. **Série employée pour un événement long** (jeûne de 21 jours en 21 dates) : 21 prévus, 21
   « À faire ». Parade : phrases sous le choix ; limite de 31 ; la question Q17 reste ouverte.
2. **« À faire » d'une série** : 7 dates, 7 mises à jour de statut. Parade : rien dans ce lot ;
   mesurer après un mois (Q17).
3. **Reprise des mentions existantes** (Q18) : suspendre un trigger d'inaltérabilité, même une
   instruction, doit être relu par `rls-auditor` et testé (aucune autre ligne touchée, trigger
   rétabli, même transaction).
4. **Retrait irréversible par erreur** : fenêtre de confirmation, phrase « définitif », journal.
5. **EJP Tech retire un événement passé** : pouvoir nouveau sur les comptages ; tracé au journal
   de la fiche du ministère (au nom du compte d'EJP Tech), lisible par le berger et le conseil.
6. **Ministère retiré des mentions sans le savoir** : l'événement disparaît de chez lui sans
   avis (comme T54).
7. **Fichier `.ics` sur téléphone** : comportement d'Android et de Google non documenté, doublon
   possible à un second ajout. Parade : essai sur un iPhone et un Android avant de livrer (cas
   réel), repli Q16.
8. **Modération d'une série** : 7 lignes identiques à relire. Parade : Q14.
9. **Ancien site** : panneau qui peut montrer une mention retirée, le temps de la redirection.
10. **Volume du journal** : une série de 31 dates avec 8 mentions écrit 31 lignes (et 248
    mentions) ; acceptable.
11. **Dates de fin et changement d'heure** : sans effet (dates sans heure ; les heures restent en
    minutes à l'heure de Paris, règle de T68).

---

## 16. Tests à écrire en premier (échouent avant, passent après), dans l'ordre

### Lot 1

1. `supabase/tests/evenements-retrait.test.sql` : S3 (deux événements identiques de Coordination,
   huit mentions ; retrait de l'un ; `v_evenement` de Coordination et de FIJ : un seul ; prévus
   d'octobre moins 1 ; une ligne `evenement_retire` sans texte ; second retrait : rien ; état
   refusé sur un retiré, pour le porteur ; porteur refusé après la date ; EJP Tech accepté après
   la date ; mentionné, autre, berger, conseil, administration refusés en 42501 ;
   `update`/`delete`/`truncate` refusés même au propriétaire ; aal1 refusé).
2. `evenements-titre.test.sql` : S4 et S13 (nom en vigueur dans `v_evenement`, `evenement.titre`
   inchangé, journal sans aucun des deux textes, même nom : rien, 0 et 81 caractères refusés,
   retiré refusé, droits des sept profils, masquage d'une seule version, `v_textes_a_relire`).
3. `evenements-mentions-modifiables.test.sql` : S5 et S10 (FIJ ne lit plus `evenement`,
   `evenement_etat`, `v_evenement` ; Accueil lit ; deux lignes de journal ; dernier jour passé
   refusé ; désactivé : retrait permis, ajout refusé ; soi-même refusé ; `mention_unique` ; lignes
   reprises : date et auteur de leur événement, aucune autre ligne touchée, trigger rétabli).
4. `rls-evenements-matrice.test.sql` et `structure.test.sql` : nouvelles lignes de la matrice
   (section 10.4) pour les sept profils, aal1 et anonyme ; listes fermées des tables et triggers.
5. `evenements-comptages.test.sql` : un retiré ne compte dans aucune colonne ni dans « depuis ».
6. Vitest : panneau de l'événement (états de la section 8.2, dont l'action impossible avec sa
   raison), fenêtre de retrait, textes sans tiret long.
7. Playwright (1440, 834, 390 px) : S3 de bout en bout (Coordination retire, FIJ ne voit plus).

### Lot 2

8. `evenements-plages.test.sql` : S6 et S7 (un prévu en octobre ; pas « passé » le 1er nov. ;
   heure de début le premier jour ; 32 jours refusés ; fin avant début refusée ; report sans
   `date_fin` qui garde la durée ; journal avec `date_fin`).
9. `evenements-serie.test.sql` : S1, S2, S8 (7 événements, 56 mentions, 7 lignes ; 5 prévus en
   novembre, 2 en décembre ; 32 dates refusées ; date passée refusée ; même numéro : même série ;
   numéro et autres dates : refus ; retirer, corriger, mentions sur toute la série).
10. Vitest : `datesDeSerie()` (jours de la semaine, limites, années bissextiles), formulaire à
    trois cases (champs, aperçu, bouton qui dit le nombre, erreurs).
11. Playwright : S1 à 390 px (Coordination saisit, FIJ voit 7 lignes).

### Lot 3

12. Vitest : `construireIcs()` (CRLF, pliage à 75 octets, échappement, `VTIMEZONE`, jour entier
    et heures, plusieurs jours, série en N `VEVENT`, deux `VALARM`, `UID` stable, nom masqué, aucun
    champ en plus).
13. Playwright : téléchargement (événement `download`, contenu du fichier).
14. **Cas réel, à la main** : S11 sur un iPhone (Safari et icône de l'écran d'accueil) et sur un
    Android avec Google Agenda ; résultat noté avant la mise en ligne.

---

## 17. Lots, ordre, taille

| Lot                                   | Migrations                   | Fichiers (environ) | Contenu                                                                                                                                                             | Taille   |
| ------------------------------------- | ---------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1 : nom, mentions, retrait            | 1 (`evenements_corrections`) | 30                 | tables, fonctions, vue, comptages, journal, modération ; panneau (3 gestes), données, schémas Zod, textes, libellés du journal, tests                               | 3 jours  |
| 2 : plusieurs jours, série            | 1 (`evenements_plages`)      | 35                 | colonnes, trigger, vue, comptages, 2 fonctions d'ajout, 3 de série ; formulaire à trois cases, aperçu, calendrier, « Vos saisies », portée dans les fenêtres, tests | 4 jours  |
| 3 : agenda `.ics`                     | 0                            | 10                 | `agenda.ts`, `LienAgenda`, calendrier et panneau, Confidentialité (une phrase), tests, essai sur téléphones                                                         | 1,5 jour |
| 4 : abonnement (plus tard, si décidé) | 1 (`lien_agenda`)            | 20                 | table privée, fonctions, Edge Function, écran du lien, Confidentialité, registre, exploitation, BRIEF section 8                                                     | 3 jours  |

**Ordre recommandé** : T76 A et B ; **lot 1** (il règle le doublon du 26 octobre) ; **lot 2** ;
**lot 3**. Le lot 3, front seul, peut passer avant le lot 2 si la coordination attend surtout
l'agenda : il faudra alors ajouter la fin des plages à `construireIcs()` au lot 2 (une demi-
journée). Le lot 4 attend la décision Q12.

---

## 18. Questions « Proposé » (décision T78 à écrire après les réponses)

- **Q1.** Les deux formes de plage, choisies par « Quand ? » : « Un jour », « Plusieurs jours »,
  « Se répète ». **Proposé : oui.**
- **Q2.** Série : 31 dates au plus, 12 mois au plus, par jours de la semaine, sans date sur
  plusieurs jours. **Proposé : oui.**
- **Q3.** Plusieurs jours : 31 jours au plus ; compté une fois, dans le mois du premier jour ;
  « passé » après le dernier jour ; ponctualité au début du premier jour. **Proposé : oui.**
- **Q4.** Heure de fin facultative, qui se corrige mais ne s'efface pas, sans effet sur les
  comptages. **Proposé : oui.**
- **Q5.** Nom : le porteur seul, à tout moment tant que l'événement n'est pas retiré ; l'ancien
  nom affiché sur une ligne à ceux qui lisent l'événement. **Proposé : oui.**
- **Q6.** Mentions : le porteur seul (pas le berger ni le conseil, à la différence des points),
  jusqu'au dernier jour compris. **Proposé : oui.**
- **Q7.** Retrait : le porteur jusqu'au dernier jour compris, EJP Tech à tout moment ; définitif ;
  sans motif. **Proposé : oui.**
- **Q8.** Série : « Cet événement seulement » ou « Toute la série » pour le nom, les mentions (dates
  à venir) et le retrait (dates à venir pour le porteur). **Proposé : oui.**
- **Q9.** Journal : une ligne par événement créé, par mention ajoutée ou retirée, par retrait
  (exception à la règle 10, comme T54). **Proposé : oui.**
- **Q10.** Un ministère encore mentionné lit les lignes brutes de mentions et de retraits de
  mention (comme le Proposé de T54). **Proposé : oui.**
- **Q11.** Agenda : deux rappels, la veille et une heure avant (jour entier : la veille à 18 h).
  **Proposé : oui.**
- **Q12.** Abonnement (flux) : pas maintenant ; à rouvrir après un mois d'usage du bouton, avec une
  décision écrite sur l'exception à la double authentification. **Proposé : oui.**
- **Q13.** API Google : écartée. **Proposé : oui.**
- **Q14.** Modération : une ligne par série dans les textes à relire ; masquer le nom d'une date
  masque celui de toute la série. **Proposé : oui.**
- **Q15.** Sous les mentions de l'ajout : « Vous pourrez les changer jusqu'à la date de
  l'événement. ». **Proposé : oui.**
- **Q16.** Si Google Agenda sur Android n'ouvre pas le fichier : ajouter « Ouvrir dans Google
  Agenda » (un événement à la fois, rappels réglés par Google). **Proposé : décider après l'essai
  sur téléphone.**
- **Q17.** Mettre à jour plusieurs dates d'une série en un geste (par exemple « Terminé ») : hors
  de ce lot, à rouvrir si les « À faire » pèsent. **Proposé : oui.**
- **Q18.** Reprise des mentions existantes (date et auteur de leur événement) en suspendant le
  trigger d'inaltérabilité le temps d'une instruction, dans la migration. **Proposé : oui** (repli :
  table de changements à part, section 14).

---

## 19. Documents à mettre à jour (avec les lots)

- `docs/decisions.md` : T78 (révise T32 et la règle 14 ; complète T54, T68, T76).
- `BRIEF.md` : section 3 (règles 1, 10, 14), section 6 (tables, colonnes, journal), section 7
  (matrice, fonctions), section 9 (formulaire 11, panneau, calendrier, Vos saisies), section 11.
- `CLAUDE.md` : liste « ajout seulement » et texte de la section 11.
- `docs/reference/maquettes/LISEZMOI.md` : écarts (trois cases, panneau, agenda).
- `docs/conception/aides-contextuelles.md`, guide de rédaction : textes de la section 8.
- `docs/exploitation.md` : section 12 (doublon : retirer, pas Annulé) ; lot 4 seulement :
  couper un lien.
- Page Confidentialité (lot 3 : une phrase ; lot 4 : la section du flux) et registre (lot 4).
- Conception T76 : la ligne « le passer Annulé » devient « le retirer ».

---

## Sources (agendas, consultées le 26 octobre 2026)

- RFC 5545, iCalendar (`VEVENT`, `VALARM`, `VTIMEZONE`, `UID`) : https://www.rfc-editor.org/rfc/rfc5545
- Google Agenda, importer des événements : https://support.google.com/calendar/answer/37118
- Google Agenda, s'abonner à un agenda : https://support.google.com/calendar/answer/37100
- Délai de relecture des flux par Google (12 heures, rapporté) : https://help.cheqroom.com/articles/1000547-how-often-does-google-update-it-s-calendar-feeds
- Lien d'abonnement Google (`render?cid=webcal://...`) et relecture de moins d'une fois par jour : https://til.simonwillison.net/ics/google-calendar-ics-subscribe-link
- Rappel imposé par Google à l'import (fil de 2019) : https://support.google.com/calendar/thread/9627602
- Apple, abonnements dans iCloud (iOS 18 et 26) : https://support.apple.com/102301
- Apple, Calendrier sur Mac, abonnement (« Supprimer : alertes », actualisation) : https://support.apple.com/guide/calendar/icl1022/mac
- `.ics` et application web en mode autonome sur iPhone : https://developer.apple.com/forums/thread/744029
- Safari ouvre un `.ics` téléchargé dans Calendrier : https://orionfeedback.org/d/1352-open-downloaded-ics-files-in-calendarapp
- Google, permissions sensibles et limite de 100 utilisateurs : https://support.google.com/cloud/answer/13463817
