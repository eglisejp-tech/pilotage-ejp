# Maquettes validées : direction C

Ces maquettes fixent l'apparence de l'application. Pour le visuel, **elles priment sur `prototype.html`**. Le prototype reste la référence pour le comportement (ce qui se passe quand on clique, les données d'exemple).

Chaque écran existe en deux formes :
- `NN-nom.png` : la capture, à regarder ;
- `html/NN-nom.html` : la même maquette en HTML statique, pour lire les valeurs exactes (tailles, espacements, couleurs). Ce n'est **pas** du code à copier : reconstruis avec les composants React, Tailwind et les tokens de `docs/reference/tokens.css`.

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
- **QR code** (17) : celui de la maquette est factice. Le vrai vient de `supabase.auth.mfa.enroll()`. Il n'est affiché qu'une fois.
- Sur ordinateur, ces trois écrans gardent la même colonne de 390 à 440 px, centrée.

## Ce qui n'est pas dessiné, et comment le faire

Chaque écran doit fonctionner de 360 px à 1440 px. Pour les formats non dessinés, applique les règles de `BRIEF_DESIGN.md`, section 6 :
- un tableau devient une liste sur téléphone (voir 03 : le tableau des chiffres de 01 devenu liste) ;
- une colonne de droite passe sous le contenu principal sur tablette et téléphone (voir 02 et 03) ;
- les onglets passent dans le menu sur téléphone ;
- les panneaux de saisie (08 à 11) s'ouvrent en panneau latéral de 460 px sur ordinateur (voir la colonne « Déclarer une session » de 14).

Vues d'un profil déduites d'un autre :
- **Conseil** : identique au berger (01 à 06), seul le nom du compte change.
- **Ministère, Cette semaine** : identique à 01, **sans la colonne « À décider »**, et la phrase ne surligne rien.
- **Administration de l'église, Cette semaine** : identique à la vue du ministère.
- **Mes points, Mon journal** du ministère : mêmes écrans que 05 et 06, filtrés sur son ministère, sans filtre « Compte ».

États à prévoir (non dessinés) : chargement, liste vide (« Aucun point ouvert. »), erreur réseau (« La connexion a échoué. Vos saisies ne sont pas perdues, réessayez. »), compte désactivé.

Les données visibles sont fictives. Les emails en `@ejp.exemple` sont des exemples.
