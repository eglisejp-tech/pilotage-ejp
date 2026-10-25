# Brief de design : Pilotage EJP

Ce brief accompagne le canevas « Pilotage des ministères, directions visuelles » (ancien nom de travail : l'outil s'appelle « Pilotage EJP » depuis le 30 septembre 2026). Il fixe l'intention visuelle. Le brief de construction (`BRIEF.md`) reste la référence fonctionnelle.

## 1. Pour qui, à quel moment

- **Le berger et le conseil**, en fin de semaine, sur un ordinateur ou une tablette. Ils veulent savoir en une minute où en est l'église et ce qui attend une décision. Ils lisent, ils ne manipulent pas.
- **Les ministères**, le dimanche midi, sur leur téléphone, souvent debout. Ils saisissent trois chiffres et repartent.

L'outil doit inspirer confiance aux premiers et ne rien coûter aux seconds.

## 2. Ce que font les meilleurs tableaux de direction

La recherche porte sur ce que les éditeurs et analystes les plus exigeants proposent aux dirigeants.

| Référence                                             | Ce qu'on en retient                                                                                                                                |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stephen Few, _Information Dashboard Design_           | L'essentiel en haut à gauche. La taille d'un élément suit son importance. Pas de logo, pas de décor, pas de grille rigide et symétrique.           |
| Edward Tufte, sparklines                              | Des courbes de la taille d'un mot, placées dans le texte ou le tableau, sans cadre ni légende. Beaucoup de données, peu de dessin.                 |
| Tableau de bord Stripe                                | Cinq chiffres, pas davantage. Chaque chiffre avec sa période précédente. La couleur réservée aux états, les courbes en une seule teinte.           |
| FT Visual Vocabulary                                  | Choisir le graphique selon la relation montrée. Ici : évolution (courbe), part du tout (bande de complétude), géographie (carte des départements). |
| Outils de comptage d'église (Planning Center, Vitals) | Comptages par événement, tendances sur douze semaines, une vue par ministère.                                                                      |

Le point commun : **un tableau de direction ressemble à une note bien écrite, pas à un panneau de contrôle**. D'où le choix d'ouvrir chaque vue par une phrase, pas par une grille de tuiles.

## 3. Ce que nous refusons

