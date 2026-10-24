import type { ComponentProps } from 'react'
import { Champ } from '@/components/ui/Champ'

type Props = Omit<
  ComponentProps<'input'>,
  'id' | 'type' | 'className' | 'aria-invalid' | 'aria-describedby'
> & {
  id: string
  libelle: string
  /**
   * Indication sous le champ, lue avec lui (« Les cultes du dimanche ne se déclarent pas ici. ») :
   * ce qu'il faut savoir pour bien remplir se voit, jamais dans une bulle (T66).
   */
  note?: string
  /** Message sous le champ, relié par `aria-describedby`. */
  erreur?: string
}

/**
 * Champ heure d'un événement (T68) : libellé, champ `type="time"` de 52 px comme la date, puis
 * l'indication et le message d'erreur. La valeur est « 19:05 » ; le schéma la change en minutes.
 */
export function ChampHeure({ id, libelle, note, erreur, ...proprietes }: Props) {
  const idNote = `${id}-note`
  const idErreur = `${id}-erreur`
  const decritPar = [note ? idNote : '', erreur ? idErreur : ''].filter(Boolean).join(' ')
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-interface font-semibold">
        {libelle}
      </label>
      <Champ
        {...proprietes}
        id={id}
        type="time"
        aria-invalid={erreur ? true : undefined}
        aria-describedby={decritPar || undefined}
      />
      {note ? (
        <p id={idNote} className="text-detail leading-normal text-encre-2">
          {note}
        </p>
      ) : null}
      {erreur ? (
        <p id={idErreur} className="text-interface leading-normal text-alerte">
          {erreur}
        </p>
      ) : null}
    </div>
  )
}
