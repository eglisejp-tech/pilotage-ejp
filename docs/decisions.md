# Journal des décisions : Pilotage EJP

Une entrée par décision ou proposition. Six statuts :

- **Décidé** : tranché par la coordination et EJP Tech ; `BRIEF.md` l'applique.
- **Proposé, à confirmer par la coordination** : règle métier proposée par EJP Tech après la revue du kit ; `BRIEF.md` l'applique en attendant la réponse.
- **Proposé, à confirmer par EJP Tech** : choix technique proposé par la revue du kit ; `BRIEF.md` l'applique en attendant la validation.
- **À l'étude, non appliqué (conception des KPI)** : proposition issue de l'analyse des KPI de la coordination (P15 à P30, T33 et T34, détail dans `docs/conception/kpi-ministeres.md` ; T35, détail dans `docs/conception/configuration-indicateurs.md` ; la conception de T30, détail dans `docs/conception/validation-metier.md`). Ni `BRIEF.md` ni le code ne l'appliquent, même en attendant la réponse : la règle « une proposition s'applique en attendant » ne vaut pas pour elle. Une session ne construit rien à partir d'elle tant que la coordination ou EJP Tech ne l'a pas confirmée. Une seule s'applique dès qu'EJP Tech la confirme : P30 (listes de noms bornées, étape 3).
- **Décidé par EJP Tech le 6 octobre 2026, révisable par la coordination** : décision prise sur mandat de la personne responsable (P32 à P41, détail dans `docs/conception/vague-1-decisions.md`). Elle remplace les propositions « à l'étude » qu'elle cite, qui portent un renvoi. Elle s'applique à l'étape 4a ; le BRIEF la reçoit au mode plan de cette étape, après l'accord de la personne responsable sur le plan. La coordination peut la réviser : correction tant que rien n'est saisi, remplacement ensuite.
- **Décidé par la personne responsable le 6 octobre 2026** : réponse de la personne responsable à une question du plan de l'étape 4 qui renverse une décision d'EJP Tech (P42). Elle s'applique à l'étape 4 et remplace ce qu'elle cite, qui porte un renvoi ; le BRIEF la reçoit au commit de documents qui ouvre W0.

Quand une proposition est confirmée ou changée, mets à jour son statut ici, puis `BRIEF.md` (section 4 et la section citée). Questions encore ouvertes : la date de mise en ligne et l'existence d'une charte visuelle EJP.

### Renumérotation du 6 octobre 2026

Les branches `main` et `etape-kpi-conception` ont numéroté leurs entrées en parallèle. À la fusion (branche `etape-4-preparation`), `main` garde ses numéros (P01 à P14, T01 à T32) et les entrées de la conception des KPI prennent les numéros libres suivants. Les renvois dans ce fichier et dans `docs/conception/*.md` ont été mis à jour une seule fois.

| Ancien numéro (conception) | Nouveau numéro | Titre                                                                                              |
| -------------------------- | -------------- | -------------------------------------------------------------------------------------------------- |
| P14                        | P31            | Rappels de saisie par email                                                                        |
| T26                        | T33            | Unité, plafond, groupe et marque sensible d'un indicateur                                          |
| T27                        | T34            | Indicateurs créés par lots de migration, avec un catalogue                                         |
| T28                        | T29            | EJP Tech voit les chiffres (fusionnée dans « EJP Tech lit tout comme le berger »)                  |
| T29                        | T35            | Configuration des indicateurs et indicateurs créés par les ministères                              |
| T30                        | T30            | Validation par EJP Tech des indicateurs (fusionnée dans le T30 de `main`)                          |
| P18, P28                   | aucun          | Numéros libres, non réutilisés : P18 et P28 sont devenues T26 et T27 le 5 octobre, puis T33 et T34 |

P14 « Calculs affichés » garde son numéro. P15 à P30 ne changent pas. T26 à T32 de `main` ne changent pas.

## Décisions

### D1. STARs de service et STARs actifs

- **Date** : 30 septembre 2026
- **Sujet** : saisie globale unique ou saisie par ministère.
- **Décision** : une saisie par ministère ; l'outil calcule le total de l'église.
- **Origine** : Coordination et EJP Tech
- **Statut** : Décidé
- **BRIEF** : section 3 (règles 3 et 4), section 4

### D2. Double comptage

