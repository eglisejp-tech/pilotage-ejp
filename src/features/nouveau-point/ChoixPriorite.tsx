import type { Ref } from 'react'
import { Aide } from '@/components/aide/Aide'
import { PRIORITES_POINT, TEXTES_POINT } from '@/features/nouveau-point/textes'

interface Props {
  /** Préfixe des identifiants et nom du groupe de boutons radio. */
  id: string
  /** Priorité choisie (« normale » au départ). */
  valeur: string
  onChange: (priorite: string) => void
  onBlur?: () => void
  /** Reçoit le premier bouton. */
  refPremier?: Ref<HTMLInputElement>
  erreur?: string
}

/**
 * Choix de la priorité (maquette 10) : trois vrais boutons radio côte à côte, le choix en fond
 * `--encre` et en gras (jamais la couleur seule). Le titre « Priorité » et son aide sont hors
 * d'une `<legend>` (le nom du groupe garderait « Aide : ... ») : le groupe le lit par
 * `aria-labelledby`, comme le statut d'un événement.
 */
export function ChoixPriorite({ id, valeur, onChange, onBlur, refPremier, erreur }: Props) {
  const idTitre = `${id}-titre`
  const idErreur = `${id}-erreur`
  return (
    <fieldset
      aria-labelledby={idTitre}
      aria-describedby={erreur ? idErreur : undefined}
      className="flex min-w-0 flex-col gap-1.5"
    >
      <div className="flex min-h-cible flex-wrap items-center">
        <p id={idTitre} className="text-[15px] font-semibold">
          {TEXTES_POINT.libellePriorite}
        </p>
        <Aide code="point.priorite" libelle={TEXTES_POINT.libellePriorite} />
      </div>
      <div className="flex pl-px">
        {PRIORITES_POINT.map((priorite, rang) => (
          <label key={priorite.valeur} className="relative -ml-px flex flex-1">
            <input
              ref={rang === 0 ? refPremier : undefined}
              type="radio"
              name={id}
              value={priorite.valeur}
              checked={valeur === priorite.valeur}
              onChange={() => onChange(priorite.valeur)}
              onBlur={onBlur}
              aria-invalid={erreur ? true : undefined}
              aria-describedby={erreur ? idErreur : undefined}
              className="peer sr-only"
            />
            <span className="flex min-h-12 w-full cursor-pointer items-center justify-center border border-encre bg-papier px-2 py-1 text-center text-[15px] leading-tight font-medium text-encre peer-checked:bg-encre peer-checked:font-bold peer-checked:text-papier peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-encre">
              {priorite.libelle}
            </span>
          </label>
        ))}
      </div>
      {erreur ? (
        <p id={idErreur} className="text-[15px] leading-normal text-alerte">
          {erreur}
        </p>
      ) : null}
    </fieldset>
  )
}
