import { LibelleAvecAide } from '@/components/aide/LibelleAvecAide'
import type { CodeAide } from '@/components/aide/textesAide'

interface Props {
  id: string
  libelle: string
  valeur: string
  onChange: (valeur: string) => void
  options: readonly { valeur: string; libelle: string }[]
  /** Premier choix, sans valeur : « Choisissez un chiffre ». */
  invite: string
  erreur?: string
  /** Phrase visible sous la liste. */
  note?: string
  /** Aide facultative, à côté du libellé. */
  aide?: CodeAide
}

/**
 * Liste déroulante d'un panneau de configuration (« Chiffre du haut », « Chiffre du bas ») : champ
 * de 56 px comme les autres champs, l'erreur et la note sous le champ, reliées par
 * `aria-describedby`.
 */
export function ChampListe({
  id,
  libelle,
  valeur,
  onChange,
  options,
  invite,
  erreur,
  note,
  aide,
}: Props) {
  const idNote = `${id}-note`
  const idErreur = `${id}-erreur`
  const decritPar = [note ? idNote : '', erreur ? idErreur : ''].filter(Boolean).join(' ')
  return (
    <div className="flex flex-col gap-1.5">
      {aide ? (
        <LibelleAvecAide htmlFor={id} libelle={libelle} code={aide} />
      ) : (
        <label htmlFor={id} className="text-[15px] font-semibold">
          {libelle}
        </label>
      )}
      <select
        id={id}
        value={valeur}
        onChange={(evenement) => onChange(evenement.target.value)}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={decritPar || undefined}
        className="h-14 w-full min-w-0 border border-encre bg-papier px-3.5 text-base text-encre aria-invalid:border-2 aria-invalid:border-alerte"
      >
        <option value="">{invite}</option>
        {options.map((option) => (
          <option key={option.valeur} value={option.valeur}>
            {option.libelle}
          </option>
        ))}
      </select>
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
