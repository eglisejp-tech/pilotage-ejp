import { useId } from 'react'
import { Aide } from '@/components/aide/Aide'
import type { OptionMinistere } from '@/features/points/modelePoints'
import { TEXTES_POINTS } from '@/features/points/textesPoints'

interface Props {
  options: readonly OptionMinistere[]
  /** Ministère retenu ; null : « Tous les ministères ». */
  choisi: OptionMinistere | null
  /** Identifiant du ministère choisi, ou null pour « Tous les ministères ». */
  surChoix: (id: string | null) => void
}

/**
 * Filtre « Tous les ministères » (maquette 05, berger, conseil et EJP Tech) : les points créés par
 * le ministère choisi et ceux qui le mentionnent. Un vrai choix de liste, nommé pour les lecteurs
 * d'écran, avec son aide `points.filtre` (T38). Le ministère n'a pas ce filtre.
 */
export function FiltreMinistere({ options, choisi, surChoix }: Props) {
  const idChoix = useId()
  return (
    <div data-ligne-aide className="flex items-center">
      <label htmlFor={idChoix} className="sr-only">
        {TEXTES_POINTS.filtre.libelle}
      </label>
      <select
        id={idChoix}
        value={choisi?.id ?? ''}
        onChange={(evenement) =>
          surChoix(evenement.target.value === '' ? null : evenement.target.value)
        }
        className="min-h-cible max-w-full min-w-0 border border-encre-3 bg-papier px-3 text-sm text-encre"
      >
        <option value="">{TEXTES_POINTS.filtre.tous}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.nom}
          </option>
        ))}
      </select>
      <Aide code="points.filtre" libelle={TEXTES_POINTS.filtre.libelle} placement="flottante" />
    </div>
  )
}
