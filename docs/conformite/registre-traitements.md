# Registre des traitements : Pilotage EJP

- **Version** : 1 (projet)
- **Date** : 6 octobre 2026
- **Auteur** : EJP Tech
- **Statut** : Projet à valider par la coordination
- **Pour** : la coordination de l'Église des Jeunes Prodiges
- **Sources** : pages « Confidentialité » et « Conditions d'utilisation » de l'outil (textes validés
  le 5 octobre 2026, T17), `BRIEF.md` (sections 2, 3, 7 et 8), `docs/decisions.md`,
  `docs/conception/vague-1-decisions.md`, `supabase/config.toml`, `supabase/templates/`
- **Document lié** : `docs/conformite/note-indicateurs-sensibles.md` (note d'analyse des indicateurs
  sensibles)

## À quoi sert ce document

Le RGPD (article 30) demande à chaque organisme de tenir la liste de ses traitements de données
personnelles. Ce document donne les fiches de l'outil Pilotage EJP. Il s'ajoute au registre de
l'église : il ne le remplace pas.

Le registre est obligatoire ici. L'exception prévue pour les petites structures (article 30.5) ne
s'applique pas : l'outil sert chaque semaine, et un compte dans l'outil d'une église peut révéler
une appartenance religieuse (article 9).

Comment le lire :

- les informations communes à toutes les fiches viennent d'abord (responsable, prestataires,
  durées, droits, sécurité) ;
- chaque fiche suit ensuite le même plan ;
- un champ « À compléter par EJP Tech » est un fait que les sources du projet ne donnent pas. Tous
  ces champs sont repris à la fin du document.

