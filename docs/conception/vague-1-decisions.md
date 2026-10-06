# Vague 1 des indicateurs : décisions et couverture

- **Date** : 6 octobre 2026
- **Statut** : Décidé par EJP Tech le 6 octobre 2026, révisable par la coordination
- **Sources** : liste de la coordination (`docs/sources/kpi-coordination-2026-10.md`), analyse
  (`docs/conception/kpi-ministeres.md`, section 8 et annexe), configuration
  (`docs/conception/configuration-indicateurs.md`), validation (`docs/conception/validation-metier.md`),
  `BRIEF.md`, `docs/decisions.md` (numéros du 6 octobre)
- **Entrées du journal des décisions** : P32 à P41 et T36 (`docs/decisions.md`)
- **Révision du 6 octobre 2026** : la personne responsable a décidé que les indicateurs sensibles
  sont créés et actifs dès la vague 1 (P42, réponse à la question 4 de `docs/plan-etape-4.md`).
  K56, X4 et les sections 7 et 8 de ce document sont alignés ; toutes les protections de K5
  restent.

Ce document répond aux 112 questions de `kpi-ministeres.md` (C1 à C3, K1 à K57), aux questions Q1 à
Q21 de `configuration-indicateurs.md`, et fixe la vague 1 des indicateurs. Là où il diffère de ces
deux documents, il les remplace. Il ne contient aucun code et aucune migration : le code part du
mode plan de l'étape 4a.

## 1. Mandat et principe

### Le mandat

Le 6 octobre 2026, la personne responsable (EJP Tech) a donné ce mandat : ne pas attendre la
coordination, prendre la meilleure décision sur chaque question ouverte, en s'appuyant sur le BRIEF
et sur la liste de la coordination. Exigence absolue : **chacune des 185 demandes de la liste,
graphiques compris, est produite ou retrouvable dans l'outil**. Aucune n'est abandonnée, mise hors
périmètre ou laissée « à préciser ».

Toutes les décisions de ce document ont le statut **« Décidé par EJP Tech le 6 octobre 2026,
révisable par la coordination »**. La coordination reste responsable de traitement et peut revenir
sur chacune.

### Le principe

Chaque demande prend l'une de ces formes, sans exception :

| Forme                  | Ce que c'est                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| Saisi                  | un compte agrégé que le ministère saisit (dimanche, mois ou à ce jour)                         |
| Somme de l'année       | la somme automatique des périodes finies depuis le départ (section 2, K3), avec complétude     |
| Calcul                 | un taux, une moyenne, une différence, une somme ou une évolution, jamais saisi                 |
| Dérivé des événements  | un comptage lu dans les événements et leur historique d'états                                  |
| Commun                 | un chiffre commun déjà saisi, affiché sur la fiche sous le nom de la demande                   |
| Relevé externe mensuel | un chiffre de plateforme saisi à la main une fois par mois                                     |
| Point d'attention      | un besoin écrit (texte de 280 caractères au plus, sans donnée personnelle), en plus du chiffre |
| Graphique              | une courbe ou des barres déclarées dans le catalogue, avec équivalent texte                    |

Les règles du projet restent intactes :

- ajout seulement, `saisi_le` et `saisi_par` posés par la base ;
- tout total avec sa complétude ;
- un STAR compté une fois, aucun nom, aucune liste, aucun identifiant de personne ;
- dates à l'heure de Paris (`private.aujourdhui()`, `private.dimanche_reference()`) ;
- textes libres de 280 caractères au plus, rappel sous le premier champ libre, sauf le champ
  « Pourquoi cet indicateur ? » (T30) ;
- matrice des droits : EJP Tech lit tout comme le berger (T29), y compris avec le seuil des
  domaines sensibles ;
- validation par EJP Tech seulement pour les indicateurs créés par un ministère (T30). Les
  indicateurs de ce document sont des prévus du catalogue : ils ne passent pas par la validation.

### Faits choisis par EJP Tech, à faire confirmer

Le mandat oblige à trancher des points que la liste ne dit pas. Ce sont des choix, pas des faits
connus. Ils sont écrits dans les définitions et relus en préproduction, **avant l'ouverture de la
saisie** (K16) : après la première saisie, un changement de sens passe par un remplacement.

| Point                                       | Choix d'EJP Tech                                                        | Qui relit                |
| ------------------------------------------- | ----------------------------------------------------------------------- | ------------------------ |
| NC                                          | nouveaux convertis, exclusif de NA le même dimanche (K17)               | Intégration              |
| Présence au culte (ligne 26)                | l'équipe d'Intégration, donc « STARs au service » (K19a)                | Intégration              |
| Taux de perte                               | sans nouvelles après 3 mois (K20b)                                      | Intégration              |
| Équipe d'accueil à Welcome Prodiges         | non comptée dans les présents (K18b)                                    | Intégration              |
| « À l'heure »                               | 5 minutes au plus après l'heure prévue (K22b)                           | Coordination             |
| Délai d'une demande de Communication        | date convenue, sinon 7 jours calendaires (K25b)                         | Communication            |
| Incident récurrent                          | même cause dans les 30 jours (K31b)                                     | Tech                     |
| Live et diffusion en direct                 | un seul chiffre (K32)                                                   | MCAD                     |
| Spectateurs du direct                       | pic de spectateurs simultanés (K34)                                     | MCAD                     |
| Catégories d'articles                       | vêtements, accessoires, autres articles (K39c)                          | Merch                    |
| Catégories de l'équipe                      | chanteurs, musiciens (K42a)                                             | Prodiges Musique         |
| Activité et projet                          | ponctuelle ; plusieurs semaines, comptée le mois où elle aboutit (K43a) | Kumi, Eagles             |
| Rubriques par département                   | quatre rubriques (K47a)                                                 | Coordo FIJ               |
| Étapes du parcours                          | nouveaux, réguliers, membres, au service (K47c)                         | Coordo FIJ               |
| PCNC, « terminé », réponse satisfaite       | sigle gardé ; deux meilleures notes (K50)                               | Formation                |
| Recrutement abouti                          | intégration dans une équipe, comptée le mois de l'intégration (K53b)    | MDS                      |
| Seuil des petits nombres                    | « moins de 3 » pour 1 et 2 (K5c)                                        | Coordination             |
| Valeurs en euros cachées à l'administration | oui (K6b)                                                               | Coordination             |
| Les « mobilisés » du dimanche               | « STARs au service » du ministère (K8a)                                 | les dix ministères visés |

### Ce que ce document change ailleurs

- **Propositions revues** (`docs/decisions.md`, chacune porte un renvoi) : P15 à P27 et P29 (plus de
  plafond de six, plus de phase conditionnelle), P16 et P17 (pas de nature « activité » : semaine et
  mois suffisent), P19 (`indicateur_terme`), P20 (comptages d'événements livrés dans les 4 semaines
  qui suivent la mise en service), P22 (seuil retenu, lignes brutes fermées : Q9 inversée), P24
  (règle des stocks et des flux), P26 (« STARs au service » compte là où l'on sert, pas au
  ministère principal), P27 (statistiques par département avant la mise en service), T33 et T35 (unités
  « heure » et « jours », limite de 30 lignes par fiche), T34 (catalogue des graphiques).
- **BRIEF** (à reporter au mode plan de l'étape 4a, après accord explicite de la personne
  responsable sur le plan, comme le demande CLAUDE.md pour tout changement de modèle) :
  section 4 (rythmes, unités, sensibles, seuil), section 6 (`indicateur_terme`, `fij_statistique`,
  graphiques, vues), section 7 (matrice : code `coordination`, comptages d'événements, seuil,
  statistiques FIJ), section 11 (« graphique d'évolution » et « comptage des événements du
  calendrier » sortent du hors périmètre), section 13 (étape 4a élargie, un lot de lecture dans
  les 4 semaines après la mise en service). Le BRIEF n'est pas modifié par ce document.

## 2. Décisions

Une seule réponse par question. Les réponses écrites séparément pour plusieurs lots de ministères
ont été rapprochées (section 8).

### 2.1 Avant l'étape 4a

- **C1. Pour Pilotage EJP ou pour l'application complète ?** Pour Pilotage EJP, dès la vague 1.
  Chaque chiffre reste dans l'outil et part dans l'export de fin de vie (P13) avec sa définition.
  _Raison_ : l'outil est le lieu de prise d'information (BRIEF, section 1) ; attendre perdrait
  l'historique depuis la mise en service.
- **C2. La liste est-elle définitive ?** Non. La liste du 5 octobre forme la vague 1 (catalogue
  `private.indicateur_prevu`). Les ajouts passent par les suggestions (lot 1) et les comptes écrits
  par les ministères (lot 2, confirmé), validés par EJP Tech (T30), et par l'administration à
  l'écran Indicateurs (T35). _Raison_ : la consigne dit « d'en ajouter si besoin » ; le chemin
  existe sans migration.
- **C3. Qui voit les KPI ?** Le ministère concerné, le berger, le conseil et EJP Tech (lecture,
  T29). L'administration de l'église voit les définitions et l'usage (« saisi 4 mois sur 5 »),
  jamais une valeur. Les autres ministères ne voient pas les indicateurs propres d'un ministère. La
  vue de l'église garde les seuls chiffres communs. Deux exceptions écrites dans la matrice : le
  ministère Coordination lit les totaux d'événements de l'église (K11) ; la fiche de MDS montre des
  totaux de l'église déjà publics sur la vue de l'église (K52a). _Raison_ : règle « un ministère ne
  voit que sa fiche » (BRIEF, section 2), P06.
- **K1a. Le mois comme période commune ?** Oui. Nature « mois » (P16) : `date_ref` au 1er du mois,
  le mois en cours et les deux précédents proposés, rattrapage jusqu'au 1er janvier de l'année
  précédente, la saisie la plus récente d'un mois fait foi. Le mois en cours s'affiche à part
  (« Octobre en cours : 3 »), hors somme et hors complétude. _Raison_ : la plupart des demandes sont
  des flux mensuels.
- **K1b. Quels comptes par semaine ?** Ce qui se vit le dimanche ou dans sa semaine (du lundi au
  dimanche, saisi au rythme « dimanche ») : NA et NC, heure de début du culte, cultes captés, pic de
  spectateurs, Prière des Stars (sessions, présents, attendus), chaîne de prière (présents, nuit,
  attendus), sainte cène, Mag et Photo, répétitions, Espaces Care, enfants présents, langues
  couvertes, personnes servies par la traduction, postes de sécurité, statistiques FIJ par
  département (membres du mardi compris). Tout le reste se compte au mois, dont les chiffres de
  plateformes (l'engagement « par semaine » de Communication) et les domaines sensibles (Call your
  sister et la plate-forme d'écoute, demandés « par semaine »). Pas de nature « activité ».
  _Raison_ : la semaine se compte déjà comme un dimanche (T35) ; les plateformes donnent des
  statistiques mensuelles fiables ; un petit nombre par semaine dans un domaine sensible désigne une
  personne (P22).
- **K2. « Depuis le début de l'année » = 1er janvier pour tous ?** Oui : année civile, heure de
  Paris. La somme de l'année est calculée, jamais saisie, et toujours affichée avec son départ et sa
  complétude (« 9 mois sur 9 », « 38 dimanches sur 40 »).
- **K3. Départ des cumuls ?** Aucun total de départ saisi. Règle unique : la somme part de la
  période qui contient l'ajout de l'indicateur, et recule jusqu'à la plus ancienne période saisie
  (rattrapage par « Choisir un autre mois » ou « Choisir un autre dimanche »), sans aller avant le
  1er janvier de l'année en cours. L'écran nomme toujours le départ (« Depuis juillet »,
  « Depuis janvier »). Un indicateur « à ce jour » n'a pas d'historique avant sa première saisie :
  sa date est posée par la base. Exemple : le mag annulé de mars se saisit dans « Projets annulés »
  de mars 2026, et la somme de Production part de mars. _Raison_ : un total de départ n'a pas de
  période et casse la courbe ; le rattrapage reste en ajout seulement.
- **K4a. Un taux de deux totaux à la place d'un suivi de personnes ?** Oui, pour tous. Taux de
  retour = NA revenus au culte du mois ÷ NA des dimanches du mois précédent ; conversion vers la FIJ
  = intégrés en FIJ ÷ (NA + NC), par mois et depuis janvier ; perte = sans nouvelles après 3 mois ÷
  (NA + NC des dimanches du mois d'il y a 3 mois) ; participants uniques = compte du mois
  « personnes différentes » ; enfants revenus = compte du mois « enfants déjà venus » ; satisfaction
  = réponses satisfaites ÷ réponses d'un questionnaire anonyme. L'écran parle de « totaux », jamais
  de « parcours » de personnes. _Raison_ : mandat et P21 ; aucun nom, aucune liste, aucun
  identifiant (règle 9).
- **K4b. Le ministère saisit-il le nombre qui manque ?** Oui, aucun taux n'est retiré. Comptes
  ajoutés : Événements à couvrir (MCAD, Santé, Multilingue) ; postes d'équipe prévus et tenus
  (MCAD) ; postes à tenir et tenus (Sécurité) ; Prière des Stars et chaîne de prière : attendus
  (MPI) ; Répétitions : attendus (Prodiges Musique) ; Femmes inscrites (Kumi) ; Inscrits (Eagles) ;
  Séances : présences et présences attendues, Réponses au questionnaire et Réponses satisfaites
  (Formation) ; Interactions et Demandes reçues, traitées dans les délais (Communication) ; NA
  revenus au culte, Sans nouvelles après 3 mois (Intégration) ; Coût d'achat des articles vendus
  (Merch) ; jours de production, de résolution et d'attente (Film, Tech, Entretien) ; Événements
  commencés à l'heure (Coordination). « Non calculé » si le bas manque ou vaut 0. _Raison_ : un taux
  ne se saisit jamais, il lui faut ses deux comptes.
- **K5a. Un total par mois écoulé pour Santé, Social, Call your sister, la plate-forme d'écoute ?**
  Oui, et pour les nouveaux enfants et les enfants déjà venus de Prodiges Junior : nature « mois »,
  case sensible, compte entier, aucune ventilation, aucun texte attaché, aucun calcul sur eux. Onze
  indicateurs sensibles en tout.
- **K5b. Le mois en cours jamais saisi ?** Oui : `controler_mesure` refuse le mois en cours (heure
  de Paris) pour un indicateur sensible ; le formulaire propose les deux derniers mois écoulés.
- **K5c. « Moins de 3 » pour les très petits nombres ?** Oui. Pour un indicateur sensible, une
  valeur de 1 ou 2 s'affiche « moins de 3 » au berger, au conseil et à EJP Tech, sur la fiche, la
  courbe et la somme ; 0 reste 0 ; le ministère voit ses valeurs exactes. Aucune somme ne permet de
  retrouver un mois masqué : la somme de l'année ne compte que les mois affichés et le dit (« Somme
  des mois affichés : 14, plus 2 mois sous 3 ») ; une somme de 1 ou 2 s'affiche aussi « moins de
  3 ». Les lignes brutes de `mesure` d'un indicateur sensible ne sont lisibles par l'API que par le
  ministère qui saisit ; les autres lisent une vue `security_invoker` adossée à une fonction
  `private` qui applique le seuil. L'export de fin de vie se fait hors de l'API, par la personne
  responsable, avec un script SQL local (jamais dans le navigateur). _Raison_ : mandat (« petits
  nombres protégés ») ; un seuil appliqué seulement à l'écran serait contourné par PostgREST.
- **K5d. Prodiges Junior ?** Oui : « Enfants présents » chaque dimanche, un seul total, non
  sensible ; « Nouveaux enfants » et « Enfants déjà venus » par mois écoulé, sensibles, avec le
  seuil.
- **K6a. Des chiffres financiers ?** Oui. Chiffre d'affaires et coût d'achat des articles vendus
  (Merch) et fonds levés (Social) en « euros », par mois ; budget matériel prévu (Production) en
  « euros », à ce jour ; panier moyen (moyenne) et marge estimée (différence signée) calculés.
  Entier à l'euro, plafond 9 999 999. Aucun nom de client ni de donateur. La comptabilité de
  l'église fait foi.
- **K6b. L'administration voit-elle les euros ?** Non, comme toute valeur d'indicateur propre :
  elle voit la définition et l'usage (P06, Q15).
- **K13a. Au plus six indicateurs saisis par ministère ?** Non. Le plafond de six est levé, et toute
  la liste entre dans la vague 1. Une seule limite : **30 lignes par fiche, saisis et calculs,
  prévus compris** (MCAD en a 21) ; les ajouts d'un ministère restent limités à 3 au lot 1 et à 3
  par 30 jours au lot 2. La charge reste tenue par le rythme (presque tout au mois, en un formulaire
  « Chiffres du mois ») et par la ligne « À faire » de « Vos saisies ». La couverture ne dépend pas
  des rappels par email (P31, qui reste une amélioration à décider à part). _Raison_ : exigence
  absolue ; ce sont les ministères qui ont proposé ces chiffres.
- **K13b. Qui choisit les six ?** Sans objet : la liste de la coordination fait le choix. Un
  ministère qui veut arrêter un chiffre le demande à l'administration, qui le retire avec un motif
  (ses saisies restent).
- **K14a. Les 22 ministères créés à la mise en service ?** Oui, tous, Protocole compris (il saisit
  les chiffres communs), avant l'activation des comptes ; puis « Créer » des prévus à l'écran
  Indicateurs (configuration, section 9).
- **K14b. Une boîte mail partagée par ministère ?** Oui, au nom de l'église, jamais d'une personne,
  créée par l'administration. Un ministère sans adresse n'est pas activé et manque à la complétude
  jusqu'à son activation. Le 6 octobre 2026, chaque ministère a été invité à créer sa boîte ; la
  personne responsable enverra la liste plus tard, pour la création des comptes à l'écran 13. Cette
  liste ne va jamais dans le dépôt.
- **K14c. Noms exacts ?** Ceux de la liste : Intégration, Coordination, Communication, Social, Film,
  Tech, MCAD, MPI, Santé, Merch, Production, Prodiges Musique, Kumi, Eagles, Entretien, Coordo FIJ
  (le ministère de code `fij`), Multilingue, Sécurité, Formation, Protocole, MDS, Prodiges Junior.
  Le catalogue les compare sans accents ni majuscules ; un nom se corrige à l'écran 13 sans perte.
- **K56a et K56b. Registre, place des comptes sensibles, analyse d'impact ?** Les comptes ont leur
  place, avec les protections de K5. EJP Tech rédige l'entrée du registre (finalité ; catégories :
  totaux mensuels sans personne ; durée : fin de vie de l'outil ; destinataires : ministère, berger,
  conseil, EJP Tech ; mesures : mois clos, seuil, aucune ventilation) et une note d'analyse courte
  (risques, mesures, risque résiduel), et les remet à la coordination, responsable de traitement.
  La coordination décide d'une analyse d'impact complète. La page Confidentialité dit que seuls
  des totaux de mois écoulés sont saisis pour la santé, l'accompagnement, l'écoute et les enfants.
  **Révisé le 6 octobre 2026 (P42, décision de la personne responsable)** : la première réponse
  n'activait les indicateurs sensibles qu'après la remise du registre et de la note. Elle est
  remplacée : « à partir du moment où ils sont présents dans les KPI, ils doivent être présents ».
  Les onze indicateurs sensibles sont créés et actifs dès la vague 1, comme les autres, sans aucun
  réglage d'activation ; toutes les protections de K5 restent (mois écoulés seulement, « moins de
  3 » sans fuite, lignes brutes au seul ministère, aucun calcul, jamais sur la vue de l'église,
  journal sans valeur, page Confidentialité). EJP Tech rédige maintenant le registre et la note
  (`docs/conformite/`) ; ils sont remis à la coordination avant la mise en service, sans rien
  conditionner dans l'outil.

