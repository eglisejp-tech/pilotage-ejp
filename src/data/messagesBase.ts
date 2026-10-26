// Traduction des erreurs de la base, de PostgREST et du réseau (guide des messages, sections 10.9
// et 10.11 ; lignes m270 à m274, T59). Aucun texte de `raise exception`, aucun code PostgREST ne
// s'affiche tel quel : chaque refus passe par la table de ce fichier, qui lui donne une phrase et
// le champ sous lequel la dire. Le texte SQL reste la clé : réécrire une phrase ne demande aucune
// migration. Un test (`messagesBase.test.ts`) lit chaque `raise exception` des migrations et
// échoue si un message n'est ni dans la table ni dans la liste des garde-fous laissés au repli.
//
// Le code décide d'abord, le texte ensuite :
// - pas de code (fetch rejeté, réponse perdue ou illisible, délai de 10 s, exception du code) :
//   `technique` ; l'issue de l'envoi et sa phrase se lisent par `lireEchec`
//   (src/data/echecEnvoi.ts, T76), jamais ici ;
// - jeton expiré ou refusé (PGRST301 à PGRST303, ou « JWT » dans le message, même sans code) :
//   connexion expirée ;
// - 42501 : « Double authentification requise. » donne connexion expirée, « Compte inactif ou
//   inconnu. » donne compte désactivé ; « permission denied for ... » (requête partie sans jeton)
//   donne connexion expirée ; un garde-fou technique prend le repli ; tout autre 42501 est un
//   refus d'accès, que l'écran dit avec sa propre phrase ;
// - connexion expirée et compte désactivé font aussi relire la session (`surSessionChangee`) :
//   la garde mène à l'écran qui convient, avec la page en retour (m271) ;
// - P0001 : la phrase de la table ;
// - P0001 absent de la table, 23505, 23514, 23503, 22003, 22P02, contrôle Zod imprévu : le repli.

import { z } from 'zod'
import { messagesConnexion } from '@/features/connexion/messages'
import { estDelaiDepasse } from '@/lib/requetes'

/** Phrases communes à tous les écrans (guide, 10.10). */
export const MESSAGES_COMMUNS = {
  /** Jeton expiré, ou session sans double authentification (m271). */
  connexionExpiree: messagesConnexion.connexionExpiree,
  /** Compte désactivé alors que son jeton est encore valable (m272, T59). */
  compteDesactive: messagesConnexion.compteDesactive,
  /** Refus inattendu pendant un enregistrement : la saisie reste dans le formulaire (m270). */
  repliSaisie:
    "L'enregistrement n'a pas abouti, votre saisie est gardée. Réessayez, et si le problème revient, prévenez EJP Tech.",
  /** Refus inattendu d'une action sans formulaire (m270). */
  repliAction: "L'action n'a pas abouti. Réessayez, et si le problème revient, prévenez EJP Tech.",
  /**
   * Création dont l'issue est inconnue (aucune réponse, réponse perdue ou illisible, délai) : la
   * base a peut-être enregistré (m259, T76).
   */
  peutEtreFait: 'La connexion a échoué. Vérifiez la liste avant de réessayer.',
  /** Lecture abandonnée après 10 s (m252). */
  delaiLecture: 'La réponse met trop de temps. Réessayez.',
  /** Chargement qui dépasse `DELAI_CHARGEMENT_LONG`, avant l'échec à 10 s (m248). */
  chargementLong: "Chargement plus long que d'habitude",
  /** Refus d'accès commun (42501), quand l'écran n'a pas de phrase à lui (forme « introuvable », m273). */
  acces: 'Cet élément est introuvable. Rechargez la page.',
} as const

/** Champ sous lequel une phrase se dit ; l'écran le place s'il l'a, sinon sous le bouton. */
export type ChampRefus =
  | 'titre'
  | 'nom'
  | 'description'
  | 'definition'
  | 'attendu'
  | 'echeance'
  | 'date'
  | 'mentions'
  | 'texte'
  | 'precision'
  | 'repartition'
  | 'en_fij'
  | 'prenom'
  | 'heure_prevue'
  | 'heure_debut'

/**
 * Une entrée de la table. `texte` absent : la phrase de la base est déjà écrite pour la personne
 * et se dit telle que la table la reçoit (gardée par la refonte des textes, T66). Un `%` du texte
 * prend, dans l'ordre, les valeurs que la base a mises à la place des `%` de sa clé.
 */
interface Traduction {
  texte?: string
  champ?: ChampRefus
}

/** Garde-fou que l'interface ne déclenche pas : il prend le message de repli (m274). */
const REPLI = 'repli'

/** Les mentions d'un point ont changé pendant que la fenêtre était ouverte (m157). */
const MENTIONS_CHANGEES =
  'Les mentions de ce point viennent de changer. Fermez cette fenêtre pour mettre la page à jour.'

/** Une liste lue par la page a changé pendant la saisie (m099). */
const LISTE_CHANGEE = 'La liste a changé. Rechargez la page, puis réessayez.'

/** La liste des catégories d'un indicateur sensible a changé pendant la saisie (m097). */
const CATEGORIES_CHANGEES = 'La liste des catégories a changé. Rechargez la page, puis réessayez.'

/** Un chiffre hors de la plage de son unité, dit sous le bouton (m080, m099). */
const LIMITE = 'Un chiffre dépasse la limite.'

/** Date passée, partout la même phrase (guide 10.10 ; m125). */
const DATE_PASSEE = "Cette date est passée. Choisissez aujourd'hui ou une date à venir."

/** Un ministère coché a été désactivé entre l'ouverture et l'envoi (m124). */
const MINISTERE_DESACTIVE = 'Un ministère coché a été désactivé. Décochez-le, puis réessayez.'

