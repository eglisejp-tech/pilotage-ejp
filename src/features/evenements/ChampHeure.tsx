import type { ComponentProps } from 'react'

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
      <label htmlFor={id} className="text-[15px] font-semibold">
        {libelle}
      </label>
      <input
        {...proprietes}
        id={id}
        type="time"
        aria-invalid={erreur ? true : undefined}
        aria-describedby={decritPar || undefined}
        className="h-13 w-full min-w-0 border border-encre bg-papier px-3.5 text-base text-encre aria-invalid:border-2 aria-invalid:border-alerte"
      />
      {note ? (
        <p id={idNote} className="text-sm leading-normal text-encre-2">
          {note}
        </p>
      ) : null}
      {erreur ? (
        <p id={idErreur} className="text-[15px] leading-normal text-alerte">
          {erreur}
        </p>
      ) : null}
    </div>
  )
}
