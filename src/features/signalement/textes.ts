// Textes de « Signaler une difficulté » (T39, question 14 : oui ; docs/conception/aides-
// contextuelles.md, section 7). Statut : « Proposé ». Écrits une fois par W0 pour les lots E3 à E5
// (lien et messages de date refusée) et E8 (formulaire et bloc), qui ne les réécrivent pas.
//
// Qui lit un signalement : le ministère qui l'a écrit et EJP Tech, jamais l'administration de
// l'église, le berger ni le conseil. L'écran ne le dit plus (T66, t149 ; guide, exemple 9) : la
// page Confidentialité le dit.

import type { EcranSignalement } from '@/lib/base'
import { formaterJourCourt, jourDeParis } from '@/lib/metier/dates'
import { accorder, nombre } from '@/lib/metier/texte'

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
  /** Ce qui va se passer, pas qui le fait (guide, exemple 9 ; T66, t154). */
  confirmation: "Signalement envoyé. La réponse s'affichera sur cette page.",
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

// Textes du lot E8 que la section 7 ne donne pas (plan de l'étape 4, E8 : « Proposé », à reporter
// dans `aides-contextuelles.md`) : « Vos derniers signalements » et la clôture par EJP Tech.

/** Longueurs d'un signalement et d'un commentaire de clôture, après `trim` (B7). */
export const LONGUEUR_MIN_SIGNALEMENT = 10
export const LONGUEUR_MAX_SIGNALEMENT = 280

/**
 * Textes de la base (contrat de l'étape 4, section 7 ; B7 ; T43) : les clés de la table de
 * traduction, que l'aperçu simule et que l'écran compare (« déjà clos »). Ils ne s'affichent pas
 * tels quels : avant l'envoi comme après un refus, l'écran dit les textes de `TEXTES_SIGNALEMENT`
 * et de `TEXTES_BLOC_SIGNALEMENTS` (T66 ; `src/data/messagesBase.ts`).
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
} as const

/** « 6 oct. » : jour de Paris d'un horodatage de la base (jamais la date du navigateur). */
export function jourDuSignalement(instant: string): string {
  return formaterJourCourt(jourDeParis(instant))
}

/** « Vos derniers signalements », sous le formulaire du ministère (proposé). */
export const TEXTES_MES_SIGNALEMENTS = {
  titre: 'Vos derniers signalements',
  /** Les trois derniers, du plus récent au plus ancien. */
  nombre: 3,
  ouvert: 'Ouvert',
  clos: (closLe: string) => `Clos le ${jourDuSignalement(closLe)}`,
  /** Devant le commentaire de clôture, s'il y en a un (même mot que le bloc d'EJP Tech, t155). */
  commentaire: 'Réponse :',
  /** « Ajouter un événement, 6 oct. » */
  ligne: (ecran: EcranSignalement, saisiLe: string) =>
    `${LIBELLES_ECRAN[ecran]}, ${jourDuSignalement(saisiLe)}`,
} as const

/** Bloc « Signalements » d'EJP Tech : liste et clôture (BRIEF, « Modération » ; proposé). */
export const TEXTES_BLOC_SIGNALEMENTS = {
  /** À droite du titre : « 2 signalements ouverts ». */
  ouverts: (n: number) =>
    n === 0
      ? 'Aucun signalement ouvert'
      : `${nombre(n)} ${accorder(n, 'signalement ouvert', 'signalements ouverts')}`,
  /** Sous les ouverts : les clôtures des 30 derniers jours (jour de Paris, par la base). */
  titreClos: 'Clos ces 30 derniers jours',
  /** Le bloc se lit à part : la petite flamme et ce texte, dans le bloc (T65). */
  chargement: 'Chargement des signalements',
  /** « Ajouter un événement, 6 oct. », sous le nom du ministère. */
  ligne: (ecran: EcranSignalement, saisiLe: string) =>
    `${LIBELLES_ECRAN[ecran]}, ${jourDuSignalement(saisiLe)}`,
  /** Un signalement clos : « Clos le 8 oct. », puis le commentaire sur la ligne suivante. */
  clos: (closLe: string) => `Clos le ${jourDuSignalement(closLe)}`,
  /** Devant la réponse de clôture d'une ligne close, le même mot que pour le ministère (t364). */
  commentaireClos: 'Réponse :',
  boutonClore: 'Clore le signalement',
  /**
   * La réponse que lira le ministère (t365). La consigne « transmis à l'administration » (T39)
   * n'est plus sous le champ : elle est dans le guide d'EJP Tech, `docs/exploitation.md`
   * (section 11), en attendant la page Aide, qui reste à créer (T66, point 10).
   */
  libelleCommentaire: 'Réponse au ministère (facultatif)',
  noteDefinitive: 'Un signalement clos ne se rouvre pas.',
  /** Le même libellé ouvre le panneau et confirme (T66, point ouvert 9). */
  boutonConfirmer: 'Clore le signalement',
  /** Contrôles avant l'envoi de la réponse (T66, t369 et t370). */
  erreurCommentaireCourt: 'Écrivez au moins 10 caractères, ou laissez la réponse vide.',
  erreurCommentaireLong: 'Raccourcissez la réponse : 280 caractères au plus.',
  boutonEnCours: 'Clôture en cours',
  boutonAnnuler: 'Annuler',
  reussite: 'Signalement clos.',
} as const
