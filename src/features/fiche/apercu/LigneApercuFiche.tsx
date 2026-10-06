import { Aide } from '@/components/aide/Aide'
import type { CodeAide } from '@/components/aide/textesAide'

interface Props {
  libelle: string
  valeur: string
  aide?: CodeAide
}

/**
 * Ligne de lecture de l'aperçu de la fiche (/apercu/fiche) : un libellé, son aide en bulle
 * « flottante », une valeur. La bulle s'ouvre sous la ligne et ne recouvre ni son bouton ni la
 * valeur qu'elle explique (`e2e/aide.spec.ts`).
 */
export function LigneApercuFiche({ libelle, valeur, aide }: Props) {
  return (
    <li className="flex min-h-cible flex-wrap items-center justify-between gap-x-4 border-b border-filet">
      <span className="flex items-center">
        <span>{libelle}</span>
        {aide ? <Aide code={aide} libelle={libelle} placement="flottante" /> : null}
      </span>
      <span className="font-chiffres text-[28px] font-extrabold tabular-nums">{valeur}</span>
    </li>
  )
}
