import { Link } from 'react-router'
import { TEXTES_SIGNALEMENT } from '@/features/signalement/textes'
import type { EcranSignalement } from '@/lib/base'
import { cn } from '@/lib/utils'

interface Props {
  /** Écran d'origine : `/signaler?ecran=<code>` le remplit dans le formulaire du signalement. */
  ecran: EcranSignalement
  /** Dans une phrase (message de date refusée) : le lien suit le texte, sur la même ligne. */
  enLigne?: boolean
}

/**
 * Lien « Signaler une difficulté » (T39) : en bas de chaque formulaire de saisie, sous ses
 * boutons, comme un lien ordinaire (ni un bouton, ni une aide), et dans le message d'une date
 * refusée. Il mène à `/signaler`, que le lot E8 remplit.
 */
export function LienSignalement({ ecran, enLigne = false }: Props) {
  return (
    <Link
      to={`/signaler?ecran=${ecran}`}
      className={cn(
        'text-[15px] text-nuit underline underline-offset-4',
        !enLigne && 'inline-flex min-h-cible items-center self-start',
      )}
    >
      {TEXTES_SIGNALEMENT.lien}
    </Link>
  )
}
