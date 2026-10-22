// Textes du bloc « À valider » de l'écran Indicateurs (lot L4 ; validation-metier.md, 2.5, 2.6, 5.1
// et 5.4). Français simple, voix active, aucun tiret cadratin. Aucun composant n'écrit un de ces
// textes en dur. Les textes marqués « Proposé » ne sont pas dans le texte de conception : ils
// attendent la validation de la personne responsable.

import { formaterJourCourt, jourDeParis } from '@/lib/metier/dates'
import { accorder, nombre } from '@/lib/metier/texte'

/** Espace insécable : avant les deux-points et dans les guillemets français (BRIEF, « Formats »). */
const NBSP = String.fromCodePoint(0xa0)

/** Au-delà de ce nombre de jours d'attente, la ligne dit « en retard » (validation-metier.md, 2.6). */
export const JOURS_AVANT_RETARD = 7

/** Longueurs du motif d'un refus, comme `valider_indicateur` (10 à 280 caractères après `btrim`). */
export const LONGUEUR_MIN_MOTIF = 10
export const LONGUEUR_MAX_MOTIF = 280

/**
 * Motif trop long, dit avant l'envoi (T66, t344 et m236). Le refus de la base garde son texte
 * (`motifLong`, clé de la table de traduction) jusqu'à la fusion de T62 et T64.
 */
export const MOTIF_TROP_LONG = 'Raccourcissez le motif : 280 caractères au plus.'

/** Messages de la base (`valider_indicateur`), repris tels quels par l'écran. */
export const MESSAGES_BASE_VALIDATION = {
  motifCourt: 'Expliquez le refus (10 caractères au moins).',
  motifLong: 'Le motif dépasse 280 caractères.',
  dejaDecidee: 'Cette demande a déjà été décidée.',
  sortie: "Cette demande a été retirée ou remplacée : il n'y a plus rien à décider.",
  choix: 'Choisissez de valider ou de refuser.',
  correction: "Une correction du nom ne se décide pas encore dans l'outil.",
  acces: "Cet élément n'existe pas ou vous n'y avez pas accès.",
} as const

export const TEXTES_A_VALIDER = {
  titre: 'À valider',
  /** Proposé : sous le titre, pour EJP Tech, qui décide. */
  introEjpTech:
    'Les ministères envoient leurs ajouts ici, du plus ancien au plus récent. Validez ou refusez chacun. Un refus demande un motif que le ministère lira.',
  /** Proposé : sous le titre, pour l'administration, qui lit sans décider. */
  introAdministration:
    'Ces ajouts attendent EJP Tech. Vous les lisez ici : seul EJP Tech les valide ou les refuse.',
  /** État vide : rien n'attend (le titre et l'ancre restent, pour le lien de la Modération). */
  vide: "Rien à valider. Les demandes d'indicateurs des ministères arriveront ici.",
  chargement: 'Chargement des demandes à valider',
  erreur: 'La connexion a échoué. Réessayez.',
  reessayer: 'Réessayer',
  valider: 'Valider',
  refuser: 'Refuser',
  /** Libellé de la ligne « Pourquoi » : lue par EJP Tech seulement. */
  pourquoi: 'Pourquoi',
  /** Mot d'alerte, en orange : jamais la couleur seule. */
  enRetard: 'en retard',
  /** Titre de la liste repliée des décisions (EJP Tech). */
  titreDecidees: 'Décidées ces 30 derniers jours',
  /** Fenêtre « Masquer le texte » (EJP Tech) : ce qu'on masque, sous son titre. Proposé. */
  contexteMasquagePourquoi: 'Indicateur à valider',
  contexteMasquageMotif: 'Indicateur refusé',
  /** Nom du champ du motif de refus, dans la fenêtre « Masquer le texte ». */
  motifDuRefus: 'Motif du refus',
  /**
   * Titre de la liste repliée des retraits faits par les ministères (EJP Tech, T62). Proposé.
   */
  titreRetraits: 'Retirés par les ministères ces 30 derniers jours',
  /** Fenêtre « Masquer le texte » du motif d'un retrait : ce qu'on masque. Proposé. */
  contexteMasquageRetrait: 'Indicateur retiré par son ministère',
  /** Nom du champ du motif d'un retrait, dans la fenêtre « Masquer le texte ». */
  motifDuRetrait: 'Motif du retrait',
  /**
   * Fenêtre « Masquer le texte » du « Pourquoi » d'une demande retirée par son ministère avant la
   * décision : elle a quitté la file, son « Pourquoi » se masque ici (T62). Proposé.
   */
  contexteMasquagePourquoiRetire: 'Demande retirée par son ministère',
  /** Annonces après une décision (m231, Proposé : la fenêtre a déjà dit qui lira le motif). */
  reussiteValide: 'Indicateur validé.',
  reussiteRefus: 'Indicateur refusé.',
  /** « Valider » pendant l'envoi (m231, Proposé). */
  validationEnCours: 'Validation en cours',
} as const

