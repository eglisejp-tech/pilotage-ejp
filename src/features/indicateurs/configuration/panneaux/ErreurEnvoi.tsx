import { useEffect, useRef } from 'react'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'

interface Props {
  message: string
}

/**
 * Le refus de la base ou la connexion perdue, à l'envoi d'un panneau ou d'une fenêtre. Il se place
 * juste sous le bouton qui l'a provoqué et vient dans la vue : sur mobile, un message posé plus bas
 * (sous « Annuler ») sortirait de l'écran après l'appui. Le texte écrit n'est jamais effacé.
 */
export function ErreurEnvoi({ message }: Props) {
  const racine = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // jsdom (tests) n'a pas `scrollIntoView`.
    racine.current?.scrollIntoView?.({ block: 'nearest' })
  }, [message])
  return (
    <div ref={racine}>
      <ErreurFormulaire message={message} />
    </div>
  )
}
