// Textes de l'écran « Mes indicateurs » (`/ma-fiche/indicateurs`, lot L4 ; configuration-
// indicateurs.md, 7.3 et 7.7 ; validation-metier.md, 2.5, 5.2 et 5.4). Français simple, voix
// active, aucun tiret cadratin. Aucun composant n'écrit un de ces textes en dur. Les textes marqués
// « Proposé » ne sont pas dans le texte de conception : ils attendent la validation de la personne
// responsable.

import type { LimitesIndicateurs, MotifRetrait, NatureIndicateur } from '@/lib/base'
import { accorder, listeNoms, nombre, terminerPhrase } from '@/lib/metier/texte'

/** Espace insécable : dans les guillemets français (BRIEF, « Formats »). */
const NBSP = String.fromCodePoint(0xa0)

/** « Pourquoi cet indicateur ? » : de 10 à 280 caractères après `btrim` (T30). */
export const LONGUEUR_MIN_POURQUOI = 10
export const LONGUEUR_MAX_POURQUOI = 280

/**
 * Contrôles du « Pourquoi », avant l'envoi : les mêmes phrases que la table de traduction donne
 * aux refus de `ajouter_suggestion` (m233, proposé ; `src/data/messagesBase.ts`).
 */
export const MESSAGES_BASE_SUGGESTION = {
  pourquoiCourt: 'Expliquez pourquoi (10 caractères au moins).',
  pourquoiLong: 'Raccourcissez ce texte : 280 caractères au plus.',
  inexistante: 'Cet indicateur prévu est introuvable. Rechargez la page.',
  acces: "Cet élément n'existe pas ou vous n'y avez pas accès.",
} as const

export const TEXTES_MES_INDICATEURS = {
  surtitre: 'Votre ministère',
  titreRetour: 'Retour à ma fiche',
  ajouter: 'Ajouter un indicateur',
  erreur: 'La connexion a échoué. Réessayez.',
  reessayer: 'Réessayer',
  chargement: 'Chargement',
  /** État vide : aucun indicateur suivi (LISEZMOI, « États »). */
  aucunIndicateur:
    "Votre ministère n'a pas encore d'indicateur à lui. Les STARs au service, actifs et en FIJ se saisissent déjà chaque dimanche.",
  /** Le suffixe de l'état vide : ce qu'on peut faire. Proposé. */
  aucunIndicateurSuite: 'Ajoutez une suggestion pour suivre un chiffre de plus.',
  titreRetires: 'Retirés',
  aucunRetire: 'Aucun indicateur retiré.',
  /** Mention d'un calcul, qui ne se saisit pas (comme l'écran de l'administration). */
  calculSansSaisie: 'Se calcule tout seul',
  jamaisSaisi: 'Jamais saisi',
  /** Sections par rythme (comme la fiche) et calculs. */
  titreCalculs: 'Calculs',
} as const

/** Le panneau « Ajouter un indicateur » (7.3, parcours d'ajout, lot 1). */
export const TEXTES_PANNEAU_AJOUT = {
  titre: 'Ajouter un indicateur',
  titreSuggestions: 'Suggestions',
  /** Proposé : sous le titre des suggestions. */
  introSuggestions:
    "Choisissez l'indicateur que vous voulez suivre. EJP Tech vérifie chaque ajout avant qu'il compte dans les totaux.",
  choisir: 'Choisir',
  /** Toutes les suggestions sont déjà sur la fiche (LISEZMOI, « États »). */
  toutesDejaLa: 'Toutes les suggestions sont déjà sur votre fiche.',
  /** Au lot 1, sous la liste : le chiffre qui manque se demande à EJP Tech (T59). */
  rienNeConvient: 'Rien ne convient ? Demandez un indicateur à EJP Tech.',
  libellePourquoi: 'Pourquoi cet indicateur ?',
  /** Sous le champ, pas de rappel sur les données personnelles (exception T30). */
  phraseVerification: 'EJP Tech vérifie chaque ajout. En attendant, vous pouvez déjà le saisir.',
  envoyer: 'Envoyer pour validation',
  envoiEnCours: 'Envoi en cours',
  autreSuggestion: 'Choisir une autre suggestion',
  fermer: 'Fermer',
  retour: 'Retour',
} as const