/** Point traité entre-temps, dans sa fenêtre (m148). */
const POINT_DEJA_TRAITE =
  'Ce point a déjà été marqué traité. Fermez cette fenêtre pour mettre la page à jour.'

/** Le catalogue des indicateurs prévus est à corriger : réessayer ne sert à rien (m229). */
const PREVUS_EN_PANNE = "Les indicateurs prévus n'ont pas pu être créés. Prévenez EJP Tech."

/**
 * Refus de saisie (P0001), par texte exact de la base. Une clé qui porte `%` reconnaît le message
 * que la base a complété.
 */
const REFUS_DE_SAISIE: Readonly<Record<string, Traduction | typeof REPLI>> = {
  // Textes libres (private.verifier_texte : messages rendus par `raise exception '%'`). Ce que la
  // base détecte, puis quoi faire (T66, m268 et m269 ; m234 pour les libellés d'indicateur).
  "N'écrivez aucun nom ni information personnelle.": {
    texte: 'Retirez de votre texte les emails, liens, numéros et noms de personnes.',
    champ: 'texte',
  },
  'Les crochets et « texte masqué » sont réservés à la modération.': {
    texte: 'Retirez de votre texte les crochets [ ] et les mots « texte masqué ».',
    champ: 'texte',
  },
  'Un taux, une moyenne ou une évolution se calcule : ne le saisissez pas.': { champ: 'nom' },
  "La somme de l'année s'affiche toute seule : saisissez le chiffre de la période.": {
    champ: 'nom',
  },
  // Pas de consigne de position (guide 7 ; m234).
  "Inutile d'écrire la période : choisissez le rythme plus bas.": {
    texte: "Inutile d'écrire la période : choisissez le rythme.",
    champ: 'nom',
  },
  "Ce chiffre semble sensible : cochez « Domaine sensible », ou confirmez que ce n'est pas le cas.":
    { champ: 'nom' },
  // Variante d'un ministère : verifier_libelle la rend sans la lever (m234 : formule « Demandez à
  // EJP Tech de ... »).
  "Ce chiffre semble toucher la santé, l'accompagnement ou les enfants. Un domaine sensible se demande à EJP Tech, qui vérifiera votre ajout.":
    {
      texte:
        "Ce chiffre semble toucher la santé, l'accompagnement ou les enfants. Demandez à EJP Tech de l'ajouter.",
      champ: 'nom',
    },

  // Chiffres du dimanche et du mois (controler_mesure_le, verifier_fij_actifs, saisir_chiffres_mois).
  // Le dimanche vient de l'adresse, sans champ de date : la phrase se dit sous le bouton.
  "La date doit être un dimanche passé ou aujourd'hui.": {
    texte: "Choisissez un dimanche passé ou celui d'aujourd'hui.",
  },
  'Ce chiffre se calcule : il ne se saisit pas.': {
    texte: 'Ce chiffre se calcule seul. Rechargez la page, puis réessayez.',
  },
  'Les STARs en FIJ ne peuvent pas dépasser les STARs actifs.': {
    texte: "« Dont en FIJ » dépasse « STARs actifs ». Corrigez l'un des deux chiffres.",
    champ: 'en_fij',
  },
  // Changé entre-temps : le reste du formulaire est à renvoyer (T66, t158 et m078).
  "« % » n'est plus proposé à la saisie.": {
    texte: "« % » n'est plus suivi. Rechargez la page, puis réessayez.",
  },
  // Loin du champ : ce qui cloche, puis la consigne du contrôle avant l'envoi (T66, m080).
  'Entre 0 et 9 999.': { texte: `${LIMITE} Saisissez un nombre entre 0 et 9 999.` },
  'Entre 0 et 99 999.': { texte: `${LIMITE} Saisissez un nombre entre 0 et 99 999.` },
  'Entre 0 et 9 999 999.': { texte: `${LIMITE} Saisissez un nombre entre 0 et 9 999 999.` },
  'Choisissez une heure entre 0 h 00 et 23 h 59.': {
    texte: 'Saisissez une heure entre 0 h 00 et 23 h 59.',
  },
  // Même texte que l'écran (T66, t157 et m070 ; t085 et m083).
  'Seul un indicateur saisi du dimanche se saisit dès le dimanche matin.': {
    texte: "Les autres chiffres s'ouvrent à 12 h.",
  },
  "Ce mois n'est pas encore commencé.": { texte: "Ce mois n'a pas encore commencé." },
  'Un mois se saisit à la date de son 1er jour.': {
    texte: "Ce mois n'est pas proposé à la saisie.",
  },
  'Ce mois est trop ancien pour être saisi.': {},
  'Saisissez au moins un chiffre.': {},
  // Filets que le formulaire ne déclenche pas : le message de repli (T66, m098).
  'Un envoi compte 30 chiffres au plus.': REPLI,
  "Un indicateur ne se saisit qu'une fois par envoi.": REPLI,
  // Un seul texte pour 1 à 9 caractères et au-delà de 280 : l'écran contrôle les deux cas avant
  // l'envoi (precisionTropCourte, precisionTropLongue) ; la base ne dit pas lequel.
  'La précision doit faire entre 10 et 280 caractères.': { champ: 'precision' },
  'La somme des catégories (%) dépasse le total du mois (%).': {
    texte: 'Les catégories font % pour un total de %. Corrigez la répartition ou le total.',
    champ: 'repartition',
  },
  // La liste des catégories a changé pendant la saisie (T66, m097).
  "Cet indicateur n'a pas de répartition.": { texte: CATEGORIES_CHANGEES },
  "Cette catégorie n'est pas dans la liste de l'indicateur.": { texte: CATEGORIES_CHANGEES },
  'La répartition se donne par catégorie.': { texte: CATEGORIES_CHANGEES },
  "Un total ne se répartit qu'une fois.": { texte: CATEGORIES_CHANGEES },
  "Une répartition demande de 3 à 6 catégories en cours dans la liste de l'indicateur.": {
    texte: CATEGORIES_CHANGEES,
  },
  "Une répartition reprend toutes les catégories en cours de la liste de l'indicateur, et elles seules.":
    { texte: CATEGORIES_CHANGEES },

  // Chiffres par département (saisir_fij_statistiques).
  'Rubrique inconnue.': { texte: LISTE_CHANGEE },
  'Département inconnu.': { texte: LISTE_CHANGEE },
  'Chaque valeur est un nombre entier de 0 à 9 999.': {
    texte: `${LIMITE} Saisissez un nombre entre 0 et 9 999.`,
  },
  // Glossaire « chiffre » (T66, t125 et m085).
  'Saisissez au moins une valeur.': { texte: 'Saisissez au moins un chiffre.' },

  // Événements (ajouter_evenement, controler_evenement_etat). Une seule phrase de date passée,
  // à l'ajout comme à la mise à jour (T66, t140 et m125).
  'La date ne peut pas être passée.': { texte: DATE_PASSEE, champ: 'date' },
  "La nouvelle date doit être aujourd'hui ou plus tard.": { texte: DATE_PASSEE, champ: 'date' },
  "Rien n'a changé : ce statut et cette date sont déjà enregistrés.": {
    texte: "Ce statut et cette date sont déjà enregistrés. Changez l'un des deux.",
  },
  'Choisissez une date.': { champ: 'date' },
  "Donnez un nom à l'événement (80 caractères au plus).": { champ: 'nom' },
  'Choisissez un statut.': {},
  // Heures d'un événement (T68). L'heure de début sur une date à venir se dit telle quelle ; les
  // deux autres reprennent les phrases du contrôle avant l'envoi (TEXTES_EVENEMENT).
  "L'heure de début se saisit le jour de l'événement ou après.": { champ: 'heure_debut' },
  "L'heure de début se saisit pour un événement terminé.": {
    texte: "Choisissez « Terminé » pour indiquer l'heure de début.",
    champ: 'heure_debut',
  },
  "L'heure prévue est invalide.": { texte: 'Choisissez une heure valide.', champ: 'heure_prevue' },

  // Points d'attention (creer_point, changer_statut_point, marquer_traite, mentions). Les textes
  // des contrôles avant l'envoi (MESSAGES_POINT.controle ; T66, t240 à t262 et m137 à m151).
  // Le titre vide ou trop long lève un seul message : il reste tel quel.
  'Donnez un titre au point (80 caractères au plus).': { champ: 'titre' },
  'La description dépasse 280 caractères.': {
    texte: 'Raccourcissez ce texte : 280 caractères au plus.',
    champ: 'description',
  },
  "L'action attendue dépasse 80 caractères.": {
    texte: 'Raccourcissez ce texte : 80 caractères au plus.',
    champ: 'attendu',
  },
  "L'échéance ne peut pas être passée.": { texte: DATE_PASSEE, champ: 'echeance' },
  'Ce ministère ne peut pas être mentionné.': { texte: MINISTERE_DESACTIVE, champ: 'mentions' },
  'Ce point est traité : il ne change plus.': { texte: POINT_DEJA_TRAITE },
  'Ce point est déjà traité.': { texte: POINT_DEJA_TRAITE },
  'Ce point est traité : ses mentions ne changent plus.': { texte: POINT_DEJA_TRAITE },
  'Choisissez les ministères à mentionner.': { champ: 'mentions' },
  'Utilisez le bouton Marquer traité.': {
    texte: 'Pour traiter ce point, choisissez « Marquer traité ».',
  },
  // Le même message pour un commentaire de point (« Commentaire ») et la réponse à un
  // signalement : « ce texte », comme pour la description (T66, m151 et m173).
  'Le commentaire dépasse 280 caractères.': {
    texte: 'Raccourcissez ce texte : 280 caractères au plus.',
    champ: 'texte',
  },
  'Expliquez ce qui a été traité et comment (10 caractères au moins).': { champ: 'texte' },
  'Ce ministère est déjà mentionné sur ce point.': { texte: MENTIONS_CHANGEES },
  "Ce ministère n'est pas mentionné sur ce point.": { texte: MENTIONS_CHANGEES },

  // Sessions (declarer_session, supprimer_session, ministeres_actifs ; T66, t315 à t318).
  'Une session % est déjà déclarée le %.': {
    texte: 'Une session % existe déjà le %. Choisissez une autre date.',
    champ: 'date',
  },
  'Des ministères ont déjà saisi : la session ne peut plus être supprimée.': {
    texte: 'Des ministères ont déjà saisi cette session. Elle reste dans la liste.',
  },
  'Choisissez le type et la date de la session.': {},
  'Donnez un nom au rassemblement (80 caractères au plus).': {
    texte: 'Donnez un nom à la session (80 caractères au plus).',
    champ: 'nom',
  },
  'Seul un autre rassemblement porte un nom.': {
    texte: 'Seule une autre session porte un nom. Retirez le nom.',
  },
  'Cochez au moins un ministère.': {},
  "Un ministère coché n'est pas actif.": { texte: MINISTERE_DESACTIVE },

  // Signalements (signaler_difficulte, clore_signalement) : les textes des contrôles avant
  // l'envoi (TEXTES_SIGNALEMENT, TEXTES_BLOC_SIGNALEMENTS ; T66, m167, m168 et m173).
  'Décrivez la difficulté (10 caractères au moins).': { champ: 'texte' },
  'Le signalement dépasse 280 caractères.': {
    texte: 'Raccourcissez le signalement : 280 caractères au plus.',
    champ: 'texte',
  },
  "Choisissez l'écran concerné dans la liste.": {
    texte: "Ouvrez « Signaler une difficulté » depuis l'écran concerné.",
  },
  'Le commentaire fait 10 caractères au moins, ou reste vide.': {
    texte: 'Écrivez au moins 10 caractères, ou laissez la réponse vide.',
    champ: 'texte',
  },
  'Ce signalement est déjà clos.': {},

  // Modération (marquer_relu, masquer_texte, auteur_texte).
  'Texte introuvable, vide ou déjà masqué.': {
    texte: 'Ce texte est déjà masqué ou vide. Rechargez la page.',
  },
  'Ce texte a déjà été relu.': { texte: 'Ce texte a déjà été relu. Rechargez la page.' },
  'Ce champ ne peut pas être masqué.': {
    texte: 'Ce champ ne se masque pas. Choisissez-en un autre.',
  },
  "Ce texte n'existe pas ou ne contient aucun champ libre.": {
    texte: 'Ce texte est introuvable. Rechargez la page.',
  },
  'Choisissez un motif dans la liste.': {},

  // Conditions d'utilisation (accepter_conditions).
  'Version des conditions inconnue.': {
    texte: 'Les conditions ont changé. Rechargez la page, puis acceptez-les.',
  },

  // Prénom de la personne qui utilise un compte partagé (declarer_intervenant, effacer_prenom ;
  // T56). Les mêmes textes que le contrôle avant l'envoi (`MESSAGES_PRENOM`, guide 10.9).
  'Indiquez votre prénom.': { champ: 'prenom' },
  '30 caractères au plus.': { champ: 'prenom' },
  'Écrivez seulement votre prénom, en lettres.': { champ: 'prenom' },
  'Prénom introuvable ou déjà effacé.': {},

  // Indicateurs : création, calculs, suggestions (creer_indicateur, creer_calcul,
  // ajouter_suggestion, m233).
  'Donnez un libellé de 2 à 60 caractères.': {
    texte: 'Donnez un nom de 2 à 60 caractères.',
    champ: 'nom',
  },
  "Expliquez ce qu'on compte en 10 à 140 caractères.": {
    texte: 'Expliquez ce qui est compté, en 10 à 140 caractères.',
    champ: 'definition',
  },
  'Cette fiche a déjà « % ».': {
    texte: 'Cette fiche a déjà un indicateur « % ». Choisissez un autre nom.',
    champ: 'nom',
  },
  'Votre fiche a déjà « % ».': {},
  'Choisissez la sorte de nombre.': { texte: 'Choisissez le type de nombre.' },
  'Ces deux chiffres ne se calculent pas ensemble.': {
    texte: 'Choisissez deux chiffres différents du même ministère.',
  },
  'Un calcul se fait sur des chiffres distincts.': {
    texte: 'Choisissez deux chiffres différents du même ministère.',
  },
  "Un indicateur sensible n'entre dans aucun calcul.": {
    texte: 'Choisissez des indicateurs actifs et non sensibles.',
  },
  'Un calcul se fait sur des indicateurs actifs.': {
    texte: 'Choisissez des indicateurs actifs et non sensibles.',
  },
  "Cette suggestion n'existe pas.": {
    texte: 'Cet indicateur prévu est introuvable. Rechargez la page.',
  },
  'Expliquez pourquoi en 10 caractères au moins.': {
    texte: 'Expliquez pourquoi (10 caractères au moins).',
    champ: 'texte',
  },
  '280 caractères au plus.': {
    texte: 'Raccourcissez ce texte : 280 caractères au plus.',
    champ: 'texte',
  },
  // Le même texte que le contrôle avant l'envoi (`explicationLimiteAjouts`, guide 10.9 ; T66,
  // m233) : depuis T62, le ministère retire lui-même un de ses ajouts dans « Mes indicateurs ».
  'Votre ministère a déjà 3 indicateurs à lui. Retirez-en un pour en ajouter un autre.': {
    texte: 'Votre ministère a déjà 3 indicateurs ajoutés. Retirez-en un pour en ajouter un autre.',
  },
  // Le texte de la base nomme EJP Tech depuis T60 (20261013130000_gestion_ejp_tech.sql).
  "Votre fiche compte déjà 30 indicateurs. Demandez à EJP Tech d'en retirer un.": {},
  'Cette fiche compte déjà 30 indicateurs. Retirez-en un pour en ajouter un autre.': {},
  'Choisissez le rythme : chaque dimanche, chaque mois ou à ce jour.': {},
  'Choisissez un taux ou une moyenne.': {},
  'Seul un taux peut être une part.': {},

  // Indicateurs prévus (creer_indicateurs_prevus, m228).
  'La fiche a déjà « % » : retirez-le avant de créer les indicateurs prévus.': {
    texte: 'La fiche a déjà « % ». Retirez-le, puis créez les indicateurs prévus.',
  },
  'Avec les indicateurs prévus, la fiche compterait % indicateurs : 30 au plus.': {
    texte:
      "Avec les indicateurs prévus, la fiche aurait % indicateurs : 30 au plus. Retirez-en d'abord.",
  },
  "Cette fiche a déjà des indicateurs prévus : « aucun » ne s'applique pas.": {
    texte: "Cette fiche a déjà des indicateurs prévus : « Aucun prévu » ne s'applique plus.",
  },
  "Ce modèle n'existe pas dans le catalogue.": {
    texte: 'Cette liste est introuvable. Rechargez la page.',
  },
  "Le calcul « % » demande un chiffre qui n'est plus suivi sur cette fiche.": {
    texte: "Le calcul « % » a besoin d'un chiffre qui n'est plus suivi sur cette fiche.",
  },
  // Le catalogue est à corriger : la formule « panne » sans « Réessayez » ; le texte technique
  // reste dans les journaux (T66, m229).
  'Deux indicateurs prévus portent le même nom, « % » : le catalogue est à corriger.': {
    texte: PREVUS_EN_PANNE,
  },
  'Un indicateur prévu porte le nom du chiffre commun « % » : le catalogue est à corriger.': {
    texte: PREVUS_EN_PANNE,
  },
  // Liste choisie d'un ministère (choisir_modele_prevus et creer_indicateurs_prevus, T72,
  // Proposé) : ce qui bloque et quoi faire.
  "Cette fiche suit encore des indicateurs prévus d'une autre liste : retirez-les avant de changer de liste.":
    {
      texte:
        'Cette fiche suit encore des indicateurs prévus de sa liste. Retirez-les, puis changez de liste.',
    },
  "Cette liste sert déjà à la fiche « % » : changez d'abord le choix de cette fiche.": {
    texte: "Cette liste sert déjà à « % ». Changez d'abord la liste de ce ministère.",
  },
  "Cette fiche suit une autre liste : changez d'abord le choix de la liste.": {
    texte: "Cette fiche suit une autre liste. Changez d'abord la liste choisie.",
  },

  // Indicateurs : correction, retrait, validation (corriger_indicateur, retirer_indicateur,
  // valider_indicateur ; T66, m235 et m236 : « déjà enregistré » et « changé entre-temps »).
  "Rien n'a changé : ce libellé et cette définition sont déjà enregistrés.": {
    texte: "Ce nom et cette définition sont déjà enregistrés. Changez l'un des deux.",
  },
  'Un indicateur retiré ne change plus.': {
    texte: 'Cet indicateur est retiré : il ne change plus.',
  },
  'Cet indicateur est déjà retiré.': {
    texte: 'Cet indicateur est déjà retiré. Rechargez la page.',
  },
  'Choisissez le motif du retrait.': {},
  'Ce chiffre a déjà des valeurs : remplacez-le pour en changer le sens.': {
    texte: "Ce chiffre a déjà des valeurs. Pour changer ce qu'il compte, remplacez-le.",
  },
  'Ce chiffre semble sensible : remplacez-le par un nouvel indicateur « Domaine sensible ».': {
    texte:
      'Ce chiffre semble sensible. Remplacez-le par un nouvel indicateur « Domaine sensible ».',
  },
  "Une suggestion garde le nom qu'elle a dans tous les ministères.": {},
  'Cette demande a déjà été décidée.': {
    texte: 'Cette demande a déjà reçu une réponse. Rechargez la page.',
  },
  "Cette demande a été retirée ou remplacée : il n'y a plus rien à décider.": {
    texte: 'Cette demande a été retirée ou remplacée. Rechargez la page.',
  },
  'Choisissez de valider ou de refuser.': {},
  "Une correction du nom ne se décide pas encore dans l'outil.": {
    texte: "La correction d'un nom n'est pas encore disponible.",
  },
  'Expliquez le refus (10 caractères au moins).': { champ: 'texte' },
  // Refus d'EJP Tech (valider_indicateur) et retrait d'un ministère (retirer_mon_indicateur).
  'Le motif dépasse 280 caractères.': {
    texte: 'Raccourcissez le motif : 280 caractères au plus.',
    champ: 'texte',
  },

  // Retrait d'un ajout par son ministère (retirer_mon_indicateur, T62) : le motif sous son champ,
  // le reste sous les boutons de la fenêtre. La source d'un calcul : le même texte que la ligne de
  // « Mes indicateurs », qui le dit à la place du bouton (guide 10.9).
  'Expliquez pourquoi vous le retirez (10 caractères au moins).': { champ: 'texte' },
  "Cet indicateur n'a pas été ajouté par votre ministère. Demandez à EJP Tech de le retirer.": {},
  'Ce chiffre sert au calcul « % » : demandez à EJP Tech de le retirer.': {},

  // Garde-fous de la base que l'interface ne déclenche pas (m274) : le repli.
  'Ce rôle ne convient pas à ce calcul.': REPLI,
  'Ce texte est réservé au retrait pour confidentialité.': REPLI,
  'Chaque catégorie compte un nombre entier de 0 à 9 999.': REPLI,
  'Chaque chiffre est un nombre entier.': REPLI,
  'Chaque chiffre porte son indicateur et sa valeur.': REPLI,
  "Chaque rubrique d'un département ne se saisit qu'une fois par envoi.": REPLI,
  "L'indicateur remplacé est retiré avec le motif « remplacé ».": REPLI,
  "La source d'un calcul prévu est un indicateur saisi, non sensible, du même modèle.": REPLI,
  "Le calcul « % » n'a pas tous ses termes.": REPLI,
  "Le remplaçant d'un indicateur sensible est sensible.": REPLI,
  'Un chiffre commun ne se calcule pas.': REPLI,
  "Un comptage d'événements se lit par mois.": REPLI,
  'Un décalage se compte en mois : il demande un calcul du mois.': REPLI,
  'Un envoi compte 32 valeurs au plus : 4 rubriques pour 8 départements.': REPLI,
  'Un indicateur naît actif ou à valider.': REPLI,
  'Un indicateur sensible est un nombre de 0 à 9 999.': REPLI,
  'Un indicateur sensible ne se calcule pas.': REPLI,
  'Un indicateur sensible se saisit chaque mois.': REPLI,
  'Un terme appartient à un calcul.': REPLI,
  'Un terme prévu appartient à un calcul prévu.': REPLI,
  'Une catégorie appartient à un indicateur sensible du catalogue.': REPLI,
  "Une précision accompagne le total du mois d'un indicateur sensible.": REPLI,
  'Une précision accompagne seulement un indicateur sensible.': REPLI,
  "Une répartition accompagne le total du mois d'un indicateur sensible.": REPLI,
  // Le motif d'une déclaration de prénom est fixé par l'interface (T56).
  'Motif inconnu.': REPLI,
  // Une ligne de journal pour un ministère supprimé pendant l'envoi (T74) : garde-fou, que
  // l'interface ne déclenche pas (le ministère n'est plus proposé).
  "Ce ministère n'existe pas.": REPLI,
  // Codes des fonctions serveur des comptes : seules les Edge Functions les reçoivent et les
  // traduisent (`supabase/functions/_shared/base.ts`, puis MESSAGES_ERREURS_COMPTES). T74 :
  // correction d'une adresse et suppression d'un ministère.
  adresse_deja_utilisee: REPLI,
  adresse_non_modifiee: REPLI,
  berger_deja_actif: REPLI,
  compte_actif: REPLI,
  compte_deja_active: REPLI,
  compte_desactive: REPLI,
  compte_inconnu: REPLI,
  invitation_deja_acceptee: REPLI,
  ministere_a_deja_un_compte: REPLI,
  ministere_de_reference: REPLI,
  ministere_inconnu: REPLI,
  ministere_non_vide: REPLI,
  nom_ministere_deja_pris: REPLI,
  propre_compte: REPLI,
  requete_invalide: REPLI,
  type_interdit: REPLI,
}

