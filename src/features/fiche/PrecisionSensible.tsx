import type { PrecisionFiche } from '@/features/fiche/modeleFiche'
import { cn } from '@/lib/utils'

interface Props {
  precision: PrecisionFiche
}

/**
 * Précision d'un mois d'un indicateur sensible (P46) : le texte écrit par le ministère avec le
 * total le plus récent du mois, lu tel quel (sans aide). Masquée par EJP Tech, elle s'affiche
 * « [texte masqué par EJP Tech] » en `--encre-3`. Sans précision, rien n'est affiché.
 */
export function PrecisionSensible({ precision }: Props) {
  return (
    <p className="text-sm leading-normal text-encre-2">
      <span className="font-semibold text-encre">{precision.titre} : </span>
      <span className={cn(precision.texte.masque && 'text-encre-3')}>{precision.texte.texte}</span>
    </p>
  )
}
