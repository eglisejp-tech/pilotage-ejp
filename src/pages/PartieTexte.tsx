import type { ReactNode } from 'react'

type Proprietes = {
  titre: string
  children: ReactNode
}

/** Partie d'une page de texte (Confidentialité, Conditions d'utilisation) : un titre, son texte. */
export function PartieTexte({ titre, children }: Proprietes) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-lecture text-xl font-medium">{titre}</h2>
      {children}
    </section>
  )
}
