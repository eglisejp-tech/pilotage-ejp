# Journal des décisions : Pilotage EJP

Une entrée par décision ou proposition. Quatre statuts :

- **Décidé** : tranché par la coordination et EJP Tech ; `BRIEF.md` l'applique.
- **Proposé, à confirmer par la coordination** : règle métier proposée par EJP Tech après la revue du kit ; `BRIEF.md` l'applique en attendant la réponse.
- **Proposé, à confirmer par EJP Tech** : choix technique proposé par la revue du kit ; `BRIEF.md` l'applique en attendant la validation.
- **À l'étude, non appliqué (conception des KPI)** : proposition issue de l'analyse des KPI de la coordination (P15 à P30, T26 et T27, détail dans `docs/conception/kpi-ministeres.md` ; T29, détail dans `docs/conception/configuration-indicateurs.md` ; la conception de T30, détail dans `docs/conception/validation-metier.md`). Ni `BRIEF.md` ni le code ne l'appliquent, même en attendant la réponse : la règle « une proposition s'applique en attendant » ne vaut pas pour elle. Une session ne construit rien à partir d'elle tant que la coordination ou EJP Tech ne l'a pas confirmée. Une seule s'applique dès qu'EJP Tech la confirme : P30 (listes de noms bornées, étape 3).

Quand une proposition est confirmée ou changée, mets à jour son statut ici, puis `BRIEF.md` (section 4 et la section citée). Questions encore ouvertes : la date de mise en ligne et l'existence d'une charte visuelle EJP.

### Numérotation à la fusion