### 2.2 Avant l'étape 4 (fiche et saisies)

- **K7a. Qui reporte vues et abonnés ?** Un chiffre, une source, par périmètre : Communication pour
  les comptes de l'église (portée, interactions, vues, abonnés) ; Film pour les vues de ses vidéos ;
  MCAD pour l'audience de ses directs et replays. Chaque définition dit ce qu'elle couvre, et ces
  chiffres ne s'additionnent jamais entre ministères (P24, P26).
- **K7b. Sur quelles plateformes ?** Un total « toutes plateformes » par chiffre ; une ligne par
  plateforme (« YouTube : abonnés ») s'ajoute à l'écran Indicateurs si le ministère le demande.
  Règle unique (P24) : un **stock** (abonnés, prestataires inscrites, profils actifs) est un « à ce
  jour » relevé une fois par mois, avec sa courbe de fin de mois (`v_stock_mois`) ; un **flux**
  (vues, portée, interactions, mises en relation, réservations) est un indicateur du mois, avec sa
  somme de l'année. Les « vues cumulées » sont donc la somme des vues mensuelles depuis janvier, et
  la définition le dit. Aucune connexion aux plateformes.
- **K15. Les petites courbes suffisent-elles ?** Non. Chaque indicateur du dimanche ou du mois garde
  sa petite courbe, chaque « à ce jour » gagne sa courbe de fin de mois, et chaque graphique demandé
  devient un graphique déclaré de la fiche (section 6, douze graphiques). Ils lisent des données
  saisies dès le premier jour : ils arrivent dans les 4 semaines après la mise en service et
  montrent tout l'historique. Lève l'exclusion « graphique d'évolution » du BRIEF (section 11).
- **K16. Qui valide les libellés raccourcis ?** EJP Tech écrit libellés (60 caractères au plus, R1 et
  R2) et définitions (140 au plus), et garde l'intitulé de la coordination en mémoire dans ce
  document (section 3). La coordination et chaque ministère les relisent **en préproduction, avant
  l'ouverture de la saisie**, avec tous les faits choisis de la section 1. Ensuite, un changement de
  sens passe par un remplacement (Q7, R4).
- **K30. EJP Tech tient aussi le compte du ministère Tech ?** Accepté. Le ministère Tech a son compte
  de ministère et sa boîte partagée, distincts des comptes EJP Tech. Un ajout d'indicateur du
  ministère Tech se valide depuis un compte EJP Tech, de préférence le second compte conseillé
  (V8), et le journal garde les deux gestes. _Raison_ : T29 rend la lecture sans objet ; V8 ne rend
  le second compte que conseillé, on ne peut donc pas l'imposer.
- **K8a. Les « mobilisés » sont-ils les STARs qui servent le dimanche ?** Oui : équipiers, agents,
  interprètes, formateurs, animateurs, femmes et personnes mobilisées du dimanche sont le chiffre
  commun « STARs au service » du ministère, affiché sur la fiche sous le nom de la demande
  (`private.libelle_commun`), sans seconde saisie.
- **K8b. Des personnes d'un autre ministère principal ?** Oui : le dimanche, « STARs au service »
  compte **tous ceux qui ont servi chez le ministère ce dimanche, quel que soit leur ministère
  principal** (BRIEF, section 4, code `service`) ; un STAR ne sert que dans un ministère le
  dimanche, donc aucun double compte (D2). Les « bénévoles actifs » sont les « STARs actifs », qui
  comptent au ministère principal (règle 4). Les deux définitions ne se mélangent pas.
- **K8c. Les mobilisés hors dimanche ?** Oui, par un seul mécanisme : un indicateur du mois
  « Mobilisés aux événements » (somme de présences : une personne compte à chaque événement où elle
  sert ; jamais additionné entre ministères), prévu pour MCAD, Santé, Sécurité et Multilingue, et
  pour Intégration sous le libellé « Présences d'équipiers aux événements ». Ni session « Autre
  rassemblement » (réservée aux rassemblements de STARs, règle 5), ni lecture dans « Événements
  couverts », qui compte des événements et non des personnes.

### 2.3 Questions par ministère

- **K17a. NC ?** Nouveaux convertis : personnes qui prennent ce dimanche une première décision de
  suivre le Christ.
- **K17b. NA ou NC ?** NA : première venue au culte, sans décision ce dimanche. NC : décision ce
  dimanche, même à la première venue. Une personne compte dans une seule colonne un dimanche donné.
- **K18a. Welcome Prodiges ?** Activité d'Intégration : comptes du mois « sessions » et
  « présents », moyenne par session calculée, libellée « moyenne du mois ». Un seul ministère compte,
  donc pas de session d'église.
- **K18b. Qui est présent ?** Les personnes accueillies (NA et NC) ; l'équipe d'accueil n'est pas
  comptée.
- **K18c. Jour et rythme ?** Inutiles pour construire : le rythme s'écrit dans la définition quand
  Intégration le donne.
- **K19a. Présence au culte de qui ?** De l'équipe d'Intégration : « STARs au service » d'Intégration,
  affiché « Équipe présente au culte ». Question posée à Intégration à la relecture : si le sens est
  l'assemblée, un compte du dimanche « Présents au culte » (un total) est créé avant l'ouverture de
  la saisie.
- **K19b. Présence lors des événements ?** De l'équipe hors dimanche : « Présences d'équipiers aux
  événements » (K8c).
- **K20a. Qui compte les intégrations en FIJ ?** Intégration seule ; Coordo FIJ garde la carte et
  ses statistiques par département sans recompter les intégrations.
- **K20b. Perte : après combien de temps ?** 3 mois (formule en K4a).
- **K21. Baptisés par session ou par mois ?** Par mois : « Baptisés », « Sessions de baptême » et
  « Baptisés à la dernière session du mois ». La moyenne « Baptisés par session » se calcule ; « à la
  dernière session » est la valeur du dernier mois qui a une session, exacte même s'il y a eu deux
  sessions dans le mois.
- **K22a. Retard du culte ?** On saisit l'heure réelle de début chaque dimanche (unité « heure »,
  minutes depuis minuit, 0 à 1439, affichée « 10 h 42 ») et l'heure prévue en « à ce jour ». Le
  retard est une différence signée calculée, en minutes : « 7 min de retard », « 3 min d'avance ».
  Aucune unité « minutes » saisie.
- **K22b. Tolérance ?** 5 minutes après l'heure prévue. Coordination saisit chaque mois les
  événements commencés à l'heure **parmi les événements déclarés dans l'outil et terminés dans le
  mois** ; la part se calcule sur les réalisés de l'église du même mois (une seule population).
- **K23. Dernière période ?** Le dernier mois écoulé ; le mois en cours s'affiche à part.
- **K24. Publications, contenus, campagnes ?** Publication : une mise en ligne sur un compte de
  l'église (la même sur deux plateformes compte une fois). Contenu produit : visuel, vidéo ou texte
  créé dans le mois, publié ou non. Campagne : ensemble de publications autour d'un thème, comptée le
  mois où elle se termine.
- **K25a. Origine des demandes ?** Ministères et équipe pastorale, par le canal habituel de
  Communication ; aucun nom ni objet n'entre dans l'outil.
- **K25b. Délai de référence ?** La date convenue, sinon 7 jours calendaires.
- **K25c. Demandes reçues ?** Oui, au mois.
- **K26a. Engagement ?** Interactions ÷ portée du même mois, toutes plateformes, en %.
- **K26b. Portée cumulée depuis quand ?** Depuis le 1er janvier : somme des portées mensuelles. C'est
  une somme de portées, pas de personnes, et la définition le dit.
- **K27a. Bénéficiaires ?** Passages du mois : chaque aide compte une fois.
- **K27b. Personnes accompagnées ?** Au moins un entretien de suivi dans le mois ; nouveaux
  bénéficiaires : première aide dans le mois. Trois totaux sensibles, sans lien entre eux.
- **K28. Partenariats et actions externes ?** Deux chiffres : « Partenariats actifs » (à ce jour)
  et « Actions externes » (mois).
- **K29a. Projet de Film ?** Une production vidéo (film, clip, reportage) avec une date de livraison
  convenue au lancement ; livré dans les délais : à cette date ou avant.
- **K29b. Délai moyen de production ?** Gardé et produit : Film saisit chaque mois la somme des jours
  de production de ses projets terminés (unité « jours ») ; délai moyen = jours ÷ projets terminés.
  Le taux de livraison dans les délais se calcule aussi.
- **K31a. Origine des demandes de Tech ?** Ministères et équipe, par le canal de support de Tech ;
  un total, sans nom ni contenu.
- **K31b. Incident récurrent ?** Même cause déjà survenue dans les 30 jours ; chaque répétition
  compte une fois.
- **K31c. Temps moyen de résolution ?** Produit : somme des jours de résolution du mois ÷ demandes
  résolues.
- **K32. Live et diffusion en direct ?** Un seul indicateur « Diffusions en direct », qui sert les
  lignes 96 et 97 et nomme les deux mots dans sa définition. Question posée à MCAD à la relecture :
  s'il les distingue, deux prévus sont créés avant la première saisie.
- **K33a. Incidents techniques = somme ?** Oui : audio + vidéo + interruptions, calcul « somme » ;
  un incident compte dans une seule catégorie (une coupure compte en interruption seulement).
- **K33b. Par dimanche ou par mois ?** Par mois.
- **K34. Spectateurs du direct ?** Le pic de spectateurs simultanés du culte, chaque dimanche, sans
  somme de l'année.
- **K35a. Prière des Stars ?** Aucun jour supposé : sessions, présents et attendus se saisissent au
  rythme « dimanche » pour la semaine du lundi au dimanche, séances additionnées ; 0 session une
  semaine sans prière.
- **K35b. Session « Autre rassemblement » ?** Non : MPI compte seul ses présents, donc personne
  n'est compté deux fois. Si la coordination veut les STARs de chaque ministère, l'administration
  peut déclarer des sessions « Autre rassemblement », qui existent déjà.
- **K36a. Chaîne de prière et nuit ?** Deux chiffres : « Chaîne de prière : présents » et
  « Chaîne de prière : présents la nuit ».
- **K36b. Saisie du dimanche matin ?** Oui : drapeau « saisi le dimanche matin » sur l'indicateur ;
  tant qu'on est dimanche (Paris), le formulaire propose le dimanche du jour au lieu du dimanche de
  référence précédent. La base accepte déjà ce dimanche.
- **K37a. Sainte cène ?** Des portions distribuées ; l'équipe se compte à part, à ce jour.
- **K37b. Taux de participation ?** Présents ÷ attendus, deux comptes saisis par MPI (inscrits ou
  prévus au planning), jamais une moyenne de taux.
- **K38. Prise en charge, intervention, incident (Santé) ?** Prises en charge : personnes, une fois
  chacune ; interventions : gestes de l'équipe (soin, appel aux secours) ; incidents avec
  intervention : malaise, chute, accident ; orientations : personnes orientées vers une structure ou
  un professionnel. Quatre totaux sensibles par mois écoulé.
- **K39a. Ventes : quand ?** Au mois, tous lieux confondus.
- **K39b. Marge ?** Chiffre d'affaires moins coût d'achat des articles vendus du mois (saisi en
  euros), différence signée, « estimée » parce que les frais généraux sont exclus.
- **K39c. Articles les plus vendus ?** Gardé : trois comptes par catégorie (vêtements, accessoires,
  autres articles) et un graphique de barres triées du dernier mois écoulé (« Plus vendu en
  septembre : vêtements, 42 »).
- **K40a. Mag et photo ?** Deux chiffres de la semaine, au rythme « dimanche ».
- **K40b. Formations et projets ?** Les formations en cours comptent dans « Projets en cours » ;
  les personnes formées se comptent à part (« Personnes formées (total) »).
- **K41a. Budget ?** « Budget matériel prévu », euros, à ce jour, première valeur 5 164 € (le devis).
- **K41b. Location ?** Oui, en plus du chiffre : point d'attention écrit par Production à sa première
  connexion (« Besoin de matériel en location pour les camps et la conférence : aucun achat ni
  location possible cette année. »).
- **K42a. Catégories ?** « Chanteurs de l'équipe » et « Musiciens de l'équipe », à ce jour ; une
  catégorie de plus s'ajoute à l'écran.
- **K42b. Répétitions par semaine ?** Aucun nombre fixé : présents et attendus de la semaine,
  séances additionnées.
- **K42c. Présence sur quel total ?** Les présences attendues de la même semaine.
- **K43a et K44a. Activité et projet ?** Activité : action ponctuelle (atelier, rencontre, sortie).
  Projet : initiative de plusieurs semaines, comptée le mois où elle aboutit.
- **K43b. Femmes mobilisées, bénévoles actives, participantes ?** Femmes mobilisées : « STARs au
  service » de Kumi (tous ceux qui ont servi chez Kumi le dimanche, K8b). Bénévoles actives :
  « STARs actifs » de Kumi (ministère principal). Participantes : public des activités, compte du
  mois.
- **K43c. Profil actif des Pages Roses ?** Celui que la plateforme compte comme actif ; Kumi reporte
  son chiffre.
- **K44b. Bénévoles actifs d'Eagles ?** « STARs actifs » d'Eagles, affiché « Bénévoles actifs ».
- **K55. Nouvelles intégrations dans les équipes ?** Kumi et Eagles comptent les leurs chaque mois ;
  MDS compte les nouveaux STARs de l'église. Sens différents, jamais additionnés.
- **K45a. Entretien : semaine ou mois ?** Mois ; problèmes en attente : stock à ce jour.
- **K45b. Délai moyen ?** Produit : somme des jours (unité « jours ») ÷ problèmes résolus ; délai
  d'attente moyen = jours d'attente ÷ problèmes en attente (deux « à ce jour »).
- **K46a. Coordo FIJ = ministère FIJ ?** Oui, code `fij`, nom affiché « Coordo FIJ ».
- **K46b. « Stars habituelles » ?** Lu « stats habituelles ».
- **K47a. Quels chiffres ?** Quatre rubriques par département (75, 77, 78, 91, 92, 93, 94, 95) :
  présents au culte EJP, présents à la réunion FIJ, présents à l'évangélisation, membres du mardi,
  dans une table `fij_statistique` sur le modèle de `fij_departement`, construite **avant la mise en
  service**. Total par rubrique et complétude « 8 dép. sur 8 » calculés. La carte des FIJ reste.
- **K47b. Le mardi ?** « Membres du mardi » se saisit dans la semaine qui se termine le dimanche ;
  les trois présences aussi.
- **K47c. Étapes du parcours ?** Quatre totaux par mois : nouveaux (première venue dans le mois),
  réguliers (au moins trois venues dans le mois), membres (total des « Membres du mardi » de la
  dernière semaine du mois, lu dans la table, sans seconde saisie), au service (jeunes des FIJ qui
  ont servi au moins un dimanche du mois dans un ministère, à ne pas confondre avec « dont en FIJ »,
  qui compte les STARs actifs membres d'une FIJ).
- **K48a. Langues couvertes ?** Ce dimanche.
- **K48b. Bénéficiaires de la traduction ?** « Personnes servies par la traduction », un total du
  dimanche.
- **K49a. Postes ?** Selon le dimanche : « Postes à tenir » et « Postes tenus ».
- **K49b. Incident et intervention ?** Incident : fait anormal constaté ; intervention : action d'un
  agent en réponse. Deux comptes du mois, non sensibles, dont les définitions excluent les malaises,
  soins et secours, comptés par Santé.
- **K50a. Formation = EJP Formation ?** Oui.
- **K50b. PCNC ?** Sigle gardé tel quel, nom du parcours.
- **K50c. Questionnaire de satisfaction ?** L'outil n'en crée pas : il reçoit deux comptes mensuels
  anonymes (réponses, réponses satisfaites). Sans questionnaire : « Non calculé ».
- **K51. Protocole ?** Les chiffres communs seulement ; modèle « aucun ».
- **K52a. Total de registre de MDS ?** Non : la fiche de MDS affiche les totaux de l'église « STARs
  actifs » et « STARs au service » en lignes de référence, avec leur complétude.
- **K52b. Nouveaux STARs ?** Comptés par MDS seul, au mois.
- **K53a. Badges distribués ?** Par mois ; le cumul est la somme de l'année.
- **K53b. Recrutement abouti ?** Candidature du formulaire qui mène à une intégration dans une
  équipe, comptée le mois de l'intégration ; non abouti : close sans intégration, comptée le mois de
  la clôture.
- **K54a. Nouveaux enfants ?** Venus pour la première fois à Prodiges Junior, par mois écoulé ;
  « Enfants déjà venus » compte ceux du mois qui étaient déjà venus avant. Aucun calcul ne combine
  ces deux sensibles.
- **K54b. Une session est-elle un dimanche ?** Oui : « Sessions réalisées » = dimanches du mois où
  « Enfants présents » dépasse 0, lu dans une colonne de la vue de suivi, sans saisie. Repli si une
  session se tient sans enfant : un compte du mois saisi du même nom.

### 2.4 Anciennes phases 2 et 3

- **K9. Événements couverts ?** Un compte du mois saisi par chaque ministère qui couvre, avec sa
  propre définition (prévu propre à MCAD, Santé, Production, Multilingue, Sécurité) ; le taux de
  couverture se calcule avec « Événements à couvrir ». Aucun total de l'église (un événement serait
  compté plusieurs fois) et aucun contrôle tiré des mentions (une mention ne prouve pas la
  couverture, T32).
- **K10a. Prévu ?** Dernier état « Validé » ou « En préparation », daté d'aujourd'hui ou après
  (Paris). Pour un mois passé : les événements datés du mois dont l'historique a atteint « Validé ».
  « En attente de validation » se compte à part (« 2 en attente ») ; un brouillon jamais.
- **K10b. Reporté ?** Une ligne d'état dont la date est plus tardive que celle de la ligne
  précédente du même événement, lu dans l'historique, sans nouvel état. Compté dans le mois de la
  date quittée ; l'événement entre comme prévu dans son nouveau mois.
