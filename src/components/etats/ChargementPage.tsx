import { IndicateurChargement } from '@/components/etats/IndicateurChargement'
import { PlaceReservee } from '@/components/etats/PlaceReservee'

interface Props {
  /** Ce qui charge : « Chargement des sessions », « Chargement du formulaire ». */
  texte: string
}

/**
 * Le contenu d'une page ou d'un panneau qui charge (T65, moment 2), sous son titre déjà affiché :
 * après 300 ms, la flamme vivante et le texte, puis deux places réservées en gris immobile, là
 * où la liste ou le formulaire vont arriver. `aria-busy` sur l'ensemble, la zone `status` dans
 * l'indicateur.
 */
export function ChargementPage({ texte }: Props) {
  return (
    <div aria-busy="true" className="flex flex-col gap-2.5">
      <IndicateurChargement texte={texte} />
      <PlaceReservee className="h-[30px]" />
      <PlaceReservee className="h-[30px] w-4/5" />
    </div>
  )
}
