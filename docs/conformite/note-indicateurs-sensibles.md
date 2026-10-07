# Note d'analyse : les indicateurs sensibles de Pilotage EJP

- **Version** : 1.2 (projet)
- **Date** : 7 octobre 2026
- **Auteur** : EJP Tech
- **Statut** : Projet à valider par la coordination
- **Pour** : la coordination de l'Église des Jeunes Prodiges
- **Sources** : `docs/conception/vague-1-decisions.md` (K5, K54, K56 et catalogue), `docs/decisions.md`
  (P22, P34, P35, P39, P42, P45 à P47, P52, T44 à T47), `BRIEF.md` (sections 3 et 7), page
  « Confidentialité » de l'outil, décisions de la personne responsable du 6 octobre 2026 sur le mois
  en cours, le texte « Précision » et la répartition par catégories, et du 7 octobre 2026 sur les
  valeurs exactes pour le berger, le conseil et EJP Tech
- **Document lié** : `docs/conformite/registre-traitements.md` (fiche 2)

## En bref

- Onze indicateurs de la liste de la coordination portent sur la santé, l'accompagnement social,
  l'écoute et les enfants. Ce sont des domaines sensibles.
- Ils sont **créés et actifs dès la vague 1**, comme tous les indicateurs demandés par la
  coordination. C'est la décision de la personne responsable du 6 octobre 2026.
- L'outil garde un **total par mois**, **le mois en cours compris** (affiché « en cours »). Il ne
  garde jamais un nom, une date de cas, un détail ni une liste.
- Le même jour, la personne responsable a ajouté deux possibilités, parce que des informations
  sensibles peuvent être importantes à faire remonter :
  - une **répartition par catégories** que la coordination fixe (par exemple malaise, blessure,
    autre) ;
  - un court texte facultatif, la **« Précision »**, attaché à un mois.
- **Le berger, le conseil et EJP Tech voient les valeurs exactes** (décision de la personne
  responsable du 7 octobre 2026) : ni « moins de 3 », ni masquage. Elle estime qu'ils ont besoin de
  savoir précisément ce qu'il en est. L'administration de l'église et les autres ministères ne
  voient aucune valeur.
- **Risque accepté par la personne responsable** : dans un très petit groupe (un seul cas de santé
  dans un ministère de quelques STARs, par exemple), un chiffre exact peut permettre à l'un de ces
  trois lecteurs de reconnaître une personne. Les autres protections restent (section 6).
- **Le texte « Précision » est le point le plus risqué** : un texte libre, dans un domaine sensible.
  Il est limité par des mesures fortes (section 6), mais il ne peut pas être garanti sans personne.
- La coordination est invitée à valider cette note et le registre, et à fixer les listes de
  catégories (liste à la section 9).

## 1. Les onze indicateurs

| Ministère       | Indicateur                                          | Ce qu'on compte exactement                                                                                | Ligne de la liste |
| --------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------- |
| Santé           | Prises en charge                                    | Personnes prises en charge par l'équipe santé dans le mois, une fois chacune. Aucun détail.               | 140               |
| Santé           | Interventions                                       | Gestes de l'équipe (soin, appel aux secours) dans le mois. Une prise en charge peut en compter plusieurs. | 141               |
| Santé           | Incidents avec intervention                         | Incidents (malaise, chute, accident) du mois qui ont demandé l'équipe santé ou les secours.               | 142               |
| Santé           | Orientations vers une structure ou un professionnel | Personnes orientées vers une structure de santé ou un professionnel dans le mois.                         | 143               |
| Social          | Bénéficiaires (passages)                            | Aides apportées dans le mois. Chaque passage compte une fois, même pour une personne déjà aidée.          | 61                |
| Social          | Personnes accompagnées                              | Personnes qui ont eu au moins un entretien de suivi dans le mois. Une personne compte une fois.           | 62                |
| Social          | Nouveaux bénéficiaires                              | Personnes aidées pour la première fois dans le mois. Un total, sans liste.                                | 63                |
| Kumi            | Call your sister : prises en charge                 | Prises en charge de Call your sister dans le mois. Aucun détail.                                          | 194               |
| Eagles          | La plate-forme d'écoute : prises en charge          | Prises en charge de la plate-forme d'écoute dans le mois. Aucun détail.                                   | 206               |
| Prodiges Junior | Nouveaux enfants                                    | Enfants accueillis pour la première fois à Prodiges Junior dans le mois.                                  | 279               |
| Prodiges Junior | Enfants déjà venus                                  | Enfants accueillis dans le mois qui l'avaient déjà été avant. Un total, sans liste.                       | 284               |