/**
 * Une limite atteinte, avec ce qu'il faut faire : le texte de la base et de la conception (4.2).
 * Depuis T62, le ministère retire lui-même un de ses ajouts (« Retirer » sur la ligne).
 */
export function explicationLimiteAjouts(limites: LimitesIndicateurs): string {
  return `Votre ministère a déjà ${nombre(limites.ajouts_max)} indicateurs à lui. Retirez-en un pour en ajouter un autre.`
}

export function explicationLimiteLignes(limites: LimitesIndicateurs): string {
  return `Votre fiche compte déjà ${nombre(limites.lignes_max)} indicateurs. Demandez à EJP Tech d'en retirer un.`
}

/** Rythme dans une phrase : « chaque dimanche », « chaque mois », « à ce jour ». */
export function rythmeEnPhrase(nature: NatureIndicateur): string {
  switch (nature) {
    case 'dimanche':
      return 'chaque dimanche'
    case 'mois':
      return 'chaque mois'
    case 'a_ce_jour':
      return 'à ce jour'
  }
}

/** Où se saisit l'indicateur : « vos chiffres du mois » ou « le formulaire du dimanche ». */
function ouSeSaisit(nature: NatureIndicateur): string {
  return nature === 'mois' ? 'vos chiffres du mois' : 'le formulaire du dimanche'
}

/**
 * Message après l'envoi, selon le rythme (7.3) : « « Demandes reçues » envoyé pour validation :
 * vous pouvez déjà le saisir dans vos chiffres du mois. », ou « ... dans le formulaire du
 * dimanche. » (un indicateur du dimanche ou « à ce jour » se saisit avec les chiffres du dimanche).
 */
export function reussiteSuggestion(libelle: string, nature: NatureIndicateur): string {
  return `«${NBSP}${libelle}${NBSP}» envoyé pour validation : vous pouvez déjà le saisir dans ${ouSeSaisit(nature)}.`
}

/** Nom accessible de « Choisir » : « Choisir « Demandes reçues » ». Il commence par le texte visible. */
export function nomBoutonChoisir(libelle: string): string {
  return `${TEXTES_PANNEAU_AJOUT.choisir} «${NBSP}${libelle}${NBSP}»`
}

/** « Ajoutée par vous le 12 oct. » et ses variantes, selon l'origine de la ligne. */
export const MENTIONS_ORIGINE = {
  prevu: 'Prévu par la coordination',
  suggestionEglise: 'Suggestion de la coordination',
  ajoutEglise: "Ajouté par l'administration de l'église ou EJP Tech",
  suggestionMinistere: (jour: string) => `Suggestion ajoutée par vous le ${jour}`,
  ajoutMinistere: (jour: string) => `Ajouté par vous le ${jour}`,
} as const

/**
 * « À valider par EJP Tech depuis 2 jours. » : l'état d'un ajout qui attend, en gras orange avec le
 * mot (7.3). La suite, `SUITE_EN_ATTENTE`, est dite à part, en texte normal.
 */
export function texteEnAttente(jours: number | null): string {
  const depuis =
    jours === null
      ? ''
      : jours <= 0
        ? " depuis aujourd'hui"
        : ` depuis ${nombre(jours)} ${accorder(jours, 'jour', 'jours')}`
  return `À valider par EJP Tech${depuis}.`
}

/**
 * Ce que le ministère peut faire pendant l'attente : la phrase déjà dite sur la fiche et dans la
 * saisie (« Vous pouvez déjà le saisir. »), sans la mécanique interne (qui voit quoi) de
 * configuration-indicateurs.md, 7.3. Proposé.
 */
export const SUITE_EN_ATTENTE = 'Vous pouvez déjà le saisir.'

/** « Dernière saisie le 2 oct. » : le jour de Paris, la valeur n'est jamais lue ici. */
export function texteDerniereSaisie(jour: string): string {
  return `Dernière saisie le ${jour}`
}

/** « Refusé le 8 oct. : « motif ». » : le motif suit, en citation, sur sa propre ligne de texte. */
export function debutRefus(jour: string | null): string {
  return jour === null ? 'Refusé' : `Refusé le ${jour}`
}

