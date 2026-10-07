import { actionsDeLaLigne, LIBELLES_ACTIONS } from '@/features/comptes/actionsLigne'
import type { ActionLigne } from '@/features/comptes/actionsLigne'
import { TEXTES_COMPTES } from '@/features/comptes/textes'
import type { LigneCompte } from '@/features/comptes/types'
import { cn } from '@/lib/utils'

interface Props {
  ligne: LigneCompte
  onAction: (ligne: LigneCompte, action: ActionLigne) => void
  /** Action en cours sur cette ligne (relance, réactivation) : son bouton dit « Envoi en cours ». */
  enCours: ActionLigne | null
  /** Sous 600 px : boutons en pleine largeur, l'un sous l'autre (BRIEF, section 9). */
  pleineLargeur?: boolean
}

/**
 * Boutons d'une ligne de l'écran 13 (44 px de haut, LISEZMOI). Le nom accessible ajoute le nom du
 * compte au texte visible (« Désactiver Communication ») : la liste des boutons reste claire au
 * lecteur d'écran.
 * Pendant un envoi, le bouton reste dans l'ordre du clavier (`aria-disabled`).
 */
export function BoutonsLigne({ ligne, onAction, enCours, pleineLargeur = false }: Props) {
  const actions = actionsDeLaLigne(ligne)
  return (
    <div className={cn('flex gap-2', pleineLargeur ? 'flex-col' : 'flex-wrap justify-end')}>
      {actions.map((action) => (
        <button
          key={action}
          type="button"
          // Le nom visible d'abord, puis le compte : « Désactiver Communication » (WCAG 2.5.3).
          aria-label={`${enCours === action ? TEXTES_COMPTES.enCours : LIBELLES_ACTIONS[action]} ${ligne.nom}`}
          aria-disabled={enCours !== null ? true : undefined}
          onClick={() => {
            if (enCours === null) onAction(ligne, action)
          }}
          className={cn(
            'inline-flex min-h-cible items-center justify-center border border-encre bg-papier px-4.5 text-[15px] font-semibold whitespace-nowrap text-encre hover:bg-fond aria-disabled:cursor-wait',
            pleineLargeur && 'w-full',
          )}
        >
          {enCours === action ? TEXTES_COMPTES.enCours : LIBELLES_ACTIONS[action]}
        </button>
      ))}
    </div>
  )
}
