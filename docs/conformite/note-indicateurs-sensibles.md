# Note d'analyse : les indicateurs sensibles de Pilotage EJP

- **Version** : 1 (projet)
- **Date** : 6 octobre 2026
- **Auteur** : EJP Tech
- **Statut** : Projet à valider par la coordination
- **Pour** : la coordination de l'Église des Jeunes Prodiges
- **Sources** : `docs/conception/vague-1-decisions.md` (K5, K54, K56 et catalogue), `docs/decisions.md`
  (P22, P34, P35, P39, P42), `BRIEF.md` (sections 3 et 7), page « Confidentialité » de l'outil
- **Document lié** : `docs/conformite/registre-traitements.md` (fiche 2)

## En bref

- Onze indicateurs de la liste de la coordination portent sur la santé, l'accompagnement social,
  l'écoute et les enfants. Ce sont des domaines sensibles.
- Ils sont **créés et actifs dès la vague 1**, comme tous les indicateurs demandés par la
  coordination. C'est la décision de la personne responsable du 6 octobre 2026.
- L'outil n'en garde que des **totaux par mois écoulé**. Il ne garde jamais un nom, une date de cas,
  un détail, une liste ni un texte lié à ces chiffres.
- Les très petits nombres (1 et 2) s'affichent « moins de 3 » au berger, au conseil et à EJP Tech,
  sans qu'une différence entre deux totaux ne permette de les retrouver.
- Pour ces lecteurs, ces totaux ne permettent pas, en pratique, de reconnaître une personne. Par
  prudence, l'outil les protège quand même comme s'ils le pouvaient.
- La coordination est invitée à valider cette note et le registre (liste à la section 9).

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
| Kumi            | Call your sister : prises en charge                 | Prises en charge de Call your sister dans le mois. Mois fini seulement, aucun détail.                     | 194               |
| Eagles          | La plate-forme d'écoute : prises en charge          | Prises en charge de la plate-forme d'écoute dans le mois. Mois fini seulement, aucun détail.              | 206               |
| Prodiges Junior | Nouveaux enfants                                    | Enfants accueillis pour la première fois à Prodiges Junior dans le mois. Mois fini seulement.             | 279               |
| Prodiges Junior | Enfants déjà venus                                  | Enfants accueillis dans le mois qui l'avaient déjà été avant. Un total, sans liste. Mois fini seulement.  | 284               |

Ces indicateurs se saisissent une fois par mois, pour un mois fini. La liste de la coordination
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

| L'outil garde                                                | L'outil ne garde jamais                                        |
| ------------------------------------------------------------ | -------------------------------------------------------------- |
| Un nombre entier par indicateur et par mois fini             | Un nom, un âge, un sexe, une adresse, un contact               |
| La date de la saisie et le compte du ministère qui l'a faite | La date ou le lieu d'un cas, la nature d'un soin ou d'une aide |
| La définition de l'indicateur                                | Une ventilation (par âge, par cause, par semaine)              |
|                                                              | Un texte attaché au chiffre, une liste de personnes            |

Les listes, carnets ou fiches que les ministères tiennent peut-être **hors de l'outil** pour faire
leurs comptes n'entrent jamais dans Pilotage EJP. Ils ne relèvent pas de cette note (voir la
section 9, point 7).

## 4. Pourquoi ces totaux ne sont pas, en pratique, des données personnelles

Le RGPD s'applique aux informations sur une personne identifiée ou identifiable (article 4.1). Il ne
s'applique pas aux informations anonymes, c'est-à-dire qui ne permettent plus de reconnaître une
personne par des moyens raisonnables (considérant 26).

Pour le berger, le conseil et EJP Tech, les totaux de l'outil ne permettent pas de reconnaître une
personne, pour six raisons :

1. **Un total, jamais une ligne par personne.** Le chiffre additionne des personnes ou des gestes.
2. **Un mois entier, et seulement un mois fini.** La base refuse le mois en cours. Aucun chiffre ne
   dit quel jour ni quelle semaine un cas a eu lieu. Le journal ne garde aucune valeur, et la fiche
   ne montre que la valeur du mois, pas la suite des saisies.
