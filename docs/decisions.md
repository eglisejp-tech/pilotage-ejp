# Journal des décisions : Pilotage EJP

Une entrée par décision ou proposition. Trois statuts :

- **Décidé** : tranché par la coordination et EJP Tech ; `BRIEF.md` l'applique.
- **Proposé, à confirmer par la coordination** : règle métier proposée par EJP Tech après la revue du kit ; `BRIEF.md` l'applique en attendant la réponse.
- **Proposé, à confirmer par EJP Tech** : choix technique proposé par la revue du kit ; `BRIEF.md` l'applique en attendant la validation.

Quand une proposition est confirmée ou changée, mets à jour son statut ici, puis `BRIEF.md` (section 4 et la section citée). Questions encore ouvertes : la date de mise en ligne et l'existence d'une charte visuelle EJP.

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
- **Statut** : Proposé, à confirmer par la coordination
- **BRIEF** : sections 2, 7 et 9

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
- **Statut** : Proposé, à confirmer par la coordination
- **BRIEF** : section 4, section 9

### P09. Statuts d'événement

- **Date** : 30 septembre 2026
- **Sujet** : la V2 confie « Gérer les statuts » à l'administration, le brief les affiche en lecture.
- **Décision** : le ministère qui porte l'événement reporte sa date et son statut, à la création puis à chaque changement. La liste des statuts est fixe ; l'administration ne les change pas.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par la coordination
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

### P14. Rappels de saisie par email

- **Date** : 5 octobre 2026
- **Sujet** : rien ne rappelle aux ministères de saisir leurs chiffres du dimanche ; les totaux restent incomplets. Une passerelle WhatsApp (OpenWA) a été étudiée.
- **Décision** : rappels par email depuis Supabase (tâche planifiée et Edge Function) avec le SMTP Gmail de l'église, vers les ministères attendus qui n'ont pas saisi ; aucune nouvelle donnée personnelle ni nouveau sous-traitant. WhatsApp écarté pour l'instant : OpenWA est non officiel (risque de blocage du numéro, déconseillé par le projet pour un usage réglementé) et toute solution WhatsApp demande des numéros de téléphone. Conception complète, options, risques et questions : `docs/conception/rappels-email.md`.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à valider par EJP Tech (questions Q1 à Q6 de la conception) ; à planifier après l'étape 4, précédé d'un essai d'envoi SMTP depuis une Edge Function de préproduction
- **BRIEF** : hors du BRIEF (le BRIEF ne prévoit pas de notification) ; section 7 (« Données personnelles ») à compléter d'une phrase si la décision est prise

### P14. Calculs affichés

- **Date** : 30 septembre 2026
- **Sujet** : semaine affichée, écarts, complétude et fraîcheur sans définition.
- **Décision** : dates à l'heure de Paris ; le dimanche de référence bascule le dimanche à 12 h ; écarts calculés à périmètre égal (les écarts bruts des maquettes inversaient parfois le sens) ; complétude sur les ministères actifs à la date ; fraîcheur = dernière ligne de journal écrite par le ministère.
- **Origine** : Proposition EJP Tech
- **Statut** : Proposé, à confirmer par la coordination
- **BRIEF** : section 3 (règles 6, 11, 12 et 13)

### P15. Tri des KPI de la coordination

- **Date** : 5 octobre 2026
- **Sujet** : la coordination propose 185 demandes (176 KPI et 9 graphiques) pour 22 ministères ; le modèle ne connaît que des comptes entiers du dimanche ou à ce jour, et la liste V1 de P08 n'en comptait que six.
- **Décision** : chaque demande devient un compte entier saisi par le ministère (indicateur propre), une valeur calculée (jamais saisie, avec sa complétude), un indicateur commun déjà existant, un point d'attention (texte), ou elle est retirée. Taux, moyennes, cumuls et évolutions se calculent toujours, comme le pourcentage FIJ. Libellés de 60 caractères au plus, raccourcis par EJP Tech. Analyse ligne à ligne, phases et questions K1 à K54 : `docs/conception/kpi-ministeres.md`.
- **Origine** : KPI de la coordination
- **Statut** : Proposé, à confirmer par la coordination
- **BRIEF** : section 3 (règles 3, 4 et 9), section 4 (« Indicateurs propres ») ; le BRIEF n'est pas modifié

### P16. Nature « mois » pour les comptes par période

