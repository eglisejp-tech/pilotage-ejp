import type { PrecisionFiche } from '@/features/fiche/modeleFiche'
import { TEXTE_MASQUE_AFFICHE } from '@/features/fiche/textesFiche'
import { cn } from '@/lib/utils'

interface Props {
  precision: PrecisionFiche
}

/**
 * Précision d'un mois d'un indicateur sensible (P46) : le texte écrit par le ministère avec le
 * total le plus récent du mois, lu tel quel (sans aide). Masquée par EJP Tech, elle s'affiche
 * « [texte masqué] » en `--encre-3` (T66). Sans précision, rien n'est affiché.
 */
export function PrecisionSensible({ precision }: Props) {
  return (
    <p className="text-detail leading-normal text-encre-2">
      <span className="font-semibold text-encre">{precision.titre} : </span>
      <span className={cn(precision.texte.masque && 'text-encre-3')}>
        {precision.texte.masque ? TEXTE_MASQUE_AFFICHE : precision.texte.texte}
      </span>
    </p>
  )
}
