import type { ReactNode, Ref } from 'react'

// Tailles des maquettes : 16 (40 px), 18 (36 px), 17 et son titre sur deux lignes (32 px).
const TAILLES = {
  grande: { titre: 'text-[2.5rem] leading-[1.05]', phrase: 'text-base' },
  moyenne: { titre: 'text-4xl leading-[1.08]', phrase: 'text-base' },
  petite: { titre: 'text-[2rem] leading-[1.1]', phrase: 'text-[15px]' },
} as const

type Proprietes = {
  surtitre: string
  titre: string
  taille?: keyof typeof TAILLES
  /** Phrase sous le titre. */
  children?: ReactNode
  /** Pour y placer le focus quand le contenu de l'écran change (lien refusé, par exemple). */
  ref?: Ref<HTMLHeadingElement>
}

export function TitreConnexion({ surtitre, titre, taille = 'grande', children, ref }: Proprietes) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-sm text-encre-3">{surtitre}</p>
      <h1
        ref={ref}
        tabIndex={-1}
        className={`font-lecture font-medium focus-visible:outline-hidden ${TAILLES[taille].titre}`}
      >
        {titre}
      </h1>
      {children ? (
        <p className={`leading-[1.55] text-encre-2 ${TAILLES[taille].phrase}`}>{children}</p>
      ) : null}
    </div>
  )
}
