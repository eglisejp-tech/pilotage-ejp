import { useEffect, useRef } from 'react'

type Proprietes = {
  /** « La connexion a échoué. Réessayez. » */
  message: string
  /** Libellé du bouton : « Réessayer ». */
  libelleBouton: string
  onReessayer: () => void
}

/**
 * Erreur de page d'un écran de lecture (LISEZMOI, « États ») : bandeau en haut du contenu, fond
 * `--alerte-fond`, message annoncé (role="alert") et bouton qui relance la lecture. Le bandeau
 * reçoit le focus à son arrivée, pour que le clavier reparte de là après un nouvel échec ; comme
 * il ne se manipule pas, il ne porte pas d'anneau de focus.
 */
export function ErreurDePage({ message, libelleBouton, onReessayer }: Proprietes) {
  const bandeau = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bandeau.current?.focus()
  }, [])

  return (
    <div
      ref={bandeau}
      tabIndex={-1}
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 bg-alerte-fond px-4 py-3 focus-visible:outline-hidden"
    >
      <p role="alert" className="text-[15px] leading-normal text-alerte">
        {message}
      </p>
      <button
        type="button"
        onClick={onReessayer}
        className="inline-flex min-h-cible items-center border border-encre bg-papier px-4 text-sm font-semibold whitespace-nowrap text-encre hover:bg-fond"
      >
        {libelleBouton}
      </button>
    </div>
  )
}
