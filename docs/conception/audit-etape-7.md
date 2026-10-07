# Audit d'accessibilité de l'étape 7

- **Statut** : passe des aperçus faite le 7 octobre 2026 (lot F2). La passe avec la base locale
  (`e2e/base/accessibilite.spec.ts`) est écrite mais **pas encore jouée** : elle ne tourne qu'en CI
  (pas de Docker sur ce poste, GitHub en panne le 7 octobre).
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

Les quatre premiers tournent aux trois formats de référence (1440, 834 et 390 px). Un seul test
couvre tous les contrôles d'un écran et d'un format (un chargement sert les cinq) : la CI donne
30 minutes à tout le job « e2e », et trois tests par écran et par contrôle l'auraient dépassé. Les
contrôles sont mous (`expect.soft`) : une faute n'en cache pas une autre, et chaque ligne d'erreur
dit quel élément corriger.

Les outils se vérifient eux-mêmes (`e2e/accessibilite-outils.spec.ts`) sur de petites pages qui
contiennent chacune une faute précise : une image sans texte alternatif, un bloc trop large, un
bouton de 20 px, un contour supprimé, une fenêtre qui laisse échapper le focus, une bulle d'aide
qui ne se ferme pas. Un contrôle qui ne verrait rien ferait passer l'audit au vert à tort.

### Écrans couverts (161 écrans, tous les aperçus)

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

Un lot qui ajoute un aperçu l'ajoute au catalogue en tête de `e2e/accessibilite.spec.ts`
(constantes `CONNEXION`, `CETTE_SEMAINE`, etc.). Un test vérifie qu'aucun écran n'y figure deux
fois.

## 2. Résultat de la passe des aperçus

Joué le 7 octobre 2026 sur la branche `etape-7-f2` (code de `etape-4` au commit `a52051b`),
Chromium, projets « ordinateur » (1440 px) et « telephone » (390 px), puis « tablette » (834 px)
pour les écrans à panneau.

**Aucune faute n'a été trouvée sur les 161 aperçus** : zéro faute axe (WCAG 2.1 A et AA), zéro
défilement horizontal à 360 px et à 720 px, zéro cible sous 44 px, zéro élément que Tab n'atteint
pas, zéro focus invisible, zéro problème de structure. Chaque lot de l'étape 4 avait déjà un
contrôle axe et un contrôle à 360 px dans ses propres tests ; l'audit transversal les confirme sur
les trois formats et ajoute le clavier, les cibles et la structure.

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

La ligne A-01 vient de la lecture du code (plan, section 3.3, « Défaut trouvé en lisant le code »).
Elle n'a pas été rejouée ici, car elle demande la base. Son entrée dans `fautes-connues.ts` porte
une condition (`tantQue`) : elle disparaît toute seule dès que `src/lib/requetes.ts` contient
`networkMode: 'always'`, c'est-à-dire à la fusion du lot F1. Aucune autre intervention n'est
nécessaire.

Aucune faute connue n'est donc masquée sur les aperçus : la table `FAUTES_CONNUES` ne contient que
A-01.

## 4. Ce qui reste à jouer (la CI le fera, GitHub revenu)

`e2e/base/accessibilite.spec.ts` (job « e2e » de la CI, `E2E_BASE=1`) joue les mêmes contrôles sur
les vraies pages, avec les données du jeu d'exemple :

- ministère : `/`, `/ma-fiche`, `/saisir/dimanche`, `/saisir/mois`, `/saisir/evenement`,
  `/saisir/reunion`, `/signaler`, `/points`, `/journal`, `/confidentialite` ;
- berger et conseil : `/`, `/ministeres`, une fiche, `/points`, `/journal` ;
- administration de l'église : `/`, `/comptes`, `/sessions`, `/journal` ;
- EJP Tech : `/moderation`, `/`, `/ministeres`, une fiche, `/journal-technique` ;
- ministère FIJ (Coordo FIJ) : `/`, `/ma-fiche`, `/saisir/fij`, `/saisir/fij-statistiques`, aux
  quatre largeurs (1440, 834, 390 et 360 px) ;
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

- Les écrans qui n'existent pas encore (points d'attention, journal, comptes, sessions, modération,
  indicateurs : lots des étapes 5 et 6). Ils s'ajoutent à `PAGES_PAR_PROFIL` (base) et au
  catalogue des aperçus quand leur lot est fusionné ; chaque lot livre déjà son contrôle axe et son
  contrôle à 360 px (plan, section 3.0).
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