- **K10c. Taux de réalisation ?** Réalisés ÷ (réalisés + annulés + passés sans état final), sur les
  mois écoulés, avec le nombre (« 9 sur 10 »). « Passé sans état final » : date passée, dernier état
  « Validé » ou « En préparation ». Les reportés s'affichent à côté, hors du taux.
- **K11. Coordination compte quels événements ?** Ceux de toute l'église, en totaux par mois (prévus,
  réalisés, annulés, reportés, en attente, passés sans état final), sans titre, sans date
  d'événement, sans détail par ministère, par une fonction `private` en `security definer` appelée
  par une fonction `public` en `security invoker`. Lecteurs : le ministère de code `coordination`
  (code posé par migration), le berger, le conseil et EJP Tech ; un autre ministère et
  l'administration ne reçoivent rien (tests pgTAP). C'est une exception écrite à la règle « un
  ministère ne voit que sa fiche » : des totaux, jamais un détail. Comme `ajouter_evenement` refuse
  une date passée, les comptages partent de la mise en service, et l'écran nomme ce départ
  par sa date (« Depuis la mise en service, le ... ») jusqu'au 1er janvier 2027. Fraîcheur à la place d'une complétude :
  « 3 événements passés sans état final ».
- **K12. Chiffres d'un ministère sur la vue de l'église ?** Non : la vue de l'église garde les
  chiffres communs, les sessions et la carte. Les chiffres propres se lisent sur les fiches.
- **K57. Complétude des activités ?** Sans objet : aucune nature « activité » ; tout se saisit au
  dimanche, au mois ou à ce jour, avec la complétude de la règle 13.
- **Phases 2 et 3 (P29).** Plus rien n'est conditionnel. **Avant la mise en service** : tout ce qui
  sert à saisir (catalogue complet, unités « heure » et « jours », sensibles et seuil, statistiques
  FIJ par département, drapeaux du catalogue, calculs à deux sources de T35, libellés des communs).
  **Dans les 4 semaines qui suivent** : ce qui ne fait que lire des données déjà saisies (calculs
  étendus, comptages d'événements, graphiques, courbes de fin de mois, série de l'église). Une
  lecture construite après coup ne perd aucune donnée ; une saisie construite après coup en perd.

### 2.5 Configuration des indicateurs (Q1 à Q21)

- **Q1.** Lot 1 avant la mise en service, lot 2 après, et le lot 2 est confirmé (C2).
- **Q2.** 3 ajouts d'un ministère au lot 1, 3 par 30 jours au lot 2 (retirés compris, refusés non
  compris) ; 30 lignes par fiche, saisis et calculs, prévus compris (K13a).
- **Q3.** Oui : un ministère ne lit que les définitions des communs et des siennes.
- **Q4.** Plafond par sorte, sans colonne `groupe` (convention R2) ; unités « heure » (0 à 1439) et
  « jours » (0 à 99 999) dès le lot 1 ; pas d'unité « minutes » (K22a). Modifie T33 et T35.
- **Q5.** Oui, bouton « Créer » des prévus.
- **Q6.** Oui, retrait sans suppression ni réactivation.
- **Q7.** Oui, par l'administration ou EJP Tech tant que rien n'est saisi, puis par remplacement ; le
  ministère corrige ses ajouts selon T30.
- **Q8.** « Mes indicateurs » avec l'étape 6, avant la mise en service.
- **Q9.** Non, inversée : les lignes brutes sensibles ne sont lisibles que par le ministère (K5c).
- **Q10.** Oui : les textes d'EJP Tech ne passent pas en relecture, comme ceux de l'administration.
- **Q11.** Un indicateur retiré pour confidentialité disparaît de la lecture de `mesure` par l'API
  pour tous les profils, EJP Tech compris ; l'export de fin de vie se fait hors de l'API (K5c).
- **Q12.** Oui, 3 ajouts visibles du berger et du conseil, marqués « à valider ».
- **Q13.** Sur demande écrite de l'administration ou de la coordination, notée dans le motif ; deux
  gestes qu'EJP Tech fait seul : la validation des ajouts (T30) et le retrait pour confidentialité
  urgent, tracés au journal.
- **Q14.** Oui, avec un motif obligatoire et une ligne de journal.
- **Q15.** Oui : définitions et usage, jamais les valeurs.
- **Q16.** Oui : « A saisi des chiffres : Publications (septembre) », sans valeur.
- **Q17.** EJP Tech, à partir de la liste et de ce document ; relecture avant l'ouverture (K16).
- **Q18.** Suggestions pour les autres ministères : Événements couverts, Événements à couvrir,
  Mobilisés aux événements, Demandes reçues, Demandes traitées, Projets en cours, Personnes formées,
  Activités réalisées, Participants, Nouveaux participants, Projets réalisés. Une demande de la
  coordination n'est **jamais** une suggestion : c'est un prévu, créé par « Créer » (section 4).
- **Q19.** Règle de K3.
- **Q20.** Sans objet : l'heure réelle se saisit, l'avance s'affiche comme un écart négatif.
- **Q21.** Répondues ce jour par EJP Tech, révisables par la coordination.

### 2.6 Validation métier (V1 à V8)

Aucune question ouverte : V1 à V8 ont reçu leur réponse le 6 octobre. Avec le seuil de K5c, la
confirmation « Vérifiez ce chiffre » d'un indicateur sensible ne montre toujours que les valeurs du
ministère, ce qui reste compatible.

## 3. Couverture des 185 demandes

« Ligne » renvoie au numéro de ligne de `docs/sources/kpi-coordination-2026-10.md`, comme l'annexe de
`kpi-ministeres.md`. Les graphiques de la ligne 28 comptent pour trois demandes.

**Lots** : « V1 » = construit avant la mise en service (migration et écrans de la vague 1) ;
« V1+4 » = lecture livrée dans les 4 semaines après la mise en service, sur des données saisies dès
le premier jour.

**Unités** : nombre (0 à 9 999), grand nombre (0 à 9 999 999), euros (0 à 9 999 999), heure (0 h 00 à
23 h 59), jours (0 à 99 999).

### Intégration (15 demandes, annexe : 15)

| Ligne | Demande                                 | Mécanisme        | Indicateur ou source                                                 | Rythme, unité    | Formule                                                          | Sensible | Lot  |
| ----- | --------------------------------------- | ---------------- | -------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------- | -------- | ---- |
| 16    | NA du dimanche                          | Saisi            | Nouveaux arrivants (NA)                                              | Dimanche, nombre | valeur du dimanche                                               | non      | V1   |
| 17    | NA cumulés depuis le début de l'année   | Somme de l'année | Nouveaux arrivants (NA)                                              | Dimanche, nombre | somme des dimanches depuis le départ                             | non      | V1   |
| 18    | NC du dimanche                          | Saisi            | Nouveaux convertis (NC)                                              | Dimanche, nombre | valeur du dimanche                                               | non      | V1   |
| 19    | NC cumulés depuis le début de l'année   | Somme de l'année | Nouveaux convertis (NC)                                              | Dimanche, nombre | somme des dimanches depuis le départ                             | non      | V1   |
| 20    | Présents à Welcome Prodiges par session | Calcul           | Welcome Prodiges : présents par session                              | Mois, nombre     | moyenne : présents ÷ sessions du mois                            | non      | V1   |
| 21    | Total cumulé des présents à WP          | Somme de l'année | Welcome Prodiges : présents                                          | Mois, nombre     | somme des mois depuis le départ                                  | non      | V1   |
| 22    | Taux de retour des NA                   | Calcul           | Taux de retour des NA                                                | Mois, %          | NA revenus au culte (m) ÷ somme des NA des dimanches (m-1)       | non      | V1+4 |
| 23    | Intégrations en FIJ depuis janvier      | Saisi et somme   | Intégrés en FIJ (NA et NC)                                           | Mois, nombre     | somme des mois depuis le départ                                  | non      | V1   |
| 24    | Taux de conversion NA vers FIJ          | Calcul           | Taux de conversion NA vers FIJ                                       | Mois, %          | intégrés en FIJ ÷ (somme NA + somme NC des dimanches du mois)    | non      | V1+4 |
| 25    | Taux de perte                           | Calcul           | Taux de perte                                                        | Mois, %          | sans nouvelles après 3 mois (m) ÷ (NA + NC des dimanches de m-3) | non      | V1+4 |
| 26    | Présence chaque dimanche au culte       | Commun           | STARs au service d'Intégration, affiché « Équipe présente au culte » | Dimanche, nombre | chiffre commun (K19a, relu)                                      | non      | V1   |
| 27    | Présence lors des événements            | Saisi            | Présences d'équipiers aux événements                                 | Mois, nombre     | somme de présences                                               | non      | V1   |
| 28    | Graphique : évolution NA et NC          | Graphique        | G1                                                                   | 26 dimanches     | deux séries                                                      | non      | V1+4 |
| 28    | Graphique : présents à Welcome Prodiges | Graphique        | G2                                                                   | 12 mois          | trois séries                                                     | non      | V1+4 |
| 28    | Graphique : parcours NA, retour, FIJ    | Graphique        | G3                                                                   | 12 mois          | trois totaux côte à côte                                         | non      | V1+4 |

### Coordination (11 demandes, annexe : 11)

| Ligne | Demande                                         | Mécanisme             | Indicateur ou source                                           | Rythme, unité   | Formule                                                                 | Sensible | Lot             |
| ----- | ----------------------------------------------- | --------------------- | -------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------- | -------- | --------------- |
| 33    | Événements réalisés depuis janvier              | Dérivé des événements | Événements réalisés (église)                                   | Mois, nombre    | dernier état « Terminé », somme depuis la mise en service, puis janvier | non      | V1+4            |
| 34    | Événements prévus                               | Dérivé des événements | Événements prévus (église)                                     | Mois, nombre    | K10a                                                                    | non      | V1+4            |
| 35    | Événements réalisés, dernière période           | Dérivé des événements | Événements réalisés (église)                                   | Mois, nombre    | dernier mois écoulé, mois en cours à part (K23)                         | non      | V1+4            |
| 36    | Baptisés à la dernière session                  | Saisi                 | Baptême : baptisés à la dernière session du mois               | Mois, nombre    | valeur du dernier mois qui a une session                                | non      | V1              |
| 37    | Baptisés depuis janvier                         | Somme de l'année      | Baptême : baptisés                                             | Mois, nombre    | somme des mois depuis le départ                                         | non      | V1              |
| 38    | Événements annulés                              | Dérivé des événements | Événements annulés (église)                                    | Mois, nombre    | dernier état « Annulé », date dans le mois                              | non      | V1+4            |
| 39    | Événements reportés                             | Dérivé des événements | Événements reportés (église)                                   | Mois, nombre    | date repoussée dans l'historique, mois de la date quittée (K10b)        | non      | V1+4            |
| 40    | Taux de réalisation des événements              | Calcul                | Taux de réalisation des événements                             | Mois, %         | réalisés ÷ (réalisés + annulés + passés sans état final)                | non      | V1+4            |
| 41    | Événements commencés à l'heure                  | Saisi et calcul       | Événements commencés à l'heure ; Part des événements à l'heure | Mois, %         | commencés à l'heure ÷ réalisés de l'église du mois, plafond 100 %       | non      | V1, calcul V1+4 |
| 42    | Heure de début de culte                         | Saisi                 | Heure de début du culte (et Heure prévue du culte)             | Dimanche, heure | valeur ; retard = différence signée (calcul V1+4)                       | non      | V1              |
| 43    | Graphique : prévus, réalisés, annulés, reportés | Graphique             | G4                                                             | 12 mois         | quatre séries d'événements                                              | non      | V1+4            |

### Communication (9 demandes, annexe : 9)

| Ligne | Demande                                       | Mécanisme              | Indicateur ou source                                                                                  | Rythme, unité                   | Formule                                                      | Sensible | Lot              |
| ----- | --------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------ | -------- | ---------------- |
| 47    | Publications réalisées                        | Saisi                  | Publications                                                                                          | Mois, nombre                    | valeur et somme de l'année                                   | non      | V1               |
| 48    | Campagnes réalisées                           | Saisi                  | Campagnes terminées                                                                                   | Mois, nombre                    | valeur et somme de l'année                                   | non      | V1               |
| 49    | Contenus produits                             | Saisi                  | Contenus produits                                                                                     | Mois, nombre                    | valeur et somme de l'année                                   | non      | V1               |
| 50    | Portée cumulée                                | Relevé externe mensuel | Portée (toutes plateformes)                                                                           | Mois, grand nombre              | somme des portées depuis le départ                           | non      | V1               |
| 51    | Taux d'engagement (par semaine)               | Calcul                 | Taux d'engagement                                                                                     | Mois, %                         | interactions ÷ portée du même mois (K1b : au mois)           | non      | V1               |
| 52    | Évolution vues et abonnés, toutes plateformes | Relevé et calcul       | Vues (toutes plateformes) ; Abonnés (toutes plateformes) ; Évolution des vues ; Évolution des abonnés | Mois et à ce jour, grand nombre | écart au mois précédent et depuis janvier, en nombre et en % | non      | V1, calculs V1+4 |
| 54    | Demandes traitées                             | Saisi                  | Demandes traitées (et Demandes reçues)                                                                | Mois, nombre                    | valeur et somme de l'année                                   | non      | V1               |
| 55    | Taux de demandes traitées dans les délais     | Calcul                 | Taux de demandes traitées dans les délais                                                             | Mois, %                         | traitées dans les délais ÷ traitées, plafond 100 %           | non      | V1               |
| 56    | Graphique : contenu produit et portée         | Graphique              | G5                                                                                                    | 12 mois                         | deux séries                                                  | non      | V1+4             |

### Social (7 demandes, annexe : 7)

| Ligne | Demande                          | Mécanisme        | Indicateur ou source                   | Rythme, unité             | Formule                         | Sensible | Lot |
| ----- | -------------------------------- | ---------------- | -------------------------------------- | ------------------------- | ------------------------------- | -------- | --- |
| 60    | Actions sociales réalisées       | Saisi            | Actions sociales                       | Mois, nombre              | valeur                          | non      | V1  |
| 61    | Bénéficiaires                    | Saisi            | Bénéficiaires (passages)               | Mois écoulé, nombre       | valeur, seuil « moins de 3 »    | oui      | V1  |
| 62    | Personnes accompagnées           | Saisi            | Personnes accompagnées                 | Mois écoulé, nombre       | valeur, seuil                   | oui      | V1  |
| 63    | Nouveaux bénéficiaires           | Saisi            | Nouveaux bénéficiaires                 | Mois écoulé, nombre       | valeur, seuil                   | oui      | V1  |
| 64    | Partenariats et actions externes | Saisi            | Partenariats actifs ; Actions externes | À ce jour et mois, nombre | deux valeurs                    | non      | V1  |
| 65    | Actions réalisées depuis janvier | Somme de l'année | Actions sociales                       | Mois, nombre              | somme des mois depuis le départ | non      | V1  |
| 66    | Fonds levés (en euros)           | Saisi            | Fonds levés                            | Mois, euros               | valeur et somme de l'année      | non      | V1  |

### Film (9 demandes, annexe : 9)

| Ligne | Demande                           | Mécanisme              | Indicateur ou source              | Rythme, unité      | Formule                                          | Sensible | Lot |
| ----- | --------------------------------- | ---------------------- | --------------------------------- | ------------------ | ------------------------------------------------ | -------- | --- |
| 70    | Tournages réalisés                | Saisi                  | Tournages                         | Mois, nombre       | valeur                                           | non      | V1  |
| 71    | Vidéos produites                  | Saisi                  | Vidéos produites                  | Mois, nombre       | valeur                                           | non      | V1  |
| 72    | Vidéos publiées                   | Saisi                  | Vidéos publiées                   | Mois, nombre       | valeur                                           | non      | V1  |
| 73    | Projets en cours                  | Saisi                  | Projets en cours                  | À ce jour, nombre  | valeur et date                                   | non      | V1  |
| 74    | Projets terminés                  | Saisi                  | Projets terminés                  | Mois, nombre       | valeur                                           | non      | V1  |
| 75    | Projets livrés dans les délais    | Saisi                  | Projets livrés dans les délais    | Mois, nombre       | valeur                                           | non      | V1  |
| 76    | Vues cumulées                     | Relevé externe mensuel | Vues des vidéos Film              | Mois, grand nombre | somme des vues mensuelles depuis le départ       | non      | V1  |
| 77    | Délai moyen de production         | Calcul                 | Délai moyen de production         | Mois, jours        | jours de production ÷ projets terminés           | non      | V1  |
| 78    | Taux de livraison dans les délais | Calcul                 | Taux de livraison dans les délais | Mois, %            | livrés dans les délais ÷ terminés, plafond 100 % | non      | V1  |

### Tech (8 demandes, annexe : 8)

| Ligne | Demande                           | Mécanisme | Indicateur ou source            | Rythme, unité     | Formule                                 | Sensible | Lot  |
| ----- | --------------------------------- | --------- | ------------------------------- | ----------------- | --------------------------------------- | -------- | ---- |
| 82    | Demandes reçues                   | Saisi     | Demandes reçues                 | Mois, nombre      | valeur                                  | non      | V1   |
| 83    | Demandes résolues                 | Saisi     | Demandes résolues               | Mois, nombre      | valeur                                  | non      | V1   |
| 84    | Demandes en cours                 | Saisi     | Demandes en cours               | À ce jour, nombre | valeur et date                          | non      | V1   |
| 85    | Incidents techniques              | Saisi     | Incidents techniques            | Mois, nombre      | valeur                                  | non      | V1   |
| 86    | Temps moyen de résolution         | Calcul    | Temps moyen de résolution       | Mois, jours       | jours de résolution ÷ demandes résolues | non      | V1   |
| 87    | Incidents récurrents              | Saisi     | Incidents récurrents            | Mois, nombre      | valeur                                  | non      | V1   |
| 88    | Taux de résolution des demandes   | Calcul    | Taux de résolution des demandes | Mois, %           | résolues ÷ reçues (peut dépasser 100 %) | non      | V1   |
| 89    | Graphique : demandes et incidents | Graphique | G6                              | 12 mois           | trois séries                            | non      | V1+4 |

### MCAD (19 demandes, annexe : 19)