/**
 * Refus de droit (42501), par texte exact de la base. Absent de la table (politique de RLS,
 * fonction sans droit d'exécution) : un refus d'accès.
 */
const REFUS_DE_DROIT: Readonly<
  Record<string, 'expiree' | 'desactive' | 'acces' | typeof REPLI | Traduction>
> = {
  'Double authentification requise.': 'expiree',
  // Jeton sans session (declarer_intervenant, T56) : se reconnecter.
  'Session inconnue : reconnectez-vous.': 'expiree',
  'Compte inactif ou inconnu.': 'desactive',
  "Cet élément n'existe pas ou vous n'y avez pas accès.": 'acces',
  "Ce point n'existe pas ou vous n'y avez pas accès.": 'acces',
  "Cette session n'existe pas ou vous n'y avez pas accès.": 'acces',
  'Seul EJP Tech peut masquer un texte.': 'acces',
  'Seul EJP Tech peut relire un texte.': 'acces',
  // Formule « droit refusé », sans nom d'équipe (T66, m126 et m142). Une session : l'écran dit
  // sa propre phrase (`erreurAccesAjout`, m207).
  'Seul un compte de ministère peut ajouter un événement.': {
    texte: "Votre compte ne permet pas d'ajouter un événement.",
  },
  "Seules l'administration de l'église et EJP Tech déclarent une session.": 'acces',
  'Seul un compte de ministère indique un prénom.': 'acces',
  'Seul EJP Tech efface un prénom.': 'acces',
  'Seul un compte de ministère peut créer un point.': {
    texte: 'Votre compte ne permet pas de créer un point.',
  },
  // Comptages et ponctualité des événements de l'église (T68, K11) : un refus d'accès.
  "Seuls Coordination, le berger, le conseil et EJP Tech lisent les comptages de l'église.":
    'acces',
  // Garde-fous de la base (inaltérabilité, indicateurs, catégories) : le repli (m274).
  "Ce changement d'état n'est pas permis.": REPLI,
  'Cette catégorie sert déjà dans une répartition : elle ne change plus, elle se retire seulement.':
    REPLI,
  "L'état d'un indicateur change seulement par un retrait ou une validation.": REPLI,
  "La table % est en ajout seul : elle ne se modifie pas et ne s'efface pas.": REPLI,
  "Le sens d'un indicateur est figé : remplacez-le pour en changer.": REPLI,
  "Les catégories d'un indicateur sensible s'écrivent seulement par migration.": REPLI,
  "Les termes d'un calcul s'écrivent à sa création, puis ne changent plus.": REPLI,
  'Un chiffre commun ne change que par une migration.': REPLI,
  'Un indicateur ne se supprime pas : il se retire.': REPLI,
  'Un indicateur retiré ne change plus.': REPLI,
  "Une catégorie qui sert dans une répartition ne s'efface pas.": REPLI,
  'Une suggestion garde le texte du catalogue.': REPLI,
  // Conditions acceptées sans déclaration valable sur la session (accepter_conditions, T61) : la
  // phrase telle quelle, et la session relue mène à « Qui utilise l'outil ? ». Le même texte,
  // pour un jour d'utilisation noté sans déclaration (forcer_passage, T56), reste silencieux.
  "Indiquez d'abord votre prénom.": {},
  // Fonctions serveur des comptes, appelées par les Edge Functions seules.
  appelant_non_autorise: REPLI,
  session_revoquee: REPLI,
}

