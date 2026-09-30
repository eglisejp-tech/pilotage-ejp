import type { ReactNode } from 'react'

interface Props {
  id: string
  titre: string
  /** Complément à droite du titre : lien, total ou note. */
  complement?: ReactNode
}

/** Titre de section en serif, souligné d'un filet de 2 px (BRIEF, section 10). */
export function TitreSection({ id, titre, complement }: Props) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b-2 border-encre pb-3">
      <h2 id={id} className="font-lecture text-section leading-tight font-medium">
        {titre}
      </h2>
      {complement}
    </div>
  )
}
