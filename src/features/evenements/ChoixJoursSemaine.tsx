import type { Ref } from 'react'
import { JOURS_SEMAINE, TEXTES_PLAGES } from '@/features/evenements/textesPlages'

interface Props {
  /** Préfixe des identifiants et nom du groupe de cases. */
  id: string
  /** Jours cochés, numéros ISO en texte (« 1 » pour lundi). */
  valeur: readonly string[]
  onChange: (jours: string[]) => void
  onBlur?: () => void
  /** Reçoit la première case, pour y porter le focus quand aucun jour n'est coché. */
  refPremier?: Ref<HTMLInputElement>
  erreur?: string
}

/**
 * « Jours de la semaine » d'une série (T78, lot 2 ; conception 5.5) : sept cases de 44 px, de
 * « lun. » à « dim. », dans un `fieldset` avec sa légende. Le jour coché passe en fond `--encre`
 * et en gras, jamais la couleur seule ; chaque case se lit en entier (« lundi »).
 */
export function ChoixJoursSemaine({ id, valeur, onChange, onBlur, refPremier, erreur }: Props) {
  const idErreur = `${id}-erreur`
  const basculer = (jour: string, coche: boolean) =>
    onChange(coche ? [...valeur, jour] : valeur.filter((autre) => autre !== jour))

  return (
    <fieldset
      aria-describedby={erreur ? idErreur : undefined}
      className="flex min-w-0 flex-col gap-1.5"
    >
      <legend className="mb-1.5 text-interface font-semibold">{TEXTES_PLAGES.libelleJours}</legend>
      <div className="grid grid-cols-7 gap-1">
        {JOURS_SEMAINE.map((jour, rang) => {
          const numero = String(jour.numero)
          return (
            <label key={jour.numero} className="relative flex min-w-0 focus-within:z-10">
              <input
                ref={rang === 0 ? refPremier : undefined}
                type="checkbox"
                name={id}
                value={numero}
                checked={valeur.includes(numero)}
                onChange={(evenement) => basculer(numero, evenement.target.checked)}
                onBlur={onBlur}
                aria-invalid={erreur ? true : undefined}
                aria-label={jour.long}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="flex min-h-11 w-full min-w-11 cursor-pointer items-center justify-center border border-encre bg-papier text-interface font-medium text-encre peer-checked:bg-encre peer-checked:font-bold peer-checked:text-papier peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-encre"
              >
                {jour.court}
              </span>
            </label>
          )
        })}
      </div>
      {erreur ? (
        <p id={idErreur} className="text-interface leading-normal text-alerte">
          {erreur}
        </p>
      ) : null}
    </fieldset>
  )
}
