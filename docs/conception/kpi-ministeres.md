# KPI des ministères : analyse d'impact et conception

Statut : **proposé**, à confirmer par la coordination et par EJP Tech (décisions P15 à P30 de
`docs/decisions.md`). Rien n'est codé, aucune migration n'est écrite, `BRIEF.md` n'est pas modifié.
Date : 5 octobre 2026.

Source : `docs/sources/kpi-coordination-2026-10.md`.

## 1. Source et périmètre

### Ce que demande la coordination

La coordination a transmis à EJP Tech, le 5 octobre 2026, une liste de KPI pour un « Dashboard des
ministères EJP », avec cette consigne : « Merci de prendre en compte les KPI proposés ci-dessous
pour vos ministères et d'en ajouter si besoin. » Chaque ministère y a sa liste : des comptes, des
taux, des cumuls, des graphiques, des intitulés de dispositifs et une règle de confidentialité.

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

Chaque demande a été classée par EJP Tech : catégorie, rythme, unité, conformité aux règles du
BRIEF, proposition et question. Ce classement ne tranche rien. Les sigles que la liste ne définit
pas (NC, PCNC) ne sont pas interprétés : voir les questions.

### Charge de saisie

Aujourd'hui, un ministère saisit trois chiffres le dimanche, en moins d'une minute (BRIEF,
section 9). Chaque indicateur de plus demande une saisie régulière ; un indicateur peu saisi donne
des totaux incomplets et des courbes trouées. C'est la raison du plafond de six indicateurs saisis
par ministère pour la mise en service (P29).

## 2. Vue d'ensemble

### Par conformité

| Conformité   | Sens                                                                                        | Nombre |
| ------------ | ------------------------------------------------------------------------------------------- | ------ |
| Conforme     | entre dans les règles telles quelles (parfois déjà couvert par un indicateur commun)        | 30     |
| À adapter    | possible, avec une décision, une précision ou un changement du modèle                       | 140    |
| Non conforme | suivi de personnes, taux sans définition, liste ou délai par objet : à remplacer ou retirer | 15     |

### Par catégorie

| Catégorie                          | Exemples                                              | Nombre  |
| ---------------------------------- | ----------------------------------------------------- | ------- |
| Compte par période (semaine, mois) | publications, demandes, incidents, articles vendus    | 41      |
| Valeur calculée                    | NA cumulés, taux de résolution, panier moyen          | 26      |
| Compte « à ce jour »               | stock, projets en cours, inscrits, badges actifs      | 17      |
| Compte du dimanche                 | NA du dimanche, cultes captés, enfants présents       | 13      |
| Sens à préciser                    | présence au culte, taux de participation              | 13      |
| Chiffre de plateforme externe      | portée, vues, profils des Pages Roses                 | 12      |
| Doublon ou conflit                 | vues cumulées de Film et MCAD, bénévoles actifs       | 12      |
| Comptage d'événements              | prévus, réalisés, annulés, reportés, couverts         | 10      |
| Suivi de personnes                 | taux de retour des NA, participants uniques           | 10      |
| Activité propre                    | Welcome Prodiges, Prière des Stars, baptêmes          | 9       |
| Domaine sensible                   | prises en charge (Santé, Kumi, Eagles), bénéficiaires | 8       |
| Graphique                          | évolution NA et NC, demandes et incidents             | 7       |
| Financier                          | chiffre d'affaires, marge, fonds levés, budget        | 4       |
| Non numérique                      | heure de début du culte, articles les plus vendus     | 3       |
| **Total**                          |                                                       | **185** |

### Par destination proposée

La destination dit ce que chaque demande devient si les décisions P15 à P30 sont prises.

| Destination  | Ce que cela demande                                                                                       | Nombre  |
| ------------ | --------------------------------------------------------------------------------------------------------- | ------- |
| Actuel       | indicateur propre « dimanche » ou « à ce jour » : une migration suffit (4 demandent un plafond plus haut) | 36      |
| Mois         | compte du mois : nouvelle nature « mois » (P16)                                                           | 65      |
| Calculé      | cumul, taux, moyenne, évolution ou comptage d'événements : jamais saisi (P19, P20)                        | 29      |
| À préciser   | sens, période ou dénominateur manquant : réponse de la coordination d'abord                               | 19      |
| Commun       | déjà couvert par « STARs au service », « STARs actifs » ou un autre ministère : rien à créer (P26)        | 12      |
| Remplacé     | suivi de personnes, ou délai suivi objet par objet : compte agrégé ou retrait (P21)                       | 11      |
| Courbe       | graphique demandé (section 6)                                                                             | 7       |
| Activité     | valeur par activité datée : nature « jour », phase 2 (P17)                                                | 3       |
| Hors mesures | texte ou liste : point d'attention, ou retrait                                                            | 3       |
| **Total**    |                                                                                                           | **185** |

À retenir : moins d'une demande sur cinq (36) entre dans le modèle actuel. La nature « mois » en
débloque 65 de plus. Le reste se calcule, se précise ou se retire.

### Par ministère

Conformité : conformes / à adapter / non conformes. Colonnes suivantes : destinations proposées.