/** Motifs de retrait (liste fermée de la base), dits au ministère. */
const MOTIFS_RETRAIT: Readonly<Record<MotifRetrait, string>> = {
  plus_suivi: "n'est plus suivi",
  doublon: 'doublon',
  erreur: 'créé par erreur',
  se_calcule: "se calcule à partir d'autres chiffres",
  deja_commun: 'déjà compté par un chiffre commun',
  domaine_sensible: 'domaine sensible',
  hors_regles: "hors des règles de l'outil",
  remplace: 'remplacé',
  confidentialite: 'confidentialité',
  source_retiree: 'sa source est retirée',
  refuse: 'refusé',
  /** Sans le motif écrit (illisible) : le retrait du ministère lui-même (T62). */
  ministere: 'à votre demande',
}

/** « Retiré le 3 oct. : doublon. » (un refus a sa propre phrase, avec le motif d'EJP Tech). */
export function texteRetrait(jour: string | null, motif: MotifRetrait | null): string {
  const quand = jour === null ? '' : ` le ${jour}`
  const pourquoi = motif === null ? '' : ` : ${MOTIFS_RETRAIT[motif]}`
  return terminerPhrase(`Retiré${quand}${pourquoi}`)
}

/**
 * « Retiré par vous le 14 oct. », « Demande retirée par vous le 14 oct. » : un retrait du
 * ministère (T62) ; son motif suit, en citation, comme celui d'un refus.
 */
export function debutRetraitParVous(jour: string | null, demande: boolean): string {
  const quand = jour === null ? '' : ` le ${jour}`
  return demande ? `Demande retirée par vous${quand}` : `Retiré par vous${quand}`
}

/** Motif du retrait d'un ajout (T62) : 10 à 280 caractères après `btrim`, comme la base. */
export const LONGUEUR_MIN_MOTIF_RETRAIT = 10
export const LONGUEUR_MAX_MOTIF_RETRAIT = 280

/** Messages de la base (`retirer_mon_indicateur`), repris tels quels avant l'envoi. */
export const MESSAGES_BASE_RETRAIT = {
  motifCourt: 'Expliquez pourquoi vous le retirez (10 caractères au moins).',
  motifLong: 'Le motif dépasse 280 caractères.',
} as const

/**
 * « Retirer la demande » (ajout à valider) et « Retirer » (ajout validé) de « Mes indicateurs »
 * (T62 ; configuration-indicateurs.md, 7.3 ; validation-metier.md, 5.2). Les textes marqués
 * « Proposé » attendent la validation de la personne responsable.
 */
export const TEXTES_RETRAIT = {
  retirerDemande: 'Retirer la demande',
  retirer: 'Retirer',
  libelleChamp: 'Pourquoi le retirer ?',
  /** Rappel sous le premier champ libre du formulaire (CLAUDE.md). */
  rappel: "N'écrivez aucun nom ni information personnelle.",
  annuler: 'Annuler',
  /** Le nom de l'action, suivi de « en cours » (m231). */
  enCours: 'Retrait en cours',
  /** Proposé : ce qui arrive à une demande à valider, avant de confirmer. */
  consequenceDemande:
    "EJP Tech n'aura plus à le valider et il ne sera plus proposé à la saisie. Vos saisies restent enregistrées.",
  /** Proposé : ce qui arrive à un ajout validé, avant de confirmer. */
  consequenceAjout: 'Il ne sera plus proposé à la saisie. Vos saisies restent enregistrées.',
  /** Proposé : qui lit le motif (T62 : le retrait apparaît chez EJP Tech). */
  lecteurMotif: 'EJP Tech lira votre motif.',
} as const

/** Titre de la fenêtre : « Retirer la demande « Projets en cours » ? », « Retirer « Demandes reçues » ? ». */
export function titreRetrait(libelle: string, demande: boolean): string {
  const action = demande ? TEXTES_RETRAIT.retirerDemande : TEXTES_RETRAIT.retirer
  return `${action} «${NBSP}${libelle}${NBSP}» ?`
}

