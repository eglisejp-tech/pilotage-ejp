# Suivi des signalements : conception (26 octobre 2026)

Statut : **validée le 26 octobre 2026 par la personne responsable, SANS le courriel** (lot 3 non
fait : aucune Edge Function, aucun secret, aucun texte d'écran sur un courriel), avec les réponses
« Proposé ». Décision T77 ; elle révise T39 et la section 11 du BRIEF.
Sources : `existant.md`, `pratiques.md`, `courriels.md` (même dossier). Dépôt lu sans modification,
production non lue. Décision à créer : **T76, « Suivi des signalements »**, qui révise T39.
Version 2, après la revue produit et la revue sécurité (section 8).

## 0. En bref

- **Tout de suite, hors chantier** : EJP Tech contacte Coordination aujourd'hui (quel événement,
  quelle date, quel message à l'écran), corrige, puis clôt son signalement dans l'écran actuel avec
  une réponse, comme aujourd'hui. Le chantier ne fait plus attendre Coordination. La recette se fait
  avec un signalement de test du ministère Tech.
- **4 statuts** : Reçu (automatique), En cours, Répondu, Clos. Un Clos ne se rouvre pas. Aucun
  « traité » : ce mot reste aux points, où la règle est inverse.
- **EJP Tech** : « Prendre en charge » (un clic), « Répondre au ministère » (réponse obligatoire,
  une question comme une solution), et « Clore le signalement » en geste discret (réponse
  obligatoire, ni courriel ni confirmation : transmis à l'administration, doublon, test, ministère
  sans compte actif).
- **Le ministère**, quand EJP Tech a répondu : « Oui, c'est réglé » ou « Répondre à EJP Tech »
  (texte obligatoire). Une question et un « pas réglé » suivent la même boucle.
- **Clôture automatique** : le ministère peut répondre pendant 7 jours pleins (jour de la réponse
  - 7 inclus), clos le lendemain. **Calculée** par la base à l'heure de Paris, sans tâche
    planifiée ni écriture.
- **Modèle** : `signalement_suivi` reçoit les colonnes `etape` et `ordre` et perd son unicité.
  Chaque étape est une ligne ajoutée, jamais un `UPDATE`. Pas de nouvelle table.
- **Ministère** : une page `/signalements` « Mes signalements » (sans onglet) ; sur « Ma semaine »,
  un bandeau seulement quand une réponse l'attend, sinon une ligne discrète sous « Vos points ».
- **Courriel** : un seul par réponse d'EJP Tech, « EJP Tech a répondu à votre signalement du 26
  octobre », vers l'adresse du compte actif et activé du ministère. Date, écran, lien. Aucun texte
  libre. Envoyé par une **Gmail neuve réservée à l'envoi** (port 465), réponses renvoyées vers EJP
  Tech. Un seul appel, une seule tentative par réponse, 20 par jour au plus. Résultat dans le
  message de réussite ; si l'envoi échoue, EJP Tech prévient le ministère autrement.
- **Compatibilité** : l'ancien site continue de marcher sur la nouvelle base (colonnes de
  `v_signalement` gardées, `clore_signalement` gardée). La base ne revient pas en arrière.
- **Essai d'envoi jetable, puis 3 lots** : base, écrans (mis en ligne ensemble), puis courriel.
  Environ 3,5 à 4 jours.

## 1. Besoin

Le ministère qui signale une difficulté suit son signalement étape par étape jusqu'à sa résolution,
répond aux questions d'EJP Tech, confirme lui-même que c'est réglé, et reçoit un courriel quand EJP
Tech lui a répondu.

## 2. Cycle de vie

### 2.1 Statuts

| Statut   | Ce qu'il veut dire                                                 | Comment on y arrive                                                   |
| -------- | ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Reçu     | EJP Tech a le signalement, personne ne l'a encore pris             | automatique à l'envoi (`signaler_difficulte`, inchangée)              |
| En cours | EJP Tech s'en occupe                                               | « Prendre en charge », ou « Répondre à EJP Tech » du ministère        |
| Répondu  | EJP Tech a répondu (question ou solution) ; le ministère a la main | « Répondre au ministère »                                             |
| Clos     | fini : confirmé, sans retour pendant 7 jours, ou clos par EJP Tech | « Oui, c'est réglé », calcul des 7 jours, ou « Clore le signalement » |

Pas d'autre statut (ni « en attente », ni « annulé », ni priorité, ni assignation : `pratiques.md`,
section 2). Le statut ne se stocke pas : il se **lit** dans la dernière ligne de suivi (section 5.2).

Vocabulaire fixé avant le lot 1 (il entre dans une migration figée) : statuts `recu`, `en_cours`,
`repondu`, `clos` ; étapes `en_cours`, `reponse`, `regle`, `reponse_ministere`, `clos`. Les mots
« traité », « traiter » et « marquer traité » ne servent pas ici.

### 2.2 Gestes

Tous passent par une fonction de la base, sous verrou `for update` sur le signalement, qui relit
le statut courant avant d'ajouter la ligne. Rappel « N'écrivez aucun nom ni information
personnelle. » sous chaque champ libre (un seul champ par panneau).

| Geste                  | Qui                         | De               | Vers     | Texte                                                   | Courriel | Journal                         |
| ---------------------- | --------------------------- | ---------------- | -------- | ------------------------------------------------------- | -------- | ------------------------------- |
| Envoyer le signalement | ministère (existe)          | rien             | Reçu     | obligatoire, 10 à 280 (existe)                          | non      | `difficulte_signalee` (existe)  |
| Prendre en charge      | EJP Tech                    | Reçu             | En cours | aucun                                                   | non      | `signalement_pris_en_charge`    |
| Répondre au ministère  | EJP Tech                    | Reçu ou En cours | Répondu  | **obligatoire**, 10 à 280                               | **oui**  | `signalement_repondu`           |
| Oui, c'est réglé       | le ministère du signalement | Répondu          | Clos     | aucun                                                   | non      | `signalement_regle`             |
| Répondre à EJP Tech    | le ministère du signalement | Répondu          | En cours | **obligatoire**, 10 à 280                               | non      | `signalement_reponse_ministere` |
| 7 jours sans retour    | personne (calcul)           | Répondu          | Clos     | aucun                                                   | non      | aucune ligne (calcul)           |
| Clore le signalement   | EJP Tech                    | Reçu ou En cours | Clos     | obligatoire à l'écran, facultatif en base (ancien site) | non      | `signalement_clos` (existe)     |
| Masquer (existe)       | EJP Tech                    | tout statut      | inchangé | sans objet                                              | non      | `texte_masque` (existe)         |

Chaque texte passe par `private.texte_libre_refuse` (données personnelles, crochets, T43), après
`btrim`, comme aujourd'hui.

### 2.3 Règles

- **Réponse d'EJP Tech** : obligatoire. C'est une étape neutre, « Réponse d'EJP Tech » : une
  question (« Quel événement, à quelle date ? ») ou ce qui a été fait. Une réponse par passage à
  Répondu ; pas de fil de discussion libre.
- **Retour du ministère** : seulement à l'étape Répondu, par le compte actif de ce ministère (il n'y
  en a qu'un, index `compte_un_par_ministere`). « Oui, c'est réglé » clôt ; « Répondre à EJP Tech »
  (texte obligatoire) remet le signalement En cours, autant de fois que nécessaire. EJP Tech ne
  répond jamais à la place du ministère.
- **Un Clos ne se rouvre pas** : le ministère fait un nouveau signalement (BRIEF:1316 reste vrai).
- **Clôture automatique** : le ministère peut répondre jusqu'au jour de Paris de la réponse d'EJP
  Tech + 7, inclus ; le signalement est clos le lendemain à 0 h, heure de Paris. Exemples : réponse
  le mardi 27 octobre, retour possible jusqu'au mardi 3 novembre inclus, clos le 4 ; réponse le
  dimanche 1er novembre au soir, retour encore possible le dimanche 8 novembre, clos le 9. Un
  ministère qui ne vient que le dimanche a donc toujours un dimanche pour répondre. La date limite
  s'annonce à l'écran et dans le courriel.
- **Dates** : toujours le jour de Paris d'un horodatage de la base (`at time zone 'Europe/Paris'`,
  `private.aujourdhui()`). L'écran ne calcule jamais une date ni une durée avec l'horloge du
  navigateur : la date limite et l'âge viennent de la vue.
- **« Clore le signalement »** reste, en geste discret, pour ce qui n'appelle pas de retour du
  ministère : transmis à l'administration (T39, `docs/exploitation.md:1419`), doublon, test,
  ministère sans compte actif. Réponse obligatoire à l'écran, ni courriel ni confirmation. Il n'est
  pas proposé à l'étape Répondu (le ministère a la main, le calcul clôt en 7 jours). Un ministère
  supprimé n'existe pas ici : un signalement bloque la suppression (T75).
- **Ministère sans compte actif** : « Clore le signalement » est le seul geste proposé ; la base
  refuse « Répondre au ministère » (personne ne lirait la réponse).
- **EJP Tech** apparaît toujours sous le nom « EJP Tech », jamais le prénom d'une personne.

### 2.4 Schéma

```
Reçu      → En cours   par « Prendre en charge » (EJP Tech)
Reçu      → Répondu    par « Répondre au ministère » (EJP Tech, texte obligatoire, courriel)
En cours  → Répondu    par « Répondre au ministère » (EJP Tech, texte obligatoire, courriel)
Répondu   → En cours   par « Répondre à EJP Tech » (ministère, texte obligatoire)
Répondu   → Clos       par « Oui, c'est réglé » (ministère) ou 7 jours pleins sans retour (calcul)
Reçu      → Clos       par « Clore le signalement » (EJP Tech, réponse obligatoire, sans courriel)
En cours  → Clos       par « Clore le signalement » (idem)
Clos      → rien       (un Clos ne se rouvre pas)
```

## 3. Écrans

Aucune maquette n'existe pour ces écrans (BRIEF:1212). Les écarts s'écrivent dans `LISEZMOI.md`.
Textes « Proposé », à reporter dans `docs/conception/aides-contextuelles.md`, section 7, et dans
`src/features/signalement/textes.ts`.

### 3.1 Le ministère qui a signalé

