// Textes de « Signaler une difficulté » (T39, question 14 : oui ; docs/conception/aides-
// contextuelles.md, section 7). Statut : « Proposé ». Écrits une fois par W0 pour les lots E3 à E5
// (lien et messages de date refusée) et E8 (formulaire et bloc), qui ne les réécrivent pas.
//
// Qui lit un signalement : le ministère qui l'a écrit et EJP Tech, jamais l'administration de
// l'église, le berger ni le conseil. Tout texte qui le dit emploie `LECTEUR_SIGNALEMENT`.

import type { EcranSignalement } from '@/lib/base'
import { formaterJourCourt, jourDeParis } from '@/lib/metier/dates'
import { accorder, nombre } from '@/lib/metier/texte'

/** La phrase qui dit qui lit le signalement, partout où l'on en parle. */
export const LECTEUR_SIGNALEMENT = 'EJP Tech lit votre signalement.'

export const TEXTES_SIGNALEMENT = {
  lien: 'Signaler une difficulté',
  titre: 'Signaler une difficulté',
  /** Phrase sous le titre du panneau : qui lit, puis ce qu'on demande. */
  phraseTitre: `${LECTEUR_SIGNALEMENT} Décrivez ce qui vous bloque en une ou deux phrases.`,
  /** Ligne de contexte, remplie par l'outil : « Écran concerné : Ajouter un événement ». */
  ligneContexte: (ecran: EcranSignalement) => `Écran concerné : ${LIBELLES_ECRAN[ecran]}`,
  libelleChamp: 'Quelle difficulté rencontrez-vous ?',
  erreurChamp: 'Décrivez la difficulté (10 caractères au moins).',
  boutonEnvoyer: 'Envoyer le signalement',
  boutonEnCours: 'Envoi en cours',
  boutonAnnuler: 'Annuler',
  confirmation: 'Signalement envoyé. EJP Tech le lira.',
  /** Sous le champ date de l'ajout d'un événement, avant le lien « Signaler une difficulté ». */
  dateRefuseeAjout: "Cette date est passée. Choisissez aujourd'hui ou une date à venir.",
  /** Sous le champ date de la mise à jour d'un événement, avant le lien. */
  dateRefuseeMiseAJour: "La nouvelle date doit être aujourd'hui ou plus tard.",
  questionDate: 'Vous ne pouvez pas choisir de date ?',
  /** Ligne identique à l'état actuel, sous le bouton : sans lien. */
  ligneIdentique: "Rien n'a changé : ce statut et cette date sont déjà enregistrés.",
  bloc: {
    titre: 'Signalements',
    sousTitre: 'Difficultés signalées par les ministères',
    /** Situation « tout est fait » : le bloc garde sa place. */
    vide: 'Aucun signalement. Les difficultés signalées par les ministères arriveront ici.',
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

/** Messages de la base, repris tels quels (contrat de l'étape 4, section 7 ; B7 ; T43). */
export const MESSAGES_BASE_SIGNALEMENT = {
  texteCourt: 'Décrivez la difficulté (10 caractères au moins).',
  texteLong: 'Le signalement dépasse 280 caractères.',
  ecran: "Choisissez l'écran concerné dans la liste.",
  donneesPersonnelles: "N'écrivez aucun nom ni information personnelle.",
  crochets: 'Les crochets et « texte masqué » sont réservés à la modération.',
  commentaireCourt: 'Le commentaire fait 10 caractères au moins, ou reste vide.',
  commentaireLong: 'Le commentaire dépasse 280 caractères.',
  dejaClos: 'Ce signalement est déjà clos.',
  /** Refus de droit (42501), commun à toutes les fonctions de l'API. */
  acces: "Cet élément n'existe pas ou vous n'y avez pas accès.",
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
  /** Devant le commentaire de clôture, s'il y en a un. */
  commentaire: "Réponse d'EJP Tech :",
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
  /** « Ajouter un événement, 6 oct. », sous le nom du ministère. */
  ligne: (ecran: EcranSignalement, saisiLe: string) =>
    `${LIBELLES_ECRAN[ecran]}, ${jourDuSignalement(saisiLe)}`,
  /** « Clos le 8 oct. » ; avec le commentaire : « Clos le 8 oct. : ... ». */
  clos: (closLe: string) => `Clos le ${jourDuSignalement(closLe)}`,
  boutonClore: 'Clore le signalement',
  libelleCommentaire: 'Commentaire (facultatif)',
  /** Sous le libellé : ce que dit le commentaire quand EJP Tech a transmis (T39). */
  noteCommentaire:
    "Vous avez transmis ce qui concerne l'administration ? Écrivez « transmis à l'administration ».",
  noteDefinitive: 'Une clôture est définitive.',
  boutonConfirmer: 'Clore définitivement',
  boutonEnCours: 'Clôture en cours',
  boutonAnnuler: 'Annuler',
  reussite: 'Signalement clos.',
} as const
