import { useId } from 'react'
import { Aide } from '@/components/aide/Aide'
import type { CodeAide } from '@/components/aide/textesAide'
import { garderChiffres } from '@/features/saisie/chiffres'
import { TEXTES_CHIFFRES } from '@/features/saisie-chiffres/textes'

interface Props {
  id: string
  libelle: string
  valeur: { heures: string; minutes: string }
  onChange: (valeur: { heures: string; minutes: string }) => void
  aide?: CodeAide | null
  definition?: string
  erreur?: string
}

const classeChamp =
  'h-14.5 w-full min-w-0 border border-encre bg-papier text-center font-chiffres text-[32px] font-black text-encre tabular-nums aria-invalid:border-2 aria-invalid:border-alerte'

/**
 * Champ d'une heure (unité « heure », BRIEF section 4) : deux champs, les heures et les minutes,
 * rendus en minutes depuis minuit par le schéma partagé (`schemaHeure`). Le format reste un texte
 * visible (aides-contextuelles.md, section 8). Le groupe porte le libellé de l'indicateur ; son
 * aide, s'il en a une, est à côté du libellé, hors des `<label>`.
 */
export function ChampHeure({ id, libelle, valeur, onChange, aide, definition, erreur }: Props) {
  const idLibelle = useId()
  const idDefinition = `${id}-definition`
  const idFormat = `${id}-format`
  const idErreur = `${id}-erreur`
  const decritPar = [definition ? idDefinition : '', idFormat, erreur ? idErreur : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div role="group" aria-labelledby={idLibelle} className="flex flex-col gap-1.5">
      <div className="flex min-h-cible flex-wrap items-center">
        <p id={idLibelle} className="text-sm font-semibold">
          {libelle}
        </p>
        {aide ? <Aide code={aide} libelle={libelle} /> : null}
      </div>
      {definition ? (
        <p id={idDefinition} className="text-sm leading-normal text-encre-3">
          {definition}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={id} className="text-note text-encre-2">
            {TEXTES_CHIFFRES.heures}
          </label>
          <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={2}
            value={valeur.heures}
            onChange={(evenement) =>
              onChange({ ...valeur, heures: garderChiffres(evenement.target.value) })
            }
            aria-invalid={erreur ? true : undefined}
            aria-describedby={decritPar}
            className={classeChamp}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-minutes`} className="text-note text-encre-2">
            {TEXTES_CHIFFRES.minutes}
          </label>
          <input
            id={`${id}-minutes`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={2}
            value={valeur.minutes}
            onChange={(evenement) =>
              onChange({ ...valeur, minutes: evenement.target.value.replace(/\D/g, '') })
            }
            aria-invalid={erreur ? true : undefined}
            aria-describedby={decritPar}
            className={classeChamp}
          />
        </div>
      </div>
      <p id={idFormat} className="text-note text-encre-3">
        {TEXTES_CHIFFRES.formatHeure}
      </p>
      {erreur ? (
        <p id={idErreur} className="text-[15px] leading-normal text-alerte">
          {erreur}
        </p>
      ) : null}
    </div>
  )
}
