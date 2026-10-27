// Textes de « Signaler une difficulté » (T39, question 14 : oui ; docs/conception/aides-
// contextuelles.md, section 7). Statut : « Proposé ». Écrits une fois par W0 pour les lots E3 à E5
// (lien et messages de date refusée) et E8 (formulaire et bloc), qui ne les réécrivent pas.
//
// Qui lit un signalement : le ministère qui l'a écrit et EJP Tech, jamais l'administration de
// l'église, le berger ni le conseil. L'écran ne le dit plus (T66, t149 ; guide, exemple 9) : la
// page Confidentialité le dit.

import type { EcranSignalement } from '@/lib/base'
import { formaterJourCourt, jourDeParis } from '@/lib/metier/dates'
import { accorder, nombre, terminerPhrase } from '@/lib/metier/texte'

/** Un même texte de date passée (guide 10.10 ; T66, t140). */
const DATE_PASSEE = "Cette date est passée. Choisissez aujourd'hui ou une date à venir."

export const TEXTES_SIGNALEMENT = {
  lien: 'Signaler une difficulté',
  titre: 'Signaler une difficulté',
  /** Ligne de contexte, remplie par l'outil : « Écran concerné : Ajouter un événement ». */
  ligneContexte: (ecran: EcranSignalement) => `Écran concerné : ${LIBELLES_ECRAN[ecran]}`,
  libelleChamp: 'Quelle difficulté rencontrez-vous ?',
  erreurChamp: 'Décrivez la difficulté (10 caractères au moins).',
  /** Contrôles avant l'envoi, dans la forme commune (T66, t150, t151 et t153). */
  erreurLong: 'Raccourcissez le signalement : 280 caractères au plus.',
  erreurEcran: "Ouvrez « Signaler une difficulté » depuis l'écran concerné.",
  erreurCrochets: 'Retirez de votre texte les crochets [ ] et les mots « texte masqué ».',
  boutonEnvoyer: 'Envoyer le signalement',
  boutonEnCours: 'Envoi en cours',
  boutonAnnuler: 'Annuler',
  /** Même bouton une fois le signalement envoyé : il n'y a plus rien à annuler (proposé, E8). */
  boutonFermer: 'Fermer',
  /** Où suivre la réponse (T77) : « Mes signalements », par le lien sous le formulaire. */
  confirmation: "Signalement envoyé. Suivez la réponse d'EJP Tech dans « Mes signalements ».",
  /** Sous le formulaire, à la place de « Vos derniers signalements » (T77). */
  lienSuivi: 'Voir mes signalements',
  /** Sous le champ date de l'ajout d'un événement, avant le lien « Signaler une difficulté ». */
  dateRefuseeAjout: DATE_PASSEE,
  /**
   * Sous le champ date de la mise à jour d'un événement, avant le lien : le texte commun de la
   * date passée (T66, t140 et m125), le même que la table de traduction donne au refus de la base
   * (guide 10.9).
   */
  dateRefuseeMiseAJour: DATE_PASSEE,
  questionDate: 'Vous ne pouvez pas choisir de date ?',
  /**
   * Ligne identique à l'état actuel, sous le bouton, sans lien : dite avant l'envoi, et par la
   * table de traduction si la base la refuse (formule « déjà enregistré », m134, proposé).
   */
  ligneIdentique: "Ce statut et cette date sont déjà enregistrés. Changez l'un des deux.",
  bloc: {
    titre: 'Signalements',
    /** Situation « tout est fait » : le bloc garde sa place (T66, t362). */
    vide: 'Aucun signalement.',
  },
} as const

/** Nom de l'écran d'origine, tel qu'il s'écrit dans « Écran concerné : ... ». */
export const LIBELLES_ECRAN: Readonly<Record<EcranSignalement, string>> = {
  saisie_dimanche: 'Chiffres du dimanche',
  saisie_mois: 'Chiffres du mois',
  saisie_session: 'Présence à une session',
  saisie_fij: 'Carte des FIJ',
  saisie_fij_statistiques: 'Chiffres par département',
  saisie_evenement: 'Ajouter un événement',
  saisie_reunion: 'Prochaine réunion',
  autre: 'Autre écran',
}

// Textes du lot E8 que la section 7 ne donne pas, puis ceux du suivi (T77 ; conception du
// 26 octobre 2026, section 3). Statut : « Proposé », reportés dans `aides-contextuelles.md`,
// section 7. Aucun texte ne parle d'un courriel : la réponse se lit dans l'outil (« Mes
// signalements », le bandeau de « Ma semaine »). Les dates viennent de la base (jour de Paris).

/** Longueurs d'un signalement et d'une réponse, après `trim` (B7, T77). */
export const LONGUEUR_MIN_SIGNALEMENT = 10
export const LONGUEUR_MAX_SIGNALEMENT = 280

/**
 * Textes de la base (contrat de l'étape 4, section 7 ; B7 ; T43 ; T77) : les clés de la table de
 * traduction, que l'aperçu simule et que l'écran compare (« déjà clos »). Ils ne s'affichent pas
 * tels quels : l'écran dit les phrases de `src/data/messagesBase.ts` (T66).
 */
