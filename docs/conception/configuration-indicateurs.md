# Configuration des indicateurs

Statut : **à l'étude, non appliqué** (décision T29 de `docs/decisions.md`). Rien n'est codé, aucune
migration n'est écrite, `BRIEF.md` n'est pas modifié. Une session ne construit rien à partir de ce
document tant qu'EJP Tech et la coordination n'ont pas répondu aux questions de la section 10.
Date : 5 octobre 2026, revue appliquée le même jour.

Sources : `docs/conception/kpi-ministeres.md` (analyse des 185 demandes, annexe et questions),
`docs/sources/kpi-coordination-2026-10.md` (les « lignes » citées sont celles de ce fichier),
`docs/decisions.md` (P06, P07, P15 à P30, T26 à T28), `BRIEF.md` (sections 2 à 4, 6, 7 et 9). Ce
document fait la synthèse de trois conceptions étudiées et de deux évaluations indépendantes
(section 11). Là où `kpi-ministeres.md` (3.7 à 3.9 et 6) diffère, ce document le remplace (T29).

## 1. Besoin et décisions de départ

### Demande d'EJP Tech (5 octobre 2026)

- Un écran de configuration des indicateurs, utilisé par l'administration de l'église et EJP
  Tech. Une première vague par migration est acceptable, l'écran vient ensuite.
- Les ministères peuvent, « dans certaines limites », créer leurs propres indicateurs, de façon
  propre, efficace et réfléchie.
- La première proposition (un formulaire : nom, saisi ou calculé, fréquence, unité, visibilité,
  une case « sensible » et quelques avertissements sur le nom) n'était pas assez mûre.
- EJP Tech voit tous les chiffres, en lecture seule (T28).

### Ce qui existe et ce que cette conception change

| Décision          | Contenu aujourd'hui                                                                                 | Effet de cette conception                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| BRIEF, section 4  | indicateurs propres créés par migration, deux natures, plafond de 9999                              | créés à l'écran après une première vague ; trois rythmes ; plafond par sorte de nombre                                           |
| BRIEF, section 11 | « écran de création des indicateurs propres » hors de la V1                                         | rouvert à la demande d'EJP Tech (lot 1)                                                                                          |
| P06               | l'administration de l'église ne voit ni les fiches ni les points                                    | elle voit aussi les définitions et l'usage des indicateurs propres (« saisi 4 mois sur 5 »), jamais une valeur                   |
| P08               | indicateurs propres créés par EJP Tech par migration, deux natures                                  | première vague par migration, puis l'écran ; trois rythmes                                                                       |
| P16               | nature « mois »                                                                                     | reprise : mois en cours et deux précédents à l'écran ; la base borne aussi les mois trop anciens (3.1)                           |
| P19               | table `indicateur_calcul` écrite par migration                                                      | remplacée : un calcul est une ligne d'`indicateur` qui ne se saisit pas                                                          |
| P22               | indicateurs sensibles, valeur absente du journal                                                    | reprise ; plus aucune valeur d'indicateur propre au journal ; lecture des lignes brutes proposée en 3.7                          |
| P29               | migration `journal_administration_chiffres` ; écran de configuration en phase 3                     | migration inutile ; l'écran passe au lot 1                                                                                       |
| T26               | colonnes `unite`, `valeur_max`, `groupe`, `sensible`                                                | `unite` et `sensible` gardées ; plafond fixé par sorte de nombre ; pas de `groupe` (3.5) ; ni « jours », ni « minutes » en V1    |
| T27               | catalogue `private.indicateur_modele`, matérialisé par un trigger sur `ministere` ; lots successifs | catalogue `private.indicateur_prevu` (5.5) ; un bouton « Créer » remplace le trigger ; plus de lot après la première vague       |
| T28               | EJP Tech lit tous les chiffres                                                                      | EJP Tech configure sur l'écran Indicateurs (sur demande écrite de l'administration pour certains gestes, 2), lit, ne saisit rien |

### Exigences

| Code | Exigence                                                                                                                                                  |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1   | L'administration ajoute, corrige, remplace et retire les indicateurs de tout ministère à l'écran, sans migration ; EJP Tech aussi, selon la règle de 2.   |
| F2   | La première vague (indicateurs prévus par la coordination) s'écrit une fois par migration dans un catalogue, puis se crée en un clic par ministère.       |
| F3   | Un ministère ajoute des indicateurs à lui, dans des limites que la base impose : une suggestion au lot 1, un compte écrit par lui au lot 2.               |
| F4   | Une valeur calculée (taux, moyenne, somme de l'année) ne se saisit jamais.                                                                                |
| F5   | Une valeur saisie garde pour toujours son sens : libellé et définition ne se corrigent que tant que rien n'est saisi ; ensuite, on remplace l'indicateur. |
| F6   | Tout total s'affiche avec sa complétude, y compris dans le temps (« 9 mois sur 9 »).                                                                      |
| F7   | Aucun nom ni information personnelle dans un libellé ou une définition ; les textes écrits par un ministère (lot 2) sont relus par EJP Tech.              |
| F8   | Chaque geste écrit une seule ligne de journal, sans texte libre ni valeur d'indicateur propre.                                                            |
| F9   | L'administration de l'église voit les définitions et l'usage, jamais la valeur d'un indicateur propre (P06 revue).                                        |
| F10  | Les règles vivent dans la base ; l'écran les interroge au lieu de les recopier.                                                                           |

Non fonctionnelles :

- **Ajout seulement** : `mesure` et `journal` restent en ajout seulement. `indicateur` est une
  table de référence (comme `ministere`) : ses seuls changements sont listés en 5.9, faits par des
  fonctions et tracés au journal. Aucune suppression.
- **Sécurité** : RLS sur toute table exposée, aucun GRANT d'écriture directe, `security definer`
  seulement dans `private`, `exige_aal2()` en tête de chaque fonction de l'API.
- **Dates** : heure de Paris (`private.aujourdhui()`, `private.dimanche_reference()`, et
  `(x at time zone 'Europe/Paris')::date` pour un horodatage), jamais `current_date`.
- **Entretien** : une seule table de définitions, un seul trigger nouveau, aucune table de versions
  ni de cache. L'outil est temporaire et l'équipe est bénévole : ce qui n'est pas nécessaire à la
  mise en service va au lot 2.

## 2. Vue d'ensemble

### Deux lots

Presque toute la complexité vient des libellés libres écrits par les ministères : mots refusés,
validation, correction, relecture. Ils passent donc après la mise en service.

| Lot                                      | Quand                                                  | Contenu                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lot 1                                    | avant la mise en service (V1)                          | première vague ; écran Indicateurs (ajouter, calcul, corriger tant que rien n'est saisi, remplacer, retirer, retirer pour confidentialité, usage) ; « Mes indicateurs » du ministère limité aux suggestions, en un clic, sans texte libre ; fiche, sommes, courbes, calculs ; « Chiffres du mois » ; journal sans valeur propre |
| Lot 2                                    | après la mise en service, si EJP Tech le confirme (Q1) | comptes écrits par un ministère (libellé et définition libres) : mots refusés aux ministères, validation (état « en attente »), correction par le ministère, relecture et masquage de ces textes, limite sur 30 jours, « Rendre officiel », jeu des 185 libellés, alerte de valeur inhabituelle                                 |
| Plus tard, si la coordination le demande | sans date                                              | sorte « minutes » (K22), courbe d'un « à ce jour » et du total de l'église (3.4), calcul sur un chiffre commun (K8)                                                                                                                                                                                                             |

Au lot 1, un ministère qui veut un chiffre absent des suggestions le demande à l'administration de
l'église, qui le crée à l'écran le jour même. Le lot 2 s'ajoute par une migration de plus, sans
toucher aux saisies. Les passages qui ne concernent que le lot 2 le disent.

### Les notions

Huit mots suffisent à l'écran :

- **Chiffres communs** : STARs au service, STARs actifs, dont en FIJ. Ils ne se configurent pas.
- **Indicateur** : un nombre entier qu'un ministère saisit. Il a un libellé (ce qu'on compte, 2 à
  60 caractères), une définition (« Ce qu'on compte exactement », 10 à 140 caractères) et un
  rythme.
- **Rythme** : « Chaque dimanche », « Chaque mois » ou « À ce jour ».
- **Sorte de nombre** : un compte (jusqu'à 9 999), un grand compte (jusqu'à 9 999 999) ou des
  euros.
- **Calcul** : un taux ou une moyenne de deux indicateurs du même ministère. Il ne se saisit pas.
- **Prévus** : les indicateurs que la coordination a choisis pour un ministère (première vague).
- **Suggestions** : quelques indicateurs déjà définis, utiles à plusieurs ministères (« Événements
  couverts »), qu'un ministère ajoute en un clic.
- **Retirer** : le geste qui arrête un indicateur ; ses saisies restent.

Mentions affichées : « Ajouté par Kumi le 12 oct. », « Sensible : mois écoulés seulement »,
« Libellé corrigé le 14 oct. », « Retiré le 3 nov. » et, au lot 2, « En attente de validation ».

Refusé, parce qu'aucune demande ne l'exige ou qu'une convention suffit : groupe ou rubrique, nature
« semaine », « trimestre », « année » ou « jour », formule libre, plafond libre, ordre manuel,
brouillon, versions, niveaux d'autonomie, suppression, réactivation.

Conventions, sans option à l'écran (nommées R1 à R6 pour ne pas les confondre avec les questions
C1 à C3 de `kpi-ministeres.md`) :

- **R1** : le libellé dit seulement ce qu'on compte, sans « Nombre de », sans période ni unité :
  « Publications », pas « Nombre de publications réalisées ce mois ». L'écran ajoute la période
  (« Publications, septembre 2026 »).
- **R2** : un dispositif se nomme en tête du libellé : « Pages Roses : profils actifs », « Prière
  des Stars : sessions ». Cela remplace les groupes (3.5).
- **R3** : tout indicateur du dimanche ou du mois a sa petite courbe et la somme de ses périodes
  depuis janvier, avec sa complétude. Un stock (membres, inscrits, articles en réserve) se saisit
  « à ce jour » : la somme de ses mois n'aurait pas de sens.
- **R4** : le sens est figé. Rythme, sorte de nombre, ministère, case sensible et calcul ne
  changent jamais. Libellé et définition se corrigent tant que rien n'est saisi (4.6).
- **R5** : toute valeur saisie est un entier positif ou nul ; aucune décimale ne se saisit.
- **R6** : la fiche range les indicateurs par rythme, puis par ordre alphabétique : les lignes
  d'un même dispositif se suivent.

### Qui fait quoi

| Geste                                                            | Administration de l'église        | EJP Tech                               | Ministère                                    | Berger et conseil                   |
| ---------------------------------------------------------------- | --------------------------------- | -------------------------------------- | -------------------------------------------- | ----------------------------------- |
| Créer les indicateurs prévus d'un ministère                      | oui                               | oui                                    | non                                          | non                                 |
| Ajouter un indicateur (compte, grand compte, euros, sensible)    | oui, sur toute fiche active       | sur demande écrite de l'administration | non ; lot 2 : un compte simple, sur sa fiche | non                                 |
| Ajouter une suggestion                                           | oui                               | oui                                    | sur sa fiche, dans ses limites               | non                                 |
| Ajouter un calcul                                                | oui                               | sur demande écrite de l'administration | non (il le demande)                          | non                                 |
| Corriger un libellé ou une définition, tant que rien n'est saisi | tous, sauf communs et suggestions | idem                                   | lot 2 : ses comptes écrits par lui           | non                                 |
| Remplacer ou retirer, avec un motif                              | tous, sauf les communs            | sur demande écrite de l'administration | ses ajouts, sauf la source d'un calcul       | non                                 |
| Retirer pour confidentialité                                     | tous, sauf les communs            | idem                                   | non                                          | non                                 |
| Valider ou refuser un ajout en attente (lot 2)                   | oui                               | selon Q15                              | non                                          | non                                 |
| Rendre officiel l'ajout d'un ministère (lot 2)                   | oui                               | sur demande écrite de l'administration | non                                          | non                                 |
| Relire ou masquer le texte d'un ministère (lot 2)                | non                               | oui (modération)                       | non                                          | non                                 |
| Lire les définitions                                             | toutes                            | toutes                                 | les communs et les siennes                   | toutes, sauf un ajout jamais validé |
| Lire les valeurs                                                 | chiffres communs seulement        | toutes, en lecture (T28)               | les siennes                                  | toutes                              |
| Lire l'usage (« saisi 4 mois sur 5 », sans valeur)               | oui                               | oui                                    | le sien                                      | sur la fiche                        |

« Sur demande écrite de l'administration » est une règle de procédure, comme P07 et T27 : EJP Tech
demande, l'église décide. La base laisse les deux profils agir, car EJP Tech a demandé un écran
commun. Si la coordination le préfère (Q15), les fonctions réservent ces gestes à l'administration :
un contrôle de plus dans chacune, sans autre changement.

Les chiffres communs, le catalogue et la liste des mots refusés ne changent que par une migration
d'EJP Tech. Écrire une définition n'est pas saisir un chiffre : EJP Tech ne saisit toujours rien au
nom d'un ministère (T28).

### Cycle de vie d'un indicateur

```mermaid
stateDiagram-v2
  state "En attente de validation (lot 2)" as attente
  state "Actif" as actif
  state "Retiré" as retire
  [*] --> actif : prévus, ajout de l'administration, suggestion, compte d'un ministère sans validation
  [*] --> attente : compte écrit par un ministère qui doit être validé (4.3)
  attente --> actif : validé par l'administration
  attente --> retire : refusé, ou retiré par le ministère (jamais publié)
  actif --> actif : texte corrigé tant que rien n'est saisi, rendu officiel (lot 2)
  actif --> retire : retiré avec un motif, remplacé, retiré pour confidentialité, libellé masqué, source d'un calcul retirée
  retire --> [*]
```

- **Actif** : proposé à la saisie, affiché sur la fiche, compté dans les limites.
- **En attente** (lot 2) : ni saisi ni lu par le berger et le conseil ; compté dans les limites du
  ministère. Une fois validé, le ministère rattrape les périodes passées depuis l'ajout.
- **Jamais publié** (lot 2) : un ajout né en attente puis refusé, ou retiré par le ministère avant
  la validation, reste illisible pour le berger et le conseil, dans `indicateur` comme dans le
  journal (colonnes `ne_en_attente` et `valide_le`, 5.2 et 8.1).
- **Retiré** : définitif, comme un point traité. Plus de saisie ; l'historique reste sur la fiche
  sous « Retirés ». Un indicateur retiré sans aucune saisie disparaît des fiches et des limites (un
  calcul compte les saisies de ses sources), mais sa ligne reste en base : le journal le cite
  toujours. Son libellé redevient libre.
- **Retiré pour confidentialité** : libellé et définition masqués ; l'indicateur disparaît des
  fiches avec ses valeurs (6.3).
- Aucune suppression, aucune réactivation. Pour reprendre un chiffre retiré, on en ajoute un
  nouveau : la courbe repart de zéro. La fenêtre « Retirer » le dit avant de confirmer.

## 3. Les sortes d'indicateurs

### 3.1 Rythmes

| Rythme          | Ce qu'on saisit                        | Date (`date_ref`)                      | Où                                | Demandes (annexe) | Exemples réels                                                                                                                            |
| --------------- | -------------------------------------- | -------------------------------------- | --------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Chaque dimanche | le nombre du dimanche ou de sa semaine | le dimanche, passé ou du jour          | formulaire du dimanche (08)       | 22                | NA (Intégration, l. 16), Cultes captés (MCAD, l. 95), Sainte cène distribuées (MPI, l. 134), Espaces Care (MDS, l. 269)                   |
| Chaque mois     | le total d'un mois                     | le 1er du mois, posé par l'écran       | « Chiffres du mois » (nouveau)    | 74                | Publications (Communication, l. 47), Demandes reçues (Tech, l. 82), Articles vendus (Merch, l. 151), Tâches réalisées (Entretien, l. 213) |
| À ce jour       | où on en est (un stock, des inscrits)  | le jour de la saisie, posé par la base | formulaire du dimanche, prérempli | 25                | Projets en cours (Film, l. 73), Stock disponible (Merch, l. 155), Inscrits (Prodiges Junior, l. 280), Badges actifs (MDS, l. 273)         |

- Une semaine se compte comme un dimanche (la semaine du lundi au dimanche). Une année se calcule.
- **Mois (P16)** : le formulaire propose le mois en cours et les deux précédents ; « Choisir un
  autre mois » ouvre les mois plus anciens, pour un rattrapage (K3). La base refuse un autre jour
  que le 1er, un mois futur, un mois avant le 1er janvier de l'année précédente et, pour un
  indicateur sensible, le mois en cours ; toutes ces bornes se calculent à partir de
  `private.aujourdhui()`. Si la réponse à K3 le demande, la borne devient le 1er janvier de l'année
  de création de l'indicateur. La saisie la plus récente d'un mois fait foi.
- Proposé (Q21) : le mois en cours s'affiche à part (« Octobre en cours : 5 ») ; il n'entre ni
  dans la somme ni dans la complétude, qui ne comptent que les mois finis.

### 3.2 Sortes de nombre et bornes

Chaque valeur est un entier de 0 au plafond de sa sorte. Le plafond n'est pas réglable : trois
sortes couvrent toutes les demandes de la V1.

| Sorte        | Plafond                  | Qui la choisit           | Demandes                                                                                                                     | Affichage   |
| ------------ | ------------------------ | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Compte       | 9 999                    | tous                     | presque toutes                                                                                                               | « 14 »      |
| Grand compte | 9 999 999                | administration, EJP Tech | 5 (K7) : portée (l. 50), vues et abonnés (l. 52), spectateurs du direct (l. 101), vues cumulées de Film et MCAD (l. 76, 102) | « 12 480 »  |
| Euros        | 9 999 999, à l'euro près | administration, EJP Tech | 2, si K6 : chiffre d'affaires (Merch, l. 150), fonds levés (Social, l. 66)                                                   | « 5 164 € » |

- Les chiffres communs restent des comptes (9 999).
- **Minutes** : pas en V1. Si la coordination retient le retard du début du culte (K22, l. 42),
  une petite migration ajoute la sorte « minutes » (plafond 999) ; proposé : sans somme de
  l'année. Ce qu'on saisit quand le culte commence en avance reste à trancher (Q23).
- Abandonné : l'unité « jours » de T26. Les trois délais demandés (Film l. 77, Tech l. 86,
  Entretien l. 212) se suivent objet par objet ; ils deviennent des comptes ou sont retirés (P21).

