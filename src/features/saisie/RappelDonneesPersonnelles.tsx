import { RAPPEL_DONNEES_PERSONNELLES } from '@/features/saisie/textes'

interface Props {
  /** Identifiant, pour le relier au champ libre par `aria-describedby`. */
  id?: string
}

/**
 * Rappel sur les données personnelles (BRIEF section 3, règle 9) : visible, une seule fois par
 * formulaire, sous le premier champ libre. Ce n'est jamais une aide en bulle. Le champ
 * « Pourquoi cet indicateur ? » n'en a pas (T30).
 */
export function RappelDonneesPersonnelles({ id }: Props) {
  return (
    <p id={id} className="text-sm leading-normal text-encre-3">
      {RAPPEL_DONNEES_PERSONNELLES}
    </p>
  )
}