export const MESSAGES_BASE_SIGNALEMENT = {
  texteCourt: 'Décrivez la difficulté (10 caractères au moins).',
  texteLong: 'Le signalement dépasse 280 caractères.',
  ecran: "Choisissez l'écran concerné dans la liste.",
  donneesPersonnelles: "N'écrivez aucun nom ni information personnelle.",
  crochets: 'Les crochets et « texte masqué » sont réservés à la modération.',
  commentaireCourt: 'Le commentaire fait 10 caractères au moins, ou reste vide.',
  commentaireLong: 'Le commentaire dépasse 280 caractères.',
  dejaClos: 'Ce signalement est déjà clos.',
  // Suivi (T77)
  dejaPrisEnCharge: 'Ce signalement est déjà pris en charge.',
  attendLeMinistere: 'Ce signalement attend le retour du ministère.',
  nAttendPas: "Ce signalement n'attend pas votre réponse.",
  sansCompteActif: "Ce ministère n'a plus de compte actif.",
  reponseCourte: 'Écrivez votre réponse (10 caractères au moins).',
  reponseLongue: 'La réponse dépasse 280 caractères.',
} as const

/** « 6 oct. » : jour de Paris d'un horodatage de la base (jamais la date du navigateur). */
export function jourDuSignalement(instant: string): string {
  return formaterJourCourt(jourDeParis(instant))
}

/** « 3 nov. » : une date de la base déjà au jour de Paris (AAAA-MM-JJ). */
export function jourDeLaBase(date: string): string {
  return formaterJourCourt(date)
}

/** « Ajouter un événement, 26 oct. » : l'écran d'origine et le jour de l'envoi. */
export function ligneSignalement(ecran: EcranSignalement, saisiLe: string): string {
  return `${LIBELLES_ECRAN[ecran]}, ${jourDuSignalement(saisiLe)}`
}

/** Contrôles d'une réponse avant l'envoi (T77), les mêmes pour EJP Tech et pour le ministère. */
export const TEXTES_REPONSE = {
  erreurCourt: 'Écrivez au moins 10 caractères.',
  erreurLong: 'Raccourcissez la réponse : 280 caractères au plus.',
  boutonEnvoyer: 'Envoyer la réponse',
  boutonEnCours: 'Envoi en cours',
  boutonAnnuler: 'Annuler',
  /** Un geste en un clic sans réponse de la base (réseau coupé). */
  echecEnvoi: "L'envoi n'a pas abouti. Réessayez.",
} as const

/** Étiquette d'un statut : du texte, jamais une couleur seule. */
export const LIBELLES_STATUT = {
  recu: 'Reçu',
  en_cours: 'En cours',
  repondu: 'Répondu',
  clos: 'Clos',
} as const

/** Page « Mes signalements » du ministère (`/signalements`, T77). */
export const TEXTES_SUIVI = {
  titre: 'Mes signalements',
  chargement: 'Chargement de vos signalements',
  vide: 'Aucun signalement. En cas de difficulté sur un formulaire de saisie, utilisez le lien « Signaler une difficulté » en bas du formulaire.',
  aucunOuvert: 'Aucun signalement ouvert.',
  groupeAVerifier: 'À vérifier',
  groupeEnCours: 'En cours',
  groupeClos: 'Clos ces 30 derniers jours',
  /** Nom de la liste datée de chaque signalement. */
  suivi: 'Suivi',
  // Ligne d'état, selon le statut.
  // Une date abrégée en fin de phrase garde un seul point (« le 27 oct. », jamais « oct.. »).
  recu: (jour: string) => terminerPhrase(`EJP Tech a reçu votre signalement le ${jour}`),
  enCours: (jour: string) => terminerPhrase(`EJP Tech s'en occupe depuis le ${jour}`),
  enCoursApresReponse: (jour: string) =>
    `${terminerPhrase(`Vous avez répondu le ${jour}`)} EJP Tech reprend votre signalement.`,
  repondu: (jour: string) => terminerPhrase(`EJP Tech vous a répondu le ${jour}`),
  closConfirme: (jour: string) => terminerPhrase(`Vous avez confirmé que c'est réglé le ${jour}`),
  closSansRetour: (jour: string) =>
    `Clos le ${jour}, sans retour de votre part. Si la difficulté revient, faites un nouveau signalement.`,
  closEjpTech: (jour: string) => terminerPhrase(`Clos par EJP Tech le ${jour}`),
  /** Devant la réponse de clôture d'EJP Tech (le même mot que le bloc d'EJP Tech, t155). */
  reponse: 'Réponse :',
  question: 'Est-ce réglé ?',
  delai: (jour: string) => terminerPhrase(`Vous pouvez répondre jusqu'au ${jour}`),
  boutonOui: "Oui, c'est réglé",
  boutonRepondre: 'Répondre à EJP Tech',
  libelleReponse: 'Votre réponse à EJP Tech',
  aideReponse: 'Répondez à sa question, ou dites ce qui ne va toujours pas.',
  reussiteRegle: 'Merci. Le signalement est clos.',
  reussiteReponse: 'Réponse envoyée. EJP Tech reprend votre signalement.',
  // Suivi daté, une ligne par étape.
  etapeEnvoi: 'Signalement envoyé',
  etapeEnCours: 'Pris en charge par EJP Tech',
  etapeReponse: "Réponse d'EJP Tech :",
  etapeReponseMinistere: 'Votre réponse :',
  etapeRegle: "Vous avez confirmé que c'est réglé",
  etapeAutomatique: 'Clos, sans retour de votre part',
  etapeClos: 'Clos par EJP Tech',
} as const

