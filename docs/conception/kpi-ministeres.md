# KPI des ministères : analyse d'impact et conception

Statut : **à l'étude, non appliqué** (décisions P15 à P30, T26 et T27 de `docs/decisions.md`) : rien
ne s'applique tant que la coordination et EJP Tech n'ont pas répondu. Rien n'est codé, aucune
migration n'est écrite, `BRIEF.md` n'est pas modifié.
Date : 5 octobre 2026.

Source : `docs/sources/kpi-coordination-2026-10.md`.

## 1. Source et périmètre

### Ce que demande la coordination

La coordination a transmis à EJP Tech, le 5 octobre 2026, une liste de KPI pour un « Dashboard des
ministères EJP », avec cette consigne : « Merci de prendre en compte les KPI proposés ci-dessous
pour vos ministères et d'en ajouter si besoin. » Chaque ministère y a sa liste : des comptes, des
taux, des cumuls, des graphiques, des intitulés de dispositifs et une règle de confidentialité.

### Ce que la liste ne dit pas

- **Le destinataire.** La liste parle d'un « Dashboard des ministères EJP ». Rien ne dit si elle
  vise Pilotage EJP, un outil temporaire (BRIEF, section 1 ; fin de vie décidée en P13), ou une
  application complète (BRIEF, section 11). Ce document propose pourtant une étape de plus, 6 à 9
  jours de travail avant la mise en service (section 7) : voir C1.
- **Son état.** La consigne « d'en ajouter si besoin » s'adresse aux ministères, avec une échéance au
  3 octobre déjà passée à la réception de la liste (5 octobre). La liste n'est peut-être pas
  définitive : voir C2.
- **Ses lecteurs.** La note de Santé parle d'un « dashboard général », ce qui suppose une vue large
  des KPI de tous les ministères. Qui doit les voir, le berger et le conseil seulement ou tous les
  ministères, n'est pas dit : voir C3. Ce document suit la règle actuelle des indicateurs propres :
  le ministère, le berger et le conseil.

### Ce que l'outil prévoit aujourd'hui

- Trois indicateurs communs, saisis par chaque ministère : STARs au service (chaque dimanche), STARs
  actifs et « dont en FIJ » (à ce jour). S'y ajoutent la carte des FIJ et les sessions d'église.
- Des indicateurs propres à un ministère : créés par EJP Tech par migration, sur demande écrite de
  l'administration de l'église ; nature « dimanche » ou « à ce jour » ; valeur entière de 0 à 9999 ;
  affichés sur la fiche du ministère, jamais sur la vue de l'église (BRIEF, section 4).

### Écart d'échelle

|                     | Liste de la coordination | Prévu aujourd'hui                      |
| ------------------- | ------------------------ | -------------------------------------- |
| Ministères          | 22                       | 8 dans le jeu d'exemple                |
| Indicateurs propres | 176 KPI et 9 graphiques  | 6 dans la liste V1 de P08              |
| Par ministère       | jusqu'à 19 KPI (MCAD)    | 3 chiffres communs, moins d'une minute |

- Cinq ministères portent le même nom dans la liste et dans le jeu d'exemple : Communication,
  Intégration, Coordination, Social, Prodiges Junior.
- Deux semblent correspondre sous un autre nom : Coordo FIJ et FIJ (K46), Formation et EJP
  Formation (K50).
- Jeunesse n'existe que dans le jeu d'exemple.
- Quinze sont nouveaux : Film, Tech, MCAD, MPI, Santé, Merch, Production, Prodiges Musique, Kumi,
  Eagles, Entretien, Multilingue, Sécurité, Protocole et MDS.

### Contenu de la liste