**a. Page « Mes signalements »** (nouvelle adresse `/signalements`, ajoutée au profil ministère dans
`src/features/navigation/profils.ts`, sans onglet, titre « Mes signalements, Pilotage EJP »,
bandeau d'avancement masqué comme sur `/signaler`). Elle s'ouvre par le bandeau ou la ligne de « Ma
semaine », le lien du courriel et le lien de `/signaler`. Le lien du courriel vise
`/signalements#<id>` : après la connexion, `retourValide` garde le chemin et l'ancre
(`src/features/session/decisions.ts:61`), la page fait défiler jusqu'au signalement et met le focus
sur son en-tête. Une ancre inconnue (signalement clos depuis plus de 30 jours) ouvre la page
normalement. Un autre profil qui ouvre `/signalements` suit la règle commune des adresses réservées
(retour à l'accueil du profil, `src/app/routes.test.tsx:610`).

| État               | Ce qu'il voit                                                                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chargement         | la petite flamme et « Chargement de vos signalements » (T65 : après 300 ms, 600 ms au moins)                                                              |
| Erreur de lecture  | `EtatVide` « problème passager », texte commun d'erreur et « Réessayer »                                                                                  |
| Vide               | « Aucun signalement. En cas de difficulté sur un formulaire de saisie, utilisez le lien « Signaler une difficulté » en bas du formulaire. »               |
| Seulement des clos | « Aucun signalement ouvert. » puis le groupe « Clos ces 30 derniers jours »                                                                               |
| Liste              | trois groupes, dans cet ordre : « À vérifier » (Répondu), « En cours » (Reçu et En cours), « Clos ces 30 derniers jours » ; un groupe vide n'apparaît pas |

Chaque signalement est un `<article id="<id>">` : en-tête (`<h3 tabindex="-1">`) « Ajouter un
événement, 26 oct. » et l'étiquette du statut (texte, pas seulement une couleur) ; le texte entre
guillemets ; une ligne d'état ; le suivi daté.

| Statut                        | Ligne d'état                                                                                            | Actions                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Reçu                          | « EJP Tech a reçu votre signalement le 26 oct. »                                                        | aucune                                        |
| En cours                      | « EJP Tech s'en occupe depuis le 27 oct. »                                                              | aucune                                        |
| En cours, après votre réponse | « Vous avez répondu le 28 oct. EJP Tech reprend votre signalement. »                                    | aucune                                        |
| Répondu                       | « EJP Tech vous a répondu le 27 oct. », la réponse, puis « Est-ce réglé ? »                             | « Oui, c'est réglé », « Répondre à EJP Tech » |
| Répondu (sous les boutons)    | « Vous pouvez répondre jusqu'au 3 nov. »                                                                |                                               |
| Clos, confirmé                | « Vous avez confirmé que c'est réglé le 30 oct. »                                                       | aucune                                        |
| Clos, sans retour             | « Clos le 4 nov., sans retour de votre part. Si la difficulté revient, faites un nouveau signalement. » | aucune (la raison est dite)                   |
| Clos par EJP Tech             | « Clos par EJP Tech le 8 oct. » puis « Réponse : ... »                                                  | aucune                                        |

Suivi daté : une `<ol>`, une ligne par étape, du plus ancien au plus récent, chaque date dans un
`<time datetime="...">` : « 26 oct. Signalement envoyé » ; « 27 oct. Pris en charge par EJP Tech » ;
« 27 oct. Réponse d'EJP Tech : « ... » » ; « 28 oct. Votre réponse : « ... » » ; « 30 oct. Vous avez
confirmé que c'est réglé » ; « 4 nov. Clos, sans retour de votre part ».

- « Est-ce réglé ? » est un `role="group"` nommé par cette question (`aria-labelledby`), qui
  contient les deux boutons.
- « Oui, c'est réglé » : un clic, bouton « Envoi en cours » (désactivé) pendant l'appel. Réussite :
  « Merci. Le signalement est clos. » annoncé par la zone `role="status"` de la page, le
  signalement passe dans « Clos », le focus va sur son en-tête. Échec réseau : « L'envoi n'a pas
  abouti. Réessayez. » sous les boutons, le focus reste sur le bouton.
- « Répondre à EJP Tech » est un bouton `aria-expanded` qui ouvre un petit panneau sous la réponse
  (`aria-controls`) ; le focus entre dans le champ. Champ « Votre réponse à EJP Tech », aide
  « Répondez à sa question, ou dites ce qui ne va toujours pas. », rappel sur les données
  personnelles dessous, compteur 280, boutons « Envoyer la réponse » (« Envoi en cours ») et
  « Annuler » (« Fermer sans enregistrer ? » si un texte est écrit). À l'annulation, le focus
  revient sur « Répondre à EJP Tech ». Réussite : « Réponse envoyée. EJP Tech reprend votre
  signalement. » annoncé, le signalement passe dans « En cours », focus sur son en-tête.
- Contrôles avant l'envoi : « Écrivez au moins 10 caractères. », « Raccourcissez la réponse : 280
  caractères au plus. », et les refus existants (crochets, données personnelles).
- Refus de la base (page ouverte depuis longtemps, date limite passée) : « Ce signalement est déjà
  clos. » sous les boutons, puis la liste se relit.
- À 390 px, les deux boutons s'empilent sur toute la largeur.

**b. « Ma semaine »**. Le suivi se lit en même temps que les autres blocs et s'affiche avec eux :
aucun saut de mise en page. Si cette lecture échoue, ni bandeau ni ligne, et « Ma semaine »
s'affiche normalement.

- **Bandeau**, seulement quand au moins un signalement est Répondu, placé **sous l'ouverture**
  (`OuvertureMinistere`) et non en tête : « EJP Tech a répondu à votre signalement du 26 oct.
  Dites-nous si c'est réglé. » (plusieurs : « EJP Tech a répondu à 2 de vos signalements.
  Dites-nous si c'est réglé. »), lien « Voir la réponse » (vers `/signalements#<id>` du plus ancien).
- **Ligne discrète** sous « Vos points », quand au moins un signalement est Reçu ou En cours et
  aucun Répondu : « 1 signalement suivi par EJP Tech. » (« 2 signalements ... »), lien « Voir le
  suivi ».
- Aucun ouvert : rien.
- Écart à la maquette 07 noté dans `LISEZMOI.md` (bandeau entre l'ouverture et les blocs, ligne
  sous « Vos points »).

**c. `/signaler`** : la réussite devient « Signalement envoyé. Suivez la réponse d'EJP Tech dans
« Mes signalements ». » avec le lien. Sous le formulaire, « Vos derniers signalements » laisse la
place à un seul lien « Voir mes signalements » (un seul endroit montre le suivi et les boutons).

**d. « Mon journal »** : de nouvelles lignes, avec « Écran : Ajouter un événement » comme
aujourd'hui : « A pris en charge un signalement » et « A répondu à un signalement » (signées EJP
Tech), « A confirmé qu'un signalement est réglé », « A répondu à EJP Tech sur un signalement ». La
ligne du courriel (`courriel_signalement_tente`) n'y paraît pas (`src/data/journal.ts`) : elle ne
sert qu'au journal d'EJP Tech. « Dernières saisies » de « Ma fiche » exclut toutes ces lignes
(`src/data/fiche.ts:181`).

### 3.2 EJP Tech (bloc « Signalements » de Modération, son accueil)

| État         | Ce qu'il voit                                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------------------------------- |
| Chargement   | inchangé : « Chargement des signalements »                                                                            |
| Erreur       | inchangé : texte commun et « Réessayer »                                                                              |
| Rien du tout | inchangé : « Aucun signalement. »                                                                                     |
| Liste        | trois groupes : « À traiter » (Reçu, En cours), « En attente du ministère » (Répondu), « Clos ces 30 derniers jours » |

- Titre : « Signalements » avec « 2 signalements à traiter » ou « Aucun signalement à traiter »
  (Reçu et En cours seulement : ce qui attend un geste d'EJP Tech).
- Tri : du plus ancien au plus récent dans « À traiter » et « En attente », les derniers clos
  d'abord dans « Clos » (comme aujourd'hui).
- Chaque ligne : ministère, « Ajouter un événement, 26 oct. », texte cité avec un « Masquer »
  discret dessous, étiquette, ligne d'état, le même suivi daté que le ministère (« Réponse du
  ministère : « ... » », avec un « Masquer » discret sous chaque texte cité).

| Statut                              | Ligne d'état                                                                                                               | Actions (colonne de droite)                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Reçu                                | « Reçu le 26 oct., il y a 9 jours. »                                                                                       | « Prendre en charge », « Répondre au ministère », « Clore le signalement » discret |
| En cours                            | « Pris en charge le 27 oct., il y a 8 jours. »                                                                             | « Répondre au ministère », « Clore le signalement » discret                        |
| En cours après une réponse          | « Le ministère a répondu le 28 oct., il y a 7 jours. »                                                                     | idem                                                                               |
| Reçu ou En cours, sans compte actif | « Ce ministère n'a plus de compte actif. »                                                                                 | « Clore le signalement » seul, en bouton ordinaire                                 |
| Répondu                             | « Réponse envoyée le 27 oct. Le ministère peut répondre jusqu'au 3 nov. »                                                  | aucune                                                                             |
| Clos                                | « Confirmé par le ministère le 30 oct. », « Clos le 4 nov., sans retour du ministère. » ou « Clos par EJP Tech le 8 oct. » | aucune                                                                             |

L'âge vient de la vue (`jours_depuis`) : 0 jour donne « Reçu aujourd'hui. », 1 jour « Reçu
hier. », puis « Reçu le 26 oct., il y a 9 jours. » (de même pour les deux lignes En cours). Les
« Masquer » restent sous chaque texte tant qu'il est lisible, à tout statut.

- « Prendre en charge » : un clic, « Enregistrement en cours » (désactivé) pendant l'appel, puis
  « Signalement pris en charge. » annoncé par la zone `role="status"` du bloc, focus sur l'en-tête
  de la ligne (`tabindex="-1"`). Échec réseau : « L'envoi n'a pas abouti. Réessayez. ».
- « Répondre au ministère » (`aria-expanded`) ouvre le panneau (sur le modèle de
  `FormulaireCloture.tsx`), focus dans le champ : « Votre réponse à Coordination », aide « Posez
  une question, ou dites ce que vous avez fait. », rappel sur les données personnelles dessous,
  compteur 280, note « Coordination lit votre réponse dans Pilotage EJP et reçoit un courriel. »
  (avant le lot 3 : « Coordination lit votre réponse dans Pilotage EJP. »), boutons « Envoyer la
  réponse » (« Envoi en cours », jusqu'à la fin du courriel au lot 3) et « Annuler » (« Fermer sans
  enregistrer ? » si un texte est écrit, retour du focus au bouton). Contrôles : « Écrivez au moins
  10 caractères. », « Raccourcissez la réponse : 280 caractères au plus. ».