3. **Les très petits nombres sont cachés.** 1 et 2 s'affichent « moins de 3 ». 0 reste 0.
4. **Aucune fuite par différence.** La somme de l'année n'additionne que les mois affichés, et le
   dit. Une somme égale à 1 ou 2 s'affiche aussi « moins de 3 ».
5. **Aucun croisement dans l'outil.** Ces chiffres n'ont ni ventilation, ni texte, ni calcul tiré
   d'eux, ni graphique de l'église. Ils ne figurent jamais sur la vue de l'église ni dans un email.
6. **Des lecteurs limités.** Les lignes brutes ne sont lisibles que par le ministère qui saisit. Les
   autres lecteurs passent par une vue de la base qui applique le seuil : un accès direct à la base,
   sans passer par les écrans, ne la contourne pas.

Exemple de ce que voit le berger pour un indicateur sensible :

| Mois                    | Affiché au berger                               |
| ----------------------- | ----------------------------------------------- |
| Septembre               | 5                                               |
| Août                    | moins de 3                                      |
| Juillet                 | 0                                               |
| Somme de ces trois mois | Somme des mois affichés : 5, plus 1 mois sous 3 |

Une limite : le ministère qui saisit voit ses valeurs exactes. Il connaît déjà les personnes qu'il a
aidées, puisqu'il a fait le compte. L'outil ne lui apprend rien de plus.

## 5. Risques qui restent

Appréciation d'EJP Tech, après les mesures de la section 6.

| Risque                                             | Exemple                                                                                                 | Ce qui le réduit                                                                                                                                | Niveau qui reste                                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Petits groupes                                     | Un mois à 3 ou 4, dans un ministère où le lecteur connaît déjà les personnes venues                     | Mois entier, seuil, lecteurs limités, aucun détail                                                                                              | Faible. Un seuil plus haut (5) le réduirait encore                                                          |
| « Moins de 3 » révèle qu'il y a eu au moins un cas | Le berger sait qu'en août, au moins une personne a été prise en charge                                  | Rien n'indique qui, ni quand dans le mois                                                                                                       | Faible                                                                                                      |
| Recoupement avec une autre information             | Un malaise vu par tous pendant un culte de septembre, puis « Incidents avec intervention : moins de 3 » | Le chiffre n'ajoute rien sur la personne ; aucune date, aucun lien entre totaux ; Sécurité ne compte pas la santé                               | Faible                                                                                                      |
| Textes libres                                      | Un point d'attention de Santé ou de Social qui décrit la situation d'une personne                       | Rappel sous le premier champ, 280 caractères, relecture et masquage par EJP Tech (motif « Santé ou situation personnelle »), journal sans texte | **Moyen** : le texte reste visible jusqu'à sa relecture, et 7 jours dans les sauvegardes après son masquage |
| Texte « Pourquoi cet indicateur ? »                | Un ministère justifie sa demande en citant un cas                                                       | Lu seulement par le ministère et par EJP Tech, jamais dans le journal, la validation par EJP Tech vaut relecture                                | Faible à moyen : ce champ n'a pas de rappel (exception voulue, T30)                                         |
| Accès par le ministère                             | Une personne qui a quitté le ministère garde l'accès au compte partagé                                  | Double authentification, procédure de départ, boîte mail au nom de l'église                                                                     | Faible                                                                                                      |
| Accès technique                                    | Une personne qui administre la base lit les valeurs exactes sans le seuil                               | Export par un script local, jamais dans le navigateur ; jamais de copie vers la préproduction                                                   | Faible. À compléter par EJP Tech : liste des accès et double authentification sur le tableau de bord        |
| Export de fin de vie                               | L'export contient les valeurs exactes                                                                   | Fait hors de l'outil par la personne responsable, remis à la coordination                                                                       | Dépend de sa garde. À compléter par la coordination : durée et lieu de conservation                         |
| Indicateur jugé sensible après coup                | Un chiffre non marqué sensible se révèle trop précis                                                    | Retrait pour confidentialité : plus personne ne le lit par l'outil, EJP Tech compris                                                            | Faible                                                                                                      |

## 6. Mesures

Ces mesures sont décidées. Elles sont construites et testées à l'étape 4, avant la mise en service :
au 6 octobre 2026, aucune n'est encore construite.