Les aides contextuelles (petites bulles d'aide) demandées le 6 octobre 2026 sont des textes fixes :
elles ne créent aucun traitement.

## Informations communes

### Responsable du traitement

- **Organisme** : l'Église des Jeunes Prodiges (EJP), association, par son ministère EJP Tech.
- **Adresse** : 21 rue des Vieilles Vignes, 77183 Croissy-Beaubourg.
- **Contact pour les données** : EJP Tech, eglisejp.tech@gmail.com.
- **Représentant légal** : À compléter par EJP Tech : nom et fonction du représentant légal de
  l'association.
- **Délégué à la protection des données (DPO)** : À compléter par EJP Tech : dire si l'église a
  désigné un DPO. Si elle n'en a pas, l'écrire ici.
- **Rôle de la coordination** : elle décide au nom de l'église. Elle valide ce registre, les textes
  de l'outil, les indicateurs et la fin de vie de l'outil.

### Prestataires (sous-traitants) et lieu des données

| Prestataire | Ce qu'il fait pour l'outil                                                         | Où sont les données                                     | Cadre                                                                                                                                           |
| ----------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase    | Base de données, connexion, fonctions du serveur, journaux techniques, sauvegardes | Région Paris (Union européenne)                         | Contrat. À compléter par EJP Tech : accord de sous-traitance (article 28) accepté ou signé, avec sa date                                        |
| Netlify     | Hébergement du site (les pages de l'application), journaux techniques              | À compléter par EJP Tech : région d'hébergement du site | Contrat. Société établie aux États-Unis. À compléter par EJP Tech : accord de sous-traitance accepté ou signé                                   |
| Google      | Connexion avec Google ; envoi des emails par la messagerie Gmail de l'église       | États-Unis                                              | Contrat. À compléter par EJP Tech : type de compte de l'église (Gmail gratuit ou Google Workspace) et conditions de traitement qui s'appliquent |

Deux projets Supabase existent :

- **préproduction** : offre gratuite, région Paris, créée le 5 octobre 2026. Elle ne contient que
  des données fictives ;
- **production** : offre Pro, région Paris (proposition P12, à confirmer par la coordination).

Les données de production ne sont jamais copiées vers la préproduction.

### Transferts hors de l'Union européenne

- La base de données est hébergée en région Paris.
- Google et Netlify sont établis aux États-Unis. Les transferts s'appuient sur le cadre de
  protection des données entre l'Union européenne et les États-Unis, ou sur les clauses
  contractuelles types de la Commission européenne.
- À compléter par EJP Tech : vérifier que Google et Netlify figurent sur la liste du cadre de
  protection des données (dataprivacyframework.gov), et noter la date de la vérification.
- À compléter par EJP Tech : société avec qui l'église a contracté pour Supabase, et accès possible
  aux données depuis l'extérieur de l'Union européenne (support, administration du service).

### Durées de conservation

| Données                                 | Durée                                                                                               |
| --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Comptes, saisies, historique et journal | Toute la vie de l'outil, puis suppression à son arrêt, après l'export final remis à la coordination |
| Compte désactivé                        | Gardé jusqu'à l'arrêt de l'outil, car ses saisies restent dans l'historique                         |
| Nom et photo du profil Google           | Gardés avec le compte, jamais affichés, supprimés avec lui                                          |
| Journaux techniques (adresses IP)       | Selon les durées de Supabase et de Netlify, au plus 1 an                                            |
| Sauvegardes de la base                  | 7 jours. Un texte masqué reste dans les sauvegardes jusqu'à leur expiration                         |
| Copies des emails envoyés               | Dans la boîte d'envoi Gmail de l'église, supprimées au plus tard à l'arrêt de l'outil               |
| Export final                            | À compléter par la coordination : durée de conservation de l'export et lieu où il est gardé         |

L'arrêt de l'outil est décidé par la coordination et annoncé au moins une semaine avant (P13).
Ensuite : export final remis à la coordination, suppression des projets et des comptes de service,
archivage du dépôt du code.

### Droits des personnes

- Toute personne peut demander l'accès à ses données, leur correction, leur effacement, la
  limitation de leur traitement, ou s'y opposer.
- Elle écrit à EJP Tech, eglisejp.tech@gmail.com. La réponse est donnée dans un délai d'un mois.
- Une saisie ne se modifie pas : une correction s'ajoute comme une nouvelle saisie. Un texte qui
  contient une information personnelle est masqué.
- Si la réponse ne convient pas, la personne peut adresser une réclamation à la CNIL (cnil.fr).
- La page « Confidentialité » de l'outil donne ces informations à chaque utilisateur. Elle est
  lisible sans connexion.

### Mesures de sécurité communes

- **Double authentification obligatoire** pour tous les comptes (code d'une application
  d'authentification). La base de données l'impose sur chaque table, pas seulement l'écran.
- **Accès par profil vérifié dans la base** (sécurité au niveau des lignes, RLS) : chaque compte ne
  reçoit que les lignes que son profil permet, même s'il interroge la base sans passer par les
  écrans. Les droits sont donnés un par un. Un visiteur non connecté n'a aucun droit.
- **Ajout seulement** : les saisies, les événements, les points, le journal et la modération ne
  se modifient pas et ne s'effacent pas. Seule exception pour un texte : son masquage par EJP Tech.
- **Auteur et heure posés par la base** : un compte ne peut pas antidater une saisie ni la signer au
  nom d'un autre.
- **Journal inaltérable** : chaque écriture produit une ligne (date, compte, action, objet). Il ne
  recopie jamais un texte libre ni un email.
- **Aucune donnée personnelle dans les champs libres** : rappel sous le premier champ libre de
  chaque formulaire, 280 caractères au plus, relecture par EJP Tech, masquage si besoin.
- **Petits nombres protégés** pour les indicateurs sensibles (voir la fiche 2 et la note d'analyse).
- **Inscription fermée** : seuls les comptes créés par l'administration de l'église se connectent.
- **Aucun traceur** ni cookie publicitaire, aucun appel à un autre service au chargement des pages.
- **Secrets hors du navigateur** : le navigateur n'utilise que la clé publique. La clé secrète, le
  secret Google et le mot de passe d'envoi des emails restent dans le tableau de bord du
  prestataire et dans le coffre de l'église.
- **Tests automatiques des droits** : la matrice des droits (qui lit quoi, qui ajoute quoi) est
  testée à chaque changement, profil par profil.

## Fiche 1. Comptes et connexion

- **Finalité** : permettre aux seuls comptes créés par l'église de se connecter, avec double
  authentification, et de voir ce que leur profil permet.
- **Base légale** : intérêt légitime de l'association à organiser ses ministères (article 6.1.f).
  Pour l'appartenance religieuse : article 9.2.d (voir « Données sensibles »).
- **Personnes concernées** : les personnes qui utilisent un compte : le berger, les membres du
  conseil, les personnes autorisées de chaque ministère (compte partagé), l'administration de
  l'église, EJP Tech.
- **Catégories de données** :
  - adresse email du compte. Un ministère utilise une boîte partagée au nom de l'église, jamais
    celle d'une personne. Le berger utilise son email personnel ; chaque membre du conseil a le sien ;
    l'administration a une adresse dédiée (D4) ;
  - mot de passe (12 caractères au moins), gardé par Supabase, jamais visible par l'église ;
  - facteur de double authentification (le secret de l'application d'authentification), gardé par
    Supabase ;
  - libellé du compte, fixé par l'outil et jamais le nom d'une personne (« Conseil, compte 3 »),
    type de compte, ministère, dates de création et de désactivation ;
  - nom et photo du profil Google, quand une personne se connecte avec Google : l'outil ne les
    affiche pas et ne les copie pas ;
  - adresses IP et historique des connexions, dans les journaux techniques de Supabase et de
    Netlify ;
  - jeton de connexion gardé dans le navigateur jusqu'à la déconnexion (nécessaire au
    fonctionnement, sans consentement à donner).
- **Données sensibles** : un compte dans l'outil d'une église peut révéler une appartenance
  religieuse (article 9). L'article 9.2.d permet ce traitement à quatre conditions :

  | Condition de l'article 9.2.d                                            | Situation de Pilotage EJP                                                                                            |
  | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
  | Activités légitimes d'une association à but religieux                   | L'outil sert à organiser les ministères de l'église                                                                  |
  | Garanties appropriées                                                   | Double authentification, accès par profil, hébergement de la base dans l'Union européenne, prestataires sous contrat |
  | Seulement les membres, anciens membres ou personnes en contact régulier | Les comptes sont créés par l'administration pour les ministères, le berger, le conseil et EJP Tech                   |
  | Pas de communication à l'extérieur sans consentement                    | Aucune donnée n'est communiquée hors de l'église. Les prestataires agissent pour le compte de l'église               |

  À confirmer par la coordination : chaque titulaire de compte est membre de l'église ou en contact
  régulier avec elle.

- **Destinataires** :
  - l'administration de l'église crée, désactive et réactive les comptes, et refait l'activation de
    la double authentification ;
  - EJP Tech crée le premier compte de l'administration (une seule fois), et change une adresse ou
    supprime un facteur de double authentification sur demande écrite, depuis le tableau de bord de
    Supabase ;
  - tous les comptes voient les libellés des comptes (jamais l'email : il n'est copié dans aucune
    table lisible par l'application) ;
  - Supabase et Google, comme prestataires.
- **Prestataires et lieu** : Supabase (connexion, région Paris), Google (connexion avec Google),
  Netlify (site).
- **Transferts hors UE** : connexion avec Google (États-Unis), voir « Transferts ».
- **Durées** : compte gardé toute la vie de l'outil, même désactivé ; nom et photo Google supprimés
  avec le compte ; journaux techniques au plus 1 an ; sauvegardes 7 jours. Sessions : 14 jours
  d'inactivité, 30 jours au plus (proposition P11, à confirmer par la coordination).
- **Mesures propres** :
  - inscription désactivée ; comptes créés par l'administration seule, par une fonction du serveur ;
  - lien d'invitation valable 24 heures, qui mène à une page demandant un clic (un antivirus qui
    ouvre le lien ne le consomme pas) ;
  - mot de passe de 12 caractères au moins ; protection contre les mots de passe divulgués en
    production ;
  - double authentification imposée par la base ; jamais proposée à la désactivation ;
  - un compte ou un ministère désactivé perd tous ses droits tout de suite ;
  - départ d'une personne d'un compte partagé : le ministère prévient sans délai, change le mot de
    passe de la boîte partagée, l'administration refait l'activation, le ministère choisit un nouveau
    mot de passe ;
  - « Se déconnecter » ne ferme que la session de l'appareil, pour ne pas couper les autres
    personnes d'un compte partagé ;
  - connexion Google limitée à l'identité, à l'email et au profil, rien de plus.

## Fiche 2. Chiffres des ministères : saisie et lecture

- **Finalité** : suivre les chiffres des ministères pour le berger et le conseil : chiffres communs
  (STARs au service, STARs actifs, dont en FIJ), carte des FIJ et statistiques par département,
  présences aux sessions, indicateurs propres de chaque ministère (vague 1 : 161 indicateurs saisis,
  dont 11 sensibles). Calculer les totaux de l'église avec leur complétude et montrer l'évolution.
- **Base légale** : intérêt légitime de l'association (article 6.1.f). Les chiffres sont des
  comptes agrégés : ils ne désignent personne. Seules les traces (quel compte a saisi, et quand)
  sont des données personnelles quand le compte est celui d'une personne.
- **Personnes concernées** :
  - les titulaires des comptes qui saisissent (traces de saisie) ;
  - de façon indirecte, les personnes comptées (STARs, nouveaux arrivants, bénéficiaires, enfants).
    Elles ne sont jamais nommées, jamais listées, jamais identifiées.
- **Catégories de données** :
  - une valeur entière par indicateur et par période (dimanche, mois ou « à ce jour »), avec sa
    date de référence, sa date de saisie et le compte qui l'a saisie ;
  - présences aux sessions (présents, et parmi eux déjà comptés par leur ministère principal) ;
  - carte des FIJ et statistiques par département (8 départements) ;
  - montants en euros (ventes, fonds levés, budget), sans nom de client ni de donateur ;
  - définitions des indicateurs ;
  - texte « Pourquoi cet indicateur ? » (10 à 280 caractères) quand un ministère demande un
    indicateur, et motif d'un refus par EJP Tech. Ce texte n'a pas de rappel sur les données
    personnelles (exception voulue par la personne responsable, T30). Il n'est lu que par le
    ministère qui l'a écrit et par EJP Tech, et n'est jamais recopié dans le journal.
- **Données sensibles** : 11 indicateurs portent sur la santé, l'accompagnement social, l'écoute et
  les enfants. Ce sont des **totaux par mois écoulé**, sans personne identifiable. Ils sont créés et
  actifs dès la vague 1 (décision de la personne responsable, 6 octobre 2026, P42). Leurs protections,
  construites à l'étape 4 avant la mise en service :
  - seuls les mois finis se saisissent : la base refuse le mois en cours ;
  - aucune ventilation, aucun texte attaché, aucun calcul tiré d'eux, aucun graphique de l'église ;
  - 1 et 2 s'affichent « moins de 3 » au berger, au conseil et à EJP Tech ; 0 reste 0 ; la somme de
    l'année ne compte que les mois affichés, pour qu'aucune différence ne révèle un mois masqué ;
  - les lignes brutes ne sont lisibles que par le ministère qui saisit ; les autres lisent une vue
    qui applique le seuil dans la base ;
  - jamais sur la vue de l'église, jamais dans un email, jamais de valeur dans le journal.

  L'analyse complète est dans la note d'analyse des indicateurs sensibles.

- **Destinataires** :
  - le ministère concerné voit ses propres chiffres ;
  - le berger, le conseil et EJP Tech voient tous les chiffres, en lecture (avec le seuil pour les
    indicateurs sensibles) ;
  - l'administration de l'église voit les définitions et l'usage (« saisi 4 mois sur 5 »), jamais
    une valeur d'indicateur propre ; elle voit les chiffres communs de la vue de l'église ;
  - les autres ministères voient seulement les chiffres communs de la vue de l'église.
- **Prestataires et lieu** : Supabase (région Paris), Netlify (site).
- **Transferts hors UE** : aucun pour la base. Voir « Transferts » pour l'hébergement du site.
- **Durées** : toute la vie de l'outil, puis export final et suppression. Un indicateur retiré pour
  confidentialité ne se lit plus, pour aucun profil, EJP Tech compris ; ses lignes restent dans la
  base jusqu'à l'arrêt de l'outil.
- **Mesures propres** :
  - ajout seulement : une correction est une nouvelle saisie, la plus récente fait foi ;
  - la base refuse les valeurs incohérentes (date future, « dont en FIJ » au-dessus des actifs,
    mois en cours pour un indicateur sensible) ;
  - le journal ne garde aucune valeur d'indicateur propre ;
  - la confirmation « Vérifiez ce chiffre » ne montre au ministère que ses propres valeurs ;
  - chaque définition dit « un total, sans liste » quand des personnes sont comptées.

## Fiche 3. Points d'attention, événements, réunions, textes libres et modération

- **Finalité** : suivre les points d'attention (création, mentions, statuts, traitement), le
  calendrier des événements et leur statut, la prochaine réunion de chaque ministère. Relire les
  champs libres et masquer une information personnelle écrite par erreur.
- **Base légale** : intérêt légitime de l'association (article 6.1.f).
- **Personnes concernées** :
  - les titulaires des comptes qui écrivent (ministères, berger, conseil) ;
  - les personnes citées par erreur dans un champ libre.
- **Catégories de données** :
  - points d'attention : titre et action attendue (80 caractères au plus), description (280),
    priorité, échéance, ministères mentionnés, statuts, commentaire de traitement (280) ;
  - événements : titre (80), date, statut, ministères mentionnés, historique des états ;
  - réunions : date, heure, objet et décision attendue (80 chacun) ;
  - auteur (compte) et date de chaque écriture ;
  - modération : décision (« rien à signaler » ou « masqué »), champ masqué, motif choisi dans une
    liste fermée, compte EJP Tech et date.
- **Données sensibles** : aucune n'est attendue. Le risque est qu'une personne écrive par erreur un
  nom, des coordonnées, ou une information de santé ou de situation personnelle. EJP Tech masque
  alors le champ entier (motif « Santé ou situation personnelle », par exemple).
- **Destinataires** :
  - un ministère voit ses points, ses événements et ses réunions, et les points et événements qui le
    mentionnent (ceux-là seulement) ;
  - le berger, le conseil et EJP Tech voient tout, en lecture ; le berger et le conseil marquent un
    point traité ;
  - l'administration de l'église ne voit ni les points, ni les événements, ni les réunions ;
  - le ministère Coordination lit, dans les 4 semaines après la mise en service, des totaux
    d'événements de l'église par mois, sans titre, sans date et sans détail par ministère (P38) ;
  - seul EJP Tech lit la modération.
- **Prestataires et lieu** : Supabase (région Paris), Netlify (site).
- **Transferts hors UE** : aucun pour la base.
- **Durées** : toute la vie de l'outil. Un texte masqué reste dans les sauvegardes jusqu'à leur
  expiration (7 jours).
- **Mesures propres** :
  - rappel sous le premier champ libre de chaque formulaire : « N'écrivez aucun nom ni information
    personnelle. Les champs libres sont relus par EJP Tech. » ;
  - limites de 80 et 280 caractères, fixées dans la base ;
  - textes affichés comme du texte simple (jamais interprétés comme du HTML ou du Markdown) ;
  - masquage du champ entier, remplacé par « [texte masqué par EJP Tech] », définitif ;
  - le journal garde l'identifiant de l'objet, jamais son texte : un texte masqué est donc masqué
    partout ;
  - un point traité ne se rouvre pas ; un événement ne change pas de nom.

## Fiche 4. Journal et sécurité

- **Finalité** : garder la trace de chaque écriture (qui, quand, quoi), pour la transparence entre
  ministères, la fraîcheur des informations, le contrôle et la sécurité. Garder les journaux
  techniques des prestataires pour détecter une attaque ou une panne.
- **Base légale** : intérêt légitime de l'association à sécuriser l'outil et à tracer les actions
  (article 6.1.f).
- **Personnes concernées** : les titulaires des comptes.
- **Catégories de données** :
  - journal de l'application : date, compte auteur, action (un code), ministère concerné, objet visé
    (un identifiant), détail (codes, nombres, dates et identifiants seulement). Jamais un texte libre,
    jamais un email, aucune valeur d'indicateur propre ;
  - journaux techniques : adresses IP, connexions, erreurs, dans les tableaux de bord de Supabase et
    de Netlify, hors de l'application.
- **Données sensibles** : aucune.
- **Destinataires** :
  - un ministère lit les lignes de son ministère et de son compte ;
  - le berger, le conseil et EJP Tech lisent tout le journal ;
  - l'administration de l'église lit une liste limitée d'actions, fixée dans la base ;
  - les journaux techniques sont lus par EJP Tech dans les tableaux de bord. À compléter par EJP
    Tech : nombre de personnes qui ont accès aux tableaux de bord de Supabase et de Netlify, et
    double authentification activée sur ces accès.
- **Prestataires et lieu** : Supabase (région Paris), Netlify (À compléter par EJP Tech : région).
- **Transferts hors UE** : journaux techniques de Netlify, voir « Transferts ».
- **Durées** : journal de l'application toute la vie de l'outil ; journaux techniques au plus 1 an.
- **Mesures propres** :
  - personne ne peut modifier ni effacer le journal, pas même le propriétaire de la base ;
  - un envoi de formulaire produit une seule ligne ;
  - un compte désactivé reste cité dans le journal par son libellé, jamais par son email.

## Fiche 5. Emails de service : invitation et nouveau mot de passe

- **Finalité** : envoyer deux emails seulement :
  - l'invitation, quand l'administration crée un compte (« Votre accès à Pilotage EJP ») ;
  - le lien de nouveau mot de passe, quand une personne le demande (« Nouveau mot de passe pour
    Pilotage EJP »).
- **Base légale** : intérêt légitime de l'association (article 6.1.f) ; ces emails sont nécessaires
  à l'accès.
- **Personnes concernées** : les titulaires des comptes.
- **Catégories de données** : adresse email du compte, texte fixe du message, lien à usage unique
  valable 24 heures, date d'envoi. Le message ne contient aucune image ni ressource externe : rien
  n'est chargé à son ouverture.
- **Données sensibles** : aucune, au-delà de l'appartenance possible à l'église (fiche 1).
- **Destinataires** : la personne titulaire du compte ; Supabase (qui prépare l'email) et Google
  (qui l'envoie par la messagerie Gmail de l'église).
- **Expéditeur** : « Pilotage EJP », par la messagerie de l'église (proposition : le compte Google
  de l'église, à confirmer, T08). À compléter par EJP Tech : adresse d'envoi retenue.
- **Prestataires et lieu** : Supabase (région Paris), Google (États-Unis).
- **Transferts hors UE** : envoi par Google, voir « Transferts ».
- **Durées** : lien valable 24 heures ; copies dans la boîte d'envoi Gmail de l'église, supprimées
  au plus tard à l'arrêt de l'outil.
- **Mesures propres** :
  - pour un mot de passe oublié, le même message s'affiche, qu'un compte existe ou non ;
  - le lien mène à une page qui demande un clic avant de servir ;
  - le mot de passe d'envoi ne vit que dans le tableau de bord et dans le coffre de l'église ;
  - la boîte partagée d'un ministère reçoit ces liens : c'est la clé de secours du compte. Son mot
    de passe change quand une personne quitte le ministère.
- **À venir, non décidé** : des rappels de saisie par email sont proposés (P31). Ils ne sont pas
  construits. S'ils sont décidés, cette fiche sera mise à jour avant leur mise en service.

## Fiche 6. Signalement d'une difficulté (décidé, non construit)

- **Statut** : décidé le 6 octobre 2026 par la personne responsable (T39, question 14 du plan de
  l'étape 4), conçu par EJP Tech. Il n'est pas encore construit. Cette fiche est remise à la
  coordination avec le reste du registre.
- **Finalité prévue** : permettre à un ministère de signaler une difficulté avec l'outil, par
  exemple quand il ne peut pas enregistrer une date (la base refuse une nouvelle date déjà passée
  pour un événement), pour qu'EJP Tech l'aide en dehors de l'outil.
- **Base légale prévue** : intérêt légitime de l'association (article 6.1.f).
- **Personnes concernées** : les titulaires des comptes de ministère ; les personnes citées par
  erreur dans le texte.
- **Catégories de données prévues** : ministère et compte qui signalent, date, écran concerné
  (choisi dans une liste fermée), court texte libre (10 à 280 caractères) ; clôture par EJP Tech
  (compte, date, commentaire facultatif de 10 à 280 caractères).
- **Destinataires** (décidé) : le ministère lit ses signalements et leur clôture ; EJP Tech les lit
  tous et les clôt ; ni l'administration de l'église, ni le berger, ni le conseil, ni les autres
  ministères n'y ont accès (l'administration ne voit ni les pages des ministères ni les points, et
  un signalement parle du contenu d'une page). EJP Tech transmet à l'administration, hors de
  l'outil, ce qui la concerne. Un problème de compte ou de connexion ne passe pas par ce
  signalement.
- **Mesures prévues** : rappel sous le champ, 280 caractères au plus, refus par la base d'un texte
  qui ressemble à un email, à un numéro de téléphone ou à une civilité suivie d'un nom ; relecture
  et masquage par EJP Tech ; ajout seulement ; journal avec le code de l'écran, sans le texte ;
  aucun email.
- **Prestataires et lieu** : Supabase (région Paris), Netlify (site).
- **Durées prévues** : toute la vie de l'outil, comme les autres écritures.

## Ce qui reste à compléter

Faits que les sources du projet ne donnent pas, à compléter avant la remise à la coordination :

1. Nom et fonction du représentant légal de l'association.
2. Désignation ou non d'un délégué à la protection des données (DPO).
3. Accord de sous-traitance de Supabase (article 28) : accepté ou signé, avec sa date.
4. Société avec qui l'église a contracté pour Supabase, et accès possible aux données depuis
   l'extérieur de l'Union européenne.
5. Région d'hébergement du site chez Netlify, et accord de sous-traitance de Netlify.
6. Type de compte Google de l'église (Gmail gratuit ou Google Workspace) et conditions de
   traitement qui s'appliquent à la connexion et à l'envoi des emails.
7. Présence de Google et de Netlify sur la liste du cadre de protection des données, avec la date
   de la vérification.
8. Adresse d'envoi des emails retenue.
9. Personnes qui ont accès aux tableaux de bord de Supabase et de Netlify, et double
   authentification sur ces accès.
10. Durée de conservation de l'export final et lieu où la coordination le garde (à la coordination).
11. Confirmation que chaque titulaire de compte est membre de l'église ou en contact régulier avec
    elle (à la coordination).
12. Confirmation par la coordination de la fiche 6 (signalement d'une difficulté), décidée le 6
    octobre 2026 : lue par le ministère qui l'écrit et par EJP Tech seulement.

## Historique

| Version    | Date           | Auteur   | Changement                                        |
| ---------- | -------------- | -------- | ------------------------------------------------- |
| 1 (projet) | 6 octobre 2026 | EJP Tech | Première rédaction, à valider par la coordination |

Ce document n'est pas un avis juridique. En cas de doute, demandez conseil à la CNIL ou à un avocat.