Les branches ont numéroté leurs entrées en parallèle : `main` a déjà T18 à T28 (règles de l'étape 3), et `etape-droits-ejp-tech` y ajoute T29 (lecture par EJP Tech) et T30 (principe de la validation). Cette branche (`etape-kpi-conception`) utilise T26 à T30 pour d'autres entrées, et porte deux P14. À la fusion de cette branche, on renumérote **une seule fois**, en un seul commit, dans ce fichier et dans les documents qui citent ces numéros (`docs/conception/*.md`), selon ce tableau ; puis ce tableau disparaît. D'ici là, les documents de cette branche gardent les numéros de la première colonne.

| Sur cette branche | Sujet                                                                 | Même numéro ailleurs                                                                                   | Après la fusion                                                                                          |
| ----------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| P14 (rappels)     | Rappels de saisie par email                                           | P14 « Calculs affichés », sur toutes les branches                                                      | P31 ; « Calculs affichés » garde P14                                                                     |
| T26               | Unité, plafond, groupe et marque sensible d'un indicateur             | T26 « Rendu des états de « Cette semaine » » (`main`)                                                  | T31                                                                                                      |
| T27               | Indicateurs créés par lots de migration, avec un catalogue            | T27 « Session de la phrase et du résumé du ministère » (`main`)                                        | T32                                                                                                      |
| T28               | EJP Tech voit les chiffres                                            | T28 « Vue de l'église sans « À décider » » (`main`) ; même décision que T29 de `etape-droits-ejp-tech` | fusionnée dans T29 de `etape-droits-ejp-tech`, dont le texte, plus complet, fait foi                     |
| T29               | Configuration des indicateurs et indicateurs créés par les ministères | T29 « EJP Tech lit tout comme le berger » (`etape-droits-ejp-tech`)                                    | T33                                                                                                      |
| T30               | Validation par EJP Tech des indicateurs créés par les ministères      | T30 (`etape-droits-ejp-tech`, fusionnée dans `main`), même décision                                    | T30 : un seul texte, celui du 6 octobre 2026, complété par la conception et les renvois de cette branche |

Les renvois « Revue par T29 » et « Revue par T30 » de P06, P08, P09, P19, P20, P22, P29, T26, T27 et T28 suivent ce tableau : « T29 » devient « T33 », « T30 » reste « T30 ».

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
- **Statut** : Proposé, à confirmer par la coordination. Modifié par T28 (EJP Tech voit les chiffres). Revue par T29 (à l'étude) : l'administration verrait aussi les définitions et l'usage des indicateurs propres (« saisi 4 mois sur 5 »), jamais une valeur. Revue par T30 (6 octobre 2026) : le berger et le conseil voient un indicateur ajouté par un ministère et encore à valider, marqué ; le texte « Pourquoi cet indicateur ? » n'est lu que par le ministère qui l'a écrit et par EJP Tech (proposé) ; l'alerte des événements en attente de validation s'affiche au berger, au conseil, à EJP Tech et au ministère de l'événement, jamais à l'administration ni aux autres ministères ; « Prochain événement » ne change pas
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
- **Statut** : Proposé, à confirmer par la coordination. Revue par P22 (enfants) et par T29 (à l'étude) : première vague par migration dans un catalogue, puis création à l'écran Indicateurs ; trois rythmes (dimanche, mois, à ce jour)
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
- **Sujet** : la coordination propose 185 demandes (176 KPI et 9 graphiques ; six lignes groupent plusieurs chiffres) pour 22 ministères ; le modèle ne connaît que des comptes entiers du dimanche ou à ce jour, et la liste V1 de P08 n'en comptait que six.
- **Décision** : chaque demande devient un compte entier saisi par le ministère (indicateur propre), une valeur calculée (jamais saisie, avec sa complétude), un indicateur commun déjà existant, un point d'attention (texte), ou elle est retirée. Taux, moyennes, cumuls et évolutions se calculent toujours, comme le pourcentage FIJ. Libellés de 60 caractères au plus, raccourcis par EJP Tech. Classement ligne à ligne (annexe de la conception), phases et questions (C1 à C3, K1 à K57) : `docs/conception/kpi-ministeres.md`.
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par la coordination (C1 à C3 d'abord : l'outil est temporaire, la liste est-elle pour lui ?)
- **BRIEF** : section 3 (règles 3, 4 et 9), section 4 (« Indicateurs propres ») ; le BRIEF n'est pas modifié

### P16. Nature « mois » pour les comptes par période

- **Date** : 5 octobre 2026
- **Sujet** : 68 demandes se comptent par semaine ou par mois. La convention du BRIEF (un indicateur « ce mois » saisi « à ce jour » et remis à zéro) date la valeur du jour de saisie : le total de septembre saisi le 2 octobre compterait pour octobre.
- **Décision** : nouvelle nature « mois » : `date_ref` est le 1er jour du mois ; le formulaire propose le mois en cours et les deux précédents ; la base refuse un autre jour que le 1er et un mois futur (heure de Paris), et le mois en cours pour un indicateur sensible (P22) ; la saisie la plus récente d'un mois fait foi ; total, cumul de l'année et complétude par mois. Un compte vraiment hebdomadaire reste « dimanche » (la semaine du lundi au dimanche). Pas de nature « année » : l'année se calcule. Nouvelle migration (contrôle de `indicateur.nature`, trigger `controler_mesure`, vues) et tests pgTAP ; `mesure` reste en ajout seulement.
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par la coordination (période, K1) et par EJP Tech (modèle)
- **BRIEF** : section 4 (« Indicateurs propres »), section 6 (`indicateur`, « Règles d'intégrité ») ; le BRIEF n'est pas modifié

### P17. Activités propres à un ministère

- **Date** : 5 octobre 2026
- **Sujet** : Welcome Prodiges, sessions de baptême, Prière des Stars, répétitions, activités de Kumi et d'Eagles se comptent par activité. Hypothèse à vérifier : ce ne seraient pas des sessions d'église. Mais si la Prière des Stars ou Welcome Prodiges réunit les STARs de plusieurs ministères, la règle 5 du BRIEF et D2 les rangent parmi les rassemblements à déclarer (K35, K18).
- **Décision** : en phase 1, nature « dimanche » si l'activité a lieu le dimanche, sinon comptes du mois (activités du mois, présents du mois). En phase 2, si la coordination confirme le besoin d'un chiffre par activité : nature « jour », une valeur par date d'aujourd'hui ou avant. Une activité d'un seul ministère ne se déclare pas comme session d'église ; un rassemblement qui réunit les STARs de plusieurs ministères se déclare comme session « Autre rassemblement » (règle 5, D2 : chaque ministère saisit ses présents, un STAR n'est compté qu'une fois). Pas de table d'activités.
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par la coordination (K18, K21, K35, K42, K57) et par EJP Tech (modèle)
- **BRIEF** : section 3 (règle 5), section 4, section 6 ; le BRIEF n'est pas modifié

### P19. Valeurs calculées déclarées par migration

- **Date** : 5 octobre 2026
- **Sujet** : 23 demandes sont des cumuls, taux, moyennes ou évolutions ; un indicateur propre n'a pas de code, l'interface ne peut donc pas le nommer dans un calcul.
- **Décision** : nouvelle table `indicateur_calcul` (ministère, libellé, type, numérateur, dénominateur, ordre), écrite par migration, lue comme `indicateur` (rien pour EJP Tech), et vue `v_calcul`. Trois types : cumul depuis le 1er janvier (heure de Paris), ratio de deux indicateurs du même ministère sur la même période, moyenne par activité (phase 2). Affichage avec complétude ; « Non calculé » si le dénominateur manque ou vaut zéro. Un taux sans dénominateur défini n'est pas créé. Complétude dans le temps : les périodes attendues (dimanches ou mois) depuis le 1er janvier ou depuis la création de l'indicateur, la plus récente des deux ; pour la moyenne par activité et la nature « jour », aucune complétude n'est possible (personne ne déclare les activités prévues, K57). La règle 13 du BRIEF, qui ne définit pas cette complétude dans le temps, sera complétée à la confirmation.
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par EJP Tech (modèle) et par la coordination (dénominateurs, année et complétude, K2 à K4, K57). Revue par T29 (5 octobre 2026) : pas de table `indicateur_calcul` ; un taux ou une moyenne devient une ligne d'`indicateur` qui ne se saisit pas, créée à l'écran ; le cumul devient la somme automatique de l'année ; la moyenne par activité reste en phase 2
- **BRIEF** : section 3 (règles 3, 4 et 13), section 6 ; le BRIEF n'est pas modifié

### P20. Comptages d'événements

- **Date** : 5 octobre 2026
- **Sujet** : événements prévus, réalisés, annulés, reportés et couverts ; l'état « reporté » n'existe pas, et rien ne relie un événement aux ministères qui le couvrent.
- **Décision** : réalisés = dernier état « Terminé » ; prévus = dernier état « Validé » ou « En préparation », daté d'aujourd'hui ou après ; annulés = dernier état « Annulé » ; reporté = date repoussée, lue dans l'historique de `evenement_etat`, sans nouvel état. Comptés par mois, en phase 2 : chaque ministère lit les siens, et Coordination, si elle compte ceux de tous (K11), ne lit que des totaux de l'église par mois, sans détail par ministère (P06). Un événement couvert par un autre ministère se compte par un compte du mois saisi par ce ministère, sans lien avec l'événement ni total de l'église.
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par la coordination (K9 à K11). Revue par T30 (6 octobre 2026) : sans effet, les événements ne se valident pas dans l'outil (règle 14) ; la règle du 5 octobre (seuls les événements validés par EJP Tech se comptent) est retirée
- **BRIEF** : section 3 (règle 14), section 6 (`evenement_etat`), section 11 ; le BRIEF n'est pas modifié

### P21. Suivi de personnes remplacé par des comptes

- **Date** : 5 octobre 2026
- **Sujet** : taux de retour, de conversion et de perte des NA, parcours vers la FIJ, participants uniques, parcours du jeune, enfants revenus, nouveaux bénéficiaires ou participants, satisfaction : tous supposent de reconnaître une personne d'une fois à l'autre.
- **Décision** : l'outil ne suit aucune personne. Chaque KPI devient un compte agrégé saisi par le ministère (par exemple « NA revenus ce dimanche »), et un taux éventuel est un ratio de totaux, présenté comme tel ; sinon il est retiré. Le comptage se fait hors de l'outil ; l'outil ne reçoit qu'un nombre.
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par la coordination (K4)
- **BRIEF** : section 3 (règle 9), section 7 (« Données personnelles ») ; le BRIEF n'est pas modifié

### P22. Domaines sensibles

- **Date** : 5 octobre 2026
- **Sujet** : Santé, Social, Call your sister (Kumi), la plate-forme d'écoute (Eagles) et, pour les enfants, Prodiges Junior : un petit nombre daté peut désigner une personne (santé, situation personnelle, mineurs ; article 9 du RGPD). Comme `mesure` est en ajout seulement (`saisi_le`) et que le détail du journal (valeur, date) est lu par le berger et le conseil, deux saisies successives d'un mois en cours révèlent un écart au jour près (« 1 prise en charge entre le 4 et le 11 octobre »). Un total par mois ne suffit donc pas : il faut aussi que le mois soit clos.
- **Décision** : colonne `indicateur.sensible` (migration). Pour ces indicateurs : nature « mois » seulement, et `controler_mesure` refuse le mois en cours (seuls les mois écoulés, heure de Paris, se saisissent) ; la fiche et le journal ne montrent que la valeur du mois, pas la suite des saisies, et le `detail` du journal n'a pas de valeur pour eux. Aucune ventilation, aucun texte libre lié au chiffre ; visibles par le ministère, le berger et le conseil (règle des indicateurs propres), jamais sur la vue de l'église, ni dans un email, ni dans la lecture du journal par l'administration. Prodiges Junior : « enfants présents » (gros nombres) se sépare de « nouveaux enfants » et « enfants déjà venus » ; ces deux derniers sont sensibles et se comptent par mois écoulé, les enfants présents se comptent chaque dimanche si la coordination l'accepte (K5). Le seuil d'affichage des très petits nombres est laissé à la coordination (K5). **P22 modifie P08** : l'indicateur « Enfants accueillis le dimanche » de la liste V1 (section 4 du BRIEF) n'existerait plus tel quel. Les pages Confidentialité et Conditions d'utilisation gagnent chacune une phrase, soumise à la validation de la coordination (voir K56 pour le registre).
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par la coordination (K5, K56). Revue par T29 (5 octobre 2026) : le journal ne porte plus aucune valeur d'indicateur propre ; proposé, les lignes brutes de `mesure` restent lisibles par l'API tant que le seuil K5c n'est pas retenu (au lieu d'une lecture par la vue du mois seulement) ; un chiffre jugé sensible après coup se retire pour confidentialité ; au lot 2, un ministère qui suit un domaine sensible fait valider les indicateurs qu'il écrit. Revue par T30 (5 et 6 octobre 2026) : tout indicateur créé par un ministère est validé, par EJP Tech seul (la condition « domaine sensible » disparaît) ; proposé, les indicateurs sensibles sont contrôlés comme les autres par la confirmation « Vérifiez ce chiffre », qui ne montre au ministère que ses propres valeurs et rien aux autres profils
- **BRIEF** : section 3 (règle 9), section 4 (liste V1 de P08), section 7 (« Données personnelles ») ; le BRIEF n'est pas modifié

### P23. Chiffres financiers

- **Date** : 5 octobre 2026
- **Sujet** : chiffre d'affaires, marge et panier moyen (Merch), fonds levés (Social), budget (Production).
- **Décision** : retenus seulement si la coordination le veut (K6) : unité euros, arrondi à l'euro, plafond relevé, aucun nom de donateur ni de client ; visibles par le ministère, le berger et le conseil ; l'administration de l'église ne les voit pas, sauf décision contraire. La comptabilité de l'église fait foi en cas d'écart.
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par la coordination (K6)
- **BRIEF** : section 7 (« Choix de visibilité ») ; le BRIEF n'est pas modifié

### P24. Chiffres de plateformes externes

- **Date** : 5 octobre 2026
- **Sujet** : vues, portée, abonnés, engagement, spectateurs du direct, Pages Roses, formulaire de recrutement.
- **Décision** : saisis à la main, en « à ce jour » pour un stock (abonnés, vues cumulées) ou en « mois » pour un flux ; la plateforme se nomme dans le libellé ; la date de relevé est la date de saisie ; aucune connexion aux plateformes. L'engagement se calcule à partir de deux comptes. Un même chiffre n'est reporté que par un ministère (K7).
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par la coordination (K7)
- **BRIEF** : section 4 ; le BRIEF n'est pas modifié

### P25. Ministère Tech et comptes EJP Tech

- **Date** : 5 octobre 2026
- **Sujet** : EJP Tech est à la fois l'administration de la plateforme, qui ne voit aucun chiffre, et un ministère qui a des KPI (Tech).
- **Décision** : le ministère Tech a un compte de ministère, avec sa propre boîte mail partagée, distinct des comptes EJP Tech. Les comptes EJP Tech ne changent pas et ne voient toujours aucun chiffre ; le compte du ministère Tech voit ce que voit tout ministère (vue de l'église, sessions, carte des FIJ, sa fiche). Si ce sont des personnes d'EJP Tech qui tiennent ce compte, elles voient donc les chiffres de l'église et relisent les textes libres : la règle « EJP Tech ne voit aucun chiffre » (P06) est alors vidée en pratique. Cette conséquence est à faire accepter (K30) ; rien n'est posé sur qui tient le compte avant la réponse.
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par la coordination (K30)
- **BRIEF** : section 2, section 7 (« Choix de visibilité ») ; le BRIEF n'est pas modifié

### P26. Un chiffre, une source

- **Date** : 5 octobre 2026
- **Sujet** : plusieurs KPI recoupent les indicateurs communs ou ceux d'un autre ministère (STARs actifs et en service de MDS, mobilisés, bénévoles actifs, nouvelles intégrations, vues de Film et de MCAD). Un STAR n'est compté que dans son ministère principal (règle 4, P01) : une bénévole de Kumi dont le ministère principal est un autre n'est pas dans les actifs de Kumi, et « mobilisés » ne couvre que les dimanches alors que Santé, Sécurité, MCAD et Multilingue sont aussi mobilisés aux événements.
- **Décision** : STARs actifs et au service : seulement les indicateurs communs, saisis par chaque ministère (D1) ; MDS ne saisit pas un deuxième total de l'église. **Hypothèses à vérifier avec chaque ministère (K8, K43, K44, K52)** : les mobilisés, équipiers, agents, animateurs et interprètes seraient les STARs au service du dimanche ; les bénévoles actifs de Kumi et d'Eagles seraient leurs STARs actifs ; les nouveaux STARs seraient comptés par MDS seul. Tant que le ministère n'a pas répondu, ces lignes sont classées « Commun » avec la mention « hypothèse », et celles de Kumi et d'Eagles sur les intégrations dans les équipes sont « À préciser » (K55). Lives et diffusions en direct : un seul indicateur. Vues : un seul ministère.
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par la coordination et par chaque ministère concerné (K8, K52, K55)
- **BRIEF** : section 3 (règles 3 à 5), section 4 ; le BRIEF n'est pas modifié

### P27. Coordo FIJ et ministère FIJ

- **Date** : 5 octobre 2026
- **Sujet** : Coordo FIJ demande des chiffres par département et chaque mardi ; le ministère FIJ saisit déjà la carte des 8 départements.
- **Décision** : Coordo FIJ est le ministère FIJ (code `fij`), renommé par migration si la coordination le veut ; la carte reste telle quelle. Les autres chiffres par département ou du mardi attendent une liste précise et demanderaient une table par département et par date (phase 3).
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par la coordination (K46, K47)
- **BRIEF** : section 4 (`fij_departement`), section 6 ; le BRIEF n'est pas modifié

### P29. Phasage des KPI

- **Date** : 5 octobre 2026
- **Sujet** : tout construire avant la mise en service la repousserait et chargerait les ministères de saisies.
- **Décision** : phase 1, avec la mise en service : P16, T26, T27 et P19 dans une nouvelle étape « 4a » avant l'étape 4 (nom provisoire, absent de la section 13 du BRIEF) ; six indicateurs saisis au plus par ministère, choisis parmi les candidats de la conception (K13) ; lecture du journal par l'administration qui ne montre que les chiffres communs d'un envoi mixte (par une fonction et une vue, pas par la RLS). Cet ajout allonge le chemin vers la mise en service de 6 à 9 jours de travail (date toujours ouverte, section 4 du BRIEF) : à peser contre le caractère temporaire de l'outil (C1). Phase 2, après la mise en service : activités datées, comptages d'événements, lots suivants. Phase 3, si la coordination la confirme : grands graphiques, chiffres de ministères sur la vue de l'église, chiffres FIJ par département, couverture d'événements, écran de configuration.
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par la coordination (C1, K13) et par EJP Tech. Revue par T29 (5 octobre 2026) : la migration `journal_administration_chiffres` devient inutile (plus aucune valeur propre au journal) ; l'écran de configuration passe de la phase 3 au lot 1 de T29, avant la mise en service ; plus de lot de migration après la première vague
- **BRIEF** : section 13 ; le BRIEF n'est pas modifié

### P30. Vue de l'église à 22 ministères

- **Date** : 5 octobre 2026
- **Sujet** : l'étape 3 (vue de l'église) est en cours avec un jeu d'exemple de 8 ministères ; la liste en compte 22.
- **Décision** : les indicateurs propres restent hors de la vue de l'église, sauf demande de la coordination (K12). L'étape 3 ne change ni le modèle ni le jeu d'exemple ; elle ajoute un test d'affichage à 22 ministères (tableau, barre de la session, listes de noms). Au-delà de trois noms, une liste devient « Coordination, Intégration, Social et 4 autres ministères » ; la liste complète reste lisible dans le tableau « Les ministères » et dans un libellé accessible (lecteur d'écran, tablette).
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; la borne des listes de noms s'applique à l'étape 3 dès qu'EJP Tech la confirme, le reste attend la coordination (K12)
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

### T26. Unité, plafond, groupe et marque sensible d'un indicateur

- **Date** : 5 octobre 2026
- **Sujet** : vues, portée et montants dépassent 9999 ; aucune unité n'est prévue ; la liste range ses KPI en groupes (Captation, Audience, Prière des Stars, Badges) ; les domaines sensibles (P22) doivent être reconnus par la base.
- **Décision** : quatre colonnes sur `indicateur` : `unite` (nombre par défaut, euros, minutes, jours), `valeur_max` (9999 par défaut, contrôlée par le trigger de `mesure`, dont le contrôle devient « 0 ou plus »), `groupe` (facultatif, pour la fiche et les formulaires) et `sensible` (faux par défaut ; P22). Aucune décimale : pourcentages et moyennes sont seulement calculés. Les durées et délais suivis objet par objet sont remplacés par des comptes ou retirés. L'heure de début du culte se saisit comme un retard en minutes chaque dimanche, si la coordination le confirme (K22).
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par EJP Tech. Revue par T29 (5 octobre 2026) : `unite` et `sensible` gardées ; plafond fixé par sorte de nombre (compte 9 999, grand compte et euros 9 999 999) au lieu de `valeur_max` ; ni `groupe`, ni unité « jours » ; « minutes » plus tard, seulement si K22
- **BRIEF** : section 6 (`indicateur`, `mesure`, « Règles d'intégrité ») ; le BRIEF n'est pas modifié

### T27. Indicateurs créés par lots de migration, avec un catalogue

- **Date** : 5 octobre 2026
- **Sujet** : environ 90 indicateurs en phase 1 et jusqu'à 185 demandes ; les ministères sont créés par l'administration en production après le déploiement, et par `seed.sql` après les migrations en local et en CI. Une migration qui cherche chaque ministère par son nom ne trouve donc rien en production à la mise en service, ne se rejoue jamais, ne peut pas être testée par pgTAP (la base est déjà chargée) et dépend d'un nom libre tapé à l'écran 13.
- **Décision** : création par migration (BRIEF), par lots, sur demande écrite de l'administration, sans écran de configuration en V1. Chaque lot écrit un catalogue `private.indicateur_modele` (nom normalisé du ministère, libellé, nature, unité, plafond, groupe, sensible, ordre) ; une fonction `private` le matérialise, appelée par un trigger après chaque création de ministère et une fois par lot pour les ministères existants (noms comparés sans accents ni majuscules). `seed.sql` désactive ce trigger le temps de charger ses 8 ministères. Test pgTAP : créer un ministère du catalogue crée ses indicateurs. À défaut : écrire dans l'étape 8 l'ordre imposé (tous les ministères créés avant le lot) et une requête de contrôle à lancer après le push. Un écran de configuration se réexamine après un mois d'usage.
- **Origine** : KPI de la coordination
- **Statut** : À l'étude, non appliqué ; à confirmer par EJP Tech. Revue par T29 (5 octobre 2026) : un catalogue privé reste pour la première vague, mais la table devient `private.indicateur_prevu` (code, modèle, libellé, définition, nature, unité, sensible, calcul et ses deux sources, ordre ; ni plafond ni groupe) et sert aussi aux suggestions. Elle se crée par un bouton « Créer » de l'écran « Indicateurs », sans trigger sur `ministere` ni désactivation dans `seed.sql`, et plus aucun lot de migration ne suit cette vague. La phrase « Un écran de configuration se réexamine après un mois d'usage » est remplacée par l'écran de T29, au lot 1, avant la mise en service (voir T29 et `docs/conception/configuration-indicateurs.md`)
- **BRIEF** : section 4, section 6 (« Données de référence »), section 8 (amorçage), section 11 ; le BRIEF n'est pas modifié

### T28. EJP Tech voit les chiffres

- **Date** : 5 octobre 2026
- **Sujet** : le BRIEF (section 2, profils) dit que l'administration de la plateforme (EJP Tech) « ne voit aucun chiffre ».
- **Décision** : EJP Tech voit tous les chiffres, en lecture, pour administrer la plateforme : vue de l'église, fiches des ministères, indicateurs propres. Il ne saisit rien au nom d'un ministère et ne décide pas des points. Les chiffres des domaines sensibles suivent les mêmes règles que pour le berger (T26).
- **Origine** : décision de la personne responsable (EJP Tech)
- **Statut** : Décidé ; à appliquer juste après l'étape 3. Effets : nouvelle migration des droits (politiques RLS de lecture pour `admin_plateforme`), matrice et tests pgTAP mis à jour, navigation du profil EJP Tech (accès à la vue de l'église et aux fiches), page Confidentialité (« sans voir les chiffres » est retiré), CLAUDE.md (« Un ministère ne voit que... » inchangé, la phrase sur EJP Tech est corrigée). Même décision que T29 de `etape-droits-ejp-tech`, qui la remplace à la fusion (« Numérotation à la fusion »). Revue par T30 (5 et 6 octobre 2026) : EJP Tech valide aussi, seul, la création d'un indicateur par un ministère (ni les chiffres, ni les événements) ; il configure les indicateurs sur l'écran commun avec l'administration (T29)
- **BRIEF** : section 2 (profils), section 7 (matrice des droits) ; le BRIEF n'est pas modifié

### T29. Configuration des indicateurs et indicateurs créés par les ministères

- **Date** : 5 octobre 2026
- **Sujet** : EJP Tech demande un écran de configuration des indicateurs pour l'administration de l'église et EJP Tech (une première vague par migration, puis l'écran) et la possibilité, dans des limites, pour un ministère de créer ses propres indicateurs. La première proposition (un formulaire et quelques avertissements sur le nom) n'était pas assez mûre. Trois conceptions (simplicité, qualité des chiffres, autonomie) ont été étudiées et évaluées ; T29 en fait la synthèse.
- **Décision** : une seule table de définitions, `indicateur`, étendue. Son sens est figé par un trigger qui ne contrôle que la structure (rythme, sorte de nombre, ministère, case sensible, calcul) ; libellé et définition « Ce qu'on compte exactement » (10 à 140 caractères, obligatoire) se corrigent tant qu'aucune valeur n'est saisie, ensuite on remplace l'indicateur ; aucune suppression ni réactivation. Trois rythmes (dimanche, mois selon P16, à ce jour) et trois sortes de nombre à plafond fixe (compte 9 999, grand compte et euros 9 999 999 ; minutes plus tard si K22). Un calcul (taux ou moyenne de deux indicateurs saisis du même ministère) est une ligne d'`indicateur` qui ne se saisit pas ; la somme de l'année et la petite courbe (dimanche et mois) sont automatiques, avec la complétude dans le temps. Deux lots. **Lot 1, avant la mise en service** : première vague écrite une fois par migration dans un catalogue privé (prévus par ministère, au plus 6 saisis, et suggestions communes), créée par un bouton de l'écran « Indicateurs » (sans aucune valeur, avec l'usage « saisi 4 mois sur 5 ») ; l'administration y ajoute, corrige, remplace, retire et retire pour confidentialité ; EJP Tech a le même écran et y configure comme l'administration (la procédure des gestes qui changent ce qui est suivi, hors validation, reste une question à la coordination : Q13) ; un ministère ajoute seulement des suggestions, en un clic (3 ajouts, 12 indicateurs par fiche), et demande le reste à l'administration. **Validation (T30)** : tout ajout d'un ministère, suggestion comprise, porte un texte « Pourquoi cet indicateur ? » (10 à 280 caractères, jamais recopié dans le journal), naît « à valider », et EJP Tech seul le valide ou le refuse, dans un bloc « À valider » de l'écran Indicateurs ; tant qu'il attend, le berger et le conseil le voient, marqué « à valider », il se saisit déjà et ses valeurs n'entrent dans aucune somme ; refusé, il est retiré avec le motif « Refusé » et ses valeurs ne s'affichent plus ; au lot 2, le ministère corrige le nom de son ajout, librement tant qu'il attend, puis par une correction que valide EJP Tech, sans perte de valeur ni arrêt des saisies ; la validation vaut relecture, et les textes d'indicateur ne passent plus par la Modération. **Lot 2, après la mise en service et seulement s'il est confirmé** : un ministère écrit ses propres comptes simples (mots refusés par la base, 3 ajouts par 30 jours, retirés compris et refusés non compris), à valider comme tout ajout ; « Rendre officiel ». Journal : une ligne par geste, sans texte libre, et plus aucune valeur d'indicateur propre. Modifie P06 (l'administration lit l'usage), P08, P19 (pas de table `indicateur_calcul`), P22 (journal, lecture des lignes brutes), P29 (plus de migration `journal_administration_chiffres`, écran avant la mise en service), T26 (plafond par sorte, ni `groupe` ni unité « jours ») et T27 (`private.indicateur_prevu`, bouton au lieu du trigger) ; chacune porte un renvoi. Là où `docs/conception/kpi-ministeres.md` (3.7 à 3.9 et 6) diffère, la conception de T29 le remplace. Conception, écrans, tests, phasage (lot 1 : 10 à 13 jours avant la mise en service, plus 2 à 2,5 jours pour la validation, comptés avec T30 ; lot 2 : 3 à 4 jours ensuite, plus 1 jour pour la correction du nom) et questions Q1 à Q21 : `docs/conception/configuration-indicateurs.md`.
- **Origine** : demande d'EJP Tech
- **Statut** : À l'étude, non appliqué ; à confirmer par EJP Tech (Q1 à Q11, Q16) et par la coordination (Q12 à Q21). Revue appliquée le 5 octobre 2026 (un ajout refusé restait lisible du berger, correction sur place, masquage imitable, relecture après correction, remplacement, liste de mots, jeu d'exemple, matrice, effort). Alignée sur T30 le 5 octobre 2026 : validation de tout ajout d'un ministère par EJP Tech seul ; ajout à valider visible du berger et du conseil, saisissable, hors de toute somme ; plus de relecture des textes d'indicateur ; plus de colonnes `ne_en_attente` et `valide_le` (tables `demande_indicateur` et `validation`) ; « Refusé » rejoint les motifs de retrait posés par la base ; un refus ne compte pas dans la limite sur 30 jours. Réalignée le 6 octobre 2026 : suggestions comprises (décidé) ; champ « Pourquoi cet indicateur ? » ; correction du nom par le ministère (libre tant que l'ajout attend, validée par EJP Tech ensuite, saisies comprises) au lieu de « le ministère ne corrige jamais » ; décision dans un bloc de l'écran Indicateurs ; codes de journal `indicateur_valide` et `indicateur_refuse` ; alerte de valeur inhabituelle réduite à la confirmation du ministère. Les questions auxquelles la personne responsable a répondu (anciennes Q2, Q14 et Q22) sont retirées et la liste renumérotée. Pour le modèle de la validation, le bloc « À valider » et les chiffres inhabituels, `docs/conception/validation-metier.md` fait foi
- **BRIEF** : section 2 (navigation), section 3 (règles 1 et 13), section 4 (« Indicateurs propres »), section 6 (`indicateur`, `mesure`, journal, modération), section 7 (matrice, politiques, fonctions), section 9 (écrans, adresses), section 11 (« écran de création des indicateurs propres »), section 13 (étapes 4a, 4, 6 et 8) ; le BRIEF n'est pas modifié

### T30. Validation par EJP Tech des indicateurs créés par les ministères

- **Date** : 6 octobre 2026 (principe du 5 octobre 2026, corrigé)
- **Sujet** : EJP Tech ne fait pas que des actions techniques : quand c'est nécessaire, il valide aussi, sur le fond, ce que les ministères soumettent. Le principe du 5 octobre lui faisait valider les indicateurs créés par les ministères, les événements et les chiffres inhabituels ; les décisions du 6 octobre le limitent aux indicateurs et ajoutent une alerte pour les événements qui attendent encore leur validation. Aujourd'hui, la règle 14 du BRIEF place la validation des événements en dehors de l'outil, et la section 11 met « validation dans l'outil » hors de la première version.
- **Décision** : décisions de la personne responsable du 6 octobre 2026, qui remplacent le principe du 5 octobre (« EJP Tech valide les indicateurs créés par les ministères, les événements et les chiffres inhabituels »). **Indicateurs** : EJP Tech seul (ni l'administration de l'église, ni le berger) valide seulement la création d'un indicateur par un ministère, suggestions comprises. Le ministère écrit pourquoi il veut cet indicateur dans un champ « Pourquoi cet indicateur ? » (10 à 280 caractères, rappel « N'écrivez aucun nom ni information personnelle. ») ; ce texte n'est jamais recopié dans le journal, et EJP Tech le lit pour décider. Tant qu'il n'est pas validé, l'indicateur se saisit déjà ; ses valeurs restent marquées « à valider » et hors de toute somme. Un refus porte un motif de 10 à 280 caractères. **Correction du nom** : le ministère corrige librement une faute dans le nom de son indicateur tant qu'il attend EJP Tech ; une fois l'indicateur validé, sa correction repart à EJP Tech, sans perte de valeur ni arrêt des saisies : l'indicateur compte sous son nom validé jusqu'à la validation de la correction. **Chiffres** : EJP Tech ne les valide pas. Le ministère corrige les siens (une correction est une nouvelle saisie, la plus récente fait foi). Un chiffre inhabituel, selon une règle de la base explicable en une phrase, ne déclenche à la saisie qu'une confirmation « Vérifiez ce chiffre » pour le ministère : il confirme ou corrige, puis le chiffre compte normalement. Aucune marque pour le berger ; les totaux de l'église n'ont plus de part « à valider ». **Événements** : EJP Tech ne les valide pas ; la règle 14 reste (validation en dehors de l'outil, le ministère reporte le statut). **Alerte** : une alerte dans l'outil signale un événement encore « En attente de validation » (`attente_validation`) dont la date tombe dans les 3 jours ou est déjà passée, au berger, au conseil, au ministère qui porte l'événement et à EJP Tech, qui lit tout ; elle s'arrête quand le ministère change le statut. Pas d'email en V1 (il pourrait rejoindre P14). Les mentions n'existent que sur les points d'attention : en ajouter aux événements serait une nouveauté, posée en question (V7). **Conception proposée, à l'étude** (`docs/conception/validation-metier.md`) : une demande (`demande_indicateur`, qui porte le « Pourquoi ») et une décision (`validation`) sont des lignes ajoutées, jamais des mises à jour, et la décision est définitive ; EJP Tech décide dans un bloc « À valider » en tête de l'écran Indicateurs, sans onglet à part ; le « Pourquoi » n'est lu que par le ministère et EJP Tech (proposé) ; aucune décision automatique, et un ajout qui attend plus de 7 jours est signalé à l'administration. Chiffre inhabituel : loin de la médiane de ses 6 valeurs les plus récentes, sur les autres périodes, et loin du dernier chiffre confirmé par le ministère s'il y en a un (4 valeurs au moins, donc rien avant la 5e saisie ; facteur 3, ou 2 pour un « à ce jour » ; écart d'au moins 10) ; un filet contre la faute de frappe, pas un contrôle ; la confirmation est retenue sans valeur dans `chiffre_confirme`, que personne ne lit. Alerte : deux colonnes de `v_evenement` (`jours` et `a_confirmer`, à l'heure de Paris), un bloc « Événements à confirmer » sur « Cette semaine » (berger, conseil, EJP Tech), une ligne « Mettre à jour » dans « Vos saisies » du ministère et une marque dans le calendrier des fiches ; aucune table, aucun journal, rien pour l'administration. Phasage : 3,5 à 4 jours avant la mise en service (validation des ajouts, alerte), 2,5 à 3,5 jours ensuite (confirmation des chiffres avant le 5e dimanche, correction du nom avec le lot 2 de T29), plus 2 à 3 jours si des mentions s'ajoutent aux événements. Écrans, modèle, droits, tests et questions V1 à V8 : `docs/conception/validation-metier.md`.
- **Origine** : décisions de la personne responsable (5 et 6 octobre 2026)
- **Statut** : Décidé. La conception détaillée reste à l'étude : rien n'est construit tant que V1 à V8 n'ont pas de réponse. Retire de la conception du 5 octobre la validation des événements (état « Refusé », contrôle des transitions), la validation des chiffres (file, complétude « 5 sur 8, 1 à valider », total partiel d'une session, noms réservés au berger, reprise des vues de l'étape 3), les alertes de 7 jours sur les chiffres et les événements, l'onglet « À valider » et la règle « le ministère ne corrige jamais le texte de son ajout ». Revoit P06, P09, P20, P22, T28 et T29, qui portent un renvoi ; `configuration-indicateurs.md` est alignée. La branche `etape-droits-ejp-tech`, fusionnée dans `main`, écrit la même décision sous T30 (et la lecture par EJP Tech sous T29, ici T28) : la correspondance est dans « Numérotation à la fusion », en tête de ce fichier
- **BRIEF** : section 2 (EJP Tech valide les ajouts d'indicateurs des ministères), section 3 (règle 1 : `demande_indicateur`, `validation` et `chiffre_confirme` ; règle 14 : texte gardé, paragraphe de l'alerte ajouté), section 6 (tables, journal, `v_evenement`), section 7 (matrice, politiques, fonctions), section 9 (bloc « À valider », champ « Pourquoi », correction du nom, confirmation « Vérifiez ce chiffre », bloc « Événements à confirmer », « Vos saisies »), section 11 (« validation dans l'outil » réduite aux indicateurs ; « notifications » reste), section 13 (étapes 4a, 4 et 6, deux lots après la mise en service) ; le BRIEF n'est pas modifié sur cette branche
