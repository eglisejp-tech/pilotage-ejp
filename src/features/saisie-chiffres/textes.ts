// Textes des saisies des chiffres (lot E3) : saisie du dimanche (maquette 08) et « Chiffres du
// mois ». Un composant n'écrit jamais ces phrases en dur. Sources : BRIEF, section 9 (« Saisie du
// dimanche », « Chiffres du mois ») ; `LISEZMOI.md`, « États » ; plan de l'étape 4, E3 ;
// `docs/conception/aides-contextuelles.md`, section 6 (textes visibles de la précision et de la
// grille). « Proposé » quand le catalogue ne donne pas encore le texte. Textes revus par T66
// (19 octobre 2026, lignes t065 à t099 et m063 à m105).

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
  boutonMois: 'Enregistrer les chiffres',
  /** Titre du groupe des indicateurs propres du dimanche (T66, t073 : « chiffre » avec un ministère). */
  groupePropres: 'Vos autres chiffres',

  autreDimanche: 'Choisir un autre dimanche',
  /** Liste des dimanches proposés : « Dimanche 20 sept. (déjà saisi) ». */
  suffixeDejaSaisi: ' (déjà saisi)',
  /** Le dimanche du jour, avant midi, pour un indicateur saisi le matin (X3, T66 t066). */
  matinSeulement: "Les autres chiffres s'ouvrent à 12 h.",
  /** Le dimanche du jour, avant midi, sans indicateur saisi le matin (T66, t067). */
  matinSansIndicateur: "Les chiffres de ce dimanche s'ouvrent à 12 h.",

  /** Libellé du choix du mois (T66, t083) et indication sous le choix (t084, ancienne bulle). */
  libelleMois: 'Mois',
  indicationMoisEnCours: 'Saisissez le total à ce jour, puis complétez-le en fin de mois.',
  autreMois: 'Choisir un autre mois',

  /** Champ d'un sensible (P46) : textes de `aides-contextuelles.md`, section 6. */
  precisionLibelle: 'Précision (facultatif)',
  /** Seul le lecteur qui change ce que la personne écrit (guide, exemple 3 ; T66, t088). */
  precisionLecteurs: 'Le berger et le conseil la lisent.',
  precisionTropCourte: `Écrivez au moins ${LONGUEUR_TEXTE_MIN} caractères, ou laissez la précision vide.`,
  /** Forme commune d'un texte trop long (guide, 10.8 ; T66, t089). */
  precisionTropLongue: `Raccourcissez la précision : ${LONGUEUR_TEXTE_MAX} caractères au plus.`,
  /** Sous une précision déjà envoyée, reprise dans le champ (plan, E3 : « la dire »). Proposé. */
  precisionRetrait: 'Videz le champ pour retirer cette précision.',
  /** La précision du total le plus récent a été masquée : elle n'est pas reprise (T66, t091). */
  precisionMasquee: 'Votre précision de ce mois a été masquée.',
  /** Une précision ou une répartition sans total. Proposé. */
  totalManquant: 'Saisissez le total du mois pour y joindre une précision ou une répartition.',

  /** Même mot que la fiche (T66, t092). */
  grilleTitre: 'Répartition par catégorie (facultatif)',

  /** Mention visible d'un ajout qui attend EJP Tech (le texte complet vient de `textesVides`). */
  aValider: 'à valider',

  heures: 'Heures',
  minutes: 'Minutes',
  /** Format de l'heure, texte visible (aides-contextuelles.md, section 8). */
  formatHeure: 'Heures de 0 à 23, minutes de 0 à 59.',

  /** Premier envoi d'un mois sans aucun chiffre : message de la base, repris avant l'envoi. */
  aucunChiffre: 'Saisissez au moins un chiffre.',
  /** Champ obligatoire vide (STARs au service) : même texte que la session et la carte (t070). */
  nombreManquant: 'Saisissez un nombre, 0 si aucun.',
} as const

