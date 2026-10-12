import { Aide } from '@/components/aide/Aide'
import { useLargeurMin } from '@/features/cette-semaine/useLargeurMin'
import { CelluleSaisies } from '@/features/sessions/CelluleSaisies'
import type { LigneSession } from '@/features/sessions/construire'
import { TEXTES_SESSIONS } from '@/features/sessions/textes'
import { LARGEUR_PANNEAU } from '@/features/saisie/textes'

interface Props {
  lignes: readonly LigneSession[]
  idTitre: string
  onModifier: (ligne: LigneSession) => void
  onSupprimer: (ligne: LigneSession) => void
}

const classeBouton =
  'inline-flex min-h-cible items-center justify-center border border-encre bg-papier px-3.5 text-[15px] font-semibold text-encre hover:bg-fond'

function Boutons({
  ligne,
  onModifier,
  onSupprimer,
  pleineLargeur,
}: Omit<Props, 'lignes' | 'idTitre'> & { ligne: LigneSession; pleineLargeur?: boolean }) {
  const classe = pleineLargeur ? `${classeBouton} w-full` : classeBouton
  return (
    <div
      className={
        pleineLargeur
          ? 'flex flex-col gap-2'
          : 'flex flex-col gap-2 min-[1024px]:flex-row min-[1024px]:justify-end'
      }
    >
      <button
        type="button"
        className={classe}
        aria-label={`${TEXTES_SESSIONS.modifier} ${ligne.designation}`}
        onClick={() => onModifier(ligne)}
      >
        {TEXTES_SESSIONS.modifier}
      </button>
      {ligne.supprimable ? (
        <button
          type="button"
          className={classe}
          aria-label={`${TEXTES_SESSIONS.supprimer} ${ligne.designation}`}
          onClick={() => onSupprimer(ligne)}
        >
          {TEXTES_SESSIONS.supprimer}
        </button>
      ) : null}
    </div>
  )
}

const entete = 'pt-1 pr-5 pb-1 text-left align-middle font-normal'
const cellule = 'py-3 pr-5 align-top text-[15px]'

/**
 * Sessions déclarées (maquette 14). À partir de 600 px, un tableau : date, session, attendus,
 * saisies (avec « Manquent : ... »), puis « Modifier » et « Supprimer » (une session sans saisie
 * seulement). Sous 600 px, chaque session devient un bloc, boutons en pleine largeur. La
 * plus récente vient d'abord.
 */
export function ListeSessions({ lignes, idTitre, onModifier, onSupprimer }: Props) {
  const tableau = useLargeurMin(LARGEUR_PANNEAU)
  if (!tableau) {
    return (
      <ul aria-labelledby={idTitre}>
        {lignes.map((ligne) => (
          <li
            key={ligne.id}
            data-cle={ligne.id}
            className="flex flex-col gap-1.5 border-t border-filet py-4 text-[15px] first:border-t-0"
          >
            <span className="text-encre-2">{ligne.dateCourte}</span>
            <span className="font-bold">{ligne.nom}</span>
            <span className="text-encre-2">
              {TEXTES_SESSIONS.colonneAttendus} : {ligne.attendus}
            </span>
            <CelluleSaisies saisies={ligne.saisies} />
            <div className="mt-1.5">
              <Boutons
                ligne={ligne}
                onModifier={onModifier}
                onSupprimer={onSupprimer}
                pleineLargeur
              />
            </div>
          </li>
        ))}
      </ul>
    )
  }
  return (
    <table aria-labelledby={idTitre} className="w-full border-collapse">
      <thead>
        <tr className="text-note text-encre-3">
          <th scope="col" className={`${entete} w-[110px]`}>
            {TEXTES_SESSIONS.colonneDate}
          </th>
          <th scope="col" className={entete}>
            {TEXTES_SESSIONS.colonneSession}
          </th>
          <th scope="col" className={`${entete} w-[80px]`}>
            {TEXTES_SESSIONS.colonneAttendus}
          </th>
          <th scope="col" className={entete}>
            <span className="inline-flex items-center">
              {TEXTES_SESSIONS.colonneSaisies}
              <Aide
                code="sessions.saisies"
                libelle={TEXTES_SESSIONS.colonneSaisies}
                placement="flottante"
              />
            </span>
          </th>
          <th scope="col" className={`${entete} pr-0`}>
            <span className="sr-only">{TEXTES_SESSIONS.colonneActions}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {lignes.map((ligne) => (
          <tr key={ligne.id} data-cle={ligne.id} className="border-t border-filet">
            <td className={`${cellule} whitespace-nowrap text-encre-2`}>{ligne.dateCourte}</td>
            <th scope="row" className={`${cellule} text-left font-bold`}>
              {ligne.nom}
            </th>
            <td className={cellule}>{ligne.attendus}</td>
            <td className={cellule}>
              <CelluleSaisies saisies={ligne.saisies} />
            </td>
            <td className={`${cellule} py-2 pr-0`}>
              <Boutons ligne={ligne} onModifier={onModifier} onSupprimer={onSupprimer} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