Ces indicateurs se saisissent par mois, y compris pour le mois en cours. La liste de la coordination
demandait « par semaine » pour Call your sister et la plate-forme d'écoute : l'outil les compte par
mois, car un petit nombre par semaine dans un domaine sensible peut désigner une personne.

D'autres chiffres des mêmes ministères **ne sont pas** sensibles, et pourquoi :

- « Enfants présents » (chaque dimanche) et « Enfants inscrits » (Prodiges Junior) : de grands
  nombres, un seul total, sans âge ni nom ;
- « Événements couverts », « Événements à couvrir » et « Mobilisés aux événements » (Santé) : ils
  comptent l'activité de l'équipe, pas les personnes aidées ;
- les incidents et interventions de Sécurité : leurs définitions excluent les malaises, les soins et
  les secours, comptés par Santé ;
- « Fonds levés » (Social) : un montant en euros, sans nom de donateur.

## 2. Pourquoi ils sont nécessaires

- La coordination les a demandés dans sa liste d'indicateurs du 5 octobre 2026 (lignes ci-dessus).
- La personne responsable a fixé une exigence absolue : chacune des 185 demandes de la liste est
  produite ou retrouvable dans l'outil. Aucune n'est abandonnée.
- Ces chiffres disent le volume d'activité des ministères qui prennent soin des personnes. Ils aident
  le berger et le conseil à voir les besoins et les moyens, sans jamais savoir qui a été aidé.

## 3. Ce que l'outil garde, et ce qu'il ne garde jamais

| L'outil garde                                                                    | L'outil ne garde jamais                                         |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Un nombre entier par indicateur et par mois, le mois en cours compris            | Un nom, un âge, un sexe, une adresse, un contact                |
| Une répartition de ce nombre dans les catégories fixées par la coordination      | La date ou le lieu d'un cas, la nature précise d'un soin        |
| Un court texte « Précision » facultatif (10 à 280 caractères), sans donnée perso | Une répartition par âge, par semaine ou par une catégorie libre |
| La date de la saisie et le compte du ministère qui l'a faite                     | Une liste de personnes                                          |
| La définition de l'indicateur                                                    | Une valeur ou un texte dans le journal                          |

Le texte « Précision » est du texte libre : l'outil le demande sans donnée personnelle, mais ne peut
pas empêcher qu'une personne en écrive une par erreur. D'où les mesures de la section 6.

Les listes, carnets ou fiches que les ministères tiennent peut-être **hors de l'outil** pour faire
leurs comptes n'entrent jamais dans Pilotage EJP. Ils ne relèvent pas de cette note (voir la
section 9, point 11).

## 4. Ce qui protège les totaux et les catégories, et ce qui ne les protège plus

Le RGPD s'applique aux informations sur une personne identifiée ou identifiable (article 4.1). Il ne
s'applique pas aux informations anonymes, c'est-à-dire qui ne permettent plus de reconnaître une
personne par des moyens raisonnables (considérant 26).

**Changement du 7 octobre 2026.** La version 1.1 de cette note s'appuyait sur un seuil : 1 et 2
s'affichaient « moins de 3 » au berger, au conseil et à EJP Tech, avec un masquage secondaire dans
les répartitions. La personne responsable a refusé cette règle : « même d'un point de vue conceptuel,
le berger et le conseil ont besoin de savoir précisément ce qu'il en est, pas d'avoir des éléments
approximatifs ! » (P52). Ces trois lecteurs voient donc les valeurs **exactes**, y compris 1 et 2,
pour le total, le mois en cours, la somme de l'année, la petite courbe de la fiche et chaque
catégorie (« Non réparti » compris). **La raison « les très petits nombres sont cachés » et la
raison « aucune fuite par différence » de la version 1.1 n'existent plus.** Pour ces trois lecteurs,
un chiffre exact dans un très petit groupe peut permettre de reconnaître une personne : c'est le
risque accepté par la personne responsable (section 5). On ne peut donc plus écrire que, pour eux,
les totaux et les catégories ne sont « pas, en pratique, des données personnelles » : l'outil les
traite avec les protections qui restent.

