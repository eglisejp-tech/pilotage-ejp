import { useState } from 'react'
import type { LigneRetiree } from '@/features/indicateurs/configuration/lignes'
import { TEXTES_CONFIGURATION } from '@/features/indicateurs/configuration/textes'

interface Props {
  retires: LigneRetiree[]
}

/**
 * « Retirés (2) », replié (7.2) : les indicateurs que le ministère ne suit plus, avec la date et le
 * motif du retrait. Leurs saisies restent sur la fiche. Rien à montrer : le bloc n'existe pas
 * (un bloc de plus sans contenu n'aide personne).
 */
export function RetiresConfiguration({ retires }: Props) {
  const [ouvert, setOuvert] = useState(false)
  if (retires.length === 0) return null
  return (
    <details
      open={ouvert}
      onToggle={(evenement) => setOuvert(evenement.currentTarget.open)}
      className="mt-6"
    >
      <summary className="inline-flex min-h-cible cursor-pointer items-center text-[15px] font-semibold underline underline-offset-4">
        {TEXTES_CONFIGURATION.ministere.titreRetires} ({retires.length})
      </summary>
      <ul>
        {retires.map((retire) => (
          <li
            key={retire.id}
            className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-filet py-2.5 text-[15px]"
          >
            <span className="min-w-0 break-words">
              {retire.libelle} <span className="text-note text-encre-3">({retire.rythme})</span>
            </span>
            <span className="text-sm text-encre-3">{retire.detail}</span>
          </li>
        ))}
      </ul>
    </details>
  )
}
