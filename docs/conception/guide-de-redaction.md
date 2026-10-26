# Guide de rédaction de Pilotage EJP

Statut : validé par la personne responsable le 19 octobre 2026 (T66, `docs/decisions.md`) ; proposé le 12 octobre 2026 avec l'inventaire des textes en production. Il complète « Textes de l'interface » de CLAUDE.md (français simple, voix active, pas de tiret cadratin ni demi-cadratin, pas d'emoji, des boutons qui disent ce qu'ils font). Il remplace la section 2 de `docs/conception/aides-contextuelles.md` pour tous les textes, pas seulement pour les bulles « ? ».

## 1. Le principe : chaque mot doit servir

Un texte à l'écran sert à **agir** ou à **comprendre un chiffre**. S'il ne fait ni l'un ni l'autre, on l'enlève. Shopify Polaris le dit ainsi : « Only add content that's necessary for clarity ». Microsoft : « Get to the point. Then stop. »

Avant d'écrire une phrase, posez trois questions :

1. Sans cette phrase, la personne se trompe-t-elle ou reste-t-elle bloquée ? Non : on ne l'écrit pas.
2. Un meilleur libellé (titre, bouton, nom de colonne) suffirait-il ? Oui : on change le libellé.
3. La phrase explique-t-elle le fonctionnement interne (ordre de tri, droits, historique, calcul, relecture, qui valide) ? Oui : on la retire de l'écran. Si l'information compte, elle va dans la page Aide ou dans la page Confidentialité.

## 2. Voix et ton

- On vouvoie. Phrases courtes, au présent, à la voix active. Une consigne commence par le verbe : « Saisissez », « Choisissez ».
- L'outil ne parle pas de lui-même : pas de « l'outil calcule », pas de « ici, on », pas de « nous » (Apple : « Avoid using we »).
- Ton neutre et calme. Pas de « veuillez », de « désolé », de « oups », de point d'exclamation. Pas de mot qui accuse, comme « invalide », « incorrect » ou « interdit » (GOV.UK, Polaris).
- Écrire pour une personne pressée, sur téléphone, un dimanche matin. Elle lit en diagonale.
- **Niveau de lecture** : fin de primaire ou début de collège. GitHub Primer et Polaris visent la 7th grade américaine, NN/g la 6th à 8th grade. À l'écran : 15 mots au plus par phrase, 2 phrases au plus par bloc. On emploie les mots de tous les jours : « 6 sur 8 » plutôt que « complétude ». Relisez le texte à voix haute (Microsoft, Apple, Polaris).

## 3. Quand nommer un rôle à l'écran

**Presque jamais.** On nomme EJP Tech, le berger, le conseil, l'administration ou la coordination dans un seul cas : la personne doit agir envers eux, ou attendre leur réponse.