- **Date** : 5 octobre 2026
- **Sujet** : 65 demandes se comptent par semaine ou par mois. La convention du BRIEF (un indicateur « ce mois » saisi « à ce jour » et remis à zéro) date la valeur du jour de saisie : le total de septembre saisi le 2 octobre compterait pour octobre.
- **Décision** : nouvelle nature « mois » : `date_ref` est le 1er jour du mois ; le formulaire propose le mois en cours et les deux précédents ; la base refuse un autre jour que le 1er et un mois futur (heure de Paris) ; la saisie la plus récente d'un mois fait foi ; total, cumul de l'année et complétude par mois. Un compte vraiment hebdomadaire reste « dimanche » (la semaine du lundi au dimanche). Pas de nature « année » : l'année se calcule. Nouvelle migration (contrôle de `indicateur.nature`, trigger `controler_mesure`, vues) et tests pgTAP ; `mesure` reste en ajout seulement.
- **Origine** : KPI de la coordination
- **Statut** : Proposé, à confirmer par la coordination (période, K1) et par EJP Tech (modèle)
- **BRIEF** : section 4 (« Indicateurs propres »), section 6 (`indicateur`, « Règles d'intégrité ») ; le BRIEF n'est pas modifié

### P17. Activités propres à un ministère

- **Date** : 5 octobre 2026
- **Sujet** : Welcome Prodiges, sessions de baptême, Prière des Stars, répétitions, activités de Kumi et d'Eagles se comptent par activité ; ce ne sont pas des sessions d'église.
- **Décision** : en phase 1, nature « dimanche » si l'activité a lieu le dimanche, sinon comptes du mois (activités du mois, présents du mois). En phase 2, si la coordination confirme le besoin d'un chiffre par activité : nature « jour », une valeur par date d'aujourd'hui ou avant. Les sessions d'église (Bâtir l'Église, Anti-Dispersion, autre rassemblement) ne servent pas aux activités d'un seul ministère. Pas de table d'activités.
- **Origine** : KPI de la coordination
- **Statut** : Proposé, à confirmer par la coordination (K18, K21, K35, K42) et par EJP Tech (modèle)
- **BRIEF** : section 3 (règle 5), section 4, section 6 ; le BRIEF n'est pas modifié

### P18. Unité, plafond et groupe d'un indicateur

