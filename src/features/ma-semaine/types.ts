import type { DonneesAccueilMinistere } from '@/features/accueil-ministere/types'
import type { LigneCommune } from '@/features/fiche/modeleFiche'

/**
 * Une ligne de « Dans l'église » : un total de l'église avec sa complétude. Jamais le nom, la
 * valeur ou la complétude d'un ministère en particulier.
 */
export interface LigneEglise {
  /** `service` ou `session`. */
  cle: string
  /** « STARs au service », « Présents à Bâtir l'Église ». */
  libelle: string
  /** « 52 » ; null : aucun ministère n'a encore saisi (« Pas encore de saisie »). */
  valeur: string | null
  /** « Dimanche 27 sept., 6 sur 8 ». */
  detail: string
}

/** « Semaine 39, du 21 au 27 sept. » : l'ouverture de 07 la lit. */
export interface SemaineMinistere {
  numero: number
  periode: string
}

/**
 * Ce que « Ma semaine » affiche pour un ministère : l'ouverture de 07, « Vos saisies », « Vos
 * points » (lus par l'accueil), puis « Vos chiffres de la semaine » et « Dans l'église ».
 */
export interface DonneesMaSemaine {
  accueil: DonneesAccueilMinistere
  semaine: SemaineMinistere
  /**
   * Chiffres du ministère : STARs au service, actifs, en FIJ, une ligne par session de la semaine
   * où il est attendu, puis ses indicateurs propres (dimanche et mois).
   */
  chiffres: LigneCommune[]
  /** Ministère FIJ seulement : la carte et les chiffres par département. Vide pour les autres. */
  fij: LigneCommune[]
  /** Deux totaux de l'église au plus, avec leur complétude. */
  eglise: LigneEglise[]
}
