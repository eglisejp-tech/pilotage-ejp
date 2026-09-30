import type { ReactNode, Ref } from 'react'

type Proprietes = {
  id: string
  children: ReactNode
  /** Pour y placer le focus quand l'erreur arrive du serveur. */
  ref?: Ref<HTMLDivElement>
}

/**
 * Bandeau d'erreur de la maquette 16, annoncé par les lecteurs d'écran (role="alert"). Il reçoit
 * le focus par script après une erreur du serveur ; comme il ne se manipule pas, il ne porte pas
 * d'anneau de focus (les titres et messages de confirmation non plus).
 */
export function BandeauErreur({ id, children, ref }: Proprietes) {
  return (
    <div
      ref={ref}
      id={id}
      role="alert"
      tabIndex={-1}
      className="bg-alerte-fond px-3.5 py-3 text-[15px] leading-normal text-alerte focus-visible:outline-hidden"
    >
      {children}
    </div>
  )
}
