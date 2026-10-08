import { TEXTES_JOURNAL } from '@/features/journal/textesJournal'
import { ErreurDePage } from '@/pages/ErreurDePage'

interface Props {
  titre: string
  onReessayer: () => void
}

/**
 * Erreur de l'écran 06 (LISEZMOI, « États ») : le titre reste visible au-dessus du bandeau, pour
 * que la page garde son h1 et dise de quel écran il s'agit.
 */
export function ErreurJournal({ titre, onReessayer }: Props) {
  return (
    <div className="flex flex-col gap-9">
      <h1 className="font-lecture text-titre leading-tight font-medium">{titre}</h1>
      <ErreurDePage
        message={TEXTES_JOURNAL.erreur}
        libelleBouton={TEXTES_JOURNAL.reessayer}
        onReessayer={onReessayer}
      />
    </div>
  )
}
