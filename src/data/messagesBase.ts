// Traduction des erreurs de la base, de PostgREST et du réseau (guide des messages, sections 10.9
// et 10.11 ; lignes m270 à m274, T59). Aucun texte de `raise exception`, aucun code PostgREST ne
// s'affiche tel quel : chaque refus passe par la table de ce fichier, qui lui donne une phrase et
// le champ sous lequel la dire. Le texte SQL reste la clé : réécrire une phrase ne demande aucune
// migration. Un test (`messagesBase.test.ts`) lit chaque `raise exception` des migrations et
// échoue si un message n'est ni dans la table ni dans la liste des garde-fous laissés au repli.
//
// Le code décide d'abord, le texte ensuite :
// - pas de code et une erreur de fetch (code vide de postgrest-js, TypeError de fetch, erreur de
//   fetch des clients Auth et Edge Functions) : `reseau`, l'écran dit sa phrase de connexion ;
//   toute autre erreur sans code (`Error` levée par le code, corps illisible d'une passerelle en
//   panne) n'est pas une coupure : elle prend le repli ;
// - délai de 10 s dépassé : `delai`, l'écran dit « peut-être fait » pour une création ;
// - jeton expiré ou refusé (PGRST301 à PGRST303) : connexion expirée ;
// - 42501 : « Double authentification requise. » donne connexion expirée, « Compte inactif ou
//   inconnu. » donne compte désactivé ; un garde-fou technique prend le repli ; tout autre 42501
//   est un refus d'accès, que l'écran dit avec sa propre phrase ;
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
  /** Délai dépassé pendant une création : la base a peut-être enregistré (m259). */
  peutEtreFait: 'La connexion a échoué. Vérifiez la liste avant de réessayer.',
  /** Lecture abandonnée après 10 s (m252). */
  delaiLecture: 'La réponse met trop de temps. Réessayez.',
  /** Chargement qui dépasse `DELAI_CHARGEMENT_LONG`, avant l'échec à 10 s (m248). */
  chargementLong: "Chargement plus long que d'habitude",
  /** Refus d'accès commun (42501), quand l'écran n'a pas de phrase à lui. */
  acces: "Cet élément n'existe pas ou vous n'y avez pas accès.",
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

/**
 * Une entrée de la table. `texte` absent : la phrase de la base est déjà écrite pour la personne
 * (validée aux étapes 4 à 7) et se dit telle que la table la reçoit, en attendant la refonte des
 * messages. Un `%` du texte prend, dans l'ordre, les valeurs que la base a mises à la place des `%`
 * de sa clé.
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

/**
 * Refus de saisie (P0001), par texte exact de la base. Une clé qui porte `%` reconnaît le message
 * que la base a complété.
 */
