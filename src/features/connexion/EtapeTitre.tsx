import type { ReactNode } from 'react'

type Proprietes = {
  numero: number
  children: ReactNode
}

/** Numéro d'étape en Big Shoulders Display et consigne en gras (maquette 17). */
export function EtapeTitre({ numero, children }: Proprietes) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-5.5 shrink-0 font-chiffres text-3xl leading-none font-black">
        {numero}
      </span>
      <div className="min-w-0 text-base leading-[1.4] font-semibold">{children}</div>
    </div>
  )
}