| Ministère        | Demandes | Conformité        | Commun | Actuel | Mois   | Activité | Calculé | Courbe | Hors mesures | Remplacé | À préciser |
| ---------------- | -------- | ----------------- | ------ | ------ | ------ | -------- | ------- | ------ | ------------ | -------- | ---------- |
| Intégration      | 15       | 2 / 9 / 4         | 0      | 3      | 0      | 1        | 3       | 2      | 0            | 4        | 2          |
| Coordination     | 11       | 0 / 11 / 0        | 0      | 1      | 0      | 1        | 7       | 1      | 0            | 0        | 1          |
| Communication    | 9        | 0 / 9 / 0         | 0      | 2      | 4      | 0        | 2       | 1      | 0            | 0        | 0          |
| Social           | 7        | 0 / 7 / 0         | 0      | 1      | 4      | 0        | 1       | 0      | 0            | 0        | 1          |
| Film             | 9        | 1 / 8 / 0         | 0      | 2      | 5      | 0        | 1       | 0      | 0            | 1        | 0          |
| Tech             | 8        | 1 / 7 / 0         | 0      | 1      | 3      | 0        | 1       | 1      | 0            | 1        | 1          |
| MCAD             | 19       | 3 / 16 / 0        | 1      | 3      | 9      | 0        | 2       | 0      | 0            | 0        | 4          |
| MPI              | 12       | 2 / 7 / 3         | 0      | 4      | 0      | 1        | 3       | 1      | 0            | 1        | 2          |
| Santé            | 7        | 0 / 6 / 1         | 1      | 0      | 5      | 0        | 0       | 0      | 0            | 0        | 1          |
| Merch            | 9        | 2 / 6 / 1         | 0      | 2      | 3      | 0        | 2       | 0      | 1            | 0        | 1          |
| Production       | 5        | 3 / 2 / 0         | 0      | 3      | 1      | 0        | 0       | 0      | 1            | 0        | 0          |
| Prodiges Musique | 4        | 0 / 4 / 0         | 0      | 1      | 2      | 0        | 0       | 1      | 0            | 0        | 0          |
| Kumi             | 13       | 0 / 12 / 1        | 2      | 2      | 7      | 0        | 0       | 0      | 0            | 0        | 2          |
| Eagles           | 8        | 0 / 7 / 1         | 2      | 0      | 5      | 0        | 0       | 0      | 0            | 0        | 1          |
| Entretien        | 7        | 1 / 5 / 1         | 1      | 1      | 3      | 0        | 0       | 0      | 1            | 1        | 0          |
| Coordo FIJ       | 2        | 0 / 1 / 1         | 0      | 0      | 0      | 0        | 0       | 0      | 0            | 1        | 1          |
| Multilingue      | 8        | 3 / 5 / 0         | 1      | 2      | 4      | 0        | 0       | 0      | 0            | 0        | 1          |
| Sécurité         | 7        | 1 / 6 / 0         | 1      | 0      | 4      | 0        | 2       | 0      | 0            | 0        | 0          |
| Formation        | 6        | 1 / 4 / 1         | 0      | 2      | 1      | 0        | 2       | 0      | 0            | 1        | 0          |
| Protocole        | 0        | 0 / 0 / 0         | 0      | 0      | 0      | 0        | 0       | 0      | 0            | 0        | 0          |
| MDS              | 12       | 6 / 6 / 0         | 2      | 3      | 5      | 0        | 2       | 0      | 0            | 0        | 0          |
| Prodiges Junior  | 7        | 4 / 2 / 1         | 1      | 3      | 0      | 0        | 1       | 0      | 0            | 1        | 1          |
| **Total**        | **185**  | **30 / 140 / 15** | **12** | **36** | **65** | **3**    | **29**  | **7**  | **3**        | **11**   | **19**     |

## 3. Impact sur le modèle de données

Rappel : une migration suivie par git est figée. Chaque changement ci-dessous est une **nouvelle**
migration ; les tables d'ajout seulement (`mesure`, `evenement_etat`) le restent.

### 3.1 Ce qui tient aujourd'hui

36 demandes entrent dans le modèle actuel : des comptes du dimanche (NA et NC du dimanche, cultes
captés, sainte cène distribuées, enfants présents, espaces Care) et des comptes « à ce jour »
(projets en cours, stock, inscrits, langues couvertes, badges actifs). Pour elles, une migration
ajoute des lignes à `indicateur` (libellé de 60 caractères au plus, nature, ministère, ordre). Rien
ne change dans les tables, la RLS, les vues de l'église ni les tests, sauf le contrôle du lot.

Quatre de ces 36 dépassent 9999 (portée, abonnés, vues cumulées, peut-être les spectateurs du
direct) : voir 3.4.

### 3.2 Comptes par période (semaine, mois)

65 demandes se comptent sur une période : publications, campagnes, demandes, incidents, actions
sociales, prises en charge, articles vendus, nouveaux STARs. Le modèle n'a que « dimanche » et « à
ce jour ». Le BRIEF prévoit une convention : un indicateur « ce mois » devient « à ce jour », remis
à zéro par le ministère chaque mois.

