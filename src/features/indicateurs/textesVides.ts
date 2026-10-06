// États vides des blocs d'indicateurs (étape 4 ; plan, E2 et E3 ; docs/decisions.md, T22) : chaque
// bloc qui peut manquer de données dit ce qui manque, jamais un blanc ni un zéro trompeur. Aucun
// composant n'écrit un de ces textes en dur.
//
// Sources : `docs/reference/maquettes/LISEZMOI.md`, « États » (le catalogue validé) ; le plan de
// l'étape 4 (E2, E3) ; `docs/conception/aides-contextuelles.md` : « Non calculé », « À valider par
// EJP Tech » et le format de l'heure restent des textes visibles, jamais des aides (section 8).
// « Proposé » quand le catalogue ne donne pas encore le texte.
//
// Pas de texte « Se saisit une fois le mois fini. » : le mois en cours d'un indicateur sensible se
// saisit comme les autres (décision de la personne responsable, 6 octobre 2026).
//
// Texte du « Non calculé » : `texteNonCalcule` (`src/lib/metier/indicateurs.ts`), qui connaît la
// raison, la période et la source. « Pas encore de saisie » est écrit ici (LISEZMOI, « États ») et
// non importé de `src/features/cette-semaine`, qui appartient au lot E7 : un changement de ce lot ne
// doit pas changer la fiche sans que le lot E2 le voie.

import { nomDuMois } from '@/lib/metier/dates'
import { libelleMoisEnCours } from '@/lib/metier/periodes'
import type { Mois } from '@/lib/metier/periodes'
import { NON_CALCULE } from '@/lib/metier/pourcentage'
import { accorder, nombre } from '@/lib/metier/texte'

/** Ce que voit chaque profil d'un ajout qui attend la validation d'EJP Tech. */
export type LecteurAjout = 'ministere' | 'autre'

const PAS_ENCORE_DE_SAISIE = 'Pas encore de saisie'

export const TEXTES_VIDES_INDICATEURS = {
  /** Valeur, écart et courbe d'une ligne d'indicateur jamais saisi : la ligne reste (LISEZMOI). */
  pasEncoreDeSaisie: PAS_ENCORE_DE_SAISIE,
  /** Somme de l'année d'un indicateur jamais saisi : jamais « 0 ». */
  sommeSansSaisie: PAS_ENCORE_DE_SAISIE,
  /** Mois sensible dont la répartition manque pour ce profil. Proposé (plan, E2). */
  repartitionMasquee: 'Répartition masquée pour protéger les petits nombres.',
  /** Calcul dont une source manque ou dont le bas vaut 0 : le détail vient de `texteNonCalcule`. */
  nonCalcule: NON_CALCULE,

  /** Action unique d'un bloc sans saisie, au ministère seulement (E2). */
  actionSaisirLeMois: 'Saisir les chiffres du mois',

  propres: {
    /** « Mes indicateurs » de la fiche du ministère, premier usage. LISEZMOI. */
    ministere:
      "Votre ministère n'a pas encore d'indicateur à lui. Les STARs au service, actifs et en FIJ se saisissent déjà chaque dimanche.",
    /** Fiche vue par le berger, le conseil ou EJP Tech, premier usage. Proposé. */
    autres: "Ce ministère n'a pas encore d'indicateur à lui. Il saisit les chiffres communs.",
  },

  /** Bloc « Retirés » : aucun résultat. Proposé. */
  aucunRetire: 'Aucun indicateur retiré.',
  /** « Dernières saisies » de la fiche : premier usage. Proposé. */
  aucuneDerniereSaisie: "Aucune saisie pour l'instant.",

  /** « Chiffres du mois » : le ministère n'a aucun indicateur du mois (E3). Proposé. */
  moisSansIndicateur: "Votre ministère n'a pas d'indicateur du mois.",
  /** Bouton qui accompagne `moisSansIndicateur` (E3). Proposé. */
  actionRevenirAMaFiche: 'Revenir à ma fiche',
} as const

/**
 * Ajout qui attend la validation (plan, E2) : le ministère sait qu'il peut déjà saisir ; le berger,
 * le conseil et EJP Tech lisent seulement « à valider ». `attenteJours` vient de
 * `v_indicateur_suivi.attente_jours` (jours depuis la création, heure de Paris).
 */
export function texteAjoutAValider(lecteur: LecteurAjout, attenteJours: number | null): string {
  if (lecteur === 'autre') return 'à valider'
  // `attente_jours` est null quand l'indicateur n'est pas à valider : aucune durée à inventer.
  if (attenteJours === null) return 'À valider par EJP Tech. Vous pouvez déjà le saisir.'
  const depuis =
    attenteJours <= 0
      ? "depuis aujourd'hui"
      : `depuis ${nombre(attenteJours)} ${accorder(attenteJours, 'jour', 'jours')}`
  return `À valider par EJP Tech ${depuis}. Vous pouvez déjà le saisir.`
}

/**
 * Mois en cours d'un indicateur du mois sans saisie, pour tout indicateur, sensible compris (P45) :
 * « Octobre en cours : pas encore de saisie ». Proposé (plan, E2).
 */
export function moisEnCoursSansSaisie(mois: Mois): string {
  return `${libelleMoisEnCours(mois)} : pas encore de saisie`
}

/** Mois sensible sans ligne de répartition : « Pas de répartition pour septembre. ». Proposé. */
export function pasDeRepartition(mois: Mois): string {
  return `Pas de répartition pour ${nomDuMois(Number(mois.slice(5, 7)))}.`
}
