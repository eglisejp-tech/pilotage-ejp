import { ChargementEnLigne } from '@/components/etats/ChargementEnLigne'

interface Props {
  /** Ce qui charge, dans ce bloc : « Chargement des points », « Chargement du calendrier ». */
  texte: string
}

/**
 * Chargement d'un bloc qui se lit à part (LISEZMOI, « États » ; T65, moment 3) : le titre du bloc
 * est déjà là ; après 300 ms, la petite flamme et ce qui charge, dans le bloc seulement, puis,
 * après 4 s, « Chargement plus long que d'habitude » (m248). La zone `status` existe dès le
 * départ, vide, pour que le texte soit annoncé.
 */
export function ChargementBloc({ texte }: Props) {
  return (
    <div aria-busy="true" className="py-[18px]">
      <ChargementEnLigne texte={texte} />
    </div>
  )
}
