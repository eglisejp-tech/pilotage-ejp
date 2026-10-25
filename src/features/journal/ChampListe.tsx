import type { ChangeEvent, ReactNode } from 'react'
import { ListeDeroulante } from '@/components/ui/ListeDeroulante'

interface Props {
  libelle: string
  valeur: string
  surChoix: (valeur: string) => void
  children: ReactNode
}

/**
 * Un filtre de l'écran 06 (maquette 06) : son libellé au-dessus, puis une vraie liste de choix de
 * 44 px de haut (la liste commune, T69 : texte de 16 px, flèche dessinée), nommée par son libellé
 * pour les lecteurs d'écran. Pleine largeur sur téléphone, 220 px à partir de 600 px.
 */
export function ChampListe({ libelle, valeur, surChoix, children }: Props) {
  return (
    <label className="flex w-full min-w-0 flex-col gap-1.5 text-detail font-semibold tablette:w-auto">
      {libelle}
      <ListeDeroulante
        taille="filtre"
        value={valeur}
        onChange={(evenement: ChangeEvent<HTMLSelectElement>) => surChoix(evenement.target.value)}
        className="w-full tablette:w-[220px]"
      >
        {children}
      </ListeDeroulante>
    </label>
  )
}
