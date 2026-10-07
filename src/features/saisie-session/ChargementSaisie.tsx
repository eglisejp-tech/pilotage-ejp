import { useEffect, useState } from 'react'

/** « Chargement » n'apparaît qu'après 300 ms : une réponse rapide ne fait rien clignoter. */
export const DELAI_CHARGEMENT_SAISIE = 300

/**
 * Chargement d'une saisie (LISEZMOI, « États ») : le titre du panneau tout de suite, puis
 * « Chargement » en `--encre-3` après 300 ms, avec `aria-busy`. La zone `status` existe dès le
 * départ, vide, pour que les lecteurs d'écran annoncent le mot à son arrivée.
 */
export function ChargementSaisie() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const minuterie = window.setTimeout(() => setVisible(true), DELAI_CHARGEMENT_SAISIE)
    return () => window.clearTimeout(minuterie)
  }, [])
  return (
    <div aria-busy="true">
      <p role="status" className="text-encre-3">
        {visible ? 'Chargement' : null}
      </p>
    </div>
  )
}