Cinq protections restent. **Le texte « Précision » est à part** : c'est du texte libre, il est
traité à la section 5.

1. **Un total, jamais une ligne par personne.** Le chiffre additionne des personnes ou des gestes.
2. **Un mois entier, jamais un jour.** Aucun chiffre ne dit quel jour ni quelle semaine un cas a eu
   lieu. Le mois en cours est accepté : pour qu'une valeur qui monte pendant le mois ne dise pas
   qu'un cas a eu lieu entre deux consultations, les lecteurs autres que le ministère ne voient que
   la dernière valeur saisie, jamais la suite des saisies. Le journal ne garde aucune valeur.
3. **Des catégories larges, fixées par la coordination.** Le ministère ne crée aucune catégorie. Les
   listes sont courtes (3 à 6), larges, avec un « autre », et ne désignent jamais une personne.
   Ce qui n'est pas réparti s'affiche « non réparti ».
4. **Des lecteurs limités.** Les lignes brutes ne sont lisibles que par le ministère qui saisit. Le
   berger, le conseil et EJP Tech lisent une vue de la base qui réapplique leurs droits et ne montre
   que la dernière valeur d'un mois : un accès direct à la base, sans passer par les écrans, ne
   contourne pas ces limites. L'administration de l'église ne reçoit aucune valeur (elle garde les
   lignes sans valeur, avec leur date) ; les autres ministères ne reçoivent rien.
5. **Aucune diffusion ni aucun calcul.** Ces chiffres ne figurent jamais sur la vue de l'église, ni
   dans un email, ni dans un graphique de l'étape 4 bis, et aucun calcul n'en est tiré.

Exemple de ce que voit le berger pour un indicateur sensible :

| Mois                                | Affiché au berger                                   |
| ----------------------------------- | --------------------------------------------------- |
| Octobre (en cours)                  | 2, marqué « en cours », hors de la somme de l'année |
| Septembre                           | 5                                                   |
| Août                                | 2                                                   |
| Juillet                             | 0                                                   |
| Somme de septembre, août et juillet | 7, avec sa complétude (3 mois sur 3)                |

Exemple de répartition d'un mois à 9 « Incidents avec intervention » (le ministère en a saisi 9,
dont 4 malaises, 2 blessures, 1 autre ; 2 non répartis) :

| Catégorie   | Valeur saisie | Affiché au berger |
| ----------- | ------------- | ----------------- |
| Malaise     | 4             | 4                 |
| Blessure    | 2             | 2                 |
| Autre       | 1             | 1                 |
| Non réparti | 2             | 2                 |

Le ministère qui saisit voit, lui aussi, ses valeurs exactes. Il connaît déjà les personnes qu'il a
aidées, puisqu'il a fait le compte. Pour le berger, le conseil et EJP Tech, la valeur exacte est ce
que la personne responsable veut leur montrer.

## 5. Risques qui restent

Appréciation d'EJP Tech, après les mesures de la section 6.

