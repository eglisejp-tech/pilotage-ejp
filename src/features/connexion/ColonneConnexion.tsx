import type { ReactNode } from 'react'

type Proprietes = {
  /** Barre du haut sur fond papier (écran 17 : « Se déconnecter » et libellé du compte). */
  barre?: ReactNode
  children: ReactNode
}

/**
 * Colonne commune aux écrans de connexion (maquettes 16 à 18 et écrans dérivés) : 390 à 440 px,
 * centrée, à toutes les tailles d'écran (docs/reference/maquettes/LISEZMOI.md).
 */
export function ColonneConnexion({ barre, children }: Proprietes) {
  return (
    <div className="min-h-dvh bg-fond text-encre">
      {barre}
      <main
        id="contenu"
        className={`mx-auto flex w-full max-w-[27.5rem] flex-col gap-6 px-5 pb-6 ${barre ? 'pt-6.5' : 'pt-14 lg:pt-20'}`}
      >
        {children}
      </main>
    </div>
  )
}
