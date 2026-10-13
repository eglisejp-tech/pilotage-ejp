import { useMotChargement } from '@/components/etats/useMotChargement'

/**
 * Chargement de la session : rien pendant 300 ms, puis « Chargement », sans animation, avec
 * aria-busy (docs/reference/maquettes/LISEZMOI.md, « États ») ; après 4 s, « Chargement plus long
 * que d'habitude », dans la même zone (m248), avant l'écran d'erreur à 10 s.
 */
export function EcranChargement() {
  const mot = useMotChargement()

  return (
    <main
      id="contenu"
      aria-busy="true"
      className="flex min-h-dvh items-center justify-center bg-fond text-encre-3"
    >
      <div role="status">{mot === null ? null : <p>{mot}</p>}</div>
    </main>
  )
}
