import type { ChangeEvent, ReactNode } from 'react'

interface Props {
  libelle: string
  valeur: string
  surChoix: (valeur: string) => void
  children: ReactNode
}

/**
 * Un filtre de l'écran 06 (maquette 06) : son libellé au-dessus, puis une vraie liste de choix de
 * 44 px de haut, nommée par son libellé pour les lecteurs d'écran. Pleine largeur sur téléphone.
 */
export function ChampListe({ libelle, valeur, surChoix, children }: Props) {
  return (
    <label className="flex w-full min-w-0 flex-col gap-1.5 text-sm font-semibold sm:w-auto">
      {libelle}
      <select
        value={valeur}
        onChange={(evenement: ChangeEvent<HTMLSelectElement>) => surChoix(evenement.target.value)}
        className="min-h-cible w-full min-w-0 border border-encre bg-papier px-3 text-[15px] font-normal text-encre sm:w-[220px]"
      >
        {children}
      </select>
    </label>
  )
}
