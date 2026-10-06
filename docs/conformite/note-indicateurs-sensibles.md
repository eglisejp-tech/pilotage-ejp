# Note d'analyse : les indicateurs sensibles de Pilotage EJP

- **Version** : 1.1 (projet)
- **Date** : 6 octobre 2026
- **Auteur** : EJP Tech
- **Statut** : Projet à valider par la coordination
- **Pour** : la coordination de l'Église des Jeunes Prodiges
- **Sources** : `docs/conception/vague-1-decisions.md` (K5, K54, K56 et catalogue), `docs/decisions.md`
  (P22, P34, P35, P39, P42), `BRIEF.md` (sections 3 et 7), page « Confidentialité » de l'outil,
  décisions de la personne responsable du 6 octobre 2026 sur le mois en cours, le texte « Précision »
  et la répartition par catégories
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
- Les très petits nombres (1 et 2) s'affichent « moins de 3 » au berger, au conseil et à EJP Tech,
  pour le total comme pour chaque catégorie, sans qu'une différence ne permette de les retrouver.
- Pour ces lecteurs, les totaux et les catégories ne permettent pas, en pratique, de reconnaître une
  personne. Par prudence, l'outil les protège quand même comme s'ils le pouvaient.
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

## 4. Pourquoi les totaux et les catégories ne sont pas, en pratique, des données personnelles

Le RGPD s'applique aux informations sur une personne identifiée ou identifiable (article 4.1). Il ne
s'applique pas aux informations anonymes, c'est-à-dire qui ne permettent plus de reconnaître une
personne par des moyens raisonnables (considérant 26).

Pour le berger, le conseil et EJP Tech, les totaux et les catégories de l'outil ne permettent pas de
reconnaître une personne, pour six raisons. **Le texte « Précision » est à part** : c'est du texte
libre, il est traité à la section 5 et ne bénéficie pas de ces raisons.

1. **Un total, jamais une ligne par personne.** Le chiffre additionne des personnes ou des gestes.
2. **Un mois entier, jamais un jour.** Aucun chiffre ne dit quel jour ni quelle semaine un cas a eu
   lieu. Le mois en cours est accepté : pour qu'une valeur qui monte pendant le mois ne dise pas
   qu'un cas a eu lieu entre deux consultations, les lecteurs autres que le ministère ne voient que
   la dernière valeur saisie, jamais la suite des saisies. Le journal ne garde aucune valeur.
3. **Les très petits nombres sont cachés.** 1 et 2 s'affichent « moins de 3 », pour le total comme
   pour chaque catégorie. 0 reste 0.
4. **Aucune fuite par différence.** La somme de l'année n'additionne que les mois affichés, et le
   dit. Une somme égale à 1 ou 2 s'affiche aussi « moins de 3 ». Pour les catégories, si une seule
   serait retrouvée en retranchant les autres du total, l'outil en cache une de plus. Ce qui n'est
   pas réparti s'affiche « non réparti » et suit la même règle.
5. **Des catégories larges, fixées par la coordination.** Le ministère ne crée aucune catégorie. Les
   listes sont courtes (3 à 6), larges, avec un « autre », et ne désignent jamais une personne.
6. **Des lecteurs limités.** Les lignes brutes ne sont lisibles que par le ministère qui saisit. Les
   autres lecteurs passent par une vue de la base qui applique le seuil : un accès direct à la base,
   sans passer par les écrans, ne la contourne pas. Ces chiffres ne figurent jamais sur la vue de
   l'église ni dans un email, et aucun calcul ni graphique de l'église n'en est tiré.

Exemple de ce que voit le berger pour un indicateur sensible :

| Mois                                | Affiché au berger                               |
| ----------------------------------- | ----------------------------------------------- |
| Octobre (en cours)                  | moins de 3, marqué « en cours »                 |
| Septembre                           | 5                                               |
| Août                                | moins de 3                                      |
| Juillet                             | 0                                               |
| Somme de septembre, août et juillet | Somme des mois affichés : 5, plus 1 mois sous 3 |

Exemple de répartition d'un mois à 9 « Incidents avec intervention » (le ministère en a saisi 9,
dont 4 malaises, 2 blessures, 1 autre ; 2 non répartis) :

