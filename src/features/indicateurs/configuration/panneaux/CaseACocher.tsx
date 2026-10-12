import { useId } from 'react'
import type { ReactNode } from 'react'
import { Aide } from '@/components/aide/Aide'
import type { CodeAide } from '@/components/aide/textesAide'

interface Props {
  libelle: string
  coche: boolean
  onChange: (coche: boolean) => void
  /** La case se lit, elle ne se change plus (le remplaçant d'un indicateur sensible). */
  verrouillee?: boolean
  /** Phrase visible sous la case : sa conséquence. */
  note?: ReactNode
  /** Aide facultative, à côté du libellé (jamais dans le `<label>`). */
  aide?: CodeAide
}

/** Case à cocher d'un panneau de configuration : une ligne de 44 px, sa conséquence dessous. */
export function CaseACocher({ libelle, coche, onChange, verrouillee = false, note, aide }: Props) {
  const id = useId()
  const idNote = `${id}-note`
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex flex-wrap items-center">
        <label className="flex min-h-cible cursor-pointer items-center gap-3 py-1 has-disabled:cursor-default">
          <input
            type="checkbox"
            checked={coche}
            disabled={verrouillee}
            onChange={(evenement) => onChange(evenement.target.checked)}
            aria-describedby={note ? idNote : undefined}
            className="size-5 shrink-0 accent-encre focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-encre"
          />
          <span className="text-[15px] leading-snug font-semibold">{libelle}</span>
        </label>
        {aide ? <Aide code={aide} libelle={libelle} placement="flux" /> : null}
      </div>
      {note ? (
        <p id={idNote} className="text-sm leading-normal text-encre-2">
          {note}
        </p>
      ) : null}
    </div>
  )
}