- **Date** : 30 septembre 2026
- **Sujet** : un STAR présent pour deux ministères.
- **Décision** : le dimanche, un STAR ne sert que dans un ministère : pas de double compte. Aux événements hors culte (sessions Bâtir l'Église, Anti-Dispersion, autres rassemblements), un STAR peut être saisi par deux ministères mais ne compte qu'une fois dans les totaux, sans aucune donnée personnelle (ni nom, ni liste de personnes).
- **Origine** : Coordination et EJP Tech
- **Statut** : Décidé
- **BRIEF** : section 3 (règle 5), sections 4 et 6 (`participation.deja_comptes`)

### D3. Marquer un point traité

- **Date** : 30 septembre 2026
- **Sujet** : un ministère mentionné peut-il marquer un point traité ?
- **Décision** : oui, avec un commentaire obligatoire qui explique ce qui a été traité et comment. Pour le berger, le commentaire est facultatif.
- **Origine** : Coordination et EJP Tech
- **Statut** : Décidé (complément en P03)
- **BRIEF** : section 3 (règle 8), sections 6, 7 et 9

### D4. Compte de l'administration de l'église

- **Date** : 30 septembre 2026
- **Sujet** : forme du compte de l'administration.
- **Décision** : un compte dédié, avec une adresse email dédiée.
- **Origine** : Coordination et EJP Tech
- **Statut** : Décidé
- **BRIEF** : section 2, section 8

### D5. Nom de l'outil

- **Date** : 30 septembre 2026
- **Sujet** : « Le point du berger », « Pilotage des ministères » ou un autre nom.
- **Décision** : « Pilotage EJP » (identifiant technique `pilotage-ejp`). Il s'affiche dans l'en-tête, l'écran de connexion, le titre des pages, l'application d'authentification (`issuer`), l'écran de consentement Google et l'expéditeur des emails.
- **Origine** : Coordination et EJP Tech
- **Statut** : Décidé
- **BRIEF** : titre, sections 1, 8 et 10

### D6. Dépôt du code

- **Date** : 30 septembre 2026
- **Sujet** : où vit le dépôt.
- **Décision** : sur le compte GitHub de l'église, `https://github.com/eglisejp-tech/pilotage-ejp`, privé. Commits signés « EJP Tech » (eglisejptech@gmail.com), identité propre au dépôt.
- **Origine** : Coordination et EJP Tech
- **Statut** : Décidé
- **BRIEF** : sections 4 et 12 ; `DEMARRAGE.md`

### D7. Version de React

- **Date** : 30 septembre 2026
- **Sujet** : React 18 prévu par le kit.
- **Décision** : React 19. React Router 8 exige React 19, et shadcn/ui ne transmet plus les refs sous React 18.
- **Origine** : Coordination et EJP Tech
- **Statut** : Décidé
- **BRIEF** : section 5

## Propositions à confirmer par la coordination

### P01. Convention du « ministère principal »

- **Date** : 30 septembre 2026
- **Sujet** : appliquer D2 sans aucun nom, et compter les STARs actifs une seule fois.
- **Décision** : chaque STAR a un ministère principal, connu des personnes et jamais stocké. À une session, chaque ministère saisit tous ses STARs présents, puis « dont déjà comptés par leur ministère principal » ; le total additionne présents moins déjà comptés. Les STARs actifs (et « dont en FIJ ») se comptent seulement dans le ministère principal. La coordination explique la convention aux ministères avant la mise en ligne.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par la coordination
- **BRIEF** : section 3 (règles 4 et 5), sections 4, 6 et 9

### P02. Autres rassemblements hors culte

- **Date** : 30 septembre 2026
- **Sujet** : D2 cite « d'autres rassemblements », absents du modèle.
- **Décision** : l'administration les déclare comme des sessions de type « Autre rassemblement », avec un nom de 80 caractères ; même saisie, même complétude, pas de courbe. Les événements du calendrier ne portent pas de comptage.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par la coordination
- **BRIEF** : section 3 (règle 5), sections 4, 6 et 9

### P03. Complément de D3

- **Date** : 30 septembre 2026
- **Sujet** : cas que D3 ne tranche pas (conseil, ministère créateur).
- **Décision** : tout compte de ministère, créateur ou mentionné, écrit un commentaire de 10 à 280 caractères ; pour le conseil, comme pour le berger, il est facultatif. L'administration de l'église et EJP Tech ne marquent jamais un point traité. Un point traité ne se rouvre pas : si le sujet revient, on crée un nouveau point.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par la coordination
- **BRIEF** : section 3 (règle 8), section 7

### P04. Statuts intermédiaires d'un point

- **Date** : 30 septembre 2026
- **Sujet** : personne ne pouvait poser « En cours » ni « En attente de décision ».
- **Décision** : le ministère créateur et les ministères mentionnés changent le statut d'un point ouvert (À traiter, En cours, En attente de décision). Le berger et le conseil lisent et marquent traité. Titre, textes, priorité, échéance et mentions sont fixés à la création.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par la coordination
- **BRIEF** : section 3 (règle 7), sections 7 et 9

### P05. Saisie et correction des sessions

- **Date** : 30 septembre 2026
- **Sujet** : qui peut saisir une session, et comment corriger une déclaration.
- **Décision** : tout ministère actif peut saisir une session datée d'aujourd'hui ou avant ; la liste des attendus sert à la complétude et aux manquants. L'administration modifie les ministères attendus d'une session, et supprime une session tant qu'aucun ministère n'a saisi.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par la coordination
- **BRIEF** : section 3 (règle 5), sections 7 et 9

### P06. Qui voit quoi

- **Date** : 30 septembre 2026
- **Sujet** : contradictions entre la V2 (.docx), la planche 00 et le brief.
- **Décision** : l'administration de l'église voit la vue de l'église, les comptes, les sessions et le journal, mais ni les fiches ni les points. Un ministère et l'administration voient pour les autres ministères le nom, la fraîcheur et le prochain événement, pas leur prochaine réunion ni leur point ouvert. EJP Tech ne voit aucun chiffre : seulement les textes à relire et le journal technique. La matrice 3.1 de la V2 est dépassée.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par la coordination. Modifié par T29 (EJP Tech voit les chiffres). Revue par T35 (à l'étude) : l'administration verrait aussi les définitions et l'usage des indicateurs propres (« saisi 4 mois sur 5 »), jamais une valeur. Revue par T30 (6 octobre 2026) : le berger et le conseil voient un indicateur ajouté par un ministère et encore à valider, marqué ; le texte « Pourquoi cet indicateur ? » n'est lu que par le ministère qui l'a écrit et par EJP Tech (proposé) ; l'alerte des événements en attente de validation s'affiche au berger, au conseil, à EJP Tech et au ministère de l'événement, jamais à l'administration ni aux autres ministères ; « Prochain événement » ne change pas
- **BRIEF** : sections 2, 7 et 9
- **Mise à jour** : 5 octobre 2026, la partie EJP Tech est remplacée par T29 (EJP Tech lit tout comme le berger, en lecture seule).

### P07. Création des comptes

- **Date** : 30 septembre 2026
- **Sujet** : premier compte d'administration, comptes EJP Tech, secours.
- **Décision** : EJP Tech amorce une seule fois le compte de l'administration, sur demande écrite de la coordination qui donne l'adresse dédiée (D4). Ensuite l'administration crée tous les autres comptes, EJP Tech compris (EJP Tech demande, l'église décide). Perte du code de l'administration et changement d'adresse d'un compte : EJP Tech agit sur demande écrite et le note au registre.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par la coordination
- **BRIEF** : section 8

### P08. Indicateurs propres

- **Date** : 30 septembre 2026
- **Sujet** : liste contradictoire, créateur et nature non définis.
- **Décision** : EJP Tech les crée par une migration, sur demande écrite de l'administration ; deux natures (dimanche, à ce jour) ; saisie dans le formulaire du dimanche. Liste V1 à fixer : Communication « Visuels livrés ce mois » ; Prodiges Junior « Enfants accueillis le dimanche » ; EJP Formation « Parcours en cours » ; Intégration « NA », « NC », « Intégrés en FIJ ».
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par la coordination. Revue par P22 (enfants) et par T35 (à l'étude) : première vague par migration dans un catalogue, puis création à l'écran Indicateurs ; trois rythmes (dimanche, mois, à ce jour)
- **BRIEF** : section 4, section 9

### P09. Statuts d'événement

- **Date** : 30 septembre 2026
- **Sujet** : la V2 confie « Gérer les statuts » à l'administration, le brief les affiche en lecture.
- **Décision** : le ministère qui porte l'événement reporte sa date et son statut, à la création puis à chaque changement. La liste des statuts est fixe ; l'administration ne les change pas.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par la coordination. Revue par T30 (6 octobre 2026, décidé) : inchangée, la validation reste en dehors de l'outil et le ministère reporte tous les statuts, « Validé » compris ; une alerte dans l'outil signale un événement encore « En attente de validation » à 3 jours ou moins de sa date, ou passé, jusqu'à ce que le ministère change son statut (conception à l'étude, `docs/conception/validation-metier.md`, section 4)
- **BRIEF** : section 3 (règle 14), sections 6 et 9

### P10. Départ d'une personne d'un compte partagé

- **Date** : 30 septembre 2026
- **Sujet** : ordre des gestes pour qu'une personne partie ne reprenne pas le compte.
- **Décision** : le ministère change d'abord le mot de passe de la boîte mail partagée ; l'administration clique « Refaire l'activation » (facteurs supprimés, mot de passe aléatoire) ; le responsable refait aussitôt « Mot de passe oublié » puis l'activation.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par la coordination
- **BRIEF** : section 8 (règle 4)

### P11. Durée des sessions de connexion

- **Date** : 30 septembre 2026
- **Sujet** : « 12 h » imposerait mot de passe et code chaque dimanche.
- **Décision** : en production (offre Pro), inactivité 14 jours et durée maximale 30 jours ; déconnexion locale seulement (`scope: 'local'`).
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par la coordination
- **BRIEF** : section 8 (règle 6)

### P12. Environnements et budget

- **Date** : 30 septembre 2026
- **Sujet** : l'offre gratuite de Supabase n'a ni sauvegarde, ni réglage de session, et se met en pause.
- **Décision** : préproduction sur l'offre gratuite (données fictives) ; production sur l'offre Pro, région Paris ; front sur Netlify, offre gratuite. Comptes, organisations et moyens de paiement au nom de l'église.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par la coordination. Front sur Netlify décidé par EJP Tech le 5 octobre 2026 : Vercel a été envisagé, mais son offre gratuite est réservée à un usage personnel. Projet Supabase de préproduction créé le 5 octobre 2026 (`ugbitornbspatpcowlvg`, région Paris, offre gratuite).
- **BRIEF** : section 5

### P13. Données personnelles et fin de vie

- **Date** : 30 septembre 2026
- **Sujet** : l'outil traite des emails et révèle une appartenance religieuse ; il est temporaire.
- **Décision** : inscription au registre des traitements, page « Confidentialité », sous-traitants sous contrat, aucun traceur. Fin de vie décidée par la coordination : annonce au moins une semaine avant, export final remis à la coordination, suppression des projets et des comptes de service, archivage du dépôt.
- **Origine** : Proposition EJP Tech
- **Statut** : Décidé le 5 octobre 2026 par EJP Tech, la coordination n'ayant rien à ajouter ; le préavis passe d'un mois à au moins une semaine (voir T17)
- **BRIEF** : section 7 (« Données personnelles »), section 13 (étape 8)

### P14. Calculs affichés

- **Date** : 30 septembre 2026
- **Sujet** : semaine affichée, écarts, complétude et fraîcheur sans définition.
- **Décision** : dates à l'heure de Paris ; le dimanche de référence bascule le dimanche à 12 h ; écarts calculés à périmètre égal (les écarts bruts des maquettes inversaient parfois le sens) ; complétude sur les ministères actifs à la date ; fraîcheur = dernière ligne de journal écrite par le ministère.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par la coordination
- **BRIEF** : section 3 (règles 6, 11, 12 et 13)

### P15. Tri des KPI de la coordination

- **Date** : 5 octobre 2026
- **Sujet** : la coordination propose 185 demandes (176 KPI et 9 graphiques ; six lignes groupent plusieurs chiffres) pour 22 ministères ; le modèle ne connaît que des comptes entiers du dimanche ou à ce jour, et la liste V1 de P08 n'en comptait que six.
- **Décision** : chaque demande devient un compte entier saisi par le ministère (indicateur propre), une valeur calculée (jamais saisie, avec sa complétude), un indicateur commun déjà existant, un point d'attention (texte), ou elle est retirée. Taux, moyennes, cumuls et évolutions se calculent toujours, comme le pourcentage FIJ. Libellés de 60 caractères au plus, raccourcis par EJP Tech. Classement ligne à ligne (annexe de la conception), phases et questions (C1 à C3, K1 à K57) : `docs/conception/kpi-ministeres.md`.
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par la coordination (C1 à C3 d'abord : l'outil est temporaire, la liste est-elle pour lui ?). Revue par P32 (6 octobre 2026, décidé par EJP Tech) : C1 à C3 tranchées, toute la liste entre dans la vague 1 (`docs/conception/vague-1-decisions.md`)
- **BRIEF** : section 3 (règles 3, 4 et 9), section 4 (« Indicateurs propres ») ; le BRIEF n'est pas modifié

### P16. Nature « mois » pour les comptes par période

- **Date** : 5 octobre 2026
- **Sujet** : 68 demandes se comptent par semaine ou par mois. La convention du BRIEF (un indicateur « ce mois » saisi « à ce jour » et remis à zéro) date la valeur du jour de saisie : le total de septembre saisi le 2 octobre compterait pour octobre.
- **Décision** : nouvelle nature « mois » : `date_ref` est le 1er jour du mois ; le formulaire propose le mois en cours et les deux précédents ; la base refuse un autre jour que le 1er et un mois futur (heure de Paris), et le mois en cours pour un indicateur sensible (P22) ; la saisie la plus récente d'un mois fait foi ; total, cumul de l'année et complétude par mois. Un compte vraiment hebdomadaire reste « dimanche » (la semaine du lundi au dimanche). Pas de nature « année » : l'année se calcule. Nouvelle migration (contrôle de `indicateur.nature`, trigger `controler_mesure`, vues) et tests pgTAP ; `mesure` reste en ajout seulement.
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par la coordination (période, K1) et par EJP Tech (modèle). Revue par P33 (6 octobre 2026) : nature « mois » retenue ; la semaine du lundi au dimanche se saisit au rythme « dimanche »
- **BRIEF** : section 4 (« Indicateurs propres »), section 6 (`indicateur`, « Règles d'intégrité ») ; le BRIEF n'est pas modifié

### P17. Activités propres à un ministère

- **Date** : 5 octobre 2026
- **Sujet** : Welcome Prodiges, sessions de baptême, Prière des Stars, répétitions, activités de Kumi et d'Eagles se comptent par activité. Hypothèse à vérifier : ce ne seraient pas des sessions d'église. Mais si la Prière des Stars ou Welcome Prodiges réunit les STARs de plusieurs ministères, la règle 5 du BRIEF et D2 les rangent parmi les rassemblements à déclarer (K35, K18).
- **Décision** : en phase 1, nature « dimanche » si l'activité a lieu le dimanche, sinon comptes du mois (activités du mois, présents du mois). En phase 2, si la coordination confirme le besoin d'un chiffre par activité : nature « jour », une valeur par date d'aujourd'hui ou avant. Une activité d'un seul ministère ne se déclare pas comme session d'église ; un rassemblement qui réunit les STARs de plusieurs ministères se déclare comme session « Autre rassemblement » (règle 5, D2 : chaque ministère saisit ses présents, un STAR n'est compté qu'une fois). Pas de table d'activités.
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par la coordination (K18, K21, K35, K42, K57) et par EJP Tech (modèle). Revue par P33 (6 octobre 2026) : ni nature « jour » ni nature « activité » ; les activités se comptent au mois ou à la semaine
- **BRIEF** : section 3 (règle 5), section 4, section 6 ; le BRIEF n'est pas modifié

### P19. Valeurs calculées déclarées par migration

- **Date** : 5 octobre 2026
- **Sujet** : 23 demandes sont des cumuls, taux, moyennes ou évolutions ; un indicateur propre n'a pas de code, l'interface ne peut donc pas le nommer dans un calcul.
- **Décision** : nouvelle table `indicateur_calcul` (ministère, libellé, type, numérateur, dénominateur, ordre), écrite par migration, lue comme `indicateur` (rien pour EJP Tech), et vue `v_calcul`. Trois types : cumul depuis le 1er janvier (heure de Paris), ratio de deux indicateurs du même ministère sur la même période, moyenne par activité (phase 2). Affichage avec complétude ; « Non calculé » si le dénominateur manque ou vaut zéro. Un taux sans dénominateur défini n'est pas créé. Complétude dans le temps : les périodes attendues (dimanches ou mois) depuis le 1er janvier ou depuis la création de l'indicateur, la plus récente des deux ; pour la moyenne par activité et la nature « jour », aucune complétude n'est possible (personne ne déclare les activités prévues, K57). La règle 13 du BRIEF, qui ne définit pas cette complétude dans le temps, sera complétée à la confirmation.
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par EJP Tech (modèle) et par la coordination (dénominateurs, année et complétude, K2 à K4, K57). Revue par T35 (5 octobre 2026) : pas de table `indicateur_calcul` ; un taux ou une moyenne devient une ligne d'`indicateur` qui ne se saisit pas, créée à l'écran ; le cumul devient la somme automatique de l'année ; la moyenne par activité reste en phase 2. Revue par P34 (6 octobre 2026) : sources des calculs dans `indicateur_terme` dès la migration de définition ; différence signée, somme et évolution livrées dans les 4 semaines après la mise en service
- **BRIEF** : section 3 (règles 3, 4 et 13), section 6 ; le BRIEF n'est pas modifié

### P20. Comptages d'événements

- **Date** : 5 octobre 2026
- **Sujet** : événements prévus, réalisés, annulés, reportés et couverts ; l'état « reporté » n'existe pas, et rien ne relie un événement aux ministères qui le couvrent.
- **Décision** : réalisés = dernier état « Terminé » ; prévus = dernier état « Validé » ou « En préparation », daté d'aujourd'hui ou après ; annulés = dernier état « Annulé » ; reporté = date repoussée, lue dans l'historique de `evenement_etat`, sans nouvel état. Comptés par mois, en phase 2 : chaque ministère lit les siens, et Coordination, si elle compte ceux de tous (K11), ne lit que des totaux de l'église par mois, sans détail par ministère (P06). Un événement couvert par un autre ministère se compte par un compte du mois saisi par ce ministère, sans lien avec l'événement ni total de l'église.
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par la coordination (K9 à K11). Revue par T30 (6 octobre 2026) : sans effet, les événements ne se valident pas dans l'outil (règle 14) ; la règle du 5 octobre (seuls les événements validés par EJP Tech se comptent) est retirée. Revue par P38 (6 octobre 2026) : comptages livrés dans les 4 semaines après la mise en service, « reporté » compté dans le mois de la date quittée, « couvert » saisi par mois par chaque ministère
- **BRIEF** : section 3 (règle 14), section 6 (`evenement_etat`), section 11 ; le BRIEF n'est pas modifié

### P21. Suivi de personnes remplacé par des comptes

- **Date** : 5 octobre 2026
- **Sujet** : taux de retour, de conversion et de perte des NA, parcours vers la FIJ, participants uniques, parcours du jeune, enfants revenus, nouveaux bénéficiaires ou participants, satisfaction : tous supposent de reconnaître une personne d'une fois à l'autre.
- **Décision** : l'outil ne suit aucune personne. Chaque KPI devient un compte agrégé saisi par le ministère (par exemple « NA revenus ce dimanche »), et un taux éventuel est un ratio de totaux, présenté comme tel ; sinon il est retiré. Le comptage se fait hors de l'outil ; l'outil ne reçoit qu'un nombre.
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par la coordination (K4). Revue par P34 (6 octobre 2026) : retenue pour tous les taux, ratios de totaux saisis
- **BRIEF** : section 3 (règle 9), section 7 (« Données personnelles ») ; le BRIEF n'est pas modifié

### P22. Domaines sensibles

- **Date** : 5 octobre 2026
- **Sujet** : Santé, Social, Call your sister (Kumi), la plate-forme d'écoute (Eagles) et, pour les enfants, Prodiges Junior : un petit nombre daté peut désigner une personne (santé, situation personnelle, mineurs ; article 9 du RGPD). Comme `mesure` est en ajout seulement (`saisi_le`) et que le détail du journal (valeur, date) est lu par le berger et le conseil, deux saisies successives d'un mois en cours révèlent un écart au jour près (« 1 prise en charge entre le 4 et le 11 octobre »). Un total par mois ne suffit donc pas : il faut aussi que le mois soit clos.
- **Décision** : colonne `indicateur.sensible` (migration). Pour ces indicateurs : nature « mois » seulement, et `controler_mesure` refuse le mois en cours (seuls les mois écoulés, heure de Paris, se saisissent) ; la fiche et le journal ne montrent que la valeur du mois, pas la suite des saisies, et le `detail` du journal n'a pas de valeur pour eux. Aucune ventilation, aucun texte libre lié au chiffre ; visibles par le ministère, le berger et le conseil (règle des indicateurs propres), jamais sur la vue de l'église, ni dans un email, ni dans la lecture du journal par l'administration. Prodiges Junior : « enfants présents » (gros nombres) se sépare de « nouveaux enfants » et « enfants déjà venus » ; ces deux derniers sont sensibles et se comptent par mois écoulé, les enfants présents se comptent chaque dimanche si la coordination l'accepte (K5). Le seuil d'affichage des très petits nombres est laissé à la coordination (K5). **P22 modifie P08** : l'indicateur « Enfants accueillis le dimanche » de la liste V1 (section 4 du BRIEF) n'existerait plus tel quel. Les pages Confidentialité et Conditions d'utilisation gagnent chacune une phrase, soumise à la validation de la coordination (voir K56 pour le registre).
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par la coordination (K5, K56). Revue par T35 (5 octobre 2026) : le journal ne porte plus aucune valeur d'indicateur propre ; proposé, les lignes brutes de `mesure` restent lisibles par l'API tant que le seuil K5c n'est pas retenu (au lieu d'une lecture par la vue du mois seulement) ; un chiffre jugé sensible après coup se retire pour confidentialité ; au lot 2, un ministère qui suit un domaine sensible fait valider les indicateurs qu'il écrit. Revue par T30 (5 et 6 octobre 2026) : tout indicateur créé par un ministère est validé, par EJP Tech seul (la condition « domaine sensible » disparaît) ; proposé, les indicateurs sensibles sont contrôlés comme les autres par la confirmation « Vérifiez ce chiffre », qui ne montre au ministère que ses propres valeurs et rien aux autres profils. Revue par P35 (6 octobre 2026) : seuil « moins de 3 » retenu, sans fuite par différence ; lignes brutes sensibles lisibles par le ministère seul (Q9 inversée) ; registre et note d'analyse remis à la coordination avant l'activation des indicateurs sensibles. Revue par P42 (6 octobre 2026) : les indicateurs sensibles sont créés et actifs dès la vague 1, sans attendre la remise du registre et de la note, qui se fait avant la mise en service sans rien conditionner ; toutes les protections restent
- **BRIEF** : section 3 (règle 9), section 4 (liste V1 de P08), section 7 (« Données personnelles ») ; le BRIEF n'est pas modifié

### P23. Chiffres financiers

- **Date** : 5 octobre 2026
- **Sujet** : chiffre d'affaires, marge et panier moyen (Merch), fonds levés (Social), budget (Production).
- **Décision** : retenus seulement si la coordination le veut (K6) : unité euros, arrondi à l'euro, plafond relevé, aucun nom de donateur ni de client ; visibles par le ministère, le berger et le conseil ; l'administration de l'église ne les voit pas, sauf décision contraire. La comptabilité de l'église fait foi en cas d'écart.
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par la coordination (K6). Revue par P36 (6 octobre 2026) : chiffres en euros retenus, cachés à l'administration
- **BRIEF** : section 7 (« Choix de visibilité ») ; le BRIEF n'est pas modifié

### P24. Chiffres de plateformes externes

- **Date** : 5 octobre 2026
- **Sujet** : vues, portée, abonnés, engagement, spectateurs du direct, Pages Roses, formulaire de recrutement.
- **Décision** : saisis à la main, en « à ce jour » pour un stock (abonnés, vues cumulées) ou en « mois » pour un flux ; la plateforme se nomme dans le libellé ; la date de relevé est la date de saisie ; aucune connexion aux plateformes. L'engagement se calcule à partir de deux comptes. Un même chiffre n'est reporté que par un ministère (K7).
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par la coordination (K7). Revue par P36 (6 octobre 2026) : stocks en « à ce jour » relevés chaque mois, flux au mois ; les vues cumulées sont la somme des vues mensuelles depuis janvier
- **BRIEF** : section 4 ; le BRIEF n'est pas modifié

### P25. Ministère Tech et comptes EJP Tech

- **Date** : 5 octobre 2026
- **Sujet** : EJP Tech est à la fois l'administration de la plateforme, qui ne voit aucun chiffre, et un ministère qui a des KPI (Tech).
- **Décision** : le ministère Tech a un compte de ministère, avec sa propre boîte mail partagée, distinct des comptes EJP Tech. Les comptes EJP Tech ne changent pas et ne voient toujours aucun chiffre ; le compte du ministère Tech voit ce que voit tout ministère (vue de l'église, sessions, carte des FIJ, sa fiche). Si ce sont des personnes d'EJP Tech qui tiennent ce compte, elles voient donc les chiffres de l'église et relisent les textes libres : la règle « EJP Tech ne voit aucun chiffre » (P06) est alors vidée en pratique. Cette conséquence est à faire accepter (K30) ; rien n'est posé sur qui tient le compte avant la réponse.
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par la coordination (K30). Revue par P37 (6 octobre 2026) : accepté, validation depuis un compte EJP Tech, de préférence le second
- **BRIEF** : section 2, section 7 (« Choix de visibilité ») ; le BRIEF n'est pas modifié

### P26. Un chiffre, une source

- **Date** : 5 octobre 2026
- **Sujet** : plusieurs KPI recoupent les indicateurs communs ou ceux d'un autre ministère (STARs actifs et en service de MDS, mobilisés, bénévoles actifs, nouvelles intégrations, vues de Film et de MCAD). Un STAR n'est compté que dans son ministère principal (règle 4, P01) : une bénévole de Kumi dont le ministère principal est un autre n'est pas dans les actifs de Kumi, et « mobilisés » ne couvre que les dimanches alors que Santé, Sécurité, MCAD et Multilingue sont aussi mobilisés aux événements.
- **Décision** : STARs actifs et au service : seulement les indicateurs communs, saisis par chaque ministère (D1) ; MDS ne saisit pas un deuxième total de l'église. **Hypothèses à vérifier avec chaque ministère (K8, K43, K44, K52)** : les mobilisés, équipiers, agents, animateurs et interprètes seraient les STARs au service du dimanche ; les bénévoles actifs de Kumi et d'Eagles seraient leurs STARs actifs ; les nouveaux STARs seraient comptés par MDS seul. Tant que le ministère n'a pas répondu, ces lignes sont classées « Commun » avec la mention « hypothèse », et celles de Kumi et d'Eagles sur les intégrations dans les équipes sont « À préciser » (K55). Lives et diffusions en direct : un seul indicateur. Vues : un seul ministère.
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par la coordination et par chaque ministère concerné (K8, K52, K55). Revue par P37 (6 octobre 2026) : « STARs au service » compte là où l'on sert, quel que soit le ministère principal ; mobilisés hors dimanche par « Mobilisés aux événements »
- **BRIEF** : section 3 (règles 3 à 5), section 4 ; le BRIEF n'est pas modifié

### P27. Coordo FIJ et ministère FIJ

- **Date** : 5 octobre 2026
- **Sujet** : Coordo FIJ demande des chiffres par département et chaque mardi ; le ministère FIJ saisit déjà la carte des 8 départements.
- **Décision** : Coordo FIJ est le ministère FIJ (code `fij`), renommé par migration si la coordination le veut ; la carte reste telle quelle. Les autres chiffres par département ou du mardi attendent une liste précise et demanderaient une table par département et par date (phase 3).
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par la coordination (K46, K47). Revue par P40 (6 octobre 2026) : statistiques par département construites avant la mise en service
- **BRIEF** : section 4 (`fij_departement`), section 6 ; le BRIEF n'est pas modifié

### P29. Phasage des KPI

- **Date** : 5 octobre 2026
- **Sujet** : tout construire avant la mise en service la repousserait et chargerait les ministères de saisies.
- **Décision** : phase 1, avec la mise en service : P16, T33, T34 et P19 dans une nouvelle étape « 4a » avant l'étape 4 (nom provisoire, absent de la section 13 du BRIEF) ; six indicateurs saisis au plus par ministère, choisis parmi les candidats de la conception (K13) ; lecture du journal par l'administration qui ne montre que les chiffres communs d'un envoi mixte (par une fonction et une vue, pas par la RLS). Cet ajout allonge le chemin vers la mise en service de 6 à 9 jours de travail (date toujours ouverte, section 4 du BRIEF) : à peser contre le caractère temporaire de l'outil (C1). Phase 2, après la mise en service : activités datées, comptages d'événements, lots suivants. Phase 3, si la coordination la confirme : grands graphiques, chiffres de ministères sur la vue de l'église, chiffres FIJ par département, couverture d'événements, écran de configuration.
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par la coordination (C1, K13) et par EJP Tech. Revue par T35 (5 octobre 2026) : la migration `journal_administration_chiffres` devient inutile (plus aucune valeur propre au journal) ; l'écran de configuration passe de la phase 3 au lot 1 de T35, avant la mise en service ; plus de lot de migration après la première vague. Revue par P32 et P41 (6 octobre 2026) : plus de plafond de six ni de phase conditionnelle ; tout ce qui sert à saisir avant la mise en service, ce qui lit dans les 4 semaines qui suivent
- **BRIEF** : section 13 ; le BRIEF n'est pas modifié

### P30. Vue de l'église à 22 ministères

- **Date** : 5 octobre 2026
- **Sujet** : l'étape 3 (vue de l'église) est en cours avec un jeu d'exemple de 8 ministères ; la liste en compte 22.
- **Décision** : les indicateurs propres restent hors de la vue de l'église, sauf demande de la coordination (K12). L'étape 3 ne change ni le modèle ni le jeu d'exemple ; elle ajoute un test d'affichage à 22 ministères (tableau, barre de la session, listes de noms). Au-delà de trois noms, une liste devient « Coordination, Intégration, Social et 4 autres ministères » ; la liste complète reste lisible dans le tableau « Les ministères » et dans un libellé accessible (lecteur d'écran, tablette).
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; la borne des listes de noms s'applique à l'étape 3 dès qu'EJP Tech la confirme, le reste attend la coordination (K12). Revue par P39 (6 octobre 2026) : aucun indicateur propre sur la vue de l'église
- **BRIEF** : section 4, section 9 (« Phrase de la semaine », « Bloc de la session ») ; le BRIEF n'est pas modifié

### P31. Rappels de saisie par email

- **Date** : 5 octobre 2026
- **Sujet** : rien ne rappelle aux ministères de saisir leurs chiffres du dimanche ; les totaux restent incomplets. Une passerelle WhatsApp (OpenWA) a été étudiée.
- **Décision** : rappels par email depuis Supabase (tâche planifiée et Edge Function) avec le SMTP Gmail de l'église, vers les ministères attendus qui n'ont pas saisi ; aucune nouvelle donnée personnelle ni nouveau sous-traitant. WhatsApp écarté pour l'instant : OpenWA est non officiel (risque de blocage du numéro, déconseillé par le projet pour un usage réglementé) et toute solution WhatsApp demande des numéros de téléphone. Conception complète, options, risques et questions : `docs/conception/rappels-email.md`.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à valider par EJP Tech (questions Q1 à Q6 de la conception) ; à planifier après l'étape 4, précédé d'un essai d'envoi SMTP depuis une Edge Function de préproduction. La couverture des indicateurs (P32) ne dépend pas de ces rappels
- **BRIEF** : hors du BRIEF (le BRIEF ne prévoit pas de notification) ; section 7 (« Données personnelles ») à compléter d'une phrase si la décision est prise

## Propositions à confirmer par EJP Tech

### T01. Modèle des points d'attention

- **Date** : 30 septembre 2026
- **Sujet** : trois modèles proposés pour le commentaire de traitement et les statuts.
- **Décision** : `point_attention` et `point_mention` fixés à la création ; `point_suivi` en ajout seul porte chaque statut et le commentaire de traitement ; le statut courant est la ligne la plus récente (`v_point`) ; un seul traitement par point (index unique). Écriture seulement par `creer_point`, `changer_statut_point` et `marquer_traite`.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par EJP Tech
- **BRIEF** : sections 6 et 7

### T02. Événements et réunions

- **Date** : 30 septembre 2026
- **Sujet** : tables `evenement` et `reunion` non définies.
- **Décision** : `evenement` (identité) et `evenement_etat` (date et statut, en ajout seul) ; `reunion` en ajout seul, la déclaration la plus récente fait foi si sa date n'est pas passée.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par EJP Tech
- **BRIEF** : section 6

### T03. Format du journal

- **Date** : 30 septembre 2026
- **Sujet** : le journal ne portait ni code d'action, ni objet, ni détail, et aurait recopié des textes libres.
- **Décision** : codes d'action en liste fermée, `cible` et `cible_id`, `detail` jsonb sans texte libre ni email ; une ligne par envoi (triggers par instruction) ; écrit aussi par les fonctions et les Edge Functions avec le compte de l'appelant ; lecture par `v_journal`, qui affiche le texte actuel.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par EJP Tech
- **BRIEF** : section 6 (« Journal »), section 7

### T04. Modération

- **Date** : 30 septembre 2026
- **Sujet** : cibles incomplètes, champ non précisé, masquage partiel dans la maquette 15.
- **Décision** : cibles `point_attention`, `point_suivi`, `evenement`, `reunion` ; tout le champ est remplacé ; motif en liste fermée ; file par écriture (`v_textes_a_relire`) ; `marquer_relu` et `masquer_texte` sans SQL dynamique.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par EJP Tech
- **BRIEF** : sections 6, 7 et 9

### T05. Sécurité dans la base

- **Date** : 30 septembre 2026
- **Sujet** : droits, vues et fonctions sans règle précise.
- **Décision** : GRANT explicites (rien pour `anon`) ; fonctions `security definer` seulement dans `private`, appelées par des fonctions `public` en `security invoker` ; toutes les vues en `security_invoker` ; lectures communes par fonctions (`v_tableau_ministeres`, `v_textes_a_relire`, `v_etat_comptes`) ; politique restrictive `aal2` partout, sauf la lecture de sa propre ligne de `compte` ; matrice des droits écrite.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par EJP Tech
- **BRIEF** : sections 6, 7 et 8

### T06. Intégrité des saisies

- **Date** : 30 septembre 2026
- **Sujet** : auteur, date et `date_ref` modifiables par le client.
- **Décision** : trigger `private.forcer_auteur` (auteur et heure imposés), `date_ref` posée par la base pour un indicateur « à ce jour », contrôles de dates dans les triggers et les politiques, jamais dans un `check` ; « dont en FIJ » jamais supérieur aux actifs.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par EJP Tech
- **BRIEF** : section 6

### T07. Clés Supabase

- **Date** : 30 septembre 2026
- **Sujet** : Supabase retire les clés `anon` et `service_role` d'ici fin 2026.
- **Décision** : clé publique (`sb_publishable_...`) dans le navigateur, clé secrète (`sb_secret_...`) seulement dans les Edge Functions ; `.env.example` mis à jour à l'étape 2.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par EJP Tech
- **BRIEF** : sections 5 et 8

### T08. Emails, invitation et mot de passe oublié

- **Date** : 30 septembre 2026
- **Sujet** : le service d'email intégré de Supabase n'écrit qu'à l'équipe du projet ; les liens peuvent être consommés par les antivirus.
- **Décision** : SMTP personnalisé au nom de l'église (proposition : compte Google de l'église) ; liens vers `/acces`, qui demande un clic avant `verifyOtp` ; code avant le nouveau mot de passe ; liens valables 24 h.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par EJP Tech
- **BRIEF** : section 8

### T09. Double authentification

- **Date** : 30 septembre 2026
- **Sujet** : deuxième appareil, nom affiché, enrôlement abandonné.
- **Décision** : un seul facteur TOTP par compte ; un deuxième téléphone scanne le même QR code ; `issuer: 'Pilotage EJP'` ; les facteurs non vérifiés sont supprimés avant un nouvel enrôlement.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par EJP Tech
- **BRIEF** : section 8

### T10. Écrans non dessinés et règles d'interface

- **Date** : 30 septembre 2026
- **Sujet** : écrans, phrases, en-tête et adresses à deviner.
- **Décision** : accueil du ministère identique à toutes les tailles ; en-tête en deux formats (menu sous 1024 px) ; phrases générées par des gabarits fixes, sans texte libre ; table des adresses avec garde par profil ; écrans dérivés (Marquer traité, Changer le statut, Prochaine réunion, Mettre à jour l'événement, FIJ par département, accès par lien) ; boutons plus et moins de 64 px.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par EJP Tech
- **BRIEF** : section 9 ; `BRIEF_DESIGN.md` sections 6 et 7 ; `maquettes/LISEZMOI.md`

### T11. Jeu d'exemple et données de référence

- **Date** : 30 septembre 2026
- **Sujet** : jeu d'exemple figé dans le temps et contradictoire avec les maquettes.
- **Décision** : indicateurs communs et ministère FIJ dans une migration ; `seed.sql` pour le local et la CI, construit à partir du prototype et des maquettes, recalé d'un nombre entier de semaines au chargement ; valeurs attendues écrites dans le brief.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par EJP Tech
- **BRIEF** : section 6 (« Données de référence »), section 13

### T12. Outillage Claude Code sous Windows

- **Date** : 30 septembre 2026
- **Sujet** : hooks inopérants sans jq, règles Bash contournées par l'outil PowerShell, `/verifier` invisible pour Claude, migrations neuves bloquées.
- **Décision** : hooks en bash qui lisent leur entrée avec node et refusent en cas de doute (code 2) ; une migration est figée dès qu'elle est suivie par git ; outil PowerShell désactivé pour le projet ; commandes `npx supabase` locales autorisées, commandes distantes refusées ; `/verifier` invocable par Claude ; tests de base en CI tant que Docker manque ; démarrage conseillé en mode Plan (réglage VS Code).
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par EJP Tech
- **BRIEF** : section 12 ; `CLAUDE.md`, `DEMARRAGE.md`, `.claude/`

### T13. Travail sur le dépôt

- **Date** : 30 septembre 2026
- **Sujet** : protection de `main` impossible sur un dépôt privé gratuit.
- **Décision** : une branche et un commit par étape ; la personne pousse à la main et fusionne quand la CI est verte ; Claude ne pousse jamais. À ajouter plus tard : contrôle en CI qu'aucune migration déjà sur `main` n'est modifiée, Dependabot mensuel, `e2e/.auth/` dans `.gitignore` (étape 2).
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par EJP Tech
- **BRIEF** : section 12 ; `DEMARRAGE.md`

### T14. Sessions supprimées à la désactivation et à la réinitialisation

- **Date** : 1er octobre 2026
- **Sujet** : couper l'accès d'un compte désactivé ou dont la double authentification est refaite.
- **Décision** : `desactiver-compte` et `reinitialiser-2fa` suppriment les sessions du compte dans `auth.sessions` (les jetons de rafraîchissement suivent). Raison : supprimer un facteur par l'API d'administration de Supabase ne déconnecte pas le compte, ses sessions redescendent seulement en aal1, d'où l'on peut enrôler un nouveau facteur ; un bannissement garde les sessions, qui reviendraient à sa levée. `reinitialiser-2fa` remplace d'abord le mot de passe, supprime les sessions, puis les facteurs, et supprime de nouveau les sessions avec le journal.
- **Origine** : Audit de sécurité de l'étape 2, décision de la personne responsable
- **Statut** : Décidé
- **BRIEF** : section 8 (règle 4, « Les Edge Functions ») ; le BRIEF n'est pas modifié ; migrations `comptes_fonctions_serveur` et `comptes_revocation_sessions`

### T15. Session de l'appelant exigée par les fonctions de comptes

- **Date** : 1er octobre 2026
- **Sujet** : un jeton d'accès volé ou d'une session fermée reste valable jusqu'à son expiration (1 h).
- **Décision** : les Edge Functions de comptes passent à la base la revendication `session_id` du JWT vérifié ; la base exige une ligne de `auth.sessions` avec cet identifiant, l'utilisateur de l'appelant et le niveau aal2, sinon elle refuse (réponse 401 `{ erreur: 'session_revoquee' }`). Raison : comme la suppression des facteurs et le bannissement ne ferment pas les sessions (T14), ce contrôle coupe un jeton aal2 volé, ou celui d'une session déconnectée, pour les fonctions de comptes sans attendre son expiration.
- **Origine** : Audit de sécurité de l'étape 2, décision de la personne responsable
- **Statut** : Décidé
- **BRIEF** : section 8 (« Les Edge Functions », contrat commun) ; le BRIEF n'est pas modifié ; migration `comptes_session_appelant`

### T16. Fournisseur email gardé actif dans `config.toml`

- **Date** : 1er octobre 2026
- **Sujet** : le BRIEF demande `[auth.email] enable_signup = false` pour fermer l'inscription.
- **Décision** : `[auth.email] enable_signup = true`. Raison : dans la CLI Supabase, cette clé active le fournisseur email lui-même. À false, toute connexion par mot de passe est refusée (`email_provider_disabled`), constaté sur la première CI de l'étape 2. L'inscription reste fermée par `[auth] enable_signup = false`. Sur les projets distants, même logique : fournisseur Email activé, « Allow new users to sign up » désactivé.
- **Origine** : CI de l'étape 2 (constat technique), le BRIEF demandant de vérifier chaque nom de clé
- **Statut** : Décidé, confirmé par la personne responsable le 5 octobre 2026
- **BRIEF** : section 8 (« Supabase, local », ligne 906) ; le BRIEF n'est pas modifié

### T17. Conditions d'utilisation et politique de confidentialité

- **Date** : 5 octobre 2026
- **Sujet** : Google demande une politique de confidentialité pour publier la connexion Google ; le BRIEF ne prévoit pas de conditions d'utilisation.
- **Décision** : nouvelle page publique `/conditions` (« Conditions d'utilisation »), reliée depuis l'écran 16, le pied de page et le menu, à côté de « Confidentialité ». Le texte de `/confidentialite` est complété : responsable (l'Église des Jeunes Prodiges, par son ministère EJP Tech, 21 rue des Vieilles Vignes, 77183 Croissy-Beaubourg), contact `eglisejp.tech@gmail.com`, bases légales (articles 6.1.f et 9.2.d du RGPD), sous-traitants et transferts hors UE, durées de conservation (vie de l'outil, journaux techniques au plus 1 an, sauvegardes 7 jours), droits et réclamation à la CNIL. Un départ d'une personne d'un compte partagé est signalé sans délai à l'administration de l'église et à EJP Tech.
- **Origine** : EJP Tech, textes validés par la coordination
- **Statut** : Décidé
- **BRIEF** : section 7 (« Données personnelles »), section 9 (« Adresses ») ; le BRIEF n'est pas modifié, la route `/conditions` s'ajoute à son tableau des adresses

### T18. Accueil du ministère construit à l'étape 4

- **Date** : 5 octobre 2026
- **Sujet** : l'ouverture de la maquette 07 (ce qu'il reste à saisir, bouton principal jaune, « Vos saisies », « Vos points ») dépend des saisies et de la fiche du ministère, qui arrivent à l'étape 4.
- **Décision** : l'étape 3 ne construit pas cette ouverture ; elle vient à l'étape 4 avec la fiche du ministère. En attendant, le ministère voit sur `/` le numéro de semaine et la phrase de l'église (parties A et B et la ligne secondaire, sans surligneur, comme l'administration de l'église), puis « L'église cette semaine » : sous 600 px, trois chiffres et le bouton « Tout voir ».
- **Origine** : Plan de l'étape 3, décision de la personne responsable
- **Statut** : Décidé
- **BRIEF** : section 9 (« Accueil du ministère », « Vue de l'église selon le profil ») ; le BRIEF n'est pas modifié

### T19. « Marquer traité » caché dans « À décider » jusqu'à l'étape 5

- **Date** : 5 octobre 2026
- **Sujet** : la fenêtre « Marquer traité » et l'appel de `marquer_traite` arrivent à l'étape 5.
- **Décision** : jusqu'à l'étape 5, les points de « À décider » s'affichent sans le bouton « Marquer traité » : aucun bouton sans effet. Le bouton revient à l'étape 5, avec sa fenêtre.
- **Origine** : Plan de l'étape 3, décision de la personne responsable
- **Statut** : Décidé
- **BRIEF** : section 9 (« Ordre de « À décider » ») ; le BRIEF n'est pas modifié

### T20. Liens vers les autres types de session

- **Date** : 5 octobre 2026
- **Sujet** : le bloc de la session donne un lien vers chaque autre type qui a une session passée, sans dire où il mène.
- **Décision** : « Voir Anti-Dispersion » mène à `/?session=anti_dispersion` et « Voir les autres rassemblements » à `/?session=autre` ; chaque adresse montre, dans le bloc de la session, la session passée la plus récente de ce type. Sans paramètre, le bloc montre la dernière session passée, tous types confondus. Le lien vers Bâtir l'Église, quand un autre type est affiché, suit la même forme (`/?session=batir`).
- **Origine** : Plan de l'étape 3, décision de la personne responsable
- **Statut** : Décidé
- **BRIEF** : section 9 (« Bloc de la session ») ; le BRIEF n'est pas modifié

### T21. Ordre des apports dans le bloc de la session

- **Date** : 5 octobre 2026
- **Sujet** : le BRIEF ne fixe pas l'ordre des ministères dans la barre et la liste des apports.
- **Décision** : les apports se rangent par apport décroissant, à égalité par nom (ordre alphabétique) ; les ministères attendus qui n'ont pas saisi (« À saisir ») viennent en dernier, par nom.
- **Origine** : Plan de l'étape 3, décision de la personne responsable
- **Statut** : Décidé
- **BRIEF** : section 9 (« Bloc de la session ») ; le BRIEF n'est pas modifié

### T22. États vides

- **Date** : 5 octobre 2026
- **Sujet** : `LISEZMOI.md` donne quelques états vides (premier dimanche, aucun point ouvert) ; d'autres blocs peuvent manquer de données sans texte prévu.
- **Décision** : tout bloc qui peut manquer de données affiche un état vide écrit, jamais un blanc ni un zéro trompeur. Les textes de la vue de l'église sont réunis dans `src/features/cette-semaine/textesVides.ts` : ceux de `LISEZMOI.md` et du BRIEF quand ils existent, sinon des textes proposés dans le même style. Un type de session qui n'a encore jamais eu lieu garde sa ligne dans les chiffres, avec « Pas encore de saisie ». Les écrans des étapes suivantes suivent la même pratique.
- **Origine** : Plan de l'étape 3, demande de la personne responsable
- **Statut** : Décidé
- **BRIEF** : section 9 (« États à construire ») ; `LISEZMOI.md`, « États » ; le BRIEF n'est pas modifié

### T23. Écart d'une session : date de la session précédente

- **Date** : 5 octobre 2026
- **Sujet** : l'étiquette accessible de l'écart d'une session disait « par rapport à la session précédente ».
- **Décision** : l'étiquette nomme la session précédente du même type par sa date : « +1 par rapport à la session du 29 août, pour les 6 ministères qui ont saisi les deux fois ».
- **Origine** : Plan de l'étape 3, décision de la personne responsable
- **Statut** : Décidé
- **BRIEF** : section 3 (règle 12) ; le BRIEF n'est pas modifié

### T24. Mention d'un ministère au nom en plusieurs mots

- **Date** : 5 octobre 2026
- **Sujet** : une mention s'écrit « @nom », et certains noms ont plusieurs mots.
- **Décision** : l'étiquette d'une mention reprend le nom complet du ministère, tel qu'il est écrit : « @Prodiges Junior » ; un ministère désactivé garde sa mention, suivie de « (désactivé) » (« @Social (désactivé) », que la règle 7 écrit « @social (désactivé) »).
- **Origine** : Plan de l'étape 3, décision de la personne responsable
- **Statut** : Décidé
- **BRIEF** : section 3 (règle 7), section 9 ; le BRIEF n'est pas modifié

### T25. Bandeau « Hors ligne » à l'étape 7

- **Date** : 5 octobre 2026
- **Sujet** : `LISEZMOI.md` prévoit le bandeau « Pas de connexion internet. Les chiffres affichés peuvent dater. » sur toute page.
- **Décision** : le bandeau arrive à l'étape 7 (« Finitions », erreurs réseau). À l'étape 3, une lecture en échec affiche le bandeau d'erreur de page et « Réessayer ».
- **Origine** : Plan de l'étape 3, décision de la personne responsable
- **Statut** : Décidé
- **BRIEF** : section 13 (étape 7) ; `LISEZMOI.md`, « États » ; le BRIEF n'est pas modifié

### T26. Rendu des états de « Cette semaine »

- **Date** : 5 octobre 2026
- **Sujet** : `LISEZMOI.md` décrit le chargement, l'erreur de page et quelques états vides, sans dessin ; plusieurs détails restaient à fixer pour la vue de l'église.
- **Décision** : le chargement montre les titres de section et les filets du profil, puis un seul « Chargement » à la place de la phrase après 300 ms ; l'erreur de page ne montre que le bandeau, sous un titre « Cette semaine » réservé aux lecteurs d'écran ; dix secondes sans réponse donnent l'erreur de page. La carte des FIJ sans valeur dessine huit carrés neutres en pointillés avec le seul code du département, sans aucun nombre. Une ligne de chiffres sans valeur porte « Pas encore de saisie » sur les colonnes valeur, écart et courbe. Sur téléphone, le résumé du ministère se déplie par « Tout voir », qui devient « Voir moins » une fois ouvert.
- **Origine** : Plan de l'étape 3, choix de l'écran (lot B)
- **Statut** : Proposé, à confirmer par EJP Tech
- **BRIEF** : section 9 (« États à construire ») ; `LISEZMOI.md`, « États » ; le BRIEF n'est pas modifié

### T27. Session de la phrase et du résumé du ministère

- **Date** : 5 octobre 2026
- **Sujet** : `?session=` (T20) choisit la session du bloc de la session ; la ligne secondaire de la phrase et la ligne « Dernière session » du résumé du ministère citent aussi une session.
- **Décision** : seul le bloc de la session suit `?session=`. La ligne secondaire de la phrase et la ligne « Dernière session » du résumé citent toujours la session passée la plus récente, tous types confondus. Pour un rassemblement de type « autre », cette ligne n'a ni écart ni courbe : la base ne les calcule pas.
- **Origine** : Plan de l'étape 3, choix des lectures (lot A)
- **Statut** : Proposé, à confirmer par EJP Tech
- **BRIEF** : section 9 (« Bloc de la session ») ; le BRIEF n'est pas modifié

### T28. Vue de l'église sans « À décider » ; liens de session pour tous les profils

- **Date** : 5 octobre 2026
- **Sujet** : sans « À décider » (administration de l'église, ministère), la colonne de droite à côté des chiffres restait vide à partir de 1024 px ; l'administration de l'église voit aussi les liens « Voir Anti-Dispersion » du bloc de la session, alors que sa vue est « sans action ».
- **Décision** : sans « À décider », la carte des FIJ prend la colonne de droite à côté des chiffres à partir de 1024 px, et la session passe dessous, sur toute la largeur ; l'ordre de lecture ne change pas. À l'étape 4, « Vos points » prendra cette colonne pour le ministère, et la carte reviendra à côté de la session. Les liens vers les autres types de session (T20) restent pour tous les profils qui voient la vue de l'église, administration de l'église comprise : ils ne changent que la session affichée, ce ne sont pas des actions. Les participations de la dernière session de chaque type se lisent en une fois, pour que ces liens ne fassent pas repasser la page par le chargement.
- **Origine** : Revue de l'étape 3
- **Statut** : Proposé, à confirmer par EJP Tech
- **BRIEF** : section 9 (« Vue de l'église selon le profil », « Bloc de la session ») ; `LISEZMOI.md`, « Écarts connus » ; le BRIEF n'est pas modifié

### T29. EJP Tech lit tout comme le berger

- **Date** : 5 octobre 2026
- **Sujet** : EJP Tech ne faisait que des actions techniques (modération, journal technique) et ne voyait aucun chiffre. Pour aider un ministère en difficulté, et pour relire ce que soumettent les ministères (T30), il doit voir ce que voit le berger.
- **Décision** : EJP Tech (`admin_plateforme`) lit tout comme le berger, en lecture seule : indicateurs, saisies, carte des FIJ, sessions et ministères attendus, présences, événements et leurs états, réunions, points d'attention avec leurs mentions et leurs suivis, journal complet, tableau des ministères avec la prochaine réunion et le point ouvert. Il ne reçoit aucune action du berger ni du conseil : ni « Marquer traité », ni changement de statut, ni saisie pour un ministère, ni déclaration de session. La modération reste à EJP Tech seul ; l'état des comptes reste à l'administration de l'église seule. Dans la base, `private.lit_tout()` (berger, conseil, EJP Tech) ouvre les lectures, et `private.est_decideur()` (berger, conseil) décide toujours des actions. Écrans : l'accueil d'EJP Tech reste « Modération », et ses onglets deviennent « Modération », « Cette semaine », « Journal technique ». Sur « Cette semaine », EJP Tech voit le contenu du berger (phrase, « À décider », colonnes « Prochaine réunion » et « Point ouvert », chaque nom ouvre la fiche), sans aucun bouton d'action (`lectureSeule`). Il a aussi les adresses de lecture du berger (`/ministeres`, `/ministeres/:id`, `/points`), sans action, à mesure qu'elles se construisent (étapes 4 et 5). Le journal complet se lira dans son onglet « Journal technique » (étape 6) : l'adresse `/journal` reste celle des autres profils. La page Confidentialité le dit : « EJP Tech voit l'ensemble en lecture, pour administrer l'outil, et relit les champs libres. » Les chiffres des domaines sensibles (P22) suivent les mêmes règles que pour le berger. Revue par T30 (5 et 6 octobre 2026) : EJP Tech valide aussi, seul, la création d'un indicateur par un ministère (ni les chiffres, ni les événements) ; il configure les indicateurs sur l'écran commun avec l'administration (T35).
- **Origine** : décision de la personne responsable
- **Statut** : Décidé
- **BRIEF** : mis à jour le 5 octobre 2026 (revue de sécurité) : section 2 (profils, onglets, « Journal technique »), section 4 (« Décisions du 5 octobre 2026 »), section 6 (vues, `v_tableau_ministeres`), section 7 (`private.lit_tout()`, matrice des droits, politiques, tests obligatoires), section 9 (« Cette semaine » et « Journal technique » d'EJP Tech, vue de l'église selon le profil, « À décider », adresses), section 13 (vérifications des étapes 4 à 6) ; P06 ; migration `20261005172228_droits_lecture_ejp_tech.sql`, d'où repart toute évolution de `private.tableau_ministeres()` ; `LISEZMOI.md`, « Écrans non dessinés », « Vues d'un profil » et « Écarts connus » ; interface : `src/lib/metier/droits.ts` (`estDecideur`, `litTout`, `enLectureSeule`)

### T30. Validation par EJP Tech des indicateurs créés par les ministères

- **Date** : 5 octobre 2026, corrigée le 6 octobre 2026
- **Sujet** : EJP Tech ne fait pas que des actions techniques. La première version du principe (5 octobre) lui faisait valider les indicateurs, les événements et les chiffres inhabituels ; la décision du 6 octobre la remplace et la limite aux indicateurs.
- **Décision** : EJP Tech valide seulement la création d'un indicateur par un ministère (suggestions comprises, sauf si un document a déjà tranché autrement sous forme de question). Le ministère écrit pourquoi il veut cet indicateur dans un champ « Pourquoi cet indicateur ? » (10 à 280 caractères) : ce texte n'est jamais recopié dans le journal, et seuls le ministère qui l'a écrit et EJP Tech le lisent. **Ce champ n'a aucun rappel sur les données personnelles.** C'est une exception explicite, voulue par la personne responsable (6 octobre 2026), à la règle de CLAUDE.md « un rappel par formulaire, sous le premier champ libre » : dans le formulaire de suggestion, « Pourquoi » est le seul champ libre et n'a pas de rappel ; dans le formulaire d'un indicateur écrit, le rappel reste sous le premier champ (le nom), pas sous « Pourquoi ». EJP Tech décide dans un bloc « À valider » en haut de l'écran Indicateurs (pas d'onglet à part). La règle de correction du nom vaut aussi pour la définition. Les réglages du chiffre inhabituel sont un point de départ, revu après un mois. Phasage accepté : validation des indicateurs et alerte avant la mise en service, confirmation du chiffre inhabituel avant le 5e dimanche après la mise en service, un deuxième compte EJP Tech conseillé. Tant qu'il n'est pas validé, l'indicateur se saisit déjà, ses valeurs restent marquées « à valider » et hors de tout total. Un refus demande un motif (10 à 280 caractères). Le ministère corrige librement une faute dans le nom de son indicateur tant qu'il attend EJP Tech ; une fois validé, sa correction repart à EJP Tech, sans perdre de valeurs ni arrêter les saisies (l'indicateur compte sous son nom validé jusqu'à la validation de la correction). Les chiffres ne sont pas validés par EJP Tech : le ministère corrige les siens (une correction est une nouvelle saisie, la dernière gagne). Un chiffre inhabituel (règle explicable côté base, déjà conçue) ne déclenche, à la saisie, qu'une confirmation « Vérifiez ce chiffre » pour le ministère : il confirme ou corrige, puis le chiffre compte normalement. Aucune marque pour le berger, et les totaux de l'église n'ont plus de part « à valider ». Les événements ne sont pas validés par EJP Tech : la règle 14 reste (validation hors de l'outil, le ministère reporte le statut). Pas d'email en V1 pour l'alerte (il pourrait rejoindre P31). **Réponses du 6 octobre** : recommandations acceptées pour V1 à V6 et V8 ; V7 : oui. **Conception proposée, à l'étude** (`docs/conception/validation-metier.md`) : une demande (`demande_indicateur`, qui porte le « Pourquoi ») et une décision (`validation`) sont des lignes ajoutées, jamais des mises à jour, et la décision est définitive ; EJP Tech décide dans un bloc « À valider » en tête de l'écran Indicateurs, sans onglet à part ; le « Pourquoi » n'est lu que par le ministère et EJP Tech ; aucune décision automatique, et un ajout qui attend plus de 7 jours est signalé à l'administration. Chiffre inhabituel : loin de la médiane de ses 6 valeurs les plus récentes, sur les autres périodes, et loin du dernier chiffre confirmé par le ministère s'il y en a un (4 valeurs au moins, donc rien avant la 5e saisie ; facteur 3, ou 2 pour un « à ce jour » ; écart d'au moins 10) ; un filet contre la faute de frappe, pas un contrôle ; la confirmation est retenue sans valeur dans `chiffre_confirme`, que personne ne lit. Alerte : deux colonnes de `v_evenement` (`jours` et `a_confirmer`, à l'heure de Paris), un bloc « Événements à confirmer » sur « Cette semaine » (berger, conseil, EJP Tech), une ligne « Mettre à jour » dans « Vos saisies » du ministère et une marque dans le calendrier des fiches ; aucune table, aucun journal, rien pour l'administration. Phasage : 3,5 à 4 jours avant la mise en service (validation des ajouts, alerte), 2,5 à 3,5 jours ensuite (confirmation des chiffres avant le 5e dimanche, correction du nom avec le lot 2 de T35), plus 2 à 3 jours de mentions sur les événements (décidées). Écrans, modèle, droits, tests et questions V1 à V8 : `docs/conception/validation-metier.md`.
- **Origine** : décision de la personne responsable (5 et 6 octobre 2026), questions ouvertes closes le 6 octobre (recommandations acceptées)
- **Statut** : Décidé (principe), conception à l'étude. Conception détaillée dans `docs/conception/validation-metier.md` ; V1 à V8 ont reçu leur réponse le 6 octobre 2026 ; rien n'est construit tant que la conception n'est pas confirmée. Retire de la conception du 5 octobre la validation des événements (état « Refusé », contrôle des transitions), la validation des chiffres (file, complétude « 5 sur 8, 1 à valider », total partiel d'une session, noms réservés au berger, reprise des vues de l'étape 3), les alertes de 7 jours sur les chiffres et les événements, l'onglet « À valider » et la règle « le ministère ne corrige jamais le texte de son ajout ». Revoit P06, P09, P20, P22, T29 et T35, qui portent un renvoi ; `docs/conception/configuration-indicateurs.md` est alignée
- **BRIEF** : section 2 (profils), section 3 (règle 14 et validation par EJP Tech), section 4 (« Décisions du 5 octobre 2026 »), section 11 (hors périmètre). La matrice des droits (section 7) changera avec la conception. CLAUDE.md : exception au rappel notée à côté de la règle. Sections touchées par la conception (le BRIEF n'est pas modifié pour elle) : section 3 (règle 1 : `demande_indicateur`, `validation` et `chiffre_confirme` ; règle 14 : paragraphe de l'alerte), section 6 (tables, journal, `v_evenement`), section 7 (matrice, politiques, fonctions), section 9 (bloc « À valider », champ « Pourquoi », correction du nom, confirmation « Vérifiez ce chiffre », bloc « Événements à confirmer », « Vos saisies »), section 13 (étapes 4a, 4 et 6, deux lots après la mise en service)

### T31. Alerte sur les événements encore en attente de validation

- **Date** : 6 octobre 2026
- **Sujet** : un événement passé ou proche peut rester au statut « En attente de validation » parce que le ministère oublie de reporter le statut.
- **Décision** : une alerte dans l'outil signale tout événement dont le dernier état est `attente_validation` et dont la date tombe dans les 3 jours ou est déjà passée (date calculée à l'heure de Paris). Elle s'adresse au berger, au conseil, au ministère qui porte l'événement, aux ministères mentionnés sur l'événement (T32) et à EJP Tech (qui lit tout, T29). Elle commence 3 jours avant la date et dure jusqu'au changement de statut ou de date ; un brouillon n'alerte jamais. Elle n'est montrée ni à l'administration de l'église ni aux autres ministères. Courriel hors première version (il pourrait venir plus tard, par une proposition dédiée). Proposition d'affichage, à confirmer : un bloc d'alerte sur « Cette semaine » et un bandeau sur la fiche du ministère, avec le texte « Cet événement est encore en attente de validation et sa date approche. Mettez à jour son statut. » pour le ministère, et « [Événement] ([ministère]) : en attente de validation, prévu le [date]. » pour les autres ; pour un événement déjà passé : « La date est passée. »
- **Question ouverte, tranchée le 6 octobre 2026** : les ministères mentionnés sur un événement sont alertés aussi (T32).
- **Origine** : décision de la personne responsable
- **Statut** : Décidé (principe), conception à l'étude
- **BRIEF** : section 3 (règle 14, alerte), section 11 (hors périmètre : pas de courriel)

### T32. Mentions de ministères sur les événements

- **Date** : 6 octobre 2026
- **Sujet** : seuls les points d'attention portaient des mentions. La personne responsable veut que le ministère qui porte un événement puisse en mentionner d'autres, pour qu'ils le lisent et soient alertés.
- **Décision** : les mentions sur les événements font partie de la première version, pas d'une option plus tardive. Un ministère mentionne d'autres ministères actifs sur son événement (jamais lui-même), comme sur un point d'attention. Les mentions sont fixées à la création de l'événement et en ajout seulement. Un ministère mentionné lit cet événement (et seulement lui) ; il ne change pas le statut. L'alerte de T31 (« en attente de validation » à 3 jours ou moins de la date, ou passée) atteint aussi les ministères mentionnés. Elle va avec les événements (étape 4, « Ajouter un événement (11) », section 9 du BRIEF). À construire : une table de mentions d'événement (ajout seulement, RLS et GRANT explicites), les droits de lecture des ministères mentionnés (sans récursion de politique, comme pour les points), les tests pgTAP, un champ dans le formulaire d'événement, une ligne de journal, l'alerte étendue. Effort estimé : 2 à 3 jours.
- **Origine** : décision de la personne responsable
- **Statut** : Décidé
- **BRIEF** : section 3 (règle 14), section 4, section 7 (matrice : `evenement`), section 9 (« Ajouter un événement »), section 11

### T33. Unité, plafond, groupe et marque sensible d'un indicateur

- **Date** : 5 octobre 2026
- **Sujet** : vues, portée et montants dépassent 9999 ; aucune unité n'est prévue ; la liste range ses KPI en groupes (Captation, Audience, Prière des Stars, Badges) ; les domaines sensibles (P22) doivent être reconnus par la base.
- **Décision** : quatre colonnes sur `indicateur` : `unite` (nombre par défaut, euros, minutes, jours), `valeur_max` (9999 par défaut, contrôlée par le trigger de `mesure`, dont le contrôle devient « 0 ou plus »), `groupe` (facultatif, pour la fiche et les formulaires) et `sensible` (faux par défaut ; P22). Aucune décimale : pourcentages et moyennes sont seulement calculés. Les durées et délais suivis objet par objet sont remplacés par des comptes ou retirés. L'heure de début du culte se saisit comme un retard en minutes chaque dimanche, si la coordination le confirme (K22).
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par EJP Tech. Revue par T35 (5 octobre 2026) : `unite` et `sensible` gardées ; plafond fixé par sorte de nombre (compte 9 999, grand compte et euros 9 999 999) au lieu de `valeur_max` ; ni `groupe`, ni unité « jours » ; « minutes » plus tard, seulement si K22. Revue par P41 (6 octobre 2026) : unités « heure » (0 à 1439) et « jours » (0 à 99 999) ajoutées dès le lot 1 ; pas d'unité « minutes » (le retard du culte est une différence calculée)
- **BRIEF** : section 6 (`indicateur`, `mesure`, « Règles d'intégrité ») ; le BRIEF n'est pas modifié

### T34. Indicateurs créés par lots de migration, avec un catalogue

- **Date** : 5 octobre 2026
- **Sujet** : environ 90 indicateurs en phase 1 et jusqu'à 185 demandes ; les ministères sont créés par l'administration en production après le déploiement, et par `seed.sql` après les migrations en local et en CI. Une migration qui cherche chaque ministère par son nom ne trouve donc rien en production à la mise en service, ne se rejoue jamais, ne peut pas être testée par pgTAP (la base est déjà chargée) et dépend d'un nom libre tapé à l'écran 13.
- **Décision** : création par migration (BRIEF), par lots, sur demande écrite de l'administration, sans écran de configuration en V1. Chaque lot écrit un catalogue `private.indicateur_modele` (nom normalisé du ministère, libellé, nature, unité, plafond, groupe, sensible, ordre) ; une fonction `private` le matérialise, appelée par un trigger après chaque création de ministère et une fois par lot pour les ministères existants (noms comparés sans accents ni majuscules). `seed.sql` désactive ce trigger le temps de charger ses 8 ministères. Test pgTAP : créer un ministère du catalogue crée ses indicateurs. À défaut : écrire dans l'étape 8 l'ordre imposé (tous les ministères créés avant le lot) et une requête de contrôle à lancer après le push. Un écran de configuration se réexamine après un mois d'usage.
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par EJP Tech. Revue par T35 (5 octobre 2026) : un catalogue privé reste pour la première vague, mais la table devient `private.indicateur_prevu` (code, modèle, libellé, définition, nature, unité, sensible, calcul et ses deux sources, ordre ; ni plafond ni groupe) et sert aussi aux suggestions. Elle se crée par un bouton « Créer » de l'écran « Indicateurs », sans trigger sur `ministere` ni désactivation dans `seed.sql`, et plus aucun lot de migration ne suit cette vague. La phrase « Un écran de configuration se réexamine après un mois d'usage » est remplacée par l'écran de T35, au lot 1, avant la mise en service (voir T35 et `docs/conception/configuration-indicateurs.md`). Revue par P39 (6 octobre 2026) : la migration de la vague 1 écrit aussi les graphiques déclarés (`private.graphique_prevu`) ; un graphique nouveau passe par une petite migration, comme une suggestion ou un mot refusé
- **BRIEF** : section 4, section 6 (« Données de référence »), section 8 (amorçage), section 11 ; le BRIEF n'est pas modifié

### T35. Configuration des indicateurs et indicateurs créés par les ministères

- **Date** : 5 octobre 2026
- **Sujet** : EJP Tech demande un écran de configuration des indicateurs pour l'administration de l'église et EJP Tech (une première vague par migration, puis l'écran) et la possibilité, dans des limites, pour un ministère de créer ses propres indicateurs. La première proposition (un formulaire et quelques avertissements sur le nom) n'était pas assez mûre. Trois conceptions (simplicité, qualité des chiffres, autonomie) ont été étudiées et évaluées ; T35 en fait la synthèse.
- **Décision** : une seule table de définitions, `indicateur`, étendue. Son sens est figé par un trigger qui ne contrôle que la structure (rythme, sorte de nombre, ministère, case sensible, calcul) ; libellé et définition « Ce qu'on compte exactement » (10 à 140 caractères, obligatoire) se corrigent tant qu'aucune valeur n'est saisie, ensuite on remplace l'indicateur ; aucune suppression ni réactivation. Trois rythmes (dimanche, mois selon P16, à ce jour) et trois sortes de nombre à plafond fixe (compte 9 999, grand compte et euros 9 999 999 ; minutes plus tard si K22). Un calcul (taux ou moyenne de deux indicateurs saisis du même ministère) est une ligne d'`indicateur` qui ne se saisit pas ; la somme de l'année et la petite courbe (dimanche et mois) sont automatiques, avec la complétude dans le temps. Deux lots. **Lot 1, avant la mise en service** : première vague écrite une fois par migration dans un catalogue privé (prévus par ministère, au plus 6 saisis, et suggestions communes), créée par un bouton de l'écran « Indicateurs » (sans aucune valeur, avec l'usage « saisi 4 mois sur 5 ») ; l'administration y ajoute, corrige, remplace, retire et retire pour confidentialité ; EJP Tech a le même écran et y configure comme l'administration (la procédure des gestes qui changent ce qui est suivi, hors validation, reste une question à la coordination : Q13) ; un ministère ajoute seulement des suggestions, en un clic (3 ajouts, 12 indicateurs par fiche), et demande le reste à l'administration. **Validation (T30)** : tout ajout d'un ministère, suggestion comprise, porte un texte « Pourquoi cet indicateur ? » (10 à 280 caractères, jamais recopié dans le journal), naît « à valider », et EJP Tech seul le valide ou le refuse, dans un bloc « À valider » de l'écran Indicateurs ; tant qu'il attend, le berger et le conseil le voient, marqué « à valider », il se saisit déjà et ses valeurs n'entrent dans aucune somme ; refusé, il est retiré avec le motif « Refusé » et ses valeurs ne s'affichent plus ; au lot 2, le ministère corrige le nom de son ajout, librement tant qu'il attend, puis par une correction que valide EJP Tech, sans perte de valeur ni arrêt des saisies ; la validation vaut relecture, et les textes d'indicateur ne passent plus par la Modération. **Lot 2, après la mise en service et seulement s'il est confirmé** : un ministère écrit ses propres comptes simples (mots refusés par la base, 3 ajouts par 30 jours, retirés compris et refusés non compris), à valider comme tout ajout ; « Rendre officiel ». Journal : une ligne par geste, sans texte libre, et plus aucune valeur d'indicateur propre. Modifie P06 (l'administration lit l'usage), P08, P19 (pas de table `indicateur_calcul`), P22 (journal, lecture des lignes brutes), P29 (plus de migration `journal_administration_chiffres`, écran avant la mise en service), T33 (plafond par sorte, ni `groupe` ni unité « jours ») et T34 (`private.indicateur_prevu`, bouton au lieu du trigger) ; chacune porte un renvoi. Là où `docs/conception/kpi-ministeres.md` (3.7 à 3.9 et 6) diffère, la conception de T35 le remplace. Conception, écrans, tests, phasage (lot 1 : 10 à 13 jours avant la mise en service, plus 2 à 2,5 jours pour la validation, comptés avec T30 ; lot 2 : 3 à 4 jours ensuite, plus 1 jour pour la correction du nom) et questions Q1 à Q21 : `docs/conception/configuration-indicateurs.md`.
- **Origine** : demande d'EJP Tech
- **Statut** : À l'étude, non appliqué ; à confirmer par EJP Tech (Q1 à Q11, Q16) et par la coordination (Q12 à Q21). Revue appliquée le 5 octobre 2026 (un ajout refusé restait lisible du berger, correction sur place, masquage imitable, relecture après correction, remplacement, liste de mots, jeu d'exemple, matrice, effort). Alignée sur T30 le 5 octobre 2026 : validation de tout ajout d'un ministère par EJP Tech seul ; ajout à valider visible du berger et du conseil, saisissable, hors de toute somme ; plus de relecture des textes d'indicateur ; plus de colonnes `ne_en_attente` et `valide_le` (tables `demande_indicateur` et `validation`) ; « Refusé » rejoint les motifs de retrait posés par la base ; un refus ne compte pas dans la limite sur 30 jours. Réalignée le 6 octobre 2026 : suggestions comprises (décidé) ; champ « Pourquoi cet indicateur ? » ; correction du nom par le ministère (libre tant que l'ajout attend, validée par EJP Tech ensuite, saisies comprises) au lieu de « le ministère ne corrige jamais » ; décision dans un bloc de l'écran Indicateurs ; codes de journal `indicateur_valide` et `indicateur_refuse` ; alerte de valeur inhabituelle réduite à la confirmation du ministère. Les questions auxquelles la personne responsable a répondu (anciennes Q2, Q14 et Q22) sont retirées et la liste renumérotée. Pour le modèle de la validation, le bloc « À valider » et les chiffres inhabituels, `docs/conception/validation-metier.md` fait foi. Revue par P41 (6 octobre 2026) : 30 lignes par fiche, saisis et calculs, prévus compris, au lieu de 12 ; plus de plafond de six saisis ; `indicateur_terme` à la place de `haut_id` et `bas_id` ; Q1 à Q21 répondues (`docs/conception/vague-1-decisions.md`, 2.5)
- **BRIEF** : section 2 (navigation), section 3 (règles 1 et 13), section 4 (« Indicateurs propres »), section 6 (`indicateur`, `mesure`, journal, modération), section 7 (matrice, politiques, fonctions), section 9 (écrans, adresses), section 11 (« écran de création des indicateurs propres »), section 13 (étapes 4a, 4, 6 et 8) ; le BRIEF n'est pas modifié

### T36. États vides partout

- **Date** : 6 octobre 2026
- **Sujet** : T22 posait la pratique pour la vue de l'église ; les écrans des étapes 4 à 7 (fiches, saisies, indicateurs, validation, alertes) en ont besoin aussi. Un catalogue des états a été dessiné dans un canevas de conception (https://claude.ai/artifact/XCCBJHgKrHGBYGwW8nLUQ2).
- **Décision** : le catalogue du canevas est validé par la personne responsable. Chaque écran et chaque bloc a un état vide conçu, rangé dans l'une des six situations du canevas : premier usage, en attente des autres, tout est fait, aucun résultat, pas pour ce profil, problème passager. Règles : garder la forme du bloc rempli (titre, filets, mise en page) ; une phrase complète qui dit ce qui se passe, puis ce qui viendra ou qui doit agir ; jamais un zéro trompeur (« Pas encore de saisie » et la complétude, 0 étant une vraie valeur saisie) ; une seule action, et seulement pour le profil qui peut la faire ; un bloc d'alerte disparaît quand il n'y a rien à signaler ; ni illustration, ni emoji, ni ton d'excuse ; chaque état se vérifie au clavier et au lecteur d'écran. Les textes marqués « Proposé » dans le canevas deviennent des textes retenus (`LISEZMOI.md`, « États »).
- **Origine** : décision de la personne responsable
- **Statut** : Décidé
- **BRIEF** : section 9 (« États à construire ») ; `LISEZMOI.md`, « États » ; complète T22 ; le BRIEF n'est pas modifié

## Décisions d'EJP Tech du 6 octobre 2026 : indicateurs de la vague 1

Sur mandat de la personne responsable, EJP Tech a tranché le 6 octobre 2026 les 112 questions de `docs/conception/kpi-ministeres.md` et les questions Q1 à Q21 de `docs/conception/configuration-indicateurs.md`, sans attendre la coordination. Une entrée par famille de décisions ; le détail, question par question, et la couverture des 185 demandes sont dans `docs/conception/vague-1-decisions.md`. Statut commun : **Décidé par EJP Tech le 6 octobre 2026, révisable par la coordination**. Le BRIEF les reçoit au mode plan de l'étape 4a, après l'accord de la personne responsable sur le plan (CLAUDE.md, changement de modèle de données).

### P32. Mandat et couverture des 185 demandes

- **Date** : 6 octobre 2026
- **Sujet** : la coordination demande 185 KPI (5 octobre) ; l'analyse en laissait une partie « à préciser », en phase 2 ou 3, ou retirée.
- **Décision** : chacune des 185 demandes, graphiques compris, est produite ou retrouvable dans l'outil ; aucune n'est abandonnée, hors périmètre ou « à préciser ». Pour Pilotage EJP dès la vague 1, avec l'export de fin de vie (C1). La liste n'est pas définitive : suggestions, comptes écrits par les ministères (lot 2, confirmé) et écran de l'administration (C2). Lecteurs : le ministère, le berger, le conseil et EJP Tech ; l'administration voit définitions et usage, jamais une valeur ; vue de l'église inchangée (C3). Les 22 ministères sont créés avant l'activation, Protocole compris, avec une boîte partagée chacun (K14). Les faits que la liste ne dit pas (NC, 3 mois, 7 jours, 5 minutes, 30 jours, catégories, étapes du parcours FIJ) sont des choix écrits dans les définitions et relus en préproduction avant l'ouverture de la saisie (K16). 157 demandes sont servies avant la mise en service, 28 dans les 4 semaines qui suivent, sur des données saisies dès le premier jour.
- **Origine** : mandat de la personne responsable (6 octobre 2026)
- **Statut** : Décidé par EJP Tech le 6 octobre 2026, révisable par la coordination
- **BRIEF** : sections 1, 4 et 13 (à reporter) ; revoit P15 et P29 ; `docs/conception/vague-1-decisions.md`, sections 1 à 3

### P33. Périodes, cumuls et départ des sommes

- **Date** : 6 octobre 2026
- **Sujet** : K1, K2, K3, K23, K35a, K42b, K47b, K57, Q19.
- **Décision** : le mois est la période commune (nature « mois », P16). Ce qui se vit le dimanche ou dans sa semaine (du lundi au dimanche) se saisit au rythme « dimanche », y compris la Prière des Stars, les répétitions et les membres du mardi ; tout le reste au mois, dont les chiffres de plateformes et les domaines sensibles. Pas de nature « activité » ni « jour ». « Depuis le début de l'année » = 1er janvier, heure de Paris ; la somme de l'année est calculée, avec son départ nommé et sa complétude. Aucun total de départ saisi : la somme part de la période de l'ajout de l'indicateur et recule jusqu'à la plus ancienne période saisie, sans aller avant le 1er janvier. Le mois en cours s'affiche à part. « Dernière période » = dernier mois écoulé. Un drapeau `sans_somme` retire la somme de l'année des comptes de personnes différentes, des pics, des heures et des jours.
- **Origine** : mandat de la personne responsable (6 octobre 2026)
- **Statut** : Décidé par EJP Tech le 6 octobre 2026, révisable par la coordination
- **BRIEF** : section 3 (règle 13), section 4 (à reporter) ; revoit P16, P17 ; `docs/conception/vague-1-decisions.md`, 2.1 et 2.4

### P34. Taux, moyennes et calculs à partir de comptes agrégés

- **Date** : 6 octobre 2026
- **Sujet** : K4, K20b, K21, K22a, K29b, K31c, K33a, K39b, K45b ; suivi de personnes (P21) et délais par objet.
- **Décision** : aucun taux n'est retiré : le ministère saisit le compte qui manque, l'outil calcule le ratio de totaux (retour des NA, conversion vers la FIJ sur NA + NC, perte à 3 mois, participation, couverture, présence, satisfaction). Les délais se produisent par une somme de jours saisie et une moyenne calculée (Film, Tech, Entretien). Les sources d'un calcul vivent dans `indicateur_terme` dès la migration de définition ; en V1, taux et moyennes de deux indicateurs (T35) ; dans les 4 semaines après la mise en service, différence signée (retard du culte, marge), somme (incidents de MCAD), évolution (vues, abonnés, audience, ventes), agrégat « somme des dimanches du mois » et décalage de 0 à 3 mois. Jamais une source sensible ni un chiffre commun. « Non calculé » si le bas manque ou vaut 0 ; « plafond 100 % » pour une part.
- **Origine** : mandat de la personne responsable (6 octobre 2026)
- **Statut** : Décidé par EJP Tech le 6 octobre 2026, révisable par la coordination
- **BRIEF** : section 4, section 6 (`indicateur_terme`) (à reporter) ; revoit P19, P21 ; `docs/conception/vague-1-decisions.md`, 2.1, 2.3 et section 5 (X8, X9)

### P35. Domaines sensibles : mois écoulés et seuil des petits nombres

- **Date** : 6 octobre 2026
- **Sujet** : K5a à K5d, K54, K56, Q9, Q11 ; incidents et interventions de Sécurité.
- **Décision** : onze indicateurs sensibles (Santé 4, Social 3, Call your sister, la plate-forme d'écoute, nouveaux enfants et enfants déjà venus) : total par mois écoulé, mois en cours refusé par la base, aucune ventilation, aucun texte attaché, aucun calcul. Seuil : 1 et 2 s'affichent « moins de 3 » au berger, au conseil et à EJP Tech ; 0 reste 0 ; le ministère voit ses valeurs exactes ; la somme de l'année ne compte que les mois affichés et le dit, pour qu'aucune différence ne révèle un mois masqué. Lignes brutes sensibles lisibles par l'API par le ministère seul (Q9 inversée) ; un indicateur retiré pour confidentialité ne se lit plus par l'API, EJP Tech compris (Q11) ; l'export de fin de vie se fait hors de l'API par la personne responsable. EJP Tech rédige l'entrée du registre et une note d'analyse courte et les remet à la coordination ; les indicateurs sensibles ne s'activent qu'après cette remise ; la coordination décide d'une analyse d'impact complète. Les incidents et interventions de Sécurité excluent les malaises, soins et secours, comptés par Santé.
- **Origine** : mandat de la personne responsable (6 octobre 2026)
- **Statut** : Décidé par EJP Tech le 6 octobre 2026, révisable par la coordination. Revue par P42 (6 octobre 2026, décidé par la personne responsable) : la phrase « les indicateurs sensibles ne s'activent qu'après cette remise » ne s'applique plus ; les indicateurs sensibles sont créés et actifs dès la vague 1, avec toutes les protections de cette entrée ; le registre et la note sont remis avant la mise en service, sans rien conditionner
- **BRIEF** : section 4, section 7 (politique de `mesure`, données personnelles) (à reporter) ; revoit P22 et la Q9 de T35 ; `docs/conception/vague-1-decisions.md`, 2.1 et section 5 (X4)

### P36. Chiffres financiers et chiffres de plateformes

- **Date** : 6 octobre 2026
- **Sujet** : K6, K7, K41.
- **Décision** : chiffre d'affaires, coût d'achat des articles vendus et fonds levés en « euros », au mois ; budget matériel prévu en « euros », à ce jour (première valeur 5 164 €) ; panier moyen et marge estimée calculés ; aucun nom de client ni de donateur ; l'administration ne voit pas les valeurs ; la comptabilité de l'église fait foi. Plateformes : un chiffre, une source par périmètre (Communication pour les comptes de l'église, Film pour ses vidéos, MCAD pour ses directs et replays), jamais additionnés entre ministères ; un total « toutes plateformes », une ligne par plateforme sur demande. Un stock (abonnés, prestataires inscrites, profils actifs) est un « à ce jour » relevé chaque mois, avec sa courbe de fin de mois ; un flux (vues, portée, interactions, mises en relation, réservations) est un indicateur du mois ; les vues cumulées sont la somme des vues mensuelles depuis janvier. Le besoin de location de Production est aussi un point d'attention.
- **Origine** : mandat de la personne responsable (6 octobre 2026)
- **Statut** : Décidé par EJP Tech le 6 octobre 2026, révisable par la coordination
- **BRIEF** : section 4 (à reporter) ; revoit P23, P24 ; `docs/conception/vague-1-decisions.md`, 2.1 et 2.2

### P37. Mobilisés, bénévoles et un chiffre, une source

- **Date** : 6 octobre 2026
- **Sujet** : K8, K19, K20a, K30, K32, K43b, K44b, K52, K55.
- **Décision** : les « mobilisés » du dimanche (équipiers, agents, interprètes, formateurs, animateurs, femmes, personnes mobilisées, équipe d'Intégration au culte) sont le chiffre commun « STARs au service » du ministère, affiché sous le nom de la demande (`private.libelle_commun`) : il compte tous ceux qui ont servi chez le ministère ce dimanche, quel que soit leur ministère principal (BRIEF, section 4, code `service` ; D2). Les « bénévoles actifs » sont les « STARs actifs » (ministère principal). Hors dimanche, un seul mécanisme : « Mobilisés aux événements », somme de présences du mois, jamais additionnée entre ministères (MCAD, Santé, Sécurité, Multilingue, Intégration). Intégration seule compte les intégrations en FIJ ; MDS seul les nouveaux STARs ; Kumi et Eagles leurs nouvelles intégrations d'équipe, sans total commun. Live et diffusion en direct : un seul chiffre, à confirmer par MCAD. MDS affiche les totaux de l'église en lignes de référence. Le ministère Tech a son compte distinct ; ses ajouts se valident depuis un compte EJP Tech, de préférence le second.
- **Origine** : mandat de la personne responsable (6 octobre 2026)
- **Statut** : Décidé par EJP Tech le 6 octobre 2026, révisable par la coordination
- **BRIEF** : section 4 (à reporter) ; revoit P25, P26 ; `docs/conception/vague-1-decisions.md`, 2.2 et 2.3

### P38. Événements : couverture et comptages

- **Date** : 6 octobre 2026
- **Sujet** : K9, K10a à K10c, K11, K22b, K57.
- **Décision** : « Événements couverts » et « Événements à couvrir » se saisissent par mois par chaque ministère qui couvre, avec sa propre définition ; aucun total de l'église ni contrôle tiré des mentions. Comptages lus dans `evenement_etat` : prévu = dernier état « Validé » ou « En préparation », daté d'aujourd'hui ou après (pour un mois passé : a atteint « Validé ») ; reporté = date plus tardive que la ligne précédente, compté dans le mois de la date quittée ; taux de réalisation = réalisés ÷ (réalisés + annulés + passés sans état final), reportés à part ; « En attente » à part, brouillons jamais. Coordination lit les totaux de toute l'église par mois, sans titre, date ni détail par ministère, par une fonction `private` en `security definer` derrière une fonction `public` en `security invoker` ; lecteurs : le ministère de code `coordination` (posé par migration), le berger, le conseil et EJP Tech ; exception écrite dans la matrice des droits, avec ses tests pgTAP. Les comptages partent de la mise en service (une date passée ne se saisit pas) et le disent ; un signal « passés sans état final » remplace la complétude. « À l'heure » : 5 minutes, compté par Coordination parmi les événements terminés déclarés dans l'outil. Livré dans les 4 semaines après la mise en service.
- **Origine** : mandat de la personne responsable (6 octobre 2026)
- **Statut** : Décidé par EJP Tech le 6 octobre 2026, révisable par la coordination
- **BRIEF** : section 3 (règles 13 et 14), section 7 (matrice), section 11 (« comptage des événements du calendrier » retiré du hors périmètre) (à reporter) ; revoit P20 ; `docs/conception/vague-1-decisions.md`, 2.4 et section 5 (X10)

### P39. Graphiques et vue de l'église

- **Date** : 6 octobre 2026
- **Sujet** : K12, K15.
- **Décision** : la vue de l'église garde les seuls chiffres communs, les sessions et la carte. Chaque indicateur garde sa petite courbe, chaque « à ce jour » gagne sa courbe de fin de mois, et les douze graphiques demandés sont déclarés dans `private.graphique_prevu` et ses séries (1 à 4 : indicateur, calcul, comptage d'événements, rubrique FIJ, série de l'église), écrits par la migration de la vague 1, lus sous la RLS du lecteur, avec équivalent texte, trous gardés et jamais une série sensible. Un graphique nouveau passe par une petite migration. Livrés dans les 4 semaines après la mise en service.
- **Origine** : mandat de la personne responsable (6 octobre 2026)
- **Statut** : Décidé par EJP Tech le 6 octobre 2026, révisable par la coordination
- **BRIEF** : section 6, section 11 (« graphique d'évolution » retiré du hors périmètre) (à reporter) ; revoit P30, T34 ; `docs/conception/vague-1-decisions.md`, section 6 et section 5 (X11 à X13)

### P40. Coordo FIJ : statistiques par département et parcours

- **Date** : 6 octobre 2026
- **Sujet** : K46, K47.
- **Décision** : Coordo FIJ est le ministère de code `fij`. Quatre rubriques par département (présents au culte EJP, présents à la réunion FIJ, présents à l'évangélisation, membres du mardi), saisies chaque semaine dans une table `fij_statistique` en ajout seulement, sur le modèle de `fij_departement`, construite avant la mise en service (RLS, `aal2`, fonction de saisie, vue avec total et complétude « 8 dép. sur 8 », pgTAP). Parcours du jeune : trois comptes du mois (nouveaux, réguliers, au service) et l'étape « membres » lue dans la table ; « au service » se distingue de « dont en FIJ ». Rubriques et étapes relues par Coordo FIJ avant la première saisie.
- **Origine** : mandat de la personne responsable (6 octobre 2026)
- **Statut** : Décidé par EJP Tech le 6 octobre 2026, révisable par la coordination
- **BRIEF** : sections 6 et 7 (à reporter) ; revoit P27 ; `docs/conception/vague-1-decisions.md`, 2.3 et section 5 (X5)

### P41. Catalogue de la vague 1, unités et limites

- **Date** : 6 octobre 2026
- **Sujet** : K13, Q1 à Q21 de la configuration, extensions du modèle.
- **Décision** : 161 indicateurs saisis et 41 calculs, tous prévus du catalogue (jamais des suggestions), créés par « Créer » sans validation T30 ; 11 suggestions communes pour les autres ministères. Plus de plafond de six : une seule limite de 30 lignes par fiche, saisis et calculs, prévus compris ; ajouts d'un ministère : 3 au lot 1, 3 par 30 jours au lot 2. Unités « heure » (0 à 1439) et « jours » (0 à 99 999) en plus de nombre, grand nombre et euros ; pas d'unité « minutes ». Drapeaux `sans_somme`, `saisi_dimanche_matin`, `libelle_sessions`. La charge de saisie repose sur « Chiffres du mois » et la ligne « À faire », pas sur les rappels par email (P31). Extensions : environ 8 jours avant la mise en service (X1 à X8), environ 9 jours dans les 4 semaines qui suivent (X9 à X14), à confirmer au mode plan de l'étape 4a. Retirés : nature « activité », `mesure.departement`, agrégat « dernier », calcul « reprise », types « classement » et « dimanches avec valeur ».
- **Origine** : mandat de la personne responsable (6 octobre 2026)
- **Statut** : Décidé par EJP Tech le 6 octobre 2026, révisable par la coordination
- **BRIEF** : sections 4, 6, 7 et 13 (à reporter) ; revoit T33, T35 ; `docs/conception/vague-1-decisions.md`, sections 4 et 5

## Réponses de la personne responsable du 6 octobre 2026 au plan de l'étape 4

La personne responsable a répondu le 6 octobre 2026 aux questions de la section 7 de `docs/plan-etape-4.md` : question 4 inversée (P42), question 7 acceptée (T37) avec deux demandes en plus (T38, T39), recommandations des questions 5, 6 et 8 à 13 acceptées. Les questions 1 à 3 (accord sur le plan et report dans le BRIEF, ajouts à CLAUDE.md, codes du journal) restent à approuver explicitement avant tout code. Le BRIEF reçoit ces entrées au commit de documents qui ouvre W0 (plan, question 1).

### P42. Indicateurs sensibles présents dès la vague 1

- **Date** : 6 octobre 2026
- **Sujet** : P35 et K56 n'activaient les onze indicateurs sensibles (santé, écoute, accompagnement, enfants) qu'après la remise du registre et de la note d'analyse à la coordination ; la première version du plan de l'étape 4 fermait leur création par un réglage `sensibles_actives`.
- **Décision** : les indicateurs sensibles sont créés et actifs dès la vague 1, comme tout indicateur demandé par la coordination : « à partir du moment où ils sont présents dans les KPI, ils doivent être présents » ; à EJP Tech de prendre toute l'ingénierie et toutes les mesures nécessaires pour bien les créer. Aucun réglage d'activation, aucune table `private.reglage`, aucune migration d'activation. Toutes les protections restent, testées par pgTAP dans leur lot : seuls des totaux de mois écoulés, jamais le mois en cours ; « moins de 3 » pour 1 et 2 au berger, au conseil et à EJP Tech, sans fuite par différence ; lignes brutes lisibles par le seul ministère qui les saisit ; jamais source d'un calcul ; jamais sur la vue de l'église ni dans un graphique ; journal sans valeur ; mention sur la page Confidentialité, en place avant la mise en service. EJP Tech rédige maintenant, pour la coordination, l'entrée du registre des traitements et la note d'analyse (`docs/conformite/`) ; la personne responsable les remet avant la mise en service, mais elles ne conditionnent plus rien dans l'outil. La coordination reste libre de demander une analyse d'impact complète.
- **Origine** : décision de la personne responsable (6 octobre 2026), réponse à la question 4 du plan de l'étape 4
- **Statut** : Décidé par la personne responsable le 6 octobre 2026
- **BRIEF** : section 4 (sensibles), section 7 (politique de `mesure`, données personnelles) (à reporter) ; revoit P22 et P35 ; `docs/conception/vague-1-decisions.md`, K56 et section 7 ; `docs/plan-etape-4.md`, B1, B3, B4, I et question 4

### T37. Refus d'une date d'événement passée et d'une mise à jour identique

- **Date** : 6 octobre 2026
- **Sujet** : `ajouter_evenement` refuse déjà une date passée (étape 3). Une mise à jour d'événement (nouvelle ligne de `evenement_etat`) pouvait encore poser une nouvelle date passée, ou répéter le dernier état, ce qui fausserait les reports et les comptages (K10b, P38).
- **Décision** : la base refuse, par un trigger `private.controler_evenement_etat()` avant l'ajout d'une ligne de `evenement_etat`, une nouvelle date différente de la date actuelle et antérieure à `private.aujourdhui()` (message « La nouvelle date doit être aujourd'hui ou plus tard. ») et une ligne de même statut et de même date que le dernier état (message « Rien n'a changé : ce statut et cette date sont déjà enregistrés. »). Une date inchangée, même passée, reste permise : un événement passé peut toujours recevoir son statut final (T31). À l'ajout, le refus et le message de l'étape 3 restent (« La date ne peut pas être passée. »). Un refus n'écrit aucune ligne de journal. Le formulaire 11 contrôle la date avant l'envoi, garde les valeurs et affiche les textes de `docs/conception/aides-contextuelles.md` (section 7) : sous le champ date pour une date refusée, suivis, si T39 est confirmée, de « Vous ne pouvez pas choisir de date ? Signaler une difficulté » ; sous le bouton pour une ligne identique. Les textes affichés sont « Proposé » jusqu'à leur report dans `LISEZMOI.md`.
- **Origine** : décision de la personne responsable (6 octobre 2026), réponse à la question 7 du plan de l'étape 4
- **Statut** : Décidé
- **BRIEF** : section 3 (règle 14), section 7 (`evenement_etat`, tests) (à reporter) ; `docs/plan-etape-4.md`, B6 et E5

### T38. Aides contextuelles

- **Date** : 6 octobre 2026
- **Sujet** : la personne responsable veut de petites aides, bien placées, professionnelles, rédigées simplement et clairement compréhensibles, pour aider à la prise en main, en suivant les bonnes pratiques de rédaction et de placement.
- **Décision** : un composant partagé, une « toggletip » accessible : un bouton d'aide placé juste après le libellé qu'il explique, avec un nom accessible qui reprend ce libellé, qui ouvre une courte bulle au clic, à Entrée ou à Espace (jamais au seul survol), se ferme à Échap et au clic en dehors, annonce son texte au lecteur d'écran, a une cible de 44 px et tient dans l'écran à 360 px. Une aide complète un libellé et ne remplace jamais une information nécessaire à la saisie : une phrase qui sert à chaque usage reste visible sous le champ. Règles de rédaction et de placement, et catalogue des aides par écran : `docs/conception/aides-contextuelles.md`. Les textes vivent dans un seul fichier de l'interface (`src/components/aide/textesAide.ts`), écrit une fois par W0 avec les composants `Aide` et `LibelleAvecAide` ; chaque lot d'écran pose ses aides, et le lot I celles de la vue de l'église. Effort : 1 jour en W0, 0,25 jour par écran (E2 à E7), 0,25 jour en I. Les points de forme encore ouverts (bouton rond, fond sombre de la bulle, placement dans le flux des formulaires) sont dans la section 10 de `aides-contextuelles.md`.
- **Origine** : demande de la personne responsable (6 octobre 2026)
- **Statut** : Décidé sur le principe ; textes « Proposé » jusqu'à leur validation par la personne responsable (plan de l'étape 4, question 15), puis relus en préproduction (K16)
- **BRIEF** : section 4, section 9 (chaque écran) (à reporter) ; `docs/plan-etape-4.md`, W0, E2 à E8 et I ; complète T10 et T36

### T39. Signaler une difficulté

- **Date** : 6 octobre 2026
- **Sujet** : la personne responsable veut qu'un ministère puisse signaler une difficulté, par exemple quand il ne parvient pas à poser une date d'événement.
- **Décision** : deux tables en ajout seulement. `signalement` (ministère, code de l'écran pris dans une liste fermée, texte de 10 à 280 caractères avec le rappel sur les données personnelles sous le champ, `saisi_le`, `saisi_par`) et `signalement_suivi` (une seule clôture par signalement, par EJP Tech, avec un commentaire facultatif de 10 à 280 caractères). Fonctions `signaler_difficulte` (ministère actif seulement) et `clore_signalement` (EJP Tech seul) : partie `private` en `security definer` avec `set search_path = ''`, appelée par une fonction `public` en `security invoker`, `private.exige_aal2()` en tête. RLS : le ministère lit ses signalements et leur clôture ; EJP Tech lit tout ; l'administration de l'église, le berger et le conseil ne lisent rien ; personne ne met à jour ni ne supprime. Le texte refuse les familles « données personnelles » de `private.verifier_texte`. Journal : une ligne par envoi et par clôture, avec le code de l'écran, jamais le texte ni le commentaire. `masquer_texte` s'étend aux deux textes. La fraîcheur d'un ministère ignore ses signalements. Écrans : un lien « Signaler une difficulté » en bas de chaque formulaire de saisie et dans le message d'une date refusée du formulaire 11 (textes de `docs/conception/aides-contextuelles.md`, section 7, « Proposé » jusqu'à leur validation) ; une page `/signaler` ; un bloc « Signalements » sur l'accueil d'EJP Tech (Modération), avec ses états vides. Aucun email. Effort : 3 jours (base 1,5, écrans 1,5), tests pgTAP sur la matrice des droits et parcours e2e. Autre choix écarté : passer par un point d'attention, parce qu'il mêlerait l'aide technique aux décisions du berger et du conseil (« À décider », « Marquer traité ») et fausserait la lecture des points ouverts d'un ministère.
- **Qui lit** : seulement le ministère qui l'écrit et EJP Tech (qui le reçoit et le clôt). Ni l'administration de l'église, ni le berger, ni le conseil. Raison : l'administration ne voit ni les pages des ministères ni les points (BRIEF section 2), et un signalement parle du contenu d'une page. EJP Tech transmet à l'administration ce qui la concerne (une session absente, des ministères attendus) et écrit « transmis à l'administration » en clôturant le signalement. Un problème de compte ou de connexion ne passe jamais par le signalement : un ministère qui ne peut pas se connecter écrit à l'administration. Seul un ministère peut signaler. La phrase du panneau est « EJP Tech lit votre signalement. ».
- **Origine** : demande de la personne responsable (6 octobre 2026) ; conception d'EJP Tech
- **Statut** : Décidé le 6 octobre 2026, accord écrit de la personne responsable (plan de l'étape 4, question 14) : changement du modèle de données (deux tables), lecteurs réduits au ministère et à EJP Tech ; textes de l'interface « Proposé » jusqu'à leur validation
- **BRIEF** : section 3 (règle 1 : tables en ajout seulement ; règle 6 : fraîcheur), section 6, section 7 (matrice), section 9 (formulaires, Modération, adresses) (à reporter) ; CLAUDE.md (liste « ajout seulement », ce que voit un ministère) ; `docs/plan-etape-4.md`, B7, E8 et question 14
