// Textes des saisies des chiffres (lot E3) : saisie du dimanche (maquette 08) et « Chiffres du
// mois ». Un composant n'écrit jamais ces phrases en dur. Sources : BRIEF, section 9 (« Saisie du
// dimanche », « Chiffres du mois ») ; `LISEZMOI.md`, « États » ; plan de l'étape 4, E3 ;
// `docs/conception/aides-contextuelles.md`, section 6 (textes visibles de la précision et de la
// grille). « Proposé » quand le catalogue ne donne pas encore le texte.

import { LONGUEUR_TEXTE_MAX, LONGUEUR_TEXTE_MIN } from '@/features/indicateurs/schemas'
import {
  formaterHeure,
  formaterJourCourt,
  formaterJourLong,
  heureDeParis,
  jourDeParis,
  nomDuMois,
} from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'
import { libelleMois } from '@/lib/metier/periodes'
import type { Mois } from '@/lib/metier/periodes'
import { formaterPourcentage } from '@/lib/metier/pourcentage'
import { majusculeInitiale, nombre } from '@/lib/metier/texte'

export const TEXTES_CHIFFRES = {
  surtitreDimanche: 'Chiffres du dimanche',
  /** « Corriger » de 07 : une saisie existe déjà pour ce dimanche (BRIEF, section 9). */
  surtitreCorrection: 'Corriger les chiffres du dimanche',
  surtitreMois: 'Chiffres du mois',
  boutonDimanche: 'Enregistrer les chiffres',
  boutonCorrection: 'Enregistrer la correction',
  boutonMois: 'Enregistrer les chiffres du mois',
  /** Ligne visible de la maquette 08, au-dessus du bouton, pour une première saisie. */
  historique: "Votre saisie s'ajoute à l'historique, elle ne remplace rien.",
  /**
   * Même ligne quand un « Déjà saisi : ... » est affiché : elle ne doit pas contredire « Votre
   * saisie la remplacera dans les totaux. ». Écart avec la maquette 08. Proposé.
   */
  historiqueCorrection:
    "Votre saisie s'ajoute à l'historique. Dans les totaux, c'est la dernière qui compte.",
  /** Titre du groupe des indicateurs propres du dimanche (aide `dimanche.propres`). */
  groupePropres: 'Indicateurs du ministère',

  autreDimanche: 'Choisir un autre dimanche',
  /** Liste des dimanches proposés : « Dimanche 20 sept. (déjà saisi) ». */
  suffixeDejaSaisi: ' (déjà saisi)',
  /** Le dimanche du jour, avant midi, pour un indicateur saisi le matin (X3). Proposé. */
  matinSeulement: "Avant 12 h, seuls les chiffres du matin se saisissent. Le reste s'ouvre à midi.",
  /** Le dimanche du jour, avant midi, sans indicateur saisi le matin. Proposé. */
  matinSansIndicateur: 'Ce dimanche se saisit à partir de 12 h.',

  autreMois: 'Choisir un autre mois',

  /** Champ d'un sensible (P46) : textes de `aides-contextuelles.md`, section 6. */
  precisionLibelle: 'Précision (facultatif)',
  precisionLecteurs: 'Lue par votre ministère, le berger, le conseil et EJP Tech.',
  precisionTropCourte: `Écrivez au moins ${LONGUEUR_TEXTE_MIN} caractères, ou laissez la précision vide.`,
  /** Le message de la base (`private.verifier_texte`), repris tel quel. */
  precisionTropLongue: `La précision doit faire entre ${LONGUEUR_TEXTE_MIN} et ${LONGUEUR_TEXTE_MAX} caractères.`,
  /** Sous une précision déjà envoyée, reprise dans le champ (plan, E3 : « la dire »). Proposé. */
  precisionRetrait: 'Videz le champ pour retirer cette précision.',
  /** La précision du total le plus récent a été masquée : elle n'est pas reprise. Proposé. */
  precisionMasquee: 'Votre précision de ce mois a été masquée par EJP Tech.',
  /** Une précision ou une répartition sans total. Proposé. */
  totalManquant: 'Saisissez le total du mois pour y joindre une précision ou une répartition.',

  grilleTitre: 'Répartition (facultatif)',

  /** Mention visible d'un ajout qui attend EJP Tech (le texte complet vient de `textesVides`). */
  aValider: 'à valider',

  heures: 'Heures',
  minutes: 'Minutes',
  /** Format de l'heure, texte visible (aides-contextuelles.md, section 8). */
  formatHeure: 'Heures de 0 à 23, minutes de 0 à 59.',

  /** Un « dont en FIJ » plus grand que les actifs : message de la base, repris avant l'envoi. */
  fijDepasseActifs: 'Les STARs en FIJ ne peuvent pas dépasser les STARs actifs.',
  /** Premier envoi d'un mois sans aucun chiffre : message de la base, repris avant l'envoi. */
  aucunChiffre: 'Saisissez au moins un chiffre.',
} as const