| Catégorie   | Valeur saisie | Affiché au berger |
| ----------- | ------------- | ----------------- |
| Malaise     | 4             | masqué            |
| Blessure    | 2             | moins de 3        |
| Autre       | 1             | moins de 3        |
| Non réparti | 2             | moins de 3        |

Dès qu'une case s'affiche « moins de 3 », l'outil masque aussi la plus grande des autres cases
(ici « Malaise »). Sans cela, on retrouverait des valeurs en retranchant du total les cases
montrées : avec un total de 8, « Malaise 4, Blessure 2, Autre 2 » donnerait « 4, moins de 3, moins de
3 », et 8 moins 4 laisse 4, donc 2 et 2. Quand cela ne suffit pas (par exemple quand toutes les
petites cases valent 1 et que la case masquée ne peut pas valoir autre chose que son plus petit
nombre possible), l'outil masque toute la répartition. EJP Tech a vérifié la règle en essayant
toutes les répartitions de 4 à 7 cases, pour les totaux de 3 à 16 : aucune petite case ne se
retrouve par différence.

Une limite : le ministère qui saisit voit ses valeurs exactes. Il connaît déjà les personnes qu'il a
aidées, puisqu'il a fait le compte. L'outil ne lui apprend rien de plus.

## 5. Risques qui restent

Appréciation d'EJP Tech, après les mesures de la section 6.