/** Clés des deux tables, pour le test qui les compare aux migrations. */
export const CLES_REFUS_DE_SAISIE: readonly string[] = Object.keys(REFUS_DE_SAISIE)
export const CLES_REFUS_DE_DROIT: readonly string[] = Object.keys(REFUS_DE_DROIT)

/** Expression qui reconnaît un message complété par la base à partir d'une clé à `%`. */
function modele(cle: string): RegExp {
  const echappee = cle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '(.+?)')
  return new RegExp(`^${echappee}$`, 's')
}

/** Clés à `%`, essayées après les clés exactes. */
function modeles<T>(table: Readonly<Record<string, T>>) {
  return Object.entries(table)
    .filter(([cle]) => cle.includes('%'))
    .map(([cle, entree]) => ({ expression: modele(cle), entree }))
}

const MODELES_SAISIE = modeles(REFUS_DE_SAISIE)
const MODELES_DROIT = modeles(REFUS_DE_DROIT)

/** Entrée d'une table pour un message, avec les valeurs qui remplacent ses `%`. */
function chercher<T>(
  table: Readonly<Record<string, T>>,
  modelesTable: readonly { expression: RegExp; entree: T }[],
  message: string,
): { entree: T; valeurs: string[] } | null {
  if (Object.hasOwn(table, message)) return { entree: table[message] as T, valeurs: [] }
  for (const { expression, entree } of modelesTable) {
    const trouve = expression.exec(message)
    if (trouve) return { entree, valeurs: trouve.slice(1) }
  }
  return null
}

