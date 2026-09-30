// Écarts à périmètre égal (BRIEF.md section 3, règle 12, et section 9, « Formats » ;
// docs/decisions.md, P14).
//
// Le calcul est fait par la base (`v_ecart_dimanche`, `v_ecart_session` : `ecart` et
// `nb_comparables`, seulement pour les ministères qui ont saisi les deux fois). Ce module écrit
// l'écart : « +2 », ou le signe moins U+2212 suivi du nombre (« −3 »), jamais un tiret.

import { formaterJourSemaine, type DateIso } from './dates'
import { nombre } from './texte'

/** Ce à quoi l'écart se compare : le dimanche d'avant, ou la session précédente du même type. */
export type Comparaison = 'dimanche' | 'session'

const REPERE: Record<Comparaison, string> = {
  dimanche: 'dimanche dernier',
  session: 'la session précédente',
}

function verifierEcart(ecart: number): void {
  if (!Number.isFinite(ecart)) throw new RangeError(`Écart invalide : ${ecart}`)
}

/** « +2 », « −3 » (U+2212), « 0 ». */
export function formaterEcart(ecart: number): string {
  verifierEcart(ecart)
  return ecart > 0 ? `+${nombre(ecart)}` : nombre(ecart)
}

function debutEtiquette(ecart: number): string {
  return ecart === 0 ? 'Stable' : formaterEcart(ecart)
}

/** Écart prêt à afficher : le texte visible et l'étiquette accessible. */
export interface EcartAffiche {
  ecart: number
  /** « +3 » */
  texte: string
  /** « +3 par rapport à dimanche dernier, pour les 6 ministères qui ont saisi les deux fois » */
  etiquette: string
}

/**
 * Écart de l'église. `null` quand aucun ministère n'a saisi les deux fois : pas d'écart
 * (la vue ne rend alors aucune ligne, d'où `ecart` nul).
 */
export function ecartEglise(
  ecart: number | null,
  nbComparables: number,
  comparaison: Comparaison,
): EcartAffiche | null {
  if (ecart === null || nbComparables <= 0) return null
  const perimetre =
    nbComparables === 1
      ? 'pour le seul ministère qui a saisi les deux fois'
      : `pour les ${nombre(nbComparables)} ministères qui ont saisi les deux fois`
  return {
    ecart,
    texte: formaterEcart(ecart),
    etiquette: `${debutEtiquette(ecart)} par rapport à ${REPERE[comparaison]}, ${perimetre}`,
  }
}

/** Écart d'un ministère sur sa fiche : un nombre, ou la mention du jour non saisi. */
export interface EcartMinistere {
  /** `null` quand la saisie précédente manque. */
  ecart: number | null
  /** « +1 », ou « dimanche 20 sept. non saisi » */
  texte: string
  /** « +1 par rapport à dimanche dernier », ou le même texte que `texte` */
  etiquette: string
}

/**
 * Sur une fiche, l'écart n'existe que si le ministère a saisi les deux fois ; sinon la ligne dit
 * « dimanche 20 sept. non saisi ». `null` si la valeur actuelle manque (rien à comparer).
 */
export function ecartMinistere(
  valeur: number | null,
  valeurPrecedente: number | null,
  datePrecedente: DateIso,
  comparaison: Comparaison,
): EcartMinistere | null {
  if (valeur === null) return null
  if (valeurPrecedente === null) {
    const texte = `${formaterJourSemaine(datePrecedente)} non saisi`
    return { ecart: null, texte, etiquette: texte }
  }
  const ecart = valeur - valeurPrecedente
  return {
    ecart,
    texte: formaterEcart(ecart),
    etiquette: `${debutEtiquette(ecart)} par rapport à ${REPERE[comparaison]}`,
  }
}