/** Nom accessible du bouton d'une ligne : il commence par le texte visible et nomme l'indicateur. */
export function nomBoutonRetrait(libelle: string, demande: boolean): string {
  const action = demande ? TEXTES_RETRAIT.retirerDemande : TEXTES_RETRAIT.retirer
  return `${action} «${NBSP}${libelle}${NBSP}»`
}

/** Proposé : l'annonce après un retrait réussi. */
export function reussiteRetrait(libelle: string, demande: boolean): string {
  return demande
    ? `Demande «${NBSP}${libelle}${NBSP}» retirée.`
    : `«${NBSP}${libelle}${NBSP}» retiré.`
}

/**
 * À la place de « Retirer » sur la source d'un calcul : le texte de la base et de la conception
 * (configuration-indicateurs.md, 4.2), avec le contact EJP Tech (T60).
 */
export function texteSourceDeCalcul(calcul: string): string {
  return `Ce chiffre sert au calcul «${NBSP}${calcul}${NBSP}» : demandez à EJP Tech de le retirer.`
}

export interface ComptesMesIndicateurs {
  nom: string
  /** Indicateurs suivis : actifs ou à valider, calculs compris. */
  suivis: number
  /** Dont les prévus de la coordination. */
  prevus: number
  /** Dont ajoutés par le ministère, suggestions comprises. */
  ajoutesParVous: number
  /** Dont ajoutés par l'administration de l'église ou EJP Tech, hors prévus. */
  ajoutesParLEglise: number
  /** Ajouts encore permis (3 moins les ajouts du ministère), ou null si la limite n'est pas lue. */
  ajoutsRestants: number | null
  /** Ajouts permis au ministère (3, `limites_indicateurs.ajouts_max`) ; sans effet si la limite n'est pas lue. */
  ajoutsMax: number
}

/**
 * La phrase de l'écran (7.3) : « Communication suit 7 indicateurs : 5 prévus par la coordination
 * et 2 ajoutés par vous. Vous pouvez en ajouter 1 autre. ». `null` quand rien n'est suivi : l'état
 * vide parle à la place.
 */
export function phraseMesIndicateurs(comptes: ComptesMesIndicateurs): string | null {
  if (comptes.suivis === 0) return null
  const parties: string[] = []
  if (comptes.prevus > 0) {
    parties.push(
      `${nombre(comptes.prevus)} ${accorder(comptes.prevus, 'prévu', 'prévus')} par la coordination`,
    )
  }
  if (comptes.ajoutesParVous > 0) {
    parties.push(
      `${nombre(comptes.ajoutesParVous)} ${accorder(comptes.ajoutesParVous, 'ajouté', 'ajoutés')} par vous`,
    )
  }
  if (comptes.ajoutesParLEglise > 0) {
    parties.push(
      `${nombre(comptes.ajoutesParLEglise)} ${accorder(comptes.ajoutesParLEglise, 'ajouté', 'ajoutés')} par l'administration de l'église ou EJP Tech`,
    )
  }
  const detail = parties.length > 0 ? ` : ${listeNoms(parties)}` : ''
  const suivi = terminerPhrase(
    `${comptes.nom} suit ${nombre(comptes.suivis)} ${accorder(comptes.suivis, 'indicateur', 'indicateurs')}${detail}`,
  )
  return comptes.ajoutsRestants === null
    ? suivi
    : `${suivi} ${phraseAjoutsRestants(comptes.ajoutsRestants, comptes.ajoutsMax, comptes.ajoutesParVous)}`
}

/**
 * « Vous pouvez en ajouter 1 autre. » : ce qu'il reste des 3 ajouts permis. Sans ajout, « Vous
 * pouvez en ajouter 3. » ; à la limite, « Vous avez atteint le maximum de 3 ajouts. ».
 */
export function phraseAjoutsRestants(restants: number, maximum: number, ajoutes: number): string {
  if (restants <= 0) return `Vous avez atteint le maximum de ${nombre(maximum)} ajouts.`
  const autre = ajoutes > 0 ? ` ${accorder(restants, 'autre', 'autres')}` : ''
  return `Vous pouvez en ajouter ${nombre(restants)}${autre}.`
}