/** Texte d'une traduction, `%` remplacés dans l'ordre par les valeurs de la base. */
function rediger(traduction: Traduction, message: string, valeurs: readonly string[]): string {
  if (traduction.texte === undefined) return message
  let rang = 0
  return traduction.texte.replace(/%/g, () => valeurs[rang++] ?? '')
}

/** Nature d'une phrase : dire quoi faire, se reconnecter, contacter EJP Tech ou réessayer. */
export type NaturePhrase = 'refus' | 'expiree' | 'desactive' | 'repli'

/** Ce que la table dit d'une erreur. */
export type ErreurLue =
  /**
   * Aucune réponse de la base à traduire (fetch rejeté, réponse perdue ou illisible, délai,
   * exception du code) : `lireEchec` (src/data/echecEnvoi.ts) en dit l'issue (T76).
   */
  | { genre: 'technique' }
  /** Refus d'accès (42501) : l'écran dit sa propre phrase. */
  | { genre: 'acces' }
  /**
   * Une phrase à dire telle quelle, sous `champ` si l'écran l'a, sinon sous le bouton.
   * `nature` : refus de la base ou d'un contrôle (dire quoi faire), connexion expirée, compte
   * désactivé, ou repli (prévenir EJP Tech si le problème revient).
   */
  | {
      genre: 'message'
      nature: NaturePhrase
      message: string
      champ: ChampRefus | null
    }