| Élément                                                                                                                                            | Nombre  |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| KPI (lignes chiffrées ou à chiffrer)                                                                                                               | 176     |
| Graphiques demandés                                                                                                                                | 9       |
| **Demandes analysées**                                                                                                                             | **185** |
| Intitulés de format ou de dispositif (Prière des Stars, Chaîne de prière, Sainte cène, Les Pages Roses, Call your sister, La plate-forme d'écoute) | 6       |
| Règle (Santé : aucune donnée médicale individuelle dans le tableau de bord), déjà appliquée par l'outil                                            | 1       |
| Ministère sans KPI (Protocole)                                                                                                                     | 1       |

Chaque demande est classée une à une dans l'annexe (185 lignes) : catégorie, nature proposée,
conformité aux règles du BRIEF, destination et question. Les tableaux de la section 2 en sont le
total. Ce classement ne tranche rien. Les sigles que la liste ne définit
pas (NC, PCNC) ne sont pas interprétés : voir les questions.

### Charge de saisie

Aujourd'hui, un ministère saisit trois chiffres le dimanche, en moins d'une minute (BRIEF,
section 9). Chaque indicateur de plus demande une saisie régulière ; un indicateur peu saisi donne
des totaux incomplets et des courbes trouées. C'est la raison du plafond de six indicateurs saisis
par ministère pour la mise en service (P29).

## 2. Vue d'ensemble

Chiffres tirés de l'annexe, qui classe les 185 demandes une à une.

### Par conformité

| Conformité   | Sens                                                                              | Nombre  |
| ------------ | --------------------------------------------------------------------------------- | ------- |
| Conforme     | entre tel quel : nature existante, plafond de 9999, sens clair                    | 19      |
| À adapter    | possible, avec une décision, une précision ou un changement du modèle             | 153     |
| Non conforme | suivi de personnes, délai par objet, liste ou classement : à remplacer ou retirer | 13      |
| **Total**    |                                                                                   | **185** |

### Par catégorie

| Catégorie                          | Exemples                                              | Nombre  |
| ---------------------------------- | ----------------------------------------------------- | ------- |
| Compte par période (semaine, mois) | publications, demandes, incidents, articles vendus    | 46      |
| Valeur calculée                    | NA cumulés, taux de résolution, panier moyen          | 18      |
| Compte « à ce jour »               | stock, projets en cours, inscrits, badges actifs      | 16      |
| Compte du dimanche                 | NA du dimanche, cultes captés, enfants présents       | 9       |
| Sens à préciser                    | présence au culte, taux de participation              | 17      |
| Chiffre de plateforme externe      | portée, vues, profils des Pages Roses                 | 7       |
| Doublon ou conflit                 | vues cumulées de Film et MCAD, bénévoles actifs       | 18      |
| Comptage d'événements              | prévus, réalisés, annulés, reportés, couverts         | 11      |
| Suivi de personnes                 | taux de retour des NA, participants uniques           | 14      |
| Activité propre                    | Welcome Prodiges, Prière des Stars, baptêmes          | 5       |
| Domaine sensible                   | prises en charge (Santé, Kumi, Eagles), bénéficiaires | 8       |
| Graphique                          | évolution NA et NC, demandes et incidents             | 9       |
| Financier                          | chiffre d'affaires, marge, fonds levés, budget        | 4       |
| Non numérique                      | heure de début du culte, articles les plus vendus     | 3       |
| **Total**                          |                                                       | **185** |

### Par destination proposée

La destination dit ce que chaque demande devient si les décisions P15 à P30, T26 et T27 sont
prises. Elle est proposée, pas décidée.

| Destination  | Ce que cela demande                                                                                                                         | Nombre  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Actuel       | indicateur propre « dimanche » ou « à ce jour » : une migration suffit (28 sans changement, 3 demandent un plafond plus haut, T26)          | 31      |
| Mois         | compte du mois : nouvelle nature « mois » (P16) ; 10 sont sensibles et n'acceptent que les mois écoulés (P22)                               | 68      |
| Calculé      | cumul, taux, moyenne, évolution ou comptage d'événements : jamais saisi (P19, P20)                                                          | 23      |
| À préciser   | sens, période ou dénominateur manquant : réponse de la coordination d'abord                                                                 | 27      |
| Commun       | déjà couvert par « STARs au service », « STARs actifs » ou un autre ministère : rien à créer (2 certains, 10 par hypothèse à vérifier, P26) | 12      |
| Remplacé     | suivi de personnes, ou délai suivi objet par objet : compte agrégé ou retrait (P21)                                                         | 11      |
| Courbe       | graphique demandé (section 6)                                                                                                               | 7       |
| Activité     | valeur par activité datée : nature « jour », phase 2 (P17)                                                                                  | 3       |
| Hors mesures | texte ou liste : point d'attention, ou retrait                                                                                              | 3       |
| **Total**    |                                                                                                                                             | **185** |

À retenir : moins d'une demande sur cinq (31) entre dans le modèle actuel. La nature « mois » en
débloque 68 de plus. Le reste se calcule, se précise ou se retire.

### Par ministère

Conformité : conformes / à adapter / non conformes. Colonnes suivantes : destinations proposées.

| Ministère        | Demandes | Conformité        | Commun | Actuel | Mois   | Activité | Calculé | Courbe | Hors mesures | Remplacé | À préciser |
| ---------------- | -------- | ----------------- | ------ | ------ | ------ | -------- | ------- | ------ | ------------ | -------- | ---------- |
| Intégration      | 15       | 2 / 9 / 4         | 0      | 2      | 1      | 1        | 3       | 2      | 0            | 4        | 2          |
| Coordination     | 11       | 0 / 11 / 0        | 0      | 1      | 0      | 1        | 7       | 1      | 0            | 0        | 1          |
| Communication    | 9        | 0 / 9 / 0         | 0      | 2      | 4      | 0        | 0       | 1      | 0            | 0        | 2          |
| Social           | 7        | 0 / 7 / 0         | 0      | 0      | 5      | 0        | 1       | 0      | 0            | 0        | 1          |
| Film             | 9        | 1 / 7 / 1         | 0      | 1      | 5      | 0        | 1       | 0      | 0            | 1        | 1          |
| Tech             | 8        | 1 / 6 / 1         | 0      | 1      | 3      | 0        | 1       | 1      | 0            | 1        | 1          |
| MCAD             | 19       | 2 / 17 / 0        | 1      | 3      | 9      | 0        | 1       | 0      | 0            | 0        | 5          |
| MPI              | 12       | 2 / 9 / 1         | 0      | 4      | 1      | 1        | 2       | 1      | 0            | 1        | 2          |
| Santé            | 7        | 0 / 7 / 0         | 1      | 0      | 5      | 0        | 0       | 0      | 0            | 0        | 1          |
| Merch            | 9        | 2 / 6 / 1         | 0      | 2      | 3      | 0        | 2       | 0      | 1            | 0        | 1          |
| Production       | 5        | 3 / 2 / 0         | 0      | 3      | 1      | 0        | 0       | 0      | 1            | 0        | 0          |
| Prodiges Musique | 4        | 0 / 4 / 0         | 0      | 0      | 2      | 0        | 0       | 1      | 0            | 0        | 1          |
| Kumi             | 13       | 0 / 13 / 0        | 2      | 2      | 7      | 0        | 0       | 0      | 0            | 0        | 2          |
| Eagles           | 8        | 0 / 8 / 0         | 1      | 0      | 5      | 0        | 0       | 0      | 0            | 0        | 2          |
| Entretien        | 7        | 0 / 5 / 2         | 1      | 1      | 3      | 0        | 0       | 0      | 1            | 1        | 0          |
| Coordo FIJ       | 2        | 0 / 1 / 1         | 0      | 0      | 0      | 0        | 0       | 0      | 0            | 1        | 1          |
| Multilingue      | 8        | 0 / 8 / 0         | 1      | 2      | 4      | 0        | 0       | 0      | 0            | 0        | 1          |
| Sécurité         | 7        | 0 / 7 / 0         | 1      | 0      | 4      | 0        | 1       | 0      | 0            | 0        | 1          |
| Formation        | 6        | 0 / 5 / 1         | 1      | 2      | 0      | 0        | 1       | 0      | 0            | 1        | 1          |
| Protocole        | 0        | 0 / 0 / 0         | 0      | 0      | 0      | 0        | 0       | 0      | 0            | 0        | 0          |
| MDS              | 12       | 5 / 7 / 0         | 2      | 3      | 5      | 0        | 2       | 0      | 0            | 0        | 0          |
| Prodiges Junior  | 7        | 1 / 5 / 1         | 1      | 2      | 1      | 0        | 1       | 0      | 0            | 1        | 1          |
| **Total**        | **185**  | **19 / 153 / 13** | **12** | **31** | **68** | **3**    | **23**  | **7**  | **3**        | **11**   | **27**     |

## 3. Impact sur le modèle de données

Rappel : une migration suivie par git est figée. Chaque changement ci-dessous est une **nouvelle**
migration ; les tables d'ajout seulement (`mesure`, `evenement_etat`) le restent.

### 3.1 Ce qui tient aujourd'hui

31 demandes entrent dans le modèle actuel : des comptes du dimanche (NA et NC du dimanche, cultes
captés, sainte cène distribuées, enfants présents, espaces Care) et des comptes « à ce jour »
(projets en cours, stock, inscrits, langues couvertes, badges actifs). Pour elles, une migration
ajoute des lignes à `indicateur` (libellé de 60 caractères au plus, nature, ministère, ordre). Rien
ne change dans les tables, la RLS, les vues de l'église ni les tests, sauf le catalogue de la
section 3.8.

3 de ces 31 dépassent 9999 (portée, abonnés et vues de Communication, spectateurs du direct de MCAD) :
voir 3.4. Les vues cumulées de Film et de MCAD, le chiffre d'affaires et les fonds levés demandent
aussi un plafond plus haut, mais ils sont « À préciser » ou « Mois ». Au total : 28 demandes
dans le modèle actuel tel quel, 31 après T26 (plafond par indicateur).

### 3.2 Comptes par période (semaine, mois)

68 demandes se comptent sur une période : publications, campagnes, demandes, incidents, actions
sociales, prises en charge, articles vendus, nouveaux STARs, intégrations en FIJ de l'année. Le modèle n'a que « dimanche » et « à
ce jour ». Le BRIEF prévoit une convention : un indicateur « ce mois » devient « à ce jour », remis
à zéro par le ministère chaque mois.

| Option                  | Principe                                                                        | Avantages                                                                                                                                                                                                    | Limites                                                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Convention du BRIEF  | « à ce jour », remis à zéro chaque mois                                         | aucune migration de structure                                                                                                                                                                                | `date_ref` est posée par la base à la date du jour : le total de septembre saisi le 2 octobre compte pour octobre ; remise à zéro oubliée ; série et cumul de l'année peu fiables |
| B. Semaine = dimanche   | nature « dimanche » ; la valeur couvre la semaine du lundi au dimanche          | aucune migration de structure ; mais `v_total_dimanche` ne couvre que les indicateurs communs (filtre `i.ministere_id is null`) : complétude, écart et courbe seraient à écrire pour les indicateurs propres | oblige à saisir chaque semaine des chiffres mensuels ; petits nombres par semaine dans les domaines sensibles                                                                     |
| **C. Nature « mois »**  | `date_ref` est le 1er jour du mois ; la saisie la plus récente du mois fait foi | mois écoulé saisi après coup ; total, cumul et complétude par mois                                                                                                                                           | migration, trigger, vues, formulaire et tests                                                                                                                                     |
| D. Périodicité au choix | semaine, mois, trimestre ou année, fixée par indicateur                         | souple                                                                                                                                                                                                       | plus de cas à tester et à afficher ; ministères incomparables entre eux                                                                                                           |

**Recommandation** : C, et B pour ce qui est vraiment hebdomadaire et lié au dimanche. Pas de
nature « année » : l'année se calcule (somme des mois, ou valeur « à ce jour »). Le formulaire
propose le mois en cours (« Octobre 2026, en cours ») et les deux précédents, sauf pour les
indicateurs sensibles (4.2), qui n'acceptent que les mois écoulés. L'indicateur d'exemple
« Visuels livrés ce mois » n'existe que dans `seed.sql` : il passe en « mois » sans migration de
données, mais plusieurs tests pgTAP en dépendent (voir « Tests existants touchés »).

- **Migration** : nouveau contrôle sur `indicateur.nature` (`'dimanche', 'a_ce_jour', 'mois'`),
  par suppression puis ajout de la contrainte ; dans `private.controler_mesure`, refus d'une date
  qui n'est pas un 1er du mois ou d'un mois futur (heure de Paris), et du mois en cours pour un
  indicateur sensible (4.2) ; vues `v_mesure_mois` (saisie la
  plus récente par indicateur, ministère et mois), séries de 12 mois, cumul de l'année. Aucun
  changement de RLS, de GRANT ni de journal : c'est toujours `mesure`, en ajout seulement.
- **Tests** : pgTAP (date qui n'est pas un 1er, mois futur, mois en cours refusé pour un indicateur
  sensible, la plus récente gagne, changement de mois à minuit heure de Paris, ministère désactivé,
  cumul et complétude) ; Vitest (libellés de mois, formulaire).
- **Tests existants touchés** (étape 4a) : `integrite.test.sql` (lignes 168 à 180) et
  `rls-chiffres-saisies.test.sql` (lignes 25 et 79) insèrent « Visuels livrés ce mois » avec
  `private.aujourdhui()`. Avec le nouveau contrôle `before insert`, le trigger refuse cette date
  (ce n'est pas un 1er du mois) avant la RLS, et `throws_ok(..., '42501')` échoue : le seed et ces
  tests prennent un `date_ref` au 1er du mois, et les codes d'erreur attendus sont à revoir.
  `jeu-exemple.test.sql` (ligne 105) attend 11 envois de chiffres pour Communication ; si les
  visuels quittent l'envoi du dimanche, ce nombre change.
- **Nature « dimanche » saisie le dimanche matin** : la chaîne de prière et la nuit du samedi au
  dimanche (MPI) se saisissent souvent le dimanche avant 12 h. Le formulaire propose alors le
  dimanche de référence (règle 11 du BRIEF), c'est-à-dire le dimanche précédent : la date serait
  fausse. Proposition : pour ces indicateurs, proposer le dimanche du jour quand on est dimanche (la
  base accepte déjà un dimanche égal à `aujourdhui()`), ou ajouter une aide sous le champ (K36).

### 3.3 Activités et sessions propres à un ministère

Demandes concernées : Welcome Prodiges (Intégration), sessions de baptême (Coordination), Prière
des Stars et chaîne de prière (MPI), répétitions (Prodiges Musique), activités de Kumi et
d'Eagles, sessions de Formation et de Prodiges Junior, exercices de Sécurité.

| Option                                      | Avantages                                                                                     | Limites                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Session d'église « Autre rassemblement » | existe                                                                                        | déclarée par l'administration, saisie par tous les ministères attendus, présents comptés en STARs avec « déjà comptés », affichée sur la vue de l'église : ce n'est pas le même objet pour une activité d'un seul ministère (Welcome Prodiges compte peut-être des NA, K18) ; c'est le bon pour un rassemblement de plusieurs ministères (D2, K35) |
| B. Indicateur « dimanche »                  | existe                                                                                        | seulement si l'activité a lieu le dimanche (chaîne de prière, sainte cène, enfants)                                                                                                                                                                                                                                                                |
| C. Comptes du mois                          | nature « mois » de 3.2 : activités du mois et présents du mois                                | pas de chiffre ni de courbe par activité                                                                                                                                                                                                                                                                                                           |
| D. Nature « jour »                          | une valeur par activité, datée d'aujourd'hui ou avant ; total, moyenne et courbe par activité | pas de complétude possible (personne ne déclare les activités prévues, K57) ; deux activités le même jour se confondent                                                                                                                                                                                                                            |
| E. Table d'activités                        | complétude possible                                                                           | nouvelle table, RLS, fonctions et écrans : presque une étape entière ; le BRIEF met le comptage des événements hors V1 (section 11)                                                                                                                                                                                                                |

**Recommandation** : B quand l'activité a lieu le dimanche ; C en phase 1 ; D en phase 2 si la
coordination confirme le besoin d'un chiffre par activité (K18, K21, K35, K42). Ni A ni E tant que les réponses manquent : si la Prière des Stars ou Welcome Prodiges réunit les STARs de plusieurs ministères, A redevient la bonne réponse (règle 5 du BRIEF et D2 : chaque ministère saisit ses présents, un STAR n'est compté qu'une fois).

- **Migration (phase 2)** : `'jour'` ajouté au contrôle de `indicateur.nature` ; refus d'une date
  future dans `controler_mesure` ; vue des valeurs par activité.
- **Tests** : date future refusée, correction d'une même date, moyenne et total.

### 3.4 Unités, plafond, durées, heures et pourcentages

- **Plafond de 9999** : portée, abonnés, vues cumulées, spectateurs, peut-être chiffre d'affaires et
  fonds levés. Options : relever le plafond pour tous (une faute de frappe sur les STARs passerait) ;
  saisir en milliers (perte de précision, source d'erreurs) ; **plafond par indicateur**, colonne
  `indicateur.valeur_max` (9999 par défaut) contrôlée par le trigger `controler_mesure`, le contrôle
  de `mesure.valeur` devenant « 0 ou plus ». Recommandation : plafond par indicateur.
- **Unité** : colonne `indicateur.unite` (`nombre` par défaut, `euros`, `minutes`, `jours`), pour
  l'affichage seulement (« 5 164 € », « 12 min »). Montants arrondis à l'euro.
- **Décimales** : aucune. Pourcentages et moyennes sont seulement calculés (3.7), arrondis à
  l'affichage comme le pourcentage FIJ.
- **Durées et délais** (délai moyen de production, temps moyen de résolution, délai d'attente) : il
  faudrait une date de début et de fin par projet ou par demande, que l'outil ne suit pas. On les
  remplace par un compte (« problèmes résolus en plus de 7 jours ce mois ») ou on les retire (K29,
  K31, K45).
- **Heure de début du culte** : une heure n'est pas un compte. Proposition : « Retard du début du
  culte », en minutes, chaque dimanche (unité minutes, 0 si à l'heure) (K22). « Événements commencés
  à l'heure » : compte du mois, rapporté aux événements tenus, ou retrait.
- **Migration** : colonnes `unite` (liste fermée), `valeur_max` (entier positif) et
  `sensible` (booléen, faux par défaut, 4.2) ; nouveau contrôle de `mesure.valeur` ; trigger mis à jour.
- **Tests** : une valeur au-dessus du plafond refusée, acceptée pour un indicateur à plafond plus
  haut ; les indicateurs communs gardent 9999.

### 3.5 Textes, listes et intitulés

- **Articles les plus vendus** (Merch) : un classement, pas un compte. Retrait, ou quelques
  catégories fixes avec un compte chacune si la coordination les définit (K39).
- **Besoins en matériels** (Entretien), **besoin de location** (Production) : un point d'attention
  (280 caractères, rappel sur les données personnelles), pas une mesure.
- **Détails joints à un chiffre** (Production : « formation cadrage/montage + formation photo ;
  1 Mag annulé (Mars) », devis de 5 164 €) : seul le nombre se saisit. Un mag annulé est un état
  d'événement s'il existe dans l'outil. Rien ne se rétrodate : une valeur saisie aujourd'hui date
  d'aujourd'hui.
- **Intitulés de groupes** (Prière des Stars, Chaîne de prière, Sainte cène, Captation / diffusion,
  Audience, Qualité / incidents, Équipe, Les Pages Roses, Call your sister, La plate-forme
  d'écoute, Stars, Badges) : colonne `indicateur.groupe` (40 caractères au plus, facultative) pour
  ranger la fiche et les formulaires (section 6).

### 3.6 Événements

États existants : brouillon, attente de validation, validé, en préparation, terminé, annulé ; la
ligne d'état la plus récente fait foi et porte la date.

| Demande                                                         | Règle de calcul proposée                                                                                                    |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Réalisés                                                        | dernier état « Terminé », date dans la période                                                                              |
| Prévus                                                          | dernier état « Validé » ou « En préparation », daté d'aujourd'hui ou après (brouillon et attente de validation exclus, K10) |
| Annulés                                                         | dernier état « Annulé », date dans la période                                                                               |
| Reportés                                                        | une ligne d'état porte une date plus tardive que la ligne précédente : lu dans l'historique, sans nouvel état               |
| Taux de réalisation                                             | réalisés divisés par réalisés plus annulés, ou par prévus (K10)                                                             |
| Activités réalisées (Kumi, Eagles), événements de l'année (MDS) | même règle « Terminé », si ces activités sont déclarées comme événements                                                    |

- **« Reporté »** : option A, nouvel état `reporte` (nouvelle migration sur le type, libellés,
  formulaires, `v_tableau_ministeres` et tests à reprendre) ; option B, **calcul sur l'historique**
  (recommandée) : le ministère met déjà la date à jour quand il déplace un événement (P09).
- **Visibilité** : un ministère ne lit que ses événements. Si Coordination doit compter ceux de tous les
  ministères (K11), il faut une fonction de lecture qui ne lui rend que des totaux de l'église par
  mois, sans titre et sans détail par ministère : pour les autres ministères, P06 ne permet que le
  nom, la fraîcheur et le prochain événement.
- **Événements « couverts »** (MCAD, Santé, Production, Multilingue, Sécurité) : rien ne relie un
  événement aux ministères qui le couvrent, et un ministère ne voit pas les événements des autres.
  Option A, **compte du mois saisi par chaque ministère** (recommandée), sans total de l'église (le
  même événement serait compté plusieurs fois) ; option B, table `evenement_couverture` et
  visibilité des titres et dates de tous les événements pour tous les ministères : changement de
  modèle et de RLS, phase 3 au plus tôt (K9).
- **Migration (phase 2)** : une vue des comptages par ministère, état et mois, tirée de
  `evenement_etat`. **Tests** : report détecté, dernier état gagnant, visibilité par profil, dont Coordination qui ne lit aucun détail par ministère.

### 3.7 Valeurs calculées

Même règle que le pourcentage FIJ : un taux, une moyenne, un cumul ou une évolution ne se saisit
jamais ; il se calcule à partir de comptes saisis et s'affiche avec sa complétude ; « Non calculé »
si le dénominateur manque ou vaut zéro.

| Type                                                                 | Exemples                                                                            | Complétude affichée                                                                                                                                   |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cumul depuis le 1er janvier d'un indicateur « dimanche » ou « mois » | NA cumulés, baptisés de l'année, actions de l'année, intégrations en FIJ de l'année | « 38 dimanches sur 40 », « 9 mois sur 10 » : périodes attendues depuis le 1er janvier ou depuis la création de l'indicateur, la plus récente des deux |
| Ratio de deux indicateurs du même ministère, même période            | demandes résolues sur reçues, enfants présents sur inscrits                         | mois ou dimanches qui ont les deux valeurs, sur les périodes attendues                                                                                |
| Moyenne par activité (phase 2)                                       | présents par session de Welcome Prodiges                                            | sans complétude possible : personne ne déclare les activités prévues ; l'écran dit seulement « 12 activités saisies » (K57)                           |
| Évolution                                                            | courbe de 10 dimanches ou de 12 mois                                                | trous et cercles vides, comme l'église                                                                                                                |

La règle 13 du BRIEF ne définit pas la complétude dans le temps : elle se complète à la
confirmation de P19. Une valeur de nature « jour » (3.3) n'a, elle non plus, aucune complétude
possible.

- **Déclaration** : un indicateur propre n'a pas de code (`code` est vide quand `ministere_id` est
  rempli) ; le code de l'interface ne peut donc pas le nommer. Proposition : nouvelle table
  `indicateur_calcul` (ministère, libellé, type, numérateur, dénominateur, ordre), écrite par
  migration, lue comme `indicateur` (rien pour EJP Tech), et une vue `v_calcul`.
- **Dénominateurs absents de la liste** : demandes reçues et délai de référence (Communication),
  interactions (Communication), événements à couvrir (MCAD, Santé, Multilingue), postes à tenir et
  postes tenus (Sécurité), présents (Formation, MCAD). Les taux concernés (« traitées dans les
  délais », engagement, couverture des événements et des postes, présence de Formation) sont
  classés « À préciser » : ils deviennent des comptes saisis si la coordination le confirme, sinon
  le taux est retiré. « Projets terminés » (Film) figure dans la liste (ligne 74) : le taux de
  livraison dans les délais se calcule.
- **Année** : année civile, heure de Paris (K2). Avant la mise en service, il n'y a rien : les cumuls
  partent de la mise en service, ou d'un total de départ saisi « à ce jour » (K3). Un cumul de
  l'année se calcule toujours à partir de comptes du dimanche ou du mois, jamais d'un compte « à
  ce jour » à remettre à zéro chaque janvier (défaut que 3.2 reproche à l'option A).
- **Tests** : pgTAP pour chaque type (complétude, dénominateur nul, ministère désactivé, matrice des
  droits de la nouvelle table) ; Vitest pour l'affichage.

Taux demandés, avec ce qu'il faut pour les calculer (question K4) :

| Taux demandé                              | Ministère                | Numérateur                        | Dénominateur                     | Période                | État                                                       |
| ----------------------------------------- | ------------------------ | --------------------------------- | -------------------------------- | ---------------------- | ---------------------------------------------------------- |
| Taux de livraison dans les délais         | Film                     | projets livrés dans les délais    | projets terminés                 | mois                   | calculable                                                 |
| Taux de résolution des demandes           | Tech                     | demandes résolues                 | demandes reçues                  | mois                   | calculable                                                 |
| Taux de complétion                        | Formation                | personnes ayant terminé           | inscrits                         | à ce jour              | calculable                                                 |
| Incidents par événement                   | Sécurité                 | incidents                         | événements couverts              | mois                   | calculable                                                 |
| Taux de présence                          | Prodiges Junior          | enfants présents                  | inscrits                         | dimanche sur à ce jour | calculable si K5 accepte les enfants présents par dimanche |
| Panier moyen                              | Merch                    | chiffre d'affaires                | commandes                        | mois                   | calculable si K6 retient le chiffre d'affaires             |
| Taux de réalisation des événements        | Coordination             | réalisés                          | réalisés plus annulés, ou prévus | mois                   | phase 2 (K10)                                              |
| Taux de conversion NA vers FIJ            | Intégration              | intégrations en FIJ de l'année    | NA de l'année                    | année                  | ratio de totaux, à confirmer                               |
| Demandes satisfaites sur demandes         | Multilingue              | demandes satisfaites              | demandes de traduction           | mois                   | calculable (proposé par EJP Tech, non demandé)             |
| Taux de couverture des événements         | MCAD, Santé, Multilingue | événements couverts               | événements à couvrir             | mois                   | dénominateur absent                                        |
| Taux de couverture des postes             | Sécurité                 | postes tenus                      | postes à tenir                   | dimanche               | deux comptes absents                                       |
| Taux de présence                          | Formation, MCAD          | personnes présentes               | inscrits ou attendus             | session                | numérateur absent                                          |
| Taux d'engagement                         | Communication            | interactions                      | portée                           | semaine                | numérateur absent                                          |
| Taux de demandes traitées dans les délais | Communication            | demandes traitées dans les délais | demandes reçues                  | mois                   | deux comptes absents                                       |
| Taux de participation                     | MPI, Kumi, Eagles        | participants                      | total de référence               | à définir              | dénominateur absent                                        |
| Taux de satisfaction                      | Formation                | réponses satisfaites              | réponses reçues                  | à définir              | questionnaire à confirmer                                  |

### 3.8 Rattacher les indicateurs aux ministères

En production, l'administration crée les ministères à l'écran 13, après le déploiement (BRIEF,
section 8 : amorçage, puis `creer-compte`). En local et en CI, ils viennent de `seed.sql`, chargé
**après** les migrations. Une migration qui cherche Kumi par son nom pour lui créer des indicateurs
échoue de trois façons :

- **En production**, un lot poussé avec l'étape 4a à la mise en service ne trouve aucun ministère
  et ne crée rien. Une migration appliquée ne se rejoue jamais (elle est figée) : chaque ministère
  créé plus tard demanderait une nouvelle migration.
- **En local et en CI**, `seed.sql` se charge après les migrations : le lot ne crée rien, et le test
  prévu (nombre d'indicateurs créés sur un jeu de test) ne peut pas le vérifier, puisque pgTAP
  tourne sur la base déjà chargée.
- **À la main**, un simple avertissement pendant un `db push` passe facilement inaperçu, et la
  correspondance avec un nom libre tapé à l'écran 13 (accents, majuscules) est fragile.

**Recommandation : un catalogue en base.**

- Une table `private.indicateur_modele` (nom normalisé du ministère, libellé, nature, unité,
  plafond, groupe, sensible, ordre), jamais exposée par l'API, remplie par les migrations de lots.
- Une fonction `private` matérialise le catalogue : elle crée les indicateurs d'un ministère qui
  ne les a pas encore (jamais deux fois le même libellé). Un trigger `after insert on ministere`
  l'appelle à chaque nouveau ministère ; chaque migration de lot l'appelle une fois pour les
  ministères déjà créés.
- Les noms se comparent sans accents, sans majuscules et sans espaces en trop. Un nom tapé à
  l'écran 13 qui n'est pas dans le catalogue ne crée rien, et l'écran affiche « Indicateurs
  propres : 0 ».
- `seed.sql` désactive ce trigger le temps de charger ses 8 ministères (Communication, Intégration,
  Coordination, Social et Prodiges Junior portent des noms du catalogue), puis le réactive : les
  valeurs attendues du BRIEF supposent les seuls indicateurs du jeu d'exemple.
- **Tests pgTAP** : créer un ministère du catalogue absent du jeu d'exemple (Kumi) crée ses
  indicateurs ; un nom hors catalogue n'en crée aucun ; un second appel ne crée pas de doublon ; un
  nom écrit en minuscules et sans accents est reconnu ; la table du catalogue n'est lisible par
  aucun profil.
- **À défaut** (si le catalogue paraît trop lourd) : écrire dans l'étape 8 l'ordre imposé (tous
  les ministères créés avant le lot) et une requête de contrôle, à lancer à la main après le push,
  qui liste les ministères sans indicateurs.
- Rejeté : créer les 22 ministères par migration avec un code, comme FIJ ; `seed.sql` crée les
  mêmes noms et toutes les valeurs attendues du BRIEF supposent 8 ministères.

`seed.sql` garde ses 8 ministères et reçoit un indicateur d'exemple par nature. La préproduction
porte les 22 noms, avec des comptes fictifs, et sert de recette avant la production.

### 3.9 Récapitulatif des migrations

| Migration (nouvelle)              | Contenu                                                                                                                                                                                                                              | Phase        | Tests pgTAP                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------- |
| `indicateurs_natures_unites`      | nature « mois » ; colonnes `unite`, `valeur_max`, `groupe`, `sensible` ; contrôle de `mesure.valeur` ; contrôle du mois (et du mois écoulé pour un indicateur sensible) ; trigger                                                    | 1            | dates du mois, plafond, valeurs par défaut, mois en cours refusé si sensible                                         |
| `indicateurs_vues_mois`           | `v_mesure_mois`, séries de 12 mois, cumuls de l'année avec complétude ; pour un indicateur sensible, la valeur du mois seulement                                                                                                     | 1            | cumuls, complétude, heure de Paris                                                                                   |
| `indicateurs_calculs`             | table `indicateur_calcul`, RLS, GRANT, vue `v_calcul`                                                                                                                                                                                | 1            | matrice des droits, ratios, « Non calculé »                                                                          |
| `journal_administration_chiffres` | lecture du journal par l'administration : fonction `private` en `security definer` et vue `security_invoker` qui rebâtissent `detail` avec les seules lignes d'indicateurs communs ; la table garde son filtre par ligne (section 5) | 1            | en aal2, l'administration qui lit `detail` ne voit aucune valeur d'indicateur propre ; elle lit les chiffres communs |
| `indicateurs_catalogue`           | `private.indicateur_modele`, fonction de matérialisation, trigger sur `ministere` (3.8)                                                                                                                                              | 1            | création d'un ministère du catalogue, doublon, nom normalisé, catalogue illisible                                    |
| `indicateurs_lot_1`, puis 2, 3    | lignes du catalogue validées, et appel de la fonction pour les ministères existants                                                                                                                                                  | 1, puis lots | indicateurs créés par un ministère du catalogue                                                                      |
| `indicateurs_nature_jour`         | nature « jour » (activités datées)                                                                                                                                                                                                   | 2            | date future refusée, moyenne                                                                                         |
| `evenements_comptages`            | comptages par mois, « reporté » lu dans l'historique ; Coordination ne lit que des totaux de l'église                                                                                                                                | 2            | report, dernier état, visibilité                                                                                     |

Toute nouvelle table suit le skill `nouvelle-table` (GRANT, RLS, pgTAP, types, accès aux données)
et passe la revue `rls-auditor`. Les types TypeScript sont régénérés. Les tests existants à reprendre
(`integrite`, `jeu-exemple`, `rls-chiffres-saisies`) sont listés en 3.2.

## 4. Règles métier et données personnelles

### 4.1 Suivi de personnes

La règle « aucune donnée personnelle, aucune liste de personnes » exclut tout KPI qui suppose de
reconnaître une personne d'une fois à l'autre. Le comptage se fait hors de l'outil ; l'outil ne
reçoit qu'un nombre.

| KPI demandé                                                            | Ministère            | Alternative conforme proposée                                                                                 |
| ---------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------- |
| Taux de retour des NA                                                  | Intégration          | compte « NA revenus ce dimanche » (déjà venus une fois), ratio de totaux sur une période à définir            |
| Taux de conversion NA vers FIJ                                         | Intégration          | NA intégrés en FIJ de l'année divisés par NA de l'année : un ratio de totaux, pas un parcours                 |
| Taux de perte                                                          | Intégration          | compte « à ce jour » de personnes sans nouvelles, estimé par Intégration, ou retrait                          |
| Parcours NA, retour, FIJ (graphique)                                   | Intégration          | trois totaux côte à côte (NA, NA revenus, intégrés en FIJ), présentés comme des totaux                        |
| Participants uniques                                                   | MPI                  | compte du mois « personnes différentes », estimé par MPI, ou retrait                                          |
| Parcours du jeune dans le FIJ                                          | Coordo FIJ           | un compte par étape du parcours, étapes à définir (K47)                                                       |
| Enfants revenus à une session suivante                                 | Prodiges Junior      | compte « enfants déjà venus » par mois écoulé (P22) ; public mineur : totaux seulement                        |
| Nouveaux bénéficiaires, nouvelles participantes, nouveaux participants | Social, Kumi, Eagles | compte du mois saisi par le ministère, sans liste                                                             |
| Taux de satisfaction                                                   | Formation            | réponses satisfaites et réponses reçues d'un questionnaire anonyme, ratio calculé, si ce questionnaire existe |
| Taux de présence des équipiers                                         | MCAD                 | équipiers présents et équipiers attendus, deux comptes, ratio calculé                                         |

### 4.2 Domaines sensibles

Santé (prises en charge, interventions, orientations), Social (bénéficiaires, personnes
accompagnées), Call your sister (Kumi), la plate-forme d'écoute (Eagles) et, pour les enfants, les
« nouveaux enfants » et les « enfants déjà venus » de Prodiges Junior (mineurs). Un total ne contient
pas de donnée personnelle tant qu'il ne permet de reconnaître personne ; « 1 prise en charge entre
le 4 et le 11 octobre » peut désigner quelqu'un pour qui était là, et devient alors une donnée de
santé (article 9 du RGPD).

Le risque vient de l'écart entre deux saisies. `mesure` est en ajout seulement (`saisi_le`), et le
détail du journal (valeur, date) est lu par le berger et le conseil : deux saisies successives
d'un mois en cours révèlent un écart au jour près. Un total par mois ne suffit donc pas, il faut
aussi que le mois soit clos.

- **Colonne `indicateur.sensible`** (migration, faux par défaut) : elle marque ces indicateurs.
- **Nature « mois » seulement**, et `controler_mesure` refuse le mois en cours : seuls les mois
  écoulés (heure de Paris) se saisissent. Un indicateur sensible n'est ni « dimanche » ni « à ce
  jour » (la date d'un « à ce jour » est celle de la saisie).
- **La fiche et le journal ne montrent que la valeur du mois**, pas la suite des saisies. Le
  `detail` du journal n'a pas de valeur pour ces indicateurs ; la lecture passe par la vue du
  mois (saisie la plus récente), pas par les lignes de `mesure` (à fixer à l'étape 4a avec la RLS).
  Une correction du même mois remplace la valeur, elle ne s'affiche pas comme un écart.
- Aucune ventilation (âge, sexe, motif), aucun texte libre attaché au chiffre ; les points
  d'attention de ces ministères restent soumis au rappel et à la modération.
- Visibles par le ministère, le berger et le conseil seulement (règle actuelle des indicateurs
  propres) ; jamais sur la vue de l'église, jamais dans un email (P14, rappels par email), jamais
  dans la lecture du journal par l'administration (section 5).
- **Prodiges Junior** : « enfants présents » (gros nombres) se sépare de « nouveaux enfants » et
  « enfants déjà venus » (sensibles, par mois écoulé). Les enfants présents se comptent chaque
  dimanche si la coordination l'accepte (K5) ; sinon, par mois.
- Petits nombres : seuil d'affichage à décider par la coordination, par exemple « moins de 3 »
  (K5).
- **Cette règle modifie P08** : l'indicateur « Enfants accueillis le dimanche » de la liste V1 du
  BRIEF (section 4, Prodiges Junior) n'existerait plus tel quel. La phrase de la page
  Confidentialité (4.6) est alignée sur cette règle.
- La note de Santé (« les données médicales individuelles ne doivent pas apparaître ») est déjà
  respectée : l'outil n'en contient aucune.

### 4.3 Chiffres financiers

Chiffre d'affaires, marge et panier moyen (Merch), fonds levés (Social), budget et devis
(Production). Retenus seulement si la coordination le veut (K6) : unité euros, arrondi à l'euro,
plafond relevé, aucun nom de donateur ni de client. Ils suivent la règle des indicateurs propres
(ministère, berger, conseil) ; l'administration de l'église ne les voit pas, sauf décision
contraire. L'outil n'est pas la comptabilité de l'église : en cas d'écart, la comptabilité fait
foi.

### 4.4 Chiffres de plateformes externes

Vues, portée, abonnés, engagement, spectateurs du direct (Communication, Film, MCAD), Pages Roses
(Kumi), formulaire de recrutement (MDS).

- Saisis à la main : stocks en « à ce jour » (abonnés, vues cumulées, profils inscrits), flux en
  « mois » (vues du mois, mises en relation, réservations).
- La date de relevé est la date de saisie ; la plateforme se nomme dans le libellé (« Abonnés
  YouTube et Instagram »).
- Aucune connexion aux plateformes : pas de jeton, pas de nouveau sous-traitant.
- Taux d'engagement : la liste ne donne ni les interactions ni la portée du même mois ; il reste
  « À préciser » (K26) tant que ces deux comptes ne sont pas saisis. Le ratio se calcule, aucune
  décimale ne se saisit.
- Un même chiffre n'est reporté que par un ministère (vues : Film ou MCAD, K7).

### 4.5 Un chiffre, une source

Convention de l'outil : un STAR n'est compté que dans son ministère principal (règle 4 du BRIEF,
P01). « STARs actifs » et « STARs au service » restent les indicateurs communs, saisis par chaque
ministère et additionnés par l'outil (D1). MDS ne saisit pas un deuxième total de l'église.

Les lignes suivantes sont des **hypothèses**, pas des décisions. Chacune se vérifie avec le
ministère (K8, K43, K44, K52, K55) :

- « Mobilisés », équipiers, agents, animateurs, interprètes, formateurs, personnes actives (MCAD,
  Santé, Multilingue, Sécurité, Formation, Entretien, Prodiges Junior, Kumi) : ce seraient les STARs
  au service du dimanche. Limites : l'indicateur ne couvre que les dimanches, alors que Santé,
  Sécurité, MCAD et Multilingue sont mobilisés aussi aux événements ; et un ministère peut mobiliser
  des personnes dont le ministère principal est un autre. Elles sont classées « Commun, hypothèse »
  de la même façon pour tous les ministères, sauf Prodiges Musique (catégories, K42).
- « Bénévoles actifs » (Kumi, Eagles) : ce seraient les « STARs actifs » de ces ministères. Mais une
  bénévole de Kumi dont le ministère principal est un autre n'est pas dans les actifs de Kumi :
  l'égalité changerait le sens du chiffre.
- « Nouveaux STARs » : MDS seul, hypothèse (K52). Les « nouvelles intégrations dans les équipes »
  de Kumi et d'Eagles sont « À préciser » : le chiffre du ministère ne disparaît pas sans réponse
  (K55).
- Lives et diffusions en direct (MCAD) : un seul indicateur (K32).
- Les indicateurs propres ne s'additionnent jamais entre ministères : pas de risque de double
  compte tant qu'aucun total de l'église n'est demandé (K12). Si un total est demandé, les règles de
  complétude et de double compte s'appliquent.

### 4.6 Pages Confidentialité et Conditions d'utilisation

Le registre des traitements (P13) appartient à la coordination, responsable de traitement : ce
document ne conclut pas que « le registre ne change pas ». Un petit nombre daté peut devenir une
donnée de santé (4.2), et des totaux mensuels dans une petite communauté (Call your sister,
plate-forme d'écoute, Santé) laissent un risque résiduel. Questions à la coordination (K56) :
faut-il inscrire au registre les comptes agrégés des domaines sensibles ? Ont-ils leur place dans
l'outil ? Faut-il une analyse d'impact ?

Deux phrases sont proposées pour les pages, comme un projet soumis à la validation de la
coordination (les textes de T17 sont validés par elle), alignées sur 4.2 et sous réserve de K5 :

- **Confidentialité**, « À quoi sert l'outil » : « Les ministères y saisissent des totaux, jamais
  une information sur une personne. Pour la santé, l'accompagnement et les nouveaux enfants, seuls
  des totaux par mois écoulé sont saisis ; les enfants présents se comptent chaque dimanche, en un
  seul total. »
- **Conditions d'utilisation** : « Ne saisissez que des nombres. Ne comptez dans l'outil rien qui
  permette de reconnaître une personne ; les listes et le suivi des personnes restent hors de
  l'outil. »

## 5. Profils et comptes

- **22 comptes de ministère** : chacun demande une boîte mail partagée, une invitation et une
  activation de la double authentification. Le travail est surtout celui de l'administration et des
  ministères (K14). Protocole, sans KPI, saisit tout de même les indicateurs communs : sinon les
  totaux de l'église restent incomplets (« 21 sur 22 »).
- **Tech et EJP Tech** : les comptes EJP Tech sont l'administration de la plateforme et ne voient
  aucun chiffre (P06). Le ministère Tech a des KPI. Proposition : un **compte de ministère Tech**,
  avec sa propre boîte mail partagée, distinct des comptes EJP Tech. Ce compte voit ce que voit
  tout ministère : la vue de l'église (chiffres communs, sessions, carte des FIJ) et sa fiche. Si
  des personnes d'EJP Tech tiennent ce compte, elles voient donc les chiffres de l'église et
  relisent les textes libres, et la règle « EJP Tech ne voit aucun chiffre » est vidée en pratique.
  C'est une conséquence à faire accepter, pas une supposition (K30). Rejeté : donner un ministère à
  un compte EJP Tech (contraire au modèle et à P06).
- **MDS** : « Nombre total de Stars actifs » et « STAR en service chaque dimanche » sont les totaux
  de l'église déjà calculés. Si MDS saisissait les siens, deux chiffres différents circuleraient.
  Proposition : MDS garde ses propres comptes communs et ses KPI propres (nouveaux STARs, désactivés,
  recrutements, badges, espaces Care). Si MDS tient un registre, un indicateur « STARs au registre
  MDS » peut servir de contrôle sur sa fiche, présenté comme tel (K52).
- **Coordo FIJ et FIJ** : le ministère FIJ (code `fij`) saisit déjà la carte des 8 départements.
  Coordo FIJ demande « les stars habituelles par département » (présences EJP, FIJ, évangélisation,
  membres chaque mardi). Proposition : Coordo FIJ est le ministère FIJ (renommage par migration si
  voulu) ; la carte reste telle quelle ; les autres chiffres par département attendent la liste
  précise (K46, K47) et demanderaient une table par département et par date (phase 3).
- **Intégration, « présence au culte »** : si ce sont les STARs d'Intégration au service, c'est
  l'indicateur commun ; si c'est l'assemblée, c'est un chiffre de l'église, à confier à un seul
  ministère (K19).
- **Administration de l'église et journal** : la lecture du journal cache toute la ligne dès
  qu'un envoi porte un indicateur propre (`private.journal_lisible_administration`). Comme le
  formulaire du dimanche envoie tout en un seul ajout, l'administration perdrait la plupart des
  saisies du dimanche dans son journal. Garder la ligne et n'en montrer que les indicateurs communs
  **ne peut pas se faire par la RLS**, qui filtre des lignes et non le contenu de `journal.detail` :
  une politique qui laisse passer la ligne donnerait à l'administration, par PostgREST, les valeurs
  de tous les indicateurs propres envoyés avec les chiffres du dimanche (Santé, Call your sister,
  plate-forme d'écoute, chiffres financiers), ce qui casse P06, la matrice des droits, P22 et P23.
  Proposition : garder le filtre actuel par ligne sur la table ; donner à l'administration une
  lecture par une fonction `private` en `security definer`, exposée par une vue `security_invoker`,
  qui rebâtit `detail` avec les seules lignes d'indicateurs communs (migration
  `journal_administration_chiffres`). Autre solution : `journaliser_mesures` n'écrit pas la valeur
  des indicateurs propres (la règle d'une ligne par envoi reste respectée) ; elle règle aussi le cas
  des indicateurs sensibles (4.2). Test pgTAP : en aal2, l'administration qui fait
  `select detail from public.journal` n'obtient aucune valeur d'indicateur propre.

## 6. Impact sur les écrans

### Fiche du ministère (étape 4, écrans 04 et 12)

- Jusqu'à une trentaine de lignes pour MCAD si tout est retenu ; six saisies au plus en phase 1.
- Rangement par groupe (`indicateur.groupe`) : « Chiffres du dimanche », « À ce jour », « Ce mois »,
  ou les groupes du ministère (« Captation / diffusion », « Audience »).
- Chaque ligne : dernière valeur avec son unité, date (« Dimanche 27 sept. », « Septembre 2026 »,
  « Saisi le 24 sept. »), petite courbe, et pour un calcul sa complétude.
- La phrase de la fiche ne change pas : elle ne parle que des indicateurs communs.

### Saisies

- **Dimanche (08)** : indicateurs communs, puis propres « dimanche » et « à ce jour », comme prévu.
- **Nouveau formulaire « Chiffres du mois »** (`/saisir/mois`) : mois en cours et les deux
  précédents (mois écoulés seulement pour les indicateurs sensibles), un seul ajout. « Vos saisies » gagne une ligne « Chiffres de septembre » (À faire tant
  qu'aucune valeur du mois écoulé n'est saisie).
- **Phase 2, « Saisir une activité »** : date, indicateur, valeur.
- Le rappel par email (P14, rappels par email) peut gagner un rappel des chiffres du mois.

### Courbes et graphiques

Le BRIEF exclut le graphique d'évolution en V1 (section 11) ; seules existent les petites courbes.
Proposition : pour la mise en service, petite courbe de 10 dimanches ou de 12 mois sur chaque
indicateur, et équivalent texte. Les graphiques demandés (évolution NA et NC, Welcome Prodiges,
événements prévus et réalisés, contenus et portée, demandes et incidents, prière semaine après
semaine, présence aux répétitions) attendent la phase 3 si la coordination les juge nécessaires
(K15). Un « entonnoir » NA, revenus, FIJ s'affiche comme trois nombres, pas comme un parcours.

### Vue de l'église (étape 3, en cours)

- Les indicateurs propres restent hors de la vue de l'église (BRIEF, section 4) : les vues de
  l'église ne lisent déjà que les indicateurs communs.
- Seul le tableau « Les ministères » grandit, de 8 à 22 lignes. Aussi touchés : la barre de la
  session (22 segments à 390 px), les listes de noms (« Manquent : ... », ligne secondaire de la
  phrase) et la complétude (« 18 sur 22 »).
- Proposition : au-delà de trois noms, une liste devient « Coordination, Intégration, Social et 4
  autres ministères » (P30). La liste complète reste lisible dans le tableau « Les ministères » et
  dans un libellé accessible (lecteur d'écran, tablette).
- Chiffres d'un ministère sur la vue de l'église (NA du dimanche, enfants présents) : seulement si
  la coordination le demande (K12), en phase 3.

### Configuration des indicateurs

| Critère                                                                                    | Migrations par lot (BRIEF)                           | Écran de configuration pour l'administration                                          |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Délai d'un changement                                                                      | quelques jours (EJP Tech écrit, la personne déploie) | immédiat                                                                              |
| Respect des règles (aucun taux saisi, aucune donnée personnelle dans un libellé, doublons) | relu par EJP Tech                                    | à la charge de l'administration ; la base ne contrôle que le format                   |
| Travail à construire                                                                       | aucun écran ; une migration par lot                  | écran, fonctions `security definer`, actions de journal, matrice, tests : 4 à 6 jours |
| Rattachement aux ministères                                                                | par catalogue (3.8)                                  | direct                                                                                |
| Traçabilité                                                                                | git et journal « Système »                           | journal                                                                               |
| Périmètre V1                                                                               | prévu                                                | hors périmètre (BRIEF, section 11), à rouvrir                                         |

**Recommandation** : migrations par lot pour les phases 1 et 2, sur demande écrite de
l'administration. Un écran se réexamine après un mois d'usage, si les demandes de changement
dépassent deux lots par mois.

## 7. Impact sur le plan

### Étapes touchées

« 4a » est un nom provisoire : la section 13 du BRIEF ne le connaît pas. Il s'ajoute si P29 est
confirmée.

| Étape                                    | Changement proposé                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3, vue de l'église (en cours)            | aucun changement de modèle ni de jeu d'exemple ; affichage vérifié à 22 ministères ; listes de noms bornées (P30)                                                                                                                                                                                                                                                                                                                                                                                   |
| 4a, modèle des indicateurs (nouvelle)    | migrations de la phase 1 (3.9), pgTAP, types, indicateur d'exemple par nature dans `seed.sql` (trigger du catalogue désactivé le temps du seed) ; tests existants à reprendre (3.2)                                                                                                                                                                                                                                                                                                                 |
| 4, fiche ministère et saisies            | groupes, formulaire « Chiffres du mois », unités, cumuls et ratios avec complétude, courbes de 12 mois ; écarts dans `docs/reference/maquettes/LISEZMOI.md` pour les écrans sans maquette (formulaire « Chiffres du mois », fiche rangée par groupe, ligne « Chiffres de septembre » dans « Vos saisies », puis « Saisir une activité » en phase 2) ; route `/saisir/mois` ajoutée au tableau des adresses du BRIEF avec sa garde de profil ; parcours e2e aux trois largeurs (1440, 834 et 390 px) |
| Rappels par email (P14, après l'étape 4) | rappel des chiffres du mois, si P16 est retenu                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 6, administration                        | colonne « Indicateurs propres » de l'écran 13 : un nombre et un lien, plus une liste ; lecture du journal par l'administration (vue des chiffres communs)                                                                                                                                                                                                                                                                                                                                           |
| 8, déploiement                           | 22 ministères et comptes ; lots d'indicateurs recettés en préproduction, puis en production (ordre : le catalogue d'abord, puis les ministères, ou l'inverse grâce au trigger) ; pages Confidentialité et Conditions                                                                                                                                                                                                                                                                                |

### Phases

- **Phase 1, avec la mise en service** : natures et colonnes (P16, T26, P19), catalogue (T27) ; au plus six
  indicateurs saisis par ministère, choisis parmi les candidats ci-dessous (environ 90 en tout) ;
  calculs simples (cumuls, ratios) ; vue de l'église inchangée.
- **Phase 2, après la mise en service** : activités datées (P17), comptages d'événements (P20),
  lots suivants au fil des réponses.
- **Phase 3, si la coordination la confirme** : grands graphiques, chiffres de ministères sur la vue
  de l'église, chiffres FIJ par département, couverture d'événements, écran de configuration.

Candidats de la phase 1 par ministère (D : dimanche, J : à ce jour, M : mois). La coordination en
choisit six au plus par ministère (K13). Les lignes « Commun, hypothèse » (mobilisés, bénévoles)
n'y figurent pas : elles attendent K8.

| Ministère        | Candidats saisis                                                                                                                                                                                                                    | Calculés                                            | Plus tard ou à préciser                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Intégration      | NA du dimanche (D), NC du dimanche (D), NA et NC intégrés en FIJ (M), sessions et présents de Welcome Prodiges (M, en attendant la phase 2)                                                                                         | NA et NC de l'année, intégrations en FIJ de l'année | retour des NA, présence au culte et aux événements                                                      |
| Coordination     | baptisés (M, en attendant la phase 2), retard du début du culte en minutes (D)                                                                                                                                                      | baptisés de l'année                                 | comptages d'événements (phase 2), « à l'heure »                                                         |
| Communication    | publications (M), campagnes (M), contenus produits (M), demandes traitées (M), portée ou abonnés (J)                                                                                                                                |                                                     | engagement et taux dans les délais (K25, K26 : demandes reçues et interactions absentes)                |
| Social           | actions sociales (M), bénéficiaires (M, sensible), nouveaux bénéficiaires (M, sensible), personnes accompagnées (M, sensible)                                                                                                       | actions de l'année                                  | fonds levés (K6), partenariats (K28)                                                                    |
| Film             | tournages (M), vidéos produites (M), vidéos publiées (M), projets en cours (J), projets terminés (M), livrés dans les délais (M)                                                                                                    | taux de livraison dans les délais                   | vues cumulées (K7)                                                                                      |
| Tech             | demandes reçues (M), demandes résolues (M), demandes en cours (J), incidents techniques (M)                                                                                                                                         | taux de résolution                                  | incidents récurrents                                                                                    |
| MCAD             | cultes captés (D), spectateurs du direct (D), plateformes (J), événements couverts (M), lives (M), contenus audiovisuels (M), incidents, problèmes audio et vidéo, interruptions (M), personnes formées (M), nouveaux équipiers (M) | évolution de l'audience                             | vues, couverture, présence des équipiers                                                                |
| MPI              | présents à la chaîne de prière (D), participants de la nuit (D, saisis le dimanche matin : voir 3.2), équipe sainte cène (J), sainte cène distribuées (D)                                                                           | participants cumulés                                | Prière des Stars (K35), taux de participation                                                           |
| Santé            | événements couverts (M), prises en charge (M, sensible), interventions (M, sensible), incidents avec intervention (M, sensible), orientations (M, sensible)                                                                         |                                                     | taux de couverture                                                                                      |
| Merch            | stock disponible (J), produits en stock critique (J), articles vendus (M), commandes (M), chiffre d'affaires (M, euros, K6)                                                                                                         | panier moyen, évolution des ventes                  | marge                                                                                                   |
| Production       | mag et photo du dimanche (D), projets en cours (J), personnes formées (J), événements couverts (M)                                                                                                                                  |                                                     | budget (point d'attention)                                                                              |
| Prodiges Musique | morceaux préparés (M), morceaux originaux (M)                                                                                                                                                                                       |                                                     | musiciens et chanteurs par catégorie (K42), présence aux répétitions (phase 2)                          |
| Kumi             | prestataires inscrites (J), profils actifs (J), activités (M), participantes (M), nouvelles participantes (M), projets (M), mises en relation (M), réservations (M), prises en charge Call your sister (M, sensible)                |                                                     | femmes mobilisées et bénévoles actives (K8), intégrations dans les équipes (K55), taux de participation |
| Eagles           | activités (M), participants (M), nouveaux participants (M), projets (M), prises en charge de la plate-forme d'écoute (M, sensible)                                                                                                  |                                                     | bénévoles actifs (K8), intégrations dans les équipes (K55), taux de participation                       |
| Entretien        | problèmes en attente (J), problèmes signalés (M), problèmes résolus (M), tâches réalisées (M)                                                                                                                                       |                                                     | besoins en matériels (point d'attention)                                                                |
| Coordo FIJ       | carte des FIJ existante                                                                                                                                                                                                             |                                                     | chiffres par département et du mardi (K47)                                                              |
| Multilingue      | langues couvertes (J), bénéficiaires de la traduction (D), événements couverts (M), demandes de traduction (M), demandes satisfaites (M), incidents de traduction (M)                                                               | demandes satisfaites sur demandes (proposé)         | taux de couverture                                                                                      |
| Sécurité         | événements couverts (M), incidents (M), interventions (M), exercices et formations (M)                                                                                                                                              | incidents par événement couvert                     | couverture des postes (K49)                                                                             |
| Formation        | inscrits (J), personnes ayant terminé une formation (J)                                                                                                                                                                             | taux de complétion                                  | formateurs mobilisés (K8), taux de présence, satisfaction                                               |
| Protocole        | indicateurs communs seulement                                                                                                                                                                                                       |                                                     | K51                                                                                                     |
| MDS              | espaces Care (D), badges actifs (J), badges en attente (J), nouveaux STARs (M), STARs désactivés (M), recrutements aboutis (M), non aboutis (M), badges distribués (M)                                                              | évolution des STARs actifs (courbe)                 | événements de l'année (phase 2)                                                                         |
| Prodiges Junior  | enfants présents (D, si K5 l'accepte), nouveaux enfants (M, sensible), enfants déjà venus (M, sensible), enfants inscrits (J)                                                                                                       | taux de présence                                    | sessions (K54)                                                                                          |

### Ordre de grandeur

En jours de travail d'EJP Tech avec Claude Code, à revoir au mode plan de chaque étape :

| Travail                                                                  | Ordre de grandeur         |
| ------------------------------------------------------------------------ | ------------------------- |
| Étape 4a : migrations de la phase 1, vues, pgTAP, types                  | 3 à 4 jours               |
| Étape 4 : surcoût (groupes, chiffres du mois, unités, calculs, courbes)  | 3 à 5 jours de plus       |
| Un lot d'indicateurs (migration, recette en préproduction)               | une demi-journée à 1 jour |
| Rappel du mois par email (P14)                                           | 1 jour de plus            |
| Phase 2 : nature « jour », saisie d'une activité, comptages d'événements | 6 à 10 jours              |
| Phase 3                                                                  | à estimer après réponses  |

### Effet sur la date de mise en ligne

La date de mise en ligne reste ouverte (BRIEF, section 4). Pour un outil temporaire (C1), le plan de
ce document ajoute 6 à 9 jours de travail avant la mise en service (étape 4a : 3 à 4 jours ; étape
4 : 3 à 5 jours de plus), sans compter les réponses de la coordination à attendre (les questions
« avant l'étape 4a », section 8). Une version réduite est possible : P16 seul (nature « mois ») et
au plus six indicateurs par ministère, le reste après la mise en service.

### Étape 3 en cours

À ne **pas** faire maintenant :

- changer le modèle, les vues de l'église ou `seed.sql` (8 ministères, valeurs attendues du BRIEF) ;
- afficher un indicateur propre sur la vue de l'église ;
- attendre les réponses de la coordination : l'étape 3 n'en dépend pas.

À faire dans l'étape 3, sans toucher au modèle :

- un test d'affichage avec 22 ministères (tableau et liste « Les ministères », barre de la session,
  listes de noms) aux trois largeurs ;
- la borne des listes de noms (P30), si EJP Tech la confirme.

Cette branche de conception part de `5affce7`, avant le contrat de l'étape 3 (`7e889e8`) : elle
ignore T18 (l'accueil du ministère passe à l'étape 4) et T21 (ordre des apports : 22 lignes dans le
bloc de la session). Elle est à rebaser sur `etape-3` avant la fusion (conflit probable dans
`docs/decisions.md`, où T18 à T25 et T26, T27 se suivent), puis le test à 22 ministères se vérifie
avec T21 et `textesVides.ts`.

## 8. Décisions proposées et questions

### Décisions (détail dans `docs/decisions.md`)

Statut de toutes : à l'étude, non appliqué.

- **P15**. Tri des KPI : comptes saisis, le reste calculé, commun, point d'attention ou retiré.
- **P16**. Nouvelle nature « mois » pour les comptes par période.
- **P17**. Activités propres : dimanche ou mois en phase 1, nature « jour » en phase 2.
- **P19**. Valeurs calculées déclarées par migration (`indicateur_calcul`), avec leur complétude.
- **P20**. Comptages d'événements ; « reporté » lu dans l'historique ; « couvert » saisi par mois.
- **P21**. Suivi de personnes remplacé par des comptes agrégés.
- **P22**. Domaines sensibles : mois écoulés seulement, visibilité restreinte ; modifie P08.
- **P23**. Chiffres financiers : seulement si la coordination les veut.
- **P24**. Chiffres de plateformes : saisis à la main, une seule source.
- **P25**. Compte de ministère Tech distinct des comptes EJP Tech, conséquence à faire accepter.
- **P26**. Un chiffre, une source : hypothèses à vérifier avec chaque ministère.
- **P27**. Coordo FIJ est le ministère FIJ ; chiffres par département en phase 3.
- **P29**. Trois phases, six indicateurs saisis au plus par ministère en phase 1, étape « 4a ».
- **P30**. Vue de l'église à 22 ministères : aucun indicateur propre, listes de noms bornées.
- **T26** (choix technique). Unité, plafond, groupe et marque sensible de chaque indicateur.
- **T27** (choix technique). Indicateurs créés par lots de migration, avec un catalogue.

### Questions (112)

Chaque question est posée à un destinataire (colonne « Pour »). Une question par ligne ; une lettre
distingue les questions d'un même sujet.

#### À trancher avant l'étape 4a (22)

| N°   | Pour                       | Question                                                                                                                                     |
| ---- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| C1   | Coordination               | Ces KPI sont-ils pour Pilotage EJP, un outil temporaire, ou pour l'application complète ?                                                    |
| C2   | Coordination               | La liste est-elle définitive, ou les ministères vont-ils en ajouter ?                                                                        |
| C3   | Coordination               | Qui doit voir les KPI : le berger et le conseil seulement, ou tous les ministères ?                                                          |
| K1a  | Coordination               | Le mois convient-il comme période commune des comptes (publications, demandes, incidents, ventes) ?                                          |
| K1b  | Coordination               | Quels comptes doivent se faire par semaine ?                                                                                                 |
| K2   | Coordination               | « Depuis le début de l'année » veut-il dire depuis le 1er janvier, pour tous ?                                                               |
| K3   | Coordination               | Les cumuls partent-ils de la mise en service, ou chaque ministère saisit-il un total de départ ?                                             |
| K4a  | Coordination               | Un taux calculé à partir de deux totaux convient-il à la place d'un suivi de personnes ?                                                     |
| K4b  | Coordination et ministères | Pour chaque taux « À préciser » du tableau de la section 3.7, le ministère peut-il saisir le nombre qui manque, ou faut-il retirer le taux ? |
| K5a  | Coordination               | Pour Santé, Social, Call your sister et la plate-forme d'écoute, un total par mois écoulé suffit-il ?                                        |
| K5b  | Coordination               | Accepte-t-on que le mois en cours ne soit jamais saisi pour ces indicateurs ?                                                                |
| K5c  | Coordination               | Faut-il afficher « moins de 3 » pour les très petits nombres ?                                                                               |
| K5d  | Coordination               | Pour Prodiges Junior, peut-on compter les enfants présents chaque dimanche, en un seul total, et les nouveaux enfants par mois écoulé ?      |
| K6a  | Coordination               | Veut-on des chiffres financiers dans l'outil (chiffre d'affaires, marge, fonds levés, budget) ?                                              |
| K6b  | Coordination               | Si oui, l'administration de l'église doit-elle les voir ?                                                                                    |
| K13a | Coordination               | Au plus six indicateurs saisis par ministère pour la mise en service, le reste ensuite : d'accord ?                                          |
| K13b | Coordination               | Qui choisit les six indicateurs, le ministère ou la coordination ?                                                                           |
| K14a | Coordination               | Les 22 ministères sont-ils tous à créer à la mise en service ?                                                                               |
| K14b | Coordination               | Chaque ministère peut-il avoir une boîte mail partagée ?                                                                                     |
| K14c | Coordination               | Quels sont les noms exacts des 22 ministères ?                                                                                               |
| K56a | Coordination               | Faut-il inscrire au registre des traitements les comptes agrégés des domaines sensibles ?                                                    |
| K56b | Coordination               | Ces comptes ont-ils leur place dans l'outil, et faut-il une analyse d'impact ?                                                               |

#### À trancher avant l'étape 4, fiche et saisies (8)

| N°  | Pour                                                                                    | Question                                                                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| K7a | Coordination                                                                            | Quel ministère reporte les vues et les abonnés : Communication, Film ou MCAD ?                                                                                                                                 |
| K7b | Communication, Film, MCAD                                                               | Sur quelles plateformes ?                                                                                                                                                                                      |
| K15 | Coordination                                                                            | Les petites courbes (10 dimanches, 12 mois) suffisent-elles pour la mise en service ?                                                                                                                          |
| K16 | Coordination                                                                            | Qui valide les libellés raccourcis à 60 caractères proposés par EJP Tech ?                                                                                                                                     |
| K30 | Coordination                                                                            | Les personnes d'EJP Tech auront aussi le compte du ministère Tech : elles verront donc les chiffres de l'église, comme tout ministère. Est-ce accepté, ou ce compte doit-il être tenu par d'autres personnes ? |
| K8a | Santé, Sécurité, MCAD, Multilingue, Formation, Entretien, Prodiges Junior, Kumi, Eagles | Vos « mobilisés » (ou bénévoles) sont-ils les STARs de votre ministère qui servent le dimanche ?                                                                                                               |
| K8b | Les mêmes ministères                                                                    | Comptez-vous aussi des personnes dont le ministère principal est un autre ministère ?                                                                                                                          |
| K8c | Santé, Sécurité, MCAD, Multilingue                                                      | Comptez-vous aussi vos mobilisés aux événements hors dimanche ?                                                                                                                                                |

#### Pour le lot d'indicateurs de chaque ministère (75)

| N°   | Pour                        | Question                                                                                                                                                                                                         |
| ---- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| K17a | Intégration                 | Que veut dire NC ?                                                                                                                                                                                               |
| K17b | Intégration                 | Quand une personne est-elle comptée comme NA, et quand comme NC ?                                                                                                                                                |
| K18a | Intégration et coordination | Welcome Prodiges est-il une activité d'Intégration, ou un rassemblement d'église ?                                                                                                                               |
| K18b | Intégration                 | Qui est présent à Welcome Prodiges : des NA, ou des STARs de plusieurs ministères ?                                                                                                                              |
| K18c | Intégration                 | Quel jour et à quel rythme a lieu Welcome Prodiges ?                                                                                                                                                             |
| K19a | Intégration                 | « Présence au culte » : présence de qui (équipe, NA, assemblée) ?                                                                                                                                                |
| K19b | Intégration                 | « Présence lors des événements » : présence de qui ?                                                                                                                                                             |
| K20a | Intégration et Coordo FIJ   | Qui tient le compte des intégrations en FIJ ?                                                                                                                                                                    |
| K20b | Intégration                 | Taux de perte : après combien de temps sans nouvelles ?                                                                                                                                                          |
| K21  | Coordination                | Les baptisés se comptent-ils par session de baptême (date) ou par mois ?                                                                                                                                         |
| K22a | Coordination                | Saisir le retard du début du culte en minutes convient-il ?                                                                                                                                                      |
| K22b | Coordination                | « À l'heure » : quelle tolérance ?                                                                                                                                                                               |
| K23  | Coordination                | « Dernière période » : la semaine ou le mois ?                                                                                                                                                                   |
| K24  | Communication               | Quelle différence y a-t-il entre publications, contenus produits et campagnes ?                                                                                                                                  |
| K25a | Communication               | Les demandes viennent de qui, par quel canal ?                                                                                                                                                                   |
| K25b | Communication               | Quel est le délai de référence pour une demande traitée dans les délais ?                                                                                                                                        |
| K25c | Communication               | Faut-il compter aussi les demandes reçues ?                                                                                                                                                                      |
| K26a | Communication               | Engagement : interactions divisées par portée ?                                                                                                                                                                  |
| K26b | Communication               | La portée cumulée compte depuis quand ?                                                                                                                                                                          |
| K27a | Social                      | Bénéficiaires : passages du mois, ou personnes différentes ?                                                                                                                                                     |
| K27b | Social                      | Quelle différence avec « personnes accompagnées » ?                                                                                                                                                              |
| K28  | Social                      | Partenariats actifs et actions externes du mois : deux chiffres séparés ?                                                                                                                                        |
| K29a | Film                        | Qu'est-ce qu'un projet, et qui fixe son délai ?                                                                                                                                                                  |
| K29b | Film                        | « Délai moyen de production » remplacé par « livrés dans les délais » : d'accord ?                                                                                                                               |
| K31a | Tech                        | Les demandes viennent de qui, par quel canal ?                                                                                                                                                                   |
| K31b | Tech                        | Quand un incident est-il récurrent ?                                                                                                                                                                             |
| K31c | Tech                        | « Temps moyen de résolution » retiré : d'accord ?                                                                                                                                                                |
| K32  | MCAD                        | « Live » et « diffusion en direct » sont-ils la même chose ?                                                                                                                                                     |
| K33a | MCAD                        | Les incidents techniques sont-ils la somme des problèmes audio, vidéo et des interruptions ?                                                                                                                     |
| K33b | MCAD                        | Les incidents se comptent-ils par dimanche ou par mois ?                                                                                                                                                         |
| K34  | MCAD                        | Spectateurs du direct : pic, moyenne ou total des connexions ?                                                                                                                                                   |
| K35a | MPI                         | La Prière des Stars a-t-elle lieu le dimanche ? Sinon, quel jour et à quel rythme ?                                                                                                                              |
| K35b | MPI et coordination         | La Prière des Stars réunit-elle les STARs de plusieurs ministères ? Si oui, faut-il la déclarer comme session « Autre rassemblement » (chaque ministère saisit ses présents, un STAR n'est compté qu'une fois) ? |
| K36a | MPI                         | « Présents à la chaîne de prière » et « participants de la nuit du samedi au dimanche » : même chiffre ?                                                                                                         |
| K36b | MPI                         | Le chiffre de la nuit se saisit-il le dimanche matin ?                                                                                                                                                           |
| K37a | MPI                         | Sainte cène : compte-t-on des portions ou des personnes servies ?                                                                                                                                                |
| K37b | MPI                         | Taux de participation : sur quel total ?                                                                                                                                                                         |
| K38  | Santé                       | Quelle différence y a-t-il entre prise en charge, intervention et incident nécessitant une intervention ?                                                                                                        |
| K39a | Merch                       | Les ventes se comptent-elles le dimanche, aux événements ou au mois ?                                                                                                                                            |
| K39b | Merch                       | La marge se calcule sur quels coûts ?                                                                                                                                                                            |
| K39c | Merch                       | « Articles les plus vendus » retiré : d'accord ?                                                                                                                                                                 |
| K40a | Production                  | Mag et photo : deux chiffres séparés ?                                                                                                                                                                           |
| K40b | Production                  | Les formations comptent-elles comme des projets ?                                                                                                                                                                |
| K41a | Production                  | Budget : le devis (5 164 €) ou un budget alloué ?                                                                                                                                                                |
| K41b | Production                  | Le besoin de location passe-t-il par un point d'attention ?                                                                                                                                                      |
| K42a | Prodiges Musique            | Quelles catégories de musiciens et de chanteurs compte-t-on ?                                                                                                                                                    |
| K42b | Prodiges Musique            | Combien de répétitions par semaine ?                                                                                                                                                                             |
| K42c | Prodiges Musique            | La présence se rapporte à quel total ?                                                                                                                                                                           |
| K43a | Kumi                        | Quelle différence y a-t-il entre activités et projets ?                                                                                                                                                          |
| K43b | Kumi                        | Quelle différence entre femmes mobilisées, bénévoles actives et participantes ?                                                                                                                                  |
| K43c | Kumi                        | Qu'est-ce qu'un profil actif des Pages Roses ?                                                                                                                                                                   |
| K44a | Eagles                      | Quelle différence y a-t-il entre activités et projets ?                                                                                                                                                          |
| K44b | Eagles                      | Les bénévoles actifs sont-ils les STARs d'Eagles ?                                                                                                                                                               |
| K55  | Kumi et Eagles              | Les « nouvelles intégrations dans les équipes » : votre ministère les compte-t-il, ou est-ce le chiffre « nouveaux STARs » de MDS ?                                                                              |
| K45a | Entretien                   | Problèmes et tâches : se comptent-ils par semaine ou par mois ?                                                                                                                                                  |
| K45b | Entretien                   | « Délai moyen » remplacé par « résolus en plus de 7 jours », ou retiré ?                                                                                                                                         |
| K46a | Coordo FIJ                  | Coordo FIJ est-il le ministère FIJ, qui saisit déjà la carte ?                                                                                                                                                   |
| K46b | Coordo FIJ                  | « Stars habituelles » : faut-il lire « stats habituelles » ?                                                                                                                                                     |
| K47a | Coordo FIJ                  | Quels chiffres exactement, par département ou au total ?                                                                                                                                                         |
| K47b | Coordo FIJ                  | Lesquels se comptent chaque mardi ?                                                                                                                                                                              |
| K47c | Coordo FIJ                  | Quelles étapes du parcours du jeune compte-t-on ?                                                                                                                                                                |
| K48a | Multilingue                 | Langues couvertes : en général, ou ce dimanche ?                                                                                                                                                                 |
| K48b | Multilingue                 | Comment compte-t-on les bénéficiaires de la traduction ?                                                                                                                                                         |
| K49a | Sécurité                    | Combien de postes sont à tenir, en nombre fixe ou selon le dimanche ?                                                                                                                                            |
| K49b | Sécurité                    | Quelle différence y a-t-il entre incident et intervention ?                                                                                                                                                      |
| K50a | Formation                   | Formation est-il EJP Formation ?                                                                                                                                                                                 |
| K50b | Formation                   | Que veut dire PCNC ?                                                                                                                                                                                             |
| K50c | Formation                   | Existe-t-il un questionnaire de satisfaction anonyme ?                                                                                                                                                           |
| K51  | Protocole                   | Le Protocole veut-il un indicateur propre, ou seulement les indicateurs communs ?                                                                                                                                |
| K52a | MDS                         | MDS veut-il un total de STARs de son registre, en contrôle de la somme des ministères ?                                                                                                                          |
| K52b | MDS                         | Les nouveaux STARs se comptent-ils dans l'église ou dans un ministère ?                                                                                                                                          |
| K53a | MDS                         | Badges distribués : par mois ou en cumul ?                                                                                                                                                                       |
| K53b | MDS                         | Qu'est-ce qu'un recrutement « abouti » ?                                                                                                                                                                         |
| K54a | Prodiges Junior             | « Nouveaux enfants » veut-il dire venus pour la première fois ce dimanche ?                                                                                                                                      |
| K54b | Prodiges Junior             | Une session est-elle un dimanche ?                                                                                                                                                                               |

#### Phases 2 et 3 (7)

| N°   | Pour                       | Question                                                                                                                               |
| ---- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| K9   | Coordination et ministères | Pour les événements couverts, un compte du mois saisi par chaque ministère suffit-il, sans lien avec les événements de l'outil ?       |
| K10a | Coordination               | Un événement « prévu » est-il validé ou en préparation, daté d'aujourd'hui ou après ?                                                  |
| K10b | Coordination               | Un événement « reporté » est-il un événement dont la date est repoussée ?                                                              |
| K10c | Coordination               | Le taux de réalisation se calcule-t-il sur les prévus, ou sur réalisés plus annulés ?                                                  |
| K11  | Coordination               | Coordination compte-t-elle ses événements seulement, ou ceux de tous les ministères (avec seulement des totaux de l'église par mois) ? |
| K12  | Coordination               | Faut-il des chiffres d'un ministère sur la vue de l'église (par exemple NA du dimanche, enfants présents) ? Lesquels ?                 |
| K57  | Coordination               | Pour les chiffres saisis activité par activité (phase 2), aucune complétude n'est possible : l'accepte-t-on ?                          |

## Annexe. Classement des 185 demandes

Une ligne par demande de la source (`docs/sources/kpi-coordination-2026-10.md`). « Ligne » est le
numéro de ligne dans ce fichier. Les graphiques de la ligne 28 comptent pour trois demandes.

- **Nature** : D (dimanche), J (à ce jour), M (mois), calcul (jamais saisi), aucune (pas de saisie
  proposée).
- **Conformité** : Conforme (entre tel quel), À adapter, Non conforme (à remplacer ou retirer).
- **Destination** : celle de la section 2 ; « Commun, hypothèse » vaut pour tous les « mobilisés » et
  « bénévoles » (4.5, K8).
- **Sensible** : mois écoulés seulement (4.2).
- **Lignes groupées** : six lignes portent plusieurs chiffres mais comptent pour une seule demande
  (Communication ligne 52, Production lignes 164 et 165, Prodiges Musique ligne 173, Entretien ligne
  217, Coordo FIJ ligne 221). Le nombre de chiffres à saisir dépasse donc 185, d'au moins quatre
  pour Coordo FIJ et d'un par plateforme ou catégorie pour les autres.

| Ministère        | Ligne | Demande                                                                                    | Catégorie                          | Nature | Conformité   | Destination  | Question | Remarque                                                               |
| ---------------- | ----- | ------------------------------------------------------------------------------------------ | ---------------------------------- | ------ | ------------ | ------------ | -------- | ---------------------------------------------------------------------- |
| Intégration      | 16    | NA du dimanche                                                                             | Compte du dimanche                 | D      | Conforme     | Actuel       | K17      |                                                                        |
| Intégration      | 17    | NA cumulés depuis le début de l'année                                                      | Valeur calculée                    | calcul | À adapter    | Calculé      | K2       | cumul de la ligne précédente                                           |
| Intégration      | 18    | NC du dimanche                                                                             | Compte du dimanche                 | D      | Conforme     | Actuel       | K17      |                                                                        |
| Intégration      | 19    | NC cumulés depuis le début de l'année                                                      | Valeur calculée                    | calcul | À adapter    | Calculé      | K2       | cumul de la ligne précédente                                           |
| Intégration      | 20    | Présents à Welcome Prodiges par session                                                    | Activité propre                    | M      | À adapter    | Activité     | K18      | comptes du mois en phase 1, par session en phase 2                     |
| Intégration      | 21    | Total cumulé des présents à Welcome Prodiges                                               | Valeur calculée                    | calcul | À adapter    | Calculé      | K18      |                                                                        |
| Intégration      | 22    | Taux de retour des NA                                                                      | Suivi de personnes                 | aucune | Non conforme | Remplacé     | K4       | suivi de personnes                                                     |
| Intégration      | 23    | Intégrations effectives de NA et NC en FIJ depuis le début de l'année                      | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K20      | compte du mois ; le cumul de l'année se calcule                        |
| Intégration      | 24    | Taux de conversion NA vers FIJ                                                             | Suivi de personnes                 | aucune | Non conforme | Remplacé     | K4       | suivi de personnes ; ratio de totaux possible                          |
| Intégration      | 25    | Taux de perte                                                                              | Suivi de personnes                 | aucune | Non conforme | Remplacé     | K20      | suivi de personnes                                                     |
| Intégration      | 26    | Présence chaque dimanche au culte                                                          | Sens à préciser                    | D      | À adapter    | À préciser   | K19      | STARs d'Intégration ou assemblée                                       |
| Intégration      | 27    | Présence lors des événements                                                               | Sens à préciser                    | aucune | À adapter    | À préciser   | K19      |                                                                        |
| Intégration      | 28    | Graphique : évolution NA et NC                                                             | Graphique                          | aucune | À adapter    | Courbe       | K15      |                                                                        |
| Intégration      | 28    | Graphique : évolution des présents à Welcome Prodiges                                      | Graphique                          | aucune | À adapter    | Courbe       | K15      |                                                                        |
| Intégration      | 28    | Graphique : parcours NA, retour, FIJ                                                       | Graphique                          | aucune | Non conforme | Remplacé     | K4       | suivi de personnes ; trois totaux côte à côte                          |
| Coordination     | 33    | Événements réalisés depuis le début de l'année                                             | Comptage d'événements              | calcul | À adapter    | Calculé      | K10      | phase 2                                                                |
| Coordination     | 34    | Événements prévus                                                                          | Comptage d'événements              | calcul | À adapter    | Calculé      | K10      | phase 2                                                                |
| Coordination     | 35    | Événements réalisés sur la dernière période                                                | Comptage d'événements              | calcul | À adapter    | Calculé      | K23      | phase 2                                                                |
| Coordination     | 36    | Baptisés à la dernière session                                                             | Activité propre                    | M      | À adapter    | Activité     | K21      | comptes du mois en phase 1                                             |
| Coordination     | 37    | Baptisés depuis le début de l'année                                                        | Valeur calculée                    | calcul | À adapter    | Calculé      | K21      |                                                                        |
| Coordination     | 38    | Événements annulés                                                                         | Comptage d'événements              | calcul | À adapter    | Calculé      | K10      | phase 2                                                                |
| Coordination     | 39    | Événements reportés                                                                        | Comptage d'événements              | calcul | À adapter    | Calculé      | K10      | lu dans l'historique, phase 2                                          |
| Coordination     | 40    | Taux de réalisation des événements                                                         | Valeur calculée                    | calcul | À adapter    | Calculé      | K10      | phase 2                                                                |
| Coordination     | 41    | Pourcentage d'événements commencés à l'heure                                               | Sens à préciser                    | aucune | À adapter    | À préciser   | K22      | tolérance non définie                                                  |
| Coordination     | 42    | Heure de début de culte                                                                    | Non numérique                      | D      | À adapter    | Actuel       | K22      | saisie comme un retard en minutes                                      |
| Coordination     | 43    | Graphique : prévus, réalisés, annulés, reportés                                            | Graphique                          | aucune | À adapter    | Courbe       | K15      |                                                                        |
| Communication    | 47    | Publications réalisées                                                                     | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K24      |                                                                        |
| Communication    | 48    | Campagnes réalisées                                                                        | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K24      |                                                                        |
| Communication    | 49    | Contenus produits                                                                          | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K24      |                                                                        |
| Communication    | 50    | Portée cumulée                                                                             | Chiffre de plateforme externe      | J      | À adapter    | Actuel       | K7       | plafond                                                                |
| Communication    | 51    | Taux d'engagement (par semaine)                                                            | Sens à préciser                    | aucune | À adapter    | À préciser   | K26      | interactions non demandées                                             |
| Communication    | 52    | Évolution de l'engagement depuis le début de l'année : vues et abonnés, toutes plateformes | Chiffre de plateforme externe      | J      | À adapter    | Actuel       | K7       | groupé : plusieurs chiffres (vues, abonnés, plateformes) ; plafond     |
| Communication    | 54    | Demandes traitées                                                                          | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K25      |                                                                        |
| Communication    | 55    | Taux de demandes traitées dans les délais                                                  | Sens à préciser                    | aucune | À adapter    | À préciser   | K25      | ni délai ni demandes reçues dans la liste                              |
| Communication    | 56    | Graphique : évolution du contenu produit et de la portée                                   | Graphique                          | aucune | À adapter    | Courbe       | K15      |                                                                        |
| Social           | 60    | Actions sociales réalisées                                                                 | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K27      |                                                                        |
| Social           | 61    | Bénéficiaires                                                                              | Domaine sensible                   | M      | À adapter    | Mois         | K27      | sensible ; mois écoulé seulement                                       |
| Social           | 62    | Personnes accompagnées                                                                     | Domaine sensible                   | M      | À adapter    | Mois         | K27      | sensible ; mois écoulé seulement                                       |
| Social           | 63    | Nouveaux bénéficiaires                                                                     | Suivi de personnes                 | M      | À adapter    | Mois         | K27      | sensible ; compte du mois, sans liste ; mois écoulé seulement          |
| Social           | 64    | Partenariats et actions externes                                                           | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K28      |                                                                        |
| Social           | 65    | Actions réalisées depuis le début de l'année                                               | Valeur calculée                    | calcul | À adapter    | Calculé      | K2       | cumul des actions du mois                                              |
| Social           | 66    | Fonds levés (en euros)                                                                     | Financier                          | M      | À adapter    | À préciser   | K6       | euros ; plafond                                                        |
| Film             | 70    | Tournages réalisés                                                                         | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K29      |                                                                        |
| Film             | 71    | Vidéos produites                                                                           | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K29      |                                                                        |
| Film             | 72    | Vidéos publiées                                                                            | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K29      |                                                                        |
| Film             | 73    | Projets en cours                                                                           | Compte « à ce jour »               | J      | Conforme     | Actuel       | K29      |                                                                        |
| Film             | 74    | Projets terminés                                                                           | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K29      |                                                                        |
| Film             | 75    | Projets livrés dans les délais                                                             | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K29      |                                                                        |
| Film             | 76    | Vues cumulées                                                                              | Doublon ou conflit                 | J      | À adapter    | À préciser   | K7       | même chiffre que MCAD ; plafond                                        |
| Film             | 77    | Délai moyen de production                                                                  | Suivi de personnes                 | aucune | Non conforme | Remplacé     | K29      | délai par projet ; remplacé par « livrés dans les délais »             |
| Film             | 78    | Taux de livraison dans les délais                                                          | Valeur calculée                    | calcul | À adapter    | Calculé      | K29      | livrés dans les délais sur projets terminés                            |
| Tech             | 82    | Demandes reçues                                                                            | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K31      |                                                                        |
| Tech             | 83    | Demandes résolues                                                                          | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K31      |                                                                        |
| Tech             | 84    | Demandes en cours                                                                          | Compte « à ce jour »               | J      | Conforme     | Actuel       | K31      |                                                                        |
| Tech             | 85    | Incidents techniques                                                                       | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K31      |                                                                        |
| Tech             | 86    | Temps moyen de résolution                                                                  | Suivi de personnes                 | aucune | Non conforme | Remplacé     | K31      | délai par demande ; retiré ou remplacé par un compte                   |
| Tech             | 87    | Incidents récurrents                                                                       | Sens à préciser                    | aucune | À adapter    | À préciser   | K31      | récurrent : à définir                                                  |
| Tech             | 88    | Taux de résolution des demandes                                                            | Valeur calculée                    | calcul | À adapter    | Calculé      | K31      | résolues sur reçues                                                    |
| Tech             | 89    | Graphique : évolution des demandes et incidents                                            | Graphique                          | aucune | À adapter    | Courbe       | K15      |                                                                        |
| MCAD             | 94    | Événements couverts                                                                        | Comptage d'événements              | M      | À adapter    | Mois         | K9       |                                                                        |
| MCAD             | 95    | Cultes captés                                                                              | Compte du dimanche                 | D      | Conforme     | Actuel       | K32      |                                                                        |
| MCAD             | 96    | Lives réalisés                                                                             | Doublon ou conflit                 | M      | À adapter    | Mois         | K32      | même chose que les diffusions en direct ?                              |
| MCAD             | 97    | Diffusions en direct                                                                       | Doublon ou conflit                 | aucune | À adapter    | À préciser   | K32      | un seul indicateur avec la ligne précédente                            |
| MCAD             | 98    | Contenus audiovisuels produits                                                             | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K32      |                                                                        |
| MCAD             | 99    | Plateformes de diffusion utilisées                                                         | Compte « à ce jour »               | J      | Conforme     | Actuel       | K7       |                                                                        |
| MCAD             | 101   | Spectateurs en direct                                                                      | Chiffre de plateforme externe      | D      | À adapter    | Actuel       | K34      | plafond possible                                                       |
| MCAD             | 102   | Vues cumulées                                                                              | Doublon ou conflit                 | J      | À adapter    | À préciser   | K7       | même chiffre que Film ; plafond                                        |
| MCAD             | 103   | Vues par événement                                                                         | Valeur calculée                    | calcul | À adapter    | À préciser   | K7       | vues du mois non demandées                                             |
| MCAD             | 104   | Évolution de l'audience                                                                    | Valeur calculée                    | calcul | À adapter    | Calculé      | K34      |                                                                        |
| MCAD             | 106   | Incidents techniques                                                                       | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K33      | somme des trois lignes suivantes ?                                     |
| MCAD             | 107   | Problèmes audio                                                                            | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K33      |                                                                        |
| MCAD             | 108   | Problèmes vidéo                                                                            | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K33      |                                                                        |
| MCAD             | 109   | Interruptions de diffusion                                                                 | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K33      |                                                                        |
| MCAD             | 110   | Taux de couverture des événements                                                          | Sens à préciser                    | aucune | À adapter    | À préciser   | K9       | événements à couvrir non demandés                                      |
| MCAD             | 112   | Équipiers mobilisés                                                                        | Doublon ou conflit                 | D      | À adapter    | Commun       | K8       | hypothèse : STARs au service                                           |
| MCAD             | 113   | Personnes formées                                                                          | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K32      |                                                                        |
| MCAD             | 114   | Nouveaux équipiers intégrés                                                                | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K32      |                                                                        |
| MCAD             | 115   | Taux de présence des équipiers                                                             | Suivi de personnes                 | aucune | À adapter    | À préciser   | K4       | équipiers présents et attendus : deux comptes à créer                  |
| MPI              | 122   | Présents à la Prière des Stars                                                             | Activité propre                    | aucune | À adapter    | Activité     | K35      | jour et rythme inconnus                                                |
| MPI              | 123   | Sessions réalisées (Prière des Stars)                                                      | Activité propre                    | M      | À adapter    | Mois         | K35      |                                                                        |
| MPI              | 124   | Participants cumulés (Prière des Stars)                                                    | Valeur calculée                    | calcul | À adapter    | Calculé      | K35      |                                                                        |
| MPI              | 125   | Taux de participation (Prière des Stars)                                                   | Sens à préciser                    | aucune | À adapter    | À préciser   | K37      | total de référence inconnu                                             |
| MPI              | 127   | Présents à la chaîne de prière                                                             | Compte du dimanche                 | D      | À adapter    | Actuel       | K36      |                                                                        |
| MPI              | 128   | Participants pendant la nuit du samedi au dimanche                                         | Compte du dimanche                 | D      | À adapter    | Actuel       | K36      | saisi le dimanche matin : voir 3.2                                     |
| MPI              | 129   | Participants uniques                                                                       | Suivi de personnes                 | aucune | Non conforme | Remplacé     | K4       | suivi de personnes                                                     |
| MPI              | 130   | Participants cumulés (chaîne de prière)                                                    | Valeur calculée                    | calcul | À adapter    | Calculé      | K36      |                                                                        |
| MPI              | 131   | Taux de participation (chaîne de prière)                                                   | Sens à préciser                    | aucune | À adapter    | À préciser   | K37      | total de référence inconnu                                             |
| MPI              | 133   | Personnes dans l'équipe sainte cène                                                        | Compte « à ce jour »               | J      | Conforme     | Actuel       | K37      |                                                                        |
| MPI              | 134   | Sainte cène distribuées chaque dimanche                                                    | Compte du dimanche                 | D      | Conforme     | Actuel       | K37      |                                                                        |
| MPI              | 135   | Graphique : participation à la prière semaine après semaine                                | Graphique                          | aucune | À adapter    | Courbe       | K15      |                                                                        |
| Santé            | 139   | Événements couverts                                                                        | Comptage d'événements              | M      | À adapter    | Mois         | K9       |                                                                        |
| Santé            | 140   | Prises en charge                                                                           | Domaine sensible                   | M      | À adapter    | Mois         | K38      | sensible ; mois écoulé seulement                                       |
| Santé            | 141   | Interventions                                                                              | Domaine sensible                   | M      | À adapter    | Mois         | K38      | sensible ; mois écoulé seulement                                       |
| Santé            | 142   | Incidents nécessitant une intervention                                                     | Domaine sensible                   | M      | À adapter    | Mois         | K38      | sensible ; mois écoulé seulement                                       |
| Santé            | 143   | Orientations vers une structure ou un professionnel                                        | Domaine sensible                   | M      | À adapter    | Mois         | K38      | sensible ; mois écoulé seulement                                       |
| Santé            | 144   | Personnes mobilisées                                                                       | Doublon ou conflit                 | D      | À adapter    | Commun       | K8       | hypothèse : STARs au service                                           |
| Santé            | 145   | Taux de couverture des événements                                                          | Sens à préciser                    | aucune | À adapter    | À préciser   | K9       | événements à couvrir non demandés                                      |
| Merch            | 150   | Chiffre d'affaires                                                                         | Financier                          | M      | À adapter    | Mois         | K6       | euros ; plafond ; si K6 le veut                                        |
| Merch            | 151   | Articles vendus                                                                            | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K39      |                                                                        |
| Merch            | 152   | Commandes                                                                                  | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K39      |                                                                        |
| Merch            | 153   | Panier moyen                                                                               | Valeur calculée                    | calcul | À adapter    | Calculé      | K6       | chiffre d'affaires sur commandes                                       |
| Merch            | 154   | Articles les plus vendus                                                                   | Non numérique                      | aucune | Non conforme | Hors mesures | K39      | classement, pas un compte                                              |
| Merch            | 155   | Stock disponible                                                                           | Compte « à ce jour »               | J      | Conforme     | Actuel       | K39      |                                                                        |
| Merch            | 156   | Produits en stock critique                                                                 | Compte « à ce jour »               | J      | Conforme     | Actuel       | K39      |                                                                        |
| Merch            | 157   | Marge estimée                                                                              | Financier                          | aucune | À adapter    | À préciser   | K6       | coûts non demandés                                                     |
| Merch            | 158   | Évolution des ventes                                                                       | Valeur calculée                    | calcul | À adapter    | Calculé      | K39      |                                                                        |
| Production       | 162   | Événements couverts                                                                        | Comptage d'événements              | M      | À adapter    | Mois         | K9       |                                                                        |
| Production       | 164   | Projets produits : mag et photo chaque dimanche                                            | Compte « à ce jour »               | D      | Conforme     | Actuel       | K40      | groupé : deux chiffres (mag, photo)                                    |
| Production       | 165   | Projets en cours                                                                           | Compte « à ce jour »               | J      | Conforme     | Actuel       | K40      | groupé : formations et mag annulé                                      |
| Production       | 166   | Budget prévu                                                                               | Financier                          | aucune | À adapter    | Hors mesures | K41      | point d'attention ; besoin de location                                 |
| Production       | 169   | Personnes formées                                                                          | Compte « à ce jour »               | J      | Conforme     | Actuel       | K40      |                                                                        |
| Prodiges Musique | 173   | Musiciens et chanteurs mobilisés, par catégorie                                            | Sens à préciser                    | J      | À adapter    | À préciser   | K42      | groupé : un chiffre par catégorie                                      |
| Prodiges Musique | 174   | Morceaux préparés                                                                          | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K42      |                                                                        |
| Prodiges Musique | 175   | Morceaux originaux réalisés                                                                | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K42      |                                                                        |
| Prodiges Musique | 176   | Graphique : évolution du taux de présence aux répétitions                                  | Graphique                          | aucune | À adapter    | Courbe       | K42      | phase 2                                                                |
| Kumi             | 180   | Activités réalisées                                                                        | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K43      |                                                                        |
| Kumi             | 181   | Participantes                                                                              | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K43      |                                                                        |
| Kumi             | 182   | Nouvelles participantes                                                                    | Suivi de personnes                 | M      | À adapter    | Mois         | K43      | compte du mois, sans liste                                             |
| Kumi             | 183   | Femmes mobilisées                                                                          | Doublon ou conflit                 | D      | À adapter    | Commun       | K8       | hypothèse : STARs au service                                           |
| Kumi             | 184   | Projets réalisés                                                                           | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K43      |                                                                        |
| Kumi             | 185   | Bénévoles actives                                                                          | Doublon ou conflit                 | J      | À adapter    | Commun       | K8       | hypothèse : STARs actifs de Kumi                                       |
| Kumi             | 186   | Taux de participation                                                                      | Sens à préciser                    | aucune | À adapter    | À préciser   | K43      | total de référence inconnu                                             |
| Kumi             | 187   | Nouvelles intégrations dans les équipes                                                    | Doublon ou conflit                 | M      | À adapter    | À préciser   | K55      | MDS compte les nouveaux STARs                                          |
| Kumi             | 189   | Pages Roses : prestataires inscrites                                                       | Chiffre de plateforme externe      | J      | À adapter    | Actuel       | K43      |                                                                        |
| Kumi             | 190   | Pages Roses : profils actifs                                                               | Chiffre de plateforme externe      | J      | À adapter    | Actuel       | K43      | profil actif : à définir                                               |
| Kumi             | 191   | Pages Roses : demandes de mise en relation                                                 | Chiffre de plateforme externe      | M      | À adapter    | Mois         | K43      |                                                                        |
| Kumi             | 192   | Pages Roses : réservations                                                                 | Chiffre de plateforme externe      | M      | À adapter    | Mois         | K43      |                                                                        |
| Kumi             | 194   | Call your sister : prises en charge par semaine                                            | Domaine sensible                   | M      | À adapter    | Mois         | K5       | sensible ; par mois écoulé, jamais par semaine                         |
| Eagles           | 198   | Activités réalisées                                                                        | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K44      |                                                                        |
| Eagles           | 199   | Participants                                                                               | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K44      |                                                                        |
| Eagles           | 200   | Nouveaux participants                                                                      | Suivi de personnes                 | M      | À adapter    | Mois         | K44      | compte du mois, sans liste                                             |
| Eagles           | 201   | Projets réalisés                                                                           | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K44      |                                                                        |
| Eagles           | 202   | Bénévoles actifs                                                                           | Doublon ou conflit                 | J      | À adapter    | Commun       | K8       | hypothèse : STARs actifs d'Eagles                                      |
| Eagles           | 203   | Taux de participation                                                                      | Sens à préciser                    | aucune | À adapter    | À préciser   | K44      | total de référence inconnu                                             |
| Eagles           | 204   | Nouvelles intégrations dans les équipes                                                    | Doublon ou conflit                 | M      | À adapter    | À préciser   | K55      | MDS compte les nouveaux STARs                                          |
| Eagles           | 206   | La plate-forme d'écoute : prises en charge par semaine                                     | Domaine sensible                   | M      | À adapter    | Mois         | K5       | sensible ; par mois écoulé, jamais par semaine                         |
| Entretien        | 210   | Problèmes signalés                                                                         | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K45      |                                                                        |
| Entretien        | 211   | Problèmes résolus                                                                          | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K45      |                                                                        |
| Entretien        | 212   | Délai moyen de résolution                                                                  | Suivi de personnes                 | aucune | Non conforme | Remplacé     | K45      | délai par problème                                                     |
| Entretien        | 213   | Tâches réalisées                                                                           | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K45      |                                                                        |
| Entretien        | 215   | Personnes actives mobilisées                                                               | Doublon ou conflit                 | D      | À adapter    | Commun       | K8       | hypothèse : STARs au service                                           |
| Entretien        | 216   | Besoins en matériels                                                                       | Non numérique                      | aucune | Non conforme | Hors mesures | K45      | liste : point d'attention                                              |
| Entretien        | 217   | Problèmes en attente, avec délai d'attente                                                 | Compte « à ce jour »               | J      | À adapter    | Actuel       | K45      | groupé : un compte et un délai ; le délai est retiré                   |
| Coordo FIJ       | 221   | Reprise des chiffres habituels par département (présences, mardi, FIJ)                     | Sens à préciser                    | aucune | À adapter    | À préciser   | K47      | groupé : au moins quatre chiffres par département                      |
| Coordo FIJ       | 223   | Graphique : parcours du jeune dans le FIJ                                                  | Graphique                          | aucune | Non conforme | Remplacé     | K47      | suivi de personnes                                                     |
| Multilingue      | 227   | Langues couvertes                                                                          | Compte « à ce jour »               | J      | À adapter    | Actuel       | K48      | en général ou ce dimanche ?                                            |
| Multilingue      | 228   | Événements couverts                                                                        | Comptage d'événements              | M      | À adapter    | Mois         | K9       |                                                                        |
| Multilingue      | 229   | Personnes bénéficiant de la traduction                                                     | Compte du dimanche                 | D      | À adapter    | Actuel       | K48      |                                                                        |
| Multilingue      | 230   | Interprètes mobilisés                                                                      | Doublon ou conflit                 | D      | À adapter    | Commun       | K8       | hypothèse : STARs au service                                           |
| Multilingue      | 231   | Taux de couverture des événements                                                          | Sens à préciser                    | aucune | À adapter    | À préciser   | K9       | événements à couvrir non demandés                                      |
| Multilingue      | 232   | Demandes de traduction                                                                     | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K48      |                                                                        |
| Multilingue      | 233   | Demandes satisfaites                                                                       | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K48      |                                                                        |
| Multilingue      | 234   | Incidents de traduction                                                                    | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K48      |                                                                        |
| Sécurité         | 238   | Événements couverts                                                                        | Comptage d'événements              | M      | À adapter    | Mois         | K9       |                                                                        |
| Sécurité         | 239   | Agents et bénévoles mobilisés                                                              | Doublon ou conflit                 | D      | À adapter    | Commun       | K8       | hypothèse : STARs au service                                           |
| Sécurité         | 240   | Incidents                                                                                  | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K49      |                                                                        |
| Sécurité         | 241   | Interventions                                                                              | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K49      |                                                                        |
| Sécurité         | 242   | Exercices et formations réalisés                                                           | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K49      |                                                                        |
| Sécurité         | 243   | Taux de couverture des postes                                                              | Sens à préciser                    | aucune | À adapter    | À préciser   | K49      | postes à tenir et tenus non demandés                                   |
| Sécurité         | 244   | Incidents par événement                                                                    | Valeur calculée                    | calcul | À adapter    | Calculé      | K49      | incidents sur événements couverts                                      |
| Formation        | 248   | Inscrits (PCNC)                                                                            | Compte « à ce jour »               | J      | À adapter    | Actuel       | K50      | sigle PCNC à définir                                                   |
| Formation        | 249   | Taux de présence                                                                           | Sens à préciser                    | aucune | À adapter    | À préciser   | K50      | aucun compte de présents dans la liste                                 |
| Formation        | 250   | Personnes ayant terminé les formations                                                     | Compte « à ce jour »               | J      | À adapter    | Actuel       | K50      |                                                                        |
| Formation        | 251   | Taux de complétion                                                                         | Valeur calculée                    | calcul | À adapter    | Calculé      | K50      | terminé sur inscrits                                                   |
| Formation        | 252   | Formateurs mobilisés                                                                       | Doublon ou conflit                 | D      | À adapter    | Commun       | K8       | hypothèse : STARs au service                                           |
| Formation        | 253   | Taux de satisfaction                                                                       | Suivi de personnes                 | aucune | Non conforme | Remplacé     | K50      | questionnaire anonyme, s'il existe                                     |
| MDS              | 262   | Nombre total de Stars actifs                                                               | Doublon ou conflit                 | J      | Conforme     | Commun       | K52      | total de l'église déjà calculé                                         |
| MDS              | 263   | Nouveaux Stars                                                                             | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K52      | MDS seul                                                               |
| MDS              | 264   | Stars désactivés                                                                           | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K52      |                                                                        |
| MDS              | 265   | Évolution du nombre de Stars actifs                                                        | Valeur calculée                    | calcul | À adapter    | Calculé      | K52      | courbe du total de l'église                                            |
| MDS              | 266   | Recrutements aboutis via le formulaire, par mois                                           | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K53      |                                                                        |
| MDS              | 267   | Recrutements non aboutis via le formulaire, par mois                                       | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K53      |                                                                        |
| MDS              | 268   | Stars en service chaque dimanche                                                           | Doublon ou conflit                 | D      | Conforme     | Commun       | K52      | total de l'église déjà calculé                                         |
| MDS              | 269   | Espaces Care par dimanche                                                                  | Compte du dimanche                 | D      | Conforme     | Actuel       | K52      |                                                                        |
| MDS              | 270   | Événements organisés par an                                                                | Comptage d'événements              | calcul | À adapter    | Calculé      | K10      | phase 2                                                                |
| MDS              | 272   | Badges distribués                                                                          | Compte par période (semaine, mois) | M      | À adapter    | Mois         | K53      |                                                                        |
| MDS              | 273   | Badges actifs                                                                              | Compte « à ce jour »               | J      | Conforme     | Actuel       | K53      |                                                                        |
| MDS              | 274   | Badges en attente                                                                          | Compte « à ce jour »               | J      | Conforme     | Actuel       | K53      |                                                                        |
| Prodiges Junior  | 278   | Enfants présents chaque dimanche                                                           | Compte du dimanche                 | D      | À adapter    | Actuel       | K5       | gros nombres, par dimanche si la coordination l'accepte                |
| Prodiges Junior  | 279   | Nouveaux enfants                                                                           | Suivi de personnes                 | M      | À adapter    | Mois         | K54      | sensible ; mois écoulé seulement                                       |
| Prodiges Junior  | 280   | Inscrits                                                                                   | Compte « à ce jour »               | J      | Conforme     | Actuel       | K54      |                                                                        |
| Prodiges Junior  | 281   | Sessions réalisées                                                                         | Activité propre                    | aucune | À adapter    | À préciser   | K54      | une session est-elle un dimanche ?                                     |
| Prodiges Junior  | 282   | Taux de présence                                                                           | Valeur calculée                    | calcul | À adapter    | Calculé      | K54      | présents sur inscrits                                                  |
| Prodiges Junior  | 283   | Animateurs mobilisés                                                                       | Doublon ou conflit                 | D      | À adapter    | Commun       | K8       | hypothèse : STARs au service                                           |
| Prodiges Junior  | 284   | Enfants revenus à une session suivante                                                     | Suivi de personnes                 | M      | Non conforme | Remplacé     | K54      | sensible ; suivi de personnes ; compte « enfants déjà venus » par mois |