| Risque                                                | Exemple                                                                                                                                                                            | Ce qui le réduit                                                                                                                                                                                                                                                                                                                                                  | Niveau qui reste                                                                                                                                                                                                                                                           |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Petits groupes                                        | Un mois à 3 ou 4, dans un ministère où le lecteur connaît déjà les personnes venues                                                                                                | Mois entier, seuil, lecteurs limités, aucun détail                                                                                                                                                                                                                                                                                                                | Faible. Un seuil plus haut (5) le réduirait encore                                                                                                                                                                                                                         |
| « Moins de 3 » révèle qu'il y a eu au moins un cas    | Le berger sait qu'en août, au moins une personne a été prise en charge                                                                                                             | Rien n'indique qui, ni quand dans le mois                                                                                                                                                                                                                                                                                                                         | Faible                                                                                                                                                                                                                                                                     |
| Recoupement avec une autre information                | Un malaise vu par tous pendant un culte de septembre, puis « Incidents avec intervention : moins de 3 »                                                                            | Le chiffre n'ajoute rien sur la personne ; aucune date, aucun lien entre totaux ; Sécurité ne compte pas la santé                                                                                                                                                                                                                                                 | Faible                                                                                                                                                                                                                                                                     |
| Textes libres                                         | Un point d'attention de Santé ou de Social qui décrit la situation d'une personne                                                                                                  | Rappel sous le premier champ, 280 caractères, relecture et masquage par EJP Tech (motif « Santé ou situation personnelle »), journal sans texte                                                                                                                                                                                                                   | **Moyen** : le texte reste visible jusqu'à sa relecture, et 7 jours dans les sauvegardes après son masquage                                                                                                                                                                |
| Texte « Pourquoi cet indicateur ? »                   | Un ministère justifie sa demande en citant un cas                                                                                                                                  | Lu seulement par le ministère et par EJP Tech, jamais dans le journal, la validation par EJP Tech vaut relecture                                                                                                                                                                                                                                                  | Faible à moyen : ce champ n'a pas de rappel (exception voulue, T30)                                                                                                                                                                                                        |
| Mois en cours (moment)                                | Le berger consulte l'indicateur deux fois dans le mois et voit « 0 » puis « moins de 3 » (ou une catégorie, ou une précision qui change) : un cas a eu lieu entre ses deux visites | Seule la dernière valeur saisie (avec ses catégories et sa précision) est montrée aux lecteurs autres que le ministère ; les saisies intermédiaires ne sont pas exposées ; seuil ; lecteurs limités ; journal sans valeur et sans ligne d'indicateur sensible ; affichage « en cours »                                                                            | **Faible à moyen** : le fait qu'un cas a eu lieu se déduit, jamais qui ni quel jour. Le ministère peut saisir en une fois, tard dans le mois                                                                                                                               |
| Petites cases des catégories                          | Une catégorie à 3 ou 4 dans un petit ministère, où le lecteur connaît déjà les personnes venues                                                                                    | « Moins de 3 » pour chaque catégorie ; dès qu'une catégorie est « moins de 3 », masquage d'une autre catégorie, ou de toute la répartition si cela ne suffit pas ; catégories larges, avec « autre », fixées par la coordination ; lecteurs limités                                                                                                               | Faible à moyen. Plus il y a de catégories, plus il y a de cases petites : 3 à 6 au plus                                                                                                                                                                                    |
| Précision : information personnelle écrite par erreur | Un ministère écrit dans la précision le prénom d'une personne, ou la circonstance précise d'un malaise                                                                             | Rappel sous le champ, 280 caractères, familles de texte refusées par la vérification des textes, relecture et masquage par EJP Tech (motif « Santé ou situation personnelle »), lecteurs limités au ministère, au berger, au conseil et à EJP Tech, jamais sur la vue de l'église, jamais dans le journal, ni pour l'administration ni pour les autres ministères | **Moyen à élevé**, le risque le plus fort de cette note : texte libre dans un domaine sensible. Il reste lisible jusqu'à sa relecture, et 7 jours dans les sauvegardes après son masquage. La vérification automatique ne reconnaît pas tout (un prénom seul, par exemple) |
| Précision : contournement du seuil                    | La précision écrit « 2 malaises cette semaine » alors que le chiffre s'affiche « moins de 3 »                                                                                      | Rappel sous le champ, relecture par EJP Tech, masquage possible                                                                                                                                                                                                                                                                                                   | **Moyen** : aucun contrôle automatique ne comprend le sens d'une phrase. La relecture humaine est la seule parade                                                                                                                                                          |
| Accès par le ministère                                | Une personne qui a quitté le ministère garde l'accès au compte partagé                                                                                                             | Double authentification, procédure de départ, boîte mail au nom de l'église                                                                                                                                                                                                                                                                                       | Faible                                                                                                                                                                                                                                                                     |
| Accès technique                                       | Une personne qui administre la base lit les valeurs exactes sans le seuil                                                                                                          | Export par un script local, jamais dans le navigateur ; jamais de copie vers la préproduction                                                                                                                                                                                                                                                                     | Faible. À compléter par EJP Tech : liste des accès et double authentification sur le tableau de bord                                                                                                                                                                       |
| Export de fin de vie                                  | L'export contient les valeurs exactes                                                                                                                                              | Fait hors de l'outil par la personne responsable, remis à la coordination                                                                                                                                                                                                                                                                                         | Dépend de sa garde. À compléter par la coordination : durée et lieu de conservation                                                                                                                                                                                        |
| Indicateur jugé sensible après coup                   | Un chiffre non marqué sensible se révèle trop précis                                                                                                                               | Retrait pour confidentialité : plus personne ne le lit par l'outil, EJP Tech compris                                                                                                                                                                                                                                                                              | Faible                                                                                                                                                                                                                                                                     |

## 6. Mesures

Ces mesures sont décidées. Elles sont construites et testées à l'étape 4, avant la mise en service :
au 6 octobre 2026, aucune n'est encore construite.

**Dans la base de données** (elles ne dépendent pas de l'écran) :

- une case « sensible » sur l'indicateur ; rythme « mois » seulement ;
- **mois en cours accepté**, à l'heure de Paris, affiché « en cours » et hors des sommes ; aux
  lecteurs autres que le ministère, seule la dernière valeur saisie d'un mois est montrée, jamais les
  saisies intermédiaires ;
- lignes brutes lisibles par le seul ministère qui saisit ; les autres lisent une vue qui applique le
  seuil et réapplique les droits du lecteur ;
- seuil « moins de 3 » et somme des seuls mois affichés, calculés dans la base ;
- **répartition par catégories** : catégories écrites dans la base par une mise à jour d'EJP Tech, à
  partir des listes de la coordination (sans liste, pas de répartition) ; somme des catégories jamais
  au-dessus du total du mois ; reste affiché « non réparti » ; seuil « moins de 3 » par catégorie ;
  dès qu'une catégorie s'affiche « moins de 3 », masquage d'une autre catégorie (suppression
  secondaire), et de toute la répartition si cela ne suffit pas, pour qu'aucune soustraction du
  total ne redonne un nombre sous 3 ; mêmes lecteurs que la valeur ;
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