- Les codes du SaaS générique : tuiles identiques à coins arrondis et ombres, dégradés (sauf celui de la flamme du logo d'EJP Tech dans les attentes, T65), violet, icônes décoratives, emoji.
- Les polices « par défaut » (Inter, Roboto, Arial, Space Grotesk).
- Le folklore d'église (vitraux, doré, serif ornée) : ce n'est pas l'image de l'EJP.
- Les barres de couleur sur le bord des cartes, les pastilles partout, les surtitres en capitales qui répètent le titre.
- Le texte gris clair sur fond clair, et la couleur comme seul porteur d'information.

## 4. Ce qui vient du monde de l'EJP

- **Le vocabulaire** : STARs, Prodiges, FIJ, pilotes, Bâtir l'Église, Anti-Dispersion. On l'utilise tel quel, sans le traduire.
- **Le rythme** : tout part du dimanche et de la semaine. La vue d'accueil s'appelle « Cette semaine » et porte le numéro de semaine.
- **La lumière** : Réseau Génération Lumière, « Lumière du Monde ». Dans la direction A, la lumière devient un surligneur jaune posé sur la seule chose qui demande une décision.
- **La culture Prodiges** : la boutique Prodiges mêle foi et culture urbaine, avec une palette de couleurs primaires franches. La direction B en reprend l'énergie.
- **Le territoire** : les FIJ sont réparties dans les huit départements d'Île-de-France. Elles sont montrées sur une carte en carrés, placés comme sur la carte réelle, au lieu d'une liste de barres.

## 5. Les trois directions

### A. Le point du berger

Un bulletin hebdomadaire. La semaine est écrite en une phrase, en serif de lecture (Newsreader), comme le premier paragraphe d'une note de direction. Les chiffres forment un tableau à la manière de Tufte : libellé, valeur, écart, courbe de la taille d'un mot, date, complétude. Fond gris très clair, encre bleu nuit, une seule couleur de lumière. Calme, sérieux, lisible pendant des années.

Typographies : Newsreader (titres et phrases), Public Sans (interface, choisie pour sa neutralité et sa lisibilité), Spline Sans Mono (dates).

### B. Génération

L'énergie de la culture Prodiges. Le numéro de semaine en très grand, comme un numéro de maillot. Des chiffres condensés de grande taille (Big Shoulders Display), des filets épais, trois couleurs primaires, chacune attachée à un sens : bleu pour les STARs, jaune pour les sessions, rouge pour l'attention. Plus affirmée, plus proche de l'image que les jeunes ont de leur église.

Typographies : Big Shoulders Display (chiffres et titres), Archivo (interface), DM Mono (dates).

### Comment choisir

| Question                            | A                                            | B                                     |
| ----------------------------------- | -------------------------------------------- | ------------------------------------- |
| Lecture par le berger et le conseil | Plus confortable, plus « note de direction » | Plus spectaculaire, moins de texte    |
| Saisie au téléphone                 | Sobre, champs classiques                     | Très grands chiffres, gestes évidents |
| Cohérence avec l'image EJP          | Neutre, institutionnelle                     | Forte, liée à la culture Prodiges     |
| Risque                              | Paraître trop sage                           | Fatiguer à l'usage quotidien          |

### C. Le mélange (direction retenue)

La lecture de A, les chiffres de B. La semaine s'ouvre sur le numéro de semaine en très grand (Big Shoulders Display) à côté de la phrase de la semaine (Newsreader). Le tableau des chiffres, la colonne « À décider » et la carte des FIJ viennent de A. Tous les chiffres, les priorités et la saisie à très grands chiffres viennent de B. Une seule couleur de lumière, le jaune, pour trois usages : surligneur, onglet actif, bouton principal.

Typographies : Newsreader (phrases, titres), Big Shoulders Display (chiffres), Public Sans (interface). Tokens : `docs/reference/tokens.css`.

## 6. Responsive : mobile d'abord, impeccable jusqu'au grand écran

Chaque écran se conçoit **d'abord à 390 px**, puis s'élargit. Jamais l'inverse : on ne « réduit » pas une maquette d'ordinateur.

### Paliers

| Palier      | Largeur         | Usage principal                                  | Disposition                                                                                                  |
| ----------- | --------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Téléphone   | 360 à 599 px    | Saisie du dimanche, lecture rapide par le berger | Une colonne. Menu dans un bouton de 44 px. Actions principales pleine largeur.                               |
| Tablette    | 600 à 1023 px   | Lecture en réunion                               | Deux colonnes pour les chiffres, le reste en une colonne. Menu dans un bouton de 44 px, comme sur téléphone. |
| Ordinateur  | 1024 à 1439 px  | Lecture du berger et du conseil                  | Colonne principale et colonne « À décider » à droite.                                                        |
| Grand écran | 1440 px et plus | Écran de salle, projection en conseil            | Largeur de contenu plafonnée à 1280 px, centrée. Texte agrandi d'un cran, jamais étiré sur toute la largeur. |

### Règles

- **Ordre de lecture identique à toutes les tailles** : la phrase de la semaine, les chiffres, À décider, la session, les départements, les ministères. Sur téléphone, « À décider » remonte juste après la phrase quand au moins un point ouvert a la priorité Urgente ; il montre trois points à toutes les tailles, puis « Tous les points ». L'accueil du ministère a lui aussi le même contenu à toutes les tailles (`BRIEF.md`, section 9).
- **Les tableaux se transforment, ils ne défilent pas** : sous 600 px, le tableau des chiffres devient une liste (libellé et date à gauche, valeur et écart à droite), le tableau des ministères devient une liste nom et fraîcheur. De même : 05, un bloc par point ; 06, deux lignes par entrée (date et compte, puis action et détail) ; 13, un bloc par compte, boutons en pleine largeur ; 14, deux lignes par session ; 15, un bloc par texte. Pas de graphique d'évolution en V1 : seules les petites courbes des maquettes.
- **Rien ne défile horizontalement** à 360 px. Marge latérale d'au moins 16 px à toutes les tailles.
- **Typographie fluide** : les grands chiffres et la phrase de la semaine suivent la largeur (par exemple `clamp()`), dans des bornes fixées. Les textes courants restent entre 15 et 17 px (17 px à partir de 1440 px) ; lignes de 45 à 75 caractères.
- **Cibles tactiles** de 44 px au minimum, 64 px pour les boutons plus et moins de la saisie (`--cible-saisie` de `tokens.css`). Clavier numérique sur les champs de chiffres.
- **Panneaux de saisie** : page entière sous 600 px ; à partir de 600 px (tablette comprise), panneau latéral de 460 px, fond `--papier`, filet gauche `--filet`, sans ombre ; le reste de la page est inerte et Échap ferme le panneau.
- **Le pouce d'abord** : sur téléphone, le bouton « Enregistrer » reste dans une barre collée en bas de l'écran pendant la saisie (`position: sticky`), fond `--fond`, filet haut, marge basse qui tient compte de la zone de sécurité des téléphones. **Refusé le 24 octobre 2026 (T69, proposition 2)** : la barre collée n'est pas construite ; « Enregistrer » reste en pleine largeur à la fin du formulaire.
- **Images et cartes** : la carte des départements garde ses proportions et se met à l'échelle : grille de 5 colonnes sur 3 lignes, carreaux carrés, 100 % de la largeur de son bloc, au plus 346 px sur téléphone et 380 px dans la colonne de droite. Aucune largeur fixe supérieure à l'écran.
- **Orientation et zoom** : l'interface reste utilisable en paysage et avec un zoom du navigateur à 200 %.
- **Chaque direction est livrée en trois formats** au minimum : téléphone (390 px), ordinateur (1440 px), et un état grand écran ou tablette pour vérifier le comportement intermédiaire.

## 7. Plusieurs profils, une seule identité

L'application a cinq profils : ministère (email partagé), berger, conseil, administration de l'église, EJP Tech. Chaque profil a sa navigation et son écran d'accueil, mais la même identité visuelle.

- **Le nom du compte connecté est toujours visible.** L'en-tête a deux formats :
  - à partir de 1024 px (format de 04, qui vaut aussi pour 01) : à gauche « Pilotage EJP » et le sous-titre « Église des Jeunes Prodiges », au centre les onglets du profil, à droite le libellé du compte et « Se déconnecter » ;
  - en dessous de 1024 px (téléphone et tablette, format de 03) : « Pilotage EJP » sur la première ligne, le libellé du compte sur la deuxième, bouton menu de 44 px à droite. Le menu liste les onglets, puis le libellé du compte et « Se déconnecter ». Ne reproduis pas les onglets en ligne de la tablette 02 ;
  - écrans de saisie et activation (17) : en-tête simplifié de la maquette, avec « Retour » ou « Annuler » ; connexion (16) et code (18) : pas d'en-tête ;
  - le nombre à côté d'un onglet (« Points d'attention 4 ») est le nombre de points ouverts que ce compte peut voir.
