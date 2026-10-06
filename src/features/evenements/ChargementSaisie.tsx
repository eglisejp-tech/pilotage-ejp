import { useEffect, useState } from 'react'
import { TEXTES_VIDES } from '@/features/cette-semaine/textesVides'

/** « Chargement » n'apparaît qu'après 300 ms : une réponse rapide ne fait rien clignoter. */
const DELAI_CHARGEMENT = 300

/**
 * Chargement d'un panneau de saisie (LISEZMOI, « États ») : le titre du panneau est déjà là ;
 * après 300 ms, « Chargement » en `--encre-3` à la place du formulaire, avec `aria-busy`. Pas
 * d'animation. La zone `status` existe dès le départ, vide, pour que le mot soit annoncé.
 */
export function ChargementSaisie() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const minuterie = setTimeout(() => setVisible(true), DELAI_CHARGEMENT)
    return () => clearTimeout(minuterie)
  }, [])

  return (
    <div aria-busy="true">
      <p role="status" className="text-encre-3">
        {visible ? TEXTES_VIDES.page.chargement : null}
      </p>
    </div>
  )
}
