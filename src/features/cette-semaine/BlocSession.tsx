import { useId } from 'react'
import { Link } from 'react-router'
import { BarreSession } from './BarreSession'
import { MessageVide } from './MessageVide'
import { TEXTES_VIDES } from './textesVides'
import { TitreSection } from './TitreSection'
import type { DerniereSession, DonneesBlocSession, Lien } from './types'

interface Props {
  bloc: DonneesBlocSession
}

function resume({ total, saisis, attendus }: DerniereSession) {
  if (total === null) return TEXTES_VIDES.session.resumeSansSaisie(attendus)
  const presents = total > 1 ? 'STARs présents' : 'STAR présent'
  const ministeres = saisis > 1 ? 'ministères' : 'ministère'
  return `${presents}, selon ${saisis} ${ministeres} sur ${attendus}`
}

/** Liens vers les autres types de session qui en ont une passée (T20), à droite du titre. */
function AutresSessions({ liens }: { liens: Lien[] }) {
  if (liens.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-x-4">
      {liens.map((lien) => (
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
  )
}

/**
 * Bloc de la session : la dernière session passée (ou celle du type choisi par `?session=`),
 * total sans double compte, barre de complétude, puis l'apport de chaque ministère. La liste
 * s'affiche à partir de 1024 px (maquette 01) ; en dessous, la ligne « À saisir » la remplace à
 * l'écran (02, 03) et la liste reste lue par les lecteurs d'écran.
 *
 * Sans session, le bloc garde son titre, son filet et ses liens, et dit ce qui manque : aucune
 * session déclarée, ou aucune session du type demandé (T22).
 */
export function BlocSession({ bloc }: Props) {
  const idTitre = useId()

  if (bloc.etat !== 'session') {
    const sansType = bloc.etat === 'aucune_session'
    return (
      <section aria-labelledby={idTitre} className="flex min-w-0 flex-col">
        <TitreSection
          id={idTitre}
          titre={sansType ? TEXTES_VIDES.session.titre : bloc.titre}
          complement={<AutresSessions liens={sansType ? [] : bloc.autres} />}
        />
        <MessageVide>
          {sansType
            ? TEXTES_VIDES.session.aucuneSession
            : TEXTES_VIDES.session.aucuneSessionDuType[bloc.type]}
        </MessageVide>
      </section>
    )
  }

  const { session } = bloc
  const manquants = session.apports
    .filter((apport) => apport.valeur === null)
    .map((apport) => apport.ministere)

  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col gap-3 min-[600px]:gap-4">
      <TitreSection
        id={idTitre}
        titre={session.titre}
        complement={<AutresSessions liens={session.autres} />}
      />
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 min-[600px]:gap-x-4">
        {session.total === null ? (
          <span className="font-lecture text-[22px] leading-tight text-encre-3">
            {TEXTES_VIDES.session.totalSansSaisie}
          </span>
        ) : (
          <span className="font-chiffres text-[clamp(60px,8vw,88px)] leading-[0.8] font-black tabular-nums">
            {session.total}
          </span>
        )}
        <span className="text-sm text-encre-2 min-[600px]:text-[15px] lg:text-base">
          {resume(session)}
        </span>
      </p>
      {session.noteDoubleCompte ? (
        <p className="text-sm text-encre-2">{session.noteDoubleCompte}</p>
      ) : null}
      {/* Aucun ministère attendu : ni barre vide, ni liste vide, le résumé le dit. */}
      {session.apports.length > 0 ? <BarreSession apports={session.apports} /> : null}
      {manquants.length > 0 ? (
        <p className="text-sm text-encre-2 lg:hidden">
          À saisir : <strong className="font-bold text-attention">{manquants.join(', ')}</strong>
        </p>
      ) : null}
      {session.apports.length > 0 ? (
        <ul className="sr-only lg:not-sr-only lg:grid lg:grid-cols-2 lg:gap-x-10">
          {session.apports.map((apport) => (
            <li
              key={apport.ministere}
              className="flex justify-between gap-3 border-b border-filet py-[7px] text-sm"
            >
              <span>{apport.ministere}</span>
              {apport.valeur === null ? (
                <span className="font-bold text-attention">
                  {TEXTES_VIDES.session.apportManquant}
                </span>
              ) : (
                <span className="tabular-nums">
                  {apport.valeur}
                  {apport.saisis !== null && apport.saisis !== apport.valeur ? (
                    <span className="text-encre-3"> ({apport.saisis} saisis)</span>
                  ) : null}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
