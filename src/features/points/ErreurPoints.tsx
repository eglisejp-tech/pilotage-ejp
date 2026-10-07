import { TEXTES_POINTS } from '@/features/points/textesPoints'
import { ErreurDePage } from '@/pages/ErreurDePage'

interface Props {
  titre: string
  onReessayer: () => void
}

/**
 * Erreur de l'écran 05 (LISEZMOI, « États ») : le titre reste visible au-dessus du bandeau, pour
 * que la page garde son h1 et dise de quel écran il s'agit.
 */
export function ErreurPoints({ titre, onReessayer }: Props) {
  return (
    <div className="flex flex-col gap-12">
      <h1 className="font-lecture text-titre leading-tight font-medium">{titre}</h1>
      <ErreurDePage
        message={TEXTES_POINTS.erreur}
        libelleBouton={TEXTES_POINTS.reessayer}
        onReessayer={onReessayer}
      />
    </div>
  )
}
