# Registre des traitements : Pilotage EJP

- **Version** : 1.2 (projet)
- **Date** : 7 octobre 2026
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
- **Représentant** : sans objet. L'article 30.1.a demande le nom et les coordonnées du responsable
  du traitement : ce sont ceux ci-dessus (l'Église des Jeunes Prodiges, par son ministère EJP Tech,
  avec le contact de la page « Confidentialité »). Le « représentant » au sens du RGPD ne concerne
  que les responsables établis hors de l'Union européenne.
- **Délégué à la protection des données (DPO)** : aucun délégué à la protection des données
  désigné.
- **Rôle de la coordination** : elle décide au nom de l'église. Elle valide ce registre, les textes
  de l'outil, les indicateurs et la fin de vie de l'outil. Le responsable du traitement reste
  l'Église des Jeunes Prodiges, par son ministère EJP Tech (P44, 6 octobre 2026).

### Prestataires (sous-traitants) et lieu des données

| Prestataire | Ce qu'il fait pour l'outil                                                         | Où sont les données                                 | Cadre                                                                                                                       |
| ----------- | ---------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Supabase    | Base de données, connexion, fonctions du serveur, journaux techniques, sauvegardes | Région Paris (Union européenne)                     | Accord de protection des données (DPA) accepté avec les conditions d'utilisation. Voir la note sous le tableau              |
| Netlify     | Hébergement du site (les pages de l'application), journaux techniques              | Réseau mondial, sans région au choix (voir la note) | Accord de protection des données (DPA) accepté avec les conditions. Société établie aux États-Unis. Voir la note            |
| Google      | Connexion avec Google ; envoi des emails par la messagerie Gmail de l'église       | États-Unis                                          | Conditions grand public de Google (Gmail gratuit), sans accord de sous-traitance (article 28). Voir la note sous le tableau |

**Note sur Google (fait donné par la personne responsable le 6 octobre 2026).** L'église envoie ses
emails par une adresse Gmail gratuite, celle d'EJP Tech, qui figure sur la page « Confidentialité ».
Cela a des conséquences :

- un Gmail gratuit relève des conditions grand public de Google. Il n'y a pas d'accord de
  sous-traitance (article 28) à signer avec Google pour ce compte. L'église n'a aucun contrat de
  sous-traitance avec Google, ni pour l'envoi des emails ni pour la connexion avec Google ;
- la phrase de la page « Confidentialité » qui dit que les prestataires « agissent sous contrat »
  est donc inexacte pour Google : elle est nuancée, et la page est corrigée au lot I de l'étape 4 ;
- recommandation d'EJP Tech, sans l'imposer : Google Workspace pour les associations (gratuit pour
  une association éligible, avec un avenant sur la protection des données), ou un service d'envoi
  européen avec contrat.

L'adresse d'envoi des emails de l'outil est celle d'EJP Tech de la page « Confidentialité »
(décision T08, 6 octobre 2026). L'envoi passe par le SMTP du Gmail gratuit d'EJP Tech
(`smtp.gmail.com`, port 587, mot de passe d'application ; décidé le 7 octobre 2026).

**Note sur Supabase (fait donné le 6 octobre 2026).** L'accord de protection des données (DPA)
« complète et fait partie des conditions d'utilisation » de Supabase. Son article 12.2 dit que
l'acceptation de l'accord a le même effet que la signature des clauses contractuelles types. Il
s'applique donc sans signature séparée depuis la création de l'organisation EJP TECH, le 5 octobre 2026. Recommandation : télécharger une copie sur https://supabase.com/legal/dpa et la garder avec ce
registre. La société contractante reste À compléter.

**Note sur Netlify (faits donnés le 6 octobre 2026).**

- Son accord de protection des données est intégré par renvoi à l'accord d'abonnement en libre
  service et s'applique dès l'acceptation des conditions, sans signature (sources :
  https://www.netlify.com/blog/2023-terms-conditions et https://www.netlify.com/gdpr-ccpa.md).
- Une source secondaire indique qu'il inclut les clauses contractuelles types de l'Union européenne
  (module 2) et que Netlify est certifié au cadre de protection des données Union européenne et
  États-Unis : à vérifier sur dataprivacyframework.gov.
- Hébergement : Netlify sert les fichiers statiques du site depuis un réseau mondial. Aucune région
  ne se choisit pour ce type de site. Netlify ne reçoit aucune donnée de l'outil, seulement ses
  journaux techniques d'accès (adresses IP). Les comptes et les chiffres restent chez Supabase, à
  Paris.

Accès aux tableaux de bord de Supabase et de Netlify : EJP Tech seul. Double authentification sur
ces deux comptes : À compléter par EJP Tech (confirmation, elle est recommandée).

Un seul projet Supabase distant existe (décision T52, 7 octobre 2026) : créé le 5 octobre 2026 comme
préproduction, il est devenu la **production**. Offre gratuite, organisation « EJP TECH », région
Paris. Il n'y a plus de préproduction distante : les essais passent par la pile locale de la CI,
avec des données fictives. Un projet Pro séparé était prévu (P12) : il est abandonné jusqu'à un
passage à l'offre payante, qui se fera en changeant l'offre de l'organisation, sans déplacer les
données.

Les données de production ne sont jamais copiées vers le poste de développement ni la CI. Claude
Code ne lit pas la base (T52).

### Transferts hors de l'Union européenne

- La base de données est hébergée en région Paris.
- Google et Netlify sont établis aux États-Unis. Les transferts s'appuient sur le cadre de
  protection des données entre l'Union européenne et les États-Unis, ou sur les clauses
  contractuelles types de la Commission européenne.
- À compléter par EJP Tech : vérifier que Google et Netlify figurent sur la liste du cadre de
  protection des données (dataprivacyframework.gov), et noter la date de la vérification. Pour
  Netlify, ses clauses contractuelles types (module 2) sont à vérifier de la même façon.
- À compléter par EJP Tech : société avec qui l'église a contracté pour Supabase, et accès possible
  aux données depuis l'extérieur de l'Union européenne (support, administration du service).

### Durées de conservation

| Données                                 | Durée                                                                                                                             |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Comptes, saisies, historique et journal | Toute la vie de l'outil, puis suppression à son arrêt, après l'export final remis à la coordination                               |
| Compte désactivé                        | Gardé jusqu'à l'arrêt de l'outil, car ses saisies restent dans l'historique                                                       |
| Nom et photo du profil Google           | Gardés avec le compte, jamais affichés, supprimés avec lui                                                                        |
| Journaux techniques (adresses IP)       | Selon les durées de Supabase et de Netlify, au plus 1 an                                                                          |
| Sauvegardes de la base                  | Export chiffré chaque semaine, 4 gardés. Un texte masqué reste dans ces copies jusqu'à leur suppression, 4 semaines au plus (T52) |
| Copies des emails envoyés               | Dans la boîte d'envoi Gmail de l'église, supprimées au plus tard à l'arrêt de l'outil                                             |
| Export final                            | À compléter par la coordination : durée de conservation de l'export et lieu où il est gardé                                       |

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
- **Indicateurs sensibles protégés** (voir la fiche 2 et la note d'analyse) : valeurs exactes pour le
  seul ministère qui saisit, le berger, le conseil et EJP Tech (P52, 7 octobre 2026) ; aucune valeur
  pour l'administration ni les autres ministères.
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

  | Condition de l'article 9.2.d                                            | Situation de Pilotage EJP                                                                                                                                    |
  | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
  | Activités légitimes d'une association à but religieux                   | L'outil sert à organiser les ministères de l'église                                                                                                          |
  | Garanties appropriées                                                   | Double authentification, accès par profil, hébergement de la base dans l'Union européenne, prestataires sous contrat (sauf Google : conditions grand public) |
  | Seulement les membres, anciens membres ou personnes en contact régulier | Les comptes sont créés par l'administration pour les ministères, le berger, le conseil et EJP Tech                                                           |
  | Pas de communication à l'extérieur sans consentement                    | Aucune donnée n'est communiquée hors de l'église. Les prestataires agissent pour le compte de l'église                                                       |

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
  avec le compte ; journaux techniques au plus 1 an ; exports chiffrés hebdomadaires, 4 gardés
  (T52). Sessions : 14 jours d'inactivité, 30 jours au plus (proposition P11) **non appliqués tant
  que l'offre est gratuite** (risque accepté, T52) ; ils le seront au passage en Pro.
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
    ministère qui l'a écrit et par EJP Tech, et n'est jamais recopié dans le journal ;
  - répartition par catégories des indicateurs sensibles : nombres entiers par catégorie et par mois,
    catégories fixées par la coordination.
- **Données sensibles** : 11 indicateurs portent sur la santé, l'accompagnement social, l'écoute et
  les enfants. Ce sont des **totaux par mois** (le mois en cours compris), sans personne identifiable,
  avec deux ajouts facultatifs : une répartition par catégories et un texte « Précision ». Ils sont
  créés et actifs dès la vague 1 (décisions de la personne responsable, 6 octobre 2026, P42 et suites).
  Leurs protections, construites à l'étape 4 avant la mise en service :
  - **mois en cours** : il se saisit et s'affiche « en cours », hors des sommes. Seule la dernière
    saisie du mois est montrée aux lecteurs autres que le ministère ; les saisies intermédiaires ne
    leur sont pas exposées (ni dans les vues, ni dans le journal, qui ne porte aucune ligne
    d'indicateur sensible dans le détail d'une saisie). Risque de moment : une valeur, une catégorie
    ou une précision qui change pendant le mois peut laisser voir qu'un cas a eu lieu entre deux
    consultations ;
  - **répartition par catégories** : le ministère répartit son total du mois entre les catégories de
    l'indicateur. Les catégories sont fixées par la coordination (listes courtes et larges, avec un
    « autre ») et écrites dans la base par une mise à jour d'EJP Tech ; sans liste, pas de répartition.
    La somme des catégories ne dépasse jamais le total ; le reste s'affiche « non réparti ». Chaque
    catégorie s'affiche exacte, sans seuil ni masquage (P52) ;
  - **texte « Précision »** : voir la rubrique suivante ;
  - aucun calcul tiré d'eux, aucun graphique de l'église ;
  - **valeurs exactes pour le berger, le conseil et EJP Tech** (P52, décidé par la personne
    responsable le 7 octobre 2026) : 1 et 2 ne sont plus remplacés par « moins de 3 », ni dans le
    total, ni dans le mois en cours, ni dans la somme de l'année, ni dans les catégories. La
    personne responsable a accepté le risque qu'un chiffre exact permette de reconnaître une personne
    dans un très petit groupe (voir la note d'analyse, version 1.2) ;
  - les lignes brutes ne sont lisibles que par le ministère qui saisit ; le berger, le conseil et
    EJP Tech lisent une vue de la base qui réapplique leurs droits et ne montre que la dernière
    saisie d'un mois ; l'administration de l'église et les autres ministères ne reçoivent aucune
    valeur ;
  - jamais sur la vue de l'église, jamais dans un email, jamais de valeur dans le journal.

  L'analyse complète est dans la note d'analyse des indicateurs sensibles.

- **Texte « Précision » d'un chiffre sensible** :
  - **Finalité** : permettre au ministère de faire remonter une information utile qu'un chiffre seul
    ne dit pas, parce qu'une information sensible peut être importante (décision de la personne
    responsable, 6 octobre 2026) ;
  - **Données** : un texte facultatif de 10 à 280 caractères, attaché à un mois d'un indicateur
    sensible, avec sa date de saisie et le compte qui l'a écrit. Le rappel sur les données
    personnelles figure sous le champ. L'outil refuse les familles de texte que reconnaît la
    vérification des textes. Il n'y a aucune donnée personnelle attendue : le risque est qu'un nom ou
    une situation personnelle soit écrit par erreur, dans un domaine sensible ;
  - **Destinataires** : le ministère qui l'a écrit, le berger, le conseil et EJP Tech. Ni
    l'administration de l'église, ni les autres ministères. Jamais sur la vue de l'église, jamais
    dans un email, jamais dans le journal ;
  - **Durée** : comme les autres textes, toute la vie de l'outil. Un texte masqué reste dans les
    exports hebdomadaires jusqu'à leur suppression (4 semaines au plus) ;
  - **Mesures** : ajout seulement (la précision du total le plus récent du mois remplace
    l'affichage de la précédente, qui reste en base, lisible par le ministère et par EJP Tech
    seuls) ; relecture et masquage par EJP Tech (motif « Santé ou situation personnelle », par
    exemple), avec sa propre ligne de modération ; le journal note la relecture et le masquage,
    jamais le texte ; affichage en texte
    simple ; le journal garde l'identifiant, jamais le texte ; lecture réservée par les droits de la
    base.

- **Destinataires** :
  - le ministère concerné voit ses propres chiffres ;
  - le berger, le conseil et EJP Tech voient tous les chiffres, en lecture, valeurs exactes pour les
    indicateurs sensibles, leurs catégories et leur mois en cours (P52) ; ils lisent aussi les
    précisions attachées aux chiffres sensibles ;
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
    somme des catégories d'un indicateur sensible au-dessus de son total) ;
  - le journal ne garde aucune valeur d'indicateur propre, aucune catégorie ni aucune précision ;
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
- **Durées** : toute la vie de l'outil. Un texte masqué reste dans les exports
  hebdomadaires jusqu'à leur suppression (4 semaines au plus).
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
  - EJP Tech lit tout le journal ; le berger et le conseil le lisent aussi, sauf les lignes d'un
    signalement (`difficulte_signalee`, `signalement_clos`), que seuls le ministère concerné et EJP
    Tech lisent ;
  - l'administration de l'église lit une liste limitée d'actions, fixée dans la base. Elle ne lit pas
    les lignes de relecture et de masquage d'un texte quand il s'agit d'une demande d'indicateur,
    d'une précision, d'un point, d'un événement ou d'une réunion (P51, T47) ;
  - le berger et le conseil lisent les lignes de relecture et de masquage d'une précision (T45) ;
    l'heure exacte d'une saisie de chiffres, sensibles compris, reste lisible, sans dire ce que la
    saisie contient (T46) ;
  - les journaux techniques sont lus par EJP Tech dans les tableaux de bord. À compléter par EJP
    Tech : nombre de personnes qui ont accès aux tableaux de bord de Supabase et de Netlify, et
    double authentification activée sur ces accès.
- **Prestataires et lieu** : Supabase (région Paris), Netlify (réseau mondial, journaux d'accès seulement).
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
- **Expéditeur** : « Pilotage EJP », par le Gmail gratuit d'EJP Tech, l'adresse de la page
  « Confidentialité » (T08, décidé les 6 et 7 octobre 2026 ; SMTP `smtp.gmail.com`, port 587, mot
  de passe d'application).
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

## Fiche 6. Signalement d'une difficulté (décidé et construit)

- **Statut** : décidé le 6 octobre 2026 par la personne responsable (T39, question 14 du plan de
  l'étape 4), conçu par EJP Tech. La base est construite et fusionnée (lot B7, 7 octobre 2026) ;
  les écrans suivent à l'étape 4. Cette fiche est remise à la coordination avec le reste du
  registre.
- **Finalité** : permettre à un ministère de signaler une difficulté avec l'outil, par
  exemple quand il ne peut pas enregistrer une date (la base refuse une nouvelle date déjà passée
  pour un événement), pour qu'EJP Tech l'aide en dehors de l'outil.
- **Base légale** : intérêt légitime de l'association (article 6.1.f).
- **Personnes concernées** : les titulaires des comptes de ministère ; les personnes citées par
  erreur dans le texte.
- **Catégories de données** : ministère et compte qui signalent, date, écran concerné
  (choisi dans une liste fermée), court texte libre (10 à 280 caractères) ; clôture par EJP Tech
  (compte, date, commentaire facultatif de 10 à 280 caractères).
- **Destinataires** (décidé) : le ministère lit ses signalements et leur clôture ; EJP Tech les lit
  tous et les clôt ; ni l'administration de l'église, ni le berger, ni le conseil, ni les autres
  ministères n'y ont accès (l'administration ne voit ni les pages des ministères ni les points, et
  un signalement parle du contenu d'une page). Les lignes de journal de l'envoi et de la clôture
  (ministère, compte, date, écran, sans le texte) ne sont lues, elles aussi, que par le ministère
  et EJP Tech : la base les retire au berger et au conseil, qui lisent le reste du journal. EJP
  Tech transmet à l'administration, hors de l'outil, ce qui la concerne. Un problème de compte ou
  de connexion ne passe pas par ce signalement.
- **Mesures** : rappel sous le champ, 280 caractères au plus, refus par la base d'un texte qui
  ressemble à un email, à un numéro de téléphone (une suite d'au moins 5 chiffres, même séparés) ou
  à une civilité suivie d'un nom ; refus des crochets, pour qu'un texte écrit par un ministère ne
  passe jamais pour un texte masqué par EJP Tech (T43, 7 octobre 2026) ; les mêmes règles
  s'appliquent au commentaire de clôture ; relecture et masquage par EJP Tech ; ajout seulement ;
  journal avec le code de l'écran, sans le texte ; aucun email.
- **Prestataires et lieu** : Supabase (région Paris), Netlify (site).
- **Durées** : toute la vie de l'outil, comme les autres écritures.

## Ce qui reste à compléter

Faits que les sources du projet ne donnent pas, à compléter avant la remise à la coordination :

1. (Réglé le 6 octobre 2026.) Pas de représentant légal à nommer : l'article 30.1.a demande le
   responsable du traitement, indiqué plus haut. Aucun DPO désigné.
2. Supabase : télécharger une copie de l'accord de protection des données
   (https://supabase.com/legal/dpa) et la garder avec le registre.
3. Netlify : rien à signer, l'accord s'applique à l'acceptation des conditions. Vérifier sa
   certification et ses clauses contractuelles types (voir le point 7).
4. Société avec qui l'église a contracté pour Supabase, et accès possible aux données depuis
   l'extérieur de l'Union européenne.
5. (Réglé le 6 octobre 2026.) Hébergement de Netlify : réseau mondial, sans région au choix,
   journaux d'accès seulement.
6. Emails par un Gmail gratuit (fait donné le 6 octobre 2026) : pas d'accord de sous-traitance
   avec Google, ni pour les emails ni pour la connexion avec Google, conditions grand public.
   Corriger la phrase « agissent sous contrat » de la page
   « Confidentialité » pour Google : la page est corrigée au lot I de l'étape 4. Recommandation,
   sans l'imposer : Google Workspace pour les associations (gratuit pour une association
   éligible, avec un avenant sur la protection des données), ou un service d'envoi européen avec
   contrat. Reste à décider par la personne responsable.
7. Présence de Google et de Netlify sur la liste du cadre de protection des données, avec la date
   de la vérification.
8. Adresse d'envoi des emails : décidée le 6 octobre 2026 (T08), c'est l'adresse d'EJP Tech de la
   page « Confidentialité » ; SMTP décidé le 7 octobre 2026 (Gmail gratuit d'EJP Tech). Rien à
   compléter.
9. Double authentification sur les comptes de tableau de bord de Supabase et de Netlify, dont
   seul EJP Tech a l'accès : à confirmer, elle est recommandée.
10. Durée de conservation de l'export final et lieu où la coordination le garde (à la coordination).
11. Confirmation que chaque titulaire de compte est membre de l'église ou en contact régulier avec
    elle (à la coordination).
12. Confirmation par la coordination de la fiche 6 (signalement d'une difficulté), décidée le 6
    octobre 2026 et construite dans la base : lue par le ministère qui l'écrit et par EJP Tech
    seulement.
13. Confirmation par la coordination, pour la fiche 2, du mois en cours, du texte « Précision » et de
    la répartition par catégories des indicateurs sensibles, décidés le 6 octobre 2026. Listes de
    catégories par indicateur sensible (à la coordination).
14. Prise de connaissance par la coordination, pour la fiche 2, de la décision du 7 octobre 2026 (P52) :
    le berger, le conseil et EJP Tech voient les valeurs exactes des indicateurs sensibles. Le risque
    de reconnaître une personne dans un très petit groupe est accepté par la personne responsable ; il
    est écrit dans la note d'analyse (version 1.2), avec le risque du numéro manquant du journal
    (T44). La coordination dit si une analyse d'impact complète est nécessaire.

## Historique

| Version      | Date           | Auteur   | Changement                                                                                                                                                                                                                                                                            |
| ------------ | -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 (projet)   | 6 octobre 2026 | EJP Tech | Première rédaction, à valider par la coordination                                                                                                                                                                                                                                     |
| 1.1 (projet) | 6 octobre 2026 | EJP Tech | Fiche 2 : mois en cours accepté, texte « Précision » et répartition par catégories des indicateurs sensibles, après la décision de la personne responsable                                                                                                                            |
| 1.2 (projet) | 7 octobre 2026 | EJP Tech | Fiche 2 : valeurs exactes des sensibles pour le berger, le conseil et EJP Tech (P52). Fiche 4 : lecture du journal (T45, T46, T47). Fiche 5 : SMTP décidé (T08). Fiche 6 : décidée et construite, crochets et longs numéros refusés (T43). Google : aucun contrat, connexion comprise |

Ce document n'est pas un avis juridique. En cas de doute, demandez conseil à la CNIL ou à un avocat.