| Option                  | Principe                                                                   | Avantages                                                          | Limites                                                                                                                                                                           |
| ----------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Convention du BRIEF  | « à ce jour », remis à zéro chaque mois                                    | aucune migration de structure                                      | `date_ref` est posée par la base à la date du jour : le total de septembre saisi le 2 octobre compte pour octobre ; remise à zéro oubliée ; série et cumul de l'année peu fiables |
| B. Semaine = dimanche   | nature « dimanche » ; la valeur couvre la semaine du lundi au dimanche     | aucune migration ; complétude, écart et courbe existent déjà       | oblige à saisir chaque semaine des chiffres mensuels ; petits nombres par semaine dans les domaines sensibles                                                                     |
| **C. Nature « mois »**  | `date_ref` = 1er jour du mois ; la saisie la plus récente du mois fait foi | mois écoulé saisi après coup ; total, cumul et complétude par mois | migration, trigger, vues, formulaire et tests                                                                                                                                     |
| D. Périodicité au choix | semaine, mois, trimestre ou année, fixée par indicateur                    | souple                                                             | plus de cas à tester et à afficher ; ministères incomparables entre eux                                                                                                           |

**Recommandation** : C, et B pour ce qui est vraiment hebdomadaire et lié au dimanche. Pas de
nature « année » : l'année se calcule (somme des mois, ou valeur « à ce jour »). Le formulaire
propose le mois en cours (« Octobre 2026, en cours ») et les deux précédents. L'indicateur
d'exemple « Visuels livrés ce mois » n'existe que dans `seed.sql` : il passe en « mois » sans
migration de données.

- **Migration** : nouveau contrôle sur `indicateur.nature` (`'dimanche', 'a_ce_jour', 'mois'`),
  par suppression puis ajout de la contrainte ; dans `private.controler_mesure`, refus d'une date
  qui n'est pas un 1er du mois ou d'un mois futur (heure de Paris) ; vues `v_mesure_mois` (saisie la
  plus récente par indicateur, ministère et mois), séries de 12 mois, cumul de l'année. Aucun
  changement de RLS, de GRANT ni de journal : c'est toujours `mesure`, en ajout seulement.
- **Tests** : pgTAP (date qui n'est pas un 1er, mois futur, la plus récente gagne, changement de mois
  à minuit heure de Paris, ministère désactivé, cumul et complétude) ; Vitest (libellés de mois,
  formulaire).

### 3.3 Activités et sessions propres à un ministère

Demandes concernées : Welcome Prodiges (Intégration), sessions de baptême (Coordination), Prière
des Stars et chaîne de prière (MPI), répétitions (Prodiges Musique), activités de Kumi et
d'Eagles, sessions de Formation et de Prodiges Junior, exercices de Sécurité.

| Option                                      | Avantages                                                                                     | Limites                                                                                                                                                                                                                |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Session d'église « Autre rassemblement » | existe                                                                                        | déclarée par l'administration, saisie par tous les ministères attendus, présents comptés en STARs avec « déjà comptés », affichée sur la vue de l'église : ce n'est pas le même objet (Welcome Prodiges compte des NA) |
| B. Indicateur « dimanche »                  | existe                                                                                        | seulement si l'activité a lieu le dimanche (chaîne de prière, sainte cène, enfants)                                                                                                                                    |
| C. Comptes du mois                          | nature « mois » de 3.2 : activités du mois et présents du mois                                | pas de chiffre ni de courbe par activité                                                                                                                                                                               |
| D. Nature « jour »                          | une valeur par activité, datée d'aujourd'hui ou avant ; total, moyenne et courbe par activité | pas de complétude (personne ne déclare les activités prévues) ; deux activités le même jour se confondent                                                                                                              |
| E. Table d'activités                        | complétude possible                                                                           | nouvelle table, RLS, fonctions et écrans : presque une étape entière ; le BRIEF met le comptage des événements hors V1 (section 11)                                                                                    |

**Recommandation** : B quand l'activité a lieu le dimanche ; C en phase 1 ; D en phase 2 si la
coordination confirme le besoin d'un chiffre par activité (K18, K21, K35, K42). Ni A ni E.

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
- **Migration** : colonnes `unite` (liste fermée) et `valeur_max` (entier positif) ; nouveau
  contrôle de `mesure.valeur` ; trigger mis à jour.
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
- **Visibilité** : un ministère ne lit que ses événements. Si Coordination doit compter ceux de tous
  les ministères (K11), il faut une fonction de lecture qui ne rend que des nombres, sans titre,
  comme `v_tableau_ministeres`.
- **Événements « couverts »** (MCAD, Santé, Production, Multilingue, Sécurité) : rien ne relie un
  événement aux ministères qui le couvrent, et un ministère ne voit pas les événements des autres.
  Option A, **compte du mois saisi par chaque ministère** (recommandée), sans total de l'église (le
  même événement serait compté plusieurs fois) ; option B, table `evenement_couverture` et
  visibilité des titres et dates de tous les événements pour tous les ministères : changement de
  modèle et de RLS, phase 3 au plus tôt (K9).
- **Migration (phase 2)** : une vue des comptages par ministère, état et mois, tirée de
  `evenement_etat`. **Tests** : report détecté, dernier état gagnant, visibilité par profil.

### 3.7 Valeurs calculées

Même règle que le pourcentage FIJ : un taux, une moyenne, un cumul ou une évolution ne se saisit
jamais ; il se calcule à partir de comptes saisis et s'affiche avec sa complétude ; « Non calculé »
si le dénominateur manque ou vaut zéro.