- Réussite : « Réponse envoyée. Courriel envoyé à Coordination. » ; échec du courriel : « Réponse
  envoyée, mais le courriel n'est pas parti : » suivi de la raison (section 4.4), puis « Prévenez
  Coordination autrement : elle verra la réponse à sa prochaine visite. ». Avant le lot 3 :
  « Réponse envoyée. ». Annonce `role="status"`, focus sur l'en-tête de la ligne, qui passe dans
  « En attente du ministère ».
- « Clore le signalement » (discret, jamais seul sur sa ligne sauf sans compte actif, comme
  « Supprimer » de T75) ouvre un panneau : « Réponse au ministère » obligatoire (10 à 280), note
  « Aucun courriel ne part. Le ministère lit cette réponse dans « Mes signalements ». », boutons
  « Clore le signalement » (« Enregistrement en cours ») et « Annuler ».
- « Masquer » sous un texte ouvre la fenêtre « Masquer ce texte ? » existante, cible
  `signalement` (le texte du signalement) ou `signalement_suivi` et l'`id` de sa ligne (une
  réponse).
- Refus de la base (deux personnes d'EJP Tech en même temps) : le message traduit sous le bouton,
  puis la liste se relit.
- Mise en page : au plus deux boutons empilés dans la colonne de droite, « Clore le signalement »
  discret dessous ; les « Masquer » sont sous les textes. `LISEZMOI.md` ligne 179 (colonne de
  « Clore le signalement » et « Masquer le texte ») est réécrite en conséquence.

### 3.3 Messages de la base

Nouveaux messages, traduits dans `src/data/messagesBase.ts` :

| Message de la base                                  | Texte affiché                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| « Ce signalement est déjà pris en charge. »         | « Ce signalement a déjà été pris en charge. La liste est à jour. »             |
| « Ce signalement attend le retour du ministère. »   | « EJP Tech a déjà répondu à ce signalement. La liste est à jour. »             |
| « Ce signalement n'attend pas votre réponse. »      | « Ce signalement a changé entre-temps. La liste est à jour. »                  |
| « Ce ministère n'a plus de compte actif. »          | « Ce ministère n'a plus de compte actif : utilisez « Clore le signalement ». » |
| « Ce signalement est déjà clos. » (existe)          | « Ce signalement est déjà clos. »                                              |
| « Écrivez votre réponse (10 caractères au moins). » | « Écrivez au moins 10 caractères. »                                            |
| « La réponse dépasse 280 caractères. »              | « Raccourcissez la réponse : 280 caractères au plus. »                         |

## 4. Courriel

### 4.1 Quand et à qui

- **Quand** : à chaque réponse d'EJP Tech (passage à Répondu), donc de nouveau après un retour du
  ministère puis une nouvelle réponse. Jamais à l'envoi, à « Prendre en charge », à la
  confirmation, à « Clore le signalement », ni à la clôture automatique. Aucun courriel vers EJP
  Tech (Modération est son accueil).
- **À qui** : l'adresse du compte **actif** du ministère, lue dans Auth au moment de l'envoi
  (`auth.admin.getUserById`, comme `relancer-invitation`), et seulement si ce compte est **activé**
  (`email_confirmed_at` rempli) : un compte de remplacement pas encore activé peut porter une
  adresse fausse (T74). Sinon pas d'envoi, code `compte_non_active`. Aucun compte actif :
  `compte_desactive` (l'écran ne propose alors pas la réponse). Un compte sans adresse ne peut pas
  exister (chaque compte naît d'une invitation).

### 4.2 Contenu (texte simple, sans image ni pixel de suivi)

```
De : Pilotage EJP <adresse Gmail réservée à l'envoi>
Répondre à : <adresse Gmail d'EJP Tech>
Objet : EJP Tech a répondu à votre signalement du 26 octobre

Bonjour,

EJP Tech a répondu au signalement que Coordination a fait le 26 octobre
depuis l'écran « Ajouter un événement ».

Lisez la réponse dans Pilotage EJP, puis dites-nous si c'est réglé
ou répondez à EJP Tech :
https://<URL_APPLICATION>/signalements#<id du signalement>

Vous pouvez répondre jusqu'au 3 novembre. Sans retour de votre part,
le signalement sera ensuite clos. Vous pourrez toujours en faire un nouveau.

Ne répondez pas à ce message : répondez dans Pilotage EJP.

EJP Tech

Vous recevez ce message parce que votre ministère a fait un signalement
dans Pilotage EJP.
```

- Seulement : le nom du ministère (pas une personne), la date du signalement et la date limite
  (jours de Paris, rendus par SQL en `date`, section 5.5), le libellé fixe de l'écran
  (`LIBELLES_ECRAN`), un lien construit avec `URL_APPLICATION` et l'`id` du signalement, sans
  jeton. **Ni le texte du signalement, ni la réponse d'EJP Tech, ni un nom de personne.**
- La date du signalement dans l'objet distingue deux signalements du même ministère.
- **Aucun bouton qui agit** dans le courriel : il contournerait la double authentification. On
  répond dans l'outil, ce qui laisse une trace et passe par la modération.
- Une réponse par courriel sortirait de l'outil (ni modération, ni registre) : d'où la phrase « Ne
  répondez pas à ce message ». Si quelqu'un répond quand même, `Reply-To` l'envoie dans la Gmail
  d'EJP Tech, lue chaque semaine, et non dans la boîte d'envoi.
- Transactionnel : pas de lien de désabonnement ni de réglage (CNIL, règles de Google), seulement la
  phrase d'information du pied de message.

### 4.3 Fournisseur et déclenchement retenus

- **Fournisseur** : une **Gmail neuve, réservée à l'envoi** (« Pilotage EJP »), avec double
  authentification, rattachée à rien d'autre (aucun service ne s'y récupère), et un mot de passe
  d'application « Pilotage EJP, notifications ». Pourquoi pas la Gmail d'EJP Tech : son mot de
  passe d'application ouvre toute la boîte (lecture comprise), qui reçoit les liens de récupération
  de Supabase, Cloudflare et GitHub ; en secret d'Edge Function, tout code déployé pourrait le lire,
  y compris celui que Claude déploie par `scripts/production.sh`. La boîte réservée a aussi son
  propre quota : les invitations et « Mot de passe oublié » d'Auth (Gmail d'EJP Tech, port 587,
  inchangé) ne sont jamais bloqués par les courriels de suivi. `smtp.gmail.com` sur le **port 465**
  (les Edge Functions ferment le 25 et le 587). 0 €, quelques courriels par mois. Bibliothèque :
  `denomailer` ou `npm:nodemailer`, celle qui passe l'essai (section 4.5), version épinglée,
  journaux de la bibliothèque coupés (`logger: false`, `debug: false`), derrière une petite
  interface « transport » qui rend un **code seul** (Resend ou Workspace plus tard sans toucher au
  reste).
- **Déclenchement** : une Edge Function `notifier-signalement`, sur l'enveloppe existante `servir()`
  (EJP Tech actif, aal2, session vivante, comme les fonctions de comptes). Le navigateur d'EJP Tech
  l'appelle **une fois**, juste après la réussite de `repondre_au_ministere`, avec l'`id` de la
  ligne de réponse. Il n'existe aucun bouton pour renvoyer. Déroulé :
  1. Secrets présents (`COURRIEL_EXPEDITEUR`, `COURRIEL_MOT_DE_PASSE`, `COURRIEL_REPONSE_A`), sinon
     `configuration_absente`, avant tout appel à la base (aucune tentative consommée).
  2. `serveur_preparer_courriel_signalement(p_appelant, p_session, p_suivi_id)`, une seule
     transaction : contrôles, plafond, puis ligne de journal `courriel_signalement_tente` écrite
     **avant** l'envoi (section 5.5). Rend le compte, l'écran, le nom du ministère et les deux dates.
  3. Adresse lue dans Auth.
  4. Message construit par une fonction pure (testée), envoi avec un délai de 15 s au plus.
  5. Réponse HTTP : `{ envoye: true }`, ou un code d'erreur seul. `consigner` garde le code seul :
     ni `message`, ni `response` du serveur d'envoi (ils peuvent contenir l'adresse, par exemple
     « 550 <adresse> »).
- **Pourquoi une seule tentative** : la ligne écrite sous verrou avant l'envoi rend impossibles le
  double clic, deux onglets ou des appels en parallèle (le second appel trouve la ligne et reçoit
  `courriel_deja_tente`). Un envoi perdu (onglet fermé, échec) n'est pas rattrapé par l'outil : EJP
  Tech prévient le ministère autrement, et le bandeau de « Ma semaine » reste le filet.
- **Pourquoi pas la file d'envoi avec `pg_cron` et `pg_net`** (recommandée par `courriels.md`) : deux
  extensions, deux secrets dans Vault, un jeton de plus, des tables d'essais, une politique de
  réessai et un délai de 5 minutes, impossible à tester sur ce poste, pour des envois qui suivent
  tous un clic d'EJP Tech, quelques fois par mois. La file reste le chemin le jour où des courriels
  partiront sans clic (rappels P31).

### 4.4 Si l'envoi échoue

- **Le statut ne dépend jamais du courriel** : `repondre_au_ministere` est validée avant l'appel de
  la fonction. Le ministère voit Répondu dans l'outil, et le bandeau de « Ma semaine » le lui dit.
- Raisons affichées à EJP Tech, après « Réponse envoyée, mais le courriel n'est pas parti : » :
  - `envoi_authentification` (Gmail 535) : « la boîte d'envoi refuse le mot de passe. Prévenez la
    personne responsable : le mot de passe d'application est à refaire. »
  - `envoi_impossible`, `erreur_interne`, échec réseau : « le serveur d'envoi ne répond pas. »
  - `envoi_destinataire_refuse` : « l'adresse du ministère est refusée. Vérifiez-la dans Ministères
    et comptes. »
  - `compte_non_active` : « le compte de Coordination n'est pas encore activé. »
  - `compte_desactive` : « le compte de Coordination est désactivé. »
  - `limite_atteinte` : « la limite de 20 courriels par jour est atteinte. »
  - `configuration_absente` : « l'envoi des courriels n'est pas réglé. Prévenez la personne
    responsable. »
  - `courriel_deja_tente`, `etat_invalide` : « un courriel est déjà parti pour cette réponse, ou le
    signalement a changé. »
    Chaque message est suivi de « Prévenez Coordination autrement : elle verra la réponse à sa
    prochaine visite. »
