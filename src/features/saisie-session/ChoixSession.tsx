import { Link } from 'react-router'
import { EtatVide } from '@/components/etats/EtatVide'
import { lignesChoixSession, TEXTES_SESSION } from '@/features/saisie-session/session'
import { cn } from '@/lib/utils'
import type { SessionAChoisir } from '@/features/saisie-session/session'

interface Props {
  /** Les 8 dernières sessions passées ou du jour, avec la saisie du ministère. */
  sessions: readonly SessionAChoisir[]
}

/**
 * Panneau « Choisir la session » (BRIEF, section 9 ; liste de 48 px par ligne, LISEZMOI) : les
 * sessions passées ou du jour, les plus récentes d'abord, « Bâtir l'Église, samedi 26 sept. : à
 * saisir » ou « : 12 présents saisis ». Une session future n'apparaît pas. Chaque ligne ouvre la
 * saisie de la session.
 */
export function ChoixSession({ sessions }: Props) {
  const lignes = lignesChoixSession(sessions)
  if (lignes.length === 0) {
    return (
      <EtatVide situation="en_attente_des_autres" suite={TEXTES_SESSION.quiDeclare}>
        {TEXTES_SESSION.aucuneSession}
      </EtatVide>
    )
  }
  const toutesSaisies = lignes.every((ligne) => !ligne.aSaisir)
  return (
    <div className="flex flex-col gap-3">
      <p className="text-encre-2">
        {toutesSaisies ? TEXTES_SESSION.toutesSaisies : TEXTES_SESSION.choisir}
      </p>
      <ul className="flex flex-col border-t border-filet">
        {lignes.map((ligne) => (
          <li key={ligne.sessionId} className="border-b border-filet">
            <Link
              to={ligne.vers}
              className="flex min-h-12 items-center py-2 text-[15px] text-encre hover:bg-fond"
            >
              <span>
                <span className="font-semibold underline underline-offset-4">{ligne.libelle}</span>
                {/* Espace insécable : le deux-points reste collé au nom, l'état passe seul à la ligne. */}
                {' : '}
                <span
                  className={cn(
                    'whitespace-nowrap',
                    ligne.aSaisir ? 'text-attention' : 'text-encre-3',
                  )}
                >
                  {ligne.etat}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