const REFUS_DE_SAISIE: Readonly<Record<string, Traduction | typeof REPLI>> = {
  // Textes libres (private.verifier_texte : messages rendus par `raise exception '%'`).
  "N'écrivez aucun nom ni information personnelle.": { champ: 'texte' },
  'Les crochets et « texte masqué » sont réservés à la modération.': { champ: 'texte' },
  'Un taux, une moyenne ou une évolution se calcule : ne le saisissez pas.': { champ: 'nom' },
  "La somme de l'année s'affiche toute seule : saisissez le chiffre de la période.": {
    champ: 'nom',
  },
  "Inutile d'écrire la période : choisissez le rythme plus bas.": { champ: 'nom' },
  "Ce chiffre semble sensible : cochez « Domaine sensible », ou confirmez que ce n'est pas le cas.":
    { champ: 'nom' },
  // Variante d'un ministère : verifier_libelle la rend sans la lever (m234, hors de ce lot).
  "Ce chiffre semble toucher la santé, l'accompagnement ou les enfants. Un domaine sensible se demande à l'administration de l'église. EJP Tech vérifiera votre ajout.":
    { champ: 'nom' },

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
  "« % » n'est plus proposé à la saisie.": {},
  'Entre 0 et 9 999.': {},
  'Entre 0 et 99 999.': {},
  'Entre 0 et 9 999 999.': {},
  'Choisissez une heure entre 0 h 00 et 23 h 59.': {},
  "Ce mois n'est pas encore commencé.": {},
  'Ce mois est trop ancien pour être saisi.': {},
  'Saisissez au moins un chiffre.': {},
  'Un envoi compte 30 chiffres au plus.': {},
  "Un indicateur ne se saisit qu'une fois par envoi.": {},
  'La précision doit faire entre 10 et 280 caractères.': { champ: 'precision' },
  'La somme des catégories (%) dépasse le total du mois (%).': { champ: 'repartition' },

  // Chiffres par département (saisir_fij_statistiques).
  'Rubrique inconnue.': { texte: LISTE_CHANGEE },
  'Département inconnu.': { texte: LISTE_CHANGEE },
  'Chaque valeur est un nombre entier de 0 à 9 999.': {
    texte: 'Un chiffre dépasse la limite. Saisissez un nombre entre 0 et 9 999.',
  },
  'Saisissez au moins une valeur.': {},

  // Événements (ajouter_evenement, controler_evenement_etat). La date passée reprend le texte de
  // la section 7 des aides (TEXTES_SIGNALEMENT.dateRefuseeAjout, formule « Date passée »).
  'La date ne peut pas être passée.': {
    texte: "Cette date est passée. Choisissez aujourd'hui ou une date à venir.",
    champ: 'date',
  },
  "La nouvelle date doit être aujourd'hui ou plus tard.": { champ: 'date' },
  "Rien n'a changé : ce statut et cette date sont déjà enregistrés.": {
    texte: "Ce statut et cette date sont déjà enregistrés. Changez l'un des deux.",
  },
  'Choisissez une date.': { champ: 'date' },
  "Donnez un nom à l'événement (80 caractères au plus).": { champ: 'nom' },
  'Choisissez un statut.': {},

  // Points d'attention (creer_point, changer_statut_point, marquer_traite, mentions).
  'Donnez un titre au point (80 caractères au plus).': { champ: 'titre' },
  'La description dépasse 280 caractères.': { champ: 'description' },
  "L'action attendue dépasse 80 caractères.": { champ: 'attendu' },
  "L'échéance ne peut pas être passée.": { champ: 'echeance' },
  'Ce ministère ne peut pas être mentionné.': { champ: 'mentions' },
  'Ce point est traité : il ne change plus.': {},
  'Ce point est déjà traité.': {},
  'Ce point est traité : ses mentions ne changent plus.': {},
  'Choisissez les ministères à mentionner.': { champ: 'mentions' },
  'Utilisez le bouton Marquer traité.': {},
  'Le commentaire dépasse 280 caractères.': { champ: 'texte' },
  'Expliquez ce qui a été traité et comment (10 caractères au moins).': { champ: 'texte' },
  'Ce ministère est déjà mentionné sur ce point.': { texte: MENTIONS_CHANGEES },
  "Ce ministère n'est pas mentionné sur ce point.": { texte: MENTIONS_CHANGEES },

  // Sessions (declarer_session, supprimer_session, ministeres_actifs).
  'Une session % est déjà déclarée le %.': {
    texte: 'Une session % existe déjà le %. Choisissez une autre date.',
    champ: 'date',
  },
  'Des ministères ont déjà saisi : la session ne peut plus être supprimée.': {
    texte: 'Des ministères ont déjà saisi cette session. Elle reste dans la liste.',
  },
  'Choisissez le type et la date de la session.': {},
  'Donnez un nom au rassemblement (80 caractères au plus).': { champ: 'nom' },
  'Seul un autre rassemblement porte un nom.': {},
  'Cochez au moins un ministère.': {},
  "Un ministère coché n'est pas actif.": {},

  // Signalements (signaler_difficulte, clore_signalement).
  'Décrivez la difficulté (10 caractères au moins).': { champ: 'texte' },
  'Le signalement dépasse 280 caractères.': { champ: 'texte' },
  "Choisissez l'écran concerné dans la liste.": {},
  'Le commentaire fait 10 caractères au moins, ou reste vide.': { champ: 'texte' },
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
  // Le même texte que le contrôle avant l'envoi (`explicationLimiteAjouts`, guide 10.9) : au lot 1,
  // le ministère ne retire pas lui-même un ajout (P53), il le demande à EJP Tech (T59).
  'Votre ministère a déjà 3 indicateurs à lui. Retirez-en un pour en ajouter un autre.': {
    texte:
      "Votre ministère a déjà 3 indicateurs à lui. Demandez à EJP Tech d'en retirer un pour en ajouter un autre.",
  },
  "Votre fiche compte déjà 30 indicateurs. Demandez à l'administration de l'église d'en retirer un.":
    { texte: "Votre fiche compte déjà 30 indicateurs. Demandez à EJP Tech d'en retirer un." },
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

  // Indicateurs : correction, retrait, validation (corriger_indicateur, retirer_indicateur,
  // valider_indicateur ; textes de l'étape 6, en attendant la refonte).
  "Rien n'a changé : ce libellé et cette définition sont déjà enregistrés.": {},
  'Un indicateur retiré ne change plus.': {},
  'Cet indicateur est déjà retiré.': {},
  'Choisissez le motif du retrait.': {},
  'Ce chiffre a déjà des valeurs : remplacez-le pour en changer le sens.': {},
  'Ce chiffre semble sensible : remplacez-le par un nouvel indicateur « Domaine sensible ».': {},
  "Une suggestion garde le nom qu'elle a dans tous les ministères.": {},
  'Cette demande a déjà été décidée.': {},
  "Cette demande a été retirée ou remplacée : il n'y a plus rien à décider.": {},
  'Choisissez de valider ou de refuser.': {},
  "Une correction du nom ne se décide pas encore dans l'outil.": {},
  'Expliquez le refus (10 caractères au moins).': { champ: 'texte' },
  'Le motif dépasse 280 caractères.': { champ: 'texte' },

  // Garde-fous de la base que l'interface ne déclenche pas (m274) : le repli.
  'Ce rôle ne convient pas à ce calcul.': REPLI,
  'Ce texte est réservé au retrait pour confidentialité.': REPLI,
  "Cet indicateur n'a pas de répartition.": REPLI,
  "Cette catégorie n'est pas dans la liste de l'indicateur.": REPLI,
  'Chaque catégorie compte un nombre entier de 0 à 9 999.': REPLI,
  'Chaque chiffre est un nombre entier.': REPLI,
  'Chaque chiffre porte son indicateur et sa valeur.': REPLI,
  "Chaque rubrique d'un département ne se saisit qu'une fois par envoi.": REPLI,
  'Deux indicateurs prévus portent le même nom, « % » : le catalogue est à corriger.': REPLI,
  "L'indicateur remplacé est retiré avec le motif « remplacé ».": REPLI,
  'La répartition se donne par catégorie.': REPLI,
  "La source d'un calcul prévu est un indicateur saisi, non sensible, du même modèle.": REPLI,
  "Le calcul « % » n'a pas tous ses termes.": REPLI,
  "Le remplaçant d'un indicateur sensible est sensible.": REPLI,
  'Seul un indicateur saisi du dimanche se saisit dès le dimanche matin.': REPLI,
  'Un chiffre commun ne se calcule pas.': REPLI,
  "Un comptage d'événements se lit par mois.": REPLI,
  'Un décalage se compte en mois : il demande un calcul du mois.': REPLI,
  'Un envoi compte 32 valeurs au plus : 4 rubriques pour 8 départements.': REPLI,
  'Un indicateur naît actif ou à valider.': REPLI,
  'Un indicateur prévu porte le nom du chiffre commun « % » : le catalogue est à corriger.': REPLI,
  'Un indicateur sensible est un nombre de 0 à 9 999.': REPLI,
  'Un indicateur sensible ne se calcule pas.': REPLI,
  'Un indicateur sensible se saisit chaque mois.': REPLI,
  'Un mois se saisit à la date de son 1er jour.': REPLI,
  'Un terme appartient à un calcul.': REPLI,
  'Un terme prévu appartient à un calcul prévu.': REPLI,
  "Un total ne se répartit qu'une fois.": REPLI,
  'Une catégorie appartient à un indicateur sensible du catalogue.': REPLI,
  "Une précision accompagne le total du mois d'un indicateur sensible.": REPLI,
  'Une précision accompagne seulement un indicateur sensible.': REPLI,
  "Une répartition accompagne le total du mois d'un indicateur sensible.": REPLI,
  "Une répartition demande de 3 à 6 catégories en cours dans la liste de l'indicateur.": REPLI,
  "Une répartition reprend toutes les catégories en cours de la liste de l'indicateur, et elles seules.":
    REPLI,
  // Le motif d'une déclaration de prénom est fixé par l'interface (T56).
  'Motif inconnu.': REPLI,
  // Codes des fonctions serveur des comptes : seules les Edge Functions les reçoivent et les
  // traduisent (`supabase/functions/_shared/base.ts`, puis MESSAGES_ERREURS_COMPTES).
  adresse_deja_utilisee: REPLI,
  berger_deja_actif: REPLI,
  compte_actif: REPLI,
  compte_desactive: REPLI,
  compte_inconnu: REPLI,
  invitation_deja_acceptee: REPLI,
  ministere_a_deja_un_compte: REPLI,
  ministere_inconnu: REPLI,
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
  'Seul un compte de ministère peut ajouter un événement.': 'acces',
  "Seule l'administration de l'église déclare une session.": 'acces',
  'Seul un compte de ministère indique un prénom.': 'acces',
  'Seul EJP Tech efface un prénom.': 'acces',
  'Seul un compte de ministère peut créer un point.': {},
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
  // Jour d'utilisation noté sans déclaration (forcer_passage, T56) : l'appel est silencieux.
  "Indiquez d'abord votre prénom.": REPLI,
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

/** Ce qu'un écran fait d'une erreur. */
export type ErreurLue =
  /** Aucune réponse (réseau coupé, hors ligne) : l'écran dit sa phrase de connexion. */
  | { genre: 'reseau' }
  /** 10 s dépassées : rien n'est sûr, une création a peut-être abouti. */
  | { genre: 'delai' }
  /** Refus d'accès (42501) : l'écran dit sa propre phrase. */
  | { genre: 'acces' }
  /**
   * Une phrase à dire telle quelle, sous `champ` si l'écran l'a, sinon sous le bouton.
   * `nature` : refus de la base ou d'un contrôle (dire quoi faire), connexion expirée, compte
   * désactivé, ou repli (prévenir EJP Tech si le problème revient).
   */
  | { genre: 'message'; nature: NaturePhrase; message: string; champ: ChampRefus | null }

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

/**
 * Une erreur JavaScript de fetch (réseau coupé, hors ligne) : Chrome, Firefox, Safari, et les
 * erreurs de fetch des clients Supabase (`AuthRetryableFetchError`, `FunctionsFetchError`).
 */
const ERREUR_FETCH = /^(TypeError|\w*FetchError)\b|Failed to fetch|NetworkError|Load failed/

/** Codes de PostgREST d'un jeton refusé, expiré ou absent (401). */
const JETON_REFUSE: ReadonlySet<string> = new Set(['PGRST301', 'PGRST302', 'PGRST303'])

function lireChamp(erreur: object, nom: 'code' | 'message' | 'name'): string | undefined {
  const valeur = (erreur as Record<string, unknown>)[nom]
  return typeof valeur === 'string' ? valeur : undefined
}

function phrase(nature: NaturePhrase, message: string, champ: ChampRefus | null = null): ErreurLue {
  return { genre: 'message', nature, message, champ }
}

/**
 * Ce qu'un écran fait d'une erreur reçue après un appel à la base (`rpc`, `insert`) ou d'une
 * validation Zod de la couche data. Ne rend jamais le texte brut de la base.
 */
export function lireErreurBase(erreur: unknown, options: OptionsLecture = {}): ErreurLue {
  const repli = phrase(
    'repli',
    options.formulaire === false ? MESSAGES_COMMUNS.repliAction : MESSAGES_COMMUNS.repliSaisie,
  )

  // Contrôle de la couche data (schémas partagés avec les formulaires) : sa consigne, sous son
  // champ. Un message par défaut de Zod (en anglais) trahit un contrôle imprévu : le repli.
  if (erreur instanceof z.ZodError) {
    const probleme = erreur.issues[0]
    if (!probleme || MESSAGE_ZOD_PAR_DEFAUT.test(probleme.message)) return repli
    return phrase('refus', probleme.message, champDuChemin(probleme.path))
  }
  if (typeof erreur !== 'object' || erreur === null) return repli

  const code = lireChamp(erreur, 'code')
  const message = lireChamp(erreur, 'message') ?? ''

  if (code === undefined || code === '') {
    if (estDelaiDepasse(erreur)) return { genre: 'delai' }
    // Pas de code : aucune réponse de la base (guide, 10.11), seulement quand fetch a échoué.
    // postgrest-js rend alors `code: ''` ; fetch lève une TypeError ; Auth et les Edge Functions
    // lèvent leur `...FetchError`. Une autre `Error` sans code (« Limites absentes. », bogue) ou un
    // corps que le serveur n'a pas su donner en JSON (passerelle en panne, 502) n'est pas une
    // coupure : réessayer la connexion n'y changerait rien, donc le repli.
    const nom = lireChamp(erreur, 'name') ?? ''
    if (code === '' || ERREUR_FETCH.test(nom) || ERREUR_FETCH.test(message)) {
      return { genre: 'reseau' }
    }
    return repli
  }
  if (JETON_REFUSE.has(code) || /\bJWT\b/.test(message)) {
    return phrase('expiree', MESSAGES_COMMUNS.connexionExpiree)
  }
  if (code === '42501') {
    const trouve = chercher(REFUS_DE_DROIT, MODELES_DROIT, message)
    const entree = trouve?.entree ?? 'acces'
    if (entree === 'expiree') return phrase('expiree', MESSAGES_COMMUNS.connexionExpiree)
    if (entree === 'desactive') return phrase('desactive', MESSAGES_COMMUNS.compteDesactive)
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

/** Phrases propres à un écran, pour les cas que la table ne dit pas. */
export interface PhrasesEcran {
  /** Aucune réponse : la phrase de connexion de l'écran (« Vos chiffres sont encore... »). */
  connexion: string
  /** Refus d'accès ; par défaut, la phrase commune. */
  acces?: string
  /** Une création : après 10 s sans réponse, dire de vérifier la liste avant de réessayer. */
  creation?: boolean
}

/**
 * Phrase unique d'un échec, pour un écran qui la dit sous son bouton (sans placer de champ) :
 * sa phrase de connexion, « peut-être fait » pour une création restée sans réponse, sa phrase
 * d'accès, ou la phrase de la table.
 */
export function phraseErreur(
  erreur: unknown,
  ecran: PhrasesEcran,
  options: OptionsLecture = {},
): string {
  const lue = lireErreurBase(erreur, options)
  switch (lue.genre) {
    case 'reseau':
      return ecran.connexion
    case 'delai':
      return ecran.creation ? MESSAGES_COMMUNS.peutEtreFait : ecran.connexion
    case 'acces':
      return ecran.acces ?? MESSAGES_COMMUNS.acces
    case 'message':
      return lue.message
  }
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
