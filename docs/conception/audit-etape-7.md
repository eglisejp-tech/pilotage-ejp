# Audit d'accessibilité de l'étape 7

- **Statut** : passe des aperçus refaite le 12 octobre 2026 (lot F2), sur le code de `main` fusionné
  (étapes 5 et 6 : points, journal, comptes, sessions, modération, indicateurs). Elle couvre
  désormais **246 aperçus**, aux trois formats. La passe avec la base locale
  (`e2e/base/accessibilite.spec.ts`) est écrite mais **pas encore jouée** : elle ne tourne qu'en CI
  (pas de Docker sur ce poste).
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

**Le coût en CI borne la passe.** Le job « e2e » de la CI a 30 minutes pour toute la suite. La
passe complète (246 écrans, trois formats) dure environ 30 minutes sur ce poste (trois processus
en parallèle) et ne tient pas à côté du reste : un premier essai à 1632 tests a fait dépasser les
30 minutes au job. La CI joue donc **42 écrans représentatifs** (un ou deux par famille) à 1440 et 390 px, et les pages réelles
de `e2e/base/` au seul format « ordinateur » (suivi de 360 px). La **passe complète** se joue sans
la variable `CI` (le cas sur un poste), ou avec `AUDIT_COMPLET=1` :
`npx playwright test e2e/accessibilite.spec.ts`. Elle sert à la passe finale de l'étape 7 et
chaque fois qu'un lot ajoute des écrans. Une faute trouvée seulement par la passe complète ne
rougit pas la CI : on la lit dans le rapport et on la consigne ici. Si le job « e2e » gagne du
temps (parallélisme, découpage en deux jobs), élargir `ECRANS_CI` ou retirer ce filtre.

