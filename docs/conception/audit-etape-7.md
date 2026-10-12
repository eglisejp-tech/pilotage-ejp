# Audit d'accessibilité de l'étape 7

- **Statut** : passe des aperçus refaite le 12 octobre 2026 (lot F2), sur le code de `main` fusionné
  (étapes 5 et 6 : points, journal, comptes, sessions, modération, indicateurs). Elle couvre
  désormais **246 aperçus**, aux trois formats. La passe avec la base locale
  (`e2e/base/accessibilite.spec.ts`) est écrite mais **pas encore jouée** : elle ne tourne qu'en CI
  (pas de Docker sur ce poste). Revue appliquée le 12 octobre : les fautes connues ne masquent plus
  que leurs propres lignes (section 3), et la faute A-04 s'ajoute. **Lot F3 (12 octobre)** : A-03,
  A-04 et la surveillance de « Ministères et comptes » sont corrigées (une classe chacune) ; A-02
  reste ouverte, sur un écran du lot L3b (section 3, « À corriger plus tard »).
- **Sources** : `docs/plan-etapes-5-a-8.md` (branche `etape-5-8-plans`, section 3.3, lots F2 et F3),
  `BRIEF.md` (section 10, accessibilité), `docs/reference/maquettes/LISEZMOI.md`.
- **Portée** : ce document liste les fautes, leur écran, leur gravité et le lot qui possède l'écran.
  Il ne corrige rien : le lot F3 corrige, un commit par écran, après la fusion du lot propriétaire.

## 1. Ce que l'audit contrôle

Un écran est audité par cinq contrôles (`e2e/accessibilite.spec.ts`, aperçus) :

| Contrôle    | Règle                                                                                                                                                                                                 | Outil                           |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `axe`       | Aucune faute WCAG 2.1 A et AA (étiquettes `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`).                                                                                                                | `e2e/outils/axe.ts`             |
| `structure` | Un seul titre de niveau 1, un titre d'onglet, `lang="fr"`, une seule zone `main`.                                                                                                                     | `problemesDeStructure`          |
| `cibles`    | Tout élément interactif visible fait 44 px au moins, en hauteur et en largeur. Exemptions : lien dans une phrase, élément inactif, élément masqué par `sr-only` jusqu'à son focus.                    | `ciblesTropPetites`             |
| `clavier`   | Tab atteint chaque élément (un seul par groupe de boutons radio) et l'action principale (premier bouton d'envoi) ; le focus se voit ; le piège des fenêtres tient ; Échap ferme les aides et le menu. | `parcourirAuClavier` et voisins |
| `360`       | Aucun défilement horizontal à 360 px, et à 720 px (un écran de 1440 px à 200 % de zoom, WCAG 1.4.4). Mesuré une fois, dans le projet « ordinateur ».                                                  | `debordementHorizontal`         |

Les cinq contrôles tournent aux trois formats de référence (1440, 834 et 390 px), sauf `360`.
Un seul test couvre tous les contrôles d'un écran et d'un format (un chargement sert les cinq). Les
contrôles sont mous (`expect.soft`) : une faute n'en cache pas une autre, et chaque ligne d'erreur
dit quel élément corriger.

