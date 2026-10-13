import { useMotChargement } from '@/components/etats/useMotChargement'

/**
 * Chargement d'une saisie (LISEZMOI, « États ») : le titre du panneau tout de suite, puis
 * « Chargement » en `--encre-3` après 300 ms, avec `aria-busy`, et « Chargement plus long que
 * d'habitude » après 4 s (m248). La zone `status` existe dès le départ, vide, pour que les
 * lecteurs d'écran annoncent le mot à son arrivée.
 */
export function ChargementSaisie() {
  const mot = useMotChargement()
  return (
    <div aria-busy="true">
      <p role="status" className="text-encre-3">
        {mot}
      </p>
    </div>
  )
}
