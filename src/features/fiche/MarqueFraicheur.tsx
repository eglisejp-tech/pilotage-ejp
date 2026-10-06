import type { EtatFraicheur } from '@/lib/metier/fraicheur'

const COULEURS: Record<EtatFraicheur, string> = {
  bien: 'text-bien',
  attention: 'text-attention',
  alerte: 'text-alerte',
}

interface Props {
  libelle: string
  etat: EtatFraicheur
}

/** Fraîcheur d'un ministère : un carré de couleur, toujours suivi de son libellé (règle 6). */
export function MarqueFraicheur({ libelle, etat }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-[15px] font-semibold whitespace-nowrap ${COULEURS[etat]}`}
    >
      <span aria-hidden="true" className="size-2 shrink-0 bg-current" />
      {libelle}
    </span>
  )
}
