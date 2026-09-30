import { useId } from 'react'
import { Link } from 'react-router'
import { BarreSession } from './BarreSession'
import { TitreSection } from './TitreSection'
import type { DerniereSession } from './types'

interface Props {
  session: DerniereSession | null
}

function resume({ total, saisis, attendus }: DerniereSession) {
  const presents = total > 1 ? 'STARs présents' : 'STAR présent'
  const ministeres = saisis > 1 ? 'ministères' : 'ministère'
  return `${presents}, selon ${saisis} ${ministeres} sur ${attendus}`
}

/**
 * Dernière session passée : total sans double compte, barre de complétude, puis l'apport de
 * chaque ministère. La liste s'affiche à partir de 1024 px (maquette 01) ; en dessous, la ligne
 * « À saisir » la remplace à l'écran (02, 03) et la liste reste lue par les lecteurs d'écran.
 */
export function BlocSession({ session }: Props) {
  const idTitre = useId()

  if (session === null) {
    return (
      <section aria-labelledby={idTitre} className="flex min-w-0 flex-col gap-4">
        <TitreSection id={idTitre} titre="Dernière session" />
        <p className="text-encre-2">Aucune session déclarée.</p>
      </section>
    )
  }

  const manquants = session.apports
    .filter((apport) => apport.valeur === null)
    .map((apport) => apport.ministere)

  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col gap-3 min-[600px]:gap-4">
      <TitreSection
        id={idTitre}
        titre={session.titre}
        complement={
          session.autres.length > 0 ? (
            <ul className="flex flex-wrap gap-x-4">
              {session.autres.map((lien) => (
                <li key={lien.href}>
                  <Link
                    to={lien.href}
                    className="-my-3 inline-flex min-h-cible items-center text-sm text-nuit underline underline-offset-4"
                  >
                    {lien.libelle}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null
        }
      />
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 min-[600px]:gap-x-4">
        <span className="font-chiffres text-[clamp(60px,8vw,88px)] leading-[0.8] font-black tabular-nums">
          {session.total}
        </span>
        <span className="text-sm text-encre-2 min-[600px]:text-[15px] lg:text-base">
          {resume(session)}
        </span>
      </p>
      {session.noteDoubleCompte ? (
        <p className="text-sm text-encre-2">{session.noteDoubleCompte}</p>
      ) : null}
      <BarreSession apports={session.apports} />
      {manquants.length > 0 ? (
        <p className="text-sm text-encre-2 lg:hidden">
          À saisir : <strong className="font-bold text-attention">{manquants.join(', ')}</strong>
        </p>
      ) : null}
      <ul className="sr-only lg:not-sr-only lg:grid lg:grid-cols-2 lg:gap-x-10">
        {session.apports.map((apport) => (
          <li
            key={apport.ministere}
            className="flex justify-between gap-3 border-b border-filet py-[7px] text-sm"
          >
            <span>{apport.ministere}</span>
            {apport.valeur === null ? (
              <span className="font-bold text-attention">À saisir</span>
            ) : (
              <span className="tabular-nums">
                {apport.valeur}
                {apport.saisis !== undefined && apport.saisis !== apport.valeur ? (
                  <span className="text-encre-3"> ({apport.saisis} saisis)</span>
                ) : null}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