- 0 reste 0 ; 1 et 2 masqués au berger, au conseil et à EJP Tech ; valeur exacte pour le ministère ;
- le mois en cours est accepté et marqué « en cours » ; seule la dernière valeur d'un mois est
  montrée aux lecteurs autres que le ministère ;
- lecture directe des lignes brutes refusée aux autres profils ;
- aucune différence entre la somme affichée et la série affichée ne révèle un mois masqué ;
- catégories : somme au-dessus du total refusée, « non réparti » juste, aucune catégorie sous 3
  montrée ; aucune fuite par différence, vérifiée en jouant le lecteur sur toutes les répartitions
  de 4 à 7 cases et les totaux de 3 à 16 (toute case « moins de 3 » garde au moins deux valeurs
  possibles) ;
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
- **toutes les protections restent** (sections 4 et 6), sauf les trois règles que les décisions ci-dessous remplacent ;
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

## 8. Avis d'EJP Tech sur une analyse d'impact complète

Une analyse d'impact relative à la protection des données (AIPD) est exigée quand un traitement est
susceptible d'engendrer un risque élevé pour les personnes (article 35). La coordination décide s'il
en faut une.

Avis d'EJP Tech, à confirmer par la coordination :

- **pour les totaux, le mois en cours et les catégories** : une analyse complète ne paraît pas
  nécessaire, car ils ne portent pas, en pratique, de données personnelles (section 4) ;
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
2. **Le seuil « moins de 3 »**. Un seuil plus haut (par exemple « moins de 5 ») protège davantage
   mais cache plus de mois. Changer le seuil demande une décision écrite et une mise à jour de la
   base.
3. **L'affichage de 0** : 0 reste 0 aujourd'hui. Le regrouper avec 1 et 2 cacherait aussi le fait
   qu'il y a eu au moins un cas, mais rendrait les chiffres moins utiles.
4. **Les lecteurs** : le ministère voit ses valeurs exactes ; le berger, le conseil et EJP Tech
   voient les valeurs avec le seuil ; l'administration ne voit aucune valeur ; les autres ministères
   ne voient rien. Pour la « Précision » : le ministère qui l'a écrite, le berger, le conseil et
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
10. **La règle de masquage des catégories** : « moins de 3 » par catégorie, et une catégorie de plus
    cachée, ou toute la répartition quand cela ne suffit pas, pour qu'une différence ne révèle pas
    un nombre sous 3 (section 4, raison 4).
11. **Les listes tenues hors de l'outil** : si des ministères tiennent des listes de bénéficiaires,
    des carnets de soins ou des registres d'enfants, ce sont des traitements de l'église, distincts de
    Pilotage EJP. Ils peuvent demander leur propre fiche au registre et leurs propres protections.
12. **La garde de l'export de fin de vie** : durée de conservation et lieu.
13. **Le registre des traitements** (`docs/conformite/registre-traitements.md`), fiche 2 comprise.

## 10. Quand revoir cette note

- avant la mise en service, après la relecture des définitions en préproduction ;
- un mois après la mise en service, quand les premières valeurs, répartitions et précisions se sont
  affichées et que les premières précisions ont été relues ;
- à chaque nouvel indicateur sensible, à chaque changement de seuil, de lecteurs, de calcul, de
  graphique ou de liste de catégories qui touche ces indicateurs ;
- après tout incident (texte personnel resté visible, accès non autorisé) ;
- proposition d'EJP Tech : au plus tard six mois après la mise en service, puis à l'arrêt de
  l'outil, au moment de l'export final.

## Historique

| Version      | Date           | Auteur   | Changement                                                                                                                     |
| ------------ | -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1 (projet)   | 6 octobre 2026 | EJP Tech | Première rédaction, après la décision de la personne responsable du même jour                                                  |
| 1.1 (projet) | 6 octobre 2026 | EJP Tech | Mois en cours accepté, texte « Précision » et répartition par catégories : analyse, risques, mesures et points à valider revus |

Ce document n'est pas un avis juridique. En cas de doute, demandez conseil à la CNIL ou à un avocat.