| Type                                                                 | Exemples                                                    | Complétude affichée                        |
| -------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------ |
| Cumul depuis le 1er janvier d'un indicateur « dimanche » ou « mois » | NA cumulés, baptisés de l'année, actions de l'année         | « 38 dimanches sur 40 », « 9 mois sur 10 » |
| Ratio de deux indicateurs du même ministère, même période            | demandes résolues sur reçues, enfants présents sur inscrits | mois ou dimanches qui ont les deux valeurs |
| Moyenne par activité (phase 2)                                       | présents par session de Welcome Prodiges                    | « 12 activités saisies »                   |
| Évolution                                                            | courbe de 10 dimanches ou de 12 mois                        | trous et cercles vides, comme l'église     |

- **Déclaration** : un indicateur propre n'a pas de code (`code` est vide quand `ministere_id` est
  rempli) ; le code de l'interface ne peut donc pas le nommer. Proposition : nouvelle table
  `indicateur_calcul` (ministère, libellé, type, numérateur, dénominateur, ordre), écrite par
  migration, lue comme `indicateur` (rien pour EJP Tech), et une vue `v_calcul`.
- **Dénominateurs absents de la liste** : demandes reçues (Communication), événements à couvrir
  (MCAD, Santé, Multilingue), postes à tenir et postes tenus (Sécurité), projets terminés (Film). Ils
  deviennent des comptes saisis si la coordination le confirme ; sinon le taux est retiré.
- **Année** : année civile, heure de Paris (K2). Avant la mise en service, il n'y a rien : les cumuls
  partent de la mise en service, ou d'un total de départ saisi « à ce jour » (K3).
- **Tests** : pgTAP pour chaque type (complétude, dénominateur nul, ministère désactivé, matrice des
  droits de la nouvelle table) ; Vitest pour l'affichage.

### 3.8 Rattacher les indicateurs aux ministères

En production, l'administration crée les ministères (écran 13). En local et en CI, ils viennent de
`seed.sql`, chargé **après** les migrations. Une migration qui crée les indicateurs de Kumi doit
donc trouver Kumi :

- **par son nom** (recommandé) : le nom est unique et ne change pas dans l'outil. La migration
  n'insère rien là où le ministère manque (local, CI) et se termine par un contrôle qui signale les
  noms introuvables. La préproduction porte les 22 noms, avec des comptes fictifs, et sert de
  recette avant la production ;
- en créant les 22 ministères par migration avec un code, comme FIJ : rejeté, car `seed.sql` crée
  les mêmes noms (Communication, Intégration) et toutes les valeurs attendues du BRIEF supposent 8
  ministères.

`seed.sql` garde ses 8 ministères et reçoit un indicateur d'exemple par nature.

### 3.9 Récapitulatif des migrations

| Migration (nouvelle)              | Contenu                                                                                            | Phase        | Tests pgTAP                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------- |
| `indicateurs_natures_unites`      | nature « mois » ; colonnes `unite`, `valeur_max`, `groupe` ; contrôle de `mesure.valeur` ; trigger | 1            | dates du mois, plafond, valeurs par défaut                    |
| `indicateurs_vues_mois`           | `v_mesure_mois`, séries de 12 mois, cumuls de l'année avec complétude                              | 1            | cumuls, complétude, heure de Paris                            |
| `indicateurs_calculs`             | table `indicateur_calcul`, RLS, GRANT, vue `v_calcul`                                              | 1            | matrice des droits, ratios, « Non calculé »                   |
| `journal_administration_chiffres` | journal de l'administration : garder les lignes communes d'un envoi mixte (section 5)              | 1            | l'administration lit les chiffres communs, jamais les propres |
| `indicateurs_lot_1`, puis 2, 3    | indicateurs propres et calculs validés, par nom de ministère                                       | 1, puis lots | nombre d'indicateurs créés sur un jeu de test                 |
| `indicateurs_nature_jour`         | nature « jour » (activités datées)                                                                 | 2            | date future refusée, moyenne                                  |
| `evenements_comptages`            | comptages par ministère et par mois, « reporté » lu dans l'historique                              | 2            | report, dernier état, visibilité                              |

Toute nouvelle table suit le skill `nouvelle-table` (GRANT, RLS, pgTAP, types, accès aux données)
et passe la revue `rls-auditor`. Les types TypeScript sont régénérés.

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
| Enfants revenus à une session suivante                                 | Prodiges Junior      | compte « enfants déjà venus » chaque dimanche ; public mineur : totaux seulement                              |
| Nouveaux bénéficiaires, nouvelles participantes, nouveaux participants | Social, Kumi, Eagles | compte du mois saisi par le ministère, sans liste                                                             |
| Taux de satisfaction                                                   | Formation            | réponses satisfaites et réponses reçues d'un questionnaire anonyme, ratio calculé, si ce questionnaire existe |
| Taux de présence des équipiers                                         | MCAD                 | équipiers présents et équipiers attendus, deux comptes, ratio calculé                                         |

### 4.2 Domaines sensibles

Santé (prises en charge, interventions, orientations), Social (bénéficiaires, personnes
accompagnées), Call your sister (Kumi), la plate-forme d'écoute (Eagles) et Prodiges Junior
(mineurs). Un total ne contient pas de donnée personnelle tant qu'il ne permet de reconnaître
personne ; « 1 prise en charge le dimanche 4 octobre » peut désigner quelqu'un pour qui était là,
et devient alors une donnée de santé (article 9 du RGPD).

- Totaux **par mois** seulement, jamais par semaine ni par dimanche ; aucune ventilation (âge,
  sexe, motif).
