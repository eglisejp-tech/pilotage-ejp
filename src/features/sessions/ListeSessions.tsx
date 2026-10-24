import { Bouton } from '@/components/ui/Bouton'
import { useLargeurMin } from '@/features/cette-semaine/useLargeurMin'
import { CelluleSaisies } from '@/features/sessions/CelluleSaisies'
import type { LigneSession } from '@/features/sessions/construire'
import { TEXTES_SESSIONS } from '@/features/sessions/textes'
import { LARGEUR_PANNEAU } from '@/features/saisie/textes'
import { cn } from '@/lib/utils'

interface Props {
  lignes: readonly LigneSession[]
  idTitre: string
  onModifier: (ligne: LigneSession) => void
  onSupprimer: (ligne: LigneSession) => void
}

/**
 * « Modifier » puis « Supprimer » (une session sans saisie seulement). Alignés à gauche de leur
 * case : « Modifier » reste à la même place, que « Supprimer » soit là ou non (proposition 5,
 * T69). Côte à côte à partir de 1024 px, l'un sous l'autre en dessous.
 */
function Boutons({
  ligne,
  onModifier,
  onSupprimer,
  pleineLargeur = false,
}: Omit<Props, 'lignes' | 'idTitre'> & { ligne: LigneSession; pleineLargeur?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-2', !pleineLargeur && 'ordinateur:flex-row')}>
      <Bouton
        pleineLargeur={pleineLargeur}
        aria-label={`${TEXTES_SESSIONS.modifier} ${ligne.designation}`}
        onClick={() => onModifier(ligne)}
      >
        {TEXTES_SESSIONS.modifier}
      </Bouton>
      {ligne.supprimable ? (
        <Bouton
          pleineLargeur={pleineLargeur}
          aria-label={`${TEXTES_SESSIONS.supprimer} ${ligne.designation}`}
          onClick={() => onSupprimer(ligne)}
        >
          {TEXTES_SESSIONS.supprimer}
        </Bouton>
      ) : null}
    </div>
  )
}

const entete = 'pt-1 pr-5 pb-1 text-left align-middle font-normal'
const cellule = 'py-3 pr-5 align-top text-interface'

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
            className="flex flex-col gap-1.5 border-t border-filet py-4 text-interface first:border-t-0"
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
            {TEXTES_SESSIONS.colonneSaisies}
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
