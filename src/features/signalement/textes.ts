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
  /** Refus de droit (42501) : la forme commune d'un élément introuvable (guide 10.10). */
  acces: 'Cet élément est introuvable. Rechargez la page.',
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
   * Sous le champ date de la mise à jour d'un événement, avant le lien. Le texte commun (t140)
   * attend la fusion des lots qui tiennent la table de traduction : la table dit ce texte tel
   * quel, et le contrôle avant l'envoi doit dire le même (guide 10.9).
   */
  dateRefuseeMiseAJour: "La nouvelle date doit être aujourd'hui ou plus tard.",
  questionDate: 'Vous ne pouvez pas choisir de date ?',
  /**
   * Ligne identique à l'état actuel, sous le bouton, sans lien : dite avant l'envoi, et par la
   * table de traduction si la base la refuse (formule « déjà enregistré », m134, proposé).
   */
  ligneIdentique: "Ce statut et cette date sont déjà enregistrés. Changez l'un des deux.",
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

/**
 * Textes de la base (contrat de l'étape 4, section 7 ; B7 ; T43) : les clés de la table de
 * traduction, que l'aperçu simule et que l'écran compare (« déjà clos »). Avant l'envoi, l'écran
 * dit les textes de `TEXTES_SIGNALEMENT` (T66) ; la table les reprendra avec la fusion des lots
 * qui la tiennent.
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
  /** « Ajouter un événement, 6 oct. », sous le nom du ministère. */
  ligne: (ecran: EcranSignalement, saisiLe: string) =>
    `${LIBELLES_ECRAN[ecran]}, ${jourDuSignalement(saisiLe)}`,
  /** Un signalement clos : « Clos le 8 oct. », puis le commentaire sur la ligne suivante. */
  clos: (closLe: string) => `Clos le ${jourDuSignalement(closLe)}`,
  /** Devant le commentaire de clôture d'une ligne close. */
  commentaireClos: 'Commentaire :',
  /** Sans ouvert, quand des clos suivent : le titre dit déjà « aucun ouvert ». */
  videAvecClos: 'Aucun signalement ouvert. Les prochains arriveront ici.',
  boutonClore: 'Clore le signalement',
  libelleCommentaire: 'Commentaire (facultatif)',
  /** Sous le libellé : ce que dit le commentaire quand EJP Tech a transmis, et qui le lit (T39). */
  noteCommentaire:
    "Vous avez transmis ce qui concerne l'administration ? Écrivez « transmis à l'administration ». Le ministère lira ce commentaire.",
  noteDefinitive: 'Une clôture est définitive.',
  boutonConfirmer: 'Clore définitivement',
  boutonEnCours: 'Clôture en cours',
  boutonAnnuler: 'Annuler',
  reussite: 'Signalement clos.',
} as const
