import { ChargementPage } from '@/components/etats/ChargementPage'
import { TEXTES_VIDES } from '@/features/cette-semaine/textesVides'

interface Props {
  /** Ce qui charge ; par défaut, « Chargement du formulaire ». */
  texte?: string
}

/**
 * Chargement d'un panneau de saisie (LISEZMOI, « États » ; T65, moment 2) : le titre du panneau
 * est déjà là ; après 300 ms, la flamme vivante et ce qui charge à la place du formulaire, avec
 * `aria-busy`, puis, après 4 s, « Chargement plus long que d'habitude » (m248). La zone `status`
 * existe dès le départ, vide, pour que le texte soit annoncé.
 */
export function ChargementSaisie({ texte = TEXTES_VIDES.page.chargementFormulaire }: Props) {
  return <ChargementPage texte={texte} />
}