- **Date** : 5 octobre 2026
- **Sujet** : vues, portée et montants dépassent 9999 ; aucune unité n'est prévue ; la liste range ses KPI en groupes (Captation, Audience, Prière des Stars, Badges).
- **Décision** : trois colonnes sur `indicateur` : `unite` (nombre par défaut, euros, minutes, jours), `valeur_max` (9999 par défaut, contrôlée par le trigger de `mesure`, dont le contrôle devient « 0 ou plus ») et `groupe` (facultatif, pour la fiche et les formulaires). Aucune décimale : pourcentages et moyennes sont seulement calculés. Les durées et délais suivis objet par objet sont remplacés par des comptes ou retirés. L'heure de début du culte se saisit comme un retard en minutes chaque dimanche, si la coordination le confirme (K22).
- **Origine** : KPI de la coordination
- **Statut** : Proposé, à confirmer par EJP Tech
- **BRIEF** : section 6 (`indicateur`, `mesure`, « Règles d'intégrité ») ; le BRIEF n'est pas modifié

### P19. Valeurs calculées déclarées par migration

- **Date** : 5 octobre 2026
- **Sujet** : 29 demandes sont des cumuls, taux, moyennes ou évolutions ; un indicateur propre n'a pas de code, l'interface ne peut donc pas le nommer dans un calcul.
- **Décision** : nouvelle table `indicateur_calcul` (ministère, libellé, type, numérateur, dénominateur, ordre), écrite par migration, lue comme `indicateur` (rien pour EJP Tech), et vue `v_calcul`. Trois types : cumul depuis le 1er janvier (heure de Paris), ratio de deux indicateurs du même ministère sur la même période, moyenne par activité (phase 2). Affichage avec complétude ; « Non calculé » si le dénominateur manque ou vaut zéro. Un taux sans dénominateur défini n'est pas créé.
- **Origine** : KPI de la coordination
- **Statut** : Proposé, à confirmer par EJP Tech (modèle) et par la coordination (dénominateurs et année, K2 à K4)
- **BRIEF** : section 3 (règles 3, 4 et 13), section 6 ; le BRIEF n'est pas modifié

### P20. Comptages d'événements

- **Date** : 5 octobre 2026
- **Sujet** : événements prévus, réalisés, annulés, reportés et couverts ; l'état « reporté » n'existe pas, et rien ne relie un événement aux ministères qui le couvrent.
- **Décision** : réalisés = dernier état « Terminé » ; prévus = dernier état « Validé » ou « En préparation », daté d'aujourd'hui ou après ; annulés = dernier état « Annulé » ; reporté = date repoussée, lue dans l'historique de `evenement_etat`, sans nouvel état. Comptés par ministère et par mois, en phase 2. Un événement couvert par un autre ministère se compte par un compte du mois saisi par ce ministère, sans lien avec l'événement ni total de l'église.
- **Origine** : KPI de la coordination
- **Statut** : Proposé, à confirmer par la coordination (K9 à K11)
- **BRIEF** : section 3 (règle 14), section 6 (`evenement_etat`), section 11 ; le BRIEF n'est pas modifié

### P21. Suivi de personnes remplacé par des comptes

- **Date** : 5 octobre 2026
- **Sujet** : taux de retour, de conversion et de perte des NA, parcours vers la FIJ, participants uniques, parcours du jeune, enfants revenus, nouveaux bénéficiaires ou participants, satisfaction : tous supposent de reconnaître une personne d'une fois à l'autre.
- **Décision** : l'outil ne suit aucune personne. Chaque KPI devient un compte agrégé saisi par le ministère (par exemple « NA revenus ce dimanche »), et un taux éventuel est un ratio de totaux, présenté comme tel ; sinon il est retiré. Le comptage se fait hors de l'outil ; l'outil ne reçoit qu'un nombre.
- **Origine** : KPI de la coordination
- **Statut** : Proposé, à confirmer par la coordination (K4)
- **BRIEF** : section 3 (règle 9), section 7 (« Données personnelles ») ; le BRIEF n'est pas modifié

### P22. Domaines sensibles

- **Date** : 5 octobre 2026
- **Sujet** : Santé, Social, Call your sister (Kumi), la plate-forme d'écoute (Eagles) et Prodiges Junior : un petit nombre daté peut désigner une personne (santé, situation personnelle, mineurs ; article 9 du RGPD).
- **Décision** : totaux par mois seulement, sans ventilation ni texte libre lié au chiffre ; visibles par le ministère, le berger et le conseil (règle des indicateurs propres), jamais sur la vue de l'église ni dans un email. Le seuil d'affichage des très petits nombres est laissé à la coordination (K5). Les pages Confidentialité et Conditions d'utilisation gagnent chacune une phrase.
- **Origine** : KPI de la coordination
- **Statut** : Proposé, à confirmer par la coordination
- **BRIEF** : section 3 (règle 9), section 7 (« Données personnelles ») ; le BRIEF n'est pas modifié

### P23. Chiffres financiers

- **Date** : 5 octobre 2026
- **Sujet** : chiffre d'affaires, marge et panier moyen (Merch), fonds levés (Social), budget (Production).
- **Décision** : retenus seulement si la coordination le veut (K6) : unité euros, arrondi à l'euro, plafond relevé, aucun nom de donateur ni de client ; visibles par le ministère, le berger et le conseil ; l'administration de l'église ne les voit pas, sauf décision contraire. La comptabilité de l'église fait foi en cas d'écart.
- **Origine** : KPI de la coordination
- **Statut** : Proposé, à confirmer par la coordination
- **BRIEF** : section 7 (« Choix de visibilité ») ; le BRIEF n'est pas modifié

### P24. Chiffres de plateformes externes

- **Date** : 5 octobre 2026
- **Sujet** : vues, portée, abonnés, engagement, spectateurs du direct, Pages Roses, formulaire de recrutement.
- **Décision** : saisis à la main, en « à ce jour » pour un stock (abonnés, vues cumulées) ou en « mois » pour un flux ; la plateforme se nomme dans le libellé ; la date de relevé est la date de saisie ; aucune connexion aux plateformes. L'engagement se calcule à partir de deux comptes. Un même chiffre n'est reporté que par un ministère (K7).
- **Origine** : KPI de la coordination
- **Statut** : Proposé, à confirmer par la coordination
- **BRIEF** : section 4 ; le BRIEF n'est pas modifié

### P25. Ministère Tech et comptes EJP Tech

- **Date** : 5 octobre 2026
- **Sujet** : EJP Tech est à la fois l'administration de la plateforme, qui ne voit aucun chiffre, et un ministère qui a des KPI (Tech).
- **Décision** : le ministère Tech a un compte de ministère, avec sa propre boîte mail partagée, distinct des comptes EJP Tech. Les comptes EJP Tech ne changent pas et ne voient toujours aucun chiffre ; le compte du ministère Tech voit ce que voit tout ministère. Les mêmes personnes ont deux comptes.
- **Origine** : KPI de la coordination
- **Statut** : Proposé, à confirmer par la coordination (K30)
- **BRIEF** : section 2, section 7 (« Choix de visibilité ») ; le BRIEF n'est pas modifié

### P26. Un chiffre, une source

- **Date** : 5 octobre 2026
- **Sujet** : plusieurs KPI recoupent les indicateurs communs ou ceux d'un autre ministère (STARs actifs et en service de MDS, mobilisés, bénévoles actifs, nouvelles intégrations, vues de Film et de MCAD).
- **Décision** : STARs actifs et au service : seulement les indicateurs communs, saisis par chaque ministère (D1) ; MDS ne saisit pas un deuxième total de l'église. Mobilisés, équipiers, agents, animateurs et interprètes sont les STARs au service, sauf libellé « hors STARs ». Bénévoles actifs = STARs actifs. Nouveaux STARs : MDS seul. Lives et diffusions en direct : un seul indicateur. Vues : un seul ministère.
- **Origine** : KPI de la coordination
- **Statut** : Proposé, à confirmer par la coordination (K8, K52)
- **BRIEF** : section 3 (règles 3 à 5), section 4 ; le BRIEF n'est pas modifié

### P27. Coordo FIJ et ministère FIJ

- **Date** : 5 octobre 2026
- **Sujet** : Coordo FIJ demande des chiffres par département et chaque mardi ; le ministère FIJ saisit déjà la carte des 8 départements.
- **Décision** : Coordo FIJ est le ministère FIJ (code `fij`), renommé par migration si la coordination le veut ; la carte reste telle quelle. Les autres chiffres par département ou du mardi attendent une liste précise et demanderaient une table par département et par date (phase 3).
- **Origine** : KPI de la coordination
- **Statut** : Proposé, à confirmer par la coordination (K46, K47)
- **BRIEF** : section 4 (`fij_departement`), section 6 ; le BRIEF n'est pas modifié

### P28. Indicateurs créés par lots de migration

- **Date** : 5 octobre 2026
- **Sujet** : environ 90 indicateurs en phase 1 et jusqu'à 185 demandes ; les ministères sont créés par l'administration en production, et par `seed.sql` après les migrations en local et en CI.
- **Décision** : création par migration (BRIEF), par lots, sur demande écrite de l'administration, sans écran de configuration en V1. Chaque lot rattache ses indicateurs par nom de ministère (unique et non modifiable dans l'outil), ne crée rien là où le ministère manque et signale les noms introuvables ; la préproduction porte les 22 noms et sert de recette. Un écran de configuration se réexamine après un mois d'usage.
- **Origine** : KPI de la coordination
- **Statut** : Proposé, à confirmer par EJP Tech
- **BRIEF** : section 4, section 6 (« Données de référence »), section 11 ; le BRIEF n'est pas modifié

