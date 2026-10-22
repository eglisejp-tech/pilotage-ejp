import { IndicateurChargement } from '@/components/etats/IndicateurChargement'
import { PlaceReservee } from '@/components/etats/PlaceReservee'

interface Props {
  /** Ce qui charge : « Chargement des sessions », « Chargement du formulaire ». */
  texte: string
}

/**
 * Le contenu d'une page ou d'un panneau qui charge (T65, moment 2), sous son titre déjà affiché :
 * après 300 ms, la flamme vivante et le texte, puis deux places réservées en gris immobile, là
 * où la liste ou le formulaire vont arriver. `aria-busy` sur les places, celles du contenu qui
 * attend ; la zone `status` de l'indicateur n'est jamais dans un élément `aria-busy` (certains
 * lecteurs d'écran n'annoncent pas ce qui change dans une zone occupée).
 */
export function ChargementPage({ texte }: Props) {
  return (
    <div className="flex flex-col gap-2.5">
      <IndicateurChargement texte={texte} />
      <div aria-busy="true" className="flex flex-col gap-2.5">
        <PlaceReservee className="h-[30px]" />
        <PlaceReservee className="h-[30px] w-4/5" />
      </div>
    </div>
  )
}