### 3.3 Ce qu'on compte exactement

Chaque indicateur a une définition obligatoire, de 10 à 140 caractères, affichée sous le champ de
saisie et, sur la fiche, au clic sur le libellé. Elle répond aux questions de sens de l'analyse :
publications, contenus ou campagnes (K24) ; portions ou personnes servies (K37) ; pic ou moyenne
des spectateurs (K34) ; profil actif des Pages Roses (K43c). Sans elle, deux personnes du même
compte partagé comptent différemment.

- Exemple de forme, pour « Stock disponible » : « Articles du merch en réserve le jour de la
  saisie, toutes tailles confondues. » Le contenu exact vient des réponses des ministères
  (question Q19).
- Pour les chiffres communs, la définition reprend les aides de l'écran 08 (« Les STARs qui ont
  servi dans votre ministère ce dimanche. Si personne n'a servi, enregistrez 0. »).

### 3.4 Valeurs calculées

Trois mécanismes, dont deux automatiques :

- **Somme de l'année** (automatique), pour tout indicateur du dimanche ou du mois : somme des
  périodes finies de l'année civile (heure de Paris), avec la complétude. L'écran dit que c'est
  une somme : « Somme des mois depuis janvier : 112 (9 mois sur 9). », « Somme des dimanches
  depuis janvier : 410 (40 dimanches sur 40). ». Pour des personnes, c'est une somme de présences,
  pas un nombre de personnes différentes (P21) : la définition le dit (« Les participantes
  présentes dans le mois ; une même personne compte chaque mois où elle vient. »). Elle couvre les
  7 cumuls demandés : NA et NC (l. 17, 19), Welcome Prodiges (l. 21), baptisés (l. 37), actions
  sociales (l. 65), participants de la Prière des Stars et de la chaîne de prière (l. 124, 130).
- **Petite courbe** (automatique), pour un indicateur du dimanche ou du mois seulement : 10
  dimanches ou 12 mois, trous gardés, et son équivalent texte. Elle couvre 2 des 3 évolutions
  demandées : audience (l. 104) et ventes (l. 158). Un « à ce jour » n'a pas de courbe : la fiche
  montre sa valeur et sa date. Restent pour plus tard, si la coordination les demande :
  l'évolution des STARs actifs (l. 265), qui est la courbe du total de l'église d'un chiffre commun
  (vue de l'église, K12 et K15), et l'évolution des abonnés, vues et portée (l. 50, 52, 56), qui
  demanderait une courbe mensuelle d'un « à ce jour » (valeur en vigueur à la fin de chaque mois).
- **Calcul déclaré** : un taux ou une moyenne de deux indicateurs saisis.
  - Taux : haut sur bas, en %, arrondi à l'entier. « Taux de résolution : 80 % en septembre (16
    sur 20). Depuis janvier : 78 % (9 mois sur 9). »
  - Moyenne : haut par bas, une décimale à l'affichage, unité du haut. « Panier moyen : 23,4 € en
    septembre (1 240 € pour 53 commandes). » (si K6)
  - Sources : deux indicateurs saisis, actifs, distincts, du même ministère, non sensibles, jamais
    un chiffre commun. Même rythme, ou bien un bas « à ce jour » : on prend sa valeur en vigueur à
    la fin de la période, et l'écran affiche sa date quand elle a plus de 30 jours (règle 13).
  - Le calcul prend le rythme de son haut et, pour une moyenne, l'unité de son haut.
  - Deux « à ce jour » (taux de complétion de Formation, l. 251) : le résultat du jour, avec les
    deux dates ; aucune valeur sur l'année.
  - Sur l'année : somme des hauts sur somme des bas, sur les périodes qui ont les deux valeurs,
    jamais une moyenne de taux (comme le pourcentage FIJ, règle 4).
  - « Non calculé » si le bas manque ou vaut 0 : « Non calculé : demandes reçues de septembre non
    saisies. »
  - Couverture : les 6 taux calculables de l'analyse (Film l. 78, Tech l. 88, Formation l. 251,
    Sécurité l. 244, Prodiges Junior l. 282 si K5, Merch l. 153 si K6), et Multilingue (demandes
    satisfaites sur demandes, proposé par EJP Tech).
  - Proposé : pas de chiffre commun comme source. Le « taux de présence des équipiers » de MCAD
    (l. 115) supposerait que les équipiers soient les STARs au service, ce que K8 doit confirmer.
    Si c'est le cas, une migration accepte un chiffre commun comme bas, lu pour le ministère du
    calcul.

**Complétude dans le temps** (règle 13 du BRIEF, à compléter à la confirmation) :

- Une période est finie jusqu'au dimanche de référence, ou si le mois est avant le mois en cours.
- Proposé (Q21) : la somme part de la plus récente de deux dates, le 1er janvier ou la période qui
  contient l'ajout de l'indicateur (`(cree_le at time zone 'Europe/Paris')::date`). Si le
  ministère a rattrapé une période plus ancienne de l'année, le départ recule jusqu'à elle. L'écran
  nomme toujours le départ : « Depuis janvier », « Depuis juillet », « Depuis le dimanche 6
  sept. ».
- Périodes attendues : les périodes finies depuis le départ, où le ministère était actif
  (`private.actif_le`) et l'indicateur pas encore retiré. Saisies : celles qui ont une valeur.
- Un calcul part de la plus récente des deux dates de départ de ses sources.

### 3.5 Rubriques

Pas de colonne `groupe` (T26). Cinq ministères sur 22 rangent leurs KPI par dispositif (MCAD,
MPI, Kumi, Eagles, MDS). La convention R2 (« Pages Roses : profils actifs ») et l'ordre
alphabétique (R6) suffisent à regrouper ces lignes, sans réglage ni écran de plus. Les intitulés
seuls (« Captation / diffusion », « Audience ») ne deviennent pas des indicateurs.

### 3.6 Activités

Pas de nature « jour » (P17, phase 2 si K57). Les activités se comptent par mois, et la moyenne par
activité se calcule :

- « Welcome Prodiges : sessions » et « Welcome Prodiges : présents » (chaque mois), puis le calcul
  « Welcome Prodiges : présents par session » (moyenne). Même schéma pour la Prière des Stars
  (l. 122, 123) et les baptêmes (l. 36).
- Un rassemblement qui réunit les STARs de plusieurs ministères reste une session « Autre
  rassemblement » déclarée par l'administration (règle 5, D2, K35).

### 3.7 Domaines sensibles

- Case « Domaine sensible », posée par l'administration (ou par EJP Tech sur sa demande écrite).
  Elle impose le rythme « mois » et la sorte « compte », et interdit tout calcul sur l'indicateur.
  La base impose qu'un indicateur qui en remplace un sensible soit sensible.
- 11 demandes : Santé (prises en charge, interventions, incidents avec intervention, orientations,
  l. 140 à 143), Social (bénéficiaires, personnes accompagnées, nouveaux bénéficiaires, l. 61 à
  63), Call your sister (Kumi, l. 194), la plate-forme d'écoute (Eagles, l. 206), nouveaux enfants
  et enfants déjà venus (Prodiges Junior, l. 279 et 284).
- Saisie des mois écoulés seulement (P22) : la base refuse le mois en cours. La fiche montre la
  valeur du mois, jamais la suite des saisies ; le journal ne porte aucune valeur (5.10).
- **Lecture des lignes brutes** (proposé, à confirmer par EJP Tech, Q10) : `kpi-ministeres.md`
  (4.2) prévoyait de fixer à l'étape 4a une lecture par la vue du mois seulement. Cette conception
  propose de laisser les lignes de `mesure` lisibles par l'API pour le ministère, le berger, le
  conseil et EJP Tech, comme pour tout indicateur. Raison : le mois est clos avant toute saisie,
  donc deux saisies du même mois ne montrent qu'une correction, jamais la date d'un fait. Si la
  coordination retient le seuil « moins de 3 » (K5c), l'afficher ne suffit plus : la vue applique
  le seuil et la lecture directe des lignes sensibles se ferme (5.6).
- Lus par le ministère, le berger, le conseil et EJP Tech (T28) ; jamais par l'administration,
  jamais sur la vue de l'église, jamais dans un email (P14).
- Lot 2 : un ministère qui suit un domaine sensible fait valider les comptes qu'il écrit (4.3).
- Un chiffre jugé sensible après coup (« Interventions » saisi chaque dimanche sans la case) se
  retire pour confidentialité (4.6, 6.3).

### 3.8 Chiffres financiers

Pas de marque à part : la sorte « euros » suffit. Elle est réservée à l'administration (et à EJP
Tech sur sa demande), avec les mêmes lecteurs que tout indicateur propre ; l'administration ne voit
pas la valeur, sauf si K6b le décide (P23). La marge (l. 157) attend des coûts que personne ne
saisit ; le budget de Production (l. 166) devient un point d'attention. La comptabilité de l'église
fait foi.

### 3.9 Hors périmètre

| Demande                                                                         | Nombre | Pourquoi, et où elle va                                                                                                  |
| ------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| Comptages d'événements (Coordination, MDS)                                      | 7      | lus dans `evenement_etat`, sans configuration : phase 2 (P20)                                                            |
| Grands graphiques                                                               | 7      | petites courbes seulement (K15)                                                                                          |
| Textes, listes, classements (Merch l. 154, Production l. 166, Entretien l. 216) | 3      | points d'attention                                                                                                       |
| Suivi de personnes, délais par objet                                            | 11     | remplacés par des comptes agrégés (P21)                                                                                  |
| Courbe d'un « à ce jour » ou du total de l'église (l. 50, 52, 56, 265)          |        | plus tard, si la coordination la demande (3.4)                                                                           |
| Taux entre deux rythmes sur l'année (conversion NA vers FIJ)                    |        | ratio de totaux à confirmer (K4a)                                                                                        |
| Chiffres par département (Coordo FIJ)                                           |        | phase 3 (P27)                                                                                                            |
| Total de l'église d'un indicateur propre                                        |        | pas en V1 ; en phase 3 si la coordination le demande (K12), avec les règles de complétude et de double compte (kpi, 4.5) |
| Calcul sur un chiffre commun (MCAD l. 115)                                      |        | si K8 le confirme (3.4)                                                                                                  |
| Connexion aux plateformes, formules à plus de deux termes                       |        | saisie à la main (P24) ; deux termes au plus                                                                             |

### 3.10 Couverture des 185 demandes

