import { ChargementPage } from '@/components/etats/ChargementPage'
import { TEXTES_VIDES } from '@/features/cette-semaine/textesVides'

interface Props {
  /** Ce qui charge ; par défaut, « Chargement du formulaire ». */
  texte?: string
}

/**
 * Chargement d'une saisie (LISEZMOI, « États » ; T65, moment 2) : le titre du panneau tout de
 * suite, puis, après 300 ms, la flamme vivante et ce qui charge, avec `aria-busy`, et « Chargement
 * plus long que d'habitude » après 4 s (m248). La zone `status` existe dès le départ, vide, pour
 * que les lecteurs d'écran annoncent le texte à son arrivée.
 */
export function ChargementSaisie({ texte = TEXTES_VIDES.page.chargementFormulaire }: Props) {
  return <ChargementPage texte={texte} />
}
