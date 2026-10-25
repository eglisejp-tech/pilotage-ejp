import { useId } from 'react'
import { ListeDeroulante } from '@/components/ui/ListeDeroulante'
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
 * d'écran, sans bulle (T66, t249). Le ministère n'a pas ce filtre. La liste commune (T69) : 44 px,
 * texte de 16 px (Safari sur iPhone ne zoome plus), bordure encre et flèche dessinée.
 */
export function FiltreMinistere({ options, choisi, surChoix }: Props) {
  const idChoix = useId()
  return (
    <div className="flex items-center">
      <label htmlFor={idChoix} className="sr-only">
        {TEXTES_POINTS.filtre.libelle}
      </label>
      <ListeDeroulante
        id={idChoix}
        taille="filtre"
        value={choisi?.id ?? ''}
        onChange={(evenement) =>
          surChoix(evenement.target.value === '' ? null : evenement.target.value)
        }
        className="max-w-full"
      >
        <option value="">{TEXTES_POINTS.filtre.tous}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.nom}
          </option>
        ))}
      </ListeDeroulante>
    </div>
  )
}