/** « Ma semaine » du ministère : le bandeau d'une réponse, ou la ligne discrète (T77). */
export const TEXTES_SUIVI_SEMAINE = {
  bandeauUn: (jour: string) =>
    `${terminerPhrase(`EJP Tech a répondu à votre signalement du ${jour}`)} Dites-nous si c'est réglé.`,
  bandeauPlusieurs: (n: number) =>
    `EJP Tech a répondu à ${nombre(n)} de vos signalements. Dites-nous si c'est réglé.`,
  lienBandeau: 'Voir la réponse',
  ligne: (n: number) =>
    `${nombre(n)} ${accorder(n, 'signalement suivi', 'signalements suivis')} par EJP Tech.`,
  lienLigne: 'Voir le suivi',
} as const

/** L'âge d'un statut, lu dans la base (`jours_depuis`) : « aujourd'hui », « hier », « il y a 9 jours ». */
function avecAge(debut: string, jours: number, jour: string): string {
  if (jours <= 0) return `${debut} aujourd'hui.`
  if (jours === 1) return `${debut} hier.`
  return `${debut} le ${jour}, il y a ${nombre(jours)} jours.`
}

/** Bloc « Signalements » d'EJP Tech, sur Modération (BRIEF, « Modération » ; T77). */
export const TEXTES_BLOC_SIGNALEMENTS = {
  /** À droite du titre : ce qui attend un geste d'EJP Tech (Reçu et En cours). */
  aTraiter: (n: number) =>
    n === 0
      ? 'Aucun signalement à traiter'
      : `${nombre(n)} ${accorder(n, 'signalement à traiter', 'signalements à traiter')}`,
  groupeATraiter: 'À traiter',
  groupeAttente: 'En attente du ministère',
  /** Les clôtures des 30 derniers jours (jour de Paris, par la base). */
  titreClos: 'Clos ces 30 derniers jours',
  /** Le bloc se lit à part : la petite flamme et ce texte, dans le bloc (T65). */
  chargement: 'Chargement des signalements',
  // Ligne d'état, selon le statut.
  recu: (jours: number, jour: string) => avecAge('Reçu', jours, jour),
  enCours: (jours: number, jour: string) => avecAge('Pris en charge', jours, jour),
  reponseMinistere: (jours: number, jour: string) => avecAge('Le ministère a répondu', jours, jour),
  sansCompte: "Ce ministère n'a plus de compte actif.",
  repondu: (jour: string, limite: string) =>
    `${terminerPhrase(`Réponse envoyée le ${jour}`)} ${terminerPhrase(`Le ministère peut répondre jusqu'au ${limite}`)}`,
  closConfirme: (jour: string) => terminerPhrase(`Confirmé par le ministère le ${jour}`),
  closSansRetour: (jour: string) => `Clos le ${jour}, sans retour du ministère.`,
  closEjpTech: (jour: string) => terminerPhrase(`Clos par EJP Tech le ${jour}`),
  // Suivi daté, côté EJP Tech.
  etapeReponseMinistere: 'Réponse du ministère :',
  etapeRegle: 'Confirmé par le ministère',
  etapeAutomatique: 'Clos, sans retour du ministère',
  // Gestes.
  boutonPrendre: 'Prendre en charge',
  boutonPrendreEnCours: 'Enregistrement en cours',
  boutonRepondre: 'Répondre au ministère',
  libelleReponse: (ministere: string) => `Votre réponse à ${ministere}`,
  aideReponse: 'Posez une question, ou dites ce que vous avez fait.',
  noteReponse: (ministere: string) => `${ministere} lit votre réponse dans Pilotage EJP.`,
  boutonClore: 'Clore le signalement',
  /** La réponse que lira le ministère, obligatoire (T77 ; la consigne est dans le guide, 11). */
  libelleCommentaire: 'Réponse au ministère',
  noteCloture:
    'Le ministère lit cette réponse dans « Mes signalements ». Un signalement clos ne se rouvre pas.',
  /** Le même libellé ouvre le panneau et confirme (T66, point ouvert 9). */
  boutonConfirmer: 'Clore le signalement',
  boutonClotureEnCours: 'Enregistrement en cours',
  boutonMasquer: 'Masquer',
  reussitePrise: 'Signalement pris en charge.',
  reussiteReponse: 'Réponse envoyée.',
  reussite: 'Signalement clos.',
} as const