- Panne la plus probable : le mot de passe d'application révoqué (changement du mot de passe de la
  boîte d'envoi). Ligne à ajouter au tableau des incidents (`docs/exploitation.md`, section 12).

### 4.5 Essai d'envoi jetable (avant le lot 3)

Le port 465 depuis une Edge Function n'a qu'une preuve communautaire : on l'essaie avant d'écrire
le lot 3.

- Fonction `essai-envoi`, sur une branche à part (`etape-8-signalements-essai`), jamais fusionnée :
  aucune entrée, un message fixe envoyé par la boîte d'envoi à elle-même, réponse « envoyé » ou un
  code seul, refus sans envoi après une heure limite écrite dans son code (le jour de l'essai + 1 h).
  Elle lit les mêmes secrets que la future fonction et essaie les deux bibliothèques si la première
  échoue.
- Claude la déploie (`scripts/production.sh fonction essai-envoi`, avec la confirmation de la
  personne) ; la personne ouvre son adresse dans le navigateur, vérifie la boîte d'envoi, puis
  supprime la fonction dans le tableau de bord (Edge Functions).
- Échec : repli sur Google Apps Script (`MailApp`) appelé en HTTPS, ou pas de courriel. Les lots 1
  et 2 tiennent seuls (statuts, page, bandeau).

### 4.6 Gestes de la personne

1. **Aujourd'hui** : EJP Tech contacte Coordination hors de l'outil, corrige, puis clôt son
   signalement dans l'écran actuel avec une réponse (« Clore le signalement »).
2. Valider les 5 questions de la section 7.5.
3. Accords écrits de mise en ligne, un par mise en ligne : lots 1 et 2 (migration A, `main`), essai
   jetable, lot 3 (migration B, `notifier-signalement`, `main`).
4. Avant l'essai : créer la Gmail réservée à l'envoi (double authentification, rangée au coffre),
   puis son mot de passe d'application « Pilotage EJP, notifications » (rangé au coffre). Supabase,
   Edge Functions, Secrets : `COURRIEL_EXPEDITEUR` (la nouvelle adresse), `COURRIEL_MOT_DE_PASSE`,
   `COURRIEL_REPONSE_A` (l'adresse d'EJP Tech). Contrôle : les trois noms apparaissent. Rien dans
   Vault, aucune extension à activer, pas de jeton.
5. Faire valider par la coordination, avant la mise en ligne du lot concerné, la page
   Confidentialité et le registre mis à jour par Claude (section 7.4).
6. Recette du lot 3 : depuis le ministère Tech, un signalement de test ; en EJP Tech, « Répondre au
   ministère » ; le courriel arrive en moins d'une minute dans la boîte de Tech, **pas dans les
   indésirables**, et le lien ouvre le bon signalement ; puis « Oui, c'est réglé ».

## 5. Modèle de données

### 5.1 Choix : une ligne de `signalement_suivi` par étape

`signalement_suivi` gagne les colonnes `etape` et `ordre` et perd son index unique : chaque étape
devient une ligne ajoutée. Pas de nouvelle table, parce que tout ce qui entoure déjà
`signalement_suivi` sert tel quel : lecture par le ministère auteur et EJP Tech (RLS), `grant
select`, politique `aal2`, déclencheurs `forcer_auteur` et ajout seulement, `auteur_texte`,
`marquer_relu`, `masquer_texte`, `ministere_du_signalement`, contraintes de cible de la modération
et du journal. Une table `signalement_etape` aurait demandé de recréer tout cela. C'est un
changement du modèle de données : question Q1.

### 5.2 Migration A (lot 1), `npx supabase migration new signalements_suivi`

1. `signalement_suivi` :
   - `add column etape text not null default 'clos'`, puis `alter column etape drop default`. Les
     lignes existantes (des clôtures) reçoivent `clos` sans `UPDATE` (valeur par défaut du
     catalogue, aucun déclencheur ne part). Toute nouvelle ligne doit dire son étape.
   - `add column ordre bigint generated always as identity` : l'ordre des lignes. `forcer_auteur`
     impose `statement_timestamp()`, pris avant l'attente du verrou : une ligne écrite après une
     autre peut porter une heure plus ancienne. `ordre` est tiré à l'ajout, sous le verrou, donc
     dans l'ordre réel. L'ajout de la colonne numérote les lignes existantes par réécriture de la
     table, sans `UPDATE`. Séquence : `revoke all` à public, anon, authenticated et service_role
     (comme `intervenant_id_seq`).
   - `check (etape in ('en_cours', 'reponse', 'regle', 'reponse_ministere', 'clos'))`.
   - `check` de cohérence : `reponse` et `reponse_ministere` ont un commentaire ; `en_cours` et
     `regle` n'en ont pas ; `clos` au choix (ancien site). Le check existant (10 à 280, sans espace
     de bord) reste.
   - `drop constraint signalement_suivi_signalement_id_key` (nom à vérifier par le test de
     structure) et `create index on public.signalement_suivi (signalement_id, ordre desc)`.
2. Fonctions pures, `language sql stable`, `set search_path = ''`, exécutables par `authenticated`
   (la vue en `security_invoker` les appelle) :

   ```sql
   -- Dernier jour de Paris où le ministère peut répondre à une réponse d'EJP Tech.
   create function private.reponse_possible_jusquau(p_reponse_le timestamptz) returns date ...
     select (p_reponse_le at time zone 'Europe/Paris')::date + 7
   -- Statut lu dans la dernière ligne de suivi, par ordre (null : aucune ligne).
   create function private.statut_signalement(p_etape text, p_le timestamptz, p_jour date) returns text ...
     select case
       when p_etape is null then 'recu'
       when p_etape in ('en_cours', 'reponse_ministere') then 'en_cours'
       when p_etape = 'reponse' and p_jour <= private.reponse_possible_jusquau(p_le) then 'repondu'
       else 'clos'
     end
   ```

   Les fonctions d'écriture, la vue et la fonction serveur lisent le statut par ces deux seules
   fonctions : une seule règle, à un seul endroit. L'instant de la clôture automatique est
   `((private.reponse_possible_jusquau(le) + 1)::timestamp at time zone 'Europe/Paris')`, jamais
   `date::timestamptz` (fuseau de la session, UTC).

3. Fonctions de l'API (section 5.3) : `private` en `security definer` avec `set search_path = ''`
   et `private.exige_aal2()` en tête, appelée par une fonction `public` en `security invoker`.