**Le coût en CI borne la passe.** La CI joue un job « Parcours Playwright » par format (1440, 834
et 390 px) plus un pour les écritures, en parallèle ; chacun a 30 minutes, avec sa base neuve. Les
parcours seuls y prennent déjà 14 à 17 minutes (mesure du 8 octobre, avant l'audit). La passe
complète (246 écrans, trois formats) dure environ 30 minutes sur ce poste (trois processus en
parallèle) : elle ne tient pas à côté des parcours, et un premier essai à 1632 tests dans un seul
job avait déjà dépassé les 30 minutes. La CI joue donc **42 écrans représentatifs** (un ou deux par
famille) **à chacun des trois formats**, et les pages réelles de `e2e/base/` au seul format
« ordinateur » (suivi de 360 px, et 390 px pour le ministère FIJ). La **passe complète** se joue
sans la variable `CI` (le cas sur un poste), ou avec `AUDIT_COMPLET=1` :
`npx playwright test e2e/accessibilite.spec.ts`. Elle sert à la passe finale de l'étape 7 et
chaque fois qu'un lot ajoute des écrans. Une faute trouvée seulement par la passe complète ne
rougit pas la CI : on la lit dans le rapport et on la consigne ici. Une fois la durée de chaque job
relevée dans la CI de cette branche, élargir `ECRANS_CI` si la marge le permet.

Les outils se vérifient eux-mêmes (`e2e/accessibilite-outils.spec.ts`) sur de petites pages qui
contiennent chacune une faute précise : une image sans texte alternatif, un bloc trop large, un
bouton de 20 px, un contour supprimé, une fenêtre qui laisse échapper le focus, une bulle d'aide
qui ne se ferme pas, un menu qui ignore Échap. La logique des fautes connues (quelles lignes elle
retire, dans quel format, à quelle condition) a ses propres tests. Un contrôle qui ne verrait rien
ferait passer l'audit au vert à tort.

### Écrans couverts (246 écrans, tous les aperçus)

- Connexion : les 9 écrans avec chacun de leurs états simulés, plus l'activation d'un compte
  personnel (`/apercu/connexion`), et les 5 pages publiques (`/connexion`, `/confidentialite`,
  `/conditions`, `/compte-desactive`, `/acces`).
- « Cette semaine » : 5 profils fois 5 états, plus « Anti-Dispersion » (`/apercu/cette-semaine`).
- Navigation : 5 profils (`/apercu/navigation`).
- Fiche et liste des ministères : tous les écrans de `/apercu/fiche`, avec les états vide, erreur
  de bloc et introuvable.
- Saisies : le dimanche (maquette 08) et « Chiffres du mois » dans tous leurs états
  (`/apercu/saisies`), la session, « Choisir la session », la carte des FIJ, les chiffres par
  département et leur bloc de la fiche (`/apercu/saisies-e4`).
- Événements et réunion : 11 écrans, plus l'envoi en échec (`/apercu/evenements`).
- « Signaler une difficulté » (ministère) et bloc « Signalements » (EJP Tech)
  (`/apercu/signalements`).
- Calendrier, prochaine réunion et événements à confirmer (`/apercu/calendrier`).
- Ajoutés le 12 octobre (étapes 5 et 6) : acceptation des conditions (`/apercu/connexion`,
  `ecran=acceptation`), bandeau d'avancement (`/apercu/avancement`), « Ministères et comptes »
  (`/apercu/comptes`), « Sessions » (`/apercu/sessions`), « Modération » (`/apercu/moderation`),
  configuration des indicateurs (`/apercu/indicateurs`, liste et écran d'un ministère),
  « Nouveau point d'attention » (`/apercu/nouveau-point`), boutons d'un point
  (`/apercu/points-actions`), « Points d'attention » et « Mes points » (`/apercu/points`),
  « Journal », « Mon journal » et « Journal technique » (`/apercu/journal`). Chacun avec ses états
  (données, vide, chargement, erreur, envoi en échec) et sa « page non disponible ».

Un lot qui ajoute un aperçu l'ajoute au catalogue en tête de `e2e/accessibilite.spec.ts`
(constantes `CONNEXION`, `CETTE_SEMAINE`, etc.). Un test vérifie qu'aucun écran n'y figure deux
fois.

## 2. Résultat de la passe des aperçus

Première passe le 7 octobre 2026 (code de `etape-4`, 161 aperçus) : aucune faute. Seconde passe
le **12 octobre 2026** sur la branche `etape-7-f2` fusionnée avec `main` (246 aperçus), Chromium,
projets « ordinateur » (1440 px), « tablette » (834 px) et « telephone » (390 px), tous les
aperçus à tous les formats : 754 tests joués (248 x 3 plus 10 tests d'outils), soit 746 réussis,
8 échecs attendus (les cibles de A-02 et A-03, alors marquées `test.fail()`) et 20 ignorés (les
pages de vérification des outils ne se jouent qu'en « ordinateur »), 0 échec inattendu. Depuis la
revue du même jour, ces 8 écrans ne sont plus marqués en échec : ils réussissent, avec en
annotation la ligne de la faute connue. Les écrans concernés, un par format, ont été rejoués après
ce changement (réussis, annotés A-02 ou A-03) ; la passe complète n'a pas été rejouée en entier.

**Deux fautes sur 246 aperçus** (section 3) : une cible de 36 px dans la liste des indicateurs
(A-02) et une cible de 26 px dans le bandeau d'avancement à 390 px (A-03). Pour tout le reste :
zéro faute axe (WCAG 2.1 A et AA), zéro défilement horizontal à 360 px et à 720 px, zéro élément
que Tab n'atteint pas, zéro focus invisible, zéro problème de structure (titre, langue, `main`).
Chaque lot des étapes 4 à 6 avait déjà un contrôle axe et un contrôle à 360 px dans ses propres
tests ; l'audit transversal les confirme sur les trois formats et ajoute le clavier, les cibles et
la structure.

Ce résultat porte sur ce que montrent les aperçus. Les écrans réels (données de la base, session,
double authentification, réseau) sont audités par la passe de la section 4.

## 3. Tableau des fautes

La colonne « Ligne » est l'identifiant que porte l'entrée de `e2e/outils/fautes-connues.ts`. Une
faute connue ne masque que ses propres lignes : l'entrée nomme les lignes du contrôle des cibles
qu'elle produit (par exemple `a « FIJ »`), la suite les retire du contrôle et les note en
annotation du test (« faute connue », avec la ligne de l'audit). Tout le reste de l'écran reste
strict : une faute axe, de clavier, de structure, de défilement ou une autre cible trop petite fait
échouer le test. Quand le lot F3 corrige, la condition `tantQue` de l'entrée devient fausse et la
suite redevient stricte pour ce lien : le contrôle garde la correction. La personne qui corrige
retire ensuite l'entrée.

**Règle de gravité** (celle du plan, section 3.3) : une faute est **bloquante avant l'ouverture**
si c'est une faute axe critique ou grave, ou un défilement horizontal à 360 px, sur la connexion, la
double authentification, les écrans du ministère ou « Cette semaine ». Une cible de 44 px manquée
n'est pas bloquante : elle se corrige à J+7, ou le soir même quand la correction tient en une
classe, ce qui était le cas des trois fautes ci-dessous (A-03 et A-04 corrigées par F3, A-02
reportée).

| Ligne | Statut                                              | Écran                                                                                                                                                    | Faute                                                                                                                                                                                                                             | Gravité                                                                                                                                                      | Lot propriétaire                              | Contrôle                                                                                                                                |
| ----- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| A-01  | Corrigée par F1                                     | Toute lecture : `/ministeres`, choix de session, carte FIJ                                                                                               | Hors ligne, `src/lib/requetes.ts` laissait TanStack Query en mode réseau `online` : la lecture restait en pause, `fetchAvecDelai` ne s'exécutait jamais et « Chargement » ne finissait pas.                                       | Bloquant (un ministère sans réseau le dimanche était bloqué)                                                                                                 | F1                                            | `berger \| sans réseau` (base), sans entrée dans `FAUTES_CONNUES`                                                                       |
| A-02  | Ouverte, écran du lot L3b, corrigée après sa fusion | Configuration des indicateurs, liste : `/indicateurs` (administration de l'église et EJP Tech) et les aperçus `indicateurs liste*`                       | Le lien du nom d'un ministère court (« Kumi » dans les aperçus, « FIJ » dans la base) mesure moins de 44 px de large : `min-h-cible` fixe la hauteur, aucune largeur minimale. Correction : ajouter `min-w-cible` aux deux liens. | Non bloquant : cible, écran de réglage, deux profils, usage rare. Correction d'une classe.                                                                   | L3a (dossier réservé à L3b jusqu'à sa fusion) | `indicateurs liste`, `indicateurs liste ejp-tech` (aperçus) ; `admin_eglise \| /indicateurs`, `admin_plateforme \| /indicateurs` (base) |
| A-03  | Corrigée par F3 (`min-w-cible` sur `BOUTON`)        | Bandeau d'avancement à 390 px : tout écran connecté hors saisie (`/` et `/ma-fiche` compris), aperçu `avancement` ; page `ministère FIJ \| pages` (base) | Le bouton « Voir les étapes » ne montre que « Voir » sous 600 px : environ 26 x 44 px. Correction : ajouter `min-w-cible` à `BOUTON`.                                                                                             | Non bloquant : cible, pas de faute axe ni de défilement ; son nom accessible est complet, et le bandeau est fermable et temporaire. Correction d'une classe. | Bandeau d'avancement (T50)                    | `avancement berger`, `avancement ministère` (aperçus, projet « telephone ») ; `ministère FIJ \| pages` (base, 390 et 360 px)            |
| A-04  | Corrigée par F3 (`min-w-cible` sur les deux liens)  | Liste des ministères `/ministeres` : berger, conseil et EJP Tech (base)                                                                                  | Même motif que A-02 : le lien du nom (`-my-3 inline-flex min-h-cible`) n'a pas de largeur minimale. Le ministère « FIJ » du jeu d'exemple en fait environ 25. Correction : ajouter `min-w-cible` aux deux liens.                  | Non bloquant : cible, même raison que A-02. Correction d'une classe.                                                                                         | Fiche et liste (étape 4)                      | `berger \| /ministeres`, `conseil \| /ministeres`, `admin_plateforme \| /ministeres` (base)                                             |

Où elles vivent dans le code :

- **A-01** : `src/lib/requetes.ts`. Venait de la lecture du code (plan, section 3.3, « Défaut trouvé
  en lisant le code »). **Corrigée par le lot F1** : `networkMode: 'always'` figure dans le fichier
  de `main`. L'entrée `berger | sans réseau` a été retirée de `fautes-connues.ts` : le test réel
  tourne sans aucun masque, et la CI le jouera avec la base (non rejoué ici, il demande Docker).
- **A-02** : `src/features/indicateurs/configuration/TableauIndicateurs.tsx:69-71` (`Link` de
  `ligne.nom`, vue ordinateur et tablette) et
  `src/features/indicateurs/configuration/ListeIndicateursTelephone.tsx:30-32` (même lien, vue
  téléphone). La condition `tantQue` lit la chaîne de classes de ces deux liens : elle tombe dès
  qu'elles portent `min-w-cible` (ou `min-w-[44px]`).
- **A-03** : `src/features/avancement/BandeauAvancement.tsx`, constante `BOUTON` (ligne 16) utilisée
  par les boutons « Voir » et « Fermer ». **Corrigée par le lot F3** : `min-w-cible` ajouté à
  `BOUTON`, entrée retirée de `fautes-connues.ts`. Le texte complet n'apparaît qu'à partir de 600 px
  (`sr-only min-[600px]:not-sr-only`). Le bandeau est masqué sur `/saisir` et `/signaler`
  seulement (`bandeauMasque`) : il paraît sur `/` et `/ma-fiche`. Garde : un test de composant
  (`BandeauAvancement.test.tsx`) et les aperçus `avancement` à 390 px, désormais stricts.
- **A-04** : `src/features/ministeres/TableauListeMinisteres.tsx:57` et
  `src/features/ministeres/ListeMinisteresTelephone.tsx:25`. **Corrigée par le lot F3** :
  `min-w-cible` ajouté aux deux liens, entrées retirées de `fautes-connues.ts` (les trois pages
  `/ministeres` de la base sont désormais strictes). Les composants `NomMinistere.tsx` et
  `EvenementsAConfirmer.tsx` portaient déjà `min-w-cible` : c'est la convention du projet.
  **L'aperçu ne couvre pas cette faute** : ses données d'exemple
  (`src/features/fiche/apercu/exemplesFiche.ts`) n'ont que des noms longs (Social, Intégration,
  Coordination, Communication). Seule la base, avec le ministère « FIJ », la montre ; ajouter un nom
  court à l'aperçu changerait les chiffres d'autres tests, donc la garde est un test de composant
  (`ListesMinisteres.test.tsx`, nom de trois lettres) et le contrôle de la base en CI. **Vérifié en
  CI** sur le commit `e6214c5` (12 octobre 2026) : les jobs Playwright 1440, 834 et 390 px, joués
  avec la base (`E2E_BASE=1`), sont verts. Les quatre pages devenues strictes (`berger`, `conseil`
  et `admin_plateforme | /ministeres`, `ministère FIJ | pages`) passent sans masque, donc sans
  annotation « faute connue ».

### À corriger plus tard (non bloquant, écrans d'un lot en cours)

- **A-02** reste ouverte : ses deux fichiers (`src/features/indicateurs/configuration/`) sont dans
  le périmètre réservé au lot L3b pendant sa construction (L3b ne touche pas ces deux liens : la
  correction se fusionnera sans conflit). La correction tient en une classe
  (`min-w-cible` sur les deux liens de `ligne.nom`) ; elle se fait après la fusion de L3b, et
  l'entrée `A02` de `fautes-connues.ts` se retire alors (4 écrans : `indicateurs liste`,
  `indicateurs liste ejp-tech`, `admin_eglise | /indicateurs`, `admin_plateforme | /indicateurs`).
- Les écrans « À valider » (L4), « Mes indicateurs » (L4) et les panneaux d'indicateurs (L3b)
  s'ajoutent à l'audit quand leur lot est fusionné (section 5).
- Aucune faute bloquante avant l'ouverture n'est connue sur les écrans fusionnés dans `main` :
  connexion, double authentification, écrans du ministère et « Cette semaine » n'ont aucune faute
  axe ni défilement horizontal à 360 px.

Si la correction prend une autre forme qu'une largeur minimale de 44 px, la personne qui corrige
retire l'entrée de `FAUTES_CONNUES`. Si une refonte déplace le lien, la condition ne le retrouve
plus et la suite redevient stricte.

Une faute connue ne masque que ses lignes, et seulement pour l'écran et le format de son entrée
(`projets`). Les seules entrées de `FAUTES_CONNUES` sont celles de A-02 (4 écrans). Toutes les
autres pages sont jouées sans masque : la CI dira si un autre lien court y paraît.

## 4. Ce qui reste à jouer (la CI le fera, GitHub revenu)

`e2e/base/accessibilite.spec.ts` (job « e2e » de la CI, `E2E_BASE=1`) joue les mêmes contrôles sur
les vraies pages, avec les données du jeu d'exemple :

- ministère : `/`, `/ma-fiche`, `/saisir/dimanche`, `/saisir/mois`, `/saisir/evenement`,
  `/saisir/reunion`, `/signaler`, `/saisir/point`, `/ma-fiche/indicateurs`, `/points`, `/journal`,
  `/confidentialite` ;
- berger et conseil : `/`, `/ministeres`, une fiche, `/points`, `/journal` ;
- administration de l'église : `/`, `/comptes`, `/sessions`, `/indicateurs`, les indicateurs d'un
  ministère, `/journal` ;
- EJP Tech : `/moderation`, `/`, `/ministeres`, une fiche, `/indicateurs`, les indicateurs d'un
  ministère, `/journal-technique` ;
- ministère FIJ (Coordo FIJ) : `/`, `/ma-fiche`, `/saisir/fij`, `/saisir/fij-statistiques`, aux
  trois largeurs (1440, 390 et 360 px) ;
- Échap ferme chaque panneau ouvert (un `role="dialog"`), sans connaître son nom : à 600 px ou plus,
  `/saisir/*` et `/signaler` doivent ouvrir un panneau (sinon le contrôle échoue), Échap le ferme et
  la page d'arrivée a son titre. Le retour du focus à l'élément d'origine n'est pas contrôlé ici :
  une adresse ouverte directement n'a pas d'élément d'origine, et `usePiegeFocus` a son test
  (`PanneauSaisie.test.tsx`) ;
- le berger sans réseau (la page ne reste pas en chargement) et le berger devant une erreur de page
  (message annoncé, « Réessayer » au clavier, retour à la liste).

Pages dont la CI peut révéler des fautes que les aperçus ne montrent pas : tout ce qui dépend des
données ou du compte (listes longues, noms longs, états réels), l'effet d'Échap sur les vrais
panneaux (la fermeture des aperçus est sans effet), l'écran d'erreur réel et la session.

**Marche à suivre quand la CI joue ce fichier** : une faute nouvelle s'ajoute au tableau de la
section 3 (écran, gravité, lot propriétaire), reçoit sa ligne `A-nn` et son entrée dans
`FAUTES_CONNUES` (seulement pour une cible trop petite : les autres contrôles n'ont pas de masque),
puis part chez F3. Les fautes bloquantes avant l'ouverture sont celles du plan (section 3.3) : toute
faute axe critique ou grave et tout défilement horizontal à 360 px sur la connexion et la double
authentification (16 à 18), sur les écrans du ministère (07, 08, chiffres du mois, 09, 10, 11, 12,
« Signaler une difficulté », « Marquer traité ») et sur « Cette semaine » (01 à 03). Une cible de
44 px manquée n'est pas bloquante : elle se corrige à J+7, ou plus tôt si la correction tient en une
classe. Le reste est à corriger à J+7.

## 5. Ce que l'audit ne couvre pas

- Les écrans qui n'existent pas encore : « À valider » (lot L4) et « Mes indicateurs » (`/ma-fiche/indicateurs`
  n'est audité qu'avec la base, par la page que `main` sert aujourd'hui), ainsi que les panneaux
  d'indicateurs du lot L3b. Ils s'ajoutent à `PAGES_PAR_PROFIL` (base) et au catalogue des aperçus
  quand leur lot est fusionné ; chaque lot livre déjà son contrôle axe et son contrôle à 360 px
  (plan, section 3.0).
- Le bandeau hors ligne (lot F1) : son contrôle est dans `e2e/reseau.spec.ts`.
- Le contraste en thème sombre (hors étape, plan section 11) et les lecteurs d'écran réels : la
  passe complète par `ui-reviewer` est prévue à J+7.
- Les critères WCAG 2.2 : l'audit suit WCAG 2.1 A et AA, comme le plan.

## 6. Notes de mesure

- Un clavier se parcourt avec Tab : les groupes de boutons radio comptent pour un seul arrêt (les
  flèches font le reste), les éléments en `tabindex="-1"` ne sont pas attendus, et les barres de
  réglage des aperçus (hors écran audité) sont traversées sans être comptées.
- L'anneau de focus se lit sur l'élément ou, pour un champ transparent ou masqué, sur son
  étiquette ou son voisin (motif `peer-focus-visible` des champs de code et des choix de statut).
- Le menu des écrans étroits n'est pas contrôlé derrière une fenêtre modale : le fond de la
  fenêtre reçoit le clic.
- Dans une copie de travail dont `node_modules` est une jonction, Vite refuse de servir les
  polices (hors de sa liste d'accès) et les mesures se font avec une police de repli. Cette passe a
  été faite avec les polices du projet, en levant la restriction par un fichier de configuration
  local non versionné. La CI n'a pas ce défaut.
- **Corrigé par prévention (lot F3)** : dans « Ministères et comptes » (`/comptes`), le lien
  « Aucun » de la colonne « Indicateurs » (`src/features/comptes/CelluleIndicateurs.tsx`) mesurait
  43 x 44 px avec la police de repli et 44 px ou plus avec la police du projet. `min-w-cible` y est
  ajouté : il ne dépend plus de la police.
