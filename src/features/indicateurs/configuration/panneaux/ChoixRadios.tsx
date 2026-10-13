import { useId } from 'react'

export interface OptionRadio<Valeur extends string> {
  valeur: Valeur
  libelle: string
}

interface Props<Valeur extends string> {
  legende: string
  options: readonly OptionRadio<Valeur>[]
  /** `''` : rien n'est encore choisi. */
  valeur: Valeur | ''
  onChange: (valeur: Valeur) => void
  erreur?: string
  /** Phrase visible sous les choix (la conséquence d'un choix, une règle). */
  note?: string
  /** Les choix sont fixés par la règle d'un autre champ : ils se lisent, ils ne se changent plus. */
  verrouille?: boolean
}

/**
 * Groupe de boutons radio d'un panneau de configuration (« Quand le saisir », « Sorte de nombre »,
 * « Afficher », motif d'un retrait) : une légende, un choix par ligne de 44 px, l'erreur et la note
 * sous le groupe, reliées au groupe par `aria-describedby`.
 */
export function ChoixRadios<Valeur extends string>({
  legende,
  options,
  valeur,
  onChange,
  erreur,
  note,
  verrouille = false,
}: Props<Valeur>) {
  const nom = useId()
  const idNote = `${nom}-note`
  const idErreur = `${nom}-erreur`
  const decritPar = [note ? idNote : '', erreur ? idErreur : ''].filter(Boolean).join(' ')
  return (
    <fieldset aria-describedby={decritPar || undefined} className="flex min-w-0 flex-col gap-0.5">
      <legend className="mb-1 text-[15px] font-semibold">{legende}</legend>
      {options.map((option) => (
        <label
          key={option.valeur}
          className="flex min-h-cible cursor-pointer items-center gap-3 py-1 has-disabled:cursor-default has-disabled:text-encre-3"
        >
          <input
            type="radio"
            name={nom}
            value={option.valeur}
            checked={valeur === option.valeur}
            disabled={verrouille}
            onChange={() => onChange(option.valeur)}
            aria-invalid={erreur ? true : undefined}
            className="size-5 shrink-0 accent-encre focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-encre"
          />
          <span className="text-[15px] leading-snug">{option.libelle}</span>
        </label>
      ))}
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
    </fieldset>
  )
}