/** Options de lecture : un formulaire garde la saisie, une action sans formulaire non. */
export interface OptionsLecture {
  /** Faux pour une action sans formulaire (« Rien à signaler », « Supprimer ») : repli d'action. */
  formulaire?: boolean
}

const CHAMPS: ReadonlySet<string> = new Set<ChampRefus>([
  'titre',
  'nom',
  'description',
  'definition',
  'attendu',
  'echeance',
  'date',
  'mentions',
  'texte',
  'precision',
  'repartition',
  'en_fij',
  'prenom',
  'heure_prevue',
  'heure_debut',
])

/** Nom d'un champ de schéma Zod vers le champ de la table (« pourquoi », « motif » : un texte). */
function champDuChemin(chemin: readonly PropertyKey[]): ChampRefus | null {
  const premier = chemin[0]
  if (typeof premier !== 'string') return null
  if (premier === 'pourquoi' || premier === 'motif' || premier === 'commentaire') return 'texte'
  return CHAMPS.has(premier) ? (premier as ChampRefus) : null
}

/** Message par défaut de Zod (en anglais) : un contrôle imprévu, jamais montré. */
const MESSAGE_ZOD_PAR_DEFAUT = /^(Invalid|Too (big|small)|Expected|Unrecognized|Required)\b/