| Risque                                                | Exemple                                                                                                                                                                   | Ce qui le réduit                                                                                                                                                                                                                                                                                                                                                  | Niveau qui reste                                                                                                                                                                                                                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Petits groupes                                        | Un seul cas de santé dans un ministère de quelques STARs : le berger, le conseil ou EJP Tech lisent « 1 » et peuvent reconnaître la personne                              | Mois entier, lecteurs limités à ces trois profils (rien pour l'administration, les autres ministères et la vue de l'église), aucun détail, aucun calcul, journal sans valeur, double authentification                                                                                                                                                             | **Moyen, accepté par la personne responsable le 7 octobre 2026** (P52) : ces profils ont besoin de la valeur précise. Seul un seuil le réduirait, et elle l'a refusé                                                                                                       |
| Journal : numéro manquant (T44)                       | Un trou dans les numéros du journal dit qu'une ligne existe que le lecteur ne voit pas                                                                                    | Un numéro manquant ne dit ni le ministère, ni l'écran, ni le texte ; la base saute déjà des numéros à chaque saisie refusée ; seuls les lecteurs du journal, avec un accès technique direct, pourraient le voir. Risque accepté par la personne responsable le 7 octobre 2026                                                                                     | Faible                                                                                                                                                                                                                                                                     |
| Recoupement avec une autre information                | Un malaise vu par tous pendant un culte de septembre, puis « Incidents avec intervention : 1 »                                                                            | Le chiffre confirme un fait déjà connu, sans date ni nom ; aucun lien entre totaux ; Sécurité ne compte pas la santé ; lecteurs limités. Même cas que « Petits groupes », accepté le 7 octobre 2026                                                                                                                                                               | Faible                                                                                                                                                                                                                                                                     |
| Textes libres                                         | Un point d'attention de Santé ou de Social qui décrit la situation d'une personne                                                                                         | Rappel sous le premier champ, 280 caractères, relecture et masquage par EJP Tech (motif « Santé ou situation personnelle »), journal sans texte                                                                                                                                                                                                                   | **Moyen** : le texte reste visible jusqu'à sa relecture, et 7 jours dans les sauvegardes après son masquage                                                                                                                                                                |
| Texte « Pourquoi cet indicateur ? »                   | Un ministère justifie sa demande en citant un cas                                                                                                                         | Lu seulement par le ministère et par EJP Tech, jamais dans le journal, la validation par EJP Tech vaut relecture                                                                                                                                                                                                                                                  | Faible à moyen : ce champ n'a pas de rappel (exception voulue, T30)                                                                                                                                                                                                        |
| Mois en cours (moment)                                | Le berger consulte l'indicateur deux fois dans le mois et voit « 0 » puis « 1 » (ou une catégorie, ou une précision qui change) : un cas a eu lieu entre ses deux visites | Seule la dernière valeur saisie (avec ses catégories et sa précision) est montrée aux lecteurs autres que le ministère ; les saisies intermédiaires ne sont pas exposées ; lecteurs limités ; journal sans valeur et sans ligne d'indicateur sensible ; affichage « en cours »                                                                                    | **Faible à moyen** : le fait qu'un cas a eu lieu se déduit, jamais qui ni quel jour. Le ministère peut saisir en une fois, tard dans le mois                                                                                                                               |
| Catégories : cases à 1 ou 2                           | Une catégorie à 1 dans un petit ministère : le lecteur voit la valeur exacte de chaque case et peut rapprocher la catégorie d'une personne qu'il connaît                  | Catégories larges, avec « autre », fixées par la coordination ; lecteurs limités ; plus de seuil ni de masquage (P52)                                                                                                                                                                                                                                             | Faible à moyen. Plus il y a de catégories, plus il y a de cases petites : 3 à 6 au plus                                                                                                                                                                                    |
| Précision : information personnelle écrite par erreur | Un ministère écrit dans la précision le prénom d'une personne, ou la circonstance précise d'un malaise                                                                    | Rappel sous le champ, 280 caractères, familles de texte refusées par la vérification des textes, relecture et masquage par EJP Tech (motif « Santé ou situation personnelle »), lecteurs limités au ministère, au berger, au conseil et à EJP Tech, jamais sur la vue de l'église, jamais dans le journal, ni pour l'administration ni pour les autres ministères | **Moyen à élevé**, le risque le plus fort de cette note : texte libre dans un domaine sensible. Il reste lisible jusqu'à sa relecture, et 7 jours dans les sauvegardes après son masquage. La vérification automatique ne reconnaît pas tout (un prénom seul, par exemple) |
| Précision : détail qui s'ajoute au chiffre            | La précision écrit « 2 malaises cette semaine, dont un pendant le culte » : une date et une circonstance que le chiffre seul ne donne pas                                 | Rappel sous le champ, relecture par EJP Tech, masquage possible                                                                                                                                                                                                                                                                                                   | **Moyen** : aucun contrôle automatique ne comprend le sens d'une phrase. La relecture humaine est la seule parade                                                                                                                                                          |
| Accès par le ministère                                | Une personne qui a quitté le ministère garde l'accès au compte partagé                                                                                                    | Double authentification, procédure de départ, boîte mail au nom de l'église                                                                                                                                                                                                                                                                                       | Faible                                                                                                                                                                                                                                                                     |
| Accès technique                                       | Une personne qui administre la base lit toutes les saisies, y compris les saisies intermédiaires d'un mois                                                                | Export par un script local, jamais dans le navigateur ; jamais de copie vers la préproduction                                                                                                                                                                                                                                                                     | Faible. À compléter par EJP Tech : liste des accès et double authentification sur le tableau de bord                                                                                                                                                                       |
| Export de fin de vie                                  | L'export contient les valeurs exactes                                                                                                                                     | Fait hors de l'outil par la personne responsable, remis à la coordination                                                                                                                                                                                                                                                                                         | Dépend de sa garde. À compléter par la coordination : durée et lieu de conservation                                                                                                                                                                                        |
| Indicateur jugé sensible après coup                   | Un chiffre non marqué sensible se révèle trop précis                                                                                                                      | Retrait pour confidentialité : plus personne ne le lit par l'outil, EJP Tech compris                                                                                                                                                                                                                                                                              | Faible                                                                                                                                                                                                                                                                     |

