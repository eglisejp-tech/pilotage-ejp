# Textes et questions du lot P1 (« Marquer traité » et « Changer le statut »)

Fichier du lot P1 (étape 5). Il liste ce que la coordination doit relire et ce que les lots qui
fusionnent ensuite (P3 et P4) doivent reprendre. Les textes viennent de
`src/features/points-actions/textes.ts`.

## Textes « Proposé », à faire relire par la coordination

Règle de rédaction des aides : dire quoi saisir ou ce que le chiffre veut dire, jamais la
mécanique interne.

| Où                                              | Texte proposé                                                                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| « Changer le statut », sous les choix           | Un point « En attente de décision » passe avant les autres dans « À décider ».                                                                    |
| « Marquer traité », sous le champ               | Le commentaire s'affiche sur le point. Les ministères liés au point, le berger, le conseil et EJP Tech le lisent.                                 |
| « Modifier les mentions » (T54), sous les cases | Un ministère mentionné voit ce point, et seulement ce point. Un ministère retiré ne le voit plus. Le berger et le conseil voient tous les points. |

Le rappel sur les données personnelles et la phrase « Un point traité ne se rouvre pas. » viennent
du BRIEF (section 9) et ne sont pas à relire ici. Option à trancher : réunir le rappel et la note
« Le commentaire s'affiche... » en un seul bloc, pour ne pas avoir trois textes gris autour du champ.

## Questions pour la coordination

1. **« Signaler une difficulté » dans les deux fenêtres.** T39 demande ce lien « en bas de chaque
   formulaire de saisie ». Les deux fenêtres du lot P1 n'en ont pas : le plan le réserve à « Nouveau
   point » (P2), et la liste fermée des écrans de signalement n'a pas de code pour une action sur un
   point (`autre` existe, mais perd l'écran d'origine). Faut-il l'ajouter, pour un compte de
   ministère seulement (le berger et le conseil ne signalent pas) ? Si oui, c'est un lien
   `<LienSignalement ecran="autre" />` sous les boutons, sans migration, ou un nouveau code d'écran
   avec une migration.
2. **Statut déjà en place.** Choisir le statut actuel puis « Enregistrer le statut » ferme la
   fenêtre sans rien écrire et sans message (la base n'écrit rien non plus). Faut-il plutôt dire
   « Le statut n'a pas changé. » ? Texte à valider si oui.

## À reprendre par les lots P3 et P4 (fusion)

- **`e2e/points.ecriture.spec.ts`** : passer `ECRANS_POSES` à `true` et vérifier que les tests de la
  section « interface » ne sont plus ignorés (`test.fixme`) et passent ; adapter `ouvrirTraites` à la
  forme des onglets de l'écran 05.
- **Maquettes** : une fois les boutons posés, revoir les écrans 05, 04, 12 et « À décider » contre
  leurs maquettes (place des boutons, ligne « Mentionné par ... »). Un ministère mentionné voit
  « Mentionné par Intégration. » avec les deux boutons.
- **Focus après « Marquer traité »** : le bouton disparaît à la relecture. `ActionsPoint` pose alors
  le focus sur l'ancêtre marqué `data-repli-focus` (sinon sur `#contenu`). P4 marque le bloc de la
  liste (ou le titre du bloc) avec cet attribut.
- **Tests de P4** : tout fichier qui pose `ActionsPoint` appelle `retirerAnnonce()` dans un
  `afterEach` (la zone de message est un singleton hors de l'arbre React).
- **`src/app/routes.tsx`** : le lot P1 y ajoute 3 lignes (l'import d'`ApercuActionsPoint`, un
  commentaire et la route `/apercu/points-actions`). P3 ajoute `/apercu/points` au même endroit : conflit simple, garder les
  deux.
- **Polices** : dans l'aperçu local, les polices de repli s'affichent (jonction `node_modules` hors
  de la liste d'accès de Vite). Contrôler Newsreader, Big Shoulders Display et Public Sans sur la
  CI ou la préproduction avant la fusion finale.