| Destination (annexe) | Nombre  | Ce que cette conception en fait                                                                                                  |
| -------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Actuel               | 31      | indicateurs du dimanche ou à ce jour ; pour la ligne 52, la valeur sans son évolution                                            |
| Mois                 | 68      | indicateurs du mois, dont 10 sensibles                                                                                           |
| Calculé              | 23      | 15 servis (7 sommes de l'année, 2 courbes, 6 calculs déclarés), 7 comptages d'événements en phase 2, 1 courbe plus tard (l. 265) |
| Activité             | 3       | comptes du mois et une moyenne                                                                                                   |
| À préciser           | 27      | entrent sans changer le modèle, une fois la réponse connue                                                                       |
| Commun               | 12      | rien à créer ; refusés à un ministère par la base au lot 2 (6.1)                                                                 |
| Remplacé             | 11      | comptes agrégés                                                                                                                  |
| Courbe               | 7       | petites courbes ; la portée de la ligne 56 est un « à ce jour », sans courbe                                                     |
| Hors mesures         | 3       | points d'attention                                                                                                               |
| **Total**            | **185** | 117 servis directement, 50 sans changement de modèle, 18 hors configuration                                                      |

Au lot 1, tout cela passe par les prévus, les suggestions et l'administration. Le lot 2 ne sert pas
plus de demandes : il rend les ministères autonomes.

## 4. Indicateurs créés par un ministère

### 4.1 Ce qui est permis

Depuis « Mes indicateurs », un ministère ajoute :

- **une suggestion** (lot 1), en un clic : un indicateur déjà défini, commun à plusieurs
  ministères (5.11). Son libellé et sa définition sont ceux du catalogue et ne se corrigent pas sur
  une fiche : le même chiffre garde le même sens dans tous les ministères. Proposé : cela rendrait
  possible une comparaison entre ministères, si la coordination la demande un jour (aucune question
  ne la pose aujourd'hui) ;
- **son propre compte** (lot 2), en trois champs : ce qu'il compte (libellé), ce qu'il compte
  exactement (définition) et le rythme. Sorte « compte » seulement, jusqu'à 9 999.

Il ne crée jamais un indicateur sensible, un grand compte, des euros ni un calcul : ceux-là se
demandent à l'administration de l'église, en dehors de l'outil comme aujourd'hui. Au lot 1, il
demande de la même façon un chiffre absent des suggestions.

### 4.2 Limites et raisons

Toutes sont vérifiées par la base, sous un verrou `for update` sur la ligne du ministère (deux
personnes du compte partagé peuvent cliquer en même temps). Les dates se calculent à l'heure de
Paris.

| Limite                                                         | Lot | Valeur proposée | Raison                                                                        | Message                                                                                                       |
| -------------------------------------------------------------- | --- | --------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Ajouts du ministère actifs ou en attente                       | 1   | 3               | la charge de saisie ; avec les 6 prévus au plus (K13), la saisie reste courte | « Votre ministère a déjà 3 indicateurs à lui. Retirez-en un pour en ajouter un autre. »                       |
| Indicateurs d'une fiche, actifs ou en attente, calculs compris | 1   | 12              | la lecture du berger ; MCAD demande 19 KPI, Kumi 13, MPI et MDS 12            | « Votre fiche compte déjà 12 indicateurs. Demandez à l'administration de l'église d'en retirer un. »          |
| Source d'un calcul                                             | 1   | non retirable   | un calcul de l'administration ne disparaît pas sans elle                      | « Ce chiffre sert au calcul « Taux de résolution » : demandez à l'administration de l'église de le retirer. » |
| Sorte de nombre                                                | 1   | compte          | les grands nombres et les montants demandent un choix de l'église             | aucun : le choix n'est pas proposé                                                                            |
| Ajouts du ministère sur 30 jours, retirés compris              | 2   | 3               | ajouter puis retirer en boucle casse les courbes                              | « Vous avez ajouté 3 indicateurs ces 30 derniers jours. Vous pourrez en ajouter un autre à partir du 4 nov. » |
| Corrections d'un même indicateur                               | 2   | 3               | chaque correction repasse en relecture                                        | « Cet indicateur a déjà été corrigé 3 fois. Pour compter autre chose, remplacez-le. »                         |
| Mots refusés aux ministères                                    | 2   | 6.1             | 6.1                                                                           | message de la famille de mots                                                                                 |

La date « à partir du 4 nov. » est celle du plus ancien des trois ajouts, plus 30 jours, à l'heure
de Paris. Ces valeurs sont des choix, pas des mesures (question Q3). L'administration et EJP Tech ne
sont tenus que par la limite de 12 par fiche. Un remplacement ne compte pas l'indicateur qu'il
remplace (5.8).

### 4.3 Validation ou non (lot 2)

| Option                                                  | Pour                                                                                    | Contre                                                                                                                                           |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| A. Aucune validation, relecture après coup par EJP Tech | rien n'attend ; peu de code                                                             | un libellé anodin peut être sensible dans son contexte : « Interventions » l'est chez Santé, pas chez Sécurité ; la liste de mots ne le voit pas |
| **B. Validation seulement dans les cas à risque**       | protège les cinq domaines de P22 ; aucun réglage : la base le déduit ; file très courte | une file à ouvrir, sans notification ; un état de plus                                                                                           |
| C. Validation de tout ajout                             | rien n'est lu avant d'être vu                                                           | file sur le seul compte de l'administration ; le BRIEF exclut les notifications, une demande attendrait sans que personne la voie                |
| D. Aucun ajout pour un ministère sensible               | le plus simple                                                                          | Kumi et Eagles perdent toute autonomie pour des chiffres anodins (Pages Roses, activités)                                                        |

**Recommandation : B.** Un compte écrit par un ministère naît « En attente de validation » quand
l'une de ces conditions est vraie ; la base les vérifie toutes :

1. les prévus du ministère ne sont pas encore créés (aucune ligne de journal
   `indicateurs_prevus_crees` pour lui, 5.10) : un ministère créé après la mise en service ne
   publie rien avant que l'administration ait choisi son modèle, sans dépendre de l'ordre des
   gestes. Le journal, en ajout seulement et écrit par les fonctions, sert déjà de référence pour
   la fraîcheur (règle 6) ;
2. le ministère a un indicateur sensible actif, ou retiré avec au moins une saisie ;
3. le modèle du catalogue d'un de ses indicateurs actifs ou saisis compte une ligne sensible ;
4. le texte touche la famille de mots « sensible » (6.1), quel que soit le ministère :
   « Interventions » part en validation chez Sécurité comme chez Santé, au lieu d'être refusé ou
   publié.

Un indicateur sensible retiré sans saisie (case cochée par erreur, modèle appliqué au mauvais
ministère) ne compte pas : la validation ne devient pas définitive par erreur. Santé, Social, Kumi,
Eagles et Prodiges Junior sont concernés dès que leurs prévus sont créés. Si la coordination retire
tout indicateur sensible des six d'un de ces ministères (K13, K5, K56b), seules les conditions 3 et
4 jouent : Q22 le demande. Dans ces cas :

- une **suggestion** s'ajoute toujours tout de suite (sa définition est déjà relue) ;
- un **compte écrit par le ministère** attend. Il n'est ni saisi ni lu par le berger et le
  conseil, et ne le sera jamais s'il n'est pas validé : refusé, ou retiré par le ministère avant la
  validation, il reste illisible pour eux. L'administration le valide ou le refuse, avec un motif,
  depuis l'écran Indicateurs ; la Modération d'EJP Tech affiche « 1 ajout attend une validation »,
  ce qui le met dans la relecture hebdomadaire. Le ministère rattrape ensuite les périodes passées :
  rien n'est perdu si la validation arrive dans la semaine.

Pour tous les autres ministères, l'ajout est actif tout de suite et EJP Tech relit son libellé et
sa définition dans la file de modération (écran 15). Le berger peut lire le libellé avant la
relecture : c'est le risque que le BRIEF accepte déjà pour les points d'attention, ici réduit par
un texte plus court et filtré (6.1). Alternative si EJP Tech veut moins de code : A, avec la
famille de mots « sensible » refusée aux ministères (questions Q2 et Q14).

### 4.4 Visibilité

| Profil                     | Définition d'un ajout                          | Valeurs               |
| -------------------------- | ---------------------------------------------- | --------------------- |
| Le ministère lui-même      | oui, dans tous les états                       | oui                   |
| Berger, conseil            | oui, sauf un ajout en attente ou jamais validé | oui, sur la fiche     |
| EJP Tech                   | oui                                            | oui, en lecture (T28) |
| Administration de l'église | oui, avec l'usage                              | non (P06)             |
| Autres ministères          | non : ni le libellé ni la valeur               | non                   |
| Vue de l'église, emails    | jamais (P30, P14)                              | jamais                |

Aujourd'hui, un ministère lit les libellés des indicateurs propres de tous les autres : la lecture
se resserre aux communs et aux siens (question Q4).

### 4.5 Ce que voit le berger

Sur la fiche du ministère (04), un ajout du ministère s'affiche comme les autres indicateurs, à sa
place dans le rythme, avec la mention discrète « Ajouté par Kumi le 12 oct. ». Il a sa valeur, sa
courbe, sa somme de l'année et sa complétude. Un ajout en attente ou jamais validé n'apparaît ni
sur la fiche ni dans le journal. Rien ne change dans « Cette semaine », la phrase de la fiche ni la
vue de l'église.

### 4.6 Faire évoluer : corriger, remplacer, retirer, rendre officiel

| Geste                                           | Qui                                                                                                                                    | Effet                                                                                                                                                                                                                                                                 |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Corriger le libellé et la définition            | l'administration (EJP Tech idem) pour tous, sauf les communs et les suggestions ; lot 2 : le ministère pour ses comptes écrits par lui | permis tant qu'aucune valeur n'est saisie (pour un calcul : aucune valeur de ses sources), donc aucune saisie ne change de sens. Lot 2 : le texte d'un ministère repasse en relecture. « Libellé corrigé le 14 oct. » sur la fiche                                    |
| Remplacer                                       | l'administration (EJP Tech sur sa demande écrite) ; lot 2 : le ministère pour ses ajouts non officiels                                 | pour changer de rythme, de sorte ou de sens, ou de texte après une saisie : un nouvel indicateur et le retrait de l'ancien dans la même transaction. Deux courbes, jamais fusionnées : « Remplace « Problèmes signalés » (chaque dimanche, jusqu'au 31 oct.) » (K45a) |
| Retirer, avec un motif                          | l'administration (EJP Tech sur sa demande écrite) ; le ministère pour ses ajouts, sauf la source d'un calcul                           | plus de saisie ; historique gardé ; un calcul qui en dépend est retiré avec lui                                                                                                                                                                                       |
| Retirer pour confidentialité                    | administration, EJP Tech                                                                                                               | pour un chiffre jugé sensible après coup : libellé et définition masqués (« [retiré pour confidentialité] »), indicateur retiré et absent des fiches avec ses valeurs, une seule ligne de journal (6.3)                                                               |
| Rendre officiel (lot 2)                         | l'administration (EJP Tech sur sa demande écrite)                                                                                      | l'ajout devient un indicateur de l'église : il ne compte plus dans les 3 ajouts du ministère, et le ministère ne peut plus le retirer. Valeurs et sens inchangés                                                                                                      |
| Proposer comme suggestion à tous les ministères | EJP Tech, par migration, sur demande de l'administration                                                                               | une ligne de plus au catalogue ; les indicateurs existants ne changent pas                                                                                                                                                                                            |

Motifs de retrait (liste fermée) : « N'est plus suivi », « Doublon d'un autre chiffre », « Créé
par erreur » (tous) ; « Se calcule à partir d'autres chiffres », « Déjà compté par un chiffre
commun », « Domaine sensible : à créer par l'administration », « Hors des règles de l'outil »
(administration et EJP Tech, aussi pour un refus). Quatre motifs sont posés par la base :
« Remplacé », « Confidentialité », « Texte masqué par EJP Tech », « Chiffre source retiré ».

## 5. Modèle de données

### 5.1 Migrations

Toutes nouvelles ; aucune migration suivie par git n'est modifiée. La migration T28 (lecture des
chiffres par EJP Tech) passe avant.

| Migration                   | Lot | Contenu                                                                                                                                                                                   | Tests pgTAP principaux                                                                                               |
| --------------------------- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `indicateurs_definition`    | 1   | colonnes et contraintes d'`indicateur` (5.2) ; définitions des communs ; contrôle de `mesure.valeur` ; `private.normaliser` ; trigger `controler_indicateur` ; `controler_mesure` réécrit | sens figé même pour le propriétaire, structure seulement, aucune suppression, plafonds, mois, calcul jamais saisi    |
| `indicateurs_lexique`       | 1   | table `private.terme`, fonction `private.verifier_texte`, fonction publique `verifier_libelle`                                                                                            | familles de l'administration, voisins acceptés, contrôle de l'appelant                                               |
| `indicateurs_catalogue`     | 1   | table `private.indicateur_prevu`, vues `v_catalogue` et `v_suggestions`                                                                                                                   | catalogue illisible en direct, vues réservées aux bons profils                                                       |
| `indicateurs_lectures`      | 1   | `v_mesure_periode`, `v_indicateur_suivi`, `v_calcul`, `v_usage_indicateurs`, `limites_indicateurs`                                                                                        | sommes, complétude dans le temps, « Non calculé », usage sans valeur                                                 |
| `indicateurs_fonctions`     | 1   | fonctions du lot 1 (5.8), politiques, journal (5.10)                                                                                                                                      | matrice, limites, correction, retrait, remplacement, confidentialité, journal sans texte ni valeur                   |
| `indicateurs_vague_1`       | 1   | lignes du catalogue validées par la coordination (5.11)                                                                                                                                   | création des prévus d'un ministère, sans doublon                                                                     |
| `indicateurs_ajouts_libres` | 2   | état « en attente », colonnes du lot 2 (5.2), fonctions et politiques du lot 2, modération de la cible `indicateur`                                                                       | validation, ajout jamais validé illisible, correction par le ministère, relecture, mots des ministères, 185 libellés |

### 5.2 La table `indicateur`

Esquisse de `indicateurs_definition` (rien n'est écrit). Les contraintes s'ajoutent après le
remplissage des lignes existantes, sinon les trois communs les violeraient :

```sql
alter table public.indicateur
  drop constraint indicateur_nature_check,
  add constraint indicateur_nature_check check (nature in ('dimanche', 'mois', 'a_ce_jour')),
  drop constraint indicateur_ministere_id_libelle_key,
  add column definition text,
  add column unite text not null default 'nombre' check (unite in ('nombre', 'grand_nombre', 'euros')),
  add column sensible boolean not null default false,
  add column calcul text check (calcul in ('taux', 'moyenne')),
  add column haut_id uuid references public.indicateur,
  add column bas_id uuid references public.indicateur,
  add column origine text,
  add column modele_code text,          -- ligne du catalogue (prévu ou suggestion), sinon null
  add column remplace_id uuid unique references public.indicateur,
  add column etat text not null default 'actif' check (etat in ('actif', 'retire')),
  add column cree_le timestamptz not null default now(),
  add column cree_par uuid references public.compte (user_id),   -- null : Système (migration)
  add column texte_le timestamptz not null default now(),        -- dernière écriture des textes
  add column texte_par uuid references public.compte (user_id),  -- auteur des textes actuels
  add column retire_le timestamptz,
  add column retrait_motif text;                                  -- liste fermée de 4.6
-- la migration pose origine ('commun' si ministere_id est nul, sinon 'eglise') et la définition
-- de chaque ligne existante (les trois communs), puis :
alter table public.indicateur
  alter column origine set not null,
  alter column origine set default 'eglise',
  alter column definition set not null,
  add check (origine in ('commun', 'eglise', 'ministere')),
  add check (char_length(definition) between 10 and 140),
  add check ((origine = 'commun') = (ministere_id is null)),
  add check (actif = (etat = 'actif')),
  add check ((etat = 'retire') = (retire_le is not null) and (retire_le is null) = (retrait_motif is null)),
  add check (not sensible or (nature = 'mois' and unite = 'nombre' and calcul is null)),
  add check ((calcul is null) = (haut_id is null) and (calcul is null) = (bas_id is null));
create unique index indicateur_libelle_actif on public.indicateur (ministere_id, private.normaliser(libelle))
  where etat <> 'retire';
alter table public.mesure drop constraint mesure_valeur_check,
  add constraint mesure_valeur_check check (valeur between 0 and 9999999);
```

Au lot 2, `indicateurs_ajouts_libres` ajoute :

```sql
alter table public.indicateur
  drop constraint indicateur_etat_check,
  add constraint indicateur_etat_check check (etat in ('en_attente', 'actif', 'retire')),
  add column ne_en_attente boolean not null default false,  -- figé à la création
  add column valide_le timestamptz,                         -- posé par valider_indicateur
  add column officiel_le timestamptz,                       -- posé par rendre_officiel
  add check (etat <> 'en_attente' or (origine = 'ministere' and ne_en_attente)),
  add check (valide_le is null or ne_en_attente),
  add check (officiel_le is null or origine = 'eglise');
```

- `actif` reste : la politique d'ajout de `mesure` et les tests existants le lisent.
- `private.normaliser(text)`, `immutable` : minuscules, accents retirés par `translate`, tout signe
  qui n'est ni une lettre ni un chiffre remplacé par une espace, espaces réduits, « nombre de » de
  tête retiré. « Nombre de projets en cours » et « Projets en cours » se confondent ; un libellé
  retiré peut renaître. Les contrôles qui ont besoin des signes (« @ », « % », « € », 6.1) lisent
  le texte brut avant.
- `texte_par` : une correction faite par l'administration lui est attribuée ; elle ne passe donc
  pas en relecture (règle 9).
- `ordre` ne sert plus qu'aux communs : les autres se rangent par rythme et par ordre alphabétique.

### 5.3 Les saisies : `controler_mesure` réécrit

Le trigger `before insert` de `mesure` (une nouvelle version, même nom) refuse, dans l'ordre :

1. un indicateur qui n'est pas actif : « « Problèmes signalés » n'est plus proposé à la saisie. »
   (le message nomme l'indicateur ; comme l'envoi est un seul insert, l'écran recharge le
   formulaire en gardant les valeurs tapées) ;
2. un calcul : « Ce chiffre se calcule : il ne se saisit pas. » (la politique d'ajout exige aussi
   `i.calcul is null`) ;
3. une valeur au-dessus du plafond de sa sorte : « Entre 0 et 9 999. » ou « Entre 0 et 9 999 999. » ;
4. pour un mois : un autre jour que le 1er, un mois après `private.mois_courant()` (nouvelle aide :
   le 1er du mois de `private.aujourdhui()`), un mois avant le 1er janvier de l'année précédente
   (« Ce mois est trop ancien pour être saisi. ») et le mois en cours pour un indicateur sensible
   (« Ce chiffre se saisit une fois le mois fini. »).

Les règles du dimanche et du « à ce jour » ne changent pas.

### 5.4 Le sens figé : trigger `controler_indicateur`

Un seul trigger nouveau, `before insert or update or delete` sur `indicateur`, actif pour tous les
rôles (migrations et jeu d'exemple compris). Il ne contrôle que la structure : les familles de mots
vivent dans `private.verifier_texte`, appelée par les fonctions de l'API (5.8). Une migration ou
`seed.sql` peuvent donc écrire « NA » ou l'ancien « Visuels livrés ce mois ».

- **À l'ajout** : libellé de 2 à 60 caractères après `btrim` et réduction des espaces ; définition
  de 10 à 140 ; cohérences (sensible, sorte, calcul) ; sources d'un calcul du même ministère, de
  rythme compatible, ni communes ni sensibles ; un calcul prend le rythme de son haut ; le
  remplaçant d'un indicateur sensible est sensible.
- **À la mise à jour**, seuls passent :
  - `actif` vers `retire` (lot 2 : `en_attente` vers `actif` ou `retire`, et `valide_le`), avec
    `retire_le` et le motif ;
  - lot 2 : `origine` de `ministere` vers `eglise`, avec `officiel_le` ;
  - un nouveau libellé ou une nouvelle définition, contrôlés comme à l'ajout, si aucune valeur
    n'est saisie pour l'indicateur (pour un calcul : pour ses sources) et si son modèle n'est pas
    une suggestion ; `texte_le` prend l'heure et `texte_par` le compte ;
  - le masquage : un texte remplacé par « [texte masqué par EJP Tech] » ou « [retiré pour
    confidentialité] », seulement si `private.masquer_texte` ou le retrait pour confidentialité a
    posé dans la transaction `set_config('pilotage.masquage', 'oui', true)`. Masquer le libellé
    exige le passage à « retiré » dans la même mise à jour ;
  - dans une migration seulement, qui pose `set_config('pilotage.migration', 'oui', true)`, le
    libellé ou la définition d'un chiffre commun.
- **Tout le reste est refusé** : ministère, code, rythme, sorte, sensible, calcul, sources,
  `remplace_id`, `modele_code`, `cree_le`, `cree_par`.
- **À la suppression** : toujours refusée.

Aucun GRANT `insert`, `update` ni `delete` sur `indicateur` : tout passe par les fonctions (5.8).
Aucun client ne peut poser les deux réglages : l'API n'expose ni `set_config` ni le schéma
`private`, et `private.verifier_texte` refuse de toute façon un texte qui imite le masquage (6.1).

### 5.5 Le catalogue

```sql
create table private.indicateur_prevu (     -- jamais exposée, écrite par migration
  code text primary key,                     -- « kumi_activites », « suggestion_evenements_couverts »
  modele text not null,                      -- nom normalisé du ministère de la liste, ou « suggestion »
  libelle text not null check (char_length(libelle) between 2 and 60),
  definition text not null check (char_length(definition) between 10 and 140),
  nature text not null, unite text not null default 'nombre', sensible boolean not null default false,
  calcul text, haut_code text, bas_code text, -- calcul : codes de ses deux sources, même modèle
  ordre smallint not null
);
```

- `v_catalogue` (administration et EJP Tech) et `v_suggestions` (ministère pour sa fiche,
  administration, EJP Tech) le lisent par une fonction `private`, comme `v_textes_a_relire`.
  `v_suggestions` écarte une suggestion dont le libellé normalisé est déjà sur la fiche : un prévu
  qui porte le libellé et la définition d'une suggestion (« Activités réalisées » de Kumi) suffit,
  sans colonne de plus.
- Un indicateur créé depuis le catalogue garde son `modele_code` : un second appel ne crée pas de
  doublon, et l'écran sait ce qui reste à créer.
- `creer_indicateurs_prevus` vérifie que `p_modele` existe dans le catalogue, ou vaut « aucun »
  (un ministère sans prévu, comme Protocole) : aucun texte libre n'entre dans le journal.
- Aucun trigger sur `ministere` : l'administration choisit le modèle et clique « Créer » (7.2).
  L'écran propose le modèle dont le nom normalisé égale celui du ministère, sinon une liste. Le
  rattachement ne dépend plus d'un nom tapé à l'écran 13.
- La liste des mots refusés vit dans `private.terme` (terme normalisé, famille, pour tous ou pour
  les ministères), changée par une petite migration.

### 5.6 Les lectures

Toutes les vues sont `security_invoker` et lisent `mesure` sous RLS : un profil qui ne lit pas une
valeur obtient `null`.

- `v_mesure_periode` : la saisie la plus récente par indicateur, ministère et période (elle étend
  `v_mesure_dimanche` au mois).
- `v_indicateur_suivi` : pour chaque indicateur lisible, la dernière valeur et sa période, la
  valeur du mois en cours (sauf sensible), la série (10 dimanches ou 12 mois, trous à `null`), la
  somme de l'année, son départ, les périodes saisies et attendues, et l'alerte « plus de 30 jours »
  d'un « à ce jour » (règle 13). Elle écarte un retiré sans saisie et un retiré pour
  confidentialité ; elle garde un calcul retiré dont les sources ont des saisies.
- `v_calcul` : pour chaque calcul, la dernière période finie (haut, bas, date du bas « à ce jour »,
  résultat) et l'année, avec la complétude.
- `v_usage_indicateurs` (administration et EJP Tech, par une fonction `private`) : périodes
  saisies, périodes attendues, date de la dernière saisie, « jamais saisi ». Jamais une valeur.
- `public.limites_indicateurs(p_ministere_id)` : `exige_aal2()` en tête ; un ministère n'interroge
  que sa fiche, sinon 42501 avec le message d'un objet absent (un autre ministère n'apprend pas
  qu'une fiche demande une validation) ; l'administration et EJP Tech interrogent toute fiche ; le
  berger et le conseil sont refusés. Elle rend les ajouts actifs ou en attente, le total de la
  fiche et, au lot 2, les ajouts des 30 derniers jours, la date de la prochaine place (heure de
  Paris) et la validation requise. Le panneau d'ajout s'en sert au lieu de recopier les limites.
- **Seuil K5c**, s'il est retenu : appliqué dans `v_mesure_periode`, qui lit alors les lignes
  sensibles par une fonction `private` ; la politique de lecture de `mesure` ne rend plus ces
  lignes qu'à EJP Tech (export de fin de vie, P13).

### 5.7 Intégrité de l'historique

- `mesure.indicateur_id` ne change pas, et la base fige le sens de l'indicateur : libellé et
  définition ne changent plus dès qu'une valeur est saisie. Une saisie garde son sens pour
  toujours, sans colonne de version sur `mesure`.
- Un changement de sens, ou de texte après une saisie, passe par un remplacement, qui ouvre une
  nouvelle série et laisse l'ancienne intacte.
- Aucune suppression : le journal, qui cite l'indicateur par `cible_id` sans clé étrangère, le
  retrouve toujours. `v_journal` affiche le libellé actuel, masqué s'il l'a été, et rien pour un
  lecteur qui ne lit pas l'indicateur.
- Un ministère désactivé garde ses indicateurs ; ses périodes ne sont plus attendues après sa
  désactivation (règle 13).

### 5.8 Les fonctions de l'API

Chacune existe en deux parties : `private.<nom>` en `security definer`, `set search_path = ''`,
`exige_aal2()` en tête, et `public.<nom>` d'une ligne en `security invoker`. Un refus de droit lève
42501 avec le même message qu'un objet absent ; une erreur de saisie lève l'exception par défaut,
affichée telle quelle. Aucun SQL dynamique.

| Fonction                                                                                                                               | Lot                     | Appelant                                                                              | Écrit                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `creer_indicateur(p_ministere_id, p_libelle, p_definition, p_nature, p_unite, p_sensible, p_pas_sensible, p_remplace_id) returns uuid` | 1 (2 pour un ministère) | administration, EJP Tech ; lot 2 : ministère sur sa fiche (compte, non sensible)      | `indicateur` (actif, ou en attente au lot 2), retrait de l'ancien si remplacement, journal                                                      |
| `ajouter_suggestion(p_ministere_id, p_code) returns uuid`                                                                              | 1                       | ministère sur sa fiche, administration, EJP Tech                                      | `indicateur` actif, journal                                                                                                                     |
| `creer_calcul(p_libelle, p_definition, p_type, p_haut_id, p_bas_id, p_remplace_id) returns uuid`                                       | 1                       | administration, EJP Tech                                                              | `indicateur` (calcul), retrait de l'ancien si remplacement, journal                                                                             |
| `creer_indicateurs_prevus(p_ministere_id, p_modele) returns integer`                                                                   | 1                       | administration, EJP Tech                                                              | les lignes manquantes du modèle, tout ou rien ; une ligne de journal s'il en crée au moins une, ou pour « aucun » la première fois ; rien sinon |
| `corriger_indicateur(p_indicateur_id, p_libelle, p_definition) returns void`                                                           | 1 (2 pour un ministère) | selon 4.6                                                                             | textes, `texte_le`, `texte_par`, journal                                                                                                        |
| `retirer_indicateur(p_indicateur_id, p_motif) returns integer`                                                                         | 1                       | selon 4.6 ; motif « confidentialité » réservé à l'administration et à EJP Tech        | état, textes masqués pour la confidentialité, journal ; rend le nombre de calculs retirés avec lui                                              |
| `verifier_libelle(p_libelle, p_nature, p_ministere_id) returns table (famille, message, bloquant)`                                     | 1                       | ministère sur sa fiche, administration, EJP Tech (contrôles de `limites_indicateurs`) | rien                                                                                                                                            |
| `valider_indicateur(p_indicateur_id, p_decision, p_motif) returns void`                                                                | 2                       | administration ; EJP Tech selon Q15                                                   | état, `valide_le`, journal                                                                                                                      |
| `rendre_officiel(p_indicateur_id) returns void`                                                                                        | 2                       | administration, EJP Tech (sur sa demande écrite, 2)                                   | origine, journal                                                                                                                                |
| `masquer_texte`, `marquer_relu`, `v_textes_a_relire`                                                                                   | 2                       | EJP Tech                                                                              | gagnent la cible `indicateur` (libellé, définition), avec les règles de 6.3                                                                     |

Contrôles d'un ajout (`creer_indicateur`, `ajouter_suggestion`, `creer_calcul`), dans l'ordre :

1. `exige_aal2()` ; profil : administration ou EJP Tech et ministère actif ; pour un ministère,
   compte actif et fiche à lui (42501) ;
2. verrou `for update` sur la ligne du ministère ;
3. remplacement : `p_remplace_id` désigne un indicateur du même ministère, non commun, actif ou en
   attente ; pour un ministère, un de ses ajouts non officiels (`origine = 'ministere'`,
   `officiel_le` nul). Sinon 42501, avec le message d'un objet absent. Le remplaçant d'un
   indicateur sensible doit être sensible ;
4. limites (12 par fiche ; pour un ministère, 3 ajouts et, au lot 2, 3 sur 30 jours), comptées
   sans l'indicateur remplacé : un ministère à 3 ajouts, ou une fiche à 12, peut remplacer ;
5. textes : `private.verifier_texte` (6.1). Pour l'administration et EJP Tech, un mot de la
   famille « sensible » bloque, sauf si `p_sensible` est vrai ou si `p_pas_sensible` confirme que
   ce n'est pas un domaine sensible ;
6. doublon normalisé sur la fiche, l'indicateur remplacé mis à part ;
7. rythme et sorte ;
8. retrait de l'indicateur remplacé (motif « Remplacé »), insertion (en attente au lot 2, selon
   4.3), une ligne de journal.

Contrôles d'une correction : profil (4.6) ; pour un ministère, son compte écrit par lui
(`origine = 'ministere'`, `modele_code` nul) et trois corrections au plus, comptées dans le
journal ; aucune valeur saisie (pour un calcul, de ses sources) ; pas une suggestion ;
`private.verifier_texte`. Contrôles d'un retrait par un ministère : son ajout non officiel, qui
n'est pas la source d'un calcul actif.

### 5.9 Ce qui change sur `indicateur`, et seulement cela

`indicateur` n'est pas dans la liste des tables en ajout seulement (règle 1), mais ses
changements restent bornés, faits par les fonctions ci-dessus et tracés au journal : l'état (vers
actif ou retiré), au lot 2 l'origine (vers « église ») et `valide_le`, le masquage d'un texte, et
la correction d'un texte tant que rien n'est saisi. Le trigger de 5.4 refuse tout le reste, même
au propriétaire.

### 5.10 Journal

| Code                       | Lot | Libellé (écran 06)             | `cible`, `cible_id` | `detail` (codes et nombres seulement)                                       | Détail affiché (exemple)                                                                    |
| -------------------------- | --- | ------------------------------ | ------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `indicateur_cree`          | 1   | A ajouté un indicateur         | indicateur          | `{"nature", "unite", "origine", "remplace"}`, et au lot 2 `"attente": true` | « Publications, chaque mois » ; « en attente de validation »                                |
| `indicateurs_prevus_crees` | 1   | A créé les indicateurs prévus  | ministere           | `{"modele", "nombre": 6}` (code du catalogue, ou « aucun »)                 | « 6 indicateurs prévus pour Kumi » ; « aucun indicateur prévu pour Protocole »              |
| `indicateur_corrige`       | 1   | A corrigé un indicateur        | indicateur          | `{"champs": ["libelle"]}`                                                   | « Publications, libellé corrigé »                                                           |
| `indicateur_retire`        | 1   | A retiré un indicateur         | indicateur          | `{"motif", "avec_saisies": true, "calculs": 1}`                             | « Projets réalisés, motif : n'est plus suivi » ; « retiré pour confidentialité »            |
| `indicateur_valide`        | 2   | A validé un indicateur         | indicateur          | `{"decision": "valide"}` ou `{"decision": "refuse", "motif"}`               | « Pages Roses : ateliers, validé » ; pour le berger et le conseil : « un ajout non publié » |
| `indicateur_officiel`      | 2   | A rendu officiel un indicateur | indicateur          | `{}`                                                                        | « Campagnes »                                                                               |

- `ministere_id` est celui de l'indicateur. Le ministère lit les lignes de sa fiche, le berger et
  le conseil toutes, l'administration toutes (`journal_lisible_administration` accepte ces codes,
  qui ne portent aucune valeur), EJP Tech toutes dans le journal technique (ces codes s'ajoutent à
  la liste de sa politique de lecture). Comme toute action d'un compte de ministère, un ajout fait
  par le ministère compte pour sa fraîcheur (règle 6).
- `detail` ne contient jamais un libellé ni une définition : l'écran lit le texte actuel par
  `cible_texte`, que `v_journal` (`security_invoker`) calcule sous la RLS du lecteur. Pour un ajout
  en attente ou jamais validé, le berger et le conseil obtiennent `null`, et l'écran écrit « un
  ajout non publié ».
- **Saisies** : `journaliser_mesures` n'écrit plus la valeur d'un indicateur propre, seulement
  `indicateur_id` et `date_ref` (« Publications (septembre) »). Les chiffres communs gardent leur
  valeur. L'administration peut donc lire toutes les lignes `mesure_saisie` :
  `journal_lisible_administration` se simplifie, la migration `journal_administration_chiffres`
  (P29) devient inutile et le cas sensible du journal (P22) disparaît. Le berger lit les valeurs
  sur la fiche (Q18).
- **Modération** (lot 2) : `texte_relu` et `texte_masque` gagnent la cible `indicateur`. Masquer
  un libellé retire l'indicateur dans la même transaction, en une seule ligne
  (`{"champ": "libelle", "motif", "retire": true}`) ; masquer la définition ne le retire pas.

### 5.11 Première vague, suggestions et jeu d'exemple

- **Prévus** (`indicateurs_vague_1`) : un modèle par ministère de la liste (Protocole n'en a pas),
  au plus 6 indicateurs saisis par modèle (K13), choisis par la coordination parmi les quelque 90
  candidats de l'analyse (section 7), sensibles compris, plus les calculs retenus, chacun avec sa
  définition. Exemple pour Kumi : « Activités réalisées », « Participantes », « Nouvelles
  participantes » (chaque mois), « Pages Roses : prestataires inscrites », « Pages Roses : profils
  actifs » (à ce jour), « Call your sister : prises en charge » (chaque mois, sensible).
- **Suggestions** (même migration) : « Événements couverts » (MCAD, Santé, Production, Multilingue
  et Sécurité le demandent), « Demandes reçues », « Demandes traitées », « Projets en cours »,
  « Personnes formées », « Activités réalisées », « Participants », « Nouveaux participants » et
  « Projets réalisés ». Pas les incidents : un incident technique, de sécurité ou de traduction
  n'est pas la même chose. Un prévu qui correspond à une suggestion en porte le libellé et la
  définition : « Activités réalisées » de Kumi et d'Eagles ; la suggestion ne leur est donc plus
  proposée (5.5).
- Après cette vague, tout passe par l'écran : plus de lot de migration, sauf pour une suggestion
  nouvelle ou un mot refusé.
- **`seed.sql`** : un exemple par cas, sans trigger à couper, chaque indicateur avec sa définition.
  L'ancien « Visuels livrés ce mois » (Communication, à ce jour) est gardé, retiré avec le motif
  « Remplacé » par « Visuels livrés » (chaque mois) : le trigger ne contrôlant que la structure,
  son libellé passe. Puis « NA » (Intégration, dimanche) ; « Abonnés YouTube » (Communication,
  grand compte, à ce jour) ; « Demandes reçues » et « Demandes traitées » (Tech) avec leur taux ;
  « Nouveaux enfants » (Prodiges Junior, sensible) ; une suggestion ajoutée par Social ;
  « Interventions » (Sécurité, retiré pour confidentialité) ; un indicateur retiré avec des
  saisies. Au lot 2 : « Colis distribués » (Social, écrit par le ministère), « Goûters servis »
  (Prodiges Junior, en attente) et un ajout refusé.

## 6. Garde-fous

### 6.1 Imposés par la base

La base refuse, par le trigger de 5.4 (structure) et par `private.verifier_texte`, appelée par les
fonctions de 5.8 (mots), donc aussi contre un appel direct à l'API. La comparaison se fait en deux
temps :

- **dans le texte brut**, avant toute normalisation : « @ », « http », « www », « [ », « texte
  masqué », « % » (famille calcul) et « € » (famille argent) ; les chiffres se comptent après
  retrait des espaces, des points et des tirets (« 06 12 34 56 78 » fait 10 chiffres de suite) ;
- **sur le texte normalisé** (5.2), dont on retire d'abord les noms connus des dispositifs
  (« Prière des Stars », « Welcome Prodiges », « Pages Roses », « Call your sister ») : un terme
  d'un ou plusieurs mots est trouvé quand ses mots se suivent dans le texte, chacun seul ou suivi
  de « e », « s », « es » ou « x ». « accompagné » trouve « accompagnées », « mobilisé » trouve
  « mobilisées », « prise en charge » trouve « Prises en charge » ; « moyenne » ne trouve pas
  « Moyens techniques ».

| Contrôle                                                                                                                                                                                                                                                  | Pour qui                    | Lot | Message                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Libellé de 2 à 60 caractères, définition de 10 à 140                                                                                                                                                                                                      | tous (trigger)              | 1   | « Donnez un libellé de 2 à 60 caractères. », « Expliquez ce qu'on compte en 10 à 140 caractères. »                                                                                                    |
| « @ », « http », « www », 5 chiffres ou plus de suite, civilité suivie d'un mot en majuscule (« Mme Durand », « Frère Paul »)                                                                                                                             | tous, libellé et définition | 1   | « N'écrivez aucun nom ni information personnelle. »                                                                                                                                                   |
| « [ » ou « texte masqué »                                                                                                                                                                                                                                 | tous                        | 1   | « Les crochets et « texte masqué » sont réservés à la modération. »                                                                                                                                   |
| Calcul : taux, pourcentage, %, moyenne, ratio, évolution, par événement, par session, par personne, délai moyen, temps moyen, panier moyen                                                                                                                | tous                        | 1   | « Un taux, une moyenne ou une évolution se calcule : ne le saisissez pas. »                                                                                                                           |
| Cumul : cumul, cumulé, depuis le début, de l'année, depuis janvier, sur l'année (accepté en « à ce jour » : « Vues cumulées YouTube »)                                                                                                                    | tous                        | 1   | « La somme de l'année s'affiche toute seule : saisissez le chiffre de la période. »                                                                                                                   |
| Période : ce mois, du mois, par mois, chaque mois, mensuel, mensuelle, par semaine, chaque semaine, cette semaine, de la semaine, hebdomadaire, chaque dimanche, du dimanche, par dimanche, ce dimanche, par an, par année, cette année, annuel, annuelle | tous                        | 1   | « Inutile d'écrire la période : choisissez le rythme plus bas. »                                                                                                                                      |
| Doublon normalisé sur la fiche, ou libellé d'un chiffre commun                                                                                                                                                                                            | tous                        | 1   | « Votre fiche a déjà « Publications ». »                                                                                                                                                              |
| Domaine sensible : santé, soin, médical, malade, maladie, hôpital, hospitalisation, prise en charge, PEC, écoute, accompagné, accompagnement, bénéficiaire, orientation, orienté, enfant, mineur, bébé, handicap, deuil, intervention, victime, détresse  | administration, EJP Tech    | 1   | bloquant sauf case « Domaine sensible » cochée ou « Ce n'est pas un domaine sensible » confirmé : « Ce chiffre semble sensible : cochez « Domaine sensible », ou confirmez que ce n'est pas le cas. » |
| Domaine sensible (même liste)                                                                                                                                                                                                                             | ministère                   | 2   | pas de refus : l'ajout part en validation (4.3), avec « Ce chiffre semble toucher la santé, l'accompagnement ou les enfants : l'administration de l'église le validera avant la saisie. »             |
| Libellé d'une suggestion                                                                                                                                                                                                                                  | ministère                   | 2   | « Ce chiffre est dans les suggestions : ajoutez-le depuis la liste, il aura la même définition que dans les autres ministères. »                                                                      |
| Argent : euro, €, argent, don, offrande, fonds, chiffre d'affaires, budget, marge, devis, coût, dépense, prix, montant                                                                                                                                    | ministère                   | 2   | « Un montant se demande à l'administration de l'église. »                                                                                                                                             |
| Chiffres communs : STAR (hors « Prière des Stars »), mobilisé, bénévole, équipier, au service, en service, en FIJ                                                                                                                                         | ministère                   | 2   | « Ce chiffre est déjà compté par « STARs au service » ou « STARs actifs ». »                                                                                                                          |
| Suivi de personnes : nom, prénom, liste, unique, parcours, revenu, déjà venu, retour, satisfaction                                                                                                                                                        | ministère                   | 2   | « L'outil compte, il ne suit pas les personnes : saisissez un total. »                                                                                                                                |
| Limites de 4.2, sorte de nombre, rythme, ministère actif, remplacement (5.8)                                                                                                                                                                              | ministère                   | 1   | messages de 4.2 ; 42501 pour un remplacement interdit                                                                                                                                                 |
| Sensible hors du mois, calcul entre deux ministères, sur un sensible, sur un chiffre commun ou entre rythmes incompatibles                                                                                                                                | administration, EJP Tech    | 1   | « Un indicateur sensible se saisit chaque mois. », « Ces deux chiffres ne se calculent pas ensemble. »                                                                                                |
| Plafond par sorte, mois au 1er, mois futur, mois trop ancien, mois en cours si sensible, calcul jamais saisi                                                                                                                                              | toute saisie                | 1   | 5.3                                                                                                                                                                                                   |

La famille « commun » couvre les 12 demandes « Commun » de l'annexe (P26, K8). Les familles
« calcul » et « cumul » couvrent les 18 demandes de la catégorie « Valeur calculée ». Les résultats
attendus sur les 185 libellés sont en 8.2.

### 6.2 Signalés par l'écran, sans bloquer

`verifier_libelle` rend aussi des avertissements (`bloquant = false`), affichés pendant la frappe,
400 ms après la dernière touche :

- libellé qui commence par « Nombre de » : « Écrivez seulement ce que vous comptez : « Tournages ». » ;
- mot en majuscule hors du début et hors des noms connus (noms des ministères, NA, NC, FIJ, STAR,
  Welcome Prodiges, Prière des Stars, Pages Roses, Call your sister, Care, YouTube, Instagram) :
  « « Marie » ressemble à un prénom. Vérifiez avant d'ajouter. » ;
- pour l'administration et EJP Tech seulement : un libellé proche dans un autre ministère (« Film
  suit déjà « Vues cumulées » : un chiffre, une source (K7). »). La fonction ne cherche cet indice
  que si `private.mon_type()` est `admin_eglise` ou `admin_plateforme` : un ministère ne le reçoit
  jamais.

Au lot 2, à la saisie, une fonction pure de l'interface (testée par Vitest) avertit sans bloquer :

- valeur plus de trois fois au-dessus de la médiane des 6 dernières périodes (3 au moins) : « C'est
  beaucoup plus que d'habitude (12 en général). Vérifiez avant d'enregistrer. » ;
- 0 après 6 valeurs non nulles : « 0 alors que les 6 dernières valeurs ne l'étaient pas. Vérifiez
  avant d'enregistrer. ».

### 6.3 Données personnelles

Quatre couches, de la plus tôt à la plus tard :

1. Le rappel, une seule fois, sous le premier champ libre de chaque panneau (ajout, correction,
   calcul, remplacement). Pour un ministère : « N'écrivez aucun nom ni information personnelle. Les
   champs libres sont relus par EJP Tech. » Pour l'administration : « N'écrivez aucun nom ni
   information personnelle. » (règle 9 : ses textes ne passent pas en relecture). Proposé, pour
   EJP Tech : la même phrase que l'administration, car EJP Tech est le relecteur ; la règle 9 ne le
   nomme pas (Q11).
2. Les refus de la base (6.1) et l'avertissement « ressemble à un prénom » (6.2).
3. Lot 2 : la validation dans les cas à risque (4.3).
4. Lot 2 : la relecture par EJP Tech de tout libellé et de toute définition écrits par un ministère
   (écran 15), y compris après une correction. Pour la cible `indicateur`, la file suit ces règles,
   qui changent `private.textes_a_relire` et `marquer_relu` :
   - l'élément est « à relire » tant qu'aucune ligne de `moderation` n'a un `le` postérieur ou égal
     à `indicateur.texte_le` (aujourd'hui, une seule décision par élément suffit à le dire relu) ;
   - `marquer_relu` ne refuse (« Ce texte a déjà été relu. ») que si une telle ligne existe ;
   - un élément relu reste 30 jours dans la file, comptés depuis `texte_le` à l'heure de Paris ;
   - l'auteur est `texte_par` ; un texte écrit par l'administration ou EJP Tech n'entre pas dans
     la file ;
   - un ministère corrige trois fois au plus un même indicateur (4.2) ;
   - « Masquer le texte » sur un libellé retire l'indicateur ; ses saisies restent sous « [texte
     masqué par EJP Tech] ».

**Retirer pour confidentialité** (lot 1, administration et EJP Tech) : pour un chiffre jugé
sensible après coup, comme « Interventions » saisi chaque dimanche sans la case. Le geste masque
le libellé et la définition par « [retiré pour confidentialité] », retire l'indicateur et écrit une
seule ligne de journal (motif « Confidentialité »). Ses valeurs ne s'affichent plus sur aucune
fiche (`v_indicateur_suivi` l'écarte). Proposé (Q12) : la politique de lecture de `mesure` écarte
aussi ses lignes, sauf pour EJP Tech (export de fin de vie, P13).

Pas de liste de prénoms : trop fragile.

### 6.4 Doublons et chiffres communs

- Sur une fiche : un libellé normalisé est unique parmi les indicateurs non retirés (index).
- Avec les communs : un libellé commun est refusé à tous (6.1) ; au lot 2, la famille « commun »
  refuse aussi au ministère les STARs, mobilisés et bénévoles. MDS ne saisit pas un deuxième total
  de l'église (P26).
- Entre ministères : invisibles au ministère ; signalés à l'administration et à EJP Tech seulement
  (6.2). Les suggestions donnent un même libellé et une même définition aux chiffres partagés.

## 7. Écrans

Aucun de ces écrans n'a de maquette : les écarts s'écrivent dans `LISEZMOI.md` à l'étape qui les
construit. Panneaux de 460 px à partir de 600 px, page entière en dessous ; tableaux en listes sur
téléphone ; cibles de 44 px ; boutons jamais grisés, l'erreur s'affiche sous le champ. Les durées
(« depuis 2 jours ») et les dates se comptent à l'heure de Paris.

### 7.1 Indicateurs (administration et EJP Tech)

- **But** : voir et régler les indicateurs de tous les ministères, sans aucune valeur.
- **Adresse** : `/indicateurs`, nouvel onglet après « Sessions » (administration) et après
  « Modération » (EJP Tech).
- **Contenu** :
  - phrase : « 94 indicateurs actifs pour 22 ministères, dont 7 ajoutés par les ministères. » ; au
    lot 2, « Un ajout attend une validation. » ;
  - lot 2 : bloc « À valider (1) », s'il y a lieu : libellé, ministère, rythme, définition,
    « depuis 3 jours », contrôles (« Libellé proche : Événements couverts, dans les suggestions ») ;
    pour EJP Tech, sous le bloc, « Validez sur demande écrite de l'administration de l'église. »
    (selon Q15) ;
  - tableau : Ministère ; Indicateurs (« 8 sur 12, dont 1 ajouté par Kumi ») ; Prévus
    (« 6 à créer » et bouton « Créer », « Créés », « Aucun prévu » ou « À choisir ») ; Saisie
    (« 2 peu saisis » en orange avec le mot) ; Dernier changement (« 12 oct. »).
- **Actions** : « Créer », ouvrir un ministère ; au lot 2, « Valider » et « Refuser » (motif en
  boutons radio).
- **États** : chargement ; aucun ministère (« Aucun ministère. Créez d'abord les ministères dans
  Ministères et comptes. ») ; rien à valider (le bloc disparaît).
- L'écran 13 : la colonne « Indicateurs propres » devient un nombre et un lien vers cet écran ;
  la phrase « faites une demande à EJP Tech » est retirée.

### 7.2 Indicateurs d'un ministère (administration et EJP Tech)

- **Adresse** : `/indicateurs/:id`.
- **Contenu** :
  - phrase : « Kumi suit 7 indicateurs sur 12 au plus : 6 prévus par la coordination et 1 ajouté
    par Kumi. » ; au lot 2, « Ses ajouts écrits par lui passent par une validation (domaine
    sensible). » ;
  - bloc « Prévus par la coordination » tant qu'il en reste à créer : la liste et le bouton
    « Créer ces 6 indicateurs » ; si le nom n'est pas reconnu, le choix « Choisir dans la liste de
    la coordination », avec « Aucun prévu » en dernier ;
  - sections « Chaque dimanche », « Chaque mois », « À ce jour », « Calculs », puis « Retirés »
    (repliée) ;
  - chaque ligne : libellé, définition, mentions (« grand compte », « en euros », « sensible : mois
    écoulés seulement », « ajouté par Kumi le 12 oct. », au lot 2 « en attente depuis 2 jours ») et
    usage (« Saisi 4 mois sur 5, dernier le 2 oct. », « Jamais saisi », « Peu saisi : 1 mois sur
    4 ») ;
  - pour EJP Tech seulement, le lien « Voir la fiche » (valeurs, T28).
- **Actions** : « Ajouter un indicateur », « Ajouter un calcul » ; sur chaque ligne « Corriger »
  (tant que rien n'est saisi, jamais sur une suggestion), « Remplacer », « Retirer », « Retirer pour
  confidentialité » et, au lot 2, « Rendre officiel » (ajout d'un ministère).
- **Panneau « Ajouter un indicateur »** : « Ce que vous comptez » (60, compteur, et dessous
  « N'écrivez aucun nom ni information personnelle. ») ; « Ce qu'on compte exactement » (140) ;
  « Quand le saisir » (trois boutons radio : « Chaque dimanche, avec les chiffres du dimanche »,
  « Chaque mois, le total d'un mois », « À ce jour, où on en est aujourd'hui ») ; « Sorte de
  nombre » (trois boutons radio : « Un compte (jusqu'à 9 999) » coché, « Un grand compte (jusqu'à
  9 999 999) », « Des euros ») ; case « Domaine sensible (santé, accompagnement, enfants) » avec sa
  conséquence (« Saisi chaque mois, une fois le mois fini. ») ; si le libellé touche la famille
  sensible sans la case, le refus de 6.1 et une case « Ce n'est pas un domaine sensible » ;
  contrôles pendant la frappe ; aperçu (« Publications, septembre 2026 : __ ») ; bouton « Ajouter
  l'indicateur ».
- **Panneau « Ajouter un calcul »** : « Nom du calcul » (60, et dessous « N'écrivez aucun nom ni
  information personnelle. »), « Ce qu'on calcule » (140), « Chiffre du haut », « Chiffre du bas »
  (listes limitées aux sources compatibles : même ministère, saisies, non sensibles, jamais un
  commun), « Afficher » (« En pourcentage », « En moyenne ») ; aperçu avec des nombres d'exemple
  (« Par exemple : 16 sur 20, soit 80 % »), puisque l'administration ne lit pas les valeurs ;
  bouton « Ajouter le calcul ».
- **Panneau « Corriger »** : champs préremplis, le rappel de l'administration sous le premier,
  « Vous pouvez corriger le libellé et la définition tant que rien n'est saisi. Ensuite, remplacez
  l'indicateur. » ; bouton « Enregistrer la correction ».
- **Fenêtre « Retirer »** : « Retirer « Publications » ? », motif en boutons radio, « Il ne sera
  plus proposé à la saisie. Ses 9 valeurs restent sur la fiche. Un indicateur retiré ne revient
  pas. », s'il y a lieu « Le calcul « Taux de résolution » sera retiré aussi. », bouton « Retirer
  l'indicateur ». Sans saisie : « Il n'a aucune saisie : il disparaîtra de la fiche. ».
- **Fenêtre « Retirer pour confidentialité »** : « Retirer « Interventions » pour confidentialité ?
  Le libellé et la définition seront masqués. L'indicateur et ses 5 valeurs disparaîtront de toutes
  les fiches. Cette action est définitive. », bouton « Retirer pour confidentialité ». Réussite :
  « Indicateur retiré pour confidentialité. »
- **Fenêtre « Rendre officiel »** (lot 2) : « Rendre officiel « Campagnes » ? Il ne comptera plus
  dans les 3 ajouts de Communication, et seuls l'administration et EJP Tech pourront le retirer. », bouton
  « Rendre officiel ».
- **Panneau « Remplacer »** : celui de l'ajout, prérempli, avec « Remplace « Problèmes signalés »
  (chaque dimanche). Ses saisies restent sous l'ancien indicateur. » ; pour un indicateur sensible,
  la case « Domaine sensible » cochée et non modifiable ; bouton « Remplacer l'indicateur ».
- **États** : « Aucun indicateur pour Protocole. Il saisit les chiffres communs. » ; réussites
  (« Indicateur ajouté. », « 6 indicateurs prévus créés. », « Indicateur retiré, ses saisies
  restent sur la fiche. »).

### 7.3 Mes indicateurs (ministère) et le parcours d'ajout

- **But** : voir ce que le ministère suit et ajouter ou retirer ses propres indicateurs.
- **Adresse** : `/ma-fiche/indicateurs`, ouverte par le lien « Gérer mes indicateurs » sous les
  chiffres de « Ma fiche » (pas de cinquième onglet).
- **Contenu** :
  - phrase : « Communication suit 7 indicateurs : 5 prévus par la coordination et 2 ajoutés par
    vous. Vous pouvez en ajouter 1 autre. » ;
  - liste par rythme : libellé, origine, usage (« Saisi 4 mois sur 5 ») et, au lot 2, état (« En
    attente de validation depuis 2 jours : vous pourrez le saisir dès qu'il sera validé, y compris
    pour les périodes passées. », « Refusé le 8 oct. : domaine sensible, à créer par
    l'administration. »).
- **Actions** : « Ajouter un indicateur » ; sur ses ajouts, « Retirer » (motif : n'est plus suivi,
  doublon, créé par erreur ; pour la source d'un calcul, le message de 4.2 à la place) et, au lot
  2, « Corriger » (tant que rien n'est saisi, trois fois au plus).
- **Parcours d'ajout** (panneau) :
  1. Si une limite est atteinte, le panneau ne montre que l'explication et ce qu'il faut faire
     (messages de 4.2). Le bouton qui l'ouvre reste actif.
  2. « Suggestions » : les suggestions absentes de la fiche, avec rythme et définition, et un
     bouton « Ajouter » chacune. Le message dépend du rythme : « « Demandes reçues » ajouté : il
     apparaît dans vos chiffres du mois. » ou « ... il apparaît dans le formulaire du dimanche. »
     (dimanche et à ce jour).
  3. Au lot 1, dessous : « Rien ne convient ? Demandez un indicateur à l'administration de
     l'église. » Au lot 2, ce lien devient « Rien ne convient ? Écrire votre indicateur », qui ouvre
     trois champs : « Ce que vous comptez » (60, compteur, exemples « Publications, Demandes reçues,
     Projets en cours », et dessous « N'écrivez aucun nom ni information personnelle. Les champs
     libres sont relus par EJP Tech. ») ; « Ce qu'on compte exactement » (140, aide « Ce qui compte
     et ce qui ne compte pas, pour que tout le ministère compte pareil. ») ; « Quand le saisir »
     (trois boutons radio et leur aide).
  4. Lot 2 : contrôles pendant la frappe (`verifier_libelle`) : un refus s'affiche en rouge sous le
     champ avec son message, un avertissement en orange.
  5. Lot 2 : aperçu selon le rythme : « Dans le formulaire du mois : Publications, septembre 2026 »
     et « Sur votre fiche : Septembre 2026 : 14. Somme des mois depuis janvier : 112 (9 mois sur
     9). »
  6. Lot 2 : texte « Le berger, le conseil et EJP Tech verront ce chiffre. Taux, moyennes et sommes
     de l'année se calculent tout seuls. Pour la santé, l'accompagnement, les enfants ou l'argent,
     demandez à l'administration de l'église. »
  7. Lot 2 : bouton « Ajouter l'indicateur », ou « Envoyer pour validation » quand 4.3 l'exige,
     avec la phrase « Kumi suit un domaine sensible : chaque ajout écrit par vous est validé par
     l'administration de l'église avant la saisie. » (ou, pour un mot de la famille sensible, le
     message de 6.1).
  8. Réussite selon le rythme : « Indicateur ajouté : il apparaît dans vos chiffres du mois. » ou
     « Indicateur ajouté : il apparaît dans le formulaire du dimanche. » ; au lot 2, « Envoyé pour
     validation. Vous pourrez le saisir dès qu'il sera validé. »
- **Panneau « Corriger »** (lot 2) : champs préremplis ; le rappel du ministère sous le premier ;
  « Vous pouvez corriger le libellé et la définition tant que rien n'est saisi, trois fois au plus.
  Pour compter autre chose ensuite, remplacez cet indicateur. » ; bouton « Enregistrer la
  correction ». Dès la première valeur saisie, le bouton « Corriger » disparaît.
- **États** : « Votre ministère n'a pas encore d'indicateur à lui. Les STARs au service, actifs et
  en FIJ se saisissent déjà chaque dimanche. » ; « Toutes les suggestions sont déjà sur votre
  fiche. ».

### 7.4 Saisies

- **Dimanche (08)** : les communs, puis les indicateurs « dimanche » (vides) et « à ce jour »
  (préremplis), par ordre alphabétique. Sous chaque champ : la définition, « Dimanche dernier : 9 »
  et l'unité en suffixe (« € »). Erreur selon la sorte : « Entre 0 et 9 999. » ou « Entre 0 et
  9 999 999. ». Un seul insert. Si un indicateur a été retiré pendant la saisie, le message de 5.3
  le nomme et le formulaire se recharge en gardant les valeurs tapées.
- **Chiffres du mois** (`/saisir/mois`, nouveau, même composant que 08) :
  - titre : le dernier mois fini non saisi, sinon le mois en cours (« Chiffres de septembre 2026 ») ;
    lien « Choisir un autre mois » (« Octobre 2026, en cours », « Août 2026 (déjà saisi) », puis
    les mois plus anciens, jusqu'à janvier de l'année précédente) ;
  - champs vides, aide « Le total du mois. Si rien, enregistrez 0. » et la définition ;
  - sur le mois en cours, un indicateur sensible s'affiche sans champ : « Se saisit une fois le mois
    fini. » ;
  - « Déjà saisi : 14, le 2 oct. Votre saisie la remplacera. » ; au lot 2, avertissements de 6.2 ;
    un seul insert ; bouton « Enregistrer les chiffres du mois ».
- **« Vos saisies »** (accueil du ministère) gagne la ligne « Chiffres de septembre », « À faire »
  du 1er octobre jusqu'à ce que chaque indicateur du mois ait sa valeur de septembre.
- Un calcul ou un indicateur en attente n'est jamais dans un formulaire.

### 7.5 Fiche du ministère et vue du berger

- **Écrans** : 04 (berger et conseil), 12 (le ministère), et la fiche en lecture pour EJP Tech
  (T28). La phrase de la fiche ne change pas : elle ne parle que des communs.
- **Section « Indicateurs du ministère »**, après les chiffres communs, rangée par rythme puis par
  ordre alphabétique. Chaque ligne :
  - la valeur avec son unité et sa période : « Septembre 2026 : 14 », « Dimanche 27 sept. : 12 »,
    « Saisi le 24 sept. : 3 » ;
  - pour le dimanche et le mois, la petite courbe et son équivalent texte (« Douze derniers mois :
    9, 12, 14 ») ;
  - « Somme des mois depuis janvier : 112 (9 mois sur 9). Octobre en cours : 5. » ;
  - la définition au clic sur le libellé (bouton avec `aria-expanded`) ;
  - mentions discrètes : « Ajouté par Kumi le 12 oct. », « Libellé corrigé le 14 oct. »,
    « Remplace « Problèmes signalés » ».
- Un calcul tient sur une ligne : « Taux de résolution : 80 % en septembre (16 sur 20). Depuis
  janvier : 78 % (9 mois sur 9). » Avec un bas « à ce jour » de plus de 30 jours : « Taux de
  complétion : 40 % (12 sur 30 inscrits, relevé le 12 août). »
- Un indicateur sensible : la valeur du mois fini seulement, sans « en cours ».
- « Retirés (2) », replié, garde les valeurs ; un retiré sans saisie ou retiré pour confidentialité
  n'y figure pas ; un calcul retiré y figure si ses sources ont des saisies.
- Le ministère (12) a en plus « Saisir les chiffres du mois » et « Gérer mes indicateurs ».
- **États** : « Pas encore saisi. » ; « Non calculé : demandes reçues de septembre non saisies. » ;
  aucun indicateur : « Ce ministère ne suit pas encore d'indicateur à lui. » (berger), « Votre
  ministère ne suit pas encore d'indicateur à lui. » (ministère).

### 7.6 Journal et modération

- **Journal (06)** : les lignes de 5.10 ; « A saisi des chiffres » affiche « Publications
  (septembre) » sans valeur pour un indicateur propre ; « un ajout non publié » pour le berger et
  le conseil (lot 2).
- **Modération (15)**, lot 2 : nouveau type d'élément « Indicateur de Kumi » (libellé, ce qu'on
  compte), avec « Rien à signaler » et « Masquer le texte » ; champ « Libellé » ou « Définition ».
  Un texte corrigé revient « à relire ». En tête, s'il y a lieu : « 1 ajout attend une
  validation. » et le lien « Ouvrir Indicateurs ».

### 7.7 États et messages

| Situation                                    | Texte                                                                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Ajout réussi (ministère)                     | « Indicateur ajouté : il apparaît dans vos chiffres du mois. » (mois) ; « Indicateur ajouté : il apparaît dans le formulaire du dimanche. » |
| Ajout en attente (lot 2)                     | « Envoyé pour validation. Vous pourrez le saisir dès qu'il sera validé. »                                                                   |
| Validation (lot 2)                           | « Indicateur validé : Kumi peut le saisir. » ; refus : « Indicateur refusé. Kumi verra le motif. »                                          |
| Retrait                                      | « Indicateur retiré, ses saisies restent sur la fiche. » ; sans saisie : « Indicateur retiré. »                                             |
| Retrait pour confidentialité                 | « Indicateur retiré pour confidentialité. »                                                                                                 |
| Retrait d'une source par un ministère        | « Ce chiffre sert au calcul « Taux de résolution » : demandez à l'administration de l'église de le retirer. »                               |
| Correction refusée                           | « Cet indicateur a déjà une valeur saisie : il ne se corrige plus. Pour compter autre chose, remplacez-le. »                                |
| Saisie au-dessus du plafond                  | « Entre 0 et 9 999. » (compte) ; « Entre 0 et 9 999 999. » (grand compte, euros)                                                            |
| Saisie d'un mois futur                       | « Ce mois n'est pas encore commencé. »                                                                                                      |
| Saisie d'un mois trop ancien                 | « Ce mois est trop ancien pour être saisi. »                                                                                                |
| Page réservée (ministère sur `/indicateurs`) | « Cette page n'est pas disponible avec votre compte. », aucune requête                                                                      |

Nouvelles adresses, à ajouter au tableau du BRIEF avec leur garde : `/indicateurs` et
`/indicateurs/:id` (administration, EJP Tech), `/ma-fiche/indicateurs` et `/saisir/mois`
(ministère).

## 8. Sécurité, droits et tests

### 8.1 Matrice des droits

| Objet                                              | Ministère                                        | Berger, conseil                                                                | Administration                         | EJP Tech                        | `aal1`, anonyme |
| -------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------ | -------------------------------------- | ------------------------------- | --------------- |
| `indicateur` (lecture)                             | les communs et les siens, tous états             | tous, sauf `etat = 'en_attente'` et sauf `ne_en_attente and valide_le is null` | tous                                   | tous                            | rien            |
| `indicateur` (écriture)                            | par fonctions seulement (4.6)                    | rien                                                                           | par fonctions                          | par fonctions                   | rien            |
| `mesure` (ajout)                                   | le sien, indicateur actif et non calculé         | rien                                                                           | rien                                   | rien                            | rien            |
| `mesure` (lecture)                                 | inchangée                                        | inchangée                                                                      | communs seulement                      | tout (T28)                      | rien            |
| `v_mesure_periode`                                 | comme `mesure`                                   | comme `mesure`                                                                 | communs seulement                      | tout                            | rien            |
| `v_indicateur_suivi`, `v_calcul`                   | les communs et les siens, avec valeurs           | lignes lisibles d'`indicateur`, avec valeurs                                   | toutes les lignes, valeurs des communs | toutes les lignes, avec valeurs | rien            |
| `v_catalogue`                                      | rien                                             | rien                                                                           | oui                                    | oui                             | rien            |
| `v_suggestions`                                    | pour sa fiche                                    | rien                                                                           | oui                                    | oui                             | rien            |
| `v_usage_indicateurs`                              | rien                                             | rien                                                                           | oui                                    | oui                             | rien            |
| `limites_indicateurs`, `verifier_libelle`          | sa fiche seulement, sans indice entre ministères | refusé (42501)                                                                 | toute fiche, avec indices              | toute fiche, avec indices       | refusé          |
| fonctions d'écriture (5.8)                         | selon 4.6                                        | refusé (42501)                                                                 | selon 2                                | selon 2                         | refusé          |
| `journal`, codes `indicateur_*` et `indicateurs_*` | lignes de sa fiche                               | toutes ; texte nul pour un ajout en attente ou jamais validé                   | toutes (aucune valeur)                 | toutes (journal technique)      | rien            |
| `moderation`, cible `indicateur` (lot 2)           | rien                                             | rien                                                                           | rien                                   | oui                             | rien            |
| `private.indicateur_prevu`, `private.terme`        | rien                                             | rien                                                                           | rien (vue `v_catalogue`)               | rien (vue `v_catalogue`)        | rien            |

Politique restrictive `aal2` sur `indicateur` comme ailleurs ; aucun GRANT `insert`, `update`,
`delete` ni `truncate` sur `indicateur` ; rien pour `anon` ; chaque fonction commence par
`exige_aal2()`. Les vues sur fonction suivent leur propre contrôle et ne rendent rien hors `aal2`
ou hors des profils prévus. Chaque ligne de ce tableau entre dans la matrice écrite en données des
tests pgTAP.

### 8.2 Tests pgTAP

Lot 1 :

- **Matrice en données** : chaque ligne de 8.1, par les sept profils et l'anonyme, en `aal1` et
  `aal2` ; ajout, mise à jour et suppression directs refusés partout ; chaque fonction refusée en
  `aal1`.
- **Sens figé** : `controler_indicateur` refuse un changement de rythme, de sorte, de ministère, de
  case sensible ou de source, et toute suppression, même au propriétaire ; correction refusée dès
  la première valeur saisie (pour un calcul, dès la première valeur d'une source) et sur une
  suggestion ; `corriger_indicateur` avec « [texte masqué par EJP Tech] » refusé ; libellé masqué
  sans retrait refusé ; définition d'un commun modifiable par une migration seulement ; « NA » et
  « Visuels livrés ce mois » acceptés par le trigger.
- **Ajouts d'un ministère** : suggestion acceptée sur sa fiche, refusée sur une autre (42501) ;
  `creer_indicateur`, `creer_calcul` et `corriger_indicateur` refusés au ministère (42501, jusqu'au
  lot 2) ; 4e ajout et 13e indicateur de la fiche refusés ;
  retrait d'une source de calcul refusé ; berger, conseil et anonyme refusés ;
  `limites_indicateurs` et `verifier_libelle` refusés sur la fiche d'un autre ministère, et sans
  indice entre ministères.
- **Remplacement** : un ministère ne remplace ni un prévu, ni l'ajout d'un autre ministère, ni un
  commun (42501) ; l'administration ne remplace pas un indicateur d'une autre fiche ; le remplaçant
  d'un sensible est sensible ; limites comptées sans l'indicateur remplacé (une fiche à 12 et un
  ministère à 3 ajouts remplacent) ; même libellé permis ; d'un seul tenant.
- **Administration** : mot sensible sans la case refusé, accepté avec la case ou avec
  `p_pas_sensible`.
- **Retrait** : saisies gardées, nouvelle saisie refusée ; retiré sans saisie absent de
  `v_indicateur_suivi` ; calcul dépendant retiré ; calcul retiré présent parmi les retirés si ses
  sources ont des saisies ; prévu non retirable par le ministère ; commun non retirable ; retrait
  pour confidentialité : deux textes masqués, absent des fiches, une seule ligne de journal,
  refusé au ministère.
- **Catalogue** : `p_modele` inconnu refusé ; « aucun » accepté ; prévus créés tout ou rien ;
  second appel sans doublon et sans ligne de journal ; limite de 12 respectée ; calculs créés avec
  leurs sources ; tables privées illisibles.
- **Saisies** : 10 000 refusé pour un compte, accepté pour un grand compte ; 15 du mois, mois
  futur, mois avant le 1er janvier de l'année précédente et mois en cours d'un sensible refusés ;
  bascule du mois le 31 octobre 2026 à 23 h 30 UTC (déjà le 1er novembre à Paris) ; calcul refusé
  par le trigger et par la politique ; indicateur retiré : le message le nomme.
- **Lectures** : somme et complétude d'un indicateur ajouté en cours d'année, d'un rattrapage qui
  recule le départ, d'un retiré, d'un ministère désactivé ; « Non calculé » (bas absent, bas nul) ;
  deux « à ce jour » sans valeur sur l'année ; bas « à ce jour » de plus de 30 jours signalé ;
  l'administration ne lit aucune valeur propre mais lit l'usage ; EJP Tech lit les valeurs et ne
  peut rien saisir.
- **Journal et données personnelles** : une seule ligne par geste ; aucun libellé, aucune
  définition ni valeur propre dans `detail` ; `p_modele` du journal toujours un code du catalogue ;
  un marqueur placé dans un libellé et une définition, une fois masqués, ne se trouve plus nulle
  part (`indicateur`, `journal`, `moderation`).

Lot 2 :

- **Mots** : chaque famille refusée avec son message ; voisins acceptés (« Moyens techniques »,
  « Vues cumulées YouTube » en à ce jour, « Personnes bénéficiant de la traduction »,
  « Participants de la nuit du samedi au dimanche », « Prière des Stars : sessions ») ; formes
  féminines et plurielles trouvées (« Personnes accompagnées », « Personnes mobilisées », « Femmes
  mobilisées », « Personnes actives mobilisées », « Prises en charge ») ; « 06 12 34 56 78 »,
  « 30 % » et « 50 € » refusés ; doublon normalisé (« Nombre de projets en cours » contre « Projets
  en cours »), libellé commun et libellé de suggestion refusés.
- **Jeu des 185 libellés** : une table de test reprend chaque demande de l'annexe (colonne
  « Demande »), son rythme proposé et le résultat attendu quand un ministère la tape telle quelle :
  acceptée, en validation, ou la famille qui la refuse. Attendus d'après 6.1, vérifiés sur une
  maquette de la fonction : 100 refusées, 76 acceptées, 9 en validation.
  - Les 18 « Valeur calculée » et les 12 « Commun » sont refusées.
  - Les « Conforme » hors communs sont acceptées, sauf, en connaissance de cause : lignes 16, 18,
    134, 164 et 269, refusées pour leur période (le ministère écrit « NA » et choisit « Chaque
    dimanche ») ; lignes 73, 165 et 169, renvoyées vers les suggestions. Une demande qui contient
    un mot de période est refusée, jamais nettoyée sans le dire.
  - Les « Non conforme » sont refusées, sauf les lignes 154 (« Articles les plus vendus ») et 216
    (« Besoins en matériels ») : un classement et une liste ne se reconnaissent pas à leurs mots ;
    la définition obligatoire et la relecture les arrêtent.
  - Les « Domaine sensible » partent en validation, sauf les lignes 194 et 206, refusées pour leur
    période ; « Interventions » de Sécurité (l. 241) part aussi en validation.
- **Validation** : un compte écrit par un ministère qui suit un sensible naît en attente, une
  suggestion est active ; saisie refusée en attente ; validé, saisie acceptée y compris pour un
  dimanche passé ; un ajout refusé, puis un ajout retiré par le ministère avant validation, restent
  illisibles par le berger et le conseil dans `indicateur`, `v_journal` (`cible_texte` nul) et
  `v_indicateur_suivi`, et lisibles par l'administration et EJP Tech ; ministère sans prévus
  créés : en attente ; sensible retiré sans saisie : plus de validation ; texte de la famille
  sensible chez un ministère non sensible : en attente ; validation refusée au ministère.
- **Correction et relecture** : correction par le ministère acceptée sans saisie, refusée après la
  première, refusée sur une suggestion ou un prévu (`modele_code` non nul), refusée à la
  quatrième ; texte relu, puis corrigé, de retour dans `v_textes_a_relire`, puis relu à nouveau ;
  texte corrigé par l'administration absent de la file.
- **Limite sur 30 jours** : 4e ajout en 30 jours refusé (un retiré compris), date de la prochaine
  place calculée à l'heure de Paris.

### 8.3 Tests existants à reprendre

`integrite` et `rls-chiffres-saisies` (« Visuels livrés » au 1er d'un mois fini, codes d'erreur
revus), `jeu-exemple` (nombre d'envois de Communication), `structure`, `rls-chiffres-matrice`
(matrice d'EJP Tech, T28) et les tests du journal qui attendent une valeur d'indicateur propre.

### 8.4 Vitest et parcours e2e

- **Vitest** : libellés des périodes (« Depuis juillet », « Octobre en cours »), phrases d'usage,
  message de réussite selon le rythme, plafond selon la sorte, schémas Zod (longueurs et rythmes
  seulement : les mots restent dans la base) ; au lot 2, alerte de valeur inhabituelle.
- **E2E** (1440, 834 et 390 px, audit axe), lot 1 :
  1. l'administration crée les prévus de Kumi, ajoute un calcul pour Tech, retire un indicateur
     avec un motif et en retire un autre pour confidentialité ;
  2. Communication, qui n'a aucun ajout dans le jeu d'exemple, ajoute les suggestions « Demandes
     reçues », « Événements couverts » et « Projets réalisés », lit le refus d'un quatrième ajout,
     saisit les chiffres de septembre et retrouve « 1 mois sur 1 » sur sa fiche ;
  3. le berger lit un calcul et la mention « Ajouté par Communication » ;
  4. un ministère qui ouvre `/indicateurs` ne reçoit aucune donnée.
- **E2E**, lot 2 : 5. Communication écrit « Campagnes », tente « Taux d'engagement » et lit le refus ; 6. Kumi envoie « Pages Roses : ateliers » pour validation, l'administration la valide, Kumi la
  saisit ; un autre ajout refusé reste invisible du berger ; 7. EJP Tech masque un libellé : l'indicateur passe dans « Retirés ».

## 9. Chemin et phasage

| Moment                                     | Contenu                                                                                                                                                           | Effort (jours de travail d'EJP Tech avec Claude Code) |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Après l'étape 3                            | migration T28, déjà décidée                                                                                                                                       | déjà prévu                                            |
| Étape 4a, nouvelle (lot 1)                 | les six migrations du lot 1 (5.1), `seed.sql`, pgTAP du lot 1, types, `src/data/`                                                                                 | 4 à 5                                                 |
| Étape 4, fiche et saisies                  | fiche par rythme, sommes et complétude dans le temps, calculs, « Chiffres du mois », « Vos saisies », définitions sous les champs                                 | 3 à 4                                                 |
| Étape 6, administration                    | écran Indicateurs et ses panneaux, usage, retrait pour confidentialité, journal, colonne de l'écran 13                                                            | 2 à 3                                                 |
| Étape 6, ou juste après la mise en service | « Mes indicateurs » : suggestions et retrait                                                                                                                      | 1                                                     |
| Étape 8, déploiement                       | ordre ci-dessous ; recette en préproduction avec 22 ministères fictifs                                                                                            | compris                                               |
| Après la mise en service (lot 2, si Q1)    | `indicateurs_ajouts_libres`, comptes écrits par les ministères, validation, correction, relecture, limite sur 30 jours, « Rendre officiel », 185 libellés, alerte | 4 à 6                                                 |

- **Total** : lot 1, 10 à 13 jours avant la mise en service (9 à 12 si « Mes indicateurs » vient
  juste après) ; lot 2, 4 à 6 jours ensuite. Le plan de P29 (lots de migration, sans écran)
  coûtait 6 à 9 jours : le lot 1 en coûte 3 à 4 de plus avant la mise en service. L'estimation
  précédente (13 à 17 jours, dont 11 à 14 avant la mise en service) mettait presque tout avant ;
  le découpage ajoute environ un jour (une migration et une recette de plus) mais repousse 4 à 6
  jours après la mise en service.
- **Repli** : lot 1 sans « Mes indicateurs » ; les ministères demandent tout à l'administration.
- **Ordre de l'étape 8** : les migrations ; puis l'administration crée les 22 ministères ; puis
  « Créer » (ou « Aucun prévu ») sur chaque ligne de l'écran Indicateurs, de préférence avant
  l'activation des comptes des ministères. Au lot 1, cet ordre n'est plus une protection : un
  ministère n'écrit aucun texte. Au lot 2, la base l'impose : tant que les prévus d'un ministère ne
  sont pas créés, ses ajouts écrits par lui naissent en attente (4.3). Si l'écran n'était pas prêt,
  une migration ponctuelle appellerait la même fonction interne pour les ministères existants
  (noms normalisés), comme le « à défaut » de T27.
- **Section 13 du BRIEF** : « 4a » s'ajoute entre 3 et 4 si T29 est confirmée ; 4 et 6 gagnent le
  contenu du lot 1 ; le lot 2 devient une étape après la mise en service ; la section 11 retire
  « écran de création des indicateurs propres ».
- **Entretien ensuite** : une nouvelle suggestion ou un mot refusé, par une petite migration
  (une demi-journée avec la recette) ; tout le reste à l'écran. À la fin de vie (P13), l'export
  final inclut les définitions et les motifs de retrait.

## 10. Risques et questions

### Risques

| Risque                                                                                                    | Parade                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| La liste de mots refuse à tort (« écoute » pour un chœur) ou laisse passer (« PEC » mal écrit, un prénom) | lot 2 seulement ; la famille sensible envoie en validation au lieu de refuser ; avertissement « prénom », relecture ; liste changée par migration |
| Le berger lit un libellé avant la relecture d'EJP Tech (lot 2)                                            | même risque que les points d'attention, accepté par le BRIEF ; texte plus court et filtré ; validation dans les cas à risque                      |
| Compte partagé : un ajout ou un retrait n'est imputable à personne                                        | limites, motif obligatoire, journal ; le ministère ne retire que ses ajouts                                                                       |
| Désordre : 22 fiches de 12 lignes                                                                         | limites, usage et « peu saisi » visibles, suggestions communes                                                                                    |
| Pas de notification : une validation attend qu'on ouvre l'écran (lot 2)                                   | file courte, signalée dans la Modération hebdomadaire ; rattrapage des périodes passées                                                           |
| Une définition précisée après la première saisie demande un remplacement (deux courbes)                   | écrire les définitions de la vague 1 à partir des réponses K17 à K55 ; corriger avant la première saisie                                          |
| Un retrait par erreur coupe une série (pas de réactivation)                                               | fenêtre de confirmation qui le dit ; l'ancienne série reste lisible sous « Retirés »                                                              |
| Saisir le mois en cours puis le corriger donne des sommes provisoires                                     | le mois en cours reste hors de la somme et de la complétude                                                                                       |
| Les tests de base ne tournent qu'en CI                                                                    | un seul trigger nouveau, fonctions sur le modèle de `marquer_traite`, matrice écrite en données                                                   |
| 10 à 13 jours pour un outil temporaire (question C1 de `kpi-ministeres.md`)                               | lot 2 après la mise en service, seulement s'il est confirmé ; repli sans « Mes indicateurs »                                                      |

### Questions pour EJP Tech

- **Q1** : lot 1 avant la mise en service (ajouts des ministères limités aux suggestions, en un
  clic), lot 2 (comptes écrits par les ministères) après, s'il reste utile : d'accord ? Ou tout
  avant la mise en service, ou pas de lot 2 ?
- **Q2** : au lot 2, validation d'un compte écrit par un ministère seulement dans les cas de 4.3
  (domaine sensible, prévus pas encore créés, mot de la famille « sensible ») : d'accord ? Sinon,
  A, C ou D de 4.3 ?
- **Q3** : limites de 3 ajouts par ministère et de 12 indicateurs par fiche (lot 1), de 3 ajouts
  par 30 jours et de 3 corrections par indicateur (lot 2) ?
- **Q4** : un ministère ne lit plus que les définitions des communs et des siennes ?
- **Q5** : plafond fixé par sorte de nombre (compte, grand compte, euros), sans unité « jours » ni
  colonne `groupe`, et « minutes » seulement si K22 (modifie T26) ?
- **Q6** : bouton « Créer » des prévus au lieu du trigger sur `ministere` (modifie T27) ?
- **Q7** : retrait sans suppression ni réactivation, même sans saisie ?
- **Q8** : libellé et définition corrigés seulement tant que rien n'est saisi, puis par
  remplacement ?
- **Q9** : « Mes indicateurs » (suggestions) avec l'étape 6, ou juste après la mise en service ?
- **Q10** : les lignes brutes de `mesure` d'un indicateur sensible restent lisibles par l'API (3.7),
  tant que la coordination ne retient pas le seuil « moins de 3 » (K5c) ?
- **Q11** : les textes écrits par EJP Tech sur l'écran Indicateurs ne passent pas en relecture,
  comme ceux de l'administration (la règle 9 ne nomme que l'administration) ?
- **Q12** : un indicateur retiré pour confidentialité disparaît aussi de la lecture de `mesure` par
  l'API, sauf pour EJP Tech (export de fin de vie) ?

### Questions pour la coordination

- **Q13** : les ministères peuvent-ils ajouter jusqu'à 3 indicateurs à eux, visibles du berger et
  du conseil avec la mention « Ajouté par le ministère » (questions C2 et C3 de
  `kpi-ministeres.md`) ?
- **Q14** : pour Santé, Social, Kumi, Eagles et Prodiges Junior, un indicateur écrit par le
  ministère doit-il être accepté par l'administration de l'église avant d'être visible du berger
  (lot 2) ?
- **Q15** : qui décide des indicateurs ? Proposé : l'administration de l'église décide des gestes
  qui changent ce qui est suivi (retirer, remplacer, valider ou refuser un ajout, rendre officiel,
  indicateur sensible ou en euros, calcul) ; EJP Tech ne les fait que sur sa demande écrite (P07).
  Ou bien EJP Tech peut-il les faire de lui-même ?
- **Q16** : un indicateur prévu par la coordination peut-il être retiré ou remplacé par
  l'administration de l'église sans votre accord ?
- **Q17** : l'administration de l'église voit les définitions et l'usage (« saisi 4 mois sur 5 »),
  jamais les valeurs : d'accord (P06) ?
- **Q18** (aussi pour EJP Tech) : le journal ne montre plus aucune valeur d'indicateur propre ; le
  berger y lit « A saisi des chiffres : Publications (septembre) » et trouve la valeur sur la
  fiche. D'accord (P29) ?
- **Q19** : qui écrit « Ce qu'on compte » des indicateurs prévus : la coordination, chaque
  ministère, ou EJP Tech à partir des réponses K17 à K55 ?
- **Q20** : la liste des suggestions de 5.11 convient-elle ?
- **Q21** : la somme de l'année part du 1er janvier ; pour un indicateur ajouté en cours d'année,
  de son ajout, ou du plus ancien mois de l'année rattrapé ; le mois en cours n'y entre qu'une fois
  fini. D'accord (K2, K3) ?
- **Q22** : si un ministère d'un domaine sensible n'a plus d'indicateur sensible dans ses six (K13,
  K5, K56b), ses indicateurs écrits par lui doivent-ils encore être acceptés avant d'être visibles ?
- **Q23** : si le retard du début du culte est retenu (K22), que saisit-on quand le culte commence
  en avance : 0, ou une avance comptée à part ?
- **Q24** : avant la vague 1, les réponses aux questions C1 à C3, K1, K5, K6, K7, K8, K13, K22 et
  K56 de `kpi-ministeres.md` (section 8) restent nécessaires : quand peut-on les avoir ?

## 11. Comparaison des trois conceptions étudiées

Trois conceptions indépendantes ont été écrites, puis notées par deux évaluations. Toutes deux ont
retenu la première comme base (24 points sur 30 chacune, contre 20 et 21 pour les autres).

| Angle                                             | Idées gardées                                                                                                                                                                                                                                          | Idées écartées, et pourquoi                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Simplicité (« Trois rythmes, deux gestes »), base | une seule table ; sens figé par un trigger ; plafond par sorte ; calcul comme ligne d'`indicateur` ; somme et courbe automatiques ; conventions de libellé ; journal sans valeur propre ; catalogue créé par un bouton ; limites sous verrou           | la suppression d'un indicateur sans saisie (un `DELETE`, exception à l'ajout seulement) : remplacée par un retrait qui le cache ; « mois saisi une fois fini pour tous » : changeait P16 et empêchait le suivi au fil du mois ; aucune correction possible d'une faute de frappe ; pas de définition        |
| Qualité des chiffres                              | la définition « Ce qu'on compte » ; le motif fermé au retrait ; le remplacement lié (`remplace_id`) ; la complétude sans les périodes de retrait ; l'avertissement de valeur inhabituelle ; une validation pour les cas à risque                       | la table `indicateur_version` et sa recopie par trigger (fragile, testée seulement en CI) ; `mesure.version_definition` (change la table centrale) ; deux clés pour tout (un seul compte d'administration, aucune notification) ; la porte de complétude à 75 % (pousse à saisir des 0) ; 17 à 23 jours     |
| Autonomie des ministères                          | `verifier_libelle` partagé entre l'écran et la base ; le jeu de test des 185 libellés ; les suggestions partagées ; la limite par 30 jours ; l'usage sans valeur pour l'administration ; la validation des domaines sensibles, ici déduite de la fiche | trois niveaux d'autonomie réglés par ministère (trop de notions) ; cache et versions ; modèles modifiables qui se propagent ; une case sensible qui passe de faux à vrai et cache le passé ; une RLS à part pour les mesures sensibles ; cinq plafonds différents ; une quinzaine de fonctions et huit vues |

Défauts communs aux trois, et réponse de cette synthèse :

- **Ajout seulement** : aucune suppression, aucun cache ; les seuls changements d'`indicateur` sont
  listés en 5.9 et contrôlés par un trigger.
- **Lecture par l'administration** : définitions et usage, jamais une valeur (4.4, Q17).
- **Complétude d'un indicateur ajouté en cours d'année** : règle unique, départ toujours nommé à
  l'écran (3.4).
- **Désordre et nettoyage** : usage et « peu saisi » visibles par l'administration, retrait avec
  motif, export des définitions à la fin de vie.
- **Effort** : cette synthèse gardait elle aussi une quinzaine de fonctions et six vues. La revue
  du 5 octobre l'a découpée en deux lots : le lot 1 (huit fonctions) avant la mise en service, le
  lot 2 (texte libre des ministères) seulement s'il est confirmé (section 9).
