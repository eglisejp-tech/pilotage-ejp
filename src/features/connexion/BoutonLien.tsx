import type { ReactNode } from 'react'

type Proprietes = {
  onClick: () => void
  children: ReactNode
}

/** Action dessinée comme un lien (« Se déconnecter », maquettes 17 et 18), cible de 44 px. */
export function BoutonLien({ onClick, children }: Proprietes) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-cible items-center self-start text-left text-[15px] text-nuit underline underline-offset-4"
    >
      {children}
    </button>
  )
}
