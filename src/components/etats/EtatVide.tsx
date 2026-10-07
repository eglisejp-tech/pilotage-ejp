import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { ActionVide, SituationVide } from '@/components/etats/situations'
import { cn } from '@/lib/utils'

interface Props {
  /** La situation, parmi les six de T36 : elle dit le rôle du message (annoncé ou non). */
  situation: SituationVide
  /** Phrase complète qui dit ce qui se passe (« Aucun point ouvert pour votre ministère. »). */
  children: ReactNode
  /** Ce qui viendra, ou qui doit agir (« L'administration de l'église déclare les sessions. »). */
  suite?: ReactNode
  /** Au plus une action. */
  action?: ActionVide
  /** Le profil peut-il faire l'action ? Sinon elle n'est pas montrée (défaut : oui). */
  peutAgir?: boolean
}

const classeAction =
  'inline-flex min-h-cible items-center border border-encre bg-papier px-4 text-sm font-semibold whitespace-nowrap text-encre hover:bg-fond'

/**
 * État vide d'un écran ou d'un bloc (T36) : sous le titre et son filet, à la place du contenu,
 * une phrase complète qui dit ce qui se passe, puis ce qui viendra ou qui doit agir. Jamais un
 * blanc, jamais un zéro qui aurait l'air d'une donnée, ni illustration, ni emoji, ni excuse. Le
 * « problème passager » est annoncé (`role="alert"`, fond d'erreur) ; les autres situations sont
 * du texte ordinaire. L'action n'existe que pour le profil qui peut agir.
 */
export function EtatVide({ situation, children, suite, action, peutAgir = true }: Props) {
  const probleme = situation === 'probleme_passager'
  return (
    <div
      data-situation={situation}
      className={cn(
        'flex max-w-prose flex-col items-start gap-3 py-[18px]',
        probleme && 'max-w-none bg-alerte-fond px-4 py-3',
      )}
    >
      <div role={probleme ? 'alert' : undefined}>
        <p className={probleme ? 'text-[15px] leading-normal text-alerte' : 'text-encre-2'}>
          {children}
        </p>
        {suite ? <p className="mt-1 text-encre-2">{suite}</p> : null}
      </div>
      {action && peutAgir ? (
        action.vers !== undefined ? (
          <Link to={action.vers} replace={action.remplace} className={classeAction}>
            {action.libelle}
          </Link>
        ) : (
          <button type="button" onClick={action.surClic} className={classeAction}>
            {action.libelle}
          </button>
        )
      ) : null}
    </div>
  )
}