/** « 2 ajouts en attente », « Aucun ajout en attente » : à droite du titre du bloc. */
export function texteNombreEnAttente(n: number): string {
  if (n === 0) return 'Aucun ajout en attente'
  return `${nombre(n)} ${accorder(n, 'ajout en attente', 'ajouts en attente')}`
}

/** « Envoyé le 2 oct. » : le jour de Paris de l'envoi (jamais la date du navigateur). */
export function texteEnvoyeLe(instant: string): string {
  return `Envoyé le ${formaterJourCourt(jourDeParis(instant))}`
}

/** « depuis 3 jours », « depuis aujourd'hui » : l'attente, comptée par la base à l'heure de Paris. */
export function texteAttente(jours: number): string {
  if (jours <= 0) return "depuis aujourd'hui"
  return `depuis ${nombre(jours)} ${accorder(jours, 'jour', 'jours')}`
}

/** Plus de 7 jours d'attente : « en retard ». */
export function estEnRetard(jours: number | null): boolean {
  return jours !== null && jours > JOURS_AVANT_RETARD
}

/** « 2 valeurs déjà saisies » : EJP Tech seulement, le nombre de périodes, jamais une valeur. */
export function texteValeursSaisies(n: number): string {
  return `${nombre(n)} ${accorder(n, 'valeur déjà saisie', 'valeurs déjà saisies')}`
}

/** « Nouvel indicateur : « Demandes reçues » (chaque mois) » : ce que le ministère a envoyé. */
export function texteNouvelIndicateur(libelle: string, rythme: string): string {
  return `Nouvel indicateur${NBSP}: «${NBSP}${libelle}${NBSP}» (${rythme})`
}

/** Titre de la fenêtre « Refuser » : « Refuser « Demandes reçues » ? ». */
export function titreRefus(libelle: string): string {
  return `Refuser «${NBSP}${libelle}${NBSP}» ?`
}

/**
 * Nom accessible d'un bouton de décision : « Valider « Demandes reçues » de Kumi ». Il commence par
 * le texte visible du bouton (« Valider »), et dit sur quelle ligne il agit.
 */
export function nomBoutonDecision(
  action: 'valider' | 'refuser',
  libelle: string,
  ministere: string,
): string {
  return `${TEXTES_A_VALIDER[action]} «${NBSP}${libelle}${NBSP}» de ${ministere}`
}

export const TEXTES_FENETRE_REFUS = {
  libelleChamp: 'Pourquoi ce refus ?',
  /** Rappel sous le champ : EJP Tech écrit un texte libre que le ministère lira. */
  rappel: "N'écrivez aucun nom ni information personnelle.",
  annuler: 'Annuler',
  bouton: 'Refuser',
  /** m231, Proposé : le nom de l'action, suivi de « en cours ». */
  boutonEnCours: 'Refus en cours',
  /** « L'indicateur sera retiré : ses valeurs ne s'afficheront plus. Communication lira ce motif. » */
  consequence: (ministere: string) =>
    `L'indicateur sera retiré : ses valeurs ne s'afficheront plus. ${ministere} lira ce motif.`,
} as const

/** Une décision de la liste repliée : « Validée le 8 oct. », « Refusée le 8 oct. ». */
export function texteDecision(decision: 'valide' | 'refuse', instant: string): string {
  const jour = formaterJourCourt(jourDeParis(instant))
  return decision === 'valide' ? `Validée le ${jour}` : `Refusée le ${jour}`
}

/**
 * Un retrait par un ministère (T62), dans la liste repliée : « Demande retirée le 14 oct. » pour un
 * ajout encore à valider, « Retiré le 14 oct. » pour un ajout validé. Le motif suit, en citation.
 */
export function texteRetraitMinistere(demande: boolean, instant: string): string {
  const jour = formaterJourCourt(jourDeParis(instant))
  return demande ? `Demande retirée le ${jour}` : `Retiré le ${jour}`
}
