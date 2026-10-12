# Écran 05 « Points d'attention » et « Mes points » : écarts avec la maquette

- **Lot** : P3 de l'étape 5 (plan des étapes 5 à 8, section 3.1), le 7 octobre 2026.
- **À faire par l'intégration (IO)** : recopier la liste ci-dessous dans « Écarts connus avec le
  brief » de `docs/reference/maquettes/LISEZMOI.md`, à côté de la ligne « 01, « À décider » ». Le
  lot P3 ne l'a pas écrite lui-même : le formateur du dépôt réécrit tout ce fichier (il est dans
  `.prettierignore`, mais pas dans le hook), ce qui aurait mêlé une réécriture complète à ce lot.
- **Essai du 7 octobre (revue)** : écrire ces écarts dans `LISEZMOI.md` avec Edit déclenche le
  hook de format, qui réécrit tout le fichier (125 lignes de diff, tableaux reformatés) malgré
  `.prettierignore`. L'essai a été annulé ; la recopie reste à faire à l'intégration, sans lancer
  le formateur sur ce fichier. Les textes proposés sont aussi dans `docs/decisions.md` (T36).
- **Statut** : tous les écarts sont **proposés** à la coordination, aucun n'est validé.

## Ce que lit l'écran

- `/points` : `?vue=ouverts|traites|tous` (« ouverts » par défaut, absent de l'adresse) et
  `?ministere=<identifiant>` (BRIEF, section 9).
- Le berger, le conseil et EJP Tech lisent tous les points ; le ministère lit ceux qu'il a créés ou
  qui le mentionnent, la base filtre. L'administration de l'église reçoit la page non disponible,
  sans aucune requête de données.
- « dépassée » se calcule avec `v_semaine.aujourdhui` (jour de Paris), jamais avec la date du
  navigateur.
- « Traité le 30 sept. par Coordination » : l'auteur est le nom du ministère du compte, sinon le
  libellé du compte (« Berger », « Conseil, compte 3 »). Jamais une personne.

## Écarts

1. Le filtre « Tous les ministères » est un vrai choix de liste, avec l'aide `points.filtre`. Les
   nombres des onglets suivent le ministère choisi. Un ministère désactivé figure dans le choix
   seulement s'il a créé un point ou s'il y est mentionné. « Mes points » du ministère n'a pas de
   filtre, et le paramètre `ministere` y est ignoré.
2. Une ligne « Attendu : ... » s'ajoute sous la description quand le ministère l'a écrite (la
   maquette 05 ne la montre pas ; « À décider » la montre déjà).
3. Un ministère désactivé garde son nom, avec « (désactivé) » : « Social (désactivé) »,
   « @Social (désactivé) ».
4. « Traités récemment » ne se montre que sous l'onglet Ouverts, et le bloc disparaît quand aucun
   point n'est traité (l'onglet Traités dit déjà « Aucun point traité pour l'instant. »).
5. Sous 1024 px, chaque point devient une carte (priorité et échéance en tête, puis le titre, la
   description, « Attendu », les mentions, « Statut : ... » et les boutons), comme « À décider ».
   À partir de 1024 px, ce sont les colonnes de la maquette. Un point traité n'a ni échéance ni
   bouton, et sa carte n'a pas de ligne de statut (« Traité le ... par ... » le dit déjà).
6. La phrase sous le titre de « Mes points » (« Les points créés par votre ministère ou qui le
   mentionnent, triés par priorité, puis par échéance. ») et celle d'EJP Tech (« Triés par
   priorité, puis par échéance. Les décisions se prennent en conseil ; vous lisez les points sans
   les modifier. ») sont proposées : la maquette ne donne que celle du berger et du conseil.
7. Le nombre rouge de l'onglet « Points d'attention 4 » de l'en-tête (maquette 05) n'est pas
   construit : l'en-tête appartient à un autre lot.
8. États vides proposés (T36) : « Aucun point pour l'instant. » (onglet Tous ; le ministère lit en
   plus « Les points que vous créez, et ceux qui vous mentionnent, apparaîtront ici. ») et
   « Aucun point ouvert pour Social. » (ministère choisi dans le filtre, situation « aucun
   résultat »). « Aucun point ouvert. » et « Aucun point traité pour l'instant. » sont ceux de
   LISEZMOI.
9. Les boutons « Changer le statut » et « Marquer traité » de chaque rangée sont ceux du composant
   `ActionsPoint` (lot P1) : l'écran lui donne le point et le compte. Tant que P1 n'est pas
   fusionné, il ne rend rien. Un test de l'écran vérifie qu'EJP Tech n'a aucun bouton.
