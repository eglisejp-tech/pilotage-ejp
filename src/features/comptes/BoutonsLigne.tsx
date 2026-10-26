import { LibelleEnvoi } from '@/components/etats/LibelleEnvoi'
import { Bouton } from '@/components/ui/Bouton'
import { actionsDeLaLigne, LIBELLES_ACTIONS } from '@/features/comptes/actionsLigne'
import type { ActionLigne } from '@/features/comptes/actionsLigne'
import { TEXTES_COMPTES } from '@/features/comptes/textes'
import type { LigneCompte } from '@/features/comptes/types'
import { cn } from '@/lib/utils'

interface Props {
  ligne: LigneCompte
  onAction: (ligne: LigneCompte, action: ActionLigne) => void
  /**
   * Action en cours sur cette ligne (relance, réactivation) : son bouton dit ce qui se fait
   * (« Envoi en cours », « Réactivation en cours »).
   */
  enCours: ActionLigne | null
  /** Sous 600 px : boutons en pleine largeur, l'un sous l'autre (BRIEF, section 9). */
  pleineLargeur?: boolean
  /**
   * Compte connecté (EJP Tech, T60) : sa ligne n'a aucun bouton, la base refuse toute action sur
   * le compte de l'appelant. Elle dit « Votre compte ».
   */
  moi?: string | null
}

/**
 * Boutons d'une ligne de l'écran 13 (44 px de haut, LISEZMOI). Le nom accessible ajoute le nom du
 * compte au texte visible (« Désactiver Communication ») : la liste des boutons reste claire au
 * lecteur d'écran.
 * Pendant un envoi, le bouton reste dans l'ordre du clavier (`aria-disabled`).
 * « Supprimer » (T75), sur chaque ministère, est un lien (variante `lien` du Bouton commun) : la
 * suppression est rare, une seule action par ligne attire l'œil (T69, proposition 12). Dans le
 * tableau, il reste avec le bouton qui le précède (les deux passent ensemble à la ligne) : il
 * n'est jamais seul sur une ligne. Au téléphone, il vient sous les boutons, qui ont chacun la leur.
 */
export function BoutonsLigne({ ligne, onAction, enCours, pleineLargeur = false, moi }: Props) {
  if (moi != null && ligne.userId === moi) {
    // Dans le tableau, à droite, à la place des boutons des autres lignes.
    return (
      <p className={cn('text-detail text-encre-3', !pleineLargeur && 'text-right')}>
        {TEXTES_COMPTES.votreCompte}
      </p>
    )
  }
  const actions = actionsDeLaLigne(ligne)
  const bouton = (action: ActionLigne) => {
    const lien = action === 'supprimer'
    return (
      <Bouton
        key={action}
        variante={lien ? 'lien' : undefined}
        taille={lien ? 'lien' : undefined}
        pleineLargeur={pleineLargeur && !lien}
        className={lien && pleineLargeur ? 'self-start' : undefined}
        // Toute la ligne attend la fin de l'envoi ; seul le bouton cliqué dit « … en cours ».
        enCours={enCours !== null}
        // Le nom visible d'abord, puis le compte : « Désactiver Communication » (WCAG 2.5.3).
        aria-label={`${enCours === action ? TEXTES_COMPTES.enCours[action] : LIBELLES_ACTIONS[action]} ${ligne.nom}`}
        onClick={() => {
          if (enCours === null) onAction(ligne, action)
        }}
      >
        <LibelleEnvoi enCours={enCours === action} libelleEnCours={TEXTES_COMPTES.enCours[action]}>
          {LIBELLES_ACTIONS[action]}
        </LibelleEnvoi>
      </Bouton>
    )
  }
  // Dans le tableau, « Supprimer » et le bouton qui le précède forment un bloc insécable.
  const groupe = !pleineLargeur && actions.length >= 2 && actions.at(-1) === 'supprimer'
  const seuls = groupe ? actions.slice(0, -2) : actions
  return (
    <div className={cn('flex gap-2', pleineLargeur ? 'flex-col' : 'flex-wrap justify-end')}>
      {seuls.map(bouton)}
      {groupe ? (
        <span className="inline-flex items-center gap-2">{actions.slice(-2).map(bouton)}</span>
      ) : null}
    </div>
  )
}
