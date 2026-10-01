import { useEffect, useState } from 'react'

const DELAI_AFFICHAGE = 300

/**
 * Chargement de la session : rien pendant 300 ms, puis « Chargement », sans animation, avec
 * aria-busy (docs/reference/maquettes/LISEZMOI.md, « États »).
 */
export function EcranChargement() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const minuterie = setTimeout(() => setVisible(true), DELAI_AFFICHAGE)
    return () => clearTimeout(minuterie)
  }, [])

  return (
    <main
      id="contenu"
      aria-busy="true"
      className="flex min-h-dvh items-center justify-center bg-fond text-encre-3"
    >
      {visible ? <p>Chargement</p> : null}
    </main>
  )
}