## 6. Mesures

Ces mesures sont décidées. Elles sont construites et testées à l'étape 4, avant la mise en service :
au 7 octobre 2026, aucune n'est encore en service. Le code déjà fusionné applique encore l'ancienne
règle du seuil « moins de 3 » : il se change par des migrations et des lots neufs (P52), jamais en
rouvrant une migration fusionnée.

**Dans la base de données** (elles ne dépendent pas de l'écran) :

- une case « sensible » sur l'indicateur ; rythme « mois » seulement ;
- **mois en cours accepté**, à l'heure de Paris, affiché « en cours » et hors des sommes ; aux
  lecteurs autres que le ministère, seule la dernière valeur saisie d'un mois est montrée, jamais les
  saisies intermédiaires ;
- lignes brutes lisibles par le seul ministère qui saisit ; le berger, le conseil et EJP Tech lisent
  une vue qui réapplique leurs droits et leur montre les valeurs **exactes** (P52), la dernière
  saisie d'un mois seulement ; l'administration ne reçoit aucune valeur ;
- somme de l'année calculée dans la base, avec sa complétude, mois en cours exclu ;
- **répartition par catégories** : catégories écrites dans la base par une mise à jour d'EJP Tech, à
  partir des listes de la coordination (sans liste, pas de répartition) ; somme des catégories jamais
  au-dessus du total du mois ; reste affiché « non réparti » ; chaque catégorie exacte pour le
  berger, le conseil et EJP Tech ; mêmes lecteurs que la valeur ;
- **texte « Précision »** : ajout seulement, 10 à 280 caractères, familles de texte refusées par la
  vérification des textes de la base, la précision du total le plus récent du mois est celle qui
  s'affiche ; sa propre table avec ses propres règles d'accès (lecteurs : le ministère qui l'a
  écrite, le berger, le conseil et EJP Tech ; ni l'administration de l'église, ni les autres
  ministères) ; la table brute n'est lue que par le ministère et par EJP Tech (pour la relecture) :
  le berger et le conseil lisent une vue qui ne montre que la précision à afficher, jamais les
  précisions remplacées ni leurs dates ; masquage par EJP Tech comme les autres textes, avec sa
  propre ligne de modération ; le journal note la relecture et le masquage, jamais le texte ;
- aucun calcul, aucune série de graphique tirés d'un indicateur sensible ;
- journal sans valeur ni texte, et **sans ligne d'indicateur sensible dans le détail d'une
  saisie** (ni l'indicateur, ni la date du mois, ni la correction), pour qu'il ne donne pas le jour
  où une valeur a changé ; il garde seulement l'heure d'un envoi, sans dire ce qu'il contient s'il
  ne contient que des sensibles ; ajout seulement ; auteur et heure posés par la base ;
- double authentification exigée sur chaque table ;
- retrait pour confidentialité possible, qui ferme la lecture à tous.

**À l'écran** :

- jamais sur la vue de l'église, ni la valeur, ni les catégories, ni la précision ;
- sous le champ « Précision », le rappel : aucun nom ni information personnelle ;
- la confirmation « Vérifiez ce chiffre » ne montre au ministère que ses propres valeurs ;
- l'administration de l'église voit la définition et l'usage, jamais une valeur ; les autres
  ministères ne voient rien.

**Dans l'organisation** :

- relecture des onze définitions par Santé, Social, Kumi, Eagles et Prodiges Junior en
  préproduction, avant la première saisie ;
- listes de catégories fixées par la coordination avant d'activer la répartition d'un indicateur,
  courtes (3 à 6), larges, avec un « autre » ;
- relecture des champs libres par EJP Tech, précisions comprises, à un rythme à fixer avec la
  coordination (par exemple chaque semaine, au moins tant que les premières précisions arrivent) ;
- page « Confidentialité » : une phrase dira que, pour la santé, l'accompagnement, l'écoute et les
  enfants, seuls des totaux, des répartitions par catégories larges et de courtes précisions sans
  information personnelle sont saisis (texte soumis à la coordination) ;
- ce registre et cette note, remis à la coordination avant la mise en service.

**Tests automatiques** (avant chaque mise en ligne) :

- valeur exacte (1 et 2 compris) pour le ministère, le berger, le conseil et EJP Tech ; aucune valeur
  pour l'administration ;
- le mois en cours est accepté et marqué « en cours » ; seule la dernière valeur d'un mois est
  montrée aux lecteurs autres que le ministère ;
- lecture directe des lignes brutes refusée aux autres profils ;
- la somme affichée est la somme exacte des mois écoulés saisis, avec sa complétude ;
- catégories : somme au-dessus du total refusée, « non réparti » juste, chaque catégorie exacte pour
  le berger, le conseil et EJP Tech ;
- journal : après deux saisies du même mois d'un sensible, ni le berger, ni l'administration ne
  lisent la seconde date ni la correction ;
- précision : texte de moins de 10 ou de plus de 280 caractères refusé, famille de texte refusée,
  lecture réservée au ministère auteur, au berger, au conseil et à EJP Tech, refus pour
  l'administration, un autre ministère, un compte sans double authentification et un visiteur non
  connecté ; masquage par EJP Tech ; aucune copie du texte dans le journal ;
- un autre ministère, l'administration, un compte sans double authentification et un visiteur non
  connecté ne reçoivent aucune valeur sensible ;
- un retrait pour confidentialité vide toutes les lectures, EJP Tech compris.

## 7. Décision de la personne responsable

Le 6 octobre 2026, la personne responsable a décidé (P42 de `docs/decisions.md`) :

> À partir du moment où ils sont présents dans les KPI, ils doivent être présents. À nous de prendre
> toute l'ingénierie et les mesures nécessaires pour bien les créer.

Ce que cette décision change :

- les onze indicateurs sensibles sont **créés et actifs dès la vague 1**, comme tous les indicateurs
  demandés par la coordination ;
- il n'y a **aucun verrou d'activation** dans l'outil. La règle précédente, « les indicateurs
  sensibles ne s'activent qu'après la remise du registre » (P35 et K56), est remplacée ;
- **toutes les protections restent** (sections 4 et 6), sauf les règles que les décisions ci-dessous remplacent ;
- ce registre et cette note sont rédigés maintenant et remis à la coordination **avant la mise en
  service**. Ils ne bloquent plus rien techniquement.

Le même jour, après avoir lu le document des libellés, la personne responsable a aussi décidé :

1. **Le mois en cours est accepté.** « Refuser le mois en cours n'a pas de sens et posera problème
   aux équipes. » La règle précédente, « mois écoulés seulement » (P42), est remplacée. La valeur
   du mois en cours s'affiche « en cours », avec les mêmes protections que les autres mois.
2. **Un texte « Précision » est permis.** Il est facultatif, de 10 à 280 caractères, attaché à un
   mois, avec un rappel sur les données personnelles. Le motif : ce peut être des informations
   importantes qui doivent être remontées, bien que sensibles. La règle précédente, « aucun texte
   attaché », est remplacée.
3. **Une répartition par catégories est permise.** La coordination fixe les catégories de chaque
   indicateur. La règle précédente, « aucune ventilation », est remplacée.

Ce que ces trois décisions changent pour l'analyse : l'indicateur sensible n'est plus un simple
nombre. Il porte un moment (le mois en cours), des petites cases (les catégories) et, surtout, un
texte libre. Les sections 4, 5 et 6 sont revues en conséquence.

Le 7 octobre 2026, la personne responsable a décidé par écrit (P52 et T44 à T47 de
`docs/decisions.md`) :

1. **Le berger, le conseil et EJP Tech voient les valeurs exactes.** Elle a lu le texte d'aide du
   champ sensible, qui disait « moins de 3 » à la place de 1 ou 2, et elle l'a refusé : « même d'un
   point de vue conceptuel, le berger et le conseil ont besoin de savoir précisément ce qu'il en est,
   pas d'avoir des éléments approximatifs ! ». Le seuil et le masquage secondaire disparaissent pour
   ces trois profils. **Elle accepte le risque** qu'un chiffre exact permette à l'un d'eux de
   reconnaître une personne dans un très petit groupe. Les autres protections restent : rien pour
   l'administration, les autres ministères et la vue de l'église ; jamais source d'un calcul ;
   journal sans valeur ; seule la dernière saisie d'un mois est montrée.
2. **Le numéro manquant du journal est accepté** (T44, décidé le même jour). Un trou dans les
   numéros ne dit ni le ministère, ni l'écran, ni le texte ; la base saute déjà des numéros à chaque
   saisie refusée ; seuls les lecteurs du journal, avec un accès technique direct, pourraient le voir.
3. **Le berger et le conseil gardent les lignes de relecture et de masquage d'une précision**
   (T45) : elles disent qu'un texte a été relu ou masqué, jamais le texte.
4. **L'heure exacte d'une saisie sensible reste lisible** au journal (T46) : la ligne ne dit ni
   l'indicateur, ni le mois, ni la valeur.
5. **L'administration ne lit plus** les lignes de relecture et de masquage des textes des pages et
   des points (T47), pour la même raison que pour les demandes d'indicateur et les précisions : elle
   ne voit ni les pages des ministères ni les points.

## 8. Avis d'EJP Tech sur une analyse d'impact complète

Une analyse d'impact relative à la protection des données (AIPD) est exigée quand un traitement est
susceptible d'engendrer un risque élevé pour les personnes (article 35). La coordination décide s'il
en faut une.

Avis d'EJP Tech, à confirmer par la coordination :

- **pour les totaux, le mois en cours et les catégories** : jusqu'au 6 octobre 2026, EJP Tech
  jugeait qu'une analyse complète ne paraissait pas nécessaire, car le seuil « moins de 3 » les
  gardait hors du champ des données personnelles. Depuis le 7 octobre 2026, le berger, le conseil et
  EJP Tech voient les valeurs exactes (P52) : dans un très petit groupe, un chiffre peut permettre de
  reconnaître une personne. EJP Tech ne peut plus écrire que ces chiffres ne sont « pas, en pratique,
  des données personnelles » pour ces trois lecteurs. Les protections qui restent (section 4) en
  limitent la portée, mais la question d'une analyse complète se pose maintenant pour les totaux
  aussi, et la coordination la tranche ;
- **pour le texte « Précision »** : la question se pose plus nettement qu'avant. Le texte est libre,
  dans un domaine sensible (santé, écoute, enfants), et une information de santé écrite par erreur
  relèverait des données particulières de l'article 9. Les mesures de la section 6 réduisent ce
  risque sans le supprimer. EJP Tech ne peut pas affirmer qu'aucune information personnelle ne sera
  jamais écrite. La coordination décide si ces mesures suffisent ou si une analyse complète est
  nécessaire avant la mise en service.

En cas de doute, la coordination peut demander l'avis de la CNIL.

## 9. Ce que la coordination est invitée à valider

1. **La présence des onze indicateurs et leurs définitions** (section 1), relues par les cinq
   ministères avant la première saisie.
2. **Les valeurs exactes pour le berger, le conseil et EJP Tech** (P52, décidées par la personne
   responsable le 7 octobre 2026) et le **risque accepté** de reconnaissance dans un très petit
   groupe (sections 4 et 5). Il n'y a plus de seuil. Si la coordination en voulait un, il faudrait
   une décision écrite de la personne responsable et une mise à jour de la base.
3. **Les risques du journal** : numéro manquant (T44), lignes de précision lues par le berger et le
   conseil (T45), heure exacte d'une saisie sensible (T46), administration sans les lignes de
   relecture et de masquage des pages et des points (T47).
4. **Les lecteurs** : le ministère, le berger, le conseil et EJP Tech voient les valeurs exactes ;
   l'administration ne voit aucune valeur ; les autres ministères ne voient rien. Pour la « Précision » : le ministère qui l'a écrite, le berger, le conseil et
   EJP Tech la lisent ; l'administration et les autres ministères ne la lisent pas.
5. **Une analyse d'impact complète, ou non** (section 8), en particulier pour le texte
   « Précision ».
6. **La phrase de la page « Confidentialité »** sur les totaux, les catégories et les précisions
   (section 6).
7. **Le mois en cours** : accepté, affiché « en cours », avec la dernière valeur seulement pour les
   lecteurs autres que le ministère (section 4, raison 2).
8. **Le texte « Précision »** : le principe, les 280 caractères, les lecteurs, la relecture par
   EJP Tech et son rythme (section 6).
9. **Les listes de catégories**, indicateur par indicateur, pour les onze indicateurs : 3 à 6
   catégories larges, jamais assez précises pour désigner une personne, toujours un « autre ». Les
   ministères les proposent dans le document des libellés, la coordination les fixe, EJP Tech les
   écrit dans l'outil. Sans liste, l'indicateur reste un total.
10. **L'absence de masquage des catégories** : depuis P52, chaque catégorie s'affiche exacte à ces
    trois lecteurs, sans suppression secondaire. La consigne de 3 à 6 catégories larges (T42) reste
    appliquée pour la lisibilité ; la coordination peut la rouvrir.
11. **Les listes tenues hors de l'outil** : si des ministères tiennent des listes de bénéficiaires,
    des carnets de soins ou des registres d'enfants, ce sont des traitements de l'église, distincts de
    Pilotage EJP. Ils peuvent demander leur propre fiche au registre et leurs propres protections.
12. **La garde de l'export de fin de vie** : durée de conservation et lieu.
13. **Le registre des traitements** (`docs/conformite/registre-traitements.md`), fiche 2 comprise.

## 10. Quand revoir cette note

- avant la mise en service, après la relecture des définitions en préproduction ;
- un mois après la mise en service, quand les premières valeurs, répartitions et précisions se sont
  affichées et que les premières précisions ont été relues ;
- à chaque nouvel indicateur sensible, à chaque changement d'affichage des valeurs, de lecteurs, de calcul, de
  graphique ou de liste de catégories qui touche ces indicateurs ;
- après tout incident (texte personnel resté visible, accès non autorisé) ;
- proposition d'EJP Tech : au plus tard six mois après la mise en service, puis à l'arrêt de
  l'outil, au moment de l'export final.

## Historique

| Version      | Date           | Auteur   | Changement                                                                                                                                                                                                                         |
| ------------ | -------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 (projet)   | 6 octobre 2026 | EJP Tech | Première rédaction, après la décision de la personne responsable du même jour                                                                                                                                                      |
| 1.1 (projet) | 6 octobre 2026 | EJP Tech | Mois en cours accepté, texte « Précision » et répartition par catégories : analyse, risques, mesures et points à valider revus                                                                                                     |
| 1.2 (projet) | 7 octobre 2026 | EJP Tech | Valeurs exactes pour le berger, le conseil et EJP Tech (P52) : seuil et masquage retirés, risque de reconnaissance dans un petit groupe accepté par la personne responsable, journal (T44 à T47), avis sur l'analyse d'impact revu |

Ce document n'est pas un avis juridique. En cas de doute, demandez conseil à la CNIL ou à un avocat.