- **L'accueil du ministère se pense au téléphone** : ce qu'il reste à faire, un bouton pour la prochaine action, ses saisies, ses points, puis un résumé de l'église. Le même contenu s'élargit sur ordinateur.
- **L'accueil du berger et du conseil se pense à l'ordinateur et à la tablette** : la semaine en une phrase, les chiffres, « À décider ».
- **Les écrans d'administration** (église et EJP Tech) sont des outils : titre, une phrase qui dit à quoi sert l'écran et ce qu'il ne permet pas, puis des tableaux simples.
- **Ce qu'un profil ne peut pas faire ne s'affiche pas** : pas de bouton grisé, pas d'onglet vide. Sur un point où il est mentionné, un ministère lit « Mentionné par Intégration. » et voit le bouton « Marquer traité » : il explique ce qui a été traité et comment dans la fenêtre qui s'ouvre (décision du 30 septembre 2026).

La planche `maquettes/00-profils-qui-voit-quoi.png` récapitule qui voit quoi et la navigation de chaque profil.

## 8. Contraintes non négociables

- Contraste AA sur tout le texte, y compris les notes.
- Cibles tactiles de 44 px au moins pour la saisie ; boutons plus et moins pour éviter le clavier.
- Chaque chiffre porte sa date et sa complétude (« 6 sur 8 »).
- Vert, orange, rouge réservés aux états, toujours doublés d'un mot.
- Aucun défilement horizontal à 390 px.
- Textes en français simple, sans tiret cadratin ni demi-cadratin.

## 9. Ce que la coordination doit trancher

1. Direction visuelle : **tranché, direction C** (mélange de A et B).
2. L'EJP a-t-elle une charte (logo, couleurs, polices) à respecter ? Si oui, elle prime sur ce brief. **Question encore ouverte.**
3. Le nom de l'outil : **tranché, « Pilotage EJP »** (30 septembre 2026). « Le point du berger » reste le nom de la direction A ; les maquettes qui l'affichent se lisent « Pilotage EJP ».

## 10. Les fondations communes (T69)

Un seul modèle par élément, des tailles nommées, des règles vérifiées par la machine (décision T69 du 24 octobre 2026). Un écran nouveau ou repris s'écrit avec ces fondations ; il n'écrit plus de taille, de largeur d'écran ni de bouton à la main.

