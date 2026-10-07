// Usage d'un indicateur (configuration-indicateurs.md, 7.1 et 7.2) : « Saisi 4 mois sur 5, dernier
// le 2 oct. », « Jamais saisi », « Peu saisi : 1 mois sur 4 ». Jamais une valeur : la vue
// `v_usage_indicateurs` ne rend que des nombres de périodes et la date de la dernière saisie. Les
// dates se lisent à l'heure de Paris.

import type { LigneUsage } from '@/data/indicateursConfiguration'
import type { NatureIndicateur } from '@/lib/base'
import { formaterJourCourt, jourDeParis } from '@/lib/metier/dates'
import { accorder, nombre } from '@/lib/metier/texte'

/**
 * Seuil de « peu saisi » (proposé : le texte de conception ne le chiffre pas). Un indicateur est
 * peu saisi quand au moins 2 périodes étaient attendues et que moins de la moitié est saisie : « 1
 * mois sur 4 » est peu saisi, « 4 mois sur 5 » ne l'est pas. Un seul endroit à changer.
 */
export const PERIODES_ATTENDUES_MIN = 2

/** Vrai si l'usage est trop faible pour que l'indicateur serve (voir `PERIODES_ATTENDUES_MIN`). */
export function estPeuSaisi(
  usage: Pick<LigneUsage, 'nb_periodes_saisies' | 'nb_periodes_attendues'> | undefined,
): boolean {
  if (usage === undefined) return false
  return (
    usage.nb_periodes_attendues >= PERIODES_ATTENDUES_MIN &&
    usage.nb_periodes_saisies * 2 < usage.nb_periodes_attendues
  )
}

/** Un « à ce jour » se compte par mois : seul le dimanche compte des dimanches. */
function periodes(nature: NatureIndicateur, n: number): string {
  return nature === 'dimanche' ? accorder(n, 'dimanche', 'dimanches') : 'mois'
}

/**
 * Ligne d'usage d'un indicateur saisi, ou `null` quand la base n'en rend pas (un calcul, un
 * indicateur retiré pour confidentialité) : « Saisi 4 mois sur 5, dernier le 2 oct. », « Peu saisi :
 * 1 mois sur 4 », « Jamais saisi ».
 */
export function texteUsage(usage: LigneUsage | undefined, nature: NatureIndicateur): string | null {
  if (usage === undefined) return null
  if (usage.jamais_saisi || usage.derniere_saisie_le === null) return 'Jamais saisi'
  const rapport = `${nombre(usage.nb_periodes_saisies)} ${periodes(nature, usage.nb_periodes_saisies)} sur ${nombre(usage.nb_periodes_attendues)}`
  if (estPeuSaisi(usage)) return `Peu saisi : ${rapport}`
  return `Saisi ${rapport}, dernier le ${formaterJourCourt(jourDeParis(usage.derniere_saisie_le))}`
}

/** « 2 peu saisis », en orange avec le mot (jamais la couleur seule). */
export function textePeuSaisis(nombreDePeuSaisis: number): string {
  return `${nombre(nombreDePeuSaisis)} ${accorder(nombreDePeuSaisis, 'peu saisi', 'peu saisis')}`
}