4. `clore_signalement` recréée (même signature, même commentaire facultatif pour l'ancien site) :
   le contrôle « déjà clos » se fait sous le verrou par `private.statut_signalement` (l'index
   unique n'existe plus), et la ligne porte `etape = 'clos'`. Même message « Ce signalement est déjà
   clos. ». Le nouvel écran rend la réponse obligatoire (schéma Zod).
5. Journal : `journal_action_check` recréée depuis sa dernière version
   (`20261025192715_comptes_corrections.sql:54-75`) avec 5 codes de plus, tous posés dès ce lot :
   `signalement_pris_en_charge`, `signalement_repondu`, `signalement_regle`,
   `signalement_reponse_ministere`, `courriel_signalement_tente` (servi au lot 3). Nouveau check
   `journal_suivi_signalement_cible_check` : ces 5 codes ont toujours `cible = 'signalement'`, car
   c'est cette cible qui les retire au berger, au conseil et à l'administration (section 5.6).
6. Fraîcheur : `private.tableau_ministeres()` recréée depuis sa dernière version (B7,
   `20261009110000_signalements.sql:502-550`), exclusion élargie à
   `j.action not in ('difficulte_signalee', 'signalement_regle', 'signalement_reponse_ministere')`
   (règle 6 : répondre à un signalement n'est pas une saisie).
7. `v_signalement` recréée (`create or replace`, section 5.4).
8. Droits des fonctions : `revoke all` à public, anon, authenticated et service_role, puis `grant
execute` à authenticated pour les fonctions de l'API, `reponse_possible_jusquau` et
   `statut_signalement`.
9. Jeu d'exemple local `supabase/seed/43-signalements.sql` : un signalement par statut, dont un
   Répondu d'il y a 7 jours (encore ouvert), un Répondu d'il y a 8 jours (clos par calcul), un
   ministère sans compte actif et un ancien clos.

### 5.3 Fonctions de l'API

| Fonction (`public`, invoker, puis `private`, definer)                        | Qui                         | Statut de départ | Écrit                                   | Journal (`cible = 'signalement'`, `detail`)     |
| ---------------------------------------------------------------------------- | --------------------------- | ---------------- | --------------------------------------- | ----------------------------------------------- |
| `prendre_en_charge_signalement(p_signalement_id)`                            | EJP Tech                    | Reçu             | ligne `en_cours`                        | `signalement_pris_en_charge`, `{ecran}`         |
| `repondre_au_ministere(p_signalement_id, p_reponse)` rend l'`id` de la ligne | EJP Tech                    | Reçu, En cours   | ligne `reponse` avec le texte           | `signalement_repondu`, `{ecran}`                |
| `confirmer_signalement(p_signalement_id)`                                    | le ministère du signalement | Répondu          | ligne `regle`                           | `signalement_regle`, `{ecran}`                  |
| `repondre_a_ejp_tech(p_signalement_id, p_texte)`                             | le ministère du signalement | Répondu          | ligne `reponse_ministere` avec le texte | `signalement_reponse_ministere`, `{ecran}`      |
| `clore_signalement(p_signalement_id, p_commentaire default null)` (existe)   | EJP Tech                    | tout sauf Clos   | ligne `clos`                            | `signalement_clos`, `{ecran, avec_commentaire}` |

Deux fonctions distinctes pour le ministère, plutôt qu'un booléen : « réglé avec un texte » ne peut
pas s'écrire, donc aucune erreur 23514 brute.

Contrôles communs, dans cet ordre : `exige_aal2()` ; profil (EJP Tech : `mon_type() =
'admin_plateforme'` ; ministère : `mon_type() = 'ministere'` et `s.ministere_id = mon_ministere()`),
sinon 42501 « Cet élément n'existe pas ou vous n'y avez pas accès. » ; signalement lu `for update`,
introuvable : même 42501 ; statut relu par `private.statut_signalement` (dernière ligne par
`ordre`, `private.aujourdhui()`) ; mauvais statut : le message de la section 3.3 ; pour
`repondre_au_ministere`, compte actif du ministère, sinon « Ce ministère n'a plus de compte
actif. » ; texte : `btrim`, 10 à 280, `private.texte_libre_refuse` ; ajout de la ligne
(`forcer_auteur` impose `saisi_le` et `saisi_par`) ; ligne de journal au nom de l'appelant,
`ministere_id` du signalement. Le journal ne porte jamais le texte, la réponse, l'adresse ni le nom
d'une personne.

Le verrou `for update` sur la ligne du signalement fait passer les gestes l'un après l'autre : deux
clics simultanés ne donnent jamais deux réponses, ni un Clos suivi d'un En cours.

### 5.4 Vue `v_signalement` (recréée, `security_invoker = true`)

Les 11 colonnes actuelles restent, dans le même ordre et avec le même sens pour l'ancien site ; 7
colonnes s'ajoutent à la fin. « Dernière ligne » veut toujours dire la plus grande valeur
d'`ordre`.

| Colonne                    | Valeur                                                                                                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `id` à `saisi_le`          | inchangées                                                                                                                                    |
| `suivi_id`, `commentaire`  | la dernière ligne d'EJP Tech avec un texte (`reponse` ou `clos`) : la « Réponse : » que l'ancien site affiche                                 |
| `clos_le`                  | instant de la ligne `regle` ou `clos` ; pour une clôture automatique, 0 h à Paris le lendemain de `reponse_possible_jusquau` ; null si ouvert |
| `ouvert`                   | statut différent de Clos                                                                                                                      |
| `clos_recent`              | inchangée : `clos_le` d'il y a 30 jours au plus, jour de Paris                                                                                |
| `statut`                   | `recu`, `en_cours`, `repondu` ou `clos`, par `private.statut_signalement`                                                                     |
| `derniere_etape`           | étape de la dernière ligne (null pour Reçu) : `reponse_ministere` donne « Le ministère a répondu »                                            |
| `statut_le`                | instant du statut : dernière ligne, envoi pour Reçu, `clos_le` pour une clôture automatique                                                   |
| `jours_depuis`             | `private.aujourdhui()` moins le jour de Paris de `statut_le` : l'âge affiché dans « À traiter »                                               |
| `fin`                      | `confirme`, `automatique`, `ejp_tech` ou null                                                                                                 |
| `reponse_possible_jusquau` | jour de Paris, pour un Répondu ; sinon null                                                                                                   |
| `compte_actif`             | le ministère a un compte actif (lu dans `compte`, que tout profil actif lit) ; sert à l'écran d'EJP Tech                                      |

Le suivi daté se lit dans `signalement_suivi` (colonnes `id, signalement_id, etape, commentaire,
saisi_le, ordre`), sous sa RLS actuelle, trié par `ordre` : une fonction de
`src/data/signalements.ts` par lecture. Pas de nouvelle vue.

### 5.5 Migration B et Edge Function (lot 3)

- Une seule fonction serveur, sur le modèle **actuel** des fonctions de comptes (session vérifiée,
  T15 puis T56) : `20261001141100_comptes_session_appelant.sql`, dans sa forme la plus récente
  `serveur_preparer_correction_adresse` (`20261025211216_comptes_corrections_securite.sql:65-76`).
  Pas le modèle d'avant T15 de `20261001084923` : `appelerBase` envoie toujours `p_session`.

  ```
  private.serveur_preparer_courriel_signalement(p_appelant uuid, p_session uuid, p_suivi_id uuid)
    security definer, set search_path = '', volatile
    1. perform private.controler_appel(p_appelant, p_session)
       (EJP Tech actif, session vivante en aal2, pose pilotage.session_appelant pour T56)
    2. ligne de suivi introuvable : signalement_inconnu
    3. signalement verrouillé for update, puis pg_advisory_xact_lock(hashtext('pilotage_ejp.courriels'))
    4. la ligne n'est pas la dernière, n'est pas `reponse`, ou statut différent de repondu : etat_invalide
    5. une ligne courriel_signalement_tente existe déjà pour ce suivi_id : courriel_deja_tente
    6. 20 lignes courriel_signalement_tente déjà écrites ce jour de Paris : limite_atteinte
    7. aucun compte actif du ministère : compte_desactive ; email_confirmed_at vide : compte_non_active
    8. insert journal (compte = p_appelant, ministere_id, action = 'courriel_signalement_tente',
       cible = 'signalement', cible_id = id du signalement, detail = {"ecran", "suivi_id"})
    9. rend : user_id du compte, nom du ministère, code de l'écran,
       signale_le date (jour de Paris), reponse_possible_jusquau date
  ```

  `public.serveur_preparer_courriel_signalement`, d'une ligne en `security invoker`, exécutable par
  la seule clé secrète (`service_role`). Ajout du nom à `FonctionServeur` et des codes à
  `refusConnus` (`supabase/functions/_shared/base.ts`).

- Pas de seconde fonction « noter » : la ligne de journal est écrite avant l'envoi, dans la même
  transaction que les contrôles. Il n'y a donc rien à revérifier après l'envoi.
- Dates : le courriel ne reçoit que des `date` de Paris venues de SQL, mises en forme par une table
  des mois (« 26 octobre »), jamais un `timestamptz` mis en forme dans Deno (UTC).
- Codes : `CodeErreur` (`supabase/functions/_shared/http.ts`) gagne `signalement_inconnu`,
  `etat_invalide`, `courriel_deja_tente`, `compte_non_active`, `limite_atteinte`,
  `configuration_absente`, `envoi_authentification`, `envoi_destinataire_refuse`,
  `envoi_impossible` ; `StatutErreur` gagne 429 (`limite_atteinte`) et 502 (codes `envoi_*`).
  `compte_desactive` existe déjà.
- `supabase/functions/notifier-signalement/index.ts`, `_shared/courriel.ts` (transport et message),
  entrée `[functions.notifier-signalement]` dans `config.toml` comme les autres. En local, hôte et
  port du serveur d'envoi par `supabase/functions/.env` (ignoré par git) pour viser Mailpit.

### 5.6 Droits

- **RLS** : inchangée sur les deux tables. Le ministère lit son signalement et toutes ses lignes de
  suivi ; EJP Tech lit tout ; le berger, le conseil et l'administration ne lisent rien. Aucune
  politique d'ajout : les fonctions écrivent. Politique restrictive `aal2` inchangée.
- **GRANT** : inchangés (`select` à authenticated seulement, rien pour anon). Séquence d'`ordre` :
  aucun droit.
- **Journal** : la politique de lecture retire déjà au berger, au conseil et à l'administration
  toute ligne de cible `signalement` (`20261014090000_retrait_par_le_ministere.sql:288-302`) ;
  `journal_lisible_administration` ne contient aucun de ces codes. Le check de cible (section 5.2,
  point 5) garantit que les 5 nouveaux codes portent toujours cette cible. Ils sont donc lus par le
  ministère concerné et EJP Tech seulement, **sans changer la politique ni `v_journal`** ; les
  tests le vérifient, dont « le berger ne lit aucune ligne `courriel_signalement_tente` ».
- **Matrice du BRIEF (section 7)**, lignes ajoutées :

| Objet                                   | Ministère                               | Berger, conseil | Administration | EJP Tech                               | aal1, anonyme |
| --------------------------------------- | --------------------------------------- | --------------- | -------------- | -------------------------------------- | ------------- |
| `signalement_suivi`                     | L toutes les lignes de ses signalements | Rien            | Rien           | L tout                                 | Rien          |
| `prendre_en_charge_signalement`         | refusé                                  | refusé          | refusé         | oui                                    | refusé        |
| `repondre_au_ministere`                 | refusé                                  | refusé          | refusé         | oui, si le ministère a un compte actif | refusé        |
| `confirmer_signalement`                 | les siens seulement, à l'étape Répondu  | refusé          | refusé         | refusé                                 | refusé        |
| `repondre_a_ejp_tech`                   | les siens seulement, à l'étape Répondu  | refusé          | refusé         | refusé                                 | refusé        |
| `clore_signalement`                     | refusé                                  | refusé          | refusé         | oui, s'il est ouvert                   | refusé        |
| `notifier-signalement` (Edge)           | refusé                                  | refusé          | refusé         | oui, une fois par réponse              | refusé        |
| `serveur_preparer_courriel_signalement` | clé secrète seulement                   |                 |                |                                        |               |

### 5.7 Compatibilité avec le site déjà en ligne

L'ordre de mise en ligne est : migrations, Edge Function, puis `main` (`docs/exploitation.md`, 7.3
bis), et un retour arrière du site remet l'ancien écran sur la nouvelle base (7.5). Donc :

- Rien n'est retiré : les 11 colonnes de `v_signalement` gardent leur nom, leur type, leur ordre et
  leur sens ; `signaler_difficulte` est inchangée ; `clore_signalement` garde sa signature et son
  commentaire facultatif.
- L'ancien écran du ministère montre « Ouvert » pour Reçu, En cours et Répondu, avec « Réponse : »
  quand EJP Tech a répondu. L'ancien bloc d'EJP Tech montre les ouverts avec « Clore le
  signalement », qui marche. Aucune erreur, seulement moins de détail. L'ancien site ne peut pas
  masquer la réponse d'un ministère (il ne connaît que la dernière ligne d'EJP Tech) : à faire
  depuis le nouveau site une fois revenu.
- **Migration A à sens unique** : dès qu'un signalement a une seconde ligne de suivi, l'index unique
  ne peut plus se recréer. Un retour arrière ne concerne que le site, jamais la base.
- `clore_signalement` reste : c'est aussi le geste discret du nouvel écran.

### 5.8 Reprise des signalements existants

- **Déjà clos** (dont celui de Coordination, clos aujourd'hui dans l'écran actuel) : leur unique
  ligne reçoit `etape = 'clos'` par la valeur par défaut et un `ordre`. Statut Clos,
  `fin = 'ejp_tech'`, commentaire gardé, « Clos par EJP Tech le ... ».
- **Ouverts** : aucune ligne de suivi, donc **Reçu**. Rien à écrire.
- Aucun `UPDATE`, aucun `DELETE`, aucun script de reprise.

### 5.9 Ce qui ne change pas

`signalement` et `signaler_difficulte` ; la liste des écrans ; la lecture réservée au ministère
auteur et à EJP Tech ; la file « Textes à relire », qui ne prend toujours pas les signalements ; la
suppression d'un ministère, toujours bloquée par un signalement (T75) ; l'envoi des courriels d'Auth
(Gmail d'EJP Tech, port 587) ; CLAUDE.md (les deux tables restent en ajout seulement).

## 6. Critères d'acceptation

**Le cas de Coordination, rejoué en test** (jeu d'essai qui reprend son signalement ; la vraie ligne
est close avant la mise en ligne ; lignes antidatées comme `signalements.test.sql:280-290`). Son
texte ne dit ni quel événement, ni quelle date, ni quel message : la cause n'est pas connue, et le
premier geste réel d'EJP Tech est une question. Le scénario ne suppose aucune cause.

1. **Étant donné** un signalement de Coordination du lundi 26 octobre, écran « Ajouter un
   événement », texte « Problème au niveau de la saisie des événement dans le calendrier », sans
   ligne de suivi, **quand** EJP Tech ouvre Modération le 26 octobre, **alors** il le voit dans « À
   traiter » avec « Reçu aujourd'hui. », « Prendre en charge », « Répondre au ministère » et
   « Clore le signalement » discret ; **et quand** Coordination ouvre
   « Ma semaine », **alors** aucun bandeau, la ligne « 1 signalement suivi par EJP Tech. » est sous
   « Vos points », et « Mes signalements » le montre « Reçu » dans « En cours ».
2. **Quand** EJP Tech clique « Prendre en charge » le 27 octobre, **alors** le statut devient En
   cours, Coordination lit « EJP Tech s'en occupe depuis le 27 oct. », une ligne
   `signalement_pris_en_charge` `{"ecran": "saisie_evenement"}` est au journal, aucun courriel ne
   part.
3. **Quand** EJP Tech répond le 27 octobre « Quel événement, à quelle date, et quel message
   s'affiche quand vous enregistrez ? », **alors** le statut devient Répondu, la ligne passe dans
   « En attente du ministère » avec « Le ministère peut répondre jusqu'au 3 nov. », un courriel part
   vers l'adresse du compte actif et activé de Coordination (objet « EJP Tech a répondu à votre
   signalement du 26 octobre », « Ajouter un événement », « jusqu'au 3 novembre », le lien
   `/signalements#<id>`, « Ne répondez pas à ce message », ni le texte ni la réponse), le message
   dit « Réponse envoyée. Courriel envoyé à Coordination. », et le journal porte
   `signalement_repondu` puis `courriel_signalement_tente`, sans texte ni adresse.
4. **Étant donné** ce Répondu, **quand** Coordination suit le lien du courriel, se connecte et donne
   son code, **alors** elle arrive sur ce signalement (focus sur son en-tête) dans « À vérifier »,
   lit la question, « Est-ce réglé ? », les deux boutons et « Vous pouvez répondre jusqu'au 3
   nov. » ; « Ma semaine » montre sous l'ouverture « EJP Tech a répondu à votre signalement du 26
   oct. Dites-nous si c'est réglé. ».
5. **Quand** Coordination clique « Répondre à EJP Tech » le 28 octobre et écrit « L'événement du 15
   novembre ne s'enregistre pas, un message rouge s'affiche. », **alors** le statut repasse En
   cours, EJP Tech le voit dans « À traiter » avec « Le ministère a répondu le 28 oct. » et le
   texte, le bandeau laisse la place à la ligne sous « Vos points », aucun courriel ne part.
6. **Quand** EJP Tech répond de nouveau le 29 octobre, **alors** un second courriel part
   (« jusqu'au 5 novembre »).
7. **Quand** Coordination clique « Oui, c'est réglé » le 30 octobre, **alors** le statut devient
   Clos (« Vous avez confirmé que c'est réglé le 30 oct. »), les boutons et le bandeau
   disparaissent, EJP Tech le voit dans « Clos ces 30 derniers jours » (« Confirmé par le ministère
   le 30 oct. »), aucun courriel ne part, et tout nouveau geste sur ce signalement est refusé (« Ce
   signalement est déjà clos. »).

**Autres cas** :

8. **Clôture automatique, un dimanche** : **étant donné** une réponse d'EJP Tech le dimanche 1er
   novembre à 21 h (Paris), **quand** on est le dimanche 8 novembre à 23 h 55 (Paris), **alors** il
   est encore Répondu et les deux boutons répondent ; **quand** on est le lundi 9 novembre à 0 h 05
   (Paris), **alors** il est Clos (« Clos le 9 nov., sans retour de votre part. Si la difficulté
   revient, faites un nouveau signalement. ») et `confirmer_signalement` comme `repondre_a_ejp_tech`
   sont refusées.
9. **Fuseau** : une réponse à 0 h 30 heure de Paris le jeudi 29 octobre (23 h 30 UTC le 28) donne
   « jusqu'au 5 novembre », pas le 4 ; un signalement fait à 0 h 30 heure de Paris le 27 octobre
   donne « votre signalement du 27 octobre » dans le courriel.
10. **Ordre** : deux lignes dont la seconde porte un `saisi_le` plus ancien de quelques
    millisecondes : le statut suit `ordre`, pas l'heure.
11. **Échec de l'envoi** : **étant donné** un mot de passe d'application refusé, **quand** EJP Tech
    répond, **alors** le statut est Répondu quand même, le message dit « Réponse envoyée, mais le
    courriel n'est pas parti : la boîte d'envoi refuse le mot de passe. Prévenez la personne
    responsable ... », la ligne `courriel_signalement_tente` est au journal, aucun bouton ne propose
    de renvoyer, et un second appel pour la même réponse reçoit `courriel_deja_tente`.
12. **Doubles envois et plafond** : deux appels pour la même réponse, l'un après l'autre ou en
    parallèle : un seul envoi, l'autre reçoit `courriel_deja_tente` ; le 21e appel d'un même jour
    de Paris reçoit `limite_atteinte` et n'envoie rien ; secrets absents : `configuration_absente`
    et aucune ligne de journal.
13. **Session** : `notifier-signalement` avec une session révoquée ou en aal1 : 401
    `session_revoquee`, aucune ligne de journal ; avec une session déclarée (T56), la ligne
    `courriel_signalement_tente` est attribuée à cette déclaration (même test que
    `intervenants.test.sql:248-276`).
14. **Ministère sans compte actif** : **étant donné** le compte de Coordination désactivé, **alors**
    la ligne d'EJP Tech dit « Ce ministère n'a plus de compte actif. » et ne propose que « Clore le
    signalement », `repondre_au_ministere` est refusée, et la clôture avec une réponse donne « Clos
    par EJP Tech », sans courriel. **Compte de remplacement pas encore activé** : la réponse passe,
    le courriel non (`compte_non_active`).
15. **Clore le signalement** : sur un Reçu « transmis à l'administration », la réponse est
    obligatoire à l'écran, aucun courriel ne part, le ministère lit « Clos par EJP Tech le ... » et
    la réponse.
16. **Droits** : un autre ministère (Communication) ne lit ni le signalement de Coordination ni ses
    lignes de suivi, et `confirmer_signalement` comme `repondre_a_ejp_tech` lui sont refusées
    (42501) ; EJP Tech ne peut pas répondre à la place du ministère ; le ministère ne peut ni
    prendre en charge ni répondre au ministère ; le berger, le conseil et l'administration ne
    lisent aucune ligne de suivi ni aucun des 5 nouveaux codes du journal ; en aal1 et en anonyme,
    tout est refusé ; un `insert`, `update` ou `delete` direct sur `signalement_suivi` est refusé à
    tous ; une ligne de journal d'un des 5 codes avec une autre cible est refusée par le check.
17. **Données personnelles** : « Répondre à EJP Tech » avec « Appelez Jean au 06 12 34 56 78 » est
    refusé avec le message existant, le texte reste dans le champ ; le rappel est sous le champ.
18. **Ancien site sur la nouvelle base** : **étant donné** la migration appliquée et l'ancien site
    encore en ligne, **quand** EJP Tech clique « Clore le signalement » sur un Reçu, **alors** la
    clôture marche comme avant (ligne `clos`), et « Vos derniers signalements » s'affiche sans
    erreur.
19. **Reprise** : un signalement clos le 8 octobre se lit Clos, `fin = 'ejp_tech'`, avec sa réponse.
20. **Fraîcheur** : « Oui, c'est réglé » ou « Répondre à EJP Tech » ne change pas la date de
    dernière saisie de Coordination dans « Ministères », ni ses « Dernières saisies » ; la ligne
    du courriel n'apparaît pas dans « Mon journal » de Coordination.
21. **États de l'écran et accessibilité** : la page « Mes signalements » montre la flamme pendant
    la lecture, l'erreur avec « Réessayer », le texte vide, « Aucun signalement ouvert. » quand il
    n'y a que des clos ; un geste en un clic sans réseau dit « L'envoi n'a pas abouti. Réessayez. » ;
    après chaque geste, le focus est sur l'en-tête de la ligne déplacée et le message est annoncé ;
    le panneau se ferme en rendant le focus à son bouton ; « Ma semaine » ne saute pas quand le
    suivi arrive, et s'affiche normalement si sa lecture échoue ; à 390 px, aucun défilement
    horizontal et les boutons s'empilent ; un autre profil qui ouvre `/signalements` revient à son
    accueil.

## 7. Options écartées, risques, tests, lots, questions

### 7.1 Options écartées

| Option                                                           | Pourquoi                                                                                                        |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Colonne `statut` mise à jour sur `signalement`                   | un `UPDATE` sur une table en ajout seulement                                                                    |
| Nouvelle table `signalement_etape`                               | RLS, droits, déclencheurs, modération et journal à refaire pour un résultat identique                           |
| Statuts de plus (en attente, annulé), priorité, assignation      | utiles aux gros volumes et aux délais garantis, absents ici (`pratiques.md`, section 2)                         |
| « Traité » et « Marquer traité »                                 | déjà pris par les points, où un traité ne se rouvre pas ; ici un Répondu repasse En cours                       |
| Fil de discussion libre                                          | une réponse par geste suffit ; plus de textes à relire et à masquer                                             |
| Tâche planifiée qui écrit la clôture automatique                 | une écriture et une extension pour un calcul que la vue fait seule                                              |
| File d'envoi, `pg_cron`, `pg_net`, Vault                         | trop lourd pour quelques courriels par mois qui suivent tous un clic (section 4.3)                              |
| État « Courriel envoyé » gardé et bouton « Envoyer le courriel » | deux fonctions serveur, une colonne et un index pour le seul cas « onglet fermé » ; le bandeau suffit           |
| Gmail d'EJP Tech pour les courriels de suivi                     | son mot de passe d'application ouvre la boîte qui reçoit les récupérations de comptes ; quota partagé avec Auth |
| Resend, Brevo, Postmark                                          | pas de domaine : DMARC échoue ou l'adresse est remplacée (`courriels.md`, section 2)                            |
| SMTP de Supabase Auth                                            | réservé aux messages d'Auth                                                                                     |
| Bouton « C'est réglé » dans le courriel                          | contournerait la double authentification                                                                        |
| Texte du signalement ou réponse dans le courriel                 | un texte libre ne sort pas de l'outil ; la lecture passe par la connexion en aal2                               |
| Courriel à chaque étape, à l'envoi ou vers EJP Tech              | du bruit ; seule la réponse d'EJP Tech demande un geste du ministère                                            |
| Onglet « Mes signalements »                                      | un cinquième onglet pour un usage rare ; le bandeau, la ligne et le lien suffisent                              |
| Bandeau tant qu'un signalement est ouvert                        | il ne demande aucun geste, reste des jours en tête et habitue à ignorer le bandeau qui compte                   |
| Statut et courriel dans une seule Edge Function                  | le changement de statut dépendrait du service des fonctions ; les statuts passent par des fonctions SQL         |

### 7.2 Risques

| Risque                                                              | Parade                                                                                                                  |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Port 465 fermé depuis une Edge Function (preuve communautaire)      | essai jetable avant le lot 3 (section 4.5) ; repli Apps Script ou pas de courriel                                       |
| Mot de passe d'application révoqué                                  | code `envoi_authentification`, message clair, ligne au tableau des incidents                                            |
| Courriel classé indésirable (boîte d'envoi neuve)                   | texte simple, nom « Pilotage EJP », recette avec Tech ; le bandeau reste le filet                                       |
| Boîte partagée non lue                                              | bandeau de « Ma semaine » ; clôture automatique après 7 jours pleins                                                    |
| Courriel perdu (onglet fermé, échec)                                | message à EJP Tech, qui prévient autrement ; bandeau de « Ma semaine »                                                  |
| Doublon ou envoi massif                                             | une tentative par réponse, notée sous verrou avant l'envoi ; 20 par jour de Paris ; quota de la boîte d'envoi à part    |
| Fuite de l'adresse par un message d'erreur du serveur d'envoi       | le transport rend un code seul ; journaux de la bibliothèque coupés                                                     |
| Réponse par courriel hors de l'outil                                | « Ne répondez pas à ce message » ; `Reply-To` vers EJP Tech                                                             |
| « En cours » oublié                                                 | « À traiter » trié par ancienneté, âge affiché, compteur dans le titre, « vider À traiter » dans la routine (guide, 11) |
| Clôture automatique ressentie comme brutale                         | date limite annoncée à l'écran et dans le courriel ; nouveau signalement toujours possible                              |
| Ancien site pendant la mise en ligne ou après un retour arrière     | colonnes et fonctions gardées (section 5.7), test dédié ; la base ne revient pas en arrière                             |
| Deux personnes d'EJP Tech en même temps                             | verrou `for update`, messages de la section 3.3, relecture de la liste                                                  |
| Conformité (nouvel usage de l'adresse du ministère, nouvelle boîte) | registre et page Confidentialité mis à jour avec l'accord de la coordination (section 7.4)                              |

### 7.3 Tests à écrire en premier (ils échouent avant, passent après)

1. **pgTAP, cas de Coordination** : nouveau fichier `supabase/tests/signalements-suivi.test.sql`,
   critères 1 à 7 (statut et `derniere_etape` à chaque geste, une ligne de journal par geste avec
   `detail` réduit à `{ecran}`, aucun texte au journal).
2. **pgTAP, clôture automatique, fuseau et ordre** : critères 8, 9 et 10, lignes antidatées.
3. **pgTAP, matrice** : `rls-signalements-matrice.test.sql` étendu aux 4 nouvelles fonctions et à
   la lecture des lignes de suivi, dans l'ordre des profils existant (porteur, autre ministère,
   FIJ, Coordination, berger, conseil, administration, EJP Tech, aal1, anonyme) ; journal des 5
   nouveaux codes et check de cible ; ministère sans compte actif.
4. **pgTAP, compatibilité et reprise** : colonnes de `v_signalement` (les 11 puis les 7, dans
   l'ordre), ancienne ligne clos, `clore_signalement` sur Reçu et En cours ; fraîcheur ;
   `structure.test.sql` (colonnes, checks, index unique retiré, séquence sans droit).
5. **pgTAP, lot 3** : `signalements-courriel.test.sql` : session révoquée, aal1, autre compte
   (`session_revoquee`) ; attribution T56 ; une tentative par réponse ; plafond de 20 ;
   `compte_desactive`, `compte_non_active`, `etat_invalide` ; dates de Paris à 0 h 30 ; exécution
   réservée à `service_role`.
6. **Vitest** : construction du suivi daté et des libellés (fonction pure, chaque statut et chaque
   `fin`) ; schémas Zod des réponses (partagés par les panneaux et les appels, réponse de « Clore »
   obligatoire) ; message du courriel (aucun texte libre, dates reçues en `date`, lien avec ancre,
   « Ne répondez pas ») ; `notifier-signalement` avec un faux transport (chaque code, aucun
   `message` ni adresse dans la réponse ni dans `consigner`, secrets vérifiés avant la base) ;
   états et focus des composants (page, bandeau, ligne, bloc).
7. **Playwright** (1440, 834, 390 px) : le cas de Coordination sur l'aperçu, d'EJP Tech au
   ministère, avec l'ancre du lien.

### 7.4 Découpage en lots

| Lot         | Branche                         | Contenu                                                                                                                                                                                                                  | Effort        |
| ----------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| 1. Base     | `etape-8-signalements-base`     | migration A (skill `nouvelle-table`, procédure d'une colonne), pgTAP 1 à 4, jeu d'exemple, types de la base                                                                                                              | 1 jour        |
| 2. Écrans   | `etape-8-signalements-ecrans`   | `src/data/signalements.ts`, schémas, `profils.ts`, page `/signalements`, bandeau et ligne de « Ma semaine », bloc d'EJP Tech, `/signaler`, journaux, aperçu, Vitest, Playwright, textes, `LISEZMOI.md` (07 et ligne 179) | 1,5 à 2 jours |
| Essai       | `etape-8-signalements-essai`    | fonction jetable `essai-envoi` (section 4.5), jamais fusionnée                                                                                                                                                           | 1 à 2 heures  |
| 3. Courriel | `etape-8-signalements-courriel` | migration B, `notifier-signalement` et transport, appel et messages dans le bloc, pgTAP 5, documents de conformité                                                                                                       | 1 jour        |

- **Ordre de mise en ligne** : lots 1 et 2 ensemble (migration A, puis `main`) dès qu'ils sont
  relus ; l'essai jetable en parallèle ; le lot 3 seulement si l'essai réussit (migration B,
  `notifier-signalement`, puis `main`), puis la recette avec Tech.
- **Documents, lots 1 et 2** : BRIEF (sections 2, 7, 8, 9) ; T76 dans `docs/decisions.md` (révise
  T39 : « une seule clôture », « en dehors de l'outil ») ; textes « Proposé » de
  `aides-contextuelles.md` ; `docs/exploitation.md` section 11 (routine : vider « À traiter » à
  chaque visite, répondre par une question quand le texte est vague, cas de « Clore le
  signalement ») ; registre, fiche 6 (catégories : étapes et réponses ; « pour qu'EJP Tech l'aide en
  dehors de l'outil ») et fiche 4 (les 5 codes) ; page Confidentialité, article « Signalements »
  (réponses dans l'outil) ; historique du registre.
- **Documents, lot 3** : BRIEF:1183 (une seconde boîte Gmail, réservée à l'envoi) et section 7
  « Données personnelles » ; section 11 du BRIEF (« sauf le courriel de suivi d'un signalement ») ;
  registre, fiche 5 (« deux emails seulement », « Supabase (qui prépare l'email) », mot de passe,
  nouvelle boîte) et fiche 6 (« aucun email », « Ne répondez pas ») ; page Confidentialité, article
  « Signalements » ; `docs/exploitation.md` 4.2 (la boîte d'envoi, ses secrets, le coffre), 12
  (rotation du mot de passe d'application, incident), fin de vie (fermer la boîte d'envoi) ;
  historique du registre. Validation de la coordination avant la mise en ligne.

### 7.5 Questions pour la personne (« Proposé » s'applique en attendant)

| N°  | Question                                                                                                                                                                                  | Proposé        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Q1  | Changement du modèle : une ligne de `signalement_suivi` par étape (colonnes `etape` et `ordre`, fin de l'unicité), sans retour arrière possible de la base ?                              | oui            |
| Q2  | Les 4 statuts et leurs noms : Reçu, En cours, Répondu, Clos ; côté ministère, les groupes « À vérifier », « En cours », « Clos » ?                                                        | oui            |
| Q3  | Le ministère peut répondre pendant 7 jours pleins après une réponse d'EJP Tech (jusqu'au même jour de la semaine suivante inclus), puis le signalement se clôt seul ?                     | 7 jours pleins |
| Q4  | Garder « Clore le signalement » pour EJP Tech, en geste discret, réponse obligatoire, sans courriel ni confirmation (transmis à l'administration, doublon, test, ministère sans compte) ? | oui            |
| Q5  | Le courriel : à chaque réponse d'EJP Tech seulement, au compte actif et activé du ministère, sans aucun texte, depuis une Gmail neuve réservée à l'envoi, 20 par jour au plus ?           | oui            |

### 7.6 Décidé dans la conception (anciennes Q6 à Q11)

| Sujet                                           | Décision                                                                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Mot de passe d'application à part (ancienne Q6) | oui, sur la boîte réservée à l'envoi (section 4.3) ; celui d'Auth ne change pas                                                             |
| Envoi au clic ou file (ancienne Q7)             | au clic, un seul appel, une seule tentative (section 4.3)                                                                                   |
| `/signaler` (ancienne Q8)                       | « Vos derniers signalements » remplacé par le lien « Voir mes signalements »                                                                |
| Page Confidentialité (ancienne Q9)              | mise à jour de l'article « Signalements » sans nouvelle acceptation (même adresse, même usage de service) ; la coordination valide le texte |
| Signalement de Coordination (ancienne Q10)      | traité aujourd'hui hors de l'outil, puis clos dans l'écran actuel ; recette avec le ministère Tech                                          |
| Courriel vers EJP Tech (ancienne Q11)           | non : Modération est son accueil                                                                                                            |

## 8. Revues : ce qui a changé

### 8.1 Revue produit

| N°  | Remarque                                | Suite donnée                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Cas réel mal servi, cause inventée, Q10 | Retenue. Coordination contactée aujourd'hui, signalement clos hors chantier (0, 4.6, 5.8) ; recette avec Tech ; étape neutre « Réponse d'EJP Tech », courriel « EJP Tech a répondu » ; bouton « Répondre à EJP Tech » ; critères 3 à 7 réécrits. Le « vrai diagnostic » n'est pas connu (texte vague, production non lue) : le critère commence par une question et ne suppose aucune cause, ce qui est le diagnostic honnête. |
| 2   | « Traité » déjà pris par les points     | Retenue. Statut « Répondu » (`repondu`), étape `reponse`, fonction `repondre_au_ministere`, journal `signalement_repondu` ; vocabulaire fixé en 2.1.                                                                                                                                                                                                                                                                           |
| 3   | Clôture un dimanche                     | Retenue. Réponse possible jusqu'au jour + 7 inclus, clôture à + 8 ; critère 8 : réponse le dimanche 1er nov., encore acceptée le 8, clos le 9.                                                                                                                                                                                                                                                                                 |
| 4   | « Clore » nécessaire                    | Retenue : geste discret, réponse obligatoire à l'écran, ni courriel ni confirmation, seul geste pour un ministère sans compte actif (la base refuse alors la réponse) ; guide, section 11. Écart : pas proposé à l'étape Répondu (le ministère a la main et le calcul clôt) ; la base l'accepte encore pour l'ancien site.                                                                                                     |
| 5   | Bandeau sans geste                      | Retenue. Bandeau seulement pour Répondu, sous l'ouverture ; ligne discrète sous « Vos points » ; écart 07 au LISEZMOI. « Réserver sa place » est fait en lisant le suivi avec le reste de la page : rien n'apparaît après coup, et un espace vide gardé n'aurait servi à rien.                                                                                                                                                 |
| 6   | Lot 3 trop lourd                        | Retenue. Un seul appel, résultat dans le message, aucun état gardé, aucun bouton de renvoi, une seule fonction serveur, pas d'index ni de colonne ; lots 1 et 2 en ligne d'abord ; essai jetable du port 465 avant le lot 3. La ligne de journal est gardée, écrite avant l'envoi, parce que la revue sécurité en a besoin contre les doubles envois.                                                                          |
| 7   | Focus perdu                             | Retenue : focus sur l'en-tête de la ligne déplacée (`tabindex="-1"`), zone `role="status"`, panneaux en `aria-expanded` avec focus dans le champ et retour au bouton, suivi en `<ol>` et `<time>`, « Est-ce réglé ? » en `role="group"`.                                                                                                                                                                                       |
| 8   | Le courriel n'est pas annoncé           | Retenue : « Répondre au ministère », « Envoyer la réponse », note « Coordination lit votre réponse dans Pilotage EJP et reçoit un courriel. ».                                                                                                                                                                                                                                                                                 |
| 9   | Textes ambigus                          | Retenue : « Clos le 4 nov., sans retour de votre part. », « Vous pouvez répondre jusqu'au 3 nov. », objet « EJP Tech a répondu à votre signalement du 26 octobre ».                                                                                                                                                                                                                                                            |
| 10  | Groupes du ministère                    | Retenue : « À vérifier », « En cours », « Clos ces 30 derniers jours ».                                                                                                                                                                                                                                                                                                                                                        |
| 11  | États manquants                         | Retenue : seulement des clos, échec réseau, attente de « Prendre en charge », autre profil, ancre `/signalements#<id>` ; compte sans adresse impossible, noté en 4.1.                                                                                                                                                                                                                                                          |
| 12  | Choix du texte à masquer                | Retenue : « Masquer » discret sous chaque texte cité ; au plus deux boutons empilés et « Clore » discret ; ligne 179 du LISEZMOI réécrite.                                                                                                                                                                                                                                                                                     |
| 13  | Raison `authentification`               | Retenue : « Prévenez la personne responsable : le mot de passe d'application est à refaire. »                                                                                                                                                                                                                                                                                                                                  |
| 14  | « En cours » oublié                     | Retenue : âge dans « À traiter » (colonne `jours_depuis` de la vue, pas l'horloge du navigateur), « vider À traiter » dans la routine du guide.                                                                                                                                                                                                                                                                                |
| 15  | Ligne du courriel dans « Mon journal »  | Retenue : exclue de « Mon journal » du ministère, visible dans le journal d'EJP Tech.                                                                                                                                                                                                                                                                                                                                          |
| 16  | Trop de questions                       | Retenue : Q1 à Q5 pour la personne (reformulées), Q6 à Q11 tranchées en 7.6.                                                                                                                                                                                                                                                                                                                                                   |

### 8.2 Revue sécurité

| N°      | Remarque                                                                                                                                                                                                   | Suite donnée                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | Mauvais modèle de fonction serveur                                                                                                                                                                         | Retenue : `(p_appelant, p_session, p_suivi_id)` et `controler_appel`, sur `20261001141100` et `20261025211216:65-76` ; tests « session révoquée » et « attribuée à la déclaration » (critère 13, pgTAP 5).                                                                                                                                                                                                                      |
| 2       | Doubles envois, envoi massif                                                                                                                                                                               | Retenue, sous une forme plus stricte : ligne `courriel_signalement_tente` écrite sous verrou avant l'envoi, une seule tentative par réponse (au lieu d'une fenêtre de 2 minutes), plafond de 20 par jour de Paris (`limite_atteinte`), « Envoi en cours » sur le bouton pendant tout l'appel. « Revérifier dans `serveur_noter_*` » n'a plus d'objet : cette fonction n'existe plus.                                            |
| 3       | Secret trop puissant                                                                                                                                                                                       | Retenue : Gmail neuve réservée à l'envoi, double authentification, rien d'autre rattaché, quota à part, `Reply-To` vers EJP Tech ; BRIEF:1183 et `exploitation.md` (4.2, 12, fin de vie) mis à jour au lot 3.                                                                                                                                                                                                                   |
| 4       | Ordre de la dernière ligne                                                                                                                                                                                 | Retenue : colonne `ordre bigint generated always as identity`, index et tri sur elle, critère 10.                                                                                                                                                                                                                                                                                                                               |
| 5       | Fuseau                                                                                                                                                                                                     | Retenue : dates du courriel rendues par SQL en `date` de Paris ; instant de clôture par `(d + 1)::timestamp at time zone 'Europe/Paris'` ; critère 9 avec un signalement à 0 h 30.                                                                                                                                                                                                                                              |
| 6       | Destinataire non activé                                                                                                                                                                                    | Retenue : envoi seulement si `email_confirmed_at` est rempli, sinon `compte_non_active` (critère 14).                                                                                                                                                                                                                                                                                                                           |
| 7       | Erreurs SMTP                                                                                                                                                                                               | Retenue : transport à code seul, ni `message` ni `response` dans `consigner` ou la réponse HTTP, journaux de la bibliothèque coupés, codes ajoutés à `CodeErreur`, statuts 429 et 502 à `StatutErreur`, `configuration_absente` vérifiée avant la base.                                                                                                                                                                         |
| 8       | Réponses par courriel                                                                                                                                                                                      | Retenue : « Ne répondez pas à ce message : répondez dans Pilotage EJP. », dit aussi dans la fiche 6.                                                                                                                                                                                                                                                                                                                            |
| 9       | Registre et Confidentialité                                                                                                                                                                                | Retenue : liste des phrases en 7.4, réparties entre les lots 1 et 2 (étapes, réponses, codes) et le lot 3 (courriel, boîte d'envoi) ; validation de la coordination avant chaque mise en ligne concernée.                                                                                                                                                                                                                       |
| 10      | Code de journal générique                                                                                                                                                                                  | Retenue : `courriel_signalement_tente`, plus un check qui impose `cible = 'signalement'` aux 5 codes ; test « le berger n'en lit aucune ».                                                                                                                                                                                                                                                                                      |
| 11      | `/signalements` absent de `profils.ts`                                                                                                                                                                     | Retenue (3.1 a, lot 2).                                                                                                                                                                                                                                                                                                                                                                                                         |
| 12      | `p_regle = true` avec un texte                                                                                                                                                                             | Retenue autrement : deux fonctions, `confirmer_signalement` et `repondre_a_ejp_tech` ; le cas ne peut plus s'écrire.                                                                                                                                                                                                                                                                                                            |
| 13      | Migration A à sens unique                                                                                                                                                                                  | Retenue : dit en 5.7 (retour arrière du site seulement) et dans Q1 ; l'ancien site ne masque pas la réponse d'un ministère, noté en 5.7.                                                                                                                                                                                                                                                                                        |
| 14      | Port 465 essayé trop tard                                                                                                                                                                                  | Retenue en partie : le port est essayé avant tout le lot 3 par la fonction jetable (section 4.5), avec les vrais secrets. L'essai complet de `notifier-signalement` avec Tech avant `main` n'est pas possible sans écran : il n'y a plus d'aperçu de branche depuis T70 (`docs/exploitation.md:134`). Il se fait juste après `main` ; un échec reste visible et sans effet sur les statuts, déjà en ligne avec les lots 1 et 2. |
| Vérifié | Ajout seulement, `private` definer, `exige_aal2`, RLS, GRANT, journal sans texte, aucune clé côté navigateur, compatibilité de `v_signalement`, versions de `tableau_ministeres` et `journal_action_check` | Gardé tel quel.                                                                                                                                                                                                                                                                                                                                                                                                                 |