**Dans la base de données** (elles ne dépendent pas de l'écran) :

- une case « sensible » sur l'indicateur ; rythme « mois » seulement ;
- refus du mois en cours, à l'heure de Paris ; le formulaire propose les deux derniers mois finis ;
- lignes brutes lisibles par le seul ministère qui saisit ; les autres lisent une vue qui applique le
  seuil et réapplique les droits du lecteur ;
- seuil « moins de 3 » et somme des seuls mois affichés, calculés dans la base ;
- aucun calcul, aucune série de graphique tirés d'un indicateur sensible ;
- journal sans valeur ; ajout seulement ; auteur et heure posés par la base ;
- double authentification exigée sur chaque table ;
- retrait pour confidentialité possible, qui ferme la lecture à tous.

**À l'écran** :

- jamais sur la vue de l'église ;
- la confirmation « Vérifiez ce chiffre » ne montre au ministère que ses propres valeurs ;
- l'administration de l'église voit la définition et l'usage, jamais une valeur ; les autres
  ministères ne voient rien.

**Dans l'organisation** :

- relecture des onze définitions par Santé, Social, Kumi, Eagles et Prodiges Junior en
  préproduction, avant la première saisie ;
- relecture des champs libres par EJP Tech ;
- page « Confidentialité » : une phrase dira que seuls des totaux de mois écoulés sont saisis pour
  la santé, l'accompagnement, l'écoute et les enfants (texte soumis à la coordination) ;
- ce registre et cette note, remis à la coordination avant la mise en service.

**Tests automatiques** (avant chaque mise en ligne) :

- 0 reste 0 ; 1 et 2 masqués au berger, au conseil et à EJP Tech ; valeur exacte pour le ministère ;
- lecture directe des lignes brutes refusée aux autres profils ;
- aucune différence entre la somme affichée et la série affichée ne révèle un mois masqué ;
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
- **toutes les protections restent** (sections 4 et 6) ;
- ce registre et cette note sont rédigés maintenant et remis à la coordination **avant la mise en
  service**. Ils ne bloquent plus rien techniquement.

## 8. Avis d'EJP Tech sur une analyse d'impact complète

Une analyse d'impact relative à la protection des données (AIPD) est exigée quand un traitement est
susceptible d'engendrer un risque élevé pour les personnes (article 35). La coordination décide s'il
en faut une.

Avis d'EJP Tech, à confirmer par la coordination : pour les onze indicateurs, une analyse complète
ne paraît pas nécessaire, car ils ne portent pas, en pratique, de données personnelles (section 4).
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
   ne voient rien.
5. **Une analyse d'impact complète, ou non** (section 8).
6. **La phrase de la page « Confidentialité »** sur les totaux de mois écoulés (section 6).
7. **Les listes tenues hors de l'outil** : si des ministères tiennent des listes de bénéficiaires,
   des carnets de soins ou des registres d'enfants, ce sont des traitements de l'église, distincts de
   Pilotage EJP. Ils peuvent demander leur propre fiche au registre et leurs propres protections.
8. **La garde de l'export de fin de vie** : durée de conservation et lieu.
9. **Le registre des traitements** (`docs/conformite/registre-traitements.md`), fiche 2 comprise.

## 10. Quand revoir cette note

- avant la mise en service, après la relecture des définitions en préproduction ;
- un mois après la mise en service, quand les premiers mois finis s'affichent ;
- à chaque nouvel indicateur sensible, à chaque changement de seuil, de lecteurs, de calcul ou de
  graphique qui touche ces indicateurs ;
- après tout incident (texte personnel resté visible, accès non autorisé) ;
- proposition d'EJP Tech : au plus tard six mois après la mise en service, puis à l'arrêt de
  l'outil, au moment de l'export final.

## Historique

| Version    | Date           | Auteur   | Changement                                                                    |
| ---------- | -------------- | -------- | ----------------------------------------------------------------------------- |
| 1 (projet) | 6 octobre 2026 | EJP Tech | Première rédaction, après la décision de la personne responsable du même jour |

Ce document n'est pas un avis juridique. En cas de doute, demandez conseil à la CNIL ou à un avocat.
