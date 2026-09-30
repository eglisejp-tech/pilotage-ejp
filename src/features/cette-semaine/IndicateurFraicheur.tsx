import type { Fraicheur } from './types'

const couleurs: Record<Fraicheur['etat'], string> = {
  a_jour: 'text-bien',
  a_surveiller: 'text-attention',
  en_retard: 'text-alerte',
}

interface Props {
  fraicheur: Fraicheur
}

/** Fraîcheur d'un ministère : un carré de couleur, toujours suivi de son libellé (règle 6). */
export function IndicateurFraicheur({ fraicheur }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-sm font-semibold whitespace-nowrap ${couleurs[fraicheur.etat]}`}
    >
      <span aria-hidden="true" className="size-2 shrink-0 bg-current" />
      {fraicheur.libelle}
    </span>
  )
}