/** Un « dont en FIJ » plus grand que les actifs, avec le nombre à saisir (T66, t078). */
export function fijDepasseActifs(actifs: number): string {
  return `Saisissez ${nombre(actifs)} au plus, le nombre de STARs actifs.`
}

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
 * Adresse avec une date qui n'est pas un dimanche déjà passé (ou du jour) : le bouton dessous
 * (« Saisir le dimanche ... ») donne l'action (T66, t068).
 */
export const DIMANCHE_REFUSE = "Cette date n'est pas proposée à la saisie."

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
 * « Déjà saisi : 10, le 27 sept. à 12 h 41. » (BRIEF, section 9 ; T66, t075 : sans la mécanique
 * des totaux). `valeur` est déjà écrite avec son unité.
 */
export function phraseDejaSaisi(valeur: string, saisiLe: string): string {
  const jour = formaterJourCourt(jourDeParis(saisiLe))
  const heure = formaterHeure(heureDeParis(saisiLe))
  return `Déjà saisi : ${valeur}, le ${jour} à ${heure}.`
}

/**
 * « Chiffres du dimanche 27 sept. enregistrés. » (LISEZMOI, « Réussite ») ; une correction le dit
 * (« Correction du dimanche 27 sept. enregistrée. », T66, m073).
 */
export function reussiteDimanche(dimanche: DateIso, correction = false): string {
  const jour = formaterJourCourt(dimanche)
  return correction
    ? `Correction du dimanche ${jour} enregistrée.`
    : `Chiffres du dimanche ${jour} enregistrés.`
}

/** « de septembre », « d'août », « d'octobre » : l'élision devant une voyelle. */
function deMois(texte: string): string {
  return /^[aeiouéè]/i.test(texte) ? `d'${texte}` : `de ${texte}`
}

/**
 * « Chiffres de septembre 2026 enregistrés. », « Chiffres d'août 2026 enregistrés. » ; une
 * correction le dit (« Correction de septembre 2026 enregistrée. », T66, m073).
 */
export function reussiteMois(mois: Mois, correction = false): string {
  const periode = deMois(libelleMois(mois).toLowerCase())
  return correction ? `Correction ${periode} enregistrée.` : `Chiffres ${periode} enregistrés.`
}

/**
 * Un champ déjà saisi pour la période, vidé : une saisie ne s'efface pas (ajout seulement), la
 * valeur enregistrée resterait comptée sans que rien ne le dise. Même phrase que le lot E4 (T66 :
 * forme de m077, « Déjà enregistré : 10. », comme « Déjà saisi : »).
 */
export function messageValeurEffacee(valeur: string): string {
  return `Déjà enregistré : ${valeur}. Saisissez 0 ou le bon chiffre.`
}

/**
 * « Chiffres de septembre », « Chiffres d'août » : ligne de l'accueil d'un ministère. Le choix du
 * mois de la saisie dit « Mois » (T66, t083).
 */
export function ligneChiffresDuMois(mois: Mois): string {
  return `Chiffres ${deMois(nomDuMois(Number(mois.slice(5, 7))))}`
}

/** Une catégorie hors de 0 à 9 999, nommée (T66, m094). */
export function messageCategorieHorsBornes(libelle: string): string {
  return `Catégorie « ${libelle} » : saisissez un nombre entre 0 et 9 999.`
}

/** Ligne calculée sous la grille : « Non réparti : 3 ». */
export function ligneNonReparti(reste: number): string {
  return `Non réparti : ${nombre(reste)}`
}

/** « Les catégories font 9 pour un total de 7. Corrigez ... » (contrat, section 7 ; T66, t094). */
export function messageSommeDepasse(somme: number, total: number): string {
  return `Les catégories font ${somme} pour un total de ${total}. Corrigez la répartition ou le total.`
}

/** Bouton d'un état vide qui ramène au dimanche ou au mois proposé : « Saisir le dimanche 27 sept. ». */
export function actionSaisirDimanche(dimanche: DateIso): string {
  return `Saisir le dimanche ${formaterJourCourt(dimanche)}`
}

/** « Saisir septembre 2026 ». */
export function actionSaisirMois(mois: Mois): string {
  return `Saisir ${libelleMois(mois).toLowerCase()}`
}