- Aucun texte libre attaché au chiffre ; les points d'attention de ces ministères restent soumis au
  rappel et à la modération.
- Visibles par le ministère, le berger et le conseil seulement (règle actuelle des indicateurs
  propres) ; jamais sur la vue de l'église, jamais dans un email (P14), et déjà cachés du journal de
  l'administration.
- Petits nombres : seuil d'affichage à décider par la coordination, par exemple « moins de 3 »
  (K5).
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
- Taux d'engagement : deux comptes (interactions, portée) et un ratio calculé, pas de décimale saisie.
- Un même chiffre n'est reporté que par un ministère (vues : Film ou MCAD, K7).

### 4.5 Un chiffre, une source

- « STARs actifs » et « STARs au service » restent les indicateurs communs, saisis par chaque
  ministère et additionnés par l'outil (D1). MDS ne saisit pas un deuxième total de l'église.
- « Mobilisés », équipiers, agents, animateurs, interprètes : ce sont les STARs au service, sauf
  s'ils comptent des personnes qui ne sont pas STARs (libellé « hors STARs ») (K8).
- « Bénévoles actifs » (Kumi, Eagles) = « STARs actifs » de ces ministères.
- Nouveaux STARs et intégrations dans les équipes : MDS seul.
- Lives et diffusions en direct (MCAD) : un seul indicateur (K32).
- Les indicateurs propres ne s'additionnent jamais entre ministères : pas de risque de double
  compte tant qu'aucun total de l'église n'est demandé (K12). Si un total est demandé, les règles de
  complétude et de double compte s'appliquent.

### 4.6 Pages Confidentialité et Conditions d'utilisation

Aucune nouvelle donnée personnelle, aucun nouveau sous-traitant : le registre ne change pas de
nature. Deux phrases à ajouter :

