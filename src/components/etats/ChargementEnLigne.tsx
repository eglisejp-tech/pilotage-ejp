import { PetiteFlamme } from '@/components/etats/PetiteFlamme'
import { useMotChargement } from '@/components/etats/useMotChargement'

interface Props {
  /** Ce qui charge : « Chargement de vos points », « Chargement de la session ». */
  texte: string
}

/**
 * Bloc qui se relit (T65, moment 3) : la petite flamme, de la taille du texte, et ce qui charge,
 * dans le bloc seulement ; le reste de la page ne bouge pas. Rien pendant 300 ms, puis la flamme
 * et le texte ; après 4 s, « Chargement plus long que d'habitude » (m248). La zone `status`
 * existe dès le départ, vide, et la ligne garde la hauteur d'une ligne. `aria-busy` marque
 * l'attente, sur le dessin seulement : la zone `status` n'est jamais dans un élément `aria-busy`
 * (certains lecteurs d'écran n'annoncent pas ce qui change dans une zone occupée).
 */
export function ChargementEnLigne({ texte }: Props) {
  const mot = useMotChargement(texte)
  return (
    <p className="flex min-h-[1.5em] items-center gap-2 text-[15px] leading-normal text-encre-2">
      <span aria-busy="true" className="contents">
        {mot === null ? null : <PetiteFlamme />}
      </span>
      <span role="status">{mot}</span>
    </p>
  )
}
