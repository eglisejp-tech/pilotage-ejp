# Libellés et définitions des indicateurs à valider

- **Date** : 6 octobre 2026
- **Statut** : validé pour EJP Tech par la personne responsable le 6 octobre 2026 ; à valider par la coordination et les ministères avant l'ouverture des saisies
- **Pour qui** : la coordination, qui relit tout, et chaque ministère, qui relit sa section
- **Rédigé par** : EJP Tech
- **Date limite de réponse** : mercredi 7 octobre 2026

## Pour commencer

Pilotage EJP est un outil web pour le berger et le conseil. Chaque ministère y reporte quelques chiffres, au rythme qui lui convient. Ce document liste tous ces chiffres, ministère par ministère, avec leur nom et leur définition. Avant la première saisie, la coordination et chaque ministère vérifient que le nom dit bien ce qu'on compte et que la définition ne se prête pas à deux lectures.

Après la première saisie, un changement de sens passe par un remplacement : l'ancien chiffre est retiré avec le motif « Remplacé », et ses saisies restent lisibles. C'est pourquoi la relecture se fait maintenant.

### Ce qu'est un indicateur

Un indicateur est un chiffre que le ministère reporte (par exemple « Publications »). Il porte :

- un **nom**, tel qu'il apparaîtra à l'écran ;
- une **définition** (« Ce qu'on compte exactement »), affichée sous le champ de saisie ;
- un **rythme** : quand on le saisit ;
- une **unité** : nombre, euros, heure ou jours.

### Les rythmes

| Dans ce document | Ce que cela veut dire                                                                                                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chaque dimanche  | Le chiffre porte sur le dimanche. Du lundi au dimanche 11 h 59, l'outil propose le dimanche précédent ; à partir du dimanche 12 h, il propose ce dimanche (heure de Paris).                               |
| Chaque semaine   | Le chiffre porte sur la semaine du lundi au dimanche. Il se saisit avec le dimanche de cette semaine, séances additionnées.                                                                               |
| Chaque mois      | Le chiffre porte sur un mois. Le mois en cours peut se saisir : il s'affiche à part, marqué « en cours », et n'entre dans aucune somme avant d'être fini. Cela vaut aussi pour les indicateurs sensibles. |
| À ce jour        | Le chiffre le jour de la saisie : un stock (des personnes inscrites, des articles en réserve). L'outil note la date du jour. On le met à jour quand il change.                                            |

Toutes les dates se calculent à l'heure de Paris. Une correction est une nouvelle saisie : la plus récente fait foi, l'ancienne reste dans l'historique.

### Les unités

Les chiffres se saisissent en nombres entiers. L'outil refuse une valeur hors de ces limites.

| Unité        | Ce que c'est                                                   | Valeurs acceptées                       |
| ------------ | -------------------------------------------------------------- | --------------------------------------- |
| Nombre       | Un compte (personnes, événements, projets)                     | 0 à 9 999                               |
| Grand nombre | Un compte qui peut être très grand (vues, portée, spectateurs) | 0 à 9 999 999                           |
| Euros        | Un montant, à l'euro près                                      | 0 à 9 999 999                           |
| Heure        | Une heure de la journée, saisie en heures et minutes           | 0 h 00 à 23 h 59 (affichée « 10 h 42 ») |
| Jours        | Un nombre de jours calendaires                                 | 0 à 99 999                              |

### Les sommes de l'année

Pour la plupart des chiffres du dimanche, de la semaine et du mois, l'outil ajoute seul la somme depuis le 1er janvier (année civile). Elle n'est jamais saisie. Elle part de la période où l'indicateur a été créé, et l'écran nomme toujours ce départ (« Depuis janvier ») avec sa complétude (« 9 mois sur 9 »). Pour quelques chiffres, une somme n'aurait pas de sens (par exemple des personnes comptées une fois dans le mois) : l'outil n'en affiche pas.

### Ce que « calculé par l'outil » veut dire

Un chiffre calculé n'est jamais saisi. L'outil le tire des chiffres saisis par le même ministère (un taux, une moyenne, une différence, une somme, une évolution) ou des événements déclarés dans le calendrier. Dans ce document, ces lignes portent la mention « Rien » dans la colonne « À saisir ».

- **Taux** : un chiffre divisé par un autre, affiché en pourcentage. Sur l'année, l'outil divise la somme des chiffres du haut par la somme des chiffres du bas, sur les périodes où les deux existent. Jamais une moyenne de pourcentages.
- **Plafonné à 100 %** : si le résultat devait dépasser 100 %, l'outil affiche « Non calculé, à vérifier » (décision P49 : jamais un 100 % plafonné) plutôt qu'un pourcentage au-dessus de 100 %. Quatre taux de même nature, ajoutés par EJP Tech (Réalisation des événements, Taux de participation de Kumi et d'Eagles, Taux de présence de Prodiges Junior), suivent la même règle sans que leur définition le dise : 19 parts en tout.
- **Non calculé** : l'outil affiche aussi « Non calculé » quand le chiffre du bas manque ou vaut 0.
- **Rien, affiché plus tard** : le calcul sera visible dans les 4 semaines qui suivent l'ouverture. Les chiffres qui le nourrissent se saisissent dès le premier jour, rien n'est perdu.

### Aucune donnée personnelle

L'outil ne reçoit que des totaux. Aucun nom, aucune liste de personnes, aucun âge, aucun identifiant n'entre jamais, ni dans un chiffre ni dans un texte libre. Chaque définition ci-dessous dit « un total, sans liste » ou « aucun nom » quand le risque existe.

### Les trois chiffres communs

Tous les ministères saisissent les mêmes trois chiffres. L'outil en tire les totaux de l'église, toujours avec leur complétude (« 6 sur 8 »). Un STAR n'est compté qu'une fois : il compte comme « actif » dans un seul ministère, son ministère principal (une convention entre les personnes, que l'outil ne stocke jamais). « STARs au service » compte là où le STAR a servi.

| Chiffre commun   | Quand           | Définition affichée sous le champ                                                               | Unité  | Votre réponse |
| ---------------- | --------------- | ----------------------------------------------------------------------------------------------- | ------ | ------------- |
| STARs au service | Chaque dimanche | Les STARs qui ont servi dans votre ministère ce dimanche. Si personne n'a servi, enregistrez 0. | Nombre |               |
| STARs actifs     | À ce jour       | Comptez chaque STAR dans un seul ministère : son ministère principal.                           | Nombre |               |
| Dont en FIJ      | À ce jour       | Parmi ces STARs actifs, ceux qui participent à une FIJ.                                         | Nombre |               |

L'outil refuse un « Dont en FIJ » supérieur aux « STARs actifs » du même ministère. Le pourcentage de STARs en FIJ se calcule : somme des « Dont en FIJ » divisée par somme des « STARs actifs », sur les ministères qui ont les deux valeurs.

Sur la fiche d'un ministère, un chiffre commun peut porter le nom de la demande de la coordination (par exemple « Équipiers mobilisés » pour « STARs au service » chez MCAD). Chaque section ci-dessous donne ces noms.

### Les indicateurs sensibles

Un indicateur est dit sensible quand il touche à la santé, à l'écoute, à l'accompagnement ou aux enfants. Il est créé et actif dès le premier jour, comme tous les autres : ces chiffres font partie des demandes de la coordination, ils doivent donc être présents. Ce qui change, ce sont les protections :

- **Le mois en cours se saisit** : comme pour tout indicateur du mois, on peut saisir le total du mois en cours. Il s'affiche « en cours » et n'entre dans aucune somme avant la fin du mois. On peut le corriger : seule la dernière saisie du mois est montrée au berger, au conseil et à EJP Tech. Les saisies intermédiaires ne leur sont pas montrées.
- **Un total, et deux ajouts facultatifs** : le total du mois, plus au choix une répartition par catégories et un texte « Précision » (voir plus bas). Aucun calcul n'est fait à partir de ces chiffres.
- **Seuil « moins de 3 »** : pour le berger, le conseil et EJP Tech, une valeur de 1 ou 2 s'affiche « moins de 3 ». 0 reste 0. La somme de l'année ne compte que les mois affichés et le dit, pour qu'aucune différence ne révèle un mois masqué.
- **Lecture réservée** : le ministère voit ses valeurs exactes. Les lignes saisies ne sont lisibles que par lui. Ces chiffres n'apparaissent jamais sur la vue de l'église, ni dans un courriel.
- **Journal sans valeur** : le journal garde la trace qu'une saisie a eu lieu, jamais le chiffre ni le texte.
- **Information des personnes** : avant la mise en service, la page Confidentialité de l'outil dira que, pour la santé, l'accompagnement, l'écoute et les enfants, seuls des totaux, des répartitions par catégories larges et de courtes précisions sont saisis, sans nom ni information personnelle.
- **Dossier de conformité** : EJP Tech rédige l'entrée du registre des traitements et une courte note d'analyse, et les remet à la coordination avant la mise en service. La coordination, qui décide au nom de l'église, dit si une analyse d'impact complète est nécessaire.

La répartition par catégories :

- **Ce que c'est** : pour chaque indicateur sensible, la coordination fixe une courte liste de catégories (par exemple « malaise », « blessure », « autre »). Le ministère répartit son total du mois entre ces catégories. C'est facultatif.
- **Ce que l'outil vérifie** : la somme des catégories ne dépasse jamais le total du mois. Ce qui n'est pas réparti s'affiche « non réparti ».
- **Le seuil s'applique à chaque catégorie** : une catégorie de 1 ou 2 s'affiche « moins de 3 » au berger, au conseil et à EJP Tech.
- **Pas de fuite par calcul** : dès qu'une catégorie s'affiche « moins de 3 », on la retrouverait parfois en retranchant les autres du total. L'outil masque donc aussi une autre catégorie, et toute la répartition si cela ne suffit pas, pour qu'aucun calcul ne révèle un nombre de 1 ou 2. La même règle vaut pour la part « non réparti ». Le ministère, lui, voit toujours ses valeurs exactes.
- **Les catégories ne viennent pas des ministères** : elles s'écrivent dans l'outil à partir des listes de la coordination. Tant qu'une liste n'est pas arrivée, l'indicateur n'a pas de répartition.
- **Qui lit** : les mêmes personnes que pour le chiffre lui-même.

Le texte « Précision » :

- **Ce que c'est** : un court texte facultatif, attaché au total d'un mois, pour dire ce qu'un chiffre seul ne dit pas. Des informations sensibles peuvent être importantes à faire remonter : l'outil l'accepte donc.
- **Les règles** : 10 à 280 caractères. Un rappel sous le champ demande de n'écrire aucun nom ni information personnelle. L'outil refuse un texte qui contient une donnée personnelle qu'il reconnaît, comme un courriel ou un numéro de téléphone. La précision attachée au dernier total envoyé pour le mois est celle qui s'affiche. Quand le ministère corrige le total, le champ reprend la précision actuelle : il peut la changer ou la vider (elle disparaît alors de l'affichage).
- **Qui le lit** : le ministère qui l'a écrit, le berger, le conseil et EJP Tech. Ni l'administration de l'église, ni les autres ministères. Jamais la vue de l'église, jamais un courriel.
- **Relecture** : EJP Tech relit ces textes et peut masquer un texte qui contient une information personnelle. Le journal ne recopie jamais la précision.

Les onze indicateurs sensibles :

| Ministère       | Indicateur                                          |
| --------------- | --------------------------------------------------- |
| Social          | Bénéficiaires (passages)                            |
| Social          | Personnes accompagnées                              |
| Social          | Nouveaux bénéficiaires                              |
| Santé           | Prises en charge                                    |
| Santé           | Interventions                                       |
| Santé           | Incidents avec intervention                         |
| Santé           | Orientations vers une structure ou un professionnel |
| Kumi            | Call your sister : prises en charge                 |
| Eagles          | La plate-forme d'écoute : prises en charge          |
| Prodiges Junior | Nouveaux enfants                                    |
| Prodiges Junior | Enfants déjà venus                                  |

### Les graphiques

Chaque graphique a son équivalent en texte (« Douze derniers mois : 14, 18, ... »). Un mois ou un dimanche sans saisie reste un trou, jamais un zéro. Une période incomplète est marquée d'un cercle vide. Un graphique ne montre jamais un chiffre sensible. Tous s'affichent dans les 4 semaines qui suivent l'ouverture, sur des chiffres saisis dès le premier jour.

### Ce que voit l'administration de l'église

L'administration de l'église voit les définitions et l'usage (par exemple « saisi 4 mois sur 5 »), jamais les valeurs d'un indicateur propre à un ministère. Les montants en euros sont lus par le ministère, le berger, le conseil et EJP Tech.

## Comment répondre

Pour chaque ligne, écrivez dans la colonne « Votre réponse » :

- **OK** si le nom et la définition vous conviennent ;
- ou **le nom ou la définition corrigés**, en écrivant le texte complet que vous voulez ;
- ou **une remarque** : ce qui ne convient pas, ce qui manque, ce qui prête à confusion.

Quelques règles pour écrire un texte corrigé :

- le **nom** compte 60 caractères au plus, sans « Nombre de », sans période ni unité (pas « par mois », pas « en euros ») ;
- la **définition** compte de 10 à 140 caractères ;
- aucune donnée personnelle, aucun nom de personne.

Un ministère relit sa section. La coordination relit toutes les sections et le tableau « Les choix à relire en priorité ». Si un chiffre demandé par votre ministère manque, écrivez-le dans les remarques en bas de votre section.

Renvoyez le document rempli à EJP Tech avant la date limite de réponse (mercredi 7 octobre 2026). EJP Tech corrige les noms et les définitions à l'écran, puis relit le résultat avec vous en préproduction avant d'ouvrir les saisies.

## Catégories des chiffres sensibles, à fixer par la coordination

Chaque indicateur sensible peut recevoir une répartition de son total du mois par catégories (voir « Les indicateurs sensibles » au début du document). Ces catégories ne viennent pas des ministères : la coordination les fixe, en lien avec le ministère concerné. Tant qu'une liste n'est pas arrivée, l'indicateur n'a pas de répartition et se saisit comme un simple total.

Pour chaque indicateur, écrivez dans la colonne « Votre réponse » la liste des catégories que vous voulez, séparées par des virgules, ou « Aucune » si l'indicateur doit rester un simple total. La colonne « Catégories proposées » est vide : EJP Tech ne propose rien, pour ne pas décider à votre place de ce qui compte dans chaque ministère.

| Ministère       | Indicateur                                          | Catégories proposées | Votre réponse |
| --------------- | --------------------------------------------------- | -------------------- | ------------- |
| Social          | Bénéficiaires (passages)                            |                      |               |
| Social          | Personnes accompagnées                              |                      |               |
| Social          | Nouveaux bénéficiaires                              |                      |               |
| Santé           | Prises en charge                                    |                      |               |
| Santé           | Interventions                                       |                      |               |
| Santé           | Incidents avec intervention                         |                      |               |
| Santé           | Orientations vers une structure ou un professionnel |                      |               |
| Kumi            | Call your sister : prises en charge                 |                      |               |
| Eagles          | La plate-forme d'écoute : prises en charge          |                      |               |
| Prodiges Junior | Nouveaux enfants                                    |                      |               |
| Prodiges Junior | Enfants déjà venus                                  |                      |               |

Pour bien choisir les catégories :

- **De 3 à 6 catégories larges.** Plus il y a de catégories, plus les nombres sont petits, et plus l'outil doit les cacher (« moins de 3 »).
- **Jamais une catégorie si précise qu'elle désigne une personne.** Une catégorie doit décrire un type de situation, pas un cas. Si une catégorie ne compte en pratique qu'une personne connue de tous, elle est trop précise.
- **Toujours une catégorie « autre »**, pour que le total puisse toujours être réparti en entier.
- **Aucun nom, aucune tranche d'âge fine, aucun lieu, aucune date.**
- **Des mots simples**, que tous les membres du ministère comprennent de la même façon.
- **Les mêmes catégories d'un mois à l'autre**, pour pouvoir comparer. Changer une liste demande une décision de la coordination et une mise à jour par EJP Tech.

Un exemple, pour « Incidents avec intervention » : malaise, blessure, autre. Ce n'est qu'un exemple, pas une proposition.

## Les choix à relire en priorité

La liste de la coordination ne dit pas tout. EJP Tech a dû trancher les points ci-dessous. Ce sont des choix, pas des faits connus. La coordination et le ministère indiqué dans la colonne « Qui relit » les confirment ou les corrigent.

| Point                                       | Choix d'EJP Tech                                                                                | Qui relit                | Votre réponse |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------ | ------------- |
| NC                                          | nouveaux convertis, exclusif de NA le même dimanche                                             | Intégration              |               |
| Présence au culte                           | l'équipe d'Intégration, donc « STARs au service »                                               | Intégration              |               |
| Taux de perte                               | sans nouvelles après 3 mois                                                                     | Intégration              |               |
| Équipe d'accueil à Welcome Prodiges         | non comptée dans les présents                                                                   | Intégration              |               |
| « À l'heure »                               | 5 minutes au plus après l'heure prévue                                                          | Coordination             |               |
| Délai d'une demande de Communication        | date convenue, sinon 7 jours calendaires                                                        | Communication            |               |
| Incident récurrent                          | même cause dans les 30 jours                                                                    | Tech                     |               |
| Live et diffusion en direct                 | un seul chiffre                                                                                 | MCAD                     |               |
| Spectateurs du direct                       | pic de spectateurs simultanés                                                                   | MCAD                     |               |
| Catégories d'articles                       | vêtements, accessoires, autres articles                                                         | Merch                    |               |
| Catégories de l'équipe                      | chanteurs, musiciens                                                                            | Prodiges Musique         |               |
| Activité et projet                          | ponctuelle ; plusieurs semaines, comptée le mois où elle aboutit                                | Kumi, Eagles             |               |
| Rubriques par département                   | quatre rubriques                                                                                | Coordo FIJ               |               |
| Étapes du parcours                          | nouveaux, réguliers, membres, au service                                                        | Coordo FIJ               |               |
| PCNC, « terminé », réponse satisfaite       | sigle gardé ; deux meilleures notes                                                             | Formation                |               |
| Recrutement abouti                          | intégration dans une équipe, comptée le mois de l'intégration                                   | MDS                      |               |
| Seuil des petits nombres                    | « moins de 3 » pour 1 et 2                                                                      | Coordination             |               |
| Mois en cours des chiffres sensibles        | accepté, affiché « en cours », hors des sommes                                                  | Coordination             |               |
| Précision attachée à un chiffre sensible    | texte facultatif de 10 à 280 caractères, lu par le ministère, le berger, le conseil et EJP Tech | Coordination             |               |
| Catégories des chiffres sensibles           | listes fixées par la coordination (section dédiée)                                              | Coordination             |               |
| Valeurs en euros cachées à l'administration | oui                                                                                             | Coordination             |               |
| Les « mobilisés » du dimanche               | « STARs au service » du ministère                                                               | les dix ministères visés |               |

Les dix ministères visés sont ceux dont la fiche donne à un chiffre commun le nom de leur demande : Intégration, MCAD, Santé, Kumi, Eagles, Entretien, Multilingue, Sécurité, Formation et Prodiges Junior. Chez neuf d'entre eux, c'est « STARs au service » qui porte ce nom (« Équipiers mobilisés », « Animateurs mobilisés »). Kumi renomme aussi « STARs actifs » (« Bénévoles actives »), et Eagles ne renomme que « STARs actifs » (« Bénévoles actifs »). Chaque section donne ces noms.

## 1. Intégration

### Chiffres communs

| Chiffre commun   | Nom affiché sur la fiche | Quand           | Votre réponse |
| ---------------- | ------------------------ | --------------- | ------------- |
| STARs au service | Équipe présente au culte | Chaque dimanche |               |
| STARs actifs     | STARs actifs             | À ce jour       |               |
| Dont en FIJ      | Dont en FIJ              | À ce jour       |               |

### Ce que le ministère saisit

| Indicateur tel qu'il apparaîtra      | Ce qu'on compte exactement                                                                                        | Quand           | Unité  | Sensible | Votre réponse |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | --------------- | ------ | -------- | ------------- |
| Nouveaux arrivants (NA)              | Personnes venues au culte pour la première fois ce dimanche, sans décision ce jour. Une personne compte une fois. | Chaque dimanche | Nombre | non      |               |
| Nouveaux convertis (NC)              | Personnes qui prennent ce dimanche une première décision de suivre le Christ. Une personne est NA ou NC.          | Chaque dimanche | Nombre | non      |               |
| Welcome Prodiges : sessions          | Sessions de Welcome Prodiges tenues dans le mois. Si aucune, enregistrez 0.                                       | Chaque mois     | Nombre | non      |               |
| Welcome Prodiges : présents          | Personnes accueillies présentes aux sessions du mois, séances additionnées. L'équipe d'accueil n'est pas comptée. | Chaque mois     | Nombre | non      |               |
| NA revenus au culte                  | Parmi les NA des dimanches du mois précédent, ceux revenus au moins un dimanche ce mois. Un total, sans liste.    | Chaque mois     | Nombre | non      |               |
| Intégrés en FIJ (NA et NC)           | NA et NC entrés dans une FIJ dans le mois. Une personne compte une fois.                                          | Chaque mois     | Nombre | non      |               |
| Sans nouvelles après 3 mois          | Parmi les NA et NC accueillis il y a 3 mois, ceux dont l'équipe n'a plus de nouvelles. Un total, sans liste.      | Chaque mois     | Nombre | non      |               |
| Présences d'équipiers aux événements | Présences de l'équipe d'Intégration aux événements hors dimanche. Une personne compte à chaque événement.         | Chaque mois     | Nombre | non      |               |

### Ce que l'outil calcule

| Indicateur                              | Comment il se calcule                                                                                                   | À saisir                | Votre réponse |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------- |
| Welcome Prodiges : présents par session | Moyenne du mois : « Welcome Prodiges : présents » divisés par « Welcome Prodiges : sessions ».                          | Rien                    |               |
| Taux de retour des NA                   | « NA revenus au culte » du mois, divisés par la somme des NA des dimanches du mois précédent.                           | Rien, affiché plus tard |               |
| Taux de conversion NA vers FIJ          | « Intégrés en FIJ (NA et NC) » du mois, divisés par la somme des NA et des NC des dimanches du même mois.               | Rien, affiché plus tard |               |
| Taux de perte                           | « Sans nouvelles après 3 mois » d'un mois, divisés par la somme des NA et des NC des dimanches du mois d'il y a 3 mois. | Rien, affiché plus tard |               |

### Graphiques

| N°  | Titre                       | Ce qu'il montre                                                                                       | Forme                        | Période                   | Votre réponse |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------- | ------------- |
| G1  | Évolution NA et NC          | Nouveaux arrivants (NA), Nouveaux convertis (NC)                                                      | courbes                      | Les 26 derniers dimanches |               |
| G2  | Présents à Welcome Prodiges | Welcome Prodiges : présents, sessions, présents par session                                           | barres et courbe superposées | Les 12 derniers mois      |               |
| G3  | Parcours NA, retour, FIJ    | Somme des NA du mois, NA revenus au culte, Intégrés en FIJ (NA et NC) ; les taux sont écrits en texte | totaux côte à côte           | Les 12 derniers mois      |               |

Question de la relecture : la « présence au culte » est celle de l'équipe d'Intégration (« Équipe présente au culte »). Cela vous convient-il ?

**Remarques du ministère :**

## 2. Coordination

### Chiffres communs

| Chiffre commun   | Nom affiché sur la fiche | Quand           | Votre réponse |
| ---------------- | ------------------------ | --------------- | ------------- |
| STARs au service | STARs au service         | Chaque dimanche |               |
| STARs actifs     | STARs actifs             | À ce jour       |               |
| Dont en FIJ      | Dont en FIJ              | À ce jour       |               |

### Ce que le ministère saisit

| Indicateur tel qu'il apparaîtra                  | Ce qu'on compte exactement                                                                                          | Quand           | Unité  | Sensible | Votre réponse |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | --------------- | ------ | -------- | ------------- |
| Baptême : baptisés                               | Personnes baptisées dans le mois, toutes sessions de baptême additionnées.                                          | Chaque mois     | Nombre | non      |               |
| Baptême : sessions                               | Sessions de baptême tenues dans le mois. Si aucune, enregistrez 0.                                                  | Chaque mois     | Nombre | non      |               |
| Baptême : baptisés à la dernière session du mois | Personnes baptisées à la dernière session de baptême du mois. Si aucune session, enregistrez 0.                     | Chaque mois     | Nombre | non      |               |
| Heure de début du culte                          | Heure réelle à laquelle le culte de ce dimanche a commencé.                                                         | Chaque dimanche | Heure  | non      |               |
| Heure prévue du culte                            | Heure de début prévue du culte du dimanche, à la date de la saisie.                                                 | À ce jour       | Heure  | non      |               |
| Événements commencés à l'heure                   | Parmi les événements terminés du mois déclarés dans l'outil, ceux commencés au plus 5 minutes après l'heure prévue. | Chaque mois     | Nombre | non      |               |

### Ce que l'outil calcule

| Indicateur                         | Comment il se calcule                                                                                                                                                                                                           | À saisir                | Votre réponse |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------- |
| Baptême : baptisés par session     | Moyenne du mois : « Baptême : baptisés » divisés par « Baptême : sessions ».                                                                                                                                                    | Rien                    |               |
| Retard du début du culte           | Écart en minutes entre « Heure de début du culte » et l'« Heure prévue du culte » en vigueur ce dimanche. Positif : le culte a commencé en retard. Négatif : il a commencé en avance (« 7 min de retard », « 3 min d'avance »). | Rien, affiché plus tard |               |
| Taux de réalisation des événements | Événements réalisés, divisés par la somme des réalisés, des annulés et des passés sans état final. Calculé sur les mois finis, avec le nombre (« 9 sur 10 »). Les reportés s'affichent à côté, hors du taux.                    | Rien, affiché plus tard |               |
| Part des événements à l'heure      | « Événements commencés à l'heure » divisés par « Événements réalisés (église) » du même mois. Plafonné à 100 %.                                                                                                                 | Rien, affiché plus tard |               |

### Ce que l'outil compte dans les événements

Ces totaux portent sur les événements de toute l'église, par mois, sans titre, sans date d'événement et sans détail par ministère. Ils sont lus par Coordination, le berger, le conseil et EJP Tech seulement. Ils partent de la mise en service : l'écran nomme ce départ (« Depuis la mise en service, le ... ») jusqu'au 1er janvier 2027.

| Indicateur                        | Ce que l'outil compte                                                                                                                                                                                                                                                             | À saisir                | Votre réponse |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------- |
| Événements prévus (église)        | Événements dont le dernier état est « Validé » ou « En préparation », datés d'aujourd'hui ou après. Pour un mois passé : événements datés de ce mois dont l'historique a atteint « Validé ». Les « En attente de validation » se comptent à part ; un brouillon ne compte jamais. | Rien, affiché plus tard |               |
| Événements réalisés (église)      | Événements dont le dernier état est « Terminé » et dont la date tombe dans le mois.                                                                                                                                                                                               | Rien, affiché plus tard |               |
| Événements annulés (église)       | Événements dont le dernier état est « Annulé » et dont la date tombe dans le mois.                                                                                                                                                                                                | Rien, affiché plus tard |               |
| Événements reportés (église)      | Événements dont la date a été repoussée. Un report compte dans le mois de la date quittée ; l'événement compte ensuite comme prévu dans son nouveau mois.                                                                                                                         | Rien, affiché plus tard |               |
| Événements en attente (église)    | Événements dont le dernier état est « En attente de validation ».                                                                                                                                                                                                                 | Rien, affiché plus tard |               |
| Événements passés sans état final | Événements dont la date est passée et dont le dernier état est encore « Validé » ou « En préparation ».                                                                                                                                                                           | Rien, affiché plus tard |               |

### Graphiques

| N°  | Titre                               | Ce qu'il montre                           | Forme           | Période              | Votre réponse |
| --- | ----------------------------------- | ----------------------------------------- | --------------- | -------------------- | ------------- |
| G4  | Prévus, réalisés, annulés, reportés | Quatre comptages d'événements de l'église | barres groupées | Les 12 derniers mois |               |

Question de la relecture : une tolérance de 5 minutes après l'heure prévue, pour dire qu'un événement a commencé « à l'heure », vous convient-elle ?

**Remarques du ministère :**

## 3. Communication

### Chiffres communs

| Chiffre commun   | Nom affiché sur la fiche | Quand           | Votre réponse |
| ---------------- | ------------------------ | --------------- | ------------- |
| STARs au service | STARs au service         | Chaque dimanche |               |
| STARs actifs     | STARs actifs             | À ce jour       |               |
| Dont en FIJ      | Dont en FIJ              | À ce jour       |               |

### Ce que le ministère saisit

| Indicateur tel qu'il apparaîtra   | Ce qu'on compte exactement                                                                                           | Quand       | Unité        | Sensible | Votre réponse |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------- | ------------ | -------- | ------------- |
| Publications                      | Mises en ligne sur un compte de l'église dans le mois. Une publication reprise sur deux plateformes compte une fois. | Chaque mois | Nombre       | non      |               |
| Campagnes terminées               | Ensembles de publications autour d'un thème, comptés le mois où ils se terminent.                                    | Chaque mois | Nombre       | non      |               |
| Contenus produits                 | Visuels, vidéos ou textes créés dans le mois, publiés ou non.                                                        | Chaque mois | Nombre       | non      |               |
| Portée (toutes plateformes)       | Portée du mois relevée sur les statistiques de tous les comptes de l'église, plateformes additionnées.               | Chaque mois | Grand nombre | non      |               |
| Interactions (toutes plateformes) | J'aime, commentaires, partages et enregistrements du mois, relevés sur tous les comptes de l'église.                 | Chaque mois | Grand nombre | non      |               |
| Vues (toutes plateformes)         | Vues du mois relevées sur tous les comptes de l'église, plateformes additionnées.                                    | Chaque mois | Grand nombre | non      |               |
| Abonnés (toutes plateformes)      | Abonnés de tous les comptes de l'église le jour du relevé, plateformes additionnées. Relevé une fois par mois.       | À ce jour   | Grand nombre | non      |               |
| Demandes reçues                   | Demandes de communication reçues des ministères et de l'équipe pastorale dans le mois.                               | Chaque mois | Nombre       | non      |               |
| Demandes traitées                 | Demandes de communication menées à terme dans le mois, quel que soit leur mois d'arrivée.                            | Chaque mois | Nombre       | non      |               |
| Demandes traitées dans les délais | Demandes traitées à la date convenue avec le demandeur, sinon sous 7 jours calendaires.                              | Chaque mois | Nombre       | non      |               |

### Ce que l'outil calcule

| Indicateur                                | Comment il se calcule                                                                                   | À saisir                | Votre réponse |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------- | ------------- |
| Taux d'engagement                         | « Interactions (toutes plateformes) » divisées par « Portée (toutes plateformes) » du même mois.        | Rien                    |               |
| Taux de demandes traitées dans les délais | « Demandes traitées dans les délais » divisées par « Demandes traitées ». Plafonné à 100 %.             | Rien                    |               |
| Évolution des vues                        | Pour « Vues (toutes plateformes) » : écart avec le mois précédent et depuis janvier, en nombre et en %. | Rien, affiché plus tard |               |
| Évolution des abonnés                     | Même écart pour « Abonnés (toutes plateformes) », pris en fin de mois.                                  | Rien, affiché plus tard |               |

### Graphiques

| N°  | Titre                     | Ce qu'il montre                                 | Forme                    | Période              | Votre réponse |
| --- | ------------------------- | ----------------------------------------------- | ------------------------ | -------------------- | ------------- |
| G5  | Contenu produit et portée | Contenus produits ; Portée (toutes plateformes) | deux courbes superposées | Les 12 derniers mois |               |

Question de la relecture : le délai d'une demande est la date convenue avec le demandeur, sinon 7 jours calendaires. Cela vous convient-il ?

**Remarques du ministère :**

## 4. Social

### Chiffres communs

| Chiffre commun   | Nom affiché sur la fiche | Quand           | Votre réponse |
| ---------------- | ------------------------ | --------------- | ------------- |
| STARs au service | STARs au service         | Chaque dimanche |               |
| STARs actifs     | STARs actifs             | À ce jour       |               |
| Dont en FIJ      | Dont en FIJ              | À ce jour       |               |

### Ce que le ministère saisit

Trois de ces indicateurs sont sensibles : voir « Les indicateurs sensibles » au début du document. Ils n'ont aucun calcul.

| Indicateur tel qu'il apparaîtra | Ce qu'on compte exactement                                                                           | Quand       | Unité  | Sensible | Votre réponse |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------- | ------ | -------- | ------------- |
| Actions sociales                | Actions sociales menées et terminées dans le mois.                                                   | Chaque mois | Nombre | non      |               |
| Bénéficiaires (passages)        | Aides apportées dans le mois. Chaque passage compte une fois, même pour une personne déjà aidée.     | Chaque mois | Nombre | oui      |               |
| Personnes accompagnées          | Personnes qui ont eu au moins un entretien de suivi dans le mois. Une personne compte une fois.      | Chaque mois | Nombre | oui      |               |
| Nouveaux bénéficiaires          | Personnes aidées pour la première fois dans le mois. Un total, sans liste.                           | Chaque mois | Nombre | oui      |               |
| Partenariats actifs             | Partenariats en cours avec des structures extérieures, le jour de la saisie.                         | À ce jour   | Nombre | non      |               |
| Actions externes                | Actions menées avec un partenaire extérieur ou chez lui dans le mois.                                | Chaque mois | Nombre | non      |               |
| Fonds levés                     | Fonds levés dans le mois, à l'euro près, sans nom de donateur. La comptabilité de l'église fait foi. | Chaque mois | Euros  | non      |               |

### Ce que l'outil calcule

Aucun calcul pour ce ministère.

**Remarques du ministère :**

## 5. Film

### Chiffres communs

| Chiffre commun   | Nom affiché sur la fiche | Quand           | Votre réponse |
| ---------------- | ------------------------ | --------------- | ------------- |
| STARs au service | STARs au service         | Chaque dimanche |               |
| STARs actifs     | STARs actifs             | À ce jour       |               |
| Dont en FIJ      | Dont en FIJ              | À ce jour       |               |

### Ce que le ministère saisit

| Indicateur tel qu'il apparaîtra          | Ce qu'on compte exactement                                                                                | Quand       | Unité        | Sensible | Votre réponse |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------- | ------------ | -------- | ------------- |
| Tournages                                | Tournages terminés dans le mois.                                                                          | Chaque mois | Nombre       | non      |               |
| Vidéos produites                         | Vidéos montées et terminées dans le mois.                                                                 | Chaque mois | Nombre       | non      |               |
| Vidéos publiées                          | Vidéos de Film mises en ligne dans le mois.                                                               | Chaque mois | Nombre       | non      |               |
| Projets en cours                         | Projets vidéo lancés et pas encore livrés, le jour de la saisie.                                          | À ce jour   | Nombre       | non      |               |
| Projets terminés                         | Projets vidéo livrés dans le mois. Un projet est un film, un clip ou un reportage avec une date convenue. | Chaque mois | Nombre       | non      |               |
| Projets livrés dans les délais           | Projets terminés du mois livrés à la date convenue au lancement, ou avant.                                | Chaque mois | Nombre       | non      |               |
| Vues des vidéos Film                     | Vues du mois des vidéos de Film, relevées sur les statistiques des plateformes où Film publie.            | Chaque mois | Grand nombre | non      |               |
| Jours de production des projets terminés | Somme, pour les projets terminés du mois, des jours calendaires entre lancement et livraison.             | Chaque mois | Jours        | non      |               |

### Ce que l'outil calcule

| Indicateur                        | Comment il se calcule                                                                    | À saisir | Votre réponse |
| --------------------------------- | ---------------------------------------------------------------------------------------- | -------- | ------------- |
| Délai moyen de production         | Moyenne : « Jours de production des projets terminés » divisés par « Projets terminés ». | Rien     |               |
| Taux de livraison dans les délais | « Projets livrés dans les délais » divisés par « Projets terminés ». Plafonné à 100 %.   | Rien     |               |

**Remarques du ministère :**

## 6. Tech

### Chiffres communs

| Chiffre commun   | Nom affiché sur la fiche | Quand           | Votre réponse |
| ---------------- | ------------------------ | --------------- | ------------- |
| STARs au service | STARs au service         | Chaque dimanche |               |
| STARs actifs     | STARs actifs             | À ce jour       |               |
| Dont en FIJ      | Dont en FIJ              | À ce jour       |               |

### Ce que le ministère saisit

| Indicateur tel qu'il apparaîtra           | Ce qu'on compte exactement                                                                                       | Quand       | Unité  | Sensible | Votre réponse |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------- | ------ | -------- | ------------- |
| Demandes reçues                           | Demandes d'aide ou de travail reçues des ministères et de l'équipe dans le mois, sans nom ni objet.              | Chaque mois | Nombre | non      |               |
| Demandes résolues                         | Demandes closes dans le mois, quel que soit leur mois d'arrivée.                                                 | Chaque mois | Nombre | non      |               |
| Demandes en cours                         | Demandes ouvertes, pas encore résolues, le jour de la saisie.                                                    | À ce jour   | Nombre | non      |               |
| Incidents techniques                      | Pannes ou dysfonctionnements des outils numériques de l'église survenus dans le mois.                            | Chaque mois | Nombre | non      |               |
| Incidents récurrents                      | Incidents du mois dont la même cause s'est déjà produite dans les 30 jours avant. Chaque répétition compte.      | Chaque mois | Nombre | non      |               |
| Jours de résolution des demandes résolues | Somme, pour les demandes résolues du mois, des jours calendaires entre réception et résolution (0 le jour même). | Chaque mois | Jours  | non      |               |

### Ce que l'outil calcule

| Indicateur                      | Comment il se calcule                                                                                                               | À saisir | Votre réponse |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------- |
| Temps moyen de résolution       | Moyenne : « Jours de résolution des demandes résolues » divisés par « Demandes résolues ».                                          | Rien     |               |
| Taux de résolution des demandes | « Demandes résolues » divisées par « Demandes reçues ». Peut dépasser 100 % (des demandes d'un mois précédent peuvent être closes). | Rien     |               |

### Graphiques

| N°  | Titre                 | Ce qu'il montre                                          | Forme   | Période              | Votre réponse |
| --- | --------------------- | -------------------------------------------------------- | ------- | -------------------- | ------------- |
| G6  | Demandes et incidents | Demandes reçues, Demandes résolues, Incidents techniques | courbes | Les 12 derniers mois |               |

Question de la relecture : un incident est « récurrent » quand la même cause s'est déjà produite dans les 30 jours avant. Cela vous convient-il ?

**Remarques du ministère :**

## 7. MCAD

### Chiffres communs

| Chiffre commun   | Nom affiché sur la fiche | Quand           | Votre réponse |
| ---------------- | ------------------------ | --------------- | ------------- |
| STARs au service | Équipiers mobilisés      | Chaque dimanche |               |
| STARs actifs     | STARs actifs             | À ce jour       |               |
| Dont en FIJ      | Dont en FIJ              | À ce jour       |               |

### Ce que le ministère saisit

| Indicateur tel qu'il apparaîtra | Ce qu'on compte exactement                                                                                       | Quand           | Unité        | Sensible | Votre réponse |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------- | ------------ | -------- | ------------- |
| Événements couverts             | Événements filmés ou diffusés par MCAD dans le mois, cultes compris.                                             | Chaque mois     | Nombre       | non      |               |
| Événements à couvrir            | Événements pour lesquels une captation ou une diffusion a été demandée à MCAD dans le mois, couverts ou non.     | Chaque mois     | Nombre       | non      |               |
| Cultes captés                   | Cultes filmés ce dimanche. Si aucun, enregistrez 0.                                                              | Chaque dimanche | Nombre       | non      |               |
| Diffusions en direct            | Cultes et événements diffusés en direct dans le mois, toutes plateformes. Les « lives » comptent ici.            | Chaque mois     | Nombre       | non      |               |
| Contenus audiovisuels produits  | Vidéos, replays et extraits terminés dans le mois.                                                               | Chaque mois     | Nombre       | non      |               |
| Plateformes de diffusion        | Plateformes où MCAD diffuse le jour de la saisie (par exemple YouTube, Instagram).                               | À ce jour       | Nombre       | non      |               |
| Pic de spectateurs du direct    | Plus grand nombre de spectateurs connectés en même temps au direct du culte de ce dimanche.                      | Chaque dimanche | Grand nombre | non      |               |
| Vues des diffusions MCAD        | Vues du mois des directs et replays de MCAD, relevées sur les statistiques des plateformes.                      | Chaque mois     | Grand nombre | non      |               |
| Problèmes audio                 | Problèmes de son pendant une captation ou un direct du mois, sans coupure du direct.                             | Chaque mois     | Nombre       | non      |               |
| Problèmes vidéo                 | Problèmes d'image pendant une captation ou un direct du mois, sans coupure du direct.                            | Chaque mois     | Nombre       | non      |               |
| Interruptions de diffusion      | Coupures d'un direct dans le mois, quelle qu'en soit la cause. Une coupure ne compte pas en audio ou vidéo.      | Chaque mois     | Nombre       | non      |               |
| Mobilisés aux événements        | Présences d'équipiers de MCAD aux événements hors dimanche. Une personne compte à chaque événement où elle sert. | Chaque mois     | Nombre       | non      |               |
| Personnes formées               | Équipiers qui ont suivi une formation de MCAD dans le mois, sans liste.                                          | Chaque mois     | Nombre       | non      |               |
| Nouveaux équipiers intégrés     | Personnes entrées dans l'équipe de MCAD dans le mois.                                                            | Chaque mois     | Nombre       | non      |               |
| Postes d'équipe prévus          | Postes d'équipe prévus au planning du mois, dimanches et événements additionnés.                                 | Chaque mois     | Nombre       | non      |               |
| Postes d'équipe tenus           | Postes du planning du mois effectivement tenus par un équipier.                                                  | Chaque mois     | Nombre       | non      |               |

### Ce que l'outil calcule

| Indicateur                        | Comment il se calcule                                                                                                                                                                              | À saisir                | Votre réponse |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------- |
| Taux de couverture des événements | « Événements couverts » divisés par « Événements à couvrir ». Plafonné à 100 %.                                                                                                                    | Rien                    |               |
| Vues par événement couvert        | Moyenne : « Vues des diffusions MCAD » divisées par « Événements couverts ».                                                                                                                       | Rien                    |               |
| Taux de présence des équipiers    | « Postes d'équipe tenus » divisés par « Postes d'équipe prévus ». Plafonné à 100 %.                                                                                                                | Rien                    |               |
| Évolution de l'audience           | Écart entre le « Pic de spectateurs du direct » de ce dimanche et celui du dimanche précédent, seulement si ce dernier est saisi. Sinon, la ligne dit par exemple « dimanche 20 sept. non saisi ». | Rien, affiché plus tard |               |
| Incidents techniques              | Somme : « Problèmes audio » + « Problèmes vidéo » + « Interruptions de diffusion ». Un incident compte dans une seule catégorie.                                                                   | Rien, affiché plus tard |               |

Question de la relecture : MCAD distingue-t-elle les « lives » et les « diffusions en direct » ? Aujourd'hui, un seul chiffre « Diffusions en direct » sert les deux mots. Si MCAD les distingue, deux indicateurs sont créés avant la première saisie.

**Remarques du ministère :**

## 8. MPI

### Chiffres communs

| Chiffre commun   | Nom affiché sur la fiche | Quand           | Votre réponse |
| ---------------- | ------------------------ | --------------- | ------------- |
| STARs au service | STARs au service         | Chaque dimanche |               |
| STARs actifs     | STARs actifs             | À ce jour       |               |
| Dont en FIJ      | Dont en FIJ              | À ce jour       |               |

### Ce que le ministère saisit

| Indicateur tel qu'il apparaîtra          | Ce qu'on compte exactement                                                                              | Quand                                       | Unité  | Sensible | Votre réponse |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------ | -------- | ------------- |
| Prière des Stars : sessions              | Prières des Stars tenues dans la semaine du lundi au dimanche. Si aucune, enregistrez 0.                | Chaque semaine                              | Nombre | non      |               |
| Prière des Stars : présents              | Présences aux Prières des Stars de la semaine, séances additionnées. Aucun nom.                         | Chaque semaine                              | Nombre | non      |               |
| Prière des Stars : attendus              | Personnes attendues aux Prières des Stars de la semaine (inscrites ou prévues), séances additionnées.   | Chaque semaine                              | Nombre | non      |               |
| Chaîne de prière : présents              | Personnes présentes à la chaîne de prière du dimanche, comptées une fois chacune.                       | Chaque dimanche                             | Nombre | non      |               |
| Chaîne de prière : présents la nuit      | Personnes présentes à la chaîne de prière la nuit du samedi au dimanche. À saisir le dimanche matin.    | Chaque dimanche, à saisir le dimanche matin | Nombre | non      |               |
| Chaîne de prière : attendus              | Personnes prévues au planning de la chaîne de prière du dimanche.                                       | Chaque dimanche                             | Nombre | non      |               |
| Chaîne de prière : personnes différentes | Personnes différentes venues à la chaîne de prière dans le mois, comptées hors outil, sans nom.         | Chaque mois                                 | Nombre | non      |               |
| Sainte cène : personnes dans l'équipe    | Personnes de l'équipe sainte cène le jour de la saisie.                                                 | À ce jour                                   | Nombre | non      |               |
| Sainte cène : portions distribuées       | Portions de sainte cène distribuées au culte de ce dimanche. On compte des portions, pas des personnes. | Chaque dimanche                             | Nombre | non      |               |

### Ce que l'outil calcule

| Indicateur                               | Comment il se calcule                                                                          | À saisir | Votre réponse |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- | -------- | ------------- |
| Prière des Stars : présents par session  | Moyenne : « Prière des Stars : présents » divisés par « Prière des Stars : sessions ».         | Rien     |               |
| Prière des Stars : taux de participation | « Prière des Stars : présents » divisés par « Prière des Stars : attendus ». Plafonné à 100 %. | Rien     |               |
| Chaîne de prière : taux de participation | « Chaîne de prière : présents » divisés par « Chaîne de prière : attendus ». Plafonné à 100 %. | Rien     |               |

### Graphiques

| N°  | Titre                                           | Ce qu'il montre                                                              | Forme   | Période                   | Votre réponse |
| --- | ----------------------------------------------- | ---------------------------------------------------------------------------- | ------- | ------------------------- | ------------- |
| G7  | Participation à la prière semaine après semaine | Prière des Stars : présents ; Chaîne de prière : présents ; présents la nuit | courbes | Les 12 dernières semaines |               |

**Remarques du ministère :**

## 9. Santé

### Chiffres communs

| Chiffre commun   | Nom affiché sur la fiche | Quand           | Votre réponse |
| ---------------- | ------------------------ | --------------- | ------------- |
| STARs au service | Personnes mobilisées     | Chaque dimanche |               |
| STARs actifs     | STARs actifs             | À ce jour       |               |
| Dont en FIJ      | Dont en FIJ              | À ce jour       |               |

### Ce que le ministère saisit

Quatre de ces indicateurs sont sensibles : voir « Les indicateurs sensibles » au début du document. Aucun détail médical individuel n'apparaît dans l'outil : seulement des totaux par mois (le mois en cours compris), une répartition facultative par catégories et une précision facultative, avec le seuil « moins de 3 », jamais sur la vue de l'église ni dans un courriel.

| Indicateur tel qu'il apparaîtra                     | Ce qu'on compte exactement                                                                                     | Quand       | Unité  | Sensible | Votre réponse |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------- | ------ | -------- | ------------- |
| Événements couverts                                 | Événements EJP où l'équipe santé a assuré sa présence dans le mois, cultes compris.                            | Chaque mois | Nombre | non      |               |
| Événements à couvrir                                | Événements EJP où l'équipe santé devait être présente dans le mois, couverts ou non.                           | Chaque mois | Nombre | non      |               |
| Prises en charge                                    | Personnes prises en charge par l'équipe santé dans le mois, une fois chacune. Aucun détail.                    | Chaque mois | Nombre | oui      |               |
| Interventions                                       | Gestes de l'équipe (soin, appel aux secours) dans le mois. Une prise en charge peut en compter plusieurs.      | Chaque mois | Nombre | oui      |               |
| Incidents avec intervention                         | Incidents (malaise, chute, accident) du mois qui ont demandé l'équipe santé ou les secours.                    | Chaque mois | Nombre | oui      |               |
| Orientations vers une structure ou un professionnel | Personnes orientées vers une structure de santé ou un professionnel dans le mois.                              | Chaque mois | Nombre | oui      |               |
| Mobilisés aux événements                            | Présences de l'équipe santé aux événements hors dimanche. Une personne compte à chaque événement où elle sert. | Chaque mois | Nombre | non      |               |

### Ce que l'outil calcule

| Indicateur                        | Comment il se calcule                                                           | À saisir | Votre réponse |
| --------------------------------- | ------------------------------------------------------------------------------- | -------- | ------------- |
| Taux de couverture des événements | « Événements couverts » divisés par « Événements à couvrir ». Plafonné à 100 %. | Rien     |               |

**Remarques du ministère :**

## 10. Merch

### Chiffres communs

| Chiffre commun   | Nom affiché sur la fiche | Quand           | Votre réponse |
| ---------------- | ------------------------ | --------------- | ------------- |
| STARs au service | STARs au service         | Chaque dimanche |               |
| STARs actifs     | STARs actifs             | À ce jour       |               |
| Dont en FIJ      | Dont en FIJ              | À ce jour       |               |

### Ce que le ministère saisit

| Indicateur tel qu'il apparaîtra   | Ce qu'on compte exactement                                                                                | Quand       | Unité  | Sensible | Votre réponse |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------- | ------ | -------- | ------------- |
| Chiffre d'affaires                | Montant des ventes du mois, à l'euro près, tous lieux confondus. La comptabilité de l'église fait foi.    | Chaque mois | Euros  | non      |               |
| Articles vendus                   | Articles vendus dans le mois, au culte, aux événements et ailleurs, toutes tailles confondues.            | Chaque mois | Nombre | non      |               |
| Commandes                         | Ventes enregistrées dans le mois. Une vente compte pour une commande, quel que soit le nombre d'articles. | Chaque mois | Nombre | non      |               |
| Articles vendus : vêtements       | Vêtements vendus dans le mois. Ils sont aussi comptés dans « Articles vendus ».                           | Chaque mois | Nombre | non      |               |
| Articles vendus : accessoires     | Accessoires vendus dans le mois. Ils sont aussi comptés dans « Articles vendus ».                         | Chaque mois | Nombre | non      |               |
| Articles vendus : autres articles | Autres articles vendus dans le mois. Ils sont aussi comptés dans « Articles vendus ».                     | Chaque mois | Nombre | non      |               |
| Coût d'achat des articles vendus  | Prix d'achat ou de fabrication des articles vendus dans le mois, à l'euro près.                           | Chaque mois | Euros  | non      |               |
| Stock disponible                  | Articles du merch en réserve le jour de la saisie, toutes tailles confondues.                             | À ce jour   | Nombre | non      |               |
| Produits en stock critique        | Produits dont le stock est sous le seuil de réassort fixé par Merch, le jour de la saisie.                | À ce jour   | Nombre | non      |               |

### Ce que l'outil calcule

| Indicateur           | Comment il se calcule                                                                                                                     | À saisir                | Votre réponse |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------- |
| Panier moyen         | Moyenne : « Chiffre d'affaires » divisé par « Commandes », en euros, avec une décimale.                                                   | Rien                    |               |
| Marge estimée        | « Chiffre d'affaires » moins « Coût d'achat des articles vendus ». Elle est « estimée » parce que les frais généraux ne sont pas comptés. | Rien, affiché plus tard |               |
| Évolution des ventes | Pour « Chiffre d'affaires » : écart avec le mois précédent et depuis janvier, en euros et en %.                                           | Rien, affiché plus tard |               |

### Graphiques

| N°  | Titre                    | Ce qu'il montre                                                                   | Forme                    | Période                | Votre réponse |
| --- | ------------------------ | --------------------------------------------------------------------------------- | ------------------------ | ---------------------- | ------------- |
| G8  | Évolution des ventes     | Chiffre d'affaires (euros) ; Articles vendus                                      | deux courbes superposées | Les 12 derniers mois   |               |
| G9  | Articles les plus vendus | Articles vendus : vêtements, accessoires, autres articles, du dernier mois écoulé | barres triées            | Le dernier mois écoulé |               |

Question de la relecture : les trois catégories d'articles sont vêtements, accessoires et autres articles. Cela vous convient-il ?

**Remarques du ministère :**

## 11. Production

### Chiffres communs

| Chiffre commun   | Nom affiché sur la fiche | Quand           | Votre réponse |
| ---------------- | ------------------------ | --------------- | ------------- |
| STARs au service | STARs au service         | Chaque dimanche |               |
| STARs actifs     | STARs actifs             | À ce jour       |               |
| Dont en FIJ      | Dont en FIJ              | À ce jour       |               |

### Ce que le ministère saisit

| Indicateur tel qu'il apparaîtra | Ce qu'on compte exactement                                                                                    | Quand          | Unité  | Sensible | Votre réponse |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------- | ------ | -------- | ------------- |
| Événements couverts             | Événements EJP couverts par Production dans le mois : cultes, veillées, baptêmes, camps, conférence.          | Chaque mois    | Nombre | non      |               |
| Mag : projets produits          | Magazines produits dans la semaine du lundi au dimanche. Si aucun, enregistrez 0.                             | Chaque semaine | Nombre | non      |               |
| Photo : projets produits        | Projets photo produits dans la semaine du lundi au dimanche. Si aucun, enregistrez 0.                         | Chaque semaine | Nombre | non      |               |
| Projets en cours                | Projets de production en cours le jour de la saisie, formations comprises.                                    | À ce jour      | Nombre | non      |               |
| Projets annulés                 | Projets de production annulés dans le mois.                                                                   | Chaque mois    | Nombre | non      |               |
| Budget matériel prévu           | Budget prévu pour le matériel de Production, à l'euro près, le jour de la saisie. Première valeur : le devis. | À ce jour      | Euros  | non      |               |
| Personnes formées (total)       | Personnes formées par Production depuis ses premières formations, le jour de la saisie.                       | À ce jour      | Nombre | non      |               |

Valeurs de départ, saisies à la mise en service : Budget matériel prévu 5 164 €, Personnes formées (total) 25, Projets annulés de mars 2026 : 1. Un point d'attention de départ porte sur la location de matériel.

### Ce que l'outil calcule

Aucun calcul pour ce ministère.

Question de la relecture : les valeurs de départ ci-dessus sont-elles les bonnes ?

**Remarques du ministère :**

## 12. Prodiges Musique

### Chiffres communs

| Chiffre commun   | Nom affiché sur la fiche | Quand           | Votre réponse |
| ---------------- | ------------------------ | --------------- | ------------- |
| STARs au service | STARs au service         | Chaque dimanche |               |
| STARs actifs     | STARs actifs             | À ce jour       |               |
| Dont en FIJ      | Dont en FIJ              | À ce jour       |               |

### Ce que le ministère saisit

| Indicateur tel qu'il apparaîtra | Ce qu'on compte exactement                                                                     | Quand          | Unité  | Sensible | Votre réponse |
| ------------------------------- | ---------------------------------------------------------------------------------------------- | -------------- | ------ | -------- | ------------- |
| Chanteurs de l'équipe           | Chanteurs et choristes de l'équipe le jour de la saisie.                                       | À ce jour      | Nombre | non      |               |
| Musiciens de l'équipe           | Instrumentistes de l'équipe le jour de la saisie.                                              | À ce jour      | Nombre | non      |               |
| Morceaux préparés               | Morceaux préparés par l'équipe dans le mois pour le culte ou un événement.                     | Chaque mois    | Nombre | non      |               |
| Morceaux originaux réalisés     | Morceaux originaux de Prodiges Musique terminés dans le mois.                                  | Chaque mois    | Nombre | non      |               |
| Répétitions : présents          | Présences aux répétitions de la semaine du lundi au dimanche, séances additionnées. Aucun nom. | Chaque semaine | Nombre | non      |               |
| Répétitions : attendus          | Présences attendues aux répétitions de la semaine, séances additionnées, selon le planning.    | Chaque semaine | Nombre | non      |               |

### Ce que l'outil calcule

| Indicateur                     | Comment il se calcule                                                                | À saisir | Votre réponse |
| ------------------------------ | ------------------------------------------------------------------------------------ | -------- | ------------- |
| Répétitions : taux de présence | « Répétitions : présents » divisés par « Répétitions : attendus ». Plafonné à 100 %. | Rien     |               |

### Graphiques

| N°  | Titre                            | Ce qu'il montre                | Forme  | Période                   | Votre réponse |
| --- | -------------------------------- | ------------------------------ | ------ | ------------------------- | ------------- |
| G10 | Taux de présence aux répétitions | Répétitions : taux de présence | courbe | Les 12 dernières semaines |               |

Question de la relecture : l'équipe se compte en deux catégories, chanteurs et musiciens. Cela vous convient-il ?

**Remarques du ministère :**

## 13. Kumi

### Chiffres communs

| Chiffre commun   | Nom affiché sur la fiche | Quand           | Votre réponse |
| ---------------- | ------------------------ | --------------- | ------------- |
| STARs au service | Femmes mobilisées        | Chaque dimanche |               |
| STARs actifs     | Bénévoles actives        | À ce jour       |               |
| Dont en FIJ      | Dont en FIJ              | À ce jour       |               |

### Ce que le ministère saisit

Un de ces indicateurs est sensible : voir « Les indicateurs sensibles » au début du document.

| Indicateur tel qu'il apparaîtra            | Ce qu'on compte exactement                                                                               | Quand       | Unité  | Sensible | Votre réponse |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ----------- | ------ | -------- | ------------- |
| Activités réalisées                        | Activités ponctuelles tenues dans le mois (atelier, rencontre, sortie), une fois chacune.                | Chaque mois | Nombre | non      |               |
| Participantes                              | Femmes venues à au moins une activité dans le mois, comptées une fois, hors outil.                       | Chaque mois | Nombre | non      |               |
| Nouvelles participantes                    | Femmes venues à une activité pour la première fois dans le mois. Un total, sans liste.                   | Chaque mois | Nombre | non      |               |
| Projets réalisés                           | Projets de plusieurs semaines menés à terme dans le mois.                                                | Chaque mois | Nombre | non      |               |
| Femmes inscrites                           | Femmes inscrites aux activités de Kumi le jour de la saisie.                                             | À ce jour   | Nombre | non      |               |
| Nouvelles intégrations dans les équipes    | Personnes qui ont rejoint une équipe de Kumi dans le mois. Différent des nouveaux STARs comptés par MDS. | Chaque mois | Nombre | non      |               |
| Pages Roses : prestataires inscrites       | Prestataires inscrites sur Pages Roses le jour du relevé, selon la plateforme. Relevé une fois par mois. | À ce jour   | Nombre | non      |               |
| Pages Roses : profils actifs               | Profils que Pages Roses compte comme actifs le jour du relevé. Relevé une fois par mois.                 | À ce jour   | Nombre | non      |               |
| Pages Roses : demandes de mise en relation | Demandes de mise en relation reçues sur Pages Roses dans le mois, selon la plateforme.                   | Chaque mois | Nombre | non      |               |
| Pages Roses : réservations                 | Réservations enregistrées sur Pages Roses dans le mois, selon la plateforme.                             | Chaque mois | Nombre | non      |               |
| Call your sister : prises en charge        | Prises en charge de Call your sister dans le mois. Aucun détail.                                         | Chaque mois | Nombre | oui      |               |

### Ce que l'outil calcule

| Indicateur            | Comment il se calcule                                                            | À saisir | Votre réponse |
| --------------------- | -------------------------------------------------------------------------------- | -------- | ------------- |
| Taux de participation | « Participantes » divisées par « Femmes inscrites » en vigueur à la fin du mois. | Rien     |               |

Question de la relecture : une activité est ponctuelle (atelier, rencontre, sortie) ; un projet dure plusieurs semaines et se compte le mois où il aboutit. Ces définitions vous conviennent-elles ?

**Remarques du ministère :**

## 14. Eagles

### Chiffres communs

| Chiffre commun   | Nom affiché sur la fiche | Quand           | Votre réponse |
| ---------------- | ------------------------ | --------------- | ------------- |
| STARs au service | STARs au service         | Chaque dimanche |               |
| STARs actifs     | Bénévoles actifs         | À ce jour       |               |
| Dont en FIJ      | Dont en FIJ              | À ce jour       |               |

### Ce que le ministère saisit

Un de ces indicateurs est sensible : voir « Les indicateurs sensibles » au début du document.

| Indicateur tel qu'il apparaîtra            | Ce qu'on compte exactement                                                                                | Quand       | Unité  | Sensible | Votre réponse |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ----------- | ------ | -------- | ------------- |
| Activités réalisées                        | Activités ponctuelles tenues dans le mois (atelier, rencontre, sortie), une fois chacune.                 | Chaque mois | Nombre | non      |               |
| Participants                               | Personnes venues à au moins une activité dans le mois, comptées une fois, hors outil.                     | Chaque mois | Nombre | non      |               |
| Nouveaux participants                      | Personnes venues à une activité pour la première fois dans le mois. Un total, sans liste.                 | Chaque mois | Nombre | non      |               |
| Projets réalisés                           | Projets de plusieurs semaines menés à terme dans le mois.                                                 | Chaque mois | Nombre | non      |               |
| Inscrits                                   | Personnes inscrites aux activités d'Eagles le jour de la saisie.                                          | À ce jour   | Nombre | non      |               |
| Nouvelles intégrations dans les équipes    | Personnes qui ont rejoint une équipe d'Eagles dans le mois. Différent des nouveaux STARs comptés par MDS. | Chaque mois | Nombre | non      |               |
| La plate-forme d'écoute : prises en charge | Prises en charge de la plate-forme d'écoute dans le mois. Aucun détail.                                   | Chaque mois | Nombre | oui      |               |

### Ce que l'outil calcule

| Indicateur            | Comment il se calcule                                                  | À saisir | Votre réponse |
| --------------------- | ---------------------------------------------------------------------- | -------- | ------------- |
| Taux de participation | « Participants » divisés par « Inscrits » en vigueur à la fin du mois. | Rien     |               |

Question de la relecture : une activité est ponctuelle (atelier, rencontre, sortie) ; un projet dure plusieurs semaines et se compte le mois où il aboutit. Ces définitions vous conviennent-elles ?

**Remarques du ministère :**

## 15. Entretien

### Chiffres communs

| Chiffre commun   | Nom affiché sur la fiche     | Quand           | Votre réponse |
| ---------------- | ---------------------------- | --------------- | ------------- |
| STARs au service | Personnes actives mobilisées | Chaque dimanche |               |
| STARs actifs     | STARs actifs                 | À ce jour       |               |
| Dont en FIJ      | Dont en FIJ                  | À ce jour       |               |

### Ce que le ministère saisit

| Indicateur tel qu'il apparaîtra          | Ce qu'on compte exactement                                                                               | Quand       | Unité  | Sensible | Votre réponse |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------- | ------ | -------- | ------------- |
| Problèmes signalés                       | Problèmes d'entretien signalés dans le mois (locaux, matériel, propreté).                                | Chaque mois | Nombre | non      |               |
| Problèmes résolus                        | Problèmes d'entretien réglés dans le mois, quel que soit le mois du signalement.                         | Chaque mois | Nombre | non      |               |
| Jours pour résoudre les problèmes        | Somme, pour les problèmes résolus du mois, des jours calendaires entre signalement et résolution.        | Chaque mois | Jours  | non      |               |
| Tâches réalisées                         | Tâches d'entretien terminées dans le mois (nettoyage, rangement, réparation).                            | Chaque mois | Nombre | non      |               |
| Produits d'entretien manquants           | Types de produits d'entretien à racheter le jour de la saisie. Le détail passe par un point d'attention. | À ce jour   | Nombre | non      |               |
| Équipements manquants                    | Types d'équipements manquants le jour de la saisie. Le détail passe par un point d'attention.            | À ce jour   | Nombre | non      |               |
| Problèmes en attente                     | Problèmes d'entretien signalés et pas encore résolus, le jour de la saisie.                              | À ce jour   | Nombre | non      |               |
| Jours d'attente des problèmes en attente | Somme, pour les problèmes en attente le jour de la saisie, des jours écoulés depuis leur signalement.    | À ce jour   | Jours  | non      |               |

Un point d'attention de départ porte sur les besoins en matériels : le détail des produits et des équipements manquants s'y écrit, sans donnée personnelle.

### Ce que l'outil calcule

| Indicateur                | Comment il se calcule                                                                                                                                    | À saisir | Votre réponse |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------- |
| Délai moyen de résolution | Moyenne : « Jours pour résoudre les problèmes » divisés par « Problèmes résolus ».                                                                       | Rien     |               |
| Délai d'attente moyen     | Moyenne : « Jours d'attente des problèmes en attente » divisés par « Problèmes en attente ». Résultat du jour, affiché avec les dates des deux chiffres. | Rien     |               |

**Remarques du ministère :**

## 16. Coordo FIJ

### Chiffres communs

| Chiffre commun   | Nom affiché sur la fiche | Quand           | Votre réponse |
| ---------------- | ------------------------ | --------------- | ------------- |
| STARs au service | STARs au service         | Chaque dimanche |               |
| STARs actifs     | STARs actifs             | À ce jour       |               |
| Dont en FIJ      | Dont en FIJ              | À ce jour       |               |

### Ce que le ministère saisit

| Indicateur tel qu'il apparaîtra | Ce qu'on compte exactement                                                                                 | Quand       | Unité  | Sensible | Votre réponse |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------- | ------ | -------- | ------------- |
| Parcours FIJ : nouveaux         | Jeunes venus en FIJ pour la première fois dans le mois, tous départements. Un total, sans liste.           | Chaque mois | Nombre | non      |               |
| Parcours FIJ : réguliers        | Jeunes venus au moins trois fois en FIJ dans le mois, comptés hors outil. Un total, sans liste.            | Chaque mois | Nombre | non      |               |
| Parcours FIJ : au service       | Jeunes des FIJ qui ont servi au moins un dimanche du mois dans un ministère. Différent de « dont en FIJ ». | Chaque mois | Nombre | non      |               |

### Chiffres par département

Chaque semaine, Coordo FIJ saisit quatre rubriques pour chacun des 8 départements (75, 77, 78, 91, 92, 93, 94, 95), dans un seul formulaire : 32 valeurs par semaine. L'outil calcule le total de chaque rubrique et affiche combien de départements ont une valeur (« 8 dép. sur 8 »), avec une courbe par rubrique et par département.

| Rubrique                    | Ce qu'on compte exactement                                                      | Quand                                   | Unité  | Sensible | Votre réponse |
| --------------------------- | ------------------------------------------------------------------------------- | --------------------------------------- | ------ | -------- | ------------- |
| Présents au culte EJP       | Jeunes du département présents au culte EJP de ce dimanche.                     | Chaque semaine, pour chaque département | Nombre | non      |               |
| Présents à la réunion FIJ   | Présents aux réunions FIJ du département dans la semaine, séances additionnées. | Chaque semaine, pour chaque département | Nombre | non      |               |
| Présents à l'évangélisation | Présents aux sorties d'évangélisation du département dans la semaine.           | Chaque semaine, pour chaque département | Nombre | non      |               |
| Membres du mardi            | Membres de la FIJ du département présents le mardi de la semaine.               | Chaque semaine, pour chaque département | Nombre | non      |               |

### Ce que l'outil calcule

Aucun calcul pour ce ministère. Une seule lecture : l'étape « membres » du graphique ci-dessous est le total des « Membres du mardi » de la dernière semaine du mois, lu dans les chiffres par département, sans seconde saisie.

### Graphiques

| N°  | Titre                         | Ce qu'il montre                                                                                              | Forme              | Période              | Votre réponse |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------ | -------------------- | ------------- |
| G11 | Parcours du jeune dans le FIJ | Parcours FIJ : nouveaux, réguliers ; membres du mardi (chiffres par département) ; Parcours FIJ : au service | totaux côte à côte | Les 12 derniers mois |               |

Question de la relecture : les quatre rubriques par département et les quatre étapes du parcours (nouveaux, réguliers, membres, au service) vous conviennent-elles ?

**Remarques du ministère :**

## 17. Multilingue

### Chiffres communs

| Chiffre commun   | Nom affiché sur la fiche | Quand           | Votre réponse |
| ---------------- | ------------------------ | --------------- | ------------- |
| STARs au service | Interprètes mobilisés    | Chaque dimanche |               |
| STARs actifs     | STARs actifs             | À ce jour       |               |
| Dont en FIJ      | Dont en FIJ              | À ce jour       |               |

### Ce que le ministère saisit

| Indicateur tel qu'il apparaîtra     | Ce qu'on compte exactement                                                                                    | Quand           | Unité  | Sensible | Votre réponse |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------- | ------ | -------- | ------------- |
| Langues couvertes                   | Langues interprétées pendant le culte de ce dimanche.                                                         | Chaque dimanche | Nombre | non      |               |
| Événements couverts                 | Événements hors culte où l'interprétation a été assurée dans le mois.                                         | Chaque mois     | Nombre | non      |               |
| Événements à couvrir                | Événements hors culte où Multilingue était attendu dans le mois, couverts ou non.                             | Chaque mois     | Nombre | non      |               |
| Personnes servies par la traduction | Personnes qui ont utilisé la traduction ce dimanche (récepteurs distribués ou places de la zone interprétée). | Chaque dimanche | Nombre | non      |               |
| Mobilisés aux événements            | Présences d'interprètes aux événements hors dimanche. Une personne compte à chaque événement où elle sert.    | Chaque mois     | Nombre | non      |               |
| Demandes de traduction              | Demandes de traduction reçues dans le mois.                                                                   | Chaque mois     | Nombre | non      |               |
| Demandes satisfaites                | Demandes de traduction honorées dans le mois.                                                                 | Chaque mois     | Nombre | non      |               |
| Incidents de traduction             | Incidents qui ont gêné la traduction dans le mois (matériel, absence, langue non couverte).                   | Chaque mois     | Nombre | non      |               |

### Ce que l'outil calcule

| Indicateur                        | Comment il se calcule                                                               | À saisir | Votre réponse |
| --------------------------------- | ----------------------------------------------------------------------------------- | -------- | ------------- |
| Taux de couverture des événements | « Événements couverts » divisés par « Événements à couvrir ». Plafonné à 100 %.     | Rien     |               |
| Part des demandes satisfaites     | « Demandes satisfaites » divisées par « Demandes de traduction ». Plafonné à 100 %. | Rien     |               |

**Remarques du ministère :**

## 18. Sécurité

### Chiffres communs

| Chiffre commun   | Nom affiché sur la fiche      | Quand           | Votre réponse |
| ---------------- | ----------------------------- | --------------- | ------------- |
| STARs au service | Agents et bénévoles mobilisés | Chaque dimanche |               |
| STARs actifs     | STARs actifs                  | À ce jour       |               |
| Dont en FIJ      | Dont en FIJ                   | À ce jour       |               |

### Ce que le ministère saisit

Les « Incidents » et les « Interventions » de Sécurité ne comptent pas les faits de santé (malaises, soins, secours) : Santé les compte. Ces deux indicateurs ne sont donc pas sensibles.

| Indicateur tel qu'il apparaîtra | Ce qu'on compte exactement                                                                                    | Quand           | Unité  | Sensible | Votre réponse |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------- | ------ | -------- | ------------- |
| Événements couverts             | Événements où des agents de sécurité ont été présents dans le mois, cultes compris.                           | Chaque mois     | Nombre | non      |               |
| Incidents                       | Faits anormaux constatés par les agents dans le mois. Hors malaises, soins et secours : Santé les compte.     | Chaque mois     | Nombre | non      |               |
| Interventions                   | Actions des agents en réponse à un incident dans le mois. Hors malaises, soins et secours : Santé les compte. | Chaque mois     | Nombre | non      |               |
| Exercices et formations         | Exercices et formations de sécurité tenus dans le mois.                                                       | Chaque mois     | Nombre | non      |               |
| Postes à tenir                  | Postes prévus au plan de sécurité de ce dimanche.                                                             | Chaque dimanche | Nombre | non      |               |
| Postes tenus                    | Postes effectivement occupés ce dimanche.                                                                     | Chaque dimanche | Nombre | non      |               |
| Mobilisés aux événements        | Présences d'agents et de bénévoles aux événements hors dimanche. Une personne compte à chaque événement.      | Chaque mois     | Nombre | non      |               |

### Ce que l'outil calcule

| Indicateur                    | Comment il se calcule                                              | À saisir | Votre réponse |
| ----------------------------- | ------------------------------------------------------------------ | -------- | ------------- |
| Taux de couverture des postes | « Postes tenus » divisés par « Postes à tenir ». Plafonné à 100 %. | Rien     |               |
| Incidents par événement       | Moyenne : « Incidents » divisés par « Événements couverts ».       | Rien     |               |

**Remarques du ministère :**

## 19. Formation

### Chiffres communs

| Chiffre commun   | Nom affiché sur la fiche | Quand           | Votre réponse |
| ---------------- | ------------------------ | --------------- | ------------- |
| STARs au service | Formateurs mobilisés     | Chaque dimanche |               |
| STARs actifs     | STARs actifs             | À ce jour       |               |
| Dont en FIJ      | Dont en FIJ              | À ce jour       |               |

### Ce que le ministère saisit

| Indicateur tel qu'il apparaîtra      | Ce qu'on compte exactement                                                                     | Quand       | Unité  | Sensible | Votre réponse |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- | ----------- | ------ | -------- | ------------- |
| Inscrits (PCNC)                      | Personnes inscrites au parcours PCNC le jour de la saisie, y compris celles qui l'ont terminé. | À ce jour   | Nombre | non      |               |
| Personnes ayant terminé la formation | Parmi les inscrits au parcours PCNC, personnes qui l'ont terminé, le jour de la saisie.        | À ce jour   | Nombre | non      |               |
| Séances : présences                  | Présences aux séances de formation du mois, séances additionnées. Aucun nom.                   | Chaque mois | Nombre | non      |               |
| Séances : présences attendues        | Inscrits attendus aux séances du mois, séances additionnées.                                   | Chaque mois | Nombre | non      |               |
| Réponses au questionnaire            | Réponses reçues dans le mois au questionnaire anonyme de satisfaction de Formation.            | Chaque mois | Nombre | non      |               |
| Réponses satisfaites                 | Parmi ces réponses, celles qui disent « satisfait » ou donnent une des deux meilleures notes.  | Chaque mois | Nombre | non      |               |

### Ce que l'outil calcule

| Indicateur           | Comment il se calcule                                                                                                                                    | À saisir | Votre réponse |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------- |
| Taux de présence     | « Séances : présences » divisées par « Séances : présences attendues ». Plafonné à 100 %.                                                                | Rien     |               |
| Taux de complétion   | « Personnes ayant terminé la formation » divisées par « Inscrits (PCNC) ». Résultat du jour, affiché avec les dates des deux chiffres. Plafonné à 100 %. | Rien     |               |
| Taux de satisfaction | « Réponses satisfaites » divisées par « Réponses au questionnaire ». Plafonné à 100 %.                                                                   | Rien     |               |

Questions de la relecture : le sigle « PCNC » est gardé tel quel ; une réponse est « satisfaite » quand elle dit « satisfait » ou donne une des deux meilleures notes. Cela vous convient-il ? Les séances ont-elles lieu un autre jour que le dimanche ? Dans ce cas, l'administration ajoute à votre fiche « Mobilisés aux événements ».

**Remarques du ministère :**

## 20. Protocole

Protocole n'a aucun indicateur propre : la liste de la coordination n'en demande aucun. Il saisit les trois chiffres communs, pour que les totaux de l'église restent complets.

### Chiffres communs

| Chiffre commun   | Nom affiché sur la fiche | Quand           | Votre réponse |
| ---------------- | ------------------------ | --------------- | ------------- |
| STARs au service | STARs au service         | Chaque dimanche |               |
| STARs actifs     | STARs actifs             | À ce jour       |               |
| Dont en FIJ      | Dont en FIJ              | À ce jour       |               |

Aucun chiffre propre à saisir, aucun calcul, aucun graphique pour ce ministère.

**Remarques du ministère :**

## 21. MDS

### Chiffres communs

| Chiffre commun                         | Nom affiché sur la fiche     | Quand           | Votre réponse |
| -------------------------------------- | ---------------------------- | --------------- | ------------- |
| STARs au service                       | STARs au service             | Chaque dimanche |               |
| STARs actifs                           | STARs actifs                 | À ce jour       |               |
| Dont en FIJ                            | Dont en FIJ                  | À ce jour       |               |
| Total des STARs actifs de l'église     | STARs actifs de l'église     | À ce jour       |               |
| Total des STARs au service de l'église | STARs au service de l'église | Chaque dimanche |               |

Les deux dernières lignes sont des lignes de référence : les totaux de l'église, déjà publics, avec leur complétude (« 21 sur 23 »). MDS n'a rien à saisir pour elles.

### Ce que le ministère saisit

| Indicateur tel qu'il apparaîtra | Ce qu'on compte exactement                                                                                         | Quand           | Unité  | Sensible | Votre réponse |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------- | ------ | -------- | ------------- |
| Nouveaux STARs                  | STARs enregistrés par MDS pour la première fois dans le mois. Un nombre, sans liste ni nom.                        | Chaque mois     | Nombre | non      |               |
| STARs désactivés                | STARs retirés des actifs dans le mois (départ, arrêt, transfert).                                                  | Chaque mois     | Nombre | non      |               |
| Recrutements aboutis            | Candidatures du formulaire de recrutement qui ont mené à une intégration dans une équipe, comptées ce mois-là.     | Chaque mois     | Nombre | non      |               |
| Recrutements non aboutis        | Candidatures du formulaire closes sans intégration (abandon, refus, sans réponse), comptées le mois de la clôture. | Chaque mois     | Nombre | non      |               |
| Espaces Care                    | Espaces Care (espace nourriture) tenus ce dimanche.                                                                | Chaque dimanche | Nombre | non      |               |
| Badges distribués               | Badges remis à des STARs dans le mois.                                                                             | Chaque mois     | Nombre | non      |               |
| Badges actifs                   | Badges en circulation et valides le jour de la saisie.                                                             | À ce jour       | Nombre | non      |               |
| Badges en attente               | Badges demandés et pas encore remis le jour de la saisie.                                                          | À ce jour       | Nombre | non      |               |

### Ce que l'outil calcule

Aucun calcul à partir des chiffres saisis. Un seul comptage d'événements :

| Indicateur           | Ce que l'outil compte                                                                                            | À saisir                | Votre réponse |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------- |
| Événements organisés | Événements de MDS dont le dernier état est « Terminé ». Le comptage part de la mise en service, puis de janvier. | Rien, affiché plus tard |               |

### Graphiques

| N°  | Titre                      | Ce qu'il montre                                                             | Forme                        | Période              | Votre réponse |
| --- | -------------------------- | --------------------------------------------------------------------------- | ---------------------------- | -------------------- | ------------- |
| G12 | Évolution des STARs actifs | STARs actifs de l'église en fin de mois ; Nouveaux STARs ; STARs désactivés | courbe et barres superposées | Les 12 derniers mois |               |

Question de la relecture : un recrutement est « abouti » quand il mène à une intégration dans une équipe, compté le mois de l'intégration. Cela vous convient-il ?

**Remarques du ministère :**

## 22. Prodiges Junior

### Chiffres communs

| Chiffre commun   | Nom affiché sur la fiche | Quand           | Votre réponse |
| ---------------- | ------------------------ | --------------- | ------------- |
| STARs au service | Animateurs mobilisés     | Chaque dimanche |               |
| STARs actifs     | STARs actifs             | À ce jour       |               |
| Dont en FIJ      | Dont en FIJ              | À ce jour       |               |

### Ce que le ministère saisit

Deux de ces indicateurs sont sensibles : voir « Les indicateurs sensibles » au début du document. « Enfants présents » et « Enfants inscrits » ne sont pas sensibles : un seul total, sans âge ni nom.

| Indicateur tel qu'il apparaîtra | Ce qu'on compte exactement                                                          | Quand           | Unité  | Sensible | Votre réponse |
| ------------------------------- | ----------------------------------------------------------------------------------- | --------------- | ------ | -------- | ------------- |
| Enfants présents                | Enfants accueillis ce dimanche, en un seul total, sans âge ni nom.                  | Chaque dimanche | Nombre | non      |               |
| Nouveaux enfants                | Enfants accueillis pour la première fois à Prodiges Junior dans le mois.            | Chaque mois     | Nombre | oui      |               |
| Enfants déjà venus              | Enfants accueillis dans le mois qui l'avaient déjà été avant. Un total, sans liste. | Chaque mois     | Nombre | oui      |               |
| Enfants inscrits                | Enfants inscrits à Prodiges Junior le jour de la saisie.                            | À ce jour       | Nombre | non      |               |

### Ce que l'outil calcule

| Indicateur       | Comment il se calcule                                                         | À saisir | Votre réponse |
| ---------------- | ----------------------------------------------------------------------------- | -------- | ------------- |
| Taux de présence | « Enfants présents » divisés par « Enfants inscrits » en vigueur ce dimanche. | Rien     |               |

L'outil affiche aussi, sous le nom « Sessions réalisées », le nombre de dimanches du mois où « Enfants présents » dépasse 0 (affiché plus tard).

**Remarques du ministère :**

## 23. Prodiges Academy

Prodiges Academy est un ministère à part entière, distinct de Formation. Il ne figure pas dans la liste de la coordination, qui ne lui demande aucun indicateur. Il saisit les trois chiffres communs, pour que les totaux de l'église restent complets. Ses propres indicateurs viendront quand la coordination les ajoutera à son document, ou par une demande dans l'outil validée par EJP Tech.

### Chiffres communs

| Chiffre commun   | Nom affiché sur la fiche | Quand           | Votre réponse |
| ---------------- | ------------------------ | --------------- | ------------- |
| STARs au service | STARs au service         | Chaque dimanche |               |
| STARs actifs     | STARs actifs             | À ce jour       |               |
| Dont en FIJ      | Dont en FIJ              | À ce jour       |               |

Aucun chiffre propre à saisir, aucun calcul, aucun graphique pour ce ministère.

**Remarques du ministère :**

## Totaux

| Ministère        | Chiffres saisis | dont sensibles | Chiffres calculés | Comptages d'événements | Graphiques |
| ---------------- | --------------- | -------------- | ----------------- | ---------------------- | ---------- |
| Intégration      | 8               | 0              | 4                 | 0                      | 3          |
| Coordination     | 6               | 0              | 4                 | 6                      | 1          |
| Communication    | 10              | 0              | 4                 | 0                      | 1          |
| Social           | 7               | 3              | 0                 | 0                      | 0          |
| Film             | 8               | 0              | 2                 | 0                      | 0          |
| Tech             | 6               | 0              | 2                 | 0                      | 1          |
| MCAD             | 16              | 0              | 5                 | 0                      | 0          |
| MPI              | 9               | 0              | 3                 | 0                      | 1          |
| Santé            | 7               | 4              | 1                 | 0                      | 0          |
| Merch            | 9               | 0              | 3                 | 0                      | 2          |
| Production       | 7               | 0              | 0                 | 0                      | 0          |
| Prodiges Musique | 6               | 0              | 1                 | 0                      | 1          |
| Kumi             | 11              | 1              | 1                 | 0                      | 0          |
| Eagles           | 7               | 1              | 1                 | 0                      | 0          |
| Entretien        | 8               | 0              | 2                 | 0                      | 0          |
| Coordo FIJ       | 3               | 0              | 0                 | 0                      | 1          |
| Multilingue      | 8               | 0              | 2                 | 0                      | 0          |
| Sécurité         | 7               | 0              | 2                 | 0                      | 0          |
| Formation        | 6               | 0              | 3                 | 0                      | 0          |
| Protocole        | 0               | 0              | 0                 | 0                      | 0          |
| MDS              | 8               | 0              | 0                 | 1                      | 1          |
| Prodiges Junior  | 4               | 2              | 1                 | 0                      | 0          |
| Prodiges Academy | 0               | 0              | 0                 | 0                      | 0          |
| **Total**        | **161**         | **11**         | **41**            | **7**                  | **12**     |

À ces totaux s'ajoutent :

- les **trois chiffres communs** de chacun des 23 ministères, soit 69 chiffres à saisir, dont 11 portent sur la fiche le nom de la demande de la coordination (10 ministères, dont Kumi pour deux chiffres), auxquels s'ajoutent 2 lignes de référence de l'église pour MDS, soit 13 noms à valider ;
- les **4 rubriques par département** de Coordo FIJ, saisies chaque semaine pour 8 départements (32 valeurs par semaine) ;
- 2 points d'attention de départ (Production et Entretien) et 3 valeurs de départ de Production.

Au total : **161 chiffres saisis** (dont 11 sensibles), **41 chiffres calculés** et **7 comptages d'événements** par l'outil, **12 graphiques**. Sur les 48 chiffres calculés ou comptés, 29 sont visibles dès l'ouverture et 19 s'affichent dans les 4 semaines qui suivent.

## Sources et contrôle

Ce document reprend mot pour mot le catalogue de la vague 1 (`docs/conception/vague-1-decisions.md`, sections 3 et 4) et, pour les trois chiffres communs, les textes d'aide du `BRIEF.md`. Les renvois internes de questions (K10, K19 et suivants) ont été retirés du tableau « Les choix à relire en priorité ». Les nombres par ministère ont été comptés contre ce catalogue : 161 chiffres saisis, 41 calculs, 7 comptages d'événements, 12 graphiques.