| Ligne | Demande                            | Mécanisme                  | Indicateur ou source                                                                 | Rythme, unité            | Formule                                                                    | Sensible | Lot  |
| ----- | ---------------------------------- | -------------------------- | ------------------------------------------------------------------------------------ | ------------------------ | -------------------------------------------------------------------------- | -------- | ---- |
| 94    | Événements couverts                | Saisi                      | Événements couverts                                                                  | Mois, nombre             | valeur                                                                     | non      | V1   |
| 95    | Cultes captés                      | Saisi                      | Cultes captés                                                                        | Dimanche, nombre         | valeur                                                                     | non      | V1   |
| 96    | Lives réalisés                     | Saisi                      | Diffusions en direct                                                                 | Mois, nombre             | même indicateur que la ligne 97 (K32, relu)                                | non      | V1   |
| 97    | Diffusions en direct               | Saisi                      | Diffusions en direct                                                                 | Mois, nombre             | même indicateur que la ligne 96                                            | non      | V1   |
| 98    | Contenus audiovisuels produits     | Saisi                      | Contenus audiovisuels produits                                                       | Mois, nombre             | valeur                                                                     | non      | V1   |
| 99    | Plateformes de diffusion utilisées | Saisi                      | Plateformes de diffusion                                                             | À ce jour, nombre        | valeur et date                                                             | non      | V1   |
| 101   | Spectateurs en direct              | Saisi (relevé du dimanche) | Pic de spectateurs du direct                                                         | Dimanche, grand nombre   | valeur, sans somme de l'année                                              | non      | V1   |
| 102   | Vues cumulées                      | Relevé externe mensuel     | Vues des diffusions MCAD                                                             | Mois, grand nombre       | somme des vues mensuelles depuis le départ                                 | non      | V1   |
| 103   | Vues par événement                 | Calcul                     | Vues par événement couvert                                                           | Mois, grand nombre       | moyenne : vues ÷ événements couverts                                       | non      | V1   |
| 104   | Évolution de l'audience            | Calcul                     | Évolution de l'audience                                                              | Dimanche, %              | écart au dimanche précédent ; s'il manque, « dimanche 20 sept. non saisi » | non      | V1+4 |
| 106   | Incidents techniques               | Calcul                     | Incidents techniques                                                                 | Mois, nombre             | somme : audio + vidéo + interruptions                                      | non      | V1+4 |
| 107   | Problèmes audio                    | Saisi                      | Problèmes audio                                                                      | Mois, nombre             | valeur                                                                     | non      | V1   |
| 108   | Problèmes vidéo                    | Saisi                      | Problèmes vidéo                                                                      | Mois, nombre             | valeur                                                                     | non      | V1   |
| 109   | Interruptions de diffusion         | Saisi                      | Interruptions de diffusion                                                           | Mois, nombre             | valeur                                                                     | non      | V1   |
| 110   | Taux de couverture des événements  | Calcul                     | Taux de couverture des événements                                                    | Mois, %                  | couverts ÷ à couvrir, plafond 100 %                                        | non      | V1   |
| 112   | Équipiers mobilisés                | Commun et saisi            | STARs au service de MCAD, affiché « Équipiers mobilisés » ; Mobilisés aux événements | Dimanche et mois, nombre | chiffre commun ; somme de présences hors dimanche                          | non      | V1   |
| 113   | Personnes formées                  | Saisi                      | Personnes formées                                                                    | Mois, nombre             | valeur et somme de l'année                                                 | non      | V1   |
| 114   | Nouveaux équipiers intégrés        | Saisi                      | Nouveaux équipiers intégrés                                                          | Mois, nombre             | valeur                                                                     | non      | V1   |
| 115   | Taux de présence des équipiers     | Calcul                     | Taux de présence des équipiers                                                       | Mois, %                  | postes tenus ÷ postes prévus, plafond 100 %                                | non      | V1   |

### MPI (12 demandes, annexe : 12)

| Ligne | Demande                                       | Mécanisme        | Indicateur ou source                               | Rythme, unité                     | Formule                                | Sensible | Lot  |
| ----- | --------------------------------------------- | ---------------- | -------------------------------------------------- | --------------------------------- | -------------------------------------- | -------- | ---- |
| 122   | Présents à la Prière des Stars                | Saisi et calcul  | Prière des Stars : présents ; présents par session | Semaine (dimanche), nombre        | valeur ; moyenne : présents ÷ sessions | non      | V1   |
| 123   | Sessions réalisées (Prière des Stars)         | Saisi            | Prière des Stars : sessions                        | Semaine (dimanche), nombre        | valeur                                 | non      | V1   |
| 124   | Participants cumulés (Prière des Stars)       | Somme de l'année | Prière des Stars : présents                        | Semaine (dimanche), nombre        | somme de présences depuis le départ    | non      | V1   |
| 125   | Taux de participation (Prière des Stars)      | Calcul           | Prière des Stars : taux de participation           | Semaine (dimanche), %             | présents ÷ attendus, plafond 100 %     | non      | V1   |
| 127   | Présents à la chaîne de prière                | Saisi            | Chaîne de prière : présents                        | Dimanche, nombre                  | valeur                                 | non      | V1   |
| 128   | Participants de la nuit du samedi au dimanche | Saisi            | Chaîne de prière : présents la nuit                | Dimanche (dimanche matin), nombre | valeur                                 | non      | V1   |
| 129   | Participants uniques                          | Saisi            | Chaîne de prière : personnes différentes           | Mois, nombre                      | compte du mois, sans somme de l'année  | non      | V1   |
| 130   | Participants cumulés (chaîne de prière)       | Somme de l'année | Chaîne de prière : présents (et présents la nuit)  | Dimanche, nombre                  | somme de présences depuis le départ    | non      | V1   |
| 131   | Taux de participation (chaîne de prière)      | Calcul           | Chaîne de prière : taux de participation           | Dimanche, %                       | présents ÷ attendus, plafond 100 %     | non      | V1   |
| 133   | Personnes dans l'équipe sainte cène           | Saisi            | Sainte cène : personnes dans l'équipe              | À ce jour, nombre                 | valeur et date                         | non      | V1   |
| 134   | Sainte cène distribuées chaque dimanche       | Saisi            | Sainte cène : portions distribuées                 | Dimanche, nombre                  | valeur                                 | non      | V1   |
| 135   | Graphique : participation à la prière         | Graphique        | G7                                                 | 12 semaines                       | trois séries                           | non      | V1+4 |

### Santé (7 demandes, annexe : 7)

| Ligne | Demande                                | Mécanisme       | Indicateur ou source                                                                   | Rythme, unité            | Formule                             | Sensible | Lot |
| ----- | -------------------------------------- | --------------- | -------------------------------------------------------------------------------------- | ------------------------ | ----------------------------------- | -------- | --- |
| 139   | Événements couverts                    | Saisi           | Événements couverts                                                                    | Mois, nombre             | valeur                              | non      | V1  |
| 140   | Prises en charge                       | Saisi           | Prises en charge                                                                       | Mois écoulé, nombre      | valeur, seuil                       | oui      | V1  |
| 141   | Interventions                          | Saisi           | Interventions                                                                          | Mois écoulé, nombre      | valeur, seuil                       | oui      | V1  |
| 142   | Incidents nécessitant une intervention | Saisi           | Incidents avec intervention                                                            | Mois écoulé, nombre      | valeur, seuil                       | oui      | V1  |
| 143   | Orientations vers une structure        | Saisi           | Orientations vers une structure ou un professionnel                                    | Mois écoulé, nombre      | valeur, seuil                       | oui      | V1  |
| 144   | Personnes mobilisées                   | Commun et saisi | STARs au service de Santé, affiché « Personnes mobilisées » ; Mobilisés aux événements | Dimanche et mois, nombre | chiffre commun ; somme de présences | non      | V1  |
| 145   | Taux de couverture des événements      | Calcul          | Taux de couverture des événements                                                      | Mois, %                  | couverts ÷ à couvrir, plafond 100 % | non      | V1  |

