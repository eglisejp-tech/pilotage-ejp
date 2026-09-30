import type { ReactNode } from 'react'
import { Link } from 'react-router'

type Proprietes = {
  to: string
  children: ReactNode
}

/** Lien seul sur sa ligne, comme « Se déconnecter » de la maquette 18 : cible de 44 px. */
export function Lien({ to, children }: Proprietes) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-cible items-center self-start text-[15px] text-nuit underline underline-offset-4"
    >
      {children}
    </Link>
  )
}