- À garder : « Pour changer cette liste, demandez à EJP Tech. » Le statut « En attente de décision » se définit aussi par qui doit agir : le berger ou le conseil.
- À retirer : qui relit, qui voit, qui a créé une liste, qui valide en coulisses. Par exemple, « Prévus par la coordination » devient « Indicateurs prévus ». La page Confidentialité dit qui voit quoi.
- Seule exception : sous un champ libre, on peut nommer le lecteur quand il change ce que la personne va écrire (voir l'exemple 3).
- Jamais de nom d'équipe dans un message de réussite ou d'erreur, sauf le contact (chapitre 10).

## 4. Les règles pour chaque type de texte

- **Bouton** : un verbe et son objet, qui disent ce qui va se passer (« Enregistrer les chiffres », « Créer le point »). Pas de « OK », de « Valider » seul, de « Cliquez », ni de point final. 1 à 4 mots, 25 caractères visés. Un bouton qui ouvre un panneau porte le même nom que ce panneau (Polaris, Stripe).
- **Libellé de champ** : le nom de ce qu'on saisit, suivi de « (facultatif) » si besoin. Aucune consigne dedans. 1 à 5 mots.
- **Indication sous un champ** : ce qu'il faut savoir pour bien remplir (format, cas du zéro, exemple). Une phrase de 80 caractères au plus, sans lien. Pas de « qui voit », pas d'explication du fonctionnement. Le lecteur d'écran la relit chaque fois qu'on entre dans le champ (GOV.UK).
- **Aide « ? »** : définit un chiffre ou un terme qu'une personne nouvelle ne peut pas deviner. Jamais une information nécessaire pour remplir (NN/g). Une phrase de 90 caractères visés, 120 au plus. On ajoute un exemple chiffré seulement si la définition reste abstraite. On ne répète pas le libellé.
- **Introduction de page** : aucune, par défaut. Si elle est vraiment utile, une seule phrase qui dit à quoi sert la page ou quoi y faire, 120 caractères au plus. Elle ne parle jamais de l'ordre de tri, des droits, ni de « personne ne peut modifier ».
- **État vide** : d'abord ce qui manque (« Aucun point ouvert. »). Ensuite, si c'est utile, quand la liste se remplira ou quoi faire, en 14 mots au plus (Stripe). Le bouton reprend le même mot : « Aucune session. » va avec « Ajouter une session ». On distingue trois cas : rien n'existe, le filtre ne trouve rien, le chargement a échoué. Pas de « ci-dessous » ni de « avec le panneau ».
- **Message de réussite** : l'objet suivi du participe, avec la date si elle compte : « Chiffres du dimanche 27 sept. enregistrés. » 40 caractères visés. Pas de « avec succès » (Polaris, Atlassian, Material : « Security settings updated »).
- **Message d'erreur** : ce qui ne va pas et quoi faire, avec des chiffres et des dates précis, placé à côté du champ. Il dit aussi que la saisie est gardée. Pas de « erreur », « invalide », « veuillez », ni de code technique. Jamais un refus sans solution. 1 ou 2 phrases, 120 caractères au plus (NN/g, GOV.UK, Polaris).
- **Fenêtre de confirmation** : seulement pour une action définitive. Le titre est une question avec le verbe et l'objet (« Masquer ce texte ? »). Une phrase dit la conséquence. Le bouton reprend le verbe (« Masquer le texte »), à côté d'« Annuler ». Jamais « Êtes-vous sûr ? » (NN/g, Polaris). Quand c'est possible, on préfère un retour en arrière à une confirmation : Linear et Notion permettent de récupérer un élément supprimé pendant 30 jours.
- **Bandeau d'avertissement** : ce qui risque d'arriver et l'action à faire, en 1 ou 2 phrases.

## 5. Données personnelles et mentions légales

On écrit une seule phrase, une fois par formulaire, sous le premier champ libre : « N'écrivez aucun nom ni information personnelle. » Le reste va dans la page Confidentialité, accessible depuis le pied de page : la relecture, le masquage, la durée de conservation, qui lit quoi. On ne met pas de lien dans l'indication sous le champ (GOV.UK).

## 6. Montrer l'information par étapes

On montre l'information par niveaux. Il y en a trois, pas plus (NN/g, « progressive disclosure ») :

1. **L'écran lui-même** : libellés, chiffres, « 6 sur 8 », boutons. Il doit suffire à faire le travail.
2. **L'indication sous un champ ou l'aide « ? »** : une phrase.
3. **Les pages Aide et Confidentialité** : les règles complètes, comme le STAR compté une seule fois, le calcul du pourcentage, qui voit quoi ou le journal.

Une règle ne se dit qu'à un seul de ces niveaux, et une seule fois par écran.

État au 23 octobre 2026 : la page Confidentialité existe ; **la page Aide reste à créer** (T66). En attendant, les règles retirées des écrans sont dans les conditions d'utilisation, la page Confidentialité et, pour EJP Tech, son guide (`docs/exploitation.md`).

## 7. Accessibilité du texte

- L'indication reliée au champ par `aria-describedby` est relue à chaque arrivée dans le champ : une phrase courte suffit.
- L'erreur se place près du champ et dit quoi faire. On la comprend sans voir sa couleur.
- Pas de consigne qui dépend de la position ou du geste (« à droite », « ci-dessous », « avec le panneau », « cliquez ») : sur téléphone, la mise en page change (Mailchimp, Apple). On écrit « choisissez », « ouvrez ».
- Pas d'abréviation que le lecteur d'écran lit mal : « 6 départements sur 8 » plutôt que « 6 dép. sur 8 ». Les mois abrégés restent réservés aux tableaux.
- Un lien se comprend sans le reste de la phrase : « Ouvrir la fiche de Jeunesse » plutôt que « Voir » (Primer, Mailchimp).
- Les titres, libellés et boutons n'ont pas de point final ; les phrases en ont un. Les nombres s'écrivent en chiffres (« 3 jours »).

## 8. Avant et après : des textes de Pilotage EJP

1. Introduction des points (berger). Avant : « Triés par priorité, puis par échéance. Les décisions se prennent en conseil ; ici, on marque seulement ce qui est traité. » Après : rien. On voit déjà l'ordre, et la phrase décrit le fonctionnement avec « ici, on ».
2. Rappel sur les données personnelles. Avant : « N'écrivez aucun nom ni information personnelle. Les champs libres sont relus par EJP Tech. » Après : « N'écrivez aucun nom ni information personnelle. » La relecture est expliquée dans la page Confidentialité.
3. Sous « Précision ». Avant : « Lue par votre ministère, le berger, le conseil et EJP Tech. » Après : « Le berger et le conseil la lisent. » On ne garde que le lecteur qui change ce que la personne va écrire.
4. Ajout d'un indicateur en attente. Avant : « Indicateur en attente de validation par EJP Tech. Saisissez-le déjà : vos chiffres compteront s'il est validé. » Après : « En attente de validation. Vos chiffres compteront dès qu'il sera validé. » Le ministère n'a rien à faire envers EJP Tech.
5. Formulaire des chiffres par département (FIJ). Avant : « Laissez vide un département sans chiffre : il ne compte pas pour 0. Un chiffre déjà enregistré se corrige, il ne s'efface pas. » Après : « Laissez vide un département sans chiffre. »
6. Journal d'un ministère. Avant : « Chaque saisie, création et changement de statut de votre ministère laisse une ligne ici, avec la date et le compte. Personne ne peut modifier ni effacer le journal. » Après : « Ce que votre ministère a saisi ou modifié, avec la date. »
7. Ministères et comptes. Avant : « Les comptes sont créés ici, personne ne peut s'inscrire seul. Chacun se connecte avec Google ou un mot de passe, puis un code de double authentification. Désactiver un compte garde tout son historique. » Après : « Chaque compte créé reçoit une invitation par email. »
8. Modération, un écran que seul EJP Tech lit. Avant : « EJP Tech relit les textes libres pour retirer toute information personnelle. Masquer un texte garde une trace dans le journal, avec le motif. EJP Tech ne crée pas de compte et ne décide d'aucun accès. » Après : « Masquez les textes qui contiennent un nom ou une information personnelle. » L'écran parlait à EJP Tech de lui-même, à la troisième personne.
9. Signaler une difficulté. Avant : « EJP Tech lit votre signalement. Décrivez ce qui vous bloque en une ou deux phrases. » puis « Signalement envoyé. EJP Tech le lira. » Après : la première phrase disparaît, car le libellé « Quelle difficulté rencontrez-vous ? » suffit. La confirmation devient « Signalement envoyé. La réponse s'affichera sur cette page. » On dit ce qui va se passer, pas qui le fait.
10. Chiffres du dimanche, avant midi. Avant : « Avant 12 h, seuls les chiffres du matin se saisissent. Le reste s'ouvre à midi. » Après : « Les autres chiffres s'ouvrent à 12 h. »
11. Erreur dans une session. Avant : « Ce nombre ne peut pas dépasser les présents. » Après : « Saisissez 12 au plus, le nombre de présents. » Le message donne le nombre exact.
12. Erreur de date d'un événement. Avant : « La date ne peut pas être passée. » Après : « Cette date est passée. Choisissez aujourd'hui ou une date à venir. » C'est le texte du formulaire de signalement : les deux sont harmonisés.
13. Liste des sessions vide. Avant : « Aucune session déclarée. Déclarez la première avec le panneau. » Après : « Aucune session. » avec le bouton « Ajouter une session ».
14. Mentions d'un nouveau point. Avant : « Le ministère mentionné verra ce point, et seulement ce point. Il pourra le marquer traité en expliquant ce qui a été fait. Le berger et le conseil voient tous les points. » Après : « Le ministère mentionné verra ce point et pourra le marquer traité. »
15. Aide du statut d'un événement. Avant : « Mettez-le à jour dès que la validation est connue. Encore en attente 3 jours avant la date, il passe en alerte. » Après : « Mettez le statut à jour dès que vous connaissez la décision. »
16. Configuration des indicateurs. Avant : « Kumi suit 7 indicateurs sur 30 au plus : 6 prévus par la coordination et 1 ajouté par Kumi. » Après : « 7 indicateurs suivis. » Le détail reste dans le tableau.
17. À garder tel quel : « La connexion a échoué. Vos chiffres sont encore dans le formulaire : réessayez. » Le message dit ce qui s'est passé, rassure et donne l'action.

## 9. Ce qui change dans les règles de `aides-contextuelles.md` (section 2)

- La règle 3 (« dit en positif ») s'assouplit : une courte phrase négative est permise quand elle rassure ou protège, comme « N'écrivez aucun nom ».
- La règle 7 garde 120 caractères au plus, mais vise 90.
- La règle 9 renvoie au glossaire ci-dessous.
- Les règles nouvelles sont celles des sections 1, 3, 4 et 5 : le test des trois questions, les rôles presque jamais nommés, les longueurs par type de texte et le rappel en une phrase.

## 10. Les messages

Ce chapitre complète la section 4. Le détail, écran par écran, est dans l'inventaire du 12 octobre 2026 (274 lignes, m001 à m274), appliqué par T66.

Trois règles valent pour tous les messages :

- **Une même situation porte les mêmes mots partout.** On part toujours d'une formule du tableau de la section 10.10, jamais d'une phrase nouvelle.
- **Le contact pour toute demande ou tout problème est EJP Tech**, jamais l'administration de l'église (T59, T60). Cela précise la section 3 : un message d'erreur nomme EJP Tech quand la personne ne peut pas s'en sortir seule, et seulement dans ce cas. Trois tournures, pas d'autres : « Demandez à EJP Tech de ... » (une demande : compte, invitation, activation), « Contactez EJP Tech. » (compte désactivé), « si le problème revient, prévenez EJP Tech » (une panne qui dure). Sur les écrans d'EJP Tech, le recours s'adapte : il ne se prévient pas lui-même.
- **Aucun texte de la base, d'Auth ni d'une Edge Function ne s'affiche tel quel** (section 10.11).

### 10.1 Erreur

Règle : ce qui s'est passé, en mots simples, puis quoi faire. Jamais de reproche, de code, de « erreur », « invalide », « incorrect ». La saisie est gardée et le message le dit quand la personne a écrit quelque chose. 1 ou 2 phrases, 120 caractères au plus. L'erreur d'un champ va sous le champ ; celle d'un envoi, sous le bouton.

Formule : `{Ce qui s'est passé}. {Action}.`

- « La connexion a échoué. Vos chiffres sont encore dans le formulaire : réessayez. »
- « Ce point a déjà été marqué traité. Fermez cette fenêtre pour mettre la page à jour. »

### 10.2 Réussite

Règle : courte, au passé, elle dit ce qui a été fait. L'objet, puis le participe du verbe du bouton, avec la date si elle compte. 40 caractères visés. Jamais « avec succès », jamais de nom d'équipe. Visible 6 secondes, et tant que la souris ou le focus est dessus. Une réussite qui porte une consigne à transmettre reste jusqu'à l'action suivante.

Formule : `{Objet} {participe}.` ; pour une correction : `Correction {de l'objet} enregistrée.`

- « Chiffres du dimanche 27 sept. enregistrés. »
- « Session Bâtir l'Église du 10 oct. ajoutée. »

### 10.3 Avertissement

Règle : ce qui risque d'arriver, puis l'action à faire. 1 ou 2 phrases. Un bandeau, pas une fenêtre.

Formule : `{Ce qui risque d'arriver}. {Action}.`

- « Cet événement attend toujours sa validation. Choisissez son nouveau statut ou changez sa date. »
- « Pas de connexion internet. Les chiffres affichés peuvent dater, et vos saisies ne s'enregistrent pas. »

### 10.4 Information

Règle : seulement si, sans elle, la personne se trompe ou reste bloquée (section 1). Une phrase, pas de fonctionnement interne (tri, droits, historique, relecture). Une indication sous un champ : 80 caractères au plus.

Formule : `{Fait utile}.` ou `{Consigne qui commence par le verbe}.`

- « Déjà saisi : 10, le 27 sept. à 12 h 41. »
- « Les autres chiffres s'ouvrent à 12 h. »

### 10.5 État vide

Règle : d'abord ce qui manque, puis, seulement si c'est utile, quand la liste se remplira (14 mots au plus). Le bouton reprend le même mot. Pas de « pour l'instant », pas de « ici », pas de « ci-dessous ». Trois cas distincts : rien n'existe, le filtre ne trouve rien, la lecture a échoué (ce dernier est une erreur, section 10.1).

Formule : `Aucun {objet}.` + bouton ; filtre : `Aucun {objet} pour {filtre}.` + « Retirer les filtres » ; adresse inconnue : `{Objet} est introuvable.` + bouton de retour.

- « Aucune session. » avec le bouton « Ajouter une session »
- « Aucune ligne pour ces filtres. » avec le bouton « Retirer les filtres »

### 10.6 Chargement et attente

Règle : rien pendant 300 ms, puis le nom de ce qui charge, dans une zone `role="status"` (T65 : « Chargement de Ma semaine », avec la flamme d'EJP Tech). Sur un bouton qui travaille, le nom de son action suivi de « en cours ». « Enregistrement » quand on enregistre, « Envoi » quand quelque chose part (signalement, email, invitation) ; une action qui a son propre nom le garde (« Création en cours », « Désactivation en cours », « Retrait en cours »).

Formule : `Chargement de {ce qui charge}` ; bouton : `{Nom de l'action} en cours`

- « Enregistrement en cours » (toutes les saisies, points, événements, sessions)
- « Envoi en cours » (Signaler une difficulté, Mot de passe oublié, Renvoyer l'invitation)

### 10.7 Confirmation avant une action

Règle : seulement pour une action définitive, ou une perte de saisie. Le titre est une question avec le verbe et l'objet. Une phrase dit la conséquence, puis si elle est définitive. Le bouton reprend le verbe du titre, à côté d'« Annuler ». Jamais « Êtes-vous sûr ? ». Une action qui se défait le dit au lieu de faire peur.

Formule : `{Verbe} {objet} ?` / `{Conséquence}. {Irréversibilité}` / bouton `{Verbe} {objet}`. Irréversibilité : « C'est définitif. » pour supprimer, masquer, retirer, effacer ; « Un {objet} {participe} ne se rouvre pas. » pour traiter, clore ; « Vous pourrez le réactiver. » pour désactiver.

- « Masquer ce texte ? » / « Le texte sera remplacé par « [texte masqué] ». C'est définitif. » / « Masquer le texte »
- « Fermer sans enregistrer ? » / « Ce que vous avez saisi sera perdu. » / « Fermer sans enregistrer » et « Continuer la saisie »

### 10.8 Erreur de validation d'un champ

Règle : une consigne qui commence par le verbe, avec le nombre exact, placée sous le champ et reliée par `aria-describedby`. Le focus va au premier champ en erreur. Le même texte sert au contrôle avant l'envoi et à la traduction du refus de la base.

Formules :

- champ obligatoire : `Saisissez ...` (texte, nombre), `Choisissez ...` (liste, date, option), `Cochez ...` (case), `Donnez un nom à ...` ; nombre : « Saisissez un nombre, 0 si aucun. »
- nombre hors limites : `Saisissez un nombre entre 0 et {max}.` ; par rapport à un autre champ : `Saisissez {n} au plus, le nombre de {référence}.`
- texte trop court, champ obligatoire : `{Verbe} {objet} (10 caractères au moins).` ; champ facultatif : `Écrivez au moins 10 caractères, ou laissez {objet} vide.`
- texte trop long : `Raccourcissez {objet} : {N} caractères au plus.`

Exemples :

- « Saisissez 14 au plus, le nombre de STARs actifs. »
- « Raccourcissez le signalement : 280 caractères au plus. »

### 10.9 Message venu de la base, d'Auth ou d'une Edge Function

Règle : il ne s'affiche jamais tel quel. Il passe par une table de traduction (section 10.11) qui lui donne un texte de ce guide et dit sous quel champ le placer. Si l'interface contrôle déjà le cas avant l'envoi, la traduction reprend exactement le même texte. Un refus qui dépend d'un changement fait entre-temps dit quoi recharger.

Formule : la formule du type correspondant (10.1 ou 10.8), jamais le texte SQL.

- « Une session % est déjà déclarée le %. » devient « Une session Bâtir l'Église existe déjà le 10 oct. Choisissez une autre date. »
- « Double authentification requise. » (42501) devient « Votre connexion a expiré. Reconnectez-vous. »

### 10.10 Formules communes

| Situation                               | Formule type                                                                                                                                                                                                                                                      | Où dans l'outil                                                                                                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enregistrement réussi                   | `{Objet} {participe}.` : « Chiffres du dimanche 27 sept. enregistrés. », « Point créé. », « Événement ajouté au calendrier. »                                                                                                                                     | toutes les saisies et actions                                                                                                                                    |
| Correction réussie                      | `Correction {de l'objet} enregistrée.` : « Correction de septembre 2026 enregistrée. »                                                                                                                                                                            | dimanche, mois, présence, indicateur                                                                                                                             |
| Déjà enregistré (rien n'a changé)       | `{Ceci} est déjà enregistré. Changez {...} pour le corriger.` : « Cette saisie est déjà enregistrée. Changez un chiffre pour la corriger. »                                                                                                                       | saisies, événement, réunion, statut, mentions                                                                                                                    |
| Envoi impossible (pas de réponse)       | « La connexion a échoué. Vos chiffres sont encore dans le formulaire : réessayez. » ; autres formulaires : « La connexion a échoué. Votre saisie est encore dans le formulaire : réessayez. » ; puis la référence (T76)                                           | tout envoi qui se refait sans doublon, et toute création partie hors ligne                                                                                       |
| Lecture impossible                      | « La connexion a échoué. Réessayez. » + bouton « Réessayer » ; au 2e échec : « La connexion a échoué. Réessayez, et si le problème revient, prévenez EJP Tech. »                                                                                                  | pages, blocs, panneaux                                                                                                                                           |
| Action peut-être faite (issue inconnue) | « La connexion a échoué. Vérifiez la liste avant de réessayer. » ; puis la référence (T76). Pour un événement, un point ou un signalement, le numéro anti-doublon rend le nouvel essai sans risque (lot B) : la phrase reste, car l'ancien site n'a pas de numéro | toute création restée sans réponse, à la réponse perdue ou illisible, ou au délai dépassé (événement, point, signalement, demande, session, indicateur, comptes) |
| Premier envoi déjà enregistré (T76)     | « Votre premier envoi est déjà enregistré. Vérifiez la liste avant de réessayer. » ; la liste est relue                                                                                                                                                           | événement, point, signalement renvoyés avec leur numéro mais d'autres valeurs                                                                                    |
| Référence d'un échec technique (T76)    | « Référence pour EJP Tech : K7Q4MX », sur une seconde ligne, plus petite, sous la phrase ; sur les écrans d'EJP Tech, « Référence : K7Q4MX » ; épelée au lecteur d'écran ; jamais sous un refus de la base                                                        | échecs techniques et pannes des formulaires                                                                                                                      |
| Panne (refus inattendu)                 | `{L'enregistrement / L'action} n'a pas abouti{, votre saisie est gardée}. Réessayez, et si le problème revient, prévenez EJP Tech.`                                                                                                                               | repli de la table, erreur_interne, Auth 5xx                                                                                                                      |
| Connexion expirée                       | « Votre connexion a expiré. Reconnectez-vous. » + lien « Se reconnecter »                                                                                                                                                                                         | bandeau de connexion, comptes, tout 42501 de double authentification, 401                                                                                        |
| Compte désactivé                        | « Ce compte est désactivé. Contactez EJP Tech. »                                                                                                                                                                                                                  | connexion, /compte-desactive, lien, 42501 « Compte inactif ou inconnu. »                                                                                         |
| Droit refusé                            | `Votre compte ne permet pas de {action}.` : « Votre compte ne permet pas de gérer les comptes. » ; page : « Cette page n'est pas disponible avec votre compte. »                                                                                                  | comptes, points, sessions, pages                                                                                                                                 |
| Élément introuvable                     | `{Objet} est introuvable. Rechargez la page.` ; dans une fenêtre : `... Fermez cette fenêtre pour mettre la page à jour.` ; état vide : `{Objet} est introuvable.` + bouton                                                                                       | tout autre 42501, adresses inconnues                                                                                                                             |
| Changé entre-temps                      | `{Ce qui a changé}. Rechargez la page, puis réessayez.` ; si l'écran se met à jour seul, le fait suffit : « Ce signalement est déjà clos. »                                                                                                                       | catégories, indicateur retiré, point traité, conditions                                                                                                          |
| Lien expiré                             | titre « Ce lien n'est plus valable », puis « Demandez à EJP Tech de renvoyer l'invitation. » ou le lien « Demander un nouveau lien »                                                                                                                              | /acces, emails                                                                                                                                                   |
| Champ obligatoire                       | `Saisissez / Choisissez / Cochez / Donnez un nom ...` ; nombre : « Saisissez un nombre, 0 si aucun. »                                                                                                                                                             | tous les formulaires                                                                                                                                             |
| Nombre hors limites                     | `Saisissez un nombre entre 0 et {max}.` ; `Saisissez {n} au plus, le nombre de {référence}.`                                                                                                                                                                      | chiffres, présence, FIJ                                                                                                                                          |
| Texte trop court                        | obligatoire : `{Verbe} {objet} (10 caractères au moins).` ; facultatif : `Écrivez au moins 10 caractères, ou laissez {objet} vide.`                                                                                                                               | point traité, signalement, précision, clôture, motif                                                                                                             |
| Texte trop long                         | `Raccourcissez {objet} : {N} caractères au plus.`                                                                                                                                                                                                                 | tous les textes libres, mot de passe, email                                                                                                                      |
| Date passée                             | « Cette date est passée. Choisissez aujourd'hui ou une date à venir. »                                                                                                                                                                                            | événement, réunion, échéance d'un point                                                                                                                          |
| Ministère coché désactivé               | « Un ministère coché a été désactivé. Décochez-le, puis réessayez. »                                                                                                                                                                                              | mentions, ministères attendus                                                                                                                                    |
| Données personnelles refusées           | rappel : « N'écrivez aucun nom ni information personnelle. » ; refus : « Retirez de votre texte les emails, liens, numéros et noms de personnes. »                                                                                                                | tout texte libre                                                                                                                                                 |
| Texte masqué                            | à l'affichage : « [texte masqué] » ; sous un champ : « Votre {texte} a été masqué. »                                                                                                                                                                              | partout                                                                                                                                                          |
| Action irréversible                     | `{Verbe} {objet} ?` + conséquence + « C'est définitif. » ou « Un {objet} {participe} ne se rouvre pas. » + bouton `{Verbe} {objet}`                                                                                                                               | masquer, supprimer, retirer, effacer, traiter, clore                                                                                                             |
| Attente                                 | `Chargement de {ce qui charge}` ; `{Nom de l'action} en cours`                                                                                                                                                                                                    | tous les boutons                                                                                                                                                 |
| Recours                                 | « si le problème revient, prévenez EJP Tech » (fin de phrase) ou « Si le problème revient, prévenez EJP Tech. » (phrase seule)                                                                                                                                    | pannes, erreur d'affichage                                                                                                                                       |

### 10.11 Traduire les messages de la base

1. **Aucun message brut à l'écran.** Un texte de `raise exception`, un code PostgREST, une erreur d'Auth ou d'une Edge Function n'est jamais montré tel quel.
2. **Une seule table**, `src/data/messagesBase.ts`. Chaque entrée associe un texte SQL exact, ou son début quand il porte un `%`, à un texte de ce guide et au champ où le placer. Les écrans ne comparent plus les textes chacun de leur côté. Le texte SQL reste la clé : réécrire l'interface ne demande aucune migration.
3. **Le code décide d'abord, le texte ensuite :**
   - pas de code : le classement unique de `src/data/echecEnvoi.ts` (T76) lit les faits de l'envoi (statut reçu, corps perdu, notre délai, hors ligne au départ). Un 2xx vaut « enregistré » (pour un événement, un point ou un signalement, la réussite de l'écran) ; aucune réponse, une réponse perdue ou illisible en 5xx, ou le délai, une issue inconnue : « action peut-être faite » pour une création, « envoi impossible » sinon ; hors ligne au départ : « envoi impossible » ; une exception du code : le **message de repli**, jamais « La connexion a échoué » ; une lecture garde « lecture impossible ». Les trois créations à numéro repartent seules une fois après un échec rapide (aucune réponse en ligne, corps perdu sans 2xx), jamais après le délai ;
   - 42501 « permission denied for ... » (requête partie sans jeton) : « connexion expirée » ;
   - 401 ou PGRST301 : « connexion expirée » ;
   - 42501 : « Double authentification requise. » donne « connexion expirée » ; « Compte inactif ou inconnu. » donne « compte désactivé » ; « Seul ... » donne « droit refusé » ; tout autre 42501 donne « élément introuvable » ;
   - P0001 : le texte de la table ;
   - P0001 absent de la table, 23505, 23514, 23503, 22003, 22P02, ZodError imprévue de la couche data : le **message de repli**.
4. **Message de repli** : « L'enregistrement n'a pas abouti, votre saisie est gardée. Réessayez, et si le problème revient, prévenez EJP Tech. » Pour une action sans formulaire : « L'action n'a pas abouti. Réessayez, et si le problème revient, prévenez EJP Tech. »
5. **Auth** : `traduireErreur` garde sa table de codes ; son dernier cas sépare le réseau (« La connexion a échoué. Réessayez. ») de la panne (« La connexion n'a pas abouti. Réessayez dans quelques minutes, et si le problème revient, prévenez EJP Tech. »). `user_banned` est testé avant tout autre 4xx, y compris dans `verifierLien`.
6. **Edge Functions** : un code par cas, traduit par `MESSAGES_ERREURS_COMPTES` (le type Record impose un texte par code). Un code inconnu prend `erreur_interne`, c'est-à-dire la formule « panne ».
7. **Un test garde la règle** (`src/data/messagesBase.test.ts`) : il lit chaque `raise exception` des migrations et vérifie qu'il est dans la table, ou dans la liste des garde-fous qui prennent le repli. Toute nouvelle migration qui ajoute un message sans traduction fait échouer le test.
8. Les textes techniques (nom de table, de fonction, « catalogue à corriger ») restent dans les journaux, jamais à l'écran.

## Glossaire : un mot par idée

Règle : un même mot pour une même idée, partout dans l'outil (Apple : « Create a list of common terms » ; Primer : « use consistent terminology »). Ce glossaire s'appuie sur l'interface en production le 12 octobre 2026, revue par T66.

### Les acteurs

- **ministère** : l'équipe qui saisit. Ne pas dire « équipe » ni « service ». Ne pas confondre avec « département », qui ne désigne que la carte des FIJ.
- **compte** : l'accès de connexion, partagé dans un ministère. Ne pas dire « utilisateur » ni « profil » à l'écran (« profil » est un mot du code).
- **le berger**, **le conseil** : en minuscules, à nommer seulement quand la personne doit agir envers eux (section 3). Ensemble : « le berger et le conseil ». Question ouverte : faut-il un nom court pour les deux ?
- **l'administration** : l'administration de l'église, qui ajoute les sessions avec EJP Tech (T60). À nommer rarement.
- **EJP Tech** : à nommer seulement quand la personne doit lui écrire, et dans la page Confidentialité. Jamais dans un rappel ni une réussite ; dans une erreur, seulement comme contact (chapitre 10).
- **la coordination** : à ne jamais nommer sur l'écran d'un ministère. Sur les écrans de configuration : « Indicateurs prévus », sans dire qui les a prévus.

### Les chiffres

- **STAR**, au pluriel **STARs** (l'usage actuel de l'église). On ne développe pas le sigle. Expressions fixes : « STARs actifs », « STARs au service ce dimanche », « ministère principal ».
- **chiffre** : une valeur saisie pour une date (« Chiffres du dimanche », « Chiffres du mois », « Vos chiffres »). C'est le mot à employer avec un ministère.
- **indicateur** : ce qu'on mesure, la ligne avec son nom. On l'emploie dans la configuration (« Indicateurs », « Mes indicateurs », « à valider »). On saisit un chiffre pour un indicateur. Son **nom** (pas son « libellé ») et sa **définition**.
- **total** : la somme de plusieurs ministères. On écrit toujours « 6 sur 8 ». Jamais « complétude », « agrégat » ni « taux de remplissage ».
- **écart** : la différence avec le dimanche précédent, écrite « +3 ». Ne pas dire « variation » ni « delta ».
- **courbe** : la petite évolution dans le temps. Ne pas dire « graphique » ni « sparkline ».
- **pourcentage** : il se calcule, ne se saisit jamais. On écrit « 77 % des actifs ».
- **FIJ**, **carte des FIJ**, **département** : vocabulaire de FIJ seulement. Écrire « départements » en entier dans les phrases, pas « dép. ».
- **Précision** : le texte facultatif joint au chiffre d'un mois. À l'écran, on dit « texte » ; « champ libre » est un mot interne, à éviter.
- **Répartition** : le détail d'un total par catégorie, « Répartition par catégorie (facultatif) » dans la saisie, « Répartition par catégorie » sur la fiche (T66).

### Les verbes

- **saisir** : ce que fait la personne (« Saisissez le nombre de STARs présents »). Le nom correspondant est **saisie**. Ne pas dire « renseigner » ni « déclarer » pour un chiffre. « Non renseignée » devient « Aucune date ».
- **Enregistrer** : le bouton qui envoie (« Enregistrer les chiffres »). Le message de réussite dit « enregistré(s) ».
- **Corriger** : saisir de nouveau un chiffre déjà enregistré. Réussite : « Correction enregistrée. »
- **Ajouter** : mettre un élément dans une liste (événement, session, réunion). Ne pas dire « déclarer ». « Déclarez la première » devient « Ajouter une session ».
- **Créer** : faire naître un élément qui a sa propre vie (point, compte, ministère, indicateur).
- **Désactiver** : un compte ou un ministère. Ne pas dire « supprimer », car l'historique reste.
- **Masquer** : réservé à la modération. On affiche « [texte masqué] ».
- **Renvoyer** : une invitation (« Renvoyer l'invitation », « Invitation renvoyée »). Ne pas dire « relancer ».

### Les points

- **point** : le mot à employer partout (« Nouveau point », « Créer le point », « Mes points »). « Point d'attention » reste le nom de l'écran du berger et du conseil, dans leur menu (décision 4 de T66), et sert de définition dans la page Aide.
- **Statuts** : À traiter, En cours, En attente de décision, Traité. L'action s'appelle « Marquer traité ».
- **mentionner**, **ministère mentionné** : ne pas dire « tagger », « associer » ni « lier ».
- **Priorité** : Normale, Haute, Urgente. **Échéance** : le dernier jour utile.

### Les événements, sessions et réunions

- **événement** : il a un statut ; « En attente de validation » est un statut parmi d'autres.
- **session** : Bâtir l'Église, Anti-Dispersion ou autre session. Ne pas dire « rassemblement » : « Donnez un nom au rassemblement » devient « Donnez un nom à la session ».
- **réunion** : à l'écran, « Prochaine réunion » et « Décision attendue ».

### Les pages

- **fiche** : la page d'un ministère. Dans le menu d'un ministère : « Ma fiche ». Ne pas dire « tableau de bord » ni « profil ».
- **Ma semaine** : l'accueil d'un ministère. **Cette semaine** : la vue de l'église.
- **journal** : l'historique des actions. Pour EJP Tech : « Journal technique ».
- **signalement**, **Signaler une difficulté** : un signalement est « ouvert » puis « clos » ; EJP Tech y écrit une **réponse**.

### Le compte et la connexion

- **double authentification**, **code** : le code à 6 chiffres. Ne pas dire « 2FA », « TOTP » ni « aal2 ».
- **invitation** : le lien reçu par email.
- **mot de passe** : « Mot de passe oublié ».
- **connexion** : « Votre connexion a expiré ». Le mot « session » est réservé aux sessions de l'église.

### Les possessifs

- Menus et titres de page : « Ma », « Mes », « Mon » (« Ma fiche », « Mes points », « Mon journal »).
- Phrases adressées à la personne : « vous », « votre », « vos ».
- Un titre de bloc reprend le mot exact du menu qui mène à la même chose : le bloc « Mes points » de « Ma semaine », même à côté de « Vos saisies » (décision 3 de T66).

## Sources

Consultées le 12 octobre 2026.

### Systèmes de design et guides de rédaction

- **Shopify Polaris, « Fundamentals »** : n'ajouter que le texte nécessaire, viser la 7th grade, commencer par un verbe, montrer l'information par étapes. Le site polaris.shopify.com redirige maintenant vers shopify.dev ; la page a été lue dans le dépôt archivé. https://github.com/Shopify/polaris-react-archive/blob/main/polaris.shopify.com/content/content/fundamentals.mdx
- **Shopify Polaris, « Error messages »** : dire ce qui ne va pas et quoi faire, sans « invalid », sans s'excuser à l'excès. https://github.com/Shopify/polaris-react-archive/blob/main/polaris.shopify.com/content/content/error-messages.mdx
- **Shopify Polaris, consignes de rédaction des composants** : Toast (« noun + verb », « Product updated »), Modal (titre sous forme de question, pas de « Are you sure »), Empty state, Button (verbe et nom, sans article), Text field (aide reliée par aria-describedby, rien d'indispensable dans le texte d'exemple). Dossier : https://github.com/Shopify/polaris-react-archive/tree/main/polaris.shopify.com/content/components (deprecated/toast.mdx, deprecated/modal.mdx, layout-and-structure/empty-state.mdx, actions/button.mdx, selection-and-input/text-field.mdx)
- **Atlassian Design System** :
  - Voice and tone, « Tell people only what they need to know in the moment » : https://atlassian.design/foundations/content/voice-tone/
  - Designing messages : https://atlassian.design/foundations/content/designing-messages/
  - Empty state, corps de 1 ou 2 phrases, bouton de 1 ou 2 mots : https://atlassian.design/foundations/content/designing-messages/empty-state
  - Error messages, sans « please » ni « sorry » : https://atlassian.design/foundations/content/designing-messages/error-messages
  - Success messages, sans « successfully » ni point d'exclamation : https://atlassian.design/foundations/content/designing-messages/success-messages
- **Google Material Design**, codelab « Material's Communication Principles: Intro to UX Writing » (« Write short, scannable segments », « Only communicate the essential details ») : https://codelabs.developers.google.com/codelabs/material-communication-guidance
- **Apple Human Interface Guidelines, « Writing »** : liste de termes communs, des verbes sur les boutons, pas de « we », pas de « click » sur un écran tactile, erreur près du champ et sans reproche. Lu par la version JSON de la page. https://developer.apple.com/design/human-interface-guidelines/writing
- **Microsoft Writing Style Guide** :
  - « Top 10 tips for Microsoft style and voice » (« Shorter is always better », « Get to the point fast », « Edit out you can ») : https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice
  - « Scannable content » (« Use short, simple words. Get to the point. Then stop. ») : https://learn.microsoft.com/en-us/style-guide/scannable-content/
  - « Error message guidelines » (ce qui s'est passé, la conséquence, quoi faire, sans rendre la personne fautive) : https://learn.microsoft.com/en-us/windows/win32/debug/error-message-guidelines
- **Mailchimp Content Style Guide** :
  - « Voice and tone » (« it's always more important to be clear than entertaining ») : https://styleguide.mailchimp.com/voice-and-tone/
  - « Writing for accessibility » (phrases courtes, pas de consigne de position, pas de « click here ») : https://styleguide.mailchimp.com/writing-for-accessibility/
- **GitHub Primer** :
  - « Content » (7th grade, verbe à l'impératif, pas de point d'exclamation, mêmes mots partout) : https://primer.style/product/getting-started/foundations/content
  - « Empty states » : https://primer.style/product/ui-patterns/empty-states/
- **Stripe** :
  - « Empty state » (« No customers yet. » avec « Add customer » ; une description de moins de 14 mots ; ne pas confondre un état vide et une erreur) : https://docs.stripe.com/stripe-apps/patterns/empty-state
  - « Communicating state » (toast de moins de 4 mots, 30 caractères au plus, « Changes saved ») : https://docs.stripe.com/stripe-apps/patterns/communicating-state
  - Boutons en « verb + noun » (« Update customer »), sans ponctuation : https://docs.stripe.com/stripe-apps/components/button
- **Linear**, exemple réel : suppression par « Delete issue », retour en arrière par Cmd Z, « Recently deleted issues » gardés 30 jours, ce qui remplace une confirmation. https://linear.app/docs/delete-archive-issues
- **Notion**, exemple réel : « Delete », « Trash », « Restore », pages gardées 30 jours dans la corbeille. https://www.notion.com/help/duplicate-delete-and-restore-content

### Nielsen Norman Group

- Tooltip Guidelines : rien d'indispensable dans une bulle, ne pas répéter le libellé. https://www.nngroup.com/articles/tooltip-guidelines/
- Error-Message Guidelines : près du champ, précis, sans reproche, garder la saisie. https://www.nngroup.com/articles/error-message-guidelines/
- Designing Empty States in Complex Applications : dire l'état, aider à apprendre, donner un accès direct à l'action. https://www.nngroup.com/articles/empty-state-interface-design/
- Confirmation Dialogs : les réserver aux actions graves, être précis, des boutons avec un verbe. https://www.nngroup.com/articles/confirmation-dialog/
- Progressive Disclosure : deux niveaux de préférence ; plus de deux niveaux nuisent. https://www.nngroup.com/articles/progressive-disclosure/
- Writing for Lower-Literacy Users : niveau 6th à 8th grade ; les textes simplifiés profitent à tous les lecteurs. https://www.nngroup.com/articles/writing-for-lower-literacy-users/
- Microcontent, How to Write Headlines : mettre les mots importants en premier, la clarté avant l'humour. https://www.nngroup.com/articles/microcontent-how-to-write-headlines-page-titles-and-subject-lines/

### GOV.UK

- Text input, hint text : une seule phrase courte, sans lien, reliée par aria-describedby, jamais dans le texte d'exemple. https://design-system.service.gov.uk/components/text-input/
- Question pages : dire pourquoi on pose la question ; une longue explication ne va pas dans l'indication. https://design-system.service.gov.uk/patterns/question-pages/
- Error message : être précis, dire quoi faire, sans « please », « sorry », « invalid » ni « forbidden ». https://design-system.service.gov.uk/components/error-message/
- A to Z style guide, « Plain English » : mots à éviter, vérifier toute phrase de plus de 25 mots. https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/

### Sources internes

L'inventaire a lu la production du 12 octobre 2026 (branche `main`, commit `ebc0170`) :

- `CLAUDE.md`, section « Textes de l'interface » ;
- `docs/conception/aides-contextuelles.md`, sections 1, 2 et 6 ;
- `src/components/aide/textesAide.ts` ;
- les fichiers de textes des écrans dans `src/features/` : `saisie/textes.ts`, `saisie-chiffres/textes.ts`, `nouveau-point/textes.ts`, `points-actions/textes.ts`, `points/textesPoints.ts`, `signalement/textes.ts`, `moderation/textes.ts`, `comptes/textes.ts`, `indicateurs/configuration/textes.ts`, `sessions/textes.ts`, `evenements/textes.ts`, `fiche/textesFiche.ts`, `cette-semaine/textesVides.ts`, `cette-semaine/textesAConfirmer.ts`, `cette-semaine/construire.ts` (`NOTE_CHIFFRES`), `saisie-fij/FormulaireStatistiquesFij.tsx`, `saisie-session/schemas.ts`.

### Limites de la recherche

- Les pages Polaris en ligne redirigent vers shopify.dev : elles ont été lues dans le dépôt GitHub archivé de Shopify, sans doute la dernière version publiée.
- Les pages de Material Design 3 (m3.material.io) ne se lisent pas sans JavaScript. Material est cité par son codelab officiel.
- La page NN/g sur la microcopie et la page GOV.UK « Use clear language » renvoient une erreur 404 : elles ne sont pas citées.
- Linear et Notion ne publient pas de guide de rédaction. Leurs exemples viennent de leurs pages d'aide officielles, pas de leurs écrans.
- Le niveau de lecture en France (fin de primaire, début de collège) est une transposition des niveaux américains de Primer, Polaris et NN/g. Aucune source ne le formule pour le français.
