import { useState } from 'react'
import { EtatVide } from '@/components/etats/EtatVide'
import type { LigneRetiree } from '@/features/fiche/modeleFiche'
import { TEXTES_VIDES_INDICATEURS } from '@/features/indicateurs/textesVides'

interface Props {
  retires: LigneRetiree[]
}

/**
 * Bloc « Retirés », replié : les indicateurs que le ministère ne suit plus, avec la date du
 * retrait. Leurs saisies restent dans l'historique. Sans retiré : « Aucun indicateur retiré. »
 */
export function RetiresFiche({ retires }: Props) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <details
      open={ouvert}
      onToggle={(evenement) => setOuvert(evenement.currentTarget.open)}
      className="mt-6"
    >
      <summary className="inline-flex min-h-cible cursor-pointer items-center text-[15px] font-semibold underline underline-offset-4">
        Retirés ({retires.length})
      </summary>
      {retires.length === 0 ? (
        <EtatVide situation="aucun_resultat">{TEXTES_VIDES_INDICATEURS.aucunRetire}</EtatVide>
      ) : (
        <ul className="flex flex-col">
          {retires.map((retire) => (
            <li
              key={retire.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-filet py-2.5 text-[15px]"
            >
              <span>{retire.libelle}</span>
              <span className="text-sm text-encre-3">{retire.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </details>
  )
}
