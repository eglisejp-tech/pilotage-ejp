# Aides contextuelles : règles et catalogue

- **Statut** : principe décidé le 6 octobre 2026 (T38 de `docs/decisions.md`), avec la forme ronde
  du bouton d'aide (décidée le même jour) ; les textes sont « Proposé, réécrit le 7 octobre 2026
  après les remarques de la personne responsable » (section 6), à valider par elle (question 15 du
  plan de l'étape 4). Le catalogue est dans `src/components/aide/textesAide.ts`.
- **Date** : 6 octobre 2026, textes et règles de rédaction réécrits le 7 octobre 2026
- **Origine** : demande du 6 octobre 2026 (réponse à la question 7 du plan de l'étape 4) : de petites
  aides contextuelles, bien placées, simplement rédigées, pour aider à la prise en main.
- **Changement du 6 octobre 2026** : le mois en cours d'un indicateur sensible se saisit (P45), une
  « Précision » et une répartition par catégories s'y ajoutent (P46, P47). `mois.sensible` est revue,
  `mois.repartition` et `fiche.repartition` sont proposées (section 6), et le texte « Se saisit une
  fois le mois fini. » est retiré (section 8). `fiche.repartition` est supprimée le 7 octobre.
- **Changement du 7 octobre 2026** : les règles de rédaction (section 2) et tous les textes
  (section 6) sont réécrits : cinq aides sont supprimées, vingt-huit restent. Trois de ces cinq sont
  encore appelées par un écran (`CODES_A_RETIRER`), les deux de la fiche sont déjà retirées avec le
  lot I (valeurs exactes, P52). Sources de la recherche à la fin de la section 2.
- **Sources** : `docs/plan-etape-4.md` (lots E2 à E7), `BRIEF.md` (sections 3, 4 et 9),
  `docs/reference/maquettes/LISEZMOI.md`, maquettes 04, 07, 08, 09, 11 et 12,
  `src/styles/tokens.css`, composants de `src/features/cette-semaine/`.
- **Portée** : les règles, le composant et le catalogue des textes. Le code vient avec les lots du
  plan (section 9 ci-dessous). Ce document ne change ni le modèle de données ni les droits, sauf
  « Signaler une difficulté » (section 7), décidé le 6 octobre 2026 (T39, question 14 du plan).

Vocabulaire : une **aide** est la petite bulle qui s'ouvre sur un bouton « ? ». Un **texte visible**
est une ligne écrite sous un champ ou dans l'écran, toujours affichée. Une aide ne remplace jamais
un texte visible.

## 1. Pourquoi et quand

Une aide explique **un champ ou un chiffre qu'une personne nouvelle peut ne pas comprendre** : à quoi
il sert, ce qu'il compte, ce qui se passe après. Elle est facultative : l'écran doit fonctionner
sans qu'on l'ouvre.

Une aide ne porte **jamais** :

- une information **nécessaire pour remplir correctement** le formulaire (format, limite, règle de
  saisie, conséquence d'un choix). Cela reste un texte visible sous le champ, comme « Si personne n'a
  servi, enregistrez 0. » ;
- une **erreur** ou un message de validation. Il reste visible à côté du champ, relié par
  `aria-describedby` ;
- le **rappel sur les données personnelles**. Il reste visible, une fois par formulaire, sous le
  premier champ libre (CLAUDE.md, « Aucune donnée personnelle ») ;
- un état vide, un message de réussite ou un avertissement ;
- une règle déjà dite par un texte visible de l'écran (voir la section 8 : ce qui n'est pas une
  aide).

Test de décision, dans cet ordre, pour chaque texte d'aide proposé :

1. Sans ce texte, la personne risque-t-elle de se tromper en remplissant ? Oui : texte visible.
2. Un meilleur libellé suffirait-il ? Oui : changer le libellé (« STARs au service ce dimanche »
   plutôt que « Service » avec une aide).
3. Le texte répète-t-il une ligne déjà affichée ? Oui : ne pas l'écrire.
4. Reste : une aide.

Une aide ne contient **aucun nom de personne** ni donnée de la base : ses textes sont fixes, écrits
dans le code. L'ouverture d'une aide n'est ni comptée ni écrite au journal.

## 2. Règles de rédaction

Réécrites le 7 octobre 2026, après une recherche sur la rédaction des aides courtes (sources en fin
de section) et les remarques de la personne responsable : une aide dit **ce que la personne doit
comprendre**, jamais ce qu'elle ne doit pas savoir ni ce que l'outil ne fait pas.

1. **Une idée par aide.** Si le texte en demande deux, c'est deux aides, ou un meilleur libellé.
2. **Commence par ce que c'est.** La première phrase définit le chiffre ou dit ce que la personne
   fait, dans les mots de l'outil. « Part des STARs actifs qui sont en FIJ. » Pas de « L'outil
   calcule », pas de mécanique interne (« reste valable jusqu'à votre prochaine saisie »).
3. **Dit en positif.** On écrit ce qui est, ce qui se passe, ce qu'il faut faire. Pas de « vous
   n'avez pas à », « ne compte pas pour 0 », « ne peut pas », « jamais ». Un trou dans une courbe se
   décrit (« période non saisie »), il ne se nie pas. Le test du catalogue refuse « pas », « jamais »,
   « ne peut » et « ne comptent ».
4. **Un exemple chiffré quand le texte est abstrait**, avec des nombres ronds et plausibles (« 9 sur
   12 actifs, l'outil affiche 75 % »). Il vient après la définition, jamais avant : l'exemple
   « +3 » ne doit pas être pris pour le chiffre affiché. Les nombres ne viennent jamais d'un jeu de
   données réel, et aucun nom de personne ni de ministère réel n'y figure.
5. **Ne répète pas l'écran.** Pas le libellé, pas un texte visible, pas une erreur. Si le libellé se
   comprend seul, il n'y a pas d'aide (test de décision, section 1).
6. **Pas de consigne cachée.** Format, limite, règle de saisie et conséquence d'un choix restent
   visibles sous le champ. Une aide est facultative : l'écran marche sans elle.
7. **120 caractères au plus**, espaces compris, une ou deux phrases. Un texte plus long cache
   plusieurs idées.
8. **Voix active, présent, « vous »** quand l'aide parle de la personne. Pas de « on » vague, pas de
   « il convient de ». Les verbes d'action se disent à l'impératif (« Saisissez », « Indiquez »).
9. **Mots de l'outil** : STARs, ministère, saisie, chiffres, total de l'église, fiche, rappel. Pas de
   jargon : ni « complétude », ni « agrégat », ni « nature », ni « sensible », ni « seuil », ni
   « départ ». On écrit « 6 sur 8 ». Les sigles (FIJ, STAR) ne se développent pas.
10. **Ton neutre et respectueux** : ni excuse, ni familiarité, ni point d'exclamation, ni reproche,
    jamais un mot qui accuse (« invalide », « incorrect »). On informe.
11. **Interdits** : tiret cadratin ou demi-cadratin (aussi comme séparateur), emoji, majuscules
    d'insistance, « cliquez » (l'outil se lit aussi au doigt : « ouvrez », « choisissez »), « ici »,
    « simplement », « juste », « n'oubliez pas ».
12. **Ponctuation française** : « deux-points » précédé d'une espace, guillemets « ainsi ». Un
    nombre d'écart s'écrit « +2 » ou avec le signe moins, jamais un tiret (BRIEF section 9,
    « Formats »). Phrases complètes, avec un point final.
13. **Aucune donnée personnelle**, aucun nom d'exemple : pas de « Jean », pas de nom de ministère
    réel dans un exemple.
14. **Un texte vrai tant que l'outil ne change pas.** Chaque texte est vérifié contre le BRIEF avant
    d'entrer au catalogue ; quand une règle change, le texte change dans le même lot.

Exemples (réécriture du 7 octobre 2026).

| À éviter                                                                                              | À écrire                                                                                                     | Règle    |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------- |
| « L'outil calcule le pourcentage de STARs en FIJ. Vous n'avez pas à le saisir. »                      | « Vos STARs actifs qui participent à une FIJ. Exemple : 9 sur 12 actifs, l'outil affiche 75 %. »             | 2, 3, 4  |
| « 6 dép. sur 8 : il manque deux départements. Ils ne comptent pas pour 0. »                           | « Nombre de départements qui ont un chiffre cette semaine. « 6 dép. sur 8 » : le total n'inclut que ces 6. » | 2, 3     |
| « Les catégories viennent de la coordination. Ce que vous ne répartissez pas s'affiche non réparti. » | « Indiquez combien du total va dans chaque catégorie. Exemple : sur 10, 6 « Malaise » et 4 « Autre ». »      | 2, 4     |
| « Cliquez ici pour comprendre le pourcentage. »                                                       | « Part des STARs actifs qui sont en FIJ. Exemple : 64 en FIJ sur 83 actifs donnent 77 %. »                   | 2, 4, 11 |

Sources de la recherche (consultées le 7 octobre 2026) :

- Nielsen Norman Group, « Tooltip Guidelines » (nngroup.com/articles/tooltip-guidelines) : une
  aide courte est un contenu autonome ; elle explique un champ que la personne ne peut pas deviner,
  jamais une information nécessaire pour finir la tâche ni une consigne de saisie ; pas de texte qui
  répète le libellé.
- Carbon Design System (IBM), « Tooltip usage » (carbondesignsystem.com/components/tooltip/usage) :
  contenu pertinent et précis, phrases complètes pour une définition ; rien d'essentiel dans une
  infobulle, car elle n'est pas persistante ; pas de lien ni de bouton dedans.
- Inclusive Components, « Tooltips & Toggletips » (inclusive-components.design/tooltips-toggletips) :
  pour un terme ou un chiffre à comprendre, un bouton qui s'ouvre au clic ou à Entrée (le
  « toggletip », notre modèle) marche à la souris, au clavier et au doigt ; le contenu est annoncé
  par une région `status`.
- GOV.UK Design System, « Text input » et « Dates » (design-system.service.gov.uk/components/text-input
  et /patterns/dates) : une aide de champ tient en une phrase courte centrée sur l'usage ; un exemple
  chiffré lève l'ambiguïté (« For example, 27 3 2024 »).
- Atlassian Design, « Tooltip usage » (atlassian.design/components/tooltip/usage) : pas de lien ni
  de bouton dans la bulle, pas d'icône, pas d'aide sur un élément désactivé.
- Microsoft Writing Style Guide, « tooltip » (learn.microsoft.com/en-us/style-guide) : bref, avec
  parcimonie, sans répéter le libellé.
- W3C, « Tooltip Pattern » (w3.org/WAI/ARIA/apg/patterns/tooltip) et WCAG 1.4.13 (w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus) :
  une infobulle ne reçoit pas le focus ; son contenu se ferme sans bouger le pointeur ni le focus.
- Nielsen Norman Group, « Placeholders in Form Fields » (nngroup.com/articles/form-design-placeholders) :
  aucune consigne dans un texte qui disparaît à la saisie.
- Sources internes : remarques de la personne responsable du 7 octobre 2026 ; BRIEF sections 3 et 4.

Limites de la recherche : les pages Material Design 3 et Apple HIG n'ont pas pu être lues et ne sont
pas citées. Les règles 5 et 6 (ne pas répéter l'écran, pas de consigne cachée) et l'exemple chiffré
de la règle 4 viennent des sources ci-dessus. Les autres (définition d'abord, ton positif, limite de
120 caractères, voix active, mots de l'outil) sont des choix du projet, appuyés sur la règle de
CLAUDE.md « français simple, voix active » et sur la pratique courante de rédaction claire, sans
qu'une des pages citées les formule mot pour mot.

## 3. Placement et interaction

### Modèle : le toggletip

L'aide suit le modèle **toggletip** : une bulle d'information qui s'ouvre sur un bouton, par une
action volontaire. Ce n'est **pas** une infobulle au survol : un survol n'existe pas au doigt, et au
clavier il est fragile.

- **Forme du bouton (décidée le 6 octobre 2026 par la personne responsable)** : le bouton d'aide est
  **rond**. C'est une exception voulue à la règle « angles droits partout » : c'est le seul élément
  rond de l'outil, ce qui le distingue d'un bouton d'action. La bulle, elle, garde ses angles droits.
- **Bouton** : un petit « ? » rond, **juste après le libellé** (sur la même ligne). Disque visuel de
  **20 px**, **zone cliquable d'au moins 44 px** (`--cible`), centrée sur le disque, sans recouvrir
  un autre contrôle. Le libellé et son bouton sont dans une ligne de 44 px de haut au moins, pour
  que la zone tienne dans sa ligne.
- **Ouverture** : au clic ou au toucher, et au clavier par **Entrée** ou **Espace** (bouton natif).
  **Jamais au survol seul.**
- **Fermeture** : par **Échap**, par un clic ou un toucher **en dehors**, par un **second clic** sur
  le bouton, et quand le focus passe sur une autre commande. Jamais de minuterie.
- **Une seule bulle ouverte** à la fois : ouvrir une aide ferme la précédente.
- **Focus** : il reste sur le bouton, à l'ouverture comme à la fermeture. La bulle n'est pas un
  champ et ne prend pas le focus.
- **Pas d'animation** (la règle `prefers-reduced-motion` du projet suffit ; l'apparition est
  immédiate).

### Deux placements

| Placement     | Quand                                                           | Où s'affiche la bulle                                                                                                                                                          |
| ------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Flux**      | Libellé d'un champ de formulaire (panneaux de saisie)           | **Sous le libellé, dans le flux** : elle pousse le champ vers le bas et ne le recouvre jamais. Elle se ferme, le champ remonte. Pas de calcul de position.                     |
| **Flottante** | Titre ou chiffre d'un écran de lecture (fiche, vue de l'église) | **Sous le libellé** par défaut, **au-dessus** s'il n'y a pas assez de place en dessous (mesure à l'ouverture). Elle ne recouvre ni son bouton, ni le chiffre qu'elle explique. |

Pourquoi deux placements : une bulle flottante sous le libellé d'un formulaire cacherait le champ en
cours de saisie. Dans le flux, elle ne cache rien. Dans une liste ou un tableau en lecture, la
pousser dans le flux ferait sauter les lignes voisines, donc elle flotte.

### Taille et forme de la bulle

- **Largeur maximale 280 px.** Le texte passe à la ligne ; au plus 4 lignes pour 120 caractères.
- **Flèche** de 8 px vers le bouton (en haut de la bulle si elle est dessous, en bas si elle est
  dessus), centrée sur le bouton, même si la bulle est décalée pour rester dans l'écran.
- Fond `--encre`, texte `--papier`, 14 px, interligne 1,45, remplissage 12 px sur 14 px. Pas
  d'ombre, pas de coin arrondi sur la bulle (BRIEF, section 10). Un filet de 1 px de la même
  couleur la garde visible en mode contraste élevé.

### À chaque largeur

| Largeur                    | Comportement                                                                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1440 px** (ordinateur)   | Bulle de 280 px au plus, alignée à gauche du libellé. En panneau de 460 px, elle reste dans le panneau. Si elle dépasserait le bord droit de sa colonne, elle se décale vers la gauche ; la flèche garde la position du bouton.                  |
| **834 px** (tablette)      | Comme à 1440 px. Le panneau de saisie de 460 px est à droite : la bulle ne sort jamais du panneau.                                                                                                                                               |
| **390 px** (téléphone)     | La bulle prend **toute la largeur de la colonne de contenu** (la page moins la marge latérale), pas plus de 280 px au-delà de 600 px. La flèche pointe toujours le bouton. En page entière, la bulle d'un champ proche du bas s'ouvre au-dessus. |
| **360 px et zoom à 200 %** | Aucun défilement horizontal. Le texte passe à la ligne, la bulle ne dépasse jamais la fenêtre.                                                                                                                                                   |

### Combien d'aides

- **Au plus une par champ** et **au plus quatre par formulaire**. Au-delà, le formulaire est mal
  libellé : améliorer les libellés d'abord.
- **Au plus six par écran de lecture** (fiche, accueil, vue de l'église), et **une même aide ne
  paraît qu'une fois par écran** (à sa première occurrence : la première ligne calculée, le premier
  chiffre avec complétude).
- Pas d'aide sur un bouton, sur un titre de page, ni sur un état vide.
- Une aide absente vaut mieux qu'une aide inutile : le catalogue ci-dessous est un plafond, pas un
  objectif.

## 4. Accessibilité

Critères visés (WCAG 2.2, niveau AA) :

| Critère                                  | Ce que fait l'aide                                                                                                                                                                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1.4.13** Contenu au survol ou au focus | Ouverte par un clic, elle n'entre pas dans le champ strict du critère, mais elle le respecte : **fermable** sans bouger le pointeur ni le focus (Échap), **survolable** (le pointeur peut aller sur la bulle sans qu'elle se ferme), **persistante** (aucune minuterie). |
| **2.5.8** Taille de la cible             | Zone de 44 px, au-dessus du minimum de 24 px, sans recouvrement d'un autre contrôle.                                                                                                                                                                                     |
| **4.1.2** Nom, rôle, valeur              | Un vrai `<button type="button">`, `aria-expanded` (`true` ou `false`), `aria-controls` vers la bulle, nom accessible **« Aide : <libellé> »** (« Aide : STARs actifs »).                                                                                                 |
| **4.1.3** Messages d'état                | Le texte de la bulle est annoncé à l'ouverture : la bulle est dans une région `role="status"` (`aria-live="polite"`), présente dans le DOM avant l'ouverture et remplie à l'ouverture, pour que les lecteurs d'écran l'annoncent.                                        |
| **1.4.3** Contraste du texte             | `--papier` sur `--encre` : 17,8:1. Le « ? » est en `--encre` sur `--papier`.                                                                                                                                                                                             |
| **1.4.11** Contraste des composants      | Bordure du bouton en `--encre-2` sur `--papier` : 8,95:1 (3:1 demandé). Bouton ouvert : fond `--encre`, « ? » en `--papier`, pour que l'état se voie sans la couleur seule.                                                                                              |
| **2.1.1** Clavier                        | Entrée et Espace ouvrent, Échap ferme, l'ordre de tabulation est celui du libellé puis du champ (le bouton est juste après le libellé).                                                                                                                                  |
| **2.4.7** et **2.4.11** Focus            | Focus visible (`:focus-visible` global, 2 px `--encre`). Une bulle flottante ne recouvre jamais le bouton qui a le focus.                                                                                                                                                |
| **1.4.10** Redistribution                | À 320 px de large et 400 % de zoom : aucun défilement horizontal, texte complet.                                                                                                                                                                                         |
| **1.4.12** Espacement du texte           | La bulle grandit avec le texte, sans coupure.                                                                                                                                                                                                                            |

Règles associées :

- Le bouton est **hors du `<label>`** : un bouton dans un libellé en capterait le clic et ouvrirait
  le champ. Il est son voisin, dans la même ligne.
- Le bouton n'est jamais dans un titre `<h1>` à `<h3>` : le nom du titre garderait « Aide : ... ».
- Pas de `title`, pas de `tabindex` positif, pas de `aria-describedby` vers la bulle (la région
  `status` suffit, et le champ ne doit pas répéter l'aide à chaque focus).
- Le texte visible sous un champ (« Si personne n'a servi, enregistrez 0. ») garde son
  `aria-describedby` : il est nécessaire, l'aide ne l'est pas.
- Les couleurs viennent des tokens (aucune valeur en dur) ; mode contraste élevé : la bulle garde sa
  bordure.

## 5. Composant

### Fichiers

| Fichier                                   | Rôle                                                                                     |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/components/aide/Aide.tsx`            | Le bouton « ? » et sa bulle                                                              |
| `src/components/aide/LibelleAvecAide.tsx` | La ligne libellé et aide, pour les formulaires (garde le bouton hors du `<label>`)       |
| `src/components/aide/textesAide.ts`       | Le catalogue : code, texte (une seule source des textes)                                 |
| `src/components/aide/Aide.test.tsx`       | Tests unitaires du composant                                                             |
| `src/components/aide/textesAide.test.ts`  | Tests du catalogue (longueur, ponctuation, interdits, un code utilisé au moins une fois) |
| `e2e/aide.spec.ts`                        | Parcours Playwright sur les aperçus (lecture seule, sans écriture)                       |

Un lot qui a besoin d'une aide n'écrit pas de texte dans son composant : il ajoute son code à
`textesAide.ts`, validé par le test du catalogue.

### Props

```ts
type CodeAide = keyof typeof TEXTES_AIDE // « dimanche.actifs », « eglise.completude », ...

interface AideProps {
  code: CodeAide
  /** Libellé du champ ou du chiffre, pour le nom accessible « Aide : <libellé> ». */
  libelle: string
  /** « flux » (défaut) : sous le libellé, dans le flux. « flottante » : écrans de lecture. */
  placement?: 'flux' | 'flottante'
}
```

`LibelleAvecAide` prend `htmlFor`, `libelle`, `code`, et rend `<label>` puis `<Aide>` dans une ligne
`flex flex-wrap items-center` de 44 px de haut au moins. La bulle en flux prend toute la largeur de
cette ligne (`basis-full`), donc passe sous le libellé sans calcul.

### Tokens

Aucune couleur en dur, aucune dépendance nouvelle.

| Usage                    | Token                                                       |
| ------------------------ | ----------------------------------------------------------- |
| Fond de la bulle, flèche | `--encre`                                                   |
| Texte de la bulle        | `--papier`                                                  |
| Bordure du bouton, « ? » | `--encre-2`, `--encre`                                      |
| Fond du bouton           | `--papier` (fermé), `--encre` (ouvert, « ? » en `--papier`) |
| Zone cliquable           | `--cible` (44 px)                                           |
| Forme du bouton          | Disque rond (arrondi complet), le seul de l'outil           |
| Police                   | `--f-interface`, 14 px dans la bulle, 700 pour le « ? »     |
| Focus                    | focus global du projet                                      |

Deux variables du composant, `--aide-disque: 20px` et `--aide-largeur: 280px`, posées par W0
dans `src/index.css` avec la classe `.aide-forme` : `src/styles/tokens.css` reste la copie de la
référence et ne reçoit aucun token nouveau.

### Réalisation

- React et CSS seuls (classes Tailwind sur les tokens, comme le reste du code). **Aucune dépendance**
  : ni Floating UI, ni Radix, ni le `Tooltip` de shadcn, qui est une infobulle au survol et ne
  convient pas.
- État local `ouvert`. Un petit contexte ou un événement de document ferme l'aide précédente. Les
  écouteurs de document (clic extérieur, Échap, `focusin`) ne vivent que pendant l'ouverture.
- Placement flottant : une mesure à l'ouverture (`getBoundingClientRect`) choisit dessous ou
  dessus, et décale la bulle pour qu'elle reste dans la colonne.
- Les aides de lecture s'affichent pour tous les profils listés au catalogue, EJP Tech compris : une
  aide n'est pas une action, elle ne contredit pas la lecture seule (T29).

### Tests

**Unitaires** (Vitest, `@testing-library/user-event`) :

- un clic ouvre, `aria-expanded` passe à `true`, le texte est dans la région `status` ;
- Entrée et Espace ouvrent ; Échap ferme et le focus reste sur le bouton ;
- un clic en dehors ferme ; un second clic ferme ; le focus sur une autre commande ferme ;
- le survol seul n'ouvre pas ;
- ouvrir une seconde aide ferme la première ;
- le nom accessible est « Aide : STARs actifs » ;
- le bouton est hors du `<label>` dans `LibelleAvecAide` ;
- catalogue : chaque texte fait 120 caractères au plus, au plus deux phrases, sans tiret cadratin ni
  demi-cadratin, sans emoji, sans « cliquez » ni « ici », sans point d'exclamation ; chaque code est
  utilisé au moins une fois dans le code ; les codes en double sont refusés.

**Parcours Playwright** (`e2e/aide.spec.ts`, aperçus sans écriture, 1440, 834 et 390 px) :

- ouvrir chaque aide du formulaire du dimanche et de la fiche ; la bulle est entièrement dans la
  fenêtre ; sa largeur est de 280 px au plus, ou celle de la colonne à 390 px ;
- **en flux, la bulle ne recouvre pas le champ** (boîtes englobantes disjointes) ; en flottante,
  elle ne recouvre pas son bouton ni son chiffre ;
- la zone du bouton fait 44 px au moins dans les deux sens ;
- au plus quatre boutons d'aide par formulaire, six par écran de lecture ;
- audit `axe` avec une bulle ouverte (contraste, noms, rôles) ;
- aucun défilement horizontal à 360 px, bulle ouverte ;
- parcours au clavier : Tab, Entrée, Échap ; le focus ne bouge pas.

## 6. Catalogue

Statut de tous les textes : **Proposé, réécrit le 7 octobre 2026 après les remarques de la personne
responsable**, à valider par elle. La colonne « Car. » donne le nombre de caractères (120 au plus).
Placement : **Flux** ou **Flottante** (section 3). Profils : ceux qui voient l'écran ; EJP Tech lit
les écrans de lecture, mais n'a aucun écran de saisie (T29).

### Ce qui change le 7 octobre 2026

Remarques de la personne responsable : une aide dit ce que la personne doit comprendre, pas ce
qu'elle ne doit pas savoir ; « Répartition par catégories » n'était pas claire ; le berger et le
conseil ont besoin des valeurs exactes ; un STAR ne sert jamais dans deux ministères un dimanche.
Chaque texte est réécrit selon les règles de la section 2 et vérifié contre le BRIEF.

- **Textes de la personne responsable, repris** : `dimanche.service` (avec « qui ont servi dans votre
  ministère », pour ne pas la confondre avec « actifs ») et `dimanche.propres`.
- **`mois.sensible`** : le berger, le conseil et EJP Tech voient les valeurs exactes. Le texte
  d'aide l'écrit déjà. La base et la fiche livrent les valeurs exactes depuis le lot I (P52,
  migration `20261009120000_lot_i_correctifs.sql`). Le texte du BRIEF (section 4, « seuil moins de
  3 »), P35, P45 et P47 reste à mettre à jour par le lot qui tient ces documents.
- **`mois.repartition`** : le texte dit quoi faire, avec un exemple. Le titre visible devient
  « Détail du total par catégorie (facultatif) » (un libellé clair vaut mieux qu'une aide qui le
  compense, test de décision 2).
- **STAR compté deux fois** : le champ « déjà comptés par leur ministère principal » n'existe que
  pour les sessions (Bâtir l'Église, Anti-Dispersion), jamais le dimanche (D2, règle 5).
  `session.dejaComptes` reste donc. Retirer aussi ce champ des sessions changerait D2 et la règle 5 :
  il faut la confirmation de la personne responsable.

### Saisie du dimanche (maquette 08, lot E3)

Quatre aides, le plafond d'un formulaire. Les textes visibles de la maquette restent affichés.

| Code               | Champ ou bloc                                | Texte                                                                                                        | Car. | Placement | Profils   |
| ------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---- | --------- | --------- |
| `dimanche.service` | STARs au service ce dimanche                 | C'est l'ensemble des STARs qui ont servi dans votre ministère ce dimanche, et l'écart avec dimanche dernier. | 108  | Flux      | ministère |
| `dimanche.actifs`  | STARs actifs                                 | Les STARs dont votre ministère est le ministère principal, qu'ils aient servi ou non ce dimanche.            | 97   | Flux      | ministère |
| `dimanche.enFij`   | Dont en FIJ                                  | Vos STARs actifs qui participent à une FIJ. Exemple : 9 sur 12 actifs, l'outil affiche 75 %.                 | 92   | Flux      | ministère |
| `dimanche.propres` | Titre du groupe des indicateurs du ministère | Ces chiffres s'affichent sur votre fiche, avec leur courbe.                                                  | 59   | Flux      | ministère |

`dimanche.propres` ne paraît que si le ministère a au moins un indicateur propre du dimanche ; une
seule aide pour le groupe, jamais une par indicateur.

### Chiffres du mois (lot E3)

| Code               | Champ ou bloc                                                                                                   | Texte                                                                                                               | Car. | Placement | Profils   |
| ------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---- | --------- | --------- |
| `mois.periode`     | Titre « Chiffres de septembre » (choix du mois)                                                                 | Le total du mois choisi. Pour le mois en cours, saisissez le total à ce jour, puis le total complet en fin de mois. | 115  | Flux      | ministère |
| `mois.sensible`    | Champ d'un indicateur de santé, d'écoute, d'accompagnement ou d'enfants                                         | Saisissez la valeur exacte. Seuls votre ministère, le berger, le conseil et EJP Tech la voient.                     | 95   | Flux      | ministère |
| `mois.repartition` | Titre de la grille « Détail du total par catégorie (facultatif) » d'un indicateur sensible qui a des catégories | Indiquez combien du total va dans chaque catégorie. Exemple : sur 10, 6 « Malaise » et 4 « Autre ».                 | 99   | Flux      | ministère |
| `mois.aValider`    | Champ d'un indicateur marqué « à valider »                                                                      | Indicateur en attente de validation par EJP Tech. Saisissez-le déjà : vos chiffres compteront s'il est validé.      | 110  | Flux      | ministère |

`mois.sensible`, `mois.aValider` et `mois.repartition` sont conditionnelles : elles ne s'affichent
que sur les champs concernés, une fois par formulaire. Avec elles, le formulaire atteint le plafond
de quatre aides : le champ « Précision » n'a pas d'aide, parce que ce qu'il faut savoir avant
d'écrire (qui la lit, le rappel sur les données personnelles) est un texte visible (section 8).

Textes visibles du champ « Précision » et de la grille (P46, P47, statut Proposé). Le titre de la
grille change.

| Élément                                                  | Texte                                                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Libellé du champ                                         | Précision (facultatif)                                                                     |
| Texte visible sous le libellé                            | Lue par votre ministère, le berger, le conseil et EJP Tech.                                |
| Rappel sous le premier champ « Précision » du formulaire | N'écrivez aucun nom ni information personnelle. Les champs libres sont relus par EJP Tech. |
| Compteur                                                 | 0 sur 280                                                                                  |
| Précision déjà envoyée pour ce mois                      | « Précision actuelle : », suivi du texte (un champ vide la laisse en place)                |
| Erreur du champ                                          | Écrivez au moins 10 caractères, ou laissez la précision vide.                              |
| Titre de la grille                                       | Détail du total par catégorie (facultatif)                                                 |
| Ligne calculée sous la grille                            | Non réparti : 3                                                                            |
| Erreur sous la grille                                    | La somme des catégories (9) dépasse le total du mois (7).                                  |

### Saisie d'une session (maquette 09, lot E4)

Deux aides. `session.completude` est supprimée (voir « Aides supprimées » ci-dessous).

| Code                  | Champ ou bloc                                      | Texte                                                                                                                   | Car. | Placement | Profils   |
| --------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---- | --------- | --------- |
| `session.presents`    | « STARs de votre ministère présents »              | Tous les STARs qui servent dans votre ministère et sont venus à la session, même si leur ministère principal est autre. | 119  | Flux      | ministère |
| `session.dejaComptes` | « Dont déjà comptés par leur ministère principal » | Parmi vos présents, ceux dont le ministère principal est un autre ministère : ce ministère les compte déjà.             | 107  | Flux      | ministère |

### Carte des FIJ et Chiffres par département (lot E4)

| Code                | Champ ou bloc                                                          | Texte                                                                                                                   | Car. | Placement | Profils                                  |
| ------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---- | --------- | ---------------------------------------- |
| `fij.carte`         | Panneau « Carte des FIJ » (titre de la saisie)                         | Le nombre actuel de FIJ dans chaque département. La carte de l'église, vue par tous les comptes, l'affiche dès l'envoi. | 119  | Flux      | ministère FIJ                            |
| `fij.departements`  | Panneau « Chiffres par département » (titre de la saisie)              | Le berger et le conseil les lisent sur votre fiche : un total par rubrique, avec sa courbe.                             | 91   | Flux      | ministère FIJ                            |
| `fij.completudeDep` | Total d'une rubrique dans le bloc « Chiffres par département » (fiche) | Nombre de départements qui ont un chiffre cette semaine. « 6 dép. sur 8 » : le total n'inclut que ces 6.                | 104  | Flottante | ministère FIJ, berger, conseil, EJP Tech |

### Ajouter et mettre à jour un événement (maquette 11, lot E5)

Deux aides à l'ajout (« Statut », « Ministères mentionnés »), une à la mise à jour (« Statut »).
`evenement.date` et `evenement.report` sont supprimées. Les textes visibles (« La validation se fait
en dehors de l'outil. Ici, on reporte seulement le statut. » et la note sur les mentions) restent.

| Code                 | Champ ou bloc                     | Texte                                                                                                           | Car. | Placement | Profils   |
| -------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---- | --------- | --------- |
| `evenement.statut`   | « Statut » (ajout et mise à jour) | Mettez-le à jour dès que la validation est connue. Encore en attente 3 jours avant la date, il passe en alerte. | 111  | Flux      | ministère |
| `evenement.mentions` | « Ministères mentionnés » (ajout) | Ils reçoivent aussi son alerte s'il reste en attente. Seul votre ministère change son statut.                   | 93   | Flux      | ministère |

### Prochaine réunion (lot E5)

| Code               | Champ ou bloc         | Texte                                                                                            | Car. | Placement | Profils   |
| ------------------ | --------------------- | ------------------------------------------------------------------------------------------------ | ---- | --------- | --------- |
| `reunion.date`     | « Date »              | Le berger et le conseil la voient jusqu'au jour de la réunion. Ensuite, déclarez la suivante.    | 93   | Flux      | ministère |
| `reunion.decision` | « Décision attendue » | Ce que la réunion doit trancher, en une phrase. Exemple : choisir la date de la sortie d'équipe. | 96   | Flux      | ministère |

### Fiche d'un ministère (maquettes 04 et 12, lot E2)

Quatre aides au plus à l'écran, sur les lignes concernées, chacune une seule fois. Avec le bloc
« Chiffres par département » de la fiche de Coordo FIJ, cinq.

| Code               | Champ ou bloc                                          | Texte                                                                                                               | Car. | Placement | Profils                              |
| ------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ---- | --------- | ------------------------------------ |
| `fiche.sommeAnnee` | Somme de l'année, à côté de « 9 mois sur 9 »           | Total des mois ou dimanches saisis depuis la date indiquée. « 8 mois sur 9 » : un mois non saisi manque au total.   | 113  | Flottante | ministère, berger, conseil, EJP Tech |
| `fiche.calcule`    | Première ligne d'un indicateur calculé                 | Calculé à partir de deux chiffres du ministère. Exemple : 30 présences pour 10 séances donnent 3 par séance.        | 108  | Flottante | ministère, berger, conseil, EJP Tech |
| `fiche.courbe`     | En-tête de la colonne des petites courbes (ordinateur) | Évolution sur les 10 derniers dimanches ou les 12 derniers mois. Un trou marque une période non saisie.             | 103  | Flottante | ministère, berger, conseil, EJP Tech |
| `fiche.fraicheur`  | « Mis à jour il y a 3 jours »                          | Dernière action du ministère dans l'outil, saisie ou point. Vert jusqu'à 7 jours, orange jusqu'à 30, rouge au-delà. | 115  | Flottante | ministère, berger, conseil, EJP Tech |

`fiche.fraicheur` : les seuils de 7 et 30 jours (règle 6) restent à confirmer.

### Vue de l'église (écrans 01 à 03, déjà construits)

Cinq aides au plus par écran. Sur la vue du ministère, « L'église cette semaine » porte les mêmes
aides.

| Code                    | Champ ou bloc                                         | Texte                                                                                                                    | Car. | Placement | Profils                   |
| ----------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---- | --------- | ------------------------- |
| `eglise.completude`     | Premier « 6 sur 8 » du tableau des chiffres           | Ministères qui ont saisi ce chiffre. « 6 sur 8 » : le total additionne ces 6 ministères, 2 manquent encore.              | 107  | Flottante | tous                      |
| `eglise.pourcentageFij` | Ligne « STARs présents en FIJ » (pourcentage calculé) | Part des STARs actifs qui sont en FIJ. Exemple : 64 en FIJ sur 83 actifs donnent 77 %.                                   | 86   | Flottante | tous                      |
| `eglise.ecart`          | Premier écart du tableau (« +3 »)                     | Différence avec dimanche dernier, sur les seuls ministères qui ont saisi les deux fois. « +3 » : 3 de plus.              | 107  | Flottante | tous                      |
| `eglise.courbe`         | En-tête de la colonne des courbes (ordinateur)        | Évolution du total sur les derniers dimanches ou sessions. Cercle vide : des ministères manquent ; trou : aucune saisie. | 120  | Flottante | berger, conseil, EJP Tech |
| `eglise.carte`          | Titre « Carte des FIJ »                               | Nombre de FIJ par département. Plus la case est foncée, plus le département a de FIJ par rapport aux autres.             | 108  | Flottante | tous                      |

`eglise.carte` : l'échelle des teintes est relative aux autres départements (de la plus petite à la
plus grande valeur de la carte, `carte.ts`), le texte le dit. `eglise.courbe` vaut pour les lignes
des dimanches (10 derniers) comme pour celles des sessions (4 dernières).

### Accueil du ministère et blocs d'alerte (lots E6 et E7)

| Code                 | Champ ou bloc                                         | Texte                                                                                              | Car. | Placement | Profils                   |
| -------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---- | --------- | ------------------------- |
| `accueil.points`     | Titre « Vos points » (accueil, maquette 07)           | Les points créés par votre ministère ou qui le mentionnent. Un point traité reste affiché 7 jours. | 98   | Flottante | ministère                 |
| `accueil.aConfirmer` | Titre « Événements à confirmer » (sous « À décider ») | Événements encore « En attente de validation » à 3 jours ou moins de leur date, ou déjà passés.    | 95   | Flottante | berger, conseil, EJP Tech |

### Aides supprimées le 7 octobre 2026

| Code                 | Aide                                               | Raison                                                                               | Écran qui doit retirer son appel                         |
| -------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `session.completude` | « Ministères qui ont déjà saisi »                  | La ligne affiche déjà « 6 sur 8 » et les ministères qui manquent                     | `FormulaireSession.tsx` (`LigneAvecAide`)                |
| `evenement.date`     | « Date »                                           | Le libellé se comprend seul ; l'ancien texte disait ce que l'outil ne garde pas      | `FormulaireAjoutEvenement.tsx` (`aide="evenement.date"`) |
| `evenement.report`   | Ligne « Report : du sam. 10 oct. au sam. 17 oct. » | La ligne se comprend seule ; ce que voient le berger et le conseil n'est pas vérifié | `FormulaireMiseAJourEvenement.tsx`                       |
| `fiche.moinsDe3`     | Valeur « moins de 3 »                              | Devenue fausse : valeurs exactes pour le berger, le conseil et EJP Tech (P52)        | Déjà retiré par le lot I                                 |
| `fiche.repartition`  | Case « masqué » d'une répartition                  | Devenue fausse : plus de case masquée (P52)                                          | Déjà retiré par le lot I                                 |

Tant qu'un écran appelle un de ces codes, le code reste dans `textesAide.ts` (liste
`CODES_A_RETIRER`) avec son ancien texte, pour que le build passe. Au 7 octobre 2026, trois codes y
restent : `session.completude`, `evenement.date` et `evenement.report`. Les deux codes de la fiche
sont déjà sortis du catalogue, car le lot I (migration `20261009120000_lot_i_correctifs.sql`, P52)
n'affiche plus que des valeurs exactes. Reste à mettre à jour, hors de ce document : le BRIEF
(section 4), P35, P45 et P47, qui parlent encore du seuil « moins de 3 ».

### Total du catalogue

28 aides (33 avant le 7 octobre 2026, moins cinq). Par écran : saisie du dimanche 4, Chiffres du
mois 4, session 2, carte 1, départements 2 (saisie et lecture), événement 2 à l'ajout et 1 à la
mise à jour, réunion 2, fiche 4 (5 pour Coordo FIJ), vue de l'église 5, accueil 2 au plus.

## 7. Signaler une difficulté

Demande de la personne responsable (6 octobre 2026) : un ministère doit pouvoir **signaler qu'il a
une difficulté**, par exemple quand il ne peut pas choisir une date. Cette section contient les
textes ; le modèle, les droits et les lots (B7 et E8) sont décrits par T39 de `docs/decisions.md`
et le plan de l'étape 4. Le principe est **décidé** le 6 octobre 2026 (question 14) : le signalement
n'est lu que par le ministère qui l'écrit et par EJP Tech. Statut des textes : **Proposé**.

### Où le lien apparaît

- Dans le **message de date refusée** du formulaire d'événement (ajout et mise à jour), en toutes
  lettres.
- **En bas de chaque formulaire de saisie** (dimanche, mois, session, carte des FIJ, chiffres par
  département, événement, prochaine réunion), sous les boutons, comme un lien ordinaire (pas un
  bouton, pas une aide).

Un problème de compte ou de connexion ne passe pas par ce lien : un ministère qui ne peut pas se
connecter écrit à l'administration.

### Les textes

| Élément                                                                         | Texte                                                                                                                            |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Lien                                                                            | Signaler une difficulté                                                                                                          |
| Titre du panneau                                                                | Signaler une difficulté                                                                                                          |
| Phrase sous le titre                                                            | EJP Tech lit votre signalement. Décrivez ce qui vous bloque en une ou deux phrases.                                              |
| Ligne de contexte (remplie par l'outil)                                         | Écran concerné : Ajouter un événement                                                                                            |
| Libellé du champ                                                                | Quelle difficulté rencontrez-vous ?                                                                                              |
| Rappel sous le champ (le rappel du formulaire, une seule fois)                  | N'écrivez aucun nom ni information personnelle. Les champs libres sont relus par EJP Tech.                                       |
| Compteur                                                                        | 0 sur 280                                                                                                                        |
| Erreur du champ (visible, sous le champ)                                        | Décrivez la difficulté (10 caractères au moins).                                                                                 |
| Bouton principal                                                                | Envoyer le signalement                                                                                                           |
| Bouton secondaire                                                               | Annuler                                                                                                                          |
| Bouton pendant l'envoi                                                          | Envoi en cours                                                                                                                   |
| Erreur de formulaire (sous le bouton)                                           | La connexion a échoué. Votre message est encore dans le formulaire : réessayez.                                                  |
| Confirmation (6 s, `role="status"`)                                             | Signalement envoyé. EJP Tech le lira.                                                                                            |
| Date refusée, ajout (sous le champ date)                                        | Cette date est passée. Choisissez aujourd'hui ou une date à venir. Vous ne pouvez pas choisir de date ? Signaler une difficulté  |
| Date refusée, mise à jour (sous le champ date)                                  | La nouvelle date doit être aujourd'hui ou plus tard. Vous ne pouvez pas choisir de date ? Signaler une difficulté                |
| Ligne identique, mise à jour (sans lien)                                        | Rien n'a changé : ce statut et cette date sont déjà enregistrés.                                                                 |
| Bloc EJP Tech : titre                                                           | Signalements                                                                                                                     |
| Bloc EJP Tech : sous-titre                                                      | Difficultés signalées par les ministères                                                                                         |
| Bloc EJP Tech : état vide (situation « tout est fait », le bloc garde sa place) | Aucun signalement. Les difficultés signalées par les ministères arriveront ici.                                                  |
| Bloc EJP Tech : ligne                                                           | Communication, Ajouter un événement, 6 oct., puis le texte du signalement (champ libre, masquable par EJP Tech)                  |
| Bouton secondaire, une fois le signalement envoyé (proposé, E8)                 | Fermer                                                                                                                           |
| Bloc EJP Tech : compteur (proposé, E8)                                          | 2 signalements ouverts (Aucun signalement ouvert)                                                                                |
| Bloc EJP Tech : état sans ouvert, quand des clos suivent (proposé, E8)          | Aucun signalement ouvert. Les prochains arriveront ici.                                                                          |
| Bloc EJP Tech : sous-titre des clos (proposé, E8)                               | Clos ces 30 derniers jours                                                                                                       |
| Bloc EJP Tech : bouton d'une ligne ouverte (proposé, E8)                        | Clore le signalement                                                                                                             |
| Bloc EJP Tech : ligne close (proposé, E8)                                       | Clos le 8 oct., puis « Commentaire : » et le commentaire de clôture (champ libre, masquable)                                     |
| Clôture : libellé du champ (proposé, E8)                                        | Commentaire (facultatif)                                                                                                         |
| Clôture : note sous le libellé (proposé, E8)                                    | Vous avez transmis ce qui concerne l'administration ? Écrivez « transmis à l'administration ». Le ministère lira ce commentaire. |
| Clôture : avertissement (proposé, E8)                                           | Une clôture est définitive.                                                                                                      |
| Clôture : boutons (proposé, E8)                                                 | Clore définitivement (Clôture en cours) ; Annuler                                                                                |
| Clôture : confirmation (proposé, E8)                                            | Signalement clos.                                                                                                                |
| Clôture : refus, déjà clos (message de la base)                                 | Ce signalement est déjà clos.                                                                                                    |
| Ministère : titre sous le formulaire (proposé, E8)                              | Vos derniers signalements                                                                                                        |
| Ministère : état d'une ligne (proposé, E8)                                      | Ouvert ; Clos le 8 oct.                                                                                                          |
| Ministère : réponse (proposé, E8)                                               | Réponse d'EJP Tech : puis le commentaire de clôture (champ libre, masquable)                                                     |
| Écran Modération, en attendant l'étape 6 (proposé, E8)                          | La relecture des champs libres sera disponible prochainement.                                                                    |

Dans les deux messages de date refusée, « Signaler une difficulté » est le lien ; le reste est du
texte. Le message d'erreur garde `aria-describedby` et reste visible à côté du champ (section 1).

La phrase sous le titre dit qui lit le signalement : EJP Tech seul, puisque l'administration, le
berger et le conseil ne lisent aucun signalement (décision du 6 octobre 2026, question 14).

Note : les deux messages de date refusée remplacent « Choisissez une date à venir. » de
`LISEZMOI.md` pour l'ajout et le texte proposé « La nouvelle date doit être aujourd'hui ou plus
tard. » du plan (lot E5) pour la mise à jour : même sens, avec la sortie en plus.

### Ce que cela demande (T39, question 14)

Le signalement contient un **champ libre** : il suit donc toutes les règles des champs libres
(rappel une fois, 280 caractères, relecture et masquage par EJP Tech, jamais recopié dans le
journal). La décision T39 (lots B7 et E8 du plan) : tables `signalement` (ministère, écran
concerné parmi une liste fermée, texte de 10 à 280 caractères) et `signalement_suivi` (une seule
clôture par EJP Tech, commentaire facultatif), en ajout seulement ; fonctions `signaler_difficulte`
et `clore_signalement` ; codes de journal `difficulte_signalee` et `signalement_clos`, sans texte ;
couples de modération (`signalement`, `texte`) et (`signalement_suivi`, `commentaire`) ; lecture
par le ministère pour les siens, par EJP Tech pour tous, rien pour l'administration de l'église,
le berger et le conseil (l'administration ne voit ni les pages des ministères ni les points, et un
signalement parle du contenu d'une page). EJP Tech transmet à l'administration ce qui la concerne
et écrit « transmis à l'administration » en clôturant. Ce changement de modèle est approuvé.

## 8. Ce qui n'est pas une aide

Textes envisagés puis écartés, avec la raison. Les écrans les disent déjà, ou ils sont nécessaires
pour remplir.

| Candidat                                                                      | Décision                     | Raison                                                                                              |
| ----------------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------- |
| « Un STAR saisi par deux ministères n'est compté qu'une fois »                | Texte visible (déjà prévu)   | Note sous le tableau et ligne de la session, BRIEF section 9                                        |
| « Non calculé : demandes reçues de septembre non saisies. »                   | Texte visible (déjà prévu)   | État vide du calcul, plan E2 : la raison est dite dans la ligne                                     |
| « À valider par EJP Tech depuis 2 jours. Vous pouvez déjà le saisir. »        | Texte visible (déjà prévu)   | Plan E2 : aucune aide en plus sur la fiche                                                          |
| « Se saisit une fois le mois fini. » (mois en cours d'un sensible)            | **Retiré le 6 octobre 2026** | Le mois en cours d'un sensible se saisit (P45) : le champ ne manque plus                            |
| Qui lit la « Précision » (« Lue par votre ministère, le berger, ... »)        | Texte visible                | Nécessaire avant d'écrire, comme pour le signalement (P46)                                          |
| « Non réparti : 3 » sous la grille de répartition                             | Texte visible                | Calculé en direct, sert à chaque saisie (P47)                                                       |
| « La somme des catégories (9) dépasse le total du mois (7). »                 | Texte visible (erreur)       | Une erreur reste visible à côté du champ (section 1)                                                |
| Format de l'heure (« 10 h 42 »), unité, plafond d'un chiffre                  | Texte visible                | Nécessaire pour remplir ; la définition est déjà sous chaque champ (plan E3)                        |
| « Les mentions se choisissent à la création et ne changent plus. »            | **Texte visible à ajouter**  | Nécessaire : on ne peut pas ajouter une mention après (T32). À proposer au lot E5 sous les mentions |
| Le bouton principal change le dimanche à midi                                 | Rien                         | Note de conception de la maquette 07 que `LISEZMOI.md` interdit d'afficher                          |
| Ce qu'est un « ministère principal »                                          | Rien                         | Convention entre les personnes, que l'outil ne stocke pas et ne définit pas (BRIEF règle 4)         |
| Développer « FIJ » ou « STAR »                                                | Rien                         | L'outil ne développe ces sigles nulle part : la personne responsable les connaît                    |
| Aide sur les boutons « Corriger », « Saisir », « Mettre à jour »              | Rien                         | Un bouton dit ce qu'il fait (CLAUDE.md, « Textes de l'interface »)                                  |
| Ministères qui ont déjà saisi (session), date d'un événement, ligne de report | **Retiré le 7 octobre 2026** | Le libellé ou la ligne se comprend seul (test de décision 2 et 3), voir « Aides supprimées »        |
| « Moins de 3 » et case « masqué » pour le berger et le conseil                | **Retiré le 7 octobre 2026** | Le berger, le conseil et EJP Tech voient les valeurs exactes ; le code part avec la migration       |

## 9. Où cela entre dans le plan de l'étape 4

Le plan de l'étape 4 reprend cette répartition (W0, E2 à E8 et I, T38) :

| Lot | Ce qu'il fait des aides                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| W0  | Écrit `Aide`, `LibelleAvecAide`, `textesAide.ts` (tous les textes du catalogue), leurs tests et `e2e/aide.spec.ts` : c'est une brique partagée, avec `EtatVide`          |
| E2  | Branche les aides de la fiche (`fiche.*`, sauf `fiche.moinsDe3` et `fiche.repartition`, supprimées le 7 octobre 2026)                                                    |
| E3  | Branche `dimanche.*` et `mois.*` (dont `mois.repartition` depuis le 6 octobre 2026), et le lien « Signaler une difficulté » de ses formulaires                           |
| E4  | Branche `session.*`, `fij.carte`, `fij.departements` et `fij.completudeDep` (bloc « Chiffres par département », écrit par E4), et le lien de ses formulaires             |
| E5  | Branche `evenement.*`, `reunion.*`, le lien et les messages de « Signaler une difficulté »                                                                               |
| E8  | Écrit le formulaire « Signaler une difficulté » et le bloc « Signalements » avec les textes de la section 7                                                              |
| E6  | Branche `accueil.aConfirmer` ; E7 branche `accueil.points`                                                                                                               |
| I   | Branche `eglise.*` sur la vue de l'église (écrans de l'étape 3) ; passe l'audit `axe` et les captures avec bulle ouverte ; reporte les textes retenus dans `LISEZMOI.md` |

Effort retenu par le plan : 1 jour pour le composant et ses tests (W0), 0,25 jour par lot d'écran
de E2 à E7 (1,5 jour), parce que chaque lot teste aussi ses aides au clavier et dans l'audit axe,
et 0,25 jour en I pour la vue de l'église (T38). « Signaler une difficulté » compte 3 jours à part (B7 et E8).

## 10. Points à confirmer

1. **Le « ? » rond. Décidé le 6 octobre 2026 par la personne responsable.** Les maquettes et le
   BRIEF (section 10) disent « angles droits partout ». Le bouton d'aide est rond : exception
   voulue, c'est le seul élément rond, ce qui le distingue d'un bouton d'action. Plus rien à
   confirmer sur ce point.
2. **Fond sombre de la bulle** (`--encre` avec texte `--papier`) plutôt qu'une bulle claire à filet.
   Choisi pour qu'elle se détache d'un panneau blanc sans ombre. À confirmer.
3. **Les deux placements** (Flux dans les formulaires, Flottante en lecture) : la bulle d'un
   formulaire pousse le champ au lieu de le recouvrir. À confirmer, car le champ descend de 2 à
   4 lignes quand la bulle est ouverte.
4. **Les 28 textes** du catalogue, un par un. Deux dépendent d'un fait à vérifier avec le lot
   concerné : `eglise.carte` (l'échelle des teintes est relative aux autres départements, comme dans
   `carte.ts`, vérifié le 7 octobre 2026) et `fiche.fraicheur` (les seuils de 7 et 30 jours de la règle 6).
5. **Signaler une difficulté** (question 14 du plan, T39) : le modèle (deux tables, journal,
   modération), la lecture (le ministère et EJP Tech seulement), la portée (tous les formulaires de
   saisie ; un ministère seulement peut signaler) sont décidés le 6 octobre 2026. Reste ouverte la
   réponse : l'outil n'écrit pas à la personne, donc **comment EJP Tech répond-il** ? Par la boîte mail partagée du ministère ? Cela suppose que la liste des
   boîtes que la personne responsable doit envoyer soit connue d'EJP Tech sans entrer dans le
   dépôt. Le texte « EJP Tech le lira. » ne promet pas de réponse ; la clôture, avec son
   commentaire facultatif, est lue par le ministère dans « Vos derniers signalements ».
6. **Place dans le plan** : « Signaler une difficulté » ajoute deux tables, deux fonctions, deux
   codes de journal et deux couples de modération au contrat de W0 (section 3 du plan), décidés
   avant W0. Effort retenu par le plan : 3 jours (B7 1,5, E8 1,5).
7. **Aides à ajouter plus tard** : les écrans des étapes 5 et 6 (nouveau point, marquer traité,
   indicateurs, comptes) auront leurs propres aides, avec les mêmes règles. Elles s'ajouteront à ce
   catalogue au moment de leur plan, pas avant.
8. **Numéro de décision** : ce document est la référence de T38 (aides contextuelles) et de la
   section 7 de T39 (signalement) dans `docs/decisions.md` ; les textes validés se reportent dans
   `LISEZMOI.md` au lot I. La liste des codes de journal et des couples de modération de W0 ne
   change pas, le point 5 étant décidé.
9. **Relecture par la coordination** : les textes d'aide parlent de « 6 sur 8 » et de ce que voient le
   berger et le conseil. Ils font partie des libellés remis à
   la coordination avant la mise en service.
10. **Indicateurs sensibles, changement du 6 octobre 2026** (P45 à P47) : textes « Proposé » de
    `mois.sensible` (revu : le mois en cours se saisit), `mois.repartition` et `fiche.repartition`
    (nouvelles ; la seconde est supprimée le 7 octobre), et textes visibles du champ « Précision » et de la grille (section 6, « Chiffres du
    mois »). Si W0 est déjà fusionné, les deux codes nouveaux entrent dans `textesAide.ts` par un
    commit de documents et de textes sur `etape-4` avant la vague 4 (plan de l'étape 4, section 3).
    À confirmer avec les autres textes (question 15 du plan).
11. **Valeurs exactes pour le berger, le conseil et EJP Tech** (décision du 7 octobre 2026 de la
    personne responsable). `mois.sensible` et `mois.repartition` en tiennent déjà compte, et le lot I
    a livré la migration, ses tests pgTAP et le retrait de `fiche.moinsDe3` et `fiche.repartition`
    (P52). Reste à mettre à jour le BRIEF (section 4), P35, P45 et P47.
12. **Champ « déjà comptés » des sessions** : la personne responsable pense qu'un STAR ne sert
    jamais dans deux ministères. C'est vrai le dimanche, pas pour Bâtir l'Église et Anti-Dispersion
    (D2, règle 5), donc `session.dejaComptes` reste. Retirer le champ des sessions change D2 et la
    règle 5 : confirmation à demander.