/** Titre de la saisie du dimanche (maquette 08) : « Dimanche 27 septembre ». */
export function titreDimanche(dimanche: DateIso): string {
  return majusculeInitiale(formaterJourLong(dimanche))
}

/** Surtitre : « Corriger les chiffres du dimanche » quand une saisie fait déjà foi (« Corriger » de 07). */
export function surtitreDimanche(correction: boolean): string {
  return correction ? TEXTES_CHIFFRES.surtitreCorrection : TEXTES_CHIFFRES.surtitreDimanche
}

/** Titre de « Chiffres du mois » : « Septembre 2026 » (« en cours » va dans le surtitre). */
export function titreMois(mois: Mois): string {
  return libelleMois(mois)
}

/** Surtitre de « Chiffres du mois » : « Chiffres du mois, en cours » pour le mois en cours. */
export function surtitreMois(enCours: boolean): string {
  return enCours ? `${TEXTES_CHIFFRES.surtitreMois}, en cours` : TEXTES_CHIFFRES.surtitreMois
}

/**
 * Adresse avec une date qui n'est pas un dimanche déjà passé (ou du jour) : la phrase dit
 * pourquoi et quel dimanche choisir. Proposé.
 */
export function dimancheRefuse(dimancheReference: DateIso): string {
  return `Cette date n'est pas un dimanche déjà passé. Choisissez le dimanche ${formaterJourCourt(dimancheReference)} ou un dimanche précédent.`
}

/** « Dimanche dernier : 9 », ou « Dimanche dernier : non saisi ». */
export function noteDimancheDernier(valeur: number | null): string {
  return `Dimanche dernier : ${valeur === null ? 'non saisi' : nombre(valeur)}`
}

/** « Saisi le 24 sept. » : date de Paris de la dernière saisie d'un « à ce jour ». */
export function noteSaisiLe(saisiLe: string): string {
  return `Saisi le ${formaterJourCourt(jourDeParis(saisiLe))}`
}

/** « 79 % des actifs » ; null quand il ne se calcule pas (un champ vide, aucun actif). */
export function notePourcentageActifs(pourcentage: number | null): string | null {
  return pourcentage === null ? null : `${formaterPourcentage(pourcentage)} des actifs`
}

/**
 * « Déjà saisi : 10, le 27 sept. à 12 h 41. Votre saisie la remplacera dans les totaux. » (BRIEF,
 * section 9). `valeur` est déjà écrite avec son unité.
 */
export function phraseDejaSaisi(valeur: string, saisiLe: string): string {
  const jour = formaterJourCourt(jourDeParis(saisiLe))
  const heure = formaterHeure(heureDeParis(saisiLe))
  return `Déjà saisi : ${valeur}, le ${jour} à ${heure}. Votre saisie la remplacera dans les totaux.`
}

/** « Chiffres du dimanche 27 sept. enregistrés. » (LISEZMOI, « Réussite »). */
export function reussiteDimanche(dimanche: DateIso): string {
  return `Chiffres du dimanche ${formaterJourCourt(dimanche)} enregistrés.`
}

/** « de septembre », « d'août », « d'octobre » : l'élision devant une voyelle. */
function deMois(texte: string): string {
  return /^[aeiouéè]/i.test(texte) ? `d'${texte}` : `de ${texte}`
}

/** « Chiffres de septembre 2026 enregistrés. », « Chiffres d'août 2026 enregistrés. » Proposé. */
export function reussiteMois(mois: Mois): string {
  return `Chiffres ${deMois(libelleMois(mois).toLowerCase())} enregistrés.`
}

/**
 * Un champ déjà saisi pour la période, vidé : une saisie ne s'efface pas (ajout seulement), la
 * valeur enregistrée resterait comptée sans que rien ne le dise. Même phrase que le lot E4.
 */
export function messageValeurEffacee(valeur: string): string {
  return `La valeur enregistrée (${valeur}) reste comptée. Saisissez 0 ou la bonne valeur.`
}

/** Ligne du choix du mois (aide `mois.periode`) : « Chiffres de septembre », « Chiffres d'août ». */
export function ligneChiffresDuMois(mois: Mois): string {
  return `Chiffres ${deMois(nomDuMois(Number(mois.slice(5, 7))))}`
}

/** Ligne calculée sous la grille : « Non réparti : 3 ». */
export function ligneNonReparti(reste: number): string {
  return `Non réparti : ${nombre(reste)}`
}

/** « La somme des catégories (9) dépasse le total du mois (7). » (contrat, section 7). */
export function messageSommeDepasse(somme: number, total: number): string {
  return `La somme des catégories (${somme}) dépasse le total du mois (${total}).`
}

/** Bouton d'un état vide qui ramène au dimanche ou au mois proposé : « Saisir le dimanche 27 sept. ». */
export function actionSaisirDimanche(dimanche: DateIso): string {
  return `Saisir le dimanche ${formaterJourCourt(dimanche)}`
}

/** « Saisir septembre 2026 ». */
export function actionSaisirMois(mois: Mois): string {
  return `Saisir ${libelleMois(mois).toLowerCase()}`
}