- **Tailles de texte par rôle** (`src/styles/fondations.css`, branchées dans la configuration Tailwind de `src/index.css`). Une taille par objet, la plus proche des maquettes :

  | Classe                                                                      | Taille                | Rôle                                                                       |
  | --------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------- |
  | `text-note`                                                                 | 13 px (14 à 1440 px)  | notes, dates, en-têtes de colonnes, surtitres                              |
  | `text-detail`                                                               | 14 px (15 à 1440 px)  | seconde ligne d'une rangée, libellés des filtres, boutons denses (01 à 04) |
  | `text-interface`                                                            | 15 px (16 à 1440 px)  | libellés, boutons, liens, onglets, lignes de liste                         |
  | `text-texte`                                                                | 16 px (17 à 1440 px)  | texte courant et champs (16 px au moins : pas de zoom sur iPhone)          |
  | `text-enregistrer`                                                          | 17 px, gras           | « Enregistrer » des saisies                                                |
  | `text-citation`                                                             | 19 px, interligne 1,4 | texte libre cité entre guillemets, en Newsreader                           |
  | `text-priorite`                                                             | 19 px, extra-gras     | priorité d'un point, en Big Shoulders et en capitales                      |
  | `text-titre-point`                                                          | 22 px, 500, 1,2       | titre d'un point d'attention                                               |
  | `text-titre-fenetre`                                                        | 28 px, 500            | titre d'une fenêtre de confirmation                                        |
  | `text-titre-panneau`                                                        | 32 px, 34 dès 600 px  | titre d'un panneau de saisie                                               |
  | `text-section`, `text-titre`, `text-phrase`, `text-chiffre`, `text-semaine` | fluides               | tokens de `tokens.css`                                                     |

  Les grands chiffres des champs de saisie (112, 84, 64, 56, 40 px) restent dans `ChampNombre`, qui les porte.

- **Largeurs d'écran nommées** (variantes Tailwind, et `LARGEURS` de `src/lib/largeurs.ts` pour le JavaScript) : `tablette:` 600 px, `tablette-large:` 768 px, `ordinateur:` 1024 px, `ordinateur-large:` 1280 px, `grand-ecran:` 1440 px (et `max-tablette:`...). À partir de 1440 px, le texte de l'interface grandit d'un cran (section 6).
- **Bouton** (`src/components/ui/Bouton.tsx`) : `variante` principal (jaune), secondaire (bordure encre) ou sombre ; `taille` ligne (44 px), ligne-dense (44 px, 14 px), accueil (48), ajout (52), principal (56), enregistrer (58) ; `pleineLargeur`. Pendant l'envoi (`enCours`, avec `libelleEnCours`), le bouton dit ce qu'il fait, reste dans l'ordre du clavier (`aria-disabled`, jamais `disabled`) et n'est jamais grisé ; momentanément indisponible (`indisponible`), il s'estompe. Au survol (souris), un voile de 10 % de la couleur du texte arrive en 120 ms ; à l'appui, 18 %, tout de suite ; le pointeur devient une main. C'est la troisième animation de l'outil, coupée par « Réduire les animations ». `classesBouton()` donne le même dessin à un lien.
- **Champs** (`Champ`, `ZoneDeTexte`, `ListeDeroulante`) : bordure encre, fond papier, angles droits, texte de 16 px au moins ; 52 px dans un formulaire, 44 px dans une barre de filtres (maquette 06) ; la liste déroulante perd le dessin du système et reçoit une flèche dessinée (« ▾ » de la maquette 06).
- **Gabarit de page** (`GabaritPage`, `EnTetePage`) : titre, phrase bornée à environ 75 caractères (`max-w-lecture`), action à droite à partir de 1024 px ; un seul écart entre l'en-tête et les sections (`gap-sections`, 48 px), `gap-bloc` (24 px) dans une section, `gap-entete` (10 px) entre le titre et sa phrase.
- **Fenêtre de confirmation** (`FenetreConfirmation`, `useFenetreModale` pour une fenêtre à champs) : l'élément `<dialog>` du navigateur, une seule largeur (480 px), titre en question, conséquence, « Annuler » et l'action ; le focus entre sur la fenêtre, y reste, Échap annule, le focus revient au bouton d'origine.
- **Garde-fous** (`npm run lint`) : `scripts/verifier-design.mjs` refuse dans `src` les tailles et largeurs écrites à la main, `max-w-[720px]` et `max-w-prose`, `hover:bg-fond`, les `<select>` et fenêtres recopiés, les barres sur le bord d'un bloc, les animations hors décision et les arrondis. Le code d'avant les fondations a des plafonds datés du 24 octobre 2026 (`scripts/design-plafonds.json`) : un nombre peut baisser, jamais monter. ESLint refuse `disabled` sur un bouton.

## Sources

- Stephen Few, [Formatting and Layout Matter](https://www.perceptualedge.com/articles/Whitepapers/Formatting_and_Layout_Matter.pdf), Perceptual Edge
- Edward Tufte, [Sparkline theory and practice](https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/)
- 925 Studios, [Stripe Dashboard Design Breakdown](https://www.925studios.co/blog/stripe-dashboard-design-breakdown)
- Financial Times, [Visual Vocabulary](https://github.com/Financial-Times/chart-doctor/blob/main/visual-vocabulary/Visual-vocabulary-fr.pdf)
- [Planning Center Headcounts](https://www.planningcenter.com/headcounts) ; [Vitals, Church Metrics Dashboard](https://vitals.church/)
- [Boutique Prodiges](https://prodiges.store/)
