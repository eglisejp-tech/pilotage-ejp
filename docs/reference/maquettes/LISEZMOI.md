# Maquettes validées : direction C

Ces maquettes fixent l'apparence de l'application. Pour le visuel, **elles priment sur `prototype.html`**. Le prototype reste la référence pour le comportement (ce qui se passe quand on clique, les données d'exemple).

Chaque écran existe en deux formes :
- `NN-nom.png` : la capture, à regarder ;
- `html/NN-nom.html` : la même maquette en HTML statique, pour lire les valeurs exactes (tailles, espacements, couleurs). Ce n'est **pas** du code à copier : reconstruis avec les composants React, Tailwind et les tokens de `docs/reference/tokens.css`.

Les fichiers PNG et HTML sont figés : ne les modifie jamais. Quand une décision les dépasse, l'écart s'écrit dans ce fichier (« Écarts connus avec le brief ») et `BRIEF.md` fait foi.

## Nom de l'outil

L'outil s'appelle **Pilotage EJP** (décision du 30 septembre 2026). Les maquettes affichent encore l'ancien nom « Le point du berger » (en-tête, écran 16, texte de 18) : lis « Pilotage EJP » partout. Le sous-titre « Église des Jeunes Prodiges » reste à côté du nom à partir de 1024 px, et au-dessus du titre sur l'écran de connexion (16). Ce n'est pas un écart à signaler en revue.

## Écrans par profil

| Fichier | Profil | Écran | Format dessiné |
|---|---|---|---|
| 00 | Tous | Qui voit quoi, navigation de chaque profil | Planche |
| 01, 02, 03 | Berger et conseil | Cette semaine (accueil) | Ordinateur, tablette, téléphone |
| 04 | Berger et conseil | Fiche d'un ministère | Ordinateur |
| 05 | Berger et conseil | Points d'attention | Ordinateur |
| 06 | Berger et conseil | Journal | Ordinateur |
| 07 | Ministère | Accueil | Téléphone |
| 08 | Ministère | Saisie du dimanche | Téléphone |
| 09 | Ministère | Saisie d'une session | Téléphone |
| 10 | Ministère | Nouveau point d'attention | Téléphone |
| 11 | Ministère | Ajouter un événement | Téléphone |
| 12 | Ministère | Ma fiche | Ordinateur |
| 13 | Administration de l'église | Ministères et comptes | Ordinateur |
| 14 | Administration de l'église | Sessions | Ordinateur |
| 15 | EJP Tech | Modération des champs libres | Ordinateur |
| 16 | Tous | Connexion : Google ou email et mot de passe (avec message d'erreur) | Téléphone |
| 17 | Tous | Activer la double authentification (première connexion) | Téléphone |
| 18 | Tous | Code de double authentification (chaque connexion) | Téléphone |

## Détails de l'authentification

- **Bouton Google** (16) : le carré en pointillés marque la place du logo. Dans l'application, utilise le bouton et le logo **officiels** de Google, selon ses consignes de marque (Google Identity). Ne redessine pas le logo.
- **Code à 6 chiffres** (17, 18) : les six cases sont un dessin. Dans le code, c'est **un seul champ** `inputmode="numeric"`, `autocomplete="one-time-code"`, `maxlength="6"`, avec un libellé, pour que le collage, le remplissage automatique et les lecteurs d'écran fonctionnent.
- **QR code** (17) : celui de la maquette est factice. Le vrai vient de `supabase.auth.mfa.enroll()` (avec `issuer: 'Pilotage EJP'`). Il n'est affiché qu'une fois. Sous le QR code, ajoute : « Vous pouvez aussi scanner ce code avec un deuxième téléphone, en secours. »
- **Encadré « Compte partagé »** (17) : seulement pour un compte de ministère, sur fond `--nuit-pale` avec un texte `--encre` (le jaune pâle de la maquette n'est pas un token).
- **Bouton Google** (16) : il garde les couleurs officielles de Google. C'est la seule exception à la règle « aucune couleur hors des tokens ».
- **Texte de 18** : « Ouvrez votre application d'authentification et saisissez le code à 6 chiffres de « Pilotage EJP ». » L'aide pour un téléphone perdu dit « refaire l'activation », le même verbe que le bouton de 13.
- Sur ordinateur, ces trois écrans gardent la même colonne de 390 à 440 px, centrée.

## Ce qui n'est pas dessiné, et comment le faire

Chaque écran doit fonctionner de 360 px à 1440 px. Pour les formats non dessinés, applique les règles de `BRIEF_DESIGN.md`, sections 6 et 7 :
- un tableau devient une liste sous 600 px (voir 03 : le tableau des chiffres de 01 devenu liste) ;
- une colonne de droite passe sous le contenu principal sur tablette et téléphone (voir 02 et 03) ;
- les onglets passent dans le menu en dessous de 1024 px, sur téléphone comme sur tablette : ne reproduis pas l'en-tête de 02 ;
- les panneaux de saisie (08 à 11 et les saisies dérivées) s'ouvrent en page entière sous 600 px, et en panneau latéral de 460 px à partir de 600 px (voir la colonne « Déclarer une session » de 14).

Écrans non dessinés, et d'où les dériver (contenu exact dans `BRIEF.md`, sections 8 et 9) :

| Écran | Dérivé de | Remarque |
|---|---|---|
| Marquer traité (fenêtre) | 10 | Pour le berger, le conseil et le ministère ; commentaire obligatoire pour un ministère |
| Changer le statut d'un point | choix de priorité de 10 | Trois boutons segmentés : À traiter, En cours, En attente de décision |
| Mettre à jour l'événement | 11 | Nom en lecture seule, date et statut préremplis |
| Prochaine réunion | 11 | Date, heure, objet, décision attendue |
| FIJ par département | 08 | 8 champs, total en direct, ministère FIJ seulement |
| Choisir la session | liste de 48 px par ligne | Quand plusieurs sessions attendent la saisie |
| Ministères (berger, conseil) | bloc « Les ministères » de 01 | Description sous le nom, chaque nom ouvre la fiche |
| Journal technique (EJP Tech) | 06 | Actions techniques seulement, sans filtre Compte |
| Ajouter un ministère, ajouter un compte, confirmations (13) | colonne « Déclarer une session » de 14 | États des comptes : Invitation envoyée, À activer, Activée, Désactivé |
| Accès par lien, Choisissez votre mot de passe, Mot de passe oublié, Nouveau mot de passe | 16 à 18 | Même colonne de 390 à 440 px |
| Page non disponible, page introuvable | 16 à 18 | Titre, une phrase, bouton « Revenir à l'accueil » |
| Confidentialité | texte simple | Page statique |

Vues d'un profil déduites d'un autre :
- **Conseil** : identique au berger (01 à 06), seul le nom du compte change.
- **Ministère, Cette semaine** : l'ouverture de 07 (phrase de ce qu'il reste à faire, bouton principal, « Vos saisies », « Vos points »), puis les blocs de l'église de 01, **sans « À décider »** et sans les colonnes « Prochaine réunion » et « Point ouvert » du tableau des ministères. Même contenu à toutes les tailles ; à partir de 1024 px, « Vos points » prend la colonne de droite (`BRIEF.md`, section 9).
- **Administration de l'église, Cette semaine** : l'ouverture de 01 (numéro de semaine, phrase sans les points ni surligneur), puis les blocs de l'église, sans « À décider », sans les colonnes « Prochaine réunion » et « Point ouvert », sans action.
- **Mes points, Mon journal** du ministère : mêmes écrans que 05 et 06 ; Mes points montre les points créés par le ministère ou qui le mentionnent, Mon journal les lignes de son ministère et de son compte, sans filtre « Compte ».

## Écarts connus avec le brief

Le brief fait foi. Ces écarts ne sont pas des défauts de l'application :
- **00** : la planche dit du ministère « Marquer traité ses propres points ». Lis : « Marquer traités ses points et ceux qui le mentionnent, avec un commentaire ».
- **07 et 12** : la phrase « Seuls Intégration, le berger et le conseil peuvent le marquer traité. » est remplacée par « Mentionné par Intégration. », suivie des boutons « Changer le statut » et « Marquer traité » (décision du 30 septembre 2026).
- **07** : la ligne « Le dimanche midi, ce bouton devient « Saisir les chiffres du dimanche » » est une note de conception : ne l'affiche pas.
- **09** : ajoute le second compteur « Dont déjà comptés par leur ministère principal » (0 par défaut) et la ligne « Comptés dans le total de l'église : 11. ». Le compteur des présents est un vrai champ numérique entre moins et plus, comme dans 08.
- **10** : la note sous les mentions devient « Le ministère mentionné verra ce point, et seulement ce point. Il pourra le marquer traité en expliquant ce qui a été fait. Le berger et le conseil voient tous les points. »
- **01 et 03** : le total de la session est sans double compte, avec la ligne sur les STARs comptés une seule fois ; les écarts dessinés (-3, -14, +2) sont bruts, l'application affiche l'écart à périmètre égal. « Un budget attend votre décision » est un exemple écrit à la main : la phrase compte les points « En attente de décision » et ne cite jamais un texte libre.
- **04 et 12** : la ligne d'un indicateur propre affiche la date de sa dernière saisie à la place de « Indicateur propre au ministère ».
- **12 et 13** : les boutons dessinés à 40 px font 44 px dans l'application.
- **13** : « Conseil, compte 3 », qui a le bouton « Relancer l'invitation », est à l'état « Invitation envoyée ». Ajoute la section « EJP Tech » et l'état « Désactivé » avec « Réactiver ».
- **14** : troisième type « Autre rassemblement », avec le champ « Nom du rassemblement » ; « Modifier » et « Supprimer » sur les sessions.
- **15** : le premier texte montre un masquage partiel (« Relancer [texte masqué] pour les colis... »). Dans l'application, tout le champ est remplacé par « [texte masqué par EJP Tech] », et le motif se choisit dans une liste.
- **Carte des FIJ** (01, 03) : les teintes en `rgba` écrites en dur deviennent cinq tokens pleins, et le blanc sur la deuxième teinte (3,86:1) devient `--encre`. Pas de largeur fixe de 346 px : la carte suit la largeur de son bloc.
- **`prototype.html`** : `canClosePoint` (seuls le créateur, le berger et le conseil ferment un point, en un clic) et la note « Un STAR rattaché à deux ministères peut être compté deux fois. Règle à valider. » sont dépassés par le brief.
- **En-tête (01, 04)** : de 1024 à 1279 px, le sous-titre « Église des Jeunes Prodiges » disparaît et le libellé du compte passe au-dessus de « Se déconnecter », pour que les onglets de l'administration tiennent sur une ligne. Un lien « Confidentialité » s'ajoute en pied de page et à la fin du menu (`BRIEF.md`, section 7).
- **16** : le bouton Google garde la taille dessinée (pleine largeur, 56 px, texte de 16 px) avec le thème clair officiel de Google : fond `#FFFFFF`, bordure `#747775`, texte `#1F1F1F` en Roboto Medium.
- **Données** : elles changent d'une maquette à l'autre (01 et 05 n'ont pas les mêmes points ouverts, 05 et 06 pas les mêmes dates de traitement). Le jeu d'exemple de l'étape 1 (`BRIEF.md`, section 13) fait foi : compare la mise en page, pas les nombres.

## États (non dessinés)

| État | Où | Texte et comportement |
|---|---|---|
| Chargement | toute page | Titres de section et filets tout de suite ; après 300 ms, « Chargement » en `--encre-3` à la place du contenu, avec `aria-busy`. Pas d'animation. Au-delà de 10 s : erreur de page. |
| Erreur de page | écrans de lecture | Bandeau en haut du contenu, fond `--alerte-fond`, `role="alert"` : « La connexion a échoué. Réessayez. », bouton « Réessayer ». |
| Erreur de formulaire | saisies | Sous le bouton d'enregistrement : « La connexion a échoué. Vos chiffres sont encore dans le formulaire : réessayez. » Les valeurs restent, le bouton redevient actif. |
| Hors ligne | toute page | « Pas de connexion internet. Les chiffres affichés peuvent dater. » |
| Réussite | après une saisie | Retour à la page d'origine et message pendant 6 s (`role="status"`) : « Chiffres du dimanche 27 sept. enregistrés. », « Présence enregistrée pour Bâtir l'Église du 26 sept. », « Point créé. », « Statut enregistré : En cours. », « Point marqué traité. », « Événement ajouté au calendrier. », « Réunion enregistrée. » |
| Session expirée | toute page | « Votre session a expiré. Reconnectez-vous. », puis la connexion, et retour à la même adresse. |
| Compte désactivé | connexion, renouvellement de session | « Ce compte est désactivé. Adressez-vous à l'administration de l'église. », puis déconnexion. |
| Vide | 05 | Ouverts : « Aucun point ouvert. » ; Traités : « Aucun point traité pour l'instant. » |
| Vide | 06, journal technique | « Aucune ligne pour ces filtres. », bouton « Retirer les filtres ». |
| Vide | 07, 12 (points) | « Aucun point ouvert pour votre ministère. » |
| Vide | 04, 12 (calendrier) | « Aucun événement prévu. » (et « Ajouter un événement » pour le ministère) |
| Vide | 14, 15 | « Aucune session déclarée. Déclarez la première avec le panneau. » ; « Aucun texte à relire. » |
| Premier dimanche | 01 à 03 | « Pas encore de saisie » à la place de la valeur, complétude « 0 sur 8 », pas d'écart ni de courbe. Session : « Aucune session déclarée. » Carte : « La carte s'affichera quand FIJ aura saisi ses chiffres. » |
| Validation | formulaires | Un champ facultatif porte « (facultatif) » dans son libellé. Messages sous le champ, reliés par `aria-describedby` (« Donnez un titre au point. », « Choisissez une date à venir. »). Un compteur « 12 sur 80 » s'affiche à partir de 60 caractères. |

Les données visibles sont fictives. Les emails en `@ejp.exemple` sont des exemples.