La ligne 146 de la source (« Les données médicales individuelles ne doivent pas apparaître dans le
dashboard général ») est une règle et non une demande : elle est tenue par construction (totaux de
mois écoulés, case sensible, seuil, jamais sur la vue de l'église ni dans un email).

### Merch (9 demandes, annexe : 9)

| Ligne | Demande                    | Mécanisme           | Indicateur ou source                                           | Rythme, unité     | Formule                                                   | Sensible | Lot                |
| ----- | -------------------------- | ------------------- | -------------------------------------------------------------- | ----------------- | --------------------------------------------------------- | -------- | ------------------ |
| 150   | Chiffre d'affaires         | Saisi               | Chiffre d'affaires                                             | Mois, euros       | valeur et somme de l'année                                | non      | V1                 |
| 151   | Articles vendus            | Saisi               | Articles vendus                                                | Mois, nombre      | valeur                                                    | non      | V1                 |
| 152   | Commandes                  | Saisi               | Commandes                                                      | Mois, nombre      | valeur                                                    | non      | V1                 |
| 153   | Panier moyen               | Calcul              | Panier moyen                                                   | Mois, euros       | moyenne : chiffre d'affaires ÷ commandes                  | non      | V1                 |
| 154   | Articles les plus vendus   | Saisi et graphique  | Articles vendus : vêtements, accessoires, autres articles ; G9 | Mois, nombre      | barres triées du dernier mois écoulé                      | non      | V1, graphique V1+4 |
| 155   | Stock disponible           | Saisi               | Stock disponible                                               | À ce jour, nombre | valeur, date, courbe de fin de mois                       | non      | V1                 |
| 156   | Produits en stock critique | Saisi               | Produits en stock critique                                     | À ce jour, nombre | valeur et date                                            | non      | V1                 |
| 157   | Marge estimée              | Calcul              | Marge estimée (avec Coût d'achat des articles vendus, saisi)   | Mois, euros       | différence signée : chiffre d'affaires moins coût d'achat | non      | V1+4               |
| 158   | Évolution des ventes       | Calcul et graphique | Évolution des ventes ; G8                                      | Mois, euros et %  | écart au mois précédent et depuis janvier                 | non      | V1+4               |

### Production (5 demandes, annexe : 5)

| Ligne | Demande                                             | Mécanisme                  | Indicateur ou source                                   | Rythme, unité              | Formule                                   | Sensible | Lot |
| ----- | --------------------------------------------------- | -------------------------- | ------------------------------------------------------ | -------------------------- | ----------------------------------------- | -------- | --- |
| 162   | Événements couverts                                 | Saisi                      | Événements couverts                                    | Mois, nombre               | valeur                                    | non      | V1  |
| 164   | Projets produits : mag et photo chaque dimanche     | Saisi et somme             | Mag : projets produits ; Photo : projets produits      | Semaine (dimanche), nombre | deux valeurs et leurs sommes de l'année   | non      | V1  |
| 165   | Projets en cours (formations, mag annulé en mars)   | Saisi                      | Projets en cours ; Projets annulés                     | À ce jour et mois, nombre  | stock ; mars 2026 rattrapé à 1            | non      | V1  |
| 166   | Budget prévu (devis de 5 164 €, besoin de location) | Saisi et point d'attention | Budget matériel prévu ; point d'attention « location » | À ce jour, euros           | première valeur 5 164 €                   | non      | V1  |
| 169   | Personnes formées : 25                              | Saisi                      | Personnes formées (total)                              | À ce jour, nombre          | première valeur 25, courbe de fin de mois | non      | V1  |

### Prodiges Musique (4 demandes, annexe : 4)

| Ligne | Demande                                         | Mécanisme           | Indicateur ou source                          | Rythme, unité         | Formule                              | Sensible | Lot                |
| ----- | ----------------------------------------------- | ------------------- | --------------------------------------------- | --------------------- | ------------------------------------ | -------- | ------------------ |
| 173   | Musiciens et chanteurs mobilisés, par catégorie | Saisi               | Chanteurs de l'équipe ; Musiciens de l'équipe | À ce jour, nombre     | deux valeurs, courbes de fin de mois | non      | V1                 |
| 174   | Morceaux préparés                               | Saisi               | Morceaux préparés                             | Mois, nombre          | valeur                               | non      | V1                 |
| 175   | Morceaux originaux réalisés                     | Saisi               | Morceaux originaux réalisés                   | Mois, nombre          | valeur                               | non      | V1                 |
| 176   | Graphique : taux de présence aux répétitions    | Calcul et graphique | Répétitions : taux de présence ; G10          | Semaine (dimanche), % | présents ÷ attendus, plafond 100 %   | non      | V1, graphique V1+4 |

### Kumi (13 demandes, annexe : 13)

| Ligne | Demande                                         | Mécanisme              | Indicateur ou source                                    | Rythme, unité       | Formule                                                    | Sensible | Lot |
| ----- | ----------------------------------------------- | ---------------------- | ------------------------------------------------------- | ------------------- | ---------------------------------------------------------- | -------- | --- |
| 180   | Activités réalisées                             | Saisi                  | Activités réalisées                                     | Mois, nombre        | valeur                                                     | non      | V1  |
| 181   | Participantes                                   | Saisi                  | Participantes                                           | Mois, nombre        | compte du mois, sans somme de l'année                      | non      | V1  |
| 182   | Nouvelles participantes                         | Saisi                  | Nouvelles participantes                                 | Mois, nombre        | valeur                                                     | non      | V1  |
| 183   | Femmes mobilisées                               | Commun                 | STARs au service de Kumi, affiché « Femmes mobilisées » | Dimanche, nombre    | chiffre commun (K8b)                                       | non      | V1  |
| 184   | Projets réalisés                                | Saisi                  | Projets réalisés                                        | Mois, nombre        | valeur                                                     | non      | V1  |
| 185   | Bénévoles actives                               | Commun                 | STARs actifs de Kumi, affiché « Bénévoles actives »     | À ce jour, nombre   | chiffre commun                                             | non      | V1  |
| 186   | Taux de participation                           | Calcul                 | Taux de participation                                   | Mois, %             | participantes ÷ femmes inscrites en vigueur en fin de mois | non      | V1  |
| 187   | Nouvelles intégrations dans les équipes         | Saisi                  | Nouvelles intégrations dans les équipes                 | Mois, nombre        | valeur (K55)                                               | non      | V1  |
| 189   | Pages Roses : prestataires inscrites            | Relevé externe mensuel | Pages Roses : prestataires inscrites                    | À ce jour, nombre   | stock, courbe de fin de mois                               | non      | V1  |
| 190   | Pages Roses : profils actifs                    | Relevé externe mensuel | Pages Roses : profils actifs                            | À ce jour, nombre   | stock, courbe de fin de mois                               | non      | V1  |
| 191   | Pages Roses : demandes de mise en relation      | Relevé externe mensuel | Pages Roses : demandes de mise en relation              | Mois, nombre        | flux                                                       | non      | V1  |
| 192   | Pages Roses : réservations                      | Relevé externe mensuel | Pages Roses : réservations                              | Mois, nombre        | flux                                                       | non      | V1  |
| 194   | Call your sister : prises en charge par semaine | Saisi                  | Call your sister : prises en charge                     | Mois écoulé, nombre | valeur, seuil (jamais par semaine)                         | oui      | V1  |

### Eagles (8 demandes, annexe : 8)

| Ligne | Demande                                                | Mécanisme | Indicateur ou source                                | Rythme, unité       | Formule                                           | Sensible | Lot |
| ----- | ------------------------------------------------------ | --------- | --------------------------------------------------- | ------------------- | ------------------------------------------------- | -------- | --- |
| 198   | Activités réalisées                                    | Saisi     | Activités réalisées                                 | Mois, nombre        | valeur                                            | non      | V1  |
| 199   | Participants                                           | Saisi     | Participants                                        | Mois, nombre        | compte du mois, sans somme de l'année             | non      | V1  |
| 200   | Nouveaux participants                                  | Saisi     | Nouveaux participants                               | Mois, nombre        | valeur                                            | non      | V1  |
| 201   | Projets réalisés                                       | Saisi     | Projets réalisés                                    | Mois, nombre        | valeur                                            | non      | V1  |
| 202   | Bénévoles actifs                                       | Commun    | STARs actifs d'Eagles, affiché « Bénévoles actifs » | À ce jour, nombre   | chiffre commun                                    | non      | V1  |
| 203   | Taux de participation                                  | Calcul    | Taux de participation                               | Mois, %             | participants ÷ inscrits en vigueur en fin de mois | non      | V1  |
| 204   | Nouvelles intégrations dans les équipes                | Saisi     | Nouvelles intégrations dans les équipes             | Mois, nombre        | valeur (K55)                                      | non      | V1  |
| 206   | La plate-forme d'écoute : prises en charge par semaine | Saisi     | La plate-forme d'écoute : prises en charge          | Mois écoulé, nombre | valeur, seuil (jamais par semaine)                | oui      | V1  |

### Entretien (7 demandes, annexe : 7)

| Ligne | Demande                                 | Mécanisme                  | Indicateur ou source                                                                    | Rythme, unité              | Formule                                | Sensible | Lot |
| ----- | --------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------- | -------- | --- |
| 210   | Problèmes signalés                      | Saisi                      | Problèmes signalés                                                                      | Mois, nombre               | valeur                                 | non      | V1  |
| 211   | Problèmes résolus                       | Saisi                      | Problèmes résolus                                                                       | Mois, nombre               | valeur                                 | non      | V1  |
| 212   | Délai moyen de résolution               | Calcul                     | Délai moyen de résolution (avec Jours pour résoudre les problèmes, saisi)               | Mois, jours                | jours ÷ problèmes résolus              | non      | V1  |
| 213   | Tâches réalisées                        | Saisi et somme             | Tâches réalisées                                                                        | Mois, nombre               | valeur du mois et somme de l'année     | non      | V1  |
| 215   | Personnes actives mobilisées            | Commun                     | STARs au service d'Entretien, affiché « Personnes actives mobilisées »                  | Dimanche, nombre           | chiffre commun                         | non      | V1  |
| 216   | Besoins en matériels                    | Saisi et point d'attention | Produits d'entretien manquants ; Équipements manquants ; point d'attention              | À ce jour, nombre          | deux comptes ; le détail dans un point | non      | V1  |
| 217   | Problèmes en attente et délai d'attente | Saisi et calcul            | Problèmes en attente ; Jours d'attente des problèmes en attente ; Délai d'attente moyen | À ce jour, nombre et jours | jours d'attente ÷ problèmes en attente | non      | V1  |

### Coordo FIJ (2 demandes, annexe : 2)

| Ligne | Demande                                                    | Mécanisme             | Indicateur ou source                                                                     | Rythme, unité              | Formule                                                  | Sensible | Lot                |
| ----- | ---------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------- | -------- | ------------------ |
| 221   | Chiffres habituels par département (présences, mardi, FIJ) | Saisi par département | `fij_statistique` : 4 rubriques × 8 départements ; carte des FIJ existante               | Semaine (dimanche), nombre | total par rubrique, complétude « 8 dép. sur 8 », courbes | non      | V1                 |
| 223   | Graphique : parcours du jeune dans le FIJ                  | Saisi et graphique    | Parcours FIJ : nouveaux, réguliers, au service ; membres lu dans `fij_statistique` ; G11 | Mois, nombre               | quatre totaux côte à côte                                | non      | V1, graphique V1+4 |

### Multilingue (8 demandes, annexe : 8)

| Ligne | Demande                                | Mécanisme       | Indicateur ou source                                                                          | Rythme, unité            | Formule                               | Sensible | Lot |
| ----- | -------------------------------------- | --------------- | --------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------- | -------- | --- |
| 227   | Langues couvertes                      | Saisi           | Langues couvertes                                                                             | Dimanche, nombre         | valeur, sans somme de l'année         | non      | V1  |
| 228   | Événements couverts                    | Saisi           | Événements couverts                                                                           | Mois, nombre             | valeur                                | non      | V1  |
| 229   | Personnes bénéficiant de la traduction | Saisi           | Personnes servies par la traduction                                                           | Dimanche, nombre         | valeur                                | non      | V1  |
| 230   | Interprètes mobilisés                  | Commun et saisi | STARs au service de Multilingue, affiché « Interprètes mobilisés » ; Mobilisés aux événements | Dimanche et mois, nombre | chiffre commun ; somme de présences   | non      | V1  |
| 231   | Taux de couverture des événements      | Calcul          | Taux de couverture des événements                                                             | Mois, %                  | couverts ÷ à couvrir, plafond 100 %   | non      | V1  |
| 232   | Demandes de traduction                 | Saisi           | Demandes de traduction                                                                        | Mois, nombre             | valeur                                | non      | V1  |
| 233   | Demandes satisfaites                   | Saisi et calcul | Demandes satisfaites ; Part des demandes satisfaites                                          | Mois, nombre et %        | satisfaites ÷ demandes, plafond 100 % | non      | V1  |
| 234   | Incidents de traduction                | Saisi           | Incidents de traduction                                                                       | Mois, nombre             | valeur                                | non      | V1  |

### Sécurité (7 demandes, annexe : 7)

| Ligne | Demande                          | Mécanisme       | Indicateur ou source                                                                               | Rythme, unité            | Formule                                      | Sensible | Lot |
| ----- | -------------------------------- | --------------- | -------------------------------------------------------------------------------------------------- | ------------------------ | -------------------------------------------- | -------- | --- |
| 238   | Événements couverts              | Saisi           | Événements couverts                                                                                | Mois, nombre             | valeur                                       | non      | V1  |
| 239   | Agents et bénévoles mobilisés    | Commun et saisi | STARs au service de Sécurité, affiché « Agents et bénévoles mobilisés » ; Mobilisés aux événements | Dimanche et mois, nombre | chiffre commun ; somme de présences          | non      | V1  |
| 240   | Incidents                        | Saisi           | Incidents                                                                                          | Mois, nombre             | valeur (hors faits de santé)                 | non      | V1  |
| 241   | Interventions                    | Saisi           | Interventions                                                                                      | Mois, nombre             | valeur (hors faits de santé)                 | non      | V1  |
| 242   | Exercices et formations réalisés | Saisi           | Exercices et formations                                                                            | Mois, nombre             | valeur                                       | non      | V1  |
| 243   | Taux de couverture des postes    | Calcul          | Taux de couverture des postes                                                                      | Dimanche, %              | postes tenus ÷ postes à tenir, plafond 100 % | non      | V1  |
| 244   | Incidents par événement          | Calcul          | Incidents par événement                                                                            | Mois, nombre             | moyenne : incidents ÷ événements couverts    | non      | V1  |

### Formation (6 demandes, annexe : 6)

| Ligne | Demande                                | Mécanisme | Indicateur ou source                                            | Rythme, unité     | Formule                                                  | Sensible | Lot |
| ----- | -------------------------------------- | --------- | --------------------------------------------------------------- | ----------------- | -------------------------------------------------------- | -------- | --- |
| 248   | Inscrits (PCNC)                        | Saisi     | Inscrits (PCNC)                                                 | À ce jour, nombre | valeur, date, courbe de fin de mois                      | non      | V1  |
| 249   | Taux de présence                       | Calcul    | Taux de présence                                                | Mois, %           | présences ÷ présences attendues, plafond 100 %           | non      | V1  |
| 250   | Personnes ayant terminé les formations | Saisi     | Personnes ayant terminé la formation                            | À ce jour, nombre | valeur, date, courbe de fin de mois                      | non      | V1  |
| 251   | Taux de complétion                     | Calcul    | Taux de complétion                                              | À ce jour, %      | terminé ÷ inscrits, résultat du jour avec les deux dates | non      | V1  |
| 252   | Formateurs mobilisés                   | Commun    | STARs au service de Formation, affiché « Formateurs mobilisés » | Dimanche, nombre  | chiffre commun                                           | non      | V1  |
| 253   | Taux de satisfaction                   | Calcul    | Taux de satisfaction (avec deux comptes anonymes)               | Mois, %           | réponses satisfaites ÷ réponses, plafond 100 %           | non      | V1  |

### MDS (12 demandes, annexe : 12)

| Ligne | Demande                                    | Mécanisme             | Indicateur ou source                                | Rythme, unité     | Formule                                                                 | Sensible | Lot  |
| ----- | ------------------------------------------ | --------------------- | --------------------------------------------------- | ----------------- | ----------------------------------------------------------------------- | -------- | ---- |
| 262   | Nombre total de Stars actifs               | Commun (église)       | ligne de référence « STARs actifs de l'église »     | À ce jour, nombre | total de l'église, complétude « 21 sur 22 »                             | non      | V1   |
| 263   | Nouveaux Stars                             | Saisi                 | Nouveaux STARs                                      | Mois, nombre      | valeur                                                                  | non      | V1   |
| 264   | Stars désactivés                           | Saisi                 | STARs désactivés                                    | Mois, nombre      | valeur                                                                  | non      | V1   |
| 265   | Évolution du nombre de Stars actifs        | Graphique             | G12 (série de l'église et deux barres)              | 12 mois           | total de l'église en fin de mois, complétude par point                  | non      | V1+4 |
| 266   | Recrutements aboutis via le formulaire     | Saisi                 | Recrutements aboutis                                | Mois, nombre      | valeur                                                                  | non      | V1   |
| 267   | Recrutements non aboutis via le formulaire | Saisi                 | Recrutements non aboutis                            | Mois, nombre      | valeur                                                                  | non      | V1   |
| 268   | Stars en service chaque dimanche           | Commun (église)       | ligne de référence « STARs au service de l'église » | Dimanche, nombre  | total du dimanche de référence, complétude                              | non      | V1   |
| 269   | Espaces Care par dimanche                  | Saisi                 | Espaces Care                                        | Dimanche, nombre  | valeur                                                                  | non      | V1   |
| 270   | Événements organisés par an                | Dérivé des événements | Événements organisés (ceux de MDS)                  | Mois, nombre      | dernier état « Terminé », somme depuis la mise en service, puis janvier | non      | V1+4 |
| 272   | Badges distribués                          | Saisi et somme        | Badges distribués                                   | Mois, nombre      | valeur et somme de l'année                                              | non      | V1   |
| 273   | Badges actifs                              | Saisi                 | Badges actifs                                       | À ce jour, nombre | valeur, date, courbe de fin de mois                                     | non      | V1   |
| 274   | Badges en attente                          | Saisi                 | Badges en attente                                   | À ce jour, nombre | valeur, date, courbe de fin de mois                                     | non      | V1   |

### Prodiges Junior (7 demandes, annexe : 7)

| Ligne | Demande                                | Mécanisme               | Indicateur ou source                                                  | Rythme, unité       | Formule                                                    | Sensible | Lot  |
| ----- | -------------------------------------- | ----------------------- | --------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------- | -------- | ---- |
| 278   | Enfants présents chaque dimanche       | Saisi                   | Enfants présents                                                      | Dimanche, nombre    | valeur                                                     | non      | V1   |
| 279   | Nouveaux enfants                       | Saisi                   | Nouveaux enfants                                                      | Mois écoulé, nombre | valeur, seuil                                              | oui      | V1   |
| 280   | Inscrits                               | Saisi                   | Enfants inscrits                                                      | À ce jour, nombre   | valeur, date, courbe de fin de mois                        | non      | V1   |
| 281   | Sessions réalisées                     | Lu dans la vue de suivi | « Sessions réalisées » de « Enfants présents »                        | Mois, nombre        | dimanches du mois où les enfants présents dépassent 0      | non      | V1+4 |
| 282   | Taux de présence                       | Calcul                  | Taux de présence                                                      | Dimanche, %         | enfants présents ÷ enfants inscrits en vigueur ce dimanche | non      | V1   |
| 283   | Animateurs mobilisés                   | Commun                  | STARs au service de Prodiges Junior, affiché « Animateurs mobilisés » | Dimanche, nombre    | chiffre commun                                             | non      | V1   |
| 284   | Enfants revenus à une session suivante | Saisi                   | Enfants déjà venus                                                    | Mois écoulé, nombre | valeur, seuil                                              | oui      | V1   |

### Protocole

Aucune demande dans la liste (K51) : Protocole saisit les trois chiffres communs, pour que les totaux
de l'église restent complets. Modèle « aucun » au catalogue.

### Total

| Ministère        | Demandes | Annexe  | Abandonnées |
| ---------------- | -------- | ------- | ----------- |
| Intégration      | 15       | 15      | 0           |
| Coordination     | 11       | 11      | 0           |
| Communication    | 9        | 9       | 0           |
| Social           | 7        | 7       | 0           |
| Film             | 9        | 9       | 0           |
| Tech             | 8        | 8       | 0           |
| MCAD             | 19       | 19      | 0           |
| MPI              | 12       | 12      | 0           |
| Santé            | 7        | 7       | 0           |
| Merch            | 9        | 9       | 0           |
| Production       | 5        | 5       | 0           |
| Prodiges Musique | 4        | 4       | 0           |
| Kumi             | 13       | 13      | 0           |
| Eagles           | 8        | 8       | 0           |
| Entretien        | 7        | 7       | 0           |
| Coordo FIJ       | 2        | 2       | 0           |
| Multilingue      | 8        | 8       | 0           |
| Sécurité         | 7        | 7       | 0           |
| Formation        | 6        | 6       | 0           |
| MDS              | 12       | 12      | 0           |
| Prodiges Junior  | 7        | 7       | 0           |
| Protocole        | 0        | 0       | 0           |
| **Total**        | **185**  | **185** | **0**       |

**185 demandes couvertes, 0 abandonnée, 0 « à préciser », 0 hors périmètre.** 157 sont servies
avant la mise en service (V1), 28 dans les 4 semaines qui suivent (V1+4) sur des données saisies
dès le premier jour.

## 4. Catalogue de la vague 1

Écrit une fois par la migration `indicateurs_vague_1` dans `private.indicateur_prevu`, puis créé
pour chaque ministère par le bouton « Créer » de l'écran Indicateurs (T35, Q5), avant l'activation
des comptes. Un prévu ne passe pas par la validation d'EJP Tech et ne compte pas dans les 3 ajouts
du ministère ; il compte dans les 30 lignes de la fiche.

- **Libellé** : 60 caractères au plus, sans « Nombre de », sans période ni unité (R1) ; le
  dispositif en tête (« Pages Roses : ») tient lieu de rubrique (R2).
- **Ce qu'on compte exactement** : 10 à 140 caractères, affiché sous le champ et au clic sur le
  libellé.
- **Rythme** : Dimanche ; Semaine = rythme « dimanche », semaine du lundi au dimanche ; Mois ; Mois
  écoulé = mois, sensible ; À ce jour.
- **Borne** : nombre 9 999 ; grand nombre et euros 9 999 999 ; heure 0 h 00 à 23 h 59 ; jours 99 999.
- **Somme** : « non » pose le drapeau `sans_somme` (pas de somme de l'année affichée : personnes
  différentes du mois, pic, heure, jours). Un « à ce jour » n'a jamais de somme.
- **Calcul** : « V1 » = taux ou moyenne de deux indicateurs du même ministère (T35) ; « V1+4 » =
  calcul étendu de `indicateur_terme` (X9). Sur l'année : somme des hauts ÷ somme des bas, sur les
  périodes qui ont toutes les valeurs. « Plafond 100 % » : « Non calculé » si le haut dépasse le bas.

### Intégration

| Libellé                              | Ce qu'on compte exactement                                                                                        | Rythme   | Unité, borne  | Rubrique         | Sensible | Somme |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------- | ------------- | ---------------- | -------- | ----- |
| Nouveaux arrivants (NA)              | Personnes venues au culte pour la première fois ce dimanche, sans décision ce jour. Une personne compte une fois. | Dimanche | nombre, 9 999 | aucune           | non      | oui   |
| Nouveaux convertis (NC)              | Personnes qui prennent ce dimanche une première décision de suivre le Christ. Une personne est NA ou NC.          | Dimanche | nombre, 9 999 | aucune           | non      | oui   |
| Welcome Prodiges : sessions          | Sessions de Welcome Prodiges tenues dans le mois. Si aucune, enregistrez 0.                                       | Mois     | nombre, 9 999 | Welcome Prodiges | non      | oui   |
| Welcome Prodiges : présents          | Personnes accueillies présentes aux sessions du mois, séances additionnées. L'équipe d'accueil n'est pas comptée. | Mois     | nombre, 9 999 | Welcome Prodiges | non      | oui   |
| NA revenus au culte                  | Parmi les NA des dimanches du mois précédent, ceux revenus au moins un dimanche ce mois. Un total, sans liste.    | Mois     | nombre, 9 999 | aucune           | non      | oui   |
| Intégrés en FIJ (NA et NC)           | NA et NC entrés dans une FIJ dans le mois. Une personne compte une fois.                                          | Mois     | nombre, 9 999 | aucune           | non      | oui   |
| Sans nouvelles après 3 mois          | Parmi les NA et NC accueillis il y a 3 mois, ceux dont l'équipe n'a plus de nouvelles. Un total, sans liste.      | Mois     | nombre, 9 999 | aucune           | non      | oui   |
| Présences d'équipiers aux événements | Présences de l'équipe d'Intégration aux événements hors dimanche. Une personne compte à chaque événement.         | Mois     | nombre, 9 999 | aucune           | non      | oui   |

| Calcul                                  | Type    | Formule (sources)                                                                    | Lot  |
| --------------------------------------- | ------- | ------------------------------------------------------------------------------------ | ---- |
| Welcome Prodiges : présents par session | moyenne | Welcome Prodiges : présents ÷ Welcome Prodiges : sessions, moyenne du mois           | V1   |
| Taux de retour des NA                   | taux    | NA revenus au culte (mois m) ÷ somme des NA des dimanches du mois m-1                | V1+4 |
| Taux de conversion NA vers FIJ          | taux    | Intégrés en FIJ ÷ (somme des NA + somme des NC des dimanches du mois)                | V1+4 |
| Taux de perte                           | taux    | Sans nouvelles après 3 mois (m) ÷ (somme des NA + somme des NC des dimanches de m-3) | V1+4 |

Commun affiché : « Équipe présente au culte » (STARs au service).

### Coordination

| Libellé                                          | Ce qu'on compte exactement                                                                                          | Rythme    | Unité, borne         | Rubrique | Sensible | Somme |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | --------- | -------------------- | -------- | -------- | ----- |
| Baptême : baptisés                               | Personnes baptisées dans le mois, toutes sessions de baptême additionnées.                                          | Mois      | nombre, 9 999        | Baptême  | non      | oui   |
| Baptême : sessions                               | Sessions de baptême tenues dans le mois. Si aucune, enregistrez 0.                                                  | Mois      | nombre, 9 999        | Baptême  | non      | oui   |
| Baptême : baptisés à la dernière session du mois | Personnes baptisées à la dernière session de baptême du mois. Si aucune session, enregistrez 0.                     | Mois      | nombre, 9 999        | Baptême  | non      | non   |
| Heure de début du culte                          | Heure réelle à laquelle le culte de ce dimanche a commencé.                                                         | Dimanche  | heure, 0 h à 23 h 59 | aucune   | non      | non   |
| Heure prévue du culte                            | Heure de début prévue du culte du dimanche, à la date de la saisie.                                                 | À ce jour | heure, 0 h à 23 h 59 | aucune   | non      | non   |
| Événements commencés à l'heure                   | Parmi les événements terminés du mois déclarés dans l'outil, ceux commencés au plus 5 minutes après l'heure prévue. | Mois      | nombre, 9 999        | aucune   | non      | oui   |

| Calcul ou série                    | Type                  | Formule (sources)                                                          | Lot  |
| ---------------------------------- | --------------------- | -------------------------------------------------------------------------- | ---- |
| Baptême : baptisés par session     | moyenne               | Baptême : baptisés ÷ Baptême : sessions, moyenne du mois                   | V1   |
| Retard du début du culte           | différence signée     | Heure de début du culte moins Heure prévue du culte en vigueur, en minutes | V1+4 |
| Événements prévus (église)         | comptage d'événements | K10a                                                                       | V1+4 |
| Événements réalisés (église)       | comptage d'événements | dernier état « Terminé », date dans le mois                                | V1+4 |
| Événements annulés (église)        | comptage d'événements | dernier état « Annulé », date dans le mois                                 | V1+4 |
| Événements reportés (église)       | comptage d'événements | date repoussée, mois de la date quittée (K10b)                             | V1+4 |
| Événements en attente (église)     | comptage d'événements | dernier état « En attente de validation »                                  | V1+4 |
| Événements passés sans état final  | comptage d'événements | date passée, dernier état « Validé » ou « En préparation »                 | V1+4 |
| Taux de réalisation des événements | taux                  | réalisés ÷ (réalisés + annulés + passés sans état final)                   | V1+4 |
| Part des événements à l'heure      | taux, plafond 100 %   | Événements commencés à l'heure ÷ Événements réalisés (église)              | V1+4 |

### Communication

| Libellé                           | Ce qu'on compte exactement                                                                                           | Rythme    | Unité, borne            | Rubrique | Sensible | Somme |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------- | ----------------------- | -------- | -------- | ----- |
| Publications                      | Mises en ligne sur un compte de l'église dans le mois. Une publication reprise sur deux plateformes compte une fois. | Mois      | nombre, 9 999           | aucune   | non      | oui   |
| Campagnes terminées               | Ensembles de publications autour d'un thème, comptés le mois où ils se terminent.                                    | Mois      | nombre, 9 999           | aucune   | non      | oui   |
| Contenus produits                 | Visuels, vidéos ou textes créés dans le mois, publiés ou non.                                                        | Mois      | nombre, 9 999           | aucune   | non      | oui   |
| Portée (toutes plateformes)       | Portée du mois relevée sur les statistiques de tous les comptes de l'église, plateformes additionnées.               | Mois      | grand nombre, 9 999 999 | aucune   | non      | oui   |
| Interactions (toutes plateformes) | J'aime, commentaires, partages et enregistrements du mois, relevés sur tous les comptes de l'église.                 | Mois      | grand nombre, 9 999 999 | aucune   | non      | oui   |
| Vues (toutes plateformes)         | Vues du mois relevées sur tous les comptes de l'église, plateformes additionnées.                                    | Mois      | grand nombre, 9 999 999 | aucune   | non      | oui   |
| Abonnés (toutes plateformes)      | Abonnés de tous les comptes de l'église le jour du relevé, plateformes additionnées. Relevé une fois par mois.       | À ce jour | grand nombre, 9 999 999 | aucune   | non      | non   |
| Demandes reçues                   | Demandes de communication reçues des ministères et de l'équipe pastorale dans le mois.                               | Mois      | nombre, 9 999           | aucune   | non      | oui   |
| Demandes traitées                 | Demandes de communication menées à terme dans le mois, quel que soit leur mois d'arrivée.                            | Mois      | nombre, 9 999           | aucune   | non      | oui   |
| Demandes traitées dans les délais | Demandes traitées à la date convenue avec le demandeur, sinon sous 7 jours calendaires.                              | Mois      | nombre, 9 999           | aucune   | non      | oui   |

| Calcul                                    | Type                | Formule (sources)                                                   | Lot  |
| ----------------------------------------- | ------------------- | ------------------------------------------------------------------- | ---- |
| Taux d'engagement                         | taux                | Interactions ÷ Portée, même mois                                    | V1   |
| Taux de demandes traitées dans les délais | taux, plafond 100 % | Demandes traitées dans les délais ÷ Demandes traitées               | V1   |
| Évolution des vues                        | évolution           | Vues : écart au mois précédent et depuis janvier, en nombre et en % | V1+4 |
| Évolution des abonnés                     | évolution           | Abonnés en fin de mois (`v_stock_mois`) : même écart                | V1+4 |

### Social

| Libellé                  | Ce qu'on compte exactement                                                                           | Rythme      | Unité, borne     | Rubrique | Sensible | Somme |
| ------------------------ | ---------------------------------------------------------------------------------------------------- | ----------- | ---------------- | -------- | -------- | ----- |
| Actions sociales         | Actions sociales menées et terminées dans le mois.                                                   | Mois        | nombre, 9 999    | aucune   | non      | oui   |
| Bénéficiaires (passages) | Aides apportées dans le mois. Chaque passage compte une fois, même pour une personne déjà aidée.     | Mois écoulé | nombre, 9 999    | aucune   | oui      | oui   |
| Personnes accompagnées   | Personnes qui ont eu au moins un entretien de suivi dans le mois. Une personne compte une fois.      | Mois écoulé | nombre, 9 999    | aucune   | oui      | oui   |
| Nouveaux bénéficiaires   | Personnes aidées pour la première fois dans le mois. Un total, sans liste.                           | Mois écoulé | nombre, 9 999    | aucune   | oui      | oui   |
| Partenariats actifs      | Partenariats en cours avec des structures extérieures, le jour de la saisie.                         | À ce jour   | nombre, 9 999    | aucune   | non      | non   |
| Actions externes         | Actions menées avec un partenaire extérieur ou chez lui dans le mois.                                | Mois        | nombre, 9 999    | aucune   | non      | oui   |
| Fonds levés              | Fonds levés dans le mois, à l'euro près, sans nom de donateur. La comptabilité de l'église fait foi. | Mois        | euros, 9 999 999 | aucune   | non      | oui   |

Aucun calcul (les sensibles n'en ont pas).

### Film

| Libellé                                  | Ce qu'on compte exactement                                                                                | Rythme    | Unité, borne            | Rubrique | Sensible | Somme |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------- | ----------------------- | -------- | -------- | ----- |
| Tournages                                | Tournages terminés dans le mois.                                                                          | Mois      | nombre, 9 999           | aucune   | non      | oui   |
| Vidéos produites                         | Vidéos montées et terminées dans le mois.                                                                 | Mois      | nombre, 9 999           | aucune   | non      | oui   |
| Vidéos publiées                          | Vidéos de Film mises en ligne dans le mois.                                                               | Mois      | nombre, 9 999           | aucune   | non      | oui   |
| Projets en cours                         | Projets vidéo lancés et pas encore livrés, le jour de la saisie.                                          | À ce jour | nombre, 9 999           | aucune   | non      | non   |
| Projets terminés                         | Projets vidéo livrés dans le mois. Un projet est un film, un clip ou un reportage avec une date convenue. | Mois      | nombre, 9 999           | aucune   | non      | oui   |
| Projets livrés dans les délais           | Projets terminés du mois livrés à la date convenue au lancement, ou avant.                                | Mois      | nombre, 9 999           | aucune   | non      | oui   |
| Vues des vidéos Film                     | Vues du mois des vidéos de Film, relevées sur les statistiques des plateformes où Film publie.            | Mois      | grand nombre, 9 999 999 | aucune   | non      | oui   |
| Jours de production des projets terminés | Somme, pour les projets terminés du mois, des jours calendaires entre lancement et livraison.             | Mois      | jours, 99 999           | aucune   | non      | non   |

| Calcul                            | Type                | Formule (sources)                                           | Lot |
| --------------------------------- | ------------------- | ----------------------------------------------------------- | --- |
| Délai moyen de production         | moyenne             | Jours de production des projets terminés ÷ Projets terminés | V1  |
| Taux de livraison dans les délais | taux, plafond 100 % | Projets livrés dans les délais ÷ Projets terminés           | V1  |

### Tech

| Libellé                                   | Ce qu'on compte exactement                                                                                       | Rythme    | Unité, borne  | Rubrique | Sensible | Somme |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------- | -------- | ----- |
| Demandes reçues                           | Demandes d'aide ou de travail reçues des ministères et de l'équipe dans le mois, sans nom ni objet.              | Mois      | nombre, 9 999 | aucune   | non      | oui   |
| Demandes résolues                         | Demandes closes dans le mois, quel que soit leur mois d'arrivée.                                                 | Mois      | nombre, 9 999 | aucune   | non      | oui   |
| Demandes en cours                         | Demandes ouvertes, pas encore résolues, le jour de la saisie.                                                    | À ce jour | nombre, 9 999 | aucune   | non      | non   |
| Incidents techniques                      | Pannes ou dysfonctionnements des outils numériques de l'église survenus dans le mois.                            | Mois      | nombre, 9 999 | aucune   | non      | oui   |
| Incidents récurrents                      | Incidents du mois dont la même cause s'est déjà produite dans les 30 jours avant. Chaque répétition compte.      | Mois      | nombre, 9 999 | aucune   | non      | oui   |
| Jours de résolution des demandes résolues | Somme, pour les demandes résolues du mois, des jours calendaires entre réception et résolution (0 le jour même). | Mois      | jours, 99 999 | aucune   | non      | non   |

| Calcul                          | Type    | Formule (sources)                                             | Lot |
| ------------------------------- | ------- | ------------------------------------------------------------- | --- |
| Temps moyen de résolution       | moyenne | Jours de résolution des demandes résolues ÷ Demandes résolues | V1  |
| Taux de résolution des demandes | taux    | Demandes résolues ÷ Demandes reçues (peut dépasser 100 %)     | V1  |

### MCAD

| Libellé                        | Ce qu'on compte exactement                                                                                       | Rythme    | Unité, borne            | Rubrique | Sensible | Somme |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- | --------- | ----------------------- | -------- | -------- | ----- |
| Événements couverts            | Événements filmés ou diffusés par MCAD dans le mois, cultes compris.                                             | Mois      | nombre, 9 999           | aucune   | non      | oui   |
| Événements à couvrir           | Événements pour lesquels une captation ou une diffusion a été demandée à MCAD dans le mois, couverts ou non.     | Mois      | nombre, 9 999           | aucune   | non      | oui   |
| Cultes captés                  | Cultes filmés ce dimanche. Si aucun, enregistrez 0.                                                              | Dimanche  | nombre, 9 999           | aucune   | non      | oui   |
| Diffusions en direct           | Cultes et événements diffusés en direct dans le mois, toutes plateformes. Les « lives » comptent ici.            | Mois      | nombre, 9 999           | aucune   | non      | oui   |
| Contenus audiovisuels produits | Vidéos, replays et extraits terminés dans le mois.                                                               | Mois      | nombre, 9 999           | aucune   | non      | oui   |
| Plateformes de diffusion       | Plateformes où MCAD diffuse le jour de la saisie (par exemple YouTube, Instagram).                               | À ce jour | nombre, 9 999           | aucune   | non      | non   |
| Pic de spectateurs du direct   | Plus grand nombre de spectateurs connectés en même temps au direct du culte de ce dimanche.                      | Dimanche  | grand nombre, 9 999 999 | aucune   | non      | non   |
| Vues des diffusions MCAD       | Vues du mois des directs et replays de MCAD, relevées sur les statistiques des plateformes.                      | Mois      | grand nombre, 9 999 999 | aucune   | non      | oui   |
| Problèmes audio                | Problèmes de son pendant une captation ou un direct du mois, sans coupure du direct.                             | Mois      | nombre, 9 999           | aucune   | non      | oui   |
| Problèmes vidéo                | Problèmes d'image pendant une captation ou un direct du mois, sans coupure du direct.                            | Mois      | nombre, 9 999           | aucune   | non      | oui   |
| Interruptions de diffusion     | Coupures d'un direct dans le mois, quelle qu'en soit la cause. Une coupure ne compte pas en audio ou vidéo.      | Mois      | nombre, 9 999           | aucune   | non      | oui   |
| Mobilisés aux événements       | Présences d'équipiers de MCAD aux événements hors dimanche. Une personne compte à chaque événement où elle sert. | Mois      | nombre, 9 999           | aucune   | non      | oui   |
| Personnes formées              | Équipiers qui ont suivi une formation de MCAD dans le mois, sans liste.                                          | Mois      | nombre, 9 999           | aucune   | non      | oui   |
| Nouveaux équipiers intégrés    | Personnes entrées dans l'équipe de MCAD dans le mois.                                                            | Mois      | nombre, 9 999           | aucune   | non      | oui   |
| Postes d'équipe prévus         | Postes d'équipe prévus au planning du mois, dimanches et événements additionnés.                                 | Mois      | nombre, 9 999           | aucune   | non      | oui   |
| Postes d'équipe tenus          | Postes du planning du mois effectivement tenus par un équipier.                                                  | Mois      | nombre, 9 999           | aucune   | non      | oui   |

| Calcul                            | Type                | Formule (sources)                                                          | Lot  |
| --------------------------------- | ------------------- | -------------------------------------------------------------------------- | ---- |
| Taux de couverture des événements | taux, plafond 100 % | Événements couverts ÷ Événements à couvrir                                 | V1   |
| Vues par événement couvert        | moyenne             | Vues des diffusions MCAD ÷ Événements couverts                             | V1   |
| Taux de présence des équipiers    | taux, plafond 100 % | Postes d'équipe tenus ÷ Postes d'équipe prévus                             | V1   |
| Évolution de l'audience           | évolution           | Pic de spectateurs : écart au dimanche précédent, seulement s'il est saisi | V1+4 |
| Incidents techniques              | somme               | Problèmes audio + Problèmes vidéo + Interruptions de diffusion             | V1+4 |

Commun affiché : « Équipiers mobilisés » (STARs au service). 21 lignes sur 30.

### MPI

| Libellé                                  | Ce qu'on compte exactement                                                                              | Rythme    | Unité, borne  | Rubrique         | Sensible | Somme |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------- | ------------- | ---------------- | -------- | ----- |
| Prière des Stars : sessions              | Prières des Stars tenues dans la semaine du lundi au dimanche. Si aucune, enregistrez 0.                | Semaine   | nombre, 9 999 | Prière des Stars | non      | oui   |
| Prière des Stars : présents              | Présences aux Prières des Stars de la semaine, séances additionnées. Aucun nom.                         | Semaine   | nombre, 9 999 | Prière des Stars | non      | oui   |
| Prière des Stars : attendus              | Personnes attendues aux Prières des Stars de la semaine (inscrites ou prévues), séances additionnées.   | Semaine   | nombre, 9 999 | Prière des Stars | non      | oui   |
| Chaîne de prière : présents              | Personnes présentes à la chaîne de prière du dimanche, comptées une fois chacune.                       | Dimanche  | nombre, 9 999 | Chaîne de prière | non      | oui   |
| Chaîne de prière : présents la nuit      | Personnes présentes à la chaîne de prière la nuit du samedi au dimanche. À saisir le dimanche matin.    | Dimanche  | nombre, 9 999 | Chaîne de prière | non      | oui   |
| Chaîne de prière : attendus              | Personnes prévues au planning de la chaîne de prière du dimanche.                                       | Dimanche  | nombre, 9 999 | Chaîne de prière | non      | oui   |
| Chaîne de prière : personnes différentes | Personnes différentes venues à la chaîne de prière dans le mois, comptées hors outil, sans nom.         | Mois      | nombre, 9 999 | Chaîne de prière | non      | non   |
| Sainte cène : personnes dans l'équipe    | Personnes de l'équipe sainte cène le jour de la saisie.                                                 | À ce jour | nombre, 9 999 | Sainte cène      | non      | non   |
| Sainte cène : portions distribuées       | Portions de sainte cène distribuées au culte de ce dimanche. On compte des portions, pas des personnes. | Dimanche  | nombre, 9 999 | Sainte cène      | non      | oui   |

« Chaîne de prière : présents la nuit » porte le drapeau « saisi le dimanche matin » (K36b).

| Calcul                                   | Type                | Formule (sources)                                         | Lot |
| ---------------------------------------- | ------------------- | --------------------------------------------------------- | --- |
| Prière des Stars : présents par session  | moyenne             | Prière des Stars : présents ÷ Prière des Stars : sessions | V1  |
| Prière des Stars : taux de participation | taux, plafond 100 % | Prière des Stars : présents ÷ Prière des Stars : attendus | V1  |
| Chaîne de prière : taux de participation | taux, plafond 100 % | Chaîne de prière : présents ÷ Chaîne de prière : attendus | V1  |

### Santé

| Libellé                                             | Ce qu'on compte exactement                                                                                     | Rythme      | Unité, borne  | Rubrique | Sensible | Somme |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------- | ------------- | -------- | -------- | ----- |
| Événements couverts                                 | Événements EJP où l'équipe santé a assuré sa présence dans le mois, cultes compris.                            | Mois        | nombre, 9 999 | aucune   | non      | oui   |
| Événements à couvrir                                | Événements EJP où l'équipe santé devait être présente dans le mois, couverts ou non.                           | Mois        | nombre, 9 999 | aucune   | non      | oui   |
| Prises en charge                                    | Personnes prises en charge par l'équipe santé dans le mois, une fois chacune. Aucun détail.                    | Mois écoulé | nombre, 9 999 | aucune   | oui      | oui   |
| Interventions                                       | Gestes de l'équipe (soin, appel aux secours) dans le mois. Une prise en charge peut en compter plusieurs.      | Mois écoulé | nombre, 9 999 | aucune   | oui      | oui   |
| Incidents avec intervention                         | Incidents (malaise, chute, accident) du mois qui ont demandé l'équipe santé ou les secours.                    | Mois écoulé | nombre, 9 999 | aucune   | oui      | oui   |
| Orientations vers une structure ou un professionnel | Personnes orientées vers une structure de santé ou un professionnel dans le mois.                              | Mois écoulé | nombre, 9 999 | aucune   | oui      | oui   |
| Mobilisés aux événements                            | Présences de l'équipe santé aux événements hors dimanche. Une personne compte à chaque événement où elle sert. | Mois        | nombre, 9 999 | aucune   | non      | oui   |

| Calcul                            | Type                | Formule (sources)                          | Lot |
| --------------------------------- | ------------------- | ------------------------------------------ | --- |
| Taux de couverture des événements | taux, plafond 100 % | Événements couverts ÷ Événements à couvrir | V1  |

Commun affiché : « Personnes mobilisées » (STARs au service).

### Merch

| Libellé                           | Ce qu'on compte exactement                                                                                | Rythme    | Unité, borne     | Rubrique        | Sensible | Somme |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- | --------- | ---------------- | --------------- | -------- | ----- |
| Chiffre d'affaires                | Montant des ventes du mois, à l'euro près, tous lieux confondus. La comptabilité de l'église fait foi.    | Mois      | euros, 9 999 999 | aucune          | non      | oui   |
| Articles vendus                   | Articles vendus dans le mois, au culte, aux événements et ailleurs, toutes tailles confondues.            | Mois      | nombre, 9 999    | aucune          | non      | oui   |
| Commandes                         | Ventes enregistrées dans le mois. Une vente compte pour une commande, quel que soit le nombre d'articles. | Mois      | nombre, 9 999    | aucune          | non      | oui   |
| Articles vendus : vêtements       | Vêtements vendus dans le mois. Ils sont aussi comptés dans « Articles vendus ».                           | Mois      | nombre, 9 999    | Articles vendus | non      | oui   |
| Articles vendus : accessoires     | Accessoires vendus dans le mois. Ils sont aussi comptés dans « Articles vendus ».                         | Mois      | nombre, 9 999    | Articles vendus | non      | oui   |
| Articles vendus : autres articles | Autres articles vendus dans le mois. Ils sont aussi comptés dans « Articles vendus ».                     | Mois      | nombre, 9 999    | Articles vendus | non      | oui   |
| Coût d'achat des articles vendus  | Prix d'achat ou de fabrication des articles vendus dans le mois, à l'euro près.                           | Mois      | euros, 9 999 999 | aucune          | non      | oui   |
| Stock disponible                  | Articles du merch en réserve le jour de la saisie, toutes tailles confondues.                             | À ce jour | nombre, 9 999    | aucune          | non      | non   |
| Produits en stock critique        | Produits dont le stock est sous le seuil de réassort fixé par Merch, le jour de la saisie.                | À ce jour | nombre, 9 999    | aucune          | non      | non   |

| Calcul               | Type              | Formule (sources)                                              | Lot  |
| -------------------- | ----------------- | -------------------------------------------------------------- | ---- |
| Panier moyen         | moyenne           | Chiffre d'affaires ÷ Commandes, en euros, une décimale         | V1   |
| Marge estimée        | différence signée | Chiffre d'affaires moins Coût d'achat des articles vendus      | V1+4 |
| Évolution des ventes | évolution         | Chiffre d'affaires : écart au mois précédent et depuis janvier | V1+4 |

### Production

| Libellé                   | Ce qu'on compte exactement                                                                                    | Rythme    | Unité, borne     | Rubrique | Sensible | Somme |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- | --------- | ---------------- | -------- | -------- | ----- |
| Événements couverts       | Événements EJP couverts par Production dans le mois : cultes, veillées, baptêmes, camps, conférence.          | Mois      | nombre, 9 999    | aucune   | non      | oui   |
| Mag : projets produits    | Magazines produits dans la semaine du lundi au dimanche. Si aucun, enregistrez 0.                             | Semaine   | nombre, 9 999    | Mag      | non      | oui   |
| Photo : projets produits  | Projets photo produits dans la semaine du lundi au dimanche. Si aucun, enregistrez 0.                         | Semaine   | nombre, 9 999    | Photo    | non      | oui   |
| Projets en cours          | Projets de production en cours le jour de la saisie, formations comprises.                                    | À ce jour | nombre, 9 999    | aucune   | non      | non   |
| Projets annulés           | Projets de production annulés dans le mois.                                                                   | Mois      | nombre, 9 999    | aucune   | non      | oui   |
| Budget matériel prévu     | Budget prévu pour le matériel de Production, à l'euro près, le jour de la saisie. Première valeur : le devis. | À ce jour | euros, 9 999 999 | aucune   | non      | non   |
| Personnes formées (total) | Personnes formées par Production depuis ses premières formations, le jour de la saisie.                       | À ce jour | nombre, 9 999    | aucune   | non      | non   |

Valeurs de départ, saisies à la mise en service : Budget matériel prévu 5 164 €, Personnes formées
(total) 25, Projets annulés de mars 2026 : 1. Point d'attention de Production sur la location.

### Prodiges Musique

| Libellé                     | Ce qu'on compte exactement                                                                     | Rythme    | Unité, borne  | Rubrique    | Sensible | Somme |
| --------------------------- | ---------------------------------------------------------------------------------------------- | --------- | ------------- | ----------- | -------- | ----- |
| Chanteurs de l'équipe       | Chanteurs et choristes de l'équipe le jour de la saisie.                                       | À ce jour | nombre, 9 999 | aucune      | non      | non   |
| Musiciens de l'équipe       | Instrumentistes de l'équipe le jour de la saisie.                                              | À ce jour | nombre, 9 999 | aucune      | non      | non   |
| Morceaux préparés           | Morceaux préparés par l'équipe dans le mois pour le culte ou un événement.                     | Mois      | nombre, 9 999 | aucune      | non      | oui   |
| Morceaux originaux réalisés | Morceaux originaux de Prodiges Musique terminés dans le mois.                                  | Mois      | nombre, 9 999 | aucune      | non      | oui   |
| Répétitions : présents      | Présences aux répétitions de la semaine du lundi au dimanche, séances additionnées. Aucun nom. | Semaine   | nombre, 9 999 | Répétitions | non      | oui   |
| Répétitions : attendus      | Présences attendues aux répétitions de la semaine, séances additionnées, selon le planning.    | Semaine   | nombre, 9 999 | Répétitions | non      | oui   |

| Calcul                         | Type                | Formule (sources)                               | Lot |
| ------------------------------ | ------------------- | ----------------------------------------------- | --- |
| Répétitions : taux de présence | taux, plafond 100 % | Répétitions : présents ÷ Répétitions : attendus | V1  |

### Kumi

| Libellé                                    | Ce qu'on compte exactement                                                                               | Rythme      | Unité, borne  | Rubrique         | Sensible | Somme |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ----------- | ------------- | ---------------- | -------- | ----- |
| Activités réalisées                        | Activités ponctuelles tenues dans le mois (atelier, rencontre, sortie), une fois chacune.                | Mois        | nombre, 9 999 | aucune           | non      | oui   |
| Participantes                              | Femmes venues à au moins une activité dans le mois, comptées une fois, hors outil.                       | Mois        | nombre, 9 999 | aucune           | non      | non   |
| Nouvelles participantes                    | Femmes venues à une activité pour la première fois dans le mois. Un total, sans liste.                   | Mois        | nombre, 9 999 | aucune           | non      | oui   |
| Projets réalisés                           | Projets de plusieurs semaines menés à terme dans le mois.                                                | Mois        | nombre, 9 999 | aucune           | non      | oui   |
| Femmes inscrites                           | Femmes inscrites aux activités de Kumi le jour de la saisie.                                             | À ce jour   | nombre, 9 999 | aucune           | non      | non   |
| Nouvelles intégrations dans les équipes    | Personnes qui ont rejoint une équipe de Kumi dans le mois. Différent des nouveaux STARs comptés par MDS. | Mois        | nombre, 9 999 | aucune           | non      | oui   |
| Pages Roses : prestataires inscrites       | Prestataires inscrites sur Pages Roses le jour du relevé, selon la plateforme. Relevé une fois par mois. | À ce jour   | nombre, 9 999 | Pages Roses      | non      | non   |
| Pages Roses : profils actifs               | Profils que Pages Roses compte comme actifs le jour du relevé. Relevé une fois par mois.                 | À ce jour   | nombre, 9 999 | Pages Roses      | non      | non   |
| Pages Roses : demandes de mise en relation | Demandes de mise en relation reçues sur Pages Roses dans le mois, selon la plateforme.                   | Mois        | nombre, 9 999 | Pages Roses      | non      | oui   |
| Pages Roses : réservations                 | Réservations enregistrées sur Pages Roses dans le mois, selon la plateforme.                             | Mois        | nombre, 9 999 | Pages Roses      | non      | oui   |
| Call your sister : prises en charge        | Prises en charge de Call your sister dans le mois. Mois fini seulement, aucun détail.                    | Mois écoulé | nombre, 9 999 | Call your sister | oui      | oui   |

| Calcul                | Type | Formule (sources)                                            | Lot |
| --------------------- | ---- | ------------------------------------------------------------ | --- |
| Taux de participation | taux | Participantes ÷ Femmes inscrites en vigueur à la fin du mois | V1  |

Communs affichés : « Femmes mobilisées » (STARs au service), « Bénévoles actives » (STARs actifs).

### Eagles

| Libellé                                    | Ce qu'on compte exactement                                                                                | Rythme      | Unité, borne  | Rubrique                | Sensible | Somme |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ----------- | ------------- | ----------------------- | -------- | ----- |
| Activités réalisées                        | Activités ponctuelles tenues dans le mois (atelier, rencontre, sortie), une fois chacune.                 | Mois        | nombre, 9 999 | aucune                  | non      | oui   |
| Participants                               | Personnes venues à au moins une activité dans le mois, comptées une fois, hors outil.                     | Mois        | nombre, 9 999 | aucune                  | non      | non   |
| Nouveaux participants                      | Personnes venues à une activité pour la première fois dans le mois. Un total, sans liste.                 | Mois        | nombre, 9 999 | aucune                  | non      | oui   |
| Projets réalisés                           | Projets de plusieurs semaines menés à terme dans le mois.                                                 | Mois        | nombre, 9 999 | aucune                  | non      | oui   |
| Inscrits                                   | Personnes inscrites aux activités d'Eagles le jour de la saisie.                                          | À ce jour   | nombre, 9 999 | aucune                  | non      | non   |
| Nouvelles intégrations dans les équipes    | Personnes qui ont rejoint une équipe d'Eagles dans le mois. Différent des nouveaux STARs comptés par MDS. | Mois        | nombre, 9 999 | aucune                  | non      | oui   |
| La plate-forme d'écoute : prises en charge | Prises en charge de la plate-forme d'écoute dans le mois. Mois fini seulement, aucun détail.              | Mois écoulé | nombre, 9 999 | La plate-forme d'écoute | oui      | oui   |

| Calcul                | Type | Formule (sources)                                   | Lot |
| --------------------- | ---- | --------------------------------------------------- | --- |
| Taux de participation | taux | Participants ÷ Inscrits en vigueur à la fin du mois | V1  |

Commun affiché : « Bénévoles actifs » (STARs actifs).

### Entretien

| Libellé                                  | Ce qu'on compte exactement                                                                               | Rythme    | Unité, borne  | Rubrique | Sensible | Somme |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------- | -------- | ----- |
| Problèmes signalés                       | Problèmes d'entretien signalés dans le mois (locaux, matériel, propreté).                                | Mois      | nombre, 9 999 | aucune   | non      | oui   |
| Problèmes résolus                        | Problèmes d'entretien réglés dans le mois, quel que soit le mois du signalement.                         | Mois      | nombre, 9 999 | aucune   | non      | oui   |
| Jours pour résoudre les problèmes        | Somme, pour les problèmes résolus du mois, des jours calendaires entre signalement et résolution.        | Mois      | jours, 99 999 | aucune   | non      | non   |
| Tâches réalisées                         | Tâches d'entretien terminées dans le mois (nettoyage, rangement, réparation).                            | Mois      | nombre, 9 999 | aucune   | non      | oui   |
| Produits d'entretien manquants           | Types de produits d'entretien à racheter le jour de la saisie. Le détail passe par un point d'attention. | À ce jour | nombre, 9 999 | aucune   | non      | non   |
| Équipements manquants                    | Types d'équipements manquants le jour de la saisie. Le détail passe par un point d'attention.            | À ce jour | nombre, 9 999 | aucune   | non      | non   |
| Problèmes en attente                     | Problèmes d'entretien signalés et pas encore résolus, le jour de la saisie.                              | À ce jour | nombre, 9 999 | aucune   | non      | non   |
| Jours d'attente des problèmes en attente | Somme, pour les problèmes en attente le jour de la saisie, des jours écoulés depuis leur signalement.    | À ce jour | jours, 99 999 | aucune   | non      | non   |

| Calcul                    | Type    | Formule (sources)                                                            | Lot |
| ------------------------- | ------- | ---------------------------------------------------------------------------- | --- |
| Délai moyen de résolution | moyenne | Jours pour résoudre les problèmes ÷ Problèmes résolus                        | V1  |
| Délai d'attente moyen     | moyenne | Jours d'attente ÷ Problèmes en attente, résultat du jour avec les deux dates | V1  |

Commun affiché : « Personnes actives mobilisées » (STARs au service).

### Coordo FIJ

| Libellé                   | Ce qu'on compte exactement                                                                                 | Rythme | Unité, borne  | Rubrique     | Sensible | Somme |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- | ------ | ------------- | ------------ | -------- | ----- |
| Parcours FIJ : nouveaux   | Jeunes venus en FIJ pour la première fois dans le mois, tous départements. Un total, sans liste.           | Mois   | nombre, 9 999 | Parcours FIJ | non      | oui   |
| Parcours FIJ : réguliers  | Jeunes venus au moins trois fois en FIJ dans le mois, comptés hors outil. Un total, sans liste.            | Mois   | nombre, 9 999 | Parcours FIJ | non      | non   |
| Parcours FIJ : au service | Jeunes des FIJ qui ont servi au moins un dimanche du mois dans un ministère. Différent de « dont en FIJ ». | Mois   | nombre, 9 999 | Parcours FIJ | non      | non   |

Table `fij_statistique` (X5), saisie chaque semaine pour les 8 départements, au rythme « dimanche » :

| Rubrique                    | Ce qu'on compte exactement                                                      |
| --------------------------- | ------------------------------------------------------------------------------- |
| Présents au culte EJP       | Jeunes du département présents au culte EJP de ce dimanche.                     |
| Présents à la réunion FIJ   | Présents aux réunions FIJ du département dans la semaine, séances additionnées. |
| Présents à l'évangélisation | Présents aux sorties d'évangélisation du département dans la semaine.           |
| Membres du mardi            | Membres de la FIJ du département présents le mardi de la semaine.               |

L'étape « membres » du parcours est le total des « Membres du mardi » de la dernière semaine du
mois, lu dans la table, sans seconde saisie.

### Multilingue

| Libellé                             | Ce qu'on compte exactement                                                                                    | Rythme   | Unité, borne  | Rubrique | Sensible | Somme |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------- | ------------- | -------- | -------- | ----- |
| Langues couvertes                   | Langues interprétées pendant le culte de ce dimanche.                                                         | Dimanche | nombre, 9 999 | aucune   | non      | non   |
| Événements couverts                 | Événements hors culte où l'interprétation a été assurée dans le mois.                                         | Mois     | nombre, 9 999 | aucune   | non      | oui   |
| Événements à couvrir                | Événements hors culte où Multilingue était attendu dans le mois, couverts ou non.                             | Mois     | nombre, 9 999 | aucune   | non      | oui   |
| Personnes servies par la traduction | Personnes qui ont utilisé la traduction ce dimanche (récepteurs distribués ou places de la zone interprétée). | Dimanche | nombre, 9 999 | aucune   | non      | oui   |
| Mobilisés aux événements            | Présences d'interprètes aux événements hors dimanche. Une personne compte à chaque événement où elle sert.    | Mois     | nombre, 9 999 | aucune   | non      | oui   |
| Demandes de traduction              | Demandes de traduction reçues dans le mois.                                                                   | Mois     | nombre, 9 999 | aucune   | non      | oui   |
| Demandes satisfaites                | Demandes de traduction honorées dans le mois.                                                                 | Mois     | nombre, 9 999 | aucune   | non      | oui   |
| Incidents de traduction             | Incidents qui ont gêné la traduction dans le mois (matériel, absence, langue non couverte).                   | Mois     | nombre, 9 999 | aucune   | non      | oui   |

| Calcul                            | Type                | Formule (sources)                             | Lot |
| --------------------------------- | ------------------- | --------------------------------------------- | --- |
| Taux de couverture des événements | taux, plafond 100 % | Événements couverts ÷ Événements à couvrir    | V1  |
| Part des demandes satisfaites     | taux, plafond 100 % | Demandes satisfaites ÷ Demandes de traduction | V1  |

Commun affiché : « Interprètes mobilisés » (STARs au service).

### Sécurité

| Libellé                  | Ce qu'on compte exactement                                                                                    | Rythme   | Unité, borne  | Rubrique | Sensible | Somme |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- | -------- | ------------- | -------- | -------- | ----- |
| Événements couverts      | Événements où des agents de sécurité ont été présents dans le mois, cultes compris.                           | Mois     | nombre, 9 999 | aucune   | non      | oui   |
| Incidents                | Faits anormaux constatés par les agents dans le mois. Hors malaises, soins et secours : Santé les compte.     | Mois     | nombre, 9 999 | aucune   | non      | oui   |
| Interventions            | Actions des agents en réponse à un incident dans le mois. Hors malaises, soins et secours : Santé les compte. | Mois     | nombre, 9 999 | aucune   | non      | oui   |
| Exercices et formations  | Exercices et formations de sécurité tenus dans le mois.                                                       | Mois     | nombre, 9 999 | aucune   | non      | oui   |
| Postes à tenir           | Postes prévus au plan de sécurité de ce dimanche.                                                             | Dimanche | nombre, 9 999 | aucune   | non      | oui   |
| Postes tenus             | Postes effectivement occupés ce dimanche.                                                                     | Dimanche | nombre, 9 999 | aucune   | non      | oui   |
| Mobilisés aux événements | Présences d'agents et de bénévoles aux événements hors dimanche. Une personne compte à chaque événement.      | Mois     | nombre, 9 999 | aucune   | non      | oui   |

| Calcul                        | Type                | Formule (sources)               | Lot |
| ----------------------------- | ------------------- | ------------------------------- | --- |
| Taux de couverture des postes | taux, plafond 100 % | Postes tenus ÷ Postes à tenir   | V1  |
| Incidents par événement       | moyenne             | Incidents ÷ Événements couverts | V1  |

Commun affiché : « Agents et bénévoles mobilisés » (STARs au service). Le mot « interventions »
déclenche l'avertissement « domaine sensible » de l'écran : l'administration confirme qu'il s'agit
de la sécurité des lieux.

### Formation

| Libellé                              | Ce qu'on compte exactement                                                                     | Rythme    | Unité, borne  | Rubrique | Sensible | Somme |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- | --------- | ------------- | -------- | -------- | ----- |
| Inscrits (PCNC)                      | Personnes inscrites au parcours PCNC le jour de la saisie, y compris celles qui l'ont terminé. | À ce jour | nombre, 9 999 | aucune   | non      | non   |
| Personnes ayant terminé la formation | Parmi les inscrits au parcours PCNC, personnes qui l'ont terminé, le jour de la saisie.        | À ce jour | nombre, 9 999 | aucune   | non      | non   |
| Séances : présences                  | Présences aux séances de formation du mois, séances additionnées. Aucun nom.                   | Mois      | nombre, 9 999 | Séances  | non      | oui   |
| Séances : présences attendues        | Inscrits attendus aux séances du mois, séances additionnées.                                   | Mois      | nombre, 9 999 | Séances  | non      | oui   |
| Réponses au questionnaire            | Réponses reçues dans le mois au questionnaire anonyme de satisfaction de Formation.            | Mois      | nombre, 9 999 | aucune   | non      | oui   |
| Réponses satisfaites                 | Parmi ces réponses, celles qui disent « satisfait » ou donnent une des deux meilleures notes.  | Mois      | nombre, 9 999 | aucune   | non      | oui   |

| Calcul               | Type                | Formule (sources)                                                        | Lot |
| -------------------- | ------------------- | ------------------------------------------------------------------------ | --- |
| Taux de présence     | taux, plafond 100 % | Séances : présences ÷ Séances : présences attendues                      | V1  |
| Taux de complétion   | taux, plafond 100 % | Personnes ayant terminé la formation ÷ Inscrits (PCNC), résultat du jour | V1  |
| Taux de satisfaction | taux, plafond 100 % | Réponses satisfaites ÷ Réponses au questionnaire                         | V1  |

Commun affiché : « Formateurs mobilisés » (STARs au service). Si les séances ont lieu un autre jour
que le dimanche, l'administration ajoute à l'écran « Mobilisés aux événements » (suggestion).

### MDS

| Libellé                  | Ce qu'on compte exactement                                                                                         | Rythme    | Unité, borne  | Rubrique | Sensible | Somme |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ | --------- | ------------- | -------- | -------- | ----- |
| Nouveaux STARs           | STARs enregistrés par MDS pour la première fois dans le mois. Un nombre, sans liste ni nom.                        | Mois      | nombre, 9 999 | aucune   | non      | oui   |
| STARs désactivés         | STARs retirés des actifs dans le mois (départ, arrêt, transfert).                                                  | Mois      | nombre, 9 999 | aucune   | non      | oui   |
| Recrutements aboutis     | Candidatures du formulaire de recrutement qui ont mené à une intégration dans une équipe, comptées ce mois-là.     | Mois      | nombre, 9 999 | aucune   | non      | oui   |
| Recrutements non aboutis | Candidatures du formulaire closes sans intégration (abandon, refus, sans réponse), comptées le mois de la clôture. | Mois      | nombre, 9 999 | aucune   | non      | oui   |
| Espaces Care             | Espaces Care (espace nourriture) tenus ce dimanche.                                                                | Dimanche  | nombre, 9 999 | aucune   | non      | oui   |
| Badges distribués        | Badges remis à des STARs dans le mois.                                                                             | Mois      | nombre, 9 999 | aucune   | non      | oui   |
| Badges actifs            | Badges en circulation et valides le jour de la saisie.                                                             | À ce jour | nombre, 9 999 | aucune   | non      | non   |
| Badges en attente        | Badges demandés et pas encore remis le jour de la saisie.                                                          | À ce jour | nombre, 9 999 | aucune   | non      | non   |

Lignes de référence : « STARs actifs de l'église » et « STARs au service de l'église » (totaux de
l'église, déjà publics). Série dérivée : « Événements organisés » (événements de MDS au dernier état
« Terminé »), V1+4.

### Prodiges Junior

| Libellé            | Ce qu'on compte exactement                                                                               | Rythme      | Unité, borne  | Rubrique | Sensible | Somme |
| ------------------ | -------------------------------------------------------------------------------------------------------- | ----------- | ------------- | -------- | -------- | ----- |
| Enfants présents   | Enfants accueillis ce dimanche, en un seul total, sans âge ni nom.                                       | Dimanche    | nombre, 9 999 | aucune   | non      | oui   |
| Nouveaux enfants   | Enfants accueillis pour la première fois à Prodiges Junior dans le mois. Mois fini seulement.            | Mois écoulé | nombre, 9 999 | aucune   | oui      | oui   |
| Enfants déjà venus | Enfants accueillis dans le mois qui l'avaient déjà été avant. Un total, sans liste. Mois fini seulement. | Mois écoulé | nombre, 9 999 | aucune   | oui      | oui   |
| Enfants inscrits   | Enfants inscrits à Prodiges Junior le jour de la saisie.                                                 | À ce jour   | nombre, 9 999 | aucune   | non      | non   |

| Calcul           | Type | Formule (sources)                                          | Lot |
| ---------------- | ---- | ---------------------------------------------------------- | --- |
| Taux de présence | taux | Enfants présents ÷ Enfants inscrits en vigueur ce dimanche | V1  |

« Enfants présents » porte le libellé de sessions « Sessions réalisées » (X14). Commun affiché :
« Animateurs mobilisés » (STARs au service). Le mot « enfant » déclenche l'avertissement « domaine
sensible » : l'administration confirme que « Enfants présents » et « Enfants inscrits » ne le sont
pas.

### Protocole

Modèle « aucun » : aucun prévu.

### Suggestions communes

Proposées aux ministères qui ne les ont pas déjà en prévu, ajoutées en un clic, avec le « Pourquoi »,
validées par EJP Tech (T30) : Événements couverts, Événements à couvrir, Mobilisés aux événements,
Demandes reçues, Demandes traitées, Projets en cours, Personnes formées, Activités réalisées,
Participants, Nouveaux participants, Projets réalisés. Leurs définitions sont génériques (« ... par
le ministère dans le mois »).

### Taille de la vague 1

| Élément                                    | Nombre                                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------------------- |
| Indicateurs saisis (prévus)                | 161, dont 11 sensibles, 4 en euros, 2 en heure, 4 en jours                          |
| Calculs                                    | 41 : 29 en V1 (taux et moyennes de T35), 12 en V1+4 (calculs étendus et événements) |
| Séries dérivées des événements             | 7 (6 de l'église pour Coordination, 1 de MDS), V1+4                                 |
| Statistiques FIJ par département           | 4 rubriques × 8 départements, V1                                                    |
| Communs affichés sous le nom de la demande | 13 (dont 2 lignes de référence de l'église pour MDS)                                |
| Graphiques déclarés                        | 12, V1+4                                                                            |
| Points d'attention de départ               | 2 (Production, Entretien)                                                           |
| Ministères                                 | 22, dont 21 avec des prévus et Protocole sans                                       |
| Plus grande fiche                          | MCAD, 21 lignes sur 30                                                              |

Charge de saisie la plus lourde : MPI, 7 chiffres chaque dimanche ; Coordo FIJ, 32 valeurs par
semaine dans un seul formulaire ; MCAD, 13 chiffres par mois. Tous les comptes mensuels se saisissent
en une fois dans « Chiffres du mois ».

## 5. Extensions du modèle

Au-delà de `configuration-indicateurs.md` (T35) et de `validation-metier.md` (T30). Chaque extension
suit les règles du projet : nouvelles migrations, ajout seulement, RLS et GRANT explicites (rien pour
`anon`), politique restrictive `aal2`, `private.exige_aal2()`, fonctions `security definer` dans
`private` seulement, vues `security_invoker`, dates à l'heure de Paris, tests pgTAP construits sur la
matrice des droits.

### Avant la mise en service (ce qui sert à saisir)

| N°  | Extension                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Sert à                                               | Coût      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------- |
| X1  | Catalogue complet de la vague 1 : 161 prévus, 41 calculs, définitions, valeurs de départ, suggestions ; tests de création par « Créer »                                                                                                                                                                                                                                                                                                                                                                                                                                                      | tous les ministères                                  | 1,5 jour  |
| X2  | Unités « heure » (0 à 1439, minutes depuis minuit, saisie en heures et minutes, affichage « 10 h 42 ») et « jours » (0 à 99 999) sur `indicateur.unite` ; contrôle de `mesure.valeur` par unité ; formulaire ; pgTAP                                                                                                                                                                                                                                                                                                                                                                         | Coordination, Film, Tech, Entretien                  | 1 jour    |
| X3  | Drapeaux du catalogue, fixés à la création et contrôlés par `controler_indicateur` : `sans_somme`, `saisi_dimanche_matin` (le formulaire propose le dimanche du jour tant qu'on est dimanche, heure de Paris), `libelle_sessions`                                                                                                                                                                                                                                                                                                                                                            | MPI, Kumi, Eagles, MCAD, Coordo FIJ, Prodiges Junior | 0,5 jour  |
| X4  | Seuil « moins de 3 » : vue `security_invoker` adossée à une fonction `private` ; somme sans fuite (mois affichés seulement) ; politique de lecture de `mesure` fermée aux lignes sensibles pour tout autre profil que le ministère ; sensibles actifs dès la vague 1, sans réglage d'activation (P42) ; pgTAP (0 reste 0, 1 et 2 masqués, valeur exacte pour le ministère, lecture directe refusée, somme sans fuite)                                                                                                                                                                        | Social, Santé, Kumi, Eagles, Prodiges Junior         | 1,5 jour  |
| X5  | Statistiques FIJ par département : table `fij_statistique` (rubrique, département, dimanche, valeur, `saisi_le`, `saisi_par`), liste fermée `private.fij_rubrique`, fonction `saisir_fij_statistiques` (`private` en `security definer`, appelée par une fonction `public` en `security invoker`, une ligne de journal sans valeur), vue `v_fij_statistique` (dernière saisie par département, total, complétude, série), formulaire « Chiffres par département », pgTAP (le ministère `fij` écrit ; berger, conseil, EJP Tech lisent ; rien pour l'administration ni les autres ministères) | Coordo FIJ                                           | 2,5 jours |
| X6  | Libellés des communs sur une fiche : `private.libelle_commun` (modèle, code du commun, libellé de 60 caractères au plus), jamais exposée, lue par la fiche ; lignes de référence de l'église pour MDS                                                                                                                                                                                                                                                                                                                                                                                        | 10 ministères et MDS                                 | 0,5 jour  |
| X7  | Limites : 30 lignes par fiche, saisis et calculs, prévus compris ; plus de plafond de six ; code `coordination` posé sur le ministère Coordination par migration                                                                                                                                                                                                                                                                                                                                                                                                                             | tous                                                 | 0,25 jour |
| X8  | Structure de `indicateur_terme` (calcul, côté haut ou bas, source, agrégat, décalage, ordre), écrite seulement à la création et figée, à la place de `haut_id` et `bas_id` dès la migration de définition ; seuls les taux et moyennes de T35 se lisent en V1                                                                                                                                                                                                                                                                                                                                | les 29 calculs de V1                                 | 0,5 jour  |

Total avant la mise en service : **environ 8 jours**, en plus du lot 1 de T35 et de la validation de
T30.

### Dans les 4 semaines après la mise en service (ce qui lit)

| N°  | Extension                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Sert à                                                | Coût      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | --------- |
| X9  | Calculs étendus sur `indicateur_terme` : différence signée, somme (2 à 4 termes), évolution (écart à la période précédente et depuis janvier, en nombre et en %) ; agrégat « somme des dimanches du mois » ; décalage de 0 à 3 mois ; terme « comptage d'événements ». Sources jamais sensibles, jamais un chiffre commun. pgTAP                                                                                                                                                                                                                      | Intégration, Coordination, Communication, MCAD, Merch | 3 jours   |
| X10 | Comptages d'événements : vue `v_evenements_mois` (ministère, mois, prévus, réalisés, annulés, reportés lus dans l'historique de `evenement_etat`, en attente, passés sans état final) sous la RLS de l'événement ; fonction `private` en `security definer` derrière une fonction `public` en `security invoker` pour les totaux de l'église, réservée à `coordination`, au berger, au conseil et à EJP Tech. pgTAP : report détecté, dernier état gagnant, minuit à Paris, un autre ministère et l'administration ne reçoivent rien                  | Coordination, MDS                                     | 2 jours   |
| X11 | Graphiques déclarés : `private.graphique_prevu` (modèle, titre de 60 caractères au plus, forme : courbes, barres groupées, barres triées ou totaux côte à côte ; étendue : 12 mois, 10 à 26 dimanches, 12 semaines) et `private.graphique_serie` (1 à 4 séries : indicateur, calcul, comptage d'événements, rubrique FIJ, série de l'église), écrites par la migration de la vague 1 ; vue `v_graphique` en `security_invoker` ; un composant avec équivalent texte, trous gardés, cercle vide pour une période incomplète ; jamais de série sensible | 9 ministères                                          | 2,5 jours |
| X12 | `v_stock_mois` : valeur en vigueur à la fin de chaque mois d'un « à ce jour » (heure de Paris), trou si aucune saisie ; pas pour les sensibles                                                                                                                                                                                                                                                                                                                                                                                                        | stocks et relevés de plateformes                      | 0,5 jour  |
| X13 | `v_serie_eglise` : total de l'église d'un chiffre commun à la fin de chaque mois (règle 3), avec sa complétude par point ; lisible par qui lit la vue de l'église                                                                                                                                                                                                                                                                                                                                                                                     | MDS                                                   | 0,5 jour  |
| X14 | Colonne « dimanches avec une valeur au-dessus de 0 » par mois dans la vue de suivi, affichée sous `libelle_sessions`                                                                                                                                                                                                                                                                                                                                                                                                                                  | Prodiges Junior                                       | 0,25 jour |

Total dans les 4 semaines : **environ 9 jours**. Ensemble : environ 17 jours, à confirmer au mode
plan de l'étape 4a. Plusieurs pièces servent plus d'une demande : X9 en sert 12, X11 en sert 12.

### Retiré des propositions précédentes

Pour garder le périmètre au plus juste, ces pistes des lots de travail ne sont **pas** construites :
nature « activité » et formulaire « Saisir une activité » (la semaine et le mois suffisent) ; colonne
`mesure.departement` (remplacée par `fij_statistique`) ; colonne `agregat` « dernier » pour un stock
mensuel (les stocks sont des « à ce jour » avec `v_stock_mois`) ; calcul « reprise » (remplacé par
`private.libelle_commun`) ; unité « minutes » ; type de calcul « classement » (remplacé par un
graphique de barres triées) ; type de calcul « dimanches avec valeur » (remplacé par une colonne de
vue) ; contrôle dérivé des mentions sur les événements (K9).

## 6. Graphiques

Tous déclarés dans `private.graphique_prevu` (X11), sur la fiche du ministère, lus par le ministère,
le berger, le conseil et EJP Tech (et, pour G4, par les lecteurs de X10). Chacun a son équivalent
texte (« Douze derniers mois : 14, 18, ... »), garde les trous, et marque d'un cercle vide une
période incomplète. Pas de double axe : deux unités donnent deux petits graphiques superposés sur le
même axe du temps. Lot : V1+4 pour tous, sur des données saisies dès le premier jour. La petite
courbe de chaque ligne reste.

| N°  | Ministère        | Demande (ligne)                                       | Forme                        | Séries                                                                                        | Étendue      |
| --- | ---------------- | ----------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------- | ------------ |
| G1  | Intégration      | Évolution NA et NC (28)                               | courbes                      | Nouveaux arrivants (NA), Nouveaux convertis (NC)                                              | 26 dimanches |
| G2  | Intégration      | Présents à Welcome Prodiges (28)                      | barres et courbe superposées | Welcome Prodiges : présents, sessions, présents par session                                   | 12 mois      |
| G3  | Intégration      | Parcours NA, retour, FIJ (28)                         | totaux côte à côte           | somme des NA du mois, NA revenus au culte, Intégrés en FIJ (NA et NC) ; taux en texte         | 12 mois      |
| G4  | Coordination     | Prévus, réalisés, annulés, reportés (43)              | barres groupées              | quatre comptages d'événements de l'église                                                     | 12 mois      |
| G5  | Communication    | Contenu produit et portée (56)                        | deux courbes superposées     | Contenus produits ; Portée (toutes plateformes)                                               | 12 mois      |
| G6  | Tech             | Demandes et incidents (89)                            | courbes                      | Demandes reçues, Demandes résolues, Incidents techniques                                      | 12 mois      |
| G7  | MPI              | Participation à la prière semaine après semaine (135) | courbes                      | Prière des Stars : présents ; Chaîne de prière : présents ; présents la nuit                  | 12 semaines  |
| G8  | Merch            | Évolution des ventes (158)                            | deux courbes superposées     | Chiffre d'affaires (euros) ; Articles vendus                                                  | 12 mois      |
| G9  | Merch            | Articles les plus vendus (154)                        | barres triées                | Articles vendus : vêtements, accessoires, autres articles, dernier mois écoulé                | 1 mois       |
| G10 | Prodiges Musique | Taux de présence aux répétitions (176)                | courbe                       | Répétitions : taux de présence                                                                | 12 semaines  |
| G11 | Coordo FIJ       | Parcours du jeune dans le FIJ (223)                   | totaux côte à côte           | Parcours FIJ : nouveaux, réguliers ; membres du mardi (table FIJ) ; Parcours FIJ : au service | 12 mois      |
| G12 | MDS              | Évolution des STARs actifs (265)                      | courbe et barres superposées | STARs actifs de l'église en fin de mois (X13) ; Nouveaux STARs ; STARs désactivés             | 12 mois      |

Les statistiques FIJ par département (ligne 221) ont aussi leur courbe par rubrique et par
département dans la vue `v_fij_statistique` (X5), dès la vague 1.

## 7. Ce qui reste révisable par la coordination

Tout ce document l'est. Comment une révision s'applique :

- **Avant la première saisie d'un indicateur** : libellé et définition se corrigent à l'écran
  Indicateurs, par l'administration ou EJP Tech (Q7). La relecture en préproduction (K16) sert à
  cela : la coordination et chaque ministère relisent les faits choisis de la section 1.
- **Après la première saisie** : un changement de sens passe par un remplacement (l'ancien est
  retiré avec le motif « Remplacé », ses saisies restent lisibles) ; un chiffre inutile se retire
  avec un motif.
- **Un choix de règle** (seuil « moins de 3 », euros cachés à l'administration, lecteurs des
  totaux d'événements, sens de « STARs au service » pour les mobilisés, tolérances de 5 minutes, 7
  jours, 3 mois et 30 jours) se change par une décision écrite dans `docs/decisions.md` et, si la
  base l'impose, par une migration.
- **Hors de l'outil, à la coordination seule** : la validation du registre des traitements et de
  la note d'analyse des comptes sensibles (K56), rédigés par EJP Tech (`docs/conformite/`) et
  remis avant la mise en service, sans conditionner l'activation des indicateurs sensibles, actifs
  dès la vague 1 (P42) ; la validation des libellés, définitions et faits choisis, remis dans le
  même dossier ; la décision d'une analyse d'impact complète.
- **Questions à poser pendant la relecture** : sens de la présence au culte (K19a) ; live et
  diffusion en direct (K32) ; catégories de Merch et de Prodiges Musique ; rubriques et étapes de
  Coordo FIJ ; jour des séances de Formation (formateurs mobilisés) ; définitions d'activité et de
  projet de Kumi et d'Eagles.

## 8. Suites de la revue du 6 octobre

La revue des propositions des quatre lots de travail a relevé 30 points. Suites données :

- **Appliqués** : une seule réponse par question (K10b, mois de la date quittée ; K10c, passés sans
  état final ; K21 et K18a, comptes du mois ; K22a, différence signée ; K4a, conversion sur NA + NC ;
  K7b, total toutes plateformes ; K57, sans objet) ; K8b conforme au BRIEF (« STARs au service »
  compte là où l'on sert, pas au ministère principal) ; une seule liste d'extensions X1 à X14 ; pas de nature
  « activité » ; demandes de la coordination en prévus, jamais en suggestions ; une seule limite de
  30 lignes ; comptages d'événements depuis la mise en service, avec un signal de fraîcheur au lieu
  d'une complétude ; « Mobilisés aux événements » comme mécanisme unique ; règle des stocks et des
  flux ; seuil sans fuite par différence, lignes brutes au ministère seul, export hors API, phrase sur
  les enfants différents retirée ; définitions de Sécurité sans faits de santé ; étape « membres »
  lue dans la table FIJ, « au service » distingué de « dont en FIJ », table FIJ avant la mise en
  service ; règle unique de départ des sommes ; unités « heure » et « jours » seulement ; relecture
  unique avant la saisie ; registre remis avant la mise en service (il conditionnait l'activation
  des sensibles jusqu'à P42, qui les active dès la vague 1) ; exception de lecture de
  Coordination écrite dans la matrice ; couverture indépendante de P31 ; périmètre réduit ; « Live »
  posé à MCAD ; baptisés à la dernière session saisis ; drapeau « sans somme » ; « Événements
  couverts » en prévus propres ; haut et bas des événements à l'heure sur une même population ;
  K30 première version ; évolution de l'audience au dimanche précédent seulement ; K19a posé à
  Intégration ; étiquettes de mécanisme corrigées, « Personnes formées (total) » ; mandat et faits
  choisis écrits en tête.
- **Réfutés ou ajustés, avec la raison** :
  - _Graphiques modifiables à l'écran Indicateurs_ : non. Ils sont écrits par la migration de la
    vague 1 et changent par une petite migration, exception ajoutée à celles de T34 (suggestion,
    mot refusé). Raison : un écran d'édition des graphiques coûterait 2 à 3 jours pour douze
    déclarations qui changent rarement.
  - _Contrôle dérivé des mentions pour les cinq ministères qui couvrent_ : la revue laissait le
    choix entre cinq et aucun ; c'est aucun. Raison : aucune demande ne le réclame, et une mention
    ne prouve pas la couverture.
  - _Événements passés de l'année saisis après coup_ : non retenu. Raison : il faudrait lever le
    refus des dates passées de `ajouter_evenement` (BRIEF, section 7) pour quelques mois de 2026 ;
    les comptages nomment leur départ et couvrent l'année entière dès 2027. Confirmé le 6 octobre
    2026 (T37) : la base refuse aussi une nouvelle date passée et une mise à jour identique à
    l'état actuel ; un ministère gêné par ce refus peut le signaler (T39, décidé le 6 octobre 2026 : lu par le ministère et EJP Tech seulement).
  - _Report des changements dans le BRIEF dès maintenant_ : différé au mode plan de l'étape 4a.
    Raison : CLAUDE.md demande l'accord explicite de la personne sur tout changement de modèle de
    données avant le code ; ce document liste les sections à reporter (section 1).
  - _Contrôle de complétude des comptages par « ministères qui ont déclaré un événement »_ : déjà
    retiré par la revue elle-même, remplacé par le signal « passés sans état final ».
