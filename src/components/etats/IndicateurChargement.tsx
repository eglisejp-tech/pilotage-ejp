import { FlammeVivante } from '@/components/etats/FlammeVivante'
import { useMotChargement } from '@/components/etats/useMotChargement'

interface Props {
  /** Ce qui charge : « Chargement de Ma semaine », « Chargement du journal ». */
  texte: string
}

/**
 * Page de contenu qui charge (T65, moment 2) : rien pendant 300 ms, puis la flamme vivante et le
 * texte qui dit ce qui charge, au centre de la place réservée au contenu ; après 4 s, « Chargement
 * plus long que d'habitude » (m248). La zone `status` existe dès le départ, vide, pour que les
 * lecteurs d'écran annoncent le texte à son arrivée ; la flamme est un dessin (`aria-hidden`).
 * La hauteur est réservée d'emblée : rien ne bouge quand la flamme apparaît.
 */
export function IndicateurChargement({ texte }: Props) {
  const mot = useMotChargement(texte)
  return (
    <div
      role="status"
      className="flex min-h-34 flex-col items-center justify-center gap-2.5 py-4 text-center text-[15px] leading-normal text-encre-2"
    >
      {mot === null ? null : (
        <>
          <FlammeVivante />
          <p>{mot}</p>
        </>
      )}
    </div>
  )
}