/** Vrai pour une consigne de Zod imprévue (message par défaut, en anglais) : un bogue du code. */
export function estControleImprevu(erreur: unknown): boolean {
  if (!(erreur instanceof z.ZodError)) return false
  const probleme = erreur.issues[0]
  return !probleme || MESSAGE_ZOD_PAR_DEFAUT.test(probleme.message)
}

/** Codes de PostgREST d'un jeton refusé, expiré ou absent (401). */
const JETON_REFUSE: ReadonlySet<string> = new Set(['PGRST301', 'PGRST302', 'PGRST303'])

/** Jeton refusé dit par son texte : PostgREST, ou une passerelle qui répond 401 sans code. */
const JETON_DANS_LE_MESSAGE = /\bJWT\b/

/**
 * Droit d'exécution ou de lecture absent (42501 de Postgres, jamais un `raise exception`) : toute
 * fonction et toute table de l'API sont ouvertes à `authenticated`, ce refus dit donc que la
 * requête est partie sans jeton valable (rôle `anon`, renouvellement raté). Connexion expirée
 * (T76, Q8), et non « introuvable ».
 */
const SANS_JETON = /^permission denied for (function|table|view|schema|sequence) /

function lireChamp(erreur: object, nom: 'code' | 'message'): string | undefined {
  const valeur = (erreur as Record<string, unknown>)[nom]
  return typeof valeur === 'string' ? valeur : undefined
}

function phrase(nature: NaturePhrase, message: string, champ: ChampRefus | null = null): ErreurLue {
  return { genre: 'message', nature, message, champ }
}

function sessionChangee(nature: 'expiree' | 'desactive'): ErreurLue {
  return phrase(
    nature,
    nature === 'expiree' ? MESSAGES_COMMUNS.connexionExpiree : MESSAGES_COMMUNS.compteDesactive,
  )
}

let rappelSession: (() => void) | null = null

