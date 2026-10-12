import type { Ref } from 'react'
import { Aide } from '@/components/aide/Aide'
import { phraseCoches, TEXTES_SESSIONS } from '@/features/sessions/textes'

export interface MinistereAChoisir {
  id: string
  nom: string
}

interface Props {
  id: string
  /** Ministères actifs, dans l'ordre alphabétique. */
  ministeres: readonly MinistereAChoisir[]
  /** Identifiants cochés. */
  valeur: readonly string[]
  onChange: (ids: string[]) => void
  refPremier?: Ref<HTMLInputElement>
  erreur?: string
}

/**
 * Ministères attendus d'une session (maquette 14) : une case par ministère actif, toutes cochées
 * à la déclaration, avec « 8 sur 8 » en face du titre. Chaque case fait 44 px de haut au moins.
 */
export function ChoixMinisteres({ id, ministeres, valeur, onChange, refPremier, erreur }: Props) {
  const idTitre = `${id}-titre`
  const idErreur = `${id}-erreur`
  const basculer = (ministere: string, coche: boolean) =>
    onChange(coche ? [...valeur, ministere] : valeur.filter((autre) => autre !== ministere))
  const coches = ministeres.filter((ministere) => valeur.includes(ministere.id)).length

  return (
    <fieldset
      aria-labelledby={idTitre}
      aria-describedby={erreur ? idErreur : undefined}
      className="flex min-w-0 flex-col gap-1"
    >
      <div className="flex min-h-cible items-center justify-between gap-3 border-b border-filet">
        <div className="flex flex-wrap items-center">
          <p id={idTitre} className="text-[15px] font-semibold">
            {TEXTES_SESSIONS.titreMinisteres}
          </p>
          <Aide code="sessions.attendus" libelle={TEXTES_SESSIONS.titreMinisteres} />
        </div>
        <p aria-live="polite" className="text-[15px] text-encre-2">
          {phraseCoches(coches, ministeres.length)}
        </p>
      </div>
      {ministeres.length === 0 ? (
        <p className="py-2 text-encre-2">{TEXTES_SESSIONS.aucunMinistere}</p>
      ) : (
        <ul className="flex flex-col">
          {ministeres.map((ministere, rang) => (
            <li key={ministere.id} className="border-b border-filet">
              <label className="flex min-h-cible items-center gap-3 text-base">
                <input
                  ref={rang === 0 ? refPremier : undefined}
                  type="checkbox"
                  name={id}
                  value={ministere.id}
                  checked={valeur.includes(ministere.id)}
                  onChange={(evenement) => basculer(ministere.id, evenement.target.checked)}
                  aria-invalid={erreur ? true : undefined}
                  className="size-5 accent-encre"
                />
                {ministere.nom}
              </label>
            </li>
          ))}
        </ul>
      )}
      {erreur ? (
        <p id={idErreur} className="text-[15px] leading-normal text-alerte">
          {erreur}
        </p>
      ) : null}
    </fieldset>
  )
}