### P29. Phasage des KPI

- **Date** : 5 octobre 2026
- **Sujet** : tout construire avant la mise en service la repousserait et chargerait les ministères de saisies.
- **Décision** : phase 1, avec la mise en service : P16, P18 et P19 dans une nouvelle étape « 4a » avant l'étape 4 ; six indicateurs saisis au plus par ministère, choisis parmi les candidats de la conception (K13) ; journal de l'administration qui garde les chiffres communs d'un envoi mixte. Phase 2, après la mise en service : activités datées, comptages d'événements, lots suivants. Phase 3, si la coordination la confirme : grands graphiques, chiffres de ministères sur la vue de l'église, chiffres FIJ par département, couverture d'événements, écran de configuration.
- **Origine** : KPI de la coordination
- **Statut** : Proposé, à confirmer par la coordination et par EJP Tech
- **BRIEF** : section 13 ; le BRIEF n'est pas modifié

### P30. Vue de l'église à 22 ministères

- **Date** : 5 octobre 2026
- **Sujet** : l'étape 3 (vue de l'église) est en cours avec un jeu d'exemple de 8 ministères ; la liste en compte 22.
- **Décision** : les indicateurs propres restent hors de la vue de l'église, sauf demande de la coordination (K12). L'étape 3 ne change ni le modèle ni le jeu d'exemple ; elle ajoute un test d'affichage à 22 ministères (tableau, barre de la session, listes de noms). Au-delà de trois noms, une liste devient « Coordination, Intégration, Social et 4 autres ministères ».
- **Origine** : KPI de la coordination
- **Statut** : Proposé, à confirmer par la coordination (K12) et par EJP Tech (listes de noms)
- **BRIEF** : section 4, section 9 (« Phrase de la semaine », « Bloc de la session ») ; le BRIEF n'est pas modifié

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
