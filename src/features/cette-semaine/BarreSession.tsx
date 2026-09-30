import type { ApportSession } from './types'

interface Props {
  apports: ApportSession[]
}

/**
 * Barre de complétude de la session : un segment bleu nuit par apport, proportionnel à sa
 * valeur, et une case en pointillés orange pour chaque ministère attendu qui n'a pas saisi
 * (de la largeur d'un apport moyen). Décorative : la liste des apports porte l'information.
 */
export function BarreSession({ apports }: Props) {
  const saisis = apports.flatMap((apport) => (apport.valeur === null ? [] : [apport.valeur]))
  const moyenne =
    saisis.length > 0 ? saisis.reduce((somme, valeur) => somme + valeur, 0) / saisis.length : 1

  return (
    <div
      aria-hidden="true"
      data-testid="barre-session"
      className="flex h-6 gap-0.5 min-[600px]:h-[30px] min-[600px]:gap-[3px] lg:h-[34px]"
    >
      {apports.map((apport) =>
        apport.valeur === null ? (
          <div
            key={apport.ministere}
            data-a-saisir=""
            style={{ flexGrow: Math.max(moyenne, 1) }}
            className="flex min-w-0 basis-0 items-center overflow-hidden border-2 border-dashed border-attention px-1.5"
          >
            <span className="hidden truncate text-note font-semibold text-attention lg:inline">
              À saisir
            </span>
          </div>
        ) : (
          <div
            key={apport.ministere}
            style={{ flexGrow: Math.max(apport.valeur, 0.5) }}
            className="flex min-w-0 basis-0 items-center overflow-hidden bg-nuit pl-1.5 font-chiffres text-base font-extrabold text-papier tabular-nums"
          >
            {apport.valeur}
          </div>
        ),
      )}
    </div>
  )
}
