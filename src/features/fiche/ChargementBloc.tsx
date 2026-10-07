import { useEffect, useState } from 'react'
import { TEXTES_FICHE } from '@/features/fiche/textesFiche'

/** « Chargement » n'apparaît qu'après 300 ms : une réponse rapide ne fait rien clignoter. */
const DELAI_CHARGEMENT = 300

/**
 * Chargement d'un écran ou d'un bloc de la fiche (LISEZMOI, « États ») : la zone `status` existe
 * dès le départ, vide, et « Chargement » y entre après 300 ms, en `--encre-3`, sans animation.
 */
export function ChargementBloc() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const minuterie = setTimeout(() => setVisible(true), DELAI_CHARGEMENT)
    return () => clearTimeout(minuterie)
  }, [])
  return (
    <div aria-busy="true" className="py-[18px]">
      <p role="status" className="text-encre-3">
        {visible ? TEXTES_FICHE.chargement : null}
      </p>
    </div>
  )
}
