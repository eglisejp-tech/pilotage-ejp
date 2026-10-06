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
// raison, la période et la source. Valeur jamais saisie : `TEXTES_VIDES.chiffres.valeur` de
// `src/features/cette-semaine/textesVides.ts`, repris ici pour ne pas le dire deux fois.

import { TEXTES_VIDES as TEXTES_VIDES_SEMAINE } from '@/features/cette-semaine/textesVides'
import { accorder, nombre } from '@/lib/metier/texte'
import { NON_CALCULE } from '@/lib/metier/pourcentage'

/** Ce que voit chaque profil d'un ajout qui attend la validation d'EJP Tech. */
export type LecteurAjout = 'ministere' | 'autre'

export const TEXTES_VIDES_INDICATEURS = {
  /** Valeur, écart et courbe d'une ligne d'indicateur jamais saisi : la ligne reste (LISEZMOI). */
  pasEncoreDeSaisie: TEXTES_VIDES_SEMAINE.chiffres.valeur,
  /** Somme de l'année d'un indicateur jamais saisi : jamais « 0 ». */
  sommeSansSaisie: TEXTES_VIDES_SEMAINE.chiffres.valeur,
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
  const depuis =
    attenteJours === null || attenteJours <= 0
      ? "depuis aujourd'hui"
      : `depuis ${nombre(attenteJours)} ${accorder(attenteJours, 'jour', 'jours')}`
  return `À valider par EJP Tech ${depuis}. Vous pouvez déjà le saisir.`
}
