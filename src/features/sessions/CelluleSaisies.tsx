import type { SaisiesDeLaSession } from '@/features/sessions/construire'
import { TEXTES_SESSIONS } from '@/features/sessions/textes'
import { cn } from '@/lib/utils'

/**
 * Colonne « Saisies » (maquette 14) : « Pas encore eu lieu » en `--encre-3` ; sinon la complétude
 * avec son carré (vert si tous ont saisi, orange sinon, toujours avec le texte), puis la phrase
 * « Manquent : A, B et C » quand des ministères attendus n'ont pas saisi.
 */
export function CelluleSaisies({ saisies }: { saisies: SaisiesDeLaSession }) {
  if (saisies.genre === 'a_venir') {
    return <span className="text-encre-3">{TEXTES_SESSIONS.pasEncoreEuLieu}</span>
  }
  return (
    <span className="flex flex-col gap-0.5">
      <span
        className={cn(
          'inline-flex items-center gap-2 font-semibold',
          saisies.complet ? 'text-bien' : 'text-attention',
        )}
      >
        <span
          aria-hidden="true"
          className={cn('size-2 shrink-0', saisies.complet ? 'bg-bien' : 'bg-attention')}
        />
        {saisies.libelle}
      </span>
      {saisies.manquants !== null ? (
        <span className="text-sm leading-normal text-encre-2">{saisies.manquants}</span>
      ) : null}
    </span>
  )
}