/**
 * Enregistre ce que l'application fait quand un refus dit que la session a changé (connexion
 * expirée, compte désactivé) : relire la session, pour que la garde mène à l'écran de connexion,
 * de code ou « Compte désactivé », avec l'adresse de la page en retour (m271). `null` le retire.
 * Le module de session l'enregistre : cette table ne dépend pas du client Supabase.
 */
export function surSessionChangee(rappel: (() => void) | null): void {
  rappelSession = rappel
}

/**
 * Traduction d'une erreur par la table, sans effet : ce que dit `lireErreurBase`, sans relire la
 * session. `classer` (src/data/echecEnvoi.ts) s'en sert autant de fois qu'il faut.
 */
export function traduireErreurBase(erreur: unknown, options: OptionsLecture = {}): ErreurLue {
  const repli = phrase(
    'repli',
    options.formulaire === false ? MESSAGES_COMMUNS.repliAction : MESSAGES_COMMUNS.repliSaisie,
  )

  // Contrôle de la couche data (schémas partagés avec les formulaires) : sa consigne, sous son
  // champ. Un message par défaut de Zod (en anglais) trahit un contrôle imprévu : le repli. Un
  // schéma qui reprend le texte d'un filet de la base (« Chaque rubrique d'un département ne se
  // saisit qu'une fois par envoi. ») prend le repli comme la base (T66, m098).
  if (erreur instanceof z.ZodError) {
    const probleme = erreur.issues[0]
    if (!probleme || estControleImprevu(erreur)) return repli
    if (REFUS_DE_SAISIE[probleme.message] === REPLI) return repli
    return phrase('refus', probleme.message, champDuChemin(probleme.path))
  }
  if (typeof erreur !== 'object' || erreur === null) return { genre: 'technique' }

  const code = lireChamp(erreur, 'code')
  const message = lireChamp(erreur, 'message') ?? ''

  if (code === undefined || code === '') {
    // Une passerelle qui refuse le jeton (401) sans code PostgREST : connexion expirée (10.11).
    if (JETON_DANS_LE_MESSAGE.test(message)) return sessionChangee('expiree')
    // Pas de code : la base n'a rien dit. L'issue (rien n'est parti, réponse perdue, délai,
    // bogue) se lit dans les faits de l'envoi, par `classer` (T76).
    return { genre: 'technique' }
  }
  if (JETON_REFUSE.has(code) || JETON_DANS_LE_MESSAGE.test(message)) {
    return sessionChangee('expiree')
  }
  if (code === '42501') {
    if (SANS_JETON.test(message)) return sessionChangee('expiree')
    const trouve = chercher(REFUS_DE_DROIT, MODELES_DROIT, message)
    const entree = trouve?.entree ?? 'acces'
    if (entree === 'expiree') return sessionChangee('expiree')
    if (entree === 'desactive') return sessionChangee('desactive')
    if (entree === 'acces') return { genre: 'acces' }
    if (entree === REPLI) return repli
    return phrase('refus', rediger(entree, message, trouve?.valeurs ?? []), entree.champ ?? null)
  }
  if (code === 'P0001') {
    const trouve = chercher(REFUS_DE_SAISIE, MODELES_SAISIE, message)
    if (!trouve || trouve.entree === REPLI) return repli
    const { entree, valeurs } = trouve
    return phrase('refus', rediger(entree, message, valeurs), entree.champ ?? null)
  }
  return repli
}

/**
 * Ce qu'un écran fait d'une erreur reçue après un appel à la base (`rpc`, `insert`) ou d'une
 * validation Zod de la couche data. Ne rend jamais le texte brut de la base. Une connexion
 * expirée ou un compte désactivé font relire la session (m271), après la lecture en cours. Les
 * écrans d'envoi passent par `lireEchec` (src/data/echecEnvoi.ts), qui l'appelle.
 */
export function lireErreurBase(erreur: unknown, options: OptionsLecture = {}): ErreurLue {
  const lue = traduireErreurBase(erreur, options)
  if (lue.genre === 'message' && (lue.nature === 'expiree' || lue.nature === 'desactive')) {
    const rappel = rappelSession
    // Jamais pendant la lecture : un écran peut lire l'erreur pendant son rendu.
    if (rappel) setTimeout(rappel, 0)
  }
  return lue
}
/**
 * Phrase d'un message que la base rend sans le lever (`verifier_libelle`, contrôles pendant la
 * frappe) : la même que la traduction du refus qu'il annonce, car l'interface contrôle le cas avant
 * l'envoi (guide, 10.9 ; « Cette fiche a déjà « % ». », m233). Un message que la table dit tel quel,
 * ou qu'elle ne connaît pas, reste celui de la base, écrit pour l'écran (familles de
 * `private.verifier_texte`).
 */
export function traduireMessageBase(message: string): string {
  const trouve = chercher(REFUS_DE_SAISIE, MODELES_SAISIE, message)
  if (!trouve || trouve.entree === REPLI) return message
  return rediger(trouve.entree, message, trouve.valeurs)
}

/** Phrase d'une lecture qui a échoué : « trop de temps » après 10 s (m252), sinon `connexion`. */
export function phraseLecture(erreur: unknown, connexion: string): string {
  return estDelaiDepasse(erreur) ? MESSAGES_COMMUNS.delaiLecture : connexion
}

/**
 * Vrai pour un mauvais déploiement (adresse ou clé publique absente, clé secrète fournie :
 * `ErreurConfiguration` de `src/lib/supabase.ts`) : réessayer ne sert jamais (m253). Reconnue par
 * son nom, pour ne pas lier cette table au client Supabase.
 */
export function estErreurConfiguration(erreur: unknown): boolean {
  return erreur instanceof Error && erreur.name === 'ErreurConfiguration'
}