- **Confidentialité**, « À quoi sert l'outil » : « Les ministères y saisissent des totaux, jamais
  une information sur une personne. Pour la santé, l'accompagnement et les enfants, seuls des totaux
  par mois sont saisis. »
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
  avec sa propre boîte mail partagée, distinct des comptes EJP Tech. Les mêmes personnes ont deux
  comptes ; le compte de ministère voit ce que voit tout ministère (vue de l'église et sa fiche).
  Rejeté : donner un ministère à un compte EJP Tech (contraire au modèle et à P06) (K30).
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
- **Administration de l'église et journal** : elle ne lit pas une ligne de journal dès qu'un envoi
  porte un indicateur propre. Comme le formulaire du dimanche envoie tout en un seul ajout, elle
  perdrait la plupart des saisies du dimanche dans son journal. Proposition : sa lecture garde la
  ligne et n'en montre que les indicateurs communs (migration `journal_administration_chiffres`).

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
  précédents, un seul ajout. « Vos saisies » gagne une ligne « Chiffres de septembre » (À faire tant
  qu'aucune valeur du mois écoulé n'est saisie).
- **Phase 2, « Saisir une activité »** : date, indicateur, valeur.
- Le rappel par email (P14) peut gagner un rappel des chiffres du mois.

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
  autres ministères » (P30).
- Chiffres d'un ministère sur la vue de l'église (NA du dimanche, enfants présents) : seulement si
  la coordination le demande (K12), en phase 3.

### Configuration des indicateurs

| Critère                                                                                    | Migrations par lot (BRIEF)                           | Écran de configuration pour l'administration                                          |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Délai d'un changement                                                                      | quelques jours (EJP Tech écrit, la personne déploie) | immédiat                                                                              |
| Respect des règles (aucun taux saisi, aucune donnée personnelle dans un libellé, doublons) | relu par EJP Tech                                    | à la charge de l'administration ; la base ne contrôle que le format                   |
| Travail à construire                                                                       | aucun écran ; une migration par lot                  | écran, fonctions `security definer`, actions de journal, matrice, tests : 4 à 6 jours |
| Rattachement aux ministères                                                                | par nom (3.8)                                        | direct                                                                                |
| Traçabilité                                                                                | git et journal « Système »                           | journal                                                                               |
| Périmètre V1                                                                               | prévu                                                | hors périmètre (BRIEF, section 11), à rouvrir                                         |

**Recommandation** : migrations par lot pour les phases 1 et 2, sur demande écrite de
l'administration. Un écran se réexamine après un mois d'usage, si les demandes de changement
dépassent deux lots par mois.

## 7. Impact sur le plan

### Étapes touchées

| Étape                                 | Changement proposé                                                                                                                |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 3, vue de l'église (en cours)         | aucun changement de modèle ni de jeu d'exemple ; affichage vérifié à 22 ministères ; listes de noms bornées (P30)                 |
| 4a, modèle des indicateurs (nouvelle) | migrations de la phase 1 (3.9), pgTAP, types, indicateur d'exemple par nature dans `seed.sql`                                     |
| 4, fiche ministère et saisies         | groupes, formulaire « Chiffres du mois », unités, cumuls et ratios avec complétude, courbes de 12 mois                            |
| 4 bis, rappels (P14)                  | rappel des chiffres du mois, si P16 est retenu                                                                                    |
| 6, administration                     | colonne « Indicateurs propres » de l'écran 13 : un nombre et un lien, plus une liste ; journal de l'administration                |
| 8, déploiement                        | 22 ministères et comptes ; lots d'indicateurs recettés en préproduction, puis en production ; pages Confidentialité et Conditions |

### Phases

- **Phase 1, avec la mise en service** : natures et colonnes (P16, P18, P19) ; au plus six
  indicateurs saisis par ministère, choisis parmi les candidats ci-dessous (environ 90 en tout) ;
  calculs simples (cumuls, ratios) ; vue de l'église inchangée.
- **Phase 2, après la mise en service** : activités datées (P17), comptages d'événements (P20),
  lots suivants au fil des réponses.
- **Phase 3, si la coordination la confirme** : grands graphiques, chiffres de ministères sur la vue
  de l'église, chiffres FIJ par département, couverture d'événements, écran de configuration.

Candidats de la phase 1 par ministère (D : dimanche, J : à ce jour, M : mois). La coordination en
choisit six au plus par ministère (K13).

| Ministère        | Candidats saisis                                                                                                                                                                                                                    | Calculés                                 | Plus tard ou à préciser                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------- |
| Intégration      | NA du dimanche (D), NC du dimanche (D), NA et NC intégrés en FIJ (J), sessions et présents de Welcome Prodiges (M, en attendant la phase 2)                                                                                         | NA et NC de l'année                      | retour des NA, présence au culte et aux événements |
| Coordination     | baptisés (M, en attendant la phase 2), retard du début du culte en minutes (D)                                                                                                                                                      | baptisés de l'année                      | comptages d'événements (phase 2), « à l'heure »    |
| Communication    | publications (M), campagnes (M), contenus produits (M), demandes traitées (M), portée ou abonnés (J)                                                                                                                                | taux dans les délais, si reçues ajoutées | engagement                                         |
| Social           | actions sociales (M), bénéficiaires (M), nouveaux bénéficiaires (M), personnes accompagnées (J)                                                                                                                                     | actions de l'année                       | fonds levés (K6), partenariats (K28)               |
| Film             | tournages (M), vidéos produites (M), vidéos publiées (M), projets en cours (J), projets terminés (M), livrés dans les délais (M)                                                                                                    | taux de livraison dans les délais        | vues cumulées (K7)                                 |
| Tech             | demandes reçues (M), demandes résolues (M), demandes en cours (J), incidents techniques (M)                                                                                                                                         | taux de résolution                       | incidents récurrents                               |
| MCAD             | cultes captés (D), spectateurs du direct (D), plateformes (J), événements couverts (M), lives (M), contenus audiovisuels (M), incidents, problèmes audio et vidéo, interruptions (M), personnes formées (M), nouveaux équipiers (M) | évolution de l'audience                  | vues, couverture, présence des équipiers           |
| MPI              | présents à la chaîne de prière (D), participants de la nuit (D), équipe sainte cène (J), sainte cène distribuées (D)                                                                                                                | participants cumulés                     | Prière des Stars (K35), taux de participation      |
| Santé            | événements couverts (M), prises en charge (M), interventions (M), incidents avec intervention (M), orientations (M)                                                                                                                 |                                          | taux de couverture                                 |
| Merch            | stock disponible (J), produits en stock critique (J), articles vendus (M), commandes (M), chiffre d'affaires (M, euros, K6)                                                                                                         | panier moyen, évolution des ventes       | marge                                              |
| Production       | mag et photo du dimanche (D), projets en cours (J), personnes formées (J), événements couverts (M)                                                                                                                                  |                                          | budget (point d'attention)                         |
| Prodiges Musique | musiciens et chanteurs par catégorie (J), morceaux préparés (M), morceaux originaux (M)                                                                                                                                             |                                          | présence aux répétitions (phase 2)                 |
| Kumi             | prestataires inscrites (J), profils actifs (J), activités (M), participantes (M), nouvelles participantes (M), projets (M), mises en relation (M), réservations (M), prises en charge Call your sister (M)                          |                                          | femmes mobilisées, taux de participation           |
| Eagles           | activités (M), participants (M), nouveaux participants (M), projets (M), prises en charge de la plate-forme d'écoute (M)                                                                                                            |                                          | taux de participation                              |
| Entretien        | problèmes en attente (J), problèmes signalés (M), problèmes résolus (M), tâches réalisées (M)                                                                                                                                       |                                          | besoins en matériels (point d'attention)           |
| Coordo FIJ       | carte des FIJ existante                                                                                                                                                                                                             |                                          | chiffres par département et du mardi (K47)         |
| Multilingue      | langues couvertes (J), bénéficiaires de la traduction (D), événements couverts (M), demandes de traduction (M), demandes satisfaites (M), incidents de traduction (M)                                                               | demandes satisfaites sur demandes        | taux de couverture                                 |
| Sécurité         | événements couverts (M), incidents (M), interventions (M), exercices et formations (M)                                                                                                                                              | incidents par événement couvert          | couverture des postes (K49)                        |
| Formation        | inscrits (J), personnes ayant terminé une formation (J), formateurs mobilisés (M)                                                                                                                                                   | taux de complétion                       | taux de présence (phase 2), satisfaction           |
| Protocole        | indicateurs communs seulement                                                                                                                                                                                                       |                                          | K51                                                |
| MDS              | espaces Care (D), badges actifs (J), badges en attente (J), nouveaux STARs (M), STARs désactivés (M), recrutements aboutis (M), non aboutis (M), badges distribués (M)                                                              | évolution des STARs actifs (courbe)      | événements de l'année (phase 2)                    |
| Prodiges Junior  | enfants présents (D), nouveaux enfants (D), enfants inscrits (J)                                                                                                                                                                    | taux de présence                         | sessions (K54)                                     |

### Ordre de grandeur

En jours de travail d'EJP Tech avec Claude Code, à revoir au mode plan de chaque étape :

| Travail                                                                  | Ordre de grandeur         |
| ------------------------------------------------------------------------ | ------------------------- |
| Étape 4a : migrations de la phase 1, vues, pgTAP, types                  | 3 à 4 jours               |
| Étape 4 : surcoût (groupes, chiffres du mois, unités, calculs, courbes)  | 3 à 5 jours de plus       |
| Un lot d'indicateurs (migration, recette en préproduction)               | une demi-journée à 1 jour |
| Étape 4 bis : rappel du mois                                             | 1 jour de plus            |
| Phase 2 : nature « jour », saisie d'une activité, comptages d'événements | 6 à 10 jours              |
| Phase 3                                                                  | à estimer après réponses  |

### Étape 3 en cours

À ne **pas** faire maintenant :

- changer le modèle, les vues de l'église ou `seed.sql` (8 ministères, valeurs attendues du BRIEF) ;
- afficher un indicateur propre sur la vue de l'église ;
- attendre les réponses de la coordination : l'étape 3 n'en dépend pas.

À faire dans l'étape 3, sans toucher au modèle :

- un test d'affichage avec 22 ministères (tableau et liste « Les ministères », barre de la session,
  listes de noms) aux trois largeurs ;
- la borne des listes de noms (P30), si EJP Tech la confirme.

## 8. Décisions proposées et questions

### Décisions (détail dans `docs/decisions.md`)

- **P15**. Tri des KPI : comptes saisis, le reste calculé, commun, point d'attention ou retiré.
- **P16**. Nouvelle nature « mois » pour les comptes par période.
- **P17**. Activités propres : dimanche ou mois en phase 1, nature « jour » en phase 2.
- **P18**. Unité, plafond et groupe de chaque indicateur.
- **P19**. Valeurs calculées déclarées par migration (`indicateur_calcul`).
- **P20**. Comptages d'événements ; « reporté » lu dans l'historique ; « couvert » saisi par mois.
- **P21**. Suivi de personnes remplacé par des comptes agrégés.
- **P22**. Domaines sensibles : totaux par mois, visibilité restreinte.
- **P23**. Chiffres financiers : seulement si la coordination les veut.
- **P24**. Chiffres de plateformes : saisis à la main, une seule source.
- **P25**. Compte de ministère Tech distinct des comptes EJP Tech.
- **P26**. Un chiffre, une source (indicateurs communs, MDS, mobilisés, bénévoles).
- **P27**. Coordo FIJ est le ministère FIJ ; chiffres par département en phase 3.
- **P28**. Indicateurs créés par lots de migration, rattachés par nom de ministère.
- **P29**. Trois phases, six indicateurs saisis au plus par ministère en phase 1, étape « 4a ».
- **P30**. Vue de l'église à 22 ministères : aucun indicateur propre, listes de noms bornées.

### Questions transverses

- **K1** : le mois convient-il comme période commune des comptes (publications, demandes,
  incidents, prises en charge, ventes) ? Lesquels doivent se compter par semaine ?
- **K2** : « depuis le début de l'année » veut-il dire depuis le 1er janvier, pour tous ?
- **K3** : les cumuls partent-ils de la mise en service, ou chaque ministère saisit-il un total de
  départ ?
- **K4** : un taux calculé à partir de deux totaux convient-il à la place d'un suivi de personnes ?
  Les dénominateurs proposés (section 3.7) conviennent-ils ?
- **K5** : pour Santé, Social, Call your sister, la plate-forme d'écoute et Prodiges Junior, un
  total par mois suffit-il ? Faut-il afficher « moins de 3 » pour les très petits nombres ?
- **K6** : veut-on des chiffres financiers dans l'outil (chiffre d'affaires, marge, fonds levés,
  budget) ? Si oui, l'administration de l'église doit-elle les voir ?
- **K7** : quel ministère reporte les vues et les abonnés : Communication, Film ou MCAD ? Sur
  quelles plateformes ?
- **K8** : les « mobilisés » (équipiers, agents, animateurs, interprètes) sont-ils les STARs au
  service, déjà saisis ? Sinon, qui d'autre ?
- **K9** : pour les événements couverts, un compte par mois saisi par chaque ministère suffit-il,
  sans lien avec les événements de l'outil ?
- **K10** : « prévus » = validés ou en préparation, datés d'aujourd'hui ou après ? « Reporté » = date
  repoussée ? Taux de réalisation : sur les prévus, ou sur réalisés plus annulés ?
- **K11** : Coordination compte-t-elle ses événements, ou ceux de tous les ministères ?
- **K12** : faut-il des chiffres d'un ministère sur la vue de l'église (par exemple NA du dimanche,
  enfants présents) ? Lesquels ?
- **K13** : au plus six indicateurs saisis par ministère pour la mise en service, le reste ensuite :
  d'accord ? Qui choisit, le ministère ou la coordination ?
- **K14** : les 22 ministères sont-ils tous à créer à la mise en service, chacun avec une boîte mail
  partagée ? Quels noms exacts ?
- **K15** : les petites courbes (10 dimanches, 12 mois) suffisent-elles pour la mise en service ?
- **K16** : qui valide les libellés raccourcis à 60 caractères proposés par EJP Tech ?

### Questions par ministère

- **Intégration**
  - **K17** : que veulent dire NA et NC, et quand une personne est-elle comptée ?
  - **K18** : Welcome Prodiges est-il une activité d'Intégration ou un rassemblement d'église ? Quel
    jour, à quel rythme ?
  - **K19** : « présence au culte » et « présence lors des événements » : présence de qui (équipe,
    NA, assemblée) ?
  - **K20** : qui tient les intégrations en FIJ, Intégration ou Coordo FIJ ? Taux de perte : après
    combien de temps sans nouvelles ?
- **Coordination**
  - **K21** : les baptisés se comptent-ils par session de baptême (date) ou par mois ?
  - **K22** : saisir le retard du culte en minutes convient-il ? « À l'heure » : quelle tolérance ?
  - **K23** : « dernière période » : la semaine ou le mois ?
- **Communication**
  - **K24** : quelle différence entre publications, contenus produits et campagnes ?
  - **K25** : demandes de qui, par quel canal, et quel délai de référence ? Faut-il compter aussi
    les demandes reçues ?
  - **K26** : engagement : interactions divisées par portée ? Portée cumulée depuis quand ?
- **Social**
  - **K27** : bénéficiaires : passages du mois ou personnes ? Différence avec « personnes
    accompagnées » ?
  - **K28** : partenariats actifs et actions externes du mois : deux chiffres séparés ?
- **Film**
  - **K29** : qu'est-ce qu'un projet, qui fixe son délai ? « Délai moyen de production » remplacé par
    « livrés dans les délais » : d'accord ?
- **Tech**
  - **K30** : un compte de ministère Tech, distinct des comptes EJP Tech, avec sa propre boîte mail :
    d'accord ?
  - **K31** : demandes de qui, par quel canal ? Quand un incident est-il récurrent ? « Temps moyen de
    résolution » retiré : d'accord ?
- **MCAD**
  - **K32** : « live » et « diffusion en direct » sont-ils la même chose ?
  - **K33** : les incidents techniques sont-ils la somme des problèmes audio, vidéo et des
    interruptions ? Par dimanche ou par mois ?
  - **K34** : spectateurs du direct : pic, moyenne ou total de connexions ?
- **MPI**
  - **K35** : la Prière des Stars a-t-elle lieu le dimanche ? Sinon, quel jour et à quel rythme ?
  - **K36** : « présents à la chaîne de prière » et « participants de la nuit du samedi au
    dimanche » : même chiffre ?
  - **K37** : sainte cène : compte-t-on des portions ou des personnes servies ? Taux de
    participation : sur quel total ?
- **Santé**
  - **K38** : quelle différence entre prise en charge, intervention et incident nécessitant une
    intervention ?
- **Merch**
  - **K39** : ventes le dimanche, aux événements ou au mois ? Marge sur quels coûts ? « Articles
    les plus vendus » retiré : d'accord ?
- **Production**
  - **K40** : mag et photo : deux chiffres séparés ? Les formations comptent-elles comme projets ?
  - **K41** : budget : le devis (5 164 €) ou un budget alloué ? Le besoin de location passe-t-il par
    un point d'attention ?
- **Prodiges Musique**
  - **K42** : quelles catégories de musiciens et chanteurs ? Combien de répétitions par semaine, et
    présence rapportée à quel total ?
- **Kumi**
  - **K43** : différence entre activités et projets, et entre femmes mobilisées, bénévoles actives
    et participantes ? Qu'est-ce qu'un profil actif des Pages Roses ?
- **Eagles**
  - **K44** : différence entre activités et projets ? Les bénévoles actifs sont-ils les STARs
    d'Eagles ?
- **Entretien**
  - **K45** : problèmes et tâches : par semaine ou par mois ? « Délai moyen » remplacé par « résolus
    en plus de 7 jours », ou retiré ?
- **Coordo FIJ**
  - **K46** : Coordo FIJ est-il le ministère FIJ qui saisit déjà la carte ? « Stars habituelles » :
    faut-il lire « stats habituelles » ?
  - **K47** : quels chiffres exactement, par département ou au total, et lesquels chaque mardi ?
    Quelles étapes du parcours du jeune compter ?
- **Multilingue**
  - **K48** : langues couvertes en général ou ce dimanche ? Comment compte-t-on les bénéficiaires de
    la traduction ?
- **Sécurité**
  - **K49** : combien de postes à tenir, fixe ou selon le dimanche ? Différence entre incident et
    intervention ?
- **Formation**
  - **K50** : Formation est-il EJP Formation ? Que veut dire PCNC ? Existe-t-il un questionnaire de
    satisfaction anonyme ?
- **Protocole**
  - **K51** : le Protocole veut-il un indicateur propre, ou seulement les indicateurs communs ?
- **MDS**
  - **K52** : MDS veut-il un total de STARs de son registre, en contrôle de la somme des ministères ?
    Nouveaux STARs : dans l'église ou dans un ministère ?
  - **K53** : badges distribués : par mois ou en cumul ? Qu'est-ce qu'un recrutement « abouti » ?
- **Prodiges Junior**
  - **K54** : « nouveaux enfants » = venus pour la première fois ce dimanche ? Une session est-elle
    un dimanche ?