Les outils se vérifient eux-mêmes (`e2e/accessibilite-outils.spec.ts`) sur de petites pages qui
contiennent chacune une faute précise : une image sans texte alternatif, un bloc trop large, un
bouton de 20 px, un contour supprimé, une fenêtre qui laisse échapper le focus, une bulle d'aide
qui ne se ferme pas. Un contrôle qui ne verrait rien ferait passer l'audit au vert à tort.

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
aperçus à tous les formats : 746 tests réussis (dont les 8 fautes ci-dessous, attendues en échec),
20 ignorés (les pages de vérification des outils ne se jouent qu'en « ordinateur »), 0 échec
inattendu.

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

La colonne « Ligne » est l'identifiant que porte l'entrée de `e2e/outils/fautes-connues.ts` : le
test de l'écran est marqué `test.fail()` avec cette ligne, pour que la CI ne rougisse pas tant que
la faute vit. Quand la correction réussit, `test.fail()` fait échouer le test (« attendu en échec,
mais réussi ») et on retire l'entrée : le test reste dans la suite et garde la correction.

| Ligne | Écran                                                      | Faute                                                                                                                                                                             | Gravité                                                    | Lot propriétaire | Contrôle                       |
| ----- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------- | ------------------------------ |
| A-01  | Toute lecture : `/ministeres`, choix de session, carte FIJ | Hors ligne, `src/lib/requetes.ts` laisse TanStack Query en mode réseau `online` : la lecture reste en pause, `fetchAvecDelai` ne s'exécute jamais et « Chargement » ne finit pas. | Bloquant (un ministère sans réseau le dimanche est bloqué) | F1               | `berger \| sans réseau` (base) |

| A-02 | Configuration des indicateurs, liste (`/indicateurs`, administration de l'église et EJP Tech), aux trois formats | Le lien du nom d'un ministère court (« Kumi ») mesure 36 x 44 px : `min-h-cible` fixe la hauteur, aucune largeur minimale. Correction : ajouter `min-w-cible` aux deux liens. | Non bloquant (écran de réglage, deux profils, usage rare) | L3a | `indicateurs liste`, `indicateurs liste ejp-tech` (aperçus), cibles |
| A-03 | Bandeau d'avancement, à 390 px (`/apercu/avancement`, tout écran de l'application pour le profil qui le voit) | Le bouton « Voir les étapes » ne montre que « Voir » sous 600 px : 26 x 44 px. Correction : ajouter `min-w-cible` à `BOUTON`. | Non bloquant (bandeau temporaire, fermable) | Bandeau d'avancement (T50) | `avancement berger`, `avancement ministère` (aperçus, projet « telephone »), cibles |

Où elles vivent dans le code :

- **A-01** : `src/lib/requetes.ts`. Venait de la lecture du code (plan, section 3.3, « Défaut trouvé
  en lisant le code »). **Corrigée par le lot F1** : `networkMode: 'always'` figure dans le fichier
  de `main`. Son entrée `berger | sans réseau` de `fautes-connues.ts` porte une condition
  (`tantQue`) qui la retire seule : le test réel tourne donc sans `test.fail()`, et la CI le jouera
  avec la base (non rejoué ici, il demande Docker).
- **A-02** : `src/features/indicateurs/configuration/TableauIndicateurs.tsx` (ligne du `Link` de
  `ligne.nom`, vue ordinateur et tablette) et
  `src/features/indicateurs/configuration/ListeIndicateursTelephone.tsx` (même lien, vue
  téléphone). Elle tombe seule dès que les deux fichiers portent `min-w-cible` (ou `min-w-[44px]`).
- **A-03** : `src/features/avancement/BandeauAvancement.tsx`, constante `BOUTON` (ligne 16) utilisée
  par le bouton « Voir ». Elle tombe seule dès que le fichier porte `min-w-cible`. Le texte complet
  n'apparaît qu'à partir de 600 px (`sr-only min-[600px]:not-sr-only`).

Quand un lot corrige, `test.fail()` ne joue plus (la condition `tantQue` devient fausse) et le test
garde la correction. Si la correction prend une autre forme qu'une largeur minimale de 44 px, la
personne qui corrige retire l'entrée de `FAUTES_CONNUES`.

Aucune faute masquée ne cache d'autre faute : un test `test.fail()` échoue si l'une de ses
vérifications échoue, et la ligne de l'audit dit laquelle. Les seules entrées de `FAUTES_CONNUES`
sont A-01 (dormante), A-02 et A-03.

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
- Échap ferme chaque panneau ouvert (un `role="dialog"`), sans connaître son nom ;
- le berger sans réseau (la page ne reste pas en chargement) et le berger devant une erreur de page
  (message annoncé, « Réessayer » au clavier, retour à la liste).

Pages dont la CI peut révéler des fautes que les aperçus ne montrent pas : tout ce qui dépend des
données ou du compte (listes longues, noms longs, états réels), l'effet d'Échap sur les vrais
panneaux (la fermeture des aperçus est sans effet), l'écran d'erreur réel et la session.

**Marche à suivre quand la CI joue ce fichier** : une faute nouvelle s'ajoute au tableau de la
section 3 (écran, gravité, lot propriétaire), reçoit sa ligne `A-nn` et son entrée dans
`FAUTES_CONNUES`, puis part chez F3. Les fautes bloquantes avant l'ouverture sont celles du plan
(section 3.3) : la connexion et la double authentification, les écrans du ministère (07, 08, chiffres
du mois, 09, 10, 11, 12, « Signaler une difficulté », « Marquer traité ») et « Cette semaine »
(01 à 03). Toute faute axe critique ou grave, tout défilement horizontal à 360 px et toute cible
de 44 px manquée sur ces écrans est bloquant ; le reste est à corriger à J+7.

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
- **À surveiller, non masqué** : dans « Ministères et comptes » (`/comptes`), le lien « Aucun » de
  la colonne « Indicateurs » (`src/features/comptes/CelluleIndicateurs.tsx`, `Link` à `min-h-cible`
  sans largeur minimale) mesure 43 x 44 px avec la police de repli et 44 px ou plus avec la police
  du projet. Il réussit donc dans la CI. Même remède que A-02 : `min-w-cible`. Si la CI le fait
  échouer un jour (changement de police), il devient la ligne A-04.
